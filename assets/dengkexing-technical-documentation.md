# 登科星｜技术文档

## 1. 项目概览

登科星是一个微信原生小程序，使用微信云开发作为后端。前端负责测评、结果展示、推荐列表、支付页、订单页、推广页和管理后台；后端通过云函数完成推荐计算、AI 解读、数据查询、订单支付、权益校验、邀请码和推广归因。

## 2. 技术栈

| 层级 | 技术 |
| --- | --- |
| 客户端 | 微信原生小程序、WXML、WXSS、JavaScript |
| UI | WeUI 风格 + 自定义 WXSS |
| 后端 | 微信云开发 CloudBase 云函数，Node.js |
| 数据库 | 微信云数据库 |
| 静态数据 | JS 模块、JSON、Python 清洗脚本 |
| 支付 | 微信虚拟支付 |
| AI 解读 | OpenAI Compatible API，默认 DeepSeek |

## 3. 运行环境

### 3.1 小程序云环境

当前小程序启动时调用：

```js
wx.cloud.init({ env: 'cloud1-d8g9tp8bgd8697341', traceUser: true })
```

如切换环境，需要同时确认：

- 小程序端 `miniprogram/app.js` 的云环境 ID。
- 云函数部署目标环境。
- 云数据库集合和数据是否同步。
- 支付回调配置是否指向同一环境。

### 3.2 必要云函数环境变量

#### AI 解读

| 变量 | 说明 |
| --- | --- |
| `AI_API_KEY` | DeepSeek 或兼容服务 API Key |
| `AI_API_BASE` | API Base，默认 `https://api.deepseek.com` |
| `AI_MODEL` | 模型名，默认 `deepseek-v4-flash` |

#### 微信虚拟支付

| 变量 | 说明 |
| --- | --- |
| `WECHAT_APPID` / `WECHAT_PAY_APPID` | 小程序 AppID |
| `WECHAT_APP_SECRET` / `WECHAT_MINIPROGRAM_APP_SECRET` | 小程序 AppSecret |
| `WECHAT_VIRTUAL_PAY_APP_KEY` | 虚拟支付 AppKey |

#### 支付回调验签

支付回调相关云函数需要配置微信支付平台公钥或证书变量，缺失时应失败，不允许跳过验签。

## 4. 目录结构

```text
gaokao-zhiyuan/
├── miniprogram/                    # 小程序前端
│   ├── app.js                      # 应用启动、云环境、openid、权益刷新
│   ├── app.json                    # 页面、分包、tabBar 配置
│   ├── pages/                      # 主包页面
│   ├── subpackages/feature/        # 功能分包
│   └── utils/                      # 前端通用数据和工具
├── cloudfunctions/                 # 云函数
├── data/                           # 原始/清洗数据与脚本
├── scripts/                        # 测试、校验脚本
├── docs/                           # 产品和技术文档
└── CLAUDE.md                       # 项目规范
```

## 5. 前端架构

## 5.1 应用初始化

文件：`miniprogram/app.js`

职责：

- 初始化云开发环境。
- 静默获取 openid。
- 调用 `checkEntitlement` 刷新付费权益。
- 从本地缓存恢复 `userProfile`。
- 保存全局状态。

全局数据：

```js
globalData: {
  userProfile: null,
  openid: null,
  cloudReady: false,
  isPaid: false,
  navParams: null,
  recommendationCache: null
}
```

设计原则：

- 测评画像可以缓存到本地。
- 付费权益不能只信任本地缓存，必须以服务端订单为准。

## 5.2 页面配置

文件：`miniprogram/app.json`

主包页面：

| 页面 | 路径 | 说明 |
| --- | --- | --- |
| 首页 | `pages/index/index` | 产品介绍和测评入口 |
| 查学校 | `pages/search/search` | 学校查询 |
| 查专业 | `pages/major-search/major-search` | 专业查询 |
| 我的 | `pages/mine/mine` | 用户画像、订单、推广、后台入口 |

功能分包：

