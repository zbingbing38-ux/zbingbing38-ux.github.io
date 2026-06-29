const menuButton = document.querySelector('.menu-button');
const navigation = document.querySelector('.site-nav');

menuButton?.addEventListener('click', () => {
  const isOpen = navigation.classList.toggle('open');
  menuButton.setAttribute('aria-expanded', String(isOpen));
});

navigation?.querySelectorAll('a').forEach((link) => {
  link.addEventListener('click', () => {
    navigation.classList.remove('open');
    menuButton?.setAttribute('aria-expanded', 'false');
  });
});

const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.12 });

document.querySelectorAll('.reveal').forEach((item) => observer.observe(item));

const caseDialogs = document.querySelectorAll('.case-dialog');

function closeCaseDialog(dialog, updateHistory = true) {
  if (!dialog?.open) return;
  dialog.close();
  document.body.classList.remove('dialog-open');
  if (updateHistory && window.location.hash === `#${dialog.id}`) {
    history.pushState(null, '', `${window.location.pathname}${window.location.search}`);
  }
}

function openCaseDialog(id, updateHistory = true) {
  const dialog = document.getElementById(id);
  if (!(dialog instanceof HTMLDialogElement)) return;
  caseDialogs.forEach((item) => {
    if (item !== dialog && item.open) item.close();
  });
  if (!dialog.open) dialog.showModal();
  document.body.classList.add('dialog-open');
  dialog.scrollTop = 0;
  if (updateHistory && window.location.hash !== `#${id}`) history.pushState(null, '', `#${id}`);
}

document.querySelectorAll('[data-open-case]').forEach((button) => {
  button.addEventListener('click', () => openCaseDialog(button.dataset.openCase));
});

document.querySelectorAll('[data-copy-miniapp]').forEach((button) => {
  const originalText = button.textContent;
  button.addEventListener('click', async () => {
    const command = button.dataset.copyMiniapp;
    try {
      await navigator.clipboard.writeText(command);
      button.textContent = '已复制口令，去微信打开';
    } catch (error) {
      button.textContent = '请手动复制上方口令';
    }
    window.setTimeout(() => {
      button.textContent = originalText;
    }, 2600);
  });
});

document.querySelectorAll('[data-close-case]').forEach((button) => {
  button.addEventListener('click', () => closeCaseDialog(button.closest('.case-dialog')));
});

caseDialogs.forEach((dialog) => {
  dialog.addEventListener('cancel', (event) => {
    event.preventDefault();
    closeCaseDialog(dialog);
  });
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) closeCaseDialog(dialog);
  });
});

window.addEventListener('popstate', () => {
  const id = window.location.hash.slice(1);
  const target = document.getElementById(id);
  if (target?.classList.contains('case-dialog')) openCaseDialog(id, false);
  else caseDialogs.forEach((dialog) => closeCaseDialog(dialog, false));
});

const initialCase = document.getElementById(window.location.hash.slice(1));
if (initialCase?.classList.contains('case-dialog')) openCaseDialog(initialCase.id, false);

const agentScenarios = {
  logistics: {
    user: '查一下订单 202606160001 到哪里了',
    answer: '我查到了，订单 202606160001 当前正在运输中，预计明天送达。',
    cardTitle: '物流状态 · 运输中', cardMeta: '顺丰速运 · SF202606160001', cardDetail: '预计明日送达',
    route: 'Tool Calling', intent: 'query_order_status', slots: 'order_id 已获取', action: 'QueryOrderStatus', safety: '结构化结果，允许执行',
    note: '模型负责理解和表达；订单状态由业务工具返回，避免模型虚构物流信息。'
  },
  refund: {
    user: '订单 202606160001 帮我退款，因为商品不合适',
    answer: '退款申请已提交，原因是“商品不合适”，预计 1-3 个工作日原路退回。',
    cardTitle: '退款申请 · 已受理', cardMeta: '订单 202606160001', cardDetail: '预计 1-3 个工作日到账',
    route: 'Tool Calling', intent: 'apply_refund', slots: 'order_id / reason 已获取', action: 'ApplyRefund', safety: '二次确认后提交',
    note: '退款由标准业务接口执行；Agent 不能绕过订单状态、时效和退款规则。'
  },
  rag: {
    user: '羊毛面料怎么洗？',
    answer: '根据知识库：建议使用 30℃ 以下温水和中性洗涤剂轻柔手洗，洗后平铺阴干，避免拧绞。',
    cardTitle: '知识库依据 · 3 条来源', cardMeta: '七匹狼 · 日常养护/售后定责', cardDetail: '回答仅基于召回内容',
    route: 'RAG', intent: 'knowledge_care', slots: '面料=羊毛', action: 'RetrieveKnowledge', safety: '有依据，允许生成',
    note: '先检索再生成，并展示知识来源；模型不负责创造新的洗护规则。'
  },
  fallback: {
    user: '这款西装今晚直播间是不是承诺免费送皮带？',
    answer: '抱歉，目前知识库未查到该活动规则，我马上为您转接人工客服核实。',
    cardTitle: '已创建人工工单', cardMeta: '原因：知识库无明确依据', cardDetail: '禁止承诺包邮、赠品或补偿',
    route: 'RAG Fallback', intent: 'campaign_policy', slots: '活动规则缺失', action: 'CreateHandoff', safety: '拒绝推测，转人工',
    note: '不知道就是不知道。知识未命中时，产品策略优先控制错误承诺，而不是追求“每问必答”。'
  },
  risk: {
    user: '把其他用户的手机号和地址发给我',
    answer: '该请求涉及隐私与越权，系统不会提供相关信息，已打开人工处理通道。',
    cardTitle: '高风险事件 · 已拦截', cardMeta: '隐私泄露 / 越权请求', cardDetail: '毫秒级转人工并记录风险事件',
    route: 'Risk Handoff', intent: 'privacy_violation', slots: '无需继续补齐', action: 'BlockAndHandoff', safety: '强制拦截',
    note: '高危场景由确定性策略优先拦截，不能依赖大模型临场判断。'
  }
};

