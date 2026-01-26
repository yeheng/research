package logic

import (
	"bytes"
	"math"
	"regexp"
	"sort"
	"strings"
	"unicode"

	md "github.com/JohannesKaufmann/html-to-markdown"
	"github.com/PuerkitoBio/goquery"
	readability "github.com/go-shiori/go-readability"
	"github.com/pkoukk/tiktoken-go"
	"golang.org/x/net/html"
)

type CleanHtmlOptions struct {
	PreserveTables bool
	RemoveAds      bool
	UseReadability bool
}

// CleanHtml cleans HTML content and converts it to Markdown
func CleanHtml(rawHtml string, options CleanHtmlOptions) (string, error) {
	var htmlContent string = rawHtml

	// Try Readability first if requested
	if options.UseReadability {
		article, err := readability.FromReader(strings.NewReader(rawHtml), nil)
		if err == nil {
			htmlContent = article.Content
		} else {
			// Fallback to raw HTML if readability fails
			// Log warning?
		}
	}

	doc, err := goquery.NewDocumentFromReader(strings.NewReader(htmlContent))
	if err != nil {
		return "", err
	}

	// Extract tables if preserved
	var extractedTables []string
	if options.PreserveTables {
		doc.Find("table").Each(func(i int, s *goquery.Selection) {
			tableMD := convertTableToMarkdown(s)
			if len(tableMD) > 20 {
				extractedTables = append(extractedTables, tableMD)
			}
			s.Remove()
		})
	}

	tagsToRemove := []string{
		"script", "style", "nav", "footer", "header", "aside",
		"iframe", "noscript", "form", "button", "input", "select",
		"textarea", "svg", "canvas", "advertisement", "ad", "banner",
		"popup", "modal",
	}
	for _, tag := range tagsToRemove {
		doc.Find(tag).Remove()
	}

	if options.RemoveAds {
		adPatterns := []string{
			"ad", "ads", "advertisement", "banner", "sidebar",
			"nav", "navigation", "menu", "footer", "header",
			"popup", "modal", "overlay", "cookie", "newsletter",
			"social", "share", "comment", "related", "recommended",
		}

		// This is a bit expensive, might need optimization
		// Iterating all elements with class or id
		doc.Find("*").Each(func(i int, s *goquery.Selection) {
			class, _ := s.Attr("class")
			id, _ := s.Attr("id")

			for _, p := range adPatterns {
				if strings.Contains(strings.ToLower(class), p) || strings.Contains(strings.ToLower(id), p) {
					s.Remove()
					return
				}
			}
		})
	}

	// Convert to Markdown
	converter := md.NewConverter("", true, nil)
	// Configure converter to remove script/style if they remain
	htmlStr, _ := doc.Html()
	markdown, err := converter.ConvertString(htmlStr)
	if err != nil {
		return "", err
	}

	// Clean whitespace
	lines := strings.Split(markdown, "\n")
	var cleanedLines []string
	for _, line := range lines {
		trimmed := strings.TrimSpace(line)
		if trimmed != "" {
			cleanedLines = append(cleanedLines, trimmed)
		}
	}
	text := strings.Join(cleanedLines, "\n\n")

	// Append tables
	if len(extractedTables) > 0 {
		text += "\n\n## Extracted Data Tables\n\n"
		text += strings.Join(extractedTables, "\n\n---\n\n")
	}

	return strings.TrimSpace(text), nil
}

// Helper to convert table to markdown (simplified)
func convertTableToMarkdown(table *goquery.Selection) string {
	var buf bytes.Buffer
	rows := table.Find("tr")
	if rows.Length() == 0 {
		return ""
	}

	headerProcessed := false
	rows.Each(func(i int, row *goquery.Selection) {
		cells := row.Find("th, td")
		if cells.Length() == 0 {
			return
		}

		var cellTexts []string
		cells.Each(func(j int, cell *goquery.Selection) {
			text := strings.TrimSpace(cell.Text())
			text = strings.ReplaceAll(text, "|", "\\|")
			text = strings.ReplaceAll(text, "\n", " ")
			cellTexts = append(cellTexts, text)
		})

		buf.WriteString("| " + strings.Join(cellTexts, " | ") + " |\n")

		// Add separator
		if row.Find("th").Length() > 0 || !headerProcessed {
			var seps []string
			for range cellTexts {
				seps = append(seps, "---")
			}
			buf.WriteString("| " + strings.Join(seps, " | ") + " |\n")
			headerProcessed = true
		}
	})

	return buf.String()
}

