import React, { useState, useEffect, useRef } from 'react';
import mermaid from 'mermaid';

import CodeEditor from './components/CodeEditor';
import RightContainer from './components/RightContainer';
import ExecutionVisualization from './components/ExecutionVisualization';
import FramesVisualizer from './components/FramesVisualizer';
import AIAssistant from './components/AIAssistant';
import LeftDock from './components/LeftDock';
import SqlBuilder from './components/SqlBuilder';

function App() {
  const [theme, setTheme] = useState('dark'); // 'dark' orrrr 'light'
  const [language, setLanguage] = useState('python');
  const [executionSteps, setExecutionSteps] = useState([]);

  const [framesData, setFramesData] = useState([]);
  const [objectsList, setObjectsList] = useState([]);
  const [consoleLines, setConsoleLines] = useState([]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('flowchart'); // 'execution' or 'flowchart'
  const [activeView, setActiveView] = useState('editor'); // 'editor' or 'database'
  const [flowchartCode, setFlowchartCode] = useState('');

  // Flowchart Controls
  const [zoom, setZoom] = useState(1);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const [flowchartActiveLine, setFlowchartActiveLine] = useState(null);
  const [totalNodes, setTotalNodes] = useState(0);

  const timerRef = useRef(null);

  const TEMPLATES = {
    python: `# Python Code Visualizer
# Write your code here and click Generate Flowchart!

def factorial(n):
    if n == 0:
        return 1
    return n * factorial(n - 1)

result = factorial(5)
print(f"Factorial of 5 is {result}")
`,
    javascript: `// JavaScript Code Visualizer
// Write your code here and click Generate Flowchart!

function factorial(n) {
  if (n === 0) {
    return 1;
  }
  return n * factorial(n - 1);
}

const result = factorial(5);
console.log("Factorial of 5 is " + result);
`,
    java: `// Java Code Visualizer
// Write your code here and click Generate Flowchart!

public class Main {
    public static int factorial(int n) {
        if (n == 0) {
            return 1;
        }
        return n * factorial(n - 1);
    }

    public static void main(String[] args) {
        int result = factorial(5);
        System.out.println("Factorial of 5 is " + result);
    }
}
`
  };

  const [code, setCode] = useState(TEMPLATES.python);

  useEffect(() => {
    setCode(TEMPLATES[language] || '');
  }, [language]);

  useEffect(() => {
    mermaid.initialize({ startOnLoad: true, theme: theme === 'dark' ? 'dark' : 'default', maxTextSize: 1000000 });
  }, [theme]);

  useEffect(() => {
    if (activeTab === 'flowchart' && flowchartCode) {
      mermaid.contentLoaded();
      // Count total nodes after render
      setTimeout(() => {
        const svg = document.querySelector('.mermaid svg');
        if (svg) {
          setTotalNodes(svg.querySelectorAll('.node').length);
        }
      }, 500);
    }
  }, [activeTab, flowchartCode]);

  // Effect to handle node highlighting in Mermaid SVG and Code Editor
  useEffect(() => {
    if (activeTab === 'flowchart') {
      const svg = document.querySelector('.mermaid svg');
      if (svg) {
        // Clear previous highlights
        svg.querySelectorAll('.node').forEach(n => {
          n.style.opacity = '1';
          const shape = n.querySelector('rect, circle, polygon, path');
          if (shape) {
            shape.style.stroke = '';
            shape.style.strokeWidth = '';
            shape.style.filter = '';
            shape.style.animation = '';
          }
        });

        if (highlightIndex >= 0) {
          const nodes = Array.from(svg.querySelectorAll('.node'));
          const targetNode = nodes[highlightIndex];

          if (targetNode) {
            const shape = targetNode.querySelector('rect, circle, polygon, path');
            if (shape) {
              shape.style.stroke = '#ff0000'; // Highlight color
              shape.style.strokeWidth = '4px';
              shape.style.filter = 'drop-shadow(0 0 8px rgba(255, 0, 0, 0.6))'; // Glow effect
              // Add pulse animation
              // We can't easily add keyframes via JS style, but we can toggle a class if we had one.
              // Or just rely on the glow.

              targetNode.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });

              // Extract line number from ID (e.g., "flowchart-N1_L5-...")
              const match = targetNode.id.match(/_L(\d+)/);
              if (match) {
                setFlowchartActiveLine(parseInt(match[1], 10));
              } else {
                setFlowchartActiveLine(null);
              }
            }
          }
        } else {
          setFlowchartActiveLine(null);
        }
      }
    }
  }, [highlightIndex, activeTab, flowchartCode]);

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  const generateFlowchart = async () => {
    try {
      const response = await fetch('http://localhost:8000/generate-flowchart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language, code })
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.detail || 'Failed to generate flowchart');
      }

      const data = await response.json();
      setFlowchartCode(data.mermaid);
      setActiveTab('flowchart');
      setHighlightIndex(0); // Start at the first node (Start)
      setFlowchartActiveLine(null);

      // Re-render mermaid with a slight delay to prevent "Syntax error" race condition
      setTimeout(() => {
        const element = document.querySelector('.mermaid');
        if (element) {
          element.removeAttribute('data-processed');
          mermaid.contentLoaded();
        }
      }, 100);

    } catch (err) {
      alert('Flowchart generation failed: ' + err.message);
    }
  };

  const executeCode = async () => {
    // Call backend /api/visualize and populate UI state
    try {
      setPlaying(false)
      setCurrentIndex(0)
      setExecutionSteps([])
      setFramesData([])
      setConsoleLines([])
      setObjectsList([])
      setActiveTab('execution');

      // Language mismatch detection
      if (language === 'python') {
        const jsKeywords = ['console.log', 'function ', 'var ', 'let ', 'const ', '=>', 'document.', 'window.'];
        if (jsKeywords.some(kw => code.includes(kw))) {
          const confirmSwitch = window.confirm("It looks like you're writing JavaScript but Python is selected. Switch to JavaScript?");
          if (confirmSwitch) {
            setLanguage('javascript');
            return;
          }
        }
      } else if (language === 'javascript') {
        const pyKeywords = ['def ', 'print(', 'import ', 'class ', 'if __name__', 'elif '];
        if (pyKeywords.some(kw => code.includes(kw))) {
          const confirmSwitch = window.confirm("It looks like you're writing Python but JavaScript is selected. Switch to Python?");
          if (confirmSwitch) {
            setLanguage('python');
            return;
          }
        }
      } else if (language === 'java') {
        // Basic Java checks
        if (!code.includes('public class') && !code.includes('System.out.println')) {
          // Maybe it's python or JS?
          if (code.includes('def ') || code.includes('print(')) {
            const confirmSwitch = window.confirm("It looks like you're writing Python but Java is selected. Switch to Python?");
            if (confirmSwitch) {
              setLanguage('python');
              return;
            }
          }
        }
      }

      const apiBase = (import.meta && import.meta.env && import.meta.env.VITE_API_URL) ? import.meta.env.VITE_API_URL : 'http://127.0.0.1:5001'
      const resp = await fetch(`${apiBase}/api/visualize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, language })
      })

      if (!resp.ok) {
        // try to parse JSON body; backend may return partial results on timeout (408)
        let parsed = null
        try {
          parsed = await resp.json()
        } catch (e) {
          parsed = await resp.text()
        }

        if (resp.status === 408 && parsed && parsed.partial && Array.isArray(parsed.partial.steps)) {
          // show partial results to user
          const steps = parsed.partial.steps
          const list = steps.map(s => ({ id: s.step_number || s.step || null, type: s.event || 'step', description: s.code_line || (s.event || 'step'), highlighted: '' }))
          setExecutionSteps(list)
          setFramesData(steps)
          const lastOut = steps.length ? (steps[steps.length - 1].output || '') : ''
          setConsoleLines(lastOut ? lastOut.split('\n') : [])
          setCurrentIndex(0)
          setPlaying(false)
          alert('Execution timed out; showing partial results')
          return
        }

        throw new Error(`Backend error: ${resp.status} ${typeof parsed === 'string' ? parsed : JSON.stringify(parsed)}`)
      }

      const steps = await resp.json()

      const list = steps.map(s => ({ id: s.step_number || s.step || 0, type: s.event || 'step', description: s.code_line || (s.event || 'step'), highlighted: '' }))

      setExecutionSteps(list)
      setFramesData(steps)
      const lastOut = steps.length ? (steps[steps.length - 1].output || '') : ''
      setConsoleLines(lastOut ? lastOut.split('\n') : [])
      setCurrentIndex(0)
      setPlaying(false)
    } catch (err) {
      console.error('visualize failed', err)
      setExecutionSteps([])
      setFramesData([])
      setConsoleLines([])
      setObjectsList([])
      setCurrentIndex(0)
      setPlaying(false)

      if (String(err).includes('Failed to fetch') || String(err).includes('NetworkError')) {
        alert('⚠️ The "Execute" feature is currently unavailable (Backend port 5001 not running).\n\n✅ Please use the "Generate Flowchart" button in the top header instead! (Backend port 8000)');
      } else {
        alert('Visualization failed: ' + (err && err.message ? err.message : String(err)))
      }
    }
  }

  // advance stepIndex while playing
  useEffect(() => {
    if (playing) {
      timerRef.current = setInterval(() => {
        setCurrentIndex((prev) => {
          if (prev + 1 >= framesData.length) {
            clearInterval(timerRef.current);
            setPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, 800);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [playing, framesData]);

  // Update objects list and console when currentIndex changes
  useEffect(() => {
    if (framesData.length > 0 && currentIndex < framesData.length) {
      const step = framesData[currentIndex];

      // Populate objects list from all variables in all frames for now
      const allVars = [];
      if (step.frames) {
        step.frames.forEach(f => {
          if (f.variables) {
            Object.entries(f.variables).forEach(([k, v]) => {
              allVars.push({ type: 'var', name: k, value: v });
            });
          }
        });
      }
      setObjectsList(allVars);

      // Accumulate console output from all steps up to and including current step
      const allOutput = [];
      for (let i = 0; i <= currentIndex; i++) {
        const stepOutput = framesData[i].output || '';
        if (stepOutput.trim()) {
          // Split by newlines and add non-empty lines
          const lines = stepOutput.split('\n').filter(line => line.trim());
          allOutput.push(...lines);
        }
      }
      setConsoleLines(allOutput);
    } else {
      setObjectsList([]);
      setConsoleLines([]);
    }
  }, [currentIndex, framesData]);

  const isDark = theme === 'dark';

  // Determine current line number for highlighting
  // If in Flowchart mode, use flowchartActiveLine
  // If in Execution mode, use framesData[currentIndex]
  let activeLine = null;
  if (activeTab === 'flowchart') {
    activeLine = flowchartActiveLine;
  } else {
    const currentStepData = framesData[currentIndex];
    activeLine = currentStepData ? currentStepData.line_number : null;
  }

  return (
    <div className={`min-h-screen flex flex-col transition-colors duration-300 ${isDark ? 'bg-slate-950' : 'bg-gray-50'}`}>
      {/* Background Gradient */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className={`absolute top-0 left-1/4 w-96 h-96 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob ${isDark ? 'bg-purple-700' : 'bg-purple-300'}`}></div>
        <div className={`absolute top-0 right-1/4 w-96 h-96 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000 ${isDark ? 'bg-indigo-700' : 'bg-indigo-300'}`}></div>
        <div className={`absolute -bottom-32 left-1/3 w-96 h-96 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000 ${isDark ? 'bg-pink-700' : 'bg-pink-300'}`}></div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left Dock */}
        <LeftDock theme={theme} onSelect={setActiveView} />

        <div className="flex-1 flex flex-col h-screen overflow-hidden">
          {/* Header (fixed) */}
          <header className={`relative z-50 border-b backdrop-blur-md ${isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white/80 border-gray-200'} px-6 py-4 sticky top-0`}>
            <div className="max-w-7xl mx-auto flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${isDark ? 'bg-indigo-600' : 'bg-indigo-500'}`}>
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>
                </div>
                <div>
                  <h1 className={`text-xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    CodeVisualizer
                  </h1>
                </div>
              </div>

              <div className="flex gap-4 items-center">
                <button
                  onClick={generateFlowchart}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${isDark ? 'bg-green-600 text-white hover:bg-green-500' : 'bg-green-500 text-white hover:bg-green-600'}`}
                >
                  Generate Flowchart
                </button>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className={`bg-transparent border-none text-sm font-medium focus:ring-0 cursor-pointer ${isDark ? 'text-gray-300' : 'text-gray-600'}`}
                  aria-label="Select language"
                >
                  <option value="python">Python</option>
                  <option value="javascript">JavaScript</option>
                  <option value="java">Java</option>
                </select>

                <button
                  onClick={toggleTheme}
                  className={`p-2 rounded-lg transition-all ${isDark ? 'bg-slate-800 text-yellow-400 hover:bg-slate-700' : 'bg-gray-100 text-slate-700 hover:bg-gray-200'
                    }`}
                  aria-label="Toggle theme"
                >
                  {isDark ? (
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path d="M12 3v2M12 19v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          </header>

          {/* Main Content */}
          {activeView === 'editor' ? (
            <main className="relative z-10 flex-1 max-w-7xl mx-auto w-full p-4 lg:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column: Editor */}
              <div className="lg:col-span-5 flex flex-col h-[600px] lg:h-[calc(100vh-7rem)]">
                <CodeEditor
                  code={code}
                  onChange={setCode}
                  onExecute={executeCode}
                  theme={theme}
                  language={language}
                  activeLine={activeLine}
                />
              </div>

              {/* Right Column: Visualization */}
              <div className="lg:col-span-7 flex flex-col h-[800px] lg:h-[calc(100vh-7rem)] gap-6">

                {/* Tabs */}
                <div className="flex gap-2 border-b border-gray-700 pb-2">

                  <button
                    onClick={() => setActiveTab('flowchart')}
                    className={`px-3 py-1 rounded ${activeTab === 'flowchart' ? (isDark ? 'bg-indigo-600 text-white' : 'bg-indigo-500 text-white') : 'text-gray-500'}`}
                  >
                    Flowchart
                  </button>
                </div>

                {activeTab === 'execution' ? (
                  <>
                    {language === 'java' && (
                      <div className={`text-xs px-3 py-2 rounded-md border ${isDark ? 'bg-yellow-900/20 border-yellow-700 text-yellow-300' : 'bg-yellow-50 border-yellow-300 text-yellow-700'}`}>
                        Java visualization runs in basic mode: line steps from main and final output.
                      </div>
                    )}
                    <div className="flex-none">
                      <ExecutionVisualization
                        steps={executionSteps}
                        theme={theme}
                        currentStep={currentIndex}
                        playing={playing}
                        onPlay={() => setPlaying(true)}
                        onPause={() => setPlaying(false)}
                        onReset={() => { setCurrentIndex(0); setPlaying(false); }}
                        onStepChange={(step) => {
                          setPlaying(false);
                          setCurrentIndex(step);
                        }}
                      />
                    </div>

                    <div className="flex-1 min-h-0">
                      <FramesVisualizer
                        frames={(framesData[currentIndex] && framesData[currentIndex].frames) || []}
                        objects={objectsList}
                        consoleLines={consoleLines}
                        theme={theme}
                        currentIndex={0}
                      />
                    </div>
                  </>
                ) : (
                  <div className={`flex-1 flex flex-col overflow-hidden rounded-lg ${isDark ? 'bg-slate-900' : 'bg-white'} border ${isDark ? 'border-slate-800' : 'border-gray-200'}`}>

                    {/* Flowchart Controls */}
                    <div className={`flex items-center justify-between p-2 border-b ${isDark ? 'border-slate-800' : 'border-gray-200'}`}>
                      <div className="flex gap-2">
                        <button onClick={() => setZoom(z => Math.max(0.5, z - 0.1))} className="p-1 rounded hover:bg-gray-700 text-gray-400 hover:text-white" title="Zoom Out">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" /></svg>
                        </button>
                        <span className="text-xs text-gray-500 self-center">{Math.round(zoom * 100)}%</span>
                        <button onClick={() => setZoom(z => Math.min(2, z + 0.1))} className="p-1 rounded hover:bg-gray-700 text-gray-400 hover:text-white" title="Zoom In">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                        </button>
                      </div>

                      <div className="flex gap-2">
                        <button onClick={() => setHighlightIndex(0)} className="px-2 py-1 text-xs rounded bg-gray-700 text-white hover:bg-gray-600">First</button>
                        <button onClick={() => setHighlightIndex(i => Math.max(0, i - 1))} className="px-2 py-1 text-xs rounded bg-gray-700 text-white hover:bg-gray-600">Prev</button>
                        <span className="text-xs text-gray-500 self-center">Node {highlightIndex >= 0 ? highlightIndex + 1 : '-'} / {totalNodes}</span>
                        <button onClick={() => setHighlightIndex(i => Math.min(totalNodes - 1, i + 1))} className="px-2 py-1 text-xs rounded bg-gray-700 text-white hover:bg-gray-600">Next</button>
                        <button onClick={() => setHighlightIndex(totalNodes - 1)} className="px-2 py-1 text-xs rounded bg-gray-700 text-white hover:bg-gray-600">Last</button>
                      </div>
                    </div>

                    <div className="flex-1 overflow-auto p-4 relative">
                      {flowchartCode ? (
                        <div
                          className="mermaid transition-transform duration-200 origin-top-left"
                          style={{ transform: `scale(${zoom})` }}
                        >
                          {flowchartCode}
                        </div>
                      ) : (
                        <div className="text-center text-gray-500 mt-10">
                          Click "Generate Flowchart" to see the diagram.
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </main>
          ) : (
            <main className="relative z-10 flex-1 max-w-7xl mx-auto w-full p-4 lg:p-6 h-screen">
              <SqlBuilder theme={theme} />
            </main>
          )}
        </div>
      </div>

      {/* AI Assistant Sidebar */}
      <AIAssistant
        isOpen={isAssistantOpen}
        onClose={() => setIsAssistantOpen(false)}
        theme={theme}
        code={code}
      />

      {/* Floating Toggle Button (only visible when closed) */}
      {
        !isAssistantOpen && (
          <button
            onClick={() => setIsAssistantOpen(true)}
            className={`fixed right-0 top-1/2 transform -translate-y-1/2 z-40 p-3 rounded-l-xl shadow-xl transition-all duration-300 hover:pr-4 ${isDark ? 'bg-indigo-600 text-white hover:bg-indigo-500' : 'bg-indigo-500 text-white hover:bg-indigo-600'
              }`}
            aria-label="Open AI Assistant"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </button>
        )
      }
    </div >
  );
}

export default App;
