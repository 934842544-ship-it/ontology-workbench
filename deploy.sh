#!/usr/bin/env bash
# 本体管理工作台 — Ubuntu 云主机一键容器部署
# 适用于: docker 已安装且当前用户已加入 docker 组（免 sudo）
# 对外访问端口 HOST_PORT，映射到容器内 APP_PORT
# 用法: bash deploy.sh
set -e

REPO="https://github.com/934842544-ship-it/ontology-workbench"
DIR="$HOME/ontology-workbench"
HOST_PORT=3841      # 对外访问端口（用户指定的前端端口）
APP_PORT=8787       # 容器内 web 端口（与 Dockerfile / server.js 一致）
IMAGE="ontology-workbench:latest"

echo "==> 1. 拉取代码"
if [ ! -d "$DIR/.git" ]; then
  git clone "$REPO" "$DIR"
fi
cd "$DIR"
git pull --ff-only

echo "==> 2. 构建镜像"
docker build -t "$IMAGE" .

echo "==> 3. 启动容器（端口 ${HOST_PORT} -> ${APP_PORT}）"
docker rm -f ontology-workbench 2>/dev/null || true
docker run -d --name ontology-workbench --restart unless-stopped \
  -p "${HOST_PORT}:${APP_PORT}" \
  -v ontology-data:/app/data \
  "$IMAGE"

echo "==> 部署完成：http://<主机IP>:${HOST_PORT}"
docker ps --filter name=ontology-workbench
