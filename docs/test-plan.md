# Test Plan

**Generated:** 2026-04-27  
**Source:** /plan-eng-review  
**Based on:** design.md

---

## Affected Pages/Routes

- `/` — HomeRun-style catalog landing page with urgent categories, product cards, service corridor, pay-on-delivery promise, and checkout CTA
- `/cart` — cart review, quantity changes, price/convenience fee calculation, and pay-on-delivery messaging
- `/checkout` — customer details, site address, landmark, needed-now vs scheduled time, pay-on-delivery default, duplicate-submit protection, and backend submit
- `/order/[statusToken]` — customer order status page showing received, ETA assigned, out for delivery, delivered, cancelled, or error states
- `/agent/order/[updateToken]` — delivery-agent page protected by shared PIN, allowing legal status updates only
- `/api/orders` — creates order row through Apps Script adapter and returns customer status token plus approximate ETA
- `/api/orders/[statusToken]` — reads safe customer-facing order status by random token
- `/api/agent/orders/[updateToken]` — validates shared PIN, validates status transition, and updates the sheet row

---

## Key Interactions to Verify

- Customer browses urgent SKUs, adds items to cart, checks out with pay on delivery, receives approximate ETA, then lands on status page
- Agent opens protected update link, enters shared PIN, marks order out for delivery, then delivered
- Customer status page updates after agent success marking
- Customer chooses scheduled delivery and sees scheduled window reflected in order details
- Checkout shows retry/support fallback if Apps Script write times out or returns an invalid response
- Wrong agent PIN does not change the order and shows a clear error
- Invalid or expired customer status token shows a clear not-found state without leaking order details

---

## Edge Cases

- Double-click checkout submit creates only one order
- Empty cart cannot submit checkout
- Missing phone, invalid phone, missing address, missing landmark, and missing delivery timing are blocked before submit
- Quantity updates cannot go below 1 and cannot exceed configured max quantity
- Product unavailable state prevents checkout or clearly marks unavailable items
- Apps Script timeout maps to retryable checkout error
- Apps Script malformed response maps to non-success state, never false confirmation
- Sheet row with unknown status maps to safe error state, not a broken UI
- Illegal transition such as delivered -> out_for_delivery is rejected
- Shared agent PIN failure is rate-limited or at least returns generic failure text

---

## Critical Paths

### E2E Tests

- Complete customer checkout through delivered status with mocked Apps Script adapter
- Checkout backend failure shows retry/support and does not show confirmation
- Wrong agent PIN cannot update order status

### Unit Tests

- Order status state machine legal transitions and rejected transitions
- Order validation and pay-on-delivery checkout payload shape
- Apps Script adapter maps success, timeout, non-200, malformed JSON, missing row, duplicate row, and update failure
- Price/convenience fee calculation for typical Rs. 200 AOV order and boundary values
