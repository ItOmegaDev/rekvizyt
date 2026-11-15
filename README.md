# Rekvizyt

A web service for a sole proprietor (FOP): generate a document pair —
**Invoice for payment** and **Acceptance certificate of provided services** —
in A4 format, in Ukrainian, with the total amount spelled out in words. All
data is stored on your own server (SQLite).

![Node](https://img.shields.io/badge/node-%3E%3D24-339933?logo=node.js&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)
![License](https://img.shields.io/badge/license-private-lightgrey)

## Features

- Multiple "My details" profiles (different banks), selectable per document.
- Counterparties and contracts: selecting a contract auto-fills the
  counterparty's requisites and the service type into the certificate.
- Manual price and quantity input, automatic totals, amount in words.
- One date and one number (`NN-MM`) shared by both the invoice and the
  certificate.
- Print and save as PDF through the browser dialog (A4, Times New Roman).
- Historical documents keep a snapshot of requisites — later edits to
  directories do not alter already issued documents.
- Sign-in via Google OAuth with an allowlist of emails; a local dev login
  is available behind the `DEV_LOGIN` flag.

## Stack

- Monorepo (npm workspaces): `shared` (types, schemas, money/date helpers),
  `server` (Express 4 + TypeScript, SQLite via `node:sqlite`), `client`
  (React 19 + Vite + TypeScript).
- Validation: zod on both server and client.
- Security: helmet (CSP), CSRF via Origin, rate limiting, httpOnly cookies,
  Google ID-token verification.

## Quick start

```bash
cp .env.example .env
# edit .env: SESSION_SECRET (>=32 chars), optionally GOOGLE_CLIENT_ID
npm install
npm run dev
```

Open http://localhost:5173 — in dev mode (`DEV_LOGIN=1`) a local sign-in
button appears on the login page.

## Environment variables

| Variable | Description | Default |
|---|---|---|
| `NODE_ENV` | `development` / `test` / `production` | `development` |
| `PORT` | Server port | `4000` |
| `DATA_DIR` | Directory holding the DB file | `.data` |
| `GOOGLE_CLIENT_ID` | Client ID from Google Cloud Console | — |
| `ALLOWED_EMAILS` | Comma-separated list of allowed emails | — |
| `SESSION_SECRET` | >=32 chars (required in production) | generated in dev |
| `DEV_LOGIN` | `1` — local sign-in without Google (dev only) | `0` |
| `CLIENT_ORIGIN` | Frontend origin (CORS/CSRF) | `http://localhost:5173` |
| `SERVE_CLIENT` | `1` — serve the built `client/dist` | `1` |

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | server (4000) + Vite (5173) together |
| `npm run build` | build server and client |
| `npm run typecheck` | type-check all packages |
| `npm test` | unit + API tests (node:test) |
| `npm run smoke` | build + start server + `/api/health` |

## Project layout

```
shared/src/    — types, zod schemas, money-in-words, dates, document builders
server/src/    — config, db (SQLite), repositories, routes, seed, app
client/src/    — pages, components, A4 styles
client/public/ — static assets (favicon)
```

## Printing and PDF

Open a document → "Print / PDF". In the print dialog choose "Save as PDF",
paper size A4, default margins (the layout already has its own margins). Only
the selected tab (Invoice / Certificate / Both) is printed.

## Tests

```bash
npm test
```

Covers: money in words and formatting, dates, IBAN, certificate preambles, and
a full API scenario (sign-in, directories, create/edit/duplicate/delete
document, validation, CSRF).

## Deployment

See [DEPLOY.md](./DEPLOY.md). Short version:

```bash
cp .env.example .env   # fill in production variables
docker compose up -d --build
```

Data is stored in the `rekvizyt_data` volume (`/data` in the container).

## Security

- Do not expose the server port to the internet without TLS.
- `ALLOWED_EMAILS` — only the accounts that actually need access.
- Keep dependencies up to date (`npm audit`).
- Back up the DB: `docker cp rekvizyt:/data/rekvizyt.db ./backup.db`.

## License

Private project.
