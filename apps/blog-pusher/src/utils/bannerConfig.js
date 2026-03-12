function escapeRegExp(value) {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function scanObject(source, anchorMatcher, fromIndex = 0) {
  const slice = String(source || '').slice(fromIndex)
  const match = slice.match(anchorMatcher)
  if (!match) return null

  const anchorIndex = fromIndex + match.index
  const braceStart = source.indexOf('{', anchorIndex + match[0].length)
  if (braceStart === -1) return null

  let depth = 0
  let quote = null
  let lineComment = false
  let blockComment = false

  for (let i = braceStart; i < source.length; i += 1) {
    const char = source[i]
    const next = source[i + 1]
    const prev = source[i - 1]

    if (lineComment) {
      if (char === '\n') lineComment = false
      continue
    }

    if (blockComment) {
      if (prev === '*' && char === '/') blockComment = false
      continue
    }

    if (quote) {
      if (char === quote && prev !== '\\') quote = null
      continue
    }

    if (char === '/' && next === '/') {
      lineComment = true
      continue
    }

    if (char === '/' && next === '*') {
      blockComment = true
      continue
    }

    if (char === '\'' || char === '"' || char === '`') {
      quote = char
      continue
    }

    if (char === '{') depth += 1
    if (char === '}') {
      depth -= 1
      if (depth === 0) {
        return {
          anchorStart: anchorIndex,
          start: braceStart,
          end: i,
          body: source.slice(braceStart, i + 1),
        }
      }
    }
  }

  return null
}

function updateRange(source, start, end, replacement) {
  return `${source.slice(0, start)}${replacement}${source.slice(end + 1)}`
}

function readStringValue(block, key) {
  const match = String(block || '').match(new RegExp(`\\b${escapeRegExp(key)}\\s*:\\s*(['"])(.*?)\\1`, 's'))
  return match ? match[2] : ''
}

function readBooleanValue(block, key) {
  const match = String(block || '').match(new RegExp(`\\b${escapeRegExp(key)}\\s*:\\s*(true|false)`))
  return match ? match[1] === 'true' : false
}

function readNumberValue(block, key) {
  const match = String(block || '').match(new RegExp(`\\b${escapeRegExp(key)}\\s*:\\s*(-?\\d+(?:\\.\\d+)?)`))
  return match ? Number(match[1]) : 0
}

function replaceStringValue(block, key, nextValue) {
  return String(block || '').replace(
    new RegExp(`(\\b${escapeRegExp(key)}\\s*:\\s*)(['"])(.*?)\\2`, 's'),
    (_, prefix, quote) => `${prefix}${quote}${String(nextValue || '').split(quote).join(`\\${quote}`)}${quote}`
  )
}

function replaceBooleanValue(block, key, nextValue) {
  return String(block || '').replace(
    new RegExp(`(\\b${escapeRegExp(key)}\\s*:\\s*)(true|false)`),
    `$1${nextValue ? 'true' : 'false'}`
  )
}

function replaceNumberValue(block, key, nextValue) {
  return String(block || '').replace(
    new RegExp(`(\\b${escapeRegExp(key)}\\s*:\\s*)(-?\\d+(?:\\.\\d+)?)`),
    `$1${Number(nextValue) || 0}`
  )
}

function parseBannerModuleObject(source) {
  return scanObject(source, /export\s+const\s+bannerConfig\s*:\s*BannerConfig\s*=\s*/)
}

export function parseSiteBannerConfig(source) {
  const siteConfigObject = scanObject(source, /export\s+const\s+siteConfig\s*:\s*SiteConfig\s*=\s*/)
  if (!siteConfigObject) return null
  const bannerObject = scanObject(source, /\bbanner\s*:\s*/, siteConfigObject.start)
  if (!bannerObject || bannerObject.start > siteConfigObject.end) return null
  const creditObject = scanObject(source, /\bcredit\s*:\s*/, bannerObject.start)

  return {
    enabled: readBooleanValue(bannerObject.body, 'enable'),
    src: readStringValue(bannerObject.body, 'src'),
    position: readStringValue(bannerObject.body, 'position'),
    creditEnabled: creditObject ? readBooleanValue(creditObject.body, 'enable') : false,
    creditText: creditObject ? readStringValue(creditObject.body, 'text') : '',
    creditUrl: creditObject ? readStringValue(creditObject.body, 'url') : '',
  }
}

export function updateSiteBannerConfig(source, updates) {
  const siteConfigObject = scanObject(source, /export\s+const\s+siteConfig\s*:\s*SiteConfig\s*=\s*/)
  if (!siteConfigObject) return source
  const bannerObject = scanObject(source, /\bbanner\s*:\s*/, siteConfigObject.start)
  if (!bannerObject || bannerObject.start > siteConfigObject.end) return source

  let nextBannerBody = bannerObject.body
  nextBannerBody = replaceBooleanValue(nextBannerBody, 'enable', updates.enabled)
  nextBannerBody = replaceStringValue(nextBannerBody, 'src', updates.src)
  nextBannerBody = replaceStringValue(nextBannerBody, 'position', updates.position)

  const creditObject = scanObject(nextBannerBody, /\bcredit\s*:\s*/)
  if (creditObject) {
    let nextCreditBody = creditObject.body
    nextCreditBody = replaceBooleanValue(nextCreditBody, 'enable', updates.creditEnabled)
    nextCreditBody = replaceStringValue(nextCreditBody, 'text', updates.creditText)
    nextCreditBody = replaceStringValue(nextCreditBody, 'url', updates.creditUrl)
    nextBannerBody = updateRange(nextBannerBody, creditObject.start, creditObject.end, nextCreditBody)
  }

  return updateRange(source, bannerObject.start, bannerObject.end, nextBannerBody)
}

export function parseBannerModuleConfig(source) {
  const bannerObject = parseBannerModuleObject(source)
  if (!bannerObject) return null

  const layoutObject = scanObject(source, /\blayout\s*:\s*/, bannerObject.start)
  const visualObject = scanObject(source, /\bvisual\s*:\s*/, bannerObject.start)
  const parallaxObject = scanObject(source, /\bparallax\s*:\s*/, bannerObject.start)
  const animationObject = scanObject(source, /\banimation\s*:\s*/, bannerObject.start)

  return {
    defaultBannerType: readStringValue(bannerObject.body, 'defaultBannerType'),
    layoutHeight: layoutObject ? readStringValue(layoutObject.body, 'height') : '',
    layoutMobileHeight: layoutObject ? readStringValue(layoutObject.body, 'mobileHeight') : '',
    objectPosition: visualObject ? readStringValue(visualObject.body, 'objectPosition') : '',
    parallaxEnabled: parallaxObject ? readBooleanValue(parallaxObject.body, 'enabled') : false,
    animationEnabled: animationObject ? readBooleanValue(animationObject.body, 'enabled') : false,
    animationInterval: animationObject ? readNumberValue(animationObject.body, 'interval') : 0,
    transitionDuration: animationObject ? readNumberValue(animationObject.body, 'transitionDuration') : 0,
    randomStart: animationObject ? readBooleanValue(animationObject.body, 'randomStart') : false,
  }
}

export function updateBannerModuleConfig(source, updates) {
  const bannerObject = parseBannerModuleObject(source)
  if (!bannerObject) return source

  let nextSource = source
  let nextBannerObject = scanObject(nextSource, /export\s+const\s+bannerConfig\s*:\s*BannerConfig\s*=\s*/)
  if (!nextBannerObject) return source
  let nextBannerBody = replaceStringValue(nextBannerObject.body, 'defaultBannerType', updates.defaultBannerType)
  nextSource = updateRange(nextSource, nextBannerObject.start, nextBannerObject.end, nextBannerBody)

  const layoutObject = scanObject(nextSource, /\blayout\s*:\s*/, nextBannerObject.start)
  if (layoutObject) {
    let nextLayoutBody = layoutObject.body
    nextLayoutBody = replaceStringValue(nextLayoutBody, 'height', updates.layoutHeight)
    if (/\bmobileHeight\s*:/.test(nextLayoutBody)) {
      nextLayoutBody = replaceStringValue(nextLayoutBody, 'mobileHeight', updates.layoutMobileHeight)
    }
    nextSource = updateRange(nextSource, layoutObject.start, layoutObject.end, nextLayoutBody)
  }

  const visualObject = scanObject(nextSource, /\bvisual\s*:\s*/, nextBannerObject.start)
  if (visualObject) {
    const nextVisualBody = replaceStringValue(visualObject.body, 'objectPosition', updates.objectPosition)
    nextSource = updateRange(nextSource, visualObject.start, visualObject.end, nextVisualBody)
  }

  const parallaxObject = scanObject(nextSource, /\bparallax\s*:\s*/, nextBannerObject.start)
  if (parallaxObject) {
    const nextParallaxBody = replaceBooleanValue(parallaxObject.body, 'enabled', updates.parallaxEnabled)
    nextSource = updateRange(nextSource, parallaxObject.start, parallaxObject.end, nextParallaxBody)
  }

  const animationObject = scanObject(nextSource, /\banimation\s*:\s*/, nextBannerObject.start)
  if (animationObject) {
    let nextAnimationBody = animationObject.body
    nextAnimationBody = replaceBooleanValue(nextAnimationBody, 'enabled', updates.animationEnabled)
    nextAnimationBody = replaceNumberValue(nextAnimationBody, 'interval', updates.animationInterval)
    nextAnimationBody = replaceNumberValue(nextAnimationBody, 'transitionDuration', updates.transitionDuration)
    if (/\brandomStart\s*:/.test(nextAnimationBody)) {
      nextAnimationBody = replaceBooleanValue(nextAnimationBody, 'randomStart', updates.randomStart)
    }
    nextSource = updateRange(nextSource, animationObject.start, animationObject.end, nextAnimationBody)
  }

  return nextSource
}

export function parseTravelSequenceConfig(source) {
  const imports = Array.from(String(source || '').matchAll(/^import\s+(\w+)\s+from\s+'src\/assets\/banner\/([^']+)'/gm))
  const importMap = Object.fromEntries(imports.map(match => [match[1], match[2]]))
  const bannerObject = parseBannerModuleObject(source)
  const bannerBody = bannerObject?.body || String(source || '')
  const listMatch = bannerBody.match(/\bbannerList\s*:\s*\[([^\]]*)\]/s)
  const defaultMatch = bannerBody.match(/\bdefaultBanner\s*:\s*(\w+)/)
  if (!listMatch) return { slots: [], defaultBanner: defaultMatch?.[1] || '' }

  const variables = listMatch[1]
    .split(',')
    .map(value => value.trim())
    .filter(Boolean)

  return {
    slots: variables.map((variableName, index) => ({
      id: `${variableName}-${index}`,
      index,
      variableName,
      filename: importMap[variableName] || '',
    })),
    defaultBanner: defaultMatch?.[1] || variables[0] || '',
  }
}

export function updateTravelSequenceConfig(source, updates) {
  let nextSource = String(source || '')
  for (const slot of updates.slots || []) {
    nextSource = nextSource.replace(
      new RegExp(`(import\\s+${escapeRegExp(slot.variableName)}\\s+from\\s+'src/assets/banner/)([^']+)(')`),
      `$1${slot.filename}$3`
    )
  }

  if (updates.defaultBanner) {
    const bannerObject = parseBannerModuleObject(nextSource)
    if (bannerObject) {
      const nextBannerBody = bannerObject.body.replace(
        /\bdefaultBanner\s*:\s*\w+/,
        `defaultBanner: ${updates.defaultBanner}`
      )
      nextSource = updateRange(nextSource, bannerObject.start, bannerObject.end, nextBannerBody)
    }
  }

  return updateBannerModuleConfig(nextSource, updates)
}
