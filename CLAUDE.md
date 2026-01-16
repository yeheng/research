# CLAUDE.md

**Claude Code Deep Research Agent** - 快速参考指南

> 📚 **完整文档**: [ARCHITECTURE.md](ARCHITECTURE.md) | [RESEARCH_METHODOLOGY.md](RESEARCH_METHODOLOGY.md)

---

## ⚡ 60秒快速开始

```bash
# 执行完整深度研究
/deep-research "你的研究主题"

# 分步执行
/refine-question "原始问题"      # → 结构化研究提示
/plan-research "结构化提示"      # → 执行计划
/synthesize-findings [目录]      # → 合并发现
/validate-citations [文件]       # → 验证引用
```

**核心特性**:
- 🧠 **Graph of Thoughts** - 智能研究路径管理
- 🔄 **7阶段流程** - 从问题到输出的结构化方法
- 🤖 **多代理架构** - 3-8个并行研究代理
- ✅ **A-E引用评级** - 严格的质量验证

---

## 📋 命令速查表

| 命令 | 用途 | 输出 |
|------|------|------|
| `/deep-research [topic]` | 完整7阶段工作流 | `RESEARCH/[topic]/` 完整报告包 |
| `/refine-question [question]` | 问题结构化 | 结构化研究提示 |
| `/plan-research [prompt]` | 创建执行计划 | 研究计划 + 代理部署策略 |
| `/synthesize-findings [dir]` | 合并代理发现 | 综合报告 |
| `/validate-citations [file]` | 验证引用质量 | 质量评估报告 |

---

## 🎯 核心概念

### Graph of Thoughts (GoT) 操作

```
Generate(k)   → 生成k个并行研究路径
Aggregate(k)  → 合并k个发现为综合报告
Refine(1)     → 改进现有发现质量
Score         → 评估质量 (0-10分)
KeepBestN(n)  → 保留前n个最佳路径
```

### 多代理部署

```
Phase 3: 并行执行
├── Web Research Agents (3-5):  当前信息、趋势、新闻
├── Academic Agents (1-2):      论文、规范、方法
└── Cross-Reference Agent (1):  事实核查、验证
```

### 7阶段流程概览

```
1. Question Scoping    → 问题结构化
2. Retrieval Planning  → 研究计划
3. Iterative Querying  → 并行信息收集
4. Source Triangulation → 来源交叉验证
5. Knowledge Synthesis → 知识综合
6. Quality Assurance   → 质量保证
7. Output & Packaging  → 输出交付
```

---

## 📂 研究输出结构

```
RESEARCH/[topic_name]/
├── README.md                    # 导航和概述
├── executive_summary.md         # 1-2页关键发现
├── full_report.md               # 完整分析 (20-50页)
├── data/
│   └── statistics.md            # 关键数据和事实
├── visuals/
│   └── descriptions.md          # 图表/图形描述
├── sources/
│   ├── bibliography.md          # 完整引用列表
│   └── source_quality_table.md  # A-E质量评级
├── research_notes/
│   └── agent_findings_summary.md # 原始代理输出
└── appendices/
    ├── methodology.md           # 研究方法
    └── limitations.md           # 未知和局限
```

---

## ✅ 引用要求

**每个事实声明必须包含**:

1. 作者/组织名称
2. 发布日期
3. 来源标题
4. 直接URL/DOI
5. 页码（如适用）

**来源质量评级**:

| 等级 | 标准 |
|------|------|
| **A** | 同行评审RCT、系统综述、荟萃分析 |
| **B** | 队列研究、临床指南、 reputable 分析师 |
| **C** | 专家意见、案例报告、机制研究 |
| **D** | 预印本、初步研究、博客 |
| **E** | 轶事、理论、推测 |

**黄金法则**: 没有来源不要声明 - 不确定时注明 "需要来源"

---

## 🏗️ 系统架构 (v2.1)

### 三层架构

```
┌─────────────────────────────────────┐
│  Layer 1: Skills (用户可调用)       │
│  question-refiner → research-planner → research-executor │
└──────────────┬──────────────────────┘
               │ invokes
┌──────────────▼──────────────────────┐
│  Layer 2: 内置代理类型              │
│  general-purpose (嵌入式协调器工作流)│
└──────────────┬──────────────────────┘
               │ uses
┌──────────────▼──────────────────────┐
│  Layer 3: 基础设施                  │
│  MCP工具 + SQLite状态 + 令牌管理    │
└─────────────────────────────────────┘
```

