"""
Lo escrito en una página es un documento del editor (TipTap/ProseMirror) en JSON: párrafos con
texto y marcas (resaltado, subrayado, color de tinta). Aquí se valida su forma y tamaño, y se saca
el texto plano (para las palabras de riesgo, la exportación y la IA de HU18).
"""

import json

from rest_framework.exceptions import ValidationError

MAX_JSON_BYTES = 200_000
MAX_TEXT_LENGTH = 20_000
BLOCKS = {"paragraph", "heading", "blockquote", "listItem", "bulletList", "orderedList"}

EMPTY = {"type": "doc", "content": [{"type": "paragraph"}]}


def validate_document(value):
    """El documento del editor como texto JSON, o ValidationError si no tiene la forma esperada."""
    if not isinstance(value, dict) or value.get("type") != "doc" or not isinstance(value.get("content", []), list):
        raise ValidationError("La página no tiene un formato válido.")
    raw = json.dumps(value, ensure_ascii=False, separators=(",", ":"))
    if len(raw.encode("utf-8")) > MAX_JSON_BYTES or len(plain_text(value)) > MAX_TEXT_LENGTH:
        raise ValidationError(f"La página puede tener hasta {MAX_TEXT_LENGTH:,} caracteres.".replace(",", "."))
    return raw


def load(raw):
    if not raw:
        return EMPTY
    try:
        return json.loads(raw)
    except ValueError:
        return EMPTY


def plain_text(document):
    """El texto de la página, con un salto de línea entre párrafos."""
    parts = []

    def walk(node):
        if not isinstance(node, dict):
            return
        if node.get("type") == "text" and isinstance(node.get("text"), str):
            parts.append(node["text"])
        elif node.get("type") == "hardBreak":
            parts.append("\n")
        for child in node.get("content", []) or []:
            walk(child)
        if node.get("type") in BLOCKS and parts and not parts[-1].endswith("\n"):
            parts.append("\n")

    walk(document)
    return "".join(parts).strip()
