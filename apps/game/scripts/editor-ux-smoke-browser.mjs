import { inflateSync } from 'node:zlib'
import {
  launchBrowser,
  normalizeBrowserName,
  parseArgValue,
  shouldIgnoreConsoleMessage,
  shouldIgnoreRequestFailure,
} from './lib/browserHarness.mjs'

const PNG_SIGNATURE = '89504e470d0a1a0a'
const VIEWPORTS = [
  { width: 1440, height: 900 },
  { width: 1280, height: 800 },
  { width: 1024, height: 768 },
  { width: 900, height: 700 },
]
const EXPECTED_WORKSPACE_LABELS = [
  'Scene',
  'Create',
  'World',
  'Collision',
  'Build',
  'AI Lab',
]
const WORKSPACE_LABEL_TO_ID = new Map(
  EXPECTED_WORKSPACE_LABELS.map(label => [
    label.toLowerCase(),
    label === 'AI Lab' ? 'ai' : label.toLowerCase(),
  ]),
)
const WORKSPACE_DENSITY_TARGETS = [
  { tab: 'scene', label: 'Initial Scene', target: 35 },
  { tab: 'create', label: 'Create', target: 45 },
  { tab: 'world', label: 'World', target: 45 },
  { tab: 'collision', label: 'Collision', target: 45 },
  { tab: 'build', label: 'Build', target: 45 },
  { tab: 'ai', label: 'AI Lab', target: 45 },
]
const args = process.argv.slice(2)
const browserName = normalizeBrowserName(
  parseArgValue(args, 'browser', process.env.GAME_BROWSER || 'chromium'),
)
const appOrigin = `http://127.0.0.1:${process.env.GAME_DEV_PORT || 4322}`

function readUInt32(buffer, offset) {
  return buffer.readUInt32BE(offset)
}

function decodePng(buffer) {
  if (buffer.subarray(0, 8).toString('hex') !== PNG_SIGNATURE) {
    throw new Error('Screenshot is not a PNG image.')
  }

  let offset = 8
  let width = 0
  let height = 0
  let bitDepth = 0
  let colorType = 0
  const idatChunks = []

  while (offset < buffer.length) {
    const length = readUInt32(buffer, offset)
    const type = buffer.subarray(offset + 4, offset + 8).toString('ascii')
    const data = buffer.subarray(offset + 8, offset + 8 + length)
    offset += 12 + length

    if (type === 'IHDR') {
      width = readUInt32(data, 0)
      height = readUInt32(data, 4)
      bitDepth = data[8]
      colorType = data[9]
      const compression = data[10]
      const filter = data[11]
      const interlace = data[12]
      if (
        bitDepth !== 8 ||
        compression !== 0 ||
        filter !== 0 ||
        interlace !== 0
      ) {
        throw new Error('Unsupported PNG format for editor smoke analysis.')
      }
    } else if (type === 'IDAT') {
      idatChunks.push(data)
    } else if (type === 'IEND') {
      break
    }
  }

  const channels = colorType === 6 ? 4 : colorType === 2 ? 3 : 0
  if (!width || !height || !channels) {
    throw new Error(`Unsupported PNG color type ${colorType}.`)
  }

  const inflated = inflateSync(Buffer.concat(idatChunks))
  const stride = width * channels
  const pixels = new Uint8Array(width * height * 4)
  let inputOffset = 0
  let previous = new Uint8Array(stride)

  for (let y = 0; y < height; y += 1) {
    const filterType = inflated[inputOffset]
    inputOffset += 1
    const row = inflated.subarray(inputOffset, inputOffset + stride)
    inputOffset += stride
    const decoded = new Uint8Array(stride)

    for (let index = 0; index < stride; index += 1) {
      const left = index >= channels ? decoded[index - channels] : 0
      const up = previous[index] ?? 0
      const upperLeft = index >= channels ? previous[index - channels] : 0
      const predictor = (() => {
        const p = left + up - upperLeft
        const pa = Math.abs(p - left)
        const pb = Math.abs(p - up)
        const pc = Math.abs(p - upperLeft)
        if (pa <= pb && pa <= pc) return left
        if (pb <= pc) return up
        return upperLeft
      })()
      const filterValue =
        filterType === 0
          ? 0
          : filterType === 1
            ? left
            : filterType === 2
              ? up
              : filterType === 3
                ? Math.floor((left + up) / 2)
                : filterType === 4
                  ? predictor
                  : null
      if (filterValue === null) {
        throw new Error(`Unsupported PNG filter type ${filterType}.`)
      }
      decoded[index] = (row[index] + filterValue) & 0xff
    }

    for (let x = 0; x < width; x += 1) {
      const sourceIndex = x * channels
      const outputIndex = (y * width + x) * 4
      pixels[outputIndex] = decoded[sourceIndex]
      pixels[outputIndex + 1] = decoded[sourceIndex + 1]
      pixels[outputIndex + 2] = decoded[sourceIndex + 2]
      pixels[outputIndex + 3] = channels === 4 ? decoded[sourceIndex + 3] : 255
    }

    previous = decoded
  }

  return { width, height, pixels }
}

