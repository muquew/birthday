# 星星生日墙

公开生日展示网站，带管理员后台。支持公历/农历生日、今日生日、近期提醒、全部生日列表与日历视图、月份视图、颜色主题、CSV/JSON 导入导出、批量管理、操作日志和站点设置。

默认访问路径：

```text
/xingxing
/xingxing/admin
/xingxing/api
```

当前版本：`V2.22.0`

## 技术栈

- 前端：React 19、React Router、Vite、TypeScript。
- 后端：Node.js、Express、TypeScript。
- 数据库：SQLite，使用 Node 内置 `node:sqlite`。
- 校验：Zod。
- 农历：`lunar-javascript`。
- 测试：Vitest。

生产环境必须使用 Node 24 或更新版本。

## 仓库结构

```text
.
├── .env.example                    # 唯一环境变量模板
├── .gitignore                      # Git 忽略规则
├── CHANGELOG.md                    # 版本记录
├── README.md                       # 项目说明和部署说明
├── deploy/
│   └── xingxing-birthday.service   # systemd 服务模板
├── index.html                      # Vite HTML 入口
├── package.json                    # npm 脚本和依赖
├── package-lock.json               # npm 锁文件
├── public/favicon.svg              # 网站图标
├── src/client/                     # 前端代码
├── src/server/                     # 后端代码
├── src/shared/                     # 前后端共享类型、校验和生日计算
├── tsconfig.json                   # 前端/共享 TypeScript 配置
├── tsconfig.server.json            # 后端 TypeScript 构建配置
└── vite.config.ts                  # Vite 配置
```

## 关键文件作用

- `src/client/App.tsx`：前端页面、组件、状态和交互。
- `src/client/api.ts`：前端 API 请求封装。
- `src/client/main.tsx`：React 挂载入口，设置 `/xingxing` 路由前缀。
- `src/client/styles.css`：全站样式、响应式布局和主题变量。
- `src/server/app.ts`：Express 应用装配、静态文件服务和 SPA 回退。
- `src/server/auth.ts`：管理员登录、会话 Cookie 和鉴权。
- `src/server/config.ts`：读取环境变量。
- `src/server/db.ts`：SQLite 初始化、迁移和初始管理员创建。
- `src/server/repository.ts`：生日记录、批量操作和操作日志的数据访问层。
- `src/server/routes.ts`：公开 API、后台 API、导入导出和设置接口。
- `src/shared/birthday.ts`：公历/农历生日计算和下次生日排序。
- `src/shared/validation.ts`：输入校验规则。
- `deploy/xingxing-birthday.service`：systemd 服务模板。

## 单目录原则

推荐把应用相关文件都放在同一个项目目录里，例如：

```text
/opt/xingxing-birthday/
├── .env                 # 生产环境变量，来自 .env.example
├── data/                # SQLite 数据库目录
├── dist/                # 前端构建产物
├── dist-server/         # 后端构建产物
├── deploy/              # systemd 模板
├── src/                 # 源码
└── package.json
```

系统外部只保留必要入口：

- `/etc/systemd/system/xingxing-birthday.service`：systemd 服务注册，可用软链接指向项目里的模板。
- Nginx 站点配置：反代 `/xingxing/` 到 Node 服务。

也就是说，环境变量和数据库都留在项目目录里，不再拆到额外的系统级配置目录或数据目录。

## 环境变量

```text
.env.example
```

部署时复制到项目根目录：

```bash
cp .env.example .env
```

变量含义：

| 变量 | 作用 |
| --- | --- |
| `NODE_NO_WARNINGS` | 隐藏 Node 对 `node:sqlite` 的实验性提示。 |
| `PATH` | 给 systemd 查找 `node` 使用。 |
| `PORT` | Node 服务监听端口。 |
| `HOST` | Node 服务监听地址。Nginx 反代时推荐 `127.0.0.1`。 |
| `BASE_PATH` | 网站挂载路径。当前代码固定按 `/xingxing` 使用。 |
| `ADMIN_USERNAME` | 数据库首次创建管理员时使用的用户名。 |
| `ADMIN_PASSWORD` | 数据库首次创建管理员时使用的密码，生产必须修改。 |
| `SESSION_SECRET` | 管理员登录 Cookie 签名密钥，生产必须换成长随机字符串。 |
| `SEED_SAMPLE_DATA` | 空数据库是否写入示例生日。生产建议 `false`。 |
| `DATABASE_PATH` | SQLite 数据库路径。默认 `./data/birthday.sqlite`，相对于项目根目录。 |

