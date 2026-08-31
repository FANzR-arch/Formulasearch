---
title: "「世界需要开源模型」——顶级卖铲人的开源叙事，背后到底在卖什么？"
description: "从黄仁勋倡议开放权重模型的公开叙事出发，分析算力、基础设施与生态利益如何共同塑造“世界需要开源模型”这句话。"
pubDate: 2026-07-25
sourceId: "2026-07-25-open-models"
slug: open-models-shovel-seller
category: personal-thinking
tags: ["开源模型","NVIDIA","AI产业"]
cover: "/uploads/blog/2026-07-25-open-models/HODGHKYXgAA-H-x.jpg"
coverAlt: "黑绿色科技城市与数据中心背景前是黄仁勋肖像，标题写着世界需要开源模型，绿色光路连接芯片、工厂、汽车与机器人"
titleEn: "“The World Needs Open Models”: What Is the Top Shovel Seller Really Selling?"
descriptionEn: "Starting from Jensen Huang’s case for open-weight models, this article examines how compute, infrastructure, and ecosystem incentives shape the narrative that the world needs open models."
coverAltEn: "Jensen Huang stands before a dark green data-center city where luminous infrastructure links chips, factories, cars, and robots under a headline about open models"
contentStatus: full
featured: false
draft: false
externalLinks:
  - label: "x"
    url: "https://x.com/Formulasearch/status/2080883729711411621"
---
黄仁勋在 X 上发了第一条帖子。没有寒暄，也没发产品广告，他直接贴出一封给华盛顿的信：《Open Weights and American AI Leadership》。

25 方联名，劝美国政府别过早限制开放权重模型。截至 7 月 25 日，这条帖子已有约 2600 万次浏览、12 万点赞。

> 7月24日
>
> For my first post, I’m sharing a letter @NVIDIA signed on why open models matter. AI will transform every industry, power every company, and be built by every country. Open models strengthen safety and cybersecurity, accelerate innovation and diffusion, and enable sovereignty.

帖子里被引用最多的一句是「世界需要开源模型」。

原文是 **"The world needs both frontier closed models and frontier open models."**——老黄其实也支持闭源。

