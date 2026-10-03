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
| [资源](https://rzcthink.top/resources) | 课程、按主题排序的学习路径、工具网站与 AIGC 提示词资源。 |
| [建筑](https://rzcthink.top/architecture) | 建筑设计项目与过程材料，按时间归档。 |
| [图像](https://rzcthink.top/photos) | 摄影、旅行与途中记录的图像片段。 |
| [伙伴](https://rzcthink.top/partners) | 与合作伙伴相关的网站和交付入口。 |
| [声音试听](https://rzcthink.top/sound-preview) | 网站交互声音的试听与来源说明。 |

网站提供中英双语界面、明暗主题、响应式导航，并生成 `sitemap.xml`、`rss.xml` 和 `llms.txt` 等面向发现与分发的文件。

访客与内容兴趣使用免费 GA4 统计，覆盖页面访问、内容点击、前台阅读、照片查看、视频播放和联系入口；仅正式域名的生产版本启用。衡量 ID、事件含义、后台报表配置和验证边界见 [统计说明](docs/ANALYTICS.md)。

桌面滚轮通过 `src/scripts/smooth-scroll.ts` 中的 Lenis 实现惯性滚动（`lerp: 0.095`、原始滚动距离、不吸附整屏）。手机触摸、减少动态效果模式、目录锚点和键盘滚动使用原生行为；弹窗及首页开场期间暂停页面滚动。依赖由 Astro 打包到本站，不依赖运行时 CDN。

站内页面切换保留从被点击链接按钮中心展开的圆形蒙版，使用浏览器原生 View Transition，时长 760ms（`--motion-page-reveal`），先缓后快再轻轻收住，让圆形从按钮处清楚地扩散开。全站动效时长按 `--motion-fast`（150ms，按压与悬停反馈）、`--motion-medium`（250ms，菜单与弹窗）、`--motion-emphasis`（360ms，卡片与媒体移动）分档；系统开启“减少动态效果”时，全站动画与过渡统一降为即时切换。圆心及半径使用视口相对坐标，避免浏览器缩放造成偏移。首页离开时将 WebGL 背景冻结为一张同样式的 2D 位图供过渡截图使用，历史返回时恢复实时背景。新的点击或键盘操作可中断切换；浏览器快照若把点击投到根元素，`site-shell.js` 会在快照结束后将这一次点击交给原位置的真实控件。主题切换也保留圆形展开。`site-shell.js` 在首帧前识别站内到达与已看过的首页开场；`site-header.js` 从公共布局延迟加载并阻止过早截图，避免新页尚未解析完就开始动画。博客不在站内到达时叠加入场动画，Lenis 在页面交接完成后初始化，背景绘制在转场期间暂停；滚动进度使用 ResizeObserver 缓存布局尺寸。圆形蒙版、中途点击、首页首帧、菜单和移动端交接由 `tests/motion-navigation.spec.mjs` 覆盖。

导航链接点击时立即高亮并播放短音效；音频加载或播放失败不会取消、延迟导航。首页未展示的 AI 入口保留布局宽度，保持各页导航点击区域一致。对应回归为 `tests/navigation-audio.spec.mjs`。

首页 Logo 先以主题匹配的实体出现，轮廓光至少播放 3.8 秒，再用 900 毫秒逐渐收光并透出主页，约第 4.75 秒开始柔和加速放大。主页从开场开始就在不透明遮罩后绘制，避免转场时才首次绘制造成停顿。`public/scripts/logo-light-band.js` 复用原始 SVG 路径，让三个强弱不同的亮度波峰沿连续轮廓绕行；光只向实体外侧扩散，轮廓线保持细淡。光带在淡出期间继续流动，放大前释放光效图层。首屏资源最多等待 3 秒，减少动态效果模式跳过开场。开场阶段及资源失败回退由 `tests/home-feedback.spec.mjs` 覆盖。

`src/scripts/navigation-loading.ts` 在 Logo 开场期间就分批准备 7 个主要导航页面。Astro 的 `experimental.clientPrerender` 在支持 Speculation Rules 的浏览器中提前解析、初始化并渲染目标页面，点击时直接激活；悬停或键盘选中链接也会准备对应页面。隐藏的预渲染页面不会继续递归准备其他页面，GA4 只在真实激活后启动，主题和语言在激活时同步最新设置。浏览器拒绝预渲染或不支持时，仍提前缓存 HTML 和本站 `/_astro/` 样式、脚本，缓存回退不加载目标页媒体。预渲染中的图片由浏览器按首屏及原有懒加载策略准备。省流量和 2G 网络跳过后台准备，隐藏标签页暂停队列。现有圆形切页动画保持不变。

回退回归为 `tests/navigation-loading.spec.mjs`。真实预渲染可在静态预览启动后运行 `PLAYWRIGHT_BASE_URL` 指向该预览的 `node scripts/test-navigation-prerender.mjs`；默认使用 Windows Edge，其他环境通过 `PLAYWRIGHT_BROWSER_PATH` 指定 Chromium 浏览器。普通 Playwright 的页面调试连接会关闭 Chromium 预渲染，该验证通过独立临时配置和支持预渲染的 tab 调试目标检查 7 个页面准备、实际激活、主题/语言同步及点击至转场时间。结果写入 `output/navigation-prerender-results.json`。浏览器内存/电量、调试连接及网络设置都可能让预渲染退回普通缓存导航；不能将规则下发等同于预渲染成功。

全站首帧依赖的 shell、导航、音效和玻璃表面脚本通过 Vite `?url` 生成带内容指纹的 `/_astro/` 地址，复用平台长期缓存，避免每次切页重新验证静态脚本；代码更新会生成新地址。静态验证服务器对 `/_astro/` 使用同样的长期缓存策略，避免本地预览重复下载已打包资源而掩盖预加载效果。

`vercel.json` 为公开导航页和博客分类页设置 60 秒浏览器缓存，避免预取后点击仍要网络验证；已访问页面在更新发布后最多延迟一分钟刷新。其他路由保持平台默认缓存。静态验证服务器可用 `HTML_CACHE_CONTROL='public, max-age=60'` 模拟这项浏览器缓存策略；线上响应头需部署后另行核对。

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

建筑列表、建筑详情与摄影缩略图由 Astro 在构建时生成多尺寸 WebP，浏览器按展示宽度选图；摄影灯箱仍打开原图。项目视频封面同样在构建时压缩，视频保留可见后读取元数据、点击播放与原生全屏控件；Skills 封面复用 `ThemeImage`，只请求当前主题的图片。

## 相关链接

- 网站：[rzcthink.top](https://rzcthink.top)
- GitHub：[FANzR-arch](https://github.com/FANzR-arch)
