# 星星生日墙

星星生日墙是一个挂载在 `/xingxing` 下的公共生日网站，带管理员后台。它支持公历和农历生日、今日生日、近期提醒、全部生日列表、日历视图、月份视图、主题切换、CSV/JSON 导入导出、批量管理、数据巡检、操作日志和站点设置。

默认路径：

```text
/xingxing
/xingxing/admin
/xingxing/api
```

当前版本：`V3.0.0`

## 运行要求

- Node.js `>=24.0.0`
- npm `>=10.0.0`
- Linux 服务器推荐使用 systemd + Nginx
- 数据库存储使用 SQLite，代码通过 Node 内置 `node:sqlite` 访问

Node 18 不适合作为生产环境。即使部分命令能运行，Vite、React Router、Vitest 和 `node:sqlite` 都要求更新的 Node 版本。

## 技术栈

- 前端：React 19、React Router、Vite、TypeScript
- 后端：Node.js、Express、TypeScript
- 数据库：SQLite，WAL 模式
- 校验：Zod
- 农历：`lunar-javascript`
- 测试：Vitest

## 仓库结构

```text
.
├── .env.example                    # 唯一环境变量模板
├── .gitignore                      # Git 忽略规则
├── DESIGN.md                       # 视觉和界面规范
├── PRODUCT.md                      # 产品目标、边界和评价标准
├── README.md                       # 部署、维护和开发说明
├── deploy/
│   └── xingxing-birthday.service   # systemd 服务模板
├── index.html                      # Vite HTML 入口
├── package.json                    # npm 脚本和依赖
├── package-lock.json               # npm 锁文件
├── public/favicon.svg              # 网站图标
├── src/client/                     # 前端页面、组件、API 封装和样式
├── src/server/                     # Express 服务、鉴权、数据库和路由
├── src/shared/                     # 前后端共享类型、校验、生日计算和设置
├── tsconfig.json                   # 前端/共享 TypeScript 配置
├── tsconfig.server.json            # 后端 TypeScript 构建配置
└── vite.config.ts                  # Vite 配置，base 固定为 /xingxing/
```

## 关键文件

- `src/client/App.tsx`：前端路由、页面、组件、状态和交互。
- `src/client/api.ts`：前端 API 请求封装。
- `src/client/main.tsx`：React 挂载入口，设置 `/xingxing` 路由前缀。
- `src/client/styles.css`：全站样式、响应式布局和主题变量。
- `src/server/app.ts`：Express 应用装配、静态文件服务和 SPA 回退。
- `src/server/auth.ts`：管理员登录、会话 Cookie 和鉴权。
- `src/server/config.ts`：读取和校验环境变量。
- `src/server/db.ts`：SQLite 初始化、WAL、迁移和初始管理员创建。
- `src/server/repository.ts`：生日记录、批量操作和操作日志的数据访问层。
- `src/server/routes.ts`：公开 API、后台 API、导入导出和设置接口。
- `src/shared/birthday.ts`：公历/农历生日计算、下次生日和排序。
- `src/shared/validation.ts`：输入校验规则。
- `src/shared/settings.ts`：默认站点设置和祝福模板。
- `deploy/xingxing-birthday.service`：生产 systemd 模板。

## 环境变量

部署时复制模板：

```bash
cp .env.example .env
```

变量说明：

| 变量 | 作用 |
| --- | --- |
| `NODE_NO_WARNINGS` | 隐藏 Node 对 `node:sqlite` 的实验性提示。 |
| `PATH` | 给 systemd 查找 `node` 使用。 |
| `PORT` | Node 服务监听端口，默认 `3000`。 |
| `HOST` | Node 服务监听地址，Nginx 反代时推荐 `127.0.0.1`。 |
| `BASE_PATH` | 网站挂载路径，保持 `/xingxing`。 |
| `ADMIN_USERNAME` | 数据库首次创建管理员时使用的用户名。 |
| `ADMIN_PASSWORD` | 数据库首次创建管理员时使用的密码，生产必须修改。 |
| `SESSION_SECRET` | 管理员登录 Cookie 签名密钥，生产必须换成长随机字符串。 |
| `SEED_SAMPLE_DATA` | 空数据库是否写入示例生日，生产建议 `false`。 |
| `DATABASE_PATH` | SQLite 数据库路径，默认 `./data/birthday.sqlite`。 |

