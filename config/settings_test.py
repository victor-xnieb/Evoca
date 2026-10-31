"""Aísla las pruebas de cualquier base configurada en .env."""

import os

# Se fijan antes de importar settings para que ni siquiera se analice una URL remota.
os.environ["DATABASE_URL"] = ""
os.environ["DATABASE_URL_UNPOOLED"] = ""
os.environ["USE_UNPOOLED_DATABASE"] = "False"

from .settings import *  # noqa: F403

DEBUG = False
SECRET_KEY = "test-only-key"
DATABASES = {  # noqa: F405
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": ":memory:",
    }
}
PASSWORD_HASHERS = ["django.contrib.auth.hashers.MD5PasswordHasher"]

