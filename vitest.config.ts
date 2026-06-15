import { fileURLToPath } from 'node:url';
import { defineWorkersConfig, readD1Migrations } from '@cloudflare/vitest-pool-workers/config';

export default defineWorkersConfig(async () => {
  // Read the same migrations wrangler uses, so the test DB matches production.
  const migrationsDir = fileURLToPath(new URL('./migrations', import.meta.url));
  const migrations = await readD1Migrations(migrationsDir);

  return {
    test: {
      include: ['test/**/*.test.ts'],
      setupFiles: ['./test/apply-migrations.ts'],
      poolOptions: {
        workers: {
          // Run all test files in one worker so DB/KV setup is shared.
          singleWorker: true,
          wrangler: { configPath: './wrangler.toml' },
          miniflare: {
            // Expose the parsed migrations to the setup file via a binding.
            bindings: { TEST_MIGRATIONS: migrations },
          },
        },
      },
    },
  };
});
