export function hashHomeIntroUnit(seed: number) {
  return (Math.sin(seed * 12.9898) * 43758.5453) % 1
}
