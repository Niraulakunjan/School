from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import AuthenticationFailed
from apps.shared.utils import get_current_db


class TenantJWTAuthentication(JWTAuthentication):
    def get_user(self, validated_token):
        from rest_framework_simplejwt.settings import api_settings
        try:
            user_id = validated_token[api_settings.USER_ID_CLAIM]
        except KeyError:
            raise AuthenticationFailed('Token contained no recognizable user identification')

        db = get_current_db()

        # Try current tenant DB first
        try:
            user = self.user_model.objects.using(db).get(**{api_settings.USER_ID_FIELD: user_id})
            if not user.is_active:
                raise AuthenticationFailed('User is inactive')
            return user
        except self.user_model.DoesNotExist:
            pass

        # Fall back to default DB (superadmin)
        if db != 'default':
            try:
                user = self.user_model.objects.using('default').get(**{api_settings.USER_ID_FIELD: user_id})
                if not user.is_active:
                    raise AuthenticationFailed('User is inactive')
                return user
            except self.user_model.DoesNotExist:
                pass

        raise AuthenticationFailed('User not found')
