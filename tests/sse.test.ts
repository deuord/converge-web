import { describe, expect, it } from 'vitest';
import { SSEParser } from '../src/api/sse';

describe('SSEParser', () => {
  it('解析单个完整帧', () => {
    const p = new SSEParser();
    const events = p.push('data: {"type":"chunk","content":"你好"}\n\n');
    expect(events).toEqual([{ type: 'chunk', content: '你好' }]);
  });

  it('跨 push 切分的帧能正确拼回', () => {
    const p = new SSEParser();
    expect(p.push('data: {"type":"ch')).toEqual([]);
    expect(p.push('unk","content":"hi"}\n')).toEqual([]);
    expect(p.push('\n')).toEqual([{ type: 'chunk', content: 'hi' }]);
  });

  it('一次 push 多帧全部解析', () => {
    const p = new SSEParser();
    const events = p.push(
      'data: {"type":"session","session_id":"s1"}\n\ndata: {"type":"done"}\n\n',
    );
    expect(events.map((e) => e.type)).toEqual(['session', 'done']);
  });

  it('未知事件类型原样返回,由调用方忽略', () => {
    const p = new SSEParser();
    const events = p.push('data: {"type":"future_event","x":1}\n\n');
    expect(events).toEqual([{ type: 'future_event', x: 1 }]);
  });

  it('非法 JSON 帧丢弃,不影响后续帧', () => {
    const p = new SSEParser();
    const events = p.push('data: {bad json}\n\ndata: {"type":"done"}\n\n');
    expect(events).toEqual([{ type: 'done' }]);
  });
});
