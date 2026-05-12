export type EditorCreatePrefabCatalogItem = {
  label: string
  type: string
  position: [number, number, number]
}

export type EditorCreatePrefabCatalogGroup = {
  label: string
  items: EditorCreatePrefabCatalogItem[]
}

export const createPrefabGroups: EditorCreatePrefabCatalogGroup[] = [
  {
    label: 'Sci-Fi / Tech',
    items: [
      {
        label: 'Anomaly Cluster',
        type: 'anomaly-cluster',
        position: [0, 2, 0],
      },
      {
        label: 'Command Console',
        type: 'command-console',
        position: [0, 0, 0],
      },
      {
        label: 'Command Fin',
        type: 'command-fin',
        position: [0, 0, 0],
      },
      {
        label: 'Support Column',
        type: 'support-column',
        position: [0, 0, 0],
      },
      {
        label: 'Hanging Light',
        type: 'hanging-light',
        position: [0, 0, 0],
      },
    ],
  },
  {
    label: 'Architecture / World',
    items: [
      {
        label: 'Interior Archway',
        type: 'interior-archway',
        position: [0, 0, 0],
      },
      {
        label: 'Courtyard Pylon',
        type: 'courtyard-pylon',
        position: [0, 0, 0],
      },
      {
        label: 'Wasteland Archway',
        type: 'wasteland-archway',
        position: [0, 0, 0],
      },
      {
        label: 'Portal Apparatus',
        type: 'portal-apparatus',
        position: [0, 0, 0],
      },
    ],
  },
  {
    label: 'Ruins / Nature / Story',
    items: [
      {
        label: 'Story Marker',
        type: 'story-marker',
        position: [0, 0, 0],
      },
      {
        label: 'Courtyard Fountain',
        type: 'courtyard-fountain',
        position: [0, 0, 0],
      },
      {
        label: 'Observation Rig',
        type: 'observation-rig',
        position: [0, 0, 0],
      },
      {
        label: 'Bench Growth',
        type: 'bench-growth',
        position: [0, 0, 0],
      },
      {
        label: 'Growth Planter',
        type: 'growth-planter',
        position: [0, 0, 0],
      },
      {
        label: 'Monolith',
        type: 'wasteland-monolith',
        position: [0, 0, 0],
      },
      {
        label: 'Broken Ring',
        type: 'broken-ring',
        position: [0, 0, 0],
      },
    ],
  },
]
