#!/usr/bin/env bash
# Arranque del backend en Render (ver render.yaml y docs/DESPLIEGUE.md).
#
# No aplica migraciones: la base de Neon la migra el CI de GitHub al integrar en `dev`.
#
# Cuentas de demostración, según EVOCA_SEED_DEMO:
#   true  -> crea las que falten (seguro repetirlo: no duplica ni borra nada)
#   reset -> borra y recrea las tres cuentas demo (déjalo así solo un despliegue, luego pasa a true)
#   otro  -> no hace nada
set -euo pipefail

case "${EVOCA_SEED_DEMO:-false}" in
  true) seed_args=() ;;
  reset) seed_args=(--reset) ;;
  *) seed_args=(--skip) ;;
esac

if [ "${seed_args[0]:-}" != "--skip" ]; then
  python manage.py seed_demo "${seed_args[@]}" || echo "AVISO: no se pudieron cargar las cuentas demo (revisa EVOCA_DEMO_PASSWORD, EVOCA_DEMO_PIN y que las migraciones estén aplicadas). La app arranca igual."
fi

# gthread: la sugerencia de IA espera a Gemini hasta 2 s; con hilos, esa espera no bloquea a los demás.
exec gunicorn config.wsgi:application \
  --bind "0.0.0.0:${PORT:-10000}" \
  --worker-class gthread \
  --workers "${WEB_CONCURRENCY:-2}" \
  --threads 4 \
  --timeout 60 \
  --access-logfile -
