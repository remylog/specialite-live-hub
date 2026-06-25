#!/bin/sh
set -e

echo "[entrypoint] Running Prisma db push to sync schema..."
npx prisma@6.19.3 db push --skip-generate --accept-data-loss

echo "[entrypoint] Schema sync complete. Starting Next.js server..."
exec node server.js