### 技能系统

| 技能 | 用途 | 位置 |
|------|------|------|
| `question-refiner` | 问题结构化 + 验证 | `.claude/skills/` |
| `research-planner` | 详细执行计划 + 资源估算 | `.claude/skills/` |
| `research-executor` | 输入验证 + 代理调用 | `.claude/skills/` |

### 代理工作流定义

| 定义 | 用途 | 自主性 |
|------|------|--------|
| `coordinator` | 轻量级编排器 | 中 |
| `phase-1-refinement` | 问题澄清 | 中 |
| `phase-2-planning` | 子主题分解 | 中 |
| `phase-3-execution` | 并行代理部署 | 高 |
| `phase-4-processing` | MCP事实提取 | 高 |
| `phase-5-synthesis` | 知识综合 | 高 |
| `phase-6-validation` | 质量验证 | 高 |
| `phase-7-output` | 最终交付 | 中 |

### MCP工具

**核心工具** (5):
- `fact-extract`: 原子事实提取
- `entity-extract`: 命名实体识别
- `citation-validate`: 引用验证
- `source-rate`: A-E质量评级
- `conflict-detect`: 矛盾检测

**状态工具** (11):
- 会话管理: `create_research_session`, `update_session_status`, `get_session_info`
- 代理管理: `register_agent`, `update_agent_status`, `get_active_agents`
- 阶段管理: `update_current_phase`, `get_current_phase`, `checkpoint_phase`
- 日志记录: `log_activity`, `render_progress`

---

## 🔧 关键约束

### 输出管理
- ✅ 所有研究输出在 `RESEARCH/[topic]/` 目录
- ✅ 分割大文档避免上下文限制
- ✅ 使用 TodoWrite 跟踪进度

### 代理部署
- ✅ 并行代理部署 (单次响应, 多个Task调用)
- ✅ 根据研究范围部署3-8个代理
- ✅ 每个代理有独特、不重叠的焦点

### 质量标准
- ✅ 最终报告前验证所有引用
- ✅ 跨多个来源交叉验证声明
- ✅ 应用链式验证防止幻觉
- ✅ 使用GoT优化研究路径

---

## 👤 用户交互协议

当请求深度研究时:

1. **提出澄清问题**:
   - 具体焦点领域
   - 输出格式要求
   - 地理和时间范围
   - 目标受众
   - 特殊要求

2. **创建研究计划**:
   - 子主题分解
   - 代理部署策略
   - 预期输出结构

3. **获得用户批准** 后执行

4. **使用并行代理** 执行研究

5. **交付结构化输出** 到 RESEARCH/ 目录

---

## 📚 完整文档导航

| 文档 | 用途 | 何时查阅 |
|------|------|----------|
| **[README.md](README.md)** | 用户快速入门 | 第一次使用 |
| **[ARCHITECTURE.md](ARCHITECTURE.md)** | 系统设计和架构 | 扩展/修改系统 |
| **[RESEARCH_METHODOLOGY.md](RESEARCH_METHODOLOGY.md)** | 完整研究方法论 | 理解研究流程 |
| **[FAQ.md](FAQ.md)** | 常见问题 | 遇到问题 |

---

## 🚨 快速故障排查

| 问题 | 解决方案 |
|------|----------|
| 代理超时 | 减少范围或拆分任务 |
| 引用缺失 | 标记为需要人工审核 |
| 来源不可访问 | 查找替代来源 |
| 矛盾发现 | 在报告中记录 |
| 令牌限制超限 | 拆分为较小任务 |

---

## 💡 最佳实践

- ✅ **始终使用** TodoWrite 跟踪任务和显示进度
- ✅ **尽可能并行部署** 代理 (单次响应, 多个Task调用)
- ✅ **最终确定前验证** 所有引用
- ✅ **分割大报告** 为多个小文件
- ✅ **使用GoT控制器时** 维护图状态
- ✅ **跨多个来源** 验证发现

---

**这是快速参考。完整实现细节见 [RESEARCH_METHODOLOGY.md](RESEARCH_METHODOLOGY.md)**
