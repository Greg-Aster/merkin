import type { SharedQuiz, SharedQuizOption, SharedQuizQuestion } from './types.ts'

function asString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function normalizeOption(option: unknown): SharedQuizOption {
  if (!isRecord(option)) {
    return {}
  }

  return {
    ...option,
    id: asString(option.id),
    label: asString(option.label),
    text: asString(option.text),
    value: asString(option.value),
  }
}

function normalizeQuestion(question: unknown): SharedQuizQuestion | null {
  if (!isRecord(question)) return null

  const prompt =
    asString(question.prompt) ??
    asString(question.question) ??
    asString(question.title)

  if (!prompt) return null

  const options = Array.isArray(question.options)
    ? question.options.map(normalizeOption)
    : []

  return {
    id: asString(question.id),
    prompt,
    options,
  }
}

export function normalizeQuiz(input: {
  slug: string
  sourcePath: string
  data: Record<string, unknown>
}): SharedQuiz {
  const { slug, sourcePath, data } = input

  const questions = Array.isArray(data.questions)
    ? data.questions
        .map(normalizeQuestion)
        .filter((question): question is SharedQuizQuestion => question !== null)
    : []

  return {
    id: slug,
    slug,
    sourcePath,
    title: asString(data.title) ?? slug,
    description: asString(data.description),
    draft: data.draft === true,
    questions,
    results: data.results,
  }
}
