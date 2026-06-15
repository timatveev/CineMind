import { applyD1Migrations, env } from 'cloudflare:test';

// Bring the isolated test D1 up to the current schema (+ seed data) once,
// before any test runs. Idempotent: tracked in the d1_migrations table.
await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);
