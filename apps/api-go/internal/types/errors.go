package types

import "fmt"

type AppError struct {
	StatusCode int    `json:"statusCode"`
	Message    string `json:"message"`
	Error      string `json:"error"`
	// Code machine facultatif, pour que le client distingue deux refus de même
	// statut HTTP (ex. « e-mail non vérifié » vs permission insuffisante).
	Code string `json:"code,omitempty"`
}

// ForbiddenWithCode : refus 403 accompagné d'un code exploitable par le client.
func ForbiddenWithCode(msg, code string) *AppError {
	return &AppError{StatusCode: 403, Message: msg, Error: "Forbidden", Code: code}
}

func (e *AppError) Err() error {
	return fmt.Errorf("%s: %s", e.Error, e.Message)
}

func NotFound(msg string) *AppError {
	return &AppError{StatusCode: 404, Message: msg, Error: "Not Found"}
}

func BadRequest(msg string) *AppError {
	return &AppError{StatusCode: 400, Message: msg, Error: "Bad Request"}
}

func Unauthorized(msg string) *AppError {
	return &AppError{StatusCode: 401, Message: msg, Error: "Unauthorized"}
}

func Forbidden(msg string) *AppError {
	return &AppError{StatusCode: 403, Message: msg, Error: "Forbidden"}
}

func InternalError(msg string) *AppError {
	return &AppError{StatusCode: 500, Message: msg, Error: "Internal Server Error"}
}

func Conflict(msg string) *AppError {
	return &AppError{StatusCode: 409, Message: msg, Error: "Conflict"}
}
