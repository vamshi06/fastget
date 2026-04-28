#!/bin/bash

SCRIPT_URL="https://script.google.com/macros/s/AKfycbx55K5HphzTev19Op53ubmPoB3tePeHlYJCCaM36HADvuRQQzUpw3bFZ-n8MrZi9p2L/exec"

TEST_PAYLOAD='{
  "action": "createOrder",
  "data": {
    "id": "test-123",
    "created_at": "2026-04-27T00:00:00Z",
    "customer_name": "Test User",
    "customer_phone": "9999999999",
    "site_address": "Test Address, Mumbai",
    "landmark": "",
    "delivery_type": "urgent",
    "scheduled_time": "",
    "items": "[{\"sku\":\"item1\",\"name\":\"Test Item\",\"quantity\":1,\"price\":100}]",
    "subtotal": 100,
    "convenience_fee": 10,
    "total": 110,
    "payment_method": "cod",
    "status": "received",
    "eta": "",
    "status_token": "tok_abc123",
    "update_token": "upd_xyz456"
  }
}'

echo "=== Testing with Content-Type: text/plain (current code) ==="
curl -s -L -X POST "$SCRIPT_URL" \
  -H "Content-Type: text/plain;charset=utf-8" \
  -d "$TEST_PAYLOAD"
echo ""
echo ""

echo "=== Testing with Content-Type: application/json ==="
curl -s -L -X POST "$SCRIPT_URL" \
  -H "Content-Type: application/json" \
  -d "$TEST_PAYLOAD"
echo ""
echo ""

echo "=== Testing GET (getOrder) ==="
curl -s -L "$SCRIPT_URL?action=getOrder&token=tok_abc123"
echo ""