function analyzeScreenshot(buffer) {
  const { width, height, pixels } = decodePng(buffer)
  const sampleStride = Math.max(1, Math.floor(Math.min(width, height) / 160))
  const colorBuckets = new Set()
  let opaquePixels = 0
  let lumaSum = 0
  let lumaSquaredSum = 0
  let edgeSum = 0
  let edgeSamples = 0

  for (let y = 0; y < height; y += sampleStride) {
    for (let x = 0; x < width; x += sampleStride) {
      const index = (y * width + x) * 4
      const alpha = pixels[index + 3]
      if (alpha < 16) continue

      const red = pixels[index]
      const green = pixels[index + 1]
      const blue = pixels[index + 2]
      const luma = 0.2126 * red + 0.7152 * green + 0.0722 * blue
      opaquePixels += 1
      lumaSum += luma
      lumaSquaredSum += luma * luma
      colorBuckets.add(
        `${Math.floor(red / 16)},${Math.floor(green / 16)},${Math.floor(blue / 16)}`,
      )

      if (x + sampleStride < width) {
        const rightIndex = (y * width + x + sampleStride) * 4
        edgeSum +=
          Math.abs(red - pixels[rightIndex]) +
          Math.abs(green - pixels[rightIndex + 1]) +
          Math.abs(blue - pixels[rightIndex + 2])
        edgeSamples += 1
      }
      if (y + sampleStride < height) {
        const downIndex = ((y + sampleStride) * width + x) * 4
        edgeSum +=
          Math.abs(red - pixels[downIndex]) +
          Math.abs(green - pixels[downIndex + 1]) +
          Math.abs(blue - pixels[downIndex + 2])
        edgeSamples += 1
      }
    }
  }

  const meanLuma = opaquePixels > 0 ? lumaSum / opaquePixels : 0
  const lumaVariance =
    opaquePixels > 0 ? lumaSquaredSum / opaquePixels - meanLuma * meanLuma : 0

  return {
    width,
    height,
    opaquePixels,
    uniqueColorBuckets: colorBuckets.size,
    meanLuma: Math.round(meanLuma * 10) / 10,
    lumaStdDev: Math.round(Math.sqrt(Math.max(0, lumaVariance)) * 10) / 10,
    edgeScore:
      edgeSamples > 0 ? Math.round((edgeSum / edgeSamples) * 10) / 10 : 0,
  }
}

function formatRect(rect) {
  if (!rect) return 'missing'
  const values = [rect.x, rect.y, rect.width, rect.height].map(value =>
    Math.round(value),
  )
  return `x=${values[0]} y=${values[1]} w=${values[2]} h=${values[3]}`
}

function isRectVisible(rect) {
  return Boolean(rect && rect.width > 0 && rect.height > 0)
}

function rectIntersectsViewport(rect, viewport) {
  if (!isRectVisible(rect)) return false
  return (
    rect.right > 0 &&
    rect.bottom > 0 &&
    rect.left < viewport.width &&
    rect.top < viewport.height
  )
}

function rectContains(parent, child, tolerance = 4) {
  if (!isRectVisible(parent) || !isRectVisible(child)) return false
  return (
    child.left >= parent.left - tolerance &&
    child.top >= parent.top - tolerance &&
    child.right <= parent.right + tolerance &&
    child.bottom <= parent.bottom + tolerance
  )
}

function rectOverlapArea(a, b) {
  if (!isRectVisible(a) || !isRectVisible(b)) return 0
  const width = Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left))
  const height = Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top))
  return width * height
}

function rectArea(rect) {
  if (!isRectVisible(rect)) return 0
  return rect.width * rect.height
}

function rectOverlapRatio(a, b) {
  const overlap = rectOverlapArea(a, b)
  if (overlap <= 0) return 0
  const denom = Math.min(rectArea(a), rectArea(b))
  return denom > 0 ? overlap / denom : 0
}

