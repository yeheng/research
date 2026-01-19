package mcp

import (
	"encoding/json"
	"fmt"
	"sync"
)

// ToolHandler is the function signature for a tool implementation
type ToolHandler func(args map[string]interface{}) (*CallToolResult, error)

// Registry manages registered tools
type Registry struct {
	mu    sync.RWMutex
	tools map[string]ToolEntry
}

type ToolEntry struct {
	Tool    Tool
	Handler ToolHandler
}

// NewRegistry creates a new tool registry
func NewRegistry() *Registry {
	return &Registry{
		tools: make(map[string]ToolEntry),
	}
}

// Register adds a tool to the registry
func (r *Registry) Register(name, description string, inputSchema interface{}, handler ToolHandler) {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.tools[name] = ToolEntry{
		Tool: Tool{
			Name:        name,
			Description: description,
			InputSchema: inputSchema,
		},
		Handler: handler,
	}
}

// GetTools returns a list of all registered tools
func (r *Registry) GetTools() []Tool {
	r.mu.RLock()
	defer r.mu.RUnlock()
	tools := make([]Tool, 0, len(r.tools))
	for _, entry := range r.tools {
		tools = append(tools, entry.Tool)
	}
	return tools
}

// CallTool executes a registered tool
func (r *Registry) CallTool(name string, args map[string]interface{}) (*CallToolResult, error) {
	r.mu.RLock()
	entry, ok := r.tools[name]
	r.mu.RUnlock()

	if !ok {
		return nil, fmt.Errorf("tool not found: %s", name)
	}

	return entry.Handler(args)
}

// Helper to convert struct to map for inputSchema
func ToMap(v interface{}) interface{} {
	b, _ := json.Marshal(v)
	var m interface{}
	_ = json.Unmarshal(b, &m)
	return m
}
