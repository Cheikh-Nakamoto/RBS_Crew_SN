# ── Stage 1: Build ──
FROM golang:1.26-alpine AS builder

# Install CA certificates and tzdata
RUN apk add --no-cache ca-certificates tzdata

WORKDIR /build

# Copy and download dependencies
COPY apps/api-go/go.mod apps/api-go/go.sum ./
RUN go mod download

# Copy the rest of the source code
COPY apps/api-go/ .

# Build the binary statically
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 \
    go build -ldflags="-s -w" -o /api-go ./cmd/api


# ── Stage 2: Runtime ──
FROM alpine:latest

# Install CA certificates and tzdata (also keeps compatibility if needed, though they could be copied from builder)
RUN apk add --no-cache ca-certificates tzdata

# Copy the binary
COPY --from=builder /api-go /api-go

# Expose the port
EXPOSE 4000

# Set entrypoint
ENTRYPOINT ["/api-go"]
