export type NodeId =
  | 'W001' | 'W101' | 'W300' | 'W301' | 'W400'
  | 'C001' | 'C101' | 'K001' | 'K101'
  | 'X001' | 'X004' | 'X012' | 'X016' | 'X021' | 'X028'

export type ItemId = 'ladder' | 'technician' | 'recorder' | 'projector'
export type Channel = 'wedding' | 'costume' | 'knowledge'
export type ResultKind = 'main' | 'resource' | 'wrong' | 'completion'

export interface StoryBeat {
  at: number
  text: string
  detail?: string
  accent?: string
}

export interface CommentDefinition {
  id: string
  author: string
  text: string
  likes: number
  pinned?: boolean
}

export interface ItemDefinition {
  id: ItemId
  name: string
  shortName: string
  price: number
  sourceNodeId: NodeId
  description: string
  icon: string
  repeatable: true
}

export interface VideoNode {
  id: NodeId
  channel: Channel
  account: string
  title: string
  headline: string
  summary: string
  subtitle: string
  duration: number
  beats: StoryBeat[]
  comments: CommentDefinition[]
  productItemId?: ItemId
  selectableItemIds: ItemId[]
  resultKind: ResultKind
  visualMotif: string
  onCompleteUnlock?: NodeId
}

export interface TriggerDefinition {
  targetNodeId: NodeId
  itemId: ItemId
  resultNodeId: NodeId
  kind: ResultKind
  discoverItemId?: ItemId
}

export interface ContentCatalog {
  items: ItemDefinition[]
  nodes: VideoNode[]
  triggers: TriggerDefinition[]
}
