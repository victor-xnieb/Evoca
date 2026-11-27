from rest_framework.routers import DefaultRouter

from .views import NotebookViewSet, PageViewSet

router = DefaultRouter()
router.register("notebooks", NotebookViewSet, basename="notebook")
router.register("pages", PageViewSet, basename="diary-page")

urlpatterns = router.urls
