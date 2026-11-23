export type ArchiveAccessData = {
  draft?: boolean
}

export function isPublicArchiveRecord(record: ArchiveAccessData) {
  return record.draft !== true
}
