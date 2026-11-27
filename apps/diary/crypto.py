"""
Cifrado del Cuadernillo (HU17). Las páginas y las cartas son el dato más sensible de Evoca: se
guardan cifradas con Fernet (AES con autenticación) además del cifrado en disco de Neon, así que
quien vea la base no puede leerlas.

La clave vive solo en el servidor: EVOCA_DIARY_KEY (una clave Fernet). En desarrollo, si no está,
se deriva de DJANGO_SECRET_KEY; en producción es obligatoria y no se debe perder ni cambiar (sin
ella, lo escrito no se puede leer).
"""

import base64
import hashlib

from cryptography.fernet import Fernet, InvalidToken
from django.conf import settings
from django.core.exceptions import ImproperlyConfigured
from django.db import models


def fernet():
    key = settings.EVOCA_DIARY_KEY
    if not key:
        if not settings.DEBUG:
            raise ImproperlyConfigured("Falta EVOCA_DIARY_KEY: el Cuadernillo no puede cifrar ni leer lo escrito.")
        key = base64.urlsafe_b64encode(hashlib.sha256(f"evoca-diary:{settings.SECRET_KEY}".encode()).digest())
    return Fernet(key)


def encrypt(text):
    return fernet().encrypt(text.encode("utf-8")).decode("ascii")


def decrypt(token):
    try:
        return fernet().decrypt(token.encode("ascii")).decode("utf-8")
    except InvalidToken as error:
        raise ImproperlyConfigured("No se pudo descifrar el Cuadernillo: la clave EVOCA_DIARY_KEY cambió.") from error


class EncryptedTextField(models.TextField):
    """Texto que se guarda cifrado y se lee en claro. No se puede buscar ni ordenar por él."""

    def from_db_value(self, value, expression, connection):
        return value if value in (None, "") else decrypt(value)

    def get_prep_value(self, value):
        value = super().get_prep_value(value)
        return value if value in (None, "") else encrypt(value)