| 页面 | 路径 | 说明 |
| --- | --- | --- |
| 测评 | `subpackages/feature/assessment/assessment` | 信息采集和深度测评 |
| 结果 | `subpackages/feature/result/result` | 用户画像与专业方向 |
| 推荐 | `subpackages/feature/recommend/recommend` | 志愿推荐核心页 |
| 专业详情 | `subpackages/feature/major-detail/major-detail` | 院校专业详情 |
| 学校详情 | `subpackages/feature/college-detail/college-detail` | 学校详情 |
| 支付 | `subpackages/feature/payment/payment` | 解锁完整方案 |
| 订单 | `subpackages/feature/orders/orders` | 用户订单中心 |
| 推广 | `subpackages/feature/promote/promote` | 邀请码和推广收益 |
| 管理后台 | `subpackages/feature/admin/admin` | 邀请码/运营管理 |

## 5.3 测评模块

核心文件：

- `miniprogram/subpackages/feature/assessment/assessment.js`
- `miniprogram/utils/questions.js`
- `miniprogram/subpackages/feature/utils/deep-assessment.js`
- `miniprogram/subpackages/feature/utils/composite-score.js`

功能：

- 基础问题流：位次/分数、选科、地域、学费、规划、行业方向。
- 深度问题流：性格、能力、偏好画像。
- 普通类按位次推荐。
- 艺术类/体育类按文化分、专业分计算综合分。
- 城市支持区域展开、搜索和多选。

关键输出字段：

```js
answers: {
  rank,
  score,
  subjects,
  regions,
  cities,
  tuition,
  plan,
  plans,
  careerClarity,
  careerDirectionConfidence,
  industries,
  deepAnswers,
  deepProfile,
  personality,
  examType,
  artCategory,
  professionalScore
}
```

## 5.4 结果模块

核心文件：

- `miniprogram/subpackages/feature/result/result.js`
- `miniprogram/subpackages/feature/utils/profile.js`
- `miniprogram/subpackages/feature/utils/share-snapshot.js`

功能：

- 根据 `answers` 生成 `profile`。
- 展示位次层次、画像标签、专业方向、热门专业。
- 调用 `dataQuery.getNearbyHotMajors` 获取附近位次热门专业。
- 支持分享快照。

## 5.5 推荐模块

核心文件：

- `miniprogram/subpackages/feature/recommend/recommend.js`
- `cloudfunctions/getRecommendation/index.js`
- `cloudfunctions/getRecommendation/utils/recommend-engine.js`

前端职责：

- 从全局 `userProfile` 生成 `profile`。
- 调用 `getRecommendation` 云函数。
- 处理免费试看和付费完整状态。
- 调用 `aiInterpret` 生成 AI 解读。
- 支持推荐项详情、导出、分享、搜索和展开收起。

推荐导出字段包括：

- 梯度。
- 院校名称。
- 专业名称。
- 省份/城市。
- 院校层次。
- 投档分/位次/综合分。
- 匹配分。
- 计划数。
- 选科要求。
- 推荐理由。
- 风险提醒。

## 5.6 支付模块

核心文件：

- `miniprogram/subpackages/feature/payment/payment.js`
- `cloudfunctions/createOrder/index.js`
- `cloudfunctions/syncPaymentOrder/index.js`
- `cloudfunctions/markPaymentConfirming/index.js`
- `cloudfunctions/payCallback/index.js`
- `cloudfunctions/checkEntitlement/index.js`

前端支付流程：

1. 输入邀请码。
2. 调用 `validateInviteCode` 校验。
3. 调用 `createOrder` 创建订单。
4. 调用 `wx.requestVirtualPayment` 拉起微信虚拟支付。
5. 支付成功后进入确认中状态。
6. 调用 `markPaymentConfirming` 和 `syncPaymentOrder`。
7. 调用 `refreshEntitlement` 刷新权益。
8. 解锁后跳转推荐页。

价格规则：

| 类型 | 金额 |
| --- | --- |
| 原价 | 6990 分，即 69.90 元 |
| 标准邀请码优惠 | 减 1000 分，即实付 59.90 元 |
| 审核码 `AUDIT0` | 0 元免费解锁 |

## 6. 云函数架构

## 6.1 云函数清单

