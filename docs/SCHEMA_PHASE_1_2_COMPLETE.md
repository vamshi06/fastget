# Phase 1 & 2 Database Schema Implementation - Complete

## ✅ What Was Implemented

### Phase 1: User Management Tables

**1. `users` Table**
- Columns: id, email, password_hash, phone, role, preferred_address_id, last_order_at, created_at, updated_at
- Unique index on email
- Roles: 'customer', 'agent', 'admin'
- Supports NULL password_hash for social login (future)

**2. `user_addresses` Table**
- Columns: id, user_id, type, street, landmark, city, phone, is_primary, created_at
- Foreign key to users.id with CASCADE delete
- Types: 'home', 'work', 'other'
- Index on user_id for fast lookups
- Unique constraint on (user_id, is_primary) when is_primary=true

### Phase 2: Product Catalog Tables

**1. `categories` Table**
- Columns: id, name, slug, description, created_at
- Unique index on slug for URL-friendly lookups

**2. `products` Table**
- Columns: id, name, description, category_id, price, status, created_at, updated_at
- Price in paise (1 rupee = 100 paise) for precision
- Status: 'active', 'inactive', 'discontinued'
- Foreign key to categories.id with SET NULL on delete

**3. `product_variants` Table**
- Columns: id, product_id, sku, price_override, stock_quantity, attributes, created_at
- SKU is unique per variant
- Attributes stored as JSONB for flexibility (e.g., {"size": "M", "color": "red"})
- price_override allows variants to have different prices
- stock_quantity for inventory tracking
- Foreign key to products.id with CASCADE delete

### Phase 4: User Preferences

**1. `wishlists` Table**
- Columns: id, user_id, variant_id, added_at
- Unique constraint on (user_id, variant_id)
- Foreign keys to users and product_variants with CASCADE delete

### Existing Table Modifications

**`orders` Table**
- Added user_id column (UUID, nullable, FK to users.id)
- Allows linking historical orders to user accounts
- Backward compatible with anonymous orders (user_id = NULL)

## 📁 Files Created/Modified

### New Files Created:
1. **`src/lib/users.ts`** - User CRUD operations
   - createUser, getUserByEmail, getUserById
   - updateUserPassword, updatePreferredAddress, updateLastOrderTime
   - createUserAddress, getUserAddresses, getPrimaryAddress
   - updateUserAddress, deleteUserAddress
   - Full error handling and type conversion

2. **`src/lib/products.ts`** - Product catalog CRUD operations
   - Category operations: createCategory, getCategoryBySlug, getAllCategories
   - Product operations: createProduct, getProductById, getActiveProducts, updateProductStatus, updateProductPrice
   - Variant operations: createProductVariant, getVariantBySku, getProductVariants, updateVariantStock, updateVariantPrice
   - Utility: getEffectivePrice, checkStockAvailability
   - Full error handling and type conversion

3. **`scripts/test-schema.mjs`** - Verification script
   - Verifies all 7 tables exist
   - Checks all indexes are created
   - Validates foreign key constraints
   - Confirms unique constraints
   - Verifies critical columns
   - Comprehensive error reporting

### Files Modified:
1. **`src/lib/db.ts`**
   - Added initializeUsersTable()
   - Added initializeUserAddressesTable()
   - Added initializeCategoriesTable()
   - Added initializeProductsTable()
   - Added initializeProductVariantsTable()
   - Added initializeWishlistsTable()
   - Added addUserIdToOrders() - safely modifies existing orders table
   - Added initializeAllTables() - master initialization function
   - Enhanced createOrder() with auto-retry on missing table
   - Modified initializeDatabase() to include user_id column

2. **`src/types/index.ts`**
   - Added UserRole type: 'customer' | 'agent' | 'admin'
   - Added User interface
   - Added AddressType: 'home' | 'work' | 'other'
   - Added UserAddress interface
   - Added CategoryDB interface
   - Added ProductDB interface
   - Added ProductVariant interface
   - Added Wishlist interface

3. **`scripts/init-db.mjs`**
   - Updated to call initializeAllTables()
   - Better error messaging
   - Step-by-step initialization logging

## 🚀 How to Use

