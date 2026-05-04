export interface HunyuanJobResult {
  assetUrl?: string
  referenceImageUrl?: string
  message?: string
}

export interface HunyuanJobStatus {
  id?: string
  status?: string
  queuePosition?: number
  sourceName?: string
  mode?: string
  assetUrl?: string
  prompt?: string
  error?: string
  result?: HunyuanJobResult | null
}

export interface HunyuanJobPollOptions {
  jobId: string
  pollIntervalMs?: number
  getJobStatus: (jobId: string) => Promise<HunyuanJobStatus>
  onPolled?: (job: HunyuanJobStatus) => void
  onQueued?: (job: HunyuanJobStatus) => void
  onRunning?: (job: HunyuanJobStatus) => void
  onFailed?: (job: HunyuanJobStatus) => void
  onSucceeded?: (job: HunyuanJobStatus) => void
}

function wait(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export function getQueuedHunyuanStatusMessage(job: HunyuanJobStatus) {
  const queuePosition = Number(job.queuePosition ?? 0)
  return queuePosition > 1
    ? `Queued for AI generation. Position ${queuePosition} in line.`
    : 'Queued for AI generation. Starting shortly...'
}

export function getRunningHunyuanStatusMessage() {
  return 'Generating asset with ComfyUI + Hunyuan... this can take a while.'
}

export function getHunyuanBackendStatusFromResult(result: any) {
  return {
    serviceReady: !!result?.status?.available,
    canGenerate: !!result?.status?.supportsReplacementGeneration,
    canRetexture: !!result?.status?.supportsTextureWrap,
    message:
      typeof result?.status?.message === 'string' ? result.status.message : '',
  }
}

export async function waitForHunyuanJob({
  jobId,
  pollIntervalMs = 2000,
  getJobStatus,
  onPolled,
  onQueued,
  onRunning,
  onFailed,
  onSucceeded,
}: HunyuanJobPollOptions): Promise<HunyuanJobResult & { assetUrl: string }> {
  while (true) {
    await wait(pollIntervalMs)
    const job = await getJobStatus(jobId)
    onPolled?.(job)

    if (job.status === 'queued') {
      onQueued?.(job)
      continue
    }

    if (job.status === 'running') {
      onRunning?.(job)
      continue
    }

    if (job.status === 'failed') {
      onFailed?.(job)
      const result = job.result
      throw new Error(job.error || result?.message || 'Hunyuan job failed.')
    }

    if (job.status === 'cancelled') {
      throw new Error(job.error || 'Hunyuan job cancelled.')
    }

    if (job.status === 'succeeded') {
      onSucceeded?.(job)
      const result = job.result
      if (!result?.assetUrl) {
        throw new Error(
          result?.message ?? 'Hunyuan job completed without an asset URL.',
        )
      }
      return { ...result, assetUrl: result.assetUrl }
    }
  }
}
