import { useCallback, useEffect, useRef, useState } from 'react';
import { deleteSession, listMessages, listSessions, streamChat } from '../api/client';
import type { HistoryMessage, ServerEvent, SessionSummary, TaskEvent } from '../api/types';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  /** assistant 专用:streaming 流式中 / done 完成 / error 出错(保留已收内容) */
  status: 'streaming' | 'done' | 'error';
  errorMessage?: string;
}

/** 历史消息(v1 只有 user/assistant 纯文本)→ 聊天气泡;tool/system 角色 v2.x 再处理 */
function toChatMessages(rows: HistoryMessage[]): ChatMessage[] {
  return rows
    .filter((m): m is HistoryMessage & { role: 'user' | 'assistant' } =>
      m.role === 'user' || m.role === 'assistant')
    .map((m) => ({
      id: `h${m.seq}`,
      role: m.role,
      content: m.content ?? '',
      status: 'done' as const,
    }));
}

export function useChatStream() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [streaming, setStreaming] = useState(false);
  const [taskEvents, setTaskEvents] = useState<TaskEvent[]>([]);
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const idRef = useRef(0);
  const lastReqRef = useRef<{ content: string; model?: string } | null>(null);
  // sessionId 的镜像:异步回调(切会话拉历史)里判断目标会话是否仍是当前选中
  const sessionIdRef = useRef<string | null>(null);
  useEffect(() => {
    sessionIdRef.current = sessionId;
  }, [sessionId]);

  const nextId = () => `m${++idRef.current}`;

  /** 刷新会话列表;失败静默(console),顶栏 health 横幅已提示后端不可达 */
  const refreshSessions = useCallback(async () => {
    try {
      setSessions(await listSessions());
    } catch (err) {
      console.warn('listSessions failed:', err);
    }
  }, []);

  // 首次挂载拉一次会话列表
  useEffect(() => {
    void refreshSessions();
  }, [refreshSessions]);

  const startStream = useCallback(
    async (content: string, model?: string) => {
      const controller = new AbortController();
      abortRef.current = controller;
      setStreaming(true);
      const assistantId = nextId();
      setMessages((prev) => [
        ...prev,
        { id: assistantId, role: 'assistant', content: '', status: 'streaming' },
      ]);

      const patch = (fn: (m: ChatMessage) => ChatMessage) =>
        setMessages((prev) => prev.map((m) => (m.id === assistantId ? fn(m) : m)));

      const onEvent = (ev: ServerEvent) => {
        switch (ev.type) {
          case 'session':
            setSessionId(ev.session_id);
            // 新会话首帧后刷列表,让"新对话"出现在侧栏
            void refreshSessions();
            break;
          case 'chunk':
            patch((m) => ({ ...m, content: m.content + ev.content }));
            break;
          case 'done':
            patch((m) => ({ ...m, status: 'done' }));
            // 回合结束:title 已生成、updated_at 已变,刷列表保持排序与标题最新
            void refreshSessions();
            break;
          case 'error':
            patch((m) => ({ ...m, status: 'error', errorMessage: ev.message }));
            // 404 = session 不存在/已删除:回退为新会话
            if (ev.code === 404) {
              setSessionId(null);
              void refreshSessions();
            }
            break;
          case 'tool_call':
          case 'confirm_request':
          case 'ask_user':
            setTaskEvents((prev) => [...prev, ev]);
            break;
        }
      };

      try {
        await streamChat(
          { content, session_id: sessionId ?? undefined, model },
          onEvent,
          controller.signal,
        );
        // 流正常结束但没收到 done:也置为完成
        patch((m) => (m.status === 'streaming' ? { ...m, status: 'done' } : m));
      } catch (err) {
        // 主动中断(新会话/卸载)不更新;网络错误保留半截内容
        if (!controller.signal.aborted) {
          const message = err instanceof Error ? err.message : String(err);
          patch((m) => ({ ...m, status: 'error', errorMessage: `网络错误: ${message}` }));
        }
      } finally {
        setStreaming(false);
        abortRef.current = null;
      }
    },
    [sessionId, refreshSessions],
  );

  const send = useCallback(
    (content: string, model?: string) => {
      const text = content.trim();
      if (!text || streaming) return;
      lastReqRef.current = { content: text, model };
      setMessages((prev) => [...prev, { id: nextId(), role: 'user', content: text, status: 'done' }]);
      void startStream(text, model);
    },
    [streaming, startStream],
  );

  /** 重发上一条:丢掉出错的 assistant 消息,用同样的请求重新流式 */
  const retry = useCallback(() => {
    const lastReq = lastReqRef.current;
    if (!lastReq || streaming) return;
    setMessages((prev) => {
      const next = [...prev];
      while (next.length > 0 && next[next.length - 1].status === 'error') {
        next.pop();
      }
      return next;
    });
    void startStream(lastReq.content, lastReq.model);
  }, [streaming, startStream]);

  /** 回到"未开始"状态:中断流、清空消息/任务事件/会话。新会话按钮和删除当前会话共用 */
  const resetLocal = useCallback(() => {
    abortRef.current?.abort();
    setMessages([]);
    setSessionId(null);
    setTaskEvents([]);
    setStreaming(false);
    setHistoryLoading(false);
  }, []);

  const newSession = useCallback(() => resetLocal(), [resetLocal]);

  /** 删除会话:删的是当前会话时同步回到新会话状态 */
  const removeSession = useCallback(
    (id: string) => {
      deleteSession(id)
        .then(() => {
          if (id === sessionIdRef.current) resetLocal();
        })
        .catch((err) => console.warn('deleteSession failed:', err))
        .finally(() => void refreshSessions());
    },
    [refreshSessions, resetLocal],
  );

  /** 切换会话:中断进行中的流 → 清任务事件 → 拉历史消息渲染 */
  const selectSession = useCallback((id: string) => {
    if (id === sessionId) return;
    abortRef.current?.abort();
    setStreaming(false);
    setTaskEvents([]);
    setSessionId(id);
    setHistoryLoading(true);
    listMessages(id)
      .then((rows) => {
        // 切换期间用户可能又点了别的会话,只认当前选中的
        if (id === sessionIdRef.current) setMessages(toChatMessages(rows));
      })
      .catch((err) => {
        console.warn('listMessages failed:', err);
        // 历史拉不到:清空显示,避免残留上一个会话的消息
        if (id === sessionIdRef.current) setMessages([]);
      })
      .finally(() => {
        if (id === sessionIdRef.current) setHistoryLoading(false);
      });
  }, [sessionId]);

  // 组件卸载时中断进行中的流
  useEffect(() => () => abortRef.current?.abort(), []);

  return {
    messages,
    sessionId,
    streaming,
    taskEvents,
    sessions,
    historyLoading,
    send,
    retry,
    newSession,
    selectSession,
    removeSession,
  };
}
