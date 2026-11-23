export type QuizOption = {
  text: string
  trait?: string
  next: string
}

export type QuizNode = {
  text: string
  options: QuizOption[]
}

export type QuizOutcome = {
  title: string
  description: string
  emoji?: string
}

export type QuizSfxId = 'error' | 'success' | 'sweep' | 'warning'

export type QuizLabels = {
  questionPrefix: string
  progressPrefix: string
  selectAnswer: string
  continueLabel: string
  thinking: string
  traitSummary: string
  restart: string
  missingQuestion: string
}
