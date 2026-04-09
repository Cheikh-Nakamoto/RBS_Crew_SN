package mail

import (
	"bytes"
	"fmt"
	"log/slog"
	"text/template"

	"github.com/Cheikh-Nakamoto/RBS_Crew_SN/apps/api-go/internal/config"
	"gopkg.in/gomail.v2"
)

type MailService struct {
	cfg    *config.Config
	dialer *gomail.Dialer
}

func NewMailService(cfg *config.Config) *MailService {
	d := gomail.NewDialer(cfg.SMTPHost, cfg.SMTPPort, cfg.SMTPUser, cfg.SMTPPass)
	return &MailService{cfg: cfg, dialer: d}
}

func (s *MailService) SendPasswordReset(to, token string) error {
	resetURL := fmt.Sprintf("%s/reset-password?token=%s", "https://rbscrew.sn", token)

	subject := "Réinitialisation de votre mot de passe - RBS Crew"
	body := fmt.Sprintf(`
		<p>Bonjour,</p>
		<p>Vous avez demandé la réinitialisation de votre mot de passe. Cliquez sur le lien ci-dessous pour créer un nouveau mot de passe :</p>
		<p><a href="%s">%s</a></p>
		<p>Si vous n'avez pas fait cette demande, vous pouvez ignorer cet e-mail.</p>
	`, resetURL, resetURL)

	return s.sendHTML(to, subject, body)
}

func (s *MailService) SendEmailVerification(to, token string) error {
	verifyURL := fmt.Sprintf("%s/api/auth/verify-email?token=%s", s.cfg.AppURL, token)

	subject := "Vérifiez votre adresse e-mail - RBS Crew"
	body := fmt.Sprintf(`
		<p>Bonjour,</p>
		<p>Merci de vous être inscrit sur RBS Crew ! Veuillez cliquer sur le lien ci-dessous pour vérifier votre adresse e-mail :</p>
		<p><a href="%s">%s</a></p>
	`, verifyURL, verifyURL)

	return s.sendHTML(to, subject, body)
}

func (s *MailService) sendHTML(to, subject, htmlBody string) error {
	m := gomail.NewMessage()
	m.SetHeader("From", s.cfg.SMTPFrom)
	m.SetHeader("To", to)
	m.SetHeader("Subject", subject)
	m.SetBody("text/html", htmlBody)

	slog.Info("Sending email", "to", to, "subject", subject)
	
	if s.cfg.SMTPHost == "" {
		slog.Warn("SMTP not configured. Skipping real email send.", "to", to, "subject", subject)
		return nil
	}

	if err := s.dialer.DialAndSend(m); err != nil {
		slog.Error("Failed to send email", "error", err, "to", to)
		return err
	}
	return nil
}

func (s *MailService) RenderTemplateString(tmplStr string, data interface{}) (string, error) {
	t, err := template.New("email").Parse(tmplStr)
	if err != nil {
		return "", err
	}
	var buf bytes.Buffer
	if err := t.Execute(&buf, data); err != nil {
		return "", err
	}
	return buf.String(), nil
}
