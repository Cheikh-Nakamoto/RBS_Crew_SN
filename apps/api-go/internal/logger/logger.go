package logger

import (
	"io"
	"log/slog"
	"os"
	"path/filepath"
	"time"
)

// New creates a structured slog.Logger that writes to both stdout and a log file.
// The log file is created in the given directory with daily rotation naming.
// Returns the logger and a cleanup function to close the file.
func New(logDir, env string) (*slog.Logger, func(), error) {
	// Ensure log directory exists
	if err := os.MkdirAll(logDir, 0o755); err != nil {
		return nil, nil, err
	}

	// Open log file with daily rotation name
	filename := time.Now().Format("2006-01-02") + ".log"
	logPath := filepath.Join(logDir, filename)
	file, err := os.OpenFile(logPath, os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0o644)
	if err != nil {
		return nil, nil, err
	}

	// Multi-writer: log to both stdout and file
	multi := io.MultiWriter(os.Stdout, file)

	// Use JSON in production, text in development — both go to multi-writer
	opts := &slog.HandlerOptions{
		Level:     slog.LevelInfo,
		AddSource: env == "production", // include source location in prod for traceability
	}
	var handler slog.Handler
	if env == "production" {
		handler = slog.NewJSONHandler(multi, opts)
	} else {
		opts.Level = slog.LevelDebug // more verbose in dev
		handler = slog.NewTextHandler(multi, opts)
	}

	logger := slog.New(handler)

	cleanup := func() {
		_ = file.Close()
	}

	return logger, cleanup, nil
}
