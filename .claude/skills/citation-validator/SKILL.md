---
name: citation-validator
description: 验证研究报告中所有声明的引用准确性、来源质量和格式规范性
user_invocable: true
---

# Citation Validator

## Purpose

薄包装 Skill，验证输入并调用 `phase-6-validation` Agent 完成引用验证。

## Input

**Required**: 研究报告文件路径或内容

**Optional**:
- `quality_threshold`: 8.0 (默认)
- `max_claims`: 200 (最大验证声明数)
- `check_urls`: true (是否验证URL可访问性)

## Execution

```text
1. 验证输入文件存在或内容非空
2. 调用 Task 工具:
   - subagent_type: "phase-6-validation"
   - prompt: 文件路径/内容 + 验证参数
3. 返回验证报告
```

## Source Quality Ratings

- **A**: 同行评审、系统综述、荟萃分析
- **B**: 队列研究、临床指南、权威分析师
- **C**: 专家意见、案例报告、白皮书
- **D**: 预印本、会议摘要、博客
- **E**: 匿名、有偏见、过时、链接失效

## Output

```markdown
# Citation Validation Report

## Summary
- Total claims: X
- Validated: X
- Quality score: X/10

## Issues Found
| Claim | Issue | Severity |
|-------|-------|----------|

## Source Quality Distribution
| Rating | Count |
|--------|-------|

## Recommendations
[改进建议]
```

## Error Codes

| Code | Description | Action |
|------|-------------|--------|
| E001 | 文件不存在 | 请求有效路径 |
| E102 | URL不可访问 | 搜索存档版本 |
| E401 | 检测到幻觉 | 移除或补充引用 |

## Example

```text
User: /citation-validator RESEARCH/topic/full_report.md

Skill:
1. 验证文件存在
2. 调用 phase-6-validation agent
3. 返回验证报告（质量评分）
```

---

**Agent**: `phase-6-validation` 处理引用验证和红队审查
