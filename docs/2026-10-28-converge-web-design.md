# Converge Web 前端设计（v1）

日期：2026-10-28
状态：已评审通过（布局 B + 抽屉式任务面板 + 双主题 + React 技术栈）

## 1. 目标

为 Converge 后端（`ConvergeAll/Converge/`，FastAPI + SSE）做一个 Web 前端，放在 `ConvergeAll/converge-web/`。产品气质仿 Trae / 元宝：Trae 式工作台布局 + 对话流体验。

## 2. 范围

**v1 做（只对接后端已有能力）：**

- 流式多轮对话：`POST /api/chat`（SSE 流），首帧 `session` 拿 session_id，后续请求带上即续接多轮
- 模型切换：`ChatRequest.model`（`models.yaml` 别名，空=默认）
- 健康检查：`GET /api/health`（启动时探测后端是否可达）
- 双主题（深/浅，右上角切换，持久化）
- 新会话按钮
- Markdown 渲染 + 代码高亮
- 右侧任务抽屉：空态骨架 + 事件渲染位（v1 不接事件，等 v2.x）

**v1 不做：**

- 会话列表 / 切换 / 历史：后端尚无 CRUD 端点（store 层已有 `list_sessions` / `list_messages`，HTTP 端点在 v1.2 路线图里）。v1 会话栏只放"新会话"按钮与当前会话标识
- 工具调用 / 命令确认 / 澄清提问的真实交互：后端 v2.x（`tool_call` / `confirm_request` / `ask_user` 事件已在 `agent/events.py` 定义，v1 前端只留类型与渲染位）

## 3. 布局与视觉

- **布局**：Trae 式工作台 = 左图标栏 + 会话栏 + 对话流 + 顶栏（模型切换 / 主题切换）+ 右侧抽屉任务面板
- **抽屉**：对话区默认全宽，右留窄图标条；有工具事件时自动滑出（v1 仅手动开关），可收起
- **主题**：双主题 CSS 变量（`data-theme="dark|light"`），默认跟随系统，localStorage 持久化
- **暗色**：深灰蓝底 + 靛蓝强调；**亮色**：白底浅灰分区 + 同强调色；状态色：绿=成功、橙=待确认、红=失败

## 4. 技术栈

- React 18 + TypeScript + Vite
- 依赖克制：`react-markdown`（渲染回复）+ `highlight.js`（代码高亮），其余用原生能力
- 样式：CSS 变量 + CSS Modules，不引组件库 / Tailwind
- 状态：React 自带（Context + hooks），不引 Redux
- 语言规范：TS 严格模式；SSE 事件定义为联合类型，与 `agent/events.py` 一一对应

## 5. 目录结构

```
converge-web/
├── index.html
├── package.json / tsconfig.json / vite.config.ts   # dev 代理 /api → localhost:8000
├── src/
│   ├── main.tsx / App.tsx
│   ├── api/types.ts            # SSE 事件联合类型（对齐 agent/events.py）
│   ├── api/client.ts           # /api/chat 流式封装 + /api/health
│   ├── hooks/useChatStream.ts  # 会话/消息流状态机
│   ├── components/             # IconRail / SessionPanel / ChatStream / MessageBubble / Composer / TaskDrawer / ThemeToggle / ModelSelect
│   └── styles/theme.css        # 双主题 CSS 变量
└── tests/                      # SSE 帧解析单测（vitest）
```

## 6. 数据流

1. Composer 发送 → `useChatStream` → `fetch` POST `/api/chat`（body: `content` / `session_id` / `model`）
2. 用 `ReadableStream` 按 SSE 帧解析 `data: {...}`（`EventSource` 不支持 POST，故直接读流）
3. 事件处理：
   - `session`：存 session_id
   - `chunk`：逐段追加到当前助手消息（打字机效果）
   - `done`：结束 loading，输入框恢复
   - `error`：对话流内显示错误卡片，**保留已收内容**（对齐后端"中断一致性"）
4. 未知事件类型：忽略（为 v2.x 事件留兼容）

## 7. 错误处理

- SSE `error` 帧 → 消息流内错误卡片，可重发上一条
- 网络中断 / fetch 抛错 → 同上，停止 loading、保留半截内容
- session 不存在（error 帧提示）→ 回退为新会话
- 后端不可达（health 失败）→ 顶部横幅提示，不阻塞界面

## 8. 验证

- `tsc --noEmit` + `vite build` 通过
- vitest：SSE 帧解析器（纯函数）单测
- 手动验证：流式输出、多轮续接、模型切换、主题切换、断流后半截内容保留
- 完成后做一次明显隐患自查（边界条件、内存泄漏、流未关闭等）

## 9. 后续衔接

- v1.2 后端会话 CRUD 上线 → 接会话列表 / 切换 / 历史拉取
- v2.x 后端工具事件上线 → `types.ts` 类型已就位，接 `tool_call` 卡片渲染、`confirm_request` / `ask_user` 交互与 resume 请求