async function collectEditorMetrics(page) {
  return page.evaluate(() => {
    const selectors = {
      shell: '.editor-shell',
      header: '.editor-header',
      menu: '.editor-menu-bar',
      headerActions: '.editor-header-actions',
      editorBody: '.editor-body',
      toolsRegion: '.editor-tools-region',
      sideRegion: '.editor-side-region',
      tools: '.editor-tools-panel',
      tabRail: '.editor-tab-rail',
      tabContent: '.editor-tab-content',
      outliner: '.editor-outliner-panel',
      details: '.editor-properties-panel',
      sideStack: '.editor-side-stack',
      controlsOverlay: '.editor-controls-overlay',
      canvas: 'canvas',
    }

    function readRect(selector) {
      const element = document.querySelector(selector)
      if (!element) return null
      const rect = element.getBoundingClientRect()
      return {
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height,
        top: rect.top,
        right: rect.right,
        bottom: rect.bottom,
        left: rect.left,
      }
    }

    function readScroll(selector) {
      const element = document.querySelector(selector)
      if (!element) return null
      return {
        scrollHeight: element.scrollHeight,
        clientHeight: element.clientHeight,
        scrollWidth: element.scrollWidth,
        clientWidth: element.clientWidth,
      }
    }

    function readStyle(selector) {
      const element = document.querySelector(selector)
      if (!element) return null
      const style = window.getComputedStyle(element)
      return {
        display: style.display,
        visibility: style.visibility,
        overflow: style.overflow,
        overflowX: style.overflowX,
        overflowY: style.overflowY,
        pointerEvents: style.pointerEvents,
        position: style.position,
      }
    }

    const rects = Object.fromEntries(
      Object.entries(selectors).map(([name, selector]) => [
        name,
        readRect(selector),
      ]),
    )
    const styles = Object.fromEntries(
      Object.entries(selectors).map(([name, selector]) => [
        name,
        readStyle(selector),
      ]),
    )
    const visibleButtonCount = Array.from(
      document.querySelectorAll('.editor-shell button'),
    ).filter(button => {
      const rect = button.getBoundingClientRect()
      const style = window.getComputedStyle(button)
      return (
        rect.width > 0 &&
        rect.height > 0 &&
        style.visibility !== 'hidden' &&
        style.display !== 'none'
      )
    }).length
    const chromeElements = [
      '.editor-header',
      '.editor-tools-panel',
      '.editor-outliner-panel',
      '.editor-properties-panel',
    ]
      .map(selector => document.querySelector(selector))
      .filter(Boolean)
    const chromeArea = chromeElements.reduce((sum, element) => {
      const rect = element.getBoundingClientRect()
      return sum + Math.max(0, rect.width) * Math.max(0, rect.height)
    }, 0)
    const bodyText = document.querySelector('.editor-shell')?.innerText ?? ''
    const tabRailElement = document.querySelector('.editor-tab-rail')
    const tabButtons = Array.from(
      document.querySelectorAll('.editor-tab-rail button'),
    ).map(button => {
      const rect = button.getBoundingClientRect()
      return {
        label:
          button
            .querySelector('.tab-label')
            ?.textContent?.trim()
            .replace(/\s+/g, ' ') ??
          button.textContent?.trim().replace(/\s+/g, ' ') ??
          '',
        rect: {
          x: rect.x,
          y: rect.y,
          width: rect.width,
          height: rect.height,
          top: rect.top,
          right: rect.right,
          bottom: rect.bottom,
          left: rect.left,
        },
      }
    })
    const expectedWorkspaceLabels = [
      'Scene',
      'Create',
      'World',
      'Collision',
      'Build',
      'AI Lab',
    ]
    const reachableWorkspaceLabels = tabButtons
      .map(button => button.label)
      .filter(label => expectedWorkspaceLabels.includes(label))
    const tabRailRect = rects.tabRail
    const clippedTabLabels =
      tabRailRect && tabButtons.length
        ? tabButtons
            .filter(button => {
              const rect = button.rect
              return (
                rect.left < tabRailRect.left - 2 ||
                rect.right > tabRailRect.right + 2 ||
                rect.top < tabRailRect.top - 2 ||
                rect.bottom > tabRailRect.bottom + 2
              )
            })
            .map(button => button.label)
        : []
    const tabRailScroll = readScroll('.editor-tab-rail')
    const navHasOverflow =
      tabRailScroll &&
      (tabRailScroll.scrollHeight > tabRailScroll.clientHeight + 2 ||
        tabRailScroll.scrollWidth > tabRailScroll.clientWidth + 2)
    const bodyTop = rects.editorBody?.top ?? null
    const shellTop = rects.shell?.top ?? 0
    const leftDockWidthPercent =
      rects.toolsRegion?.width && window.innerWidth
        ? rects.toolsRegion.width / window.innerWidth
        : 0
    const rightDockWidthPercent =
      rects.sideRegion?.width && window.innerWidth
        ? rects.sideRegion.width / window.innerWidth
        : 0
    const combinedSideChromePercent = leftDockWidthPercent + rightDockWidthPercent
    const fullFixedSideRegionsVisible =
      Boolean(rects.tools && rects.outliner && rects.details) &&
      rects.tools.height > window.innerHeight * 0.55 &&
      rects.outliner.height > window.innerHeight * 0.25 &&
      rects.details.height > window.innerHeight * 0.25

    return {
      rects,
      styles,
      tabRailScroll: readScroll('.editor-tab-rail'),
      tabContentScroll: readScroll('.editor-tab-content'),
      detailsScroll: readScroll('.editor-properties-panel .editor-side-content'),
      visibleButtonCount,
      chromeCoverageRatio:
        chromeArea / Math.max(1, window.innerWidth * window.innerHeight),
      bodyTextLength: bodyText.length,
      layoutGate: {
        topChromeStackHeight:
          bodyTop === null ? null : Math.max(0, bodyTop - shellTop),
        editorBodyTop: bodyTop,
        leftDockWidthPercent,
        rightDockWidthPercent,
        combinedSideChromePercent,
        navHasOverflow: Boolean(navHasOverflow),
        clippedTabLabels,
        reachableWorkspaceLabels,
        allExpectedWorkspaceLabelsReachable: expectedWorkspaceLabels.every(label =>
          reachableWorkspaceLabels.includes(label),
        ),
        fullFixedSideRegionsVisible,
      },
    }
  })
}

