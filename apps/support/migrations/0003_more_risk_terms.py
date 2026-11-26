"""
Más palabras de riesgo en el BORRADOR de la orientación (HU6), pedidas por el equipo al revisar la
búsqueda por significado (HU12): formas en tercera persona e infinitivo («matarse»,
«suicidarse») y frases frecuentes. Solo cambia versiones sin aprobar: lo aprobado por el
psicólogo asesor no se toca y él decide si las incluye.
"""

from django.db import migrations

NEW_TERMS = [
    "matarse",
    "me voy a matar",
    "me quiero matar",
    "quiero matarme",
    "suicidarse",
    "suicidarte",
    "suicida",
    "me voy a suicidar",
    "quitarse la vida",
    "hacerse daño",
]


def add_terms(apps, schema_editor):
    SupportContent = apps.get_model("support", "SupportContent")
    for content in SupportContent.objects.filter(approved=False):
        terms = [line.strip() for line in content.risk_terms.splitlines() if line.strip()]
        missing = [term for term in NEW_TERMS if term not in terms]
        if missing:
            content.risk_terms = "\n".join(terms + missing)
            content.save(update_fields=["risk_terms", "updated_at"])


def remove_terms(apps, schema_editor):
    SupportContent = apps.get_model("support", "SupportContent")
    for content in SupportContent.objects.filter(approved=False):
        terms = [line.strip() for line in content.risk_terms.splitlines() if line.strip()]
        kept = [term for term in terms if term not in NEW_TERMS]
        if kept != terms and kept:
            content.risk_terms = "\n".join(kept)
            content.save(update_fields=["risk_terms", "updated_at"])


class Migration(migrations.Migration):
    dependencies = [("support", "0002_draft_content")]

    operations = [migrations.RunPython(add_terms, remove_terms)]
