# 张冰冰｜AI 产品技术方案与模型评测附件

更新日期：2026-06-23

> 本附件区分已实现、规划 POC 与受控评测；所有测试均为合成数据，不代表生产环境表现。

## 晓晓 AI 智能客服

已实现：React + FastAPI + SQLite/JSONL；外部 LLM 可切换，失败自动降级

### 接口清单

| 方法 | 接口/契约 | 用途 | 状态 |
| --- | --- | --- | --- |
| POST | `/api/session/bootstrap` | 初始化会话与近 30 天订单上下文 | 已实现 |
| POST | `/chat/stream` | Agent 编排与 NDJSON 流式回复 | 已实现 |
| POST | `/api/actions/QueryOrderStatus` | 查询订单/物流状态 | 已实现 |
| POST | `/api/actions/ApplyRefund` | 提交退款申请 | 已实现 |
| POST | `/api/actions/UpdateAddress` | 修改收货地址 | 已实现 |
| POST | `/api/actions/UrgeLogistics` | 创建催发货督办 | 已实现 |
| GET | `/api/kb/chunks` | 运营端知识切片查看 | 已实现 |
| POST | `/api/kb/retrieval-preview` | 检索预览与召回验证 | 已实现 |
| GET | `/api/ops/dashboard` | 路由、转人工、负反馈、时延看板 | 已实现 |
| GET | `/api/ops/traces/{trace_id}` | 查看单会话链路 | 已实现 |
| GET/POST | `/api/handoff/tickets…` | 人工工单查询与解决码回写 | 已实现 |
| POST | `/api/compliance/feedback` | 负反馈与原因采集 | 已实现 |

## 月信 · 女性健康 App

已实现：React 本地 MVP；Local-only，无后端、无账号、默认不上云

### 接口清单

| 方法 | 接口/契约 | 用途 | 状态 |
| --- | --- | --- | --- |
| LOCAL | `loadDailyLogs()` | 读取 yuexin.dailyLogs.v1 | 已实现 |
| LOCAL | `saveDailyLogs(logs)` | 写入本地健康记录 | 已实现 |
| LOCAL | `buildBleedingObservation()` | 生成事实型出血观察 | 已实现 |
| LOCAL | `buildDoctorSummary(30|90)` | 生成就诊沟通摘要 | 已实现 |
| LOCAL | `downloadDoctorReport()` | 导出本地 HTML 报告 | 已实现 |
| LOCAL | `exportLocalData()` | 导出 JSON 数据副本 | 已实现 |
| LOCAL | `PrivacyLock` | 4 位 PIN 原型锁与清除 | 已实现 |
| HTTP | `无` | 当前 MVP 不上传健康数据 | 刻意不做 |

## 棂至精校 · AI 包装核对

规划 POC：当前为交互原型与验收方案；OCR/VLM、主数据与审计接口待真实接入

### 接口清单

| 方法 | 接口/契约 | 用途 | 状态 |
| --- | --- | --- | --- |
| POST | `/api/v1/inspection-jobs` | 创建核对任务 | 规划 |
| POST | `/api/v1/inspection-jobs/{id}/assets` | 上传包装图与标准文案 | 规划 |
| GET | `/api/v1/inspection-jobs/{id}` | 查询任务状态 | 规划 |
| GET | `/api/v1/inspection-jobs/{id}/result` | 返回差异与证据坐标 | 规划 |
| POST | `/api/v1/inspection-jobs/{id}/review` | 人工确认差异项 | 规划 |
| POST | `/api/v1/inspection-jobs/{id}/signoff` | 签核或退回 | 规划 |
| GET | `/api/v1/rule-templates` | 读取品类规则模板 | 规划 |
| POST | `/api/v1/barcodes/validate` | EAN/UPC 校验位检查 | 规划 |
| GET | `/api/v1/audit-events` | 审计与版本追踪 | 规划 |

## 模型评测

- 意图路由：关键词 79.2%，外部模型 66.7%，混合路由 95.8%。
- RAG：本地模板 100.0%，外部模型字面口径 90.0%；知识缺口拒答均为 100%。
- 候选模型：完成 DeepSeek V4 Flash、Qwen Plus、GPT-4.1 mini 场景适配预评估；正式上线前需同环境复测。

## RAG 清单

- [ ] **数据源**：知识来源有明确所有者与授权；禁止把聊天记录直接当知识库
- [ ] **版本**：chunk、metadata、embedding、索引与提示词均可追溯版本
- [ ] **切分**：按政策/主题/品类切分，避免一段混入多个互相冲突规则
- [ ] **检索**：建立 Recall@K、命中率、无答案集、易混淆问题与版本回归集
- [ ] **重排**：按意图和 metadata 过滤后重排，保留 source、score 与证据片段
- [ ] **阈值**：低分、冲突、过期或缺依据必须拒答/转人工，禁止模型补全政策
- [ ] **生成**：答案只能基于 context；禁止未经授权的包邮、退款、赔偿承诺
- [ ] **反馈**：负反馈回流到 query、chunk、版本、原因和修复状态
- [ ] **监控**：关注 RAG 命中率、知识解决率、幻觉率、时延和更新后提升率

## 安全清单

- [ ] **个人信息**：user_id/order_id 哈希化；不记录完整消息、手机号、地址与原始订单号
- [ ] **提示词注入**：system/context/user 分层；过滤越权指令；工具参数再次校验
- [ ] **工具权限**：Action allowlist、鉴权、幂等键、金额/地址等高风险动作二次确认
- [ ] **内容风险**：自伤、威胁、诈骗、隐私泄露与监管投诉直接进入人工策略
- [ ] **人工兜底**：转人工原因标准化，工单 SLA、解决码和结果回流可追踪
- [ ] **可观测**：trace 记录路由、检索、工具、生成、时延、错误与版本，不记录秘密
- [ ] **韧性**：模型超时/不可解析降级规则；RAG 失败回本地话术；服务异常可熔断
- [ ] **红队**：越权承诺、注入、对抗表达、隐私索取、恶意参数和重复提交回归测试
- [ ] **上线门槛**：高危拦截 100%；幻觉率 <0.5%；埋点完整率 >=98%；责任人明确
