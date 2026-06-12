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
     * VIRTUAL MACHINE MEMORY ENGINE (ROBUST BUFFER BUFFER STATEMENT PARSER)
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

        // ইউনিভার্সাল আইডেন্টিফায়ার এক্সট্র্যাক্টর
        let detectedIdentifiers = new Set();
        let declRegex = /(?:let|const|var|function)\s+(\w+)/g;
        let match;
        while ((match = declRegex.exec(userCode)) !== null) {
            detectedIdentifiers.add(match[1]);
        }
        let assignRegex = /(?:\b)(\w+)(?=\s*=\s*|\s*\+=\s*|\s*-=\s*|\s*\+\+\s*|\s*--\s*)/g;
        while ((match = assignRegex.exec(userCode)) !== null) {
            if (!['if', 'for', 'while', 'switch', 'return', 'console'].includes(match[1])) {
                detectedIdentifiers.add(match[1]);
            }
        }

        // সেফ স্যান্ডবক্স স্কোপ জেনারেটর (TDZ Safe Protection)
        let safeScopeBuilder = "(() => { let _scope = {}; ";
        detectedIdentifiers.forEach(id => {
            safeScopeBuilder += `try { if (typeof ${id} !== 'undefined') { _scope.${id} = ${id}; } } catch(e) {} `;
        });
        safeScopeBuilder += "return _scope; })()";

        // স্টেট-ড্রিভেন বাফার ইনস্ট্রুমেন্টার (ফিক্সড মাল্টি-লাইন ও লুপ স্কোপ)
        let originalLines = userCode.split('\n');
        let instrumentedCode = "";
        let statementBuffer = "";
        let braceDepth = 0;
        let bracketDepth = 0;

        originalLines.forEach((line, index) => {
            let trimmed = line.trim();
            
            // কমেন্ট এবং খালি লাইন ফিল্টার
            if (!trimmed || trimmed.startsWith('//')) {
                instrumentedCode += line + "\n";
                return;
            }

            // কনসোল ইন্টারসেপ্টর প্যাচ
            if (trimmed.includes('console.log')) {
                line = line.replace(/console\.log\((.*)\)/g, `__captureLog($1); console.log($1)`);
                trimmed = line.trim();
            }

            // ব্র্যাকেট ডেপথ ট্র্যাকিং
            braceDepth += (trimmed.match(/\{/g) || []).length;
            braceDepth -= (trimmed.match(/\}/g) || []).length;
            bracketDepth += (trimmed.match(/\[/g) || []).length;
            bracketDepth -= (trimmed.match(/\]/g) || []).length;

            statementBuffer += line + "\n";

            // যদি এটি কোনো লুপ বা কন্ডিশনাল হেডার হয় (যেমন: for (...) { )
            let isControlFlowHeader = /^(for|if|while|switch)\b/.test(trimmed) && trimmed.endsWith('{');

            if (isControlFlowHeader) {
                instrumentedCode += statementBuffer + `__trace(${index}, ${safeScopeBuilder});\n`;
                statementBuffer = "";
            } 
            // যখন কোনো নরমাল স্টেটমেন্ট বা মাল্টি-লাইন অ্যাসাইনমেন্ট সম্পূর্ণ ক্লোজড বা জিরো ডেপ্তে আসে
            else if (braceDepth === 0 && bracketDepth === 0) {
                instrumentedCode += statementBuffer + `__trace(${index}, ${safeScopeBuilder});\n`;
                statementBuffer = "";
            } else {
                // ব্র্যাকেট ব্যালেন্সড না হওয়া পর্যন্ত বাফারে ডাটা হোল্ড করে রাখা হচ্ছে
                // তবে লুপের ভেতরের সাধারণ কোড লাইন হলে আমরা স্টেটমেন্ট রিলিজ করে ট্র্যাকার দেবো
                if (braceDepth === 1 && !trimmed.endsWith('{') && !trimmed.endsWith(',')) {
                    if (trimmed.endsWith(';') || (trimmed.match(/\}/g) || []).length === 0) {
                        instrumentedCode += statementBuffer + `__trace(${index}, ${safeScopeBuilder});\n`;
                        statementBuffer = "";
                    }
                }
            }
        });

        // বাফারে কোনো অবশিষ্টাংশ থাকলে রিলিজ
        if (statementBuffer.trim()) {
            instrumentedCode += statementBuffer + `\n__trace(${originalLines.length - 1}, ${safeScopeBuilder});\n`;
        }

        // রানটাইম ট্র্যাকার কোর গেটওয়ে
        window.__trace = function(lineIdx, currentScope) {
            let virtualStack = {};

            for (let varName in currentScope) {
                let val = currentScope[varName];
                if (val === undefined || typeof val === 'symbol') continue;

                // ১. স্ট্রিং ডাটা টাইপ
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
                // ২. অ্যারে, ২D অ্যারে এবং অবজেক্ট ডাটা টাইপ
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
                // ৩. ফাংশন এক্সিকিউশন ফ্রেম
                else if (typeof val === 'function') {
                    virtualStack[varName] = {
                        address: getVariableAddress(varName, false),
                        type: 'Function',
                        isRef: false,
                        targetRef: null,
                        value: '[Call Frame]'
                    };
                }
                // ৪. প্রিমিティブ টাইপস (Number, Boolean)
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

        // ভার্চুয়াল এক্সিকিউশন রানার রান
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

        // ডুপ্লিকেট স্টেট ফিল্টারিং পাস
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

        // ১. স্ট্যাক মেমরি টেবিল রেন্ডারিং পাস
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
                            <span class="pointer-link-tag">Reference ID ➔ ${node.targetRef}</span>
                            <div class="binary-subtext">[Referenced Object]</div>
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

        // ২. হিপ মেমরি রেন্ডারিং পাস (ফ্ল্যাট রিপ্রেজেন্টেশন)
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
                    
                    let flatDataset = [];
                    if (item.type === '2D Array' || Array.isArray(item.dataset[0])) {
                        item.dataset.forEach(subArray => {
                            if (Array.isArray(subArray)) {
                                flatDataset.push(...subArray);
                            } else {
                                flatDataset.push(subArray);
                            }
                        });
                    } else {
                        flatDataset = item.dataset;
                    }
                    
                    flatDataset.forEach((val, idx) => {
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
