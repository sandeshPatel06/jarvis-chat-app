from channels.db import database_sync_to_async
from django.contrib.auth.models import AnonymousUser
from rest_framework.authtoken.models import Token
from channels.middleware import BaseMiddleware

@database_sync_to_async
def get_user(token_key):
    try:
        token = Token.objects.get(key=token_key)
        return token.user
    except Token.DoesNotExist:
        return AnonymousUser()

class TokenAuthMiddleware(BaseMiddleware):
    async def __call__(self, scope, receive, send):
        query_string = scope.get("query_string", b"").decode("utf-8")
        query_params = dict(qp.split("=") for qp in query_string.split("&") if "=" in qp)
        token_key = query_params.get("token")

        if token_key:
            scope["user"] = await get_user(token_key)
        else:
            scope["user"] = AnonymousUser()

        return await super().__call__(scope, receive, send)
