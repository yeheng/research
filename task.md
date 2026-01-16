# Deep Research Framework 重构任务列表

## 一、fix.md 诊断评估

### 1.1 架构设计问题诊断

| 诊断点 | 准确性 | 评估 |
|--------|--------|------|
| "巨型单体 Agent" 问题 | ✅ 准确 | Orchestrator 1,644 行，包含全部7阶段逻辑 |
| "放弃了 Sub-agents 优势" | ⚠️ 部分准确 | 现有架构确实使用 Task 工具，但 Orchestrator 承载过多职责 |
| "SQLite 状态管理过重" | ❌ 不准确 | SQLite 本身不是问题；**真正问题是状态分散在三处**（SQLite + 文件系统 + progress.md） |

### 1.2 Token 经济性问题诊断

| 诊断点 | 准确性 | 评估 |
|--------|--------|------|
| "上下文污染" | ✅ 准确 | Orchestrator 积累调度日志和重试信息 |
| "缺乏自动化清洗" | ⚠️ 部分准确 | 现有 file-based pattern (Phase 3→4→5) 已实现增量写入，但缺乏**预算强制执行** |
| "依赖 Agent 主动调用" | ⚠️ 部分准确 | 批处理已有缓存机制，但无 token budget 自动限制 |

### 1.3 MCP Server 问题诊断

| 诊断点 | 准确性 | 评估 |
|--------|--------|------|
| "处理简单文本任务" | ❌ 不准确 | MCP 提供 23 个工具，包括状态管理、批处理、缓存，不只是文本处理 |
| "增加延迟和部署复杂度" | ⚠️ 部分准确 | Node.js 服务确实增加复杂度，但提供的功能无法用简单脚本替代 |

---

## 二、fix.md 解决方案评估

### 2.1 过于激进的方案（不建议采用）

| 方案 | 问题 |
|------|------|
| 完全放弃 SQLite | 会丢失：事务性保证、复杂查询、GoT 节点管理、Agent 状态追踪 |
| 用 `config.json` 定义 Sub-agents | **Claude Code 不支持这种原生配置方式**，这是对产品功能的误解 |
| Hooks 系统作为核心 | Claude Code hooks 功能有限，无法完全替代当前处理逻辑 |
| 移除 MCP Server | 会丢失缓存、批处理、状态管理等关键基础设施 |

### 2.2 合理的方向（应该保留）

| 方向 | 原因 |
|------|------|
| 分解 Monolithic Orchestrator | 核心问题，必须解决 |
| 统一状态管理 | 目前分散在三处，导致不一致 |
| Token 管理自动化 | 添加预算强制执行机制 |
| 简化 Skills | 使其成为真正的薄包装 |

### 2.3 修正后的重构策略

```
原方案: Orchestrator → Skills + Hooks + 文件系统
修正方案: Orchestrator → Phase Agents + 统一 StateManager + Token Budget
```

**核心理念**：

1. **保留 MCP Server** - 简化工具数量，保留核心功能
2. **保留 SQLite** - 统一为唯一状态来源，移除文件系统状态
3. **分解 Orchestrator** - 提取为 7 个 Phase Agents + 1 个 Coordinator
4. **增强 Token 管理** - 添加预算强制执行和自动压缩

---

## 三、重构任务列表

### Task 1: 分解 Research Orchestrator 为 Phase Agents

**WHERE**:

- `.claude/agents/research-orchestrator/AGENT.md` (1,644 行) → 拆分为:
  - `.claude/agents/phase-1-refinement/AGENT.md`
  - `.claude/agents/phase-2-planning/AGENT.md`
  - `.claude/agents/phase-3-execution/AGENT.md`
  - `.claude/agents/phase-4-processing/AGENT.md`
  - `.claude/agents/phase-5-synthesis/AGENT.md`
  - `.claude/agents/phase-6-validation/AGENT.md`
  - `.claude/agents/phase-7-output/AGENT.md`
  - `.claude/agents/coordinator/AGENT.md` (新的轻量级协调器)

**HOW**:

1. 提取每个 Phase 的逻辑到独立 Agent 文件 (每个 200-300 行)
2. Coordinator 只负责：
   - 初始化 session
   - 按顺序调用 Phase Agents
   - 处理 phase 间数据传递（通过文件路径）
   - 错误恢复决策
3. 每个 Phase Agent 负责：
   - 单一 Phase 的执行
   - 质量门槛验证
   - 向 StateManager 报告进度

**WHY**:

- 单一职责原则：每个 Agent 只做一件事
- 可测试性：可以独立测试每个 Phase
- 可维护性：修改一个 Phase 不影响其他
- 可扩展性：可以轻松添加/移除 Phase
- Token 隔离：每个 Phase Agent 有独立上下文