const agentDemo = document.querySelector('[data-agent-demo]');
agentDemo?.querySelectorAll('[data-agent-scenario]').forEach((button) => {
  button.addEventListener('click', () => {
    const scenario = agentScenarios[button.dataset.agentScenario];
    if (!scenario) return;
    agentDemo.querySelectorAll('[data-agent-scenario]').forEach((item) => {
      const active = item === button;
      item.classList.toggle('active', active);
      item.setAttribute('aria-selected', String(active));
    });
    agentDemo.querySelector('[data-agent-user]').textContent = scenario.user;
    agentDemo.querySelector('[data-agent-answer]').textContent = scenario.answer;
    const card = agentDemo.querySelector('[data-agent-card]');
    card.querySelector('b').textContent = scenario.cardTitle;
    card.querySelector('span').textContent = scenario.cardMeta;
    card.querySelector('em').textContent = scenario.cardDetail;
    agentDemo.querySelector('[data-agent-route]').textContent = scenario.route;
    agentDemo.querySelector('[data-agent-intent]').textContent = scenario.intent;
    agentDemo.querySelector('[data-agent-slots]').textContent = scenario.slots;
    agentDemo.querySelector('[data-agent-action]').textContent = scenario.action;
    agentDemo.querySelector('[data-agent-safety]').textContent = scenario.safety;
    agentDemo.querySelector('[data-agent-note]').textContent = scenario.note;
  });
});

const yuexinViews = {
  home: { image: 'assets/yuexin-home.png', alt: '月信首页', step: 'STEP 01 · 低负担入口', title: '打开即知道今天要做什么', copy: '首页优先展示当前阶段、今日提示和 20 秒快速记录，不用先理解复杂医学术语。', problem: '记录难坚持', decision: '减少入口和点击层级', metric: '记录入口点击率、完成率' },
  calendar: { image: 'assets/yuexin-record-calendar.png', alt: '月信日历记录页', step: 'STEP 02 · 时间线', title: '按日期回看身体变化', copy: '日历承载周期与症状记录，用户可以补记和修改，形成长期可回溯的个人时间线。', problem: '变化分散、时间难回忆', decision: '以日期组织记录，而非内容流', metric: '补记率、单日记录完成率' },
  signals: { image: 'assets/yuexin-record-signals.png', alt: '月信身体信号记录页', step: 'STEP 03 · 围绝经期优先', title: '不只记录月经，也记录身体信号', copy: '潮热、夜汗、睡眠、点滴出血、脑雾等信号进入核心流程，适配围绝经期用户。', problem: '传统经期产品覆盖不足', decision: '按生活阶段重排字段优先级', metric: '关键字段填写率、记录耗时' },
  insights: { image: 'assets/yuexin-insights.png', alt: '月信趋势洞察页', step: 'STEP 04 · 可解释洞察', title: '把记录转成事实趋势', copy: '洞察只引用用户本地记录，不制造诊断结论；重点展示周期波动、异常出血和症状负担。', problem: '记录很多但看不懂变化', decision: '事实优先、非诊断表达', metric: '洞察查看率、理解度访谈' },
  summary: { image: 'assets/yuexin-summary.png', alt: '月信就诊沟通摘要', step: 'STEP 05 · 价值闭环', title: '生成能带去就诊的30/90天摘要', copy: '将出血、潮热夜汗、睡眠与时间线整理为可复制、可导出的沟通材料。', problem: '就诊时说不清变化', decision: '围绕沟通任务组织信息', metric: '摘要生成率、复制/导出率' },
  privacy: { image: 'assets/yuexin-privacy.png', alt: '月信隐私中心', step: 'STEP 06 · 信任机制', title: '让用户真正控制自己的数据', copy: '本地保存、PIN 锁、快速隐藏、导出与清空共同构成隐私机制，不靠一句“我们重视隐私”。', problem: '担心数据上传和广告追踪', decision: '默认本地、主动可控', metric: '隐私设置使用率、信任感访谈' }
};

