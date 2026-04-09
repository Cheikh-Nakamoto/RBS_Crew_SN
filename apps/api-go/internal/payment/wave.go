package payment

import (
	"bytes"
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"
)

// ── Wave Provider ─────────────────────────────────────────────────────────────
// Wave Business API: https://docs.wave.com/

type WaveProvider struct {
	apiKey     string
	secretKey  string
	baseURL    string
	httpClient *http.Client
}

func NewWaveProvider(apiKey, secretKey string) *WaveProvider {
	return &WaveProvider{
		apiKey:     apiKey,
		secretKey:  secretKey,
		baseURL:    "https://api.wave.com",
		httpClient: &http.Client{Timeout: 30 * time.Second},
	}
}

func (w *WaveProvider) Name() Method { return MethodWave }

func (w *WaveProvider) CreatePayment(ctx context.Context, order OrderInfo, callbacks CallbackURLs) (*PaymentResult, error) {
	payload := map[string]interface{}{
		"amount":       fmt.Sprintf("%d", order.Total), // Wave uses XOF natively, integer amounts
		"currency":     "XOF",
		"error_url":    callbacks.CancelURL,
		"success_url":  callbacks.SuccessURL,
		"client_reference": order.ID,
	}

	body, _ := json.Marshal(payload)
	req, _ := http.NewRequestWithContext(ctx, "POST", w.baseURL+"/v1/checkout/sessions", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+w.apiKey)

	resp, err := w.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("wave: checkout request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		respBody, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("wave: checkout returned %d: %s", resp.StatusCode, respBody)
	}

	var result struct {
		ID          string `json:"id"`
		CheckoutURL string `json:"wave_launch_url"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("wave: failed to decode checkout response: %w", err)
	}

	if result.CheckoutURL == "" {
		return nil, fmt.Errorf("wave: no checkout URL in response")
	}

	return &PaymentResult{
		RedirectURL: result.CheckoutURL,
		ExternalID:  result.ID,
	}, nil
}

func (w *WaveProvider) VerifyWebhook(_ context.Context, payload []byte, headers http.Header) (*WebhookEvent, error) {
	// Verify HMAC signature
	signature := headers.Get("Wave-Signature")
	if signature == "" {
		return nil, fmt.Errorf("wave: missing Wave-Signature header")
	}

	mac := hmac.New(sha256.New, []byte(w.secretKey))
	mac.Write(payload)
	expectedSig := hex.EncodeToString(mac.Sum(nil))

	if !hmac.Equal([]byte(signature), []byte(expectedSig)) {
		return nil, fmt.Errorf("wave: invalid webhook signature")
	}

	var event struct {
		Type string `json:"type"`
		Data struct {
			ID              string `json:"id"`
			ClientReference string `json:"client_reference"`
			Status          string `json:"checkout_status"`
		} `json:"data"`
	}
	if err := json.Unmarshal(payload, &event); err != nil {
		return nil, fmt.Errorf("wave: failed to parse webhook: %w", err)
	}

	switch event.Type {
	case "checkout.session.completed":
		return &WebhookEvent{
			ExternalID: event.Data.ID,
			OrderID:    event.Data.ClientReference,
			Status:     "PAID",
		}, nil
	case "checkout.session.expired", "checkout.session.failed":
		return &WebhookEvent{
			ExternalID: event.Data.ID,
			OrderID:    event.Data.ClientReference,
			Status:     "FAILED",
		}, nil
	}

	return nil, nil
}
