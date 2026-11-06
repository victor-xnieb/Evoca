from django.urls import path

from .views import (
    AccountView,
    ConsentListView,
    DailyReminderAckView,
    DailyReminderStatusView,
    DailyReminderView,
    ExportView,
    LoginView,
    LogoutView,
    MeView,
    PinVerifyView,
    PinView,
    RegisterView,
)

urlpatterns = [
    path("register/", RegisterView.as_view(), name="register"),
    path("login/", LoginView.as_view(), name="login"),
    path("logout/", LogoutView.as_view(), name="logout"),
    path("me/", MeView.as_view(), name="me"),
    path("pin/", PinView.as_view(), name="pin"),
    path("pin/verify/", PinVerifyView.as_view(), name="pin-verify"),
    path("consents/", ConsentListView.as_view(), name="consents"),
    path("export/", ExportView.as_view(), name="export"),
    path("account/", AccountView.as_view(), name="account"),
    path("reminder/", DailyReminderView.as_view(), name="reminder"),
    path("reminder/status/", DailyReminderStatusView.as_view(), name="reminder-status"),
    path("reminder/ack/", DailyReminderAckView.as_view(), name="reminder-ack"),
]
