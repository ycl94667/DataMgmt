# 资料管理系统

公考资料管理与下载系统，包含管理员后台和公开前台两部分。

## 技术栈

| 模块 | 技术 |
|------|------|
| 前端（管理端+前台） | Next.js 16 + React 19 + TypeScript + Tailwind + Zustand |
| 后端 | NestJS + Prisma + PostgreSQL |
| 认证 | JWT + RBAC |
| UI 组件 | shadcn / Base UI |

## 项目结构

```
datamgmt/
├── backend/              # NestJS 后端
│   ├── src/
│   │   └── modules/      # 业务模块（auth, project, document, tag, video, region, front...）
│   ├── prisma/
│   │   ├── schema.prisma # 数据模型
│   │   └── seed.ts       # 种子数据
│   └── package.json
├── frontend/             # Next.js 前端
│   ├── src/
│   │   ├── app/          # App Router 页面
│   │   │   ├── admin/    # 管理后台页面
│   │   │   └── (public)/ # 公开前台页面
│   │   ├── components/   # UI 组件
│   │   ├── lib/          # API 客户端、工具函数
│   │   ├── stores/       # Zustand 状态管理
│   │   └── types/        # TypeScript 类型定义
│   └── package.json
├── deploy/               # 服务器部署配置
│   ├── docker-compose.prod.yml
│   ├── Dockerfile.backend
│   ├── Dockerfile.frontend
│   ├── nginx.conf
│   ├── init.sh           # 数据库初始化
│   └── README.md         # 部署详细指南
├── docker-compose.yml    # 本地开发 PostgreSQL
└── README.md             # 本文档
```

## 本地开发

### 环境要求

- Node.js 18+
- Docker Desktop（或 Linux Docker）

### 1. 启动数据库

```bash
docker compose up -d postgres
```

### 2. 配置后端

```bash
cd backend

# 安装依赖
npm install

# 生成 Prisma Client
npx prisma generate

# 应用数据库迁移
npx prisma db push

# 导入种子数据
npx prisma db seed

# 启动开发服务器
npm run start:dev
```

后端地址: `http://localhost:3000`

### 3. 配置前端

```bash
cd frontend

# 安装依赖
npm install

# 复制环境变量
cp .env.local.example .env.local

# 启动开发服务器
npm run dev
```

前端地址: `http://localhost:3001`

### 4. 登录后台

- 地址: `http://localhost:3001/admin/login`
- 用户名: `admin`
- 密码: `admin123`

## 页面概览

### 管理后台 (`/admin/*`)

| 页面 | 说明 | 权限 |
|------|------|------|
| `/admin/projects` | 项目管理 | 所有管理员 |
| `/admin/documents` | 资料管理 | 所有管理员 |
| `/admin/tags` | 标签管理 | 所有管理员 |
| `/admin/videos` | 视频管理 | 所有管理员 |
| `/admin/regions` | 地区管理 | 所有管理员 |
| `/admin/auth-codes` | 授权码管理 | 超级管理员 |
| `/admin/recycle` | 回收站 | 所有管理员 |
| `/admin/audit-logs` | 审计日志 | 超级管理员 |
| `/admin/stats` | 统计概览 | 超级管理员 |
| `/admin/admins` | 管理员管理 | 超级管理员 |

### 公开前台

| 页面 | 说明 |
|------|------|
| `/` | 首页 |
| `/projects` | 项目列表 |
| `/category/[id]` | 类目页 |
| `/project/[id]` | 项目详情 |
| `/document/[id]` | 资料详情 |
| `/search` | 搜索 |

## 服务器部署

详细部署步骤请参考 [deploy/README.md](deploy/README.md)。

### 快速部署命令

```bash
cd deploy

# 1. 配置环境变量
cp .env.prod.example .env.prod
# 编辑 .env.prod 填入实际值

# 2. 构建并启动
docker compose -f docker-compose.prod.yml up -d --build

# 3. 初始化数据库
sleep 30
docker exec datamgmt-backend-1 sh init.sh
```

## API 接口

### 前台公开接口

```
GET  /api/front/categories          # 获取类目列表
GET  /api/front/regions             # 获取地区树
GET  /api/front/projects            # 项目列表
GET  /api/front/projects/:id        # 项目详情
GET  /api/front/documents           # 资料列表
GET  /api/front/documents/:id       # 资料详情
GET  /api/front/documents/search    # 搜索资料
GET  /api/front/videos              # 视频列表
POST /api/front/download/verify     # 验证授权码
GET  /api/front/download/:id         # 下载资料
```

### 管理后台接口（需 JWT 认证）

```
# 认证
POST /api/admin/auth/login
GET  /api/admin/auth/profile

# 项目
GET/POST       /api/admin/projects
GET/PUT/DELETE /api/admin/projects/:id

# 资料
GET/POST                  /api/admin/documents
GET/PUT/DELETE            /api/admin/documents/:id
POST                       /api/admin/documents/batch
POST                       /api/admin/documents/:id/replace
GET                        /api/admin/documents/:id/versions

# 标签、地区、视频、授权码、回收站、审计、统计、管理员...
```

## 数据模型

核心实体：Category → Project → Document
关联：Document ↔ Tag (多对多)、Document ↔ Project (多对多)
Region：省 → 市 → 区三级树形结构
授权码：AuthorizationCode + AuthorizationLog + DownloadLog

## 环境变量

### 前端 (.env.local)

```env
NEXT_PUBLIC_API_URL=http://localhost:3000
```

### 后端 (.env)

```env
DATABASE_URL=postgresql://examuser:exampass123@localhost:5432/examdb
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=24h
UPLOAD_DIR=./uploads
PORT=3000
```
