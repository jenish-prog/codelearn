import React from 'react'

export default function RightContainer({ theme = 'dark', children = null }) {
  const isDark = theme === 'dark'

  return (
    <div className={`p-6 rounded-lg shadow-lg ${isDark ? 'bg-slate-900' : 'bg-white' } h-full`}>
      <div className={`text-lg font-semibold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>Right Panel</div>
      <div className={`rounded-md ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-gray-50 border-gray-200'} p-4 h-full`}>
        {children ? children : (
          <div className={`${isDark ? 'text-gray-400' : 'text-gray-500'} font-mono`}>
            This area is reserved for visualizations or helper UI. It matches the code box height.
          </div>
        )}
      </div>
    </div>
  )
}