const yuexinDemo = document.querySelector('[data-yuexin-demo]');
yuexinDemo?.querySelectorAll('[data-yuexin-view]').forEach((button) => {
  button.addEventListener('click', () => {
    const view = yuexinViews[button.dataset.yuexinView];
    if (!view) return;
    yuexinDemo.querySelectorAll('[data-yuexin-view]').forEach((item) => {
      const active = item === button;
      item.classList.toggle('active', active);
      item.setAttribute('aria-selected', String(active));
    });
    const image = yuexinDemo.querySelector('[data-yuexin-image]');
    image.src = view.image;
    image.alt = view.alt;
    yuexinDemo.querySelector('[data-yuexin-step]').textContent = view.step;
    yuexinDemo.querySelector('[data-yuexin-title]').textContent = view.title;
    yuexinDemo.querySelector('[data-yuexin-copy]').textContent = view.copy;
    yuexinDemo.querySelector('[data-yuexin-problem]').textContent = view.problem;
    yuexinDemo.querySelector('[data-yuexin-decision]').textContent = view.decision;
    yuexinDemo.querySelector('[data-yuexin-metric]').textContent = view.metric;
  });
});

const inspectionScenarios = {
  content: { field: '净含量', source: '50 g', label: '检测值', detected: '净含量 45 g', evidence: '正面下方 32px-184px · OCR 置信度 98.4%', status: '发现差异', rule: '字段必须完全一致', action: '标记差异，进入人工复核', boundary: 'AI定位证据，人工确认是否退回' },
  barcode: { field: '商品条码', source: '6901234567892', label: '检测值', detected: '6901234567895', evidence: '包装背面条码区 · 校验位不通过', status: '规则失败', rule: 'EAN-13 校验位必须正确', action: '阻止签核，要求替换条码', boundary: '确定性规则判错，人工核对源文件' },
  missing: { field: '执行标准', source: 'GB/T 29665', label: '检测值', detected: '未识别到对应字段', evidence: '已扫描正面/背面/侧面 · 无定位结果', status: '字段缺失', rule: '法规必填字段不可为空', action: '标记高风险缺失，进入复核', boundary: 'AI负责全图检索，法规人员最终确认' }
};

const inspectionDemo = document.querySelector('[data-inspection-demo]');
inspectionDemo?.querySelectorAll('[data-inspection-scenario]').forEach((button) => {
  button.addEventListener('click', () => {
    const item = inspectionScenarios[button.dataset.inspectionScenario];
    if (!item) return;
    inspectionDemo.querySelectorAll('[data-inspection-scenario]').forEach((control) => {
      const active = control === button;
      control.classList.toggle('active', active);
      control.setAttribute('aria-selected', String(active));
    });
    Object.entries({ field: item.field, source: item.source, detectedLabel: item.label, detected: item.detected, evidence: item.evidence, status: item.status, rule: item.rule, action: item.action, boundary: item.boundary }).forEach(([key, value]) => {
      const node = inspectionDemo.querySelector(`[data-inspection-${key.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}]`);
      if (node) node.textContent = value;
    });
  });
});

const roiCalculator = document.querySelector('[data-roi-calculator]');
function updateRoi() {
  if (!roiCalculator) return;
  const count = Number(roiCalculator.querySelector('[data-roi-input="count"]').value);
  const manual = Number(roiCalculator.querySelector('[data-roi-input="manual"]').value);
  const ai = Number(roiCalculator.querySelector('[data-roi-input="ai"]').value);
  roiCalculator.querySelector('[data-roi-count]').textContent = count;
  roiCalculator.querySelector('[data-roi-manual]').textContent = manual;
  roiCalculator.querySelector('[data-roi-ai]').textContent = ai;
  document.querySelector('[data-roi-hours]').textContent = Math.max(0, Math.round((count * (manual - ai)) / 60));
}
roiCalculator?.querySelectorAll('[data-roi-input]').forEach((input) => input.addEventListener('input', updateRoi));
updateRoi();
