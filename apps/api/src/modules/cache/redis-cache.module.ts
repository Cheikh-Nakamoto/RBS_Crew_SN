import { Module, Global } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { ConfigService } from '@nestjs/config';
import { redisStore } from 'cache-manager-ioredis-yet';

@Global()
@Module({
  imports: [
    CacheModule.registerAsync({
      isGlobal: true,
      inject: [ConfigService],
      useFactory: async (config: ConfigService) => ({
        store: redisStore,
        host: new URL(config.get<string>('REDIS_URL', 'redis://redis:6379'))
          .hostname,
        port: Number(
          new URL(config.get<string>('REDIS_URL', 'redis://redis:6379')).port ||
            6379,
        ),
        ttl: config.get<number>('REDIS_CACHE_TTL', 300),
      }),
    }),
  ],
})
export class RedisCacheModule {}
