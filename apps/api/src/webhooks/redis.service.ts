import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private redisClient: Redis;

  constructor(private configService: ConfigService) {}

  onModuleInit() {
    const url = this.configService.get<string>('REDIS_URL');
    if (!url) {
      throw new Error('REDIS_URL is not configured');
    }
    this.redisClient = new Redis(url);
  }

  onModuleDestroy() {
    if (this.redisClient) {
      this.redisClient.quit();
    }
  }

  async setNx(key: string, value: string, ttlSeconds: number): Promise<boolean> {
    const result = await this.redisClient.set(key, value, 'EX', ttlSeconds, 'NX');
    return result === 'OK';
  }
}