function assertEditorMetrics(viewport, metrics, canvasMetrics, consoleFailures) {
  const failures = []
  const warnings = []
  const requiredRegions = [
    'shell',
    'header',
    'menu',
    'headerActions',
    'tools',
    'tabRail',
    'tabContent',
    'outliner',
    'details',
    'canvas',
  ]

  for (const region of requiredRegions) {
    const rect = metrics.rects[region]
    if (!isRectVisible(rect)) {
      failures.push(`${region} is missing or has no visible size`)
      continue
    }
    if (!rectIntersectsViewport(rect, viewport)) {
      failures.push(`${region} is entirely outside the viewport`)
    }
    if (rect.top >= viewport.height) {
      failures.push(`${region} starts below the viewport`)
    }
  }

  const header = metrics.rects.header
  if (
    header &&
    (header.top < -1 ||
      header.left < -1 ||
      header.right > viewport.width + 1 ||
      header.bottom > viewport.height + 1)
  ) {
    failures.push('header/menu is not fully inside the viewport')
  }

  if (canvasMetrics.uniqueColorBuckets < 8 || canvasMetrics.edgeScore < 0.8) {
    failures.push(
      `main canvas appears blank: colors=${canvasMetrics.uniqueColorBuckets} edge=${canvasMetrics.edgeScore}`,
    )
  }

  const gate = metrics.layoutGate
  if (!gate) {
    failures.push('layout gate metrics were not collected')
  } else {
    if (
      (viewport.width === 1440 || viewport.width === 1280) &&
      gate.editorBodyTop !== null &&
      gate.editorBodyTop > 120
    ) {
      failures.push(
        `layout gate body top exceeds threshold: bodyTop=${Math.round(gate.editorBodyTop)}px threshold=120px`,
      )
    }

    if (
      viewport.width === 1024 &&
      gate.combinedSideChromePercent > 0.45
    ) {
      failures.push(
        `layout gate combined side chrome exceeds threshold: combined=${gate.combinedSideChromePercent.toFixed(3)} threshold=0.450`,
      )
    }

    if (
      viewport.width === 900 &&
      gate.fullFixedSideRegionsVisible
    ) {
      failures.push(
        'layout gate mobile default shows tools, outliner, and details as full fixed regions simultaneously',
      )
    }

    if (viewport.width >= 1024) {
      if (gate.navHasOverflow) {
        failures.push('layout gate section nav clips or overflows at desktop/tablet width')
      }
      if (gate.clippedTabLabels.length > 0) {
        failures.push(
          `layout gate section nav clips labels: ${gate.clippedTabLabels.join(', ')}`,
        )
      }
    }

    if (!gate.allExpectedWorkspaceLabelsReachable) {
      failures.push(
        `layout gate missing workspace labels: expected=${EXPECTED_WORKSPACE_LABELS.join(', ')} reachable=${gate.reachableWorkspaceLabels.join(', ')}`,
      )
    }
  }

  if (metrics.visibleButtonCount > 80) {
    failures.push(
      `initial editor surface exposes too many buttons: ${metrics.visibleButtonCount}`,
    )
  }

  // Chrome coverage budget: warn > 0.45, fail > 0.60.
  if (metrics.chromeCoverageRatio > 0.6) {
    failures.push(
      `editor chrome covers too much viewport: ${metrics.chromeCoverageRatio.toFixed(3)}`,
    )
  } else if (metrics.chromeCoverageRatio > 0.45) {
    warnings.push(
      `editor chrome coverage approaching budget: ${metrics.chromeCoverageRatio.toFixed(3)}`,
    )
  }

  const tabContentScroll = metrics.tabContentScroll
  if (
    tabContentScroll &&
    tabContentScroll.scrollHeight > tabContentScroll.clientHeight + 24 &&
    tabContentScroll.clientHeight < 120
  ) {
    failures.push(
      `active panel scroll area is too short: ${tabContentScroll.clientHeight}px`,
    )
  }

  // 1. Child containment — tabRail/tabContent should be inside tools (within tolerance)
  //    unless they have their own scroll container.
  const tools = metrics.rects.tools
  const tabRail = metrics.rects.tabRail
  const tabContent = metrics.rects.tabContent
  const tabRailStyle = metrics.styles?.tabRail
  const tabContentStyle = metrics.styles?.tabContent
  const tolerance = 4

  if (tools && tabRail && !rectContains(tools, tabRail, tolerance)) {
    const overflow = describeOverflow(tools, tabRail)
    const scrollContained =
      tabRailStyle &&
      tabRailStyle.overflowY !== 'visible' &&
      tabRailStyle.overflowY !== ''
    if (!scrollContained) {
      failures.push(
        `tabRail overflows tools (overflow ${overflow}; tools=${formatRect(tools)} tabRail=${formatRect(tabRail)})`,
      )
    } else {
      warnings.push(
        `tabRail extends beyond tools but is scroll-contained (${overflow})`,
      )
    }
  }

  if (tools && tabContent && !rectContains(tools, tabContent, tolerance)) {
    const overflow = describeOverflow(tools, tabContent)
    const scrollContained =
      tabContentStyle &&
      tabContentStyle.overflowY !== 'visible' &&
      tabContentStyle.overflowY !== ''
    if (!scrollContained) {
      failures.push(
        `tabContent overflows tools (overflow ${overflow}; tools=${formatRect(tools)} tabContent=${formatRect(tabContent)})`,
      )
    } else {
      warnings.push(
        `tabContent extends beyond tools but is scroll-contained (${overflow})`,
      )
    }
  }

  // 2. Region overlap — interactive docks should not incoherently overlap each other.
  const overlapPairs = [
    ['tools', 'sideStack'],
    ['tabRail', 'outliner'],
    ['tabRail', 'details'],
    ['controlsOverlay', 'tools'],
    ['controlsOverlay', 'sideStack'],
  ]
  for (const [a, b] of overlapPairs) {
    const rectA = metrics.rects[a]
    const rectB = metrics.rects[b]
    if (!isRectVisible(rectA) || !isRectVisible(rectB)) continue
    const area = rectOverlapArea(rectA, rectB)
    if (area <= 4) continue
    const ratio = rectOverlapRatio(rectA, rectB)
    // controls overlay may be intentional if it is non-interactive (pointer-events: none).
    if (a === 'controlsOverlay') {
      const overlayStyle = metrics.styles?.controlsOverlay
      if (overlayStyle && overlayStyle.pointerEvents === 'none') {
        if (ratio > 0.6) {
          warnings.push(
            `controlsOverlay heavily covers ${b} (${(ratio * 100).toFixed(0)}%; ${formatRect(rectA)} vs ${formatRect(rectB)})`,
          )
        }
        continue
      }
    }
    failures.push(
      `${a} overlaps ${b} (${Math.round(area)}px^2, ${(ratio * 100).toFixed(0)}%; ${a}=${formatRect(rectA)} ${b}=${formatRect(rectB)})`,
    )
  }

  // 3. Internal overflow — uncontained scroll content.
  const tabRailScroll = metrics.tabRailScroll
  if (
    tabRailScroll &&
    tabRailStyle &&
    tabRailScroll.scrollHeight > tabRailScroll.clientHeight + 24 &&
    tabRailStyle.overflowY === 'visible'
  ) {
    failures.push(
      `tabRail has uncontained vertical overflow: scrollHeight=${tabRailScroll.scrollHeight} clientHeight=${tabRailScroll.clientHeight} overflowY=visible`,
    )
  }

  if (tools && tabRail && !rectContains(tools, tabRail, tolerance)) {
    // Already reported above; cross-check whether the tabRail child also intersects sibling docks.
    for (const sibling of ['outliner', 'details']) {
      const siblingRect = metrics.rects[sibling]
      if (!isRectVisible(siblingRect)) continue
      if (rectOverlapArea(tabRail, siblingRect) > 4) {
        failures.push(
          `tabRail overflow intrudes on sibling ${sibling} (tabRail=${formatRect(tabRail)} ${sibling}=${formatRect(siblingRect)})`,
        )
      }
    }
  }

  failures.push(...consoleFailures)
  return { failures, warnings }
}

