package handler

import (
	"context"
	"fmt"
	"io"
	"log/slog"
	"mime"
	"net/http"
	"path/filepath"
	"strings"
	"time"

	"github.com/Cheikh-Nakamoto/RBS_Crew_SN/apps/api-go/internal/types"
	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	"github.com/gabriel-vasile/mimetype"
)

type MediaHandler struct {
	s3Client  *s3.Client
	bucket    string
	publicURL string // e.g. "https://pub-xxx.r2.dev"
}

func NewMediaHandler(accountID, accessKey, secretKey, bucket, publicURL string) *MediaHandler {
	endpoint := fmt.Sprintf("https://%s.r2.cloudflarestorage.com", accountID)
	client := s3.New(s3.Options{
		Region:       "auto",
		Credentials:  aws.NewCredentialsCache(credentials.NewStaticCredentialsProvider(accessKey, secretKey, "")),
		BaseEndpoint: aws.String(endpoint),
	})
	return &MediaHandler{s3Client: client, bucket: bucket, publicURL: strings.TrimRight(publicURL, "/")}
}

// allowedMIME lists the image MIME types accepted by the media uploader.
// SVG is intentionally excluded — it can carry active content (JS/XSS).
var allowedMIME = map[string]string{
	"image/jpeg": ".jpg",
	"image/png":  ".png",
	"image/webp": ".webp",
	"image/gif":  ".gif",
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

	// Client-declared Content-Type (used to cross-check with detected type).
	declared := header.Header.Get("Content-Type")
	if declared == "" {
		declared = mime.TypeByExtension(filepath.Ext(header.Filename))
	}
	declared, _, _ = mime.ParseMediaType(declared)

	// Read up to 512 bytes for magic-byte sniffing. multipart.File est un
	// io.Seeker : on rembobine ensuite plutôt que de reconstituer le flux, ce qui
	// garde un corps seekable pour l'upload (voir plus bas).
	sniffBuf := make([]byte, 512)
	n, err := io.ReadFull(file, sniffBuf)
	if err != nil && err != io.ErrUnexpectedEOF && err != io.EOF {
		types.WriteError(w, types.BadRequest("Impossible de lire le fichier"))
		return
	}
	sniffBuf = sniffBuf[:n]

	detected := mimetype.Detect(sniffBuf).String()
	// mimetype may include parameters (e.g. "text/plain; charset=utf-8"); strip them.
	detected, _, _ = mime.ParseMediaType(detected)

	ext, ok := allowedMIME[detected]
	if !ok {
		types.WriteError(w, types.BadRequest("Type de fichier non supporté (JPEG, PNG, WebP, GIF uniquement)"))
		return
	}
	// Also require the declared Content-Type to match the sniffed one (if provided).
	if declared != "" && declared != detected {
		types.WriteError(w, types.BadRequest("Le type MIME déclaré ne correspond pas au contenu du fichier"))
		return
	}

	// Rembobiner après le sniffing. Un io.MultiReader ferait l'affaire pour
	// relire le contenu, mais il n'est ni seekable ni de taille connue : le SDK
	// bascule alors en envoi streaming et R2 — contrairement à S3 — refuse la
	// requête avec « 411 MissingContentLength ». Le fichier multipart est un
	// io.Seeker, on s'en sert pour fournir un corps seekable et sa taille exacte.
	if _, err := file.Seek(0, io.SeekStart); err != nil {
		slog.Error("media: seek failed", "error", err)
		types.WriteError(w, types.InternalError("Impossible de relire le fichier"))
		return
	}

	key := fmt.Sprintf("uploads/%d_%s%s",
		time.Now().UnixNano(),
		sanitizeName(strings.TrimSuffix(header.Filename, filepath.Ext(header.Filename))),
		ext,
	)

	_, err = h.s3Client.PutObject(context.Background(), &s3.PutObjectInput{
		Bucket:        aws.String(h.bucket),
		Key:           aws.String(key),
		Body:          file,
		ContentLength: aws.Int64(header.Size),
		ContentType:   aws.String(detected),
	})
	if err != nil {
		// Sans cette trace, un échec d'upload est indiagnosticable : le client ne
		// reçoit qu'un 500 générique (à dessein) et la cause réelle — bucket
		// absent, identifiants invalides, réseau — était perdue.
		slog.Error("media: R2 upload failed",
			"error", err, "bucket", h.bucket, "key", key)
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
