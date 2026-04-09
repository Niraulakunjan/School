"""
This module is deprecated. Use apps.shared.utils instead.
Re-exporting functions for backward compatibility.
"""

from apps.shared.utils import (
    set_current_tenant,
    get_current_db,
    get_current_tenant,
    clear_current_tenant,
    register_tenant_db,
    create_db_if_not_exists,
)

# Alias for compatibility if needed
get_current_db_name = get_current_db
