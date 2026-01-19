package logic

import (
	"bytes"
	"strings"

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
