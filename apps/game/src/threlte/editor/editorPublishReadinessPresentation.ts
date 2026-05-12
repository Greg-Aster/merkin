import type {
  EditorPublishReadinessItem,
  EditorPublishReadinessPanel,
  EditorPublishReadinessViewModel,
  EditorPublishWorkflowStep,
} from './editorPublishReadinessContracts'

export type EditorPublishReadinessGateFailure = {
  panel: EditorPublishReadinessPanel
  item: EditorPublishReadinessItem
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
