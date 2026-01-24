package errors

import (
	"encoding/json"
	"fmt"
	"log"
	"time"
)

// ErrorCode represents a standardized error code
type ErrorCode string

const (
	// Input/Validation Errors (E0xx)
	ErrInsufficientContext ErrorCode = "E001"
	ErrInvalidScope        ErrorCode = "E002"
	ErrMissingParams       ErrorCode = "E003"

	// Data Retrieval Errors (E1xx)
	ErrWebFetchTimeout  ErrorCode = "E101"
	ErrURLNotAccessible ErrorCode = "E102"
	ErrRateLimitExceeded ErrorCode = "E103"
	ErrContentExtraction ErrorCode = "E104"

	// Processing Errors (E2xx)
	ErrTokenLimitExceeded    ErrorCode = "E201"
	ErrQualityBelowThreshold ErrorCode = "E202"
	ErrCitationValidation    ErrorCode = "E203"
	ErrConflictUnresolved    ErrorCode = "E204"

	// Agent/System Errors (E3xx)
	ErrAgentSpawnFailed   ErrorCode = "E301"
	ErrAgentTimeout       ErrorCode = "E302"
	ErrMaxIterations      ErrorCode = "E303"
	ErrFileSystem         ErrorCode = "E304"
	ErrDatabaseOperation  ErrorCode = "E305"
	ErrStateMachineFailed ErrorCode = "E306"

	// Validation Errors (E4xx)
	ErrHallucinationDetected ErrorCode = "E401"
	ErrSourceQualityTooLow   ErrorCode = "E402"
	ErrDuplicateContent      ErrorCode = "E403"
)

// ResearchError represents a standardized error in the research framework
type ResearchError struct {
	Code       ErrorCode              `json:"code"`
	Message    string                 `json:"message"`
	Details    map[string]interface{} `json:"details,omitempty"`
	Retryable  bool                   `json:"retryable"`
	MaxRetries int                    `json:"max_retries,omitempty"`
	Timestamp  string                 `json:"timestamp"`
}

func (e *ResearchError) Error() string {
	return fmt.Sprintf("[%s] %s", e.Code, e.Message)
}

// NewError creates a new ResearchError
func NewError(code ErrorCode, message string, details map[string]interface{}) *ResearchError {
	retryable, maxRetries := getRetryInfo(code)
	return &ResearchError{
		Code:       code,
		Message:    message,
		Details:    details,
		Retryable:  retryable,
		MaxRetries: maxRetries,
		Timestamp:  time.Now().Format(time.RFC3339),
	}
}

// getRetryInfo returns retry configuration for an error code
func getRetryInfo(code ErrorCode) (bool, int) {
	retryConfig := map[ErrorCode]struct {
		retryable  bool
		maxRetries int
	}{
		ErrInsufficientContext:   {true, 1},
		ErrInvalidScope:          {true, 1},
		ErrMissingParams:         {true, 1},
		ErrWebFetchTimeout:       {true, 1},
		ErrURLNotAccessible:      {false, 0},
		ErrRateLimitExceeded:     {true, 2},
		ErrContentExtraction:     {true, 1},
		ErrTokenLimitExceeded:    {true, 1},
		ErrQualityBelowThreshold: {true, 2},
		ErrCitationValidation:    {true, 3},
		ErrConflictUnresolved:    {false, 0},
		ErrAgentSpawnFailed:      {true, 1},
		ErrAgentTimeout:          {false, 0},
		ErrMaxIterations:         {false, 0},
		ErrFileSystem:            {true, 1},
		ErrDatabaseOperation:     {true, 2},
		ErrStateMachineFailed:    {true, 1},
		ErrHallucinationDetected: {true, 1},
		ErrSourceQualityTooLow:   {true, 1},
		ErrDuplicateContent:      {false, 0},
	}

	if config, ok := retryConfig[code]; ok {
		return config.retryable, config.maxRetries
	}
	return false, 0
}

// ErrorLogger provides consistent error logging
type ErrorLogger struct {
	sessionID string
}

// NewErrorLogger creates a new error logger
func NewErrorLogger(sessionID string) *ErrorLogger {
	return &ErrorLogger{sessionID: sessionID}
}

