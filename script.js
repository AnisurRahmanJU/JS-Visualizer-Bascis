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
     * VIRTUAL MACHINE MEMORY ENGINE (TOTAL LINE-BY-LINE TRACKER WITH RECURSION OPTIMIZATION)
     */
    function executeAndMapMemory(userCode) {
        let timeline = [];
        let temporaryLogs = [];
        
        let stackPointer = 0x7FFF00;
        let heapPointer = 0x5001A0;

        let virtualHeap = {};
        let heapRefMap = new Map();
        let variableAddresses = {};

        // এক্সিকিউশন কন্টেক্সট ট্র্যাকিং এনভায়রনমেন্ট
        let callContextStack = [{ name: 'Global', args: {}, paramNames: [] }];

        function getVariableAddress(varName, isRef) {
            let contextKey = `${callContextStack.map(c => c.name).join('_')}_${varName}`;
            if (!variableAddresses[contextKey]) {
                stackPointer -= isRef ? 8 : 4;
                variableAddresses[contextKey] = `0x${stackPointer.toString(16).toUpperCase()}`;
            }
            return variableAddresses[contextKey];
        }

        function getHeapAddress(obj) {
            if (heapRefMap.has(obj)) return heapRefMap.get(obj);
            heapPointer += 32;
            let hAddr = `0x${heapPointer.toString(16).toUpperCase()}`;
            heapRefMap.set(obj, hAddr);
            return hAddr;
        }

        // ইউনিভার্সাল আইডেন্টিফায়ার এক্সট্র্যাক্টর
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

        // ডায়নামিক স্কোপ বিল্ডার (প্যারামিটারের অরিজিনাল নাম `arg_n` রিড করার লজিক সহ)
        let safeScopeBuilder = `(() => { 
            let _scope = {}; 
            
            if (typeof __getCurrentParams === 'function') {
                let currentParams = __getCurrentParams();
                if (currentParams && typeof arguments !== 'undefined') {
                    currentParams.forEach((pName, i) => {
                        _scope['arg_' + pName] = arguments[i];
                    });
                }
            }

            [${Array.from(detectedIdentifiers).map(id => `'${id}'`).join(',')}].forEach(id => {
                try { 
                    let val = eval(id);
                    if (typeof val !== 'undefined') { 
                        _scope[id] = val; 
                    } 
                } catch(e) {}
            });
            return _scope; 
        })()`;

        // নিখুঁত লাইন-বাই-লাইন ট্র্যাকিং ইনস্ট্রুমেন্টার
        let originalLines = userCode.split('\n');
        let instrumentedCode = "";
        let statementBuffer = "";
        let braceDepth = 0;
        let bracketDepth = 0;

        originalLines.forEach((line, index) => {
            let trimmed = line.trim();
            
            if (!trimmed || trimmed.startsWith('//')) {
                instrumentedCode += line + "\n";
                return;
            }

            if (trimmed.includes('console.log')) {
                line = line.replace(/console\.log\((.*)\)/g, `__captureLog($1); console.log($1)`);
                trimmed = line.trim();
            }

            // ফাংশন ডিক্লেয়ারেশন ও কন্টেক্সট এন্ট্রি ক্যাপচার
            let funcMatch = trimmed.match(/^function\s+(\w+)\s*\((.*)\)\s*\{/);
            if (funcMatch) {
                braceDepth += 1;
                let funcName = funcMatch[1];
                let params = funcMatch[2].split(',').map(p => p.trim()).filter(p => p);
                let quotedParams = params.map(p => `'${p}'`).join(',');
                
                instrumentedCode += line + `\n__pushContext('${funcName}', [${quotedParams}], [${params.join(',')}]);\n__trace(${index}, ${safeScopeBuilder});\n`;
                return;
            }

            braceDepth += (trimmed.match(/\{/g) || []).length;
            braceDepth -= (trimmed.match(/\}/g) || []).length;
            bracketDepth += (trimmed.match(/\[/g) || []).length;
            bracketDepth -= (trimmed.match(/\]/g) || []).length;

            // ফাংশন রিটার্ন এবং ফ্রেম ডিলিট ইন্টারসেপ্টর
            if (trimmed.startsWith('return ') || trimmed === 'return;') {
                let retExpr = trimmed.replace('return', '').replace(';', '').trim();
                if (retExpr) {
                    statementBuffer += `let __retVal = ${retExpr};\n__trace(${index}, ${safeScopeBuilder}, true, __retVal);\n__popContext();\nreturn __retVal;\n`;
                } else {
                    statementBuffer += `__trace(${index}, ${safeScopeBuilder}, true, undefined);\n__popContext();\nreturn;\n`;
                }
                instrumentedCode += statementBuffer;
                statementBuffer = "";
                return;
            }

            statementBuffer += line + "\n";

            // কন্ডিশনাল হেডার বা নরমাল স্টেটমেন্ট ক্লোজ হলেই লাইন-বাই-লাইন ফায়ার হবে
            let isControlFlowHeader = /^(for|if|while|switch)\b/.test(trimmed) && trimmed.endsWith('{');
            if (isControlFlowHeader) {
                instrumentedCode += statementBuffer + `\n__trace(${index}, ${safeScopeBuilder});\n`;
                statementBuffer = "";
            } else if (bracketDepth === 0 && (trimmed.endsWith(';') || trimmed.endsWith('}'))) {
                instrumentedCode += statementBuffer + `;\n__trace(${index}, ${safeScopeBuilder});\n`;
                statementBuffer = "";
            }
        });

        if (statementBuffer.trim()) {
            instrumentedCode += statementBuffer + `;\n__trace(${originalLines.length - 1}, ${safeScopeBuilder});\n`;
        }

        // रनটাইম কন্টেক্সট ম্যানেজমেন্ট API
        window.__pushContext = function(name, paramNames, argValues) {
            let argsObj = {};
            paramNames.forEach((pName, i) => {
                argsObj[pName] = argValues[i];
            });
            let formattedCall = `${name}(${argValues.join(', ')})`;
            callContextStack.push({ name: formattedCall, args: argsObj, paramNames: paramNames });
        };

        window.__popContext = function() {
            if (callContextStack.length > 1) {
                callContextStack.pop();
            }
        };

        window.__getCurrentParams = function() {
            if (callContextStack.length > 1) {
                return callContextStack[callContextStack.length - 1].paramNames;
            }
            return null;
        };

        // ভার্চুয়াল মেমরি ট্র্যাকার কোর গেটওয়ে
        window.__trace = function(lineIdx, currentScope, isReturn = false, returnVal = null) {
            let virtualStack = {};
            let activeContextName = callContextStack[callContextStack.length - 1].name;

            if (activeContextName !== 'Global') {
                virtualStack[`[Call Frame: ${activeContextName}]`] = {
                    address: "---",
                    type: "Context Frame",
                    isRef: false,
                    value: "Active"
                };
            }

            if (isReturn) {
                virtualStack[`[Return Trace: ${activeContextName}]`] = {
                    address: "---",
                    type: "Returning Value",
                    isRef: false,
                    value: returnVal
                };
            }

            // ডিপ নেস্টেড অবজেক্ট মেমরি এলোকেশন পার্সার ফাংশন
            function parseAndAllocateHeap(objValue) {
                let hAddr = getHeapAddress(objValue);
                
                // চেক করা হচ্ছে এটি ২D অ্যারে কি না
                let is2DArray = Array.isArray(objValue) && objValue.length > 0 && Array.isArray(objValue[0]);
                let typeStr = is2DArray ? '2D Array' : (Array.isArray(objValue) ? 'Array' : 'Object');
                
                if (is2DArray) {
                    // সাব-ব্লক ছাড়া একদম ক্লিন ওয়ান-বক্স গ্রিড মেট্রিক্স লেআউট
                    let clean2DData = objValue.map(row => Array.isArray(row) ? [...row] : row);
                    virtualHeap[hAddr] = { type: typeStr, dataset: clean2DData };
                    return hAddr;
                }

                let clonedDataset = Array.isArray(objValue) ? [] : {};
                for (let k in objValue) {
                    if (Object.prototype.hasOwnProperty.call(objValue, k)) {
                        let subVal = objValue[k];
                        if (typeof subVal === 'object' && subVal !== null) {
                            let subAddr = parseAndAllocateHeap(subVal);
                            clonedDataset[k] = `Reference ➔ ${subAddr}`;
                        } else {
                            clonedDataset[k] = safeClone(subVal);
                        }
                    }
                }

                virtualHeap[hAddr] = { type: typeStr, dataset: clonedDataset };
                return hAddr;
            }

            for (let varName in currentScope) {
                let val = currentScope[varName];
                if (val === undefined || typeof val === 'symbol') continue;

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
                else if (typeof val === 'object' && val !== null) {
                    let targetHeapAddress = parseAndAllocateHeap(val);
                    let is2D = Array.isArray(val) && val.length > 0 && Array.isArray(val[0]);
                    let typeLabel = is2D ? '2D Array' : (Array.isArray(val) ? 'Array' : 'Object');
                    
                    virtualStack[varName] = {
                        address: getVariableAddress(varName, true),
                        type: `Reference (${typeLabel})`,
                        isRef: true,
                        targetRef: targetHeapAddress,
                        value: targetHeapAddress
                    };
                } 
                else if (typeof val === 'function') {
                    virtualStack[varName] = {
                        address: getVariableAddress(varName, false),
                        type: 'Function',
                        isRef: false,
                        targetRef: null,
                        value: '[Call Frame]'
                    };
                }
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

        // ভার্চুয়াল এক্সিকিউশন রানার
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
            delete window.__pushContext;
            delete window.__popContext;
            delete window.__getCurrentParams;
        }

        // ডুপ্লিকেট স্টেট ফিল্টারিং
        let uniqueTimeline = [];
        for (let i = 0; i < timeline.length; i++) {
            if (i === 0 || 
                timeline[i].lineNo !== timeline[i - 1].lineNo || 
                JSON.stringify(timeline[i].stack) !== JSON.stringify(timeline[i - 1].stack) ||
                JSON.stringify(timeline[i].heap) !== JSON.stringify(timeline[i - 1].heap)) {
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

                if (name.startsWith('[Call Frame') || name.startsWith('[Return Trace')) {
                    tr.style.backgroundColor = name.startsWith('[Call Frame') ? '#1e3a8a' : '#065f46';
                    tr.innerHTML = `
                        <td style="color:#94a3b8; font-family:monospace; padding:8px;">STACK</td>
                        <td colspan="2" style="color:#fff; font-weight:bold; padding:8px;">${name}</td>
                        <td style="color:#facc15; font-weight:bold; padding:8px;">${node.value}</td>
                    `;
                } else {
                    let binaryCodeBytes = getBinaryRepresentation(node.value);

                    if (node.isRef) {
                        tr.innerHTML = `
                            <td class="mem-addr-cell">${node.address}</td>
                            <td class="mem-name-cell ref-ident">${name}</td>
                            <td class="mem-type-cell"><span class="badge-ref">${node.type}</span></td>
                            <td class="mem-val-cell">
                                <span class="pointer-link-tag">Reference ID ➔ ${node.targetRef}</span>
                                <div class="binary-subtext">[Referenced Memory Location]</div>
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
                }
                tbody.appendChild(tr);
            }
            stackRoot.appendChild(table);
        }

        // ২. হিপ মেমরি রেন্ডারিং পাস (ইউনিফাইড মেট্রিক্স গ্রিড মেকানিজম)
        heapRoot.innerHTML = '';
        if (Object.keys(snapshot.heap).length === 0) {
            heapRoot.innerHTML = `<div class="placeholder-msg">Heap Memory Buffer Clear</div>`;
        } else {
            for (let addr in snapshot.heap) {
                let item = snapshot.heap[addr];
                let box = document.createElement('div');
                box.className = 'heap-alloc-node';
                box.innerHTML = `<div class="heap-node-addr">${addr} [${item.type}]</div>`;

                if (item.type === '2D Array') {
                    let matrixContainer = document.createElement('div');
                    matrixContainer.className = 'matrix-container';
                    matrixContainer.style.display = 'flex';
                    matrixContainer.style.flexDirection = 'column';
                    matrixContainer.style.gap = '8px';
                    matrixContainer.style.marginTop = '10px';
                    matrixContainer.style.padding = '8px';
                    matrixContainer.style.background = 'rgba(30, 41, 59, 0.5)';
                    matrixContainer.style.borderRadius = '6px';

                    item.dataset.forEach((row, rowIndex) => {
                        let rowGrid = document.createElement('div');
                        rowGrid.className = 'array-element-grid';
                        rowGrid.style.display = 'flex';
                        rowGrid.style.gap = '6px';

                        row.forEach((val, colIndex) => {
                            let displayVal = typeof val === 'object' && val !== null ? JSON.stringify(val) : val;
                            let parsedNum = parseInt(val);
                            let cellBinary = getBinaryRepresentation(isNaN(parsedNum) ? val : parsedNum);
                            
                            rowGrid.innerHTML += `
                                <div class="array-cell" title="Binary: ${cellBinary}" style="flex: 1; padding: 6px; border: 1px solid #475569; background: #0f172a; border-radius: 4px; text-align: center; min-width: 55px;">
                                    <span class="cell-idx" style="font-size: 10px; color: #64748b; display: block; font-family: monospace;">[${rowIndex}][${colIndex}]</span>
                                    <span class="cell-val" style="color: #38bdf8; font-weight: bold; font-family: monospace; font-size: 14px;">${displayVal}</span>
                                </div>
                            `;
                        });
                        matrixContainer.appendChild(rowGrid);
                    });
                    box.appendChild(matrixContainer);

                } else if (item.type === 'Array' || item.type === 'String/Char Array') {
                    let grid = document.createElement('div');
                    grid.className = 'array-element-grid';
                    grid.style.display = 'flex';
                    grid.style.gap = '6px';
                    grid.style.marginTop = '10px';
                    
                    item.dataset.forEach((val, idx) => {
                        // charSetting ফাংশন ব্যবহার করে সিঙ্গেল কোটেশন হ্যান্ডেল করা হচ্ছে
                        let formattedVal = charSetting(val, item.type);
                        let displayVal = typeof formattedVal === 'object' && formattedVal !== null ? JSON.stringify(formattedVal) : formattedVal;
                        let parsedNum = parseInt(val);
                        let cellBinary = getBinaryRepresentation(isNaN(parsedNum) ? val : parsedNum);
                        grid.innerHTML += `
                            <div class="array-cell" title="Binary: ${cellBinary}" style="padding: 6px 10px; border: 1px solid #475569; background: #0f172a; border-radius: 4px; text-align: center; min-width: 50px;">
                                <span class="cell-idx" style="font-size: 10px; color: #64748b; display: block; font-family: monospace;">[${idx}]</span>
                                <span class="cell-val" style="color: #38bdf8; font-weight: bold; font-family: monospace; font-size: 14px;">${displayVal}</span>
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
                                <span style="color:#eab308">${typeof item.dataset[key] === 'object' ? JSON.stringify(item.dataset[key]) : item.dataset[key]}</span>
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

    /**
     * Character & String Quotation Setting Formatter
     * Ensures text-based data displays with clean single quotes in the visualizer UI.
     */
    function charSetting(val, type) {
        if (type === 'String/Char Array' || type === 'Char') {
            if (typeof val === 'string' && !val.startsWith("'") && !val.endsWith("'")) {
                return `'${val}'`;
            }
        }
        if (typeof val === 'string' && val.length === 1) {
            if (!val.startsWith("'") && !val.endsWith("'")) {
                return `'${val}'`;
            }
        }
        return val;
    }
});
