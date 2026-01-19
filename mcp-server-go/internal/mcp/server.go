package mcp

import (
	"bufio"
	"encoding/json"
	"log"
	"os"
	"time"
)

// Server implements the MCP server
type Server struct {
	registry *Registry
}

// NewServer creates a new MCP server
func NewServer(registry *Registry) *Server {
	return &Server{
		registry: registry,
	}
}

// Serve starts the server loop on Stdin/Stdout
func (s *Server) Serve() error {
	scanner := bufio.NewScanner(os.Stdin)
	// Increase buffer size if needed for large payloads (10MB)
	const maxCapacity = 10 * 1024 * 1024
	buf := make([]byte, maxCapacity)
	scanner.Buffer(buf, maxCapacity)

	for scanner.Scan() {
		line := scanner.Bytes()
		if len(line) == 0 {
			continue
		}

		// Handle request asynchronously
		// Copy line because scanner buffer is reused
		lineCopy := make([]byte, len(line))
		copy(lineCopy, line)
		go s.handleMessage(lineCopy)
	}

	return scanner.Err()
}

func (s *Server) handleMessage(data []byte) {
	var req JSONRPCRequest
	if err := json.Unmarshal(data, &req); err != nil {
		s.sendError(nil, -32700, "Parse error", nil)
		return
	}

	switch req.Method {
	case "initialize":
		s.sendResult(req.ID, map[string]interface{}{
			"protocolVersion": "2024-11-05", // Spec version
			"serverInfo": map[string]string{
				"name":    "deep-research-mcp-go",
				"version": "1.0.0",
			},
			"capabilities": map[string]interface{}{
				"tools": map[string]interface{}{},
			},
		})

	case "notifications/initialized":
		return

	case "tools/list":
		tools := s.registry.GetTools()
		s.sendResult(req.ID, ListToolsResult{Tools: tools})

	case "tools/call":
		var params CallToolRequestParams
		if err := json.Unmarshal(req.Params, &params); err != nil {
			s.sendError(req.ID, -32602, "Invalid params", nil)
			return
		}

		log.Printf("Calling tool: %s", params.Name)
		startTime := time.Now()

		result, err := s.registry.CallTool(params.Name, params.Arguments)

		duration := time.Since(startTime)
		if err != nil {
			log.Printf("Tool call failed: %s (duration: %v, error: %v)", params.Name, duration, err)
			s.sendError(req.ID, -32603, err.Error(), nil)
			return
		}

		log.Printf("Tool call succeeded: %s (duration: %v)", params.Name, duration)
		s.sendResult(req.ID, result)

	case "ping":
		s.sendResult(req.ID, map[string]string{})

	default:
		// Ignore notifications (no ID)
		if req.ID != nil {
			s.sendError(req.ID, -32601, "Method not found", nil)
		}
	}
}

func (s *Server) sendResult(id interface{}, result interface{}) {
	if id == nil {
		return // Notification
	}
	raw, _ := json.Marshal(result)
	resp := JSONRPCResponse{
		JSONRPC: "2.0",
		Result:  raw,
		ID:      id,
	}
	s.writeResponse(resp)
}

func (s *Server) sendError(id interface{}, code int, message string, data interface{}) {
	if id == nil {
		return
	}
	resp := JSONRPCResponse{
		JSONRPC: "2.0",
		Error: &JSONRPCError{
			Code:    code,
			Message: message,
			Data:    data,
		},
		ID: id,
	}
	s.writeResponse(resp)
}

func (s *Server) writeResponse(resp JSONRPCResponse) {
	b, _ := json.Marshal(resp)
	// Write atomically to stdout
	os.Stdout.Write(b)
	os.Stdout.Write([]byte("\n"))
}
