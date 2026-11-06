# Converge Web 前端设计

日期：2026-10-28（v1 评审）｜ 最近更新：2026-11-06（v1.2 实装后同步）
状态：本文档为 converge-web 的**活文档**，每次对界面/契约做实质改动后必须同步更新对应章节

## 1. 目标

为 Converge 后端（`ConvergeAll/Converge/`，FastAPI + SSE）做 Web 前端，目录 `ConvergeAll/converge-web/`。产品气质仿 Trae / 元宝：浅灰底上的白色悬浮卡片工作台 + 对话流体验。

## 2. 功能范围（当前已实现）

- 流式多轮对话：`POST /api/v1/chat`（SSE），首帧 `session` 拿 session_id，续接多轮
- 模型切换：输入框底栏右侧无框下拉（`ChatRequest.model`，空=默认）
- 健康检查：`GET /api/health`（启动探测，失败显示顶部横幅）
- 会话管理：列表（title + updated_at 降序）/ 切换（拉历史）/ 删除（确认后）/ 新建任务（懒创建，首条消息后才入库）
- 双主题：深/浅，右上角切换，localStorage 持久化（key `converge-theme`），默认跟随系统
- Markdown 渲染 + highlight.js 代码高亮
- 右侧任务面板：`tool_call` / `confirm_request` / `ask_user` 事件卡片渲染位
- 面板交互：左右面板均可拖拽调宽，拖到阈值松手直接关闭；顶栏按钮开合

**未做（路线图）：**

- 工具调用确认/澄清的真实交互闭环（后端 v2.x）
- 会话删除联动后端标题生成策略调优、分页懒加载（当前 `listSessions` 自动翻页拼全量）

## 3. 布局与视觉（当前形态）

```
┌──────────┬─8px─┬─────────────────────┬─8px─┬──────────┐
│ 会话栏    │手柄 │  顶栏: [折叠][标题] [主题][面板]  │ 任务面板  │
│ Converge │     ├─────────────────────┤     │ (事件卡片)│
│ 新建任务  │     │      对话流          │     │          │
│ 最近 ▾   │     │      输入框卡片       │     │          │
│ (会话列表)│     │  底栏: ……  模型▾ [→] │     │          │
└──────────┴─────┴─────────────────────┴─────┴──────────┘
```

- **整体**：浅灰/深灰蓝页面底（`--bg`），三块区域（会话栏、主区、任务面板）都是 16px 圆角的**悬浮卡片**（`--bg-panel` + `--shadow-panel`），左右面板贴屏幕边缘、只留上下 12px 间距；面板与主区之间是 8px 拖拽手柄（同时充当间隔）
- **会话栏**：品牌标题「Converge」（18px 粗体，纯文字无图标）→ 无框文字按钮「+ 新建任务」→「最近 ▾」折叠头 → 会话列表；条目 hover 浅灰底+细阴影，选中态 accent 软底+阴影；条目 hover 浮现 × 删除
- **顶栏**：无通栏分割线；左上 = 会话栏折叠按钮 + 当前会话 title；右上 = 主题切换 + 任务面板开关
- **输入框**：16px 圆角卡片带边框+阴影，两行式（textarea / 底栏）；底栏右对齐：模型无框下拉（灰字+原生箭头）+ 发送按钮
- **拖拽规则**：左面板 160~520px、右面板 260~560px；松手时低于阈值（左 120 / 右 200）直接关闭面板
- **状态色**：绿=成功、橙=待确认、红=失败

## 4. 统一规范（新增/改动必须遵守）

### 4.1 设计令牌（只准用 `theme.css` 里的变量，禁止硬编码颜色）

| 变量 | 用途 |
| --- | --- |
| `--bg` / `--bg-panel` | 页面底 / 悬浮卡片底 |
| `--bg-input` / `--bg-hover` | 输入类控件底 / 条目 hover 底 |
| `--border` / `--border-strong` | 分割线 / 控件边框 |
| `--text` / `--text-muted` / `--text-inverse` | 主文字 / 次要文字 / 反色文字 |
| `--accent` / `--accent-hover` / `--accent-soft` | 强调色三件套（按钮/hover/软底） |
| `--danger(-bg)` / `--warn` / `--ok` | 失败 / 待确认 / 成功 |
| `--shadow-panel` / `--shadow-item` | 卡片阴影 / 条目细阴影 |

新变量先在 `theme.css` 两个主题块里同时声明再使用。

### 4.2 形状与间距

- 悬浮卡片（面板/主区）圆角 **16px**；输入框卡片 16px；按钮/条目/代码块/任务卡片 8~10px
- 面板贴屏幕边缘（左右 0、上下 12px），区间隔只靠 8px 手柄，**不再叠加 margin 造成不对称**
- 字号梯度：品牌标题 18 / 正文 14 / 次要与分组头 13 / 辅助 12

### 4.3 交互约定

