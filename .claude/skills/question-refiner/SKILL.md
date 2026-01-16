---
name: question-refiner
description: 将原始研究问题转换为结构化研究提示，通过渐进式提问确保提示质量达标
user_invocable: true
---

# Question Refiner

## Purpose

薄包装 Skill，负责输入验证并调用 `phase-1-refinement` Agent 完成问题精炼。

## Input

**Required**: 原始研究问题（字符串）

**Optional**:
- `research_type`: exploratory | comparative | problem-solving | forecasting | deep-dive | market-analysis
- `output_format`: comprehensive_report | executive_summary | comparison_table

## Execution

```
1. 验证输入非空
2. 调用 Task 工具:
   - subagent_type: "phase-1-refinement"
   - prompt: 包含原始问题和可选参数
3. 返回结构化提示
```

## Output

结构化研究提示，包含：

```markdown
### RESEARCH TYPE
[自动检测的研究类型]

### TASK
[明确的研究目标]

### CONTEXT/BACKGROUND
[背景信息]

### SPECIFIC QUESTIONS
[3-7个具体子问题]

### KEYWORDS
[≥5个搜索关键词]

### CONSTRAINTS
- Timeframe: [时间范围]
- Geography: [地理范围]
- Source types: [来源类型]

### OUTPUT FORMAT
- Type: [输出类型]
- Citation style: [引用格式]

### QUALITY SCORE
[0-10，必须≥8.0]
```

## Error Codes

| Code | Description | Action |
|------|-------------|--------|
| E001 | 输入为空 | 请求提供研究问题 |
| E003 | 验证失败 | 重试精炼 |
| E004 | 质量<8.0 | 请求人工审核 |

## Example

```
User: /question-refiner AI芯片市场分析

Skill:
1. 验证输入有效
2. 调用 phase-1-refinement agent
3. 返回结构化提示（质量≥8.0）
```

---

**Agent**: `phase-1-refinement` 处理渐进式提问和质量验证
