# 虚拟数据中心原位调度子系统

Vue 2 管理前端，同时支持 Web/Docker 部署和 Electron 桌面应用。

## 开发环境

- Node.js 22
- pnpm 11.19.0

```bash
corepack enable
corepack prepare pnpm@11.19.0 --activate
pnpm install --frozen-lockfile
```

启动 Web 开发环境：

```bash
pnpm dev
```

启动 Electron 开发环境：

```bash
pnpm electron:dev
```

构建当前系统的桌面安装包：

```bash
pnpm electron:make
```

产物位于 `out/make/`。

## 后端地址

桌面应用按照以下优先级读取后端地址：

1. 启动参数 `--backend-url=http://host:port`
2. 环境变量 `VDCS_BACKEND_URL`
3. 用户目录中的 `config.json`
4. `electron/default-config.json` 内置默认值

应用登录页和登录后的顶栏均提供“服务器设置”，支持连接测试、保存和恢复默认配置。

用户配置路径：

- Windows：`%APPDATA%/虚拟数据中心原位调度子系统/config.json`
- macOS：`~/Library/Application Support/虚拟数据中心原位调度子系统/config.json`

后端应提供 `GET /health`，并返回 HTTP 2xx。

## GitHub Release

在仓库的 `Settings → Secrets and variables → Actions → Variables` 中创建：

```text
DEFAULT_BACKEND_URL=http://10.212.14.88:31081
```

该变量只决定安装包首次启动时的默认地址，不是秘密。用户仍可在应用内修改地址。

创建并发布 GitHub Release 后，`Build Desktop Release` 工作流会构建：

- Windows x64 安装程序
- macOS x64 和 arm64 ZIP 应用包
- Linux x64 ZIP 应用包
- 全部发布文件的 `SHA256SUMS.txt`

并自动把产物附加到对应 Release：

```bash
gh release create v1.0.0 --generate-notes
```

正式对外分发前，应为 Windows 和 macOS 产物配置代码签名。
