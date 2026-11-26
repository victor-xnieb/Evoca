import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("traces", "0003_memory_suggestions"),
    ]

    operations = [
        migrations.CreateModel(
            name="TraceEmbedding",
            fields=[
                (
                    "trace",
                    models.OneToOneField(
                        on_delete=django.db.models.deletion.CASCADE,
                        primary_key=True,
                        related_name="embedding",
                        serialize=False,
                        to="traces.trace",
                    ),
                ),
                ("model", models.CharField(max_length=80)),
                ("text_hash", models.CharField(max_length=64)),
                ("vector", models.BinaryField()),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
        ),
    ]
