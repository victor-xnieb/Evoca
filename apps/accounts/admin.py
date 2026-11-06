from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin

from .models import AccessPin, ConsentRecord, DailyReminder, User


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    ordering = ("email",)
    list_display = ("email", "first_name", "last_name", "is_staff", "is_active")
    search_fields = ("email", "first_name", "last_name")
    fieldsets = (
        (None, {"fields": ("email", "password")}),
        ("Datos personales", {"fields": ("first_name", "last_name", "date_of_birth")}),
        (
            "Permisos",
            {
                "fields": (
                    "is_active",
                    "is_staff",
                    "is_superuser",
                    "groups",
                    "user_permissions",
                )
            },
        ),
        ("Fechas", {"fields": ("last_login", "date_joined")}),
    )
    add_fieldsets = (
        (
            None,
            {
                "classes": ("wide",),
                "fields": (
                    "email",
                    "date_of_birth",
                    "password1",
                    "password2",
                    "is_staff",
                    "is_active",
                ),
            },
        ),
    )


@admin.register(ConsentRecord)
class ConsentRecordAdmin(admin.ModelAdmin):
    list_display = ("user", "consent_type", "document_version", "accepted_at", "revoked_at")
    list_filter = ("consent_type", "document_version")
    search_fields = ("user__email",)
    readonly_fields = ("accepted_at",)



@admin.register(AccessPin)
class AccessPinAdmin(admin.ModelAdmin):
    # El hash del PIN nunca se muestra; solo el estado del bloqueo.
    list_display = ("user", "failed_attempts", "locked_until", "updated_at")
    search_fields = ("user__email",)
    exclude = ("pin_hash",)
    readonly_fields = ("user", "failed_attempts", "locked_until", "updated_at")


@admin.register(DailyReminder)
class DailyReminderAdmin(admin.ModelAdmin):
    list_display = ("user", "enabled", "frequency", "time", "last_notified_on")
    search_fields = ("user__email",)
