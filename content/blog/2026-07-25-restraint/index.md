---
title: "提炼梁文锋的四小时谈话，将「克制」变成五个辅助决策的问题，附 Skill"
description: "从梁文锋近四小时交流中的一连串“不做”提炼出五个决策问题，用一条主线判断新机会是否真正值得投入。"
pubDate: 2026-07-25
sourceId: "2026-07-25-restraint"
slug: liang-wenfeng-restraint-skill
category: personal-thinking
tags: ["梁文锋","决策","克制"]
cover: "/uploads/blog/2026-07-25-restraint/HODuq3wWMAALk0Z.jpg"
coverAlt: "黑绿色终端界面中梁文锋站在演讲台前，复杂分支网络被修剪为一条发光主线，右上角写着 ONE MAINLINE"
titleEn: "Five Decision Questions from Liang Wenfeng’s Four-Hour Conversation on Restraint"
descriptionEn: "Distill a long conversation and its repeated refusals into five practical questions for judging whether a new opportunity strengthens the one main line that matters."
coverAltEn: "Liang Wenfeng speaks inside a dark green terminal interface where a dense branching network is pruned into one glowing main line"
contentStatus: full
featured: false
draft: false
externalLinks:
  - label: "x"
    url: "https://x.com/Formulasearch/status/2080926196678750398"
---
梁文锋那场近四小时的投资人交流，流传整理稿里他回答了一百多个问题，判断标准只有一个：

**这件事，能不能提高 AGI 做成的概率。**

这是一种难得的清醒和克制。

每次模型升级，能做的事都会多一截：接新模型、做 Agent、加视频功能、追热点、再立一个新项目。每个机会单独看都正确。

人和团队很少被一个明显错误的决定拖垮；把团队拖垮的，往往是一串各自正确的机会。识别这类机会，比发现机会难。

## 一、五个「不做」

![一、五个「不做」配图](/uploads/blog/2026-07-25-restraint/inline-HODu7pZXMAA66m1.jpg)

他在交流里给出的一连串「不做」，就是证据（事实层均据流传整理稿）：

**不做超级 App**：不为用户规模改写主线；

**不做视频生成**：可以是好生意，但现阶段不增加智能上限；

**不追求利润最大化**：API 定价按约十个月收回设备成本，利润够用即止；

**不把开源当损失**：让利换生态和低对抗环境；

**不靠加班堆事情**：聚焦之后，要做的事本来就少。

五个「不做」跨越产品、商业模式、生态和组织，背后是同一套决策语言。他有两句原话：

「克制是一种战略……有时候你可以舍弃一些，来换更多其他的东西。」

「只要我能够保持团队的稳定性，我一定能做成 AGI。」

克制交出去的是份额、利润和热点，换回来的是长久的稳定进步。还有一个细节：API 降价到四分之一时，公司群里很多人是欢呼的——这套目标函数是整个团队认下来的。

## 二、五个决策问题

![二、五个决策问题配图](/uploads/blog/2026-07-25-restraint/inline-HODusyYXgAA8GEI.jpg)

把这套判断从 DeepSeek 的语境里剥出来，遇到「看起来正确」的机会，依次过一遍：

1. **我真正要做成的主线是什么？** 只能有一个。
2. **这个机会如何提高主线成功率？** 必须说清因果链。
3. **它提高的是有效结果，还是好看的指标？**
4. **它会消耗哪个不可退让项？**
5. **能否低成本验证，而不让主线改道？**

冲突时的排序：不可退让项 > 主线成功率 > 低成本验证 > 其他一切指标。

## 三、装进 Agent 的 Skill

```text
请用克制型决策帮我判断：
我当前真正要做成的是【】；
现在出现的机会是【】；
不能损失的是【】；
可投入的时间 / 钱是【】。
```

五问写成了 Skill：liang-wenfeng-restraint。

完整模式处理立项级机会：四项输入，七字段输出。快速模式处理开发中途的念头：写码写到一半想顺手加个功能，说一句「快速过一遍」，返回三行结论。

AI 让「再多做一点」几乎没有成本，删掉念头反而需要一套标准。

装好后，把这段话发给 Agent 就能跑第一次判断：

![三、装进 Agent 的 Skill配图](/uploads/blog/2026-07-25-restraint/inline-HODvLkAXcAAOsj3.jpg)

clone 进 skills 目录即用，README 有 Claude Code / Codex 等三端安装命令： [https://github.com/FANzR-arch/liang-wenfeng-restraint](https://github.com/FANzR-arch/liang-wenfeng-restraint)

两点边界：它不模仿人物口吻，固化的是判断方法；具体答案不是普遍原则，主线由你自己定义。

当 AI 能帮人不断增加行动选项，人的判断价值会越来越集中在一件事上：知道什么不值得做。

🥳感谢看到这里，我是阿哲，欢迎关注我 [@Formulasearch](https://x.com/Formulasearch)，我会持续输出 AI 相关的实践和思考。
