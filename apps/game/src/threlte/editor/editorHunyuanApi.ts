import { EDITOR_API_BASE } from '@config/editorApi'

export interface HunyuanStatusRequest {
  apiUrl: string
  comfyUiApiUrl: string
  ensure?: boolean
  lowVram?: boolean
}

export interface ComfyUiStatusRequest {
  apiUrl: string
  ensure?: boolean
  lowVram?: boolean
}

export type EditorJsonReader = (
  response: Response,
  context: string,
) => Promise<any>

export async function fetchHunyuanServiceStatus({
  apiUrl,
  comfyUiApiUrl,
  ensure = false,
  lowVram = false,
}: HunyuanStatusRequest) {
  const response = await fetch(
    `${EDITOR_API_BASE}/api/hunyuan3d/status?apiUrl=${encodeURIComponent(apiUrl)}&comfyUiApiUrl=${encodeURIComponent(comfyUiApiUrl)}${ensure ? '&ensure=1' : ''}${lowVram ? '&lowVram=1' : ''}`,
  )
  return response.json()
}

export async function fetchComfyUiServiceStatus({
  apiUrl,
  ensure = false,
  lowVram = false,
}: ComfyUiStatusRequest) {
  const response = await fetch(
    `${EDITOR_API_BASE}/api/comfyui/status?apiUrl=${encodeURIComponent(apiUrl)}${ensure ? '&ensure=1' : ''}${lowVram ? '&lowVram=1' : ''}`,
  )
  return response.json()
}

export async function fetchHunyuanRecentJobs(limit = 10) {
  const response = await fetch(
    `${EDITOR_API_BASE}/api/hunyuan3d/jobs?limit=${encodeURIComponent(String(limit))}`,
  )
  return response.json()
}

export async function queueHunyuanJobRequest(
  requestBody: Record<string, unknown>,
  readJsonPayload: EditorJsonReader,
) {
  const response = await fetch(`${EDITOR_API_BASE}/api/hunyuan3d/jobs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody),
  })
  return readJsonPayload(response, 'Hunyuan job queue')
}

export async function fetchHunyuanJobStatus(
  jobId: string,
  readJsonPayload: EditorJsonReader,
) {
  const response = await fetch(
    `${EDITOR_API_BASE}/api/hunyuan3d/jobs?jobId=${encodeURIComponent(jobId)}`,
  )
  return readJsonPayload(response, 'Hunyuan job status')
}

export async function cancelHunyuanJobs(
  readJsonPayload: EditorJsonReader,
  context: string,
) {
  const response = await fetch(`${EDITOR_API_BASE}/api/hunyuan3d/jobs/cancel`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ all: true }),
  })
  return readJsonPayload(response, context)
}
