const express = require('express');
const bodyParser = require('body-parser');
const esprima = require('esprima');
const escodegen = require('escodegen');
const sqlite3 = require('sqlite3').verbose();

const app = express();
app.use(bodyParser.json());
app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});

// Initialize SQLite Database
const db = new sqlite3.Database(':memory:');

db.serialize(() => {
    db.run("CREATE TABLE employees (id INT, name TEXT, salary INT, department TEXT)");
    db.run("INSERT INTO employees VALUES (1, 'Alice', 60000, 'Engineering')");
    db.run("INSERT INTO employees VALUES (2, 'Bob', 45000, 'HR')");
    db.run("INSERT INTO employees VALUES (3, 'Charlie', 75000, 'Engineering')");
    db.run("INSERT INTO employees VALUES (4, 'David', 50000, 'Marketing')");

    db.run("CREATE TABLE students (id INT, name TEXT, grade INT)");
    db.run("INSERT INTO students VALUES (1, 'John', 85)");
    db.run("INSERT INTO students VALUES (2, 'Jane', 92)");
    db.run("INSERT INTO students VALUES (3, 'Doe', 78)");
});

let nodeCounter = 0;
let graph = [];
let lastNode = "Start";

function newNodeId(line) {
    nodeCounter++;
    let id = `N${nodeCounter}`;
    if (line) {
        id += `_L${line}`;
    }
    return id;
}