| 云函数 | 说明 |
| --- | --- |
| `getOpenId` | 获取当前用户 openid |
| `checkEntitlement` | 检查用户是否有可用/已绑定付费权益 |
| `getRecommendation` | 生成志愿推荐结果 |
| `aiInterpret` | 生成付费 AI 解读 |
| `dataQuery` | 学校、专业、录取历史、详情查询 |
| `assessmentShare` | 测评结果/推荐方案分享快照 |
| `createOrder` | 创建微信虚拟支付订单 |
| `payCallback` | 支付回调处理 |
| `syncPaymentOrder` | 主动同步支付订单状态 |
| `markPaymentConfirming` | 标记订单支付确认中 |
| `getOrderCenter` | 查询用户订单中心 |
| `validateInviteCode` | 校验邀请码和优惠 |
| `manageInviteCode` | 邀请码管理和管理员判断 |

## 6.2 getRecommendation

文件：`cloudfunctions/getRecommendation/index.js`

输入：

```js
{
  profile: Object,
  strategy: 'balanced' | 'aggressive' | 'conservative'
}
```

处理流程：

1. 校验 `profile`。
2. 普通类要求位次。
3. 艺术/体育类校验文化分、专业分、艺术科类。
4. 计算或标准化综合分。
5. 根据考试类型选择普通、艺术或体育录取数据。
6. 基于用户画像和策略生成 `profileKey`。
7. 查询是否有已绑定权益。
8. 若无已绑定权益，尝试消费一个 unused paid 订单。
9. 调用推荐引擎生成完整结果。
10. 免费用户截断为试看结果。
11. 返回推荐结果、锁定状态、统计和诊断信息。

输出：

```js
{
  success,
  isPaid,
  strategy,
  profileKey,
  entitlementOrderNo,
  result,
  totalCount,
  filteredCount,
  sectionCounts,
  previewCount,
  lockedCount,
  isPreviewLocked,
  rankRange,
  filterDiagnostics,
  relaxed
}
```

权益绑定逻辑：

- `profileKey` 由用户画像和推荐策略稳定哈希生成。
- 已绑定订单条件：`openid + status=paid + entitlementStatus=used + usedProfileKey=profileKey`。
- 未使用订单条件：`openid + status=paid + entitlementStatus=unused`。
- 消费权益时把订单更新为：

```js
{
  entitlementStatus: 'used',
  usedAt: db.serverDate(),
  usedProfileKey: profileKey,
  usedStrategy: strategy
}
```

## 6.3 aiInterpret

文件：`cloudfunctions/aiInterpret/index.js`

输入：

```js
{
  profile,
  result,
  profileKey
}
```

处理流程：

1. 校验当前 openid 是否拥有绑定到 `profileKey` 的 paid 权益。
2. 无权益返回 `PAYMENT_REQUIRED`。
3. 组装学生画像和推荐结果摘要。
4. 调用 OpenAI Compatible API。
5. 成功后返回自然语言解读。
6. API Key 缺失或调用失败时返回兜底解读。

AI 输出要求：

- 面向学生和家长。
- 先给结论，再讲理由。
- 控制在约 450 字以内。
- 不承诺录取。
- 不使用“算法”“模型”“录取概率”等内部或承诺性表达。

## 6.4 dataQuery

文件：`cloudfunctions/dataQuery/index.js`

支持 action：

| action | 说明 |
| --- | --- |
| `searchCollege` | 搜索学校 |
| `checkFakeCollege` | 野鸡大学校验 |
| `getAdmissionHistory` | 获取院校专业历年录取 |
| `searchMajorSchools` | 查询开设某专业的学校 |
| `getNearbyHotMajors` | 获取附近位次/分数热门专业 |
| `getMajorMetaBatch` | 批量获取专业元信息 |
| `getMajorDetail` | 获取专业详情 |
| `getCollegeDetail` | 获取学校详情 |

数据源：

- 云数据库：`colleges`、`fake_colleges`。
- 云函数本地静态模块：院校、专业、录取、计划数据。

查询限制：

- 学校搜索限制 20 条。
- 专业学校搜索限制最多 100 条。
- 专业元信息批量最多 50 个名称。

## 6.5 createOrder

文件：`cloudfunctions/createOrder/index.js`

处理流程：

1. 获取当前 openid。
2. 检查是否存在 unused paid 权益，存在则禁止重复购买。
3. 检查是否存在近期 confirming 订单，存在则返回支付确认中。
4. 校验邀请码。
5. 计算最终支付金额。
6. 写入 `orders` 集合。
7. 0 元订单直接标记 paid。
8. 非 0 元订单生成虚拟支付参数返回前端。

订单号格式：

```text
ZY + timestamp + 4 位随机大写字符
```

