---
title: "当 AI Agent 能自己建模出图，建筑师还剩什么？"
description: "最近，黄仁勋在台北GTC演讲上演示了一个AI Agent：在演示中，Agent自己打开了Rhino，自己建模，自己调材质，自己导出到Blender，自己渲染出图。全程不需要人动鼠标键盘。"
pubDate: 2026-06-04
slug: personal-thinking-2026-04-05
category: personal-thinking
tags: []
cover: "/uploads/blog/2026-04-05/66513d4f-c3cd-49d8-97d7-33a9d5836f9f.png"
coverAlt: "黑色背景上的 NVIDIA GTC 标识、黄仁勋肖像和 Rhino、Grasshopper、Blender 建筑建模界面，标题为 AI 重塑建筑的现在与未来"
titleEn: "When an AI Agent Can Model and Render by Itself, What Is Left for Architects?"
descriptionEn: "At a Taipei GTC talk, Jensen Huang demonstrated an AI agent that opened Rhino, modeled, adjusted materials, exported to Blender, and rendered the result—without anyone touching a mouse or keyboard."
coverAltEn: "A black composition combines the NVIDIA GTC logo, Jensen Huang’s portrait, and Rhino, Grasshopper, and Blender modeling interfaces under a headline about AI reshaping architecture"
contentStatus: full
featured: false
draft: false
externalLinks:
  - label: "wechat"
    url: "https://mp.weixin.qq.com/s/xqBeXA8kFXyjo2XKD_CKzQ"
  - label: "x"
    url: "https://x.com/Formulasearch/status/2062358359458623499"
---

<strong>建筑行业又一春？</strong>

<strong>最近，黄仁勋在台北GTC演讲上演示了一个AI Agent：</strong>

在演示中，Agent自己打开了Rhino，自己建模，自己调材质，自己导出到Blender，自己渲染出图。

全程不需要人动鼠标键盘。

看完Demo，脑子里只有一个想法：或许建筑行业的春风将会以另一种形态重新到来。

## 一、传统工作流，几分钟内完成

