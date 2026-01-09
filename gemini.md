这是一个非常完善的基于 Claude Code Skills 架构的 Deep Research 框架。它通过模拟 Graph of Thoughts (GoT) 和多智能体协作，已经达到了很高的完成度。

经过仔细审视代码库和逻辑流，从**架构设计、成本/效率优化、研究质量、交互体验**四个维度，我发现了以下值得进一步优化的深层点：

### 1. 架构与状态管理优化 (Architecture & State)

当前架构过度依赖文件系统 (`.md` 文件) 作为“内存”和“通信总线”。虽然这符合 Claude Code 的无状态特性，但在处理大规模图操作时效率较低。

* **GoT 状态管理的结构化升级**：
  * **现状**：`got-controller` 将图状态保存在 Markdown 表格中。随着节点增加，Context 消耗呈线性甚至指数增长，且 LLM 解析 Markdown 表格容易出错。
  * **优化**：
    * 改为维护一个轻量级的 `graph_state.json`。
    * 在 `got-controller` 的 `SKILL.md` 中增加一个 `view-subgraph` 工具或逻辑，只让 LLM 读取当前关注的“局部子图” (Frontier Nodes)，而不是每次都读取整个图的历史。
* **智能体间的“黑板”机制 (Shared Blackboard)**：
  * **现状**：智能体并行运行，直到结束后才汇总。如果 Agent A 发现了关键的新术语（例如一个特定药物名），Agent B 在并行运行时无法得知，仍在用通用术语搜索。
  * **优化**：创建一个 `RESEARCH/[topic]/shared_insights.md`。并行智能体在发现“高价值实体”或“阻断性反证”时，利用 `Write` 工具异步写入此文件。其他智能体定期（或在开始新子任务前）读取此文件，实现**异步信息同步**。

### 2. 成本与上下文效率优化 (Cost & Context)

Deep Research 最烧钱的地方在于 Web 内容的 Token 消耗和 Agent 的 Prompt 开销。

* **Prompt 蒸馏 (Prompt Distillation)**：
  * **现状**：`research-executor` 启动子 Agent 时，似乎传递了完整的上下文和极其冗长的 System Prompt。
  * **优化**：为子 Agent 设计“精简版”指令。子 Agent 不需要知道什么是 GoT，也不需要知道完整的 7 阶段流程。它只需要知道：“搜索 X，验证 Y，格式化输出 Z”。这将显著减少 Input Token。
* **强制性的 URL Manifest 检查**：
  * **现状**：虽然有 `scripts/url_manifest.py`，但在 Agent 的 Prompt 模板中（`research-executor/instructions.md`），并没有强制要求 Agent 在 `WebFetch` 之前先检查 Manifest。
  * **优化**：在 System Prompt 中硬性规定：*“Before fetching any URL, you MUST run `python3 scripts/url_manifest.py check <url>` to see if we already have it locally.”* 这能防止多个智能体重复抓取同一个维基百科或新闻页面。
* **向量化检索增强 (RAG) 的深度集成**：
  * **现状**：`synthesizer` 似乎主要依赖读取 `agent_findings_summary.md`。如果报告长达 50 页，Synthesis 阶段会撑爆 Context。
  * **优化**：充分利用 `scripts/vector_store.py`。在 `research-executor` 阶段，Agent 抓取的内容处理后应自动 Index。在 `synthesizer` 阶段，不应一次性读取所有内容，而是基于大纲的每一节（Section）去 `query` 向量库。即：**Section-wise Synthesis (分节合成)**。

### 3. 研究质量与鲁棒性优化 (Quality & Robustness)

* **反向验证机制 (Adversarial Verification)**：
  * **现状**：`citation-validator` 是事后诸葛亮。
  * **优化**：引入一个 **"Devil's Advocate" (魔鬼代言人) Agent**。
  * 在 GoT 的 `Aggregate` 阶段之前，强制运行一个 Critic 轮次。专门搜索“Evidence against [Claim]”或“[Claim] criticism”。目前的 Cross-Reference Agent 有点类似，但应更具攻击性，专门寻找反证，以避免“确认偏差”。
* **死链与内容变动防御**：
  * **现状**：引用检查只看格式和来源评级。
  * **优化**：在最终生成报告前，运行一个脚本 `scripts/check_links.py`，对所有引用链接进行一次 `HEAD` 请求，确保没有 404。如果有，自动回退到 `Internet Archive` 的链接（如果之前有记录）。

### 4. 动态规划与执行 (Dynamic Execution)

* **从“静态计划”转向“动态规划”**：
  * **现状**：Phase 2 制定计划，Phase 3 执行。如果是探索性研究，Phase 2 很难定得准。
  * **优化**：实施 **TOTE 模型 (Test-Operate-Test-Exit)**。
  * 先发射一个“侦察兵 Agent”做 5 分钟的快速广度搜索，基于侦察结果生成更精准的 Keyword 和子主题，然后再制定 Phase 2 的详细计划。
* **智能中断与恢复 (Resumability)**：
  * **现状**：如果 Claude 在 Phase 5 崩溃或断网，似乎很难从断点无缝恢复，可能需要人工介入。
  * **优化**：在 `RESEARCH/[topic]/` 下维护一个 `status.json`，记录 `current_phase` 和 `completed_agents`。`research-executor` 启动时先检查此文件。如果存在未完成的任务，询问用户是否“Resume Session”。

### 5. 具体代码/Prompt 细节修正

* **Search Query 多样性**：
    在 `research-executor` 的 Agent 模板中，强制要求使用特定的搜索操作符。例如，要求 Agent 必须尝试 `site:gov` 或 `filetype:pdf` 的查询，而不仅仅是自然语言查询，以提高获取高质量（A/B 级）来源的概率。
* **GoT 评分标准的量化**：
    目前的评分（0-10）比较主观。建议在 Prompt 中提供具体的 **Few-Shot Examples**，例如：“这是一个 6 分的 Node（原因：单一来源），这是一个 9 分的 Node（原因：多源交叉验证 + 包含数据表格）”。

### 总结建议的实施路线图

1. **Level 1 (Quick Fix)**: 修改 `research-executor` 的 Prompt，强制使用 `url_manifest.py`，并增加“侦察兵”步骤。
2. **Level 2 (Efficiency)**: 实施 `graph_state.json` 替代 Markdown 表格，并优化子 Agent 的 Prompt 长度。
3. **Level 3 (Architecture)**: 深度集成 `vector_store.py` 到 Synthesis 流程，实现长文档的分节生成。

这套框架底子非常好，上述优化主要是为了让它在处理**超大规模、高复杂度**议题时，更省钱、更稳定、更聪明。
