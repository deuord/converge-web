import { SSEParser } from './sse';
import type {
  ChatRequest,
  Envelope,
  HealthData,
  HistoryMessage,
  PageData,
  ServerEvent,
  SessionSummary,
} from './types';

async function readSSE(res: Response, onEvent: (ev: ServerEvent) => void): Promise<void> {
  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  const parser = new SSEParser();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    for (const ev of parser.push(decoder.decode(value, { stream: true }))) {
      onEvent(ev);
    }
  }
  for (const ev of parser.push(decoder.decode())) {
    onEvent(ev);
  }
}

/**
 * POST /api/v1/chat:流式对话,逐个回调 SSE 事件。
 * 连接失败(fetch 抛错 / 非 2xx)抛异常;事件级错误走 error 事件不抛。
 */
export async function streamChat(
  req: ChatRequest,
  onEvent: (ev: ServerEvent) => void,
  signal?: AbortSignal,
): Promise<void> {
  const res = await fetch('/api/v1/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      content: req.content,
      session_id: req.session_id ?? null,
      model: req.model ?? null,
    }),
    signal,
  });
  if (!res.ok || !res.body) {
    throw new Error(`HTTP ${res.status}`);
  }
  await readSSE(res, onEvent);
}

/** 拉取信封接口并解包 data;HTTP 非 2xx 抛异常 */
async function fetchEnvelope<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const body: Envelope<T> = await res.json();
  return body.data;
}

/** GET /api/health:启动时探测后端可达性,拿默认模型与模型列表 */
export function fetchHealth(signal?: AbortSignal): Promise<HealthData> {
  return fetchEnvelope<HealthData>('/api/health', { signal });
}

/**
 * GET /api/v1/sessions:会话列表。后端缺省按 updated_at 降序(最近聊过的在前),
 * 这里不传 sort 交给后端默认;page_size 用满 100,当前量级一页装下,翻页 UI 暂不接
 */
export async function listSessions(signal?: AbortSignal): Promise<SessionSummary[]> {
  const data = await fetchEnvelope<PageData<SessionSummary>>(
    '/api/v1/sessions?page=1&page_size=100',
    { signal },
  );
  return data.items;
}

/** GET /api/v1/sessions/{id}/messages:会话历史,seq 升序;超过一页时顺序翻完拼接 */
export async function listMessages(sessionId: string, signal?: AbortSignal): Promise<HistoryMessage[]> {
  const all: HistoryMessage[] = [];
  for (let page = 1; ; page++) {
    const data = await fetchEnvelope<PageData<HistoryMessage>>(
      `/api/v1/sessions/${sessionId}/messages?page=${page}&page_size=100`,
      { signal },
    );
    all.push(...data.items);
    if (all.length >= data.total) return all;
  }
}

/** DELETE /api/v1/sessions/{id}:软删会话;不存在/重复删由后端抛 404 */
export function deleteSession(sessionId: string, signal?: AbortSignal): Promise<null> {
  return fetchEnvelope<null>(`/api/v1/sessions/${sessionId}`, { method: 'DELETE', signal });
}