### 1. Initialize All Tables
```bash
node scripts/init-db.mjs
```
This will:
- Create all 7 tables
- Set up all indexes
- Configure all foreign keys
- Enable CASCADE deletes

### 2. Verify Schema
```bash
node scripts/test-schema.mjs
```
This will verify:
- All tables exist
- All indexes are created
- All constraints are working
- All critical columns present

### 3. Use in Your App

**User Operations:**
```typescript
import { createUser, getUserByEmail, getUserAddresses, createUserAddress } from '@/lib/users';

// Create a user
const user = await createUser('john@example.com', '+91-9999999999', 'customer');

// Get user by email
const found = await getUserByEmail('john@example.com');

// Add addresses
const address = await createUserAddress(
  user.id,
  'home',
  '123 Main St',
  'Bangalore',
  '+91-9999999999',
  'Near the park',
  true
);
```

**Product Operations:**
```typescript
import { 
  createProduct, 
  getProductById, 
  createProductVariant, 
  getVariantBySku 
} from '@/lib/products';

// Create a product
const product = await createProduct(
  'Hammer',
  49900, // 499 rupees in paise
  'Heavy duty hammer',
  categoryId
);

// Add variants
const variant = await createProductVariant(
  product.id,
  'HAMMER-001-L',
  50, // stock quantity
  { weight: '500g', color: 'red' }
);
```

## 📊 Database Architecture

```
Phase 1: User Management
├── users (id, email, phone, role, ...)
└── user_addresses (user_id FK, type, address)

Phase 2: Product Catalog
├── categories (id, name, slug)
├── products (id, name, category_id FK, price)
└── product_variants (id, product_id FK, sku, stock_quantity, attributes)

Phase 4: User Preferences
└── wishlists (user_id FK, variant_id FK)

Existing Orders (Modified)
└── orders (id, user_id FK [NEW], ...)
```

## 🔒 Data Integrity Features

1. **Foreign Key Constraints**
   - user_addresses → users (CASCADE delete)
   - products → categories (SET NULL on delete)
   - product_variants → products (CASCADE delete)
   - wishlists → users, product_variants (CASCADE delete)
   - orders → users (SET NULL on delete)

2. **Unique Constraints**
   - users.email (UNIQUE)
   - categories.slug (UNIQUE)
   - product_variants.sku (UNIQUE)
   - wishlists (user_id, variant_id) (UNIQUE)

3. **Check Constraints**
   - users.role IN ('customer', 'agent', 'admin')
   - products.status IN ('active', 'inactive', 'discontinued')
   - user_addresses.type IN ('home', 'work', 'other')
   - orders.delivery_type IN ('urgent', 'scheduled')
   - orders.status IN ('received', 'eta_assigned', 'out_for_delivery', 'delivered', 'cancelled')

## ✅ Verification Checklist

- [x] All 7 tables created
- [x] All indexes created for performance
- [x] Foreign keys configured with cascades
- [x] Unique constraints applied
- [x] Check constraints for data validation
- [x] TypeScript interfaces defined
- [x] CRUD operations implemented
- [x] Error handling in all functions
- [x] Build succeeds without errors
- [x] Backward compatible with existing orders

## 🔄 Integration with Orders

The `orders` table now has an optional `user_id` column:
- **Null user_id** = anonymous checkout (existing behavior preserved)
- **Valid user_id** = authenticated user order (new feature)

This allows:
- Tracking order history per user
- Linking addresses to orders
- Future: Personalized recommendations
- Future: Payment method shortcuts

## 🎯 Next Steps (Future Phases)

1. **Authentication** - Implement signup/login with bcrypt
2. **User Dashboard** - Show order history per user
3. **Admin Panel** - Manage users, products, inventory
4. **Reviews** - Add reviews table for product feedback
5. **Inventory Management** - Low stock alerts, reorder system
6. **Search & Filter** - Full-text search on products

## 📝 Notes

- All timestamps use UTC with TIMESTAMP WITH TIME ZONE
- Prices stored in paise (100 paise = 1 rupee) for precision
- Attributes in product_variants use JSONB for flexibility
- Database auto-initializes on first API call if tables missing
- All functions have comprehensive error logging

---

**Status:** ✅ Ready for testing and integration
