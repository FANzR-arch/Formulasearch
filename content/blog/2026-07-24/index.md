---
title: "Graph Engineering 是什么？零基础快速入门，附多 Agent 分工提示词"
description: "从 Loop Engineering 走向 Graph Engineering：把复杂任务拆成可并行、可汇合、可检查的多 Agent 图结构，并附可直接使用的分工模板。"
pubDate: 2026-07-24
sourceId: "2026-07-24"
slug: graph-engineering-multi-agent
category: ai-knowledge
tags: ["Graph Engineering","Multi-Agent","Agent"]
cover: "/uploads/blog/2026-07-24/HN9R_GYXUAA5mlw.jpg"
coverAlt: "黑底霓虹绿终端图，从 ENTRY 节点分流到六个 Agent，再汇合至 MERGE 与 EXIT，中间标题写着从 Loop 到 Graph"
titleEn: "What Is Graph Engineering? A Beginner Guide with a Multi-Agent Template"
descriptionEn: "Move from loops to graphs by splitting complex work into parallel, mergeable, and reviewable agent tasks, with a reusable delegation template."
coverAltEn: "A neon-green terminal graph fans out from ENTRY to six agents, merges their paths, and exits beneath the title From Loop to Graph"
contentStatus: full
featured: false
draft: false
externalLinks:
  - label: "x"
    url: "https://x.com/Formulasearch/status/2080473495876587742"
---
前阵子刚刚出现的 Loop 还没讨论多久，时间线上又出现一个 Graph Engineering，这回又是个啥概念？ 一文帮你解释清楚，并附一份可直接使用的提示词模板。

概念的起点是 7 月 18 日，OpenClaw 作者 Peter Steinberger 在 X 上问了一句：大家还在聊 Loop，还是已经转向 Graph 了？

> 7月18日
>
> Are we still talking loops or did we shift to graphs yet?

这条推文获得了近 300 万浏览、7000+ 赞和 2700+ 收藏。

## 一、Loop 与 Graph 的关系？

