import type { CaptionCue, NodeId, VideoMedia } from './types'

function cues(result: string, explanation: string, comment: string): CaptionCue[] {
  return [
    { start: 0, end: 2.2, text: result, style: 'result' },
    { start: 2.2, end: 5, text: explanation, style: 'explanation' },
    { start: 5, end: 8, text: comment, style: 'comment' },
  ]
}

function media(id: NodeId, captions: CaptionCue[]): VideoMedia {
  return {
    src: `/media/${id}_ltx_raw_v1.mp4`,
    poster: `/media/${id}_thumbnail_v1.jpg`,
    captions,
  }
}

export const MEDIA_BY_NODE_ID: Partial<Record<NodeId, VideoMedia>> = {
  W001: media('W001', cues('婚礼开始第 7 秒，新娘死亡', '婚礼未完成', '这么高，谁够得到？')),
  W101: media('W101', cues('有梯子，新娘还是死了', '他解决了身高，没有解决专业', '够得到，不等于会修')),
  W300: media('W300', cues('新娘活下来了，婚礼却死了', '救命的握手，被剪成了私会', '前后内容呢？有证据吗？')),
  W301: media('W301', cues('证据录到了', '后排看不见，现场听不清', '证据没问题，屏幕有问题')),
  W400: media('W400', cues('完整证据已经上大屏', '剪辑版与完整原片同时播放', '造谣的下线，婚礼继续')),
  C001: media('C001', cues('王妃翻墙私逃，被抓现行', '国师：娘娘有证据吗？', '三丈宫墙，一梯到顶')),
  C101: media('C101', cues('国师抵赖，被录下来了', '证据太小，满朝文武看不清', '把证据投到影壁上')),
  K001: media('K001', cues('结论：电脑先冻关机了', '你要的是散热，不是把电脑送走', '关键数据在墙外')),
  K101: media('K101', cues('梯子连接成功', '知识区的梯子，当然是 VPN', '翻了半天，先精准投放我')),
  X001: media('X001', cues('师傅到了，还是够不着', '专业到了，高度没到', '现场不具备登高条件')),
  X004: media('X004', cues('两把梯子，还是不会修', '高度翻倍，知识没有', '脑子问题：仍未解决')),
  X012: media('X012', cues('师傅开始维修这段感情', '深度服务，指的是吊顶深度', '感情温度 16 度，建议检修')),
  X016: media('X016', cues('证据被录成了第二遍', '真相没放大，回声放大了', '热门单曲：《我剪剪剪的》')),
  X021: media('X021', cues('冷宫王妃，转行跑酷教练', '不逃，计时', '三丈宫墙，七天结业')),
  X028: media('X028', cues('电脑没变快，变成冰箱了', '两位师傅，双空调对吹', '本期结论：能冷藏，不能跑分')),
}