function describeOverflow(parent, child) {
  const parts = []
  if (child.left < parent.left) parts.push(`left=${Math.round(parent.left - child.left)}`)
  if (child.right > parent.right) parts.push(`right=${Math.round(child.right - parent.right)}`)
  if (child.top < parent.top) parts.push(`top=${Math.round(parent.top - child.top)}`)
  if (child.bottom > parent.bottom) parts.push(`bottom=${Math.round(child.bottom - parent.bottom)}`)
  return parts.length > 0 ? parts.join(' ') : 'within tolerance'
}

async function assertCommandPaletteInteraction(page, viewport) {
  const label = `${viewport.width}x${viewport.height}`

  await page.bringToFront()
  await page.evaluate(() => {
    window.focus()
    document.body?.focus()
  })
  await page.keyboard.press('ControlOrMeta+K')

  const palette = page.locator('.command-palette').first()
  try {
    await palette.waitFor({ state: 'visible', timeout: 5000 })
  } catch (error) {
    const focusState = await page.evaluate(() => {
      const active = document.activeElement
      return {
        tagName: active?.tagName ?? null,
        className:
          typeof active?.className === 'string' ? active.className : null,
        text: active?.textContent?.trim().slice(0, 80) ?? null,
      }
    })
    throw new Error(
      `Ctrl+K did not open command palette at ${label}; activeElement=${JSON.stringify(focusState)}; ${
        error instanceof Error ? error.message : String(error)
      }`,
    )
  }

  const search = page.getByLabel('Search commands')
  await search.fill('asset library')

  const command = page
    .locator('.palette-command')
    .filter({ hasText: 'Open Asset Library' })
    .first()
  await command.waitFor({ state: 'visible', timeout: 5000 })

  const pointerTarget = await command.evaluate(element => {
    const rect = element.getBoundingClientRect()
    const x = rect.left + rect.width / 2
    const y = rect.top + rect.height / 2
    const target = document.elementFromPoint(x, y)
    return {
      x,
      y,
      tagName: target?.tagName ?? null,
      className:
        typeof target?.className === 'string' ? target.className : null,
      text: target?.textContent?.trim().slice(0, 80) ?? null,
      commandContainsTarget: target ? element.contains(target) : false,
    }
  })

  if (!pointerTarget.commandContainsTarget) {
    throw new Error(
      `command palette click target is intercepted at ${label}: ${JSON.stringify(pointerTarget)}`,
    )
  }

  await page.mouse.click(pointerTarget.x, pointerTarget.y)
  await palette.waitFor({ state: 'hidden', timeout: 5000 })

  await page.waitForFunction(
    () => {
      const select = document.querySelector('.editor-tab-picker select')
      if (select?.value === 'create') return true
      const activeButton = document.querySelector(
        '.editor-tab-rail [role="tab"][aria-selected="true"], .editor-tab-rail [role="tab"][aria-current="page"], .editor-tab-rail button.active',
      )
      const label =
        activeButton
          ?.querySelector('.tab-label')
          ?.textContent?.trim()
          .replace(/\s+/g, ' ') ?? ''
      return label === 'Create'
    },
    null,
    { timeout: 5000 },
  )
  const activeSection = await readActiveWorkspaceState(page)
  if (activeSection.activeSectionId !== 'create') {
    throw new Error(
      `Open Asset Library selected ${activeSection.activeSectionId || 'no workspace'} instead of create`,
    )
  }

  return {
    openedWithShortcut: true,
    searchMatchedCommand: true,
    hitTargetInsideCommand: pointerTarget.commandContainsTarget,
    clickSwitchedToCreate: true,
    paletteClosed: true,
    activeSectionId: activeSection.activeSectionId,
  }
}

