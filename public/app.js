/* 本体管理工作台 — 前端单页应用
 * 核心: 本体 schema(10 主体 + 字段口径 + 关系) 驱动一切视图
 */
'use strict';

/* ============================================================
 * 一、本体定义 (唯一数据源: 列表列、表单、口径字典、图谱全由它生成)
 * ============================================================ */

const ONTOLOGY = {
  entities: [
    /* ---------- A 组 · 人 ---------- */
    {
      key: 'channel_managers', name: '渠道经理', group: '人',
      desc: '电信侧的人，整条获客主线靠他们引荐。',
      actions: '对台词、联合拜访、催进度',
      hole: true,
      fields: [
        { key: 'name', label: '姓名', type: 'text', required: true, list: true, calibre: '电信侧客户经理的真实姓名，一人一条' },
        { key: 'district', label: '区局', type: 'text', list: true, calibre: '所属电信区局/支局，如"花都"' },
        { key: 'products', label: '可搭售产品', type: 'text', list: true, calibre: '他能主推的电信产品（云、专线、安防等），影响联合打单的组合' },
        { key: 'cooperation', label: '配合度', type: 'select', options: ['高', '中', '低'], list: true, calibre: '按"是否主动约局、是否愿意带客上门"判断，每次联合拜访后更新' },
        { key: 'phone', label: '联系方式', type: 'text', calibre: '电话或微信，能约到人的渠道即可' },
        { key: 'notes', label: '备注', type: 'textarea', calibre: '沟通风格、关注点、历史合作情况' },
      ],
    },
    {
      key: 'customers', name: '企业客户', group: '人',
      desc: '一家实体企业，整条流程的锚点。',
      actions: '录入、评分、标状态',
      fields: [
        { key: 'name', label: '名称', type: 'text', required: true, list: true, calibre: '工商全称或日常称呼，一家企业一条，不重复建' },
        { key: 'industry', label: '行业', type: 'text', list: true, calibre: '如：皮具、纺织、五金；用于案例复用时按行业匹配' },
        { key: 'park', label: '所在园区', type: 'text', list: true, calibre: '园区/市场名，如"狮岭皮具城"；决定走访动线' },
        { key: 'address', label: '地址', type: 'text', calibre: '具体到能上门的地址' },
        { key: 'scale', label: '规模', type: 'text', calibre: '人数或年营收，口径自定但前后保持一致' },
        { key: 'status', label: '状态', type: 'select', options: ['线索', '已拜访', '有意向', '已报价', '已签约', '暂缓'], list: true, calibre: '只按实际推进节点更新，不凭感觉' },
        { key: 'score', label: '评分卡', type: 'number', list: true, calibre: '按《花都首批客户筛选框架》打分；未评留空，不填 0' },
        { key: 'channelManagerIds', label: '引荐渠道经理', type: 'multiref', ref: 'channel_managers', calibre: '谁引荐的挂谁；可多个' },
        { key: 'notes', label: '备注', type: 'textarea', calibre: '关键背景、决策链情况' },
      ],
    },
    {
      key: 'contacts', name: '联系人', group: '人',
      desc: '客户里的人。',
      actions: '约见、更新态度、定角色',
      fields: [
        { key: 'name', label: '姓名', type: 'text', required: true, list: true, calibre: '真实姓名' },
        { key: 'customerId', label: '所属客户', type: 'ref', ref: 'customers', required: true, list: true, calibre: '挂在哪家企业下' },
        { key: 'role', label: '角色', type: 'select', options: ['决策', '使用', '引荐'], list: true, calibre: '决策=能拍板掏钱；使用=日常干活的人；引荐=带你进门的人。一人一个主角色，身兼多档选决策' },
        { key: 'phone', label: '电话', type: 'text', calibre: '手机号或微信号' },
        { key: 'attitude', label: '态度温度', type: 'select', options: ['1', '2', '3', '4', '5'], list: true, calibre: '1=冷淡回避 … 5=主动力挺。每次接触后更新，记录变化比记录绝对值更重要' },
        { key: 'notes', label: '备注', type: 'textarea', calibre: '关注点、忌讳、个人情况' },
      ],
    },

    /* ---------- B 组 · 事 ---------- */
    {
      key: 'pain_points', name: '痛点', group: '事',
      desc: '一件具体的麻烦，不是一类现象。',
      actions: '指认、记录、翻译成价值',
      fields: [
        { key: 'stage', label: '环节名', type: 'text', required: true, list: true, calibre: '具体到动作，如"对账要手工抄单"，不写"管理混乱"这类概括' },
        { key: 'customerId', label: '所属客户', type: 'ref', ref: 'customers', required: true, list: true, calibre: '谁的麻烦' },
        { key: 'who', label: '谁在做', type: 'text', list: true, calibre: '具体岗位，如"老板娘每天晚上"；翻译价值时按此人工资算' },
        { key: 'frequency', label: '多久一次', type: 'text', list: true, calibre: '如"每天""每月底"；决定省下的时间怎么折算' },
        { key: 'duration', label: '一次多久', type: 'text', calibre: '如"40 分钟"；与频率相乘=月度耗时' },
        { key: 'saving', label: '消失能省下什么', type: 'textarea', calibre: '钱、时间、出错率，写能算的数；这是转命题的依据' },
        { key: 'status', label: '状态', type: 'select', options: ['新指认', '已转命题', '搁置'], list: true, calibre: '转命题后不再改内容，去命题里跟' },
        { key: 'notes', label: '备注', type: 'textarea' },
      ],
    },
    {
      key: 'visits', name: '拜访', group: '事',
      desc: '一次首访事件，按「指认」替代「描述」的打法。',
      actions: '发起、记录、收口下一步',
      fields: [
        { key: 'customerId', label: '客户', type: 'ref', ref: 'customers', required: true, list: true, calibre: '拜访对象' },
        { key: 'date', label: '日期', type: 'date', required: true, list: true, calibre: '实际到场日' },
        { key: 'place', label: '地点', type: 'text', calibre: '店/厂/园区具体位置' },
        { key: 'participants', label: '参与人', type: 'text', calibre: '我方+客户方到场人，含渠道经理' },
        { key: 'm1', label: '三指标① 进入需求讨论 ≤10 分钟', type: 'bool', list: true, calibre: '从坐下到客户开始谈自己的麻烦，是否 10 分钟内达成' },
        { key: 'm2', label: '三指标② 客户主动补充 ≥2 条', type: 'bool', list: true, calibre: '讲痛点清单时客户主动补充的信息条数是否 ≥2' },
        { key: 'm3', label: '三指标③ 拿到「人+物」', type: 'bool', list: true, calibre: '离场前是否敲定下一步的具体人和具体物（如"周三把单据带过来"）' },
        { key: 'next_step', label: '收口下一步', type: 'textarea', calibre: '人+物：谁、什么时间、交出什么' },
        { key: 'notes', label: '记录', type: 'textarea', calibre: '客户原话、现场观察，原样记不加工' },
      ],
    },
    {
      key: 'demos', name: 'Demo', group: '事',
      desc: '一次现场演示记录。每跑一次就是半个自有案例。',
      actions: '准备、跑、留四样',
      fields: [
        { key: 'visitId', label: '所属拜访', type: 'ref', ref: 'visits', required: true, list: true, calibre: '挂在哪次拜访下' },
        { key: 'input', label: '输入', type: 'textarea', list: true, calibre: '客户现场给的原始材料，如"一张手工单据"' },
        { key: 'output', label: '输出', type: 'textarea', list: true, calibre: '当场产出的结构化结果，如"可筛选的表格"' },
        { key: 'duration', label: '耗时', type: 'text', list: true, calibre: '从拿到材料到给出结果的用时；这是说服力数字' },
        { key: 'quote', label: '客户原话', type: 'textarea', calibre: '演示后客户的第一反应，逐字记，不修饰——将来写案例就靠它' },
        { key: 'complexity', label: '暴露的复杂度', type: 'textarea', calibre: '这次演示暴露了什么没做到/做得勉强的地方，决定方案边界怎么划' },
      ],
    },
    {
      key: 'propositions', name: '命题', group: '事',
      desc: '带指标的待办场景，痛点的翻译结果。',
      actions: '锁定、立项、定验收',
      fields: [
        { key: 'title', label: '命题', type: 'text', required: true, list: true, calibre: '一句话说清"把什么从什么变成什么"' },
        { key: 'customerId', label: '客户', type: 'ref', ref: 'customers', required: true, list: true, calibre: '归属客户' },
        { key: 'painPointId', label: '来源痛点', type: 'ref', ref: 'pain_points', calibre: '由哪个痛点转来，可追溯' },
        { key: 'metric', label: '指标', type: 'text', list: true, calibre: '用什么数字衡量改善，如"月对账工时"' },
        { key: 'baseline', label: '基线', type: 'text', list: true, calibre: '改善前的现状数值；没有基线的命题不算锁定' },
        { key: 'owner', label: '责任人', type: 'text', calibre: '客户侧谁为这个指标负责，我方推进人另记' },
        { key: 'acceptance', label: '验收标准', type: 'textarea', calibre: '怎样算做成，双方认可的具体标准' },
        { key: 'status', label: '状态', type: 'select', options: ['待立项', '已立项', '交付中', '已验收', '已取消'], list: true, calibre: '按实际节点更新' },
      ],
    },

    /* ---------- C 组 · 成果 ---------- */
    {
      key: 'proposals', name: '方案/报价', group: '成果',
      desc: '一次方案与价。',
      actions: '出方案、报价、划边界',
      fields: [
        { key: 'propositionId', label: '所属命题', type: 'ref', ref: 'propositions', required: true, list: true, calibre: '为哪个命题出的方案' },
        { key: 'scope', label: '范围', type: 'textarea', list: true, calibre: '做什么，写到可核对的程度' },
        { key: 'boundary', label: '边界（做不了的）', type: 'textarea', calibre: '明确写"不包含什么"；边界不清是交付扯皮的根源' },
        { key: 'price', label: '价格', type: 'number', list: true, calibre: '元；含税与否注明在备注' },
        { key: 'delivery', label: '交付形态', type: 'select', options: ['软件工具', '代运营', '定制开发', '咨询+落地', '其他'], calibre: '卖结果还是卖工具，按方法论默认卖结果' },
        { key: 'status', label: '状态', type: 'select', options: ['草稿', '已发', '谈判中', '已接受', '已否'], list: true, calibre: '按实际节点更新' },
        { key: 'notes', label: '备注', type: 'textarea' },
      ],
    },
    {
      key: 'projects', name: '项目/合同', group: '成果',
      desc: '一个已签的单。',
      actions: '签约、交付、验收',
      fields: [
        { key: 'propositionId', label: '所属命题', type: 'ref', ref: 'propositions', required: true, list: true, calibre: '对应哪个命题' },
        { key: 'subject', label: '标的', type: 'text', required: true, list: true, calibre: '合同标的概述' },
        { key: 'amount', label: '金额', type: 'number', list: true, calibre: '元，合同金额' },
        { key: 'ownership', label: '归属', type: 'select', options: ['电信', '我方'], list: true, calibre: '前向客户由电信签则记"电信"；决定回款路径' },
        { key: 'payment', label: '账期', type: 'text', calibre: '付款节奏，如"3-6-1"' },
        { key: 'delivery', label: '交付形态', type: 'text', calibre: '同方案/报价的交付形态' },
        { key: 'status', label: '状态', type: 'select', options: ['已签', '交付中', '已验收'], list: true, calibre: '按实际节点更新' },
        { key: 'notes', label: '备注', type: 'textarea' },
      ],
    },
    {
      key: 'cases', name: '案例', group: '成果',
      desc: '一次可复用的成效，向电信要资源时唯一有说服力的材料。',
      actions: '脱敏、归档、复用',
      hole: true,
      fields: [
        { key: 'projectId', label: '来源项目', type: 'ref', ref: 'projects', list: true, calibre: '从哪个项目沉淀；调研期 Demo 产生的可先不挂' },
        { key: 'effect', label: '成效', type: 'text', required: true, list: true, calibre: '一句话说结果，最好带数字，如"月对账工时从 8h 降到 0.5h"' },
        { key: 'input_desc', label: '脱敏输入', type: 'textarea', list: true, calibre: '客户给的是什么，脱敏到认不出具体企业' },
        { key: 'output_desc', label: '输出', type: 'textarea', list: true, calibre: '产出物形态' },
        { key: 'duration', label: '耗时', type: 'text', calibre: 'Demo 或交付的实际用时' },
        { key: 'industry', label: '行业', type: 'text', list: true, calibre: '用于向同行业客户复用' },
        { key: 'scenarios', label: '可用场景', type: 'textarea', calibre: '什么场合能拿这个案例讲：向电信提案/向同行业客户首访' },
        { key: 'quote', label: '客户原话', type: 'textarea', calibre: '验收时客户的评价，逐字记' },
      ],
    },
  ],

  /* 关系图谱 */
  edges: [
    { from: 'channel_managers', to: 'customers', label: '引荐' },
    { from: 'customers', to: 'contacts', label: '挂' },
    { from: 'customers', to: 'pain_points', label: '提出' },
    { from: 'pain_points', to: 'propositions', label: '转为' },
    { from: 'customers', to: 'visits', label: '拜访' },
    { from: 'visits', to: 'demos', label: '演示' },
    { from: 'propositions', to: 'proposals', label: '出方案' },
    { from: 'propositions', to: 'projects', label: '签约' },
    { from: 'projects', to: 'cases', label: '沉淀' },
  ],

  /* 流程漏斗 */
  funnel: ['customers', 'visits', 'demos', 'propositions', 'proposals', 'projects', 'cases'],
};

