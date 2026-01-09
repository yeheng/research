---
description: 对指定主题执行完整的深度研究流程，从问题细化到最终报告生成
argument-hint: [研究主题或问题]
allowed-tools: Task, WebSearch, WebFetch, mcp__web_reader__webReader, Read, Write, TodoWrite, mcp__zai-mcp-server__analyze_image, mcp__zai-mcp-server__analyze_data_visualization
---

# Deep Research Command

执行完整的 7 阶段深度研究流程，使用 Graph of Thoughts 框架优化研究质量。

## 研究主题

$ARGUMENTS

---

## 前置检查

### 1. 增量研究检测

**首先检查是否已存在相关研究：**

```bash
# 检查 RESEARCH 目录
ls -la RESEARCH/ 2>/dev/null || echo "No existing research"
```

**如果存在相同主题的研究：**

| 模式 | 操作 | 适用场景 |
|------|------|----------|
| **Update** | 刷新最新信息，保持结构 | 需要更新数据 |
| **Expand** | 添加新子主题 | 需要扩展范围 |
| **Restart** | 归档旧版本，重新开始 | 需要重新研究 |

询问用户选择模式后再继续。

---

## 研究流程 (7 阶段)

### Phase 1: Question Refinement

使用 **question-refiner** 技能执行：

1. **研究类型检测**
   - Exploratory: 当前状态、趋势、全景
   - Comparative: X vs Y 对比
   - Problem-Solving: 解决方案导向
   - Forecasting: 趋势预测
   - Deep Dive: 技术深度分析

2. **渐进式提问** (3-5 个核心问题)
   - 具体关注点
   - 输出格式需求
   - 目标受众
   - 范围限制

3. **生成结构化提示词**
   - TASK: 清晰的研究目标
   - CONTEXT: 研究背景和意义
   - SPECIFIC_QUESTIONS: 3-7 个具体子问题
   - KEYWORDS: 搜索关键词
   - CONSTRAINTS: 时间、地域、来源类型
   - OUTPUT_FORMAT: 交付物规格

> 📋 结构化提示词质量目标: ≥ 8/10

---

### Phase 2: Research Planning

1. **分解主题** → 3-7 个子主题
2. **生成搜索策略** → 每个子主题 3-5 个搜索查询
3. **确定数据源** → 根据约束选择合适来源
4. **多智能体部署策略**

| 研究类型 | 子主题数 | 智能体数 | 模型选择 |
|---------|---------|---------|---------|
| 快速查询 | 1-2 | 2-3 | 全部 haiku |
| 标准研究 | 3-5 | 4-5 | 2 sonnet + 3 haiku |
| 深度研究 | 5-7 | 6-8 | 3-4 sonnet + 其余 haiku |

**输出**: 研究计划文档 → 等待用户确认后继续

---

### Phase 3: Multi-Agent Research

**并行部署研究智能体：**

```
# 必须在单次响应中启动所有智能体
Task(agent_1, "Research aspect A: [具体焦点]...")
Task(agent_2, "Research aspect B: [具体焦点]...")
Task(agent_3, "Research aspect C: [具体焦点]...")
Task(agent_4, "Cross-reference verification...")
```

**智能体类型：**

| 类型 | 数量 | 职责 |
|------|------|------|
| Web Research | 3-5 | 当前信息、趋势、新闻 |
| Academic/Technical | 1-2 | 论文、技术规格 |
| Cross-Reference | 1 | 事实核查、验证 |

**Token 优化 (关键!)：**

1. WebFetch 后立即保存到 `data/raw/`
2. 运行预处理脚本清理内容
3. 从 `data/processed/` 读取清理后的内容

> ⚠️ 禁止直接将 WebFetch 原始内容放入上下文

---

### Phase 4: Source Triangulation

使用 **citation-validator** 技能执行：

1. **编译所有发现**
2. **识别共识** (多源支持 = 高置信度)
3. **标注矛盾**
4. **评估来源质量** (A-E 评级)

> 📋 参考 `.claude/shared/constants/source_quality_ratings.md`

---

### Phase 5: Knowledge Synthesis

使用 **synthesizer** 技能执行：

1. **组织内容** → 按主题分组，非按智能体
2. **解决矛盾** → 数值差异、因果声明、时间变化
3. **构建共识** → 强/中/弱/无共识
4. **创建叙事** → 逻辑流程，渐进式披露

**引用要求：**
每个事实性声明必须包含：
- Author/Organization
- Publication Date
- Source Title
- URL/DOI

> 📋 参考 `.claude/shared/templates/citation_format.md`

---

### Phase 6: Quality Assurance

**验证链 (Chain-of-Verification)：**

1. 为每个关键声明生成验证问题
2. 独立搜索验证
3. 交叉引用结果

**质量检查清单：**

- [ ] 每个声明都有可验证来源
- [ ] 多个来源支持关键发现
- [ ] 矛盾已确认并解释
- [ ] 来源最新且权威
- [ ] 无幻觉或无支持声明
- [ ] 引用格式一致
- [ ] 所有 URL 可访问

**质量目标：** ≥ 8/10

---

### Phase 7: Output Generation

**创建输出目录结构：**

```
RESEARCH/[topic]/
├── README.md                    # 概述和导航
├── executive_summary.md         # 1-2 页摘要
├── full_report.md               # 完整报告
├── data/
│   ├── raw/                     # 原始获取内容
│   ├── processed/               # 清理后内容
│   └── statistics.md            # 关键数据
├── sources/
│   ├── bibliography.md          # 完整引用
│   ├── source_quality_table.md  # A-E 评级
│   └── citation_validation.md   # 验证报告
├── research_notes/
│   └── agent_findings_summary.md
└── appendices/
    ├── methodology.md
    └── limitations.md
```

> 📋 参考 `.claude/shared/templates/report_structure.md` 选择合适模板

---

## Graph of Thoughts (可选增强)

对于复杂主题，启用 GoT 控制器：

**GoT 操作：**

| 操作 | 用途 | 触发条件 |
|------|------|----------|
| Generate(k) | 创建 k 个并行研究路径 | 初始探索或深入高分节点 |
| Aggregate(k) | 合并 k 个发现为综合 | 2-3 轮生成后 |
| Refine(1) | 改进现有发现 | 分数 ≥ 6.0 需打磨 |
| Score | 评估质量 (0-10) | 每个节点 |
| KeepBestN(n) | 保留前 n 个节点 | 管理复杂度 |

**决策矩阵：**

| 分数 | 操作 | 原因 |
|------|------|------|
| ≥ 8.5 | Generate(2-3) | 高质量路径值得深入 |
| 7.0-8.4 | Refine(1) | 内容良好，需打磨 |
| 6.0-6.9 | Aggregate | 中等质量，合并提升 |
| < 6.0 | Prune | 低质量，丢弃 |

---

## 引用要求

确保每个事实性声明包含：

1. ✅ Author/Organization name
2. ✅ Publication date
3. ✅ Source title
4. ✅ Direct URL/DOI
5. ✅ Page numbers (如适用)

---

## 成功指标

| 指标 | 目标 |
|------|------|
| 引用覆盖率 | 100% |
| 引用完整性 | 100% |
| 引用准确性 | ≥ 95% |
| 来源质量平均 | B 或更高 |
| 幻觉数量 | 0 |
| 整体质量分数 | ≥ 8/10 |

---

**开始深度研究流程。**
