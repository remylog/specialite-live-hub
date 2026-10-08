#!/bin/sh
set -e

# ビルド済みイメージ内のprisma CLIを使用（起動時に外部ネットワークを必要としない）
PRISMA="node node_modules/prisma/build/index.js"

echo "[entrypoint] Applying Prisma migrations..."
if ! OUTPUT=$($PRISMA migrate deploy 2>&1); then
  echo "$OUTPUT"
  # P3005: db push で作成済みの既存DB。ベースラインを適用済みとして記録してから再実行する
  if echo "$OUTPUT" | grep -q "P3005"; then
    echo "[entrypoint] Existing database detected. Marking baseline migration 0_init as applied..."
    $PRISMA migrate resolve --applied 0_init
    $PRISMA migrate deploy
  else
    echo "[entrypoint] Migration failed. Aborting startup." >&2
    exit 1
  fi
else
  echo "$OUTPUT"
fi

echo "[entrypoint] Migration complete. Starting Next.js server..."
exec node server.js
