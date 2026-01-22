# FAQ

**常见问题解答** - Claude Code Deep Research Agent

> 📘 **相关文档**: [CLAUDE.md](CLAUDE.md) | [ARCHITECTURE.md](ARCHITECTURE.md) | [RESEARCH_METHODOLOGY.md](RESEARCH_METHODOLOGY.md)

---

## 🚀 快速开始

### 如何开始第一次研究？

```bash
/deep-research "你想研究的主题"
```

系统将：
1. 询问澄清问题（如需要）
2. 创建研究计划
3. 获得你的批准
4. 执行并行研究
5. 交付结果到 `RESEARCH/[主题]/` 目录

### 需要多长时间？

| 研究类型 | 时间 | 质量 |
|----------|------|------|
| 快速研究 | 5-10 分钟 | 中 |
| 标准研究 | 15-30 分钟 | 高 |
| 全面研究 | 30-60 分钟 | 最高 |

---

## 📦 安装与配置

### 需要什么依赖？

**必需**:
- Claude Code CLI
- `.claude/settings.local.json` 配置

**可选**:
- MCP 服务器（用于高级功能）

### 如何配置工具权限？

在 `.claude/settings.local.json` 中：

```json
{
  "tools": {
    "WebSearch": {"enabled": true},
    "WebFetch": {"enabled": true},
    "Task": {"enabled": true},
    "TodoWrite": {"enabled": true},
    "Read": {"enabled": true},
    "Write": {"enabled": true}
  }
}
```

### MCP 服务器是必需的吗？

不是。MCP 服务器提供：
- 事实提取
- 引用验证
- 状态管理

但没有它，核心研究功能仍然可以工作。

---

## 🔧 执行与监控

### 如何查看研究进度？

进度保存在 `RESEARCH/[主题]/progress.md`：

```bash
# 查看实时进度
cat RESEARCH/[主题]/progress.md

# 查看活动代理
sqlite3 ~/.claude/mcp-server/research_state.db \
  "SELECT * FROM agents WHERE status='running'"
```

### 研究可以恢复吗？

可以。系统自动创建检查点：

```bash
# 从检查点恢复
/deep-research --resume [session-id]
```

检查点在以下位置创建：
- Phase 1: 结构化提示创建后
- Phase 2: 研究计划批准后
- Phase 3: 所有代理完成后
- Phase 4: MCP 处理完成后
- Phase 5: 综合草稿创建后
- Phase 6: 验证通过后
- Phase 7: 所有输出生成后

### 如何取消正在运行的研究？

研究会在当前阶段完成后停止。已保存的进度可用于部分恢复。

---

## 🐛 故障排查

### 代理超时

**症状**: 代理长时间无响应

**解决方案**:
1. 减少研究范围
2. 拆分为较小任务
3. 减少并行代理数量
4. 检查网络连接

### 引用缺失

**症状**: 声明没有来源引用

**解决方案**:
1. 运行 `/validate-citations` 检查
2. 手动添加缺失引用
3. 标记为"需要审核"

### 来源不可访问

**症状**: URL 返回 404 或错误

**解决方案**:
1. 使用 archive.org 查找存档
2. 寻找替代来源
3. 标记为"来源不可用"

### 矛盾发现

**症状**: 多个来源报告不同信息

**解决方案**:
1. 在报告中记录矛盾
2. 评估来源质量（A-E 评级）
3. 解释可能的原因
4. 如可能，寻求权威来源

### 令牌限制超限

**症状**: 研究因预算用尽而停止

**解决方案**:
1. 拆分为较小研究
2. 减少代理数量
3. 降低研究深度
4. 增加令牌预算

### SQLite 数据库锁定

**症状**: 数据库操作失败

**解决方案**:
```bash
# 检查锁定进程
lsof ~/.claude/mcp-server/research_state.db

# 备份并重建
cp ~/.claude/mcp-server/research_state.db ~/.claude/mcp-server/research_state.db.backup
rm ~/.claude/mcp-server/research_state.db
# 系统将自动创建新数据库
```

---

## 📊 输出与质量

### 研究输出保存在哪里？

所有研究在 `RESEARCH/[主题名称]//`：

```
RESEARCH/[主题]/
├── README.md                 # 从这里开始
├── executive_summary.md      # 快速概览
├── full_report.md            # 完整分析
├── sources/                  # 所有引用
└── research_notes/           # 原始代理输出
```

### 如何评估研究质量？

检查：