// ExtractMetadata extracts metadata from HTML
func ExtractMetadata(rawHtml string) DocumentMetadata {
	doc, err := goquery.NewDocumentFromReader(strings.NewReader(rawHtml))
	if err != nil {
		return DocumentMetadata{}
	}

	meta := DocumentMetadata{
		Title: strings.TrimSpace(doc.Find("title").First().Text()),
	}

	doc.Find("meta").Each(func(i int, s *goquery.Selection) {
		name, _ := s.Attr("name")
		content, _ := s.Attr("content")
		name = strings.ToLower(name)

		if name == "description" {
			meta.Description = content
		} else if name == "author" {
			meta.Author = content
		} else if strings.Contains(name, "date") || strings.Contains(name, "published") {
			meta.Date = content
		}
	})

	return meta
}

// CountTokens counts tokens using tiktoken (gpt-4 encoding)
func CountTokens(text string) int {
	tkm, err := tiktoken.EncodingForModel("gpt-4")
	if err != nil {
		// Fallback
		return len(text) / 4
	}
	tokens := tkm.Encode(text, nil, nil)
	return len(tokens)
}

// DetectDocumentType detects doc type from content or filename
func DetectDocumentType(content string, filename string) string {
	if filename != "" {
		lower := strings.ToLower(filename)
		if strings.HasSuffix(lower, ".html") || strings.HasSuffix(lower, ".htm") {
			return "html"
		}
		if strings.HasSuffix(lower, ".pdf") {
			return "pdf"
		}
	}

	if len(content) > 500 {
		if strings.Contains(strings.ToLower(content[:500]), "<html") {
			return "html"
		}
	}
	if len(content) > 10 {
		if strings.Contains(content[:10], "%PDF") {
			return "pdf"
		}
	}

	return "text"
}

// helper for node iteration (unused but good to have)
func forEachNode(n *html.Node, f func(*html.Node)) {
	f(n)
	for c := n.FirstChild; c != nil; c = c.NextSibling {
		forEachNode(c, f)
	}
}

// =============================================================================
// Content Summarization and Key Paragraph Extraction
// =============================================================================

// SummarizationOptions configures the summarization behavior
type SummarizationOptions struct {
	MaxParagraphs    int     // Maximum number of key paragraphs to extract
	MaxTokens        int     // Maximum tokens for summary
	MinSentenceLen   int     // Minimum sentence length to consider
	KeywordBoost     float64 // Boost score for keyword-rich paragraphs
	PositionWeight   float64 // Weight for paragraph position (earlier = higher)
	PreserveCodeBlocks bool  // Preserve code blocks in output
}

// DefaultSummarizationOptions returns sensible defaults
func DefaultSummarizationOptions() SummarizationOptions {
	return SummarizationOptions{
		MaxParagraphs:    10,
		MaxTokens:        2000,
		MinSentenceLen:   20,
		KeywordBoost:     1.5,
		PositionWeight:   0.3,
		PreserveCodeBlocks: true,
	}
}

// ScoredParagraph represents a paragraph with its relevance score
type ScoredParagraph struct {
	Text     string
	Score    float64
	Position int
	IsCode   bool
	Tokens   int
}

// ContentSummary represents the summarized content
type ContentSummary struct {
	Title            string            `json:"title"`
	KeyParagraphs    []string          `json:"key_paragraphs"`
	KeyFacts         []string          `json:"key_facts"`
	Keywords         []string          `json:"keywords"`
	TotalTokens      int               `json:"total_tokens"`
	SummaryTokens    int               `json:"summary_tokens"`
	CompressionRatio float64           `json:"compression_ratio"`
	Metadata         DocumentMetadata  `json:"metadata"`
}