const ENTITY_MAP = {};
ONTOLOGY.entities.forEach((e) => { ENTITY_MAP[e.key] = e; });

/* ============================================================
 * 二、工具
 * ============================================================ */

const $root = document.getElementById('root');

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

const state = {
  token: localStorage.getItem('owb_token') || null,
  username: null,
  initialized: null,
  data: null, // { entityKey: [items] }
};

function titleOf(entityKey, item) {
  if (!item) return '（空）';
  switch (entityKey) {
    case 'visits': {
      const c = item.customerId ? refTitle('customers', item.customerId) : '';
      return (c ? c + ' · ' : '') + (item.date || '未记日期');
    }
    case 'demos': {
      const v = item.visitId ? refTitle('visits', item.visitId) : '';
      return v ? 'Demo @ ' + v : 'Demo 记录';
    }
    case 'proposals': return (item.price != null && item.price !== '' ? '报价 ' + item.price + ' 元' : '方案') + (item.propositionId ? ' · ' + refTitle('propositions', item.propositionId) : '');
    default: return item.name || item.stage || item.title || item.subject || item.effect || item.id;
  }
}

function refTitle(entityKey, id) {
  const items = (state.data && state.data[entityKey]) || [];
  const it = items.find((x) => x.id === id);
  return it ? titleOf(entityKey, it) : '（已删除）';
}

