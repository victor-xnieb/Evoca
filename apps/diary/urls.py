from rest_framework.routers import DefaultRouter

from .views import LetterViewSet, NotebookViewSet, PageViewSet

router = DefaultRouter()
router.register("notebooks", NotebookViewSet, basename="notebook")
router.register("pages", PageViewSet, basename="diary-page")
router.register("letters", LetterViewSet, basename="diary-letter")

urlpatterns = router.urls
