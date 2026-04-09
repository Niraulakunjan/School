from django.conf import settings
from .utils import get_current_db

class TenantRouter:
    """
    A router to control all database operations on models for different tenants.
    """

    def db_for_read(self, model, **hints):
        app_label = model._meta.app_label
        
        # PLATFORM_APPS always use 'default'
        if app_label in getattr(settings, 'PLATFORM_APPS', ['tenants']):
            return 'default'
        
        # DUAL_APPS can use both, but default to current context
        # In this implementation, we mostly use current_db
        
        return get_current_db()

    def db_for_write(self, model, **hints):
        app_label = model._meta.app_label
        if app_label in getattr(settings, 'PLATFORM_APPS', ['tenants']):
            return 'default'
        return get_current_db()

    def allow_relation(self, obj1, obj2, **hints):
        """
        Allow relations if both objects are in the same database.
        """
        # In database-per-tenant, cross-database relations are generally not supported.
        # However, we allow it for simpler logic if the databases are expected to be synced.
        return True

    def allow_migrate(self, db, app_label, model_name=None, **hints):
        """
        Control which apps migrate to which databases.
        """
        platform_apps = getattr(settings, 'PLATFORM_APPS', ['tenants'])
        tenant_apps = getattr(settings, 'TENANT_APPS', [])
        dual_apps = getattr(settings, 'DUAL_APPS', ['auth', 'contenttypes', 'users'])

        if db == 'default':
            # default DB gets PLATFORM_APPS and DUAL_APPS
            return app_label in platform_apps or app_label in dual_apps
        else:
            # Tenant DBs get TENANT_APPS and DUAL_APPS
            return app_label in tenant_apps or app_label in dual_apps
