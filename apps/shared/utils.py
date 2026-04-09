import contextvars
from django.db import connection, connections
from django.conf import settings
from pathlib import Path
import os
import requests
import urllib3

# Context variables to store the current tenant and their database alias
_current_tenant = contextvars.ContextVar("current_tenant", default=None)
_current_db = contextvars.ContextVar("current_db", default="default")

def set_current_tenant(tenant):
    """Sets the current tenant and their database for the current context."""
    if tenant:
        if not tenant.db_name:
            raise ValueError(f"Tenant '{tenant.name}' has no db_name assigned.")
        
        # Proactively register the tenant's database configuration
        register_tenant_db(tenant)
        
        _current_db.set(tenant.db_name)
    else:
        _current_db.set("default")
    return _current_tenant.set(tenant)

def get_current_db():
    """Returns the current database alias from the current context."""
    return _current_db.get()

def get_current_db_name():
    """Alias for get_current_db to fix broken imports and provide flexibility."""
    return get_current_db()

def get_current_tenant():
    """Returns the current tenant from the current context."""
    return _current_tenant.get()

def clear_current_tenant(token=None):
    """Clears the current tenant context."""
    if token:
        _current_tenant.reset(token)
    else:
        _current_tenant.set(None)
        _current_db.set("default")

def register_tenant_db(tenant):
    """
    Dynamically adds a tenant's database to Django settings if not already present.
    """
    if not tenant.db_name:
        return

    if tenant.db_name not in settings.DATABASES:
        # Start with a copy of the default database configuration
        new_db_config = settings.DATABASES['default'].copy()
        db_type = getattr(settings, 'DB_TYPE', 'sqlite')

        if db_type == 'sqlite':
            new_db_config['ENGINE'] = 'django.db.backends.sqlite3'
            new_db_config['NAME'] = Path(settings.BASE_DIR) / f"{tenant.db_name}.sqlite3"
        else:
            # Assuming MySQL for cPanel
            new_db_config['NAME'] = tenant.db_name
        
        settings.DATABASES[tenant.db_name] = new_db_config

def create_db_if_not_exists(db_name):
    """
    Creates a MySQL database via the cPanel UAPI and grants the configured
    DB user full access to it.
    """
    urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

    cpanel_user   = os.environ.get('CPANEL_USERNAME', '')
    cpanel_pass   = os.environ.get('CPANEL_PASSWORD', '')
    cpanel_token  = os.environ.get('CPANEL_API_TOKEN', '')
    cpanel_domain = os.environ.get('CPANEL_DOMAIN', 'localhost')
    
    # Get database user from settings
    default_db = settings.DATABASES.get('default', {})
    db_user = default_db.get('USER', '')

    base_url = f"https://{cpanel_domain}:2083/execute/Mysql"

    if cpanel_user and (cpanel_pass or cpanel_token):
        # Build request headers
        if cpanel_token:
            headers = {
                'Authorization': f'cpanel {cpanel_user}:{cpanel_token}'
            }
            auth = None
        else:
            headers = {}
            auth = (cpanel_user, cpanel_pass)

        # ── 1. Create the database ─────────────────────────────────────────
        try:
            resp = requests.post(
                f"{base_url}/create_database",
                params={'name': db_name},
                headers=headers,
                auth=auth,
                verify=False,
                timeout=30,
            )
            data = resp.json()
            if data.get('status') == 1:
                print(f"[cPanel] ✔ Database '{db_name}' created (or already exists).")
            else:
                errors = data.get('errors') or []
                if any('exist' in str(e).lower() for e in errors):
                    print(f"[cPanel] Database '{db_name}' already exists — OK.")
                else:
                    print(f"[cPanel] Warning creating '{db_name}': {errors}")
        except Exception as e:
            print(f"[cPanel] Error creating database '{db_name}': {e}")

        # ── 2. Assign user to database ─────────────────────────────────────
        if db_user:
            try:
                resp = requests.post(
                    f"{base_url}/set_privileges_on_database",
                    params={
                        'user': db_user,
                        'database': db_name,
                        'privileges': 'ALL PRIVILEGES',
                    },
                    headers=headers,
                    auth=auth,
                    verify=False,
                    timeout=30,
                )
                data = resp.json()
                if data.get('status') == 1:
                    print(f"[cPanel] ✔ Granted ALL PRIVILEGES on '{db_name}' to '{db_user}'.")
                else:
                    print(f"[cPanel] Warning granting privileges: {data.get('errors')}")
            except Exception as e:
                print(f"[cPanel] Error granting privileges on '{db_name}': {e}")
    else:
        # Fallback: try raw SQL (only works if the DB user has CREATE privilege)
        print(f"[DB] cPanel credentials not set. Trying raw SQL CREATE DATABASE...")
        try:
            with connections['default'].cursor() as cursor:
                cursor.execute(
                    f"CREATE DATABASE IF NOT EXISTS `{db_name}` "
                    f"CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"
                )
                print(f"[DB] ✔ Database '{db_name}' created via raw SQL.")
        except Exception as e:
            print(f"[DB] Could not create '{db_name}': {e}")
            print(f"[DB] Set CPANEL_USERNAME + CPANEL_PASSWORD in .env to enable auto-creation.")
