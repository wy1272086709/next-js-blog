import { NextResponse } from 'next/server';
import { marked } from 'marked';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      // SSE 头部
      const send = (text: string) => {
        controller.enqueue(encoder.encode(`data: ${text}\n\n`));
      };

      // 模拟markdown文本
      const mdText = `# 标题测试
第一行文字
第二行直接换行
普通段落换行测试

## 代码块
\`\`\`js
function test() {
  console.log('第一行')
  console.log('第二行')
}
\`\`\`

- 列表1
- 列表2`;

      // 逐字符分片推送
      for (const char of mdText) {
        send(char);
        await new Promise(r => setTimeout(r, 60));
      }
      send('[END]');
      controller.close();
    },
  });

  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}