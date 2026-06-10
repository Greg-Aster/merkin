export type DraftableData = {
  draft?: boolean
}

export type PublishedData = {
  published: Date | string
}

export type ContentEntryWithData<TData> = {
  data: TData
}

export function isPublicContentData(data: DraftableData) {
  return data.draft !== true
}

export function publicCollectionFilter<TData extends DraftableData>({
  data,
}: ContentEntryWithData<TData>) {
  return isPublicContentData(data)
}

export function comparePublishedDesc<
  TEntry extends ContentEntryWithData<PublishedData>,
>(left: TEntry, right: TEntry) {
  return (
    new Date(right.data.published).getTime() -
    new Date(left.data.published).getTime()
  )
}
