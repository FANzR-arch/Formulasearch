---
title: "从零开始用 ComfyUI 跑 MiniMax H3（2）：官方skill分析与简易示例"
description: "在跑通 H3 之后，继续拆解官方提示词规范和八类内容 Skill，用简易案例说明适用场景、输入模式与减少无效生成的方法。"
pubDate: 2026-08-30
sourceId: "2026-08-30"
slug: minimax-h3-skills-examples
category: ai-practice
tags: ["ComfyUI","MiniMax H3","Skill"]
cover: "/uploads/blog/2026-08-30/HQ3gAEBaEAAbM04.jpg"
coverAlt: "深色 ComfyUI 模板浏览器中排列 MiniMax H3 图生视频、参考生视频和文生视频等示例卡片，背景可见 H3 工作流节点"
titleEn: "MiniMax H3 in ComfyUI, Part 2: Official Skills and Simple Examples"
descriptionEn: "After the first successful run, examine the official prompt rules and eight content skills through simple examples, input modes, and ways to reduce wasted generations."
coverAltEn: "A dark ComfyUI template browser presents MiniMax H3 image, reference, and text video examples over a visible H3 node workflow"
contentStatus: full
featured: false
draft: false
externalLinks:
  - label: "x"
    url: "https://x.com/Formulasearch/status/2093932915529044386"
---
**上一篇解决“怎样把 H3 跑起来”，这一篇直接讲 H3 适合做什么、提示词怎么写，以及怎样减少无效生成；**

> 8月26日

本片内容产出仍然延续我自己的配置，4080 12g显存+32g内存笔电，使用官方工作流+本地直出，我认为这属于是最基础能接受的门槛了，即便如此生成一条5s的低清视频也要等十几分钟，如果低于我当前的配置，更好的选择可能还是云端。

## 一、H3 适合的视频类型

**官方不仅公开了通用提示词规范，还给出了极简产品广告、品牌宣传、纸拼贴、纸艺定格、歌词贴字 MV、3D 动画、手绘实拍融合和双人游戏开场八套内容工作流。**

本文使用的官方入口如下：

