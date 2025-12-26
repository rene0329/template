# 使用 Node 22 作为基础镜像
FROM node:22-alpine

WORKDIR /app

# 1. 【填坑】解决 Node 22 + 旧版 Vue 的 OpenSSL 兼容性问题
ENV NODE_OPTIONS=--openssl-legacy-provider

# 2. 安装依赖
COPY package*.json ./
# 加上 --legacy-peer-deps 以防万一依赖冲突
RUN npm install --legacy-peer-deps

# 3. 复制代码并构建
COPY . .
RUN npm run build

# 4. 【关键】全局安装 serve 工具
RUN npm install -g serve

# 5. 暴露端口 3000
EXPOSE 3000

# 6. 启动命令
# serve: 启动服务
# -s: 【核心】开启 Single-Page 模式，自动解决刷新 404 问题 (所有 404 都指回 index.html)
# dist: 指定服务的文件夹是编译后的 dist 目录
# -l 3000: 指定监听 3000 端口
CMD ["serve", "-s", "dist", "-l", "3000"]
