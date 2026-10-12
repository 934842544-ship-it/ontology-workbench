#!/usr/bin/env node
/*
 * 本体管理工作台 · MCP Server (Model Context Protocol)
 * 让 AI agent 通过标准 MCP 工具操作本体数据（查询/录入/更新/删除）
 *
 * 零依赖，Node >= 18（内置 fetch）。stdio 传输，newline-delimited JSON-RPC 2.0。
 *
 * 环境变量:
 *   OWB_BASE_URL  服务地址，默认 http://localhost:8787（部署 ECS 后改成 http://<IP>:8787）
 *   OWB_USERNAME  登录用户名（与网页端同一账号）
 *   OWB_PASSWORD  登录密码
 *
 * 用法: node mcp-server.js
 */
'use strict';

const http = require('http');
const readline = require('readline');

const BASE_URL = (process.env.OWB_BASE_URL || 'http://localhost:8787').replace(/\/+$/, '');
const USERNAME = process.env.OWB_USERNAME || '';
const PASSWORD = process.env.OWB_PASSWORD || '';

/* ============================================================
 * 本体 schema（与 public/app.js 的 ONTOLOGY 保持同步；供 list_entities 工具输出）
 * ============================================================ */

const ENTITIES = {
  channel_managers: {
    name: '渠道经理', group: '人', desc: '电信侧的人，整条获客主线靠他们引荐',
    fields: {
      name: '姓名*（真实姓名，一人一条）',
      district: '区局（如"花都"）',
      products: '可搭售产品（云、专线、安防等）',
      cooperation: '配合度：高/中/低（按是否主动约局、是否愿意带客上门判断）',
      phone: '联系方式',
      notes: '备注（沟通风格、关注点、历史合作）',
    },
  },
  customers: {
    name: '企业客户', group: '人', desc: '一家实体企业，整条流程的锚点',
    fields: {
      name: '名称*（工商全称或日常称呼，一家一条不重复建）',
      industry: '行业（皮具/纺织/五金…，用于案例按行业复用）',
      park: '所在园区（如"狮岭皮具城"）',
      address: '地址（具体到能上门）',
      scale: '规模（人数或年营收，口径前后一致）',
      status: '状态：线索/已拜访/有意向/已报价/已签约/暂缓（按实际推进节点更新）',
      score: '评分卡（number，按花都首批评分框架；未评留空不填0）',
      channelManagerIds: '引荐渠道经理（channel_managers 的 id 数组）',
      notes: '备注',
    },
  },
  contacts: {
    name: '联系人', group: '人', desc: '客户里的人',
    fields: {
      name: '姓名*',
      customerId: '所属客户*（customers.id）',
      role: '角色：决策/使用/引荐（决策=能拍板掏钱；身兼多档选决策）',
      phone: '电话/微信',
      attitude: '态度温度："1"-"5"（1=冷淡回避，5=主动力挺；每次接触后更新）',
      notes: '备注',
    },
  },
  pain_points: {
    name: '痛点', group: '事', desc: '一件具体的麻烦，不是一类现象',
    fields: {
      stage: '环节名*（具体到动作，如"对账要手工抄单"；不写"管理混乱"这类概括）',
      customerId: '所属客户*（customers.id）',
      who: '谁在做（具体岗位，如"老板娘每天晚上"）',
      frequency: '多久一次（每天/每月底…）',
      duration: '一次多久（如"40分钟"，与频率相乘=月度耗时）',
      saving: '消失能省下什么（钱/时间/出错率，写能算的数；转命题的依据）',
      status: '状态：新指认/已转命题/搁置',
      notes: '备注',
    },
  },
  visits: {
    name: '拜访', group: '事', desc: '一次首访事件，按「指认」替代「描述」的打法',
    fields: {
      customerId: '客户*（customers.id）',
      date: '日期*（YYYY-MM-DD 实际到场日）',
      place: '地点',
      participants: '参与人（我方+客户方+渠道经理）',
      m1: '三指标① bool：进入需求讨论 ≤10 分钟',
      m2: '三指标② bool：客户主动补充 ≥2 条',
      m3: '三指标③ bool：拿到「人+物」（下一步的具体人和具体物）',
      next_step: '收口下一步（人+物：谁、什么时间、交出什么）',
      notes: '记录（客户原话、现场观察，原样记不加工）',
    },
  },
  demos: {
    name: 'Demo', group: '事', desc: '一次现场演示记录，每跑一次就是半个自有案例',
    fields: {
      visitId: '所属拜访*（visits.id）',
      input: '输入（客户现场给的原始材料，如"一张手工单据"）',
      output: '输出（当场产出的结构化结果）',
      duration: '耗时（从拿到材料到给出结果的用时，说服力数字）',
      quote: '客户原话（逐字记不修饰，将来写案例靠它）',
      complexity: '暴露的复杂度（没做到/做得勉强的地方，决定方案边界）',
    },
  },
  propositions: {
    name: '命题', group: '事', desc: '带指标的待办场景，痛点的翻译结果',
    fields: {
      title: '命题*（一句话说清"把什么从什么变成什么"）',
      customerId: '客户*（customers.id）',
      painPointId: '来源痛点（pain_points.id，可追溯）',
      metric: '指标（用什么数字衡量改善，如"月对账工时"）',
      baseline: '基线（改善前现状数值；没有基线不算锁定）',
      owner: '责任人（客户侧谁为指标负责）',
      acceptance: '验收标准（怎样算做成，双方认可）',
      status: '状态：待立项/已立项/交付中/已验收/已取消',
    },
  },
  proposals: {
    name: '方案/报价', group: '成果', desc: '一次方案与价',
    fields: {
      propositionId: '所属命题*（propositions.id）',
      scope: '范围（做什么，写到可核对）',
      boundary: '边界（明确写"不包含什么"；边界不清是交付扯皮根源）',
      price: '价格（number 元）',
      delivery: '交付形态：软件工具/代运营/定制开发/咨询+落地/其他',
      status: '状态：草稿/已发/谈判中/已接受/已否',
      notes: '备注（含税与否等）',
    },
  },
  projects: {
    name: '项目/合同', group: '成果', desc: '一个已签的单',
    fields: {
      propositionId: '所属命题*（propositions.id）',
      subject: '标的*（合同标的概述）',
      amount: '金额（number 元，合同金额）',
      ownership: '归属：电信/我方（前向客户由电信签则记电信，决定回款路径）',
      payment: '账期（付款节奏，如"3-6-1"）',
      delivery: '交付形态',
      status: '状态：已签/交付中/已验收',
      notes: '备注',
    },
  },
  cases: {
    name: '案例', group: '成果', desc: '一次可复用的成效，向电信要资源时唯一有说服力的材料',
    fields: {
      projectId: '来源项目（projects.id，调研期 Demo 产生的可先不挂）',
      effect: '成效*（一句话说结果，最好带数字，如"月对账工时从8h降到0.5h"）',
      input_desc: '脱敏输入（脱敏到认不出具体企业）',
      output_desc: '输出（产出物形态）',
      duration: '耗时（Demo 或交付实际用时）',
      industry: '行业（向同行业客户复用）',
      scenarios: '可用场景（向电信提案/向同行业客户首访）',
      quote: '客户原话（验收时评价，逐字记）',
    },
  },
};