**TEST CASES**:

```
TC1.1: 单独运行 phase-3-execution，验证能完成搜索并输出到 raw/ 目录
TC1.2: Coordinator 能正确按顺序调用 Phase 1→7
TC1.3: Phase 4 失败时，Coordinator 能从 Phase 4 恢复
TC1.4: 每个 Phase Agent 的上下文 < 8KB (不含输入文件)
TC1.5: 移除任意 Phase Agent，其他 Phase 仍能独立运行
```

**ACCEPTANCE CRITERIA**:

- [ ] Orchestrator 拆分为 8 个独立 Agent 文件
- [ ] 每个 Phase Agent < 300 行
- [ ] Coordinator < 200 行
- [ ] 所有现有测试通过
- [ ] 端到端 deep-research 流程成功完成
- [ ] Token 使用量降低 40%+

---

### Task 2: 统一状态管理层

**WHERE**:

- `.claude/mcp-server/src/state/` (所有状态相关代码)
- `.claude/mcp-server/src/handlers/` (state-handlers.ts)
- `scripts/state_manager.py` (废弃)
- AGENT.md 中的状态更新逻辑

**HOW**:

1. **移除重复的状态来源**:

   ```
   当前: SQLite + progress.md + raw/*.md 元数据
   目标: SQLite (唯一真值来源)
   ```

2. **重构 MCP State Tools**:

   ```typescript
   // 简化为 5 个核心工具
   - session_lifecycle: create/update/get/complete
   - phase_tracker: start/complete/checkpoint/recover
   - agent_registry: register/update/list
   - progress_logger: log/render (统一日志)
   - metrics_collector: record/query (token/quality/latency)
   ```

3. **移除文件系统状态依赖**:
   - `progress.md` → SQLite `activity_log` 表 + 按需渲染
   - `status.json` → SQLite `research_sessions` 表

4. **添加状态变更事件**:

   ```typescript
   // 状态变更时触发回调
   onSessionStatusChange(sessionId, oldStatus, newStatus)
   onPhaseComplete(sessionId, phaseNumber)
   onAgentComplete(agentId, status)
   ```

**WHY**:

- 消除状态不一致风险
- 简化调试（只需查询数据库）
- 支持事务性状态更新
- 为恢复功能提供可靠基础

**TEST CASES**:

```
TC2.1: 创建 session 后，数据库记录存在且状态正确
TC2.2: 更新 phase 时，事务性保证（要么全部成功，要么回滚）
TC2.3: 并发更新同一 session，不会产生数据竞争
TC2.4: progress.md 可从数据库实时渲染，与数据库内容一致
TC2.5: session 中断后恢复，能正确读取最后 checkpoint
```

**ACCEPTANCE CRITERIA**:

- [ ] 移除 `scripts/state_manager.py`
- [ ] MCP state tools 从 13 个简化为 5 个
- [ ] 所有状态读写都通过 SQLite
- [ ] progress.md 变为只读渲染产物
- [ ] 添加状态变更事件支持

---

### Task 3: 实现 Token Budget 强制执行

**WHERE**:

- `.claude/mcp-server/src/utils/token-budget.ts` (新建)
- `.claude/agents/*/AGENT.md` (添加 budget 检查)
- `.claude/mcp-server/src/handlers/batch-tools.ts` (添加 budget 截断)

**HOW**:

1. **创建 Token Budget Manager**:

   ```typescript
   class TokenBudgetManager {
     private sessionBudgets: Map<string, TokenBudget>

     setBudget(sessionId: string, budget: TokenBudgetConfig): void
     consume(sessionId: string, tokens: number, source: string): void
     getRemaining(sessionId: string): number
     isOverBudget(sessionId: string): boolean

     // 自动行为
     onBudgetExceeded: (sessionId, consumed, limit) => Action
   }

   interface TokenBudgetConfig {
     totalBudget: number          // 总预算 (e.g., 500K tokens)
     phaseBudgets: Map<number, number>  // 每 phase 预算
     warningThreshold: number     // 警告阈值 (e.g., 80%)
     hardLimit: boolean           // 是否强制停止
   }

   enum Action {
     WARN,        // 仅警告
     COMPRESS,    // 自动压缩
     PAUSE,       // 暂停并询问
     TERMINATE    // 终止任务
   }
   ```

