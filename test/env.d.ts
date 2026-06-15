import type { D1Migration } from '@cloudflare/vitest-pool-workers/config';
import type { Env } from '../src/env.js';

// Type the `env` exposed by `cloudflare:test` with our Worker bindings
// plus the migrations binding injected from vitest.config.ts.
declare module 'cloudflare:test' {
  interface ProvidedEnv extends Env {
    TEST_MIGRATIONS: D1Migration[];
  }
}
