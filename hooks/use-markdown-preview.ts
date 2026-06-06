import { useState, useCallback, useRef, useEffect } from 'react';

export function useMarkdownStream() {
  const [raw, setRaw] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const bufferRef = useRef(''); // 存储跨chunk的碎片数据和已处理的内容
  const abortController = useRef(new AbortController());
  // 保存最后一次成功渲染的内容，用于恢复时重新开始
  const lastContentRef = useRef('');

  // 清理函数：组件卸载时取消正在进行的请求
  useEffect(() => {
    return () => {
      if (abortController.current) {
        abortController.current.abort()
      }
    }
  }, []);

  // 补全未闭合代码块
  const safeMd = useCallback((md: string) => {
    let out = md;
    const cnt = (out.match(/```/g) || []).length;
    if (cnt % 2 !== 0) out += '\n```';
    return out;
  }, []);

  // 批量处理文本：统一 \n、去多余空行、处理代码块
  const cleanNewlines = useCallback((text: string) => {
    let newText = text;

    // 1. 统一换行符
    newText = newText.replace(/\r\n?/g, '\n\n');

    // 2. 移除 markdown 代码块标记
    newText = newText.replace(/```markdown/g, '');

    return newText;
  }, []);

  // 流式处理的核心逻辑
  const processStream = useCallback(async (prompt: string, resumeFrom: string | null = null) => {
    setRaw('');
    bufferRef.current = resumeFrom || '';
    lastContentRef.current = resumeFrom || '';
    setIsStreaming(true);
    setIsPaused(false);

    // 创建新的 AbortController
    abortController.current = new AbortController();

    try {
      const res = await fetch('/api/dashboard/polish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: prompt,
          resumeFrom: resumeFrom // 告诉服务端是否从某个内容继续
        }),
        signal: abortController.current.signal
      });
      if (!res.body) throw new Error('no stream');

      const reader = res.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = ""

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        buffer += chunk;

        // 处理完整的SSE消息
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || ""; // 保留最后一个不完整的行

        for (const line of lines) {
          if (line.trim() === '') continue;

          if (line.startsWith('data: ')) {
            const dataStr = line.slice(6).trim();
            if (!dataStr) continue;

            try {
              const data = JSON.parse(dataStr);
              // 如果是恢复标记，不处理内容，只改变状态
              if (data.status === 'resumed') {
                console.log('Stream resumed from previous content');
                continue;
              }

              if (data.chunk && typeof data.chunk === 'string') {
                bufferRef.current += data.chunk;

                // 每次接收到数据块都更新UI
                const cleaned = cleanNewlines(bufferRef.current);
                setRaw(cleaned);
              }
            } catch (e) {
              console.error('解析流数据失败:', e, '原始数据:', dataStr);
            }
          }
        }
      }
    } catch (e) {
      // 如果不是 AbortError，才打印错误
      if (e && typeof e === 'object' && 'name' in e && e.name !== 'AbortError') {
        console.error(e);
      }
    } finally {
      // 最终清理和格式化
      if (bufferRef.current) {
        const finalCleaned = cleanNewlines(bufferRef.current);
        setRaw(finalCleaned);
      }
      setIsStreaming(false);
    }
  }, [cleanNewlines]);

  const startStream = useCallback(async (prompt: string) => {
    if (!prompt || isStreaming) return;
    await processStream(prompt, isPaused ? lastContentRef.current : null);
  }, [isStreaming, isPaused, processStream]);

  const discardStream = useCallback(() => {
    if (abortController.current) {
      abortController.current.abort();
    }
    setIsStreaming(false);
    setIsPaused(false);
    setRaw('');
    bufferRef.current = '';
    lastContentRef.current = '';
  }, []);

  const pauseStream = useCallback(() => {
    if (isStreaming && !isPaused) {
      // 保存当前内容
      lastContentRef.current = bufferRef.current;
      // 取消当前的 fetch 请求
      abortController.current.abort();
      setIsPaused(true);
      setIsStreaming(false);
    }
  }, [isStreaming, isPaused]);

  const resumeStream = useCallback(async () => {
    if (isPaused) {
      // 从上次保存的内容继续
      const lastContent = lastContentRef.current;
      if (lastContent) {
        setRaw(lastContent);
        await processStream(lastContent, lastContent);
      }
    }
  }, [isPaused, processStream]);

  return {
    source: safeMd(raw), // 给 UIW 用的最终内容
    isStreaming,
    isPaused,
    startStream,
    discardStream,
    pauseStream,
    resumeStream,
  };
}