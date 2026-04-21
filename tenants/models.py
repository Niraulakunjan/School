from django.db import models

class SchoolTenant(models.Model):
    name = models.CharField(max_length=100)
    domain_url = models.CharField(max_length=100, unique=True, help_text="e.g., school1.sajiloschool.com or school1")
    db_name = models.CharField(max_length=100, unique=True, help_text="Database name or sqlite filename without extension")
    
    # Global Branding
    logo = models.ImageField(upload_to='tenants/logos/', null=True, blank=True)
    address = models.CharField(max_length=255, blank=True)
    phone = models.CharField(max_length=20, blank=True)
    email = models.EmailField(blank=True)
    is_active = models.BooleanField(default=True)
    created_on = models.DateField(auto_now_add=True)

    def save(self, *args, **kwargs):
        """Enforce cPanel DB prefix if set in environment."""
        import os
        prefix = os.environ.get('DB_PREFIX', '')
        if prefix and self.db_name and not self.db_name.startswith(prefix):
            self.db_name = f"{prefix}{self.db_name}"
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name
