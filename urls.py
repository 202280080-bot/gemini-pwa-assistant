
from django.urls import path
import assistant_app

urlpatterns = [
    path('', assistant_app.home, name='home'),
    path('api/chat/', assistant_app.chat, name='chat'),
    path('manifest.webmanifest', assistant_app.manifest, name='manifest'),
    path('service-worker.js', assistant_app.service_worker, name='service_worker'),
]
