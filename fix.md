这是一个非常必要且深入的审查。当前的文档状态处于 **"过渡期"** —— 代码已经迁移到了 Go (mcp-server-go)，但文档（尤其是 `ARCHITECTURE.md`, `FAQ.md`, 和 Agent 定义）仍然混合了 v3.0 (TypeScript/Python) 和 v4.0 的概念。

以下是具体的修改建议和理由。

---

### 1. 核心架构与版本不一致 (Critical)

**问题**：代码是 Go 版本的，但文档中包含大量 Python/Node.js 的残留引用。
**现状**：
- 数据库路径：Go 代码中使用 `research.db`，文档中说是 `research_state.db`。
- 工具链：Go 代码没有实现 Puppeteer（通常是 Node.js 库），但文档中提到了 `mcp__puppeteer__`。
- 缺失工具：`research-coordinator-v4` 依赖 `mcp__deep-research__auto_process_data`，但 Go 的 `main.go` 中并**没有注册**这个工具（只有 `batch-extract`, `batch-validate` 等原子工具）。

**修改建议**：

1.  **统一版本号**：将所有文档统一为 **v4.0 (Go Edition)**。
2.  **修正数据库路径**：`FAQ.md` 和 `CLAUDE.md` 中修正为 `research.db`。
3.  **移除 `auto_process_data` 的依赖**：或者在 Go 中实现它，或者修改 Agent 文档让其分别调用 `batch-extract` 和 `batch-validate`。
4.  **清理技术栈描述**：移除 Python/Node.js 相关描述，强调 Go 的单二进制文件特性。

---

### 2. 文件精简 (Simplification)

**问题**：存在已废弃的文件和冗余的描述。

**修改建议**：

1.  **删除 `agents/data-processor-v3/AGENT.md`**：
    *   **理由**：文档已明确标记为 "[DEPRECATED]"。Go 版本的架构倾向于让 Coordinator 直接调用 Server 端工具，或者由 Worker 完成，不需要一个专门的 "Data Processor Agent" 中间人。保留它只会增加 LLM 的上下文负担和混淆。

2.  **精简 `FAQ.md` 与 `CLAUDE.md` 的重叠**：
    *   **理由**：两者都包含故障排除和命令列表。`CLAUDE.md` 应作为 Agent 的系统提示词参考（极简），`FAQ.md` 面向人类用户。

3.  **合并 `commands/`**：
    *   `deep-research-v4.md` 已经包含了 `--fast` 逻辑，确认不再需要其他旧版本的 command 文件。

---

### 3. Shared 模板的关联 (Reference Missing)

**问题**：`shared/templates/` 下有大量优秀的 Markdown 模板，但在 `agents/.../AGENT.md` 中，Agent 并没有被明确指示去**读取**这些模板。

**风险**：Agent 可能会依靠自己的训练数据"幻觉"出一个报告格式，而不是使用你在 `shared/templates/report_structure.md` 中定义的标准格式。

**修改建议**：
在 `research-coordinator-v4/AGENT.md` 的 **Report Generation** 部分，显式添加指令：

```markdown
### Report Generation
Before generating files, READ the templates to ensure strict format compliance:
1. `Read("shared/templates/report_structure.md")`
2. `Read("shared/templates/citation_format.md")`
3. `Read("shared/templates/processed/source_ratings_template.md")`
```

---

### 4. 具体文件修改清单

以下是针对关键文件的具体修改内容：

#### A. `ARCHITECTURE.md` (重写以匹配 Go)

需要大幅更新以反映 Go 的项目结构。

```markdown
# Architecture (v4.0 Go Edition)

## System Overview

User Command (/deep-research)
      ↓
Claude Code (Client)
      ↓ MCP Protocol (Stdio)
MCP Server (Go Binary) ◄────► SQLite (research.db)
      │
      ├─ Tools (Atomic)
      │   ├─ extract (logic/extractor.go)
      │   ├─ validate (logic/validator.go)
      │   └─ conflict-detect
      │
      └─ State Machine (GoT)
          ├─ generate_paths
          ├─ score_and_prune
          └─ aggregate_paths
```

*移除所有关于 "v3.1" 的演变历史，只保留当前架构以减少 Token。*

#### B. `agents/research-coordinator-v4/AGENT.md` (修复工具调用)

Go 服务器的 `main.go` 显示没有 `auto_process_data`。你需要修改 Coordinator 的逻辑：

**原逻辑 (错误)**:
```typescript
await mcp__deep-research__auto_process_data({...})
```

**新逻辑 (修正)**:
```typescript
// Go server specific workflow
// 1. Batch Extract
await mcp__deep-research__batch_extract({
  items: raw_files_content,
  mode: "all"
});

// 2. Batch Validate
await mcp__deep-research__batch_validate({
  citations: extracted_citations
});
```
*(或者，更好的做法是在 Go 代码中实现 `AutoProcessDataHandler` 并注册它，这样 Agent 就不用改太复杂。如果选择不改 Go 代码，就必须改 Agent 文档。)*

#### C. `FAQ.md` & `CLAUDE.md` (修正技术细节)

*   **数据库**: 修改 `sqlite3 .claude/mcp-server/state/research_state.db` 为 `sqlite3 mcp-server-go/data/research.db` (或根据实际运行路径)。
*   **工具**: 移除 `mcp__puppeteer__`，Go 版本目前看来依赖 `WebFetch` (Claude 内置) 或 `go-readability`。明确说明通过标准 HTTP 获取内容。
*   **性能**: 更新性能描述，Go 版本的并发处理能力远强于 Python/JS，Token 消耗优化应强调 "Server-side HTML cleaning" (Go 代码中有 `CleanHtml`)。

#### D. `mcp-server-go/go.mod` (依赖检查)

代码中使用了 `github.com/mattn/go-sqlite3`。
*   **注意**: 这需要 CGO 开启 (`CGO_ENABLED=1`)。在 `README.md` 的安装部分需要提示用户安装 GCC 编译器，或者如果为了便携性，建议改用纯 Go 的 SQLite 驱动 (如 `modernc.org/sqlite`)。这对于非技术用户非常重要。

---

### 5. 总结建议操作

1.  **删除** `agents/data-processor-v3/` 目录。
2.  **更新** `ARCHITECTURE.md`，删除旧版本对比，专注于 Go 架构。
3.  **修改** `agents/research-coordinator-v4/AGENT.md`：
    *   添加对 `shared/templates/` 的读取指令。
    *   修正 `auto_process_data` 为 Go Server 实际支持的 `batch-extract` 等工具调用（除非你打算修改 Go 代码）。
4.  **修正** `FAQ.md` 中的数据库路径为 `research.db`。
5.  **更新** `README.md`，添加关于 Go 环境 (CGO) 的编译要求说明。

是否需要我为你生成更新后的 `ARCHITECTURE.md` 或 `research-coordinator-v4/AGENT.md` 的具体内容？