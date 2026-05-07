export type TimelineYearFormatOptions = {
  prefix?: string
  precision?: number
}

function trimExponentialMantissa(value: string) {
  return value
    .replace(/(\.\d*?[1-9])0+e/, '$1e')
    .replace(/\.0+e/, 'e')
    .replace('e+', 'e')
}

export function formatTimelineYear(
  year: number | null | undefined,
  options: TimelineYearFormatOptions = {},
) {
  const prefix = options.prefix ?? 'Y'
  const precision = options.precision ?? 4

  if (typeof year !== 'number' || !Number.isFinite(year)) return `${prefix}--`
  if (year === 0) return `${prefix}0e0`

  return `${prefix}${trimExponentialMantissa(year.toExponential(precision))}`
}

export function formatTimelineYearRange(
  startYear: number | null | undefined,
  endYear: number | null | undefined,
  options: TimelineYearFormatOptions = {},
) {
  return `${formatTimelineYear(startYear, options)} - ${formatTimelineYear(endYear, options)}`
}
