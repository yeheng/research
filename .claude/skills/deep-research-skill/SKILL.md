---
name: deep-research-skill
description: 对复杂主题执行完整7阶段深度研究流程
user_invocable: true
---

# Deep Research

## Purpose

主入口 Skill，接收研究主题并协调完整研究流程。

## Input

**Required**: 研究主题（字符串）

**Optional**:
- `output_format`: comprehensive_report | executive_summary
- `quality_threshold`: 8.0 (默认)
- `max_agents`: 8 (默认)

## Execution

```text
1. 验证主题非空
2. 调用 question-refiner 获取结构化提示
3. 调用 research-executor 执行研究
4. 返回输出目录路径
```

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
| E001 | 主题为空 | 请求提供主题 |
| E002 | 研究失败 | 重试 |

## Example

```text
User: /deep-research AI芯片市场分析

Skill:
1. 调用 question-refiner 精炼问题
2. 调用 research-executor 执行研究
3. 返回: "Research completed → RESEARCH/AI芯片市场分析/"
```

---

**Flow**: question-refiner → research-executor → general-purpose agent (with coordinator workflow)
