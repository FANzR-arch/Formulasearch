---
title: "从零开始用 ComfyUI 跑 MiniMax H3：本地安装、云端和视频工作流"
description: "面向新手说明如何检查硬件、选择本地或云端环境，并在 ComfyUI 中从官方 MiniMax H3 模板开始生成第一条带声音的视频。"
pubDate: 2026-08-26
sourceId: "2026-08-26"
slug: comfyui-minimax-h3-beginner-guide
category: ai-practice
tags: ["ComfyUI","MiniMax H3","视频生成"]
cover: "/uploads/blog/2026-08-26/HQoYsu6bQAAa-oR.jpg"
coverAlt: "深色 ComfyUI 模板窗口展示 MiniMax H3 图生视频、参考生视频与文生视频卡片，右侧任务队列正在运行视频放大流程"
titleEn: "Run MiniMax H3 in ComfyUI from Scratch: Local, Cloud, and Video Workflows"
descriptionEn: "A beginner guide to checking hardware, choosing local or cloud execution, and generating a first video with audio from the official MiniMax H3 templates in ComfyUI."
coverAltEn: "A dark ComfyUI template browser shows MiniMax H3 image-to-video, reference-to-video, and text-to-video cards beside an active processing queue"
contentStatus: full
featured: false
draft: false
externalLinks:
  - label: "x"
    url: "https://x.com/Formulasearch/status/2092513573230833756"