生产运行的 `NODE_ENV=production` 由 systemd 服务文件设置，不写进 `.env`。这样 `npm run build` 时 Vite 不会把 `.env` 里的 `NODE_ENV` 当成构建模式并输出警告。

## 开发、构建和部署环境

项目区分三种阶段，但不要用同一个 `.env` 里的 `NODE_ENV` 同时控制它们：

- 开发环境：执行 `npm run dev`。Vite 使用开发模式，后端也不会进入生产校验，方便本地调试。
- 构建环境：执行 `npm run build`。Vite 会自动按 production build 输出前端静态文件，不需要在 `.env` 里写 `NODE_ENV=production`。
- 部署运行环境：由 systemd 启动 `dist-server/server/index.js`，服务文件里通过 `ExecStart=/usr/bin/env NODE_ENV=production node ...` 设置生产运行环境。

因此 `.env` 只保存端口、挂载路径、数据库路径、管理员初始密码、会话密钥等稳定配置。`NODE_ENV=production` 只在真正运行服务时由 systemd 注入，用来启用后端生产校验和生产 Cookie 设置。

`DATABASE_PATH` 不会和数据库冲突。它只决定 SQLite 文件放在哪里：

- 文件不存在时，服务启动会自动创建数据库、表和初始管理员。
- 文件存在时，服务继续使用原数据，不会因为 `.env` 改动而清空。
- 修改 `DATABASE_PATH` 等于切换到另一个数据库文件。
- `ADMIN_USERNAME` 和 `ADMIN_PASSWORD` 只在数据库没有管理员时生效；已有管理员不会被自动覆盖。

## 数据来源

真实数据不在源码里。运行时数据只来自 SQLite：

- `birthday_people`：生日记录。
- `admin_users`、`admin_sessions`：管理员和登录会话。
- `site_settings`：站点设置和祝福模板。
- `admin_operation_logs`：操作日志。

默认数据库路径：

```text
./data/birthday.sqlite
```

`data/` 已被 `.gitignore` 忽略，适合放在部署目录中长期保留。

## 构建产物

执行：

```bash
npm run build
```

会生成两个目录：

```text
dist/          # 前端静态文件，HTML/CSS/JS
dist-server/   # 后端编译后的 Express 服务
```

不需要分别反代这两个目录。运行后端服务即可：

```bash
npm start
```

Express 会统一处理：

```text
/xingxing       前端页面，来自 dist/
/xingxing/admin 前端管理员页面，来自 dist/
/xingxing/api   后端 API，来自 Express
```

所以 Nginx 只需要把 `/xingxing/` 反代给 Node 服务。

## 本地运行

```bash
npm ci
cp .env.example .env
npm test
npm run build
npm start
```

访问：

```text
http://127.0.0.1:3000/xingxing
http://127.0.0.1:3000/xingxing/admin
```

## 服务器 Node 版本

生产部署前先确认服务器使用的是 Node 24 或更新版本。Node 18 即使能执行 `npm ci`，也会因为 Vite、React Router、Vitest 和后端 `node:sqlite` 的版本要求带来构建或运行风险。

```bash
node -v
npm -v
```

如果服务器还是 Node 18，可以安装系统级 Node 24。下面方式会把 `node` 放到 systemd 默认能找到的系统路径里：

```bash
sudo npm install -g n
sudo n 24
hash -r

node -v
npm -v
sudo env PATH=/usr/local/bin:/usr/bin:/bin node -v
```

确认输出是 `v24.x.x` 后，再继续执行后面的 `npm ci` 和 `npm run build`。

如果已经在 Node 18 下执行过 `npm ci`，升级 Node 后重新执行：

```bash
npm ci
npm run build
```

## 推荐部署：单目录 + systemd + Nginx

下面以 `/opt/xingxing-birthday` 为例。

首次部署：

```bash
# 创建运行服务的系统用户和用户组；已有则跳过。
sudo getent group xingxing >/dev/null || sudo groupadd --system xingxing
sudo id -u xingxing >/dev/null 2>&1 || sudo useradd --system --gid xingxing --home-dir /opt/xingxing-birthday --shell /usr/sbin/nologin xingxing

sudo git clone <你的仓库地址> /opt/xingxing-birthday
cd /opt/xingxing-birthday

sudo npm ci
sudo npm run build
sudo cp .env.example .env
sudo install -d -o xingxing -g xingxing data
sudo chown -R xingxing:xingxing data
sudoedit .env
sudo chown root:xingxing .env
sudo chmod 640 .env
```