/* ============================================================
 * 三、API 层
 * ============================================================ */

async function api(path, opts) {
  const headers = { 'Content-Type': 'application/json' };
  if (state.token) headers['Authorization'] = 'Bearer ' + state.token;
  let res;
  try {
    res = await fetch('/api/' + path, Object.assign({ headers }, opts));
  } catch (e) {
    throw new Error('网络连接失败，请检查服务是否在运行');
  }
  let body = {};
  try { body = await res.json(); } catch (e) { /* ignore */ }
  if (res.status === 401 && !path.startsWith('auth/')) {
    state.token = null;
    localStorage.removeItem('owb_token');
    location.hash = '#/login';
    throw new Error('登录已失效，请重新登录');
  }
  if (!res.ok) throw new Error(body.error || ('请求失败 (' + res.status + ')'));
  return body;
}

/* ============================================================
 * 四、路由
 * ============================================================ */

window.addEventListener('hashchange', render);

function nav(hash) { location.hash = hash; }

async function render() {
  const hash = location.hash || '#/dashboard';
  const parts = hash.replace(/^#\//, '').split('/');

  // 首次加载: 检查初始化/登录状态
  if (state.initialized === null) {
    try {
      const st = await api('auth/status');
      state.initialized = st.initialized;
      state.username = st.username;
    } catch (e) {
      viewFatal(e.message);
      return;
    }
  }
  if (!state.initialized && parts[0] !== 'setup') { nav('#/setup'); return; }
  if (state.initialized && !state.token && parts[0] !== 'login') { nav('#/login'); return; }

  // 登录后预取数据
  if (state.token && !state.data && parts[0] !== 'login' && parts[0] !== 'setup') {
    try { state.data = await api('data'); }
    catch (e) { viewFatal(e.message); return; }
  }

  switch (parts[0]) {
    case 'setup': return viewSetup();
    case 'login': return viewLogin();
    case 'graph': return viewShell(viewGraph);
    case 'list': return viewShell(() => viewList(parts[1]));
    case 'form': return viewShell(() => viewForm(parts[1], parts[2]));
    case 'dict': return viewShell(viewDict);
    default: return viewShell(viewDashboard);
  }
}

function viewFatal(msg) {
  $root.innerHTML =
    '<div class="auth-wrap"><div class="auth-card"><h1>服务不可用</h1>' +
    '<p class="sub">' + esc(msg) + '</p></div></div>';
}

/* ============================================================
 * 五、认证视图
 * ============================================================ */

function viewSetup() {
  $root.innerHTML =
    '<div class="auth-wrap"><div class="auth-card">' +
    '<h1>初始化账号</h1><p class="sub">首次使用，设置你的登录账号（仅你一人使用）</p>' +
    '<form id="auth-form">' +
    fieldHTML({ key: 'username', label: '用户名', type: 'text', required: true }) +
    fieldHTML({ key: 'password', label: '密码', type: 'password', required: true, calibre: '至少 6 位' }) +
    '<div class="form-error" id="form-error"></div>' +
    '<div class="form-actions"><button class="btn primary" type="submit">创建并进入</button></div>' +
    '</form></div></div>';
  document.getElementById('auth-form').onsubmit = async (ev) => {
    ev.preventDefault();
    const f = ev.target;
    try {
      const r = await api('auth/setup', {
        method: 'POST',
        body: JSON.stringify({ username: f.username.value, password: f.password.value }),
      });
      state.token = r.token;
      state.username = r.username;
      state.initialized = true;
      localStorage.setItem('owb_token', r.token);
      state.data = await api('data');
      nav('#/dashboard');
    } catch (e) { document.getElementById('form-error').textContent = e.message; }
  };
}

function viewLogin() {
  $root.innerHTML =
    '<div class="auth-wrap"><div class="auth-card">' +
    '<h1>本体管理工作台</h1><p class="sub">对象 + 关系 + 动作 + 口径</p>' +
    '<form id="auth-form">' +
    fieldHTML({ key: 'username', label: '用户名', type: 'text', required: true }) +
    fieldHTML({ key: 'password', label: '密码', type: 'password', required: true }) +
    '<div class="form-error" id="form-error"></div>' +
    '<div class="form-actions"><button class="btn primary" type="submit">登录</button></div>' +
    '</form></div></div>';
  document.getElementById('auth-form').onsubmit = async (ev) => {
    ev.preventDefault();
    const f = ev.target;
    try {
      const r = await api('auth/login', {
        method: 'POST',
        body: JSON.stringify({ username: f.username.value, password: f.password.value }),
      });
      state.token = r.token;
      state.username = r.username;
      localStorage.setItem('owb_token', r.token);
      state.data = await api('data');
      nav('#/dashboard');
    } catch (e) { document.getElementById('form-error').textContent = e.message; }
  };
}

/* ============================================================
 * 六、外壳（侧边栏 + 主区）
 * ============================================================ */

function viewShell(contentFn) {
  const counts = {};
  ONTOLOGY.entities.forEach((e) => { counts[e.key] = (state.data[e.key] || []).length; });
  const groups = ['人', '事', '成果'];
  let navHTML =
    '<div class="logo">本体管理工作台<span class="sub">对象 · 关系 · 动作 · 口径</span></div>' +
    navItem('dashboard', '▦ 总览') + navItem('graph', '⬡ 本体图谱') + navItem('dict', '📖 口径字典');
  groups.forEach((g) => {
    navHTML += '<div class="nav-group-label">' + g + '</div>';
    ONTOLOGY.entities.filter((e) => e.group === g).forEach((e) => {
      navHTML += navItem('list/' + e.key, e.name, counts[e.key]);
    });
  });
  navHTML += '<div style="flex:1"></div><div style="padding:10px 12px;border-top:1px solid var(--border)">' +
    '<span class="muted">' + esc(state.username || '') + '</span> · ' +
    '<a href="javascript:void(0)" id="logout-link">退出</a></div>';

  $root.innerHTML = '<div class="layout"><nav class="sidebar">' + navHTML + '</nav><main class="main" id="main"></main></div>';
  document.getElementById('logout-link').onclick = async () => {
    try { await api('auth/logout', { method: 'POST' }); } catch (e) { /* ignore */ }
    state.token = null; state.username = null; state.data = null;
    localStorage.removeItem('owb_token');
    nav('#/login');
  };
  contentFn(document.getElementById('main'));
}

function navItem(hash, label, count) {
  const active = (location.hash || '#/dashboard') === '#/' + hash ? ' active' : '';
  return '<a class="nav-item' + active + '" href="#/' + hash + '">' + esc(label) +
    (count != null ? '<span class="count">' + count + '</span>' : '') + '</a>';
}

/* ============================================================
 * 七、总览仪表盘
 * ============================================================ */

function viewDashboard(main) {
  const d = state.data;
  const cnt = (k) => (d[k] || []).length;
  const funnelMax = Math.max(1, ...ONTOLOGY.funnel.map(cnt));

  let funnelHTML = '';
  ONTOLOGY.funnel.forEach((k, i) => {
    const e = ENTITY_MAP[k];
    const n = cnt(k);
    funnelHTML +=
      '<div class="funnel-row">' +
      '<div class="f-label"><a href="#/list/' + k + '">' + esc(e.name) + '</a></div>' +
      '<div class="f-bar-wrap"><div class="f-bar" style="width:' + (n / funnelMax * 100) + '%"></div></div>' +
      '<div class="f-num">' + n + '</div>' +
      (i < ONTOLOGY.funnel.length - 1 ? '<div class="muted" style="width:14px;text-align:center">→</div>' : '<div style="width:14px"></div>') +
      '</div>';
  });

  const holes = ONTOLOGY.entities.filter((e) => e.hole);
  let holeHTML = '';
  holes.forEach((e) => {
    const n = cnt(e.key);
    holeHTML +=
      '<div class="card hole"><div class="hole-title">' + esc(e.name) +
      ' <span class="tag ' + (n === 0 ? 'amber' : 'green') + '">' + (n === 0 ? '空白' : n + ' 条') + '</span></div>' +
      '<p>' + esc(e.desc) + ' <a href="#/list/' + e.key + '">去补 →</a></p></div>';
  });

  let statHTML = '';
  ONTOLOGY.entities.forEach((e) => {
    const n = cnt(e.key);
    statHTML += '<div class="stat' + (n === 0 ? ' zero' : '') + '" onclick="location.hash=\'#/list/' + e.key + '\'">' +
      '<div class="num">' + n + '</div><div class="lbl">' + esc(e.name) + '</div></div>';
  });

  main.innerHTML =
    '<div class="page-head"><h1>总览</h1><span class="desc">获客 → 首访 → Demo → 签约 → 交付 → 案例沉淀</span></div>' +
    '<div class="stat-grid">' + statHTML + '</div>' +
    '<div class="card"><h3>流程漏斗</h3>' + funnelHTML +
    '<p class="muted" style="margin-top:8px">读法：数值不匹配不代表流失，看卡点在哪一层——层与层之间的空档就是下一步该做的动作。</p></div>' +
    '<div class="card"><h3>两个最贵的洞</h3><div class="hole-cards">' + holeHTML + '</div></div>';
}

/* ============================================================
 * 八、本体图谱
 * ============================================================ */

function viewGraph(main) {
  const d = state.data;
  const cnt = (k) => (d[k] || []).length;

  /* 三列固定布局: 人 → 事 → 成果 */
  const pos = {
    channel_managers: { x: 60, y: 55 },
    customers: { x: 60, y: 185 },
    contacts: { x: 60, y: 315 },
    pain_points: { x: 320, y: 70 },
    visits: { x: 320, y: 205 },
    demos: { x: 320, y: 340 },
    propositions: { x: 320, y: 475 },
    proposals: { x: 590, y: 185 },
    projects: { x: 590, y: 340 },
    cases: { x: 590, y: 490 },
  };
  const W = 200, H = 52;

  let edges = '';
  ONTOLOGY.edges.forEach((ed) => {
    const a = pos[ed.from], b = pos[ed.to];
    const x1 = a.x + W, y1 = a.y + H / 2;
    const x2 = b.x, y2 = b.y + H / 2;
    /* 特殊: 同列竖向边 */
    let path, lx, ly;
    if (Math.abs(x1 - x2) < 10) {
      const mx = x1 + 26;
      path = 'M' + x1 + ' ' + y1 + ' C ' + mx + ' ' + y1 + ', ' + mx + ' ' + y2 + ', ' + x2 + ' ' + y2;
      lx = mx + 8; ly = (y1 + y2) / 2;
    } else {
      const cx = (x1 + x2) / 2;
      path = 'M' + x1 + ' ' + y1 + ' C ' + cx + ' ' + y1 + ', ' + cx + ' ' + y2 + ', ' + x2 + ' ' + y2;
      lx = cx; ly = (y1 + y2) / 2 - 5;
    }
    edges += '<path class="g-edge" d="' + path + '"/>' +
      '<text class="g-edge-label" x="' + lx + '" y="' + ly + '" text-anchor="middle" paint-order="stroke" stroke="#f5f6f8" stroke-width="4">' + esc(ed.label) + '</text>';
  });

  let nodes = '';
  Object.keys(pos).forEach((k) => {
    const e = ENTITY_MAP[k], p = pos[k];
    nodes +=
      '<g class="g-node" onclick="location.hash=\'#/list/' + k + '\'">' +
      '<rect x="' + p.x + '" y="' + p.y + '" width="' + W + '" height="' + H + '" rx="10"></rect>' +
      '<text class="g-name" x="' + (p.x + 16) + '" y="' + (p.y + 22) + '">' + esc(e.name) + '</text>' +
      '<text class="g-count" x="' + (p.x + 16) + '" y="' + (p.y + 40) + '">' + cnt(k) + ' 条 · ' + esc(e.actions.split('、')[0]) + '…</text>' +
      '</g>';
  });

  const groupLabels =
    '<text class="g-group-label" x="60" y="30">人</text>' +
    '<text class="g-group-label" x="320" y="30">事</text>' +
    '<text class="g-group-label" x="590" y="30">成果</text>';

  main.innerHTML =
    '<div class="page-head"><h1>本体图谱</h1><span class="desc">10 个主体、9 条关系，点击节点进入管理</span></div>' +
    '<div class="card graph-card">' +
    '<svg viewBox="0 0 830 580" xmlns="http://www.w3.org/2000/svg">' + groupLabels + edges + nodes + '</svg>' +
    '</div>' +
    '<div class="card graph-legend">一句话读图：<b>渠道经理引荐客户 → 客户身上挂联系人和痛点 → 痛点在首访里被转成命题 → 命题走向方案与合同 → 合同沉淀成案例</b>，案例再回去帮渠道经理提案，闭环。</div>';
}

/* ============================================================
 * 九、列表视图
 * ============================================================ */

function viewList(entityKey) {
  const main = document.getElementById('main');
  const entity = ENTITY_MAP[entityKey];
  if (!entity) { main.innerHTML = '<div class="empty">未知主体</div>'; return; }
  const items = state.data[entityKey] || [];
  const listFields = entity.fields.filter((f) => f.list);

  main.innerHTML =
    '<div class="page-head"><h1>' + esc(entity.name) + '</h1>' +
    '<span class="desc">' + esc(entity.desc) + '</span><span class="spacer"></span>' +
    '<a class="btn primary" href="#/form/' + entityKey + '/new">+ 新建' + esc(entity.name) + '</a></div>' +
    '<div class="toolbar">' +
    '<input id="q" placeholder="搜索 ' + esc(entity.name) + '…" />' +
    '</div>' +
    '<div class="card" style="padding:6px 14px">' +
    '<table class="list"><thead><tr>' +
    listFields.map((f) => '<th>' + esc(f.label) + '</th>').join('') + '<th style="width:80px"></th>' +
    '</tr></thead><tbody id="list-body"></tbody></table>' +
    '<div class="empty" id="list-empty" style="display:none"><div class="big">◍</div>' +
    '还没有' + esc(entity.name) + '记录，<a href="#/form/' + entityKey + '/new">新建第一条</a></div>' +
    '</div>';

  const tbody = document.getElementById('list-body');
  const emptyBox = document.getElementById('list-empty');

  function cellHTML(f, it) {
    const v = it[f.key];
    if (f.type === 'ref') return '<td>' + esc(v ? refTitle(f.ref, v) : '—') + '</td>';
    if (f.type === 'multiref') {
      const arr = Array.isArray(v) ? v : [];
      return '<td>' + esc(arr.length ? arr.map((id) => refTitle(f.ref, id)).join('、') : '—') + '</td>';
    }
    if (f.type === 'bool') return '<td>' + (v ? '✅' : '<span class="muted">—</span>') + '</td>';
    if (f.type === 'select') {
      if (v == null || v === '') return '<td><span class="muted">—</span></td>';
      let cls = '';
      if (['已签约', '已验收', '高', '已接受', '5'].includes(v)) cls = 'green';
      if (['暂缓', '低', '已否', '已取消', '搁置'].includes(v)) cls = 'red';
      if (['1', '2', '谈判中'].includes(v)) cls = 'amber';
      return '<td><span class="tag ' + cls + '">' + esc(v) + '</span></td>';
    }
    if (f.type === 'date') return '<td>' + esc(v || '—') + '</td>';
    if (v == null || v === '') return '<td><span class="muted">—</span></td>';
    if (f.type === 'textarea') {
      const t = String(v);
      return '<td>' + esc(t.length > 24 ? t.slice(0, 24) + '…' : t) + '</td>';
    }
    return '<td>' + esc(v) + '</td>';
  }

  function rowHTML(it) {
    return '<tr data-id="' + esc(it.id) + '">' +
      listFields.map((f) => cellHTML(f, it)).join('') +
      '<td style="white-space:nowrap"><a class="btn sm" href="#/form/' + entityKey + '/' + esc(it.id) + '">编辑</a> ' +
      '<button class="btn sm danger-ghost act-del">删除</button></td></tr>';
  }

  function renderRows(list) {
    if (!list.length) { tbody.innerHTML = ''; emptyBox.style.display = 'block'; return; }
    emptyBox.style.display = 'none';
    tbody.innerHTML = list.map(rowHTML).join('');
    tbody.querySelectorAll('.act-del').forEach((btn) => {
      btn.onclick = async () => {
        const tr = btn.closest('tr');
        const id = tr.getAttribute('data-id');
        const it = items.find((x) => x.id === id);
        if (!confirm('确认删除「' + titleOf(entityKey, it) + '」？此操作不可恢复。')) return;
        try {
          await api('entity/' + entityKey + '/' + encodeURIComponent(id), { method: 'DELETE' });
          state.data[entityKey] = items.filter((x) => x.id !== id);
          render();
        } catch (e) { alert(e.message); }
      };
    });
  }

  renderRows(items);
  document.getElementById('q').oninput = (ev) => {
    const q = ev.target.value.trim().toLowerCase();
    if (!q) return renderRows(items);
    renderRows(items.filter((it) =>
      JSON.stringify(it).toLowerCase().includes(q) ||
      titleOf(entityKey, it).toLowerCase().includes(q)));
  };
}

/* ============================================================
 * 十、表单视图（新建 / 编辑）
 * ============================================================ */

function fieldHTML(f, value) {
  const req = f.required ? '<span class="req">*</span>' : '';
  let input = '';
  const v = value == null ? '' : value;
  switch (f.type) {
    case 'text':
      input = '<input type="text" name="' + f.key + '" value="' + esc(v) + '">';
      break;
    case 'number':
      input = '<input type="number" name="' + f.key + '" value="' + esc(v) + '" step="any">';
      break;
    case 'date':
      input = '<input type="date" name="' + f.key + '" value="' + esc(v) + '">';
      break;
    case 'password':
      input = '<input type="password" name="' + f.key + '">';
      break;
    case 'textarea':
      input = '<textarea name="' + f.key + '">' + esc(v) + '</textarea>';
      break;
    case 'select': {
      input = '<select name="' + f.key + '"><option value="">— 未选 —</option>' +
        f.options.map((o) => '<option value="' + esc(o) + '"' + (String(v) === String(o) ? ' selected' : '') + '>' + esc(o) + '</option>').join('') +
        '</select>';
      break;
    }
    case 'bool':
      input = '<input type="hidden" name="' + f.key + '" value="' + (v ? '1' : '') + '">' +
        '<label class="checks" style="margin:0"><input type="checkbox" class="bool-toggle" data-target="' + f.key + '"' + (v ? ' checked' : '') + '> 是</label>';
      break;
    case 'ref': {
      const opts = (state.data[f.ref] || []);
      input = '<select name="' + f.key + '"><option value="">— 未选 —</option>' +
        opts.map((o) => '<option value="' + esc(o.id) + '"' + (v === o.id ? ' selected' : '') + '>' + esc(titleOf(f.ref, o)) + '</option>').join('') +
        '</select>' +
        (opts.length === 0 ? '<div class="calibre" style="color:var(--warn)">还没有' + esc(ENTITY_MAP[f.ref].name) + '可选，<a href="#/form/' + f.ref + '/new" target="_blank">先去新建</a></div>' : '');
      break;
    }
    case 'multiref': {
      const opts = (state.data[f.ref] || []);
      const arr = Array.isArray(v) ? v : [];
      input = '<div class="checks">' + (opts.length ? opts.map((o) =>
        '<label><input type="checkbox" name="' + f.key + '" value="' + esc(o.id) + '"' + (arr.includes(o.id) ? ' checked' : '') + '> ' + esc(titleOf(f.ref, o)) + '</label>').join('')
        : '<span class="muted">还没有' + esc(ENTITY_MAP[f.ref].name) + '可选，<a href="#/form/' + f.ref + '/new" target="_blank">先去新建</a></span>') + '</div>';
      break;
    }
    default:
      input = '<input type="text" name="' + f.key + '" value="' + esc(v) + '">';
  }
  return '<div class="field"><label>' + esc(f.label) + req + '</label>' + input +
    (f.calibre ? '<div class="calibre">口径：' + esc(f.calibre) + '</div>' : '') + '</div>';
}

function viewForm(entityKey, id) {
  const main = document.getElementById('main');
  const entity = ENTITY_MAP[entityKey];
  if (!entity) { main.innerHTML = '<div class="empty">未知主体</div>'; return; }
  const isNew = id === 'new';
  const items = state.data[entityKey] || [];
  const item = isNew ? {} : items.find((x) => x.id === id);
  if (!item) { main.innerHTML = '<div class="empty">记录不存在，<a href="#/list/' + entityKey + '">返回列表</a></div>'; return; }

  main.innerHTML =
    '<div class="page-head"><h1>' + (isNew ? '新建' : '编辑') + esc(entity.name) + '</h1>' +
    '<span class="desc">' + esc(entity.desc) + ' · 动作：' + esc(entity.actions) + '</span></div>' +
    '<div class="card" style="max-width:720px">' +
    '<form id="entity-form">' +
    entity.fields.map((f) => fieldHTML(f, item[f.key])).join('') +
    '<div class="form-error" id="form-error"></div>' +
    '<div class="form-actions">' +
    '<button class="btn primary" type="submit">保存</button>' +
    '<a class="btn" href="#/list/' + entityKey + '">取消</a>' +
    '</div></form></div>';

  /* bool 开关联动 hidden */
  main.querySelectorAll('.bool-toggle').forEach((cb) => {
    cb.onchange = () => {
      main.querySelector('input[name="' + cb.getAttribute('data-target') + '"]').value = cb.checked ? '1' : '';
    };
  });

  document.getElementById('entity-form').onsubmit = async (ev) => {
    ev.preventDefault();
    const form = ev.target;
    const body = {};
    entity.fields.forEach((f) => {
      if (f.type === 'multiref') {
        body[f.key] = Array.from(form.querySelectorAll('input[name="' + f.key + '"]:checked')).map((c) => c.value);
      } else if (f.type === 'bool') {
        body[f.key] = form.querySelector('[name="' + f.key + '"]').value === '1';
      } else if (f.type === 'number') {
        const raw = form.querySelector('[name="' + f.key + '"]').value;
        body[f.key] = raw === '' ? null : Number(raw);
      } else {
        body[f.key] = form.querySelector('[name="' + f.key + '"]').value;
      }
    });
    /* 必填校验 */
    for (const f of entity.fields) {
      if (f.required && (body[f.key] == null || body[f.key] === '' || (Array.isArray(body[f.key]) && !body[f.key].length))) {
        document.getElementById('form-error').textContent = '「' + f.label + '」为必填项';
        return;
      }
    }
    try {
      if (isNew) {
        const created = await api('entity/' + entityKey, { method: 'POST', body: JSON.stringify(body) });
        state.data[entityKey].unshift(created);
      } else {
        const updated = await api('entity/' + entityKey + '/' + encodeURIComponent(id), { method: 'PUT', body: JSON.stringify(body) });
        const idx = state.data[entityKey].findIndex((x) => x.id === id);
        state.data[entityKey][idx] = updated;
      }
      nav('#/list/' + entityKey);
    } catch (e) { document.getElementById('form-error').textContent = e.message; }
  };
}

/* ============================================================
 * 十一、口径字典
 * ============================================================ */

function viewDict(main) {
  let html = '<div class="page-head"><h1>口径字典</h1>' +
    '<span class="desc">本体 = 对象 + 关系 + 动作 + 口径。口径是这里最值钱的东西：谁填、什么算对。</span></div>';

  ONTOLOGY.entities.forEach((e) => {
    html += '<div class="card dict-entity">' +
      '<h3>' + esc(e.name) + ' <span class="tag blue">' + esc(e.group) + '</span></h3>' +
      '<div class="meta"><b>是什么：</b>' + esc(e.desc) + ' ｜ <b>动作：</b>' + esc(e.actions) + '</div>' +
      '<table class="list"><thead><tr><th style="width:180px">字段</th><th>口径（谁填 · 什么算对）</th></tr></thead><tbody>' +
      e.fields.map((f) => '<tr><td><b>' + esc(f.label) + '</b>' + (f.required ? '<span class="req"> *</span>' : '') +
        '<div class="muted">' + esc(f.key) + ' · ' + f.type + '</div></td>' +
        '<td>' + esc(f.calibre || '—') + '</td></tr>').join('') +
      '</tbody></table></div>';
  });

  html += '<div class="card"><h3>关系（9 条）</h3><table class="list"><thead><tr><th>从</th><th>关系</th><th>到</th></tr></thead><tbody>' +
    ONTOLOGY.edges.map((ed) => '<tr><td>' + esc(ENTITY_MAP[ed.from].name) + '</td><td>— ' + esc(ed.label) + ' →</td><td>' + esc(ENTITY_MAP[ed.to].name) + '</td></tr>').join('') +
    '</tbody></table></div>';

  main.innerHTML = html;
}

/* 启动 */
render();
