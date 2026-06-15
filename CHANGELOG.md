# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2026-06-15

Релиз про **локальную разработку и отладку**: интеграционные тесты с реальными
D1/KV, отладка по точкам останова и инструменты ручного e2e.

### Added

- **Интеграционные тесты на `@cloudflare/vitest-pool-workers`** — тесты бегут
  внутри настоящего workerd с локальными D1/KV; миграции применяются автоматически
  (`test/apply-migrations.ts`). Покрыт слой репозитория: жизненный цикл пользователя,
  атомарный дневной лимит, история диалога, KV.
- **Отладка по точкам останова** — `pnpm dev` поднимает инспектор на фиксированном
  порту `9229` (`--inspector-port=9229`) для attach из VS Code / Chrome DevTools.
- **`scripts/send-update.sh`** — отправка поддельного Telegram-апдейта в локальный
  webhook: автоматически уникальный `message_id` (обход дедупа) и `bot_command`
  entity для команд.

### Changed

- **grammy** зафиксирован на `1.43.0` (и `@grammyjs/types@3.27.3`) — стабильные
  версии, проходящие supply-chain политику pnpm.
- **`pnpm-workspace.yaml`** — разрешены build-скрипты `workerd`/`esbuild`/`sharp`
  (pnpm v11 блокирует их по умолчанию), иначе `wrangler dev` не стартует.
- **Модели Gemini обновлены до 3.5** — `MODEL_FAST` и `MODEL_SMART` теперь
  `gemini-3.5-flash` (в `wrangler.toml` и `.dev.vars.example`).

## [1.0.0] - 2026-06-14

Первый публичный релиз — полный перенос CineMind с Google Apps Script
(Google Sheets как база) на современный стек **TypeScript + Cloudflare Workers**.

### Added

- **Runtime на Cloudflare Workers** — webhook (`fetch`) и ежемесячный дайджест
  (`scheduled` / Cron Triggers) в одном Worker. Долгие вызовы Gemini выполняются
  в фоне через `ctx.waitUntil` после мгновенного `200`, чтобы Telegram не ретраил.
- **Telegram-бот на [grammY](https://grammy.dev)** — онбординг, свободный чат с
  памятью диалога, inline-меню и роутинг команд.
- **Команды** `/cinema` (сеансы в кино рядом), `/releases` (свежие цифровые
  релизы), `/soon` (будущие премьеры) — с учётом профиля вкусов пользователя.
- **AI на Google Gemini** (Flash + Pro) с grounding через Google Search для
  актуальных данных в реальном времени; профиль вкусов строится из свободного
  описания пользователя.
- **Хранилище:** Cloudflare D1 (SQLite) + Drizzle ORM для пользователей и истории;
  Cloudflare KV для кэша, дедупликации и статуса VIP.
- **Геокодинг** через OpenStreetMap Nominatim для определения города.
- **Лимиты и VIP** — дневной лимит для бесплатных пользователей, безлимит по
  членству в закрытом Telegram-канале (`getChatMember`); ссылки Patreon/Boosty.
- **Миграция данных** — скрипт `import:sheet` переносит пользователей из старой
  Google-таблицы в D1.
- **Эксплуатация:** маскирование секретов в логах, проверка webhook по заголовку
  `X-Telegram-Bot-Api-Secret-Token`, скрипт `setup:webhook`.
- **Тесты и CI** — Vitest + GitHub Actions (typecheck, lint, тесты).

[1.1.0]: https://github.com/timatveev/CineMind/releases/tag/v1.1.0
[1.0.0]: https://github.com/timatveev/CineMind/releases/tag/v1.0.0
