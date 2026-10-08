FROM node:20-alpine AS base

# depsステージ：依存関係のインストール
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install

# builderステージ：ビルドの実行
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1

# Prisma Clientの生成（Prismaスキーマがある前提でビルド前に実行）
RUN npx prisma generate

RUN npm run build

# runnerステージ：本番実行用イメージ
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public

# キャッシュディレクトリのパーミッション設定
RUN mkdir .next
RUN chown nextjs:nodejs .next

# standaloneビルド成果物のコピー
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma

# entrypoint.sh のコピー（自動スキーマ適用スクリプト）
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./package.json
COPY --chown=nextjs:nodejs entrypoint.sh ./entrypoint.sh
RUN chmod +x ./entrypoint.sh

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# コンテナ起動時にPrismaスキーマ同期を自動実行してからNext.jsサーバーを起動する
CMD ["/bin/sh", "./entrypoint.sh"]