1. **引用密度**: 每个声明是否有来源？
2. **来源质量**: 来源评级（A-E）
3. **覆盖范围**: 是否涵盖所有子主题？
4. **一致性**: 矛盾是否得到解释？
5. **近期性**: 来源是否最新？

### 如何验证引用？

```bash
/validate-citations RESEARCH/[主题]/full_report.md
```

这会检查：
- 引用完整性
- URL 可访问性
- 来源质量评级

---

## 🎯 高级使用

### 可以自定义代理工作流吗？

可以。在 `.claude/agents/` 中创建新工作流：

1. 创建目录 `.claude/agents/my-workflow/`
2. 添加 `AGENT.md` 定义
3. 在协调器中引用

### 如何添加新的数据源？

在代理工作流中添加特定搜索模式：

```markdown
## 数据源

- 学术: arxiv.org, scholar.google.com
- 行业: gartner.com, mckinsey.com
- 新闻: reuters.com, bloomberg.com
```

### 可以限制搜索到特定域名吗？

可以，使用域名过滤：

```javascript
// 在 WebSearch 调用中
{
  "allowed_domains": ["nature.com", "science.org"]
}
```

### 如何并行运行多个研究？

启动多个独立会话：

```bash
# 终端 1
/deep-research "主题 A"

# 终端 2
/deep-research "主题 B"
```

每个研究有独立的会话 ID。

---

## 🔐 安全与隐私

### 我的数据保存在哪里？

- 所有输出保存在本地 `RESEARCH/` 目录
- 状态保存在本地 SQLite 数据库
- 无数据发送到外部服务器（除网络搜索）

### 研究会共享吗？

不会。所有研究完全私密，除非你主动共享。

### 如何清除历史？

```bash
# 删除特定研究
rm -rf RESEARCH/[主题]

# 清除数据库
rm ~/.claude/mcp-server/research_state.db
# 新数据库将自动创建
```

---

## 📈 性能优化

### 如何加速研究？

1. **减少代理数量**: 使用 3-4 而非 6-8
2. **降低深度**: 快速研究而非全面研究
3. **限制范围**: 明确定义边界
4. **使用缓存**: MCP 工具自动缓存

### 内存使用高怎么办？

1. 减少并行代理
2. 分割大研究
3. 清除旧会话数据
4. 使用 ContentCompressor

---

## 🤝 贡献与支持

### 如何报告问题？

在 GitHub Issues 中报告：
- 研究主题
- 错误消息
- 预期行为
- 实际行为

### 如何请求功能？

1. 检查现有 Issues
2. 创建功能请求
3. 描述用例
4. 提供示例

### 文档在哪里？

- **快速参考**: [CLAUDE.md](CLAUDE.md)
- **系统架构**: [ARCHITECTURE.md](ARCHITECTURE.md)
- **研究方法**: [RESEARCH_METHODOLOGY.md](RESEARCH_METHODOLOGY.md)
- **用户指南**: [README.md](README.md)

---

## 🎓 学习资源

### 概念解释

**Graph of Thoughts**: 通过图结构管理复杂推理的方法

**7 阶段流程**: 结构化研究方法从问题到输出

**A-E 评级**: 来源质量评估系统

**链式验证**: 防止幻觉的技术

### 最佳实践

1. **从小开始**: 先用简单主题测试
2. **审查计划**: 批准前检查研究计划
3. **验证结果**: 始终检查引用
4. **迭代改进**: 基于输出调整主题
5. **保存模板**: 为常见主题类型创建模板

---

## 🔧 高级故障排查

### 调试模式

启用详细日志：

```bash
# 在 .claude/settings.local.json 中
{
  "logging": {
    "level": "debug"
  }
}
```

### 数据库查询

直接查询研究状态：

```bash
sqlite3 ~/.claude/mcp-server/research_state.db

# 查看所有会话
SELECT * FROM sessions;

# 查看活动代理
SELECT * FROM agents WHERE status='running';

# 查看活动日志
SELECT * FROM activity_log ORDER BY timestamp DESC LIMIT 10;
```

### 重置系统

完全重置（谨慎使用）：

```bash
# 1. 备份重要研究
cp -r RESEARCH RESEARCH.backup

# 2. 删除数据库
rm ~/.claude/mcp-server/research_state.db

# 3. 重启 Claude Code
# 系统将初始化新数据库
```

---

**仍有问题？** 查看 [CLAUDE.md](CLAUDE.md) 中的快速故障排查表，或在仓库中创建 Issue。
