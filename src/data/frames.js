const frames = [
  { line: 2, variables: { result: null }, callStack: ['main'], highlight: 'declare' },
  { line: 6, variables: { result: '"Hello, World!"' }, callStack: ['main', 'greet'], highlight: 'assign' },
  { line: 7, variables: { result: '"Hello, World!"' }, callStack: ['main'], highlight: 'log' }
]

export default frames
