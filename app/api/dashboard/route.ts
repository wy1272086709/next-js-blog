import runChain from "@/lib/ai";
import { NextResponse } from "next/server";
import { getServerMessage } from "@/lib/i18n/server";

export async function POST(req: Request) {
    try {
        const { content } = await req.json();

        // 验证输入
        if (!content || typeof content !== 'string' || content.trim().length === 0) {
            return NextResponse.json({ error: await getServerMessage('api.contentEmpty', 'Content cannot be empty') }, { status: 400 });
        }

        // 检查内容长度，过长的内容可能会影响生成效果
        if (content.length > 10000) {
            console.warn('Content too long, will process first 10000 characters');
        }

        const processedContent = content.length > 10000 ? content.substring(0, 10000) : content;
        const result = await runChain(processedContent);

        if (!result || typeof result !== 'string') {
            throw new Error(await getServerMessage('ai.invalidResult', 'AI returned invalid result'));
        }

        return NextResponse.json({
            result: result.trim(),
            success: true
        });
    } catch (error) {
        console.error('AI生成摘要错误:', error);

        // 更友好的错误消息
        let errorMessage = await getServerMessage('ai.generateSummaryFailed', 'Failed to generate summary');
        if (error instanceof Error) {
            if (error.message.includes('API key')) {
                errorMessage = await getServerMessage('ai.configError', 'AI service configuration error, please contact administrator');
            } else if (error.message.includes('timeout')) {
                errorMessage = await getServerMessage('ai.timeout', 'Request timeout, please try again later');
            } else {
                errorMessage = error.message || await getServerMessage('ai.generateSummaryFailedRetry', 'Failed to generate summary, please try again later');
            }
        }

        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}