async function readActiveWorkspaceState(page) {
  return page.evaluate(() => {
    const section = document.querySelector('.editor-workspace')
    const heading =
      section?.querySelector('.workspace-summary .label, .label')?.textContent ??
      ''
    const select = document.querySelector('.editor-tab-picker select')
    const activeButton = document.querySelector(
      '.editor-tab-rail [role="tab"][aria-selected="true"], .editor-tab-rail [role="tab"][aria-current="page"], .editor-tab-rail button.active',
    )
    const activeButtonLabel =
      activeButton
        ?.querySelector('.tab-label')
        ?.textContent?.trim()
        .replace(/\s+/g, ' ') ?? ''

    return {
      activeSectionId:
        select?.value ??
        (activeButtonLabel === 'AI Lab'
          ? 'ai'
          : activeButtonLabel.toLowerCase()),
      workspaceHeading: heading.trim(),
    }
  })
}

async function selectWorkspace(page, workspace) {
  const select = page.locator('.editor-tab-picker select').first()
  if (await select.count()) {
    await select.selectOption(workspace.tab)
    return
  }

  const selected = await page.evaluate(
    expectedLabel => {
      const tabs = Array.from(document.querySelectorAll('.editor-tab-rail [role="tab"], .editor-tab-rail button'))
      const target = tabs.find(tab =>
        (
          tab.querySelector('.tab-label')?.textContent ??
          tab.textContent ??
          ''
        )
          .replace(/\s+/g, ' ')
          .trim()
          .includes(expectedLabel),
      )
      if (!(target instanceof HTMLElement)) return false
      target.click()
      return true
    },
    workspace.tab === 'ai' ? 'AI Lab' : workspace.label.replace('Initial ', ''),
  )
  if (!selected) {
    throw new Error(`Workspace tab not found: ${workspace.label}`)
  }
}

