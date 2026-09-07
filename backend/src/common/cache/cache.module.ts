import { Global, Module, OnApplicationShutdown } from '@nestjs/common';
import { CacheHelper } from './CacheHelper';

/**
 * Lifecycle only.
 *
 * `CacheHelper` is a static router, so nothing needs injecting — this module
 * exists purely so the backend is disconnected cleanly on shutdown instead of
 * leaving a Redis socket open until the process is killed.
 *
 * Requires `app.enableShutdownHooks()` in main.ts for SIGTERM to reach it.
 */
@Global()
@Module({})
export class CacheModule implements OnApplicationShutdown {
  async onApplicationShutdown(): Promise<void> {
    await CacheHelper.reset();
  }
}
