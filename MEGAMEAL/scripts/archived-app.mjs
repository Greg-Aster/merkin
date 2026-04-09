const lines = [
  '',
  'MEGAMEAL/ is archived and is no longer the active app source.',
  '',
  'Use these commands instead:',
  '  pnpm --filter @merkin/megameal dev',
  '  pnpm --filter @merkin/megameal build',
  '  pnpm --filter @merkin/game dev',
  '  pnpm --filter @merkin/game build',
  '',
  'This folder is kept only as a legacy archive and as the current shared public asset source for apps/game.',
  '',
]

console.error(lines.join('\n'))
process.exit(1)