async function collectWorkspaceDensity(page) {
  const rows = []

  for (const workspace of WORKSPACE_DENSITY_TARGETS) {
    await selectWorkspace(page, workspace)
    await page.waitForFunction(
      expectedTab => {
        const select = document.querySelector('.editor-tab-picker select')
        if (select?.value === expectedTab) return true

        const activeButton = document.querySelector(
          '.editor-tab-rail [role="tab"][aria-selected="true"], .editor-tab-rail [role="tab"][aria-current="page"], .editor-tab-rail button.active',
        )
        const label =
          activeButton
            ?.querySelector('.tab-label')
            ?.textContent?.trim()
            .replace(/\s+/g, ' ') ?? ''
        const activeId = label === 'AI Lab' ? 'ai' : label.toLowerCase()
        return activeId === expectedTab
      },
      workspace.tab,
      { timeout: 5000 },
    )
    const metrics = await page.evaluate(
      ({ target }) => {
        function isVisibleElement(element) {
          const rect = element.getBoundingClientRect()
          const style = window.getComputedStyle(element)
          return (
            rect.width > 0 &&
            rect.height > 0 &&
            style.display !== 'none' &&
            style.visibility !== 'hidden'
          )
        }

        const section = document.querySelector('.editor-workspace')
        const heading =
          section
            ?.querySelector('.workspace-summary .label, .label')
            ?.textContent?.trim() ?? ''
        const controls = Array.from(
          section?.querySelectorAll('button, input, select, textarea') ?? [],
        ).filter(isVisibleElement)
        const buttons = controls.filter(
          element => element.tagName.toLowerCase() === 'button',
        )
        const select = document.querySelector('.editor-tab-picker select')
        const activeButton = document.querySelector(
          '.editor-tab-rail [role="tab"][aria-selected="true"], .editor-tab-rail [role="tab"][aria-current="page"], .editor-tab-rail button.active',
        )
        const activeButtonLabel =
          activeButton
            ?.querySelector('.tab-label')
            ?.textContent?.trim()
            .replace(/\s+/g, ' ') ?? ''
        const visibleShellText = Array.from(
          document.querySelectorAll('.editor-shell *'),
        )
          .filter(isVisibleElement)
          .map(element => element.textContent ?? '')
          .join('\n')
        const tabLabels = select
          ? Array.from(select.options).map(option => option.textContent?.trim() ?? '')
          : Array.from(document.querySelectorAll('.editor-tab-rail [role="tab"], .editor-tab-rail button')).map(
              button =>
                button
                  .querySelector('.tab-label')
                  ?.textContent?.trim()
                  .replace(/\s+/g, ' ') ??
                button.textContent?.trim().replace(/\s+/g, ' ') ??
                '',
            )

        return {
          activeSectionId:
            select?.value ??
            (activeButtonLabel === 'AI Lab'
              ? 'ai'
              : activeButtonLabel.toLowerCase()),
          workspaceHeading: heading,
          visibleControlCount: controls.length,
          visibleButtonCount: buttons.length,
          target,
          pass: controls.length <= target,
          legacyWorkflowTabVisible: tabLabels.some(label =>
            /\bworkflow\b/i.test(label),
          ),
          visibleAiBackendControls: /ComfyUI|Hunyuan/i.test(visibleShellText),
        }
      },
      { target: workspace.target },
    )

    rows.push({ ...workspace, ...metrics })
  }

  return rows
}

function assertWorkspaceDensity(viewport, rows) {
  const failures = []
  for (const row of rows) {
    if (!row.pass) {
      failures.push(
        `${row.label} workspace exposes ${row.visibleControlCount} visible controls; target is ${row.target}`,
      )
    }
    if (row.label === 'Initial Scene' && row.legacyWorkflowTabVisible) {
      failures.push('legacy Workflow tab is visible on initial load')
    }
    if (row.label === 'Initial Scene' && row.visibleAiBackendControls) {
      failures.push(
        'initial load exposes visible ComfyUI/Hunyuan controls outside AI Lab',
      )
    }
  }

  return failures.map(message => `${viewport.width}x${viewport.height}: ${message}`)
}

