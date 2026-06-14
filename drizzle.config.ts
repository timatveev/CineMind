import { defineConfig } from 'drizzle-kit';

/**
 * Drizzle Kit config — generates SQL migrations into ./migrations,
 * which `wrangler d1 migrations apply` then runs against D1.
 */
export default defineConfig({
  dialect: 'sqlite',
  driver: 'd1-http',
  schema: './src/db/schema.ts',
  out: './migrations',
});
