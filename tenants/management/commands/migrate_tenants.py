from django.core.management.base import BaseCommand
from django.core.management import call_command
from tenants.models import SchoolTenant
from apps.shared.utils import register_tenant_db
import logging

logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = 'Runs migrations for all tenants to ensure their database schemas are up to date.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--repair-admin',
            action='store_true',
            help='Forces re-migration of the admin app to fix missing tables (repair mode).',
        )

    def handle(self, *args, **options):
        repair_admin = options['repair_admin']
        
        self.stdout.write(self.style.MIGRATE_HEADING("Starting migration for all tenants..."))
        if repair_admin:
            self.stdout.write(self.style.WARNING("!!! REPAIR MODE ENABLED for 'admin' app !!!"))
        
        # 1. Fetch all tenants from the primary (default) database
        tenants = SchoolTenant.objects.using('default').all()
        
        if not tenants.exists():
            self.stdout.write(self.style.WARNING("No tenants found in the platform database."))
            return

        count = tenants.count()
        self.stdout.write(f"Found {count} tenant(s).")

        for tenant in tenants:
            self.stdout.write(self.style.SUCCESS(f"\n>>> Processing Tenant: {tenant.name}"))
            self.stdout.write(f"    Database Alias: {tenant.db_name}")
            
            try:
                # 2. Register the database configuration dynamically
                register_tenant_db(tenant)
                db_alias = tenant.db_name
                
                from django.conf import settings
                if db_alias not in settings.DATABASES:
                    self.stdout.write(self.style.ERROR(f"    Error: Database configuration for '{db_alias}' could not be registered."))
                    continue

                if repair_admin:
                    self.stdout.write(f"    [Repair] Rolling back admin migration history (fake)...")
                    # Clear migration history for 'admin' app on this database
                    call_command('migrate', 'admin', 'zero', database=db_alias, fake=True, interactive=False, verbosity=0)
                
                self.stdout.write(f"    Running migrations...")
                call_command('migrate', database=db_alias, interactive=False, verbosity=1)
                
                self.stdout.write(self.style.SUCCESS(f"    ✔ Successfully migrated {tenant.db_name}"))
            except Exception as e:
                self.stdout.write(self.style.ERROR(f"    [!] Error migrating {tenant.db_name}: {e}"))
        
        self.stdout.write(self.style.MIGRATE_HEADING("\nFinished migrating all tenants."))
