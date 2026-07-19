'use client';
import { useState, useRef } from 'react';
import { MarkdownRenderer } from '@/components/markdown-renderer';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Wand2, Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { getClientCSRFToken } from '@/lib/csrf/client';

export function PolishingPage() {
  const t = useTranslations();
  const [content, setContent] = useState('');
  const [polishedContent, setPolishedContent] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState('');
  const fullContentRef = useRef('');
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const handlePolish = async () => {
    if (!content.trim()) return;

    setIsStreaming(true);
    setError('');
    setPolishedContent('');
    fullContentRef.current = '';

    try {
      const csrfToken = await getClientCSRFToken();
      const response = await fetch('/api/dashboard/polish', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
        },
        body: JSON.stringify({ content }),
      });

      if (!response.ok) {
        throw new Error('请求失败');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));

              if (data.status === 'started') {
                console.log('开始处理');
              } else if (data.status === 'completed') {
                console.log('处理完成');
              } else if (data.chunk) {
                fullContentRef.current += data.chunk;
                setPolishedContent(fullContentRef.current);
              } else if (data.error) {
                throw new Error(data.message || data.error);
              }
            } catch (e) {
              console.error('解析数据错误:', e);
            }
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '发生错误');
    } finally {
      setIsStreaming(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <h1 className="text-3xl font-bold mb-8">文章润色工具</h1>

      <div className="mb-6">
        <label className="block text-sm font-medium mb-2">
          原始内容
        </label>
        <Textarea
          ref={inputRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="w-full h-64 resize-none"
          placeholder="请输入需要润色的文章内容..."
        />
      </div>

      <div className="mb-6">
        <Button
          onClick={handlePolish}
          disabled={isStreaming || !content.trim()}
          className="w-full"
        >
          {isStreaming ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              正在处理中...
            </>
          ) : (
            <>
              <Wand2 className="mr-2 h-4 w-4" />
              开始润色
            </>
          )}
        </Button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
          <p>错误: {error}</p>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium mb-2">
          润色后内容
        </label>
        <div className="min-h-[200px] p-4 border border-gray-300 rounded-lg bg-white">
          {polishedContent ? (
            <MarkdownRenderer content={polishedContent} typing={isStreaming} />
          ) : (
            <p className="text-gray-500">润色后的内容将显示在这里...</p>
          )}
        </div>
      </div>
    </div>
  );
}
