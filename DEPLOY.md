# 部署到 Vercel（绑定自有域名 + 保留自建后台）

本站点已改造为 Vercel 兼容架构：纯静态前台由 Vercel 直接托管，API 与后台走
Serverless Function（`api/index.js`），数据存到 Supabase（Postgres），告别本地
文件存储（Vercel 文件系统只读，文件会丢）。

## 1. 准备数据库（Supabase，免费档即可）

1. 打开 https://supabase.com 注册并新建一个项目（地区选离你近的，如 Singapore）。
2. 进入项目 → **SQL Editor** → 新建查询，粘贴 `supabase-schema.sql` 全部内容并执行。
   这会建好 `messages` 和 `products` 两张表。
3. 进入 **Project Settings → API**，复制：
   - `Project URL`（形如 `https://xxxx.supabase.co`）
   - `service_role` 密钥（**注意**：是 service_role，不是 anon；它只用在服务器，不会暴露给浏览器）

## 2. 部署到 Vercel

**方式 A（推荐）：连 GitHub 自动部署**
1. 把本目录初始化为 Git 仓库并推到 GitHub：
   ```bash
   git init
   git add .
   git commit -m "zhongkeyu site"
   git branch -M main
   git remote add origin <你的GitHub仓库地址>
   git push -u origin main
   ```
2. 打开 https://vercel.com → **Add New → Project** → 导入该 GitHub 仓库。
3. Framework 选 **Other**，其余默认（已用 `vercel.json` 配置好）。
4. 在 **Environment Variables** 填入：
   - `SUPABASE_URL` = 你的 Project URL
   - `SUPABASE_SERVICE_ROLE_KEY` = 你的 service_role 密钥
   - `ADMIN_PASSWORD` = 后台密码（不填默认 `ADMIN336`）
5. 点 **Deploy**。完成后会得到一个 `*.vercel.app` 临时域名，先验证能登录 `/admin`、能提交留言/上传产品。

**方式 B：Vercel CLI 手动部署**
```bash
npm i -g vercel
vercel login
vercel env add SUPABASE_URL
vercel env add SUPABASE_SERVICE_ROLE_KEY
vercel env add ADMIN_PASSWORD
vercel --prod
```

## 3. 绑定自有域名（如 zhongkeyu.com）

1. 在 Vercel 项目 → **Settings → Domains** → 输入你的域名，按提示操作。
2. 去你的域名服务商（如阿里云/腾讯云/Godaddy）添加 Vercel 给的 **DNS 记录**
   （通常是两条 `A` 记录指向 `76.76.21.21`，或一条 `CNAME`）。
3. 等 DNS 生效（几分钟到几小时），域名状态变绿即绑定成功。
4. 后台在 `https://你的域名/admin`，前台在 `https://你的域名/`。

## 4. 本地开发（无需数据库）

```bash
npm install
npm start          # 默认 http://localhost:8788
```
没配 `SUPABASE_*` 环境变量时，代码自动降级用 `data/` 下的 JSON 文件，方便本地联调。
配置 `.env`（参考 `.env.example`）后则直连 Supabase。

## 注意事项
- 图片以 base64 存进数据库 `products.image` 字段（Postgres `text` 上限很大，
  单张 1MB 级图片无压力）。若后续产品图很多、很大，可改存对象存储（如 Supabase Storage）。
- 后台密码目前写在 `vercel.json` 的 `env` 里（默认 `ADMIN336`）。正式运营建议在
  Vercel 环境变量里覆盖为强密码，并删除 `vercel.json` 中的明文 `env` 块。
- 留言/产品现在持久化在 Supabase，不再依赖 Vercel 文件系统，重启/重新部署数据安全。
