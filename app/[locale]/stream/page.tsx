'use client';
import { useEffect, useState, useRef } from 'react';
import { marked } from 'marked';

export default function StreamMdPage() {
  const [html, setHtml] = useState('');
  const fullMdRef = useRef('');
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // 修复换行：代码块不替换，正文单换行转硬换行
  const fixLineBreak = (md: string) => {
    // 拆分代码块片段
    const blocks = md.split(/(```[\s\S]*?```)/g);
    return blocks
      .map((part) => {
        if (part.startsWith('```')) return part;
        // 统一换行 + 单换行补两空格
        return part.replaceAll('\r\n', '\n').replace(/(?<! )\n/g, '  \n');
      })
      .join('');
  };

  // 防抖渲染
  const renderMd = async () => {
    const fixed = fixLineBreak(fullMdRef.current);
    const parsed = await marked.parse(fixed);
    setHtml(parsed);
  };

  useEffect(() => {
    const es = new EventSource('/api/stream');

    es.onmessage = (e) => {
      if (e.data === '[END]') return;
      fullMdRef.current += e.data;

      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      timerRef.current = setTimeout(renderMd, 40);
    };

    return () => {
      es.close();
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  return (
    <div className="p-6 prose max-w-none">
      <div dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  );
}