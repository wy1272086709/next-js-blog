import { ChatOpenAI, ChatOpenAICallOptions, ChatOpenAIFields } from '@langchain/openai';
import { PromptTemplate } from '@langchain/core/prompts';
import { StringOutputParser, MarkdownListOutputParser } from '@langchain/core/output_parsers';

export function getModel(options?: ChatOpenAIFields): ChatOpenAI {
  if (!options) {
    options = {};
  }
  if (options.temperature === undefined || options.temperature === null) {
    Object.assign(options, {
      temperature: 0.3,
    });
  }
  return new ChatOpenAI({
    streaming: true,
    model: process.env.MODEL_NAME,
    apiKey: process.env.OPENAI_API_KEY,
    configuration: {
        baseURL: process.env.OPENAI_BASE_URL,
    },
    timeout: 30000, // 30秒超时
    ...options,
  });
}

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
  const model = getModel();
  return prompt.pipe(model).pipe(new StringOutputParser());
}

async function runChain(query: string): Promise<string> {
  return await chain().invoke({ query });
}

async function * runChainStream(query: string): AsyncGenerator<string> {
  const prompt = PromptTemplate.fromTemplate(
    `请为以下文章内容生成润色后的版本，要求：
1. 修正语法错误和拼写错误
2. 优化语句流畅度，使表达更加自然
3. 保持文章的基本风格和结构
4. 突出文章的核心观点和关键信息
5. 确保表达清晰易懂
6. 以标准 Markdown 格式输出
7. 输出时直接开始内容，不要添加任何说明文字

输出规则：
- 段落之间空一行,并加上
- 列表每项独占一行，并加上
- 代码块使用 \`\`\`XXX 包裹，换行并加上
- 代码块\`\`\`XXX 开头,则换行,加上
- 代码块\`\`\` 结尾,换行并加上
- 引用使用 > 符号，独占一行并加上

文章内容：
{query}
`);
  const model = getModel({
    streaming: true,
    timeout: 60000, // 60秒超时
  });

  // 使用 StringOutputParser 来简化流式处理
  const outputParser = new StringOutputParser();
  const stream = await prompt.pipe(model).pipe(outputParser).stream({ query });

  for await (const chunk of stream) {
    if (chunk && typeof chunk === 'string') {
      let cleanedChunk = chunk;
      
      yield cleanedChunk;
    }
  }
}

export { runChainStream };
export default runChain;
