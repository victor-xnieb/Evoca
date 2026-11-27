"""
Grafo del mapa de recuerdos (HU10): afinidad entre recuerdos con reglas fijas, sin IA.

La afinidad de un par va de 0 a 1 y suma cuatro partes:

- sensaciones compartidas (0,4): coincidencia de Jaccard entre sus tipos sensoriales;
- emoción dominante (0,25): la misma cuenta completa; otra del mismo tono, la mitad;
- etiquetas de sus huellas en común (0,1): coincidencia de Jaccard;
- significado parecido (0,25, HU15): qué tan cerca están los vectores de significado de sus
  huellas (los de HU12, ya guardados; abrir el mapa no llama a la IA). Así «olor a lluvia sobre
  el pasto» y «la tormenta de anoche» se acercan aunque no compartan palabras.

Si ninguno de los dos tiene etiquetas, o a alguno le faltan vectores, esa parte no cuenta y el
puntaje se calcula sobre las demás (así, dos recuerdos iguales sin etiquetas valen 1).

Los pares bajo el umbral se descartan. Luego se agregan las aristas de mayor a menor
afinidad, saltando las que dejarían a un recuerdo con más conexiones del máximo: un recuerdo
sin afinidad suficiente queda solo, no se fuerza ningún enlace.
"""

import math
import operator
from dataclasses import dataclass, field

from django.conf import settings

from .models import Trace

SENSATION_WEIGHT = 0.4
EMOTION_WEIGHT = 0.25
TAG_WEIGHT = 0.1
MEANING_WEIGHT = 0.25
# Desde qué parte del significado se dice en el motivo («Hablan de cosas parecidas»).
MEANING_REASON = 0.5

# Emociones del mismo tono: se parecen aunque no sean la misma.
TONES = {
    Trace.Emotion.ALEGRIA: "luminoso",
    Trace.Emotion.CALMA: "luminoso",
    Trace.Emotion.GRATITUD: "luminoso",
    Trace.Emotion.NOSTALGIA: "melancólico",
    Trace.Emotion.TRISTEZA: "melancólico",
    Trace.Emotion.ANSIEDAD: "tenso",
    Trace.Emotion.ENOJO: "tenso",
    Trace.Emotion.MIEDO: "tenso",
}

# Cómo se nombra cada sensación compartida en el motivo («Comparten aromas y calma»).
SENSATION_WORDS = {
    Trace.SensoryType.AROMA: "aromas",
    Trace.SensoryType.COLOR: "colores",
    Trace.SensoryType.SONG: "canciones",
    Trace.SensoryType.FLAVOR: "sabores",
    Trace.SensoryType.TEXTURE: "texturas",
    Trace.SensoryType.PLACE: "lugares",
}

SENSATION_ORDER = Trace.SensoryType.values


@dataclass
class Node:
    id: str
    emotion: str
    sensations: frozenset
    tags: frozenset = field(default_factory=frozenset)
    # Vector de significado del recuerdo (promedio normalizado de los de sus huellas) o None.
    meaning: tuple | None = None


def jaccard(first, second):
    union = first | second
    return len(first & second) / len(union) if union else 0.0


def meaning_part(first, second):
    """
    De 0 a 1, qué tan parecido es lo que cuentan dos recuerdos, o None si a alguno le faltan
    vectores. La similitud de coseno entre recuerdos va de ~0,66 a ~0,92 (mediana 0,79 con
    gemini-embedding-2), así que se escala entre EVOCA_MAP_MEANING_LOW y EVOCA_MAP_MEANING_HIGH.
    """
    if first.meaning is None or second.meaning is None:
        return None
    similarity = sum(map(operator.mul, first.meaning, second.meaning))
    low, high = settings.EVOCA_MAP_MEANING_LOW, settings.EVOCA_MAP_MEANING_HIGH
    return min(1.0, max(0.0, (similarity - low) / (high - low)))


def memory_vector(vectors):
    """Promedio normalizado de los vectores (ya normalizados) de las huellas de un recuerdo."""
    vectors = [vector for vector in vectors if vector]
    if not vectors:
        return None
    total = [sum(values) for values in zip(*vectors)]
    length = math.sqrt(sum(value * value for value in total))
    return tuple(value / length for value in total) if length else None


def join_words(words):
    if len(words) <= 1:
        return "".join(words)
    return f"{', '.join(words[:-1])} y {words[-1]}"


def affinity(first, second):
    """Puntaje de 0 a 1 y el motivo legible de la afinidad entre dos recuerdos."""
    shared_sensations = first.sensations & second.sensations
    shared_tags = first.tags & second.tags
    same_emotion = first.emotion == second.emotion
    same_tone = not same_emotion and TONES.get(first.emotion) == TONES.get(second.emotion)

    with_tags = bool(first.tags or second.tags)
    meaning = meaning_part(first, second)
    score = (
        SENSATION_WEIGHT * jaccard(first.sensations, second.sensations)
        + EMOTION_WEIGHT * (1.0 if same_emotion else 0.5 if same_tone else 0.0)
        + (TAG_WEIGHT * jaccard(first.tags, second.tags) if with_tags else 0.0)
        + (MEANING_WEIGHT * meaning if meaning is not None else 0.0)
    ) / (
        SENSATION_WEIGHT
        + EMOTION_WEIGHT
        + (TAG_WEIGHT if with_tags else 0.0)
        + (MEANING_WEIGHT if meaning is not None else 0.0)
    )

    parts = [SENSATION_WORDS[value] for value in SENSATION_ORDER if value in shared_sensations]
    if same_emotion:
        parts.append(Trace.Emotion(first.emotion).label.lower())
    elif same_tone:
        parts.append(f"un tono {TONES[first.emotion]}")
    if shared_tags:
        tags = sorted(shared_tags)
        quoted = join_words([f"«{tag}»" for tag in tags])
        parts.append(f"la etiqueta {quoted}" if len(tags) == 1 else f"las etiquetas {quoted}")
    reason = f"Comparten {join_words(parts)}" if parts else ""
    if meaning is not None and meaning >= MEANING_REASON:
        reason = f"{reason} y hablan de cosas parecidas" if reason else "Hablan de cosas parecidas"
    return round(score, 2), reason


def build_edges(nodes, min_affinity=None, max_links=None):
    """
    Aristas del grafo: los pares con afinidad desde el umbral, de mayor a menor, sin que
    ningún recuerdo pase del máximo de conexiones. Empates: por id, para que sea estable.
    """
    min_affinity = settings.EVOCA_MAP_MIN_AFFINITY if min_affinity is None else min_affinity
    max_links = settings.EVOCA_MAP_MAX_LINKS if max_links is None else max_links

    candidates = []
    for index, first in enumerate(nodes):
        for second in nodes[index + 1 :]:
            score, reason = affinity(first, second)
            if score >= min_affinity:
                source, target = sorted((first.id, second.id))
                candidates.append((score, source, target, reason))
    candidates.sort(key=lambda item: (-item[0], item[1], item[2]))

    degree = {}
    edges = []
    for score, source, target, reason in candidates:
        if degree.get(source, 0) >= max_links or degree.get(target, 0) >= max_links:
            continue
        degree[source] = degree.get(source, 0) + 1
        degree[target] = degree.get(target, 0) + 1
        edges.append({"source": source, "target": target, "score": score, "reason": reason})
    return edges