2. **集成到批处理工具**:

   ```typescript
   // batch-tools.ts
   async function processBatch<T, R>(
     items: T[],
     processor: (item: T) => Promise<R>,
     options: BatchOptions & { budgetManager?: TokenBudgetManager, sessionId?: string }
   ): Promise<BatchResult<R>> {
     for (const item of items) {
       if (options.budgetManager?.isOverBudget(options.sessionId)) {
         return { ...results, truncated: true, reason: 'budget_exceeded' }
       }
       // ... process
       options.budgetManager?.consume(sessionId, estimateTokens(result), 'batch')
     }
   }
   ```

3. **Phase Agent 集成**:

   ```markdown
   ## Phase 3 执行前检查
   1. 调用 `get_budget_status(session_id)` 检查剩余预算
   2. 如果 < 20%，减少并行 agent 数量
   3. 如果 < 5%，进入压缩模式
   ```

**WHY**:

- 防止 token 超支导致任务失败
- 提供可见的 token 消耗追踪
- 支持不同 phase 的差异化预算分配
- 自动触发压缩或降级策略

**TEST CASES**:

```
TC3.1: 设置 100K token 预算，消耗 101K 时触发 onBudgetExceeded
TC3.2: Phase 3 预算为 50K，达到 40K (80%) 时输出警告
TC3.3: 批处理中途超预算，正确返回已处理结果 + truncated 标记
TC3.4: 多 session 并发，budget 隔离无串扰
TC3.5: Budget 状态持久化到数据库，crash 后可恢复
```

**ACCEPTANCE CRITERIA**:

- [ ] TokenBudgetManager 实现并测试
- [ ] 所有 batch tools 集成 budget 检查
- [ ] Phase Agents 集成 budget 检查逻辑
- [ ] Budget 超支时自动压缩/降级
- [ ] Budget 状态可从数据库恢复

---

### Task 4: 简化 MCP Server 工具集

**WHERE**:

- `.claude/mcp-server/src/tools/` (所有工具定义)
- `.claude/mcp-server/src/index.ts` (工具注册)

**HOW**:

1. **合并冗余工具**:

   ```
   当前 (23 个工具):
   - 5 core + 5 batch + 13 infrastructure

   目标 (12 个工具):
   - 3 core: extract (fact+entity), validate (citation+source), detect (conflict)
   - 3 batch: batch-extract, batch-validate, batch-detect
   - 4 state: session, phase, agent, progress
   - 2 utils: cache-stats, budget-status
   ```

2. **工具合并策略**:

   ```typescript
   // 合并前
   factExtract(text, options)
   entityExtract(text, options)

   // 合并后
   extract(text, { mode: 'fact' | 'entity' | 'all', ...options })

   // 合并前
   citationValidate(citations, options)
   sourceRate(url, options)

   // 合并后
   validate(items, { mode: 'citation' | 'source' | 'all', ...options })
   ```

3. **保持向后兼容**:

   ```typescript
   // 旧工具名作为别名
   server.setRequestHandler('fact-extract', (args) =>
     extract({ ...args, mode: 'fact' })
   )
   ```

**WHY**:

- 降低认知负担（12 vs 23 工具）
- 减少代码重复
- 简化维护
- 更清晰的工具职责划分

**TEST CASES**:

```
TC4.1: extract({ mode: 'all' }) 同时返回 facts 和 entities
TC4.2: 旧工具名 'fact-extract' 仍然可用（别名）
TC4.3: batch-extract 支持 mode 参数
TC4.4: 工具数量从 23 减少到 12
TC4.5: 所有现有调用方代码无需修改
```

**ACCEPTANCE CRITERIA**:

- [ ] 工具数量从 23 减少到 12
- [ ] 保持 100% API 兼容性
- [ ] 所有现有测试通过
- [ ] 更新工具文档

---

### Task 5: 实现错误恢复架构

**WHERE**:

- `.claude/agents/coordinator/AGENT.md` (恢复逻辑)
- `.claude/mcp-server/src/handlers/recovery-handler.ts` (新建)
- `.claude/mcp-server/schema.sql` (添加 checkpoint 表)

**HOW**:

1. **Checkpoint 机制**:

   ```sql
   -- schema.sql 新增
   CREATE TABLE phase_checkpoints (
     id INTEGER PRIMARY KEY,
     session_id TEXT NOT NULL,
     phase_number INTEGER NOT NULL,
     checkpoint_type TEXT NOT NULL,  -- 'pre_execution', 'mid_execution', 'post_execution'
     state_snapshot TEXT NOT NULL,   -- JSON: input files, output files, progress
     created_at TEXT DEFAULT CURRENT_TIMESTAMP,
     FOREIGN KEY (session_id) REFERENCES research_sessions(session_id)
   );

   CREATE INDEX idx_checkpoints_session_phase ON phase_checkpoints(session_id, phase_number);
   ```

