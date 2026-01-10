# Red Team Critic - Examples

## Example 1: Challenging a High-Confidence Claim

### Input

```markdown
**Finding ID**: F-042
**Claim**: "Remote work increases productivity by 35% according to Stanford study"
**Sources**:
- Bloom et al. (2015) Stanford study
- Forbes article citing the study
- Business Insider summary
**Confidence**: 9.5/10
```

### Red Team Analysis Process

#### Step 1: Identify Red Flags
- ✅ Specific percentage (35%)
- ✅ Single primary source (other sources cite same study)
- ✅ Study is 9 years old (2015)
- ✅ Context may have changed (pre-pandemic vs post-pandemic)

#### Step 2: Adversarial Searches

Executed searches:
1. "remote work productivity criticism"
2. "Stanford remote work study limitations"
3. "remote work productivity 2024 research"
4. "Bloom remote work study replication"
5. "remote work negative effects productivity"

#### Step 3: Counter-Evidence Found

**Strong Limitations Identified**:

1. **Context Specificity** (Source: Harvard Business Review, 2023)
   - Original study: Chinese call center workers only
   - Not generalizable to knowledge workers
   - Controlled environment (company-provided equipment)
   - URL: [example.com/hbr-remote-work-context]

2. **Failed Replications** (Source: Journal of Applied Psychology, 2022)
   - Meta-analysis of 15 studies shows mixed results
   - Productivity gains range from -10% to +25%
   - Depends heavily on job type and management style
   - URL: [example.com/jap-meta-analysis]

3. **Temporal Issues** (Source: MIT Sloan Review, 2024)
   - Post-pandemic studies show different patterns
   - Initial productivity boost followed by decline
   - "Zoom fatigue" and collaboration challenges
   - URL: [example.com/mit-remote-work-2024]

#### Step 4: Bias Detection

**Bias Indicators Found**:
- ⚠️ Echo chamber: All 3 sources cite same original study
- ⚠️ Recency bias: 2015 study applied to 2024 context
- ⚠️ Selection bias: Study used volunteers (self-selected sample)

### Red Team Output

```markdown
## Red Team Analysis: F-042

### Original Claim
"Remote work increases productivity by 35% according to Stanford study"

**Original Confidence**: 9.5/10

---

### Counter-Evidence Discovered

#### Strong Contradictions
1. **Journal of Applied Psychology Meta-Analysis** (Quality: A)
   - Finding: 15-study meta-analysis shows productivity effects range from -10% to +25%
   - Impact: Original 35% figure is at upper end of range, not typical
   - URL: [example.com/jap-meta-analysis]

#### Limitations Identified
1. **Methodological Issues**:
   - Sample: Chinese call center workers only (not generalizable)
   - Self-selection bias: Volunteers chose to work from home
   - Controlled environment: Company provided equipment and support

2. **Generalizability Concerns**:
   - Context: Pre-pandemic (2015) vs current remote work reality
   - Population: Call center workers ≠ knowledge workers
   - Duration: 9-month study may not capture long-term effects

#### Bias Indicators
- [x] Echo chamber: All sources cite same study
- [x] Recency bias: Outdated study applied to current context
- [x] Selection bias: Self-selected participants
- [ ] Vendor/commercial bias
- [ ] Publication bias

---

### Recommendation

**Status**: REFINE

**Adjusted Confidence**: 6.5/10 (Original: 9.5/10)

**Required Actions**:
- [x] Add context qualifiers to claim
- [x] Include limitations section
- [x] Cite contradictory meta-analysis
- [x] Specify study population and timeframe
- [ ] Remove claim entirely

**Justification**:
The claim is based on a single, context-specific study from 2015 involving Chinese call center workers. While the study is legitimate, the 35% figure is not generalizable to all remote work scenarios. Meta-analyses show highly variable results (-10% to +25%) depending on job type, management, and context. The claim should be refined to: "A 2015 Stanford study found 35% productivity gains among call center workers in a controlled remote work environment, though subsequent research shows mixed results across different industries and roles."
```

---

