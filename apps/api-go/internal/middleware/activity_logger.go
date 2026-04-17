package middleware

import (
	"context"
	"net/http"
	"strings"

	"github.com/Cheikh-Nakamoto/RBS_Crew_SN/apps/api-go/internal/repository"
	"github.com/Cheikh-Nakamoto/RBS_Crew_SN/apps/api-go/internal/types"
	"github.com/google/uuid"
)

type statusWriter struct {
	http.ResponseWriter
	code    int
	written bool
}

func (sw *statusWriter) WriteHeader(code int) {
	if !sw.written {
		sw.code = code
		sw.written = true
	}
	sw.ResponseWriter.WriteHeader(code)
}

func (sw *statusWriter) Write(b []byte) (int, error) {
	if !sw.written {
		sw.code = http.StatusOK
		sw.written = true
	}
	return sw.ResponseWriter.Write(b)
}

var adminEntityMap = map[string]string{
	"projects":   "project",
	"artists":    "artist",
	"categories": "category",
	"tags":       "tag",
	"products":   "product",
	"pages":      "page",
	"services":   "service",
	"festival":   "festival",
	"press":      "press",
	"orders":     "order",
	"quotes":     "quote",
	"users":      "user",
	"media":      "media",
}

func parseAdminPath(path string) (entityType string, entityId *string) {
	trimmed := strings.TrimPrefix(path, "/admin/")
	parts := strings.SplitN(trimmed, "/", 3)
	resource := parts[0]
	entityType = adminEntityMap[resource]
	if entityType == "" {
		entityType = resource
	}
	if len(parts) > 1 && parts[1] != "" && parts[1] != "status" {
		id := parts[1]
		entityId = &id
	}
	return entityType, entityId
}

func ActivityLogger(repo *repository.ActivityLogRepository) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if r.Method == http.MethodGet || r.Method == http.MethodHead || r.Method == http.MethodOptions {
				next.ServeHTTP(w, r)
				return
			}

			sw := &statusWriter{ResponseWriter: w, code: http.StatusOK}
			next.ServeHTTP(sw, r)

			if sw.code < 400 {
				userID, _ := r.Context().Value(types.CtxUserID).(string)
				userEmail, _ := r.Context().Value(types.CtxUserEmail).(string)
				entityType, entityId := parseAdminPath(r.URL.Path)

				go func() {
					_ = repo.Create(context.Background(), &repository.ActivityLog{
						ID:         uuid.New().String(),
						UserID:     userID,
						UserEmail:  userEmail,
						Method:     r.Method,
						Path:       r.URL.Path,
						EntityType: entityType,
						EntityId:   entityId,
						StatusCode: sw.code,
					})
				}()
			}
		})
	}
}
