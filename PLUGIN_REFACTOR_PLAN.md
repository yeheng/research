# Deep Research Plugin 重构计划

## 📋 执行摘要

将现有的 deep research 系统（当前作为项目本地配置）重构为一个可分发的 **Claude Code Plugin**，使其能够：
- 跨项目共享和复用
- 通过 plugin marketplace 分发
- 支持版本管理和更新
- 保持功能完整性

---

## 🏗️ 架构分析

### 当前状态 (v3.1 - Graph of Thoughts)

```
template/
├── .claude/
│   ├── agents/        → ../agents/ (symlink)
│   ├── commands/      → ../commands/ (symlink)
│   ├── hooks/         → ../hooks/ (symlink)
│   ├── mcp-server/    → ../mcp-server/ (symlink)
│   └── settings.local.json
├── agents/
│   ├── research-coordinator-v3/
│   ├── research-worker-v3/
│   ├── data-processor-v3/
│   └── research-coordinator-v4/
├── commands/
│   └── deep-research-v3.md
├── hooks/
│   ├── enforce-budget.js
│   ├── auto-heal.js
│   ├── auto-logger.js
│   ├── restore-context.js
│   └── on-start.js
├── mcp-server/
│   ├── src/tools/     (19+ TypeScript tool files)
│   ├── src/state/
│   └── package.json
└── shared/
    └── constants/
```

### 目标状态 (Plugin)

```
claude-deep-research-plugin/
├── .claude-plugin/
│   └── plugin.json                # Plugin manifest
├── commands/
│   └── deep-research.md           # /deep-research:research
├── agents/
│   ├── coordinator.md             # GoT controller
│   ├── worker.md                  # Path executor
│   └── processor.md               # Data processor
├── hooks/
│   └── hooks.json                 # Hook definitions
├── mcp-server/
│   ├── src/tools/                 # All MCP tools
│   └── package.json
└── README.md
```

---

## 📦 Plugin 结构设计

### 1. Plugin Manifest (`.claude-plugin/plugin.json`)

```json
{
  "name": "deep-research",
  "version": "4.0.0",
  "description": "Graph of Thoughts deep research system with intelligent path optimization",
  "author": "Deep Research Framework",
  "license": "MIT",
  "homepage": "https://github.com/yourname/claude-deep-research-plugin",
  "repository": "https://github.com/yourname/claude-deep-research-plugin.git",
  "keywords": ["research", "graph-of-thoughts", "agent", "citations"],
  "claude": {
    "minVersion": "1.0.33"
  },
  "capabilities": {
    "commands": ["deep-research"],
    "agents": ["coordinator", "worker", "processor"],
    "hooks": ["PostToolUse", "SessionStart"],
    "mcp": true
  }
}
```

### 2. 组件映射

| 组件类型 | 当前位置 | Plugin 位置 | 变更 |
|---------|---------|------------|------|
| **Commands** | `commands/deep-research-v3.md` | `commands/deep-research.md` | 重命名 |
| **Agents** | `agents/*/*.md` | `agents/*.md` | 扁平化 |
| **Hooks** | `hooks/*.js` | `hooks/hooks.json` | JSON声明式 |
| **MCP Server** | `mcp-server/` | `mcp-server/` | 保持不变 |
| **Shared** | `shared/` | `shared/` | 可选内联 |

---

## 🔄 迁移步骤

### Phase 1: Plugin 基础结构

**目标**: 创建 plugin 骨架和 manifest

1. 创建插件目录结构
   ```bash
   mkdir -p claude-deep-research-plugin/.claude-plugin
   mkdir -p claude-deep-research-plugin/commands
   mkdir -p claude-deep-research-plugin/agents
   mkdir -p claude-deep-research-plugin/hooks
   mkdir -p claude-deep-research-plugin/mcp-server
   mkdir -p claude-deep-research-plugin/shared
   ```

2. 创建 `plugin.json` (如上所示)

3. 创建 `README.md` (安装和使用说明)

### Phase 2: Commands 迁移

**目标**: 将命令转换为 plugin 格式

1. **重命名和简化**
   - `deep-research-v3.md` → `deep-research.md`
   - 移除版本号后缀（plugin.json 管理版本）
   - 更新内部引用

