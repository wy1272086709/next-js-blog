import { ChatOpenAI } from '@langchain/openai';
import { PromptTemplate } from '@langchain/core/prompts';
import type { Runnable } from '@langchain/core/runnables';
import { StringOutputParser } from '@langchain/core/output_parsers';

function chain() {
    const prompt = PromptTemplate.fromTemplate(
        `请为以下文章内容生成一个简洁的摘要，要求：
1. 长度控制在50-150字之间
2. 突出文章的核心观点和关键信息
3. 语言简洁流畅，避免重复
4. 如果是技术文章，包含关键技术点
5. 如果是文章总结，包含主要结论

文章内容：
{query}

摘要：`,
    );
    const model = new ChatOpenAI({
      temperature: 0.3,
      model: process.env.MODEL_NAME,
      apiKey: process.env.OPENAI_API_KEY,
      configuration: {
        baseURL: process.env.OPENAI_BASE_URL,
      },
    });
    return prompt.pipe(model).pipe(new StringOutputParser());
}

async function runChain(query: string): Promise<string> {
    return await chain().invoke({ query });
}

export default runChain;
