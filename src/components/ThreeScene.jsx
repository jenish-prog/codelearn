import React, { useRef, useEffect } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'

// Simple animated cube that moves to target positions based on stepIndex
function VariableCube({ name, stepIndex, positions = [] }) {
  const mesh = useRef()
  const target = positions[stepIndex] || positions[0] || [0, 0, 0]

  useFrame((state, delta) => {
    if (!mesh.current) return
    // simple lerp toward target
    mesh.current.position.x += (target[0] - mesh.current.position.x) * Math.min(1, 4 * delta)
    mesh.current.position.y += (target[1] - mesh.current.position.y) * Math.min(1, 4 * delta)
    mesh.current.position.z += (target[2] - mesh.current.position.z) * Math.min(1, 4 * delta)
  })

  // color/scale changes on specific steps
  const scale = stepIndex === 1 ? 1.25 : 1
  const color = stepIndex === 1 ? '#10b981' : '#60a5fa'

  return (
    <mesh ref={mesh} scale={[scale, scale, scale]}>
      <boxGeometry args={[1.2, 0.7, 0.6]} />
      <meshStandardMaterial color={color} metalness={0.2} roughness={0.6} />
    </mesh>
  )
}

function FunctionSphere({ stepIndex, position = [ -3, 0, 0 ] }) {
  const ref = useRef()
  useFrame((_, delta) => {
    if (!ref.current) return
    // simple pulse when active
    const t = stepIndex === 0 ? (1 + Math.sin(Date.now() / 250) * 0.03) : 1
    ref.current.scale.x = ref.current.scale.y = ref.current.scale.z = t
  })
  return (
    <mesh ref={ref} position={position}>
      <sphereGeometry args={[0.6, 32, 32]} />
      <meshStandardMaterial color={stepIndex === 0 ? '#f97316' : '#fca5a5'} metalness={0.1} roughness={0.6} />
    </mesh>
  )
}

export default function ThreeScene({ stepIndex = 0 }) {
  // positions for the variable cube across steps
  const positions = [
    [-1.5, 0, 0], // initial
    [1.7, 0.4, 0], // assigned -> moves to storage area
    [1.7, -0.8, 0], // after some step
  ]

  return (
    <div style={{ width: '100%', height: 300 }}>
      <Canvas camera={{ position: [0, 3, 7], fov: 45 }}>
        <ambientLight intensity={0.6} />
        <directionalLight position={[5, 5, 5]} intensity={0.8} />
        <spotLight position={[-5, 5, 5]} angle={0.3} intensity={0.4} />

        <FunctionSphere stepIndex={stepIndex} position={[-3, 0.2, 0]} />
        <VariableCube name={'result'} stepIndex={stepIndex} positions={positions} />

        {/* simple ground plane */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.2, 0]}>
          <planeGeometry args={[20, 20]} />
          <meshStandardMaterial color={'#0f172a'} opacity={0.04} transparent />
        </mesh>

        {/* No OrbitControls to simplify dependencies */}
      </Canvas>
    </div>
  )
}