2. **命名空间更新**
   - Command 调用从 `/deep-research-v3` 变为 `deep-research:research`
   - 或简短形式：如果用户安装为默认，可使用 `/deep-research`

3. **保持核心功能**
   - ✅ Quick/Deep 模式检测
   - ✅ GoT loop 编排
   - ✅ 渐进式提问
   - ✅ Agent 调用

### Phase 3: Agents 迁移

**目标**: 将 4 个 agent 扁平化并优化

| 当前 | 新位置 | 用途 |
|------|--------|------|
| `research-coordinator-v3/AGENT.md` | `agents/coordinator.md` | GoT 控制器 |
| `research-worker-v3/AGENT.md` | `agents/worker.md` | 路径执行者 |
| `data-processor-v3/AGENT.md` | `agents/processor.md` | 数据处理 |
| `research-coordinator-v4/AGENT.md` | 保留为实验性 | v4.0 状态机（可选） |

**Agent 定义优化**:
- 移除 `AGENT.md` 子目录，直接使用 `agents/coordinator.md`
- 保持 frontmatter (`name`, `description`, `tools`)
- 更新 agent 引用路径

### Phase 4: Hooks 迁移

**目标**: 从 Node.js hooks 转换为声明式 hooks

**当前结构** (命令式):
```javascript
// hooks/enforce-budget.js
#!/usr/bin/env node
// ... 复杂的 Node.js 逻辑
```

**目标结构** (声明式):
```json
// hooks/hooks.json
{
  "PostToolUse": [
    {
      "matcher": "mcp__deep-research__.*",
      "hooks": [
        {
          "type": "command",
          "command": "node shared/hooks/enforce-budget.js"
        }
      ]
    }
  ],
  "SessionStart": [
    {
      "hooks": [
        {
          "type": "command",
          "command": "node shared/hooks/on-start.js"
        }
      ]
    }
  ]
}
```

**关键决策**:
- 保留 Node.js hooks 的强大功能
- Hooks 脚本移至 `shared/hooks/`
- `hooks.json` 提供声明式配置

### Phase 5: MCP Server 保持

**目标**: MCP 服务器结构保持不变，只需更新引用

1. **目录结构**
   ```
   mcp-server/
   ├── src/tools/        # 所有 19+ 工具
   ├── src/state/
   ├── package.json
   └── tsconfig.json
   ```

2. **更新引用**
   - Command 和 agent 中的 MCP 工具引用保持不变
   - MCP 服务器相对路径可能需要调整

3. **Build 流程**
   - 保持 TypeScript 编译
   - 添加 plugin-specific 构建脚本

### Phase 6: Shared 资源

**目标**: 处理共享常量和模板

**选项 A: 内联到各自的组件**
- 简化部署
- 可能的重复

**选项 B: 保持 `shared/` 目录**
- DRY 原则
- 需要处理相对路径

**推荐**: 混合方法
- 常量内联到各自组件
- Hooks 脚本保留在 `shared/hooks/`
- 移除 `templates/`（未使用）

---

## 📁 最终目录结构

```
claude-deep-research-plugin/
├── .claude-plugin/
│   └── plugin.json                    # Plugin manifest
│
├── commands/
│   └── deep-research.md               # 主命令
│
├── agents/
│   ├── coordinator.md                 # GoT controller
│   ├── worker.md                      # Path executor
│   ├── processor.md                   # Data processor
│   └── coordinator-v4.md              # (可选) v4.0 实验性
│
├── hooks/
│   └── hooks.json                     # Hook 声明
│
├── shared/
│   ├── hooks/
│   │   ├── enforce-budget.js
│   │   ├── auto-heal.js
│   │   ├── auto-logger.js
│   │   ├── restore-context.js
│   │   └── on-start.js
│   └── constants/
│       ├── source-quality-ratings.md
│       └── error-codes.md
│
├── mcp-server/
│   ├── src/
│   │   ├── tools/                     # 所有 MCP 工具
│   │   ├── state/
│   │   ├── services/
│   │   └── index.ts
│   ├── package.json
│   ├── tsconfig.json
│   └── README.md
│
├── README.md                           # Plugin 使用文档
├── LICENSE
└── CHANGELOG.md
```

---

## 🎯 关键变更摘要

### 命令命名空间

| 之前 | 之后 |
|------|------|
| `/deep-research-v3` | `deep-research:research` 或 `/deep-research` |

