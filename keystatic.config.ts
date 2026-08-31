import { collection, config, fields, singleton } from '@keystatic/core'
import categoriesContent from './content/blog/categories.json'

const requiredText = (label: string, multiline = false, description?: string) => fields.text({
  label,
  multiline,
  description,
  validation: { isRequired: true },
})

const localized = (label: string, multiline = false) => fields.object({
  zh: requiredText('中文', multiline),
  en: requiredText('English', multiline),
}, { label })

const stringList = (label: string, itemLabel = '条目') => fields.array(requiredText(itemLabel), {
  label,
  itemLabel: ({ value }) => value || `新${itemLabel}`,
})

const paragraphList = (label: string, description?: string) => fields.array(requiredText('段落', true), {
  label,
  description,
  itemLabel: ({ value }) => value || '新段落',
  validation: { length: { min: 1 } },
})

const localizedHomepageSchema = {
  name: requiredText('显示姓名'),
  contactLabel: requiredText('联系方式标题'),
  contactEmailPrefix: requiredText('邮箱提示文字'),
  heroImageAlt: fields.text({ label: '首页图片替代文字' }),
  intro: paragraphList('首屏介绍'),
  about: paragraphList('关于我'),
  interest: paragraphList('兴趣'),
  sponsor: requiredText('赞助说明', true),
  identity: stringList('身份', '身份条目'),
  now: fields.array(fields.object({
    number: requiredText('编号'),
    text: requiredText('内容', true),
  }, { label: '正在做' }), { label: '正在做', itemLabel: ({ fields: item }) => item.number.value || '新条目' }),
  work: fields.array(fields.object({
    title: requiredText('标题'),
    description: requiredText('说明', true),
  }, { label: '工作条目' }), { label: '工作', itemLabel: ({ fields: item }) => item.title.value || '新条目' }),
  writing: fields.text({ label: 'Writing 预留内容', multiline: true }),
  resources: fields.text({ label: 'Resources 预留内容', multiline: true }),
}

const categoryOptions = categoriesContent.items.map((category) => ({ label: category.title, value: category.id }))
const linkSchema = fields.object({
  label: fields.select({
    label: '平台',
    options: [
      { label: '微信', value: 'wechat' },
      { label: 'X', value: 'x' },
      { label: '其他原文', value: 'original' },
    ],
    defaultValue: 'original',
  }),
  url: fields.url({ label: '链接', validation: { isRequired: true } }),
}, { label: '外链' })

const catalogItem = fields.object({
  zh: requiredText('中文'),
  en: requiredText('English'),
  externalUrl: fields.url({ label: '外链（可选）' }),
}, { label: '项目条目' })

const catalogSection = fields.object({
  id: requiredText('锚点 ID'),
  label: requiredText('序号'),
  title: localized('标题'),
  description: localized('说明', true),
  items: fields.array(catalogItem, { label: '条目', itemLabel: ({ fields: item }) => item.zh.value || '新条目' }),
}, { label: '分组' })

const catalogPage = fields.object({
  title: localized('SEO 标题'),
  description: localized('SEO 说明', true),
  kicker: localized('眉题'),
  heading: localized('页面标题'),
  intro: localized('页面介绍', true),
  indexLabel: localized('索引标签'),
}, { label: '页面设置' })

const navigationMenuItem = fields.object({
  href: requiredText('链接'),
  label: localized('名称'),
  note: localized('说明'),
}, { label: '子菜单' })

const localizedFieldRecord = (labels: Record<string, string>) => Object.fromEntries(
  Object.entries(labels).map(([key, label]) => [key, localized(label)]),
)

