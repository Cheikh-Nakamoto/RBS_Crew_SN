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

// ── Orange Money Provider ─────────────────────────────────────────────────────
// Orange Money Web Payment API (Senegal)
// Docs: https://developer.orange.com/apis/om-webpay

type OrangeMoneyProvider struct {
	clientID     string
	clientSecret string
	merchantKey  string
	baseURL      string // https://api.orange.com
	httpClient   *http.Client
}

func NewOrangeMoneyProvider(clientID, clientSecret, merchantKey string) *OrangeMoneyProvider {
	return &OrangeMoneyProvider{
		clientID:     clientID,
		clientSecret: clientSecret,
		merchantKey:  merchantKey,
		baseURL:      "https://api.orange.com",
		httpClient:   &http.Client{Timeout: 30 * time.Second},
	}
}

func (o *OrangeMoneyProvider) Name() Method { return MethodOrangeMoney }

// getToken gets an OAuth2 access token from Orange API.
func (o *OrangeMoneyProvider) getToken(ctx context.Context) (string, error) {
	req, _ := http.NewRequestWithContext(ctx, "POST", o.baseURL+"/oauth/v3/token",
		bytes.NewBufferString("grant_type=client_credentials"))
	req.SetBasicAuth(o.clientID, o.clientSecret)
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	resp, err := o.httpClient.Do(req)
	if err != nil {
		return "", fmt.Errorf("orange_money: token request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return "", fmt.Errorf("orange_money: token request returned %d: %s", resp.StatusCode, body)
	}

	var result struct {
		AccessToken string `json:"access_token"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return "", fmt.Errorf("orange_money: failed to decode token: %w", err)
	}
	return result.AccessToken, nil
}

func (o *OrangeMoneyProvider) CreatePayment(ctx context.Context, order OrderInfo, callbacks CallbackURLs) (*PaymentResult, error) {
	token, err := o.getToken(ctx)
	if err != nil {
		return nil, err
	}

	payload := map[string]interface{}{
		"merchant_key":    o.merchantKey,
		"currency":        "OUV", // Orange uses OUV for XOF
		"order_id":        order.ID,
		"amount":          order.Total,
		"return_url":      callbacks.SuccessURL,
		"cancel_url":      callbacks.CancelURL,
		"notif_url":       callbacks.WebhookURL,
		"lang":            "fr",
		"reference":       order.OrderNumber,
	}

	body, _ := json.Marshal(payload)
	req, _ := http.NewRequestWithContext(ctx, "POST", o.baseURL+"/orange-money-webpay/dev/v1/webpayment", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+token)

	resp, err := o.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("orange_money: payment request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		respBody, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("orange_money: payment returned %d: %s", resp.StatusCode, respBody)
	}

	var result struct {
		Status      int    `json:"status"`
		Message     string `json:"message"`
		PayToken    string `json:"pay_token"`
		PaymentURL  string `json:"payment_url"`
		NotifToken  string `json:"notif_token"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("orange_money: failed to decode response: %w", err)
	}

	if result.PaymentURL == "" {
		return nil, fmt.Errorf("orange_money: no payment URL (status=%d, msg=%s)", result.Status, result.Message)
	}

	return &PaymentResult{
		RedirectURL: result.PaymentURL,
		ExternalID:  result.PayToken,
	}, nil
}

func (o *OrangeMoneyProvider) VerifyWebhook(_ context.Context, payload []byte, headers http.Header) (*WebhookEvent, error) {
	// Orange Money sends a simple POST notification with status
	var notif struct {
		Status  string `json:"status"`
		OrderID string `json:"order_id"`
		PayToken string `json:"pay_token"`
		TxnID   string `json:"txnid"`
	}
	if err := json.Unmarshal(payload, &notif); err != nil {
		return nil, fmt.Errorf("orange_money: failed to parse notification: %w", err)
	}

	_ = time.Now() // imported for potential timestamp use

	var status string
	switch notif.Status {
	case "SUCCESS", "SUCCESSFULL":
		status = "PAID"
	case "FAILED", "CANCELLED":
		status = "FAILED"
	default:
		return nil, nil // Unknown status, ignore
	}

	return &WebhookEvent{
		ExternalID: notif.PayToken,
		OrderID:    notif.OrderID,
		Status:     status,
	}, nil
}

// Refund implements PaymentRefunder. Orange Money refunds are not yet integrated.
func (o *OrangeMoneyProvider) Refund(_ context.Context, _ RefundInput) (RefundOutput, error) {
	return RefundOutput{}, ErrRefundNotSupported
}
