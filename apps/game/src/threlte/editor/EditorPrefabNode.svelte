<script lang="ts">
import { useTask } from '@threlte/core'
import HeroProp from '../components/HeroProp.svelte'
import ProceduralMesh from '../components/ProceduralMesh.svelte'
import type { EditorPrefabData } from './editorStore'

export let prefab: EditorPrefabData

let time = 0

useTask(delta => {
  time += delta
})
</script>

{#if prefab.type === 'anomaly-cluster'}
  {@const shellColor = prefab.variant === 'green' ? '#00ff88' : prefab.variant === 'cyan' ? '#00d4ff' : prefab.variant === 'rose' ? '#ff0088' : '#ff00ff'}
  {@const accentColor = prefab.variant === 'green' ? '#c8fff4' : prefab.variant === 'cyan' ? '#d9f4ff' : prefab.variant === 'rose' ? '#ffd0f0' : '#8fd8ff'}
  {@const shellGeometry = prefab.variant === 'green' ? 'tetrahedron' : prefab.variant === 'cyan' ? 'dodecahedron' : prefab.variant === 'rose' ? 'icosahedron' : 'octahedron'}
  {@const shellArgs = prefab.variant === 'green' ? [0.8, 0] : prefab.variant === 'cyan' ? [0.8, 0] : prefab.variant === 'rose' ? [0.7, 0] : [1.0, 0]}
  <ProceduralMesh geometry={shellGeometry} args={shellArgs} position={[0, Math.sin(time * 0.7) * 0.18, 0]} rotation={[time * 0.55, time * 0.34, time * 0.18]} scale={[1, 1, 1]} color={shellColor} emissive={shellColor} emissiveIntensity={1.05} metalness={0.96} roughness={0.03} />
  {#each [0, Math.PI / 2, Math.PI, Math.PI * 1.5] as angle, index}
    <ProceduralMesh geometry={index % 2 === 0 ? 'box' : 'tetrahedron'} args={index % 2 === 0 ? [0.16, 0.52, 0.16] : [0.22, 0]} position={[Math.cos(angle + time * 0.3) * 1.05, 0.18 + Math.sin(time * 0.85 + index) * 0.16, Math.sin(angle + time * 0.3) * 1.05]} rotation={[time * 0.7, angle, time * 0.35 + index]} scale={[1, 1 + index * 0.08, 1]} color={accentColor} emissive={accentColor} emissiveIntensity={0.58} metalness={1} roughness={0.04} />
  {/each}
  <ProceduralMesh geometry="torus" args={[1.3, 0.04, 12, 32]} position={[0, 0.12, 0]} rotation={[Math.PI / 2 + time * 0.18, time * 0.25, 0]} scale={[1, 1, 1]} color={accentColor} emissive={accentColor} emissiveIntensity={0.4} metalness={1} roughness={0.03} transparent={true} opacity={0.72} />
{:else if prefab.type === 'command-console'}
  <ProceduralMesh geometry="box" args={[2.0, 0.3, 1.6]} position={[0, 0.18, 0]} rotation={[0, 0, 0]} scale={[1, 1, 1]} color="#1a5f7a" emissive="#17394a" emissiveIntensity={0.2} metalness={0.92} roughness={0.18} />
  <ProceduralMesh geometry="box" args={[2.0, 1.4, 0.1]} position={[0, 1.48, -0.6]} rotation={[0, 0, 0]} scale={[1, 1, 1]} color="#1a5f7a" emissive="#17394a" emissiveIntensity={0.22} metalness={0.9} roughness={0.22} />
  {#each [-0.5, 0.5] as x}
    <ProceduralMesh geometry="box" args={[0.8, 1.0, 0.02]} position={[x, 1.48, -0.55]} rotation={[0, 0, 0]} scale={[1, 1, 1]} color="#6ad7ff" emissive="#6ad7ff" emissiveIntensity={0.85 + Math.sin(time * 2 + x) * 0.18} metalness={0.16} roughness={0.08} />
  {/each}
  {#each [[-0.7, 0.55], [0, 0.6], [0.7, 0.55]] as [x, z], i}
    <ProceduralMesh geometry="box" args={[0.28, 0.08, 0.22]} position={[x, 0.41, z]} rotation={[0, 0, 0]} scale={[1, 1, 1]} color={i === 1 ? '#6ad7ff' : '#2d4452'} emissive={i === 1 ? '#6ad7ff' : '#111920'} emissiveIntensity={i === 1 ? 0.8 : 0.15} metalness={0.95} roughness={0.18} />
  {/each}
  {#each [0, Math.PI / 2, Math.PI, Math.PI * 1.5] as angle, index}
    <ProceduralMesh geometry="box" args={[0.12, 0.7, 0.16]} position={[Math.cos(angle) * 1.22, 0.73 + Math.sin(time * 0.7 + index) * 0.05, Math.sin(angle) * 0.86]} rotation={[time * 0.25 + index * 0.2, angle, Math.sin(time * 0.35 + index) * 0.25]} scale={[1, 1 + Math.sin(time * 0.8 + index) * 0.12, 1]} color={index % 2 === 0 ? '#7ee0ff' : '#ff6bd8'} emissive={index % 2 === 0 ? '#7ee0ff' : '#ff6bd8'} emissiveIntensity={0.7} metalness={1} roughness={0.04} />
  {/each}
  <ProceduralMesh geometry="torus" args={[1.28, 0.05, 12, 28]} position={[0, 0.9, 0]} rotation={[Math.PI / 2, time * 0.4, 0]} scale={[1, 1, 1]} color="#84dfff" emissive="#84dfff" emissiveIntensity={0.46} metalness={1} roughness={0.03} transparent={true} opacity={0.82} />
{:else if prefab.type === 'command-fin'}
  <ProceduralMesh geometry="box" args={[0.22, 3.6, 1.4]} position={[0, 0, 0]} rotation={[0, 0, 0]} scale={[1, 1, 1]} color="#0d1724" emissive="#11263a" emissiveIntensity={0.18} metalness={0.65} roughness={0.35} />
{:else if prefab.type === 'hanging-light'}
  <HeroProp url="/models/polyhaven/caged_hanging_light/caged_hanging_light_1k.gltf" />
{:else if prefab.type === 'portal-apparatus'}
  <ProceduralMesh geometry="cylinder" args={[0.8, 0.8, 0.08, 32]} position={[0, 0.04, 0]} rotation={[0, 0, 0]} scale={[1, 1, 1]} color="#ff00ff" emissive="#ff00ff" emissiveIntensity={1.6} metalness={1} roughness={0.05} />
  <ProceduralMesh geometry="torus" args={[0.9, 0.12, 16, 32]} position={[0, 0.2, 0]} rotation={[0, time * 2, 0]} scale={[1, 1, 1]} color="#ff00ff" emissive="#ff00ff" emissiveIntensity={2.0} metalness={1} roughness={0.05} />
  <ProceduralMesh geometry="torus" args={[1.58, 0.04, 12, 36]} position={[0, 1.12, 0]} rotation={[Math.PI / 2 + Math.sin(time * 0.25) * 0.25, time * -0.55, time * 0.18]} scale={[1, 1, 1]} color="#a2f0ff" emissive="#a2f0ff" emissiveIntensity={0.48} metalness={1} roughness={0.03} transparent={true} opacity={0.7} />
  <ProceduralMesh geometry="torus" args={[1.15, 0.07, 16, 48]} position={[0, 1.05, 0]} rotation={[Math.PI / 2, time * -1.4, 0]} scale={[1, 1, 1]} color="#ff7aff" emissive="#ff7aff" emissiveIntensity={2.1} metalness={1} roughness={0.05} />
  <ProceduralMesh geometry="cylinder" args={[0.06, 0.12, 1.7, 12]} position={[0, 1.0, 0]} rotation={[0, 0, 0]} scale={[1, 1, 1]} color="#e38bff" emissive="#e38bff" emissiveIntensity={1.4} metalness={0.9} roughness={0.08} transparent={true} opacity={0.8} />
  {#each [0, Math.PI / 3, (Math.PI * 2) / 3, Math.PI, (Math.PI * 4) / 3, (Math.PI * 5) / 3] as angle, index}
    <ProceduralMesh geometry={index % 2 === 0 ? 'box' : 'tetrahedron'} args={index % 2 === 0 ? [0.1, 1.18, 0.16] : [0.24, 0]} position={[Math.cos(angle) * 1.15, 1.05 + Math.sin(time * 0.8 + index) * 0.08, Math.sin(angle) * 1.15]} rotation={[0.35 + Math.sin(time * 0.35 + index) * 0.1, -angle + Math.PI / 2, angle * 0.5 + time * 0.18]} scale={[1, 1 + index * 0.04, 1]} color={index % 2 === 0 ? '#ff8cff' : '#9ce8ff'} emissive={index % 2 === 0 ? '#ff8cff' : '#9ce8ff'} emissiveIntensity={0.72} metalness={0.98} roughness={0.04} />
  {/each}
{:else if prefab.type === 'support-column'}
  <ProceduralMesh geometry="cylinder" args={[0.62, 0.74, 0.28, 8]} position={[0, -3.58, 0]} rotation={[0, 0, 0]} scale={[1, 1, 1]} color="#1a5f7a" emissive="#17384a" emissiveIntensity={0.18} metalness={0.82} roughness={0.3} />
  <ProceduralMesh geometry="cylinder" args={[0.48, 0.58, 0.22, 8]} position={[0, -3.34, 0]} rotation={[0, 0, 0]} scale={[1, 1, 1]} color="#142532" emissive="#0f1820" emissiveIntensity={0.06} metalness={0.78} roughness={0.34} />
  <ProceduralMesh geometry="cylinder" args={[0.26, 0.3, 7.37, 8]} position={[0, 0.25, 0]} rotation={[0, 0, 0]} scale={[1, 1, 1]} color="#0a3d4d" emissive="#102734" emissiveIntensity={0.08} metalness={0.64} roughness={0.4} />
  {#each [[-0.24, 0], [0.24, 0], [0, -0.24], [0, 0.24]] as [rx, rz]}
    <ProceduralMesh geometry="box" args={[0.08, 7.07, 0.08]} position={[rx, 0.25, rz]} rotation={[0, 0, 0]} scale={[1, 1, 1]} color="#213846" emissive="#111b23" emissiveIntensity={0.04} metalness={0.72} roughness={0.32} />
  {/each}
  <ProceduralMesh geometry="torus" args={[0.4, 0.05, 12, 24]} position={[0, 3.42, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[1, 1, 1]} color="#00d4ff" emissive="#00d4ff" emissiveIntensity={0.9} metalness={1} roughness={0.05} />
  <ProceduralMesh geometry="cylinder" args={[0.4, 0.26, 0.42, 8]} position={[0, 3.82, 0]} rotation={[0, 0, 0]} scale={[1, 1, 1]} color="#00d4ff" emissive="#00d4ff" emissiveIntensity={1.0} metalness={0.95} roughness={0.08} />
  <ProceduralMesh geometry="box" args={[0.16, 0.24, 0.16]} position={[0, 4.08, 0]} rotation={[0, 0, 0]} scale={[1, 1, 1]} color="#d2f1ff" emissive="#00d4ff" emissiveIntensity={0.85} metalness={1} roughness={0.04} />
{:else if prefab.type === 'interior-archway'}
  {#each [-1.2, 1.2] as x}
    <ProceduralMesh geometry="box" args={[0.62, 0.4, 0.62]} position={[x, 0.08, 0]} rotation={[0, 0, 0]} scale={[1, 1, 1]} color="#2a3d4a" emissive="#173244" emissiveIntensity={0.08} metalness={0.7} roughness={0.3} />
    <ProceduralMesh geometry="box" args={[0.34, 7.94, 0.34]} position={[x, 4.05, 0]} rotation={[0, 0, 0]} scale={[1, 1, 1]} color="#2a3d4a" emissive="#2a7a9a" emissiveIntensity={0.4} metalness={0.72} roughness={0.26} />
    <ProceduralMesh geometry="box" args={[0.12, 7.09, 0.14]} position={[x, 4.05, 0.18]} rotation={[0, 0, x < 0 ? 0.2 : -0.2]} scale={[1, 1, 1]} color="#7ed8ff" emissive="#7ed8ff" emissiveIntensity={0.84} metalness={1} roughness={0.04} />
    <ProceduralMesh geometry="box" args={[0.12, 1.0, 0.12]} position={[x < 0 ? x + 0.22 : x - 0.22, 0.95, 0]} rotation={[0, 0, x < 0 ? -0.55 : 0.55]} scale={[1, 1, 1]} color="#213846" emissive="#12202a" emissiveIntensity={0.05} metalness={0.72} roughness={0.34} />
    <ProceduralMesh geometry="box" args={[0.58, 0.18, 0.58]} position={[x, 7.7, 0]} rotation={[0, 0, 0]} scale={[1, 1, 1]} color="#223544" emissive="#152433" emissiveIntensity={0.06} metalness={0.84} roughness={0.22} />
  {/each}
  <ProceduralMesh geometry="box" args={[3.2, 0.36, 0.48]} position={[0, 7.96, 0]} rotation={[0, 0, 0]} scale={[1, 1, 1]} color="#2a3d4a" emissive="#2a7a9a" emissiveIntensity={0.34} metalness={0.72} roughness={0.26} />
  <ProceduralMesh geometry="box" args={[2.6, 0.12, 0.2]} position={[0, 8.18, 0]} rotation={[0, 0, 0]} scale={[1, 1, 1]} color="#9ae6ff" emissive="#9ae6ff" emissiveIntensity={0.9} metalness={1} roughness={0.02} />
{:else if prefab.type === 'courtyard-pylon'}
  <ProceduralMesh geometry="box" args={[0.56, 0.34, 0.56]} position={[0, 0.07, 0]} rotation={[0, 0, 0]} scale={[1, 1, 1]} color="#1a5f7a" emissive="#17384a" emissiveIntensity={0.06} metalness={0.28} roughness={0.66} />
  <ProceduralMesh geometry="box" args={[0.28, 7.74, 0.28]} position={[0, 3.94, 0]} rotation={[0, 0, 0]} scale={[1, 1, 1]} color="#1a5f7a" emissive="#17384a" emissiveIntensity={0.08} metalness={0.35} roughness={0.62} />
  <ProceduralMesh geometry="box" args={[0.1, 7.24, 0.12]} position={[0, 3.94, 0.16]} rotation={[0, 0, 0]} scale={[1, 1, 1]} color="#79cce8" emissive="#79cce8" emissiveIntensity={0.52} metalness={0.95} roughness={0.06} />
{:else if prefab.type === 'story-marker'}
  {@const color = prefab.variant === 'amber' ? '#ffaa00' : prefab.variant === 'green' ? '#5edeb9' : prefab.variant === 'red' ? '#ff6666' : prefab.variant === 'magenta' ? '#ff00ff' : '#00ccff'}
  <ProceduralMesh geometry="torus" args={[0.34, 0.02, 12, 24]} position={[0, 0.05, 0]} rotation={[Math.PI / 2, time * 0.45, 0]} scale={[1, 1, 1]} color={color} emissive={color} emissiveIntensity={0.38} metalness={1} roughness={0.04} transparent={true} opacity={0.72} />
  {#each [0, (Math.PI * 2) / 3, (Math.PI * 4) / 3] as angle, index}
    <ProceduralMesh geometry={index === 1 ? 'tetrahedron' : 'box'} args={index === 1 ? [0.12, 0] : [0.05, 0.2, 0.05]} position={[Math.cos(angle + time * 0.55) * 0.42, 0.1 + Math.sin(time * 0.8 + index) * 0.08, Math.sin(angle + time * 0.55) * 0.42]} rotation={[time * 0.55 + index, angle + time * 0.18, time * 0.32]} scale={[1, 1, 1]} color={color} emissive={color} emissiveIntensity={0.3} metalness={0.98} roughness={0.05} />
  {/each}
{:else if prefab.type === 'wasteland-archway'}
  {#each [-1.2, 1.2] as x}
    <ProceduralMesh geometry="box" args={[0.62, 0.42, 0.62]} position={[x, 0.05, 0]} rotation={[0, 0, 0]} scale={[1, 1, 1]} color="#1a5f7a" emissive="#17384a" emissiveIntensity={0.06} metalness={0.3} roughness={0.66} />
    <ProceduralMesh geometry="box" args={[0.34, 7.74, 0.34]} position={[x, 3.92, 0]} rotation={[0, 0, 0]} scale={[1, 1, 1]} color="#1a5f7a" emissive="#17384a" emissiveIntensity={0.08} metalness={0.35} roughness={0.62} />
    <ProceduralMesh geometry="box" args={[0.12, 0.94, 0.12]} position={[x < 0 ? x + 0.22 : x - 0.22, 0.92, 0]} rotation={[0, 0, x < 0 ? -0.45 : 0.45]} scale={[1, 1, 1]} color="#2d4857" emissive="#162029" emissiveIntensity={0.04} metalness={0.54} roughness={0.42} />
  {/each}
  <ProceduralMesh geometry="box" args={[3.3, 0.38, 0.5]} position={[0, 7.72, 0]} rotation={[0, 0, 0]} scale={[1, 1, 1]} color="#1a5f7a" emissive="#17384a" emissiveIntensity={0.08} metalness={0.35} roughness={0.62} />
  <ProceduralMesh geometry="box" args={[2.4, 0.12, 0.18]} position={[0, 8.04, 0]} rotation={[0, 0, 0]} scale={[1, 1, 1]} color="#8dd8f7" emissive="#8dd8f7" emissiveIntensity={0.68} metalness={1} roughness={0.03} />
{:else if prefab.type === 'courtyard-fountain'}
  <ProceduralMesh geometry="cylinder" args={[1.8, 2.05, 0.24, 8]} position={[0, 0.12, 0]} rotation={[0, 0, 0]} scale={[1, 1, 1]} color="#254658" emissive="#11202b" emissiveIntensity={0.08} metalness={0.34} roughness={0.6} />
  {#each [0, Math.PI / 2, Math.PI, Math.PI * 1.5] as angle}
    <ProceduralMesh geometry="box" args={[0.34, 0.46, 0.7]} position={[Math.cos(angle) * 1.0, 0.48, Math.sin(angle) * 1.0]} rotation={[0, -angle, 0]} scale={[1, 1, 1]} color="#2b566d" emissive="#152833" emissiveIntensity={0.06} metalness={0.36} roughness={0.58} />
  {/each}
  <ProceduralMesh geometry="cylinder" args={[1.22, 1.46, 0.44, 8]} position={[0, 0.46, 0]} rotation={[0, 0, 0]} scale={[1, 1, 1]} color="#2d5f7a" emissive="#17384a" emissiveIntensity={0.08} metalness={0.42} roughness={0.56} />
  <ProceduralMesh geometry="torus" args={[1.02, 0.09, 14, 36]} position={[0, 0.82, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[1, 1, 1]} color="#86d8ff" emissive="#86d8ff" emissiveIntensity={0.48} metalness={1} roughness={0.04} />
  <ProceduralMesh geometry="cylinder" args={[0.96, 1.12, 0.34, 8]} position={[0, 1.0, 0]} rotation={[0, 0, 0]} scale={[1, 1, 1]} color="#1a3d5a" emissive="#17384a" emissiveIntensity={0.08} metalness={0.55} roughness={0.28} transparent={true} opacity={0.9} />
  <ProceduralMesh geometry="cylinder" args={[0.85, 0.85, 0.05, 32]} position={[0, 1.0 + Math.sin(time * 1.5) * 0.1, 0]} rotation={[0, 0, 0]} scale={[1, 1, 1]} color="#4488cc" emissive="#0066aa" emissiveIntensity={0.6} metalness={0.08} roughness={0.14} transparent={true} opacity={0.7} />
  <ProceduralMesh geometry="cylinder" args={[0.2, 0.26, 0.9, 8]} position={[0, 1.28, 0]} rotation={[0, 0, 0]} scale={[1, 1, 1]} color="#ff00ff" emissive="#ff00ff" emissiveIntensity={1.0} metalness={0.95} roughness={0.08} />
  {#each [0, Math.PI / 2, Math.PI, Math.PI * 1.5] as angle}
    <ProceduralMesh geometry="box" args={[0.08, 0.5, 0.18]} position={[Math.cos(angle) * 0.26, 1.42, Math.sin(angle) * 0.26]} rotation={[0, angle, 0]} scale={[1, 1, 1]} color="#a8edff" emissive="#a8edff" emissiveIntensity={0.76} metalness={1} roughness={0.03} />
  {/each}
  <ProceduralMesh geometry="torus" args={[2.35, 0.08, 16, 48]} position={[0, 3.0 + Math.sin(time * 0.35) * 0.08, 0]} rotation={[Math.PI / 2, time * 0.25, 0]} scale={[1, 1, 1]} color="#9fd6ff" emissive="#9fd6ff" emissiveIntensity={1.3} metalness={0.95} roughness={0.08} />
{:else if prefab.type === 'observation-rig'}
  <ProceduralMesh geometry="cylinder" args={[0.18, 0.26, 1.4, 10]} position={[5.4, 0.8, 22.72]} rotation={[0, -0.7, 0]} scale={[1, 1, 1]} color="#1d2630" emissive="#21384d" emissiveIntensity={0.2} metalness={0.75} roughness={0.28} />
  <ProceduralMesh geometry="cylinder" args={[0.18, 0.28, 2.6, 12]} position={[5.1, 1.8, 21.62]} rotation={[-0.55, -0.75, 0]} scale={[1, 1, 1]} color="#0f1c28" emissive="#234764" emissiveIntensity={0.24} metalness={0.82} roughness={0.18} />
  <ProceduralMesh geometry="box" args={[0.7, 0.45, 1.0]} position={[5.85, 1.05, 23.12]} rotation={[0, -0.35, 0]} scale={[1, 1, 1]} color="#17212a" emissive="#18344a" emissiveIntensity={0.18} metalness={0.6} roughness={0.42} />
{:else if prefab.type === 'bench-growth'}
  <ProceduralMesh geometry="box" args={[2.0, 0.15, 0.6]} position={[0, 0.5, 0]} rotation={[0, 0, 0]} scale={[1, 1, 1]} color="#4d3d2d" emissive="#20160f" emissiveIntensity={0.04} metalness={0.16} roughness={0.76} />
  <ProceduralMesh geometry="box" args={[2.0, 0.8, 0.15]} position={[0, 1.2, -0.6]} rotation={[0, 0, 0]} scale={[1, 1, 1]} color="#4d3d2d" emissive="#20160f" emissiveIntensity={0.04} metalness={0.16} roughness={0.76} />
  {#each [-0.8, 0.8] as x}
    {#each [-0.2, 0.2] as z}
      <ProceduralMesh geometry="box" args={[0.1, 0.5, 0.1]} position={[x, 0.25, z]} rotation={[0, 0, 0]} scale={[1, 1, 1]} color="#3d2d1d" emissive="#20160f" emissiveIntensity={0.03} metalness={0.12} roughness={0.82} />
    {/each}
  {/each}
  {#each [-0.85, -0.28, 0.34, 0.92] as offset, index}
    <ProceduralMesh geometry={index % 2 === 0 ? 'box' : 'tetrahedron'} args={index % 2 === 0 ? [0.09, 0.95 + index * 0.18, 0.11] : [0.22 + index * 0.03, 0]} position={[offset, 1.2 + index * 0.15, -0.42 - index * 0.18]} rotation={[-0.18 - index * 0.06, offset * 0.35, Math.sin(time * 0.6 + index) * 0.18]} scale={[1, 1, 1]} color={index % 2 === 0 ? '#87c8ff' : '#ff7ce3'} emissive={index % 2 === 0 ? '#87c8ff' : '#ff7ce3'} emissiveIntensity={0.46} metalness={0.96} roughness={0.05} />
  {/each}
  <ProceduralMesh geometry="torus" args={[1.35, 0.045, 12, 32]} position={[0, 1.45, -0.38]} rotation={[Math.PI / 2 - 0.2, time * 0.32, 0.1]} scale={[1, 1, 1]} color="#9edfff" emissive="#9edfff" emissiveIntensity={0.3} metalness={1} roughness={0.03} transparent={true} opacity={0.54} />
{:else if prefab.type === 'growth-planter'}
  <ProceduralMesh geometry="cylinder" args={[0.4, 0.5, 0.8, 8]} position={[0, 0.4, 0]} rotation={[0, 0, 0]} scale={[1, 1, 1]} color="#7a5a3a" emissive="#27190d" emissiveIntensity={0.04} metalness={0.28} roughness={0.72} />
  <ProceduralMesh geometry="torus" args={[0.54, 0.05, 12, 24]} position={[0, 0.84, 0]} rotation={[Math.PI / 2, time * 0.45, 0]} scale={[1, 1, 1]} color="#6df5c6" emissive="#6df5c6" emissiveIntensity={0.34} metalness={1} roughness={0.04} transparent={true} opacity={0.72} />
  {#each Array.from({ length: 5 }) as _, layer}
    {@const radius = 0.3 - layer * 0.05}
    {@const height = 1.2 + layer * 0.4}
    {@const rotation = layer * 0.6}
    <ProceduralMesh geometry="box" args={[radius * 2, 0.3, radius * 2]} position={[0, height, 0]} rotation={[0, rotation + time * 0.3, 0]} scale={[1, 1, 1]} color="#00aa44" emissive="#00cc66" emissiveIntensity={0.7} metalness={0.92} roughness={0.08} />
  {/each}
  {#each [0, Math.PI / 3, (Math.PI * 2) / 3, Math.PI, (Math.PI * 4) / 3, (Math.PI * 5) / 3] as angle, spokeIndex}
    <ProceduralMesh geometry={spokeIndex % 2 === 0 ? 'tetrahedron' : 'box'} args={spokeIndex % 2 === 0 ? [0.18, 0] : [0.08, 0.42, 0.08]} position={[Math.cos(angle + time * 0.18) * (0.42 + spokeIndex * 0.03), 1.55 + Math.sin(time * 0.9 + spokeIndex) * 0.12 + spokeIndex * 0.12, Math.sin(angle + time * 0.18) * (0.42 + spokeIndex * 0.03)]} rotation={[angle + time * 0.35, time * 0.28 + spokeIndex * 0.3, angle * 0.5]} scale={[1, 1 + spokeIndex * 0.08, 1]} color={spokeIndex % 2 === 0 ? '#9dffcf' : '#5edeb9'} emissive={spokeIndex % 2 === 0 ? '#9dffcf' : '#5edeb9'} emissiveIntensity={0.4} metalness={0.92} roughness={0.08} />
  {/each}
{:else if prefab.type === 'wasteland-monolith'}
  <ProceduralMesh geometry="box" args={[1, 1, 1]} position={[0, 0, 0]} rotation={[0, 0, 0]} scale={[1, 1, 1]} color="#4f5563" emissive="#293240" emissiveIntensity={0.08} metalness={0.1} roughness={0.9} />
  {#each [-0.62, 0.62] as offset}
    <ProceduralMesh geometry="box" args={[0.18, 0.92, 0.34]} position={[offset, 0.04, 0]} rotation={[0, 0, 0]} scale={[1, 1, 1]} color="#252d38" emissive="#11161d" emissiveIntensity={0.03} metalness={0.18} roughness={0.78} />
  {/each}
  <ProceduralMesh geometry="box" args={[0.16, 0.82, 0.06]} position={[0, 0.08, 0.51]} rotation={[0, 0, 0]} scale={[1, 1, 1]} color="#88daf8" emissive="#88daf8" emissiveIntensity={0.46} metalness={1} roughness={0.04} />
  <ProceduralMesh geometry="box" args={[0.58, 0.12, 0.58]} position={[0, 0.58, 0]} rotation={[0, 0, 0]} scale={[1, 1, 1]} color="#3a4550" emissive="#1a2028" emissiveIntensity={0.03} metalness={0.16} roughness={0.76} />
{:else if prefab.type === 'broken-ring'}
  <ProceduralMesh geometry="torus" args={[2.6, 0.25, 14, 28, Math.PI]} position={[0, 0, 0]} rotation={[0, 0, 0]} scale={[1, 1, 1]} color="#4f5669" emissive="#344056" emissiveIntensity={0.08} metalness={0.14} roughness={0.84} />
{/if}
