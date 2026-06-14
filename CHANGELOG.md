# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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

[1.0.0]: https://github.com/timatveev/CineMind/releases/tag/v1.0.0
