"""
Contenido inicial de la orientación (HU6). Es un BORRADOR: queda sin aprobar hasta que el
psicólogo asesor lo revise en el administrador; mientras tanto la app lo muestra con la marca
«Contenido provisional · pendiente de revisión profesional».
"""

from django.db import migrations

DRAFT = {
    "version": 1,
    "orientation_title": "Aquí hay apoyo si lo necesitas",
    "orientation_message": (
        "En las últimas semanas has registrado varios días difíciles. Hablar con alguien puede "
        "ayudar, y no tienes que hacerlo sola o solo: hay profesionales dispuestos a escucharte."
    ),
    "help_title": "Puedes hablar con alguien ahora",
    "help_message": (
        "Lo que sientes importa. Si estás pasando por un momento muy difícil o piensas en "
        "hacerte daño, llama a una de estas líneas: te atienden personas preparadas para escucharte."
    ),
    "help_lines": [
        {"name": "Línea 192, opción 4", "phone": "192", "description": "Salud mental · Ministerio de Salud"},
        {"name": "Línea 106", "phone": "106", "description": "Escucha y orientación en Bogotá"},
        {"name": "Línea 123", "phone": "123", "description": "Emergencias"},
    ],
    "risk_terms": "\n".join(
        [
            "suicidio",
            "suicidarme",
            "me quiero suicidar",
            "matarme",
            "quiero morir",
            "quiero morirme",
            "me quiero morir",
            "no quiero vivir",
            "no quiero seguir viviendo",
            "quitarme la vida",
            "acabar con mi vida",
            "acabar con todo",
            "hacerme daño",
            "lastimarme",
            "cortarme",
            "no vale la pena vivir",
            "mejor muerto",
            "mejor muerta",
        ]
    ),
}


def create_draft(apps, schema_editor):
    SupportContent = apps.get_model("support", "SupportContent")
    if not SupportContent.objects.exists():
        SupportContent.objects.create(**DRAFT)


def remove_draft(apps, schema_editor):
    SupportContent = apps.get_model("support", "SupportContent")
    SupportContent.objects.filter(version=DRAFT["version"], approved=False).delete()


class Migration(migrations.Migration):
    dependencies = [("support", "0001_initial")]

    operations = [migrations.RunPython(create_draft, remove_draft)]
