package service

import (
	"context"
	"errors"
	"log/slog"

	db "github.com/Cheikh-Nakamoto/RBS_Crew_SN/apps/api-go/internal/db/queries"
	"github.com/Cheikh-Nakamoto/RBS_Crew_SN/apps/api-go/internal/model"
	"github.com/Cheikh-Nakamoto/RBS_Crew_SN/apps/api-go/internal/repository"
	"github.com/Cheikh-Nakamoto/RBS_Crew_SN/apps/api-go/internal/types"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
)

// ── Service ───────────────────────────────────────────────────────────────────

type UsersService struct {
	repo *repository.UsersRepository
	// authRepo sert à révoquer les sessions d'un utilisateur rétrogradé. Sans
	// cela, son ancien rôle survivrait dans les tokens déjà émis jusqu'à leur
	// expiration naturelle.
	authRepo *repository.AuthRepository
}

func NewUsersService(repo *repository.UsersRepository, authRepo *repository.AuthRepository) *UsersService {
	return &UsersService{repo: repo, authRepo: authRepo}
}

// ── GetMe ─────────────────────────────────────────────────────────────────────

func (s *UsersService) GetMe(ctx context.Context, userID string) (*model.UserProfileResponse, *types.AppError) {
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

func (s *UsersService) UpdateMe(ctx context.Context, userID string, dto model.UpdateUserDTO) (*model.UserProfileResponse, *types.AppError) {
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
		l := db.Locale(*dto.PreferredLocale)
		params.PreferredLocale = &l
	}

	row, err := s.repo.Update(ctx, params)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, types.NotFound("User not found")
		}
		return nil, types.InternalError("Failed to update user")
	}
	return &model.UserProfileResponse{
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

func (s *UsersService) GetAddresses(ctx context.Context, userID string) ([]model.AddressResponse, *types.AppError) {
	rows, err := s.repo.GetAddresses(ctx, userID)
	if err != nil {
		return nil, types.InternalError("Failed to fetch addresses")
	}
	result := make([]model.AddressResponse, 0, len(rows))
	for _, a := range rows {
		result = append(result, toAddressResponse(&a))
	}
	return result, nil
}

func (s *UsersService) AddAddress(ctx context.Context, userID string, dto model.CreateAddressDTO) (*model.AddressResponse, *types.AppError) {
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

func (s *UsersService) UpdateAddress(ctx context.Context, userID, addrID string, dto model.UpdateAddressDTO) (*model.AddressResponse, *types.AppError) {
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

func (s *UsersService) ListAll(ctx context.Context, search *string, page, limit int) (*types.PaginatedResponse[model.UserListItem], *types.AppError) {
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
	items := make([]model.UserListItem, 0, len(rows))
	for _, r := range rows {
		if total == 0 {
			total = int(r.TotalCount)
		}
		items = append(items, model.UserListItem{
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

func (s *UsersService) GetByID(ctx context.Context, id string) (*model.UserProfileResponse, *types.AppError) {
	row, err := s.repo.GetByID(ctx, id)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, types.NotFound("User not found")
		}
		return nil, types.InternalError("Database error")
	}
	return toProfileResponse(row), nil
}

func (s *UsersService) UpdateRole(ctx context.Context, id, role string) (*model.UserProfileResponse, *types.AppError) {
	// Rôle actuel lu AVANT la mise à jour : c'est la seule façon de savoir si le
	// changement retire des droits.
	previous := ""
	if before, err := s.repo.GetByID(ctx, id); err == nil {
		previous = string(before.Role)
	}

	r := db.UserRole(role)
	params := db.UpdateUserParams{ID: id, Role: &r}
	row, err := s.repo.Update(ctx, params)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, types.NotFound("User not found")
		}
		return nil, types.InternalError("Failed to update role")
	}

	// Rétrogradation : les tokens déjà émis portent encore l'ancien rôle et se
	// renouvellent tout seuls. Seule la suppression des sessions coupe court.
	if previous != "" && types.RoleLosesPrivileges(previous, role) {
		if dErr := s.authRepo.DeleteUserSessions(ctx, id); dErr != nil {
			slog.Error("users: failed to revoke sessions after demotion", "error", dErr, "userId", id)
			return nil, types.InternalError("Rôle modifié mais sessions non révoquées — réessayez")
		}
	}

	return &model.UserProfileResponse{
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

func toProfileResponse(row *db.GetUserByIDFullRow) *model.UserProfileResponse {
	return &model.UserProfileResponse{
		ID:              row.ID,
		Email:           row.Email,
		FirstName:       row.FirstName,
		LastName:        row.LastName,
		Phone:           row.Phone,
		Role:            string(row.Role),
		PreferredLocale: string(row.PreferredLocale),
		CreatedAt:       row.CreatedAt.Time,

		ArtistClaimStatus: string(row.ArtistClaimStatus),
		EmailVerified:     row.EmailVerified,
	}
}

func toAddressResponse(a *db.Address) model.AddressResponse {
	return model.AddressResponse{
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

// AdminVerifyEmail permet à un administrateur de débloquer un client dont
// l'e-mail de vérification n'arrive pas (spam, adresse invalide, panne SMTP).
// Sans ce filet, un tel client ne pourrait jamais commander.
func (s *UsersService) AdminVerifyEmail(ctx context.Context, userID string) *types.AppError {
	if _, err := s.repo.GetByID(ctx, userID); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return types.NotFound("User not found")
		}
		return types.InternalError("Database error")
	}
	if err := s.repo.MarkEmailVerified(ctx, userID); err != nil {
		slog.Error("users: admin verify email failed", "error", err, "userId", userID)
		return types.InternalError("Failed to verify email")
	}
	return nil
}