![一、Loop 与 Graph 的关系？配图](https://pbs.twimg.com/media/HN9R_6FWMAAS64q?format=jpg&name=large)

Graph Engineering 可以归纳为三件事：**分工、交接和验收**。

我之前一篇文章讲过何为 Loop：即让一个 Agent 反复执行任务、自行检查，并在不合格时重新处理，直到达到预设标准。

> 6月18日

**Loop 很实用，但它存在明确的上限：所有任务都由同一个 Agent 承担。**

这相当于让一名员工同时负责资料检索、事实核查、写作和校对。任务较少时尚可应付；任务增多后，上下文窗口会逐渐被占满，早先的信息也更容易被遗漏，处理速度和准确性都会下降。

Graph 的处理方式是：**把任务分配给多个 Agent。**

不同 Agent 分别负责检索、核查、写作和审校。将岗位划分、结果交接、质量检查与停止条件连接起来，就形成了一张 Graph。

**Loop 负责单个 Agent 如何完成任务，Graph 负责多个 Agent 如何协作。**

二者并非替代关系。Graph 中的每个 Agent 仍然可以通过 Loop 完成局部任务。

## 二、五个基本概念

![二、五个基本概念配图](https://pbs.twimg.com/media/HN9SAvvWUAAc9fQ?format=jpg&name=large)

![二、五个基本概念配图](https://pbs.twimg.com/media/HN9R_K8XoAEueWI?format=jpg&name=large)

以资料检索为例。假设一个 Agent 找到十条信息，只返回一段总结，负责写作的 Agent 仍然需要重新判断：哪句话是结论，依据是什么，来源在哪里，还有哪些内容尚未确认。

Schema 就是一张固定的“资料交接单”。每个检索 Agent 都要按相同字段提交结果：

```text
任务编号：R-02
结论：Claude Code 的 Dynamic Workflows 最多并发运行 16 个 Agent
依据：Claude Code 官方文档的 Behavior and limits 章节
原文链接：https://code.claude.com/docs/en/workflows
置信度：高
状态：已完成
未确认项：实际并发数还会受到本机 CPU 核心数限制
```

这里用文字表单便于理解。在正式工作流中，Schema 通常会写成 JSON Schema，由系统检查必填字段和数据类型。

下一位 Agent 不必再从长段文字中提取信息，只需读取对应字段。字段缺失就退回补充，内容完整后再进入下一步。

Schema 和 Verifier 负责两件不同的事：**Schema 规定“交什么”，Verifier 检查“交上来的内容是否可信”。** 在具备访问权限时，Verifier 会打开原文链接，核对结论是否得到来源支持，再决定通过、退回修订或标记为无法验证。

## 三、可并行的任务不要串行处理

在厨房炖汤时，没有必要守在灶前等待两小时。切菜、腌肉和煮饭都可以同时进行。任务编排也是如此：互不依赖的工作应当并行处理。

许多 AI 工作流仍被设计成单一队列：完成 A 后执行 B，再完成 B 后执行 C。然而，不少任务并不依赖前一步的结果。例如，总结文件与查询次日航班之间没有数据依赖，完全可以同时执行。将二者串联，只会增加等待时间。

这类不必要的等待，是复杂 Agent 流程响应缓慢的常见原因。

判断标准只有一个：**下一步是否需要使用上一步的结果？**

如果需要，就按顺序执行；如果不需要，就拆分后并行处理。

设计 Graph 时，首先应逐项检查流程中的依赖关系，移除没有必要的串行连接。原本的一条长队，往往可以拆成多个同时启动的分支。

![三、可并行的任务不要串行处理配图](https://pbs.twimg.com/media/HN9TAsyXUAAo11X?format=jpg&name=large)

## 四、最常用的 Graph 结构

理解这些概念后，可以用“写一篇需要资料核查的文章”为例，观察最常用的 Graph 结构。

**第一步，分发任务（Fan-out）。** 三个 Agent 同时工作：一个阅读原文，一个查询官方文档，一个整理社区讨论。三项任务互不依赖，可以并行执行。

**第二步，汇总结果（Fan-in）。** 三份资料返回后，统一去重和分类。这类确定性操作可以交给普通代码，无需额外调用模型。

**第三步，独立质检。** Verifier 专门检查前述结果：链接是否有效，数字是否一致，“官方已确认”能否找到对应原文。无法验证的内容应降低可信等级，或退回重新检索。

**第四步，形成稿件。** 通过质检的材料交给最后一个 Agent，由其统一组织并形成结论。

任务先分发，再汇总，构成了一个菱形结构。市场调研、代码审查和竞品分析都可以沿用这套骨架，只需调整各节点的具体任务。

![四、最常用的 Graph 结构配图](https://pbs.twimg.com/media/HN9THCSWgAEKic1?format=jpg&name=large)

质检退回会形成循环：检索、检查、退回、再次检索。每个循环都必须设置停止条件，例如连续两轮没有发现新问题就结束。缺少停止条件时，Agent 可能持续重复检查并不断消耗 token。

Graph 中的局部循环，就是作用于团队流程的 Loop。上一篇讨论的停止条件，在这里同样适用。

## 五、一个可直接使用的 Graph 模板

下面这份模板可以用于 Claude Code、Codex 或其他支持工具调用的 Agent 产品。它会先判断当前环境是否具备多 Agent 能力：支持时采用真实分工，不支持时按同一流程顺序执行，并明确标注“单 Agent 模拟”。

```text
【任务目标】
【写清楚最终要解决的问题】

【最终交付物】
【例如：一篇带来源的分析报告 / 一份代码审查结果 / 一个可运行的功能】

【可用材料与工具】
【文件、网址、数据库、搜索工具、代码仓库，或“仅使用我提供的材料”】

【约束条件】
【时间范围、禁止修改项、来源要求、字数、格式、预算等】

【验收标准】
1. 【必须满足的标准】
2. 【必须满足的标准】
3. 【可选标准】

【最大返工次数】
同一子任务最多返工 2 轮。

你是本任务的协调者。请按以下规则规划并直接执行；只有缺少会改变结果的关键输入时才暂停提问。

一、先确认执行模式
1. 如果当前环境提供 subagent、多 Agent 或并行工具调用能力，并且宿主会并发执行这些任务，使用真实并行，并标记为“多 Agent 模式”。
2. 如果当前环境不具备这些能力，按相同阶段顺序执行，并标记为“单 Agent 模拟”。不得声称已经并行运行或调用了不存在的 Agent。

二、拆分任务并标记依赖
为每个子任务定义：
- task_id
- 目标
- 输入
- 依赖项
- 负责角色
- 预期输出
- 验收标准

只有互不依赖、不会同时修改同一份状态或文件的任务可以并行。涉及共享状态、写入操作或前后置依赖的任务必须串行。

三、按角色执行
- Coordinator：拆分任务、判断依赖并分派工作。在多 Agent 模式下不代替 Worker 完成任务；在单 Agent 模拟中按阶段切换角色。
- Worker：完成指定子任务，并按统一 Schema 交付。
- Verifier：独立核对 Worker 的结论和证据，不直接沿用 Worker 的判断。
- Synthesizer：只使用通过验证的结果，去重、处理冲突并形成最终交付物。

在单 Agent 模拟中，Verifier 只能视为一次单独的复查阶段，不能宣称已完成真正独立的交叉验证。

四、Worker 统一交付 Schema
每个子任务必须返回：
- task_id：
- status：completed / partial / blocked
- result：
- evidence：一条或多条证据记录；每条记录都要包含 claim（结论）、source_type（来源类型）、source_location（网址、文件路径、行号或命令）、support（该来源如何支持结论）和 confidence（high / medium / low）
- uncertainties：仍未确认的内容

不得编造来源、测试结果或完成状态。没有证据时明确写“未验证”。

五、Verifier 验收
逐项检查：
1. 证据是否真实存在并可访问；
2. 证据是否直接支持对应结论；
3. 数字、日期、主体和适用范围是否一致；
4. 是否遗漏反例、冲突或失败情况；
5. 输出是否满足该子任务的验收标准。

验收结果只能是：
- PASS：通过；
- REVISE：说明具体缺口，只退回有问题的子任务；
- BLOCKED：说明缺少什么信息、工具或权限。

来源发生冲突时，不要取平均值。优先比较来源是否为一手资料、发布时间是否更近、证据是否直接；仍无法判断时，在最终结果中并列保留冲突。

六、停止条件
满足以下任一条件时停止：
1. 所有必选验收标准均已通过；
2. 同一子任务返工达到 2 轮仍未通过；
3. 连续两轮没有获得新证据或实质进展；
4. 缺少必要的工具、权限或输入。

停止时不得硬编。未完成的部分必须说明原因、已尝试的方法和继续推进所需的条件。

七、最终输出
1. 最终交付物；
2. 主要证据与来源；
3. 未解决的冲突和风险；
4. 执行说明：哪些任务并行、哪些任务串行，以及本次采用“多 Agent 模式”还是“单 Agent 模拟”。
```

注意，普通聊天界面通常只能按顺序模拟不同角色；支持 subagent、并行工具调用或 Dynamic Workflows 的环境，才可能真实地同时执行多个分支，比如claude code，codex这类终端。

这份模板也无法做到是一个通用的编排系统。但它仍然适合作为通用任务协议，因为其中保留了 Graph 的核心结构：任务拆分、依赖判断、统一交接、独立验证、冲突处理和停止条件。

## 六、多个 Agent 的成本

**第一项是 Agent 数量。** 每增加一个 Agent，就会增加一份读取材料、推理和输出的开销。十个 Agent 同时检索资料，相当于同时聘请十位顾问。并行可以缩短等待时间，却不会减少调用成本。

“编排脚本零 token”也是一句容易被误解的话。它只表示任务分配、等待结果和合并数据等调度动作可以由普通代码完成，无需调用模型；每个实际执行任务的 Agent 仍会产生相应的 token 消耗。

**第二项是模型选择。** 提取标题、整理格式和简单分类可以使用成本较低的模型；事实判断、冲突处理与最终结论再交给能力更强的模型。所有节点都使用最高规格的模型，通常没有必要。

**第三项是等待关系。** 如果十份资料必须放在一起去重，汇总节点就要等待全部结果；如果每份资料可以单独处理，则应采用流水线方式，返回一份就处理一份，避免较快的节点等待较慢的节点。

Graph 设计合理时，可以用更短的时间完成复杂任务；设计不当时，只会让多个模型同时消耗资源。

## 七、是否需要 Graph：多数任务暂时不需要

总结一份 PDF、修改一个标题或翻译一段文字时，单个 Agent 从头处理到尾通常更快，也更便宜。将简单任务强行拆成 Graph，只会增加等待、交接和出错的机会。

可以用四个问题判断一项任务是否值得采用 Graph：

1. 是否存在若干可以同时执行的子任务？
2. 单个 Agent 的上下文是否已经不足以容纳全部信息？
3. 结果是否需要独立检查？
4. 这套流程是否会反复运行？

**如果有两项以上的回答为“是”，再考虑使用 Graph。** 如果一项都不符合，普通提示词已经足够。

实际使用时，可以按以下顺序逐步增加复杂度：

先由一个 Agent 完成整个任务 → 找出最耗时或最容易出错的环节 → 拆出一个可以并行的分支 → 在需要独立检查的位置增加质检 Agent → 流程稳定后，再考虑框架和自动编排。

![七、是否需要 Graph：多数任务暂时不需要配图](https://pbs.twimg.com/media/HN9TN3GXoAAGchj?format=jpg&name=large)

## 八、Graph 可以自动生成，但需人工审核

Graph 的设计并不轻松。谁负责什么、哪些节点存在依赖、谁来检查结果，都需要明确安排。

Claude Code 的 Dynamic Workflows 可以自动完成这项工作：用户描述最终目标后，它会分析任务、生成编排脚本、分派多个 subagent，并在最后汇总结果。

目前有三个主要入口：直接要求 Claude Code “use a workflow”或“run a workflow”；运行内置的 /deep-research，它本身就是一套“拆解问题 → 并行搜索 → 交叉质检 → 综合成稿”的流程；或者输入 ultracode，或通过 /effort ultracode 让系统为实质性任务自动规划工作流。运行稳定的流程还可以保存，并在之后按名称复用。

官方文档给出的上限是：单机最多并发运行 16 个 Agent，单次 Workflow 最多使用 1000 个 Agent。这只是系统容量，并不代表实际任务需要达到该规模。多数任务使用三到五个 Agent 已经足够。

Graph 自动生成后，人的职责转向审核，重点检查三个问题：任务拆分是否合理，必要的质检是否存在，以及当前 Agent 数量是否值得相应成本。

我自己的内容流水线就是一张手工设计的小型 Graph：素材归档、写作和质检分别由不同环节负责，交接采用固定格式。它并不复杂，但每一步为何存在、删除后会产生什么影响，都有明确答案。即使 Graph 由 AI 生成，审核标准也没有改变。

![八、Graph 可以自动生成，但需人工审核配图](https://pbs.twimg.com/media/HN9TTLlWYAAi3jk?format=png&name=large)

AI 可以生成流程，流程是否值得运行仍要由人判断。

## 九、一个小练习

选择一项手头的真实任务，例如撰写周报、开展调研或整理资料。

先用第七节的四个问题判断它是否值得拆分。

如果不值得拆分，继续使用单个 Agent 即可，这会节省不必要的调用成本。

如果值得拆分，就填写第五节的模板，观察 AI 如何分工、交接和验收。流程结束后，再检查哪些交接可以删除，哪些环节缺少质检。

能够回答这两个问题，就已经开始实践 Graph Engineering，而不只是记住相关术语，能够搭建 Graph 的人会越来越多，能够解释每条连接为何存在的人仍然稀缺。

🥳感谢看到这里，我是阿哲 欢迎关注我👉[阿哲Phil (@Formulasearch) / X](https://x.com/Formulasearch) 我会持续分享 AI 工具、跨界思考与产品方法论。