虚拟支付配置：

| 常量 | 当前值 |
| --- | --- |
| `VIRTUAL_OFFER_ID` | `1450560126` |
| `VIRTUAL_PRODUCT_ID` | `full_plan_unlock` |
| `VIRTUAL_PAY_ENV` | `0` |
| `mode` | `short_series_goods` |

## 7. 数据库设计

## 7.1 orders

订单和权益集合。

核心字段：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `orderNo` | string | 订单号 |
| `openid` | string | 用户 openid |
| `amount` | number | 实付金额，单位分 |
| `originalPrice` | number | 原价，单位分 |
| `inviteCode` | string | 使用的邀请码 |
| `status` | string | `pending` / `confirming` / `paid` / `fail` |
| `paymentProvider` | string | 支付渠道 |
| `paymentType` | string | 支付类型 |
| `virtualOfferId` | string | 虚拟支付 offerId |
| `virtualProductId` | string | 虚拟商品 ID |
| `entitlementType` | string | 权益类型 |
| `entitlementStatus` | string | `unused` / `used` |
| `usedProfileKey` | string | 权益绑定画像 key |
| `usedStrategy` | string | 权益绑定策略 |
| `createdAt` | Date | 创建时间 |
| `paidAt` | Date | 支付时间 |
| `paidAmount` | number | 实际支付金额 |

## 7.2 invite_codes

邀请码集合。

核心字段：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `code` | string | 邀请码 |
| `ownerOpenid` | string | 归属用户 openid |
| `ownerName` | string | 归属人名称 |
| `status` | string | `active` / `inactive` |
| `codeType` | string | `standard` / `audit_free` 等 |
| `discountPrice` | number | 指定优惠价 |
| `maxUses` | number | 最大使用次数，0 表示不限 |
| `usedCount` | number | 已使用次数 |
| `expiresAt` | Date | 过期时间 |
| `createdAt` | Date | 创建时间 |

## 7.3 colleges

院校集合，用于学校搜索。

常见字段：

- `id`
- `name`
- `province`
- `city`
- `level`
- `type`

## 7.4 fake_colleges

野鸡大学名单集合。

常见字段：

- `name`
- `province`
- `riskType`
- `note`

## 7.5 分享快照集合

由 `assessmentShare` 云函数管理，用于结果页和推荐页分享。

建议字段：

- `shareId`
- `type`
- `openid`
- `snapshot`
- `createdAt`
- `expiresAt`

## 8. 静态数据设计

## 8.1 云函数内置数据

推荐和查询云函数会加载本地 JS 数据模块：

- `colleges-2025.js`
- `majors.js`
- `admission-2025.js`
- `admission-art-2025.js`
- `admission-sport-2025.js`
- `admission-plan-2026.js`

这些数据在云函数部署时随代码上传，适合读多写少、体积可控的推荐计算。

## 8.2 data 目录

`data/admission/` 保存原始或中间 JSON 数据，例如：

- `2023.json`
- `2024.json`
- `2025.json`
- `2026-plan.json`
- `baseline-report.json`

数据脚本包括：

- `data/import-2026-expert-excel.py`
- `data/parse-admission-pdf-layout.py`
- `data/parse-art-sport-pdf-layout.py`
- `data/merge-subjects.py`

## 8.3 数据源原则

2026 数据以后应以新版专家版 Excel 为主数据源，不再使用旧版专家表作为导入或校验依据。

## 9. 推荐引擎设计

## 9.1 输入维度

推荐引擎综合以下信息：

- 位次或综合分。
- 选科。
- 城市和区域偏好。
- 学费偏好。
- 毕业规划。
- 职业方向和行业兴趣。
- 深度测评画像。
- 专业推荐方向。
- 避免专业方向。
- 推荐策略。
- 历年录取数据。
- 2026 招生计划。

## 9.2 输出结构

推荐结果按三个梯度输出：

```js
{
  rush: [],
  stable: [],
  safe: [],
  rankRange: {},
  filterDiagnostics: {},
  relaxed: false
}
```

每个推荐项应包含：

- `collegeName`
- `majorName`
- `collegeProvince`
- `collegeCity`
- `collegeLevel`
- `minScore`
- `minRank`
- `compositeScore`
- `matchScore`
- `planCount`
- `subjectRequirement`
- `matchedDirection`
- `recommendReasons`
- `warning`
- `specialWarnings`

