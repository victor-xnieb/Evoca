from django.urls import path

from .views import OrientationView, SupportContentView, SupportEventView

urlpatterns = [
    path("content/", SupportContentView.as_view(), name="support-content"),
    path("orientation/", OrientationView.as_view(), name="support-orientation"),
    path("events/", SupportEventView.as_view(), name="support-events"),
]
