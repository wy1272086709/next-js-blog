import { createClient } from 'redis'

export let redis: any;

export async function initRedis() {
  if (redis) {
    return redis;
  }
  if (!process.env.REDIS_URL) {
    throw new Error('REDIS_URL environment variable is not set')
  }
  const client = await createClient({ url: process.env.REDIS_URL }).connect();
  redis = client;
  return client;
}