document.addEventListener('DOMContentLoaded', () => {
    // CodeMirror UI Instantiation
    const editor = CodeMirror.fromTextArea(document.getElementById('codeEditor'), {
        mode: 'javascript',
        theme: 'dracula',
        lineNumbers: true,
        autoCloseBrackets: true,
        matchBrackets: true
    });

    const btnVisualize = document.getElementById('btnVisualize');
    const btnFirst = document.getElementById('btnFirst');
    const btnPrev = document.getElementById('btnPrev');
    const btnNext = document.getElementById('btnNext');
    const btnLast = document.getElementById('btnLast');
    const stepCounter = document.getElementById('stepCounter');
    const stackRoot = document.getElementById('stackRoot');
    const heapRoot = document.getElementById('heapRoot');
    const consoleOutput = document.getElementById('consoleOutput');

    let MasterTimelineTrace = [];
    let activeTimelineIndex = -1;
    let currentMarker = null;

    // ভ্যালু থেকে ৮-বিট বাইনারি রিপ্রেজেন্টেশন তৈরি করার ফাংশন
    function getBinaryRepresentation(val) {
        if (typeof val === 'number') {
            return (val >>> 0).toString(2).padStart(8, '0').replace(/(.{4})/g, '$1 ').trim();
        }
        if (typeof val === 'boolean') {
            return val ? "0000 0001" : "0000 0000";
        }
        if (typeof val === 'string' && val.length === 1) {
            return val.charCodeAt(0).toString(2).padStart(8, '0').replace(/(.{4})/g, '$1 ').trim();
        }
        return "0000 0000";
    }

    /**
     * VIRTUAL MACHINE MEMORY ENGINE (FIXED LOOP STRING CONCATENATION)
     */
    function executeAndMapMemory(userCode) {
        let timeline = [];
        let temporaryLogs = [];
        
        let stackPointer = 0x7FFF00;
        let heapPointer = 0x5001A0;

        let virtualStack = {};
        let virtualHeap = {};
        let localVariables = {};

        let lines = userCode.split('\n');

        // 🌟 ডাইনামিক গ্লোবাল কন্টেক্সট ইভালুয়েটর (যা ব্রাউজার স্কোপে প্লাস-চিহ্ন প্রসেস করে)
        function safeEval(str) {
            try {
                let scopeContextArgs = Object.keys(localVariables);
                let scopeContextVals = Object.values(localVariables);
                let evaluator = new Function(...scopeContextArgs, `return ${str};`);
                return evaluator(...scopeContextVals);
            } catch (e) {
                return str.replace(/['"]/g, '');
            }
        }

        function pushStep(lineIdx) {
            timeline.push({
                lineNo: lineIdx,
                stack: JSON.parse(JSON.stringify(virtualStack)),
                heap: JSON.parse(JSON.stringify(virtualHeap)),
                logs: [...temporaryLogs].join('\n')
            });
        }

        try {
            for (let i = 0; i < lines.length; i++) {
                let line = lines[i].trim();
                if (!line || line.startsWith('//')) continue;

                // let, const, var ভ্যারিয়েবল ডিক্লেয়ারেশন ট্র্যাপ
                let varMatch = line.match(/(?:let|const|var)\s+(\w+)\s*=\s*(.*)/);
                if (varMatch) {
                    let varName = varMatch[1];
                    let rawValue = varMatch[2].replace(/;$/, '').trim();
                    let parsedValue = safeEval(rawValue);

                    localVariables[varName] = parsedValue;

                    // ক) অ্যারে টাইপ ভ্যালু (Heap Reference)
                    if (Array.isArray(parsedValue)) {
                        heapPointer += 32;
                        let hAddr = `0x${heapPointer.toString(16).toUpperCase()}`;
                        virtualHeap[hAddr] = { type: 'Array', dataset: [...parsedValue] };

                        stackPointer -= 8;
                        virtualStack[varName] = {
                            address: `0x${stackPointer.toString(16).toUpperCase()}`,
                            type: 'Reference (Array)',
                            isRef: true,
                            targetRef: hAddr,
                            value: hAddr
                        };
                    }
                    // খ) অবজেক্ট টাইপ ভ্যালু (Heap Reference)
                    else if (typeof parsedValue === 'object' && parsedValue !== null) {
                        heapPointer += 32;
                        let hAddr = `0x${heapPointer.toString(16).toUpperCase()}`;
                        virtualHeap[hAddr] = { type: 'Object', dataset: { ...parsedValue } };

                        stackPointer -= 8;
                        virtualStack[varName] = {
                            address: `0x${stackPointer.toString(16).toUpperCase()}`,
                            type: 'Reference (Object)',
                            isRef: true,
                            targetRef: hAddr,
                            value: hAddr
                        };
                    }
                    // গ) স্ট্রিং টাইপ ভ্যালু (Heap Character Array Reference)
                    else if (typeof parsedValue === 'string' && (rawValue.startsWith('"') || rawValue.startsWith("'"))) {
                        heapPointer += 24;
                        let hAddr = `0x${heapPointer.toString(16).toUpperCase()}`;
                        virtualHeap[hAddr] = { type: 'String/Char Array', dataset: parsedValue.split('') };

                        stackPointer -= 8;
                        virtualStack[varName] = {
                            address: `0x${stackPointer.toString(16).toUpperCase()}`,
                            type: 'Reference (String)',
                            isRef: true,
                            targetRef: hAddr,
                            value: hAddr
                        };
                    }
                    // ঘ) প্রিমিティブ টাইপ ভ্যালু (Stack Native Frame)
                    else {
                        stackPointer -= 4;
                        virtualStack[varName] = {
                            address: `0x${stackPointer.toString(16).toUpperCase()}`,
                            type: typeof parsedValue,
                            isRef: false,
                            targetRef: null,
                            value: parsedValue
                        };
                    }
                    pushStep(i);
                }

                // 🌟 ২. লুপ রানটাইম ট্র্যাকিং সিমুলেটর (মাল্টিপল ভ্যারিয়েবল সাপোর্ট ফিক্স)
                if (line.startsWith('for')) {
                    let loopConfig = line.match(/let\s+(\w+)\s*=\s*(\d+);\s*\1\s*<\s*([^;]+);\s*\1\s*\+\+/);
                    if (loopConfig) {
                        let iteratorName = loopConfig[1];
                        let startVal = parseInt(loopConfig[2]);
                        let limitCondition = loopConfig[3].trim();
                        let limit = isNaN(parseInt(limitCondition)) ? safeEval(limitCondition) : parseInt(limitCondition);

                        stackPointer -= 4;
                        let loopVarAddr = `0x${stackPointer.toString(16).toUpperCase()}`;

                        // লুপের ভেতরের সব লাইন এক্সট্র্যাক্ট করা
                        let loopBodyLines = [];
                        let j = i + 1;
                        while (j < lines.length && !lines[j].includes('}')) {
                            loopBodyLines.push({ text: lines[j].trim(), absoluteLineNo: j });
                            j++;
                        }

                        // লুপ এক্সিকিউশন ভার্চুয়াল সিমুলেশন শুরু
                        for (let stepVal = startVal; stepVal < limit; stepVal++) {
                            localVariables[iteratorName] = stepVal;
                            virtualStack[iteratorName] = {
                                address: loopVarAddr,
                                type: 'number (iterator)',
                                isRef: false,
                                targetRef: null,
                                value: stepVal
                            };

                            // লুপের ভেতরের লাইনগুলো প্রসেস করা
                            loopBodyLines.forEach((body) => {
                                let bodyLine = body.text;
                                if (!bodyLine) return;

                                // যদি ভেতরের লাইনে কোনো নতুন লোকাল ভ্যারিয়েবল ডিক্লেয়ার করা হয় (যেমন: let current = marks[i])
                                let innerVarMatch = bodyLine.match(/(?:let|const|var)\s+(\w+)\s*=\s*(.*)/);
                                if (innerVarMatch) {
                                    let innerVarName = innerVarMatch[1];
                                    let innerRawVal = innerVarMatch[2].replace(/;$/, '').trim();
                                    let innerParsedVal = safeEval(innerRawVal);

                                    localVariables[innerVarName] = innerParsedVal;
                                    
                                    // ইনার ভ্যারিয়েবল স্ট্যাকে পুশ (প্রিমিটিভ হিসেবে হ্যান্ডেলড)
                                    virtualStack[innerVarName] = {
                                        address: `0x${(stackPointer - 4).toString(16).toUpperCase()}`,
                                        type: typeof innerParsedVal,
                                        isRef: false,
                                        targetRef: null,
                                        value: innerParsedVal
                                    };
                                }

                                // কনসোল লগ পার্সিং ফিক্স (প্লাস চিহ্নের জটিল কনক্যাটিনেশন রেন্ডার হবে)
                                if (bodyLine.includes('console.log')) {
                                    let logMatch = bodyLine.match(/console\.log\((.*)\)/);
                                    if (logMatch) {
                                        let finalLogOutput = safeEval(logMatch[1]);
                                        temporaryLogs.push(finalLogOutput);
                                    }
                                }
                            });
                            
                            pushStep(i); // টাইমলাইনে কারেন্ট স্ন্যাপশট স্টেট সেভ করা
                        }
                        i = j; // মেইন লুপ কাউন্টার লাফ দিয়ে ক্লোজিং ব্র্যাকেটে যাবে
                    }
                }

                // ৩. লুপের বাইরে সাধারণ একক কনসোল লগ থাকলে
                if (line.includes('console.log') && !line.startsWith('for') && !userCode.includes('for')) {
                    let logMatch = line.match(/console\.log\((.*)\)/);
                    if (logMatch) {
                        temporaryLogs.push(safeEval(logMatch[1]));
                    }
                    pushStep(i);
                }
            }

            if (timeline.length === 0) {
                pushStep(0);
            }

        } catch (err) {
            timeline = [{
                lineNo: 0,
                stack: { "Engine Core": { address: "0xERROR", type: "system", isRef: false, value: "Failure" } },
                heap: {},
                logs: `Execution Error: ${err.message}`
            }];
        }

        return timeline;
    }

    // UI Snapshot Step Renderer Pass
    function renderStep(index) {
        if (index < 0 || index >= MasterTimelineTrace.length) return;

        const snapshot = MasterTimelineTrace[index];

        // 🌟 CODE LINE HIGHLIGHT INDICATOR MECHANISM
        if (currentMarker !== null) {
            editor.removeLineClass(currentMarker, "background", "active-code-line");
        }
        currentMarker = snapshot.lineNo;
        editor.addLineClass(currentMarker, "background", "active-code-line");
        editor.scrollIntoView({line: currentMarker, ch: 0}, 200);

        // ১. রিয়েল স্ট্যাক মেমরি টেবিল রেন্ডারিং পাস
        stackRoot.innerHTML = '';
        if (Object.keys(snapshot.stack).length === 0) {
            stackRoot.innerHTML = `<div class="placeholder-msg">Stack Frame Empty (Awaiting Executions)</div>`;
        } else {
            let table = document.createElement('table');
            table.className = 'stack-memory-table';
            table.innerHTML = `
                <thead>
                    <tr>
                        <th>Address</th>
                        <th>Identifier</th>
                        <th>Type</th>
                        <th>Value / Payload Data</th>
                    </tr>
                </thead>
                <tbody>
                </tbody>
            `;
            let tbody = table.querySelector('tbody');

            for (let name in snapshot.stack) {
                let node = snapshot.stack[name];
                let tr = document.createElement('tr');
                tr.className = 'stack-table-row';

                let binaryCodeBytes = getBinaryRepresentation(node.value);

                if (node.isRef) {
                    tr.innerHTML = `
                        <td class="mem-addr-cell">${node.address}</td>
                        <td class="mem-name-cell ref-ident">${name}</td>
                        <td class="mem-type-cell"><span class="badge-ref">${node.type}</span></td>
                        <td class="mem-val-cell">
                            <span class="pointer-link-tag">Pointer ➔ ${node.targetRef}</span>
                            <div class="binary-subtext">[Heap Alloc Block]</div>
                        </td>
                    `;
                } else {
                    tr.innerHTML = `
                        <td class="mem-addr-cell">${node.address}</td>
                        <td class="mem-name-cell primitive-ident">${name}</td>
                        <td class="mem-type-cell"><span class="badge-prim">${node.type}</span></td>
                        <td class="mem-val-cell">
                            <span class="prim-val-span">${node.value}</span>
                            <div class="binary-subtext">BIN: ${binaryCodeBytes}</div>
                        </td>
                    `;
                }
                tbody.appendChild(tr);
            }
            stackRoot.appendChild(table);
        }

        // ২. হিপ মেমরি অবজেক্ট ও ক্যারেক্টার অ্যারে বক্স রেন্ডারিং
        heapRoot.innerHTML = '';
        if (Object.keys(snapshot.heap).length === 0) {
            heapRoot.innerHTML = `<div class="placeholder-msg">Heap Memory Buffer Clear</div>`;
        } else {
            for (let addr in snapshot.heap) {
                let item = snapshot.heap[addr];
                let box = document.createElement('div');
                box.className = 'heap-alloc-node';
                box.innerHTML = `<div class="heap-node-addr">${addr} [${item.type}]</div>`;

                if (item.type === 'Array' || item.type === 'String/Char Array') {
                    let grid = document.createElement('div');
                    grid.className = 'array-element-grid';
                    
                    item.dataset.forEach((val, idx) => {
                        let parsedNum = parseInt(val);
                        let cellBinary = getBinaryRepresentation(isNaN(parsedNum) ? val : parsedNum);
                        grid.innerHTML += `
                            <div class="array-cell" title="Binary: ${cellBinary}">
                                <span class="cell-idx">[${idx}]</span>
                                <span class="cell-val">${val}</span>
                            </div>
                        `;
                    });
                    box.appendChild(grid);
                } else if (item.type === 'Object') {
                    for (let key in item.dataset) {
                        let propertyBinary = getBinaryRepresentation(item.dataset[key]);
                        box.innerHTML += `
                            <div style="font-size:12px; padding:4px 0; font-family:monospace;" title="Binary: ${propertyBinary}">
                                <strong style="color:#60a5fa">${key}:</strong> 
                                <span style="color:#eab308">${JSON.stringify(item.dataset[key])}</span>
                            </div>
                        `;
                    }
                }
                heapRoot.appendChild(box);
            }
        }

        // ৩. আপডেট কনসোল এবং বাটন কন্ট্রোলস
        consoleOutput.textContent = snapshot.logs || ""; 
        stepCounter.textContent = `Step: ${index + 1} / ${MasterTimelineTrace.length}`;

        btnFirst.disabled = index === 0;
        btnPrev.disabled = index === 0;
        btnNext.disabled = index === MasterTimelineTrace.length - 1;
        btnLast.disabled = index === MasterTimelineTrace.length - 1;
    }

    // UI Click Event Controller Actions
    btnVisualize.addEventListener('click', () => {
        const sourceCode = editor.getValue().trim();
        if (!sourceCode) return;

        MasterTimelineTrace = executeAndMapMemory(sourceCode);
        if (MasterTimelineTrace.length > 0) {
            activeTimelineIndex = 0;
            renderStep(activeTimelineIndex);
        }
    });

    btnNext.addEventListener('click', () => {
        if (activeTimelineIndex < MasterTimelineTrace.length - 1) {
            activeTimelineIndex++;
            renderStep(activeTimelineIndex);
        }
    });

    btnPrev.addEventListener('click', () => {
        if (activeTimelineIndex > 0) {
            activeTimelineIndex--;
            renderStep(activeTimelineIndex);
        }
    });

    btnFirst.addEventListener('click', () => {
        activeTimelineIndex = 0;
        renderStep(activeTimelineIndex);
    });

    btnLast.addEventListener('click', () => {
        activeTimelineIndex = MasterTimelineTrace.length - 1;
        renderStep(activeTimelineIndex);
    });
});