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
	"net/url"
	"time"
)

// NabooProvider implements Provider (and PaymentRefunder) for NabooPay, a
// payment gateway aggregating Wave and Orange Money (and, per its marketing
// pages, card rails) for West Africa.
//
// API reference used to write this file: https://docs.naboopay.com/
const (
	nabooDefaultBaseURL = "https://api.naboopay.com"
	nabooCreatePath     = "/api/v2/transactions"
)

type NabooProvider struct {
	apiKey        string
	webhookSecret string
	baseURL       string
	httpClient    *http.Client

	// paymentMethods controls which rails are offered on Naboo's hosted
	// checkout page. Confirmed values from the docs: "wave", "orange_money".
	//
	// TODO(verify): card/Visa is mentioned in NabooPay's marketing copy but
	// no confirmed `method_of_payment` string for it turned up in the API
	// reference pages fetched for this integration. Check the interactive
	// "Try it" panel at https://docs.naboopay.com/api-reference/transactions
	// (requires a live API key) before adding a third value here.
	paymentMethods []string
}

// NewNabooProvider builds a NabooProvider against NabooPay's production API.
//
//   - apiKey is the Bearer token from the NabooPay dashboard. It must carry
//     the "checkout" or "read_write" scope to create transactions, plus
//     "write", "checkout", "read_write" or "management" to issue refunds --
//     see the scope notes in the integration summary accompanying this file.
//   - webhookSecret is the secret configured under Settings -> Integration
//     at https://platform.naboopay.com/parametre/, used to verify the
//     X-Signature header NabooPay sends with every webhook call.
func NewNabooProvider(apiKey, webhookSecret string) *NabooProvider {
	return &NabooProvider{
		apiKey:         apiKey,
		webhookSecret:  webhookSecret,
		baseURL:        nabooDefaultBaseURL,
		httpClient:     &http.Client{Timeout: 30 * time.Second},
		paymentMethods: []string{"wave", "orange_money"},
	}
}

// WithBaseURL overrides the API base URL. No sandbox/staging URL is
// documented publicly for NabooPay as of this writing -- ask NabooPay
// support for one if you need to test outside production, and wire it
// through here (e.g. from a NABOO_BASE_URL env var).
func (n *NabooProvider) WithBaseURL(baseURL string) *NabooProvider {
	n.baseURL = baseURL
	return n
}

// WithPaymentMethods overrides which rails are shown on the hosted checkout.
func (n *NabooProvider) WithPaymentMethods(methods ...string) *NabooProvider {
	if len(methods) > 0 {
		n.paymentMethods = methods
	}
	return n
}

func (n *NabooProvider) Name() Method { return MethodNaboo }

// --- CreatePayment -----------------------------------------------------

type nabooProduct struct {
	Name        string `json:"name"`
	Price       int64  `json:"price"`
	Quantity    int64  `json:"quantity"`
	Description string `json:"description,omitempty"`
}

type nabooCustomer struct {
	FirstName string `json:"first_name"`
	LastName  string `json:"last_name"`
	Phone     string `json:"phone"`
}

type nabooCreateTransactionRequest struct {
	MethodOfPayment  []string       `json:"method_of_payment"`
	Products         []nabooProduct `json:"products"`
	Customer         nabooCustomer  `json:"customer"`
	SuccessURL       string         `json:"success_url,omitempty"`
	ErrorURL         string         `json:"error_url,omitempty"`
	FeesCustomerSide bool           `json:"fees_customer_side"`
	IsEscrow         bool           `json:"is_escrow"`
	IsMerchant       bool           `json:"is_merchant"`
}

type nabooCreateTransactionResponse struct {
	CheckoutURL       string `json:"checkout_url"`
	OrderID           string `json:"order_id"`
	Amount            int64  `json:"amount"`
	TransactionStatus string `json:"transaction_status"`
}

type nabooErrorResponse struct {
	Error string `json:"error"`
}

