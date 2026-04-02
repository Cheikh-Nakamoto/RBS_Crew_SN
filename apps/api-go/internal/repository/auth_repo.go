package repository

import (
	"context"

	db "github.com/Cheikh-Nakamoto/RBS_Crew_SN/apps/api-go/internal/db/queries"
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
