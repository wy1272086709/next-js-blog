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
    // 如果连接已经断开，先清理客户端实例
    if (this.client && !this.isConnected) {
      try {
        await this.client.disconnect();
      } catch (err) {
        console.error('Error disconnecting old Redis client:', err);
      }
      this.client = null;
    }

    if (!this.client) {
      const url = process.env.REDIS_URL;
      const host = process.env.REDIS_HOST || 'localhost';
      const port = parseInt(process.env.REDIS_PORT || '6379');
      const password = process.env.REDIS_PASSWORD;

      this.client = createClient(
        url ? {
          url,
          socket: {
            reconnectStrategy: (retries) => {
              // 重连策略：最多重试5次，每次间隔时间递增
              if (retries > 5) {
                return false; // 停止重连
              }
              return Math.min(retries * 100, 3000); // 最多3秒
            }
          }
        } : {
          socket: {
            host,
            port,
            reconnectStrategy: (retries) => {
              if (retries > 5) {
                return false;
              }
              return Math.min(retries * 100, 3000);
            }
          },
          password
        }
      );

      this.client.on('error', (err) => {
        console.error('Redis Client Error', err.message);
        this.isConnected = false;
      });

      this.client.on('connect', () => {
        console.log('Redis Client Connected');
        this.isConnected = true;
      });

      this.client.on('end', () => {
        console.log('Redis Client Disconnected');
        this.isConnected = false;
      });

      this.client.on('reconnecting', () => {
        console.log('Redis Client Reconnecting...');
      });

      this.client.on('ready', () => {
        console.log('Redis Client Ready');
      });
    }

    try {
      if (!this.isConnected) {
        await this.client.connect();
        this.isConnected = true;
      }
    } catch (err) {
      console.error('Failed to connect to Redis:', err);
      this.isConnected = false;
      throw err;
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

  async set(key: string, value: any, options?: { ex?: number; EX?: number }): Promise<void> {
    let client = await this.getClient();
    const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
    const seconds = options?.ex ?? options?.EX;

    // 带重试的set操作
    const executeWithRetry = async (attempt = 1): Promise<void> => {
      try {
        if (seconds != null) {
          await client.setEx(key, seconds, stringValue);
        } else {
          await client.set(key, stringValue);
        }
      } catch (err) {
        if (attempt < 3 && err.message?.includes('Connection')) {
          // 连接错误，尝试重新连接并重试
          console.warn(`Redis set failed, retrying (${attempt}/3)...`, err.message);
          client = await this.getClient();
          return executeWithRetry(attempt + 1);
        }
        throw err;
      }
    };

    return executeWithRetry();
  }

  async get<T = any>(key: string): Promise<T | null> {
    let client = await this.getClient();

    // 带重试的get操作
    const executeWithRetry = async (attempt = 1): Promise<T | null> => {
      try {
        const value = await client.get(key);
        if (!value) return null;
        try {
          return JSON.parse(value) as T;
        } catch {
          return value as T;
        }
      } catch (err) {
        if (attempt < 3 && err.message?.includes('Connection')) {
          // 连接错误，尝试重新连接并重试
          console.warn(`Redis get failed, retrying (${attempt}/3)...`, err.message);
          client = await this.getClient();
          return executeWithRetry(attempt + 1);
        }
        throw err;
      }
    };

    return executeWithRetry();
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

  async decr(key: string): Promise<number> {
    const client = await this.getClient();
    return client.decr(key);
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

  async commonOperation(key: string, operation: string, ...args: any[]): Promise<any> {
    const client = await this.getClient();
    const method = operation as keyof RedisClientType<any>
    return ((client as any)[method])(key, ...args);
  }
}

// 导出单例
export const redis = RedisClient.getInstance();