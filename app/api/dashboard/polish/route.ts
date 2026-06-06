import { runChainStream } from "@/lib/ai";
import { NextRequest } from "next/server";

interface PolishRequestBody {
  content?: string;
  resumeFrom?: unknown;
}

interface SSEData {
  status?: string;
  chunk?: string;
  error?: string;
  message?: string;
}

export async function POST(req: NextRequest): Promise<Response> {
  try {
    const { content: message = '', resumeFrom = null } = await req.json() as PolishRequestBody;
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        let hasSentResumeData = false;
        let lastChunkTime = Date.now();
        let isControllerClosed = false;

        const sendSSEData = (data: SSEData): void => {
          if (isControllerClosed) return;
          if (controller.desiredSize === null) {
            isControllerClosed = true;
            return;
          }

          const sseData = `data: ${JSON.stringify(data)}\n\n`;
          controller.enqueue(encoder.encode(sseData));
        };

        const sendHeartbeat = (): void => {
          if (Date.now() - lastChunkTime > 5000 && !isControllerClosed) {
            controller.enqueue(encoder.encode(': ping\n\n'));
            lastChunkTime = Date.now();
          }
        };

        const closeStream = (): void => {
          if (!isControllerClosed) {
            sendSSEData({ status: 'completed' });
            controller.close();
            isControllerClosed = true;
          }
        };

        try {
          // 发送开始事件
          sendSSEData({ status: 'started' });

          const llmStream = runChainStream(message);
          console.log('LLM 流式生成器已创建');

          // 处理恢复请求
          if (resumeFrom && !hasSentResumeData) {
            sendSSEData({ status: 'resumed' });
            hasSentResumeData = true;
            console.log('Sent resume marker');
          }

          // 逐 token 流式推送
          for await (const chunk of llmStream) {
            lastChunkTime = Date.now();

            const content = chunk || '';
            if (content && !isControllerClosed) {
              sendSSEData({ chunk });
              sendHeartbeat();
            }
          }

          closeStream();
        } catch (err) {
          console.error('流式处理错误:', err);
          if (!isControllerClosed) {
            sendSSEData({
              error: '处理出错',
              message: err instanceof Error ? err.message : String(err)
            });
            controller.close();
            isControllerClosed = true;
          }
        }
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Transfer-Encoding': 'chunked',
        'X-Accel-Buffering': 'no',
      },
    });
  } catch (error) {
    console.error('请求处理错误:', error);
    return new Response(
      JSON.stringify({
        error: '服务器错误',
        message: error instanceof Error ? error.message : String(error)
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
        },
      }
    );
  }
}