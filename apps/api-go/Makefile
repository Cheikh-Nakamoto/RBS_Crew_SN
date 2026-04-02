.PHONY: generate build dev test lint clean

# Default variables
APP_NAME=api-go
DIST_DIR=dist
BIN_NAME=$(DIST_DIR)/$(APP_NAME)
MAIN_FILE=./cmd/api

# Tools
SQLC=sqlc
SWAG=swag
GOLANGCI_LINT=golangci-lint

generate:
	@echo "==> Generating database code with sqlc..."
	$(SQLC) generate
	@echo "==> Generating swagger docs..."
	$(SWAG) init -g $(MAIN_FILE)/main.go -o docs --parseDependency

build: generate
	@echo "==> Building binary..."
	CGO_ENABLED=0 go build -ldflags="-s -w" -o $(BIN_NAME) $(MAIN_FILE)

dev:
	@echo "==> Running in development mode..."
	go run $(MAIN_FILE)

test:
	@echo "==> Running tests..."
	go test -race -cover ./...

lint:
	@echo "==> Running linter..."
	$(GOLANGCI_LINT) run ./...

clean:
	@echo "==> Cleaning up..."
	@rm -rf $(DIST_DIR)
	@rm -rf docs