至少修改 `.env` 里的这些值：

```text
ADMIN_PASSWORD=换成强密码
SESSION_SECRET=换成足够长的随机字符串
SEED_SAMPLE_DATA=false
DATABASE_PATH=./data/birthday.sqlite
```

也可以直接用命令生成并写入。执行后终端会显示生成的管理员初始密码，请保存好：

```bash
ADMIN_PASSWORD="$(openssl rand -hex 16)"
SESSION_SECRET="$(openssl rand -hex 48)"

sudo sed -i "s/^ADMIN_PASSWORD=.*/ADMIN_PASSWORD=${ADMIN_PASSWORD}/" .env
sudo sed -i "s/^SESSION_SECRET=.*/SESSION_SECRET=${SESSION_SECRET}/" .env
sudo sed -i "s/^SEED_SAMPLE_DATA=.*/SEED_SAMPLE_DATA=false/" .env
sudo sed -i "s#^DATABASE_PATH=.*#DATABASE_PATH=./data/birthday.sqlite#" .env

printf 'ADMIN_PASSWORD=%s\n' "$ADMIN_PASSWORD"
```

注册 systemd。推荐用软链接，让服务文件仍然来自项目目录：

```bash
sudo ln -sf /opt/xingxing-birthday/deploy/xingxing-birthday.service /etc/systemd/system/xingxing-birthday.service
sudo systemctl daemon-reload
sudo systemctl enable --now xingxing-birthday
sudo systemctl status xingxing-birthday
```

日志：

```bash
journalctl -u xingxing-birthday -f
```

更新。下面命令可以直接在服务器执行：

```bash
cd /opt/xingxing-birthday

# 可选但推荐：更新前备份数据库。
sudo cp -a data/birthday.sqlite "data/birthday.sqlite.$(date +%Y%m%d-%H%M%S).bak" 2>/dev/null || true

# 拉取最新代码。
sudo git fetch origin
sudo git pull --ff-only origin main

# 兼容旧部署：如果旧 .env 写过 NODE_ENV=production，删掉这一行。
sudo sed -i '/^NODE_ENV=/d' .env

# 安装依赖并重新构建。
sudo npm ci
sudo npm run build

# 如果 systemd service 是软链接，这一步会直接读取项目里的最新模板。
# 如果不是软链接，先复制一次最新 service 文件。
if [ "$(readlink -f /etc/systemd/system/xingxing-birthday.service)" != "/opt/xingxing-birthday/deploy/xingxing-birthday.service" ]; then
  sudo cp /opt/xingxing-birthday/deploy/xingxing-birthday.service /etc/systemd/system/xingxing-birthday.service
fi

sudo systemctl daemon-reload
sudo systemctl restart xingxing-birthday
sudo systemctl status xingxing-birthday --no-pager
curl -I http://127.0.0.1:3000/xingxing/
```

## Nginx 反代

如果 Nginx 的站点文件是在 `http {}` 层被 include，例如 `/usr/local/nginx/conf/sites-enabled/birthday`，文件里要写完整的 `server {}`，不能只写 `location`。

```nginx
server {
  listen 80;
  server_name example.com;

  location = /xingxing {
    return 301 /xingxing/;
  }

  location /xingxing/ {
    proxy_pass http://127.0.0.1:3000/xingxing/;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

把 `server_name` 改成你的真实域名；如果 `.env` 里改了 `PORT`，这里的端口也要同步修改。

如果你的 include 确认位于已有 `server {}` 内部，才只写 `location` 片段：

```nginx
location = /xingxing {
  return 301 /xingxing/;
}

location /xingxing/ {
  proxy_pass http://127.0.0.1:3000/xingxing/;
  proxy_http_version 1.1;
  proxy_set_header Host $host;
  proxy_set_header X-Real-IP $remote_addr;
  proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  proxy_set_header X-Forwarded-Proto $scheme;
}
```

配置后：

```bash
sudo nginx -t
sudo systemctl reload nginx
```

## 备份

最重要的是备份 SQLite 数据库：

```bash
cd /opt/xingxing-birthday
sudo cp data/birthday.sqlite ./birthday.sqlite.backup
```

也可以在管理员后台导出 CSV/JSON。

## 提交前检查

```bash
git status --short
npm test
npm run build
npm audit --omit=dev
```
