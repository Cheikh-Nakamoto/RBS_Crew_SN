package service

import (
	"context"
	"encoding/json"
	"errors"
	"time"

	db "github.com/Cheikh-Nakamoto/RBS_Crew_SN/apps/api-go/internal/db/queries"
	"github.com/Cheikh-Nakamoto/RBS_Crew_SN/apps/api-go/internal/model"
	"github.com/Cheikh-Nakamoto/RBS_Crew_SN/apps/api-go/internal/repository"
	"github.com/Cheikh-Nakamoto/RBS_Crew_SN/apps/api-go/internal/types"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
)

type FestivalService struct {
	repo *repository.FestivalRepository
}

func NewFestivalService(repo *repository.FestivalRepository) *FestivalService {
	return &FestivalService{repo: repo}
}

func (s *FestivalService) List(ctx context.Context, page, limit int) (*types.PaginatedResponse[model.FestivalResponse], *types.AppError) {
	rows, err := s.repo.List(ctx, int32(limit), int32((page-1)*limit))
	if err != nil {
		return nil, types.InternalError("Failed to fetch festival editions")
	}
	var total int
	results := make([]model.FestivalResponse, 0, len(rows))
	for _, row := range rows {
		if total == 0 {
			total = int(row.TotalCount)
		}
		translations, _ := s.repo.GetTranslations(ctx, row.ID)
		feObj := db.FestivalEdition{
			ID:            row.ID,
			Slug:          row.Slug,
			EditionNumber: row.EditionNumber,
			Year:          row.Year,
			City:          row.City,
			Country:       row.Country,
			Status:        row.Status,
			MainImage:     row.MainImage,
			HeroImage:     row.HeroImage,
			Gallery:       row.Gallery,
			Typography:    row.Typography,
			CreatedAt:     row.CreatedAt,
			UpdatedAt:     row.UpdatedAt,
			StartDate:     row.StartDate,
			EndDate:       row.EndDate,
			Venue:         row.Venue,
			VenueAddress:  row.VenueAddress,
			TicketUrl:     row.TicketUrl,
			VideoUrl:      row.VideoUrl,
		}
		artists, _ := s.repo.ListArtists(ctx, row.ID)
		results = append(results, toFestivalResponse(&feObj, translations, artists))
	}
	return types.Paginate(results, total, page, limit), nil
}

func (s *FestivalService) GetBySlug(ctx context.Context, slug string) (*model.FestivalResponse, *types.AppError) {
	f, err := s.repo.GetBySlug(ctx, slug)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, types.NotFound("Festival edition not found")
		}
		return nil, types.InternalError("Database error")
	}
	translations, _ := s.repo.GetTranslations(ctx, f.ID)
	artists, _ := s.repo.ListArtists(ctx, f.ID)
	res := toFestivalResponse(f, translations, artists)
	return &res, nil
}

// ── Admin CRUD ────────────────────────────────────────────────────────────────

func (s *FestivalService) toAdminResponse(ctx context.Context, f *db.FestivalEdition) model.AdminFestivalResponse {
	translations, _ := s.repo.GetTranslations(ctx, f.ID)
	trans := make([]model.AdminFestivalTranslation, 0, len(translations))
	for _, t := range translations {
		trans = append(trans, model.AdminFestivalTranslation{
			Locale: string(t.Locale), Title: t.ThemeName, Slug: f.Slug,
			ThemeName: &t.ThemeName, Summary: t.Summary, Content: t.Content,
		})
	}
	var gallery []string
	if len(f.Gallery) > 0 {
		_ = json.Unmarshal(f.Gallery, &gallery)
	}
	if gallery == nil {
		gallery = make([]string, 0)
	}

	// Load artists lineup
	festivalArtists, _ := s.repo.ListArtists(ctx, f.ID)
	artists := toArtistSummaries(festivalArtists)

	resp := model.AdminFestivalResponse{
		ID:               f.ID,
		Slug:             f.Slug,
		EditionNumber:    f.EditionNumber,
		Year:             f.Year,
		City:             f.City,
		Country:          f.Country,
		IsPublished:      f.Status == db.ProductStatusPUBLISHED,
		FeaturedImageUrl: f.MainImage,
		HeroImage:        f.HeroImage,
		Gallery:          gallery,
		Venue:            f.Venue,
		VenueAddress:     f.VenueAddress,
		TicketUrl:        f.TicketUrl,
		VideoUrl:         f.VideoUrl,
		Artists:          artists,
		Translations:     trans,
		CreatedAt:        f.CreatedAt.Time,
	}
	if f.StartDate.Valid {
		t := f.StartDate.Time
		resp.StartDate = &t
	}
	if f.EndDate.Valid {
		t := f.EndDate.Time
		resp.EndDate = &t
	}
	return resp
}

