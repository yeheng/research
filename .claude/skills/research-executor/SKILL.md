---
name: research-executor
description: 执行完整7阶段深度研究流程，使用general-purpose agent嵌入coordinator工作流
user_invocable: true
---

# Research Executor

## Purpose

薄包装 Skill，验证输入并调用 `general-purpose` Agent 执行完整研究流程（嵌入 coordinator 工作流指令）。

## Input

**Required**: 结构化研究提示（来自 question-refiner）

必需字段：
- TASK: 研究目标
- CONTEXT: 背景信息
- SPECIFIC_QUESTIONS: 子问题列表 (3-7项)
- KEYWORDS: 搜索关键词 (≥5项)
- CONSTRAINTS: 约束条件
- OUTPUT_FORMAT: 输出格式

**Optional**:
- `research_type`: deep | quick | custom
- `quality_threshold`: 8.0 (默认)
- `max_agents`: 8 (默认)

## Execution

```text
1. 验证结构化提示完整性
2. 创建输出目录: RESEARCH/[topic]/
3. 调用 Task 工具:
   - subagent_type: "general-purpose"
   - prompt: 验证后的结构化提示 + coordinator agent instructions
4. 返回输出目录路径
```

**IMPORTANT**: Use `general-purpose` as the subagent_type (NOT `coordinator` which doesn't exist).
Embed the coordinator agent's workflow instructions directly in the prompt.

## Output

返回路径: `RESEARCH/[topic]/`

```text
RESEARCH/[topic]/
├── README.md
├── executive_summary.md
├── full_report.md
├── sources/bibliography.md
└── appendices/
```

## Error Codes

| Code | Description | Action |
|------|-------------|--------|
| E001 | 提示不完整 | 请求缺失字段 |
| E002 | Agent 失败 | 重试 |
| E003 | 超时 | 报告部分结果 |
| E004 | 质量不达标 | 请求精炼 |

## Example

```text
User: /research-executor [STRUCTURED_PROMPT]

Skill:
1. 验证提示结构
2. 调用 general-purpose agent with coordinator workflow
3. 返回: "Research completed → RESEARCH/[topic]/"
```

---

**Agent**: `general-purpose` with embedded coordinator instructions to coordinate 7 phases
