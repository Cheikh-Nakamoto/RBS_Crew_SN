# ── Stage 1: Build ──
FROM golang:1.26-bookworm AS builder

WORKDIR /build

# Copy and download dependencies
COPY apps/api-go/go.mod apps/api-go/go.sum ./
RUN go mod download

# Copy the rest of the source code
COPY apps/api-go/ .

# Build the binary with CGO enabled to use glibc DNS resolver (fixes IPv6 SERVFAIL on Jenkins)
RUN CGO_ENABLED=1 GOOS=linux GOARCH=amd64 \
    go build -ldflags="-s -w" -o /api-go ./cmd/api


# ── Stage 2: Runtime ──
FROM debian:bookworm-slim

# Install CA certificates, tzdata and wget
RUN apt-get update && \
    apt-get install -y --no-install-recommends ca-certificates tzdata wget && \
    rm -rf /var/lib/apt/lists/*

# Copy the binary
COPY --from=builder /api-go /api-go

# Expose the port
EXPOSE 4000

# Set entrypoint
ENTRYPOINT ["/api-go"]
