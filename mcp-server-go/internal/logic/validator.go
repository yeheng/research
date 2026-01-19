package logic

import (
	"strings"
)

// ValidateCitation checks for missing fields
func ValidateCitation(citation Citation, index int) []ValidationIssue {
	var issues []ValidationIssue
	if citation.Author == "" {
		issues = append(issues, ValidationIssue{index, "missing_author", "Citation is missing author information"})
	}
	if citation.Date == "" {
		issues = append(issues, ValidationIssue{index, "missing_date", "Citation is missing publication date"})
	}
	if citation.URL == "" {
		issues = append(issues, ValidationIssue{index, "missing_url", "Citation is missing URL"})
	}
	if citation.Title == "" {
		issues = append(issues, ValidationIssue{index, "missing_title", "Citation is missing title"})
	}
	return issues
}

// RateSource rates source quality based on URL pattern and type
func RateSource(sourceUrl string, sourceType string) SourceRating {
	rating := "C"
	justification := "Unverified or unknown source"
	var indicators []string

	lowerUrl := strings.ToLower(sourceUrl)

	if strings.Contains(lowerUrl, ".edu") || strings.Contains(lowerUrl, "scholar.google") || strings.Contains(lowerUrl, "pubmed") {
		rating = "A"
		justification = "Peer-reviewed academic source"
		indicators = append(indicators, "Academic domain", "Peer-reviewed")
	} else if sourceType == "industry" || strings.Contains(lowerUrl, "gartner") || strings.Contains(lowerUrl, "forrester") {
		rating = "B"
		justification = "Reputable industry analyst report"
		indicators = append(indicators, "Industry analyst", "Professional research")
	} else if sourceType == "official" || strings.Contains(lowerUrl, ".gov") {
		rating = "B"
		justification = "Official or government source"
		indicators = append(indicators, "Official source", "Institutional")
	} else if sourceType == "news" || strings.Contains(lowerUrl, "reuters") || strings.Contains(lowerUrl, "bloomberg") {
		rating = "C"
		justification = "Established news organization"
		indicators = append(indicators, "News source", "Editorial standards")
	} else if sourceType == "blog" || strings.Contains(lowerUrl, "medium") || strings.Contains(lowerUrl, "blog") {
		rating = "D"
		justification = "Blog or opinion piece"
		indicators = append(indicators, "Blog content", "Individual perspective")
	} else {
		rating = "E"
		justification = "Unverified or unknown source"
		indicators = append(indicators, "Unknown source")
	}

	return SourceRating{
		QualityRating:         rating,
		Justification:         justification,
		CredibilityIndicators: indicators,
	}
}
