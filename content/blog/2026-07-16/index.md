---
title: "前进色 × 后退色：裸眼3D封面图（附提示词 + Skill ）"
description: "利用高饱和前进色与低存在感后退色的视觉差，让平面标题和背景产生分层，做出不依赖设备的裸眼 3D 封面效果。"
pubDate: 2026-07-16
sourceId: "2026-07-16"
slug: advancing-receding-color-3d-cover
category: prompt-aesthetic
tags: ["色彩","封面设计","提示词"]
cover: "/uploads/blog/2026-07-16/HNVwv2OXsAAXVED.jpg"
coverAlt: "深蓝地铁车厢背景上覆盖高饱和品红色前进色与后退色标题，形成强烈的裸眼立体分层"
titleEn: "Advancing × Receding Colors: A Naked-Eye 3D Cover"
descriptionEn: "Use the visual separation between saturated advancing colors and quieter receding colors to make flat titles appear detached from their backgrounds without special hardware."
coverAltEn: "Saturated magenta type advances over a deep-blue subway interior, creating a strong naked-eye illusion of layered depth"
contentStatus: full
featured: false
draft: false
externalLinks:
  - label: "x"
    url: "https://x.com/Formulasearch/status/2077692182509555727"
---
![文章内容配图](https://pbs.twimg.com/media/HNVwwnrXMAAcMWx?format=jpg&name=large)

把手机稍微转一下，或者歪一下头看这张图。文字和背景是不是好像分开了，标题像是浮在照片上面，有种3D的感觉。

## Ⅰ. 颜色为什么会「前进」

所谓前进色，通常就是饱和度高、颜色纯、边缘清楚，对比还很强的颜色。大面积平涂之后，视觉上会很突出，拿来放主标题和图形最合适。

而后退色则安静很多。颜色偏暗、偏冷，再把对比压低，边缘模糊一些，照片自然就往画面里面缩。

前景完全清楚，中间那层稍微糊一点，后景直接失焦。三层别做成一个清晰度，画面才有纵深。

## Ⅱ. 三层要素

## 前景：顶层标题和点缀

前景放主标题、箭头、星芒、涂鸦和小型信息块，统一用一种高饱和专色。渐变、投影、立体高光都先拿掉，只留纯色、锐边和扁平的印刷感。

## 中景：比标题弱，比照片清楚

中景可以放副标题、日期、编号和少量英文短句。它们不能抢过主标题，但要比照片清楚。排版歪一点、错位一点都没关系，也可以让主标题压住一小块。

## 后景：模糊底图

后景就是一张处理过的照片，不必把什么都交代清楚。能看出人物轮廓、空间方向和灯光就够了。再用失焦、拖影、噪点、过曝或低像素，把照片压到文字后面。

## Ⅲ. 简易版提示词分享

▲：可以在下面的几个预设当中，选择一个配色方案：

1. 电光青 × 暖橙夜景（摄影底）：冷冽、都市、适合夜游和街头主题
2. 荧光黄 × 深蓝夜景（摄影底）：醒目、清楚、适合演出和活动海报
3. 亮红 × 冷青夜景（摄影底）：紧张、躁动、适合观点和情绪主题
4. 酸性绿 × 正红（印刷底）：冲突强烈，最接近经典 Acid Graphics
5. 荧光玫红 × 电光蓝（印刷底）：偏 Y2K、数码和未来感
6. 亮黄 × 深紫（印刷底）：对比清楚，适合标题信息较多的海报

```text
为我创作一张「前进色 × 后退色」实验海报。

主题：{填写主题；标题、画幅比例和其他要求也可以统一写在这里，未填写的内容由你决定}

每组配色中，前一个颜色用于前景文字和图形，后一个颜色用于背景色场或照片的主要色温。用户填写自定义配色时，也按「前景色 × 背景主色」的顺序理解。前景始终只用一种专色。

画面分为前景、中景和后景。预设已经标明摄影底或印刷底时，直接使用对应模式；用户自定义配色或没有选择预设时，再根据主题判断：

A. 摄影底
使用深色背景和一张具有纵深的照片。照片保留所选背景主色的主要色温，并加入失焦、噪点、拖影和远景灯光虚化。前景使用所选前景专色，与照片形成明显的冷暖对照。

B. 印刷底
使用所选背景主色铺满画面。照片染成背景同色系，并进行重度模糊、降对比、噪点或拖影处理，只保留氛围和隐约轮廓。前景使用所选前景专色，与背景形成高纯度撞色。

前景规则：
所有主标题、文字、符号、箭头、星芒和涂鸦，只使用配色方案中的前景专色。采用纯色平涂，边缘清晰锐利，像丝网印刷油墨叠印在画面最上层。不要使用渐变、投影、发光和立体光影。

主标题规则：
主标题应像为本张海报单独设计的标题字，而不是标准字体直接排版。可以从断笔切角、挤压碰撞、极端拉伸或压扁、倾斜错位、毛笔出锋、喷漆毛边和丝网印刷缺口中选择两到三种组合。允许夸张变形，但文字必须清楚可读。

中间层：
放置副标题、日期、编号和少量英文短句。清晰度弱于主标题、高于背景。允许错位、倾斜、大小跳跃和局部遮挡。

清晰度分为三档：
前景完全清晰；
中景轻微模糊；
后景明显失焦、拖影或重度模糊。

整体风格介于实验杂志封面、青年文化海报、地下传单、Y2K 和 Acid Graphics 之间。画面可以躁动、粗粝，但必须保留明确的视觉中心和适当留白。

避免：
整张画面统一模糊；
主标题模糊或不可读；
前景同时使用多种颜色；
照片保留完整鲜艳的色彩；
主标题直接使用规整的标准字体；
画面像干净精致的企业宣传海报。
```

## 案例演示（摄影底图&印刷底图）

## 摄影底

![摄影底配图](https://pbs.twimg.com/media/HNVxZ32W8AA2QRz?format=jpg&name=large)

![摄影底配图](https://pbs.twimg.com/media/HNVxdVnWwAAFgi7?format=jpg&name=large)

摄影底会保留照片本来的色温和空间。最省事的做法，是找一张有纵深的夜间照片，把整体压暗，再用一种高饱和专色盖上标题，冷暖关系很容易出来。

它很适合地下演出、城市夜游、便利店、末班车、深夜办公室这些题材。蓝色标题配暖黄街灯，青绿标题压在橙色便利店灯光上，基本不会出错。

## 印刷底

![印刷底配图](https://pbs.twimg.com/media/HNVxiW7XYAAe7Vh?format=jpg&name=large)

![印刷底配图](https://pbs.twimg.com/media/HNVxk3jWIAAxt9w?format=jpg&name=large)

印刷底更直接：先铺满一整片高饱和纯色，再把照片染成同色系，重度模糊、降对比、加颗粒，只留一点轮廓。前景换成冲突明显的专色，比如酸性绿配正红、荧光玫红配电光蓝、亮黄配深紫。颜色可以冲，层次不能乱。

宣言、观点、创刊号、辞职纪念和项目发布，用这类底会更有劲。

## 标题字体的优化

![标题字体的优化配图](https://pbs.twimg.com/media/HNVxnEgXoAA5LY_?format=jpg&name=large)

标题不一定非得用规整的粗黑体。断笔、切角、拉伸、压扁、倾斜、错位、喷漆毛边、丝网印刷缺口，挑两三种混着用就够了。全塞进去只会像字体特效大礼包。

![标题字体的优化配图](https://pbs.twimg.com/media/HNVxpCrWQAA6iI0?format=jpg&name=large)

字形可以夸张，可读性得留住。标题先是信息，然后才是装饰

## 再看几张

![再看几张配图](https://pbs.twimg.com/media/HNVwvNMXMAAk4X9?format=jpg&name=large)

深蓝照片压在后面，荧光色标题顶到最前面。夜间空间还在，第一眼只会先看到标题。

![再看几张配图](https://pbs.twimg.com/media/HNVxr6XXoAAuRCQ?format=jpg&name=large)

高饱和纯色铺底，人物和环境被压成模糊色块，标题和图形保持清楚。

![再看几张配图](https://pbs.twimg.com/media/HNVxum-W4AAWFEk?format=jpg&name=large)

## 完整 Skill 版本

上面的简易版，复制过去就能出图。完整版本我打包成了 Skill。里面有 12 个集中输入字段，会先判断摄影底还是印刷底，再处理前中后景、单一前景专色、照片色温和标题字形。做一组海报时，它也会控制差异，不至于每张只是换个标题。

完整 Skill 和单文件复制版：

[image-prompt-skills/acid-depth-poster at main · FANzR-arch/image-prompt-skills](https://github.com/FANzR-arch/image-prompt-skills/tree/main/acid-depth-poster)

用 Codex 或 Claude Code 安装：

```text
请帮我安装这个 Skill：
image-prompt-skills/acid-depth-poster at main · FANzR-arch/image-prompt-skills
```

装好以后直接这样写：

```text
用 acid-depth-poster，给这篇文章做一张横版 5：2 封面，标题是：前进色×后退色
```

**🥳****感谢看到这里，我是阿哲Phil，"一个自由的提示词诗人"**

欢迎关注我[@Formulasearch](https://x.com/Formulasearch)，我会持续分享：用AI解码美学 × AI实践 × 增长心得，欢迎与我交流~
