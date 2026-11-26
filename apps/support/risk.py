"""
Palabras de riesgo en el servidor (HU6), con la misma regla que la app: frases completas, sin
importar mayúsculas, tildes ni signos. La app abre la pantalla de ayuda; el servidor lo usa para
que un texto con riesgo nunca termine en la IA (por ejemplo, la búsqueda por significado, HU12).
"""

import re
import unicodedata

from .models import SupportContent

NON_ALPHANUMERIC = re.compile(r"[^\w]+|_", re.UNICODE)


def normalize(text):
    """Minúsculas, sin tildes y con cualquier signo convertido en espacio (igual que normalizeText)."""
    decomposed = unicodedata.normalize("NFD", text)
    plain = "".join(char for char in decomposed if unicodedata.category(char) != "Mn").lower()
    return " ".join(NON_ALPHANUMERIC.sub(" ", plain).split())


def find_risk_terms(text, terms=None):
    """Las palabras o frases de riesgo que aparecen completas en el texto. «Matarme» no coincide dentro de otra palabra."""
    if terms is None:
        content = SupportContent.current()
        terms = content.terms() if content else []
    haystack = f" {normalize(text)} "
    if not haystack.strip():
        return []
    return [term for term in terms if (needle := normalize(term)) and f" {needle} " in haystack]
