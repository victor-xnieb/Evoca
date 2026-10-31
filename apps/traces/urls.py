from rest_framework.routers import DefaultRouter

from .views import TraceViewSet

router = DefaultRouter()
router.register("", TraceViewSet, basename="trace")

urlpatterns = router.urls

