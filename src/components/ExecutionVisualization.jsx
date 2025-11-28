import React from 'react'

export default function ExecutionVisualization({ steps = [], theme = 'dark', currentStep = 0, playing = false, onPlay = () => { }, onPause = () => { }, onReset = () => { }, onStepChange = () => { } }) {
  const isDark = theme === 'dark'
  const totalSteps = steps.length
  const currentStepData = steps[currentStep]

  const handleSliderChange = (e) => {
    const val = parseInt(e.target.value, 10)
    onStepChange(val)
  }

  return (
    <div className={`p-6 rounded-lg ${isDark ? 'bg-slate-900' : 'bg-white'} shadow-sm flex flex-col gap-4`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className={`text-xl font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Execution Control</h2>

          {/* Controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => onStepChange(0)}
              disabled={currentStep === 0 || totalSteps === 0}
              className={`p-1.5 rounded-full transition-colors ${isDark ? 'hover:bg-slate-800 text-gray-300 disabled:text-gray-700' : 'hover:bg-gray-100 text-gray-600 disabled:text-gray-300'}`}
              title="First Step"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" /></svg>
            </button>

            <button
              onClick={() => onStepChange(Math.max(0, currentStep - 1))}
              disabled={currentStep === 0 || totalSteps === 0}
              className={`p-1.5 rounded-full transition-colors ${isDark ? 'hover:bg-slate-800 text-gray-300 disabled:text-gray-700' : 'hover:bg-gray-100 text-gray-600 disabled:text-gray-300'}`}
              title="Previous Step"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            </button>

            <button
              onClick={() => onStepChange(Math.min(totalSteps - 1, currentStep + 1))}
              disabled={currentStep === totalSteps - 1 || totalSteps === 0}
              className={`p-1.5 rounded-full transition-colors ${isDark ? 'hover:bg-slate-800 text-gray-300 disabled:text-gray-700' : 'hover:bg-gray-100 text-gray-600 disabled:text-gray-300'}`}
              title="Next Step"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </button>

            <button
              onClick={() => onStepChange(totalSteps - 1)}
              disabled={currentStep === totalSteps - 1 || totalSteps === 0}
              className={`p-1.5 rounded-full transition-colors ${isDark ? 'hover:bg-slate-800 text-gray-300 disabled:text-gray-700' : 'hover:bg-gray-100 text-gray-600 disabled:text-gray-300'}`}
              title="Last Step"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" /></svg>
            </button>
          </div>
        </div>

        <div className={`text-sm font-mono ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
          Step {currentStep + 1} of {totalSteps || 1}
        </div>
      </div>

      {/* Current Step Info */}
      <div className={`mt-2 p-3 rounded-md border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-gray-50 border-gray-200'}`}>
        <div className={`text-xs font-bold uppercase tracking-wider mb-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Current Action</div>
        <div className={`text-sm font-mono ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
          {currentStepData ? (
            <>
              <span className="text-indigo-500 font-semibold mr-2">Line {currentStepData.line_number}:</span>
              <span>{currentStepData.code_line || currentStepData.description || currentStepData.event}</span>
            </>
          ) : (
            <span className="italic opacity-50">Ready to execute</span>
          )}
        </div>
      </div>
    </div>
  )
}
