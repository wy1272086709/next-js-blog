/**
 * 简单的服务器端翻译函数，用于 API 路由
 * @param key 翻译键，格式为 "section.key"
 * @param locale 语言代码
 * @returns 翻译后的文本
 */
export async function getServerMessage(key: string, locale: string = 'zh-CN'): Promise<string> {
  try {
    // 动态导入语言包
    const messages = (await import(`../../messages/${locale}.json`)) as Record<string, any>

    // 解析键，例如 "api.unauthorized" -> messages.api.unauthorized
    const keys = key.split('.')
    let value: any = messages

    for (const k of keys) {
      value = value?.[k]
    }

    return value || key
  } catch (error) {
    // 如果找不到翻译，返回键本身
    return key
  }
}

/**
 * 获取默认用户名（不带中文）
 * @param userId 用户ID
 * @returns 默认用户名
 */
export function getDefaultUsername(userId: string): string {
  return `user_${userId.slice(-6)}`
}