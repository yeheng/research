package db

import (
	"database/sql"
	_ "embed"
	"fmt"
	"os"
	"path/filepath"

	_ "github.com/mattn/go-sqlite3"
)

//go:embed schema.sql
var schemaSQL string

// DB is the global database connection
var DB *sql.DB

// InitDB initializes the SQLite database
func InitDB(dbPath string) error {
	if dbPath == "" {
		return fmt.Errorf("dbPath is required")
	}

	// Ensure directory exists
	if err := os.MkdirAll(filepath.Dir(dbPath), 0755); err != nil {
		return fmt.Errorf("failed to create db directory: %w", err)
	}

	var err error
	DB, err = sql.Open("sqlite3", dbPath+"?_journal_mode=WAL&_foreign_keys=on")
	if err != nil {
		return fmt.Errorf("failed to open database: %w", err)
	}

	if err := DB.Ping(); err != nil {
		return fmt.Errorf("failed to ping database: %w", err)
	}

	// Set synchronous mode explicitly if needed, though usually WAL defaults are okay.
	// We can execute pragmas here too to be sure.
	if _, err := DB.Exec("PRAGMA synchronous = NORMAL;"); err != nil {
		return fmt.Errorf("failed to set synchronous mode: %w", err)
	}

	// Initialize schema
	if err := initSchema(DB); err != nil {
		return fmt.Errorf("failed to initialize schema: %w", err)
	}

	return nil
}

func initSchema(db *sql.DB) error {
	// Check user_version
	var version int
	if err := db.QueryRow("PRAGMA user_version").Scan(&version); err != nil {
		return err
	}

	const targetVersion = 3 // v4.1: Added state machine persistence fields

	if version < targetVersion {
		if _, err := db.Exec(schemaSQL); err != nil {
			return fmt.Errorf("failed to execute schema: %w", err)
		}
		if _, err := db.Exec(fmt.Sprintf("PRAGMA user_version = %d", targetVersion)); err != nil {
			return fmt.Errorf("failed to set user_version: %w", err)
		}
		fmt.Printf("✅ Database schema initialized (version %d)\n", targetVersion)
	} else {
		fmt.Printf("ℹ️  Database schema up to date (version %d)\n", version)
	}

	return nil
}

func Close() {
	if DB != nil {
		DB.Close()
	}
}