![铅笔素描风格的临海玻璃住宅，字幕写着从构思到设计需要各种工具和专业知识](https://pbs.twimg.com/media/HJ57zIpW4AAnfTq?format=jpg&name=large)

先说一下那个Demo到底做了什么。

不是"AI生成了一张好看的效果图"。那种东西早就不新鲜了。

这次不一样。

这个Agent接收的输入是：一张手绘草图 + 几张参考图 + 一段文字描述。然后它自己规划了任务，自己打开了Rhino，建了场地模型，生成了建筑体量，做了内部布局，放了门窗和结构构件。

然后它自己把模型导出到Blender。自己迁移了材质属性。自己打了灯光。自己选了镜头角度。自己渲染。

中间出了错，它自己发现，自己修正。

![黑色背景上悬浮着多张建筑软件窗口，包括三维模型、场地渲染和材质设置界面，底部字幕提到本地 RTX Spark 代理](https://pbs.twimg.com/media/HJ57VdhWEAA8y2t?format=jpg&name=large)

我以前的工作流呢？

打开Rhino → 导入CAD底图 → 描墙线 → 拉体量 → 反复调参数 → 导出到Blender → 重新赋材质（因为导出来材质全乱了）→ 打灯光 → 反复试渲染 → PS后期。一个方案，最快两三天。

它可以几分钟。

而且整个演示跑在一台RTX Spark上，本地运行。设计图纸不用上传任何云端。

说一下这台机器什么概念：

Blackwell RTX GPU，6144个CUDA Cores。1 Petaflop AI算力。20核Grace CPU，128GB统一内存。TSMC 3纳米工艺，700亿晶体管。

翻译成人话：<strong>一台笔记本，本地1 Petaflop。</strong> 不需要工作站，不需要机房，不需要把设计图纸上传到任何人的服务器。

更值得关注的是这套Agent的技术栈：

- <strong>AI框架</strong>：Hermes harness，开放式沙盒架构。Agent在沙盒里被赋予工具调用权限，能自主操作Rhino、Blender、Flux 2
- <strong>本地模型</strong>：Nemotron 3 Ultra，NVIDIA最新的开源大模型，负责执行层面的任务调度
- <strong>云端调用</strong>：Claude Sonnet，遇到复杂推理时混合调用
- <strong>涉及软件</strong>：Rhino（建模）+ Blender（渲染）+ Flux 2（图像生成）

一套<strong>本地模型处理执行 + 云端模型处理推理</strong>的混合架构。

![黑色流程图展示 OpenShell 居中的 Context、Observe、Reason、Act 循环，左侧是 Prompt、参考图和文字简报，顶部连接 Rhino、Blender、ComfyUI，右侧是 Claude Sonnet](https://pbs.twimg.com/media/HJ57WO-W8AAYla_?format=jpg&name=large)

![黑色界面中左侧是 AI 对话窗口，右侧显示 Rhino 的白色建筑线框图，背景浮现 OpenShell、Hermes 和工具流程节点](https://pbs.twimg.com/media/HJ57XKDXgAAl0Xb?format=jpg&name=large)

数据不出本地。设计意图被Agent自动拆解为跨软件的任务流。

<strong>区别在哪？</strong>

以前的AI是"画画的"。你给它一段描述，它吐一张图给你。好看，但不可控，你也不知道怎么改。

这次的AI是"干活的"。它会用工具。它能在多个软件之间自己切换。它理解一个项目从概念到出图的完整流程。

"AI辅助设计"，可以更进一步到“AI设计”了。

## 二、软件正在从"工具"变成"基础设施"

这件事不只是建筑行业的事。

我在AI行业这一年多，看到的最大趋势是什么？不是模型变强了，是<strong>工具在被Agent编排</strong>。

vibe coding已经验证了这条逻辑。用codex写代码，不需要知道React的API叫什么——你只需要描述你要什么。Agent自己查文档、写代码、装依赖、调bug、部署。

你从"写代码的人"变成了"描述需求的人"。

现在，同样的逻辑撞上了建筑设计。

Rhino不会消失。Blender不会消失。但它们会从"你每天花8小时操作的对象"变成"Agent在后台自动调用的API"。

![Rhino 三维建模界面中的多层住宅体量，包含墙体、楼板、房间标签和黄色尺寸标注](https://pbs.twimg.com/media/HJ57YAOXwAAjbS6?format=jpg&name=large)

![Blender 与 ComfyUI 的并排对比画面，左侧是简化的木质住宅和泳池模型，右侧是经过图像生成的临海住宅渲染图](https://pbs.twimg.com/media/HJ57Y9eXgAAFZM8?format=jpg&name=large)

![昏暗工作室里的建筑师坐在模型旁，周围悬浮 Rhino、Blender、CAD、Grasshopper 和 AI Agent 任务面板，显示建模、渲染和分析进度](https://pbs.twimg.com/media/HJ57Z4aXEAAGCok?format=jpg&name=large)

![黑色建筑自动化流程图，从手绘草图、平面图和体量线框逐步连接到 Rhino、Blender、日照、能耗和碳排放分析面板](https://pbs.twimg.com/media/HJ57aqpXcAAkhum?format=jpg&name=large)

就像你今天用codex写代码，你不会关心npm install到底执行了什么。你只关心页面出来了没有。

演讲里说了一句很直白的话：

> "过去我们习惯启动应用程序、点击并输入。现在我们向AI解释需求和意图，由AI来使用工具。"

翻译一下：<strong>软件从"用户界面"变成了"后台服务"。</strong>

你不再操作软件。你描述你要什么。Agent替你操作。

这不只是建筑行业的事。程序员、平面设计师、视频剪辑、数据分析——所有以"操作专业软件"为生的技能，都在被同一条逻辑压缩。

## 三、建筑师，何去何从？

我离开建筑行业的时候，最大的感受是什么？

<strong>这行业需要的是工具人而不是设计师，甚至这个行业从来不存在“设计”</strong>

![昏暗室内的建筑师向一群访客讲解空间方案，左侧墙面叠加 AI 建模、渲染、CAD 和任务管理界面](https://pbs.twimg.com/media/HJ57h-7XIAAUC1N?format=jpg&name=large)

我这种刚入行的建筑师，80%的时间在学软件、画图、改图、校核规范。设计？那是十年以后的事。但大部分人还没熬到"十年以后"，就已经被消耗完了。

现在AI替你做完了那80%

<strong>然后呢？</strong>

如果你只会做那80%，你就真的没有存在的必要了。

这不是危言耸听。这是我在AI行业亲眼看到的逻辑：

<strong>执行力在贬值，判断力在升值。</strong>

写代码的能力在贬值——但"判断什么值得做"的能力在升值。

画效果图的能力在贬值——但"判断一个空间好不好"的能力在升值。

套规范的能力在贬值——但"理解规范背后为什么这么规定"的能力在升值。

这些东西AI学不会。不是因为它不够聪明。是因为这些东西<strong>没有标准答案</strong>。

<strong>对场地的理解，对材料的感知，对人在空间里会怎么走的直觉，对一栋建筑应该长什么样的判断。</strong>

这些东西，来自经验、审美、直觉、价值观。这些都来自人的真情实感，而非大模型。

## 四、真正的行业变革

建筑行业不是第一次经历技术冲击了。

CAD取代了手绘。参数化设计取代了重复建模。BIM取代了图纸管理。

每一次都有人说"建筑师要失业了"。每一次都没有。

但这一次，确实不一样。

以前的工具是"让同一件事做得更快"。CAD比手绘快，Rhino比CAD快。但你还是要自己画。

<strong>Agent是"让同一件事不需要你做了"。</strong>

一台RTX Spark，1 Petaflop算力，本地跑。一个Agent，自己打开Rhino、Blender，自己完成从概念到出图的全流程。

![未来建筑工作流示意图，手绘草图、平面图和三维体量经由 AI Agent 分流到 Rhino、Blender、日照、能耗与碳排放分析](https://pbs.twimg.com/media/HJ57ixbXIAAIzUl?format=jpg&name=large)

<strong>这并不是未来的蓝图，已经实实在在落地实现在了老黄手里的电脑上。</strong>

而且这还只是Agentic AI这一层。黄仁勋在同一个演讲里还发布了Cosmos 3世界模型——能从图像、文本或视频生成符合物理规律的合成视频，支持闭环仿真。对建筑行业来说，这意味着能耗仿真、风环境模拟、碳排放测算——这些过去需要专业工程师做的分析，未来可能是Agent顺手调用的一个模块。

当然，距离真实项目落地还有距离。建筑规范、BIM标准、多专业协同、法律责任归属——这些不是一段Demo能解决的。

<strong>但方向已经确定了。</strong>

就像2023年GPT-4出来的时候，大家还在争论"AI写的代码能不能用"。到了2025年，vibe coding已经是默认工作流。

<strong>vibe design不会比vibe coding晚来多少。</strong>

## 五、最后的一点思考

会软件，不再是优势，AI替你建模出图。

会做设计是优势吗？也不一定。

当Agent能在几分钟内生成十几个方案变体，"出方案"本身的价值在被稀释。

那还剩什么？

<strong>建筑设计的本质从来不是画图。</strong>

是构建空间。是理解人在空间里的感受。是知道一堵墙放在那里，会让人想停下来，还是想快步走过。是站在甲方、施工方、使用者和城市之间，把所有人的需求翻译成一个能落地的方案。

![暖色建筑室内里，建筑师站在模型和多块 AI 分析屏幕旁向家人或客户讲解方案，窗外是暮色](https://pbs.twimg.com/media/HJ57jq9XQAAxp0e?format=jpg&name=large)

这些东西，过去被"会不会Rhino""会不会Revit""会不会做效果图"淹没了。

AI把这些执行层的事接过去之后，建筑师或许终于可以回到建筑本身。

<strong>空间感知，人文关怀，跨角色的沟通和说服，站在一群人面前，讲清楚一个方案为什么应该是这样的。</strong>

这些在建筑教育里一直被当作"软技能"的东西——未来可能是最硬的通货。

过去二十年，建筑和房地产是中国经济的发动机。四万亿、城镇化、土地财政——那个周期积累了天量的资本、人才和基础设施。然后这批人和钱，一部分流入了互联网，流入了AI。

可以说，<strong>上一个周期的建筑行业，为今天的数字世界打下了地基。</strong>

现在，AI来了；Agent能自己建模了，物理AI能做能耗仿真了，一台笔记本，本地就能完成。

这些技术，一定会反哺回建筑行业。能让“建筑师”，真正从"画图机器"变回"空间创造者"。

<strong>建筑是人类最古老的行业之一，从人类为自己建起第一个庇护所开始，它就一直陪伴着人类进化至今。</strong>

它经历过黄金时代，也经历过至暗时刻。它孕育了互联网和AI的底层血液，然后自己陷入了漫长的寒冬。

但我始终相信，这个行业不会消失。

不是因为情怀，是因为人永远需要空间，需要被庇护。需要一个地方，让光从某个角度照进来。

那些曾经被重复劳动消耗掉的热忱，可能会重新回到建筑师身上。

等新技术把执行负担卸掉，等这个行业重新想起它到底在做什么。

## 为人类建造新世界。

![夕阳下的未来城市广场，古典柱廊与玻璃高楼、弧形空中连桥和绿色植被交织，行人分布在宽阔步道上](https://pbs.twimg.com/media/HJ58H85WIAAHAIL?format=jpg&name=large)

🥳感谢看到这里，我是阿哲Phil，前建筑师 → AI

欢迎关注我 [@Formulasearch](https://x.com/@Formulasearch)，我会持续输出AI工具实测 × 转型思考 × 个人成长。

评论区聊聊：如果AI替你扛了80%的执行工作，你最想把时间花在哪？
