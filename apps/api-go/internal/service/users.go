package service

import (
	"context"
	"errors"
	"time"

	db "github.com/Cheikh-Nakamoto/RBS_Crew_SN/apps/api-go/internal/db/queries"
	"github.com/Cheikh-Nakamoto/RBS_Crew_SN/apps/api-go/internal/repository"
	"github.com/Cheikh-Nakamoto/RBS_Crew_SN/apps/api-go/internal/types"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
)

// ── DTOs ─────────────────────────────────────────────────────────────────────

type UpdateUserDTO struct {
	FirstName       *string `json:"firstName"`
	LastName        *string `json:"lastName"`
	Phone           *string `json:"phone"`
	PreferredLocale *string `json:"preferredLocale" validate:"omitempty,oneof=fr en"`
}

type UpdateUserRoleDTO struct {
	Role string `json:"role" validate:"required,oneof=CUSTOMER EDITOR ADMIN"`
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

// ── Response types ────────────────────────────────────────────────────────────

type UserProfileResponse struct {
	ID              string    `json:"id"`
	Email           string    `json:"email"`
	FirstName       *string   `json:"firstName"`
	LastName        *string   `json:"lastName"`
	Phone           *string   `json:"phone"`
	Role            string    `json:"role"`
	PreferredLocale string    `json:"preferredLocale"`
	CreatedAt       time.Time `json:"createdAt"`
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

// ── Service ───────────────────────────────────────────────────────────────────

type UsersService struct {
	repo *repository.UsersRepository
}

func NewUsersService(repo *repository.UsersRepository) *UsersService {
	return &UsersService{repo: repo}
}

// ── GetMe ─────────────────────────────────────────────────────────────────────

func (s *UsersService) GetMe(ctx context.Context, userID string) (*UserProfileResponse, *types.AppError) {
	row, err := s.repo.GetByID(ctx, userID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, types.NotFound("User not found")
		}
		return nil, types.InternalError("Database error")
	}
	return toProfileResponse(row), nil
}

// ── UpdateMe ──────────────────────────────────────────────────────────────────

func (s *UsersService) UpdateMe(ctx context.Context, userID string, dto UpdateUserDTO) (*UserProfileResponse, *types.AppError) {
	params := db.UpdateUserParams{ID: userID}
	if dto.FirstName != nil {
		params.FirstName = dto.FirstName
	}
	if dto.LastName != nil {
		params.LastName = dto.LastName
	}
	if dto.Phone != nil {
		params.Phone = dto.Phone
	}
	if dto.PreferredLocale != nil {
		params.PreferredLocale = db.NullLocale{Locale: db.Locale(*dto.PreferredLocale), Valid: true}
	}

	row, err := s.repo.Update(ctx, params)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, types.NotFound("User not found")
		}
		return nil, types.InternalError("Failed to update user")
	}
	return &UserProfileResponse{
		ID:              row.ID,
		Email:           row.Email,
		FirstName:       row.FirstName,
		LastName:        row.LastName,
		Phone:           row.Phone,
		Role:            string(row.Role),
		PreferredLocale: string(row.PreferredLocale),
		CreatedAt:       row.CreatedAt.Time,
	}, nil
}

// ── DeleteMe ──────────────────────────────────────────────────────────────────

func (s *UsersService) DeleteMe(ctx context.Context, userID string) *types.AppError {
	if err := s.repo.Delete(ctx, userID); err != nil {
		return types.InternalError("Failed to delete account")
	}
	return nil
}

// ── Addresses ─────────────────────────────────────────────────────────────────

func (s *UsersService) GetAddresses(ctx context.Context, userID string) ([]AddressResponse, *types.AppError) {
	rows, err := s.repo.GetAddresses(ctx, userID)
	if err != nil {
		return nil, types.InternalError("Failed to fetch addresses")
	}
	result := make([]AddressResponse, 0, len(rows))
	for _, a := range rows {
		result = append(result, toAddressResponse(&a))
	}
	return result, nil
}

func (s *UsersService) AddAddress(ctx context.Context, userID string, dto CreateAddressDTO) (*AddressResponse, *types.AppError) {
	// If isDefault, unset all others first
	if dto.IsDefault {
		if err := s.repo.UnsetDefaultAddresses(ctx, userID); err != nil {
			return nil, types.InternalError("Database error")
		}
	}

	params := db.CreateAddressParams{
		ID:         uuid.New().String(),
		UserId:     userID,
		Label:      dto.Label,
		FirstName:  dto.FirstName,
		LastName:   dto.LastName,
		Company:    dto.Company,
		Line1:      dto.Line1,
		Line2:      dto.Line2,
		City:       dto.City,
		PostalCode: dto.PostalCode,
		Country:    dto.Country,
		IsDefault:  dto.IsDefault,
	}
	addr, err := s.repo.CreateAddress(ctx, params)
	if err != nil {
		return nil, types.InternalError("Failed to create address")
	}
	res := toAddressResponse(addr)
	return &res, nil
}

