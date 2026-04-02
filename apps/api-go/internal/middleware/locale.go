package middleware

import (
	"context"
	"net/http"
	"strings"

	"github.com/Cheikh-Nakamoto/RBS_Crew_SN/apps/api-go/internal/types"
)

var supportedLocales = map[string]bool{"fr": true, "en": true, "de": true, "es": true, "it": true}

func Locale(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		raw := r.Header.Get("Accept-Language")
		if raw == "" {
			raw = "fr"
		}
		lang := strings.Split(strings.Split(raw, ",")[0], "-")[0]
		lang = strings.ToLower(lang)
		if !supportedLocales[lang] {
			lang = "fr"
		}
		ctx := context.WithValue(r.Context(), types.CtxLocale, lang)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}
