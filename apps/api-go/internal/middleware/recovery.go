package middleware

import (
	"log/slog"
	"net/http"
	"runtime/debug"

	"github.com/Cheikh-Nakamoto/RBS_Crew_SN/apps/api-go/internal/types"
)

func Recovery(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		defer func() {
			if err := recover(); err != nil {
				slog.Error("Panic recovered", "error", err, "stack", string(debug.Stack()))
				types.WriteError(w, types.InternalError("Internal server error"))
			}
		}()
		next.ServeHTTP(w, r)
	})
}