export default config({
  storage: { kind: 'local' },
  locale: 'zh-CN',
  ui: {
    brand: { name: 'Formula 内容后台' },
    navigation: {
      '首页': ['homeShared', 'homeZh', 'homeEn'],
      'Blog': ['blogPosts', 'blogCategories', 'blogSeries', 'blogSettings', 'blogNavigation'],
      '作品与档案': ['catalog', 'partners', 'architectureProjects', 'architecturePage'],
      '高级设置': ['navigation', 'pageMeta', 'siteIdentity', 'uiCopy'],
    },
  },
  collections: {
    blogPosts: collection({
      label: 'Blog 文章',
      slugField: 'sourceId',
      path: 'content/blog/*/index',
      format: { contentField: 'body' },
      entryLayout: 'content',
      schema: {
        sourceId: fields.slug({ name: { label: '内容目录', description: '建议使用 YYYY-MM-DD；它只决定本地目录，不决定公开 URL。' } }),
        title: requiredText('标题'),
        titleEn: fields.text({ label: 'English title' }),
        description: requiredText('摘要', true),
        descriptionEn: fields.text({ label: 'English description', multiline: true }),
        pubDate: fields.date({ label: '发布日期', validation: { isRequired: true } }),
        updatedDate: fields.date({ label: '更新日期' }),
        slug: requiredText('公开 URL slug', false, '小写字母、数字和连字符；不能重复。'),
        category: fields.select({ label: '分类', options: categoryOptions, defaultValue: categoryOptions[0]?.value ?? '' }),
        series: fields.text({ label: '系列 ID（可选）' }),
        contentLanguage: fields.select({
          label: '正文语言',
          options: [{ label: '简体中文', value: 'zh-Hans' }, { label: 'English', value: 'en' }],
          defaultValue: 'zh-Hans',
        }),
        tags: stringList('标签', '标签'),
        cover: fields.image({
          label: '封面原图',
          directory: 'public/uploads/blog',
          publicPath: '/uploads/blog',
          validation: { isRequired: true },
          description: '保存原图；准备预览时自动生成 WebP、AVIF 和媒体清单。',
        }),
        coverAlt: requiredText('封面中文描述'),
        coverAltEn: fields.text({ label: 'Cover alt (English)' }),
        contentStatus: fields.select({
          label: '内容状态',
          options: [{ label: '完整正文', value: 'full' }, { label: '仅索引/外链', value: 'index-only' }],
          defaultValue: 'full',
        }),
        featured: fields.checkbox({ label: '首页精选', defaultValue: false }),
        draft: fields.checkbox({ label: '草稿（不公开）', defaultValue: true }),
        externalLinks: fields.array(linkSchema, { label: '外链', itemLabel: ({ fields: item }) => item.url.value || '新外链' }),
        body: fields.markdoc({
          label: '正文',
          extension: 'md',
          options: {
            bold: true,
            italic: true,
            heading: true,
            blockquote: true,
            orderedList: true,
            unorderedList: true,
            link: true,
            divider: true,
            codeBlock: true,
            image: { directory: 'public/uploads/blog', publicPath: '/uploads/blog' },
          },
        }),
      },
    }),
    architectureProjects: collection({
      label: 'Architecture 项目',
      slugField: 'slug',
      path: 'content/architecture/*/index',
      format: 'json',
      schema: {
        slug: fields.slug({ name: { label: '项目 slug' } }),
        index: requiredText('排序编号'),
        year: fields.integer({ label: '项目年份', validation: { min: 1900, max: 2100, isRequired: true } }),
        title: localized('项目标题'),
        summary: localized('项目说明', true),
        cover: fields.image({
          label: '项目封面',
          directory: 'src/assets/archive/architecture',
          publicPath: '/src/assets/archive/architecture',
          validation: { isRequired: true },
        }),
        links: fields.array(fields.object({
          label: localized('链接名称'),
          href: fields.url({ label: '链接', validation: { isRequired: true } }),
        }, { label: '项目链接' }), { label: '项目链接', itemLabel: ({ fields: item }) => item.label.fields.zh.value || '新链接' }),
        images: fields.array(fields.object({
          image: fields.image({
            label: '图片',
            directory: 'src/assets/archive/architecture',
            publicPath: '/src/assets/archive/architecture',
            validation: { isRequired: true },
          }),
          alt: localized('图片描述'),
          index: requiredText('排序编号'),
          layout: fields.select({
            label: '版式',
            options: ['hero', 'portrait', 'landscape', 'square', 'wide'].map((value) => ({ label: value, value })),
            defaultValue: 'landscape',
          }),
          tags: stringList('标签', '标签'),
          label: localized('图片名称'),
          caption: localized('图片说明', true),
        }, { label: '项目图片' }), { label: '项目图片', itemLabel: ({ fields: item }) => item.label.fields.zh.value || '新图片' }),
      },
    }),
  },
  singletons: {
    homeShared: singleton({
      label: '首页共享设置', path: 'content/site/home.shared', format: 'json', schema: {
        email: requiredText('邮箱'),
        social: fields.object({ label: requiredText('显示名称'), url: fields.url({ label: '链接', validation: { isRequired: true } }) }, { label: '社交账号' }),
        heroImage: fields.image({ label: '首页图片', directory: 'public/uploads/home', publicPath: '/uploads/home' }),
        heroImageWidth: fields.integer({ label: '图片宽度', validation: { min: 1 } }),
        heroImageHeight: fields.integer({ label: '图片高度', validation: { min: 1 } }),
      },
    }),
    homeZh: singleton({ label: '中文首页', path: 'content/site/home', format: 'json', schema: localizedHomepageSchema }),
    homeEn: singleton({ label: '英文首页', path: 'content/site/home.en', format: 'json', schema: localizedHomepageSchema }),
    blogCategories: singleton({
      label: 'Blog 分类', path: 'content/blog/categories', format: 'json', schema: {
        items: fields.array(fields.object({
          id: requiredText('分类 ID'), title: requiredText('中文名称'), titleEn: requiredText('English name'), description: requiredText('说明', true),
        }, { label: '分类' }), { label: '分类', itemLabel: ({ fields: item }) => item.title.value || '新分类' }),
      },
    }),
    blogSeries: singleton({
      label: 'Blog 主题', path: 'content/site/blog-series', format: 'json', schema: {
        items: fields.array(fields.object({
          id: requiredText('主题 ID'), title: localized('标题'), description: localized('说明', true), categoryIds: stringList('分类 ID', '分类 ID'),
        }, { label: '主题' }), { label: '主题', itemLabel: ({ fields: item }) => item.title.fields.zh.value || '新主题' }),
      },
    }),
    blogSettings: singleton({
      label: 'Blog 展示设置', path: 'content/site/blog-settings', format: 'json', schema: {
        featuredCount: fields.integer({ label: '精选数量', validation: { min: 1 } }),
        relatedCount: fields.integer({ label: '相关文章数量', validation: { min: 1 } }),
        readingUnitsPerMinute: fields.integer({ label: '每分钟阅读单位', validation: { min: 1 } }),
      },
    }),
    blogNavigation: singleton({
      label: 'Blog 页内导航', path: 'content/site/blog-navigation', format: 'json', schema: {
        ariaLabel: localized('无障碍名称'),
        items: fields.array(fields.object({ id: requiredText('ID'), href: requiredText('链接'), label: localized('名称') }, { label: '导航项' }), { label: '导航项', itemLabel: ({ fields: item }) => item.id.value || '新导航项' }),
      },
    }),
    catalog: singleton({
      label: 'Projects / Skills / Lab', path: 'content/site/catalog', format: 'json', schema: {
        projects: fields.array(catalogSection, { label: 'Projects 分组', itemLabel: ({ fields: item }) => item.title.fields.zh.value || '新分组' }),
        skills: fields.array(catalogSection, { label: 'Skills 分组', itemLabel: ({ fields: item }) => item.title.fields.zh.value || '新分组' }),
        lab: fields.array(catalogSection, { label: 'Lab 分组', itemLabel: ({ fields: item }) => item.title.fields.zh.value || '新分组' }),
        pages: fields.object({ projects: catalogPage, skills: catalogPage, lab: catalogPage }, { label: '页面设置' }),
      },
    }),
    partners: singleton({
      label: 'Partners', path: 'content/site/partners', format: 'json', schema: {
        title: localized('SEO 标题'), description: localized('SEO 说明', true), kicker: localized('眉题'), heading: localized('页面标题'), intro: localized('介绍', true),
        listLabel: localized('列表名称'), relationshipLabel: localized('关系标签'), visitLabel: localized('访问按钮'),
        items: fields.array(fields.object({ name: localized('名称'), url: fields.url({ label: '网址', validation: { isRequired: true } }) }, { label: '伙伴' }), { label: '伙伴', itemLabel: ({ fields: item }) => item.name.fields.zh.value || '新伙伴' }),
      },
    }),
    architecturePage: singleton({
      label: 'Architecture 页面', path: 'content/site/architecture', format: 'json', schema: {
        pageTitle: localized('SEO 标题'), pageDescription: localized('SEO 说明', true), kicker: localized('眉题'), title: localized('页面标题'), description: localized('页面说明', true),
        projectListLabel: localized('项目列表名称'), openProjectLabel: localized('查看项目'), backLabel: localized('返回文字'),
        initialVisibleCount: fields.text({ label: '初始数量', description: '使用 all 显示全部。' }),
        autoLoadBatchSize: fields.integer({ label: '自动加载数量', validation: { min: 1 } }),
        eagerImageCount: fields.integer({ label: '优先图片数量', validation: { min: 1 } }),
        filters: fields.array(fields.object({ id: requiredText('ID'), zh: requiredText('中文'), en: requiredText('English') }, { label: '筛选项' }), { label: '筛选项', itemLabel: ({ fields: item }) => item.zh.value || '新筛选项' }),
      },
    }),
    navigation: singleton({
      label: '全站导航', path: 'content/site/navigation', format: 'json', schema: {
        items: fields.array(fields.object({
          id: requiredText('栏目 ID'), href: requiredText('链接'), label: localized('名称'),
          menu: fields.array(navigationMenuItem, { label: '子菜单', itemLabel: ({ fields: item }) => item.label.fields.zh.value || '新子菜单' }),
        }, { label: '一级栏目' }), { label: '一级栏目', itemLabel: ({ fields: item }) => item.label.fields.zh.value || '新栏目' }),
      },
    }),
    pageMeta: singleton({
      label: '页面 SEO', path: 'content/site/page-meta', format: 'json', schema: {
        home: fields.object({ title: localized('标题'), description: localized('说明', true) }, { label: '首页' }),
        blog: fields.object({ title: localized('标题'), description: localized('说明', true) }, { label: 'Blog' }),
        blogArchive: fields.object({ title: localized('标题'), description: localized('说明', true) }, { label: 'Blog 归档' }),
        blogSeries: fields.object({ title: localized('标题'), description: localized('说明', true) }, { label: 'Blog 主题' }),
        soundPreview: fields.object({ title: localized('标题'), description: localized('说明', true) }, { label: '声音试听' }),
      },
    }),
    siteIdentity: singleton({
      label: '站点身份', path: 'content/site/site', format: 'json', schema: {
        author: fields.object({
          name: requiredText('姓名'), url: fields.url({ label: '个人网址', validation: { isRequired: true } }), alternateNames: stringList('其他名称', '名称'), jobTitle: requiredText('职业'), knowsAbout: stringList('关注领域', '领域'),
        }, { label: '作者' }),
        githubUrl: fields.url({ label: 'GitHub', validation: { isRequired: true } }), name: requiredText('站点名称'), siteUrl: fields.url({ label: '正式域名', validation: { isRequired: true } }),
        themeColors: fields.object({ light: requiredText('浅色'), dark: requiredText('深色') }, { label: '主题颜色' }),
      },
    }),
    uiCopy: singleton({
      label: '常用 UI 文案', path: 'content/site/ui-copy', format: 'json', schema: {
        common: fields.object(localizedFieldRecord({ returnHome: '返回首页' }), { label: '通用' }),
        navigation: fields.object({
          ...localizedFieldRecord({ primary: '主导航', site: '站点导航', backgroundEffect: '背景效果', backgroundCycle: '背景轮换', openNavigation: '打开导航', closeNavigation: '关闭导航', skipToContent: '跳至正文', photos: '摄影', architecture: '建筑', partners: '伙伴', openSection: '展开栏目', closeSection: '关闭栏目', sectionMenu: '栏目菜单', githubProfile: 'GitHub 资料', switchToEnglish: '切换英文', switchToChinese: '切换中文', themeToDark: '切换深色', themeToLight: '切换浅色' }),
          backgroundVariants: fields.object(localizedFieldRecord({ dither: 'Dither', molten: '焦散', contour: '柔波' }), { label: '背景名称' }),
        }, { label: '导航' }),
        blog: fields.object(localizedFieldRecord({ blog: 'Blog', heroEyebrow: '眉题', heroIntro: '介绍', featuredIndex: '精选索引', featuredArticles: '精选文章', archiveHeading: '归档标题', seriesHeading: '主题标题', archiveCountSuffix: '文章数量后缀', sourceLanguageNotice: '语言提示', articleLocation: '文章位置', articleContents: '文章目录', onThisPage: '本页目录', readingTime: '阅读时间', copyLink: '复制链接', copied: '已复制', copyFailed: '复制失败', backToBlog: '返回 Blog', allArticles: '全部文章', originallyPublished: '原文发布', originalPublication: '原文平台', keepReading: '继续阅读', relatedArticles: '相关文章' }), { label: 'Blog' }),
        archive: fields.object(localizedFieldRecord({ filters: '筛选', browse: '浏览', results: '结果数量', note: '档案说明', backToTop: '回到顶部' }), { label: '档案' }),
        platforms: fields.object(localizedFieldRecord({ wechat: '微信', x: 'X', original: '原文' }), { label: '平台' }),
      },
    }),
  },
})
