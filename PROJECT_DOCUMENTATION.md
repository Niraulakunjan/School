# SajiloSchool — Project Documentation

> **Version:** 1.0  
> **Last Updated:** March 2026  
> **Project Type:** Multi-Tenant School Management System (REST API Backend)

---

## Table of Contents

1. [What is SajiloSchool? (Non-Technical Overview)](#1-what-is-sajiloschool-non-technical-overview)
2. [Technology Stack](#2-technology-stack)
3. [Project Architecture](#3-project-architecture)
4. [Multi-Tenancy Explained](#4-multi-tenancy-explained)
5. [Data Models (Database Structure)](#5-data-models-database-structure)
6. [API Endpoints Reference](#6-api-endpoints-reference)
7. [Authentication](#7-authentication)
8. [User Roles](#8-user-roles)
9. [Setup & Installation](#9-setup--installation)
10. [Environment Variables](#10-environment-variables)
11. [Database Configuration](#11-database-configuration)
12. [Project Folder Structure](#12-project-folder-structure)

---

## 1. What is SajiloSchool? (Non-Technical Overview)

**SajiloSchool** is a backend software system that helps manage schools digitally. It is built to serve **multiple schools at once** — each school gets its own space (like a private room) inside the same system, so their data is completely separate from other schools.

### What does it do?

| Feature | Description |
|---|---|
| 🏫 **Multiple Schools** | One installation can run many schools simultaneously. Each school has its own data. |
| 👤 **User Management** | Handles accounts for admins, teachers, students, parents, and staff. |
| 🎓 **Student Records** | Stores student profiles, registration numbers, date of birth, and guardian details. |
| 👩‍🏫 **Teacher Records** | Stores teacher profiles, employee IDs, qualifications, and departments. |
| 🔐 **Secure Login** | Uses a modern, token-based login system (JWT) so only authorised users can access data. |
| 🌐 **API-First Design** | The system exposes a clean REST API so any frontend (web app, mobile app) can connect to it. |

### Who is it for?

- **School Administrators** — manage their school's users, students, and teachers.
- **IT Teams / Developers** — integrate the API with their frontend or mobile apps.
- **SaaS Operators** — run multiple schools from a single hosted server.

---

## 2. Technology Stack

| Layer | Technology | Purpose |
|---|---|---|
| Language | Python 3.x | Backend programming language |
| Framework | Django 5+ / 6 | Web framework |
| API Layer | Django REST Framework (DRF) | Builds the REST API |
| Authentication | SimpleJWT | Secure JSON Web Token login |
| Database (default) | SQLite / MySQL | Stores data (SQLite for dev, MySQL for production) |
| CORS | django-cors-headers | Allows frontend apps to call the API from a browser |
| Config | python-dotenv | Loads environment variables from `.env` file |

---

## 3. Project Architecture

The system follows a clean, modular Django architecture. Each functional area (tenants, users, students, teachers) is its own **Django app** with its own models, serializers, and views.

```
SajiloSchool (Django Project)
│
├── school_system/       ← Core project config (settings, routing, middleware)
│   ├── settings.py      ← Main settings file
│   ├── urls.py          ← Central URL registrations (API routes)
│   ├── middleware.py    ← Tenant detection middleware
│   └── router.py       ← Database router (sends queries to correct DB)
│
├── tenants/             ← Manages school tenants (one record per school)
├── users/               ← Custom user model with roles + authentication
├── students/            ← Student profile model & API
└── teachers/            ← Teacher profile model & API
```

### Request Flow

```
HTTP Request
    │
    ▼
TenantMiddleware          ← Reads "X-Tenant" header or subdomain
    │                        to identify which school is making the request
    ▼
TenantDatabaseRouter      ← Directs all DB reads/writes to the correct
    │                        school database
    ▼
DRF View (JWT Protected)  ← Checks login token, then processes the request
    │
    ▼
Response (JSON)
```

---

## 4. Multi-Tenancy Explained

### For Non-Technical Readers

Imagine a large building with many offices. Each school rents one office. They share the same building (server), but they lock their own door — no one else can enter. SajiloSchool works the same way. Each school has its own database so their student/teacher data is completely private.

### For Backend Developers

The system uses a **shared-infrastructure, separate-database** multi-tenancy strategy:

- A single **public `default` database** (`db.sqlite3` / MySQL `school_db_public`) stores only the `SchoolTenant` registry — essentially a lookup table mapping domain/subdomain → database name.
- Each school has its own dedicated database (e.g., `school1.sqlite3` or MySQL `school1_db`).
- **`TenantMiddleware`** runs on every request. It reads the `X-Tenant` HTTP header, or falls back to extracting the subdomain from the `Host` header. It then looks up the matching `SchoolTenant` record and stores the target database name in **thread-local storage**.
- **`TenantDatabaseRouter`** intercepts all ORM queries. For any model NOT in the `tenants` app, it routes reads and writes to the database stored in thread-locals. The `tenants` app always reads/writes to `default`.
- If the tenant database is not yet registered in `settings.DATABASES`, `setup_tenant_db()` dynamically adds it at runtime.

**Tenant identification options:**

| Method | Example |
|---|---|
| HTTP Header | `X-Tenant: greenvalley` |
| Subdomain | `greenvalley.sajiloschool.com` → `greenvalley` |

---

## 5. Data Models (Database Structure)

### SchoolTenant (`tenants` app — lives in `default` DB)

| Field | Type | Description |
|---|---|---|
| `id` | Auto Int | Primary key |
| `name` | CharField(100) | Human-readable school name (e.g., "Green Valley School") |
| `domain_url` | CharField(100), unique | Subdomain or header value to identify this tenant (e.g., `greenvalley`) |
| `db_name` | CharField(100), unique | Name of this school's dedicated database (e.g., `greenvalley_db`) |
| `created_on` | DateField | Record creation date (auto-set) |

---

### User (`users` app — custom auth user)

Extends Django's built-in `AbstractUser` with role and contact fields.

| Field | Type | Description |
|---|---|---|
| `id` | Auto Int | Primary key |
| `username` | CharField | Login username |
| `email` | EmailField | Email address (also used for login) |
| `first_name` | CharField | First name |
| `last_name` | CharField | Last name |
| `role` | CharField (choices) | One of: `SUPERUSER`, `ADMIN`, `TEACHER`, `STUDENT`, `PARENT`, `STAFF` |
| `phone_number` | CharField(15), optional | Contact phone number |
| `address` | TextField, optional | Physical address |
| `password` | (hashed) | Login password |

**Authentication backends configured:**
1. `EmailOrUsernameModelBackend` — users can log in with either email or username.
2. Standard Django backend (fallback).

---

### Student (`students` app)

A profile linked 1-to-1 to a `User` with role `STUDENT`.

| Field | Type | Description |
|---|---|---|
| `id` | Auto Int | Primary key |
| `user` | OneToOneField → User | The associated user account |
| `registration_number` | CharField(50), unique | e.g., `ST-A1B2C3D4` (auto-generated if not provided) |
| `date_of_birth` | DateField | Student's date of birth |
| `guardian_name` | CharField(100) | Parent/guardian name |
| `guardian_phone` | CharField(15) | Parent/guardian phone |
| `enrolled_at` | DateTimeField | Enrollment timestamp (auto-set) |

---

### Teacher (`teachers` app)

A profile linked 1-to-1 to a `User` with role `TEACHER`.

| Field | Type | Description |
|---|---|---|
| `id` | Auto Int | Primary key |
| `user` | OneToOneField → User | The associated user account |
| `employee_id` | CharField(50), unique | e.g., `TC-A1B2C3D4` (auto-generated if not provided) |
| `qualification` | CharField(100) | Degree/qualification |
| `department` | CharField(100), optional | Department name |
| `joined_at` | DateField | Date joined (auto-set) |

---

## 6. API Endpoints Reference

All API endpoints are prefixed with `/api/`. All endpoints (except token endpoints) require a valid JWT access token in the `Authorization` header.

### Authentication

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/token/` | Login — returns `access` and `refresh` tokens |
| POST | `/api/token/refresh/` | Get a new access token using the refresh token |

**Login request body:**
```json
{
  "username": "admin",   // or email address
  "password": "secret"
}
```

**Login response:**
```json
{
  "access": "<JWT access token>",
  "refresh": "<JWT refresh token>"
}
```

---

### Users (`/api/users/`)

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/users/` | List all users |
| POST | `/api/users/` | Create a new user (auto-creates Student/Teacher profile by role) |
| GET | `/api/users/{id}/` | Get a specific user |
| PUT/PATCH | `/api/users/{id}/` | Update a user |
| DELETE | `/api/users/{id}/` | Delete a user |
| GET | `/api/users/me/` | Get the currently logged-in user's profile |

> **Note:** When creating a user with role `STUDENT`, a `Student` profile is automatically created. Same for `TEACHER` → `Teacher` profile.

---

### Students (`/api/students/`)

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/students/` | List all students |
| POST | `/api/students/` | Create a student profile |
| GET | `/api/students/{id}/` | Get a specific student |
| PUT/PATCH | `/api/students/{id}/` | Update a student |
| DELETE | `/api/students/{id}/` | Delete a student |

---

### Teachers (`/api/teachers/`)

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/teachers/` | List all teachers |
| POST | `/api/teachers/` | Create a teacher profile |
| GET | `/api/teachers/{id}/` | Get a specific teacher |
| PUT/PATCH | `/api/teachers/{id}/` | Update a teacher |
| DELETE | `/api/teachers/{id}/` | Delete a teacher |

---

### Tenants (`/api/tenants/`)

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/tenants/` | List all registered school tenants |
| POST | `/api/tenants/` | Register a new school tenant |
| GET | `/api/tenants/{id}/` | Get a specific tenant |
| PUT/PATCH | `/api/tenants/{id}/` | Update tenant info |
| DELETE | `/api/tenants/{id}/` | Remove a tenant |

---

### Django Admin Panel

| URL | Description |
|---|---|
| `/admin/` | Standard Django admin interface for direct data management |

---

## 7. Authentication

The system uses **JWT (JSON Web Token)** authentication via `djangorestframework-simplejwt`.

### Token Lifetime

| Token | Lifetime |
|---|---|
| Access Token | 60 minutes |
| Refresh Token | 1 day |

### How to use the token in requests

Include the access token in the request header:

```
Authorization: Bearer <your_access_token>
```

### For Tenant-Scoped Requests

Always include the tenant identifier in the header:

```
X-Tenant: greenvalley
```

Or simply make the request from the school's subdomain: `http://greenvalley.sajiloschool.com/api/users/`

---

## 8. User Roles

| Role | Code | Description |
|---|---|---|
| Superuser | `SUPERUSER` | Full system access across all tenants |
| Admin | `ADMIN` | School administrator (default role) |
| Teacher | `TEACHER` | School teacher (auto-gets Teacher profile) |
| Student | `STUDENT` | School student (auto-gets Student profile) |
| Parent | `PARENT` | Parent/guardian account |
| Staff | `STAFF` | Non-teaching staff |

---

## 9. Setup & Installation

### Prerequisites

- Python 3.10+
- pip
- (For production) MySQL Server

### Steps

```bash
# 1. Clone the repository
git clone <repository-url>
cd sajiloschool

# 2. Create and activate a virtual environment
python -m venv venv
source venv/bin/activate        # macOS/Linux
venv\Scripts\activate           # Windows

# 3. Install dependencies
pip install -r requirements.txt

# 4. Create the .env file (copy from example and fill in values)
cp example.md .env              # or create manually

# 5. Run initial migrations (creates the default/public database)
python manage.py migrate

# 6. Create a superuser
python manage.py createsuperuser

# 7. Start the development server
python manage.py runserver
```

The API will be available at: `http://127.0.0.1:8000/`

### Adding a New School (Tenant)

1. Log in to the admin panel at `/admin/` (or use the API).
2. Create a `SchoolTenant` record with a `domain_url` (e.g., `greenvalley`) and a `db_name` (e.g., `greenvalley_db`).
3. Run migrations to create that school's database tables:

```bash
python manage.py migrate --database=greenvalley_db
```

---

## 10. Environment Variables

Create a `.env` file in the project root with the following variables:

```env
# Django Core
SECRET_KEY=your-very-secret-key-here
DEBUG=True                         # Set to False in production
ALLOWED_HOSTS=*                    # Comma-separated hosts in production

# Database type: 'sqlite' (default/dev) or 'mysql' (production)
DB_TYPE=sqlite

# MySQL settings (only needed if DB_TYPE=mysql)
DB_NAME=school_db_public
DB_USER=root
DB_PASSWORD=your_db_password
DB_HOST=localhost
DB_PORT=3306
```

---

## 11. Database Configuration

### Development (Default)

Uses SQLite. The `default` database is `db.sqlite3`. Each tenant gets its own `<db_name>.sqlite3` file.

### Production (MySQL)

Set `DB_TYPE=mysql` in `.env`. The `default` database is the MySQL database specified in `DB_NAME`. Each tenant will use its own MySQL database (same server, different database name). The `TenantMiddleware` creates the connection config automatically at runtime based on the default DB credentials.

---

## 12. Project Folder Structure

```
sajiloschool/
│
├── .env                      ← Environment variables (do NOT commit to git)
├── .gitignore
├── manage.py                 ← Django management entry point
├── requirements.txt          ← Python dependencies
├── db.sqlite3                ← Default/public SQLite database
│
├── school_system/            ← Core project package
│   ├── settings.py           ← Django settings (DB, JWT, installed apps, etc.)
│   ├── urls.py               ← All API URL routes registered here
│   ├── middleware.py         ← TenantMiddleware: identifies school per request
│   ├── router.py             ← TenantDatabaseRouter: routes queries to correct DB
│   ├── wsgi.py               ← WSGI entry point for deployment
│   └── asgi.py               ← ASGI entry point (async support)
│
├── tenants/                  ← School tenant registry
│   ├── models.py             ← SchoolTenant model
│   ├── serializers.py        ← DRF serializer for tenants
│   └── views.py              ← CRUD ViewSet for tenants
│
├── users/                    ← Custom user management
│   ├── models.py             ← User model with roles
│   ├── serializers.py        ← UserSerializer (auto-creates Student/Teacher profile)
│   ├── views.py              ← UserViewSet + /me/ endpoint
│   └── backends.py           ← Custom auth: login with email or username
│
├── students/                 ← Student profiles
│   ├── models.py             ← Student model
│   ├── serializers.py        ← StudentSerializer
│   └── views.py              ← StudentViewSet
│
└── teachers/                 ← Teacher profiles
    ├── models.py             ← Teacher model
    ├── serializers.py        ← TeacherSerializer
    └── views.py              ← TeacherViewSet
```

---

*Document prepared for the SajiloSchool project — March 2026.*
