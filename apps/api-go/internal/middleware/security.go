package middleware

import "net/http"

func SecurityHeaders(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("X-Content-Type-Options", "nosniff")
		w.Header().Set("X-Frame-Options", "DENY")
		w.Header().Set("Strict-Transport-Security", "max-age=31536000; includeSubDomains")
		w.Header().Set("Content-Security-Policy", "default-src 'self'")
		w.Header().Set("Referrer-Policy", "strict-origin-when-cross-origin")
		w.Header().Set("Permissions-Policy", "camera=(), microphone=(), geolocation=()")
		next.ServeHTTP(w, r)
	})
}

// MaxBodySize limits all request bodies to 1 MB. Apply this globally.
// For routes that accept larger payloads (e.g. file uploads), use MaxBodySizeBytes
// on that specific route group to override the limit.
func MaxBodySize(next http.Handler) http.Handler {
	return MaxBodySizeBytes(1 << 20)(next) // 1 MB
}

// MaxBodySizeBytes returns a middleware that caps request bodies at n bytes.
// Register it on a specific route AFTER the global MaxBodySize so it overrides
// the reader set by the outer middleware.
func MaxBodySizeBytes(n int64) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			r.Body = http.MaxBytesReader(w, r.Body, n)
			next.ServeHTTP(w, r)
		})
	}
}

// MaxBodySizeLarge is a convenience wrapper allowing up to 11 MB — intended
// for the media upload endpoint which calls ParseMultipartForm(10 MB).
func MaxBodySizeLarge(next http.Handler) http.Handler {
	return MaxBodySizeBytes(11 << 20)(next) // 11 MB (10 MB payload + multipart overhead)
}
