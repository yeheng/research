package logic

import (
	"strings"

	"github.com/dlclark/regexp2"
	"golang.org/x/text/cases"
	"golang.org/x/text/language"
)

var entityPatterns = map[string][]string{
	"company": {
		`\b(OpenAI|Microsoft|Google|Apple|Amazon|Meta|Anthropic|DeepMind|NVIDIA|Tesla|IBM|Oracle|Salesforce|Adobe|Intel|AMD|Qualcomm|Samsung|Huawei|Alibaba|Tencent|Baidu|ByteDance)\b`,
		`\b([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)*)\s+(?:Inc\.|Corp\.|LLC|Ltd\.?|Company|Co\.|Corporation|Group|Holdings)\b`,
	},
	"technology": {
		`\b(GPT-[0-9]+|GPT[0-9]+|BERT|Transformer|LLM|CNN|RNN|LSTM|GAN|VAE|ViT|CLIP|DALL[-·]?E|Stable Diffusion|Midjourney|Claude|Gemini|PaLM|LLaMA|Mistral|ChatGPT|Copilot)\b`,
		`\b(Machine Learning|Deep Learning|Neural Network|Natural Language Processing|NLP|Computer Vision|Reinforcement Learning|AI|Artificial Intelligence)\b`,
	},
	"product": {
		`\b(ChatGPT|GitHub Copilot|Bing Chat|Google Bard|Claude AI|Gemini Pro|GPT-4 Turbo)\b`,
	},
	"person": {
		`\b(Sam Altman|Satya Nadella|Sundar Pichai|Elon Musk|Mark Zuckerberg|Dario Amodei|Demis Hassabis|Jensen Huang|Tim Cook|Jeff Bezos)\b`,
	},
	"market": {
		`\b(AI (?:in )?Healthcare|FinTech|EdTech|AdTech|RegTech|InsurTech|HealthTech|BioTech|CleanTech|AgTech|FoodTech|PropTech|LegalTech|MarTech|HRTech|RetailTech)\b`,
		`\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)* Market)\b`,
	},
}

var relationPatterns = map[string][]string{
	"invests_in": {
		`(\w+(?:\s+\w+)?)\s+invest(?:ed|s|ing)?\s+(?:\$[\d.]+\s*(?:billion|million|B|M))?\s*in\s+(\w+(?:\s+\w+)?)`,
		`(\w+(?:\s+\w+)?)\s+(?:led|participated in)\s+(?:a\s+)?(?:\$[\d.]+\s*(?:billion|million|B|M)\s+)?(?:funding|investment)\s+(?:round\s+)?(?:in|for)\s+(\w+(?:\s+\w+)?)`,
	},
	"competes_with": {
		`(\w+(?:\s+\w+)?)\s+compet(?:es|ing|ed)\s+with\s+(\w+(?:\s+\w+)?)`,
		`(\w+(?:\s+\w+)?)\s+(?:is|are)\s+(?:a\s+)?(?:rival|competitor)(?:s)?\s+(?:of|to)\s+(\w+(?:\s+\w+)?)`,
	},
	"partners_with": {
		`(\w+(?:\s+\w+)?)\s+partner(?:ed|s|ing)?\s+with\s+(\w+(?:\s+\w+)?)`,
		`(\w+(?:\s+\w+)?)\s+(?:announced|formed|entered)\s+(?:a\s+)?partnership\s+with\s+(\w+(?:\s+\w+)?)`,
	},
	"uses": {
		`(\w+(?:\s+\w+)?)\s+(?:uses|using|powered by|built on|leverages)\s+(\w+(?:\s+\w+)?)`,
	},
	"created_by": {
		`(\w+(?:\s+\w+)?)\s+(?:was\s+)?(?:created|developed|built|made)\s+by\s+(\w+(?:\s+\w+)?)`,
	},
	"acquired": {
		`(\w+(?:\s+\w+)?)\s+acquir(?:ed|es|ing)\s+(\w+(?:\s+\w+)?)`,
		`(\w+(?:\s+\w+)?)\s+(?:bought|purchased)\s+(\w+(?:\s+\w+)?)`,
	},
}

