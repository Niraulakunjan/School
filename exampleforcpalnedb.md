# Shared Module (`apps/shared`)

The `shared` app is the core architectural component of this multi-tenant restaurant management system. It provides the utilities, middleware, and routing logic required to support multiple restaurants (tenants) within a single Django installation, each with their own isolated database.

## Architecture Overview

This project employs a **Database-per-Tenant** strategy for high-level isolation.
- **Global Data**: Platform-wide data (users, tenants) lives in the `default` database.
*   **Tenant Data**: Restaurant-specific data (menus, orders, inventory) is stored in dynamically created tenant databases.

---

## Key Components

### 1. Middleware (`middleware.py`)
`TenantMiddleware` is responsible for identifying the tenant for every incoming request.

**Identification Logic (in order):**
1.  **Header**: `X-Tenant: <slug>`
2.  **Query Parameter**: `?tenant=<slug>`
3.  **Subdomain**: `<slug>.domain.com` or `<slug>.localhost`

Once identified, the tenant object is attached to `request.tenant` and the execution context is updated.

### 2. Context & Utilities (`utils.py`)
Uses Python's `contextvars` to maintain thread-safe state for the current tenant.

- **`set_current_tenant(tenant)`**: Sets the active tenant and their database alias for the current request context.
- **`get_current_tenant()`**: Retrieves the active tenant.
- **`get_current_db()`**: Returns the database alias (e.g., `tenant_db_1`) that should be used for queries.
- **`register_tenant_db(tenant)`**: Dynamically injects the tenant's database configuration into Django's `DATABASES` setting if it's not already there.

### 3. Database Routing (`router.py`)
The `TenantRouter` directs database operations to either the `default` DB or the tenant's DB.

- **`TENANT_APPS`**: (`menus`, `tables`, `orders`, `inventory`) - Always routed to the tenant database.
- **`DUAL_APPS`**: Common tables that exist in both (e.g., `auth`, `users`) to support foreign keys.
- **Routing Logic**:
    - `RestaurantStaff` models are routed to tenant databases.
    - `PlatformAdmin` and `Tenant` models are routed to the `default` database.

### 4. Model Integration (`mixins.py`)
To simplify development, models that need tenant isolation should inherit from `TenantMixin`.

- **`TenantMixin`**: Adds a `tenant` ForeignKey and overrides the default manager.
- **`TenantManager`**: Automatically filters all queries (e.g., `MyModel.objects.all()`) by the active tenant in the current context.
- **`plain_objects`**: An escape hatch to access all data across all tenants (managerial/admin use).

### 5. Role-Based Permissions (`permissions.py`)
Custom DRF permissions for restaurant-level access.

- **`IsRestaurantAdminOrManager`**: 
    - Allows `SAFE_METHODS` (GET, HEAD, OPTIONS) for authenticated users.
    - Restricts write operations to users with `RESTAURANT_ADMIN` or `MANAGER` roles within their respective tenant.

---

## Database Provisioning Automation

The system includes automated database creation via the **cPanel UAPI**.

- **Function**: `create_db_if_not_exists(db_name)` in `utils.py`.
- **Workflow**: 
    1. Authenticates with cPanel (via `.env` credentials).
    2. Creates the MySQL database.
    3. Grants the application's DB user full privileges.
- **Fallback**: If cPanel credentials are missing, it attempts a raw SQL `CREATE DATABASE` (requires high-privilege DB user).

---

## Best Practices for Developers

1.  **New Tenant Models**: Always inherit from `TenantMixin`.
2.  **App Registration**: If creating a new tenant-specific app, add it to `TENANT_APPS` in `router.py`.
3.  **Manual Queries**: Avoid hardcoding database aliases. Always use standard Django ORM, as the router and mixins handle the underlying complexity.
