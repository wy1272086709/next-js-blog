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
          // 快速检查
          if (isControllerClosed) return;

          try {
            // 检查控制器是否仍然活跃
            if (controller.desiredSize === null || controller.desiredSize <= 0) {
              isControllerClosed = true;
              return;
            }

            const sseData = `data: ${JSON.stringify(data)}\n\n`;
            controller.enqueue(encoder.encode(sseData));
          } catch (err) {
            // 立即标记为已关闭，防止继续尝试
            isControllerClosed = true;
            console.error('发送SSE数据失败:', err);
            // 不重新抛出错误，让流程自然结束
          }
        };

        const sendHeartbeat = (): void => {
          if (Date.now() - lastChunkTime > 5000 && !isControllerClosed) {
            try {
              controller.enqueue(encoder.encode(': ping\n\n'));
              lastChunkTime = Date.now();
            } catch (err) {
              console.error('发送心跳失败:', err);
              isControllerClosed = true;
            }
          }
        };

        const closeStream = (): void => {
          // 使用原子操作检查和设置
          if (!isControllerClosed) {
            isControllerClosed = true;
            try {
              sendSSEData({ status: 'completed' });
              controller.close();
            } catch (err) {
              console.error('关闭流时出错:', err);
              // 即使出错也确保控制器被关闭
            }
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
          try {
            for await (const chunk of llmStream) {
              // 每次迭代都检查控制器状态
              if (isControllerClosed) break;

              lastChunkTime = Date.now();

              const content = chunk || '';
              if (content && !isControllerClosed) {
                sendSSEData({ chunk });
                sendHeartbeat();
              }
            }
          } catch (err) {
            console.error('流式生成迭代错误:', err);
            // 流式生成被中断是正常的（例如用户暂停）
            if (!isControllerClosed) {
              isControllerClosed = true;
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