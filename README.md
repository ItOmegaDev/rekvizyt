# Реквізити

Веб-сервіс для фізичної особи-підприємця: генерація пари документів —
**Рахунок на оплату** та **Акт прийому-передачі наданих послуг** — у форматі
А4, українською мовою, з сумою прописом. Усі дані зберігаються на вашому
сервері (SQLite).

![Node](https://img.shields.io/badge/node-%3E%3D24-339933?logo=node.js&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)
![License](https://img.shields.io/badge/license-private-lightgrey)

## Можливості

- Два (і більше) варіанти «Моїх реквізитів» — різні банки, вибираються при
  створенні документа.
- Замовники та договори: вибір договору автоматично підставляє реквізити
  замовника і тип послуги в акт.
- Ручне введення ціни та кількості, автопідсумок, сума прописом.
- Одна дата і один номер (`NN-MM`) для рахунку та акта.
- Друк і збереження в PDF через діалог браузера (A4, Times New Roman).
- Історичні документи зберігають знімок реквізитів — зміни довідників не
  впливають на вже створені документи.
- Вхід через Google OAuth зі списком дозволених email; у розробці — локальний
  вхід (прапорець `DEV_LOGIN`).

## Стек

- Monorepo (npm workspaces): `shared` (типи, схеми, гроші/дати), `server`
  (Express 4 + TypeScript, SQLite через `node:sqlite`), `client` (React 19 + Vite
  + TypeScript).
- Валідація: zod на сервері й клієнті.
- Безпека: helmet (CSP), CSRF за Origin, rate-limit, httpOnly-cookie, верифікація
  Google ID-token.

## Швидкий старт

```bash
cp .env.example .env
# відредагуйте .env: SESSION_SECRET (>=32 символи), за потреби GOOGLE_CLIENT_ID
npm install
npm run dev
```

Відкрийте http://localhost:5173 — у dev-режимі (`DEV_LOGIN=1`) на сторінці
входу з’явиться кнопка локального входу.

## Змінні оточення

| Змінна | Опис | За замовчуванням |
|---|---|---|
| `NODE_ENV` | `development` / `test` / `production` | `development` |
| `PORT` | Порт сервера | `4000` |
| `DATA_DIR` | Каталог з файлом БД | `.data` |
| `GOOGLE_CLIENT_ID` | Client ID з Google Cloud Console | — |
| `ALLOWED_EMAILS` | Дозволені email через кому | — |
| `SESSION_SECRET` | >=32 символи (обов’язково в production) | генерується в dev |
| `DEV_LOGIN` | `1` — локальний вхід без Google (тільки dev) | `0` |
| `CLIENT_ORIGIN` | Origin фронтенду (CORS/CSRF) | `http://localhost:5173` |
| `SERVE_CLIENT` | `1` — віддавати зібраний `client/dist` | `1` |

## Скрипти

| Команда | Що робить |
|---|---|
| `npm run dev` | сервер (4000) + Vite (5173) одночасно |
| `npm run build` | зібрати сервер і клієнт |
| `npm run typecheck` | перевірка типів усіх пакетів |
| `npm test` | unit + API тести (node:test) |
| `npm run smoke` | build + запуск сервера + `/api/health` |

## Структура

```
shared/src/   — типи, zod-схеми, гроші словами, дати, побудова документів
server/src/   — config, db (SQLite), репозиторії, маршрути, seed, app
client/src/   — сторінки, компоненти, стилі А4
client/public/ — статика (favicon)
```

## Друк і PDF

Відкрийте документ → «Друк / PDF». У діалозі друку виберіть «Зберегти як
PDF», розмір паперу A4, поля за замовчуванням (макет вже має власні поля).
Друкується лише обрана вкладка (Рахунок / Акт / Обидва).

## Тести

```bash
npm test
```

Покривають: гроші словами й форматування, дати, IBAN, вступні фрази, а також
повний API-сценарій (вхід, довідники, створення/редагування/повторення/
видалення документа, валідація, CSRF).

## Розгортання

Докладно — у [DEPLOY.md](./DEPLOY.md). Коротко:

```bash
cp .env.example .env   # заповніть production-змінні
docker compose up -d --build
```

Дані зберігаються у volume `rekvizyt_data` (`/data` у контейнері).

## Безпека

- Не відкривайте порт сервера назовні без TLS.
- `ALLOWED_EMAILS` — мінімально необхідний набір акаунтів.
- Регулярно оновлюйте залежності (`npm audit`).
- Резервні копії БД: `docker cp rekvizyt:/data/rekvizyt.db ./backup.db`.

## Ліцензія

Приватний проєкт.