function safeLabel(text) {
    if (!text) return "";
    // Escape special characters
    let safe = text.replace(/"/g, "'")
        .replace(/\n/g, ' ')
        .replace(/{/g, '&#123;')
        .replace(/}/g, '&#125;')
        .replace(/\[/g, '&#91;')
        .replace(/\]/g, '&#93;');

    // Truncate if too long
    if (safe.length > 50) {
        return safe.substring(0, 47) + "...";
    }
    return safe;
}

function addEdge(from, to, label = null) {
    if (label) {
        graph.push(`    ${from} -->|${label}| ${to}`);
    } else {
        graph.push(`    ${from} --> ${to}`);
    }
}

function traverse(node, parentNode) {
    if (!node) return;

    const line = node.loc ? node.loc.start.line : null;

    switch (node.type) {
        case 'FunctionDeclaration':
            const funcNode = newNodeId(line);
            graph.push(`    ${funcNode}[Def ${safeLabel(node.id.name)}]:::process`);
            addEdge(lastNode, funcNode);
            lastNode = funcNode;
            traverse(node.body, funcNode);
            break;

        case 'BlockStatement':
            node.body.forEach(stmt => traverse(stmt));
            break;

        case 'VariableDeclaration':
            node.declarations.forEach(decl => {
                const declLine = decl.loc ? decl.loc.start.line : line;
                const varName = decl.id.name;
                let init = "undefined";
                if (decl.init) {
                    try {
                        init = escodegen.generate(decl.init);
                    } catch (e) {
                        init = "...";
                    }
                }
                const label = `${varName} = ${init}`;
                const varNode = newNodeId(declLine);
                graph.push(`    ${varNode}["${safeLabel(label)}"]:::process`);
                addEdge(lastNode, varNode);
                lastNode = varNode;
            });
            break;

        case 'ExpressionStatement':
            if (node.expression.type === 'CallExpression') {
                const exprLine = node.expression.loc ? node.expression.loc.start.line : line;
                const callee = node.expression.callee.name || "func";
                // Check for console.log for I/O shape
                let isIO = false;
                if (node.expression.callee.type === 'MemberExpression' &&
                    node.expression.callee.object.name === 'console' &&
                    node.expression.callee.property.name === 'log') {
                    isIO = true;
                }

                const callNode = newNodeId(exprLine);
                let label = `Call ${callee}`;

                if (isIO) {
                    try {
                        const args = node.expression.arguments.map(arg => escodegen.generate(arg)).join(', ');
                        label = `console.log(${args})`;
                    } catch (e) {
                        label = `console.log(...)`;
                    }
                    graph.push(`    ${callNode}[/"${safeLabel(label)}"/]:::io`);
                } else {
                    try {
                        label = escodegen.generate(node.expression);
                    } catch (e) { }
                    graph.push(`    ${callNode}["${safeLabel(label)}"]:::process`);
                }
                addEdge(lastNode, callNode);
                lastNode = callNode;
            } else if (node.expression.type === 'AssignmentExpression') {
                const assignLine = node.expression.loc ? node.expression.loc.start.line : line;
                let label = "Assignment";
                try {
                    label = escodegen.generate(node.expression);
                } catch (e) {
                    const left = node.expression.left.name;
                    label = `${left} = ...`;
                }
                const assignNode = newNodeId(assignLine);
                graph.push(`    ${assignNode}["${safeLabel(label)}"]:::process`);
                addEdge(lastNode, assignNode);
                lastNode = assignNode;
            }
            break;

        case 'IfStatement':
            const ifLine = node.loc ? node.loc.start.line : line;
            const decisionNode = newNodeId(ifLine);
            let ifLabel = "If Condition";
            try {
                ifLabel = escodegen.generate(node.test);
            } catch (e) { }

            graph.push(`    ${decisionNode}{{"${safeLabel(ifLabel)}?"}}:::decision`);
            addEdge(lastNode, decisionNode);

            const entryNode = decisionNode;

            // True Branch
            lastNode = entryNode;
            const yesNode = newNodeId();
            graph.push(`    ${yesNode}["Yes"]`);
            addEdge(entryNode, yesNode, "True");
            lastNode = yesNode;
            traverse(node.consequent);
            const trueEnd = lastNode;

            // False Branch
            lastNode = entryNode;
            const noNode = newNodeId();
            graph.push(`    ${noNode}["No"]`);
            addEdge(entryNode, noNode, "False");
            lastNode = noNode;
            if (node.alternate) {
                traverse(node.alternate);
            }
            const falseEnd = lastNode;

            // Merge
            const mergeNode = newNodeId();
            graph.push(`    ${mergeNode}(( ))`);
            addEdge(trueEnd, mergeNode);
            addEdge(falseEnd, mergeNode);
            lastNode = mergeNode;
            break;

        case 'WhileStatement':
            const whileLine = node.loc ? node.loc.start.line : line;
            let whileCondition = "While Loop";
            try {
                whileCondition = escodegen.generate(node.test);
            } catch (e) { }

            const loopStart = newNodeId(whileLine);
            graph.push(`    ${loopStart}{{"${safeLabel(whileCondition)}?"}}:::decision`);
            addEdge(lastNode, loopStart);

            // Body
            lastNode = loopStart;
            const doNode = newNodeId();
            graph.push(`    ${doNode}["Do"]`);
            addEdge(loopStart, doNode, "True");
            lastNode = doNode;
            traverse(node.body);
            addEdge(lastNode, loopStart); // Loop back

            // Exit
            const endLoop = newNodeId();
            graph.push(`    ${endLoop}["End Loop"]`);
            addEdge(loopStart, endLoop, "False");
            lastNode = endLoop;
            break;

        case 'ReturnStatement':
            const retLine = node.loc ? node.loc.start.line : line;
            let retVal = "";
            if (node.argument) {
                try {
                    retVal = " " + escodegen.generate(node.argument);
                } catch (e) { }
            }
            const retNode = newNodeId(retLine);
            graph.push(`    ${retNode}["Return${safeLabel(retVal)}"]:::process`);
            addEdge(lastNode, retNode);
            lastNode = retNode;
            break;

        default:
            break;
    }
}

app.post('/parse', (req, res) => {
    const code = req.body.code;
    if (!code) {
        return res.status(400).send("No code provided");
    }

    try {
        const ast = esprima.parseScript(code, { loc: true });

        // Reset state
        nodeCounter = 0;
        graph = ["flowchart TD", "    Start([Start])"];
        lastNode = "Start";

        // Traverse
        ast.body.forEach(node => traverse(node));

        graph.push(`    End([End]):::startend`);
        addEdge(lastNode, "End");

        // Add Styling Definitions
        graph.push("    classDef startend fill:#003366,stroke:#333,stroke-width:2px,color:white");
        graph.push("    classDef process fill:#0070C0,stroke:#333,stroke-width:2px,color:white");
        graph.push("    classDef decision fill:#4CAF50,stroke:#333,stroke-width:2px,color:white");
        graph.push("    classDef io fill:#0070C0,stroke:#333,stroke-width:2px,color:white");
        graph.push("    style Start fill:#003366,stroke:#333,stroke-width:2px,color:white");

        res.json({ mermaid: graph.join('\n') });
    } catch (e) {
        res.status(400).json({ mermaid: `flowchart TD\n    Error["Error parsing JS: ${safeLabel(e.message)}"]` });
    }
});

app.post('/run-sql', (req, res) => {
    const sql = req.body.sql;
    if (!sql) {
        return res.status(400).json({ error: "No SQL provided" });
    }

    // Basic security check (very minimal)
    if (sql.toLowerCase().includes('drop') || sql.toLowerCase().includes('delete')) {
        // Allow DELETE for learning but maybe reset DB? For now let's just allow it.
    }

    db.all(sql, [], (err, rows) => {
        if (err) {
            return res.json({ error: err.message });
        }
        res.json({ results: rows });
    });
});

app.listen(3001, () => {
    console.log('JS Parser service listening on port 3001');
});
