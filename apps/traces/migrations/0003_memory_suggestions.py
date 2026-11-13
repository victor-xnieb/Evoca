from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("traces", "0002_emotion_choices"),
    ]

    operations = [
        migrations.AlterField(
            model_name="memory",
            name="status",
            field=models.CharField(
                choices=[("suggested", "Sugerido"), ("accepted", "Aceptado"), ("discarded", "Descartado")],
                default="suggested",
                max_length=12,
            ),
        ),
        migrations.AddField(
            model_name="memory",
            name="suggested_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="memory",
            name="decided_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]
