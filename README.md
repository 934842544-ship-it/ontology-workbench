# 本体管理工作台

个人业务主线（获客 → 首访 → Demo → 签约 → 交付 → 案例沉淀）的本体管理系统。
核心概念：**本体 = 对象 + 关系 + 动作 + 口径**。10 个主体、9 条关系，字段口径内置在应用里。

## 本地运行

```bash
node server.js          # 默认 8787 端口
node server.js 9000     # 自定义端口
```

浏览器打开 `http://localhost:8787`，首次使用会要求设置账号密码。

## 部署到云主机（ECS）

```bash
# 1. 上传（在本机执行，按实际路径替换）
scp -r server.js public data root@你的服务器IP:/opt/ontology-workbench/

# 2. 服务器上启动（需 Node.js >= 16）
cd /opt/ontology-workbench
nohup node server.js 8787 > server.log 2>&1 &

# 3. 放行端口后访问 http://服务器IP:8787
```

推荐用 systemd 常驻：

```bash
# /etc/systemd/system/ontology.service
[Unit]
Description=Ontology Workbench
After=network.target

[Service]
WorkingDirectory=/opt/ontology-workbench
ExecStart=/usr/bin/node server.js 8787
Restart=always

[Install]
WantedBy=multi-user.target
```

```bash
systemctl enable --now ontology
```

## 数据与备份

- 所有数据在 `data/` 目录，每个主体一个 JSON 文件，可直接查看和编辑
- **备份 = 备份 data/ 目录**：`tar czf ontology-backup.tar.gz data/`
- 账号在 `data/users.json`（scrypt 加密），会话在 `data/sessions.json`

## 安全提示

- 服务本身是 HTTP 明文。公网使用建议套 Nginx 反向代理 + HTTPS（Let's Encrypt 免费证书）
- 端口不要暴露给不信任网络；如需收紧，可在云安全组里限制来源 IP

## AI 操作面（两种方式）

### 1. MCP 工具（推荐，供 WorkBuddy 等 AI agent 调用）

`mcp-server.js` 提供标准 MCP（stdio）服务，6 个工具：
`list_entities`（主体与口径）/ `get_overview`（漏斗总览）/ `query_records`（查询）
/ `create_record` / `update_record` / `delete_record`

配置（已注册到 `~/.workbuddy/mcp.json`，密码填你网页端的登录密码）：

```json
"ontology-workbench": {
  "command": "node",
  "args": ["C:\\Users\\19927\\Documents\\workbuddy-project\\ontology\\mcp-server.js"],
  "env": {
    "OWB_BASE_URL": "http://localhost:8787",
    "OWB_USERNAME": "你的用户名",
    "OWB_PASSWORD": "你的密码"
  }
}
```

部署到 ECS 后只改 `OWB_BASE_URL` 指向服务器地址即可。

### 2. 直接读写 data/*.json

本体就是机器可读写形态，`data/` 下每个主体一个 JSON 文件，脚本/WorkBuddy 可直接读写。

完整接口文档见 **[docs/API.md](docs/API.md)**。
