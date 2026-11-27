from django.urls import path

from .weekly_views import WeeklySummaryGenerateView, WeeklySummarySettingsView, WeeklySummaryView

urlpatterns = [
    path("", WeeklySummaryView.as_view(), name="weekly-summary"),
    path("generate/", WeeklySummaryGenerateView.as_view(), name="weekly-summary-generate"),
    path("settings/", WeeklySummarySettingsView.as_view(), name="weekly-summary-settings"),
]