- [MiniMax H3 官方 Skills 总目录](https://github.com/MiniMax-AI/MiniMax-H3/tree/main/skills)
- [H3 Prompt Writing Skill](https://github.com/MiniMax-AI/MiniMax-H3/tree/main/skills/h3-prompt-writing)：T2VA、I2VA、FL2VA、L2VA 和 Ref2VA 的统一提示词规范

下面的分类和案例直接按这九个 skill 整理。

![一、H3 适合的视频类型配图](https://pbs.twimg.com/media/HQ3YaNlaYAALNdV?format=jpg&name=large)

## 1\. 产品与品牌短片

[极简产品广告 Skill](https://github.com/MiniMax-AI/MiniMax-H3/tree/main/skills/minimalist-product-ad-generator) 强调先锁产品事实，再用具体动作展示材质或功能；[品牌宣传 Skill](https://github.com/MiniMax-AI/MiniMax-H3/tree/main/skills/brand-promo-video-generator) 则要求先确认品牌事实、色彩、文案和节拍，避免用抽象特效掩盖产品。它们共同适合目标单一、主体清楚、结尾需要稳定落版的短内容。

本节放两个自制案例：I2VA 的便携露营灯，以及 T2VA 的 SYNATX 品牌动态海报。

<video preload="none" tabindex="-1" playsinline="" aria-label="嵌入式视频" poster="https://pbs.twimg.com/amplify_video_thumb/2093577487360098304/img/6XtLUbZDmVOb9FWb.jpg" style="width: 100%; height: 100%; position: absolute; background-color: black; top: 0%; left: 0%; transform: rotate(0deg) scale(1.005);"><source type="video/mp4"></video>

![1. 产品与品牌短片配图](https://pbs.twimg.com/amplify_video_thumb/2093577487360098304/img/6XtLUbZDmVOb9FWb.jpg?name=large)

①测试修长灯体、提手与双侧支杆的结构保持，以及暖光、岩石环境和克制运镜；

<video preload="none" tabindex="-1" playsinline="" aria-label="嵌入式视频" poster="https://pbs.twimg.com/amplify_video_thumb/2093571409587089409/img/2hWRjufRB8IcWVWD.jpg" style="width: 100%; height: 100%; position: absolute; background-color: black; top: 0%; left: 0%; transform: rotate(0deg) scale(1.005);"><source type="video/mp4"></video>

![1. 产品与品牌短片配图](https://pbs.twimg.com/amplify_video_thumb/2093571409587089409/img/2hWRjufRB8IcWVWD.jpg?name=large)

②“无序片段被规则组织成结构”的过程表达 syntax 的含义，同时测试唯一文字的进入、稳定可读和定格。

## 2\. 纸艺动画

官方把纸艺拆成了两种不同任务。 [Paper Collage Explainer Skill](https://github.com/MiniMax-AI/MiniMax-H3/tree/main/skills/paper-collage-explainer-generator) 用半调照片剪影、大色块和逐片组装表达一个观点； [Papercraft Stop-motion Explainer Skill](https://github.com/MiniMax-AI/MiniMax-H3/tree/main/skills/papercraft-stop-motion-explainer) 更强调微缩纸雕布景、前中后景、拉片、滑轨、转盘、齿轮和纸偶关节。

<video preload="none" tabindex="-1" playsinline="" aria-label="嵌入式视频" poster="https://pbs.twimg.com/amplify_video_thumb/2093605791538548736/img/duIeR4ezIR7v6d1j.jpg" style="width: 100%; height: 100%; position: absolute; background-color: black; top: 0%; left: 0%; transform: rotate(0deg) scale(1.005);"><source type="video/mp4"></video>

![2. 纸艺动画配图](https://pbs.twimg.com/amplify_video_thumb/2093605791538548736/img/duIeR4ezIR7v6d1j.jpg?name=large)

① 高级编辑感纸拼贴动画（梳理复杂问题）

<video preload="none" tabindex="-1" playsinline="" aria-label="嵌入式视频" poster="https://pbs.twimg.com/amplify_video_thumb/2093571944126001152/img/Eni45M7iY5kJBOQZ.jpg" style="width: 100%; height: 100%; position: absolute; background-color: black; top: 0%; left: 0%; transform: rotate(0deg) scale(1.005);"><source type="video/mp4"></video>

![2. 纸艺动画配图](https://pbs.twimg.com/amplify_video_thumb/2093571944126001152/img/Eni45M7iY5kJBOQZ.jpg?name=large)

② 纸艺风动画 （海洋与鲸）

<video preload="none" tabindex="-1" playsinline="" aria-label="嵌入式视频" poster="https://pbs.twimg.com/amplify_video_thumb/2093613900596166656/img/84q7WKxaVqTGK8T2.jpg" style="width: 100%; height: 100%; position: absolute; background-color: black; top: 0%; left: 0%; transform: rotate(0deg) scale(1.005);"><source type="video/mp4"></video>

![2. 纸艺动画配图](https://pbs.twimg.com/amplify_video_thumb/2093613900596166656/img/84q7WKxaVqTGK8T2.jpg?name=large)

③ 纸艺机械动画 （地球为什么有晨昏变化）

## 3\. MV制作

[歌词贴字 MV Skill](https://github.com/MiniMax-AI/MiniMax-H3/tree/main/skills/music-video-subtitle-generator) 不把文字当普通字幕，而是把人物卡、场景卡和文字包装卡分开，让歌词、口型、表演、空间文字和 Master Audio 对齐。短片最重要的是限制一次只出现一个主文字事件，并让可见文字逐字对应正在演唱的歌词。

本节放一个 Ref2VA 案例：原创歌手、原创排练室、原创文字包装与 5 秒原创音频共同生成 MOVE WITH THE LIGHT。它专门测试人物身份、单行歌词、嘴型和鼓点能否在同一时间线上成立。

![3. MV制作配图](https://pbs.twimg.com/media/HQ4mufpacAAJ8kd?format=jpg&name=large)

<video preload="none" tabindex="-1" playsinline="" aria-label="嵌入式视频" poster="https://pbs.twimg.com/amplify_video_thumb/2093653406531600384/img/3Wcp-kKfpmAkjjGh.jpg" style="width: 100%; height: 100%; position: absolute; background-color: black; top: 0%; left: 0%; transform: rotate(0deg) scale(1.005);"><source type="video/mp4"></video>

![3. MV制作配图](https://pbs.twimg.com/amplify_video_thumb/2093653406531600384/img/3Wcp-kKfpmAkjjGh.jpg?name=large)

还真挺好的，非常自然

## 4\. 风格化 3D & 手绘实拍融合

[3D 动画短片 Skill](https://github.com/MiniMax-AI/MiniMax-H3/tree/main/skills/3d-animation-short-generator) 强调先锁角色卡和无人物场景卡，再按秒写动作、表情、镜头、空间、声音和交接；

<video preload="none" tabindex="-1" playsinline="" aria-label="嵌入式视频" poster="https://pbs.twimg.com/amplify_video_thumb/2093659562016641024/img/mC600sEev-w0xCfC.jpg" style="width: 100%; height: 100%; position: absolute; background-color: black; top: 0%; left: 0%; transform: rotate(0deg) scale(1.005);"><source type="video/mp4"></video>

![4. 风格化 3D & 手绘实拍融合配图](https://pbs.twimg.com/amplify_video_thumb/2093659562016641024/img/mC600sEev-w0xCfC.jpg?name=large)

[手绘实拍融合 Skill](https://github.com/MiniMax-AI/MiniMax-H3/tree/main/skills/handdrawn-live-video-generator) 则要求二维手绘实体先与真实手或物体接触，再作为同一个实体连续变形，由慢半拍的手机镜头追随。

<video preload="none" tabindex="-1" playsinline="" aria-label="嵌入式视频" poster="https://pbs.twimg.com/amplify_video_thumb/2093671117710110720/img/tgn3xBZoDxbV6kMX.jpg" style="width: 100%; height: 100%; position: absolute; background-color: black; top: 0%; left: 0%; transform: rotate(0deg) scale(1.005);"><source type="video/mp4"></video>

![4. 风格化 3D & 手绘实拍融合配图](https://pbs.twimg.com/amplify_video_thumb/2093671117710110720/img/tgn3xBZoDxbV6kMX.jpg?name=large)

## 5\. 双人合作游戏开场与 UI 动效

[双人游戏开场 Skill](https://github.com/MiniMax-AI/MiniMax-H3/tree/main/skills/co-op-game-intro-generator) 的关键不是生成一张“游戏感”图片，而是先用确认首图锁定两位角色、玩家名、游戏名、颜色、按钮、图标和字体，再只让视频改变选中状态与角色反应。

本节放一个 I2VA 案例：原创双人菜单 TWIN SIGNAL。5 秒内只完成光标移动、按钮点击、两位角色的小幅反应和最终 CONTINUE 锁定，不进入第二个页面，也不增加新的 UI。

<video preload="none" tabindex="-1" playsinline="" aria-label="嵌入式视频" poster="https://pbs.twimg.com/amplify_video_thumb/2093711379090051072/img/xu9IiOg4MXDXHNYa.jpg" style="width: 100%; height: 100%; position: absolute; background-color: black; top: 0%; left: 0%; transform: rotate(0deg) scale(1.005);"><source type="video/mp4"></video>

![5. 双人合作游戏开场与 UI 动效配图](https://pbs.twimg.com/amplify_video_thumb/2093711379090051072/img/xu9IiOg4MXDXHNYa.jpg?name=large)

**以下内容可以直接发给你的Agent**

## 二、分析 H3 的提示词写作规范

MiniMax 已经公开了完整的 [H3 Prompt Writing Skill](https://github.com/MiniMax-AI/MiniMax-H3/tree/main/skills/h3-prompt-writing)。其中，[Base Modes Prompt Guide](https://github.com/MiniMax-AI/MiniMax-H3/blob/main/skills/h3-prompt-writing/references/base-en.txt) 对应 T2VA、I2VA、FL2VA 和 L2VA，[Ref2VA Prompt Guide](https://github.com/MiniMax-AI/MiniMax-H3/blob/main/skills/h3-prompt-writing/references/ref-en.txt) 对应多图片、参考视频和参考音频。

官方基础模式使用三个核心字段：

```text
integrated_multimodal_description:
[按时间线描述画面、动作、镜头、对白和剧情内声音]

overall_soundscape:
[环境声、动作声、非语言人声]

non_diegetic_music:
[只有观众听见、角色听不见的配乐]
```

Ref2VA 使用六段式结构：

```text
subject_definitions
summary
retention_analysis
detailed_description
overall_soundscape
non_diegetic_music
```

我把官方字段重新整理成一个更适合填写的顺序：先想清楚素材分别负责什么，再写全片视觉系统、时间线、动作、镜头、声音、转场和结尾，最后映射回官方字段。

## 1\. 先确定任务和模式

先写四件事：用途、时长与比例、输入模式、是否需要原生声音。

- 没有输入素材，从文字开始：T2V。
- 用一张图锁定开场、人物或产品：I2V。
- 同时控制起点与终点：FL2V。
- 只给尾帧，让视频逐渐收敛到目标画面：L2V。
- 同时使用多张图片、参考视频或参考音频：Ref2VA。

## 2\. 先给素材分工

Ref2VA 的关键不是可以塞多少素材，而是每份素材分别控制什么。

官方规范要求保持稳定标签，例如：

```text
<Picture 1>：负责人物身份和服装。
<Picture 2>：负责产品外观、颜色和 Logo。
<Video 1>：负责主体动作和镜头运动。
<Audio 1>：负责音色与节奏。
```

随后在 retention\_analysis 中说明素材是完全保留、部分复制、只作参考，还是允许修改。不要让两张图片同时负责人物身份，也不要让参考视频里的服装在没有说明的情况下覆盖图片中的服装。

**可以先填一张分工表：**

![2. 先给素材分工配图](https://pbs.twimg.com/media/HQ3iL-kaYAEE3qP?format=png&name=large)

## 3\. 再定全片的视觉系统

视觉系统只写会贯穿全片的东西：构图、主色和辅色、材质、光线、空间层次、运动语言。

例如：

```text
中心构图，黑色背景，银灰色金属与半透明玻璃材质。
硬质侧光，前景清晰，背景只保留少量冷色光点。
全片运动克制，只使用缓慢推近和小幅环绕。
不出现暖色光、额外文字或其他品牌元素。
```

这比“高级、电影感、未来感、奢华、科技、梦幻”连续堆在一起更容易执行。风格词可以保留，但它们需要落实到颜色、材质、光线和运动上。

## 4\. 单独列出屏幕文字

官方规范要求把画面中真实可见的文字放在英文双引号中，并保留原文，不做翻译。

把文字拆成三个状态：

1. 进入中：允许位移、缩放、旋转或由遮罩揭示。
2. 可读中：保持完整、锐利，不添加运动模糊。
3. 退出中：由已经出现的线条、色块、字形或镜头运动带走。

如果没有文字，就明确写“无屏幕文字”。如果有文字，只列唯一允许出现的内容，例如：

```text
唯一允许出现的屏幕文字为 "MiniMax H3"。
00:04.000—00:05.000 文字保持居中、稳定、清晰，无运动模糊。
禁止出现额外字符、伪文字和其他 Logo。
```

## 5\. 按时间线写主体动作和镜头

官方指南要求后续镜头使用精确切点，例如 \[Shot 2\] At 00:05.000。每段时间里最好只有一个主导变化。

可以固定按这个顺序写：

```text
起始状态 → 主导变化 → 主体动作 → 运镜 → 转场交接 → 声音 → 落点
```

主体动作使用能够直接观察的动词：抬头、转身、伸手、打开、落下、向左移动。不要把“人物更有感染力”“产品显得更高级”当成动作。

运镜则写成：

```text
运动类型 + 幅度 + 速度 + 跟随对象
```

例如：

- 镜头缓慢推近，始终对准产品正面的 Logo。
- 镜头快速向右横移，跟随跑动中的人物。
- 镜头以小幅、正常速度绕产品顺时针环绕。

同一时间段不要同时要求推近、摇镜、环绕和快速变焦。镜头运动应该服务当前的主动作。

I2VA 还要说明输入图片与 00:00.000 对齐。FL2VA 不要分别复述首帧和尾帧，而要写两张图之间能够被观察到的连续变化。L2VA 则从合理的前置状态开始，逐步收敛到指定尾帧。

## 6\. 把声音也写进时间线

官方把声音分成两部分：

- overall\_soundscape：环境声、动作声、非语言人声和对白。
- non\_diegetic\_music：角色听不见、只有观众听见的配乐。

有对白时，为人物使用稳定编号 (S1)、(S2)，保留对白原本的语言和标点。例如：

```text
At 00:03.000, (S1) looks toward the camera and says: “现在开始。”
```

不要只写“加入有氛围感的音乐”。要说明音乐什么时候进入、强弱如何变化、在哪个动作上形成重音，以及最后如何结束。

## 7\. 规定转场怎样继承

多镜头提示词需要回答两个问题：上一段留下了什么？下一段把它变成了什么？

常用方法包括连续继承、物理遮挡、字形或负空间转场、同向运镜匹配切，以及跟随节拍的硬切。连续动画还可以指定一条贯穿全片的运动元素，例如光带、色块、笔触、线条或烟雾轨迹。

如果选择一条红色光带作为继承物，就要在相关段落反复说明它的颜色、材质、可见状态和下一步去向。只在开头提一次，后面让模型自行记住，通常不够。

产品广告和节奏短片也可以直接硬切，但产品外观、主色和声音节拍仍应保持一致。

## 8\. 明确最后停在哪里

最后一段不要继续增加动作。分别写清楚镜头、主体、文字和声音如何停止。

例如：

```text
00:04.000—00:05.000 镜头停止推进，产品保持正面居中。
屏幕文字 "MiniMax H3" 稳定清晰，无运动模糊。
环境声逐渐减弱，音乐在 00:05.000 干净结束。
不再出现新动作、新物体或额外文字。
```

对文字和产品展示，最后留出约半秒到一秒的稳定画面，通常比一直运动到最后一帧更实用。这是结合实际案例整理出的推荐写法，不是官方保证。

## 9\. 可复制的 H3 Prompt Spec

下面这份模板先用来梳理任务。填完以后，再把时间线放进官方的 integrated\_multimodal\_description 或 detailed\_description，把声音分别放进 overall\_soundscape 和 non\_diegetic\_music。

```text
【任务】
用途：
时长与比例：
模式：T2VA / I2VA / FL2VA / L2VA / Ref2VA
是否需要原生声音：

【参考素材分工】
<Picture 1>：
<Picture 2>：
<Video 1>：
<Audio 1>：
必须保持：
允许变化：

【视觉系统】
构图：
主色与辅色：
材质与光线：
空间层次：
运动语言：
不允许出现：

【文字清单】
唯一允许出现的文字：
进入方式：
稳定可读状态：
退出方式：

【连续性规则】
转场方式：
贯穿全片的运动元素（如需要）：

【时间线】
00:00—00:__
起始状态：
主导变化：
主体动作：
运镜：
转场交接：
声音：
本段落点：

00:__—00:__
起始状态：
主导变化：
主体动作：
运镜：
转场交接：
声音：
本段落点：

【最终锁定】
镜头：
主体或产品：
文字：
声音：

【禁止项】
额外文字、错拼或伪文字、素材角色串用、外观或颜色漂移、
随机动作、无来源转场、可读文字上的运动模糊、结尾继续生成新动作。
```

这份模板是创作层。真正提交时仍使用官方结构：

![9. 可复制的 H3 Prompt Spec配图](https://pbs.twimg.com/media/HQ3ifppbsAAPazT?format=png&name=large)

## 三、如何低成本使用 H3产出高质量内容

低成本使用 H3，真正有用的是控制生成顺序：

**短时长、低分辨率验证 → 正式时长 → 只给入选版本升 2K**

**第一轮：验证素材关系和主动作**

先用 5 秒、低分辨率检查四件事：主体是否正确、不同素材有没有串用、主动作能不能成立、镜头方向是否符合预期。

这一轮不追求最终纹理，也不要同时测试多段对白、复杂文字和多次转场。它只负责证明视频结构能够成立。

**第二轮：生成正式时长**

第一轮通过以后，再扩展到正式时长。这时重点看时间分配：动作有没有足够时间完成，转场是否接得上，文字能否留下稳定可读的区间，声音有没有明确的进入和结束。

如果这些问题还没解决，提高分辨率不会让内容变得更正确，只会让同一条废片生成得更慢。

**第三轮：只给入选版本升 2K**

先从正式时长的结果中选出动作、镜头和声音都成立的版本，再进行 2K 或高清修复。没有入选的版本停在验证阶段，不继续投入时间。

**控制成本的关键很简单：把最贵、最慢的一步留给已经确认值得保留的内容。**

**🥳****感谢看到这里，我是阿哲，欢迎关注我** [@Formulasearch](https://x.com/Formulasearch) **我会持续分享提示词，工具教程，实践经验。**

## 数据结果

- 渠道：x
- 展现：
- 点赞：
- 转发：
- 评论：
- 互动：
- 详情展开：
- 主页访问：
- 收藏：
- 私信 / 新增关注：

## 为什么表现好 / 不好

- 待补数据。

## 值得沉淀的资产

- 主题母题：
- 案例：
- 表达：
- 长文方向：
- 下次复盘重点：
