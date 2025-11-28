import React, { useState } from 'react';
import { DndProvider, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import SqlBlock from './SqlBlock';

const QUESTIONS = [
    {
        id: 1,
        text: "Fetch all employees with salary greater than 50000.",
        hint: "Use SELECT * FROM ... WHERE ..."
    },
    {
        id: 2,
        text: "Find the names of all students.",
        hint: "Use SELECT name FROM students"
    }
];

const SYNTAX_BLOCKS = [
    { label: 'SELECT', type: 'keyword' },
    { label: '*', type: 'wildcard' },
    { label: 'FROM', type: 'keyword' },
    { label: 'WHERE', type: 'keyword' },
    { label: 'employees', type: 'table' },
    { label: 'students', type: 'table' },
    { label: 'salary', type: 'column' },
    { label: 'name', type: 'column' },
    { label: '>', type: 'operator' },
    { label: '50000', type: 'value' },
    { label: ';', type: 'terminator' }
];

const SqlBuilderContent = ({ theme }) => {
    const [queryBlocks, setQueryBlocks] = useState([]);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);
    const [currentQuestion, setCurrentQuestion] = useState(QUESTIONS[0]);

    const isDark = theme === 'dark';

    const [{ isOver }, drop] = useDrop(() => ({
        accept: 'SQL_BLOCK',
        drop: (item) => addBlock(item),
        collect: (monitor) => ({
            isOver: !!monitor.isOver(),
        }),
    }));

    const addBlock = (item) => {
        // If it has an ID, it's already in the list (reordering logic could go here, but for now just append new ones)
        // Actually, let's just append new blocks from the sidebar
        if (!item.id) {
            setQueryBlocks((prev) => [
                ...prev,
                { ...item, id: Date.now() + Math.random() }
            ]);
        }
    };

    const removeBlock = (id) => {
        setQueryBlocks((prev) => prev.filter(b => b.id !== id));
    };

    const runQuery = async () => {
        const sql = queryBlocks.map(b => b.label).join(' ');
        setError(null);
        setResult(null);

        try {
            const response = await fetch('http://localhost:3001/run-sql', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sql })
            });

            const data = await response.json();
            if (data.error) {
                setError(data.error);
            } else {
                setResult(data.results);
            }
        } catch (err) {
            setError("Failed to connect to backend.");
        }
    };

    const clearQuery = () => {
        setQueryBlocks([]);
        setResult(null);
        setError(null);
    };

    return (
        <div className={`flex flex-col h-full gap-4 ${isDark ? 'text-white' : 'text-gray-800'}`}>

            {/* Top Panel: Question */}
            <div className={`p-6 rounded-xl shadow-lg ${isDark ? 'bg-slate-800' : 'bg-white'} border-l-4 border-indigo-500`}>
                <h2 className="text-lg font-bold mb-2">Challenge:</h2>
                <p className="text-xl">{currentQuestion.text}</p>
                <p className={`text-sm mt-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Hint: {currentQuestion.hint}</p>
            </div>

            <div className="flex flex-1 gap-4 min-h-0">
                {/* Left Panel: Syntax Blocks */}
                <div className={`w-64 p-4 rounded-xl shadow-lg overflow-y-auto ${isDark ? 'bg-slate-800' : 'bg-white'}`}>
                    <h3 className="font-bold mb-4 text-sm uppercase tracking-wider text-gray-500">Toolbox</h3>
                    <div className="flex flex-wrap gap-2">
                        {SYNTAX_BLOCKS.map((block, i) => (
                            <SqlBlock key={i} type={block.type} label={block.label} isTemplate={true} />
                        ))}
                    </div>
                </div>

                {/* Right Panel: Builder Area */}
                <div className="flex-1 flex flex-col gap-4">
                    <div
                        ref={drop}
                        className={`flex-1 p-6 rounded-xl shadow-lg transition-colors ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-gray-50 border-gray-200'
                            } border-2 border-dashed ${isOver ? 'border-indigo-500 bg-indigo-50/10' : ''}`}
                    >
                        <div className="flex flex-wrap gap-2 items-center">
                            {queryBlocks.length === 0 && (
                                <div className="w-full h-full flex items-center justify-center text-gray-400">
                                    Drag blocks here to build your query
                                </div>
                            )}
                            {queryBlocks.map((block) => (
                                <div key={block.id} onClick={() => removeBlock(block.id)} className="cursor-pointer hover:opacity-80" title="Click to remove">
                                    <SqlBlock type={block.type} label={block.label} id={block.id} />
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Bottom Panel: Output */}
                    <div className={`h-64 p-4 rounded-xl shadow-lg flex flex-col ${isDark ? 'bg-black font-mono text-green-400' : 'bg-gray-900 font-mono text-green-400'}`}>
                        <div className="flex justify-between items-center mb-2 border-b border-gray-700 pb-2">
                            <span>Console Output</span>
                            <div className="flex gap-2">
                                <button onClick={clearQuery} className="px-3 py-1 text-xs rounded bg-gray-700 hover:bg-gray-600 text-white">Clear</button>
                                <button onClick={runQuery} className="px-3 py-1 text-xs rounded bg-green-600 hover:bg-green-500 text-white font-bold">Run Query</button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-auto">
                            {error && <div className="text-red-500">Error: {error}</div>}

                            {result && (
                                <div className="w-full">
                                    {result.length > 0 ? (
                                        <table className="w-full text-left text-sm">
                                            <thead>
                                                <tr className="border-b border-gray-700">
                                                    {Object.keys(result[0]).map(key => (
                                                        <th key={key} className="p-2">{key}</th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {result.map((row, i) => (
                                                    <tr key={i} className="border-b border-gray-800 hover:bg-gray-800">
                                                        {Object.values(row).map((val, j) => (
                                                            <td key={j} className="p-2">{val}</td>
                                                        ))}
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    ) : (
                                        <div className="text-gray-500">Query executed successfully. No results returned.</div>
                                    )}
                                </div>
                            )}

                            {!result && !error && (
                                <div className="text-gray-600">Ready to execute...</div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const SqlBuilder = ({ theme }) => {
    return (
        <DndProvider backend={HTML5Backend}>
            <SqlBuilderContent theme={theme} />
        </DndProvider>
    );
};

export default SqlBuilder;
