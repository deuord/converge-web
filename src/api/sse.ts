import type { ServerEvent } from './types';

/**
 * SSE 帧解析器(增量)。后端帧格式:`data: {json}\n\n`。
 * push() 接收任意切分的文本片段,返回其中完整帧解析出的事件;
 * 半截帧留在缓冲区等下一片段补齐;非法 JSON 帧直接丢弃。
 */
export class SSEParser {
  private buffer = '';

  push(text: string): ServerEvent[] {
    this.buffer += text;
    const events: ServerEvent[] = [];
    let idx = this.buffer.indexOf('\n\n');
    while (idx !== -1) {
      const frame = this.buffer.slice(0, idx);
      this.buffer = this.buffer.slice(idx + 2);
      const ev = parseFrame(frame);
      if (ev) events.push(ev);
      idx = this.buffer.indexOf('\n\n');
    }
    return events;
  }
}

function parseFrame(frame: string): ServerEvent | null {
  const line = frame.split('\n').find((l) => l.startsWith('data:'));
  if (!line) return null;
  try {
    const parsed: unknown = JSON.parse(line.slice(5).trim());
    if (
      parsed !== null &&
      typeof parsed === 'object' &&
      typeof (parsed as { type?: unknown }).type === 'string'
    ) {
      // 未知事件类型(如 v2.x 新增)也原样返回,由调用方按 type 分发/忽略
      return parsed as ServerEvent;
    }
  } catch {
    // 非法 JSON 帧丢弃,不影响后续帧
  }
  return null;
}
