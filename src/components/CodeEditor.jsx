import React, { useState, useEffect, useRef } from 'react';
import Editor from '@monaco-editor/react';

export default function CodeEditor({ code, onChange, onExecute, theme = 'dark', language = 'python', activeLine = null }) {
  const isDark = theme === 'dark';
  const [copied, setCopied] = useState(false);
  const [cleared, setCleared] = useState(false);
  const editorRef = useRef(null);
  const decorationsRef = useRef([]);

  const handleEditorChange = (value) => {
    onChange(value || '');
  };

  const handleEditorDidMount = (editor, monaco) => {
    editorRef.current = editor;
  };

  // Update highlighting when activeLine changes
  useEffect(() => {
    if (editorRef.current && activeLine !== undefined && activeLine !== null && activeLine > 0) {
      const line = parseInt(activeLine, 10);

      decorationsRef.current = editorRef.current.deltaDecorations(decorationsRef.current, [
        {
          range: {
            startLineNumber: line,
            startColumn: 1,
            endLineNumber: line,
            endColumn: 1
          },
          options: {
            isWholeLine: true,
            className: 'myLineDecoration',
            glyphMarginClassName: 'myGlyphMarginClass'
          }
        }
      ]);

      editorRef.current.revealLineInCenter(line);
    } else if (editorRef.current) {
      // Clear decorations if no line
      decorationsRef.current = editorRef.current.deltaDecorations(decorationsRef.current, []);
    }
  }, [activeLine]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Copy failed', err);
    }
  };

  const handleDelete = () => {
    onChange('');
    setCleared(true);
    setTimeout(() => setCleared(false), 2000);
  };

  return (
    <div className={`${isDark ? 'bg-slate-900' : 'bg-white'} rounded-lg p-6 shadow-lg h-full flex flex-col`}>
      <style>{`
        .myLineDecoration {
          background: ${isDark ? '#3730a3' : '#e0e7ff'} !important;
          border-left: 2px solid ${isDark ? '#818cf8' : '#4f46e5'};
        }
      `}</style>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h2 className={`text-2xl font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Code Editor
          </h2>
          <span className={`inline-block text-sm px-2 py-1 rounded ${isDark ? 'bg-slate-800 text-gray-300' : 'bg-gray-100 text-gray-700'}`}>
            {language === 'javascript' ? 'JavaScript' : language === 'python' ? 'Python' : 'Java'}
          </span>
        </div>
        <div className="flex gap-2 items-center">
          <button
            onClick={handleCopy}
            title={copied ? 'Copied' : 'Copy code'}
            aria-label={copied ? 'Copied' : 'Copy code'}
            className={`p-2 rounded-md transition-colors flex items-center justify-center ${isDark ? 'bg-slate-700 hover:bg-slate-600 text-white' : 'bg-slate-600/10 hover:bg-gray-200 text-gray-800'
              }`}
          >
            {copied ? (
              <svg className="w-5 h-5 text-green-400" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            )}
          </button>

          <button
            onClick={handleDelete}
            title="Delete code"
            aria-label="Delete code"
            className={`p-2 rounded-md transition-colors flex items-center justify-center ${isDark ? 'bg-red-600 hover:bg-red-500 text-white' : 'bg-red-100 hover:bg-red-200 text-red-700'
              }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>

      <div className={`relative flex-1 rounded-lg overflow-hidden border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-gray-50 border-gray-200'
        }`}>
        <Editor
          height="100%"
          defaultLanguage={language}
          language={language}
          value={code}
          theme={isDark ? 'vs-dark' : 'light'}
          onChange={handleEditorChange}
          onMount={handleEditorDidMount}
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            lineNumbers: 'on',
            roundedSelection: false,
            scrollBeyondLastLine: false,
            readOnly: false,
            automaticLayout: true,
          }}
        />

        {/* Execute button placed inside editor container (bottom-right) */}
        {typeof onExecute === 'function' && (
          <div className="absolute right-4 bottom-4 z-10">
            <button
              onClick={onExecute}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm shadow-lg"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
              Execute
            </button>
          </div>
        )}
      </div>
    </div>
  );
}


