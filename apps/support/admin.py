from django.contrib import admin

from .models import SupportContent, SupportEvent


@admin.register(SupportContent)
class SupportContentAdmin(admin.ModelAdmin):
    """El psicólogo asesor revisa y aprueba aquí los textos, las líneas y las palabras (HU6)."""

    list_display = ("version", "approved", "approved_by", "approved_at", "updated_at")
    list_filter = ("approved",)
    readonly_fields = ("approved_at", "created_at", "updated_at")


@admin.register(SupportEvent)
class SupportEventAdmin(admin.ModelAdmin):
    list_display = ("kind", "content_version", "created_at")
    list_filter = ("kind",)
    readonly_fields = ("user", "kind", "content_version", "created_at")
