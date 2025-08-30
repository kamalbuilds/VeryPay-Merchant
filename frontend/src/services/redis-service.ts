import { createClient, RedisClientType } from 'redis';
import { config } from '../utils/config';
import { Logger } from '../utils/logger';
import { CacheOptions, CachedData } from '../types';

export class RedisService {
  private static client: RedisClientType;
  private static isInitialized = false;

  /**
   * Initialize Redis connection
   */
  static async initialize(): Promise<void> {
    try {
      this.client = createClient({
        url: config.redis.url,
        database: config.redis.db,
        socket: {
          connectTimeout: 5000,
          lazyConnect: true,
          reconnectStrategy: (retries) => {
            if (retries > 10) {
              Logger.error('Redis reconnection failed after 10 attempts');
              return false;
            }
            return Math.min(retries * 100, 3000);
          }
        }
      });

      // Event listeners
      this.client.on('connect', () => {
        Logger.info('Redis client connected');
      });

      this.client.on('ready', () => {
        Logger.info('Redis client ready');
        this.isInitialized = true;
      });

      this.client.on('error', (error) => {
        Logger.error('Redis client error', error);
      });

      this.client.on('end', () => {
        Logger.warn('Redis client connection ended');
        this.isInitialized = false;
      });

      this.client.on('reconnecting', () => {
        Logger.info('Redis client reconnecting');
      });

      await this.client.connect();
      
      // Test connection
      await this.client.ping();
      Logger.info('Redis connection established successfully');

    } catch (error) {
      Logger.error('Failed to initialize Redis', error);
      throw error;
    }
  }