## Example 2: Detecting Vendor Bias

### Input

```markdown
**Finding ID**: F-108
**Claim**: "Blockchain technology reduces supply chain costs by 60% and eliminates fraud"
**Sources**:
- IBM Blockchain white paper
- Maersk case study
- Deloitte blockchain report
**Confidence**: 8.7/10
```

### Red Team Analysis Process

#### Step 1: Identify Red Flags
- 🚨 Suspiciously high percentage (60%)
- 🚨 Absolute claim ("eliminates fraud")
- 🚨 Vendor sources (IBM sells blockchain solutions)
- 🚨 Case study from early adopter (potential selection bias)

#### Step 2: Adversarial Searches

Executed searches:
1. "blockchain supply chain failure"
2. "blockchain implementation costs hidden"
3. "blockchain fraud still possible"
4. "blockchain supply chain criticism"
5. "blockchain ROI independent study"

#### Step 3: Counter-Evidence Found

**Strong Contradictions**:

1. **Gartner Research Report** (Source: Independent analyst, 2023)
   - Finding: 90% of blockchain supply chain pilots never reach production
   - Implementation costs often exceed projected savings by 3-5x
   - URL: [example.com/gartner-blockchain-reality]

2. **MIT Technology Review** (Source: Academic analysis, 2024)
   - Finding: Blockchain doesn't eliminate fraud, just shifts it
   - Smart contract vulnerabilities still exploitable
   - Human error at data entry point remains
   - URL: [example.com/mit-blockchain-fraud]

3. **Independent Cost Analysis** (Source: Supply Chain Quarterly, 2023)
   - Finding: Hidden costs include infrastructure, training, integration
   - Net savings average 8-15%, not 60%
   - ROI timeline: 5-7 years, not immediate
   - URL: [example.com/blockchain-real-costs]

#### Step 4: Bias Detection

**Bias Indicators Found**:

- 🚨 Vendor bias: IBM white paper (IBM sells blockchain)
- 🚨 Selection bias: Maersk is early adopter success story
- 🚨 Conflicts of interest: Deloitte consults on blockchain
- 🚨 Publication bias: Failed implementations not publicized

### Red Team Output

```markdown
## Red Team Analysis: F-108

### Original Claim
"Blockchain technology reduces supply chain costs by 60% and eliminates fraud"

**Original Confidence**: 8.7/10

---

### Counter-Evidence Discovered

#### Strong Contradictions
1. **Gartner Research Report** (Quality: B)
   - Finding: 90% of blockchain pilots fail; costs exceed savings by 3-5x
   - Impact: Directly contradicts 60% cost reduction claim
   - URL: [example.com/gartner-blockchain-reality]

2. **MIT Technology Review** (Quality: A)
   - Finding: Blockchain shifts fraud, doesn't eliminate it
   - Impact: Absolute claim "eliminates fraud" is false
   - URL: [example.com/mit-blockchain-fraud]

#### Limitations Identified
1. **Methodological Issues**:
   - Sample: Single successful case study (Maersk) not representative
   - Hidden costs: Infrastructure, training, integration not included
   - Timeframe: Long-term ROI (5-7 years) not mentioned

2. **Generalizability Concerns**:
   - Context: Early adopter with massive resources
   - Industry: Shipping logistics ≠ all supply chains
   - Scale: Enterprise solution, not applicable to SMBs

#### Bias Indicators
- [x] Vendor/commercial bias (IBM, Deloitte)
- [x] Selection bias (successful case study only)
- [x] Publication bias (failures not reported)
- [x] Conflicts of interest (vendors selling solutions)
- [ ] Echo chamber

---

### Recommendation

**Status**: REJECT

**Adjusted Confidence**: 2.0/10 (Original: 8.7/10)

**Required Actions**:
- [ ] Add context qualifiers to claim
- [ ] Include limitations section
- [ ] Cite contradictory evidence
- [ ] Search for independent sources
- [x] Remove claim entirely

**Justification**:
This claim is severely compromised by vendor bias and contradicted by independent research. All three sources have conflicts of interest (IBM sells blockchain, Deloitte consults on it, Maersk is a promotional case study). Independent analysis shows 90% pilot failure rate and actual savings of 8-15%, not 60%. The absolute claim "eliminates fraud" is demonstrably false. This finding should be removed and replaced with balanced, independent research on blockchain's actual capabilities and limitations.
```

