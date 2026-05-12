type GroundTerrainRuntimePublisherDeps = {
  editorApiBase: string
  getActiveSceneLevelId: () => string
  saveSceneDocumentToDisk: (levelId: string) => Promise<unknown>
  getPending: () => boolean
  setPending: (pending: boolean) => void
  setSaveMessage: (message: string) => void
}

type PublishContractsResponse = {
  success?: boolean
  message?: string
}

async function readPublishContractsResponse(
  response: Response,
): Promise<PublishContractsResponse> {
  return (await response.json()) as PublishContractsResponse
}

export function createGroundTerrainRuntimePublisher(
  deps: GroundTerrainRuntimePublisherDeps,
) {
  async function publishGroundTerrainContracts() {
    if (deps.getPending()) return

    deps.setPending(true)
    deps.setSaveMessage('Publishing ground and terrain runtime contracts...')

    try {
      const levelId = deps.getActiveSceneLevelId()
      await deps.saveSceneDocumentToDisk(levelId)
      const response = await fetch(
        `${deps.editorApiBase}/api/editor-terrain/publish-contracts`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ levelId }),
        },
      )
      const payload = await readPublishContractsResponse(response)
      if (!payload?.success) {
        throw new Error(payload?.message ?? 'Ground/terrain publish failed')
      }

      deps.setSaveMessage('Published runtime ground and terrain contracts')
    } catch (error) {
      console.error('Ground/terrain contract publish failed:', error)
      deps.setSaveMessage(
        error instanceof Error
          ? error.message
          : 'Ground/terrain contract publish failed',
      )
    } finally {
      deps.setPending(false)
    }
  }

  return {
    publishGroundTerrainContracts,
  }
}