不要把 `NODE_ENV=production` 写进 `.env`。生产运行环境由 systemd 的 `ExecStart` 注入，避免 Vite 构建时误读 `.env` 并输出警告。

## 数据存储

运行时数据只来自 SQLite。默认数据库文件：

```text
./data/birthday.sqlite
```

SQLite 使用 WAL 模式，因此运行时可能同时出现：

```text
data/birthday.sqlite
data/birthday.sqlite-wal
data/birthday.sqlite-shm
```

这些都是同一个 SQLite 数据库的正常文件。备份时最好在服务停止后复制三者，或使用管理员后台导出 JSON/CSV。

主要表：

- `birthday_people`：生日记录。
- `admin_users`：管理员用户。
- `admin_sessions`：登录会话。
- `site_settings`：站点设置和祝福模板。
- `admin_operation_logs`：管理员操作日志。

`data/` 已被 `.gitignore` 忽略，不应提交到仓库。

## 本地开发

```bash
npm ci
cp .env.example .env
npm run dev
```

访问：

```text
http://127.0.0.1:5173/xingxing/
http://127.0.0.1:5173/xingxing/admin
```

常用命令：

```bash
npm test
npm run build
npm start
```

## 构建产物

执行：

```bash
npm run build
```

会生成：

```text
dist/          # 前端静态文件
dist-server/   # 后端编译后的 Express 服务
```

不需要分别反代这两个目录。生产只运行后端：

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

## 首次部署

以下示例使用 `/opt/xingxing-birthday`。

### 1. 安装 Node 24+

```bash
node -v
npm -v
```

如果服务器不是 Node 24+，可以安装：

```bash
sudo npm install -g n
sudo n 24
hash -r

node -v
npm -v
sudo env PATH=/usr/local/bin:/usr/bin:/bin node -v
```

### 2. 创建运行用户

```bash
sudo getent group xingxing >/dev/null || sudo groupadd --system xingxing
sudo id -u xingxing >/dev/null 2>&1 || sudo useradd --system --gid xingxing --home-dir /opt/xingxing-birthday --shell /usr/sbin/nologin xingxing
```

### 3. 克隆、安装和构建

```bash
sudo git clone <你的仓库地址> /opt/xingxing-birthday
cd /opt/xingxing-birthday

sudo npm ci
sudo npm run build
```

### 4. 创建环境变量和数据目录

```bash
sudo cp .env.example .env
sudo install -d -o xingxing -g xingxing data
sudo chown -R xingxing:xingxing data
sudoedit .env
sudo chown root:xingxing .env
sudo chmod 640 .env
```

至少修改：

```text
ADMIN_PASSWORD=换成强密码
SESSION_SECRET=换成足够长的随机字符串
SEED_SAMPLE_DATA=false
DATABASE_PATH=./data/birthday.sqlite
```

也可以用命令生成：

```bash
ADMIN_PASSWORD="$(openssl rand -hex 16)"
SESSION_SECRET="$(openssl rand -hex 48)"

sudo sed -i "s/^ADMIN_PASSWORD=.*/ADMIN_PASSWORD=${ADMIN_PASSWORD}/" .env
sudo sed -i "s/^SESSION_SECRET=.*/SESSION_SECRET=${SESSION_SECRET}/" .env
sudo sed -i "s/^SEED_SAMPLE_DATA=.*/SEED_SAMPLE_DATA=false/" .env
sudo sed -i "s#^DATABASE_PATH=.*#DATABASE_PATH=./data/birthday.sqlite#" .env

printf 'ADMIN_PASSWORD=%s\n' "$ADMIN_PASSWORD"
```