---

## Example 3: Accepting a Well-Supported Claim

### Input

```markdown
**Finding ID**: F-215
**Claim**: "Regular exercise reduces risk of cardiovascular disease"
**Sources**:
- Cochrane systematic review (2023)
- American Heart Association guidelines
- Meta-analysis of 50+ studies (JAMA, 2024)
**Confidence**: 9.1/10
```

### Red Team Analysis Process

#### Step 1: Identify Red Flags
- ✅ High-quality sources (Cochrane, AHA, JAMA)
- ✅ Multiple independent sources
- ✅ Recent publications (2023-2024)
- ⚠️ Claim is very broad ("regular exercise" - how much? what type?)

#### Step 2: Adversarial Searches

Executed searches:
1. "exercise cardiovascular disease criticism"
2. "exercise heart disease limitations"
3. "exercise cardiovascular benefits overestimated"
4. "exercise heart health controversy"

#### Step 3: Counter-Evidence Found

**Minor Limitations Only**:

1. **Dose-Response Relationship** (Source: Sports Medicine, 2023)
   - Finding: Benefits plateau after 150-300 min/week moderate exercise
   - Extreme exercise (marathons) may have diminishing returns
   - Not a contradiction, just a nuance
   - URL: [example.com/exercise-dose-response]

2. **Individual Variation** (Source: Cell Metabolism, 2024)
   - Finding: ~20% of people are "non-responders" to exercise
   - Genetic factors influence cardiovascular benefits
   - Doesn't invalidate general claim
   - URL: [example.com/exercise-genetics]

#### Step 4: Bias Detection

**Bias Indicators Found**:
- ✅ No vendor bias detected
- ✅ Multiple independent sources
- ✅ No conflicts of interest
- ✅ Well-established scientific consensus

### Red Team Output

```markdown
## Red Team Analysis: F-215

### Original Claim
"Regular exercise reduces risk of cardiovascular disease"

**Original Confidence**: 9.1/10

---

### Counter-Evidence Discovered

#### Strong Contradictions
None found. Extensive literature search confirms cardiovascular benefits.

#### Limitations Identified
1. **Dose-Response Nuances**:
   - Benefits plateau at 150-300 min/week moderate exercise
   - Extreme exercise may have diminishing returns
   - Does not contradict core claim

2. **Individual Variation**:
   - ~20% of people are "non-responders"
   - Genetic factors influence magnitude of benefits
   - General population benefit still holds

#### Bias Indicators
- [ ] Vendor/commercial bias
- [ ] Selection bias
- [ ] Publication bias
- [ ] Conflicts of interest
- [ ] Echo chamber

---

### Recommendation

**Status**: ACCEPT

**Adjusted Confidence**: 9.0/10 (Original: 9.1/10)

**Required Actions**:
- [x] Minor clarification on dose-response
- [ ] Add limitations section
- [ ] Include counter-evidence
- [ ] Search for additional sources
- [ ] Remove claim entirely
```

**Justification**:
This claim is well-supported by high-quality, independent sources including Cochrane systematic reviews and JAMA meta-analyses. Adversarial search found only minor nuances (dose-response curves, individual variation) that don't contradict the core finding. No bias indicators detected. The claim is accepted with minimal adjustment to acknowledge individual variation.
```

---

## Summary: Red Team Decision Matrix

| Status | Criteria | Action |
|--------|----------|--------|
| **ACCEPT** | No significant counter-evidence, high-quality sources, no bias | Minor or no changes |
| **REFINE** | Some counter-evidence, limitations exist, claim can be qualified | Add context, limitations, counter-evidence |
| **REJECT** | Strong contradictions, severe bias, methodological flaws | Remove claim, search for better sources |