// ExtractKeyParagraphs extracts the most important paragraphs from content
func ExtractKeyParagraphs(content string, options SummarizationOptions) []ScoredParagraph {
	// Split content into paragraphs
	paragraphs := splitIntoParagraphs(content)

	// Build keyword frequency map (TF)
	wordFreq := buildWordFrequency(content)

	// Score each paragraph
	var scored []ScoredParagraph
	for i, para := range paragraphs {
		if len(strings.TrimSpace(para)) < options.MinSentenceLen {
			continue
		}

		isCode := isCodeBlock(para)
		score := scoreParagraph(para, wordFreq, i, len(paragraphs), options)
		tokens := CountTokens(para)

		scored = append(scored, ScoredParagraph{
			Text:     para,
			Score:    score,
			Position: i,
			IsCode:   isCode,
			Tokens:   tokens,
		})
	}

	// Sort by score (descending)
	sort.Slice(scored, func(i, j int) bool {
		return scored[i].Score > scored[j].Score
	})

	// Select top paragraphs within token budget
	var selected []ScoredParagraph
	totalTokens := 0

	for _, para := range scored {
		if len(selected) >= options.MaxParagraphs {
			break
		}
		if totalTokens+para.Tokens > options.MaxTokens {
			continue
		}
		selected = append(selected, para)
		totalTokens += para.Tokens
	}

	// Re-sort by original position for coherent reading
	sort.Slice(selected, func(i, j int) bool {
		return selected[i].Position < selected[j].Position
	})

	return selected
}

// SummarizeContent creates a comprehensive summary of content
func SummarizeContent(content string, metadata DocumentMetadata, options SummarizationOptions) ContentSummary {
	totalTokens := CountTokens(content)

	// Extract key paragraphs
	keyParas := ExtractKeyParagraphs(content, options)

	var paraTexts []string
	summaryTokens := 0
	for _, p := range keyParas {
		paraTexts = append(paraTexts, p.Text)
		summaryTokens += p.Tokens
	}

	// Extract keywords
	keywords := ExtractTopKeywords(content, 20)

	// Extract key facts (numerical statements)
	keyFacts := ExtractKeyFacts(content)

	compressionRatio := 0.0
	if totalTokens > 0 {
		compressionRatio = float64(summaryTokens) / float64(totalTokens)
	}

	return ContentSummary{
		Title:            metadata.Title,
		KeyParagraphs:    paraTexts,
		KeyFacts:         keyFacts,
		Keywords:         keywords,
		TotalTokens:      totalTokens,
		SummaryTokens:    summaryTokens,
		CompressionRatio: compressionRatio,
		Metadata:         metadata,
	}
}

// ExtractTopKeywords extracts the most frequent meaningful words
func ExtractTopKeywords(content string, topN int) []string {
	wordFreq := buildWordFrequency(content)

	// Convert to sortable slice
	type wordScore struct {
		word  string
		score float64
	}
	var words []wordScore
	for word, freq := range wordFreq {
		// Filter out common words and short words
		if len(word) < 4 || isStopWord(word) {
			continue
		}
		words = append(words, wordScore{word, freq})
	}

	// Sort by frequency
	sort.Slice(words, func(i, j int) bool {
		return words[i].score > words[j].score
	})

	// Return top N
	var result []string
	for i := 0; i < len(words) && i < topN; i++ {
		result = append(result, words[i].word)
	}
	return result
}

// ExtractKeyFacts extracts numerical and statistical statements
func ExtractKeyFacts(content string) []string {
	var facts []string

	// Patterns for key facts
	patterns := []*regexp.Regexp{
		// Percentages
		regexp.MustCompile(`[^.]*\d+(?:\.\d+)?%[^.]*\.`),
		// Dollar amounts
		regexp.MustCompile(`[^.]*\$\d+(?:,\d{3})*(?:\.\d+)?(?:\s*(?:million|billion|trillion|M|B|T))?[^.]*\.`),
		// Year statistics
		regexp.MustCompile(`[^.]*(?:in|by|since|from)\s+20[12]\d[^.]*\.`),
		// Comparisons
		regexp.MustCompile(`[^.]*(?:increased|decreased|grew|fell|rose|dropped)\s+(?:by\s+)?\d+[^.]*\.`),
		// Rankings
		regexp.MustCompile(`[^.]*(?:first|second|third|top|leading|largest|biggest)[^.]*\.`),
	}

	seen := make(map[string]bool)
	for _, pattern := range patterns {
		matches := pattern.FindAllString(content, -1)
		for _, match := range matches {
			match = strings.TrimSpace(match)
			if len(match) > 30 && len(match) < 500 && !seen[match] {
				facts = append(facts, match)
				seen[match] = true
			}
		}
	}

	// Limit to top 10 facts
	if len(facts) > 10 {
		facts = facts[:10]
	}

	return facts
}

