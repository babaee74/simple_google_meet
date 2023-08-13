from django.urls import path, re_path
from .consumers import *

ws_urlpatterns = [
    re_path(r'ws0/signal/(?P<room>\w+)/(?P<username>\w+)/$', WebRTCSignaller.as_asgi()),
]