func (n *NabooProvider) CreatePayment(ctx context.Context, order OrderInfo, callbacks CallbackURLs) (*PaymentResult, error) {
	// NabooPay requires a customer name + phone number so it can route the
	// payment (Wave/Orange Money checkouts are phone-number based). These
	// fields don't exist on the shared OrderInfo struct today -- see the
	// CustomerFirstName/CustomerLastName/CustomerPhone diff to provider.go
	// that this depends on.
	if order.CustomerPhone == "" {
		return nil, fmt.Errorf("naboo: order %s has no customer phone number, which naboopay requires to route the payment", order.OrderNumber)
	}
	firstName, lastName := order.CustomerFirstName, order.CustomerLastName
	if firstName == "" {
		firstName = "Client"
	}
	if lastName == "" {
		lastName = order.OrderNumber
	}

	products := make([]nabooProduct, 0, len(order.Items)+1)
	var sum int64
	for _, item := range order.Items {
		products = append(products, nabooProduct{
			Name:     item.Name,
			Price:    item.Price,
			Quantity: item.Quantity,
		})
		sum += item.Price * item.Quantity
	}
	if order.Shipping > 0 {
		products = append(products, nabooProduct{
			Name:     "Livraison",
			Price:    order.Shipping,
			Quantity: 1,
		})
		sum += order.Shipping
	}
	// NabooPay computes the payable amount from the products array -- there
	// is no top-level "amount" field on the create-transaction request.
	// Fail fast if the sum doesn't match OrderInfo.Total, so a pricing bug
	// surfaces here instead of as a silent mismatch on Naboo's side.
	if sum != order.Total {
		return nil, fmt.Errorf("naboo: order %s: sum of items+shipping (%d XOF) does not match order.Total (%d XOF)", order.OrderNumber, sum, order.Total)
	}

	reqBody := nabooCreateTransactionRequest{
		MethodOfPayment: n.paymentMethods,
		Products:        products,
		Customer: nabooCustomer{
			FirstName: firstName,
			LastName:  lastName,
			Phone:     order.CustomerPhone,
		},
		SuccessURL:       callbacks.SuccessURL,
		ErrorURL:         callbacks.CancelURL,
		FeesCustomerSide: false, // merchant absorbs fees; flip to true to pass them to the customer
		IsEscrow:         false,
		IsMerchant:       false, // meaning unconfirmed in the docs fetched for this integration -- verify with Naboo support
	}
	// NOTE: callbacks.WebhookURL is intentionally unused. NabooPay does not
	// accept a per-transaction webhook URL; webhooks are registered once,
	// globally, at https://platform.naboopay.com/parametre/ -> Integration.

	body, err := json.Marshal(reqBody)
	if err != nil {
		return nil, fmt.Errorf("naboo: encode create-transaction request: %w", err)
	}

	httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost, n.baseURL+nabooCreatePath, bytes.NewReader(body))
	if err != nil {
		return nil, fmt.Errorf("naboo: build create-transaction request: %w", err)
	}
	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("Authorization", "Bearer "+n.apiKey)

	resp, err := n.httpClient.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("naboo: create-transaction request failed: %w", err)
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("naboo: read create-transaction response: %w", err)
	}

	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusCreated {
		return nil, fmt.Errorf("naboo: create-transaction failed (%d): %s", resp.StatusCode, nabooErrMessage(respBody))
	}

	var out nabooCreateTransactionResponse
	if err := json.Unmarshal(respBody, &out); err != nil {
		return nil, fmt.Errorf("naboo: decode create-transaction response: %w", err)
	}
	if out.CheckoutURL == "" || out.OrderID == "" {
		return nil, fmt.Errorf("naboo: create-transaction response missing checkout_url/order_id: %s", string(respBody))
	}

	return &PaymentResult{
		RedirectURL: out.CheckoutURL,
		ExternalID:  out.OrderID,
	}, nil
}

func nabooErrMessage(body []byte) string {
	var e nabooErrorResponse
	if err := json.Unmarshal(body, &e); err == nil && e.Error != "" {
		return e.Error
	}
	if len(body) == 0 {
		return "empty response body"
	}
	return string(body)
}

// --- VerifyWebhook -------------------------------------------------------

type nabooWebhookPayload struct {
	OrderID           string `json:"order_id"`
	TransactionStatus string `json:"transaction_status"`
}

