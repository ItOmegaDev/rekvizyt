# Розгортання (production)

## Вимоги

- Node.js >= 24 (або Docker).
- HTTPS-термінація на edge (nginx/Caddy/Traefik).
- Постійний том для `.data` (SQLite + WAL).

## Змінні оточення (production)

Обов’язкові:

- `NODE_ENV=production`
- `SESSION_SECRET` — мінімум 32 випадкові символи (`openssl rand -base64 48`).
- `GOOGLE_CLIENT_ID` — Client ID з Google Cloud Console.
- `ALLOWED_EMAILS` — список дозволених email через кому.
- `CLIENT_ORIGIN` — публічний URL фронтенду (наприклад `https://rekvizyt.example.com`).
- `DEV_LOGIN=0` (або не задавати).

Рекомендовані:

- `DATA_DIR=/data` (шлях до тому).
- `SERVE_CLIENT=1` — сервер віддає зібраний фронтенд.
- `PORT=4000`.

Сервер завершиться з помилкою при старті, якщо production-вимоги не виконано.

## Без Docker

```bash
npm ci
npm run build
NODE_ENV=production DATA_DIR=/var/lib/rekvizyt \
  SESSION_SECRET=... GOOGLE_CLIENT_ID=... ALLOWED_EMAILS=me@example.com \
  CLIENT_ORIGIN=https://rekvizyt.example.com \
  npm run start
```

Запускайте під systemd/PM2 з автоперезапуском. Резервне копіювання: копіюйте
`/var/lib/rekvizyt/rekvizyt.db` (і `-wal`, `-shm`) під час простою або через
`sqlite3 .backup`.

## Docker

```bash
cp .env.example .env
# заповніть .env
docker compose up -d --build
```

Дані зберігаються у volume `rekvizyt_data` (`/data` у контейнері).

## Reverse proxy (Caddy — приклад)

```
rekvizyt.example.com {
    reverse_proxy 127.0.0.1:4000
}
```

Важливо: передавайте `X-Forwarded-Proto: https`, щоб cookie була `Secure`.
Увімкніть HSTS на edge.

## Безпека

- Не відкривайте порт 4000 назовні без TLS.
- Регулярно оновлюйте залежності (`npm audit`).
- Резервні копії БД щодня.
- `ALLOWED_EMAILS` — мінімально необхідний набір акаунтів.