async function runViewport(browser, viewport) {
  const page = await browser.newPage({ viewport })
  const consoleWarnings = []
  const consoleFailures = []

  await page.addInitScript(() => {
    window.localStorage.clear()
    window.sessionStorage.clear()
  })

  page.on('console', msg => {
    const type = msg.type()
    if (type !== 'warning' && type !== 'error') return

    const text = msg.text()
    if (shouldIgnoreConsoleMessage(text)) return

    const entry = `[${type}] ${text}`
    if (type === 'error') {
      consoleFailures.push(entry)
    } else {
      consoleWarnings.push(entry)
    }
  })

  page.on('pageerror', error => {
    consoleFailures.push(`[pageerror] ${error.message}`)
  })

  page.on('requestfailed', request => {
    const url = request.url()
    const errorText = request.failure()?.errorText || 'unknown error'
    if (shouldIgnoreRequestFailure(url, errorText)) return
    consoleFailures.push(
      `[requestfailed] ${request.method()} ${url} :: ${errorText}`,
    )
  })

  try {
    const url = `${appOrigin}/?editor=1`
    const response = await page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    })
    if (!response || !response.ok()) {
      consoleFailures.push(
        `[navigation] ${url} returned ${response?.status?.() ?? 'no response'}`,
      )
    }

    await page.locator('.editor-shell').first().waitFor({
      state: 'visible',
      timeout: 15000,
    })
    await page.locator('canvas').first().waitFor({
      state: 'visible',
      timeout: 30000,
    })
    await page.waitForTimeout(2500)

    const canvasBuffer = await page
      .locator('canvas')
      .first()
      .screenshot({ animations: 'disabled' })
    const canvasMetrics = analyzeScreenshot(canvasBuffer)
    const metrics = await collectEditorMetrics(page)
    const { failures, warnings: layoutWarnings } = assertEditorMetrics(
      viewport,
      metrics,
      canvasMetrics,
      consoleFailures,
    )

    let commandPaletteResult = null
    try {
      commandPaletteResult = await assertCommandPaletteInteraction(page, viewport)
    } catch (error) {
      failures.push(
        `command palette interaction failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
      )
    }

    const densityRows = await collectWorkspaceDensity(page)
    failures.push(...assertWorkspaceDensity(viewport, densityRows))

    console.log(
      [
        `[editor-ux-smoke] ${viewport.width}x${viewport.height}`,
        `buttons=${metrics.visibleButtonCount}`,
        `chrome=${metrics.chromeCoverageRatio.toFixed(3)}`,
        `canvasColors=${canvasMetrics.uniqueColorBuckets}`,
        `canvasEdge=${canvasMetrics.edgeScore}`,
        `bodyTop=${Math.round(metrics.layoutGate?.editorBodyTop ?? 0)}`,
        `chromeTop=${Math.round(metrics.layoutGate?.topChromeStackHeight ?? 0)}`,
        `leftDock=${((metrics.layoutGate?.leftDockWidthPercent ?? 0) * 100).toFixed(1)}%`,
        `rightDock=${((metrics.layoutGate?.rightDockWidthPercent ?? 0) * 100).toFixed(1)}%`,
        `sideChrome=${((metrics.layoutGate?.combinedSideChromePercent ?? 0) * 100).toFixed(1)}%`,
        `navOverflow=${metrics.layoutGate?.navHasOverflow ?? false}`,
        `tabRailScroll=${metrics.tabRailScroll?.scrollHeight ?? 0}/${metrics.tabRailScroll?.clientHeight ?? 0}`,
        `tabScroll=${metrics.tabContentScroll?.scrollHeight ?? 0}/${metrics.tabContentScroll?.clientHeight ?? 0}`,
        `detailsScroll=${metrics.detailsScroll?.scrollHeight ?? 0}/${metrics.detailsScroll?.clientHeight ?? 0}`,
        `warnings=${consoleWarnings.length + layoutWarnings.length}`,
      ].join('  '),
    )
    if (commandPaletteResult) {
      console.log(
        `  commandPalette: opened=${commandPaletteResult.openedWithShortcut} search=${commandPaletteResult.searchMatchedCommand} hitTarget=${commandPaletteResult.hitTargetInsideCommand} create=${commandPaletteResult.clickSwitchedToCreate} closed=${commandPaletteResult.paletteClosed}`,
      )
    }
    for (const row of densityRows) {
      console.log(
        `  density: ${row.label} controls=${row.visibleControlCount} buttons=${row.visibleButtonCount} target=${row.target} pass=${row.pass} active=${row.activeSectionId} heading="${row.workspaceHeading}" workflowTab=${row.legacyWorkflowTabVisible} aiBackendVisible=${row.visibleAiBackendControls}`,
      )
    }

    for (const [name, rect] of Object.entries(metrics.rects)) {
      console.log(`  ${name}: ${formatRect(rect)}`)
    }
    for (const warning of layoutWarnings) {
      console.log(`  layout-warning: ${warning}`)
    }
    for (const warning of consoleWarnings) {
      console.log(`  warning: ${warning}`)
    }

    return failures.map(message => ({
      viewport: `${viewport.width}x${viewport.height}`,
      message,
    }))
  } finally {
    await page.close()
  }
}

const browser = await launchBrowser(browserName)
const failures = []

for (const viewport of VIEWPORTS) {
  try {
    failures.push(...(await runViewport(browser, viewport)))
  } catch (error) {
    failures.push({
      viewport: `${viewport.width}x${viewport.height}`,
      message: error instanceof Error ? error.message : String(error),
    })
  }
}

await browser.close()

if (failures.length > 0) {
  for (const failure of failures) {
    console.error(
      `[editor-ux-smoke] ${failure.viewport} failed: ${failure.message}`,
    )
  }
  process.exit(1)
}

console.log(
  `[editor-ux-smoke] ${browserName}: editor layout, reachability, and canvas checks passed`,
)
