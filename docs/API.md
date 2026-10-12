# 本体管理工作台 · API 文档

供 AI agent / 自动化脚本调用的 HTTP API。所有接口均在 `/api/` 前缀下，数据格式 JSON。

- **Base URL**：本地 `http://localhost:8787`；部署后 `http://<服务器IP>:8787`
- **认证**：Bearer Token（登录获取），30 天有效
- **字符编码**：UTF-8

---

## 一、认证

### 1. 查看状态

```
GET /api/auth/status
```

```json
{ "initialized": false, "loggedIn": false, "username": null }
```

`initialized=false` 表示尚无账号，需先 setup。

### 2. 初始化账号（仅首次，已有账号后返回 400）

```
POST /api/auth/setup
{ "username": "lin", "password": "至少6位" }
→ { "token": "<token>", "username": "lin" }
```

### 3. 登录

```
POST /api/auth/login
{ "username": "lin", "password": "..." }
→ { "token": "<token>", "username": "lin" }
```

失败返回 401（带 800ms 延迟防暴力尝试）。

### 4. 登出

```
POST /api/auth/logout
Authorization: Bearer <token>
→ { "ok": true }
```

> 之后所有数据接口都需要 `Authorization: Bearer <token>` 头。未登录返回 401。

---

## 二、数据读取

### 5. 全量数据

```
GET /api/data
Authorization: Bearer <token>
→ { "customers": [...], "contacts": [...], "channel_managers": [...], "pain_points": [...],
    "propositions": [...], "visits": [...], "demos": [...], "proposals": [...],
    "projects": [...], "cases": [...] }
```

---

## 三、录入 / 更新 / 删除

`:entity` 取值白名单（10 个主体）：

| entity | 主体 | 组 |
|---|---|---|
| `channel_managers` | 渠道经理 | 人 |
| `customers` | 企业客户 | 人 |
| `contacts` | 联系人 | 人 |
| `pain_points` | 痛点 | 事 |
| `visits` | 拜访 | 事 |
| `demos` | Demo | 事 |
| `propositions` | 命题 | 事 |
| `proposals` | 方案/报价 | 成果 |
| `projects` | 项目/合同 | 成果 |
| `cases` | 案例 | 成果 |

### 6. 新建记录

```
POST /api/entity/:entity
Authorization: Bearer <token>
{ ...字段键值对 }
→ { "id": "cus_xxx", "createdAt": "...", ... }
```

- `id` 服务端自动生成（带实体前缀），传入会被忽略
- 新记录排在列表最前

### 7. 更新记录

```
PUT /api/entity/:entity/:id
Authorization: Bearer <token>
{ ...要更新的字段 }
→ { 更新后的完整记录, "updatedAt": "..." }
```

- 部分更新：只传要改的字段即可

### 8. 删除记录

```
DELETE /api/entity/:entity/:id
Authorization: Bearer <token>
→ { "ok": true }
```

---

## 四、字段参考（口径摘要）

完整口径见应用内"口径字典"页。以下为 AI 录入时最容易出错的点：

### customers 企业客户
`name`* / `industry` / `park` / `address` / `scale` / `status`(线索·已拜访·有意向·已报价·已签约·暂缓) / `score`(number，按评分框架) / `channelManagerIds`(array，渠道经理 id 列表) / `notes`

### contacts 联系人
`name`* / `customerId`*(客户 id) / `role`(决策·使用·引荐) / `phone` / `attitude`("1"-"5" 温度) / `notes`

### channel_managers 渠道经理
`name`* / `district` / `products` / `cooperation`(高·中·低) / `phone` / `notes`

### pain_points 痛点
`stage`*(具体到动作，不写概括) / `customerId`* / `who`(岗位) / `frequency` / `duration` / `saving`(消失能省下什么) / `status`(新指认·已转命题·搁置) / `notes`

### visits 拜访
`customerId`* / `date`*(YYYY-MM-DD) / `place` / `participants` / `m1`(bool 进入需求≤10分钟) / `m2`(bool 客户主动补充≥2条) / `m3`(bool 拿到人+物) / `next_step` / `notes`

### demos Demo
`visitId`*(拜访 id) / `input` / `output` / `duration` / `quote`(客户原话，逐字) / `complexity`

### propositions 命题
`title`* / `customerId`* / `painPointId`(来源痛点 id) / `metric`(指标) / `baseline`(基线数值) / `owner` / `acceptance`(验收标准) / `status`(待立项·已立项·交付中·已验收·已取消)

### proposals 方案/报价
`propositionId`* / `scope` / `boundary`(做不了的) / `price`(number 元) / `delivery`(软件工具·代运营·定制开发·咨询+落地·其他) / `status`(草稿·已发·谈判中·已接受·已否) / `notes`

### projects 项目/合同
`propositionId`* / `subject`* / `amount`(number 元) / `ownership`(电信·我方) / `payment`(账期) / `delivery` / `status`(已签·交付中·已验收) / `notes`

### cases 案例
`projectId`(来源项目，调研期 Demo 可不挂) / `effect`*(一句话成效，带数字) / `input_desc`(脱敏输入) / `output_desc` / `duration` / `industry` / `scenarios`(可用场景) / `quote`

---

## 五、错误约定

```json
{ "error": "错误说明" }
```

| 状态码 | 含义 |
|---|---|
| 400 | 请求体非法 / 未知实体名 / 已初始化再 setup |
| 401 | 未登录或 token 过期（重新 login） |
| 404 | 记录不存在 |

---

## 六、curl 快速示例

```bash
# 登录取 token
TOKEN=$(curl -s -X POST http://localhost:8787/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"lin","password":"***"}' | jq -r .token)

# 录入一条拜访记录
curl -s -X POST http://localhost:8787/api/entity/visits \
  -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" \
  -d '{"customerId":"cus_xxx","date":"2026-10-12","m1":true,"m2":true,"m3":false,
       "next_step":"周三老板娘带手工单据来店里"}'

# 更新联系人态度温度
curl -s -X PUT http://localhost:8787/api/entity/contacts/con_xxx \
  -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" \
  -d '{"attitude":"4"}'
```