func (s *FestivalService) AdminList(ctx context.Context, page, limit int) (*types.PaginatedResponse[model.AdminFestivalResponse], *types.AppError) {
	rows, err := s.repo.AdminList(ctx, int32(limit), int32((page-1)*limit))
	if err != nil {
		return nil, types.InternalError("Failed to fetch festival editions")
	}
	var total int
	results := make([]model.AdminFestivalResponse, 0, len(rows))
	for _, row := range rows {
		if total == 0 && row.TotalCount > 0 {
			total = int(row.TotalCount)
		}
		fObj := row.FestivalEdition
		results = append(results, s.toAdminResponse(ctx, &fObj))
	}
	return types.Paginate(results, total, page, limit), nil
}

func (s *FestivalService) AdminGetByID(ctx context.Context, id string) (*model.AdminFestivalResponse, *types.AppError) {
	f, err := s.repo.GetByID(ctx, id)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, types.NotFound("Festival edition not found")
		}
		return nil, types.InternalError("Database error")
	}
	res := s.toAdminResponse(ctx, f)
	return &res, nil
}

func (s *FestivalService) AdminCreate(ctx context.Context, input model.AdminFestivalInput) (*model.AdminFestivalResponse, *types.AppError) {
	slug := ""
	if len(input.Translations) > 0 {
		slug = input.Translations[0].Slug
	}
	if slug == "" {
		return nil, types.BadRequest("Slug is required")
	}
	year := input.Year
	if year == 0 {
		year = int32(time.Now().Year())
	}
	status := db.ProductStatusDRAFT
	if input.IsPublished {
		status = db.ProductStatusPUBLISHED
	}
	country := "SN"
	if input.Country != nil && *input.Country != "" {
		country = *input.Country
	}
	galleryJSON, _ := json.Marshal(input.Gallery)

	params := db.CreateFestivalEditionParams{
		ID:            uuid.New().String(),
		Slug:          slug,
		EditionNumber: input.EditionNumber,
		Year:          year,
		Country:       country,
		Status:        status,
		City:          input.City,
		MainImage:     input.MainImage,
		HeroImage:     input.HeroImage,
		Gallery:       galleryJSON,
		Typography:    []byte("[]"),
		Venue:         input.Venue,
		VenueAddress:  input.VenueAddress,
		TicketUrl:     input.TicketUrl,
		VideoUrl:      input.VideoUrl,
	}
	if input.StartDate != nil {
		params.StartDate = pgtype.Timestamp{Time: *input.StartDate, Valid: true}
	}
	if input.EndDate != nil {
		params.EndDate = pgtype.Timestamp{Time: *input.EndDate, Valid: true}
	}

	f, err := s.repo.Create(ctx, params)
	if err != nil {
		return nil, types.InternalError("Failed to create festival edition")
	}
	for _, t := range input.Translations {
		themeName := t.Title
		_ = s.repo.UpsertTranslation(ctx, db.UpsertFestivalTranslationParams{
			ID:                uuid.New().String(),
			FestivalEditionId: f.ID,
			Locale:            db.Locale(t.Locale),
			ThemeName:         themeName,
			Summary:           t.Description,
			Content:           t.Content,
		})
	}
	res := s.toAdminResponse(ctx, f)
	return &res, nil
}

func (s *FestivalService) AdminUpdate(ctx context.Context, id string, input model.AdminFestivalInput) (*model.AdminFestivalResponse, *types.AppError) {
	status := db.NullProductStatus{Valid: true, ProductStatus: db.ProductStatusDRAFT}
	if input.IsPublished {
		status.ProductStatus = db.ProductStatusPUBLISHED
	}
	galleryJSON, _ := json.Marshal(input.Gallery)
	editionNum := &input.EditionNumber
	inputYear := &input.Year

	params := db.UpdateFestivalEditionParams{
		ID:            id,
		EditionNumber: editionNum,
		Year:          inputYear,
		City:          input.City,
		Country:       input.Country,
		Status:        status,
		MainImage:     input.MainImage,
		HeroImage:     input.HeroImage,
		Gallery:       galleryJSON,
		Venue:         input.Venue,
		VenueAddress:  input.VenueAddress,
		TicketUrl:     input.TicketUrl,
		VideoUrl:      input.VideoUrl,
	}
	if input.StartDate != nil {
		params.StartDate = pgtype.Timestamp{Time: *input.StartDate, Valid: true}
	}
	if input.EndDate != nil {
		params.EndDate = pgtype.Timestamp{Time: *input.EndDate, Valid: true}
	}

	f, err := s.repo.Update(ctx, params)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, types.NotFound("Festival edition not found")
		}
		return nil, types.InternalError("Failed to update festival edition")
	}
	for _, t := range input.Translations {
		themeName := t.Title
		_ = s.repo.UpsertTranslation(ctx, db.UpsertFestivalTranslationParams{
			ID:                uuid.New().String(),
			FestivalEditionId: f.ID,
			Locale:            db.Locale(t.Locale),
			ThemeName:         themeName,
			Summary:           t.Description,
			Content:           t.Content,
		})
	}
	res := s.toAdminResponse(ctx, f)
	return &res, nil
}

