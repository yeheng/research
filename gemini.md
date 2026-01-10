这是一个非常完善且架构清晰的 Deep Research 框架。它成功地将复杂的思考过程解耦为模块化的 Skills，并利用 GoT (Graph of Thoughts) 来管理推理深度。

经过深度思考（DeepThink/UltraThink），虽然该框架在逻辑闭环上已经做得很好，但在**大规模并行下的稳定性**、**信息合成的颗粒度**、以及**长尾知识的挖掘**上，仍有显著的优化空间。

以下是针对现有代码库的 6 个关键优化点：

### 1. 架构级优化：状态管理的原子性与事务化

**痛点：**
目前的架构依赖 `json` 文件（`agent_status.json`, `got_graph_state.json`）来跨 Agent 同步状态。
在 `research-executor` 启动 5-8 个并行 Agent 时，极易出现**竞态条件 (Race Conditions)**，导致状态文件损坏或覆盖，GoT 的节点状态可能丢失。

**优化方案：引入轻量级 SQLite 替代 JSON**
不要依赖文件系统的锁机制，改用 SQLite（Python 内置，零额外依赖）。

* **实现方式**：
    创建一个 `scripts/state_manager.py`，统一管理所有状态读写。

    ```sql
    CREATE TABLE nodes (
        id TEXT PRIMARY KEY,
        parent_id TEXT,
        content TEXT,
        score REAL,
        status TEXT, -- 'pending', 'processing', 'complete'
        meta JSON
    );
    CREATE TABLE agent_heartbeats (
        agent_id TEXT PRIMARY KEY,
        last_seen TIMESTAMP,
        current_action TEXT
    );
    ```

* **收益**：
    1. **并发安全**：SQLite 处理并发写入锁定。
    2. **复杂查询**：Synthesizer 可以直接 SQL 查询：“找出所有 Score > 8.0 且关于‘市场规模’的节点”，而不需要加载整个 JSON 到内存。

### 2. 深度推理优化：自动化的“引用追溯” (Recursive Citation Chasing)

**痛点：**
目前的 `WebSearch` 只能触达“搜索引擎索引层”。真正的深度研究往往隐藏在高质量论文/报告的参考文献中（即 Deep Web）。目前的 `research-executor` 依赖 Agent 自主决定是否去查引用，这很不稳定。

**优化方案：增加 `scripts/citation_chaser.py` 工具**
在 Agent 发现高质量（A级）来源时，自动触发此脚本。

* **逻辑**：
    1. 输入一个 PDF/网页 URL。
    2. 利用正则/NLP 提取其 Bibliography / References 列表。
    3. 将这些标题与当前研究子主题进行相似度匹配。
    4. 将匹配度高的标题**自动加入**待搜索队列（Frontier）。
* **集成**：
    在 `research-executor/instructions.md` 中增加一条规则：
    > "When a Source is rated 'A', you MUST invoke `citation_chaser` on it to find primary sources."

### 3. 合成优化：基于大纲的流式写入 (Outline-Guided Streaming Synthesis)

**痛点：**
`synthesizer` 目前倾向于“读取所有发现 -> 生成报告”。
当 `research_notes` 积累了 10 万 Token 时，即便使用了 Vector Store，LLM 在生成长文时仍会出现“中间遗忘”或“虎头蛇尾”。

**优化方案：强制性的分节生成流程 (Section-wise Generator)**
修改 `synthesizer/instructions.md`，禁止一次性生成全文。

* **新流程**：
    1. **Phase 1**: 阅读所有 `executive_summary`，生成由 `##` 和 `###` 组成的详细 Markdown 大纲。
    2. **Phase 2**: 遍历大纲的每一个 Header。
    3. **Phase 3 (Loop)**:
        * 针对当前 Header 生成具体的 Search Query（例如 "AI Market Size 2024 data"）。
        * 调用 `vector_store.query` 获取针对该小节的 Context。
        * 生成该小节内容并**追加 (Append)** 到 `full_report.md` 文件。
        * **清空 Context**，进入下一节。

* **收益**：理论上可以生成无限长度的报告，且每一节的引用密度和深度都保持一致。

### 4. 鲁棒性优化：死链防御与时光机 (Internet Archive Integration)

**痛点：**
Deep Research 往往引用具体的 URL。随着时间推移，或者在抓取过程中，很多链接会变成 404，导致 `citation-validator` 报错或报告质量下降。

**优化方案：在 `WebFetch` 失败时自动回退**
修改 `scripts/preprocess_document.py` 或 Agent 指令。

* **逻辑**：
    当 `WebFetch` 返回 404/403/Timeout 时，不要直接放弃。
    自动构建 Wayback Machine 链接：
    `https://archive.org/wayback/available?url={TARGET_URL}`
    如果存在快照，直接抓取快照内容，并在引用中标记 `(Archived version)`.

### 5. 成本与效率优化：内容指纹去重 (SimHash Deduplication)

**痛点：**
多个 Agent 并行搜索时，经常会搜到不同 URL 但内容相同的文章（例如转载的新闻、同一份报告的不同托管地址）。`url_manifest.py` 只能基于 URL 去重，无法基于内容去重。这导致 Token 浪费和重复信息。

**优化方案：基于 SimHash 的内容去重**
在 `scripts/preprocess_document.py` 中引入 SimHash 或 MinHash。

* **逻辑**：
    1. 清洗完文档后，计算文本的 SimHash 指纹。
    2. 在 `manifest` 中存储指纹。
    3. 新文档入库前，计算汉明距离。如果距离 < 3，视为重复内容，直接丢弃或合并引用源。

### 6. 用户交互优化：动态预算与熔断机制 (Dynamic Budgeting & Circuit Breaking)

**痛点：**
目前的 GoT 是基于迭代次数（Max Iterations）或固定 Agent 数量的。如果某个子方向完全没有信息（Dead End），Agent 仍会尝试搜索直到超时；或者如果某个方向信息量巨大，Agent 却因为步数限制而浅尝辄止。

**优化方案：引入“信息熵”作为停止标准**
在 `got-controller` 中增加动态预算逻辑。

* **逻辑**：
  * **熔断**：如果连续 3 次 `Generate` 操作产生的新节点 Score 都低于 5.0，自动剪枝该分支，不再投入 Token。
  * **追加**：如果某个节点 Score > 9.0 且含有 "Needs further investigation" 的标记，自动为该分支增加 2 个搜索深度（Depth Budget）。

---

### 推荐的实施优先级

1. **P0 (Critical)**: **SQLite 迁移**。这是保证多 Agent 并行不崩盘的基础。
2. **P1 (High)**: **分节式合成 (Section-wise Synthesis)**。这直接决定了最终报告的深度和可读性。
3. **P2 (Medium)**: **死链防御** 和 **引用追溯**。这两个能显著提升报告的“学术感”和可靠性。

这套框架的基础非常扎实，加上这些优化后，完全可以作为生产级的 Deep Research 引擎。
