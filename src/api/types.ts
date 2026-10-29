// SSE 事件契约:与后端 Converge/agent/events.py 一一对应,
// 另含 routes_chat.py 首帧 session 事件。

export interface SessionEvent {
  type: 'session';
  session_id: string;
}

export interface ChunkEvent {
  type: 'chunk';
  content: string;
}

export interface DoneEvent {
  type: 'done';
}

export interface ErrorEvent {
  type: 'error';
  message: string;
}

// 以下三类事件后端 v2.x 才会推送,v1 只留类型与任务抽屉渲染位
export interface ToolCallEvent {
  type: 'tool_call';
  step: number;
  name: string;
  args: Record<string, unknown>;
  result: string;
}

export interface ConfirmRequestEvent {
  type: 'confirm_request';
  step: number;
  tool_call_id: string;
  cmd: string;
  cwd: string;
}

export interface AskUserEvent {
  type: 'ask_user';
  step: number;
  tool_call_id: string;
  question: string;
  options: string[] | null;
  timeout_seconds: number;
}

export type ServerEvent =
  | SessionEvent
  | ChunkEvent
  | DoneEvent
  | ErrorEvent
  | ToolCallEvent
  | ConfirmRequestEvent
  | AskUserEvent;

/** 工具类任务事件,收进右侧任务抽屉展示 */
export type TaskEvent = ToolCallEvent | ConfirmRequestEvent | AskUserEvent;

export interface ChatRequest {
  content: string;
  session_id?: string;
  model?: string;
}

export interface HealthResponse {
  status: string;
  default: string;
  models: string[];
}