- 面板开合：顶栏图标按钮 + 拖拽关闭双入口，语义一致
- 破坏性操作（删会话）必须 `window.confirm` 确认，删除当前会话后回退到新会话状态
- 会话数据刷新时机：session 首帧 / done / 删除后（finally 兜底）/ 404 回退
- 中文输入法 Enter 误发：`e.nativeEvent.isComposing` 判断，所有带 Enter 快捷键的输入控件都要带
- 流生命周期：abort 不报网络错误；半截内容保留；错误卡片提供重发

### 4.4 代码分层（与目录一一对应，禁止跨层）

```
src/api/        # 契约层：类型 + HTTP/SSE 封装，不碰 React
src/hooks/      # 状态层：useChatStream 是唯一持有会话状态的地方
src/components/ # 展示层：只收 props + 回调，不自发请求；图标统一进 icons.tsx
src/styles/     # theme.css 全局变量 / app.module.css 全部布局，组件不允许内联样式(动态宽度除外)
tests/          # 纯函数单测（SSE 解析等），vitest
```

- 组件文件名 PascalCase，class 命名 camelCase；删除组件时同步清理 CSS class 与未引用图标
- API 类型与后端 `agent/events.py` / 路由 pydantic 模型一一对应，后端改契约前端必须同步 `types.ts`

### 4.5 验证底线

改动后必须跑：`npm run build`（含 tsc）+ `npm test`；涉及视觉/交互的改动用浏览器实际过一遍；完成独立功能后做一次隐患自查。

## 5. 技术栈

- React 18 + TypeScript（strict）+ Vite；dev 代理 `/api` → `localhost:8000`
- 依赖克制：`react-markdown` + `highlight.js`，不引组件库 / Tailwind / Redux
- SSE 用 `fetch` + `ReadableStream` 增量帧解析（`EventSource` 不支持 POST）

## 6. 目录结构

```
converge-web/
├── index.html                      # 内联主题脚本防闪烁
├── package.json / tsconfig.json / vite.config.ts
├── docs/                           # 本文档
├── src/
│   ├── main.tsx / App.tsx          # App: 布局编排 + 面板拖拽开合 + 主题/health
│   ├── api/
│   │   ├── types.ts                # Envelope/Page/SessionSummary/事件联合类型
│   │   ├── sse.ts                  # SSEParser(增量帧解析)
│   │   └── client.ts               # streamChat / fetchHealth / listSessions / listMessages / deleteSession
│   ├── hooks/useChatStream.ts      # 会话状态机:消息流/任务事件/会话列表/切换/删除
│   ├── components/                 # SessionPanel / ChatStream / MessageBubble / Composer / ModelSelect / TaskDrawer / ThemeToggle / icons
│   └── styles/theme.css + app.module.css
└── tests/sse.test.ts               # SSE 帧解析单测
```

## 7. API 契约（对齐后端现状）

- 统一信封：`{code, message, data}`；health 与会话接口走 envelope，chat 走 SSE 帧
- `GET /api/health` → `data: {status, default, models[]}`
- `GET /api/sessions?page=&page_size=` → `data: {items: SessionSummary[], total, page, page_size}`，`SessionSummary{session_id, title, updated_at}`，后端默认 updated_at 降序
- `GET /api/sessions/{id}/messages` → `data: {items: HistoryMessage[], ...}`，前端自动翻页拼全量
- `DELETE /api/sessions/{id}` → 200；重复删 404（前端捕获后兜底刷列表）
- `POST /api/v1/chat`（SSE `data: {json}\n\n`）：`session` / `chunk` / `done` / `error{message, code}` / `tool_call` / `confirm_request` / `ask_user`；error `code=404`（会话失效）→ 前端回退新会话，`code=502`（LLM 失败）→ 错误卡片

## 8. 数据流

1. Composer 发送 → `useChatStream.send` → POST `/api/v1/chat`
2. `SSEParser` 增量解析，事件分发：session 存 id 刷列表 / chunk 打字机 / done 收尾刷列表 / task 类事件进任务面板
3. 切会话：中断进行中的流 → 拉历史渲染 → 清任务事件
4. 错误：error 帧（按 code 分流）/ 网络异常 → 错误卡片 + 重发，session 404 时回退本地新会话

## 9. 验证

- `npm run build`（tsc --noEmit + vite build）、`npm test`（vitest 5 用例）
- 手动：流式输出、多轮、切换/删除会话、模型切换、主题切换、断流半截保留、面板拖拽与阈值关闭
- 完成独立功能后隐患自查（流生命周期、竞态、内存泄漏、XSS——hljs 已转义）

## 10. 后续衔接

- v2.x 工具事件交互闭环：`confirm_request` / `ask_user` 的按钮与 resume 请求（类型已就位）
- 会话分页懒加载（后端支持 page/page_size，当前前端全量拼接）
- i18n（当前中文硬编码，无多语言规划时不引入）