// LogError logs an error with context
func (el *ErrorLogger) LogError(err *ResearchError) {
	logEntry := map[string]interface{}{
		"timestamp":  err.Timestamp,
		"session_id": el.sessionID,
		"code":       err.Code,
		"message":    err.Message,
		"retryable":  err.Retryable,
	}
	if err.Details != nil {
		logEntry["details"] = err.Details
	}

	jsonLog, _ := json.Marshal(logEntry)
	log.Printf("[ERROR] %s", string(jsonLog))
}

// LogWarning logs a warning
func (el *ErrorLogger) LogWarning(code ErrorCode, message string, details map[string]interface{}) {
	logEntry := map[string]interface{}{
		"timestamp":  time.Now().Format(time.RFC3339),
		"session_id": el.sessionID,
		"level":      "warning",
		"code":       code,
		"message":    message,
	}
	if details != nil {
		logEntry["details"] = details
	}

	jsonLog, _ := json.Marshal(logEntry)
	log.Printf("[WARN] %s", string(jsonLog))
}

// LogInfo logs an info message
func (el *ErrorLogger) LogInfo(message string, details map[string]interface{}) {
	logEntry := map[string]interface{}{
		"timestamp":  time.Now().Format(time.RFC3339),
		"session_id": el.sessionID,
		"level":      "info",
		"message":    message,
	}
	if details != nil {
		logEntry["details"] = details
	}

	jsonLog, _ := json.Marshal(logEntry)
	log.Printf("[INFO] %s", string(jsonLog))
}

// WrapError wraps a standard error into a ResearchError
func WrapError(err error, code ErrorCode, message string) *ResearchError {
	return NewError(code, message, map[string]interface{}{
		"original_error": err.Error(),
	})
}

// IsRetryable checks if an error should be retried
func IsRetryable(err error) bool {
	if re, ok := err.(*ResearchError); ok {
		return re.Retryable
	}
	return false
}

// ToJSON converts an error to JSON for API responses
func ToJSON(err error) string {
	if re, ok := err.(*ResearchError); ok {
		data, _ := json.Marshal(re)
		return string(data)
	}
	return fmt.Sprintf(`{"error": "%s"}`, err.Error())
}

// UserFriendlyMessage returns a user-friendly message for an error code
func UserFriendlyMessage(code ErrorCode) string {
	messages := map[ErrorCode]string{
		ErrInsufficientContext:   "Please provide more details about what you'd like to research.",
		ErrInvalidScope:          "The research scope needs adjustment. Please narrow or broaden your topic.",
		ErrMissingParams:         "Some required information is missing. Please check the parameters.",
		ErrWebFetchTimeout:       "A web source took too long to respond. I'll continue with other sources.",
		ErrURLNotAccessible:      "A source is no longer available. I'll search for alternatives.",
		ErrRateLimitExceeded:     "Too many requests. Waiting briefly before continuing.",
		ErrContentExtraction:     "Had trouble reading a source. Trying an alternative method.",
		ErrTokenLimitExceeded:    "This document is too large. I'll process it in smaller sections.",
		ErrQualityBelowThreshold: "Need to find higher quality sources for better results.",
		ErrCitationValidation:    "Found a claim without a source. Let me verify and add the citation.",
		ErrConflictUnresolved:    "Found conflicting information. I'll document both perspectives.",
		ErrAgentSpawnFailed:      "I'll use fewer parallel agents to complete this research.",
		ErrAgentTimeout:          "A research task took too long. Continuing with available findings.",
		ErrMaxIterations:         "Reached the iteration limit. Finalizing with current findings.",
		ErrFileSystem:            "Had trouble saving files. Checking permissions.",
		ErrDatabaseOperation:     "Database operation failed. Retrying.",
		ErrStateMachineFailed:    "Research state error. Attempting recovery.",
		ErrHallucinationDetected: "Found a claim without supporting source. Removing or verifying.",
		ErrSourceQualityTooLow:   "Need to find more reliable sources.",
		ErrDuplicateContent:      "Found duplicate information. Merging and deduplicating.",
	}

	if msg, ok := messages[code]; ok {
		return msg
	}
	return "An unexpected error occurred."
}
