# FastGet Admin Panel Implementation

## Overview

A complete admin panel has been scaffolded under `/src/app/admin/` with the following features:

### Features Implemented

#### 1. **Authentication & Authorization**
- **Middleware Protection** (`middleware.ts`): Token-based auth guard for all `/admin` routes
- **Login Flow**: Simple password/token entry at `/admin-login`
- **Token Methods**: Supports token via:
  - URL query parameter: `?token=...`
  - HTTP header: `X-Admin-Token`
  - Cookie: `admin_token`

#### 2. **Dashboard** (`/admin`)
- **Real-time Metrics Card**:
  - Total Orders
  - Total Revenue (sum of all order totals)
  - Orders by Status (Delivered, In Transit, Pending, Cancelled)
- **Status Breakdown**: Progress bars showing distribution
- **Quick Links**: Navigate to orders or export reports

#### 3. **Orders List** (`/admin/orders`)
- **Table View**: All orders with core details (ID, Customer, Date, Amount, Status)
- **Advanced Filtering**:
  - By order status (dropdown)
  - By customer name/phone (text search)
  - By date range (from/to pickers)
  - Reset filters button
- **CSV Export**: Downloads filtered results with `Content-Disposition: attachment`
- **Click-through**: Each row links to detailed order view

#### 4. **Order Detail** (`/admin/orders/[id]`)
- **Complete Order Information**:
  - Order status with description and ETA
  - Customer info (name, phone, address, landmark)
  - Delivery details (type, scheduled time, payment method)
  - Item breakdown (SKU, name, quantity, price)
  - Payment summary (subtotal, convenience fee, total)
  - Timestamps and tokens (for debugging)
- **Server-Rendered**: Fetches order by ID from all orders

#### 5. **CSV Export** (`/admin/api/orders/export`)
- **Route Handler**: `/admin/api/orders/export`
- **Query Filters**: Respects all active filters (status, name, date range)
- **Proper Headers**: `Content-Disposition: attachment` for download
- **CSV Format**: Includes all order fields with proper escaping

#### 6. **Admin Layout** (`/admin/layout.tsx`)
- **Header Navigation**: Links to Dashboard and Orders
- **Logout Button**: Quick exit
- **Responsive Design**: Mobile-friendly with Tailwind CSS

---

## Architecture & Code Organization

### File Structure
```
src/
├── app/
│   ├── admin/
│   │   ├── layout.tsx                      # Admin wrapper layout
│   │   ├── page.tsx                        # Dashboard with metrics
│   │   ├── components/
│   │   │   └── OrdersListClient.tsx        # Client component for filters & table
│   │   ├── orders/
│   │   │   ├── page.tsx                    # Orders list server page
│   │   │   └── [id]/
│   │   │       └── page.tsx                # Order detail page
│   │   └── api/
│   │       └── orders/
│   │           └── export/
│   │               └── route.ts            # CSV export handler
│   └── admin-login/
│       └── page.tsx                        # Login page
├── lib/
│   └── sheets.ts                           # Extended with getAllOrdersFromSheets()
└── types/
    └── index.ts                            # Order, OrderStatus types

google-apps-script/
└── Code.gs                                 # Extended with getAllOrders_() function

middleware.ts                               # Admin auth guard (new file)
```

### Backend Changes

#### Google Apps Script (`Code.gs`)
- **New Function**: `getAllOrders_()` - Returns array of all order rows
- **Updated `doGet`**: Handles `action=getAllOrders` parameter

#### Sheets Helper (`src/lib/sheets.ts`)
- **New Function**: `getAllOrdersFromSheets()` - Async fetch all orders from Sheets
  - Returns: `Promise<Order[]>`
  - Converts raw Sheets rows to typed Order objects
  - Error handling with fallback to empty array

#### Middleware (`middleware.ts`)
- **Route Protection**: Matches all `/admin/**` paths
- **Token Validation**: Checks against `ADMIN_TOKEN` environment variable
- **Redirect**: Unauthenticated requests go to `/admin-login`

---

## Key Assumptions

### Google Sheets Schema
The implementation assumes the following columns exist in the Google Sheet:
```
id, created_at, customer_name, customer_phone, site_address, landmark,
delivery_type, scheduled_time, items, subtotal, convenience_fee, total,
payment_method, status, eta, status_token, update_token
```

This matches the `SheetsOrderRow` interface in `src/lib/sheets.ts`.

### Order Status Values
Assumed valid statuses (from `@/types`):
- `received`
- `eta_assigned`
- `out_for_delivery`
- `delivered`
- `cancelled`

### Items Storage
Order items are stored as JSON strings in the Sheets "items" column. Each item has:
```json
{
  "sku": "...",
  "name": "...",
  "quantity": 5,
  "price": 99.99
}
```

### Authentication
- **No User DB**: Uses environment variable `ADMIN_TOKEN` (string-based)
- **Stateless**: Token validated on every request via middleware
- **Simple Model**: One token for all admins (future: multi-user with database)

### Timestamps
- `createdAt` is ISO 8601 string (e.g., `2024-05-09T14:30:00Z`)
- Filter date comparisons work with `new Date()` parsing

---

## Environment Configuration

### Required Environment Variables

