package repository

import (
	"context"

	db "github.com/Cheikh-Nakamoto/RBS_Crew_SN/apps/api-go/internal/db/queries"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
)

type AuthRepository struct {
	q    *db.Queries
	pool *pgxpool.Pool
}

func NewAuthRepository(pool *pgxpool.Pool) *AuthRepository {
	return &AuthRepository{q: db.New(pool), pool: pool}
}

func (r *AuthRepository) GetUserByEmail(ctx context.Context, email string) (*db.User, error) {
	user, err := r.q.GetUserByEmail(ctx, email)
	if err != nil {
		return nil, err
	}
	return &user, nil
}

func (r *AuthRepository) CreateUser(ctx context.Context, params db.CreateUserParams) (*db.User, error) {
	user, err := r.q.CreateUser(ctx, params)
	if err != nil {
		return nil, err
	}
	return &user, nil
}

func (r *AuthRepository) GetUserByID(ctx context.Context, id string) (*db.GetUserByIDRow, error) {
	user, err := r.q.GetUserByID(ctx, id)
	if err != nil {
		return nil, err
	}
	return &user, nil
}

func (r *AuthRepository) CreateSession(ctx context.Context, params db.CreateSessionParams) (*db.UserSession, error) {
	session, err := r.q.CreateSession(ctx, params)
	if err != nil {
		return nil, err
	}
	return &session, nil
}

func (r *AuthRepository) GetActiveSessionsByUser(ctx context.Context, userID string) ([]db.UserSession, error) {
	return r.q.GetActiveSessionsByUser(ctx, userID)
}

func (r *AuthRepository) DeleteUserSessions(ctx context.Context, userID string) error {
	return r.q.DeleteUserSessions(ctx, userID)
}

// DeleteExpiredSessions purge les sessions dont le refresh token n'est plus
// valide. Sans balayage périodique, la table s'accumule indéfiniment (aucune
// autre voie ne supprime les sessions qu'un utilisateur laisse expirer sans
// jamais se reconnecter), ce qui ralentit la boucle bcrypt de Refresh.
func (r *AuthRepository) DeleteExpiredSessions(ctx context.Context) (int64, error) {
	return r.q.DeleteExpiredSessions(ctx)
}

func (r *AuthRepository) DeleteSession(ctx context.Context, id string) error {
	_, err := r.pool.Exec(ctx, `DELETE FROM "UserSession" WHERE "id" = $1`, id)
	return err
}

func (r *AuthRepository) SetPasswordResetToken(ctx context.Context, email string, token *string, expiry pgtype.Timestamp) error {
	return r.q.SetPasswordResetToken(ctx, db.SetPasswordResetTokenParams{
		Email:            email,
		ResetToken:       token,
		ResetTokenExpiry: expiry,
	})
}

func (r *AuthRepository) GetUserByResetToken(ctx context.Context, token *string) (*db.GetUserByResetTokenRow, error) {
	row, err := r.q.GetUserByResetToken(ctx, token)
	if err != nil {
		return nil, err
	}
	return &row, nil
}

func (r *AuthRepository) ClearResetToken(ctx context.Context, id, passwordHash string) error {
	return r.q.ClearResetToken(ctx, db.ClearResetTokenParams{
		ID:           id,
		PasswordHash: passwordHash,
	})
}

func (r *AuthRepository) SetEmailVerificationToken(ctx context.Context, id string, token *string, expiry pgtype.Timestamp) error {
	return r.q.SetEmailVerificationToken(ctx, db.SetEmailVerificationTokenParams{
		ID:                           id,
		EmailVerificationToken:       token,
		EmailVerificationTokenExpiry: expiry,
	})
}

func (r *AuthRepository) GetUserByEmailVerificationToken(ctx context.Context, token *string) (*db.GetUserByEmailVerificationTokenRow, error) {
	row, err := r.q.GetUserByEmailVerificationToken(ctx, token)
	if err != nil {
		return nil, err
	}
	return &row, nil
}

func (r *AuthRepository) SetEmailVerified(ctx context.Context, id string) error {
	return r.q.SetEmailVerified(ctx, id)
}

// CreateUserWithRole provisionne un compte avec un rôle explicite (CreateUser
// fige CUSTOMER). Utilisé pour les comptes artiste créés par un administrateur.
func (r *AuthRepository) CreateUserWithRole(ctx context.Context, params db.CreateUserWithRoleParams) (*db.User, error) {
	u, err := r.q.CreateUserWithRole(ctx, params)
	if err != nil {
		return nil, err
	}
	return &u, nil
}

func (r *AuthRepository) UpdateRole(ctx context.Context, id string, role db.UserRole) (*db.User, error) {
	u, err := r.q.UpdateUserRole(ctx, db.UpdateUserRoleParams{ID: id, Column2: role})
	if err != nil {
		return nil, err
	}
	return &u, nil
}

// ── Demandes artiste ─────────────────────────────────────────────────────────

func (r *AuthRepository) SubmitArtistClaim(ctx context.Context, userID string, note *string) (*db.User, error) {
	u, err := r.q.SubmitArtistClaim(ctx, db.SubmitArtistClaimParams{ID: userID, ArtistClaimNote: note})
	if err != nil {
		return nil, err
	}
	return &u, nil
}

func (r *AuthRepository) ListArtistClaims(ctx context.Context, status db.ArtistClaimStatus) ([]db.ListArtistClaimsRow, error) {
	return r.q.ListArtistClaims(ctx, status)
}

func (r *AuthRepository) SetArtistClaimStatus(ctx context.Context, userID string, status db.ArtistClaimStatus) (*db.User, error) {
	u, err := r.q.SetArtistClaimStatus(ctx, db.SetArtistClaimStatusParams{ID: userID, Column2: status})
	if err != nil {
		return nil, err
	}
	return &u, nil
}
