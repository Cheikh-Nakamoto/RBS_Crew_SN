package payment

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"
)

// ── PayPal Provider ───────────────────────────────────────────────────────────

type PayPalProvider struct {
	clientID     string
	clientSecret string
	baseURL      string // https://api-m.sandbox.paypal.com or https://api-m.paypal.com
	webhookID    string
	httpClient   *http.Client
}

func NewPayPalProvider(clientID, clientSecret string, sandbox bool, webhookID string) *PayPalProvider {
	base := "https://api-m.paypal.com"
	if sandbox {
		base = "https://api-m.sandbox.paypal.com"
	}
	return &PayPalProvider{
		clientID:     clientID,
		clientSecret: clientSecret,
		baseURL:      base,
		webhookID:    webhookID,
		httpClient:   &http.Client{Timeout: 30 * time.Second},
	}
}

func (p *PayPalProvider) Name() Method { return MethodPayPal }

// getAccessToken obtains a short-lived OAuth2 token from PayPal.
func (p *PayPalProvider) getAccessToken(ctx context.Context) (string, error) {
	req, _ := http.NewRequestWithContext(ctx, "POST", p.baseURL+"/v1/oauth2/token", bytes.NewBufferString("grant_type=client_credentials"))
	req.SetBasicAuth(p.clientID, p.clientSecret)
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	resp, err := p.httpClient.Do(req)
	if err != nil {
		return "", fmt.Errorf("paypal: token request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return "", fmt.Errorf("paypal: token request returned %d: %s", resp.StatusCode, body)
	}

	var result struct {
		AccessToken string `json:"access_token"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return "", fmt.Errorf("paypal: failed to decode token response: %w", err)
	}
	fmt.Printf("PayPal access token obtained: %s\n", result.AccessToken) // Debug log
	return result.AccessToken, nil
}

func (p *PayPalProvider) CreatePayment(ctx context.Context, order OrderInfo, callbacks CallbackURLs) (*PaymentResult, error) {
	token, err := p.getAccessToken(ctx)
	fmt.Printf("PayPal access token: %s\n", token) // Debug log
	if err != nil {
		fmt.Printf("Error obtaining PayPal access token: %v\n", err) // Debug log
		return nil, err
	}

	// Build PayPal order items
	var items []map[string]interface{}
	for _, item := range order.Items {
		items = append(items, map[string]interface{}{
			"name":        item.Name,
			"quantity":    fmt.Sprintf("%d", item.Quantity),
			"unit_amount": map[string]string{
				"currency_code": order.Currency,
				"value":         formatPayPalAmount(item.Price, order.Currency),
			},
		})
	}

	payload := map[string]interface{}{
		"intent": "CAPTURE",
		"purchase_units": []map[string]interface{}{
			{
				"reference_id": order.ID,
				"description":  fmt.Sprintf("Commande %s — RBS Crew", order.OrderNumber),
				"amount": map[string]interface{}{
					"currency_code": order.Currency,
					"value":         formatPayPalAmount(order.Total, order.Currency),
				},
				"items": items,
			},
		},
		"application_context": map[string]string{
			"return_url": callbacks.SuccessURL,
			"cancel_url": callbacks.CancelURL,
			"brand_name": "RBS Crew",
		},
	}

	body, _ := json.Marshal(payload)
	req, _ := http.NewRequestWithContext(ctx, "POST", p.baseURL+"/v2/checkout/orders", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+token)

	resp, err := p.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("paypal: create order request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusCreated {
		respBody, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("paypal: create order returned %d: %s", resp.StatusCode, respBody)
	}

	var result struct {
		ID    string `json:"id"`
		Links []struct {
			Href string `json:"href"`
			Rel  string `json:"rel"`
		} `json:"links"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("paypal: failed to decode order response: %w", err)
	}

	// Find the approval URL
	var approveURL string
	for _, link := range result.Links {
		if link.Rel == "approve" {
			approveURL = link.Href
			break
		}
	}
	if approveURL == "" {
		return nil, fmt.Errorf("paypal: no approval URL in response")
	}

	return &PaymentResult{
		RedirectURL: approveURL,
		ExternalID:  result.ID,
	}, nil
}

func (p *PayPalProvider) VerifyWebhook(ctx context.Context, payload []byte, headers http.Header) (*WebhookEvent, error) {
	// Parse the event first
	var event struct {
		EventType string `json:"event_type"`
		Resource  struct {
			ID             string `json:"id"`
			PurchaseUnits []struct {
				ReferenceID string `json:"reference_id"`
			} `json:"purchase_units"`
		} `json:"resource"`
	}
	if err := json.Unmarshal(payload, &event); err != nil {
		return nil, fmt.Errorf("paypal: failed to parse webhook: %w", err)
	}

	// Verify signature with PayPal API
	token, err := p.getAccessToken(ctx)
	if err != nil {
		return nil, err
	}

	verifyBody, _ := json.Marshal(map[string]interface{}{
		"auth_algo":         headers.Get("PAYPAL-AUTH-ALGO"),
		"cert_url":          headers.Get("PAYPAL-CERT-URL"),
		"transmission_id":   headers.Get("PAYPAL-TRANSMISSION-ID"),
		"transmission_sig":  headers.Get("PAYPAL-TRANSMISSION-SIG"),
		"transmission_time": headers.Get("PAYPAL-TRANSMISSION-TIME"),
		"webhook_id":        p.webhookID,
		"webhook_event":     json.RawMessage(payload),
	})

	req, _ := http.NewRequestWithContext(ctx, "POST", p.baseURL+"/v1/notifications/verify-webhook-signature", bytes.NewReader(verifyBody))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+token)

	resp, err := p.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("paypal: webhook verification request failed: %w", err)
	}
	defer resp.Body.Close()

	var verifyResult struct {
		VerificationStatus string `json:"verification_status"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&verifyResult); err != nil {
		return nil, fmt.Errorf("paypal: failed to decode verification response: %w", err)
	}
	if verifyResult.VerificationStatus != "SUCCESS" {
		return nil, fmt.Errorf("paypal: webhook verification failed: %s", verifyResult.VerificationStatus)
	}

	// Map event to our status
	var orderID string
	if len(event.Resource.PurchaseUnits) > 0 {
		orderID = event.Resource.PurchaseUnits[0].ReferenceID
	}

	switch event.EventType {
	case "CHECKOUT.ORDER.APPROVED", "PAYMENT.CAPTURE.COMPLETED":
		return &WebhookEvent{
			ExternalID: event.Resource.ID,
			OrderID:    orderID,
			Status:     "PAID",
		}, nil
	case "PAYMENT.CAPTURE.DENIED":
		return &WebhookEvent{
			ExternalID: event.Resource.ID,
			OrderID:    orderID,
			Status:     "FAILED",
		}, nil
	case "PAYMENT.CAPTURE.REFUNDED":
		return &WebhookEvent{
			ExternalID: event.Resource.ID,
			OrderID:    orderID,
			Status:     "REFUNDED",
		}, nil
	}

	return nil, nil // Unhandled event type
}

// formatPayPalAmount converts an integer amount to PayPal's string format.
// For XOF (zero-decimal), 15000 → "15000". For EUR/USD, 1500 → "15.00".
func formatPayPalAmount(amount int64, currency string) string {
	switch currency {
	case "XOF", "XAF", "BIF", "CLP", "DJF", "GNF", "ISK", "JPY", "KMF", "KRW", "PYG", "RWF", "UGX", "VND", "VUV":
		return fmt.Sprintf("%d", amount)
	default:
		return fmt.Sprintf("%.2f", float64(amount)/100)
	}
}
