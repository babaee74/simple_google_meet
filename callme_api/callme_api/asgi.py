# mysite/asgi.py
import os
import django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "callme_api.settings")
django.setup()
from channels.auth import AuthMiddlewareStack
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.security.websocket import AllowedHostsOriginValidator
from django.core.asgi import get_asgi_application
# Initialize Django ASGI application early to ensure the AppRegistry
# is populated before importing code that may import ORM models.
django_asgi_app = get_asgi_application()

from backend.routing import ws_urlpatterns

application = ProtocolTypeRouter({
  #"http": django_asgi_app,
  "websocket": AuthMiddlewareStack(
            URLRouter(
                ws_urlpatterns
            )
        )
})

