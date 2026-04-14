package main

import (
	"context"
	"fmt"
	"os"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/joho/godotenv"
	"golang.org/x/crypto/bcrypt"
)

const bcryptCost = 12

func main() {
	_ = godotenv.Load()

	dbURL := getEnv("DATABASE_URL", "postgresql://rbs:password@localhost:5432/rbs_db")

	// Valeurs de l'admin — personnalisables via args ou variables d'env
	email := getEnv("ADMIN_EMAIL", "admin@rbscrew.sn")
	password := getEnv("ADMIN_PASSWORD", "")
	firstName := getEnv("ADMIN_FIRST_NAME", "Admin")
	lastName := getEnv("ADMIN_LAST_NAME", "RBS")

	if password == "" {
		fmt.Fprintln(os.Stderr, "Erreur : ADMIN_PASSWORD est requis (variable d'environnement ou .env)")
		os.Exit(1)
	}

	// Hash du mot de passe
	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcryptCost)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Erreur bcrypt : %v\n", err)
		os.Exit(1)
	}

	// Connexion PostgreSQL
	ctx := context.Background()
	conn, err := pgx.Connect(ctx, dbURL)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Erreur de connexion à la base : %v\n", err)
		os.Exit(1)
	}
	defer conn.Close(ctx)

	id := uuid.New().String()

	_, err = conn.Exec(ctx, `
		INSERT INTO "User" (
			"id", "email", "passwordHash",
			"firstName", "lastName",
			"role", "preferredLocale",
			"emailVerified",
			"createdAt", "updatedAt"
		) VALUES (
			$1, $2, $3,
			$4, $5,
			'ADMIN'::"UserRole", 'fr'::"Locale",
			true,
			NOW(), NOW()
		)
		ON CONFLICT ("email") DO UPDATE
			SET "role"         = 'ADMIN'::"UserRole",
			    "passwordHash" = EXCLUDED."passwordHash",
			    "updatedAt"    = NOW()
	`, id, email, string(hash), firstName, lastName)

	if err != nil {
		fmt.Fprintf(os.Stderr, "Erreur INSERT : %v\n", err)
		os.Exit(1)
	}

	fmt.Printf("Admin créé/mis à jour avec succès :\n  email : %s\n  nom   : %s %s\n", email, firstName, lastName)
}

func getEnv(key, fallback string) string {
	if v, ok := os.LookupEnv(key); ok && v != "" {
		return v
	}
	return fallback
}
