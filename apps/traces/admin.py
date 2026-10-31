from django.contrib import admin

from .models import Memory, MemoryTrace, Trace


class MemoryTraceInline(admin.TabularInline):
    model = MemoryTrace
    extra = 0


@admin.register(Trace)
class TraceAdmin(admin.ModelAdmin):
    list_display = ("sensory_type", "emotion", "mood_intensity", "user", "created_at")
    list_filter = ("sensory_type", "mood_intensity")
    search_fields = ("user__email", "note", "emotion")
    readonly_fields = ("created_at", "updated_at")


@admin.register(Memory)
class MemoryAdmin(admin.ModelAdmin):
    list_display = ("name", "status", "user", "created_at")
    list_filter = ("status",)
    search_fields = ("name", "user__email")
    inlines = [MemoryTraceInline]

