# Citation Format Standards

> **Template Type**: Reference Documentation
>
> **Purpose**: This document defines citation standards and quality validation requirements for research outputs.
>
> **Usage**: These standards are **guidelines** for agents and researchers to follow when creating citations. While agents should strive to follow these formats, the standards are not programmatically validated. Quality checks should be performed during the research review phase.
>
> **Version**: v4.0
>
> **Path**: `shared/templates/citation_format.md`
>
> ---
>
> All research outputs must follow these citation standards.

## Required Citation Elements

Every citation MUST include:

1. **Author/Organization** - Who created the content
2. **Publication Date** - When published (YYYY or YYYY-MM-DD)
3. **Source Title** - Name of the work
4. **URL/DOI** - Direct link to verify
5. **Page Numbers** - For PDFs and direct quotes (if applicable)

---

## Inline Citation Formats

### Academic/Research Papers

```
Short form (in text):
(Smith et al., 2023)
(Smith & Johnson, 2024, p. 145)

Full form (in bibliography):
Smith, J., Johnson, K., & Lee, M. (2023). "Title of Paper." 
Journal Name, 45(3), 140-156. https://doi.org/10.xxxx/xxxxx
```

### Industry Reports

```
Short form (in text):
(Gartner, 2024)
(McKinsey, 2024, "Cloud Computing Forecast")

Full form (in bibliography):
Gartner. (2024). "Cloud Computing Market Forecast, 2024." 
Retrieved [access date] from https://www.gartner.com/en/research/xxxxx
```

### Web Sources

```
Short form (in text):
(WHO, 2024, "Vaccine Guidelines")
(Google AI Blog, 2024)

Full form (in bibliography):
World Health Organization. (2024). "COVID-19 Vaccine Guidelines." 
Retrieved [access date] from https://www.who.int/xxxxx
```

### News Articles

```
Short form (in text):
(Author, Publication, 2024)
(Reuters, 2024)

Full form (in bibliography):
Author, N. (2024, Month Day). "Article Title." Publication Name. 
https://www.publication.com/article
```

---

## Bibliography Format

```markdown
## References

1. **Smith, J., Johnson, K., & Lee, M.** (2023). "Title of Paper." 
   Journal Name, 45(3), 140-156. 
   https://doi.org/10.xxxx/xxxxx
   [Quality Rating: A]

2. **Gartner.** (2024). "Cloud Computing Market Forecast, 2024." 
   https://www.gartner.com/en/research/xxxxx
   [Quality Rating: B]

3. **World Health Organization.** (2024). "COVID-19 Vaccine Guidelines." 
   Retrieved 2024-03-15 from https://www.who.int/xxxxx
   [Quality Rating: A]
```

---

## Common Citation Mistakes

### ❌ Bad Examples

```
"Studies show..." (NO SOURCE)
"According to research..." (NO SOURCE)
"Industry reports suggest..." (VAGUE)
(Smith, 2023) (MISSING URL)
```

### ✅ Good Examples

```
"According to Smith et al. (2023), the market grew 25% 
(https://doi.org/10.xxxx/xxxxx, p. 145)."

"Multiple industry reports estimate the 2023 market at 
approximately $22-23 billion (Grand View Research, 2024; 
MarketsandMarkets, 2024; Fortune Business Insights, 2024)."
```

---

## Special Cases

### No Author
```
Use organization name or "Anonymous":
(Organization Name, 2024)
(Anonymous, 2024, "Article Title")
```

### No Date
```
Use "n.d." (no date) or access date:
(Smith, n.d.)
(Company Name, accessed 2024-01-08)
```

### Broken or Inaccessible URLs
```
Mark clearly with access status:
Smith, J. (2023). "Article Title." 
[URL inaccessible as of 2024-01-08, archived at https://archive.org/xxxxx]

Or if no archive:
[URL inaccessible as of 2024-01-08, original: https://example.com/xxxxx]
```

### Preprints (Not Peer-Reviewed)
```
Include preprint server and status:
(Chen et al., 2024, preprint)

Full form:
Chen, L., Wang, X., & Liu, Y. (2024). "Title." 
arXiv preprint arXiv:2401.xxxxx. [Not peer-reviewed]
```

### Social Media
```
(Username, 2024, Twitter/X)

Full form:
@username. (2024, January 8). "Tweet content..." [Twitter/X post]. 
https://twitter.com/username/status/xxxxx
```

### Secondary Citations

When citing a source that cites another source:

```
According to the original study (Smith, 2020, as cited in Johnson, 2024)...

Note: Always try to find and cite the primary source directly.
```

### Multiple Sources for Same Claim

```
This finding is supported by multiple studies (Smith, 2023; 
Johnson, 2024; Lee et al., 2024), indicating strong consensus.
```

### Conflicting Sources

```
While Source A reports 25% growth (Smith, 2023), Source B 
suggests 18% growth (Johnson, 2024). This discrepancy may 
be due to different market definitions.
```

---

## Quality Validation Checklist

Before finalizing any research output:

- [ ] Every factual claim has a citation
- [ ] All citations include required elements (author, date, title, URL)
- [ ] URLs are accessible (not returning 404)
- [ ] Publication dates are accurate
- [ ] Citations actually support the claims made
- [ ] Quality ratings (A-E) are assigned to each source
- [ ] Bibliography is formatted consistently
