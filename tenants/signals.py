from django.db.models.signals import post_save, post_migrate
from django.dispatch import receiver
from django.core.management import call_command
from .models import SchoolTenant
from .utils import register_tenant_db, create_db_if_not_exists
import logging

logger = logging.getLogger(__name__)

@receiver(post_save, sender=SchoolTenant)
def auto_migrate_new_tenant(sender, instance, created, **kwargs):
    """
    Triggered when a new SchoolTenant is created.
    Automatically creates the DB on cPanel and runs migrations.
    """
    if created:
        db_alias = instance.db_name
        logger.info(f"New tenant created: {instance.name}. Provisioning DB: {db_alias}")
        
        try:
            # 1. Create the database (cPanel or local fallback)
            create_db_if_not_exists(db_alias)

            # 2. Register the database configuration in Django
            register_tenant_db(instance)
            
            # 3. Run initial migrations on the NEW database
            call_command('migrate', database=db_alias, interactive=False, verbosity=1)
            
            logger.info(f"Successfully provisioned and migrated DB: {db_alias}")
        except Exception as e:
            logger.error(f"Failed to provision DB {db_alias}: {e}")

@receiver(post_migrate)
def sync_all_tenants_after_migration(sender, **kwargs):
    """
    Triggered after migrations are applied to the primary database.
    Ensures all tenant databases are synchronized with the latest schema.
    """
    if sender.name == 'tenants' and kwargs.get('using') == 'default':
        logger.info("Detected migration in 'tenants' app on 'default' DB. Synchronizing all tenant databases...")
        
        tenants = SchoolTenant.objects.using('default').all()
        
        for tenant in tenants:
            try:
                register_tenant_db(tenant)
                logger.info(f"Syncing tenant database: {tenant.db_name}")
                call_command('migrate', database=tenant.db_name, interactive=False, verbosity=0)
            except Exception as e:
                logger.error(f"Error syncing tenant database {tenant.db_name}: {e}")
        
        logger.info("All tenant databases are now synchronized.")
