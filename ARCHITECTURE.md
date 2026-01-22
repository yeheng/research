# Architecture

**Claude Code Deep Research Agent** - 系统架构文档 (v4.0 Go Edition)

> 📘 **相关文档**: [CLAUDE.md](CLAUDE.md) | [RESEARCH_METHODOLOGY.md](RESEARCH_METHODOLOGY.md)

---

## 设计原则

### 核心理念

```
状态机驱动 > 客户端决策
图思维 > 线性流程
服务器处理 > 客户端处理
硬约束 > 软约束
```

### 架构目标

1. **智能性** - GoT 动态路径优化，而非固定流程
2. **高效性** - 服务器端批处理，减少 LLM 调用
3. **可靠性** - 硬预算强制，自动错误修复
4. **可观测性** - 完整的图状态追踪

---

## 系统架构

### v4.0 分层架构图

```
User Command (/deep-research)
      ↓
Claude Code (Client)
      ↓ MCP Protocol (Stdio)
MCP Server (Go Binary) ◄────► SQLite (research_state.db)
      │
      ├─ Tools (原子操作)
      │   ├─ extract (internal/logic/extractor.go)
      │   ├─ validate (internal/logic/validator.go)
      │   └─ conflict-detect
      │
      ├─ Batch Tools (批处理)
      │   ├─ batch-extract
      │   └─ batch-validate
      │
      ├─ GoT Tools (Graph of Thoughts)
      │   ├─ generate_paths
      │   ├─ refine_path
      │   ├─ score_and_prune
      │   └─ aggregate_paths
      │
      └─ State Machine (核心驱动)
          └─ get_next_action
```

### v4.0 Go 项目结构

```
.
├── commands/                      # 用户命令
│   └── deep-research-v4.md        # v4.0 命令 (支持 --fast)
│
├── agents/                        # 代理定义 (简化)
│   ├── research-coordinator-v4/
│   │   └── AGENT.md               # 状态机执行器
│   └── research-worker-v3/
│       └── AGENT.md               # 路径执行者
│
├── shared/
│   └── templates/                 # 可复用模板
│       ├── report_structure.md    # 报告结构
│       ├── citation_format.md     # 引用格式
│       └── ...
│
├── mcp-server-go/                 # MCP 服务器 (Go)
│   ├── cmd/server/main.go         # 入口点
│   ├── internal/
│   │   ├── db/                    # SQLite 数据层
│   │   ├── mcp/                   # MCP 协议实现
│   │   ├── tools/                 # 工具实现
│   │   │   ├── unified.go         # 统一工具
│   │   │   ├── batch.go           # 批处理工具
│   │   │   ├── got.go             # GoT 操作
│   │   │   └── state_machine.go   # 状态机逻辑
│   │   ├── got/                   # GoT 控制器
│   │   ├── logic/                 # 业务逻辑
│   │   └── statemachine/          # 状态机实现
│   ├── go.mod
│   └── go.sum
│
├── RESEARCH/                      # 研究输出
│   └── [topic]/
│       ├── README.md
│       ├── executive_summary.md
│       ├── full_report.md
│       └── data/
│
├── CLAUDE.md                      # 快速参考
├── ARCHITECTURE.md                # 本文档
├── RESEARCH_METHODOLOGY.md        # 研究方法论
└── README.md
```

---

## Graph of Thoughts (GoT) 架构

### 核心概念

**状态机驱动执行**:

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  ┌─────────────────────────────────────────────────────────┐│
│  │     research-coordinator-v4 (State Machine Executor)   ││
│  │                                                         ││
│  │  LOOP:                                                  ││
│  │    get_next_action() → Execute Instruction → Repeat    ││
│  │                                                         ││
│  │  终止条件: action === 'synthesize'                      ││
│  └─────────────────────────────────────────────────────────┘│
│                           ↓                                 │
│  ┌─────────────────────────────────────────────────────────┐│
│  │     MCP Server (Go) - State Machine Engine              ││
│  │                                                         ││
│  │  - 维护 GoT 图状态                                       ││
│  │  - 计算最优下一步动作                                     ││
│  │  - 管理路径评分和剪枝                                     ││
│  └─────────────────────────────────────────────────────────┘│
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### GoT 操作

| 操作 | 工具 | 描述 |
|------|------|------|
| `generate_paths(k)` | `mcp__deep-research__generate_paths` | 生成 k 个探索路径 |
| `refine_path` | `mcp__deep-research__refine_path` | 优化特定路径 |
| `score_and_prune` | `mcp__deep-research__score_and_prune` | 评分并保留 top N |
| `aggregate_paths` | `mcp__deep-research__aggregate_paths` | 合并路径 |
| `get_next_action` | `mcp__deep-research__get_next_action` | 获取下一步动作 |

### 路径模板