const FUNNEL = ['customers', 'visits', 'demos', 'propositions', 'proposals', 'projects', 'cases'];

/* ============================================================
 * HTTP 客户端（懒登录 + 401 重登）
 * ============================================================ */

let token = null;

function rawRequest(method, path, body, bearer) {
  return new Promise((resolve, reject) => {
    const u = new URL(BASE_URL + path);
    const payload = body ? JSON.stringify(body) : null;
    const req = http.request({
      hostname: u.hostname, port: u.port, path: u.pathname + u.search,
      method, headers: Object.assign(
        { 'Content-Type': 'application/json' },
        bearer ? { Authorization: 'Bearer ' + bearer } : {}),
    }, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        let data = null;
        try { data = chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {}; }
        catch (e) { data = {}; }
        resolve({ status: res.statusCode, data });
      });
    });
    req.on('error', reject);
    req.setTimeout(15000, () => { req.destroy(new Error('请求超时')); });
    if (payload) req.write(payload);
    req.end();
  });
}

async function login() {
  if (!USERNAME || !PASSWORD) {
    throw new Error('MCP 未配置账号：请设置环境变量 OWB_USERNAME / OWB_PASSWORD');
  }
  const r = await rawRequest('POST', '/api/auth/login', { username: USERNAME, password: PASSWORD });
  if (r.status !== 200) throw new Error('登录失败: ' + (r.data.error || r.status));
  token = r.data.token;
  return token;
}

async function api(method, path, body) {
  if (!token) await login();
  let r = await rawRequest(method, path, body, token);
  if (r.status === 401) {          // token 过期 → 重登一次
    await login();
    r = await rawRequest(method, path, body, token);
  }
  if (r.status >= 400) throw new Error((r.data && r.data.error) || ('HTTP ' + r.status));
  return r.data;
}

/* ============================================================
 * 工具实现
 * ============================================================ */

