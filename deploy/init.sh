#!/bin/bash
# =============================================================================
# DataMgmt 数据库初始化脚本
# 从 backend 容器内运行
# =============================================================================

set -e

echo ">>> 等待 PostgreSQL 就绪..."
until PGPASSWORD="$POSTGRES_PASSWORD" psql -h postgres -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c '\q' 2>/dev/null; do
  echo "    PostgreSQL 未就绪，等待 3 秒..."
  sleep 3
done
echo ">>> PostgreSQL 已就绪"

echo ">>> 应用 Prisma schema..."
npx prisma db push

echo ">>> 导入种子数据..."
npx prisma db seed

echo ">>> 生成 Prisma Client..."
npx prisma generate

echo ">>> 数据库初始化完成！"
