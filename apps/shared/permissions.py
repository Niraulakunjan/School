from rest_framework import permissions

class IsSchoolAdminOrStaff(permissions.BasePermission):
    """
    Custom permission to allow:
    - SAFE_METHODS (GET, HEAD, OPTIONS) for authenticated users.
    - Write operations only for users with ADMIN or STAFF roles.
    """
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
            
        if request.method in permissions.SAFE_METHODS:
            return True
            
        return request.user.role in ['ADMIN', 'STAFF', 'SUPERUSER']

class IsTenantOwner(permissions.BasePermission):
    """
    Allows access only to users who are linked to the current tenant.
    (Requires implemented TenantMixin on the user or a related model).
    """
    def has_permission(self, request, view):
        # This will depend on how users are linked to tenants.
        # For now, it's a placeholder for tenant-level isolation.
        return True
