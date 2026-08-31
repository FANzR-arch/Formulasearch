# Formulasearch

[rzcthink.top](https://rzcthink.top) 是阿哲 Phil / Fan Zheren 的个人网站与公开创作档案。它不是一份单一的求职作品集，而是把设计实践、AI 协作、写作、可复用 Skills 与日常观察放在同一个持续更新的入口。

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
