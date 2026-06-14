export type DraftableManifestRecord = {
  isDraft?: boolean
}

export function isPublishedManifestRecord(record: DraftableManifestRecord) {
  return record.isDraft !== true
}
