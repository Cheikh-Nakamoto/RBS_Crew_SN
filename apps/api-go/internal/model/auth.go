package model

import "time"

type RegisterRequest struct {
	Email     string  `json:"email"     validate:"required,email"`
	Password  string  `json:"password"  validate:"required,password_strength"`
	FirstName *string `json:"firstName"`
	LastName  *string `json:"lastName"`
	Phone     *string `json:"phone"`
	// Case « es-tu un artiste de RBS ? ». N'accorde AUCUN privilège : elle
	// enregistre seulement une demande qu'un administrateur devra valider.
	IsArtist bool `json:"isArtist"`
}

type LoginRequest struct {
	Email    string `json:"email"    validate:"required,email"`
	Password string `json:"password" validate:"required"`
}

type RefreshRequest struct {
	RefreshToken string `json:"refreshToken" validate:"required"`
}

type TokenPair struct {
	AccessToken  string `json:"accessToken"`
	RefreshToken string `json:"refreshToken"`
}

type UserResponse struct {
	ID              string    `json:"id"`
	Email           string    `json:"email"`
	FirstName       *string   `json:"firstName"`
	LastName        *string   `json:"lastName"`
	Role            string    `json:"role"`
	PreferredLocale string    `json:"preferredLocale"`
	CreatedAt       time.Time `json:"createdAt"`
}

type AuthResponse struct {
	User         UserResponse `json:"user"`
	AccessToken  string       `json:"accessToken"`
	RefreshToken string       `json:"refreshToken"`
}
