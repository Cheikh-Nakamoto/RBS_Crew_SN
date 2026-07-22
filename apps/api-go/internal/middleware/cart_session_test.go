package middleware

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/Cheikh-Nakamoto/RBS_Crew_SN/apps/api-go/internal/types"
)

const testSecret = "test-jwt-secret-for-guest-cart"

func ownerFromRequest(t *testing.T, req *http.Request) (types.CartOwner, *httptest.ResponseRecorder) {
	t.Helper()
	var got types.CartOwner
	h := CartSession(testSecret, false)(http.HandlerFunc(func(_ http.ResponseWriter, r *http.Request) {
		got, _ = types.CartOwnerFrom(r.Context())
	}))
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)
	return got, rec
}

func TestCartSession_AnonymousGetGetsOwnerButNoCookie(t *testing.T) {
	owner, rec := ownerFromRequest(t, httptest.NewRequest(http.MethodGet, "/cart", nil))

	if owner.Kind != types.OwnerGuest || owner.ID == "" {
		t.Fatalf("expected a guest owner, got %+v", owner)
	}
	// Le panier est chargé sur toutes les pages : un GET ne doit pas distribuer
	// un cookie à chaque visiteur et chaque crawler.
	if c := rec.Result().Cookies(); len(c) != 0 {
		t.Fatalf("expected no Set-Cookie on GET, got %d", len(c))
	}
}

func TestCartSession_MutationSetsSignedCookie(t *testing.T) {
	owner, rec := ownerFromRequest(t, httptest.NewRequest(http.MethodPost, "/cart/items", nil))

	cookies := rec.Result().Cookies()
	if len(cookies) != 1 {
		t.Fatalf("expected 1 Set-Cookie on mutation, got %d", len(cookies))
	}
	c := cookies[0]
	if c.Name != GuestCartCookie || !c.HttpOnly || c.SameSite != http.SameSiteLaxMode {
		t.Fatalf("cookie attributes are wrong: %+v", c)
	}
	if !strings.HasPrefix(c.Value, owner.ID+".") {
		t.Fatalf("cookie value %q does not carry the owner id %q", c.Value, owner.ID)
	}
}

func TestCartSession_ValidCookieIsReused(t *testing.T) {
	_, rec := ownerFromRequest(t, httptest.NewRequest(http.MethodPost, "/cart/items", nil))
	issued := rec.Result().Cookies()[0]

	req := httptest.NewRequest(http.MethodGet, "/cart", nil)
	req.AddCookie(issued)
	owner, _ := ownerFromRequest(t, req)

	if owner.Kind != types.OwnerGuest {
		t.Fatalf("expected guest owner, got %+v", owner)
	}
	if !strings.HasPrefix(issued.Value, owner.ID+".") {
		t.Fatalf("guest id was not reused: cookie=%q owner=%q", issued.Value, owner.ID)
	}
}

func TestCartSession_TamperedCookieIsIgnored(t *testing.T) {
	_, rec := ownerFromRequest(t, httptest.NewRequest(http.MethodPost, "/cart/items", nil))
	issued := rec.Result().Cookies()[0]
	originalID, _, _ := strings.Cut(issued.Value, ".")

	for name, value := range map[string]string{
		"forged id":        "11111111-1111-1111-1111-111111111111." + strings.SplitN(issued.Value, ".", 2)[1],
		"broken signature": originalID + ".notavalidsignature",
		"no signature":     originalID,
		"empty":            "",
	} {
		t.Run(name, func(t *testing.T) {
			req := httptest.NewRequest(http.MethodGet, "/cart", nil)
			req.AddCookie(&http.Cookie{Name: GuestCartCookie, Value: value})
			owner, _ := ownerFromRequest(t, req)

			// Un cookie falsifié est traité comme absent : jamais une erreur, et
			// surtout jamais l'accès au panier d'un autre visiteur.
			if owner.ID == originalID {
				t.Fatalf("tampered cookie %q granted access to the original cart", value)
			}
			if owner.Kind != types.OwnerGuest || owner.ID == "" {
				t.Fatalf("expected a fresh guest owner, got %+v", owner)
			}
		})
	}
}
