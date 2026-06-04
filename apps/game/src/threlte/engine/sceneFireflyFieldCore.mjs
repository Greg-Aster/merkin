export const SCENE_FIREFLY_QUALITY_TIERS = [
  'ultra_low',
  'low',
  'medium',
  'high',
  'ultra',
]

export const SCENE_FIREFLY_FIELD_DISTRIBUTIONS = ['uniform', 'center-falloff']

const sceneFireflyQualityTiers = new Set(SCENE_FIREFLY_QUALITY_TIERS)
const sceneFireflyFieldDistributions = new Set(
  SCENE_FIREFLY_FIELD_DISTRIBUTIONS,
)
const GOLDEN_ANGLE_RADIANS = Math.PI * (3 - Math.sqrt(5))
const defaultProfileIds = [
  'elara-voss',
  'helena-zhao',
  'ava-chen',
  'maya-okafor',
  'soren-klein',
  'gregory-aster',
  'kaelen-vance',
  'eleanor-kim',
  'vex-kanarath',
  'merkin',
]
const defaultLostSoulResponses = [
  '*glows with curiosity, then dims sadly*',
  '*speaks in a language you do not understand... the words fade like whispers*',
  '*flickers weakly* Where... where am I?',
  '*pulses with longing* We are all lost here...',
  '*light grows dim, barely visible* I... miss... someone...',
  '*flashes frantically, then goes dark for a moment*',
  '*glows softly, as if trying to remember something important*',
  '*dances in erratic patterns, clearly confused*',
  '*A faint, sorrowful hum accompanies its gentle, pulsing light.*',
  '*Its light traces the shape of a forgotten symbol in the air before fading.*',
  'I remember a name, but not whose it was... Was it mine?',
  '*Flickers in time with a slow, mournful melody only it can hear.*',
  'We were promised a dawn that never came.',
  '*Its light seems to search for something, or someone, in the darkness.*',
  'Have you seen the others? They were just here...',
  '*A single, bright flash, followed by a long, sorrowful dimming.*',
  'The stars feel so far away tonight.',
  '*It spells out a single, desperate word in points of light: "Wait."*',
  '*Pulses with a soft, warm glow, like a distant, cherished memory.*',
  "I was on my way to... I can't recall. It was important, though.",
]
const lostSoulNames = [
  'Wandering Star',
  'Twilight Wisp',
  'Stellar Wanderer',
  'Drifting Light',
  'Celestial Wisp',
  'Night Wanderer',
  'Fading Ember',
  'Lost Lamplight',
]

export const DEFAULT_SCENE_FIREFLY_LIGHTING = {
  spriteIntensity: 1.45,
  lightIntensity: 44,
  lightDistance: 28,
  lightDecay: 1.35,
  minimumLightIntensityScale: 0.16,
  lightBudgeted: true,
  selectionHoldSeconds: 2.4,
  selectionFadeSeconds: 0.9,
  pulseThreshold: 0.48,
  pulseSoftness: 0.72,
  activeLightPercent: 0.125,
  blinkPeriodSecondsMin: 12,
  blinkPeriodSecondsMax: 22,
  blinkFadeSeconds: 1.2,
}

export function normalizeSceneFireflyQualityTier(tier) {
  if (tier && sceneFireflyQualityTiers.has(tier)) {
    return tier
  }
  return 'medium'
}

export function normalizeSceneFireflyFieldDistribution(distribution) {
  if (distribution && sceneFireflyFieldDistributions.has(distribution)) {
    return distribution
  }
  return 'uniform'
}

