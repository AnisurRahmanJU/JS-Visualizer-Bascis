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

    // সার্কুলার অবজেক্ট ও উইন্ডো রেফারেন্স হ্যান্ডলিং সেফ ক্লোন
    function safeClone(obj, seen = new WeakSet()) {
        if (obj === null || typeof obj !== 'object') return obj;
        if (typeof obj === 'function') return '[Function]';
        if (seen.has(obj) || obj === window || obj.constructor?.name === 'Window') {
            return '[Ref Block]';
        }
        seen.add(obj);

        if (Array.isArray(obj)) {
            return obj.map(item => safeClone(item, seen));
        }

        let copy = {};
        for (let key in obj) {
            if (Object.prototype.hasOwnProperty.call(obj, key)) {
                copy[key] = safeClone(obj[key], seen);
            }
        }
        return copy;
    }

    /**
     * VIRTUAL MACHINE MEMORY ENGINE (SAFE TDZ EXTENSION)
     */
    function executeAndMapMemory(userCode) {
        let timeline = [];
        let temporaryLogs = [];
        
        let stackPointer = 0x7FFF00;
        let heapPointer = 0x5001A0;

        let virtualHeap = {};
        let heapRefMap = new Map();
        let variableAddresses = {};

        function getVariableAddress(varName, isRef) {
            if (!variableAddresses[varName]) {
                stackPointer -= isRef ? 8 : 4;
                variableAddresses[varName] = `0x${stackPointer.toString(16).toUpperCase()}`;
            }
            return variableAddresses[varName];
        }

        function getHeapAddress(obj) {
            if (heapRefMap.has(obj)) return heapRefMap.get(obj);
            heapPointer += 32;
            let hAddr = `0x${heapPointer.toString(16).toUpperCase()}`;
            heapRefMap.set(obj, hAddr);
            return hAddr;
        }

        // ইউজারের দেওয়া সোর্স কোড থেকে সমস্ত আইডেন্টিফায়ার স্ক্যান করা
        let detectedIdentifiers = new Set();
        let idRegex = /(?:let|const|var|function)\s+(\w+)/g;
        let match;
        while ((match = idRegex.exec(userCode)) !== null) {
            detectedIdentifiers.add(match[1]);
        }

        let originalLines = userCode.split('\n');
        let instrumentedCode = "";

        originalLines.forEach((line, index) => {
            let trimmed = line.trim();
            if (!trimmed || trimmed.startsWith('//')) {
                instrumentedCode += line + "\n";
                return;
            }

            // কনসোল ডাইরেক্ট ইন্টারসেপ্টর
            if (trimmed.includes('console.log')) {
                line = line.replace(/console\.log\((.*)\)/g, `__captureLog($1); console.log($1)`);
            }

            // TDZ Error এড়াতে প্রতিটি আইডিইন্টিফায়ারকে আলাদা আলাদা try-catch ব্লকে স্ক্যান করার ডাইনামিক অবজেক্ট বিল্ডার
            let safeScopeBuilder = "(() => { let _scope = {}; ";
            detectedIdentifiers.forEach(id => {
                safeScopeBuilder += `try { if (typeof ${id} !== 'undefined' || true) { _scope.${id} = ${id}; } } catch(e) {} `;
            });
            safeScopeBuilder += "return _scope; })()";

            // প্রথমে লাইনটি এক্সিকিউট হবে, তারপর সেফ স্কোপ নিয়ে ট্র্যাকার কল হবে
            instrumentedCode += `${line}\n__trace(${index}, ${safeScopeBuilder});\n`;
        });

        // রানটাইম ট্র্যাকার কোর গেটওয়ে
        window.__trace = function(lineIdx, currentScope) {
            let virtualStack = {};

            for (let varName in currentScope) {
                let val = currentScope[varName];
                if (val === undefined) continue;

                // ১. স্ট্রিং ডাটা টাইপ (Heap Reference)
                if (typeof val === 'string') {
                    let hAddr = getHeapAddress(val);
                    virtualHeap[hAddr] = { type: 'String/Char Array', dataset: val.split('') };

                    virtualStack[varName] = {
                        address: getVariableAddress(varName, true),
                        type: 'Reference (String)',
                        isRef: true,
                        targetRef: hAddr,
                        value: hAddr
                    };
                }
                // ২. অ্যারে এবং ২D অ্যারে বা অবজেক্ট টাইপ ডাটা (Heap Mapping)
                else if (typeof val === 'object' && val !== null) {
                    let hAddr = getHeapAddress(val);
                    let typeStr = Array.isArray(val) ? (Array.isArray(val[0]) ? '2D Array' : 'Array') : 'Object';
                    
                    virtualHeap[hAddr] = { 
                        type: typeStr, 
                        dataset: safeClone(val) 
                    };

                    virtualStack[varName] = {
                        address: getVariableAddress(varName, true),
                        type: `Reference (${typeStr})`,
                        isRef: true,
                        targetRef: hAddr,
                        value: hAddr
                    };
                } 
                // ৩. ফাংশন ক্লোজারস
                else if (typeof val === 'function') {
                    virtualStack[varName] = {
                        address: getVariableAddress(varName, false),
                        type: 'Function',
                        isRef: false,
                        targetRef: null,
                        value: '[Call Frame]'
                    };
                }
                // ৪. টাইপ (Number, Boolean)
                else {
                    virtualStack[varName] = {
                        address: getVariableAddress(varName, false),
                        type: typeof val,
                        isRef: false,
                        targetRef: null,
                        value: val
                    };
                }
            }

            // টাইমলাইনে স্টেট পুশ
            timeline.push({
                lineNo: lineIdx,
                stack: safeClone(virtualStack),
                heap: safeClone(virtualHeap),
                logs: [...temporaryLogs].join('\n')
            });
        };

        window.__captureLog = function(...args) {
            let logStr = args.map(arg => typeof arg === 'object' ? JSON.stringify(safeClone(arg)) : arg).join(' ');
            temporaryLogs.push(logStr);
        };

        // ভার্চুয়াল এক্সিকিউশন রানার ব্লক
        try {
            let runner = new Function(instrumentedCode);
            runner();
        } catch (err) {
            timeline.push({
                lineNo: 0,
                stack: { "VM Engine Status": { address: "0xERROR", type: "system", isRef: false, value: "Runtime Error" } },
                heap: {},
                logs: `Runtime Error: ${err.message}`
            });
        } finally {
            delete window.__trace;
            delete window.__captureLog;
        }

        // পরপর ডুপ্লিকেট লাইনের স্টেট ফিল্টার আউট করা
        let uniqueTimeline = [];
        for (let i = 0; i < timeline.length; i++) {
            if (i === 0 || timeline[i].lineNo !== timeline[i - 1].lineNo || JSON.stringify(timeline[i].stack) !== JSON.stringify(timeline[i - 1].stack)) {
                uniqueTimeline.push(timeline[i]);
            }
        }

        return uniqueTimeline.length > 0 ? uniqueTimeline : [{ lineNo: 0, stack: {}, heap: {}, logs: "No State Found." }];
    }

    // UI Snapshot Step Renderer Pass
    function renderStep(index) {
        if (index < 0 || index >= MasterTimelineTrace.length) return;

        const snapshot = MasterTimelineTrace[index];

        // CODE LINE HIGHLIGHT INDICATOR MECHANISM
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
                        <th>Value</th>
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

                if (item.type === 'Array' || item.type === '2D Array' || item.type === 'String/Char Array') {
                    let grid = document.createElement('div');
                    grid.className = 'array-element-grid';
                    
                    item.dataset.forEach((val, idx) => {
                        let displayVal = typeof val === 'object' && val !== null ? JSON.stringify(val) : val;
                        let parsedNum = parseInt(val);
                        let cellBinary = getBinaryRepresentation(isNaN(parsedNum) ? val : parsedNum);
                        grid.innerHTML += `
                            <div class="array-cell" title="Binary: ${cellBinary}">
                                <span class="cell-idx">[${idx}]</span>
                                <span class="cell-val">${displayVal}</span>
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
