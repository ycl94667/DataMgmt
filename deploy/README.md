# 服务器部署指南

本文档说明如何在 Linux 服务器上通过 Docker Compose 部署 DataMgmt 系统。

## 系统要求

- Linux (Ubuntu 20.04+ / CentOS 8+)
- Docker 20.10+
- Docker Compose v2+
- 至少 2GB RAM
- 20GB 磁盘空间

## 快速部署

### 1. 上传代码到服务器

```bash
# 方式 A：Git 部署（推荐）
git clone <your-repo-url> /opt/datamgmt
cd /opt/datamgmt

# 方式 B：手动上传
scp -r ./datamgmt/* user@your-server:/opt/datamgmt/
```

### 2. 配置环境变量

```bash
cd /opt/datamgmt/deploy

# 复制示例配置
cp .env.prod.example .env.prod

# 编辑实际值（必须修改的内容）
nano .env.prod
```

必须修改的值：

| 变量 | 说明 | 示例 |
|------|------|------|
| `POSTGRES_PASSWORD` | PostgreSQL 密码（强密码） | `openssl rand -base64 32` |
| `JWT_SECRET` | JWT 签名密钥（强密钥） | `openssl rand -base64 64` |
| `ALLOWED_ORIGINS` | 前端域名（逗号分隔） | `https://exam.yourdomain.com` |
| `NEXT_PUBLIC_API_URL` | API 地址（反代地址） | `https://exam.yourdomain.com` |

### 3. （可选）配置 SSL

将 SSL 证书放到 `deploy/certs/` 目录：

```
deploy/
├── certs/
│   ├── fullchain.pem    # 证书
│   └── privkey.pem      # 私钥
└── nginx.conf           # 取消 HTTPS server 块的注释
```

### 4. 启动服务

```bash
cd /opt/datamgmt/deploy

# 拉取镜像并构建（首次部署）
docker compose -f docker-compose.prod.yml up -d --build

# 查看日志
docker compose -f docker-compose.prod.yml logs -f
```

### 5. 初始化数据库

```bash
# 等待容器完全启动（约 30 秒）
sleep 30

# 执行数据库迁移和种子数据
docker exec -it datamgmt-backend-1 sh init.sh
```

### 6. 验证部署

```bash
# 检查所有容器状态
docker compose -f docker-compose.prod.yml ps

# 测试 API
curl http://localhost/api/front/categories

# 测试前台
curl http://localhost/

# 测试后台
curl http://localhost/admin/login
```

## 容器说明

| 容器名 | 镜像 | 端口 | 说明 |
|--------|------|------|------|
| `datamgmt-postgres` | postgres:16-alpine | 5432 | PostgreSQL 数据库 |
| `datamgmt-backend` | (build) | 3000 | NestJS 后端 API |
| `datamgmt-frontend` | (build) | 3000 | Next.js 前台应用 |
| `datamgmt-nginx` | nginx:1.27-alpine | 80, 443 | 反向代理 |

## 目录结构

```
deploy/
├── docker-compose.prod.yml    # Docker Compose 配置
├── Dockerfile.backend          # 后端镜像构建
├── Dockerfile.frontend        # 前端镜像构建
├── nginx.conf                 # Nginx 反向代理配置
├── init.sh                    # 数据库初始化脚本
├── .env.prod.example          # 环境变量模板
├── .env.prod                  # 实际环境变量（不提交）
└── README.md                  # 本文档
```

## 更新部署

```bash
cd /opt/datamgmt

# 更新代码
git pull

# 重新构建并重启服务
cd deploy
docker compose -f docker-compose.prod.yml build backend frontend
docker compose -f docker-compose.prod.yml up -d --no-deps backend frontend
```

## 数据管理

### 备份数据库

```bash
docker exec -it datamgmt-postgres-1 pg_dump -U examuser examdb > backup_$(date +%Y%m%d).sql
```

### 恢复数据库

```bash
cat backup_20240101.sql | docker exec -i datamgmt-postgres-1 psql -U examuser -d examdb
```

### 进入后端容器

```bash
docker exec -it datamgmt-backend-1 sh
```

### 查看后端日志

```bash
docker logs -f datamgmt-backend-1
```

## 防火墙配置

```bash
# Ubuntu/Debian (ufw)
ufw allow 80/tcp
ufw allow 443/tcp

# CentOS (firewalld)
firewall-cmd --permanent --add-port=80/tcp
firewall-cmd --permanent --add-port=443/tcp
firewall-cmd --reload
```

## 故障排除

### 容器启动失败

```bash
# 查看详细日志
docker compose -f docker-compose.prod.yml logs backend

# 检查端口占用
netstat -tlnp | grep -E '80|443|5432|3000'
```

### 数据库连接失败

```bash
# 确认 PostgreSQL 容器健康
docker compose -f docker-compose.prod.yml ps postgres

# 测试连接
docker exec -it datamgmt-backend-1 sh -c 'echo $DATABASE_URL'
```

### Prisma 迁移问题

```bash
# 进入容器
docker exec -it datamgmt-backend-1 sh

# 手动执行迁移
npx prisma db push

# 或重置数据库（会清空数据！）
npx prisma db push --force-reset
npx prisma db seed
```

## 默认管理员账户

部署完成后，使用 seed 数据中的默认账户登录后台：

- **用户名**: `admin`
- **密码**: `admin123`

> ⚠️ **生产环境务必修改默认密码！**

## 安全建议

1. 修改所有默认密码和密钥
2. 配置 SSL 证书（HTTPS）
3. 限制数据库端口访问（仅允许容器内访问）
4. 定期备份数据库
5. 保持 Docker 镜像更新