## 9.3 免费试看

云函数始终先生成完整结果，再根据权益状态返回：

- 付费用户：完整结果。
- 免费用户：截断后的试看结果，并返回锁定数量。

当前服务端试看上限为 15 条。

## 10. AI 解读设计

AI 解读只服务付费用户。

### 10.1 权限条件

必须满足：

```js
openid + status=paid + entitlementStatus=used + usedProfileKey=profileKey
```

### 10.2 服务商

用户侧 AI 服务默认使用 DeepSeek，通过 OpenAI Compatible 接口调用。Claude 只是开发辅助工具，不是小程序面向用户的 AI 服务商。

### 10.3 失败策略

- 未配置 `AI_API_KEY`：返回本地兜底解读。
- API 调用失败：记录错误，返回本地兜底解读。
- 无权益：返回 `PAYMENT_REQUIRED`，不生成解读。

## 11. 支付与权益设计

## 11.1 状态机

订单状态：

```text
pending -> confirming -> paid
pending -> fail
confirming -> paid
```

权益状态：

```text
unused -> used
```

## 11.2 购买限制

同一用户如果已有 `status=paid` 且 `entitlementStatus=unused` 的订单，不能继续购买，避免重复付费但未使用。

## 11.3 权益消费

用户生成完整推荐时消费 unused 权益，而不是支付完成瞬间绑定具体方案。这样用户支付后仍可以回到推荐页完成方案生成。

## 11.4 支付确认

前端支付成功回调后不直接认为权益已生效，而是：

1. 标记订单确认中。
2. 主动同步订单。
3. 刷新权益。
4. 最多多次轮询。
5. 成功后跳转推荐页。

## 12. 邀请码与推广设计

## 12.1 邀请码类型

- 标准邀请码：优惠 10 元。
- 审核邀请码 `AUDIT0`：免费解锁，用于微信审核。
- 其他测试或运营码：可设置自定义优惠价、次数和过期时间。

## 12.2 推广归因

订单写入时保存 `inviteCode`。支付成功后根据邀请码归属统计直接成交订单。

### 规则

- 只统计一层直接邀请。
- 不追溯上级邀请人。
- 不计算团队收益。
- 每个 paid 订单给邀请码归属推广大使带来 10 元待结算收益。
- 审核码不参与推广收益。

## 13. 安全设计

## 13.1 密钥安全

- 前端不得保存 AI Key、AppSecret、虚拟支付 AppKey、支付证书或平台公钥。
- 所有密钥放云函数环境变量。
- 日志中不得输出密钥。

## 13.2 支付安全

- 订单创建在云函数侧完成。
- 金额由服务端根据邀请码计算，前端传入金额不可信。
- 支付回调必须验签。
- 权益以 `orders` 集合为准。
- 本地 `isPaid` 只能作为展示缓存，不能作为解锁依据。

## 13.3 数据安全

- 不采集手机号、身份证、准考证等敏感信息。
- 测评结果主要保存在本地和分享快照中。
- 分享快照应设置有效期或可清理策略。

## 13.4 权限安全

- 管理后台入口由 `manageInviteCode` 的 `isAdmin` 判断。
- 后端管理 action 必须再次校验管理员权限，不能只依赖前端隐藏入口。

## 14. 部署说明

## 14.1 小程序端

1. 使用微信开发者工具打开项目根目录。
2. 确认 `project.config.json` 配置正确。
3. 编译运行。
4. 检查首页、tabBar、分包页面是否正常加载。

## 14.2 云函数

每个云函数独立部署。部署前确认：

- `package.json` 依赖完整。
- 环境变量已配置。
- 静态数据文件已同步到对应云函数目录。
- 云数据库集合存在。

建议部署顺序：

1. `getOpenId`
2. `checkEntitlement`
3. `dataQuery`
4. `getRecommendation`
5. `aiInterpret`
6. 支付相关云函数
7. 邀请码/推广/订单相关云函数
8. `assessmentShare`

## 14.3 数据部署

需要确认：

- `colleges` 集合有学校数据。
- `fake_colleges` 集合有野鸡大学数据。
- 推荐云函数本地数据已更新。
- 查询云函数本地数据已更新。
- 2026 计划数据已生成 `admission-plan-2026.js`。

## 15. 验证流程