请保存输出的管理员初始密码。`ADMIN_PASSWORD` 只在数据库没有管理员时生效；已有管理员不会被 `.env` 自动覆盖。

### 5. 注册 systemd

推荐用软链接，让服务模板仍来自项目目录：

```bash
sudo ln -sf /opt/xingxing-birthday/deploy/xingxing-birthday.service /etc/systemd/system/xingxing-birthday.service
sudo systemctl daemon-reload
sudo systemctl enable --now xingxing-birthday
sudo systemctl status xingxing-birthday --no-pager
```

日志：

```bash
journalctl -u xingxing-birthday -f
```

## Nginx 反代

如果 Nginx 的站点文件在 `http {}` 层 include，例如 `/usr/local/nginx/conf/sites-enabled/birthday`，文件必须写完整 `server {}`：

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

如果该文件确认被 include 在已有 `server {}` 内部，才只写 `location`：

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

检查并重载：

```bash
sudo nginx -t
sudo systemctl reload nginx
```

如果已经有 HTTPS，把上述 `location` 放进 HTTPS 对应的 `server {}`，或在 80 端口只做跳转。

## 更新部署

在服务器执行：

```bash
cd /opt/xingxing-birthday

# 可选但推荐：更新前备份数据库。
sudo cp -a data/birthday.sqlite "data/birthday.sqlite.$(date +%Y%m%d-%H%M%S).bak" 2>/dev/null || true

sudo git fetch origin
sudo git pull --ff-only origin main

# 兼容旧部署：如果旧 .env 写过 NODE_ENV=production，删除。
sudo sed -i '/^NODE_ENV=/d' .env

sudo npm ci
sudo npm run build

if [ "$(readlink -f /etc/systemd/system/xingxing-birthday.service)" != "/opt/xingxing-birthday/deploy/xingxing-birthday.service" ]; then
  sudo cp /opt/xingxing-birthday/deploy/xingxing-birthday.service /etc/systemd/system/xingxing-birthday.service
fi

sudo systemctl daemon-reload
sudo systemctl restart xingxing-birthday
sudo systemctl status xingxing-birthday --no-pager
curl -I http://127.0.0.1:3000/xingxing/
```

## 备份和恢复

轻量备份：

```bash
cd /opt/xingxing-birthday
sudo systemctl stop xingxing-birthday
sudo cp -a data data.backup.$(date +%Y%m%d-%H%M%S)
sudo systemctl start xingxing-birthday
```

也可以在管理员后台导出 JSON/CSV。JSON 更适合完整恢复，CSV 更适合人工编辑和核对。

恢复时先停止服务，替换 `data/` 或通过后台导入 JSON，再重启服务。

## 管理员后台

访问：

```text
/xingxing/admin
```

管理员后台包含：

- 工作台：记录列表、筛选、新增/编辑表单、批量操作。
- 导入备份：CSV/JSON 预览、追加、替换、导出。
- 数据巡检：重复、同名、同日、闰月、隐藏等检查。
- 操作日志：查看管理员行为记录。
- 站点设置：站点名、纠错说明、近期天数、祝福模板。

## 公历和农历

公历生日直接按月日计算下一次发生日期。

农历生日通过 `lunar-javascript` 换算到对应年份的公历日期。闰月生日由 `isLeapMonth` 和 `leapMonthPolicy` 控制：

- `onlyLeapMonth`：只在存在对应闰月的年份展示。
- `normalMonthIfNoLeap`：没有对应闰月时按普通同月展示。

如果年份为空，就不显示年龄。年份只用于年龄计算，不影响生日日期本身。

## 提交前检查

```bash
git status --short
npm ci --dry-run
npm test
npm run build
```

如果修改了部署、依赖、数据库或 API，建议额外检查：

```bash
npm audit --omit=dev
```

## 相关文档

- `PRODUCT.md`：产品目标、边界和评价标准。
- `DESIGN.md`：视觉、布局、组件和反例规范。
