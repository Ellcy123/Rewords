import type { CharacterTaskStage } from '../relationship/taskEngine'

export interface FallbackReply {
  text: string
}

export function getYanxinFallbackReply(stage: CharacterTaskStage): FallbackReply {
  if (stage === 'invited') {
    return {
      text: '我不是非要你替我出头。就是那段被剪得太干净了，你愿意听我把前后说完，我就挺安心。',
    }
  }
  if (stage === 'understood') {
    return {
      text: '我去把设备和原始文件都过一遍。真能找到完整时间戳，我先发你，不拿一句空话糊弄你。',
    }
  }
  return {
    text: '嗯，我还在看。你先忙你的，弄清楚了我会主动跟你说。',
  }
}
