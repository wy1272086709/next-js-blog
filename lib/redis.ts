import { createClient, RedisClientType } from 'redis';

class RedisClient {
  private static instance: RedisClient;
  private client: RedisClientType | null = null;
  private isConnected = false;

  private constructor() {}

  public static getInstance(): RedisClient {
    if (!RedisClient.instance) {
      RedisClient.instance = new RedisClient();
    }
    return RedisClient.instance;
  }

  /**
   * 获取 Redis 客户端实例，如果未连接则自动连接
   */
  async getClient(): Promise<RedisClientType> {
    if (!this.client) {
      const url = process.env.REDIS_URL;
      const host = process.env.REDIS_HOST || 'localhost';
      const port = parseInt(process.env.REDIS_PORT || '6379');
      const password = process.env.REDIS_PASSWORD;

      this.client = createClient(
        url ? { url } : { socket: { host, port }, password }
      );

      this.client.on('error', (err) => {
        console.error('Redis Client Error', err);
        this.isConnected = false;
      });

      this.client.on('connect', () => {
        console.log('Redis Client Connected');
        this.isConnected = true;
      });

      this.client.on('end', () => {
        this.isConnected = false;
      });
    }

    if (!this.isConnected) {
      await this.client.connect();
    }

    return this.client;
  }

  /**
   * 关闭连接（通常在应用关闭时调用）
   */
  async disconnect(): Promise<void> {
    if (this.client && this.isConnected) {
      await this.client.quit();
      this.client = null;
      this.isConnected = false;
    }
  }

  // ---------- 常用操作封装 ----------

  async set(key: string, value: any, options?: { ex?: number }): Promise<void> {
    const client = await this.getClient();
    const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
    if (options?.ex) {
      await client.setEx(key, options.ex, stringValue);
    } else {
      await client.set(key, stringValue);
    }
  }

  async get<T = any>(key: string): Promise<T | null> {
    const client = await this.getClient();
    const value = await client.get(key);
    if (!value) return null;
    try {
      return JSON.parse(value) as T;
    } catch {
      return value as T;
    }
  }

  async del(key: string): Promise<number> {
    const client = await this.getClient();
    return client.del(key);
  }

  async exists(key: string): Promise<boolean> {
    const client = await this.getClient();
    const result = await client.exists(key);
    return result === 1;
  }

  async expire(key: string, seconds: number): Promise<boolean> {
    const client = await this.getClient();
    const result = await client.expire(key, seconds);
    return result === 1;
  }

  async incr(key: string): Promise<number> {
    const client = await this.getClient();
    return client.incr(key);
  }

  async lpush(key: string, ...values: any[]): Promise<number> {
    const client = await this.getClient();
    const stringValues = values.map(v => typeof v === 'string' ? v : JSON.stringify(v));
    return client.lPush(key, stringValues);
  }

  async rpop(key: string): Promise<string | null> {
    const client = await this.getClient();
    return client.rPop(key);
  }

  // 其他常用方法可继续扩展...
}

// 导出单例
export const redis = RedisClient.getInstance();