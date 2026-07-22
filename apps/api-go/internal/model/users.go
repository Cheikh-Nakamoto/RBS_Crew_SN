package model

import "time"

type UpdateUserDTO struct {
	FirstName       *string `json:"firstName"`
	LastName        *string `json:"lastName"`
	Phone           *string `json:"phone"`
	PreferredLocale *string `json:"preferredLocale" validate:"omitempty,oneof=fr en"`
}

type UpdateUserRoleDTO struct {
	// Doit rester aligné sur l'enum "UserRole" de sql/schema.sql.
	Role string `json:"role" validate:"required,oneof=CUSTOMER EDITOR ADMIN ARTIST"`
}

type CreateAddressDTO struct {
	Label      *string `json:"label"`
	FirstName  string  `json:"firstName"  validate:"required"`
	LastName   string  `json:"lastName"   validate:"required"`
	Company    *string `json:"company"`
	Line1      string  `json:"line1"      validate:"required"`
	Line2      *string `json:"line2"`
	City       string  `json:"city"       validate:"required"`
	PostalCode string  `json:"postalCode" validate:"required"`
	Country    string  `json:"country"    validate:"required,len=2"`
	IsDefault  bool    `json:"isDefault"`
}

type UpdateAddressDTO struct {
	Label      *string `json:"label"`
	FirstName  *string `json:"firstName"`
	LastName   *string `json:"lastName"`
	Company    *string `json:"company"`
	Line1      *string `json:"line1"`
	Line2      *string `json:"line2"`
	City       *string `json:"city"`
	PostalCode *string `json:"postalCode"`
	Country    *string `json:"country"`
	IsDefault  *bool   `json:"isDefault"`
}

type UserProfileResponse struct {
	ID              string    `json:"id"`
	Email           string    `json:"email"`
	FirstName       *string   `json:"firstName"`
	LastName        *string   `json:"lastName"`
	Phone           *string   `json:"phone"`
	Role            string    `json:"role"`
	PreferredLocale string    `json:"preferredLocale"`
	CreatedAt       time.Time `json:"createdAt"`
	// État de la demande « je suis un artiste RBS » : NONE, PENDING, APPROVED
	// ou REJECTED. Permet au profil d'afficher l'état sans requête dédiée.
	ArtistClaimStatus string `json:"artistClaimStatus"`
	// Nécessaire au checkout (blocage de la commande) et à l'affichage admin,
	// qui prétendait déjà l'afficher sans que l'API ne le renvoie.
	EmailVerified bool `json:"emailVerified"`
}

type AddressResponse struct {
	ID         string  `json:"id"`
	Label      *string `json:"label"`
	FirstName  string  `json:"firstName"`
	LastName   string  `json:"lastName"`
	Company    *string `json:"company"`
	Line1      string  `json:"line1"`
	Line2      *string `json:"line2"`
	City       string  `json:"city"`
	PostalCode string  `json:"postalCode"`
	Country    string  `json:"country"`
	IsDefault  bool    `json:"isDefault"`
}

type UserListItem struct {
	ID              string    `json:"id"`
	Email           string    `json:"email"`
	FirstName       *string   `json:"firstName"`
	LastName        *string   `json:"lastName"`
	Role            string    `json:"role"`
	PreferredLocale string    `json:"preferredLocale"`
	Phone           *string   `json:"phone"`
	CreatedAt       time.Time `json:"createdAt"`
}
