# Neon Operations Guide

This document explains how to manage and query the Fastget order database in Neon Postgres.

## Database Connection

### Development
```bash
# Set environment variable
export fastget_DATABASE_URL='postgresql://neondb_owner:...@ep-...ap-southeast-1.aws.neon.tech/neondb?channel_binding=require&sslmode=require'

# Or use .env.local
fastget_DATABASE_URL=postgresql://...
```

### Production
- Environment variable automatically set in Vercel
- Use `vercel env pull` to load into `.env.local`

## Accessing the Database

### Via Neon Console
1. Go to https://console.neon.tech
2. Select the "fastget" project
3. Navigate to SQL Editor
4. Query the `orders` table

### Via CLI
```bash
psql postgresql://neondb_owner:PASSWORD@ep-....ap-southeast-1.aws.neon.tech/neondb
```

## Common Queries

### View All Orders
```sql
SELECT id, customer_name, status, created_at 
FROM orders 
ORDER BY created_at DESC 
LIMIT 20;
```

### Find Order by Status Token (Customer Lookup)
```sql
SELECT * FROM orders 
WHERE status_token = 'fgat6rsjo3v2p57i' 
LIMIT 1;
```

### Find Order by Update Token (Agent Lookup)
```sql
SELECT * FROM orders 
WHERE update_token = 'mrstgf5xf3zxfvcl' 
LIMIT 1;
```

### Orders by Status
```sql
-- Orders awaiting ETA assignment
SELECT id, customer_name, created_at 
FROM orders 
WHERE status = 'received'
ORDER BY created_at ASC;

-- Orders out for delivery
SELECT id, customer_name, eta 
FROM orders 
WHERE status = 'out_for_delivery'
ORDER BY created_at DESC;

-- Completed orders today
SELECT id, customer_name, total, created_at 
FROM orders 
WHERE status = 'delivered' 
  AND DATE(created_at) = CURRENT_DATE
ORDER BY created_at DESC;
```

### Total Orders and Revenue
```sql
SELECT 
  COUNT(*) as total_orders,
  SUM(total) as total_revenue,
  AVG(total) as avg_order_value
FROM orders
WHERE created_at > CURRENT_DATE - INTERVAL '30 days';
```

### Orders by Delivery Type
```sql
SELECT 
  delivery_type,
  COUNT(*) as count,
  AVG(total) as avg_value
FROM orders
GROUP BY delivery_type;
```

## Database Schema

### orders Table

| Column | Type | Details |
|--------|------|---------|
| `id` | UUID | Primary key, auto-generated |
| `created_at` | TIMESTAMP | When order was placed |
| `customer_name` | VARCHAR(255) | Full name |
| `customer_phone` | VARCHAR(20) | 10-digit phone |
| `site_address` | TEXT | Delivery address |
| `landmark` | TEXT | Optional landmark |
| `delivery_type` | VARCHAR(20) | `urgent` or `scheduled` |
| `scheduled_time` | TIMESTAMP | For scheduled deliveries |
| `items` | JSONB | Array of `{sku, name, quantity, price}` |
| `subtotal` | INTEGER | In paise |
| `convenience_fee` | INTEGER | In paise |
| `total` | INTEGER | In paise |
| `payment_method` | VARCHAR(20) | Currently always `cod` |
| `status` | VARCHAR(50) | Order status (see below) |
| `eta` | TEXT | Estimated delivery time |
| `status_token` | VARCHAR(32) | Unique token for customer tracking |
| `update_token` | VARCHAR(32) | Unique token for agent updates |

### Order Status Flow

```
received
  ↓
eta_assigned (agent sets ETA here)
  ↓
out_for_delivery
  ↓
delivered
  └─ OR cancelled (agent can cancel from received/eta_assigned)
```

Valid transitions:
- `received` → `eta_assigned`, `cancelled`
- `eta_assigned` → `out_for_delivery`, `cancelled`
- `out_for_delivery` → `delivered`
- `delivered`, `cancelled` → (terminal states)

## Indexes

For fast lookups, these indexes exist:

```sql
CREATE UNIQUE INDEX idx_orders_status_token ON orders(status_token);
CREATE UNIQUE INDEX idx_orders_update_token ON orders(update_token);
CREATE INDEX idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX idx_orders_status ON orders(status);
```

## Common Operations

### Checking if Neon is Connected
```bash
node -e "
import { neon } from '@neondatabase/serverless';
const sql = neon(process.env.fastget_DATABASE_URL);
sql\`SELECT NOW()\`.then(r => console.log('✅ Connected:', r[0]))
  .catch(e => console.error('❌ Error:', e.message))
"
```

### Exporting Orders (for reporting/backup)
```bash
# Export last 100 orders as JSON
psql postgresql://... -c "
SELECT json_agg(row_to_json(t)) 
FROM (
  SELECT * FROM orders 
  ORDER BY created_at DESC 
  LIMIT 100
) t
" > orders_backup.json
```

### Backup Strategy

**Manual backup:**
```bash
pg_dump postgresql://user:password@host/neondb > backup.sql
```

**Neon automatic backups:**
- Enabled by default
- Retained for 7 days
- Access via Neon console → Backups tab

## Important: DO NOT USE GOOGLE SHEETS

⚠️ **Google Sheets is deprecated and should NOT be used for order management.**

- Google Sheets integration was removed from production
- All orders MUST go through Neon Postgres
- Any Google Sheets data is stale and unreliable
- If you accidentally created orders in Sheets, manually migrate them to Neon

## Monitoring & Alerts

### Watch for Errors
Monitor these logs for issues:

```bash
# Recent errors in Vercel
vercel logs --filter=error --follow

# Database connection errors
grep -i "database" ~/.pm2/logs/*
```

### Performance Concerns

If queries are slow:
1. Check indexes exist: `\di` in psql
2. Check query plans: `EXPLAIN ANALYZE SELECT ...`
3. Check if API rate limits are hit (Neon free tier: 3 concurrent connections)

## Support

- **Neon Dashboard:** https://console.neon.tech
- **Documentation:** https://neon.tech/docs
- **Status Page:** https://status.neon.tech

---

**Last Updated:** May 11, 2026  
**Migration Status:** ✅ Complete — All orders in Neon, Google Sheets legacy removed
