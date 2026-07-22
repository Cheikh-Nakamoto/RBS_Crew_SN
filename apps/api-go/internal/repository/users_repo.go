package repository

import (
	"context"

	db "github.com/Cheikh-Nakamoto/RBS_Crew_SN/apps/api-go/internal/db/queries"
	"github.com/jackc/pgx/v5/pgxpool"
)

type UsersRepository struct {
	q    *db.Queries
	pool *pgxpool.Pool
}

func NewUsersRepository(pool *pgxpool.Pool) *UsersRepository {
	return &UsersRepository{q: db.New(pool), pool: pool}
}

func (r *UsersRepository) List(ctx context.Context, params db.ListUsersParams) ([]db.ListUsersRow, error) {
	return r.q.ListUsers(ctx, params)
}

func (r *UsersRepository) GetByID(ctx context.Context, id string) (*db.GetUserByIDFullRow, error) {
	u, err := r.q.GetUserByIDFull(ctx, id)
	if err != nil {
		return nil, err
	}
	return &u, nil
}

func (r *UsersRepository) Update(ctx context.Context, params db.UpdateUserParams) (*db.UpdateUserRow, error) {
	u, err := r.q.UpdateUser(ctx, params)
	if err != nil {
		return nil, err
	}
	return &u, nil
}

func (r *UsersRepository) Delete(ctx context.Context, id string) error {
	return r.q.DeleteUser(ctx, id)
}

func (r *UsersRepository) GetAddresses(ctx context.Context, userID string) ([]db.Address, error) {
	return r.q.GetUserAddresses(ctx, userID)
}

func (r *UsersRepository) GetAddressByID(ctx context.Context, id string) (*db.Address, error) {
	a, err := r.q.GetAddressByID(ctx, id)
	if err != nil {
		return nil, err
	}
	return &a, nil
}

func (r *UsersRepository) CreateAddress(ctx context.Context, params db.CreateAddressParams) (*db.Address, error) {
	a, err := r.q.CreateAddress(ctx, params)
	if err != nil {
		return nil, err
	}
	return &a, nil
}

func (r *UsersRepository) UpdateAddress(ctx context.Context, params db.UpdateAddressParams) (*db.Address, error) {
	a, err := r.q.UpdateAddress(ctx, params)
	if err != nil {
		return nil, err
	}
	return &a, nil
}

func (r *UsersRepository) DeleteAddress(ctx context.Context, id string) error {
	return r.q.DeleteAddress(ctx, id)
}

func (r *UsersRepository) UnsetDefaultAddresses(ctx context.Context, userID string) error {
	return r.q.UnsetDefaultAddresses(ctx, userID)
}

// MarkEmailVerified réutilise la requête SetEmailVerified déjà définie pour le
// flux d'inscription — aucune requête SQL supplémentaire n'est nécessaire.
func (r *UsersRepository) MarkEmailVerified(ctx context.Context, id string) error {
	return r.q.SetEmailVerified(ctx, id)
}
