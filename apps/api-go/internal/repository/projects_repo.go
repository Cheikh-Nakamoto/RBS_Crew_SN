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

type AdminListProjectRow struct {
	db.Project
	TotalCount int64
}

func (r *ProjectsRepository) AdminList(ctx context.Context, limit, offset int32) ([]AdminListProjectRow, error) {
	rows, err := r.pool.Query(ctx,
		`SELECT id, slug, "completedAt", "clientName", status, "createdAt", "updatedAt", "featuredImageUrl", COUNT(*) OVER() AS total_count
		 FROM "Project"
		 ORDER BY "createdAt" DESC
		 LIMIT $1 OFFSET $2`, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var items []AdminListProjectRow
	for rows.Next() {
		var row AdminListProjectRow
		if err := rows.Scan(
			&row.ID, &row.Slug, &row.CompletedAt, &row.ClientName,
			&row.Status, &row.CreatedAt, &row.UpdatedAt, &row.FeaturedImageUrl,
			&row.TotalCount,
		); err != nil {
			return nil, err
		}
		items = append(items, row)
	}
	return items, rows.Err()
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