2. **Recovery Handler**:

   ```typescript
   interface RecoveryHandler {
     // 检测中断点
     detectInterruption(sessionId: string): Promise<InterruptionPoint | null>

     // 恢复到 checkpoint
     recoverFromCheckpoint(sessionId: string, checkpointId: number): Promise<RecoveryPlan>

     // 生成恢复计划
     generateRecoveryPlan(interruption: InterruptionPoint): RecoveryPlan

     // 执行恢复
     executeRecovery(plan: RecoveryPlan): Promise<void>
   }

   interface RecoveryPlan {
     startFromPhase: number
     skipAgents: string[]      // 已完成的 agents
     reprocessFiles: string[]  // 需要重新处理的文件
     estimatedTokens: number
   }
   ```

3. **Coordinator 集成**:

   ```markdown
   ## 启动时检查
   1. 调用 `detect_interruption(session_id)`
   2. 如果有中断点:
      - 显示恢复选项给用户
      - 用户确认后执行 `execute_recovery(plan)`
   3. 如果无中断点，正常启动
   ```

**WHY**:

- 长时间研究任务需要断点续传
- 避免因中断导致全部重做
- 提供清晰的恢复路径

**TEST CASES**:

```
TC5.1: Phase 3 中断后，检测到正确的中断点
TC5.2: 恢复时跳过已完成的 agents
TC5.3: 恢复后继续执行，最终产出与完整执行一致
TC5.4: 手动中断 + 自动中断均能正确恢复
TC5.5: 恢复计划正确估算剩余 token 消耗
```

**ACCEPTANCE CRITERIA**:

- [ ] Checkpoint 表创建并有索引
- [ ] RecoveryHandler 实现所有方法
- [ ] Coordinator 启动时自动检测中断
- [ ] 恢复后任务能正常完成
- [ ] 恢复计划包含 token 估算

---

### Task 6: 清理矛盾文档和废弃代码

**WHERE**:

- `.claude/agents/research-orchestrator/AGENT.md` (矛盾的状态管理引用)
- `scripts/` 目录 (废弃的 Python 脚本)
- `CLAUDE.md`, `ARCHITECTURE.md`, `RESEARCH_METHODOLOGY.md` (文档同步)

**HOW**:

1. **移除废弃脚本**:

   ```
   删除:
   - scripts/state_manager.py (已被 MCP tools 替代)
   - scripts/init_session.py (已被 create_research_session 替代)
   - scripts/resume_research.py (已被 recovery handler 替代)

   保留:
   - scripts/preprocess_document.py (仍有价值)
   ```

2. **统一 AGENT.md 中的状态管理引用**:

   ```markdown
   ## REMOVED - 以下内容已废弃
   - 行 539: StateManager 引用 → 改为 MCP state tools
   - 行 664-687: Python 脚本调用 → 改为 MCP tools
   ```

3. **文档同步**:
   - 更新 CLAUDE.md 中的架构图
   - 更新 ARCHITECTURE.md 中的组件描述
   - 移除 RESEARCH_METHODOLOGY.md 中的旧流程

**WHY**:

- 消除新开发者困惑
- 减少维护成本
- 确保文档与代码一致

**TEST CASES**:

```
TC6.1: grep "state_manager.py" 在所有 .md 文件中返回 0 结果
TC6.2: grep "init_session.py" 在所有 .md 文件中返回 0 结果
TC6.3: CLAUDE.md 中的架构图与实际代码一致
TC6.4: 新开发者阅读文档后能正确理解系统
```

**ACCEPTANCE CRITERIA**:

- [ ] 删除 3 个废弃的 Python 脚本
- [ ] AGENT.md 中无废弃引用
- [ ] 文档与代码 100% 一致
- [ ] 无矛盾的状态管理描述

---

### Task 7: 实现自动内容压缩

**WHERE**:

- `.claude/mcp-server/src/utils/compressor.ts` (新建)
- `.claude/mcp-server/src/handlers/batch-tools.ts` (集成压缩)

**HOW**:

1. **智能压缩器**:

   ```typescript
   interface ContentCompressor {
     // 根据内容类型选择压缩策略
     compress(content: string, options: CompressionOptions): CompressedResult

     // 压缩策略
     strategies: {
       html: HTMLCompressor,       // 移除标签，保留文本
       json: JSONCompressor,       // 移除空白，精简结构
       markdown: MarkdownCompressor,  // 保留结构，压缩内容
       text: TextCompressor        // 句子级摘要
     }
   }

   interface CompressedResult {
     content: string
     originalSize: number
     compressedSize: number
     compressionRatio: number
     strategy: string
     truncated: boolean
   }
   ```