func (n *NabooProvider) VerifyWebhook(_ context.Context, payload []byte, headers http.Header) (*WebhookEvent, error) {
	signature := headers.Get("X-Signature")
	if signature == "" {
		return nil, fmt.Errorf("naboo: missing X-Signature header")
	}
	if n.webhookSecret == "" {
		return nil, fmt.Errorf("naboo: webhook secret not configured")
	}

	mac := hmac.New(sha256.New, []byte(n.webhookSecret))
	mac.Write(payload) // hash the raw request body -- do not re-marshal the parsed JSON first
	expected := hex.EncodeToString(mac.Sum(nil))

	if !hmac.Equal([]byte(expected), []byte(signature)) {
		return nil, fmt.Errorf("naboo: invalid webhook signature")
	}

	var event nabooWebhookPayload
	if err := json.Unmarshal(payload, &event); err != nil {
		return nil, fmt.Errorf("naboo: decode webhook payload: %w", err)
	}
	if event.OrderID == "" {
		return nil, fmt.Errorf("naboo: webhook payload missing order_id")
	}

	status, err := nabooMapStatus(event.TransactionStatus)
	if err != nil {
		return nil, err
	}

	return &WebhookEvent{
		ExternalID: event.OrderID,
		// OrderID (our internal UUID) is not present in NabooPay's webhook
		// payload -- there's no metadata/reference field on the
		// create-transaction request to stash it in. Match on ExternalID
		// against the value stored from PaymentResult.ExternalID instead.
		Status: status,
	}, nil
}

// nabooMapStatus reconciles two status vocabularies seen across the docs:
// the webhook payload example uses "completed", while the GET-transaction
// endpoint documents pending|paid|paid_and_blocked|refunded|cancelled.
//
// TODO(verify): confirm the exact set of values your webhook actually
// delivers using NabooPay dashboard's webhook test tool before relying on
// this in production.
func nabooMapStatus(raw string) (string, error) {
	switch raw {
	case "completed", "paid", "paid_and_blocked":
		return "PAID", nil
	case "refunded":
		return "REFUNDED", nil
	case "failed", "cancelled", "canceled", "expired":
		return "FAILED", nil
	case "pending":
		// Not a terminal state -- there's no PAID/FAILED/REFUNDED
		// equivalent for it. Returning an error here means the webhook
		// handler will treat delivery as failed (and Naboo will retry).
		// Change this if you'd rather 200-ack and no-op on "pending".
		return "", fmt.Errorf("naboo: received non-terminal transaction_status %q", raw)
	default:
		return "", fmt.Errorf("naboo: unrecognized transaction_status %q", raw)
	}
}

// --- Refund ----------------------------------------------------------

type nabooRefundResponse struct {
	Message string `json:"message"`
}

// Refund issues a full refund via GET /api/v2/refund/{order_id}.
//
// IMPORTANT: NabooPay only supports full refunds -- the endpoint takes no
// amount parameter and always returns 100% of what was paid. input.Amount
// and input.IdempotencyKey are NOT sent to Naboo. If your RefundsService can
// request a *partial* refund, guard against routing that call to Naboo
// before reaching this method -- otherwise the customer receives the full
// order amount back regardless of what was requested.
func (n *NabooProvider) Refund(ctx context.Context, input RefundInput) (RefundOutput, error) {
	if input.ExternalPaymentID == "" {
		return RefundOutput{}, fmt.Errorf("naboo: refund requires ExternalPaymentID (naboo order_id)")
	}

	reqURL := n.baseURL + "/api/v2/refund/" + url.PathEscape(input.ExternalPaymentID)
	httpReq, err := http.NewRequestWithContext(ctx, http.MethodGet, reqURL, nil)
	if err != nil {
		return RefundOutput{}, fmt.Errorf("naboo: build refund request: %w", err)
	}
	httpReq.Header.Set("Authorization", "Bearer "+n.apiKey)

	resp, err := n.httpClient.Do(httpReq)
	if err != nil {
		return RefundOutput{}, fmt.Errorf("naboo: refund request failed: %w", err)
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return RefundOutput{}, fmt.Errorf("naboo: read refund response: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		// Naboo returns 400 for "already refunded / cancelled / wrong
		// status / insufficient balance", 403 for cross-org access, 404 for
		// unknown order_id, 409/429 for rate limiting -- all surfaced here
		// with the same prefix so callers can pattern-match on message text
		// if they need to special-case "already refunded".
		return RefundOutput{}, fmt.Errorf("naboo: refund failed (%d): %s", resp.StatusCode, nabooErrMessage(respBody))
	}

	var out nabooRefundResponse
	if err := json.Unmarshal(respBody, &out); err != nil {
		return RefundOutput{}, fmt.Errorf("naboo: decode refund response: %w", err)
	}

	return RefundOutput{
		// Naboo's refund response carries no distinct refund ID (only a
		// confirmation message), so the order_id is reused as the closest
		// available correlation identifier.
		ProviderRefundID: input.ExternalPaymentID,
		Status:           "succeeded", // refunds settle synchronously on HTTP 200
	}, nil
}

var _ Provider = (*NabooProvider)(nil)
var _ PaymentRefunder = (*NabooProvider)(nil)
