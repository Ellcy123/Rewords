import type { Channel, CommentDefinition, NodeId, ResultKind, StoryBeat, VideoNode } from './types'

const comments = (...texts: string[]): CommentDefinition[] => texts.map((text, index) => ({
  id: String(index + 1), author: ['热心路人', '今日围观', '时间线观察员'][index] ?? '网友', text, likes: [8421, 3360, 1908][index] ?? 99, pinned: index === 0,
}))

const beats = (...entries: Array<[number, string, string?]>): StoryBeat[] => entries.map(([at, text, detail]) => ({ at, text, detail }))

function node(id: NodeId, channel: Channel, account: string, title: string, headline: string, summary: string, subtitle: string, duration: number, storyBeats: StoryBeat[], resultKind: ResultKind, visualMotif: string, extra: Partial<VideoNode> = {}): VideoNode {
  return { id, channel, account, title, headline, summary, subtitle, duration, beats: storyBeats, comments: comments('这个结果我是真没想到', '先别划走，线索在后面', '平台到底给我推荐了什么'), selectableItemIds: [], resultKind, visualMotif, ...extra }
}

export const NODES: VideoNode[] = [
  node('W001', 'wedding', '@婚礼事故实录', '婚礼灯架事故', '婚礼开始第 7 秒，新娘死亡', '灯架突然坠落，伴郎够不到四米高的松动卡扣。', '“这么高谁够得到？”', 12,
    beats([0, '婚礼开始第 7 秒，新娘死亡', '“我愿——”被撞击声打断'], [2, '婚礼未完成', '救护灯扫过空舞台'], [5, '事故倒放', '四米高的卡扣正在滑脱'], [9, '差一点够到', '伴郎踮脚仍碰不到灯架']), 'main', 'falling-rig', {
      selectableItemIds: ['ladder', 'technician'],
      media: {
        src: '/media/W001_ltx_raw_v1.mp4',
        poster: '/media/W001_thumbnail_v1.jpg',
        captions: [
          { start: 0, end: 2.2, text: '婚礼开始第 7 秒，新娘死亡', style: 'result' },
          { start: 2.2, end: 5, text: '婚礼未完成', style: 'explanation' },
          { start: 5, end: 8, text: '这么高，谁够得到？', style: 'comment' },
        ],
      },
    }),
  node('W101', 'wedding', '@婚礼事故实录', '有梯子但不会修', '有梯子，新娘还是死了', '伴郎够到了灯架，却把承重卡扣拧错方向。', '够得到，不等于修得了。', 10,
    beats([0, '有梯子，新娘还是死了'], [1, '伴郎终于够到卡扣', '“松了是吧？拧紧就行。”'], [4, '真正的安全扣弹开'], [7, '他解决了身高，没有解决专业']), 'main', 'wrong-bolt', {
      selectableItemIds: ['technician', 'ladder'],
      media: {
        src: '/media/W101_ltx_raw_v1.mp4',
        poster: '/media/W101_thumbnail_v1.jpg',
        captions: [
          { start: 0, end: 2.2, text: '有梯子，新娘还是死了', style: 'result' },
          { start: 2.2, end: 5, text: '他解决了身高，没有解决专业', style: 'explanation' },
          { start: 5, end: 8, text: '够得到，不等于会修', style: 'comment' },
        ],
      },
    }),
  node('W300', 'wedding', '@首席伴娘', '婚礼当天私会维修工？', '新娘婚礼当天私会维修工？', '空调师傅救下新娘，伴娘却把感谢救命的握手剪成暧昧偷拍视频。', '新娘活下来了，婚礼却被一段恶意剪辑叫停。', 14,
    beats([0, '空调师傅踩上梯子修好灯架'], [2, '这一次，新娘活下来了', '婚礼继续'], [5, '新娘握手感谢维修工', '伴娘举起了手机'], [8, '新娘婚礼当天私会维修工？', '前后内容被恶意剪掉'], [11, '“有完整证据吗？”']), 'main', 'rumor-cut', { selectableItemIds: ['recorder', 'technician'] }),
  node('W301', 'wedding', '@婚礼事故实录', '证据就在笔里但没人看见', '证据录到了', '录音笔记录了完整真相，但拇指大的屏幕无法让全场看清。', '证据没有问题，屏幕只有问题。', 10,
    beats([0, '证据录到了', '伴娘承认恶意剪辑'], [2, '新娘把录音笔举给全场'], [5, '后排看不见，现场听不清'], [8, '远处的大屏还亮着']), 'main', 'tiny-proof', { selectableItemIds: ['projector', 'recorder'] }),
  node('W400', 'wedding', '@婚礼事故实录', '证据上大屏婚礼完成', '完整证据已经上大屏', '录像、原声与时间戳同时公开，伴娘的剪辑被拆穿。', '让婚礼顺利结束——已完成', 12,
    beats([0, '完整证据已经上大屏'], [1, '剪辑版与完整原片并排播放'], [5, '“造谣的下线，婚礼继续。”'], [8, '新郎进入观察期'], [10, '让婚礼顺利结束——已完成']), 'completion', 'wedding-complete'),
  node('C001', 'costume', '@冷宫短剧场', '王妃翻墙私逃', '王妃翻墙私逃，被抓现行', '王妃为救冷宫十九号翻墙，国师却否认曾命令她。', '三丈宫墙，一梯到顶。', 11,
    beats([0, '王妃翻墙私逃，被抓现行'], [1, '“分明是你叫我出去！”'], [3, '“娘娘有证据吗？”'], [6, '冷宫十九号撑不过今晚'], [8, '刺客同款多功能梯子', '今晚下单，明早出城']), 'resource', 'palace-wall', { productItemId: 'ladder', selectableItemIds: ['recorder', 'ladder'] }),
  node('C101', 'costume', '@冷宫短剧场', '金銮殿播放录音', '国师抵赖，被录下来了', '录音笔证明国师说谎，但满朝文武看不清小屏。', '皇帝：“把证据投到影壁上。”', 10,
    beats([0, '国师抵赖，被录下来了'], [2, '后排大臣：看不见！'], [5, '“投” + “影壁”'], [7, '婚庆大屏投影服务', '古今宴席均可接单']), 'resource', 'palace-ad', { productItemId: 'projector' }),
  node('K001', 'knowledge', '@较真研究所', '空调开十六度电脑会变快吗', '结论：电脑先冻关机了', '博主一本正经测试制冷能否提高电脑性能，海外数据却打不开。', '你要的是散热，不是把电脑送走。', 10,
    beats([0, '结论：电脑先冻关机了'], [1, '空调 16°C 极限跑分'], [4, '师傅：你要的是散热'], [6, '海外权威跑分：ACCESS DENIED'], [8, '同城空调师傅上门一次']), 'resource', 'frozen-laptop', { productItemId: 'technician', selectableItemIds: ['ladder', 'technician'] }),
  node('K101', 'knowledge', '@较真研究所', '梯子变成 VPN', '梯子连接成功', '知识区把梯子解释为 VPN，页面打开后却先弹出录音笔广告。', '知识区的梯子，当然是 VPN。', 9,
    beats([0, '梯子连接成功'], [1, '翻的是网络墙'], [3, '海外跑分只露出半秒'], [5, '带摄像头的录音笔', '翻了半天，先精准投放我']), 'resource', 'vpn-popup', { productItemId: 'recorder' }),
  node('X001', 'wedding', '@婚礼事故实录', '师傅到了但没有梯子', '师傅到了，还是够不着', '空调师傅有专业能力，却只能站在灯架下徒手判断。', '专业到了，高度没到。', 9,
    beats([0, '师傅到了，还是够不着'], [2, '“卡扣装反了！”'], [5, '他知道答案，但摸不到问题'], [7, '婚礼再次终止']), 'wrong', 'too-short'),
  node('X004', 'wedding', '@婚礼事故实录', '两把梯子还是不会修', '梯子增加到两把，专业仍然是零', '伴郎搭起双梯，却把错误操作做得更快。', '高度翻倍，知识没有。', 9,
    beats([0, '两把梯子，还是不会修'], [2, '伴郎左右开弓'], [5, '两个卡扣同时弹开'], [7, '效率提高了，结果没有']), 'wrong', 'double-ladder'),
  node('X012', 'wedding', '@同城情感维修', '空调师傅改修感情', '师傅开始维修这段感情', '师傅没有找到剪辑证据，反而现场开起婚姻调解。', '制冷正常，感情故障无法保修。', 11,
    beats([0, '师傅开始维修这段感情'], [2, '“先关机，双方冷静。”'], [5, '婚礼变成售后现场'], [8, '新娘转身离开']), 'wrong', 'repair-love'),
  node('X016', 'wedding', '@证据混音室', '证据翻录成了电音', '证据被录成了第二遍', '两支录音笔互相播放，证词最终变成婚礼电音。', '真相没放大，回声放大了。', 10,
    beats([0, '证据被录成了第二遍'], [2, '两支录音笔开始回授'], [5, '“我就把前后——后——后——”'], [8, '宾客跟着节拍点头']), 'wrong', 'audio-loop'),
  node('X021', 'costume', '@宫墙跑酷', '王妃成了宫墙跑酷教练', '第二把梯子送到了宫墙', '王妃没有得到证据，却把翻墙发展成了宫廷运动。', '私逃失败，招生成功。', 11,
    beats([0, '第二把梯子送到了宫墙'], [2, '王妃开始示范跨墙'], [5, '侍卫排队报名'], [8, '皇家跑酷班今日开课']), 'wrong', 'palace-parkour'),
  node('X028', 'knowledge', '@较真研究所', '两位师傅把电脑冻成冰箱', '实验来了第二位师傅', '两位师傅同时把空调开到十六度，电脑彻底冻成展示柜。', '样本量翻倍，错误也翻倍。', 10,
    beats([0, '实验来了第二位师傅'], [2, '双空调对吹'], [5, '电脑表面开始结冰'], [8, '本期结论：可以冷藏，不能跑分']), 'wrong', 'double-freeze'),
]

export const NODE_BY_ID = Object.fromEntries(NODES.map(video => [video.id, video])) as Record<NodeId, VideoNode>
