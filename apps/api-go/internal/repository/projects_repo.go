package repository

import (
	"context"

	db "github.com/Cheikh-Nakamoto/RBS_Crew_SN/apps/api-go/internal/db/queries"
	"github.com/jackc/pgx/v5/pgxpool"
)

type ProjectsRepository struct {
	q    *db.Queries
	pool *pgxpool.Pool
}

func NewProjectsRepository(pool *pgxpool.Pool) *ProjectsRepository {
	return &ProjectsRepository{q: db.New(pool), pool: pool}
}

func (r *ProjectsRepository) List(ctx context.Context, limit, offset int32) ([]db.ListProjectsRow, error) {
	return r.q.ListProjects(ctx, db.ListProjectsParams{Limit: limit, Offset: offset})
}

func (r *ProjectsRepository) GetBySlug(ctx context.Context, slug string) (*db.Project, error) {
	p, err := r.q.GetProjectBySlug(ctx, slug)
	if err != nil {
		return nil, err
	}
	return &p, nil
}

func (r *ProjectsRepository) GetByID(ctx context.Context, id string) (*db.Project, error) {
	p, err := r.q.GetProjectByID(ctx, id)
	if err != nil {
		return nil, err
	}
	return &p, nil
}

func (r *ProjectsRepository) GetTranslations(ctx context.Context, id string) ([]db.ProjectTranslation, error) {
	return r.q.GetProjectTranslations(ctx, id)
}

func (r *ProjectsRepository) Create(ctx context.Context, params db.CreateProjectParams) (*db.Project, error) {
	p, err := r.q.CreateProject(ctx, params)
	if err != nil {
		return nil, err
	}
	return &p, nil
}

func (r *ProjectsRepository) UpsertTranslation(ctx context.Context, params db.UpsertProjectTranslationParams) error {
	_, err := r.q.UpsertProjectTranslation(ctx, params)
	return err
}

func (r *ProjectsRepository) Update(ctx context.Context, params db.UpdateProjectParams) (*db.Project, error) {
	p, err := r.q.UpdateProject(ctx, params)
	if err != nil {
		return nil, err
	}
	return &p, nil
}

func (r *ProjectsRepository) Delete(ctx context.Context, id string) error {
	return r.q.DeleteProject(ctx, id)
}
