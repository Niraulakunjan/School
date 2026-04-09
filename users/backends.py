from django.contrib.auth import get_user_model
from django.contrib.auth.backends import ModelBackend
from django.db.models import Q
from apps.shared.utils import get_current_db

User = get_user_model()

class EmailOrUsernameModelBackend(ModelBackend):
    def authenticate(self, request, username=None, password=None, **kwargs):
        import logging
        logger = logging.getLogger(__name__)
        
        if username is None:
            username = kwargs.get(User.USERNAME_FIELD)

        db = get_current_db()
        logger.info(f"Auth attempt for '{username}' on DB context: '{db}'")

        # Try tenant DB first (or default if no tenant)
        try:
            user = User.objects.using(db).get(Q(username=username) | Q(email=username))
            if user.check_password(password) and self.user_can_authenticate(user):
                logger.info(f"User '{username}' authenticated successfully on '{db}'")
                return user
        except User.DoesNotExist:
            pass

        # Fallback to default DB for superadmins (when on tenant subdomain)
        if db != 'default':
            logger.info(f"Falling back to 'default' DB for '{username}'")
            try:
                user = User.objects.using('default').get(Q(username=username) | Q(email=username))
                if user.check_password(password) and self.user_can_authenticate(user):
                    logger.info(f"User '{username}' authenticated successfully on 'default' fallback")
                    return user
            except User.DoesNotExist:
                pass

        logger.warning(f"Auth failed for '{username}' on DB: '{db}' (and fallback if applicable)")
        User().set_password(password)  # timing attack mitigation
        return None

    def get_user(self, user_id):
        db = get_current_db()
        try:
            return User.objects.using(db).get(pk=user_id)
        except User.DoesNotExist:
            if db != 'default':
                try:
                    return User.objects.using('default').get(pk=user_id)
                except User.DoesNotExist:
                    pass
        return None
