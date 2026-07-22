package model

import "time"

type ArtistTranslation struct {
	Locale string  `json:"locale"`
	Name   string  `json:"name"`
	Bio    *string `json:"bio"`
}

type ArtistArtwork struct {
	ID       string `json:"id"`
	ImageURL string `json:"imageUrl"`
	Position int32  `json:"position"`
}

type ArtistResponse struct {
	ID               string              `json:"id"`
	Slug             string              `json:"slug"`
	City             *string             `json:"city"`
	Country          *string             `json:"country"`
	FeaturedImageURL *string             `json:"featuredImageUrl"`
	AvatarURL        *string             `json:"avatarUrl"`
	InstagramURL     *string             `json:"instagramUrl"`
	Genre            *string             `json:"genre"`
	Nationality      *string             `json:"nationality"`
	FacebookUrl      *string             `json:"facebookUrl"`
	TwitterUrl       *string             `json:"twitterUrl"`
	YoutubeUrl       *string             `json:"youtubeUrl"`
	TiktokUrl        *string             `json:"tiktokUrl"`
	WebsiteUrl       *string             `json:"websiteUrl"`
	SpotifyUrl       *string             `json:"spotifyUrl"`
	SoundcloudUrl    *string             `json:"soundcloudUrl"`
	VideoUrl         *string             `json:"videoUrl"`
	Status           string              `json:"status"`
	Translations     []ArtistTranslation `json:"translations"`
	Artworks         []ArtistArtwork     `json:"artworks"`
	CreatedAt        time.Time           `json:"createdAt"`
}

type AdminArtistTranslation struct {
	Locale      string  `json:"locale"`
	Title       string  `json:"title"`
	Slug        string  `json:"slug"`
	Description *string `json:"description"`
}

type AdminArtistResponse struct {
	ID               string                   `json:"id"`
	Slug             string                   `json:"slug"`
	City             *string                  `json:"city"`
	Country          *string                  `json:"country"`
	AvatarURL        *string                  `json:"avatarUrl"`
	FeaturedImageURL *string                  `json:"featuredImageUrl"`
	InstagramUrl     *string                  `json:"instagramUrl"`
	Genre            *string                  `json:"genre"`
	Nationality      *string                  `json:"nationality"`
	FacebookUrl      *string                  `json:"facebookUrl"`
	TwitterUrl       *string                  `json:"twitterUrl"`
	YoutubeUrl       *string                  `json:"youtubeUrl"`
	TiktokUrl        *string                  `json:"tiktokUrl"`
	WebsiteUrl       *string                  `json:"websiteUrl"`
	SpotifyUrl       *string                  `json:"spotifyUrl"`
	SoundcloudUrl    *string                  `json:"soundcloudUrl"`
	VideoUrl         *string                  `json:"videoUrl"`
	Gallery          []string                 `json:"gallery"`
	IsPublished      bool                     `json:"isPublished"`
	Translations     []AdminArtistTranslation `json:"translations"`
	CreatedAt        time.Time                `json:"createdAt"`
	// État du compte permettant à l'artiste de gérer sa fiche lui-même.
	// Dérivé de Artist.userId et User.emailVerified — aucun stockage dédié.
	AccountEmail  *string `json:"accountEmail"`
	AccountStatus string  `json:"accountStatus"` // "none" | "invited" | "active"
}

type AdminArtistInput struct {
	City             *string  `json:"city"`
	Country          *string  `json:"country"`
	AvatarURL        *string  `json:"avatarUrl"`
	FeaturedImageURL *string  `json:"featuredImageUrl"`
	InstagramUrl     *string  `json:"instagramUrl"`
	Genre            *string  `json:"genre"`
	Nationality      *string  `json:"nationality"`
	FacebookUrl      *string  `json:"facebookUrl"`
	TwitterUrl       *string  `json:"twitterUrl"`
	YoutubeUrl       *string  `json:"youtubeUrl"`
	TiktokUrl        *string  `json:"tiktokUrl"`
	WebsiteUrl       *string  `json:"websiteUrl"`
	SpotifyUrl       *string  `json:"spotifyUrl"`
	SoundcloudUrl    *string  `json:"soundcloudUrl"`
	VideoUrl         *string  `json:"videoUrl"`
	Gallery          []string `json:"gallery"`
	IsPublished      bool     `json:"isPublished"`
	Translations     []struct {
		Locale      string  `json:"locale"`
		Title       string  `json:"title"`
		Slug        string  `json:"slug"`
		Description *string `json:"description"`
	} `json:"translations"`
}

