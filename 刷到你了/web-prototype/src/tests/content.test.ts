import { describe, expect, it } from 'vitest'
import type { ItemId, NodeId, TriggerDefinition, VideoNode } from '../content/types'
import { validateContent } from '../content/validate'
import { ITEMS } from '../content/items'
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
  it('rejects duplicate node ids and dangling trigger references', () => {
    const errors = validateContent({
      items: [],
      nodes: [fakeNode('W001'), fakeNode('W001')],
      triggers: [fakeTrigger('missing', 'ladder', 'also-missing')],
    })
    expect(errors).toContain('duplicate node id: W001')
    expect(errors).toContain('unknown target node: missing')
    expect(errors).toContain('unknown result node: also-missing')
  })

  it('accepts the complete prototype catalog', () => {
    expect(NODES).toHaveLength(15)
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

  it('configures W001 and W101 with raw videos and synchronized captions', () => {
    expect(NODE_BY_ID.W001.media?.src).toBe('/media/W001_ltx_raw_v1.mp4')
    expect(NODE_BY_ID.W001.media?.captions).toEqual([
      { start: 0, end: 2.2, text: '婚礼开始第 7 秒，新娘死亡', style: 'result' },
      { start: 2.2, end: 5, text: '婚礼未完成', style: 'explanation' },
      { start: 5, end: 8, text: '这么高，谁够得到？', style: 'comment' },
    ])
    expect(NODE_BY_ID.W101.media?.src).toBe('/media/W101_ltx_raw_v1.mp4')
    expect(NODE_BY_ID.W101.media?.captions.at(-1)?.end).toBe(8)
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
