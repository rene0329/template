# 构建阶段：Node 22 + pnpm 编译旧版 Vue 项目。
FROM node:22-alpine AS builder

WORKDIR /app

# 解决 Node 22 + 旧版 Vue/Webpack 的 OpenSSL 兼容性问题。
ENV NODE_OPTIONS=--openssl-legacy-provider

# 前端地址会编译进静态资源；可在 docker build 时通过 --build-arg 覆盖。
ARG VUE_APP_PRACTICE_API=http://10.212.14.88:31081
ENV VUE_APP_PRACTICE_API=${VUE_APP_PRACTICE_API}

# Docker Web 构建不需要下载 Electron 桌面运行时。
RUN corepack enable && corepack prepare pnpm@11.19.0 --activate
ENV ELECTRON_SKIP_BINARY_DOWNLOAD=1
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm run build

# 运行阶段：仅保留静态资源和 Web 服务器，不携带源码及桌面构建依赖。
FROM node:22-alpine AS runtime

WORKDIR /app

ENV NODE_ENV=production
RUN npm install -g serve
COPY --from=builder /app/dist ./dist

EXPOSE 3000

CMD ["serve", "-s", "dist", "-l", "3000"]
