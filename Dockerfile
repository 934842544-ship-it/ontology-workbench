# 本体管理工作台 — 零依赖 Node 容器镜像
# 应用前后端一体（server.js 同时提供静态页面 + REST API），无需独立前端端口
FROM node:18-alpine

WORKDIR /app

# 仅复制运行所需文件（零 npm 依赖，无需 npm install）
COPY package.json ./
COPY server.js mcp-server.js ./
COPY public ./public
COPY docs ./docs

# 运行时数据目录（账号哈希 + 业务数据），用命名卷持久化，不进镜像
RUN mkdir -p /app/data && chmod 777 /app/data

# 容器内 web 端口（server.js 已监听 0.0.0.0）
EXPOSE 8787

# 对外访问端口通过 docker run -p <host>:<container> 映射，例如 3841:8787
CMD ["node", "server.js", "8787"]