func (s *FestivalService) AdminDelete(ctx context.Context, id string) *types.AppError {
	if err := s.repo.Delete(ctx, id); err != nil {
		return types.InternalError("Failed to delete festival edition")
	}
	return nil
}

// AdminLinkArtist links an artist to a festival edition
func (s *FestivalService) AdminLinkArtist(ctx context.Context, festivalID string, input model.AdminFestivalArtistInput) *types.AppError {
	params := db.AddFestivalArtistParams{
		ID:                uuid.New().String(),
		FestivalEditionId: festivalID,
		ArtistId:          input.ArtistID,
		Role:              input.Role,
		StageOrder:        input.StageOrder,
	}
	if input.PerformanceDate != nil {
		params.PerformanceDate = pgtype.Timestamp{Time: *input.PerformanceDate, Valid: true}
	}
	if _, err := s.repo.AddArtist(ctx, params); err != nil {
		return types.InternalError("Failed to link artist to festival")
	}
	return nil
}

// AdminUnlinkArtist removes an artist from a festival edition
func (s *FestivalService) AdminUnlinkArtist(ctx context.Context, festivalID, artistID string) *types.AppError {
	if err := s.repo.RemoveArtist(ctx, festivalID, artistID); err != nil {
		return types.InternalError("Failed to unlink artist from festival")
	}
	return nil
}

// ── Helpers ───────────────────────────────────────────────────────────────────

func toArtistSummaries(rows []db.ListFestivalArtistsRow) []model.FestivalArtistSummary {
	summaries := make([]model.FestivalArtistSummary, 0, len(rows))
	for _, r := range rows {
		name := ""
		if r.ArtistName != nil {
			name = *r.ArtistName
		}
		s := model.FestivalArtistSummary{
			ArtistID:               r.ArtistId,
			ArtistName:             name,
			ArtistSlug:             r.ArtistSlug,
			ArtistAvatarUrl:        r.ArtistAvatarUrl,
			ArtistFeaturedImageUrl: r.ArtistFeaturedImageUrl,
			Role:                   r.Role,
			StageOrder:             r.StageOrder,
		}
		if r.PerformanceDate.Valid {
			t := r.PerformanceDate.Time
			s.PerformanceDate = &t
		}
		summaries = append(summaries, s)
	}
	return summaries
}

func toFestivalResponse(f *db.FestivalEdition, translations []db.FestivalTranslation, festivalArtists []db.ListFestivalArtistsRow) model.FestivalResponse {
	trans := make([]model.FestivalTranslation, 0, len(translations))
	for _, t := range translations {
		trans = append(trans, model.FestivalTranslation{
			Locale: string(t.Locale), ThemeName: t.ThemeName,
			Summary: t.Summary, Content: t.Content,
		})
	}

	var gallery []string
	if len(f.Gallery) > 0 {
		_ = json.Unmarshal(f.Gallery, &gallery)
	}
	if gallery == nil {
		gallery = make([]string, 0)
	}

	var typography []string
	if len(f.Typography) > 0 {
		_ = json.Unmarshal(f.Typography, &typography)
	}
	if typography == nil {
		typography = make([]string, 0)
	}

	resp := model.FestivalResponse{
		ID:            f.ID,
		Slug:          f.Slug,
		EditionNumber: f.EditionNumber,
		Year:          f.Year,
		City:          f.City,
		Country:       f.Country,
		Status:        string(f.Status),
		MainImage:     f.MainImage,
		HeroImage:     f.HeroImage,
		Gallery:       gallery,
		Typography:    typography,
		Venue:         f.Venue,
		VenueAddress:  f.VenueAddress,
		TicketUrl:     f.TicketUrl,
		VideoUrl:      f.VideoUrl,
		Translations:  trans,
		Artists:       toArtistSummaries(festivalArtists),
		CreatedAt:     f.CreatedAt.Time,
	}
	if f.StartDate.Valid {
		t := f.StartDate.Time
		resp.StartDate = &t
	}
	if f.EndDate.Valid {
		t := f.EndDate.Time
		resp.EndDate = &t
	}
	return resp
}