func (s *UsersService) UpdateAddress(ctx context.Context, userID, addrID string, dto UpdateAddressDTO) (*AddressResponse, *types.AppError) {
	// Ownership check
	existing, err := s.repo.GetAddressByID(ctx, addrID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, types.NotFound("Address not found")
		}
		return nil, types.InternalError("Database error")
	}
	if existing.UserId != userID {
		return nil, types.Forbidden("Address does not belong to you")
	}

	if dto.IsDefault != nil && *dto.IsDefault {
		if err := s.repo.UnsetDefaultAddresses(ctx, userID); err != nil {
			return nil, types.InternalError("Database error")
		}
	}

	params := db.UpdateAddressParams{
		ID:         addrID,
		Label:      dto.Label,
		FirstName:  dto.FirstName,
		LastName:   dto.LastName,
		Company:    dto.Company,
		Line1:      dto.Line1,
		Line2:      dto.Line2,
		City:       dto.City,
		PostalCode: dto.PostalCode,
		Country:    dto.Country,
		IsDefault:  dto.IsDefault,
	}
	addr, err := s.repo.UpdateAddress(ctx, params)
	if err != nil {
		return nil, types.InternalError("Failed to update address")
	}
	res := toAddressResponse(addr)
	return &res, nil
}

func (s *UsersService) DeleteAddress(ctx context.Context, userID, addrID string) *types.AppError {
	existing, err := s.repo.GetAddressByID(ctx, addrID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return types.NotFound("Address not found")
		}
		return types.InternalError("Database error")
	}
	if existing.UserId != userID {
		return types.Forbidden("Address does not belong to you")
	}
	if err := s.repo.DeleteAddress(ctx, addrID); err != nil {
		return types.InternalError("Failed to delete address")
	}
	return nil
}

// ── Admin ─────────────────────────────────────────────────────────────────────

func (s *UsersService) ListAll(ctx context.Context, search *string, page, limit int) (*types.PaginatedResponse[UserListItem], *types.AppError) {
	params := db.ListUsersParams{
		Limit:  int32(limit),
		Offset: int32((page - 1) * limit),
		Search: search,
	}
	rows, err := s.repo.List(ctx, params)
	if err != nil {
		return nil, types.InternalError("Failed to fetch users")
	}
	var total int
	items := make([]UserListItem, 0, len(rows))
	for _, r := range rows {
		if total == 0 {
			total = int(r.TotalCount)
		}
		items = append(items, UserListItem{
			ID:              r.ID,
			Email:           r.Email,
			FirstName:       r.FirstName,
			LastName:        r.LastName,
			Role:            string(r.Role),
			PreferredLocale: string(r.PreferredLocale),
			Phone:           r.Phone,
			CreatedAt:       r.CreatedAt.Time,
		})
	}
	return types.Paginate(items, total, page, limit), nil
}

func (s *UsersService) GetByID(ctx context.Context, id string) (*UserProfileResponse, *types.AppError) {
	row, err := s.repo.GetByID(ctx, id)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, types.NotFound("User not found")
		}
		return nil, types.InternalError("Database error")
	}
	return toProfileResponse(row), nil
}

func (s *UsersService) UpdateRole(ctx context.Context, id, role string) (*UserProfileResponse, *types.AppError) {
	r := db.UserRole(role)
	params := db.UpdateUserParams{ID: id, Role: db.NullUserRole{UserRole: r, Valid: true}}
	row, err := s.repo.Update(ctx, params)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, types.NotFound("User not found")
		}
		return nil, types.InternalError("Failed to update role")
	}
	return &UserProfileResponse{
		ID:              row.ID,
		Email:           row.Email,
		FirstName:       row.FirstName,
		LastName:        row.LastName,
		Phone:           row.Phone,
		Role:            string(row.Role),
		PreferredLocale: string(row.PreferredLocale),
		CreatedAt:       row.CreatedAt.Time,
	}, nil
}

func (s *UsersService) AdminDelete(ctx context.Context, id string) *types.AppError {
	if err := s.repo.Delete(ctx, id); err != nil {
		return types.InternalError("Failed to delete user")
	}
	return nil
}

// ── helpers ───────────────────────────────────────────────────────────────────

func toProfileResponse(row *db.GetUserByIDFullRow) *UserProfileResponse {
	return &UserProfileResponse{
		ID:              row.ID,
		Email:           row.Email,
		FirstName:       row.FirstName,
		LastName:        row.LastName,
		Phone:           row.Phone,
		Role:            string(row.Role),
		PreferredLocale: string(row.PreferredLocale),
		CreatedAt:       row.CreatedAt.Time,
	}
}

func toAddressResponse(a *db.Address) AddressResponse {
	return AddressResponse{
		ID:         a.ID,
		Label:      a.Label,
		FirstName:  a.FirstName,
		LastName:   a.LastName,
		Company:    a.Company,
		Line1:      a.Line1,
		Line2:      a.Line2,
		City:       a.City,
		PostalCode: a.PostalCode,
		Country:    a.Country,
		IsDefault:  a.IsDefault,
	}
}
