---
name: quick-research-skill
description: 对简单主题执行快速研究，适用于 1-2 个子主题的简单查询
user_invocable: true
---

# Quick Research

## Purpose

薄包装 Skill，用于简单查询的快速研究，跳过完整7阶段流程。

## Input

**Required**: 研究主题（字符串）

**Optional**:
- `max_sources`: 5 (默认)
- `output_format`: brief | detailed

## Execution

```text
1. 验证主题非空
2. 调用 Task 工具:
   - subagent_type: "general-purpose"
   - prompt: 简化的研究请求
   - description: "Quick research"
3. 返回简要结果
```

**Note**: For quick research, use general-purpose agent with a concise prompt rather than phase-3-execution which requires a full research plan.

## Output

```markdown
# Quick Research: [Topic]

## Key Findings
[3-5 bullet points]

## Sources
[3-5 citations]

## Limitations
[研究范围说明]
```

## Error Codes

| Code | Description | Action |
|------|-------------|--------|
| E001 | 主题为空   | 请求提供主题 |
| E002 | 搜索失败   | 重试 |

## Example

```text
User: /quick-research Python 3.12新特性

Skill:
1. 执行快速搜索
2. 返回简要结果（3-5个要点）
```

---

**Note**: 复杂主题请使用 `/deep-research`
