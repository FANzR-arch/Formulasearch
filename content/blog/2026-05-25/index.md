---
title: "还在写提示词？让AI自己动_Loop Engineering"
description: "Boris Cherny 说\"我不再 prompt Claude 了。我让一堆循环跑着，由它们去提示 Claude、去琢磨该干什么。我的工作变成了写循环。\""
pubDate: 2026-06-18
slug: ai-practice-2026-05-25
category: ai-practice
tags: []
cover: "/uploads/blog/2026-05-25/cea64e7f-aa53-4bcb-8707-101fa7bc88ba.png"
coverAlt: "白底手绘示意图，左侧人物输入 prompt，右侧橙色 LOOP 环形箭头标注自动触发与持续运转"
titleEn: "Still Writing Prompts? Let AI Run Its Own Loop Engineering"
descriptionEn: "Boris Cherny said, “I no longer prompt Claude. I let a set of loops run, prompting Claude and figuring out what to do. My work became writing loops.”"
coverAltEn: "A hand-drawn diagram on white shows a person entering a prompt on the left and an orange LOOP arrow on the right for automatic, continuous execution"
contentStatus: full
featured: false
draft: false
externalLinks:
  - label: "wechat"
    url: "https://mp.weixin.qq.com/s/QLeNRhqgNxeZJkQ7Osha5Q"
  - label: "x"
    url: "https://x.com/Formulasearch/status/2067479963268518337"
---

Boris Cherny，Claude Code 的负责人，说了这么一句话： <strong>"我不再 prompt Claude 了。我让一堆循环跑着，由它们去提示 Claude、去琢磨该干什么。我的工作变成了写循环。"</strong>他不是在描述未来。他现在就这么干。

