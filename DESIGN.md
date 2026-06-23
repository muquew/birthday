---
name: "星星生日墙"
description: "温暖、清楚、方便维护的社群生日墙"
colors:
  classic-bg: "#f4ead9"
  classic-bg-2: "#e7d8bd"
  classic-surface: "#fff8ec"
  classic-surface-soft: "#fbf0df"
  classic-ink: "#0c1514"
  classic-muted: "#655d50"
  classic-line: "#d6c2a3"
  gold: "#a97816"
  heritage-gold: "#9f741d"
  teal: "#176b62"
  teal-dark: "#073f3d"
  rose: "#bd5848"
  warm-cream: "#fff9e8"
  night: "#07100f"
  stage-night: "#031314"
  stage-aqua: "#76d6c9"
  dark-ink: "#f7ecdc"
  warm-dust: "rgba(159, 116, 29, 0.08)"
  teal-dust: "rgba(23, 107, 98, 0.08)"
  star-speck: "rgba(255, 247, 163, 0.84)"
  star-grid: "rgba(255, 255, 255, 0.07)"
  dipper-line: "rgba(223, 178, 78, 0.34)"
  dipper-star: "rgba(255, 249, 232, 0.34)"
  dipper-star-stroke: "rgba(255, 249, 232, 0.35)"
  dipper-star-preview: "rgba(255, 249, 232, 0.62)"
  mobile-nav-shadow: "rgba(38, 22, 11, 0.18)"
typography:
  display:
    fontFamily: '"Noto Serif SC", "Source Han Serif SC", "Songti SC", Georgia, serif'
    fontWeight: 900
    lineHeight: 1.04
    letterSpacing: "0"
  body:
    fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans SC", "Microsoft YaHei", sans-serif'
    fontSize: "16px"
    fontWeight: 500
    lineHeight: 1.6
  label:
    fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    fontSize: "13px"
    fontWeight: 900
    lineHeight: 1.2
rounded:
  hairline: "2px"
  line: "3px"
  micro: "4px"
  compact: "8px"
  control: "12px"
  panel: "14px"
  mobile-panel: "16px"
  large-panel: "18px"
  header: "22px"
  pill: "999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "14px"
  lg: "22px"
  xl: "36px"
components:
  public-button:
    backgroundColor: "{colors.classic-bg}"
    textColor: "{colors.teal}"
    rounded: "{rounded.control}"
    padding: "0 14px"
  public-panel:
    backgroundColor: "{colors.classic-bg}"
    textColor: "{colors.classic-ink}"
    rounded: "{rounded.panel}"
    padding: "14px"
---

# Design System: 星星生日墙

## 1. Overview

**Creative North Star: "安静星历工作台"**

星星生日墙的公开端像一本被认真整理的生日星历：温暖、克制、带一点星图和纸张质感，但不能变成装饰展览。用户来到这里是为了看清生日、复制祝福、查找日期；视觉的任务是让这些信息显得被珍惜，而不是抢走注意力。

后台端是管理员的工作台。它应该稳定、清楚、重复使用不累。后台可以沿用暖色气质，但必须减少装饰、减少重复模块、保持表单、筛选、批量操作、日志和设置之间的组件一致性。

**Key Characteristics:**

- 公开端：暖色纸张、深墨文字、金色和青绿色点缀。
- 后台端：低装饰、高密度、操作路径短。
- 移动端：一屏一重点，列表优先，避免横向滚动。
- 主题：经典暖色为默认，清透亮色和夜间深色作为阅读环境补充。
- 动效：只用于状态反馈和轻微呼吸，不做大规模入场表演。

## 2. Colors

色彩策略是 restrained：大面积使用暖纸色或深夜色，金色与青绿色只用于导航状态、按钮、日期强调和星图点缀，玫瑰色只用于今日生日、倒计时和风险提示。

### Primary

- **星历金** (`#a97816`): 用于品牌图标、标题下划线、当前状态和轻量星点。它不应铺满页面。
- **秩序青** (`#0c645e`): 用于导航选中、链接、筛选焦点和可操作提示。它代表“可点击”和“当前选择”。

### Secondary

- **生日玫瑰** (`#bd5848`): 用于今日生日、倒计时、警示和删除类风险附近的提示。它必须少量使用。

### Neutral

- **经典纸底** (`#f6edde` / `#efe0c8`): 公开端默认背景，适合温暖生日墙。
- **深墨文字** (`#101714`): 公开端主要正文和姓名。
- **安静灰棕** (`#625b50`): 次要日期、说明和空状态。
- **夜间底色** (`#07100f`): 夜间主题背景。
- **夜间文字** (`#f7ecdc`): 夜间主题主要文字。

### Named Rules

**The Accent Rarity Rule.** 金色和青绿色只服务于状态、导航和可操作元素；如果一个屏幕上超过 10% 的面积都是强调色，说明页面在吵。

**The Rose Means Attention Rule.** 玫瑰色只用于生日当天、倒计时或风险语义。不要把它当普通装饰色。

## 3. Typography

**Display Font:** `"Noto Serif SC", "Source Han Serif SC", "Songti SC", Georgia, serif`
**Body Font:** `system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`
**Label Font:** `system-ui`