[Musk](https://x.com/elonmusk/status/2080672505660834163) ：「Jensen is right.」

[Altman](https://x.com/sama/status/2080683363174945065) ：希望美国在开源和闭源都赢。

最高赞的评论只有两行：

> tl;dr:「GPU 消耗应该增加，而不是减少」——GPU 卖家

![文章内容配图](https://pbs.twimg.com/media/HODGjsmXIAEUuzT?format=png&name=large)

## 一、25 方签了名，OpenAI 和 Anthropic 没签

信先定义了什么是开放权重模型：任何人都可以下载、检查、修改，并部署在自己的基础设施上。政策诉求有三条：给创业公司和研究者更多算力，投入共享数据集和评测工具，避免过早限制可下载模型。

时间点也不是巧合。Moonshot AI 在 7 月 16 日上线 Kimi K3，称最晚 7 月 27 日发布完整权重，截至本文写作时还没发布。但近前沿的成绩和即将开权重的计划，已经让华盛顿开始讨论限制中国模型。这封信是对着这个窗口来的。

25 方签名者，按在生态中的位置分四类：

- **算力与硬件链**：NVIDIA、Dell、IBM、Mariana Minerals
- **云、平台与企业软件**：Microsoft、Palantir、CrowdStrike、ServiceNow、Box、Telnyx
- **开放模型与开源生态**：Meta、Mistral、Black Forest Labs、Arcee AI、Reflection、Hugging Face、Arena、Mozilla、Linux 基金会
- **应用、投资与行业组织**：Perplexity、Replit、Y Combinator、a16z、Emergence Capital、American Innovators Network

**被媒体重点点名的未联署者有三家：OpenAI、Anthropic、Google。**

这份[名单](https://images.nvidia.com/pdf/Open-Weights-and-American-AI-Leadership.pdf)覆盖了硬件、云、企业软件、开放模型、应用和投资机构，却没有一家以自研闭源前沿模型的访问权为核心业务。分类说的是主要利益方向，不是唯一业务：Microsoft 同时卖闭源模型服务，Mistral 和 Black Forest Labs 也有闭源 API 档位。

![一、25 方签了名，OpenAI 和 Anthropic 没签配图](https://pbs.twimg.com/media/HODGH56XIAAs0zm?format=jpg&name=large)

## 二、黄仁勋的动机是公开的：免费 AI 利好芯片

黄仁勋在公开信发布前两天接受了 [Axios 专访](https://www.axios.com/2026/07/22/nvidia-jensen-huang-china-open-source-ai)，说得很直接："Free AI should be great for hardware… chips… data centers."（免费 AI 对硬件、芯片、数据中心是好事。）

谈到中国模型，他也不避讳："These Chinese models are excellent… Open-source models that are excellent should be used."——美国公司「absolutely」可以使用。

![二、黄仁勋的动机是公开的：免费 AI 利好芯片配图](https://pbs.twimg.com/media/HODGIj-XsAAwZam?format=jpg&name=large)

## 三、签名的 25 方，共同押注模型扩散

卖芯片解释得了英伟达，解释不了另外 24 个签名。换个问法：智能变便宜的时候，谁赚钱？

开放权重意味着部署点变多。模型能下载，就能跑在自有机房、私有云、边缘设备，或者另一个国家的主权云上。每多一个部署点，就多一份算力、服务器、云服务和部署工具的需求。

回头看那四类签名方，他们都在同一张电网上做生意：卖算力的造发电设备，卖云的架输电线，开放生态维护线路标准，创业公司在末端开工厂，VC 给工厂投钱。角色不同，但电价越低、接入点越多，这张网上能做的生意就越大。

公开信自己给了历史参照：1980 年代的开源软件，信里把当年那个选择定性为美国险些犯下的错误。

这就是「到底在卖什么」的第一层答案：**一个智能像电力一样铺开的世界。**

![三、签名的 25 方，共同押注模型扩散配图](https://pbs.twimg.com/media/HODGzv4XIAAXlEY?format=jpg&name=large)

## 四、OpenAI 和 Anthropic 更依赖访问权溢价

OpenAI 和 Anthropic 没有联署，但也没有缺席这场辩论。据 [Axios 7 月 22 日的报道](https://www.axios.com/2026/07/22/openai-anthropic-open-models-trump-china)，两家公司当时正在华盛顿向政策制定者警告中国开放权重模型的风险。Axios 同时指出，开放权重模型受到更严格审查，闭源公司会从中获益。

把四个日期排在一起看：

- **6 月 1 日**，Anthropic 向 SEC 秘密递交 S-1 草案；公司同时说明，发行数量和价格尚未确定（[Anthropic 官方公告](https://www.anthropic.com/news/confidential-draft-s1-sec)）
- **6 月 8 日**，OpenAI 宣布已经秘密递交 S-1，但尚未决定上市时间（[OpenAI 官方公告](https://openai.com/index/openai-submits-confidential-s-1/)）
- **7 月 22 日**，两家联手警告开源模型风险
- **7 月 24 日**，25 方联署的公开信发布，两家都不在名单上

这组日期不构成因果：它只说明两家在准备上市的同时参与了监管讨论，不能证明 IPO 决定了它们的立场。

更直接的压力来自产品本身。前沿闭源 API 的溢价依赖能力差距、可靠性和受控访问；开放权重每逼近一步，客户就多一个可以下载、修改、自建的替代方案。

Altman 的原话是希望美国「在开源和闭源都赢」；OpenAI 发言人对 Axios 也表示，中国开放权重模型的进展不是反对开放的理由。Anthropic 的安全论点则有真实的技术底座：权重一旦放出就无法收回。

安全担忧和商业利益可以同时成立。

![四、OpenAI 和 Anthropic 更依赖访问权溢价配图](https://pbs.twimg.com/media/HODG7N6WQAAke0M?format=jpg&name=large)

## 五、为什么连闭源也支持：两层市场都要买算力

黄仁勋支持的是 both：前沿闭源与前沿开放模型，世界两个都需要。

这句话不只是外交辞令，它对应两类需求。闭源 API 提供便利，面向不愿自建基础设施的客户；开放权重提供控制权，适合必须把数据和部署握在自己手里的企业与国家。两条路交付方式不同，但都要算力。

公开信里最锋利的一段谈的是蒸馏：不要把合法蒸馏与盗用混为一谈；非法抽取应当用针对性的法律框架处理，不要一刀切限制整项技术。黄仁勋对 Axios 说得更直白："Distillation… is fundamental to intelligence."（蒸馏、从其他智能中学习，是智能的基本机制。）下一轮监管辩论很可能会围绕定义展开：什么是正常学习，什么是违反合同或侵犯知识产权的抽取。

还有一句话，安全和商业两种论证都能拿去用："If everything just becomes one single model, one single point of attack, one single source of failure, I think the world is much, much more vulnerable."（如果一切归于一个模型、一个攻击点、一个故障源，世界会脆弱得多。）模型和供应来源越分散，对单一模型的依赖越低；部署点越多，算力需求越大。对英伟达来说，两种收益同向。

![五、为什么连闭源也支持：两层市场都要买算力配图](https://pbs.twimg.com/media/HODG-p1WkAAp40g?format=jpg&name=large)

## 六、一张利益位置表

这张表不做道德分组，只回答一个问题：开放权重扩散时，谁受益更直接，谁的现有优势承压更大。

![六、一张利益位置表配图](https://pbs.twimg.com/media/HODGHNEWsAAyikS?format=jpg&name=large)

Google 没签字，也没出现在 Axios 那篇报道里。它的云业务受益于扩散，Gemini API 又靠闭源模型收钱，两侧都占，所以不放进任何一列。Microsoft 同样横跨两侧，区别是它签了字。

![六、一张利益位置表配图](https://pbs.twimg.com/media/HODIeHVXkAApb0O?format=jpg&name=large)

## 七、老黄到底在卖什么

**老黄支持开源，卖的不是「开源理想」，而是一个 AI 无处不在、算力需求无限扩张的未来。**

英伟达不需要某一家模型公司赢，它需要更多模型在更多地方运行。 闭源服务要算力，开放权重还会增加私有部署、主权云和边缘设备的需求。

![七、老黄到底在卖什么配图](https://pbs.twimg.com/media/HODIhBIXEAAVJF3?format=jpg&name=large)

## 八、结语：未来是开源的

## 开放权重会赢得未来。

**不是因为开源在道德上更高尚，而是因为它更便宜，也更难被任何一家公司单独关掉。权重一旦可以自由下载，定价权就不再属于某一个供应商。**

1980 年代，当时的主流看法是软件必须闭源，研发投入才有回报。后来开源赢下了整个互联网的底座，闭源软件并没有消失，但只能建立在这个底座之上收费。

风险是真的：权重一旦公开就无法撤回。但技术竞争里最后胜出的方案，通常不是最安全的方案，而是使用者最多的方案，而安全能力则是在普及之后才补上的。

**真正值得我们积累的内容是：自己的工作流、决策标准、整理过的数据。把整套方案绑定在某一家公司的独有功能上，积累得越多，对方手里的定价权就越大。**

还有一个习惯值得保留：在听任何一家公司谈论安全、主权或者国家利益之前，先弄清楚它靠什么赚钱。这不意味着它在说谎，但它一定会优先讲对自己有利的那部分。

**老黄不是慈善家，他只是比大多数人更清醒，并且站在赢家的一侧。**

![开放权重会赢得未来。配图](https://pbs.twimg.com/media/HODIjKdWoAA-T49?format=jpg&name=large)

🥳感谢看到这里，我是阿哲，欢迎关注我 [@Formulasearch](https://x.com/Formulasearch)，我会持续输出 AI 相关的实践和思考。
