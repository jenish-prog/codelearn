import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

import chatgptIcon from '../assets/chatgpt.png';
import notionIcon from '../assets/notion.png';
import llamaIcon from '../assets/llama.png';

const NotionAuthModal = ({ isOpen, onClose, onSave, isDark }) => {
    const [token, setToken] = useState('');

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className={`w-full max-w-md p-6 rounded-2xl shadow-2xl transform transition-all scale-100 ${isDark ? 'bg-slate-900 border border-slate-700' : 'bg-white'}`}>
                <h3 className={`text-xl font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>Connect Notion</h3>
                <p className={`mb-4 text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    Enter your Notion Integration Token to enable saving code and querying your workspace.
                </p>

                <input
                    type="password"
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    placeholder="secret_..."
                    className={`w-full p-2 mb-6 rounded border ${isDark ? 'bg-slate-800 border-slate-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                />

                <div className="flex justify-end gap-2">
                    <button
                        onClick={onClose}
                        className={`px-4 py-2 rounded-lg text-sm font-medium ${isDark ? 'text-gray-300 hover:bg-slate-800' : 'text-gray-600 hover:bg-gray-100'}`}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={() => onSave(token)}
                        disabled={!token.trim()}
                        className="px-4 py-2 rounded-lg text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <img src={notionIcon} alt="Notion" className="w-4 h-4 invert brightness-0 saturate-100 filter" style={{ filter: 'brightness(0) invert(1)' }} />
                        Save Token
                    </button>
                </div>
            </div>
        </div>
    );
};

export default function AIAssistant({ isOpen, onClose, theme, code }) {
    const [messages, setMessages] = useState([
        { role: 'assistant', content: 'Hi! I am your AI coding assistant. How can I help you with your code today?' }
    ]);
    const [input, setInput] = useState('');
    const [activeModel, setActiveModel] = useState(null);
    const [notionKey, setNotionKey] = useState(localStorage.getItem('notionKey') || '');
    const [showNotionModal, setShowNotionModal] = useState(false);

    const messagesEndRef = useRef(null);
    const isDark = theme === 'dark';

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);



    const handleInputChange = (e) => {
        const val = e.target.value;

        // Check for triggers
        if (!activeModel) {
            if (val.toLowerCase() === 'chatgpt ') {
                setActiveModel('chatgpt');
                setInput('');
                return;
            }
            // Notion trigger moved to handleSend (on Enter)
            if (val.toLowerCase() === 'perplexity ') {
                setActiveModel('perplexity');
                setInput('');
                return;
            }
        }

        setInput(val);
    };

    const handleSaveToken = (token) => {
        if (token) {
            setNotionKey(token);
            localStorage.setItem('notionKey', token);
            setShowNotionModal(false);
            setActiveModel('notion');
            setMessages(prev => [...prev, { role: 'assistant', content: "Successfully saved Notion token!" }]);
        }
    };

    const handleSend = async () => {
        if (!input.trim() && !activeModel) return;

        let modelName = activeModel ? activeModel : 'llama';
        let messageContent = input;
        let displayContent = input;

        // Check for explicit "notion" command if no active model
        const lowerInput = input.trim().toLowerCase();
        if (!activeModel && (lowerInput === 'notion' || lowerInput.startsWith('notion '))) {
            modelName = 'notion';
            // If it's just "notion", we might want to just switch mode? 
            // But user said "type notion and type any thing". 
            // Let's treat it as a command.
            // If starts with "notion ", remove prefix for the message sent to backend (optional, but cleaner)
            // Actually, backend might expect the full query or just the intent. 
            // Let's keep the full message for now or strip it? 
            // The backend logic checks `if "save" in message.lower()`. 
            // If I strip "notion ", "notion save" becomes "save". That works.
            if (lowerInput.startsWith('notion ')) {
                messageContent = input.slice(7);
            } else {
                messageContent = ""; // Just "notion" typed
            }

            displayContent = `[Notion] ${messageContent}`;
        }

        // Auth Check for Notion
        if (modelName === 'notion' && !notionKey) {
            setShowNotionModal(true);
            return;
        }

        // If we just switched to Notion mode via command but didn't have a message (just typed "notion"), 
        // maybe we should just set activeModel and return?
        if (modelName === 'notion' && !activeModel && !messageContent) {
            setActiveModel('notion');
            setInput('');
            return;
        }

        const content = activeModel ? `[Using ${activeModel}] ${input}` : displayContent;

        const userMessage = { role: 'user', content: content };

        setMessages(prev => [...prev, userMessage]);
        setInput('');

        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    message: messageContent || input, // Use processed message or original
                    model: modelName,
                    apiKey: modelName === 'notion' ? notionKey : undefined,
                    currentCode: code
                }),
            });

            if (!response.ok) {
                throw new Error('Network response was not ok');
            }

            const data = await response.json();
            setMessages(prev => [...prev, data]);
        } catch (error) {
            console.error('Error sending message:', error);
            const errorMessage = { role: 'assistant', content: "Error: Could not connect to the backend. Is it running?" };
            setMessages(prev => [...prev, errorMessage]);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
        // Handle backspace to remove chip
        if (e.key === 'Backspace' && input === '' && activeModel) {
            setActiveModel(null);
        }
    };

    const getModelIcon = () => {
        if (activeModel === 'chatgpt') return chatgptIcon;
        if (activeModel === 'notion') return notionIcon;
        // Llama is default, so no specific icon needed for the chip
        return null;
    };

    const getModelName = () => {
        if (activeModel === 'chatgpt') return 'ChatGPT';
        if (activeModel === 'notion') return 'Notion';
        if (activeModel === 'perplexity') return 'Perplexity';
        return '';
    };

    // Custom renderer for code blocks
    const CodeBlock = ({ node, inline, className, children, ...props }) => {
        const match = /language-(\w+)/.exec(className || '');
        const [copied, setCopied] = useState(false);

        const handleCopy = () => {
            navigator.clipboard.writeText(String(children).replace(/\n$/, ''));
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        };

        return !inline && match ? (
            <div className="relative group rounded-md overflow-hidden my-2">
                <div className="flex justify-between items-center bg-[#1e1e1e] px-4 py-2 text-xs text-gray-400 border-b border-gray-700">
                    <span>{match[1]}</span>
                    <button
                        onClick={handleCopy}
                        className="flex items-center gap-1 hover:text-white transition-colors"
                    >
                        {copied ? (
                            <>
                                <svg className="w-3.5 h-3.5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                <span className="text-green-500">Copied!</span>
                            </>
                        ) : (
                            <>
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                </svg>
                                <span>Copy</span>
                            </>
                        )}
                    </button>
                </div>
                <SyntaxHighlighter
                    style={vscDarkPlus}
                    language={match[1]}
                    PreTag="div"
                    customStyle={{ margin: 0, borderRadius: '0 0 0.375rem 0.375rem' }}
                    {...props}
                >
                    {String(children).replace(/\n$/, '')}
                </SyntaxHighlighter>
            </div>
        ) : (
            <code className={`${className} bg-black/10 dark:bg-white/10 rounded px-1 py-0.5`} {...props}>
                {children}
            </code>
        );
    };

    return (
        <>
            <NotionAuthModal
                isOpen={showNotionModal}
                onClose={() => setShowNotionModal(false)}
                onSave={handleSaveToken}
                isDark={isDark}
            />
            <div
                className={`fixed top-0 right-0 h-full w-96 shadow-2xl transform transition-transform duration-300 ease-in-out z-[60] flex flex-col ${isOpen ? 'translate-x-0' : 'translate-x-full'
                    } ${isDark ? 'bg-slate-900 border-l border-slate-800' : 'bg-white border-l border-gray-200'}`}
            >
                {/* Header */}
                <div className={`p-4 border-b flex justify-between items-center ${isDark ? 'border-slate-800' : 'border-gray-200'}`}>
                    <div className="flex items-center gap-2">
                        <div className={`p-1.5 rounded-lg ${isDark ? 'bg-indigo-600' : 'bg-indigo-500'}`}>
                            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                        </div>
                        <h2 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>AI Assistant</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className={`p-1 rounded-md transition-colors ${isDark ? 'hover:bg-slate-800 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {messages.map((msg, idx) => (
                        <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div
                                className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${msg.role === 'user'
                                    ? 'bg-indigo-600 text-white rounded-br-none'
                                    : `${isDark ? 'bg-slate-800 text-gray-200' : 'bg-gray-100 text-gray-800'} rounded-bl-none`
                                    }`}
                            >
                                {msg.role === 'user' ? (
                                    msg.content
                                ) : (
                                    <ReactMarkdown
                                        components={{
                                            code: CodeBlock
                                        }}
                                    >
                                        {msg.content}
                                    </ReactMarkdown>
                                )}
                            </div>
                        </div>
                    ))}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <div className={`p-4 border-t ${isDark ? 'border-slate-800 bg-slate-900' : 'border-gray-200 bg-white'}`}>
                    <div className={`flex items-center gap-2 rounded-xl border px-3 py-2 ${isDark ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-gray-50'
                        }`}>

                        {/* Active Model Node Chip */}
                        {activeModel && (
                            <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-md text-sm font-medium select-none animate-in fade-in slide-in-from-left-2 ${isDark ? 'bg-emerald-500/20 text-emerald-300' : 'bg-emerald-100 text-emerald-700'
                                }`}>
                                <div className={`w-4 h-4 rounded-full flex items-center justify-center overflow-hidden ${isDark ? 'bg-emerald-500 text-black' : 'bg-emerald-600 text-white'
                                    }`}>
                                    {getModelIcon() ? (
                                        <img src={getModelIcon()} alt={getModelName()} className="w-full h-full object-cover" />
                                    ) : (
                                        <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="currentColor">
                                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
                                        </svg>
                                    )}
                                </div>
                                <span>{getModelName()}</span>
                                <button
                                    onClick={() => setActiveModel(null)}
                                    className="ml-1 hover:text-red-500"
                                >
                                    ×
                                </button>
                            </div>
                        )}

                        <input
                            type="text"
                            value={input}
                            onChange={handleInputChange}
                            onKeyDown={handleKeyDown}
                            placeholder={activeModel ? `Ask ${getModelName()}...` : "Ask Llama... (or type 'chatgpt ')"}
                            className={`flex-1 bg-transparent border-none focus:ring-0 text-sm ${isDark ? 'text-white placeholder-gray-500' : 'text-gray-900 placeholder-gray-400'
                                }`}
                        />
                        <button
                            onClick={handleSend}
                            disabled={!input.trim() && !activeModel}
                            className={`p-1.5 rounded-lg transition-colors ${input.trim() || activeModel
                                ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                                : 'bg-gray-300 text-gray-500 cursor-not-allowed opacity-50'
                                }`}
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                            </svg>
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
}
