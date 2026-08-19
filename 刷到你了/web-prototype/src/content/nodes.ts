import type { Channel, CommentDefinition, NodeId, ResultKind, StoryBeat, VideoNode } from './types'
import { MEDIA_BY_NODE_ID } from './media'

const comments = (...texts: string[]): CommentDefinition[] => texts.map((text, index) => ({
  id: String(index + 1), author: ['热心路人', '今日围观', '时间线观察员'][index] ?? '网友', text, likes: [8421, 3360, 1908][index] ?? 99, pinned: index === 0,
}))

const beats = (...entries: Array<[number, string, string?]>): StoryBeat[] => entries.map(([at, text, detail]) => ({ at, text, detail }))

function node(id: NodeId, channel: Channel, account: string, title: string, headline: string, summary: string, subtitle: string, duration: number, storyBeats: StoryBeat[], resultKind: ResultKind, visualMotif: string, extra: Partial<VideoNode> = {}): VideoNode {
  const media = MEDIA_BY_NODE_ID[id]
  return { id, channel, account, title, headline, summary, subtitle, duration, beats: storyBeats, comments: comments('这个结果我是真没想到', '先别划走，线索在后面', '平台到底给我推荐了什么'), selectableItemIds: [], resultKind, visualMotif, mediaMode: media ? 'video' : 'storyboard', media, ...extra }
}

export const NODES: VideoNode[] = [
  node('W001', 'wedding', '@婚礼事故实录', '婚礼灯架事故', '婚礼开始第 7 秒，新娘死亡', '灯架突然坠落，伴郎够不到四米高的松动卡扣。', '“这么高谁够得到？”', 12,
    beats([0, '婚礼开始第 7 秒，新娘死亡', '“我愿——”被撞击声打断'], [2, '婚礼未完成', '救护灯扫过空舞台'], [5, '事故倒放', '四米高的卡扣正在滑脱'], [9, '差一点够到', '伴郎踮脚仍碰不到灯架']), 'main', 'falling-rig', {
      selectableItemIds: ['ladder', 'technician'],
    }),
  node('W101', 'wedding', '@婚礼事故实录', '有梯子但不会修', '有梯子，新娘还是死了', '伴郎够到了灯架，却把承重卡扣拧错方向。', '够得到，不等于修得了。', 10,
    beats([0, '有梯子，新娘还是死了'], [1, '伴郎终于够到卡扣', '“松了是吧？拧紧就行。”'], [4, '真正的安全扣弹开'], [7, '他解决了身高，没有解决专业']), 'main', 'wrong-bolt', {
      selectableItemIds: ['technician', 'ladder'],
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
  node('K101', 'knowledge', '@较真研究所', '梯子变成 VPN', '梯子连接成功', '知识区把梯子解释为 VPN，页面打开了，十秒结论却仍然缺少完整上下文。', '翻过去了，不等于看完整了。', 9,
    beats([0, '梯子连接成功'], [1, '翻的是网络墙'], [3, '海外跑分只露出十秒结论'], [5, '查看原始记录', '完整记录没有保存'], [7, '翻过去了，不等于看完整了']), 'resource', 'vpn-popup'),
  node('E001', 'entertainment', '@炎鑫今天也在赢', 'PK 最后 30 秒', '还差一点，炎鑫被压在第二名', '你刚刷进来，PK 已经进入最后三十秒。上票会帮他守住这一局，不上票也会被他记住。', '上票，还是先看看？', 10,
    beats([0, 'PK 最后 30 秒'], [2, '炎鑫被压在第二名', '票数差距正在缩小'], [5, '他看了一眼镜头', '“别勉强，留着也行。”'], [8, '现在由你决定']), 'relationship', 'pk-final'),
  node('E101', 'entertainment', '@炎鑫今天也在赢', '你帮炎鑫守住了这一局', '他在全场感谢里单独叫了你的名字', 'PK 结束后，炎鑫先谢了全场，又把你的名字单独念了一遍；热闹之外，他似乎还有话想私下说。', '“刚才那一下，我记住了。”', 9,
    beats([0, 'PK 结束：守住了'], [2, '炎鑫感谢全场'], [5, '他单独叫了你的名字'], [7, '一条私信邀请已经出现']), 'relationship', 'pk-supported'),
  node('E102', 'entertainment', '@炎鑫今天也在赢', '你没有上票', '输掉 PK 后，他没有追问你为什么', '炎鑫输了这一局，却没有用失望逼你补偿。他下播前发来一句：没关系，你在就行。', '“别有压力，我不是来查账的。”', 9,
    beats([0, 'PK 结束：差一点'], [2, '炎鑫收起惩罚道具'], [5, '他没有追问你的选择'], [7, '一条私信邀请已经出现']), 'relationship', 'pk-held-back'),
  node('E103', 'entertainment', '@热点切片', '炎鑫下播前最后十秒', '一句话被单独截了出来', '网上流传的片段只保留炎鑫下播前最后十秒，前面的解释与完整语境都没有出现。', '只有最后一句，没有前后文。', 10,
    beats([0, '炎鑫下播前最后十秒', '画面从一句话中间突然开始'], [2, '“谁都别替我出头。”'], [5, '冷脸赶粉？', '传播文案替他下了结论'], [8, '片段到这里结束', '前后文都没有出现']), 'relationship', 'circulating-cut'),
  node('E201', 'entertainment', '@炎鑫仅你可见', '炎鑫发来了未剪原片', '“你说的证据，我弄到了。”', '他按你们私聊里说好的办法找回了完整上下文，还把能用于新娘事件的录音笔入口一并发给你。', '这不是随机礼物，是他完成约定后的回报。', 10,
    beats([0, '一条仅你可见的视频'], [2, '未剪原片与时间戳都在'], [5, '炎鑫：答应你的，办到了'], [8, '录音笔入口已出现']), 'relationship', 'private-uncut', {
      productItemId: 'recorder',
      onCompleteDiscoverItemId: 'recorder',
    }),
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
