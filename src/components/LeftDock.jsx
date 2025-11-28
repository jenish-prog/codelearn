import React from 'react';

const LeftDock = ({ theme, onSelect }) => {
    const isDark = theme === 'dark';
    const baseClasses = `w-16 flex flex-col items-center py-4 gap-6 border-r transition-colors duration-300 ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-200'
        }`;

    const itemClasses = `p-3 rounded-xl transition-all duration-200 group relative ${isDark ? 'hover:bg-slate-800 text-slate-400 hover:text-indigo-400' : 'hover:bg-gray-100 text-gray-500 hover:text-indigo-600'
        }`;

    return (
        <div className={baseClasses}>
            {/* Language Dock Item */}
            <button className={itemClasses} title="Language" onClick={() => onSelect('editor')}>
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                </svg>
                <span className="absolute left-14 top-1/2 -translate-y-1/2 px-2 py-1 rounded text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 bg-gray-800 text-white pointer-events-none">
                    Language
                </span>
            </button>

            {/* Database Dock Item */}
            <button className={itemClasses} title="Database" onClick={() => onSelect('database')}>
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
                </svg>
                <span className="absolute left-14 top-1/2 -translate-y-1/2 px-2 py-1 rounded text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 bg-gray-800 text-white pointer-events-none">
                    Database
                </span>
            </button>
        </div>
    );
};

export default LeftDock;
