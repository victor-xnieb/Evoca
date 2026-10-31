#!/usr/bin/env sh
set -eu

PROJECT_ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
cd "$PROJECT_ROOT"

if [ ! -x ".venv/bin/python" ]; then
  "${PYTHON_COMMAND:-python3}" -m venv .venv
fi

.venv/bin/python -m pip install -r requirements.txt

if [ ! -f .env ]; then
  cp .env.example .env
  echo "Se creó .env. Completa la clave de Django y las dos URL de Neon."
fi

.venv/bin/python manage.py check
echo "Entorno listo. Actívalo con: . .venv/bin/activate"