// ── Self-service artiste ─────────────────────────────────────────────────────

// ArtistSelfTranslation : contenu éditorial traduit d'une fiche artiste.
// Volontairement dépourvu de `slug`, réservé à l'administration.
type ArtistSelfTranslation struct {
	Locale string  `json:"locale" validate:"required,oneof=fr en"`
	Name   string  `json:"name"   validate:"required"`
	Bio    *string `json:"bio"`
}

// ArtistSelfUpdateInput : champs qu'un artiste peut modifier sur SA fiche.
//
// Volontairement dépourvu de Slug, IsPublished/Status, de la galerie (gérée par
// les endpoints artworks) et du rattachement aux éditions du festival — tous
// réservés à l'administration. Ne jamais fusionner avec AdminArtistInput : c'est
// la séparation des deux structures qui garantit qu'un champ réservé ne peut pas
// arriver par le corps de la requête.
type ArtistSelfUpdateInput struct {
	City             *string                 `json:"city"`
	Country          *string                 `json:"country"`
	Genre            *string                 `json:"genre"`
	Nationality      *string                 `json:"nationality"`
	AvatarURL        *string                 `json:"avatarUrl"`
	FeaturedImageURL *string                 `json:"featuredImageUrl"`
	InstagramUrl     *string                 `json:"instagramUrl"`
	FacebookUrl      *string                 `json:"facebookUrl"`
	TwitterUrl       *string                 `json:"twitterUrl"`
	YoutubeUrl       *string                 `json:"youtubeUrl"`
	TiktokUrl        *string                 `json:"tiktokUrl"`
	WebsiteUrl       *string                 `json:"websiteUrl"`
	SpotifyUrl       *string                 `json:"spotifyUrl"`
	SoundcloudUrl    *string                 `json:"soundcloudUrl"`
	VideoUrl         *string                 `json:"videoUrl"`
	Translations     []ArtistSelfTranslation `json:"translations" validate:"dive"`
}

// ArtistSelfResponse : la fiche telle que l'artiste la voit. `slug` et
// `isPublished` y figurent en LECTURE SEULE — ils informent l'artiste de l'état
// de sa page sans qu'il puisse les modifier.
type ArtistSelfResponse struct {
	ID               string                  `json:"id"`
	Slug             string                  `json:"slug"`
	IsPublished      bool                    `json:"isPublished"`
	City             *string                 `json:"city"`
	Country          *string                 `json:"country"`
	Genre            *string                 `json:"genre"`
	Nationality      *string                 `json:"nationality"`
	AvatarURL        *string                 `json:"avatarUrl"`
	FeaturedImageURL *string                 `json:"featuredImageUrl"`
	InstagramUrl     *string                 `json:"instagramUrl"`
	FacebookUrl      *string                 `json:"facebookUrl"`
	TwitterUrl       *string                 `json:"twitterUrl"`
	YoutubeUrl       *string                 `json:"youtubeUrl"`
	TiktokUrl        *string                 `json:"tiktokUrl"`
	WebsiteUrl       *string                 `json:"websiteUrl"`
	SpotifyUrl       *string                 `json:"spotifyUrl"`
	SoundcloudUrl    *string                 `json:"soundcloudUrl"`
	VideoUrl         *string                 `json:"videoUrl"`
	Gallery          []string                `json:"gallery"`
	Translations     []ArtistSelfTranslation `json:"translations"`
}

// ArtistArtworkInput : ajout d'une œuvre au portfolio.
type ArtistArtworkInput struct {
	ImageURL string `json:"imageUrl" validate:"required,url"`
	Position *int32 `json:"position"`
}

// ArtistInviteInput : rattachement d'un compte à une fiche artiste (admin).
type ArtistInviteInput struct {
	Email string `json:"email" validate:"required,email"`
}
