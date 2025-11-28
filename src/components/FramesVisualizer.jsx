import React from 'react'

export default function FramesVisualizer({ frames = [], objects = [], consoleLines = [], theme = 'dark', currentIndex = 0 }) {
  const isDark = theme === 'dark'

  const renderValue = (val) => {
    if (Array.isArray(val)) {
      return <span className="text-blue-400">[{val.map(v => renderValue(v)).reduce((prev, curr) => [prev, ', ', curr])}]</span>
    }
    if (typeof val === 'object' && val !== null) {
      return <span className="text-yellow-400">{'{...}'}</span>
    }
    if (typeof val === 'string') {
      return <span className="text-green-400">"{val}"</span>
    }
    if (typeof val === 'number') {
      return <span className="text-orange-400">{val}</span>
    }
    if (typeof val === 'boolean') {
      return <span className="text-purple-400">{String(val)}</span>
    }
    return <span>{String(val)}</span>
  }

  return (
    <div className={`flex flex-col gap-4 h-full`}>
      {/* Console Output - Kept at top for visibility */}
      <div className={`flex-none p-4 rounded-lg ${isDark ? 'bg-slate-900' : 'bg-white'} shadow-sm overflow-hidden flex flex-col h-1/3`}>
        <h3 className={`text-xs font-bold uppercase tracking-wider mb-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Console Output</h3>
        <div className={`flex-1 p-3 rounded border overflow-y-auto font-mono text-sm ${isDark ? 'bg-slate-950 border-slate-800 text-gray-300' : 'bg-gray-50 border-gray-200 text-gray-800'}`}>
          {consoleLines.length === 0 ? (
            <div className="opacity-50 italic">No output</div>
          ) : (
            consoleLines.map((ln, i) => (
              <div key={i} className="whitespace-pre-wrap">{ln}</div>
            ))
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1 min-h-0">
        {/* Stack Frames - Simplified */}
        <div className={`p-4 rounded-lg ${isDark ? 'bg-slate-900' : 'bg-white'} shadow-sm overflow-y-auto flex flex-col`}>
          <h3 className={`text-xs font-bold uppercase tracking-wider mb-3 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Frames (Call Stack)</h3>
          <div className="space-y-3 flex-1">
            {frames.length === 0 ? (
              <div className={`text-sm italic ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Not running</div>
            ) : (
              frames
                .map((f, idx) => {
                  const isTop = idx === frames.length - 1;
                  const title = f.name === '<module>' ? 'Global' : f.name;
                  const vars = f.variables || f.locals || {};

                  return (
                    <div key={idx} className={`border-l-2 pl-3 py-1 ${isTop ? (isDark ? 'border-indigo-500' : 'border-indigo-500') : (isDark ? 'border-slate-700' : 'border-gray-300')}`}>
                      <div className={`text-sm font-semibold mb-1 ${isTop ? (isDark ? 'text-indigo-400' : 'text-indigo-600') : (isDark ? 'text-gray-400' : 'text-gray-600')}`}>
                        {title}
                      </div>
                      <div className="space-y-1">
                        {Object.keys(vars).length === 0 ? (
                          <div className={`text-xs italic ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>empty</div>
                        ) : (
                          Object.entries(vars).map(([k, v]) => (
                            <div key={k} className="flex items-baseline gap-2 text-xs font-mono">
                              <span className={`${isDark ? 'text-indigo-300' : 'text-indigo-700'}`}>{k}</span>
                              <span className={`${isDark ? 'text-gray-500' : 'text-gray-400'}`}>=</span>
                              <span className={`${isDark ? 'text-gray-300' : 'text-gray-800'} break-all`}>{v}</span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )
                })
            )}
          </div>
        </div>

        {/* Objects - Simplified */}
        <div className={`p-4 rounded-lg ${isDark ? 'bg-slate-900' : 'bg-white'} shadow-sm overflow-y-auto flex flex-col`}>
          <h3 className={`text-xs font-bold uppercase tracking-wider mb-3 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Objects</h3>
          <div className={`text-sm flex-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            {objects.length === 0 ? (
              <div className="italic opacity-50">No objects</div>
            ) : (
              <div className="space-y-2">
                {objects.map((o, i) => (
                  <div key={i} className={`p-2 rounded border ${isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-gray-50 border-gray-100'}`}>
                    <div className="flex gap-2 items-center mb-1">
                      <span className={`text-xs font-bold ${isDark ? 'text-pink-400' : 'text-pink-600'}`}>{o.name}</span>
                      <span className="text-xs opacity-50">({o.type})</span>
                    </div>
                    <div className={`font-mono text-xs ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                      {String(o.value)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
