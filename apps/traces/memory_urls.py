from rest_framework.routers import DefaultRouter

from .views import MemoryViewSet

router = DefaultRouter()
router.register("", MemoryViewSet, basename="memory")

urlpatterns = router.urls
