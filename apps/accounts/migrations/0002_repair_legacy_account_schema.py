import uuid

from django.db import migrations


def repair_legacy_account_schema(apps, schema_editor):
    """Alinea la primera versión de desarrollo sin perder usuarios existentes."""

    connection = schema_editor.connection
    alias = connection.alias
    quote = schema_editor.quote_name
    user_table = "accounts_user"
    consent_table = "accounts_consentrecord"

    with connection.cursor() as cursor:
        table_names = set(connection.introspection.table_names(cursor))
        if user_table not in table_names:
            return
        user_columns = {
            column.name
            for column in connection.introspection.get_table_description(cursor, user_table)
        }

    # La versión inicial usada en Neon llamaba birth_date a este campo.
    if "date_of_birth" not in user_columns and "birth_date" in user_columns:
        schema_editor.execute(
            f"ALTER TABLE {quote(user_table)} "
            f"RENAME COLUMN {quote('birth_date')} TO {quote('date_of_birth')}"
        )
        user_columns.remove("birth_date")
        user_columns.add("date_of_birth")

    if "date_of_birth" not in user_columns:
        raise RuntimeError(
            "accounts_user no contiene birth_date ni date_of_birth; "
            "la migración no puede inferir la fecha de nacimiento."
        )

    ConsentRecord = apps.get_model("accounts", "ConsentRecord")
    with connection.cursor() as cursor:
        table_names = set(connection.introspection.table_names(cursor))
    if consent_table not in table_names:
        schema_editor.create_model(ConsentRecord)

    # Conserva los consentimientos de la versión anterior con una versión explícita.
    legacy_consent_columns = {
        "terms_accepted_at": "terms",
        "health_data_consent_at": "health_data",
    }
    available_legacy_columns = [
        column for column in legacy_consent_columns if column in user_columns
    ]
    if available_legacy_columns:
        selected_columns = ", ".join(
            [quote("id"), *(quote(column) for column in available_legacy_columns)]
        )
        with connection.cursor() as cursor:
            cursor.execute(f"SELECT {selected_columns} FROM {quote(user_table)}")
            rows = cursor.fetchall()

        records = []
        for row in rows:
            user_id, *accepted_values = row
            for column, accepted_at in zip(available_legacy_columns, accepted_values):
                if accepted_at is not None:
                    records.append(
                        ConsentRecord(
                            id=uuid.uuid4(),
                            user_id=user_id,
                            consent_type=legacy_consent_columns[column],
                            document_version="legacy-v1",
                            accepted_at=accepted_at,
                        )
                    )
        if records:
            ConsentRecord.objects.using(alias).bulk_create(records, ignore_conflicts=True)

        for column in available_legacy_columns:
            schema_editor.execute(
                f"ALTER TABLE {quote(user_table)} DROP COLUMN {quote(column)}"
            )

    # El modelo actual requiere fecha de nacimiento. No se inventan datos faltantes.
    with connection.cursor() as cursor:
        cursor.execute(
            f"SELECT COUNT(*) FROM {quote(user_table)} "
            f"WHERE {quote('date_of_birth')} IS NULL"
        )
        missing_birth_dates = cursor.fetchone()[0]
    if missing_birth_dates:
        raise RuntimeError(
            f"Hay {missing_birth_dates} usuario(s) sin fecha de nacimiento. "
            "Complétala antes de volver a ejecutar la migración."
        )

    if connection.vendor == "postgresql":
        schema_editor.execute(
            f"ALTER TABLE {quote(user_table)} "
            f"ALTER COLUMN {quote('date_of_birth')} SET NOT NULL"
        )


class Migration(migrations.Migration):
    dependencies = [("accounts", "0001_initial")]

    operations = [
        migrations.RunPython(
            repair_legacy_account_schema,
            reverse_code=migrations.RunPython.noop,
        )
    ]