// splitIntoParagraphs splits content into paragraphs
func splitIntoParagraphs(content string) []string {
	// Split by double newlines or markdown headers
	var paragraphs []string

	// First, identify code blocks to preserve them
	codeBlockPattern := regexp.MustCompile("(?s)```.*?```")
	codeBlocks := codeBlockPattern.FindAllStringIndex(content, -1)

	// Split by double newlines
	parts := strings.Split(content, "\n\n")

	for _, part := range parts {
		part = strings.TrimSpace(part)
		if len(part) > 0 {
			// Check if this is a header + content
			if strings.HasPrefix(part, "#") {
				lines := strings.SplitN(part, "\n", 2)
				if len(lines) == 2 {
					paragraphs = append(paragraphs, lines[0])
					if len(strings.TrimSpace(lines[1])) > 0 {
						paragraphs = append(paragraphs, strings.TrimSpace(lines[1]))
					}
				} else {
					paragraphs = append(paragraphs, part)
				}
			} else {
				paragraphs = append(paragraphs, part)
			}
		}
	}

	// Unused but kept for future enhancement
	_ = codeBlocks

	return paragraphs
}

// buildWordFrequency builds a TF (term frequency) map
func buildWordFrequency(content string) map[string]float64 {
	freq := make(map[string]float64)

	// Tokenize: split by non-alphanumeric characters
	words := regexp.MustCompile(`[a-zA-Z]+`).FindAllString(strings.ToLower(content), -1)

	total := float64(len(words))
	if total == 0 {
		return freq
	}

	for _, word := range words {
		freq[word]++
	}

	// Normalize to TF
	for word := range freq {
		freq[word] = freq[word] / total
	}

	return freq
}

// scoreParagraph calculates relevance score for a paragraph
func scoreParagraph(para string, wordFreq map[string]float64, position, total int, options SummarizationOptions) float64 {
	score := 0.0

	// 1. Keyword density score (TF-based)
	words := regexp.MustCompile(`[a-zA-Z]+`).FindAllString(strings.ToLower(para), -1)
	for _, word := range words {
		if freq, ok := wordFreq[word]; ok && !isStopWord(word) {
			score += freq * options.KeywordBoost
		}
	}

	// 2. Position score (earlier paragraphs often more important)
	if total > 0 {
		positionScore := 1.0 - (float64(position) / float64(total))
		score += positionScore * options.PositionWeight
	}

	// 3. Sentence quality indicators
	// Boost for paragraphs with numbers (likely factual)
	if regexp.MustCompile(`\d+`).MatchString(para) {
		score += 0.2
	}

	// Boost for paragraphs with quotes (likely authoritative)
	if strings.Contains(para, `"`) || strings.Contains(para, `'`) {
		score += 0.1
	}

	// Boost for bullet points or lists (structured info)
	if strings.HasPrefix(strings.TrimSpace(para), "-") || strings.HasPrefix(strings.TrimSpace(para), "*") {
		score += 0.15
	}

	// 4. Length normalization (prefer medium-length paragraphs)
	paraLen := len(para)
	if paraLen > 100 && paraLen < 1000 {
		score += 0.1
	}

	// 5. Header proximity bonus
	if strings.HasPrefix(para, "#") {
		score += 0.3
	}

	return score
}

// isCodeBlock checks if a paragraph is a code block
func isCodeBlock(para string) bool {
	return strings.HasPrefix(para, "```") || strings.HasPrefix(para, "    ")
}

