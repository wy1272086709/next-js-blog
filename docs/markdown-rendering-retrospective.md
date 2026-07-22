# Markdown 加粗与列表显示问题复盘

## 背景

文章正文使用 `react-markdown` 渲染，编辑器使用 `@uiw/react-md-editor` 提供实时预览。两处都能正确解析 Markdown，但曾出现以下视觉问题：

- 编辑器预览中 `**文本**` 能显示为加粗，文章详情页看起来却没有加粗。
- 无序列表已经生成缩进结构，但列表圆点消失或颜色太浅，特别是嵌套列表几乎不可见。

相关入口：

- 文章详情：`app/[locale]/posts/[id]/page.tsx`
- Markdown 编辑器：`components/react-quill-editor.tsx`
- 全局样式：`app/globals.css`

## 根因

### 1. Typography 插件已安装但未启用

项目依赖中包含 `@tailwindcss/typography`，文章详情页也使用了以下类名：

```tsx
className="prose prose-neutral dark:prose-invert max-w-none"
```

但 `app/globals.css` 没有加载 Typography 插件，因此这些 `prose` 类没有生成预期的排版规则。修复方式：

```css
@plugin '@tailwindcss/typography';
```

### 2. Tailwind reset 清除了列表的浏览器默认样式

Tailwind Preflight 会重置 `ul` 和 `ol` 的默认 `list-style`。Markdown 解析器虽然已经生成了正确的 HTML：

```html
<ul>
  <li>YAML 元数据</li>
</ul>
```

但没有后续排版样式时，页面看不到圆点。这属于 CSS 显示问题，不是 Markdown 解析失败。

### 3. 嵌套列表 marker 太浅

最初为嵌套列表使用了 `circle` 空心圆，同时 Typography 的 marker 颜色偏浅。在当前页面字号和背景下，圆点实际存在，但视觉上接近消失。

## 最终方案

### 启用标准 Markdown 排版

在 `app/globals.css` 中启用 Typography，使 `prose` 正确处理标题、段落、加粗、列表、引用和表格等元素。

### 使用独立作用域

文章详情和编辑器预览使用不同的作用域，避免 Markdown 样式影响编辑器工具栏：

```tsx
// 文章详情
<div className="article-markdown markdown-body prose ...">

// 编辑器
<div className="markdown-editor ...">
```

对应 CSS 只匹配正文区域：

```css
.article-markdown strong,
.markdown-editor .wmde-markdown strong {
  font-weight: 700;
}

.article-markdown ul,
.markdown-editor .wmde-markdown ul {
  list-style-type: disc;
  list-style-position: outside;
  padding-left: 1.5rem;
}

.article-markdown li::marker,
.markdown-editor .wmde-markdown li::marker {
  color: currentColor;
  font-size: 1em;
  opacity: 1;
}
```

所有无序列表层级统一使用清晰的实心圆点。嵌套关系仍通过缩进表达，不依赖颜色很浅的空心 marker。

## 如何判断是解析问题还是样式问题

遇到 Markdown 显示异常时，先用浏览器开发者工具检查 DOM：

1. `**文本**` 是否已经生成 `<strong>`。
2. `* 项目` 或 `- 项目` 是否已经生成 `<ul><li>`。
3. 如果元素存在，检查 Computed Styles 中的 `font-weight`、`list-style-type`、`color` 和 `display`。
4. 如果元素不存在，再检查 Markdown 原文、缩进、空行以及解析插件配置。

本次问题中 `<strong>`、`<ul>` 和 `<li>` 都存在，因此修复点应放在 CSS，而不是替换 Markdown 解析器。

## Markdown 原文注意事项

推荐写法：

```md
**加粗内容**

- 一级项目
  - 二级项目
  - 另一个二级项目
```

以下内容不会被当作真正的空格：

```md
&amp;#x20;
```

它表示被再次转义的 HTML 实体，页面可能直接显示 `&#x20;`。如果上传的 Markdown 中出现这种内容，应在文件来源处避免重复 HTML 转义。

### 缩进段落不等于嵌套列表

下面只有第一行是列表项，后续内容是同一个列表项中的普通段落：

```md
- Tools 说明

    read、Grep、Glob

    read 的含义
```

标准的嵌套列表必须给每一项添加 marker：

```md
- Tools 说明
  - read、Grep、Glob
  - read 的含义
```

部分文档导出工具会生成第一种格式。项目通过 `normalizeLooseNestedLists` 兼容这种输入，但只转换一个列表项下至少两段符合特征的缩进内容，避免把普通的单个缩进代码块误判为列表。

## 验证清单

- `**加粗**` 在编辑器预览和文章详情中均为 `font-weight: 700`。
- 一级和嵌套无序列表均显示实心圆点。
- 有序列表显示十进制序号。
- 深色模式下 marker 跟随正文颜色。
- 编辑器工具栏的内部列表不受 Markdown 列表样式影响。
- `npm run build` 可以完成生产构建。

## 经验总结

- 安装 Tailwind 插件不等于启用插件，需要检查全局 CSS 配置。
- 编辑器预览正常、详情页异常时，优先比较两个渲染容器的 CSS，而不是先怀疑内容数据。
- Markdown UI 应给正文设置明确作用域，避免使用全局 `ul`、`li`、`strong` 选择器。
- 对 marker 不要只确认“存在”，还要检查颜色、大小和列表缩进是否达到可见性要求。

## 行内代码显示反引号

Tailwind Typography 默认通过 `code::before` 和 `code::after` 伪元素，在行内代码两侧显示反引号。Markdown 实际已经正确生成 `<code>`，这些反引号不是文章原文，也不是解析器输出。

项目在文章详情和编辑器预览作用域中移除了伪元素，并为行内代码设置背景、边框、内边距和等宽字体：

```css
.article-markdown :not(pre) > code::before,
.article-markdown :not(pre) > code::after {
  content: none;
}
```

选择器使用 `:not(pre) > code`，确保只影响单反引号生成的行内代码，不影响三反引号代码块及其语法高亮。
