# 这里是你更新网站的地方

你不需要改 `src/`、`package.json` 或任何代码文件。以后只需要操作本文件夹。

## 最常用的入口

1. 改首页文字：打开 [`site/home.md`](site/home.md)，按里面的提示替换文字。
2. 放首页图片：把图片拖到 [`../public/uploads/home/`](../public/uploads/home/)；再把图片路径填进 `site/home.md` 顶部的 `heroImage`。
3. 新增 Blog：复制 [`blog/2026-07-02`](blog/2026-07-02) 文件夹，改成新的发布日期，再修改里面四个文本文件；封面图片放进 `../public/uploads/blog/同一个日期/`。

网站在本地预览运行时，保存文本或放入图片后会自动刷新。正式部署接通后，同样的文件变更会触发网站重新构建；不需要修改代码。

## 不要动的地方

- 不要修改 `src/`：那是网站的排版和功能。
- 不要修改根目录的 `package.json`：那是构建配置。
- 图片文件名尽量使用英文、小写、短横线，例如 `phil-working-desk.jpg`；不要用空格、中文或括号。

## Blog 内容结构

```text
content/blog/
├─ categories.json       六个文章主题的名称和说明
└─ 2026-07-02/           一篇文章一个日期文件夹
   ├─ 标题.txt
   ├─ 摘要.txt
   ├─ 分类.txt            填 categories.json 中的 id
   └─ 链接.txt            每行一个外链，支持微信和 X

public/uploads/blog/
└─ 2026-07-02/           与文章日期相同
   └─ cover.jpg           文件名不限，目录里放一张封面
```

Blog 页面会自动按日期倒序读取这些内容。`Latest` 显示最近文章，`Series` 按分类整理，`Archive` 显示完整时间归档。

## 后续新增内容的位置

```text
content/
├─ site/                 网站公共文案和首页
├─ blog/                 已接入的文章索引
└─ projects/             后续接入，一个项目一个文件夹
```

当前公开图片放在 `public/uploads/`，因为该目录会被网站直接发布。首页和 Blog 已经接入；Projects、Skills、Lab 等首批真实内容核验完毕后再逐项开放。
