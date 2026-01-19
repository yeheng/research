package logic

type DocumentMetadata struct {
	Title       string `json:"title"`
	Description string `json:"description"`
	Author      string `json:"author"`
	Date        string `json:"date"`
}

type Fact struct {
	Entity     string `json:"entity"`
	Attribute  string `json:"attribute"`
	Value      string `json:"value"`
	ValueType  string `json:"value_type"` // number, date, percentage, currency, text
	Confidence string `json:"confidence"` // High, Medium, Low
	Source     Source `json:"source"`
}

type Source struct {
	URL     string `json:"url,omitempty"`
	Title   string `json:"title,omitempty"`
	Author  string `json:"author,omitempty"`
	Date    string `json:"date,omitempty"`
	Quality string `json:"quality,omitempty"` // A-E
}

type Entity struct {
	Name         string   `json:"name"`
	Type         string   `json:"type"`
	Aliases      []string `json:"aliases,omitempty"`
	MentionCount int      `json:"mentionCount,omitempty"`
}

type Relation struct {
	Source     string  `json:"source"`
	Target     string  `json:"target"`
	Relation   string  `json:"relation"`
	Confidence float64 `json:"confidence"`
	Evidence   string  `json:"evidence,omitempty"`
}

type CoOccurrence struct {
	EntityA  string   `json:"entityA"`
	EntityB  string   `json:"entityB"`
	Count    int      `json:"count"`
	Contexts []string `json:"contexts"`
}

type Citation struct {
	Claim       string `json:"claim"`
	Author      string `json:"author,omitempty"`
	Date        string `json:"date,omitempty"`
	Title       string `json:"title,omitempty"`
	URL         string `json:"url,omitempty"`
	PageNumbers string `json:"page_numbers,omitempty"`
}

type ValidationIssue struct {
	CitationIndex int    `json:"citation_index"`
	IssueType     string `json:"issue_type"`
	Description   string `json:"description"`
}

type SourceRating struct {
	QualityRating         string   `json:"quality_rating"` // A-E
	Justification         string   `json:"justification"`
	CredibilityIndicators []string `json:"credibility_indicators"`
}
