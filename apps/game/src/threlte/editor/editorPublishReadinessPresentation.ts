import type {
  EditorPublishReadinessItem,
  EditorPublishReadinessPanel,
  EditorPublishReadinessViewModel,
  EditorPublishWorkflowStep,
} from './editorPublishReadinessContracts'

export type EditorPublishReadinessPipelineState =
  | 'pending'
  | 'success'
  | 'warning'
  | 'failure'
  | 'next'

export type EditorPublishReadinessGateFailure = {
  panel: EditorPublishReadinessPanel
  item: EditorPublishReadinessItem
}

export type EditorPublishReadinessPipelineStep = EditorPublishWorkflowStep & {
  state: EditorPublishReadinessPipelineState
  statusLabel: string
  nextAction: string
}

export function getPublishReadinessRequiredActions(
  viewModel: EditorPublishReadinessViewModel,
): EditorPublishWorkflowStep[] {
  return viewModel.workflow.filter(step => step.required)
}

export function getPublishReadinessAdvisoryActions(
  viewModel: EditorPublishReadinessViewModel,
): EditorPublishWorkflowStep[] {
  return viewModel.workflow.filter(step => !step.required)
}

export function getPublishReadinessGateFailures(
  viewModel: EditorPublishReadinessViewModel,
): EditorPublishReadinessGateFailure[] {
  return viewModel.panels.flatMap(panel =>
    panel.items
      .filter(item => item.severity !== 'ready')
      .map(item => ({ panel, item })),
  )
}

export function getPublishReadinessBudgetIssues(
  viewModel: EditorPublishReadinessViewModel,
) {
  return viewModel.metrics.filter(metric => metric.overBudget)
}

export function getPublishReadinessPipelineSteps(
  viewModel: EditorPublishReadinessViewModel,
  options: {
    loading: boolean
    error: string
    pipelinePending: boolean
  },
): EditorPublishReadinessPipelineStep[] {
  if (options.loading) {
    return [
      {
        id: 'load-contracts',
        label: 'Load publish contracts',
        command: 'Editor: Refresh Publish Readiness',
        expectedOutput: 'Cooked manifest and scene contract status.',
        reason: 'Publish readiness is still loading.',
        required: true,
        state: 'pending',
        statusLabel: 'pending',
        nextAction: 'Wait for the manifest and validation read to finish.',
      },
    ]
  }

  if (options.error) {
    return [
      {
        id: 'load-contracts',
        label: 'Load publish contracts',
        command: 'Editor: Refresh Publish Readiness',
        expectedOutput: 'Cooked manifest and scene contract status.',
        reason: options.error,
        required: true,
        state: 'failure',
        statusLabel: 'failure',
        nextAction: 'Refresh readiness after fixing the manifest load error.',
      },
    ]
  }

  const requiredSteps = viewModel.workflow.filter(step => step.required)
  const firstRequiredId = requiredSteps[0]?.id ?? ''

  return viewModel.workflow.map(step => {
    if (options.pipelinePending && step.required) {
      return {
        ...step,
        state: 'pending',
        statusLabel: 'pending',
        nextAction: 'Wait for the active bake, cook, or publish command.',
      }
    }

    if (step.required) {
      const isNext = step.id === firstRequiredId
      return {
        ...step,
        state: isNext ? 'next' : 'pending',
        statusLabel: isNext ? 'next' : 'queued',
        nextAction: isNext ? step.command : 'Run after earlier required steps.',
      }
    }

    return {
      ...step,
      state: 'success',
      statusLabel: 'ok',
      nextAction: step.reason,
    }
  })
}

export function getPublishReadinessPublishBlockReason(
  viewModel: EditorPublishReadinessViewModel,
  options: {
    loading: boolean
    error: string
    pipelinePending: boolean
  },
) {
  if (options.loading) return 'Readiness check is still loading.'
  if (options.error) return options.error
  if (options.pipelinePending)
    return 'A bake, cook, or publish operation is still running.'
  if (viewModel.blockers.length > 0) {
    return `${viewModel.blockers.length} blocker(s) must be resolved before runtime publish.`
  }
  return ''
}