  /**
   * Check if Redis is connected
   */
  static async isConnected(): Promise<boolean> {
    try {
      if (!this.client || !this.isInitialized) {
        return false;
      }
      await this.client.ping();
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Disconnect from Redis
   */
  static async disconnect(): Promise<void> {
    try {
      if (this.client) {
        await this.client.quit();
        Logger.info('Redis client disconnected');
      }
    } catch (error) {
      Logger.error('Error disconnecting from Redis', error);
    }
  }

  /**
   * Set a key-value pair with optional TTL
   */
  static async set(
    key: string, 
    value: any, 
    options: CacheOptions = {}
  ): Promise<void> {
    try {
      const serializedValue = JSON.stringify({
        data: value,
        timestamp: Date.now(),
        ttl: options.ttl || 3600
      });

      const fullKey = options.namespace ? `${options.namespace}:${key}` : key;

      if (options.ttl) {
        await this.client.setEx(fullKey, options.ttl, serializedValue);
      } else {
        await this.client.set(fullKey, serializedValue);
      }

      Logger.debug('Redis SET operation completed', { key: fullKey, ttl: options.ttl });

    } catch (error) {
      Logger.error('Redis SET operation failed', error, { key, options });
      throw error;
    }
  }

  /**
   * Get value by key
   */
  static async get<T = any>(
    key: string, 
    namespace?: string
  ): Promise<T | null> {
    try {
      const fullKey = namespace ? `${namespace}:${key}` : key;
      const value = await this.client.get(fullKey);

      if (!value) {
        return null;
      }

      const cachedData: CachedData<T> = JSON.parse(value);
      
      // Check if data has expired
      const now = Date.now();
      const age = now - cachedData.timestamp;
      const ttl = cachedData.ttl * 1000; // Convert to milliseconds

      if (age > ttl) {
        await this.del(key, namespace);
        return null;
      }

      Logger.debug('Redis GET operation completed', { key: fullKey });
      return cachedData.data;

    } catch (error) {
      Logger.error('Redis GET operation failed', error, { key, namespace });
      return null;
    }
  }

  /**
   * Delete a key
   */
  static async del(key: string, namespace?: string): Promise<void> {
    try {
      const fullKey = namespace ? `${namespace}:${key}` : key;
      await this.client.del(fullKey);
      Logger.debug('Redis DEL operation completed', { key: fullKey });
    } catch (error) {
      Logger.error('Redis DEL operation failed', error, { key, namespace });
      throw error;
    }
  }

  /**
   * Check if key exists
   */
  static async exists(key: string, namespace?: string): Promise<boolean> {
    try {
      const fullKey = namespace ? `${namespace}:${key}` : key;
      const result = await this.client.exists(fullKey);
      return result === 1;
    } catch (error) {
      Logger.error('Redis EXISTS operation failed', error, { key, namespace });
      return false;
    }
  }

  /**
   * Set TTL for existing key
   */
  static async expire(key: string, ttl: number, namespace?: string): Promise<void> {
    try {
      const fullKey = namespace ? `${namespace}:${key}` : key;
      await this.client.expire(fullKey, ttl);
      Logger.debug('Redis EXPIRE operation completed', { key: fullKey, ttl });
    } catch (error) {
      Logger.error('Redis EXPIRE operation failed', error, { key, namespace, ttl });
      throw error;
    }
  }

  /**
   * Get keys matching pattern
   */
  static async keys(pattern: string, namespace?: string): Promise<string[]> {
    try {
      const fullPattern = namespace ? `${namespace}:${pattern}` : pattern;
      const keys = await this.client.keys(fullPattern);
      
      // Remove namespace prefix if present
      return namespace ? 
        keys.map(key => key.replace(`${namespace}:`, '')) : 
        keys;
    } catch (error) {
      Logger.error('Redis KEYS operation failed', error, { pattern, namespace });
      return [];
    }
  }

  /**
   * Hash operations
   */
  static async hSet(
    hash: string, 
    field: string, 
    value: any, 
    namespace?: string
  ): Promise<void> {
    try {
      const fullHash = namespace ? `${namespace}:${hash}` : hash;
      await this.client.hSet(fullHash, field, JSON.stringify(value));
      Logger.debug('Redis HSET operation completed', { hash: fullHash, field });
    } catch (error) {
      Logger.error('Redis HSET operation failed', error, { hash, field, namespace });
      throw error;
    }
  }

  static async hGet<T = any>(
    hash: string, 
    field: string, 
    namespace?: string
  ): Promise<T | null> {
    try {
      const fullHash = namespace ? `${namespace}:${hash}` : hash;
      const value = await this.client.hGet(fullHash, field);
      
      if (!value) {
        return null;
      }

      return JSON.parse(value);
    } catch (error) {
      Logger.error('Redis HGET operation failed', error, { hash, field, namespace });
      return null;
    }
  }

  static async hDel(
    hash: string, 
    field: string, 
    namespace?: string
  ): Promise<void> {
    try {
      const fullHash = namespace ? `${namespace}:${hash}` : hash;
      await this.client.hDel(fullHash, field);
      Logger.debug('Redis HDEL operation completed', { hash: fullHash, field });
    } catch (error) {
      Logger.error('Redis HDEL operation failed', error, { hash, field, namespace });
      throw error;
    }
  }

  static async hGetAll<T = any>(
    hash: string, 
    namespace?: string
  ): Promise<Record<string, T>> {
    try {
      const fullHash = namespace ? `${namespace}:${hash}` : hash;
      const result = await this.client.hGetAll(fullHash);
      
      const parsed: Record<string, T> = {};
      for (const [field, value] of Object.entries(result)) {
        parsed[field] = JSON.parse(value);
      }
      
      return parsed;
    } catch (error) {
      Logger.error('Redis HGETALL operation failed', error, { hash, namespace });
      return {};
    }
  }

  /**
   * List operations
   */
  static async lPush(
    list: string, 
    value: any, 
    namespace?: string
  ): Promise<void> {
    try {
      const fullList = namespace ? `${namespace}:${list}` : list;
      await this.client.lPush(fullList, JSON.stringify(value));
      Logger.debug('Redis LPUSH operation completed', { list: fullList });
    } catch (error) {
      Logger.error('Redis LPUSH operation failed', error, { list, namespace });
      throw error;
    }
  }

  static async rPop<T = any>(
    list: string, 
    namespace?: string
  ): Promise<T | null> {
    try {
      const fullList = namespace ? `${namespace}:${list}` : list;
      const value = await this.client.rPop(fullList);
      
      if (!value) {
        return null;
      }

      return JSON.parse(value);
    } catch (error) {
      Logger.error('Redis RPOP operation failed', error, { list, namespace });
      return null;
    }
  }

  static async lRange<T = any>(
    list: string, 
    start: number, 
    stop: number, 
    namespace?: string
  ): Promise<T[]> {
    try {
      const fullList = namespace ? `${namespace}:${list}` : list;
      const values = await this.client.lRange(fullList, start, stop);
      
      return values.map(value => JSON.parse(value));
    } catch (error) {
      Logger.error('Redis LRANGE operation failed', error, { list, start, stop, namespace });
      return [];
    }
  }

  /**
   * Set operations
   */
  static async sAdd(
    set: string, 
    value: any, 
    namespace?: string
  ): Promise<void> {
    try {
      const fullSet = namespace ? `${namespace}:${set}` : set;
      await this.client.sAdd(fullSet, JSON.stringify(value));
      Logger.debug('Redis SADD operation completed', { set: fullSet });
    } catch (error) {
      Logger.error('Redis SADD operation failed', error, { set, namespace });
      throw error;
    }
  }

  static async sMembers<T = any>(
    set: string, 
    namespace?: string
  ): Promise<T[]> {
    try {
      const fullSet = namespace ? `${namespace}:${set}` : set;
      const values = await this.client.sMembers(fullSet);
      
      return values.map(value => JSON.parse(value));
    } catch (error) {
      Logger.error('Redis SMEMBERS operation failed', error, { set, namespace });
      return [];
    }
  }

  /**
   * Increment/Decrement operations
   */
  static async incr(key: string, namespace?: string): Promise<number> {
    try {
      const fullKey = namespace ? `${namespace}:${key}` : key;
      return await this.client.incr(fullKey);
    } catch (error) {
      Logger.error('Redis INCR operation failed', error, { key, namespace });
      throw error;
    }
  }

  static async incrBy(key: string, increment: number, namespace?: string): Promise<number> {
    try {
      const fullKey = namespace ? `${namespace}:${key}` : key;
      return await this.client.incrBy(fullKey, increment);
    } catch (error) {
      Logger.error('Redis INCRBY operation failed', error, { key, increment, namespace });
      throw error;
    }
  }

  /**
   * Flush operations
   */
  static async flushNamespace(namespace: string): Promise<void> {
    try {
      const keys = await this.keys('*', namespace);
      
      if (keys.length > 0) {
        const fullKeys = keys.map(key => `${namespace}:${key}`);
        await this.client.del(fullKeys);
        Logger.info(`Flushed ${keys.length} keys from namespace: ${namespace}`);
      }
    } catch (error) {
      Logger.error('Redis namespace flush failed', error, { namespace });
      throw error;
    }
  }

  static async flushAll(): Promise<void> {
    try {
      await this.client.flushAll();
      Logger.warn('Redis FLUSHALL operation completed - all data cleared');
    } catch (error) {
      Logger.error('Redis FLUSHALL operation failed', error);
      throw error;
    }
  }
}

export default RedisService;