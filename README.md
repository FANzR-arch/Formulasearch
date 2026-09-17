# Formulasearch

[rzcthink.top](https://rzcthink.top) 是阿哲 Phil 的个人网站与公开创作档案。

## 关于我

我是 Phil，一名独立构建者和设计师。我的探索起于建筑设计，延伸到 AIGC、交互设计、网站与产品实践。我喜欢和 AI 协作：把还不够清晰的概念梳理成可理解、可使用、可继续迭代的内容与工具。

Formulasearch 记录这些过程中的公开成果——一部分来自独立探索，一部分来自与伙伴共同完成的项目。

## 网站内容

| 板块 | 内容 |
| --- | --- |
| [博客](https://rzcthink.top/blog) | AI 与工具、美学系统、个人笔记；文章使用本地媒体、结构化元数据与 RSS 输出。 |
| [项目](https://rzcthink.top/projects) | 产品与工具、网站与交互页面，以及可公开的合作项目。 |
| [Skills](https://rzcthink.top/skills) | 设计技能、Agent 工作流、SOP 与可复用资产索引。 |
| [实验](https://rzcthink.top/lab) | 动态视觉、原型、课程与正在测试的方向。 |
| [建筑](https://rzcthink.top/architecture) | 建筑设计项目与过程材料，按时间归档。 |
| [图像](https://rzcthink.top/photos) | 摄影、旅行与途中记录的图像片段。 |
| [伙伴](https://rzcthink.top/partners) | 与合作伙伴相关的网站和交付入口。 |
| [声音试听](https://rzcthink.top/sound-preview) | 网站交互声音的试听与来源说明。 |

网站提供中英双语界面、明暗主题、响应式导航，并生成 `sitemap.xml`、`rss.xml` 和 `llms.txt` 等面向发现与分发的文件。

桌面滚轮通过 `src/scripts/smooth-scroll.ts` 中的 Lenis 实现惯性滚动（`lerp: 0.095`、原始滚动距离、不吸附整屏）。手机触摸、减少动态效果模式、目录锚点和键盘滚动使用原生行为；弹窗及首页开场期间暂停页面滚动。依赖由 Astro 打包到本站，不依赖运行时 CDN。

站内页面切换保留从被点击链接按钮中心展开的圆形蒙版，使用浏览器原生 View Transition，时长 720ms，采用 linear 匀速展开。圆心及半径使用视口相对坐标，避免浏览器缩放造成偏移。首页离开时将 WebGL 背景冻结为一张同样式的 2D 位图供过渡截图使用，历史返回时恢复实时背景。新的点击或键盘操作可中断切换；浏览器快照若把点击投到根元素，`site-shell.js` 会在快照结束后将这一次点击交给原位置的真实控件。主题切换也保留圆形展开。`site-shell.js` 在首帧前识别站内到达与已看过的首页开场；`site-header.js` 从公共布局延迟加载并阻止过早截图，避免新页尚未解析完就开始动画。博客不在站内到达时叠加入场动画，Lenis 在页面交接完成后初始化，背景绘制在转场期间暂停；滚动进度使用 ResizeObserver 缓存布局尺寸。圆形蒙版、中途点击、首页首帧、菜单和移动端交接由 `tests/motion-navigation.spec.mjs` 覆盖。

导航链接的切页音效由目标页面播放一次固定短音效，避免旧文档卸载截断声音；音频加载或播放失败不会取消、延迟导航。首页未展示的 AI 入口保留布局宽度，保持各页导航点击区域一致。对应回归为 `tests/navigation-audio.spec.mjs`。

## 项目结构

```text
├── content/
│   ├── blog/                 # 博客文章与 frontmatter
│   └── site/                 # 站点文案、导航、路由和内容清单
├── public/
│   ├── uploads/              # 已发布的原始图片与视频
│   └── scripts/              # 客户端交互与渐进增强脚本
├── src/
│   ├── components/           # 页面组件、导航与交互组件
│   ├── layouts/              # 公共页面骨架与 SEO 输出
│   ├── pages/                # Astro 路由（含 /en 英文入口）
│   └── styles/               # 全站与栏目样式
├── scripts/                  # 内容、媒体、静态输出和质量门禁
├── tests/                    # Playwright 交互回归测试
└── docs/                     # 研究、内容盘点与设计决策记录
```

## 本地开发与验证

PersonalAI 聊天窗口的本地预览、正式地址和来源白名单配置见 [接入说明](docs/PERSONAL-AI.md)。生产环境未配置有效正式聊天地址时不显示入口。

```bash
npm install
npm run dev

# 发布前检查
npm run content:check # 内容、i18n、媒体和归档门禁
npm run check         # Astro 类型检查
npm run build         # 静态输出与站内链接检查
npm run test:smoke    # 本地预览下的交互回归
```

## 内容维护原则

- 博客正文的图片和视频使用本站本地资源，保留可访问的替代文本、尺寸与播放控件。
- `content/` 是可发布内容的事实来源；`public/uploads/` 存放对应的已发布媒体。
- 更新内容后，以 `npm run build` 与 `npm run test:smoke` 作为最低验证标准。

## 相关链接

- 网站：[rzcthink.top](https://rzcthink.top)
- GitHub：[FANzR-arch](https://github.com/FANzR-arch)
