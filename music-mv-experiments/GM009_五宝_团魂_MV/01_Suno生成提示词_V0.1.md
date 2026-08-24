# GM009 五宝《ALL IN｜同频》Suno 生成提示词 V0.1

## 生成设置

- 模式：Custom
- 标题：`ALL IN｜同频`
- Instrumental：关闭
- 模型：优先使用账号中可用的最新模型
- 目标时长：58–64 秒
- 建议一次生成：4 个版本，优先选择副歌记忆点、男团声线区分和 Rap 咬字最好的版本

## Style of Music（直接粘贴）

```text
A concise 60-second dark cinematic K-pop boy-group anthem at 148 BPM in F minor, with hard-hitting electronic hip-hop production and five distinct youthful male vocal colors. Alternate confident solo lines, fast vocal relays, rhythmic rap handoffs, and tightly synchronized full-group chants. Charismatic, dangerous, stylish and controlled, never cute or cheerful. Punchy trap drums, distorted sub-bass, metallic percussion, tense synth ostinato, sharp orchestral hits, dramatic risers, impact drops, and a huge anthemic chorus. Clean modern idol vocals, precise diction, restrained swagger in the verse, rising tension in the pre-chorus, explosive layered harmonies in the chorus, and agile low-to-mid register rap with short call-and-response ad-libs. Immediate two-second group intro, short verse, rising pre-chorus, first chorus before 25 seconds, rapid five-member rap relay, final chorus, then an abrupt cinematic stop. No second verse, no long instrumental break, no fade-out. Keep the complete song around one minute.
```

## Exclude Styles（Advanced Options）

```text
cute pop, bubblegum pop, cheerful teen pop, happy major-key mood, ballad, acoustic folk, retro disco, jazz, lo-fi, soft easy-listening R&B, female lead vocal, childlike vocal, cartoon vocal, nasal comedy vocal, scream vocals, death-metal growls, slow tempo, long intro, second verse, long instrumental solo, extended outro, fade-out, spoken dialogue, zombie sound effects
```

## 建议参数

- Style Influence：75%–85%
- Weirdness：30%–40%
- 如果成品超过 70 秒：把 Style Influence 提到 85%，保留 `No second verse` 和 `around one minute`，再生成一轮
- 如果五人听起来像同一人：优先保留群唱效果好的版本；五位固定音色在后续人声制作阶段完成，不依赖这一轮一次锁定

## Lyrics（直接粘贴）

```text
[Intro - Full Group Chant, Tight and Low]
One beat, one team
全员同频

[Verse - Two Young Male Vocals, Alternating, Restrained Swagger]
眼神交会，不需要提醒
不同锋芒，拼成同一片光影
谁站前面，身后都有回应
这一秒，只认同一个决定

[Pre-Chorus - Male Vocal Relay, Rising Tension]
抬起头，让心跳锁定
肩并肩，就没有风能把我们分离
倒数三、二、一，全场安静
下一拍，看我们接管风景

[Chorus - Full Group, Layered Anthem, Strong Unison]
We go all in, all in
五道光合成唯一
No one falls, no one leaves
每一步都有彼此的回音
We go all in, all in
越过边界，再升一级
当所有目光向这里靠近
这一局，全员同频

[Rap Break - Five Young Male Rappers, Fast Alternating Handoffs]
Step in, chin up, ready now
不同声线，同一拍点落下
No copy paste, each one got style
五种锋芒，把规则改写
左边接应，右边补位
一眼读懂，不需要口令
Five on the move, never solo
同一颗心，刻进 tempo

[Final Chorus - Full Group, Bigger, Layered Ad-libs]
We go all in, all in
五道光合成唯一
No one falls, no one leaves
这一局，全员同频

[Outro - Full Group Chant, Abrupt Stop]
One beat, one team
All in
```

## 选片标准

1. 开头两秒内进入人声，不要长前奏。
2. 第一遍副歌最好在 20–25 秒内进入。
3. 主歌应有至少两种可感知的男声，Rap 要有明显接力感。
4. 副歌必须像五人齐唱，`All in` 和 `全员同频` 要有记忆点。
5. 整体要帅、冷、利落，有危险感，但不能唱成金属嘶吼或欢乐偶像歌。
6. 结尾应干净急停，方便 MV 用画面冲击或对讲机断讯收尾。

## 后续音色说明

本轮的目标是先敲定旋律、编曲、段落和群像气质。Suno 即使生成了多男声，也不应默认它能稳定对应五名指定角色。正式版可在选定母版后拆分人声段落，再用获得授权的角色音色分别处理，最后重做群唱叠轨与混音。