// ExtractEntities extracts named entities
func ExtractEntities(text string) map[string]Entity {
	entities := make(map[string]Entity)

	for eType, patterns := range entityPatterns {
		for _, pattern := range patterns {
			re := regexp2.MustCompile(pattern, regexp2.IgnoreCase)
			m, _ := re.FindStringMatch(text)
			for m != nil {
				name := m.String()
				if m.GroupCount() > 1 {
					g := m.GroupByNumber(1)
					if g != nil && g.Length > 0 {
						name = g.String()
					}
				}
				name = strings.TrimSpace(name)

				if len(name) < 2 || isCommonWord(name) {
					m, _ = re.FindNextMatch(m)
					continue
				}

				normalized := name
				if len(name) > 3 {
					normalized = toTitleCase(name)
				} else {
					normalized = strings.ToUpper(name)
				}

				if e, exists := entities[normalized]; exists {
					e.MentionCount++
					if name != normalized && !contains(e.Aliases, name) {
						e.Aliases = append(e.Aliases, name)
					}
					entities[normalized] = e
				} else {
					entities[normalized] = Entity{
						Name:         normalized,
						Type:         eType,
						Aliases:      []string{},
						MentionCount: 1,
					}
				}

				m, _ = re.FindNextMatch(m)
			}
		}
	}
	return entities
}

// ExtractRelations extracts relationships
func ExtractRelations(text string, entities map[string]Entity) []Relation {
	var relations []Relation
	entityNames := make(map[string]bool)
	for k := range entities {
		entityNames[strings.ToLower(k)] = true
	}

	for rType, patterns := range relationPatterns {
		for _, pattern := range patterns {
			re := regexp2.MustCompile(pattern, regexp2.IgnoreCase)
			m, _ := re.FindStringMatch(text)
			for m != nil {
				if m.GroupCount() >= 3 {
					source := strings.TrimSpace(m.GroupByNumber(1).String())
					target := strings.TrimSpace(m.GroupByNumber(2).String())

					sourceNorm := toTitleCase(source)
					targetNorm := toTitleCase(target)

					sourceKnown := entityNames[strings.ToLower(sourceNorm)]
					targetKnown := entityNames[strings.ToLower(targetNorm)]

					if sourceKnown || targetKnown {
						conf := 0.5
						if sourceKnown && targetKnown {
							conf = 0.7
						}

						start := m.Index - 50
						if start < 0 {
							start = 0
						}
						end := m.Index + m.Length + 50
						if end > len(text) {
							end = len(text)
						}
						evidence := text[start:end]

						relations = append(relations, Relation{
							Source:     sourceNorm,
							Target:     targetNorm,
							Relation:   rType,
							Confidence: conf,
							Evidence:   strings.TrimSpace(evidence),
						})
					}
				}
				m, _ = re.FindNextMatch(m)
			}
		}
	}
	return relations
}

// ExtractFacts extracts facts (number/currency)
func ExtractFacts(text string, source Source) []Fact {
	var facts []Fact
	lines := strings.Split(text, "\n")

	numRe := regexp2.MustCompile(`(.+?)\s+(?:is|was|has|reached|grew to)\s+(\d+(?:\.\d+)?)\s*(%|billion|million|thousand)?`, regexp2.IgnoreCase)
	currRe := regexp2.MustCompile(`(.+?)\s+(?:is|was|valued at|worth)\s+\$(\d+(?:\.\d+)?)\s*(B|M|billion|million)?`, regexp2.IgnoreCase)

	for _, line := range lines {
		m, _ := numRe.FindStringMatch(line)
		if m != nil {
			entity := strings.TrimSpace(m.GroupByNumber(1).String())
			value := m.GroupByNumber(2).String()
			unit := ""
			if m.GroupCount() > 3 {
				unit = m.GroupByNumber(3).String()
			}

			facts = append(facts, Fact{
				Entity:     entity,
				Attribute:  "amount",
				Value:      value + unit,
				ValueType:  "number",
				Confidence: "Medium",
				Source:     source,
			})
		}

		m, _ = currRe.FindStringMatch(line)
		if m != nil {
			entity := strings.TrimSpace(m.GroupByNumber(1).String())
			value := m.GroupByNumber(2).String()
			unit := ""
			if m.GroupCount() > 3 {
				unit = m.GroupByNumber(3).String()
			}

			facts = append(facts, Fact{
				Entity:     entity,
				Attribute:  "value",
				Value:      value + unit,
				ValueType:  "currency",
				Confidence: "Medium",
				Source:     source,
			})
		}
	}
	return facts
}

func isCommonWord(s string) bool {
	common := map[string]bool{"the": true, "a": true, "an": true, "is": true, "are": true}
	return common[strings.ToLower(s)]
}

func toTitleCase(s string) string {
	return cases.Title(language.English).String(strings.ToLower(s))
}

func contains(slice []string, item string) bool {
	for _, s := range slice {
		if s == item {
			return true
		}
	}
	return false
}