function finiteNumberOrDefault(value, fallback) {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

function finiteCountOrDefault(value, fallback) {
  return Math.max(0, Math.floor(finiteNumberOrDefault(value, fallback)))
}

export function resolveSceneFireflyFieldRadius(value, fallback = 120) {
  return Math.max(0, finiteNumberOrDefault(value, fallback))
}

export function getSceneFireflyFieldCoverage(input) {
  const radius = resolveSceneFireflyFieldRadius(
    input.radius,
    input.fallbackRadius ?? 120,
  )
  return {
    radius,
    diameter: radius * 2,
    area: Math.PI * radius * radius,
  }
}

function finiteClampedNumberOrDefault(value, fallback, min, max) {
  const resolved = finiteNumberOrDefault(value, fallback)
  return Math.min(max, Math.max(min, resolved))
}

function firstFiniteNumber(...values) {
  return values.find(
    value => typeof value === 'number' && Number.isFinite(value),
  )
}

export function seededSceneFireflyUnit(index, salt) {
  const value = Math.sin(index * 12.9898 + salt * 78.233) * 43758.5453
  return value - Math.floor(value)
}

export function resolveSceneFireflyFieldPoint(input) {
  const radius = Math.max(0, input.radius)
  const count = Math.max(0, Math.floor(input.count))
  if (radius <= 0 || count <= 0) {
    return {
      localX: 0,
      localZ: 0,
      normalizedDistance: 0,
    }
  }

  const distribution = normalizeSceneFireflyFieldDistribution(
    input.distribution,
  )
  if (distribution === 'center-falloff') {
    const angle = seededSceneFireflyUnit(input.index, 1) * Math.PI * 2
    const exponent = Math.max(0.01, input.densityExponent ?? 0.5)
    const normalizedDistance = Math.pow(
      seededSceneFireflyUnit(input.index, 2),
      exponent,
    )
    const distance = normalizedDistance * radius

    return {
      localX: Math.cos(angle) * distance,
      localZ: Math.sin(angle) * distance,
      normalizedDistance,
    }
  }

  const normalizedDistance = Math.sqrt((input.index + 0.5) / count)
  const angle =
    input.index * GOLDEN_ANGLE_RADIANS +
    seededSceneFireflyUnit(input.index, 1) * 0.08
  const distance = normalizedDistance * radius

  return {
    localX: Math.cos(angle) * distance,
    localZ: Math.sin(angle) * distance,
    normalizedDistance,
  }
}

export function resolveSceneFireflyLighting(input) {
  const tier = normalizeSceneFireflyQualityTier(input.qualityTier)
  const baseLighting = input.settings?.lighting
  const tierSettings = input.settings?.qualityTiers?.[tier]
  const tierLighting = tierSettings?.lighting
  const defaults = {
    ...DEFAULT_SCENE_FIREFLY_LIGHTING,
    ...(input.defaults ?? {}),
  }
  const blinkPeriodSecondsMin = finiteClampedNumberOrDefault(
    tierSettings?.blinkPeriodSecondsMin ?? tierLighting?.blinkPeriodSecondsMin,
    finiteClampedNumberOrDefault(
      baseLighting?.blinkPeriodSecondsMin,
      defaults.blinkPeriodSecondsMin,
      0.25,
      120,
    ),
    0.25,
    120,
  )
  const blinkPeriodSecondsMax = Math.max(
    blinkPeriodSecondsMin,
    finiteClampedNumberOrDefault(
      tierSettings?.blinkPeriodSecondsMax ??
        tierLighting?.blinkPeriodSecondsMax,
      finiteClampedNumberOrDefault(
        baseLighting?.blinkPeriodSecondsMax,
        defaults.blinkPeriodSecondsMax,
        0.25,
        120,
      ),
      0.25,
      120,
    ),
  )

  return {
    spriteIntensity: finiteNumberOrDefault(
      tierLighting?.spriteIntensity,
      finiteNumberOrDefault(
        baseLighting?.spriteIntensity,
        defaults.spriteIntensity,
      ),
    ),
    lightIntensity: finiteNumberOrDefault(
      tierLighting?.lightIntensity,
      finiteNumberOrDefault(
        baseLighting?.lightIntensity,
        defaults.lightIntensity,
      ),
    ),
    lightDistance: finiteNumberOrDefault(
      tierLighting?.lightDistance,
      finiteNumberOrDefault(
        baseLighting?.lightDistance,
        defaults.lightDistance,
      ),
    ),
    lightDecay: finiteNumberOrDefault(
      tierLighting?.lightDecay,
      finiteNumberOrDefault(baseLighting?.lightDecay, defaults.lightDecay),
    ),
    minimumLightIntensityScale: finiteClampedNumberOrDefault(
      tierLighting?.minimumLightIntensityScale,
      finiteClampedNumberOrDefault(
        baseLighting?.minimumLightIntensityScale,
        defaults.minimumLightIntensityScale,
        0,
        1,
      ),
      0,
      1,
    ),
    lightBudgeted:
      tierLighting?.lightBudgeted ??
      baseLighting?.lightBudgeted ??
      defaults.lightBudgeted,
    selectionHoldSeconds: finiteClampedNumberOrDefault(
      tierLighting?.selectionHoldSeconds,
      finiteClampedNumberOrDefault(
        baseLighting?.selectionHoldSeconds,
        defaults.selectionHoldSeconds,
        0,
        30,
      ),
      0,
      30,
    ),
    selectionFadeSeconds: finiteClampedNumberOrDefault(
      tierLighting?.selectionFadeSeconds,
      finiteClampedNumberOrDefault(
        baseLighting?.selectionFadeSeconds,
        defaults.selectionFadeSeconds,
        0.05,
        10,
      ),
      0.05,
      10,
    ),
    pulseThreshold: finiteClampedNumberOrDefault(
      tierLighting?.pulseThreshold,
      finiteClampedNumberOrDefault(
        baseLighting?.pulseThreshold,
        defaults.pulseThreshold,
        0,
        0.95,
      ),
      0,
      0.95,
    ),
    pulseSoftness: finiteClampedNumberOrDefault(
      tierLighting?.pulseSoftness,
      finiteClampedNumberOrDefault(
        baseLighting?.pulseSoftness,
        defaults.pulseSoftness,
        0.01,
        1,
      ),
      0.01,
      1,
    ),
    activeLightPercent: finiteClampedNumberOrDefault(
      tierSettings?.activeLightPercent ?? tierLighting?.activeLightPercent,
      finiteClampedNumberOrDefault(
        baseLighting?.activeLightPercent,
        defaults.activeLightPercent,
        0,
        1,
      ),
      0,
      1,
    ),
    blinkPeriodSecondsMin,
    blinkPeriodSecondsMax,
    blinkFadeSeconds: finiteClampedNumberOrDefault(
      tierSettings?.blinkFadeSeconds ?? tierLighting?.blinkFadeSeconds,
      finiteClampedNumberOrDefault(
        baseLighting?.blinkFadeSeconds,
        defaults.blinkFadeSeconds,
        0,
        30,
      ),
      0,
      30,
    ),
  }
}

export function resolveSceneFireflyActiveLightPercent(input) {
  const count = Math.max(0, Math.floor(input.count))
  const explicitPercent = firstFiniteNumber(
    input.activeLightPercent,
    input.lightingActiveLightPercent,
    input.baseActiveLightPercent,
    input.baseLightingActiveLightPercent,
  )

  if (explicitPercent !== undefined) {
    return Math.max(0, Math.min(1, explicitPercent))
  }

  const legacyLightCount = firstFiniteNumber(
    input.legacyLightCount,
    input.baseLegacyLightCount,
    input.defaultLightCount ??
      Math.ceil(count * DEFAULT_SCENE_FIREFLY_LIGHTING.activeLightPercent),
  )
  if (count <= 0 || legacyLightCount === undefined) return 0
  return Math.max(0, Math.min(1, Math.floor(legacyLightCount) / count))
}

export function resolveSceneFireflyActiveLightCount(count, activeLightPercent) {
  const resolvedCount = Math.max(0, Math.floor(count))
  if (resolvedCount <= 0) return 0
  return Math.min(
    resolvedCount,
    Math.max(0, Math.round(resolvedCount * Math.max(0, activeLightPercent))),
  )
}

export function getSceneFireflyLightEmitterIndices(count, activeLightCount) {
  const resolvedLightCount = Math.min(
    Math.max(0, Math.floor(activeLightCount)),
    Math.max(0, Math.floor(count)),
  )
  const indices = new Set()
  if (resolvedLightCount <= 0 || count <= 0) return indices

  for (let slot = 0; slot < resolvedLightCount; slot += 1) {
    indices.add(Math.floor(((slot + 0.5) * count) / resolvedLightCount))
  }
  return indices
}

export function resolveSceneFireflyBlinkPeriodSeconds(input) {
  const lighting = input.lighting ?? DEFAULT_SCENE_FIREFLY_LIGHTING
  const min = finiteClampedNumberOrDefault(
    lighting.blinkPeriodSecondsMin,
    DEFAULT_SCENE_FIREFLY_LIGHTING.blinkPeriodSecondsMin,
    0.25,
    120,
  )
  const max = Math.max(
    min,
    finiteClampedNumberOrDefault(
      lighting.blinkPeriodSecondsMax,
      DEFAULT_SCENE_FIREFLY_LIGHTING.blinkPeriodSecondsMax,
      0.25,
      120,
    ),
  )
  return min + seededSceneFireflyUnit(input.index, 9) * (max - min)
}

export function resolveSceneFireflyTwinkleSpeedFromBlinkPeriod(periodSeconds) {
  const period = Math.max(0.25, finiteNumberOrDefault(periodSeconds, 12))
  return (Math.PI * 2) / period
}

export function resolveSceneFireflyFieldQuality(input) {
  const tier = normalizeSceneFireflyQualityTier(input.qualityTier)
  const settings = input.settings
  const tierSettings = settings?.qualityTiers?.[tier]
  const lighting = resolveSceneFireflyLighting({
    settings,
    qualityTier: tier,
    defaults: {
      spriteIntensity: input.defaultSpriteIntensity ?? 1.45,
    },
  })
  const count = finiteCountOrDefault(
    tierSettings?.count,
    finiteCountOrDefault(settings?.count, input.defaultCount ?? 36),
  )
  const activeLightPercent = resolveSceneFireflyActiveLightPercent({
    count,
    activeLightPercent: tierSettings?.activeLightPercent,
    lightingActiveLightPercent: tierSettings?.lighting?.activeLightPercent,
    baseActiveLightPercent: settings?.activeLightPercent,
    baseLightingActiveLightPercent: settings?.lighting?.activeLightPercent,
    legacyLightCount: tierSettings?.lightCount,
    baseLegacyLightCount: settings?.lightCount,
    defaultLightCount: input.defaultLightCount ?? 8,
  })
  const activeLightCount = resolveSceneFireflyActiveLightCount(
    count,
    activeLightPercent,
  )

  return {
    tier,
    count,
    activeLightPercent,
    activeLightCount,
    lightCount: activeLightCount,
    size: finiteNumberOrDefault(
      tierSettings?.size,
      finiteNumberOrDefault(settings?.size, input.defaultSize ?? 0.58),
    ),
    lighting: {
      ...lighting,
      activeLightPercent,
    },
  }
}

function getFireflyColor(input) {
  const palette = input.settings.palette?.filter(entry => entry.trim()) ?? []
  if (palette.length > 0) return palette[input.index % palette.length]
  return input.index % 4 === 0
    ? input.settings.secondaryColor ?? '#8defff'
    : input.settings.color ?? '#f4ffb8'
}

function getProfileIds(settings) {
  const profileIds = settings.interactive?.profileIds?.filter(entry =>
    entry.trim(),
  )
  return profileIds && profileIds.length > 0 ? profileIds : defaultProfileIds
}

function getLostSoulResponses(settings) {
  const responses = settings.interactive?.lostSoulResponses?.filter(entry =>
    entry.trim(),
  )
  return responses && responses.length > 0
    ? responses
    : defaultLostSoulResponses
}

function getTitleCaseProfileName(profileId) {
  return profileId
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

function getFireflyInteraction(input) {
  const interactive = input.settings.interactive
  if (!interactive?.enabled) return undefined

  const profileChance = Math.max(
    0,
    Math.min(1, interactive.profileChance ?? 0.15),
  )
  const profileCount = Math.floor(input.count * profileChance)
  const npcId = `${input.fieldId}-ambient-${input.index}`

  if (input.index < profileCount) {
    const profileIds = getProfileIds(input.settings)
    const profileId = profileIds[input.index % profileIds.length]
    return {
      npcId,
      displayName: getTitleCaseProfileName(profileId),
      mode: 'profile',
      profileId,
    }
  }

  const responses = getLostSoulResponses(input.settings)
  const name = lostSoulNames[input.index % lostSoulNames.length]
  return {
    npcId,
    displayName: `${name} ${input.index + 1}`,
    mode: 'lost-soul',
    body: responses[
      Math.floor(seededSceneFireflyUnit(input.index, 8) * responses.length)
    ],
  }
}

function getFireflyConversation(input) {
  const durationMs = input.settings.interactive?.durationMs ?? 4000
  if (input.interaction?.mode === 'profile' && input.interaction.profileId) {
    return {
      mode: 'profile',
      personalityId: input.interaction.profileId,
      fallback: {
        body:
          input.interaction.body ||
          '*glows softly, trying to remember the shape of its old voice*',
        durationMs,
      },
    }
  }

  if (input.interaction?.mode === 'lost-soul') {
    return {
      mode: 'read-only',
      body: input.interaction.body || '*glows softly in the darkness*',
      durationMs,
    }
  }

  return { mode: 'none' }
}

function hasAuthoredFireflyBlinkTiming(settings, qualityTier) {
  const tier = normalizeSceneFireflyQualityTier(qualityTier)
  const tierSettings = settings.qualityTiers?.[tier]
  const tierLighting = tierSettings?.lighting
  const baseLighting = settings.lighting
  return [
    tierSettings?.blinkPeriodSecondsMin,
    tierSettings?.blinkPeriodSecondsMax,
    tierSettings?.blinkFadeSeconds,
    tierLighting?.blinkPeriodSecondsMin,
    tierLighting?.blinkPeriodSecondsMax,
    tierLighting?.blinkFadeSeconds,
    baseLighting?.blinkPeriodSecondsMin,
    baseLighting?.blinkPeriodSecondsMax,
    baseLighting?.blinkFadeSeconds,
  ].some(value => typeof value === 'number' && Number.isFinite(value))
}

function countAuthoredFireflyNodes(scene) {
  return (scene.nodes ?? []).filter(
    node =>
      node.npc?.archetype === 'firefly' ||
      node.npc?.presentation?.type === 'firefly',
  ).length
}

export function createSceneFireflyPopulationActors(scene, options = {}) {
  const settings = scene.settings?.level?.fireflies
  const featureEnabled =
    scene.settings?.level?.features?.fireflies ?? settings?.enabled ?? false
  if (!featureEnabled || !settings?.enabled) return []
  const authoredFireflyCount = countAuthoredFireflyNodes(scene)
  if (authoredFireflyCount > 0 && settings.allowWithAuthored !== true) return []

  const quality = resolveSceneFireflyFieldQuality({
    settings,
    qualityTier: options.qualityTier ?? null,
    defaultCount: options.defaultCount ?? 36,
    defaultLightCount: options.defaultLightCount ?? 8,
    defaultSize: options.defaultSize ?? 0.58,
    defaultSpriteIntensity: options.defaultSpriteIntensity ?? 1.45,
  })
  const count = quality.count
  if (count <= 0) return []

  const fieldId = `${scene.levelId}-scene-fireflies`
  const center = settings.center ??
    scene.settings?.level?.spawn?.position ?? [0, 0, 0]
  const radius = Math.max(0, settings.radius ?? 120)
  const minHeight = settings.minHeight ?? 2
  const maxHeight = settings.maxHeight ?? 5
  const heightSpan = Math.max(0.1, maxHeight - minHeight)
  const distribution = settings.distribution ?? 'uniform'
  const densityExponent = settings.densityExponent ?? 0.5
  const sway = settings.sway ?? 1.5
  const driftSpeed = settings.driftSpeed ?? 0.28
  const twinkleSpeed = settings.twinkleSpeed ?? 0.82
  const usesBlinkTiming = hasAuthoredFireflyBlinkTiming(
    settings,
    options.qualityTier ?? null,
  )
  const actors = []

  for (let index = 0; index < count; index += 1) {
    const { localX, localZ } = resolveSceneFireflyFieldPoint({
      index,
      count,
      radius,
      distribution,
      densityExponent,
    })
    const tint = getFireflyColor({ index, settings })
    const id = `${fieldId}-${index}`
    const fireflySize =
      quality.size * (0.75 + seededSceneFireflyUnit(index, 5) * 0.55)
    const blinkPeriodSeconds = resolveSceneFireflyBlinkPeriodSeconds({
      index,
      lighting: quality.lighting,
    })
    const fireflyTwinkleSpeed =
      usesBlinkTiming || settings.twinkleSpeed === undefined
        ? resolveSceneFireflyTwinkleSpeedFromBlinkPeriod(blinkPeriodSeconds)
        : twinkleSpeed * (0.75 + seededSceneFireflyUnit(index, 6) * 0.65)
    const fireflyDriftSpeed =
      driftSpeed * (0.75 + seededSceneFireflyUnit(index, 7) * 0.6)
    const interaction = getFireflyInteraction({
      fieldId,
      index,
      count,
      settings,
    })
    const npcId = interaction?.npcId ?? `${id}-npc`
    const interactiveFirefly = Boolean(
      settings.interactive?.enabled && interaction,
    )
    const height = minHeight + seededSceneFireflyUnit(index, 3) * heightSpan

    const behavior =
      sway > 0 && fireflyDriftSpeed > 0
        ? {
            type: 'hover-wander',
            radius: Math.max(0.001, sway),
            speed: Math.max(0.001, fireflyDriftSpeed),
            hoverHeight: 0,
            bobAmplitude: Math.min(0.7, Math.max(0, sway * 0.35)),
            bobSpeed: 1.37,
          }
        : { type: 'static' }

    const npc = {
      id: npcId,
      archetype: 'firefly',
      displayName: interaction?.displayName ?? `Firefly ${index + 1}`,
      interaction: interactiveFirefly
        ? {
            enabled: true,
            mode: 'click',
            prompt: interaction?.mode === 'profile' ? 'Ask' : 'Listen',
            eventKey:
              interaction?.mode === 'profile'
                ? 'firefly_profile_conversation'
                : 'firefly_lost_soul',
          }
        : {
            enabled: false,
            mode: 'disabled',
          },
      conversation: getFireflyConversation({ interaction, settings }),
      behavior,
      presentation: {
        type: 'firefly',
        color: tint,
        secondaryColor: tint,
        size: fireflySize,
        twinkleSpeed: fireflyTwinkleSpeed,
        populationId: fieldId,
        populationIndex: index,
        populationCount: count,
        lightPhase: count > 0 ? index / count : 0,
        selectionLightBoost: 0.85,
        lightBurstSpriteBoost: 0.18,
        shockwaveEnabled: false,
      },
      state: {
        key: 'scene-firefly-population',
        saveKey: `${scene.levelId}:scene-fireflies:${index}`,
      },
    }

    actors.push({
      id,
      name: `Field Firefly ${index + 1}`,
      kind: 'empty',
      transform: {
        position: [center[0] + localX, center[1] + height, center[2] + localZ],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
      },
      render: {
        visible: true,
        cullingPolicy: 'runtime-budget',
        physicsAttachment: 'outside-collider',
        lighting: 'lit',
        castShadow: 'disabled',
        receiveShadow: 'disabled',
      },
      npc,
      interaction: {
        kind:
          npc.interaction.mode === 'disabled' ||
          npc.conversation?.mode === 'none'
            ? 'custom'
            : 'conversation',
        targetId: npc.id,
        data: structuredClone(npc),
      },
    })
  }

  return actors
}