![还在写提示词？让AI自己动_Loop Engineering配图](https://pbs.twimg.com/media/HLBl8NlXQAA8eyR?format=jpg&name=large)

你花了多少时间学提示词技巧？ 我花了不少时间。 提示词技巧解决的是"你在场"的问题。你一离开键盘，工作就停了。

## 一、你是那台人肉发动机

大多数人用 AI 的方式，是这样的：

你敲一段指令，AI 生成，你检查，你再敲，AI 再生成。循环往复。每一轮都需要你坐在那里，看着，等着，做判断，再推一把。

这个模式有个结构性天花板：

<strong>你不在，流程就停了。</strong>

那个一直在场、一直在推的人，是你自己，<strong>你就是那台人肉发动机</strong>。

你把自己练成了提示词专家，结果发现被自动化掉的，正是你这个"发指令的人"。

![一、你是那台人肉发动机配图](https://pbs.twimg.com/media/HLBlreYXsAAim6V?format=jpg&name=large)

## 二、循环从哪里来

2025 年，一个叫 Geoffrey Huntley 的开发者提出了"拉尔夫循环"。

最纯粹的形式，3 行 bash：

```bash
while :; do cat PROMPT.md | claude-code; done
```

没有多智能体通信，没有复杂架构。就是让 AI 一直跑，每轮清空上下文，靠测试报错做硬性反馈。

结果是什么？

用这个"简陋"的循环，他花三个月，让 AI 从零写出了一个全新编程语言的编译器。

2026 年 6 月，这件事开始大爆发。Peter Steinberger（OpenAI）、Boris Cherny（Anthropic）、Addy Osmani（Google Chrome）集体公开站队，正式叫它"循环工程"。

提示词让 AI 一次动一下， 循环让 AI 一直动。

![二、循环从哪里来配图](https://pbs.twimg.com/media/HLBlpnrWQAAs31a?format=jpg&name=large)

## 三、解剖一个成熟的循环：5 个零件和 1 个记忆

Addy Osmani 把成熟的循环系统拆成 5 个零件，每一个对应一个你用过 AI 之后认得出来的痛点。

<strong>自动化触发器</strong>：循环的心跳。你不用按启动键，它自己醒来发现任务——可以是定时，也可以是一个新 PR 进来。

<strong>工作区隔离（Worktrees）</strong>：同时跑多个 Agent 时，给每个 Agent 独立的工作目录。让它们在同一个文件里打架的后果你不想看到。

<strong>Skills（技能文件）</strong>：AI 每次启动都是失忆的。把项目规范写进 SKILL.md，AI 读了就能干活，不用你重新解释一遍项目背景。

<strong>连接器（MCP）</strong>：让循环能读 Jira 工单、查数据库、在 Slack 发消息、自动开 PR——跳出文件系统，接进真实工作流。

<strong>子智能体分工（制造者 + 审查者）</strong>：让写代码的模型给自己打分，它会一直夸自己。必须另派一个独立 Agent 来挑刺。自我评分是陷阱。

还有一个必须有的东西：<strong>记忆</strong>。

AI 在轮次间会遗忘。进度必须存磁盘，一个 Markdown 文件就够。系统重启才知道昨天干到哪了。

循环是个不睡觉的工程师。但你得给它留便条——否则它每天早上都以为是第一天上班。

![三、解剖一个成熟的循环：5 个零件和 1 个记忆配图](https://pbs.twimg.com/media/HLBl_wRX0AA98eL?format=jpg&name=large)

## 四、自动化欠的三笔债

社交媒体上你只看到"循环跑了一夜，写了 6 个仓库"。

你看不到的是，没人看管的循环在无人看管地犯错。

<strong>验证债</strong>：AI 在控制台打出"Done"，这是宣称，不是证明。没有硬性停止条件——测试通过、Lint 干净——循环会想方设法糊弄过关，把烂代码悄悄合进去。你今天省的复核时间，全变成未来系统崩溃时的炸弹。

<strong>理解债</strong>：循环产出代码的速度远超你阅读的速度。连续几个月让循环提交 PR 而不去读，你会突然发现自己成了自己代码库里的陌生人。系统出了深层 Bug，循环修不了，你连从哪开始 Debug 都不知道。

<strong>认知妥协</strong>（最危险）：当"按一下让 AI 干"变得太舒服，你会逐渐放弃思考"这个功能该不该做"、"架构是否合理"。你交出了作为工程师最重要的——判断力。

<strong>还有一个账单：没有迭代上限的循环，一夜可以重试几百次，直接把 API 的钱包刷爆。</strong>

![四、自动化欠的三笔债配图](https://pbs.twimg.com/media/HLBmCOeWkAAwkTb?format=jpg&name=large)

## 五、现在就可以开始（两种方法）

<strong>方法 A：/goal 命令（推荐新手）</strong>

写清验收条件。比如："所有测试通过，且不能修改 test/ 目录下任何文件。"

启动后：负责干活的模型改代码，背后一个独立小模型评估进度，不达标打回，达标才停。你不用插手，直到条件达成或超时。

我用 Codex 的 /goal 功能做了一个实测，目标是给自己开发一个推特内容自动收集和排期的插件——之前一直手动操作，纯重复劳动。

写了验收条件，启动，去做别的事。

完成了。

![五、现在就可以开始（两种方法）配图](https://pbs.twimg.com/media/HLBmPaqWMAAYVXr?format=jpg&name=large)

![五、现在就可以开始（两种方法）配图](https://pbs.twimg.com/media/HLBmRvbWsAACmpR?format=jpg&name=large)

<strong>能跑，能用，验收基本是通过的。</strong>

门槛只有一个：你需要说清楚"什么叫完成"，而不是"大概做个这样的东西"。条件越精准，结果越可靠。

![五、现在就可以开始（两种方法）配图](https://pbs.twimg.com/media/HLBmZbuWMAA-pEd?format=jpg&name=large)

<strong>方法 B：极简拉尔夫循环（10 行 bash，适合折腾派）</strong>

- 创建 progress.txt：持久化记忆，告诉 AI 干到哪了
- 创建 spec.md：你的验收标准和任务列表
- 一个 while 循环，把这两个文件喂给 AI（Aider 或 claude 命令行）

核心哲学：每轮清空上下文，靠物理状态机传递进度，不让上下文污染。

<strong>从 /goal 开始。bash 循环适合你已经知道自己要什么、且愿意自己监控输出的场景。不要上来就复杂化。</strong>

去造那个循环。

但别让自己沦为一个只会按启动键的机器看门人。

循环让代码生产变廉价。它不让"该做什么"这个判断变廉价。 那个判断，现在、将来都还是你的工作。

<strong>你现在在写提示词，还是在写循环？</strong>

🥳感谢看到这里，我是 Phil，前建筑师 → AI 产品 欢迎关注我[@Formulasearch](https://x.com/Formulasearch)，持续分享 AI 工具与产品思维。
