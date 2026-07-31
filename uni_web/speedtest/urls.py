from django.urls import path
from . import views

urlpatterns = [
    path('', views.speedtest, name='speedtest'),

    path('ping/', views.ping_test, name='ping_test'),
    path('download/', views.download_test, name='download_test'),
    path('upload/', views.upload_test, name='upload_test'),
]