公开端标题可以使用宋体/衬线风格，强化“生日历”和“被记录”的感觉。后台端标签、按钮、表格和表单应使用系统 sans，保证读写效率。

### Hierarchy

- **Display** (900, 34-62px, line-height 1.04): 只用于公开端首页标题和页面主标题。后台不用巨型 display。
- **Headline** (900, 24-34px, line-height 1.1): 用于页面标题、区块标题。
- **Title** (850-900, 18-22px, line-height 1.2): 用于姓名、表单区块、后台面板标题。
- **Body** (500-700, 14-16px, line-height 1.5-1.7): 用于日期、说明、设置描述、日志。
- **Label** (850-950, 12-13px, line-height 1.2): 用于按钮、筛选、状态标签、字段名。

### Named Rules

**The No Shouting In Tools Rule.** 后台按钮、筛选、表单、日志不能使用公开端 hero 级字号。工具界面的文字等级要紧。

**The Date Stays Together Rule.** “公历/农历”和具体日期必须在同一个阅读单元中出现，例如“农历 六月初一”。

## 4. Elevation

系统使用轻量阴影和边框表达层级。公开端可以有柔和阴影，让首页像浮在纸面上；后台端阴影要弱，主要靠边框、间距和分组表达结构。

### Shadow Vocabulary

- **Public Panel Shadow** (`0 18px 48px rgba(44, 32, 18, 0.1)`): 公开端筛选、日历、月份卡片等主要容器。
- **Admin Soft Shadow** (`0 10px 28px rgba(61, 42, 19, 0.07)`): 后台工作台面板和表单。
- **Mobile Nav Shadow** (`0 14px 60px rgba(38, 22, 11, 0.18)`): 手机端底部导航。

### Named Rules

**The Flat Workbench Rule.** 后台默认平，只有当前焦点、浮层、固定导航和危险确认需要明显层级。

## 5. Components

### Buttons

- **Shape:** 公开端按钮使用轻微圆角或胶囊，后台按钮保持统一圆角，不因页面不同改变按钮语言。
- **Primary:** 用深夜色背景或青绿色状态表达主操作，文字保持高对比。
- **Secondary / Ghost:** 用边框和浅背景表达次要操作。筛选重置、导出、查看前台应复用同一种次级按钮样式。
- **Danger:** 删除、替换导入、批量删除必须使用风险色和确认步骤。
- **Focus:** 所有按钮必须有 `:focus-visible`，不能只靠 hover。

### Chips

- **Style:** 倒计时、状态、标签使用小尺寸 chip。倒计时可用玫瑰色，普通标签不应高饱和。
- **State:** 当前筛选、当前视图和当前月份必须有明确选中态，不能只靠文字变粗。

### Cards / Containers

- **Public Cards:** 用于生日记录、日历月份、月份分组。半径约 14px，边框轻，阴影轻。
- **Admin Panels:** 用于工作台分区、表单、导入预览、设置。不要卡片套卡片。
- **List Rows:** 手机端生日列表优先使用行布局，一人一行，日期和倒计时不能挤压姓名。

### Inputs / Fields

- **Style:** 输入框、下拉框、文本域要共享边框、圆角、内边距和高度。
- **Focus:** 聚焦时边框转青绿色，并有可见焦点环。
- **Error / Disabled:** 错误状态要有文本说明，不只改变颜色。

### Navigation

- **Public Desktop:** 顶部导航以首页、全部、月份为主，主题切换靠右。
- **Public Mobile:** 底部固定导航承载首页、全部、月份；顶部保持品牌和主题切换。
- **Admin:** 左侧导航固定主要后台模块：工作台、导入备份、数据巡检、操作日志、站点设置。
- **Month Rail:** 移动端月份导航在右侧垂直居中，默认短横线，当前月份显示月份文字。

### Signature Component

**北斗七星图** 是公开首页的标识性视觉。它只负责提供“星星生日墙”的氛围，不负责解释全部近期提醒逻辑，也不应重复显示与“接下来 30 天”相同的信息。

## 6. Do's and Don'ts

### Do:

- **Do** 让公开端第一屏优先显示今日日期和今日生日。
- **Do** 在手机端使用紧凑列表展示生日，不强迫卡片铺满屏幕。
- **Do** 把公历/农历和日期放在同一个信息块。
- **Do** 让后台工作台成为记录查看和管理的唯一主要入口。
- **Do** 在导入前明确展示有效、错误、重复、跳过数量。
- **Do** 为批量删除、替换导入等危险操作提供明确确认。
- **Do** 保持主题切换、筛选、下拉框、按钮、日志中的组件语言一致。

### Don't:

- **Don't** 做混乱仪表盘和重复指标。
- **Don't** 用卡片套卡片。
- **Don't** 在首页堆无关模块或解释性长文。
- **Don't** 在后台使用营销页式大标题、大插画和装饰动效。
- **Don't** 同一筛选区同时出现“重置”和“清除筛选”这类重复按钮。
- **Don't** 把北斗星图和近期提醒做成两套重复信息。
- **Don't** 为了炫技引入重型 3D、复杂滚动叙事或大动画。
- **Don't** 让手机端出现横向溢出、文字遮挡或日期省略。