```go
// 预定义路径模板
var PathTemplates = map[string]PathTemplate{
    "academic": {
        Focus:        "Academic Research",
        QueryPattern: "{topic} academic papers research {year}",
        Sources:      []string{"scholar.google.com", "arxiv.org"},
        Weight:       0.3,
    },
    "industry": {
        Focus:        "Industry Practices",
        QueryPattern: "{topic} industry report case study",
        Sources:      []string{"mckinsey.com", "gartner.com"},
        Weight:       0.25,
    },
    // ... policy, technical, news
}
```

---

## MCP 工具架构 (v4.0)

### 注册的工具

```go
// main.go 中注册的工具

// Unified Tools
registry.Register("extract", ...)        // 统一提取工具
registry.Register("validate", ...)       // 统一验证工具
registry.Register("conflict-detect", ...)// 冲突检测

// Batch Tools
registry.Register("batch-extract", ...)  // 批量提取
registry.Register("batch-validate", ...) // 批量验证

// State Tools
registry.Register("create_research_session", ...)
registry.Register("update_session_status", ...)
registry.Register("get_session_info", ...)
registry.Register("register_agent", ...)
registry.Register("update_agent_status", ...)

// GoT Tools
registry.Register("generate_paths", ...)
registry.Register("refine_path", ...)
registry.Register("score_and_prune", ...)
registry.Register("aggregate_paths", ...)

// State Machine
registry.Register("get_next_action", ...)  // 核心：获取下一步动作

// Auto Processing
registry.Register("auto_process_data", ...) // 自动化 Phase 4 数据处理
```

### 工具分类

```
MCP Server Tools:
├── Unified Tools (3)
│   ├─ extract (mode: 'fact' | 'entity' | 'all')
│   ├─ validate (mode: 'citation' | 'source' | 'all')
│   └─ conflict-detect
│
├── Batch Processing (2)
│   ├─ batch-extract
│   └─ batch-validate
│
├── State Management (5)
│   ├─ create_research_session
│   ├─ update_session_status
│   ├─ get_session_info
│   ├─ register_agent
│   └─ update_agent_status
│
├── GoT Operations (4)
│   ├─ generate_paths
│   ├─ refine_path
│   ├─ score_and_prune
│   └─ aggregate_paths
│
└── State Machine (2)
    ├─ get_next_action  # 核心驱动
    └─ auto_process_data  # 自动化 Phase 4 数据处理
```

---

## 研究模式 (v4.0)

### Quick Mode (`--fast`)

```bash
/deep-research "简单问题" --fast
```

**特点**:
- 单一路径，无 GoT
- 3-5 个来源
- 5-10 分钟完成
- 适用于明确、简单的问题

### Deep Mode (默认)

```bash
/deep-research "复杂主题"
```

**特点**:
- GoT 路径优化
- 20+ 个来源
- 30-60 分钟完成
- 适用于复杂、多方面主题

**流程**:
```
初始化 Session → get_next_action 循环 → 执行指令 → 终止于 synthesize
```

---

## 数据库模式 (v4.0)

### 数据库位置

默认路径: `~/.claude/mcp-server/research_state.db`

可通过 `-db` 参数指定:
```bash
./deep-research-mcp -db /path/to/custom.db
```

### 核心表

```sql
-- 研究会话
CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  topic TEXT,
  status TEXT,
  output_dir TEXT,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

-- GoT 图状态
CREATE TABLE got_nodes (
  id TEXT PRIMARY KEY,
  session_id TEXT,
  path_id TEXT,
  node_type TEXT,  -- 'generate', 'execute', 'score', 'prune', 'aggregate'
  data JSON,
  timestamp TIMESTAMP,
  FOREIGN KEY (session_id) REFERENCES sessions(id)
);

-- 代理注册
CREATE TABLE agents (
  id TEXT PRIMARY KEY,
  session_id TEXT,
  agent_type TEXT,
  status TEXT,
  created_at TIMESTAMP
);
```

---

## 架构决策记录 (ADR)

### ADR-006: 采用 Go 单二进制架构 (v4.0)

**状态**: 已接受

**上下文**: 需要更简单的部署和更好的性能。

**决策**: 使用 Go 重写 MCP 服务器，生成单二进制文件。

**理由**:
- 单二进制部署，无需 Node.js/Python 运行时
- 更低的内存占用
- 更好的并发处理能力
- 编译时类型检查

**后果**:
- ✅ 部署更简单
- ✅ 运行更快
- ✅ 资源占用更低
- ⚠️ 需要 CGO 支持（SQLite 依赖）

### ADR-007: 状态机驱动执行 (v4.0)

**状态**: 已接受

**上下文**: Agent 自主决策容易产生不一致的行为。

**决策**: 服务端状态机控制，Agent 仅执行指令。

**理由**:
- 集中决策，更可预测
- 减少 Agent 理解负担
- 更容易调试和追踪

**后果**:
- ✅ 行为更一致
- ✅ 更易于测试
- ⚠️ Agent 需要遵循循环模式

---

**完整实现细节见 [RESEARCH_METHODOLOGY.md](RESEARCH_METHODOLOGY.md)**
