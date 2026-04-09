package middleware

import (
	"net"
	"net/http"
	"sync"
	"time"

	"golang.org/x/time/rate"

	"github.com/Cheikh-Nakamoto/RBS_Crew_SN/apps/api-go/internal/types"
)

type visitor struct {
	limiter  *rate.Limiter
	lastSeen time.Time
}

// realIP extracts the client IP from RemoteAddr only.
// X-Real-IP and X-Forwarded-For are NOT trusted here because they can be forged by any client.
// If a trusted reverse proxy is in use, configure it to overwrite RemoteAddr at the TCP level
// (e.g. via PROXY protocol) rather than relying on HTTP headers.
func realIP(req *http.Request) string {
	host, _, err := net.SplitHostPort(req.RemoteAddr)
	if err != nil {
		return req.RemoteAddr
	}
	return host
}

func RateLimit(r rate.Limit, b int) func(http.Handler) http.Handler {
	var (
		mu       sync.Mutex
		visitors = make(map[string]*visitor)
	)

	// Cleanup goroutine to remove inactive visitors
	go func() {
		for {
			time.Sleep(time.Minute)
			mu.Lock()
			for ip, v := range visitors {
				if time.Since(v.lastSeen) > 3*time.Minute {
					delete(visitors, ip)
				}
			}
			mu.Unlock()
		}
	}()

	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, req *http.Request) {
			ip := realIP(req)

			mu.Lock()
			v, exists := visitors[ip]
			if !exists {
				limiter := rate.NewLimiter(r, b)
				visitors[ip] = &visitor{limiter, time.Now()}
				mu.Unlock()
				next.ServeHTTP(w, req)
				return
			}

			v.lastSeen = time.Now()
			if !v.limiter.Allow() {
				mu.Unlock()
				types.WriteError(w, &types.AppError{
					StatusCode: 429,
					Message:    "Too Many Requests",
					Error:      "Rate Limit Exceeded",
				})
				return
			}
			mu.Unlock()

			next.ServeHTTP(w, req)
		})
	}
}