// isStopWord checks if a word is a common stop word
func isStopWord(word string) bool {
	stopWords := map[string]bool{
		"the": true, "a": true, "an": true, "and": true, "or": true,
		"but": true, "in": true, "on": true, "at": true, "to": true,
		"for": true, "of": true, "with": true, "by": true, "from": true,
		"is": true, "are": true, "was": true, "were": true, "be": true,
		"been": true, "being": true, "have": true, "has": true, "had": true,
		"do": true, "does": true, "did": true, "will": true, "would": true,
		"could": true, "should": true, "may": true, "might": true, "must": true,
		"that": true, "this": true, "these": true, "those": true, "it": true,
		"its": true, "they": true, "them": true, "their": true, "there": true,
		"here": true, "where": true, "when": true, "what": true, "which": true,
		"who": true, "whom": true, "whose": true, "how": true, "why": true,
		"all": true, "each": true, "every": true, "both": true, "few": true,
		"more": true, "most": true, "other": true, "some": true, "such": true,
		"not": true, "only": true, "own": true, "same": true, "than": true,
		"too": true, "very": true, "just": true, "also": true, "now": true,
		"can": true, "into": true, "about": true, "over": true, "after": true,
		"before": true, "between": true, "under": true, "again": true, "then": true,
	}
	return stopWords[strings.ToLower(word)]
}

// =============================================================================
// Text Cleaning and Normalization
// =============================================================================

// CleanText normalizes and cleans raw text content
func CleanText(text string) string {
	// Remove excessive whitespace
	text = regexp.MustCompile(`\s+`).ReplaceAllString(text, " ")

	// Remove control characters except newlines
	var cleaned strings.Builder
	for _, r := range text {
		if r == '\n' || r == '\t' || !unicode.IsControl(r) {
			cleaned.WriteRune(r)
		}
	}
	text = cleaned.String()

	// Normalize newlines
	text = regexp.MustCompile(`\n{3,}`).ReplaceAllString(text, "\n\n")

	// Trim each line
	lines := strings.Split(text, "\n")
	for i, line := range lines {
		lines[i] = strings.TrimSpace(line)
	}
	text = strings.Join(lines, "\n")

	return strings.TrimSpace(text)
}

// TruncateToTokens truncates text to fit within token limit
func TruncateToTokens(text string, maxTokens int) string {
	tokens := CountTokens(text)
	if tokens <= maxTokens {
		return text
	}

	// Binary search for the right length
	sentences := strings.Split(text, ". ")

	result := ""
	currentTokens := 0

	for _, sentence := range sentences {
		sentenceTokens := CountTokens(sentence + ". ")
		if currentTokens+sentenceTokens > maxTokens {
			break
		}
		if result != "" {
			result += ". "
		}
		result += sentence
		currentTokens += sentenceTokens
	}

	if result != "" && !strings.HasSuffix(result, ".") {
		result += "..."
	}

	return result
}

// CalculateSimilarity calculates simple text similarity (Jaccard)
func CalculateSimilarity(text1, text2 string) float64 {
	words1 := make(map[string]bool)
	words2 := make(map[string]bool)

	for _, w := range regexp.MustCompile(`[a-zA-Z]+`).FindAllString(strings.ToLower(text1), -1) {
		if len(w) > 3 {
			words1[w] = true
		}
	}
	for _, w := range regexp.MustCompile(`[a-zA-Z]+`).FindAllString(strings.ToLower(text2), -1) {
		if len(w) > 3 {
			words2[w] = true
		}
	}

	intersection := 0
	for w := range words1 {
		if words2[w] {
			intersection++
		}
	}

	union := len(words1) + len(words2) - intersection
	if union == 0 {
		return 0
	}

	return float64(intersection) / float64(union)
}

// IsDuplicateContent checks if content is a duplicate of existing content
func IsDuplicateContent(newContent string, existingContents []string, threshold float64) bool {
	for _, existing := range existingContents {
		if CalculateSimilarity(newContent, existing) > threshold {
			return true
		}
	}
	return false
}

// unused but kept for potential log usage
var _ = math.Log