---
![文章内容配图](https://pbs.twimg.com/media/HQoVSsAbMAAih3E?format=jpg&name=large)

**ComfyUI 看起来像一块接满电线的电路板，新手非常劝退，但连连看大家应该都玩过，道理都是一样的。而对于官方的默认工作流，甚至不需要任何连节点的操作，直接用就行了。**

**在使用comfyui之前，先做这三件事：**

1. 看电脑能不能跑。
2. 决定用本地还是云端。
3. 打开官方 MiniMax H3 模板，生成一条 5 秒视频。

**后面的高清修复、参考图、首尾帧和长视频，都建立在这条基础链路已经跑通的前提上。**

**MiniMax H3 是最近非常火热的开源大模型，可以说是开源的同时，又能实现了seedance2.0的能力（天下苦即梦久矣！）**

可以在 ComfyUI 中生成带同步声音的视频。官方模板已经覆盖文生视频、图生视频和参考生视频，不需要新手从空白画布自己接节点。

## 一、先检查自己的电脑

本地跑视频，最重要的不是 CPU，而是显卡和显存。

最简单的检查方法

![一、先检查自己的电脑配图](https://pbs.twimg.com/media/HQobE8DawAAcnL2?format=png&name=large)

在 Windows 中按 Ctrl + Shift + Esc 打开任务管理器，进入：

**性能 → GPU**

记下两项：

- 显卡名称，例如我的是 NVIDIA GeForce RTX 4080 Laptop GPU。
- 专用 GPU 内存，也就是常说的显存，例如 12GB。

然后查看：

**性能 → 内存**

记下电脑内存是 16GB、32GB 还是 64GB。

最后打开“此电脑”，确认准备安装 ComfyUI 的磁盘还有多少空间。

NVIDIA 用户也可以打开 PowerShell，输入：

```powershell
nvidia-smi --query-gpu=name,memory.total,driver_version --format=csv,noheader
```

查看内存和磁盘：

```powershell
Get-CimInstance Win32_ComputerSystem |
  Select-Object @{Name="MemoryGB";Expression={[math]::Round($_.TotalPhysicalMemory / 1GB)}}

Get-PSDrive -PSProvider FileSystem |
  Select-Object Name,@{Name="FreeGB";Expression={[math]::Round($_.Free / 1GB)}}
```

**怎么判断能不能跑**

ComfyUI 官方没有给 H3 写一个“低于多少显存绝对不能运行”的保证表。量化、内存卸载、分辨率和时长都会改变结果。下面是更实用的选择建议，不是官方最低配置：

![一、先检查自己的电脑配图](https://pbs.twimg.com/media/HQoUcjwasAAvIC2?format=jpg&name=large)

当前 H3 模型仓库中，一套常见的精简 T2V/I2V 组合，包括量化扩散模型、文本编码器、视频 VAE、音频 VAE 和 Turbo LoRA，合计大约 **45GB**。增加 R2V 参考生视频权重后，还要再准备约 **23GB**。实际下载内容以 ComfyUI 模板弹窗为准，建议至少留出 70–100GB 空间。

以我的电脑为例：RTX 4080 Laptop 12GB 显存、约 32GB 内存。适合先从 **864×480、5 秒、Turbo 8 步**开始，不适合第一条就硬跑 1344×768、15 秒。

X 上也有人用 RTX 3060 12GB 跑通 864×480、10 秒的视频，但耗时约 7 分钟。这只能说明低显存有可行路径，不能理解为每一台 12GB 电脑都能无条件复现。

## 二、在 Windows 安装 ComfyUI

新手直接使用官方 **Comfy Desktop**。ComfyUI 官方仓库也把 Desktop 称为 Windows 和 macOS 上最容易的使用方式。

![二、在 Windows 安装 ComfyUI配图](https://pbs.twimg.com/media/HQoZCrYbcAAbHZ2?format=jpg&name=large)

## 安装步骤

1. 打开 [ComfyUI 官方下载页](https://comfy.org/download)。
2. 下载 Windows 安装程序。
3. 运行 .exe，按提示完成安装。
4. 第一次打开时创建一个 ComfyUI installation。
5. 把安装目录和共享模型目录放在空间充足的磁盘。
6. 等初始化完成，打开 ComfyUI 界面。

官方给 Desktop 本身建议的基础磁盘空间约为 4.85GB，但这不包含 H3 的几十 GB 模型。不要把 ComfyUI 主程序大小和模型空间混在一起。

第一次打开后，先不要安装一堆第三方节点。只确认三件事：

- 界面可以打开。
- 模板库可以加载。
- 队列面板没有启动错误。

手动安装、Portable 版本和自己配置 Python 更适合已经知道虚拟环境、PyTorch 与 CUDA 是什么的人。新手没有必要从最复杂的路线开始。

## 三、电脑不合适时，直接用云端 ComfyUI

最简单的云端方案是官方 [Comfy Cloud](https://comfy.org/cloud)。它不需要本地安装，模型和常用节点已经准备好，操作界面与本地 ComfyUI 基本一致。

![三、电脑不合适时，直接用云端 ComfyUI配图](https://pbs.twimg.com/media/HQoZXx_aUAAuXTo?format=jpg&name=large)

**云端操作**

1. 打开 Comfy Cloud 并登录。
2. 在左侧点击模板图标。
3. 进入视频分类，搜索 MiniMax H3。
4. 选择 T2V 或 I2V 模板。
5. 修改提示词，I2V 再上传输入图片。
6. 点击 Run，或按 Ctrl + Enter。
7. 在 Queue 面板等待生成。
8. 在视频播放器右下角菜单中选择 Download。

Comfy Cloud 是订阅服务，价格可能变化，使用前看[实时定价页](https://www.comfy.org/cloud/pricing)。官方文档说明，GPU 只在会话实际运行时计费，关闭浏览器标签页后会话自动停止。

云端适合先验证工作流。它的限制也很清楚：只能使用平台提供的模型和节点，不能像本地版本一样随意修改所有文件。后面要安装小众插件、管理自己的大模型，还是本地更自由。

**此外还有很多现成的网站可以使用，比如libtv，runninghub之类的，但这里就不打广告了，可以自行选择。**

## 四、用 H3 生成第一条视频

<video preload="none" tabindex="-1" playsinline="" aria-label="嵌入式视频" poster="https://pbs.twimg.com/amplify_video_thumb/2092509535932178434/img/-WapUNwreT8XrM5C.jpg" style="width: 100%; height: 100%; position: absolute; background-color: black; top: 0%; left: 0%; transform: rotate(0deg) scale(1.005);"><source type="video/mp4"></video>

![四、用 H3 生成第一条视频配图](https://pbs.twimg.com/amplify_video_thumb/2092509535932178434/img/-WapUNwreT8XrM5C.jpg?name=large)

**先用官方 T2V，也就是文生视频。**

## 第一步：打开官方模板

![第一步：打开官方模板配图](https://pbs.twimg.com/media/HQoWuxtbsAA6nCx?format=jpg&name=large)

确认 ComfyUI 版本不低于 **0.30.0**，新安装则直接保持最新版。

进入：

**模板库 → 视频 → MiniMax H3 → Text to Video**

🔺注意，模板第一次加载时会提示下载缺失模型。按弹窗选择官方模型即可。**下载很大，开始前确认磁盘空间和网络。**

## 第二步：只改四个地方

![第二步：只改四个地方配图](https://pbs.twimg.com/media/HQoXRB_akAAbXTX?format=jpg&name=large)

第一次不要动其他节点，只改：

- 提示词
- 宽高比
- 分辨率
- 时长

12GB 显存可以先用：

- 画面：16:9
- 分辨率：约 0.4MP，例如 864×480
- 时长：5 秒
- Turbo：开启
- Turbo steps：8

这套参数的目的只是验证环境，不代表最终质量。

## 第三步：写一个完整但不复杂的提示词

H3 的提示词最好同时说明场景、动作、镜头和声音。例如：

```text
黄昏的海边，一位穿白色风衣的年轻女性站在潮水边。
镜头从中景缓慢推近，海风吹动她的头发和衣角。
远处传来海浪声和轻柔的环境音乐，无对白。
单镜头，5 秒，写实电影感。
```

第一条只做一个镜头。不要同时要求换三个地点、五次转场、复杂对白和十几个动作。

第四步：运行和保存

点击 Run，或按 Ctrl + Enter。

如果成功，视频会出现在保存节点和 Queue 历史中。先保存这条测试视频，再逐步提高分辨率或时长。不要在基础工作流还会报错时安装高级插件。

## 五、用一张图片生成视频

![五、用一张图片生成视频配图](https://pbs.twimg.com/media/HQoXvR0bsAAwKu8?format=jpg&name=large)

打开官方 **Image to Video** 模板。

![五、用一张图片生成视频配图](https://pbs.twimg.com/media/HQoX3BLa8AAveYD?format=jpg&name=large)

1. 在 Load Image 节点上传图片。
2. 把图片作为 first\_frame。
3. 提示词只描述接下来发生的动作、镜头和声音。
4. 保持 5 秒和较低分辨率，先运行一次。

例如：

```text
人物缓慢抬头看向镜头，轻轻呼吸。镜头稳定地向前推进。
头发被微风吹动，背景树叶发出轻微沙沙声，无对白。
保持人物身份、服装、光线和背景结构。
```

如果希望视频从 A 画面过渡到 B 画面，再把第二张图片接到 last\_frame。H3 会生成两张关键帧之间的运动。首帧和尾帧都不是必填，也可以只控制其中一端。

## 六、基础跑通以后，再加这些工作流

不要一次全部安装。按自己的问题选择一个。

**1\. 高清修复与二次精修**

正确顺序是：

**低分辨率试动作 → 选中满意版本 → 放大或二次采样 → 导出**

[H3 Director](https://github.com/AIMixer/ComfyUI_MiniMaxH3_Director) 提供 Refine、Upscale 和 latent upscale，可以保留一采结果并对比二采结果。也可以使用官方托管的 2K 路线。不要把第一轮测试直接设成 2K，那只会让每次试错更慢。

**2\. 多张参考图、参考视频和参考音频**

官方 R2V 模板使用另一套 ref2va 权重。它最多支持 9 张参考图、3 个参考视频和 3 段独立音频。

**提示词中要明确分工：**

```text
<Picture 1> 负责人物身份。
<Picture 2> 负责服装。
<Video 1> 负责镜头运动。
<Audio 1> 负责声音风格。
```

[H3 Easy](https://github.com/nkxx188/ComfyUI-MiniMaxH3-Easy) 把图像、视频和音频放到一个 Media 接口，并支持用 @ 选择参考素材。它适合官方 R2V 已经跑通，但觉得原始节点太散的人。

**3\. 首尾帧和任意帧控制**

首尾帧直接使用官方 I2V 模板。

如果要在视频中间强制经过某张图，最新版 ComfyUI 提供 MiniMaxH3AddGuide。它可以把图片、视频片段或音频锚定到任意帧，也可以串联多个 Guide。

这比只控制首尾帧更灵活，但也更容易产生跳变。先用一个中间锚点，不要一次塞满时间轴。

**4\. 长视频续拍和音乐视频**

H3 开放权重的单次生成上限应按约 15 秒理解。更长的视频通常不是一次生成，而是分段续拍再拼接。

[Motion Context MultiRef](https://github.com/seitanism/ComfyUI-H3-Motion-Context-MultiRef) 提供音乐视频和 AV Extension 示例，把前一段的画面、运动和声音上下文带进下一段。它还依赖 VideoHelperSuite、KJNodes、rgthree 等节点，适合基础工作流稳定以后再装。

**5\. 局部重绘、物体移除和扩展画面**

新版本原生 H3 支持 latent noise mask。蒙版为 0 的部分保留，值为 1 的部分重新生成。

它可以只重绘视频的一小块、移除物体或扩展画面。操作前先保存原工作流和原视频，因为视频局部重绘比图片更容易在边缘和时间上出现闪动。

## 七、最常见的五个问题

**① 模型下载到一半，磁盘满了**

先清理或更换模型目录。H3 不是一个小 checkpoint，而是一组扩散模型、文本编码器、视频 VAE、音频 VAE 和 LoRA。

**② 打开工作流，全是红色缺失节点**

官方模板先更新 ComfyUI。第三方工作流则打开 Manager，按缺失节点安装对应仓库，然后重启。不要看到一个红框就搜索并安装十个同名节点。

**③ CUDA out of memory**

先降低分辨率和时长，关闭其他占用显存的软件，再使用量化模型、Turbo 或内存卸载。不要先改一堆采样参数。

**④ 能生成，但速度非常慢**

低显存机器把模型放到系统内存再来回搬运，本来就会慢。12GB 显存“能跑”和 24GB 显存“用得舒服”是两件事。

**⑤ 视频有画面，但动作或声音不对**

缩短提示词，只保留一个场景、一个主要动作和一个镜头。声音也写在同一个提示词里。先把单镜头跑通，再做多段和参考素材。

## 八、一条最稳的学习路线

**如果完全没有用过 ComfyUI，按这个顺序：**

1. 官方 Desktop 或 Comfy Cloud。
2. 官方 H3 T2V，864×480、5 秒、Turbo。
3. 官方 I2V，加入一张首帧。
4. 官方首尾帧。
5. 官方 R2V，多参考素材。
6. H3 Easy，简化日常操作。
7. H3 Director，做分镜、二采和放大。
8. Motion Context MultiRef，做长视频或音乐视频。

<video preload="none" tabindex="-1" playsinline="" aria-label="嵌入式视频" poster="https://pbs.twimg.com/amplify_video_thumb/2092511814039035904/img/4V_v5wvsfgGnoZG1.jpg" style="width: 100%; height: 100%; position: absolute; background-color: black; top: 0%; left: 0%; transform: rotate(0deg) scale(1.005);"><source type="video/mp4"></video>

![八、一条最稳的学习路线配图](https://pbs.twimg.com/amplify_video_thumb/2092511814039035904/img/4V_v5wvsfgGnoZG1.jpg?name=large)

先生成一条能播放的 5 秒视频，再谈高级工作流。ComfyUI 最容易走偏的地方，就是基础链路还没跑通，文件夹里已经装了几十个节点。

## 参考资料

**官方文档**

- [Comfy Desktop for Windows](https://docs.comfy.org/installation/desktop/windows)
- [ComfyUI 系统要求](https://docs.comfy.org/installation/system_requirements)
- [Comfy Cloud 入门](https://docs.comfy.org/get_started/cloud)
- [在 ComfyUI 中使用 MiniMax H3](https://docs.comfy.org/zh/tutorials/video/minimax/minimax-h3)
- [Comfy-Org/MiniMax-H3 模型仓库](https://huggingface.co/Comfy-Org/MiniMax-H3)

**进阶工作流**

- [H3 Director](https://github.com/AIMixer/ComfyUI_MiniMaxH3_Director)
- [H3 Easy](https://github.com/nkxx188/ComfyUI-MiniMaxH3-Easy)
- [Motion Context MultiRef](https://github.com/seitanism/ComfyUI-H3-Motion-Context-MultiRef)

第三方自定义节点会在本机执行代码。只从可信仓库安装，先看 README、更新时间和依赖；不要把含 API Key 的配置文件一起公开。涉及商业使用或不同地区发布时，还应单独检查 MiniMax H3 的当前模型许可证。

**🥳****感谢看到这里，我是阿哲, 前建筑师 → AIGC设计师&架构师**，我会持续分享可实操的AI提示词，工具教程，实践经验。欢迎关注我 [@Formulasearch](https://x.com/Formulasearch)

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
