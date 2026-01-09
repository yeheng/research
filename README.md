# Claude Code Deep Research Agent

> A sophisticated multi-agent research framework that replicates OpenAI's Deep Research and Google Gemini's Deep Research capabilities using Claude Code.

## What is this?

A complete research automation system that uses Claude Code's Skills and Commands to conduct comprehensive, citation-backed research through **Graph of Thoughts (GoT)** reasoning and parallel multi-agent deployment.

## Quick Start

### Installation

```bash
git clone <repository-url>
cd template
```

The Skills and Commands are pre-configured in `.claude/` directory. No additional setup required.

### Basic Usage

Start deep research with a single command:

```bash
/deep-research [your research topic]
```

**Example:**

```bash
/deep-research AI applications in clinical diagnosis
```

This will:

1. Ask clarifying questions about your research needs
2. Create a structured research plan
3. Deploy 3-8 parallel research agents
4. Cross-validate findings across sources
5. Generate a comprehensive report with citations
6. Output to `RESEARCH/[topic]/` directory

## Core Features

- **Graph of Thoughts Framework** - Intelligent research path optimization
- **7-Phase Research Process** - Structured methodology from question to report
- **Multi-Agent Architecture** - Parallel agents with specialized roles
- **Citation Validation** - A-E source quality ratings with verification
- **Auto-Generated Reports** - Executive summary, full report, bibliography

## Available Commands

| Command | Description |
|---------|-------------|
| `/deep-research [topic]` | Execute complete research workflow |
| `/refine-question [question]` | Refine raw question into structured prompt |
| `/plan-research [prompt]` | Create detailed execution plan |
| `/synthesize-findings [dir]` | Combine research outputs from multiple agents |
| `/validate-citations [file]` | Verify citation accuracy and quality |

## Research Output

Each research creates a structured output:

```
RESEARCH/[topic_name]/
├── README.md                    # Navigation guide
├── executive_summary.md         # Key findings (1-2 pages)
├── full_report.md               # Complete analysis (20-50 pages)
├── data/                        # Statistics and raw data
├── visuals/                     # Chart descriptions
├── sources/                     # Bibliography and quality ratings
├── research_notes/              # Agent outputs
└── appendices/                  # Methodology and limitations
```

## Documentation

| Document | Audience | Description |
|----------|----------|-------------|
| [CLAUDE.md](CLAUDE.md) | Claude Code | Quick reference for AI assistant |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Developers | System design and skills structure |
| [RESEARCH_METHODOLOGY.md](RESEARCH_METHODOLOGY.md) | Claude Code | Complete research implementation guide |
| [docs/reference/](docs/reference/) | Reference | Additional guides and references |

## Examples

### Market Research

```bash
/deep-research AI in healthcare market, focus on clinical diagnosis,
             comprehensive report, global scope, 2022-2024 data
```

### Technical Assessment

```bash
/deep-research WebAssembly vs JavaScript performance benchmarks
```

### Academic Literature Review

```bash
/deep-research Transformer architectures in AI,
             peer-reviewed sources only, 2017-present
```

## Performance

- **Quick research** (narrow topic): 10-15 minutes
- **Standard research** (moderate scope): 20-30 minutes
- **Comprehensive research** (broad scope): 30-60 minutes
- **Academic literature review**: 45-90 minutes

## Citation Standards

Every factual claim includes:

- Author/Organization name
- Publication date
- Source title
- Direct URL/DOI
- Source quality rating (A-E scale)

## Technology

- **Graph of Thoughts** - Graph-based reasoning for research optimization
- **Multi-Agent System** - Parallel task execution with Claude Code Task tool
- **Skills System** - Modular capabilities in `.claude/skills/`
- **Commands System** - User-facing shortcuts in `.claude/commands/`

## Contributing

To add new skills or improvements:

1. Follow the skill structure in `.claude/skills/`
2. Include `SKILL.md` with clear YAML frontmatter
3. Test with diverse research topics
4. Update documentation

## License

This project is provided as-is for educational and research purposes.

## Acknowledgments

- Graph of Thoughts framework inspired by [SPCL, ETH Zürich](https://github.com/spcl/graph-of-thoughts)
- Built with [Claude Code](https://claude.ai/code)
- 7-Phase Research Process based on deep research best practices

---

**Need help?** See [ARCHITECTURE.md](ARCHITECTURE.md) for technical details or [RESEARCH_METHODOLOGY.md](RESEARCH_METHODOLOGY.md) for research implementation.