2. **集成到 WebFetch/WebSearch 结果处理**:

   ```typescript
   // 在返回结果前自动压缩
   async function processSearchResult(result: SearchResult): Promise<ProcessedResult> {
     const compressed = compressor.compress(result.content, {
       maxSize: 5000,
       preserveStructure: true
     })

     return {
       ...result,
       content: compressed.content,
       _meta: {
         originalSize: compressed.originalSize,
         compressionRatio: compressed.compressionRatio
       }
     }
   }
   ```

**WHY**:

- 自动防止大内容污染上下文
- 无需 Agent 手动调用压缩
- 保留关键信息同时减少 token

**TEST CASES**:

```
TC7.1: 10KB HTML 压缩后 < 5KB，保留主要文本
TC7.2: 压缩 JSON 移除空白，结构保持有效
TC7.3: Markdown 压缩保留标题和列表结构
TC7.4: 压缩比 > 50% 时输出提示信息
TC7.5: 压缩失败时返回原内容（不崩溃）
```

**ACCEPTANCE CRITERIA**:

- [ ] ContentCompressor 实现 4 种策略
- [ ] 集成到搜索结果处理流程
- [ ] 平均压缩比 > 40%
- [ ] 压缩后内容仍可理解

---

### Task 8: 简化 Skills 为薄包装

**WHERE**:

- `.claude/skills/deep-research/` (主入口)
- `.claude/skills/question-refiner/`
- `.claude/skills/research-planner/`
- `.claude/skills/research-executor/`

**HOW**:

1. **当前 Skill 结构**:

   ```
   skill/
   ├── SKILL.md          # 100-200 行
   ├── instructions.md   # 200-500 行
   └── examples.md       # 100-200 行
   ```

2. **目标 Skill 结构**:

   ```
   skill/
   └── SKILL.md          # 50-100 行 (合并 + 精简)
   ```

3. **Skill 只负责**:
   - 输入验证
   - 调用对应 Agent
   - 返回 Agent 结果

4. **示例精简**:

   ```markdown
   ---
   description: 启动深度研究流程
   ---

   # Deep Research

   ## 输入验证
   - topic: 必填，非空字符串
   - output_format: 可选，默认 markdown

   ## 执行
   调用 `Task` 工具，subagent_type = "research-orchestrator"

   ## 输出
   返回 Agent 结果路径: `RESEARCH/[topic]/`
   ```

**WHY**:

- Skills 不应包含业务逻辑
- 逻辑集中在 Agents，便于维护
- 减少代码重复

**TEST CASES**:

```
TC8.1: /deep-research "topic" 正确调用 research-orchestrator agent
TC8.2: 无效输入时返回友好错误信息
TC8.3: Skill 文件总行数 < 100
TC8.4: 所有业务逻辑在 Agent 中，不在 Skill 中
```

**ACCEPTANCE CRITERIA**:

- [ ] 每个 Skill 文件 < 100 行
- [ ] 移除 instructions.md 和 examples.md
- [ ] Skill 只做输入验证 + Agent 调用
- [ ] 所有现有功能正常

---

## 四、执行优先级

| 优先级 | Task | 依赖 | 预期收益 |
|--------|------|------|----------|
| P0 | Task 1: 分解 Orchestrator | 无 | 降低复杂度，提高可维护性 |
| P0 | Task 2: 统一状态管理 | 无 | 消除不一致，简化调试 |
| P1 | Task 3: Token Budget | Task 2 | 防止超支，自动降级 |
| P1 | Task 5: 错误恢复 | Task 1, 2 | 支持断点续传 |
| P2 | Task 4: 简化 MCP | Task 2 | 降低认知负担 |
| P2 | Task 7: 自动压缩 | Task 3 | 进一步节省 token |
| P3 | Task 6: 清理文档 | Task 1-5 | 消除困惑 |
| P3 | Task 8: 简化 Skills | Task 1 | 减少重复 |

---

## 五、风险评估

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| Orchestrator 拆分导致回归 | 高 | 先写集成测试，再拆分 |
| 状态迁移数据丢失 | 高 | 写迁移脚本，保留旧数据库 |
| API 兼容性破坏 | 中 | 工具别名，向后兼容 |
| Token 估算不准 | 低 | 使用保守估算 + 动态调整 |

---

## 六、验收标准（整体）

- [ ] 研究流程端到端成功完成
- [ ] Token 消耗降低 40%+
- [ ] 状态管理统一为 SQLite
- [ ] 中断后可恢复
- [ ] 文档与代码一致
- [ ] 所有现有测试通过
- [ ] 新增单元测试覆盖率 > 80%
