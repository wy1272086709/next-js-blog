import runChain from "@/lib/ai";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
    try {
        const { content } = await req.json();

        // 验证输入
        if (!content || typeof content !== 'string' || content.trim().length === 0) {
            return NextResponse.json({ error: '内容不能为空' }, { status: 400 });
        }

        // 检查内容长度，过长的内容可能会影响生成效果
        if (content.length > 10000) {
            console.warn('内容过长，将截取前10000字符进行处理');
        }

        const processedContent = content.length > 10000 ? content.substring(0, 10000) : content;
        const result = await runChain(processedContent);

        if (!result || typeof result !== 'string') {
            throw new Error('AI返回结果无效');
        }

        return NextResponse.json({
            result: result.trim(),
            success: true
        });
    } catch (error) {
        console.error('AI生成摘要错误:', error);

        // 更友好的错误消息
        let errorMessage = '生成摘要失败';
        if (error instanceof Error) {
            if (error.message.includes('API key')) {
                errorMessage = 'AI服务配置错误，请联系管理员';
            } else if (error.message.includes('timeout')) {
                errorMessage = '请求超时，请稍后重试';
            } else {
                errorMessage = error.message || '生成摘要失败，请稍后重试';
            }
        }

        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}