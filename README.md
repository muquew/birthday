# 星星生日墙

面向公开访问的生日记录网站，带管理员后台。支持公历/农历生日、今日生日、近期提醒、全部生日列表与日历视图、月份视图、颜色主题、CSV/JSON 导入导出、批量管理、操作日志和站点设置。

默认访问路径：

```text
/xingxing
/xingxing/admin
/xingxing/api
```

当前版本：`V2.22.0`

## 技术栈

- 前端：React 19、React Router、Vite、TypeScript、CSS Variables。
- 后端：Express、Node.js、TypeScript。
- 数据库：SQLite，使用 Node 内置 `node:sqlite`。
- 校验：Zod。
- 农历：`lunar-javascript`。
- 测试：Vitest。

## 目录和文件作用

```text
.
├── .env.example              # 环境变量模板，复制为 .env 后用于部署配置
├── .gitignore                # Git 忽略规则，排除依赖、数据库、构建产物和本地输出
├── CHANGELOG.md              # 版本迭代记录
├── README.md                 # 项目使用、部署和维护说明
├── index.html                # Vite 前端入口 HTML
├── package.json              # npm 脚本和依赖声明
├── package-lock.json         # npm 锁文件，保证安装版本可复现
├── public/favicon.svg        # 网站图标
├── src/client/               # 前端 React 应用
│   ├── App.tsx               # 页面、组件、前端状态和交互主文件
│   ├── api.ts                # 前端 API 请求封装
│   ├── main.tsx              # React 挂载入口和路由 basename
│   └── styles.css            # 全站样式、响应式布局和主题变量
├── src/server/               # 后端 Express 服务
│   ├── app.ts                # Express 应用装配、静态文件和 SPA 回退
│   ├── auth.ts               # 管理员登录、会话 Cookie 和鉴权
│   ├── config.ts             # 环境变量读取和运行配置
│   ├── db.ts                 # SQLite 初始化、迁移和初始管理员创建
│   ├── index.ts              # 服务启动入口
│   ├── repository.ts         # 生日记录和操作日志的数据访问层
│   ├── routes.ts             # 公开 API、后台 API、导入导出和设置接口
│   ├── settings.ts           # 站点设置读写
│   └── *.test.ts             # 后端集成测试
├── src/shared/               # 前后端共享逻辑
│   ├── birthday.ts           # 公历/农历生日计算、下次生日和排序
│   ├── date.ts               # 日期工具
│   ├── settings.ts           # 默认站点设置和默认祝福模板
│   ├── types.ts              # 共享类型和固定基础路径
│   ├── validation.ts         # 输入校验规则
│   └── *.test.ts             # 共享逻辑测试
├── tsconfig.json             # 前端/共享代码 TypeScript 配置
├── tsconfig.server.json      # 后端构建 TypeScript 配置
└── vite.config.ts            # Vite 构建配置
```

以下目录是本地生成物，不应提交：

```text
node_modules/      # npm 依赖
dist/              # 前端生产构建产物
dist-server/       # 后端 TypeScript 编译产物
data/              # SQLite 数据库和 WAL/SHM 文件
output/            # 本地截图、日志或临时验证输出
.playwright-cli/   # Playwright CLI 临时输出
```

这些目录已经写入 `.gitignore`。

## 环境变量

部署时复制模板：

```bash
cp .env.example .env
```

`.env.example` 中的配置含义：

| 变量 | 作用 |
| --- | --- |
| `NODE_ENV` | 运行环境。生产部署建议设为 `production`，会强制检查管理员密码和会话密钥。 |
| `PORT` | 后端监听端口。 |
| `HOST` | 后端监听地址，服务器部署通常用 `0.0.0.0`。 |
| `BASE_PATH` | 服务挂载路径。当前前端按 `/xingxing` 构建，部署时应保持 `/xingxing`。 |
| `DATABASE_PATH` | SQLite 数据库文件路径。默认 `./data/birthday.sqlite`。 |
| `ADMIN_USERNAME` | 初次创建数据库时生成的管理员用户名。 |
| `ADMIN_PASSWORD` | 初次创建数据库时生成的管理员密码。生产环境必须修改。 |
| `SESSION_SECRET` | 管理员登录 Cookie 签名密钥。生产环境必须使用足够长的随机值。 |
| `SEED_SAMPLE_DATA` | 是否在空数据库中写入示例生日。生产建议 `false`。 |

`DATABASE_PATH` 不会和数据库冲突。它只是告诉程序 SQLite 文件放在哪里：

- 如果该文件不存在，服务启动时会自动创建数据库、表和初始管理员。
- 如果该文件已存在，服务会继续使用原数据库，不会因为 `.env` 存在而清空数据。
- 如果你修改 `DATABASE_PATH`，等于切换到另一个数据库文件。
- `ADMIN_USERNAME` 和 `ADMIN_PASSWORD` 只在数据库里还没有管理员时生效；已有管理员不会被自动覆盖。

## 数据来源

项目源码里不保存真实生日数据。运行时数据来源只有 SQLite 数据库：

- 生日记录：`birthday_people`
- 管理员账号和会话：`admin_users`、`admin_sessions`
- 站点设置和祝福模板：`site_settings`
- 操作日志：`admin_operation_logs`

当前仓库已清空 `data/`。首次部署启动后，如果 `SEED_SAMPLE_DATA=false`，数据库只有初始管理员，没有生日记录；你可以在后台手动添加或导入 CSV/JSON。

## 本地开发

如果使用 conda，可以先进入项目环境：

```bash
conda activate birthday-web
```

然后执行：

```bash
npm ci
npm test
npm run build
npm start
```

访问：

```text
http://127.0.0.1:3000/xingxing
http://127.0.0.1:3000/xingxing/admin
```

## 部署步骤

1. 安装 Node.js。需要支持 `node:sqlite` 的较新 Node 版本，本项目当前在 Node 24 环境验证通过。
2. 上传仓库源码到服务器。
3. 安装依赖：

```bash
npm ci
```

4. 准备环境变量：

```bash
cp .env.example .env
```

编辑 `.env`，至少修改：

```text
ADMIN_PASSWORD=换成强密码
SESSION_SECRET=换成足够长的随机字符串
SEED_SAMPLE_DATA=false
```

5. 构建：

```bash
npm run build
```

6. 启动：

```bash
npm start
```

7. 配置反向代理，把公网 `.com/xingxing` 转发到 Node 服务端口。例如 Nginx：

```nginx
location /xingxing/ {
  proxy_pass http://127.0.0.1:3000/xingxing/;
  proxy_http_version 1.1;
  proxy_set_header Host $host;
  proxy_set_header X-Real-IP $remote_addr;
  proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  proxy_set_header X-Forwarded-Proto $scheme;
}
```

如果还要让 `/xingxing` 自动带上尾部斜杠，可以增加：

```nginx
location = /xingxing {
  return 301 /xingxing/;
}
```

长期运行建议使用 systemd、pm2 或其他进程管理工具。

## Git 提交前检查

```bash
git status --short
npm test
npm run build
npm audit --omit=dev
```

确认不要提交这些内容：

```text
node_modules/
dist/
dist-server/
data/
output/
.playwright-cli/
.env
```

如果刚构建过，`dist/` 和 `dist-server/` 会重新出现，但它们被 `.gitignore` 忽略，不会进入仓库。