```env
# Google Apps Script integration (existing)
GOOGLE_SCRIPT_URL=https://script.google.com/macros/d/{SCRIPT_ID}/userweb?v=1
APPS_SCRIPT_SECRET=your-secret-key

# Admin authentication (new)
ADMIN_TOKEN=your-admin-password-here
```

### Optional
- None at this time

---

## Usage Guide

### Accessing the Admin Panel

1. **Login**: Navigate to `/admin-login`
2. **Enter Token**: Input the value of `ADMIN_TOKEN` env variable
3. **Access**: Redirected to `/admin` dashboard
4. **Token Persistence**: Saved as query param; include in all links
   - Example: `/admin/orders?token=xyz`
   - Example: `/admin/orders/order-123?token=xyz`

### Dashboard (`/admin`)
- View high-level metrics at a glance
- See order status distribution
- Quick link to full orders list

### Orders List (`/admin/orders`)
- **Filter**: Use dropdowns and date pickers to narrow results
- **Search**: Find by customer name or phone
- **Export**: Click "Export CSV" to download filtered data
- **Details**: Click "View" on any row to see full order info

### Order Details (`/admin/orders/[order-id]`)
- View complete order information
- See all items, customer details, and payment breakdown
- Tokens included for debugging (status_token, update_token)

### CSV Export
- **Location**: Click "Export CSV" button on orders list
- **Filename**: `orders-YYYY-MM-DD.csv`
- **Contents**: Includes filtered orders in standard CSV format
- **Escaping**: Handles commas, quotes, and newlines properly

---

## Component Breakdown

### Server Components (Data Fetching)
1. **`/admin/page.tsx`**: Fetches all orders, computes metrics
2. **`/admin/orders/page.tsx`**: Fetches orders, wraps client component
3. **`/admin/orders/[id]/page.tsx`**: Finds order by ID, displays details

### Client Components (Interactivity)
1. **`OrdersListClient.tsx`**: Filters, table rendering, search
2. **`admin/layout.tsx`**: Navigation, logout
3. **`admin-login/page.tsx`**: Token input form

### API Routes (Data Export)
1. **`/admin/api/orders/export/route.ts`**: Handles CSV generation and download

---

## Styling

All components use **Tailwind CSS** exclusively:
- No external admin frameworks
- Consistent with rest of project (`globals.css`)
- Responsive grid layouts (mobile-first)
- Status badges with color coding
- Card-based sections with borders and shadows

---

## Next Steps / Future Enhancements

### Recommended
1. **Update Order Status**: Add button in order detail to change status
2. **Multi-User Admin**: Add database for admin accounts
3. **Activity Logs**: Track who updated what and when
4. **Bulk Operations**: Select multiple orders and bulk export/update
5. **Advanced Charts**: Dashboard with revenue trends, order volume over time

### Optional
1. **Admin Settings**: Configuration UI for AGENT_PIN, secrets
2. **Order Notes**: Add admin notes field to orders
3. **Customer Dashboard**: Let customers track via status_token
4. **Email Notifications**: Alert admins of new orders
5. **Print Orders**: Print invoice or packing slip

---

## Testing Checklist

- [ ] Set `ADMIN_TOKEN` in `.env.local`
- [ ] Run `npm run dev`
- [ ] Navigate to `/admin-login`
- [ ] Enter token, verify redirect to `/admin`
- [ ] View dashboard metrics (should show order counts)
- [ ] Click "View All Orders" → verify orders display
- [ ] Apply filters (status, date, name) → verify filtering works
- [ ] Click "View" on an order → verify detail page loads
- [ ] Click "Export CSV" → verify file downloads with correct data
- [ ] Remove token from URL, reload → verify redirect to login
- [ ] Test date filter with various ranges
- [ ] Verify CSV file opens correctly in Excel/Sheets

---

## Troubleshooting

### "Unauthorized" Error
- Verify `ADMIN_TOKEN` is set in `.env.local`
- Check token matches exactly (case-sensitive)
- Verify `APPS_SCRIPT_SECRET` is correct in env vars

### Empty Orders List
- Check `GOOGLE_SCRIPT_URL` is configured
- Verify Google Sheet has data in "Orders" sheet
- Check sheet headers match `SheetsOrderRow` interface
- Try `npm run dev` to restart and refetch

### CSV Export Not Working
- Verify filters are correctly passed in query params
- Check browser console for any error messages
- Ensure orders exist that match filters
- Try exporting all (reset filters) first

### Orders Not Showing in Detail View
- Verify order ID in URL matches a real order
- Check that `getAllOrdersFromSheets()` returns data
- Confirm order's `status` field is valid (one of the enum values)

---

## Security Notes

⚠️ **Current Implementation**:
- Simple token-based auth (no hashing)
- Token in URL (visible in browser history)
- No rate limiting
- No audit logging

🔒 **For Production**:
1. Use HTTPS only
2. Hash and validate token securely
3. Add rate limiting on login attempts
4. Implement audit logging
5. Consider OAuth/SAML integration
6. Set secure cookie flags: `HttpOnly`, `Secure`, `SameSite`

---

## Tech Stack Summary

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Database**: Google Sheets (via Apps Script)
- **Auth**: Simple token-based (middleware)
- **Data Format**: CSV export, JSON for Sheets API

---

**Admin Panel Version**: 1.0.0
**Last Updated**: 2024-05-09
