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

**核心特性** (v4.0):

- 🎯 **状态机驱动** - 服务端集中决策，Agent 执行指令
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

## 🎯 核心概念 (v4.0)

### 状态机驱动架构

**v4.0 核心理念**: 服务端状态机决策，Agent 执行指令

```
┌─────────────────────────────────────┐
│  研究协调器 (research-coordinator-v4) │
│  - 调用 get_next_action()            │
│  - 获取服务端指令                     │
│  - 执行指令                          │
│  - 更新图状态                        │
└─────────────────────────────────────┘
           ↓
┌─────────────────────────────────────┐
│  服务端状态机 (MCP Server)           │
│  - 维护 GoT 图状态                   │
│  - 计算下一步动作                    │
│  - 评分和剪枝决策                    │
│  - 终止条件判断                      │
└─────────────────────────────────────┘
```

### Graph of Thoughts (GoT) 操作

服务端状态机支持的操作：

```
generate    → 生成 k 个并行研究路径
execute     → 部署 workers 执行路径
score       → 评估路径质量 (0-10分)
prune       → 剪枝低质量路径
aggregate   → 合并多个发现
refine      → 改进现有路径
synthesize  → 生成最终报告
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

## 🏗️ 系统架构 (v4.0)

### v4.0 状态机架构

**核心变化**: 从客户端驱动改为服务端驱动

```
┌─────────────────────────────────────┐
│  研究协调器 (research-coordinator-v4) │
│  - 循环调用 get_next_action()        │
│  - 执行服务端返回的指令               │
│  - 无需理解 GoT 逻辑                 │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│  MCP Server (状态机引擎)            │
│  - 维护 GoT 图状态                   │
│  - 计算最优下一步动作                │
│  - 管理路径评分和剪枝                │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│  SQLite 状态存储                     │
│  - 会话状态                          │
│  - 路径历史                          │
│  - 评分记录                          │
└─────────────────────────────────────┘
```

### v4.0 Agents

| Agent | 用途 | 版本 |
|-------|------|------|
| `research-coordinator-v4` | 状态机执行器 | v4.0 |
| `research-worker-v3` | 研究工作者 | v3.0 |

### MCP工具 (v4.0)

**统一工具** (3):

- `extract`: 统一提取工具 (mode: 'fact' | 'entity' | 'all')
- `validate`: 统一验证工具 (mode: 'citation' | 'source' | 'all')
- `conflict-detect`: 冲突检测

**批处理工具** (2):

- `batch-extract`: 批量提取 (支持 mode)
- `batch-validate`: 批量验证 (支持 mode)

**GoT 工具** (4):

- `generate_paths`: 生成研究路径
- `refine_path`: 优化路径
- `score_and_prune`: 评分和剪枝
- `aggregate_paths`: 聚合路径

**状态机工具** (1):

- `get_next_action`: 获取下一步指令

**状态管理工具** (5):

- 会话: `create_research_session`, `update_session_status`, `get_session_info`
- 代理: `register_agent`, `update_agent_status`

**自动处理工具** (1):

- `auto_process_data`: 自动化 Phase 4 数据处理（服务端批处理事实提取、实体提取、引用验证、冲突检测）

**内容摄取工具** (2):

- `ingest_content`: 将 Web Search 结果写入 raw/ 目录（支持 HTML/Markdown/Text 自动检测、去重）
- `batch_ingest`: 批量摄取多个内容项

**Raw 数据处理工具** (1):

- `process_raw`: 处理 raw/ 文件，提取关键信息到 processed/（摘要、关键词、事实、实体）

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

## 🔧 MCP 工具使用示例

### auto_process_data - 自动化数据处理工具

**用途**: 一次性处理研究数据目录，执行多种操作

**支持的操作**:

- `fact_extraction` - 提取事实
- `entity_extraction` - 提取实体
- `citation_validation` - 验证引用
- `conflict_detection` - 冲突检测

**示例**:

```typescript
// 自动处理研究数据
await mcp__deep-research__auto_process_data({
  session_id: "session_123",
  input_dir: "RESEARCH/topic/data/raw/",
  output_dir: "RESEARCH/topic/data/processed/",
  operations: [
    "fact_extraction",
    "entity_extraction",
    "citation_validation",
    "conflict_detection"
  ]
});
```

**输出**: 在 `output_dir` 生成处理结果文件：
- `facts.json` - 提取的事实列表
- `entities.json` - 提取的实体列表
- `citations.json` - 引用验证结果
- `conflicts.json` - 检测到的冲突

**使用场景**:

1. **Phase 4 数据处理**: 批量处理研究 worker 的输出
2. **知识提取**: 从多个文档中提取结构化信息
3. **引用审核**: 验证报告中的所有引用

### ingest_content - 内容摄取工具

**用途**: 将 Web Search/Fetch 结果写入 raw/ 目录，支持自动内容类型检测和去重

**示例**:

```typescript
// 摄取 HTML 内容
await mcp__deep-research__ingest_content({
  session_id: "session_123",
  url: "https://example.com/article",
  content: "<html>...",  // 原始 HTML
  content_type: "html",  // 可选，自动检测
  output_dir: "RESEARCH/topic/data/raw/",
  deduplicate: true  // 自动去重
});

// 批量摄取多个来源
await mcp__deep-research__batch_ingest({
  session_id: "session_123",
  items: [
    { url: "https://source1.com", content: "..." },
    { url: "https://source2.com", content: "..." }
  ],
  output_dir: "RESEARCH/topic/data/raw/"
});
```

**输出**: 在 raw/ 目录生成带 frontmatter 的 Markdown 文件

### process_raw - Raw 数据处理工具

**用途**: 处理 raw/ 文件，提取关键信息到 processed/（TF-IDF 关键段落、关键词、事实、实体）

**示例**:

```typescript
// 处理整个 raw 目录
await mcp__deep-research__process_raw({
  session_id: "session_123",
  input_path: "RESEARCH/topic/data/raw/",
  output_dir: "RESEARCH/topic/data/processed/",
  operations: ["summarize", "extract_facts", "extract_entities", "extract_keywords"],
  options: {
    max_paragraphs: 10,  // 最多提取 10 个关键段落
    max_tokens: 2000     // 摘要最多 2000 tokens
  }
});
```

**输出**:
- `*_summary.md` - 每个源文件的摘要版本（关键段落 + 关键词 + 事实 + 实体）
- `sources_index.json` - 所有来源的索引
- `sources_index.md` - Markdown 格式的来源索引

**数据流水线**:

```
Web Search → ingest_content → raw/
                                ↓
                          process_raw
                                ↓
                           processed/
                                ↓
                       auto_process_data
                                ↓
                     事实/实体/冲突 报告
```

---

**这是快速参考。完整实现细节见 [RESEARCH_METHODOLOGY.md](RESEARCH_METHODOLOGY.md)**

