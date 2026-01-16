---
name: research-planner
description: 创建详细研究计划，将结构化提示分解为子主题、搜索策略和Agent部署配置
user_invocable: true
---

# Research Planner

## Purpose

薄包装 Skill，负责输入验证并调用 `phase-2-planning` Agent 创建研究执行计划。

## Input

**Required**: 结构化研究提示（来自 question-refiner）

**Optional**:

- `complexity`: low | medium | high
- `budget_tokens`: 最大 token 预算
- `max_agents`: 最大 Agent 数量 (3-8)

## Execution

```text
1. 验证结构化提示包含必需字段
2. 调用 Task 工具:
   - subagent_type: "phase-2-planning"
   - prompt: 结构化提示 + 可选参数
3. 返回研究计划
```

## Output

```markdown
# Research Plan: [Topic]

## 1. Executive Summary
- Topic, Research Type, Complexity
- Estimated Agents: [3-8]

## 2. Subtopic Decomposition
[3-7 subtopics with priority]

## 3. Search Strategies
[3-5 queries per subtopic]

## 4. Agent Deployment
| Agent | Focus | Model |
|-------|-------|-------|

## 5. Quality Gates
- Phase 3: ≥80% agent success
- Phase 5: ≥30 citations
- Final: Quality ≥8.0

## 6. Approval Options
[Approve] [Modify] [Cancel]
```

## Error Codes

| Code | Description        | Action           |
|------|--------------------|------------------|
| E001 | 提示不完整         | 请求缺失字段     |
| E002 | Agent 规划失败     | 重试             |

## Example

```text
User: /research-planner [STRUCTURED_PROMPT]

Skill:
1. 验证提示结构
2. 调用 phase-2-planning agent
3. 返回研究计划供用户审批
```

---

**Agent**: `phase-2-planning` 处理子主题分解和资源估算
