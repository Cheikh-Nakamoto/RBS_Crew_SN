// Package migrations embeds the goose SQL migration files so they can be
// applied from the compiled binary via goose.SetBaseFS.
package migrations

import "embed"

// FS holds the embedded SQL migration files.
//
//go:embed *.sql
var FS embed.FS