### Agent 引用

| 之前 | 之后 |
|------|------|
| `subagent_type: "research-coordinator-v3"` | `subagent_type: "coordinator"` |
| `subagent_type: "research-worker-v3"` | `subagent_type: "worker"` |

### Hook 配置

| 之前 | 之后 |
|------|------|
| `.claude/settings.local.json` | `hooks/hooks.json` (plugin 内) |

### MCP 工具

| 之前 | 之后 |
|------|------|
| `mcp__deep-research__*` | 保持不变 (MCP 命名空间独立) |

---

## ✅ 验证清单

### 开发阶段
- [ ] Plugin manifest 有效
- [ ] 所有组件路径正确
- [ ] Hook 引用正确
- [ ] MCP 工具可访问

### 测试阶段
```bash
# 本地测试
claude --plugin-dir ./claude-deep-research-plugin

# 测试命令
/deep-research "test topic"

# 测试 agents
/agents  # 应该列出 coordinator, worker, processor
```

### 发布阶段
- [ ] 版本号正确
- [ ] README 完整
- [ ] License 包含
- [ ] marketplace.json (如需要)

---

## 🚀 发布选项

### 选项 1: GitHub Repository
```bash
# 用户通过 git 安装
git clone https://github.com/user/claude-deep-research-plugin.git
claude plugin install ./claude-deep-research-plugin
```

### 选项 2: NPM Package
```bash
# 用户通过 npm 安装
npm install -g @yourorg/deep-research-plugin
claude plugin install deep-research
```

### 选项 3: Plugin Marketplace
```bash
# 用户通过 marketplace 安装
claude plugin search deep-research
claude plugin install deep-research@latest
```

---

## 📊 迁移影响评估

| 方面 | 影响 | 风险等级 |
|------|------|----------|
| **功能完整性** | 无变化 | 低 |
| **命令语法** | 轻微变化 (命名空间) | 低 |
| **Agent 调用** | agent 名称变化 | 低 |
| **Hooks** | 配置位置变化 | 中 |
| **MCP Server** | 路径引用 | 低 |
| **向后兼容** | 需要迁移 | 中 |

---

## 🔄 后续改进

### v4.1 计划
- 添加 plugin 配置 UI
- 支持自定义 GoT 参数
- 导出研究模板

### v5.0 计划
- 分布式 agent 执行
- 云端 MCP 服务器选项
- 多语言支持

---

## 📝 开发时间估算

| Phase | 任务 | 预计时间 |
|-------|------|----------|
| 1 | Plugin 基础结构 | 1-2 小时 |
| 2 | Commands 迁移 | 2-3 小时 |
| 3 | Agents 迁移 | 2-3 小时 |
| 4 | Hooks 迁移 | 3-4 小时 |
| 5 | MCP Server 更新 | 1-2 小时 |
| 6 | Shared 资源处理 | 1-2 小时 |
| 7 | 测试和验证 | 2-3 小时 |
| 8 | 文档和发布准备 | 2-3 小时 |
| **总计** | | **14-22 小时** |

---

## ❓ 需要决策的问题

### 1. Plugin 名称
- `deep-research`
- `claude-deep-research`
- `got-research` (Graph of Thoughts)

### 2. Agent 命名
- 保留 `v3` 后缀？ (coordinator-v3 vs coordinator)
- 或使用语义化名称？ (got-controller vs coordinator)

### 3. MCP Server 包含
- 内嵌在 plugin 中？ (~3MB)
- 或作为独立依赖？ (用户需要单独安装)

### 4. Hooks 策略
- 保留所有 5 个 hooks？
- 或精简为关键 hooks？

### 5. 向后兼容
- 是否需要支持迁移工具？
- 从 `.claude/` 到 plugin 的迁移脚本？

---

## 🎯 下一步行动

### 待确认事项
1. ✅ Plugin 名称
2. ✅ Agent 命名约定
3. ✅ MCP Server 部署策略
4. ✅ Hooks 精简决策
5. ✅ 发布渠道选择

### 执行顺序
1. 创建 plugin 基础结构
2. 迁移核心组件（commands, agents）
3. 配置 hooks
4. 测试本地安装
5. 准备发布

---

**请 review 此计划并提供反馈，确认后我将开始执行重构。**
