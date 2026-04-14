package handler

import (
	"context"
	"fmt"
	"mime"
	"net/http"
	"path/filepath"
	"strings"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	"github.com/Cheikh-Nakamoto/RBS_Crew_SN/apps/api-go/internal/types"
)

type MediaHandler struct {
	s3Client  *s3.Client
	bucket    string
	publicURL string // e.g. "https://pub-xxx.r2.dev"
}

func NewMediaHandler(accountID, accessKey, secretKey, bucket, publicURL string) *MediaHandler {
	endpoint := fmt.Sprintf("https://%s.r2.cloudflarestorage.com", accountID)
	client := s3.New(s3.Options{
		Region:      "auto",
		Credentials: aws.NewCredentialsCache(credentials.NewStaticCredentialsProvider(accessKey, secretKey, "")),
		BaseEndpoint: aws.String(endpoint),
	})
	return &MediaHandler{s3Client: client, bucket: bucket, publicURL: strings.TrimRight(publicURL, "/")}
}

var allowedMIME = map[string]string{
	"image/jpeg":    ".jpg",
	"image/png":     ".png",
	"image/webp":    ".webp",
	"image/gif":     ".gif",
	"image/svg+xml": ".svg",
}

func (h *MediaHandler) Upload(w http.ResponseWriter, r *http.Request) {
	if err := r.ParseMultipartForm(10 << 20); err != nil {
		types.WriteError(w, types.BadRequest("Fichier trop volumineux ou formulaire invalide"))
		return
	}

	file, header, err := r.FormFile("file")
	if err != nil {
		types.WriteError(w, types.BadRequest("Champ 'file' manquant"))
		return
	}
	defer file.Close()

	ct := header.Header.Get("Content-Type")
	if ct == "" {
		ct = mime.TypeByExtension(filepath.Ext(header.Filename))
	}
	ct, _, _ = mime.ParseMediaType(ct)

	ext, ok := allowedMIME[ct]
	if !ok {
		types.WriteError(w, types.BadRequest("Type de fichier non supporté (JPEG, PNG, WebP, GIF, SVG uniquement)"))
		return
	}

	key := fmt.Sprintf("uploads/%d_%s%s",
		time.Now().UnixNano(),
		sanitizeName(strings.TrimSuffix(header.Filename, filepath.Ext(header.Filename))),
		ext,
	)

	_, err = h.s3Client.PutObject(context.Background(), &s3.PutObjectInput{
		Bucket:      aws.String(h.bucket),
		Key:         aws.String(key),
		Body:        file,
		ContentType: aws.String(ct),
	})
	if err != nil {
		types.WriteError(w, types.InternalError("Erreur lors de l'upload vers le stockage"))
		return
	}

	url := h.publicURL + "/" + key
	types.WriteJSON(w, http.StatusOK, map[string]string{"url": url})
}

func sanitizeName(name string) string {
	var b strings.Builder
	for _, r := range name {
		if (r >= 'a' && r <= 'z') || (r >= 'A' && r <= 'Z') || (r >= '0' && r <= '9') || r == '-' || r == '_' {
			b.WriteRune(r)
		} else {
			b.WriteRune('_')
		}
	}
	s := b.String()
	if len(s) > 40 {
		s = s[:40]
	}
	if s == "" {
		s = "file"
	}
	return s
}
