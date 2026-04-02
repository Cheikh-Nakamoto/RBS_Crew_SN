package main

import (
	"context"
	"fmt"
	"os"

	"github.com/Cheikh-Nakamoto/RBS_Crew_SN/apps/api-go/internal/config"
	"github.com/Cheikh-Nakamoto/RBS_Crew_SN/apps/api-go/internal/db"
	dbq "github.com/Cheikh-Nakamoto/RBS_Crew_SN/apps/api-go/internal/db/queries"
)

func main() {
	os.Chdir("apps/api-go")
	cfg, err := config.Load()
	if err != nil {
		fmt.Printf("Config error: %v\n", err)
		return
	}
	pool, err := db.NewPool(context.Background(), cfg.DatabaseURL)
	if err != nil {
		fmt.Printf("DB connection error: %v\n", err)
		return
	}
	defer pool.Close()

	repo := dbq.New(pool)
	params := dbq.ListProductsParams{Limit: 20}
	rows, err := repo.ListProducts(context.Background(), params)
	if err != nil {
		fmt.Printf("ListProducts ERROR: %v\n", err)
		return
	}
	fmt.Printf("Success! Fetched %d products\n", len(rows))
}