const tools = {
  list_entities: {
    description: '列出本体全部 10 个主体（对象）及各字段的填写口径。录入前先调用此工具了解字段要求。',
    inputSchema: { type: 'object', properties: {} },
    async run() {
      return { entities: ENTITIES, relations: [
        '渠道经理 —引荐→ 企业客户', '企业客户 —挂→ 联系人', '企业客户 —提出→ 痛点',
        '痛点 —转为→ 命题', '企业客户 —拜访→ 拜访', '拜访 —演示→ Demo',
        '命题 —出方案→ 方案/报价', '命题 —签约→ 项目/合同', '项目/合同 —沉淀→ 案例',
      ] };
    },
  },

  get_overview: {
    description: '总览：流程漏斗（客户→拜访→Demo→命题→方案→合同→案例）各层计数，以及 10 个主体的记录数。了解全局进度用。',
    inputSchema: { type: 'object', properties: {} },
    async run() {
      const data = await api('GET', '/api/data');
      const counts = {};
      for (const k of Object.keys(ENTITIES)) counts[k] = (data[k] || []).length;
      return {
        funnel: FUNNEL.map((k) => ({ entity: k, name: ENTITIES[k].name, count: counts[k] })),
        counts,
        holes: {
          channel_managers: counts.channel_managers,
          cases: counts.cases,
          note: '渠道经理和自有案例是最贵的两个洞，长期为 0 需要优先补',
        },
      };
    },
  },

  query_records: {
    description: '查询主体记录。传 entity 返回该主体全部记录（可用 search 关键词过滤、id 精确查单条）；不传 entity 返回全量数据。',
    inputSchema: {
      type: 'object',
      properties: {
        entity: { type: 'string', enum: Object.keys(ENTITIES), description: '主体名（英文 key）' },
        search: { type: 'string', description: '关键词，对记录全字段做包含匹配' },
        id: { type: 'string', description: '精确按记录 id 查单条' },
      },
    },
    async run(args) {
      const data = await api('GET', '/api/data');
      if (!args.entity) return data;
      let items = data[args.entity] || [];
      if (args.id) return items.filter((x) => x.id === args.id);
      if (args.search) {
        const q = args.search.toLowerCase();
        items = items.filter((x) => JSON.stringify(x).toLowerCase().includes(q));
      }
      return { entity: args.entity, count: items.length, items };
    },
  },

  create_record: {
    description: '新建一条主体记录。字段口径见 list_entities；带 * 的字段必填；关联字段（如 customerId）填对应主体的记录 id（可用 query_records 查）。id 由系统自动生成。',
    inputSchema: {
      type: 'object',
      required: ['entity', 'data'],
      properties: {
        entity: { type: 'string', enum: Object.keys(ENTITIES) },
        data: { type: 'object', description: '字段键值对，如 {"name":"张三","customerId":"cus_xxx"}' },
      },
    },
    async run(args) {
      return await api('POST', '/api/entity/' + args.entity, args.data);
    },
  },

  update_record: {
    description: '更新一条记录的部分字段（只传要改的）。entity + id 定位记录，data 为要更新的字段。',
    inputSchema: {
      type: 'object',
      required: ['entity', 'id', 'data'],
      properties: {
        entity: { type: 'string', enum: Object.keys(ENTITIES) },
        id: { type: 'string' },
        data: { type: 'object' },
      },
    },
    async run(args) {
      return await api('PUT', '/api/entity/' + args.entity + '/' + encodeURIComponent(args.id), args.data);
    },
  },

  delete_record: {
    description: '删除一条记录（不可恢复，谨慎使用）。entity + id 定位。',
    inputSchema: {
      type: 'object',
      required: ['entity', 'id'],
      properties: {
        entity: { type: 'string', enum: Object.keys(ENTITIES) },
        id: { type: 'string' },
      },
    },
    async run(args) {
      return await api('DELETE', '/api/entity/' + args.entity + '/' + encodeURIComponent(args.id));
    },
  },
};

/* ============================================================
 * MCP 协议（stdio, newline-delimited JSON-RPC 2.0）
 * ============================================================ */

const rl = readline.createInterface({ input: process.stdin });

function send(obj) {
  process.stdout.write(JSON.stringify(obj) + '\n');
}

function sendResult(id, result) { send({ jsonrpc: '2.0', id, result }); }
function sendError(id, code, message) { send({ jsonrpc: '2.0', id, error: { code, message } }); }

rl.on('line', async (line) => {
  line = line.trim();
  if (!line) return;
  let msg;
  try { msg = JSON.parse(line); } catch (e) { return; }
  const { id, method, params } = msg;

  try {
    switch (method) {
      case 'initialize':
        sendResult(id, {
          protocolVersion: '2024-11-05',
          capabilities: { tools: {} },
          serverInfo: { name: 'ontology-workbench', version: '1.0.0' },
        });
        break;

      case 'notifications/initialized':
      case 'notifications/cancelled':
        break; // 通知无响应

      case 'ping':
        sendResult(id, {});
        break;

      case 'tools/list':
        sendResult(id, {
          tools: Object.entries(tools).map(([name, t]) => ({
            name, description: t.description, inputSchema: t.inputSchema,
          })),
        });
        break;

      case 'tools/call': {
        const name = params && params.name;
        const args = (params && params.arguments) || {};
        const tool = tools[name];
        if (!tool) { sendResult(id, { content: [{ type: 'text', text: '未知工具: ' + name }], isError: true }); break; }
        try {
          const result = await tool.run(args);
          sendResult(id, { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] });
        } catch (e) {
          sendResult(id, { content: [{ type: 'text', text: '执行失败: ' + e.message }], isError: true });
        }
        break;
      }

      default:
        if (id != null) sendError(id, -32601, 'Method not found: ' + method);
    }
  } catch (e) {
    if (id != null) sendError(id, -32603, 'Internal error: ' + e.message);
  }
});

process.stderr.write('[ontology-workbench MCP] 已启动, base=' + BASE_URL + '\n');
