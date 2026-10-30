import { SSEParser } from './sse';
import type { ChatRequest, HealthResponse, ServerEvent } from './types';

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

/** GET /api/health:启动时探测后端可达性,拿默认模型与模型列表(返回 envelope 里的 data) */
export async function fetchHealth(signal?: AbortSignal): Promise<HealthResponse['data']> {
  const res = await fetch('/api/health', { signal });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const body: HealthResponse = await res.json();
  return body.data;
}
