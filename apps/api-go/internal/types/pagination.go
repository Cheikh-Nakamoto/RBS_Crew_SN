package types

import (
	"math"
	"net/http"
	"strconv"
)

type PaginatedMeta struct {
	Page       int `json:"page"`
	Limit      int `json:"limit"`
	Total      int `json:"total"`
	TotalPages int `json:"totalPages"`
}

type PaginatedResponse[T any] struct {
	Data []T            `json:"data"`
	Meta *PaginatedMeta `json:"meta,omitempty"`
}

type PaginationQuery struct {
	Page   int
	Limit  int
	Search string
	Sort   string
	Order  string
}

func ParsePagination(r *http.Request) PaginationQuery {
	q := r.URL.Query()
	page, _ := strconv.Atoi(q.Get("page"))
	if page < 1 {
		page = 1
	}
	limit, _ := strconv.Atoi(q.Get("limit"))
	if limit < 1 || limit > 100 {
		limit = 20
	}
	order := q.Get("order")
	if order != "asc" && order != "desc" {
		order = "asc"
	}

	return PaginationQuery{
		Page:   page,
		Limit:  limit,
		Search: q.Get("search"),
		Sort:   q.Get("sort"),
		Order:  order,
	}
}

func Paginate[T any](data []T, total int, page int, limit int) *PaginatedResponse[T] {
	if data == nil {
		data = make([]T, 0)
	}
	return &PaginatedResponse[T]{
		Data: data,
		Meta: &PaginatedMeta{
			Page:       page,
			Limit:      limit,
			Total:      total,
			TotalPages: int(math.Ceil(float64(total) / float64(limit))),
		},
	}
}
