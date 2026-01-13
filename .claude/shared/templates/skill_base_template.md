# Skill Base Template

This template defines common patterns shared across all research skills.

## Standard YAML Frontmatter

```yaml
---
name: skill-name
description: One-line description
---
```

## Standard Sections

### When to Use
- List 3-5 scenarios when the skill should be invoked

### Core Responsibilities
- List 3-5 key responsibilities

### Input Requirements
- Required fields
- Optional fields

### Output Structure
- Brief description of output format

## Shared References

All skills should reference these shared documents where applicable:

| Reference | Path | When to Use |
|-----------|------|-------------|
| Error Codes | `.claude/shared/constants/error_codes.md` | Error handling |
| Source Ratings | `.claude/shared/constants/source_quality_ratings.md` | Citation quality |
| Token Optimization | `.claude/shared/constants/token_optimization.md` | Context budgets |

## Standard Footer

```markdown
## Examples
See [examples.md](./examples.md) for usage scenarios.

## Detailed Instructions
See [instructions.md](./instructions.md) for implementation guide.
```

## Skill vs Agent Distinction

| Aspect | Skill | Agent |
|--------|-------|-------|
| **Purpose** | User-invocable wrapper | Autonomous execution |
| **Complexity** | Thin, validation-focused | Complex, decision-making |
| **State** | Stateless | May maintain state |
| **Invocation** | `/skill-name` or Skill tool | Task tool with subagent_type |

## File Structure

Each skill directory contains:
```
.claude/skills/[skill-name]/
├── SKILL.md        # Overview and when to use
├── instructions.md # Detailed implementation
└── examples.md     # Usage examples
```
