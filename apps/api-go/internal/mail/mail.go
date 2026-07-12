package mail

import (
	"bytes"
	"context"
	"fmt"
	"html/template"
	"log/slog"

	"github.com/Cheikh-Nakamoto/RBS_Crew_SN/apps/api-go/internal/config"
	"gopkg.in/gomail.v2"
)

// RefundEmailData carries variables for the refund notification email.
type RefundEmailData struct {
	OrderNumber     string
	Amount          float64
	Currency        string
	IsManualPending bool // Wave manual refund — not yet processed by provider
}

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

var refundTemplateFR = template.Must(template.New("refund_fr").Parse(`
<p>Bonjour,</p>
<p>Nous avons bien reçu votre demande de remboursement pour la commande <strong>{{.OrderNumber}}</strong>.</p>
{{if .IsManualPending}}
<p>Votre remboursement de <strong>{{.Amount}} {{.Currency}}</strong> est en cours de traitement manuel par notre équipe (paiement Wave). Vous serez notifié par email dès qu'il sera finalisé.</p>
{{else}}
<p>Un remboursement de <strong>{{.Amount}} {{.Currency}}</strong> a été initié avec succès. Il apparaîtra sur votre compte dans 5 à 10 jours ouvrés selon votre banque.</p>
{{end}}
<p>Merci pour votre confiance.</p>
<p>L'équipe RBS Crew SN</p>
`))

var refundTemplateEN = template.Must(template.New("refund_en").Parse(`
<p>Hello,</p>
<p>We have received your refund request for order <strong>{{.OrderNumber}}</strong>.</p>
{{if .IsManualPending}}
<p>Your refund of <strong>{{.Amount}} {{.Currency}}</strong> is being processed manually by our team (Wave payment). You will be notified by email once it is finalized.</p>
{{else}}
<p>A refund of <strong>{{.Amount}} {{.Currency}}</strong> has been successfully initiated. It will appear on your account within 5 to 10 business days depending on your bank.</p>
{{end}}
<p>Thank you for your trust.</p>
<p>The RBS Crew SN Team</p>
`))

// SendRefundEmail sends a refund notification to the customer.
// Uses html/template (XSS-safe) — never text/template for emails.
func (s *MailService) SendRefundEmail(_ context.Context, to, locale string, data RefundEmailData) error {
	if to == "" {
		slog.Warn("mail: SendRefundEmail called with empty recipient")
		return nil
	}

	var tmpl *template.Template
	subject := "Remboursement de votre commande RBS Crew"
	if locale == "en" {
		tmpl = refundTemplateEN
		subject = "Refund for your RBS Crew order"
	} else {
		tmpl = refundTemplateFR
	}

	var buf bytes.Buffer
	if err := tmpl.Execute(&buf, data); err != nil {
		return fmt.Errorf("mail: render refund template: %w", err)
	}

	return s.sendHTML(to, subject, buf.String())
}
