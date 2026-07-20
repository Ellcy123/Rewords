import { describe, expect, it } from 'vitest'
import type { ItemId, NodeId, TriggerDefinition, VideoNode } from '../content/types'
import { validateContent } from '../content/validate'
import { ITEM_BY_ID, ITEMS } from '../content/items'
import { NODES, NODE_BY_ID } from '../content/nodes'
import { findTrigger, TRIGGERS } from '../content/triggers'

function fakeNode(id: string): VideoNode {
  return {
    id: id as NodeId,
    channel: 'wedding',
    account: '@测试账号',
    title: '测试节点',
    headline: '测试结果',
    summary: '测试摘要',
    subtitle: '测试字幕',
    duration: 10,
    beats: [{ at: 0, text: '测试结果' }],
    comments: [],
    selectableItemIds: [],
    resultKind: 'main',
    visualMotif: 'test',
    mediaMode: 'video',
    media: {
      src: `/media/${id}_ltx_raw_v1.mp4`,
      poster: `/media/${id}_thumbnail_v1.jpg`,
      captions: [
        { start: 0, end: 2, text: '测试结果', style: 'result' },
        { start: 2, end: 5, text: '测试解释', style: 'explanation' },
        { start: 5, end: 8, text: '测试评论', style: 'comment' },
      ],
    },
  }
}

function fakeTrigger(targetNodeId: string, itemId: string, resultNodeId: string): TriggerDefinition {
  return {
    targetNodeId: targetNodeId as NodeId,
    itemId: itemId as ItemId,
    resultNodeId: resultNodeId as NodeId,
    kind: 'main',
  }
}

describe('validateContent', () => {
  it('binds the relationship recorder to E201 and the bride mainline', () => {
    expect(ITEM_BY_ID.recorder.sourceNodeIds).toEqual(['E201'])
    expect(ITEM_BY_ID.recorder.mainlineUseNodeIds).toContain('W300')
    expect(ITEM_BY_ID.recorder.requiredForMainline).toBe(true)
    expect(ITEM_BY_ID.recorder.price).toBe(30)
    expect(ITEM_BY_ID.recorder.repeatable).toBe(true)
    expect(NODE_BY_ID.E201.productItemId).toBe('recorder')
    expect(NODE_BY_ID.K101.productItemId).toBeUndefined()
  })

  it('rejects a relationship product without a wedding mainline use', () => {
    const relationshipNode = {
      ...fakeNode('E201'),
      channel: 'entertainment' as const,
      resultKind: 'relationship' as const,
      mediaMode: 'storyboard' as const,
      media: undefined,
      productItemId: 'recorder' as const,
    }
    const invalidRecorder = {
      ...ITEM_BY_ID.recorder,
      sourceNodeIds: ['E201'] as NodeId[],
      mainlineUseNodeIds: [] as NodeId[],
      requiredForMainline: true,
    }
    expect(validateContent({ items: [invalidRecorder], nodes: [relationshipNode], triggers: [] }))
      .toContain('Relationship product recorder has no wedding mainline use')
  })

  it('rejects duplicate node ids and dangling trigger references', () => {
    const trigger = fakeTrigger('missing', 'ladder', 'also-missing')
    trigger.additionalUnlockNodeIds = ['missing-extra' as NodeId]
    const errors = validateContent({
      items: [],
      nodes: [fakeNode('W001'), fakeNode('W001')],
      triggers: [trigger],
    })
    expect(errors).toContain('duplicate node id: W001')
    expect(errors).toContain('unknown target node: missing')
    expect(errors).toContain('unknown result node: also-missing')
    expect(errors).toContain('unknown additional unlock node: missing-extra')
  })

  it('accepts the complete prototype catalog', () => {
    expect(NODES).toHaveLength(19)
    expect(ITEMS.map(item => item.id)).toEqual(['ladder', 'technician', 'recorder', 'projector'])
    expect(validateContent({ items: ITEMS, nodes: NODES, triggers: TRIGGERS })).toEqual([])
  })

  it('routes the repair directly into a combined W300 story without W200', () => {
    expect(NODE_BY_ID).not.toHaveProperty('W200')
    expect(findTrigger('W101', 'technician')?.resultNodeId).toBe('W300')
    const story = NODE_BY_ID.W300.beats.map(beat => `${beat.text} ${beat.detail ?? ''}`).join(' ')
    expect(story).toContain('新娘活下来了')
    expect(story).toContain('私会维修工')
  })

  it('configures browser media for every demo node', () => {
    expect(NODES).toHaveLength(19)
    const videoNodes = NODES.filter(node => node.mediaMode === 'video')
    const storyboardNodes = NODES.filter(node => node.mediaMode === 'storyboard')
    expect(videoNodes).toHaveLength(14)
    expect(storyboardNodes.map(node => node.id)).toEqual(['K101', 'E001', 'E101', 'E102', 'E201'])
    for (const node of videoNodes) {
      expect(node.media?.src).toBe(`/media/${node.id}_ltx_raw_v1.mp4`)
      expect(node.media?.poster).toBe(`/media/${node.id}_thumbnail_v1.jpg`)
      expect(node.media?.captions).toHaveLength(3)
      expect(node.media?.captions[0].start).toBe(0)
      expect(node.media?.captions.at(-1)?.end).toBe(8)
    }
    for (const node of storyboardNodes) expect(node.media).toBeUndefined()
  })

  it('rejects nodes without media', () => {
    const missingMedia = fakeNode('W001')
    delete missingMedia.media
    expect(validateContent({ items: [], nodes: [missingMedia], triggers: [] }))
      .toContain('missing media: W001')
  })

  it('rejects invalid and overlapping media captions', () => {
    const invalid = fakeNode('W001')
    invalid.media = {
      src: '',
      poster: '/media/poster.jpg',
      captions: [
        { start: 2, end: 1, text: '', style: 'result' },
        { start: 0.5, end: 11, text: 'overlap', style: 'comment' },
      ],
    }
    expect(validateContent({ items: [], nodes: [invalid], triggers: [] })).toEqual(expect.arrayContaining([
      'invalid media src: W001',
      'invalid caption range: W001:0',
      'empty caption text: W001:0',
      'caption exceeds duration: W001:1',
      'overlapping captions: W001:0:1',
    ]))
  })
})
