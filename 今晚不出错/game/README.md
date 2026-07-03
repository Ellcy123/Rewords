# 今晚不出错 Web 原型

这是根据 `00-03` 设计文档实现的静态 Web MVP。当前目标是先跑通完整一局：

- 提词器逐词块推进
- 点击错词后弹出三选一纠错
- 误点、改错、漏改都会影响收视率
- 弹幕层、主播状态、红温表现
- 台规叠加：赞助口播、禁字、替换、赞助改名
- 手牌：赞助卡、突发插播卡
- 资源：喝水暂停、咳嗽跳句
- 结算：事故集锦、评分、称号、复制战绩

## 运行

在本目录执行：

```powershell
node server.cjs
```

然后打开：

```text
http://127.0.0.1:9531/
```

也可以指定端口：

```powershell
node server.cjs 9532
```

## 文件结构

```text
game/
├─ index.html
├─ styles.css
├─ app.js
├─ server.cjs
├─ assets/
│  ├─ studio-bg.svg
│  └─ anchor-*.svg
└─ data/
   ├─ script.json
   ├─ rules.json
   ├─ cards.json
   ├─ danmaku.json
   └─ titles.json
```

直接双击 `index.html` 时，浏览器可能会阻止 `fetch()` 读取 JSON；使用本地服务器打开即可。
