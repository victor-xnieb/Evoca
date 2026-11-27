from django.urls import path

from .island_views import IslandDetailView, IslandsCalculateView, IslandsView

urlpatterns = [
    path("", IslandsView.as_view(), name="islands"),
    path("calculate/", IslandsCalculateView.as_view(), name="islands-calculate"),
    path("<uuid:pk>/", IslandDetailView.as_view(), name="island-detail"),
]
