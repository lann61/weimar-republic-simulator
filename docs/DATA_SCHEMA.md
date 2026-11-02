# 数据字典

所有数据位于 `src/data/`，以 TypeScript 模块形式导出，类型定义见 `src/data/types.ts`。
每条记录都带 `source_ids`（来源）与 `data_quality`（数据等级）。

## 数据等级（方案 §27.5）

| 值 | 含义 |
|---|---|
| `historical_verified` | 有可靠史料核验 |
| `historical_secondary` | 可信二手史料，尚待原始档案复核 |
| `historical_estimate` | 历史研究中的估算值 |
| `simulation_derived` | 模拟引擎计算或研究型参数 |
| `player_modified` | 玩家选择改变后的状态 |
| `unknown` | 资料不足 |

---

## Party（政党）— `parties.ts`，15 条

| 字段 | 说明 |
|---|---|
| `id` | 唯一标识（`spd` / `zentrum` / `nsdap` …） |
| `name_zh` / `name_de` / `short_name` | 名称 |
| `active_from` / `active_to` | 存续区间；`null` 表示仍存续 |
| `successor_of` / `renamed_to` | 改组关系（DDP→DStP、USPD→SPD） |
| `ideology` | 经济左右、社会威权—自由、民主承诺（0—1） |
| `policy` | 福利、财政、劳工、外交、联邦、宗教、军备七维立场（−1—1） |
| `anti_system` | 反体制程度（0—1） |
| `coalition_preferences` / `red_lines` | 联合倾向与绝不联合对象 |
| `discipline` / `mobilization` / `organization` / `media` / `leadership` | 组织能力（0—1） |
| `membership` | 党员规模估算（带年份与等级） |

## Person（历史人物）— `people.ts`，185 条

| 字段 | 说明 |
|---|---|
| `id` | 统一人物 ID（所有页面以此关联，不用姓名匹配） |
| `name_zh` / `name_de` / `name_en` | 名称；德文原名保留 |
| `birth_date` / `death_date` | 无法确证到日时只写年份，不虚构精度 |
| `is_historical_person` | 恒为 `true`；虚构人物不得进入历史档案 |
| `roles` | 身份标签（总统、总理、部长、党魁、军事、工会、文化…） |
| `party_memberships` | **分段**党籍，含起止日期 |
| `offices` | 职务关系（由内阁数据合并生成） |
| `historical_summary` | 基于史料撰写的生平 |
| `simulation_parameters` | 模拟参数，明确标注未校准 |
| `portrait_asset` | 恒为 `null`：不打包肖像，界面使用中性剪影 |

## Government（内阁）— `governments.ts`，22 条

| 字段 | 说明 |
|---|---|
| `from` / `to` | 任期；`null` 表示现任 |
| `chancellor_id` / `vice_chancellor_id` | 总理、副总理 |
| `type` | 议会多数 / 联合 / 少数 / 看守 / 总统内阁 / 过渡 |
| `parties` / `support_parties` | 执政党与外部支持党 |
| `seats_at_formation` / `parliament_seats_total` | 组阁时席位 |
| `members[]` | 成员：`person_id`、`office_id`、`office_zh`、`party_id`、`political_identity`、`from`/`to`、`appointment_mode`、`cabinet_status` |
| `parliamentary_trust` | 国会确认 / 容忍 / 不明确 / 反对 / 无需信任 |

**人数统计口径**（界面同时显示三者，方案 §25.4）：

- `uniquePersons`：内阁唯一人数（兼任只计一次）
- `ministers`：部长人数（不含总理与委员会主席）
- `offices`：部门/职务数量（兼任分别计数）

## Election（选举）— `elections.ts`，13 条

含 9 次国会/国民议会选举、2 次总统选举、2 次公投。

| 字段 | 说明 |
|---|---|
| `total_seats` / `turnout_rate` / `fairness` | 总席位、投票率、选举公平性（0—1，评估值） |
| `results[]` | 各党：`votes`、`vote_share`、`seats`、`data_quality` |
| `other_seats` | 未单独建模的小党席位合计（不强行分配到具体政党） |
| `presidential.candidates` | 总统选举候选人及两轮得票率 |
| `environment_note` / `historical_outcome` | 选举环境与史实结果 |
| `notes` | 口径差异说明（如 1919 年 421/423 席） |

## HistoricalEvent（事件）— `events/`，124 条

| 字段 | 说明 |
|---|---|
| `date` / `phase` / `category` / `importance` | 时间、阶段（I—VI）、类别、重要性 |
| `background` | 历史背景（不预设立场，说明约束与参与者） |
| `participants` | 参与者 person_id |
| `trigger` | `historical_date` / `condition` / `random` / `event_chain` |
| `choices[]` | 选项：`label`、`short_term`、`long_term`、`effects`、`beneficiaries`、`losers` |
| `historical_outcome` / `historical_choice_id` | 史实结果与史实选项（用于锚定与"暂不干预"） |
| `allows_counterfactual` | 是否允许反事实分支 |

`effects` 结构：

```ts
{
  vars?: Record<string, number>;   // 增量
  set?: Record<string, number>;    // 绝对设定（恶性通胀、货币改革）
  flags?: Record<string, number | boolean | string>;
  policy_id?: string;
  delayed?: { months: number; vars?: ...; note: string }[];
  action?: { type: 'dissolve_reichstag' | 'call_election' | 'article_48'
                 | 'ban_party' | 'appoint_chancellor' | 'end_simulation' | ... };
}
```

## Policy（政策）— `policies.ts`，18 条

`fiscal_cost`（% GDP）、`immediate` / `monthly` 效果、`beneficiaries` / `losers`、`duration_months`。

## Constituency（选区）— `constituencies.ts`，34 条

`seats`（席位权重）、`urban`、`party_modifiers`（地区修正）、`map`（示意坐标）。
**全部为 `simulation_derived`**：不构成逐区史料统计。

## VoterGroup（选民群体）— `voterGroups.ts`，16 条

`weight`（合计 1.00）、`turnout_base`、`ideal`、`sensitivity`、`affinity`（初始党派亲和度）。

## 运行时状态（`GameState`）— `src/simulation/types.ts`

包含 `economy` / `society` / `institutions` / `diplomacy` 四组变量、政党状态、群体状态、
当前政府与政府史、选举记录、第48条记录、政策与延迟效果、决策日志、月度快照、新闻与统计。

快照每月一条，保留全部历史，用于任意时间点的回看与图表。