当前项目没有完整自动化测试，主要通过脚本校验和微信开发者工具手动验证。

## 15.1 数据与脚本验证

可用脚本包括：

- `scripts/test-all.js`
- `scripts/data-query-2026-plan.test.js`
- `scripts/validate-admission-baseline.js`

建议在数据更新后执行：

```bash
node scripts/test-all.js
node scripts/data-query-2026-plan.test.js
node scripts/validate-admission-baseline.js
```

## 15.2 手动回归清单

### 免费链路

1. 打开首页。
2. 进入测评。
3. 普通类填写位次、选科、城市、学费和规划。
4. 查看测评结果。
5. 进入推荐页。
6. 确认只展示试看结果和锁定提示。

### 艺体链路

1. 选择艺术类或体育类。
2. 输入文化分和专业分。
3. 确认综合分预览正确。
4. 生成推荐。
5. 检查推荐结果使用对应考试类型数据。

### 支付链路

1. 推荐页点击解锁。
2. 支付页显示 69.90 元。
3. 输入标准邀请码后显示 59.90 元。
4. 拉起微信虚拟支付。
5. 取消支付，不应解锁。
6. 支付成功，订单变为 paid。
7. 返回推荐页展示完整推荐。
8. AI 解读可生成。

### 审核码链路

1. 输入 `AUDIT0`。
2. 确认 0 元解锁。
3. 推荐页展示完整方案。
4. 审核码订单不计入推广收益。

### 查询链路

1. 学校搜索可用。
2. 野鸡大学检查可用。
3. 专业搜索可用。
4. 专业详情展示历年录取和 2026 计划。
5. 学校详情展示年份和专业列表。

### 推广链路

1. 用户可进入推广中心。
2. 可生成或查看邀请码。
3. 使用该邀请码支付成功后，订单记录保存邀请码。
4. 推广统计增加直接成交订单和收益。

## 16. 常见问题排查

## 16.1 推荐页提示未完成测评

检查：

- `getApp().globalData.userProfile` 是否为空。
- 本地 `userProfile` 缓存是否存在。
- 测评完成时是否正确写入全局数据和本地缓存。

## 16.2 支付成功但未解锁

检查：

- `orders` 集合订单状态是否为 `paid`。
- `entitlementStatus` 是否为 `unused` 或已绑定当前 `profileKey`。
- `syncPaymentOrder` 是否执行成功。
- `checkEntitlement` 是否返回成功。
- 当前用户 openid 是否与订单 openid 一致。

## 16.3 AI 解读为空

检查：

- 当前 profileKey 是否已绑定 paid 权益。
- `AI_API_KEY` 是否配置。
- `AI_API_BASE` 和 `AI_MODEL` 是否正确。
- 云函数日志是否有 API 调用错误。

## 16.4 邀请码无效

检查：

- `invite_codes` 中是否存在该 code。
- `status` 是否为 `active`。
- 是否超过 `maxUses`。
- 是否已过期。
- 前端输入是否被转成大写并过滤特殊字符。

## 16.5 艺术/体育推荐无结果

检查：

- 考试类型是否正确。
- 艺术类是否选择了合法科类。
- 文化分是否达到门槛。
- 专业分范围是否正确。
- 对应 `admission-art-2025.js` 或 `admission-sport-2025.js` 是否有数据。

## 17. 维护规范

1. 新增页面使用 kebab-case 命名。
2. 新增云函数使用 camelCase 命名。
3. 云函数统一使用 async/await。
4. 云数据库查询必须加 limit。
5. 前端不要引入额外状态管理，使用 Page data 和 app globalData。
6. AI 调用必须有 try-catch 和兜底文案。
7. 数据更新后必须同步推荐云函数和查询云函数的数据文件。
8. 支付、密钥、CI/CD、数据库 schema 相关改动必须先确认再执行。

## 18. 后续技术优化建议

1. 把订单、权益、推广统计抽成共享 helper，减少多个支付云函数重复逻辑。
2. 为 `dataQuery` 和推荐引擎补充更多本地测试用例。
3. 建立数据导入后的自动校验报告，包括记录数、重复率、空字段、位次异常。
4. 给分享快照增加过期清理机制。
5. 管理后台增加推广结算导出。
6. 将关键配置集中到安全的云函数配置读取层，减少硬编码常量分散。
