# Source Quality Rating System

All research skills use this unified A-E rating system for source quality assessment.

## Rating Definitions

### A - Excellent Sources (Highest Confidence)

**Criteria**:

- Peer-reviewed journals with impact factor
- Meta-analyses and systematic reviews
- Randomized Controlled Trials (RCTs)
- Government regulatory bodies (FDA, EMA, WHO, etc.)
- Top-tier conferences (NeurIPS, ICML, CHI, etc.)

**Examples**: New England Journal of Medicine, Nature, Science, FDA documentation

**Use for**: Medical claims, scientific facts, regulatory requirements

---

### B - Good Sources (High Confidence)

**Criteria**:

- Cohort studies, case-control studies
- Clinical practice guidelines
- Reputable industry analysts (Gartner, Forrester, IDC, McKinsey)
- Government websites (CDC, NIH, etc.)
- Official technical documentation from major companies

**Examples**: JAMA Network, McKinsey research, Google AI Blog, AWS Documentation

**Use for**: Market data, technical specifications, industry trends

---

### C - Acceptable Sources (Moderate Confidence)

**Criteria**:

- Expert opinion pieces in reputable venues
- Case reports and case studies
- Mechanistic studies (theoretical)
- Company white papers (vendor-provided)
- Reputable news outlets with editorial standards

**Examples**: Harvard Business Review, Wired, Ars Technica, TechCrunch

**Use for**: Expert perspectives, emerging trends, case examples

---

### D - Weak Sources (Low Confidence)

**Criteria**:

- Preprints (arXiv, bioRxiv) not yet peer-reviewed
- Conference abstracts without full papers
- Personal blogs by recognized experts
- Press releases and marketing materials
- Wikipedia (as starting point only)
- Social media posts from verified experts

**Examples**: arXiv preprints, company press releases, expert Twitter threads

**Use for**: Emerging research, preliminary findings (must note "not peer-reviewed")

---

### E - Unreliable Sources (Minimal/No Confidence)

**Criteria**:

- Anonymous sources or unknown authors
- Clearly biased or promotional content
- Outdated information (>5 years for tech, >10 years for other fields)
- Broken or inaccessible URLs
- Unverified claims without supporting evidence
- Content farms and low-quality aggregators

**Examples**: Broken links, anonymous blogs, outdated reports

**Use for**: Avoid if possible. If used, clearly mark limitations and seek corroboration

---

## Quality Thresholds

- **Minimum acceptable**: C-rated sources
- **Target average**: B-rated or higher
- **Critical claims**: Require A or B-rated sources
- **D-rated**: Use only for emerging topics, mark as preliminary
- **E-rated**: Flag for removal or replacement

### D - Weak Sources (Low Confidence)

**Criteria**:

- Preprints (not yet peer-reviewed)
- Conference abstracts only
- Preliminary research
- Blog posts without editorial oversight
- Crowdsourced content (Reddit, Quora)

**Examples**: arXiv preprints, Medium posts, Stack Overflow, individual blogs

**Use for**: Preliminary findings, community insights (with caveat)

---

### E - Very Poor Sources (Minimal Confidence)

**Criteria**:

- Anonymous content
- Content with clear bias/conflict of interest
- Outdated sources (>10 years old unless historical)
- Content from unknown publishers
- Broken or suspicious links
- Press releases without third-party verification

**Examples**: Personal blogs, PR Newswire (biased), content farms, promotional materials

**Use for**: Should generally be avoided; if used, must be verified

---

## Usage Guidelines

### Citation Requirements by Rating

| Rating | Minimum Sources | Verification Required |
|--------|-----------------|----------------------|
| A | 1 (authoritative alone) | URL accessibility |
| B | 1-2 | URL accessibility |
| C | 2+ corroborating | Cross-reference check |
| D | 3+ corroborating | Manual verification |
| E | Not recommended | Full verification + caveat |

### Confidence Mapping

| Source Mix | Overall Confidence |
|------------|-------------------|
| 3+ A/B sources | HIGH |
| 2 B sources | HIGH |
| 1 A/B + 2 C sources | MEDIUM |
| Only C/D sources | LOW |
| Any E sources | NEEDS VERIFICATION |

### Domain-Specific Adjustments

| Domain | Minimum Rating | Notes |
|--------|---------------|-------|
| Medical/Health | A-B required | Life-safety implications |
| Legal/Regulatory | A-B required | Compliance implications |
| Financial | B+ preferred | Fiduciary implications |
| Technical | C+ acceptable | Can verify experimentally |
| Market Research | B+ preferred | Business decisions |
| General Interest | C+ acceptable | Lower stakes |
