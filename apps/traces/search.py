"""
Búsqueda de huellas por significado (HU12).

Cada huella se convierte en un vector de significado («embedding») con Gemini, solo desde el
servidor. Se guarda la primera vez que hace falta y se recalcula únicamente si cambia lo que
describe la huella. Al buscar, la frase se convierte en otro vector y se compara con los de las
huellas de la persona: así «olor a lluvia» encuentra «olor a tierra mojada» aunque no comparta
palabras.

El plan gratuito de Gemini permite 100 vectores por minuto: cada búsqueda prepara como máximo
EVOCA_SEARCH_EMBED_PER_REQUEST huellas nuevas y busca entre las que ya están listas; las demás
se preparan en las búsquedas siguientes (o de una vez con `manage.py embed_traces`).

Si la IA no está configurada o falla, la búsqueda sigue por palabras (sin tildes ni
mayúsculas), para que la persona nunca se quede sin resultados por un error. La frase buscada
no se guarda ni se registra en los logs.
"""

import hashlib
import json
import logging
import math
import re
import unicodedata
import urllib.error
import urllib.request
from array import array

from django.conf import settings

from . import ai
from .models import Trace, TraceEmbedding

logger = logging.getLogger(__name__)

MIN_QUERY_LENGTH = 3
MAX_QUERY_LENGTH = 200
MAX_RESULTS = 10
# La API de Gemini acepta hasta 100 textos por llamada.
BATCH_SIZE = 100

# Qué tan parecida es una huella (similitud de coseno entre vectores normalizados).
HIGH_SIMILARITY = 0.70
MEDIUM_SIMILARITY = 0.65

# Palabras que no aportan en la búsqueda por palabras.
STOPWORDS = {
    "a", "al", "con", "de", "del", "el", "en", "es", "la", "las", "lo", "los", "me", "mi", "mis",
    "para", "por", "que", "se", "su", "sus", "un", "una", "unos", "unas", "y", "o",
}
WORD = re.compile(r"\w+", re.UNICODE)


def trace_text(trace):
    """Lo que se convierte en vector: tipo, emoción, etiquetas y la nota."""
    tags = f" · {', '.join(trace.tags)}" if trace.tags else ""
    return f"{trace.get_sensory_type_display()} · {trace.get_emotion_display()}{tags}\n{trace.note}"


def text_hash(text):
    model = settings.EVOCA_AI_EMBEDDING_MODEL
    dimensions = settings.EVOCA_AI_EMBEDDING_DIMENSIONS
    return hashlib.sha256(f"{model}:{dimensions}\n{text}".encode("utf-8")).hexdigest()


def normalized(values):
    """Vector de longitud 1: así el producto punto es la similitud de coseno."""
    length = math.sqrt(sum(value * value for value in values))
    if not length:
        raise ai.SuggestionUnavailable("vector vacío")
    return array("f", (value / length for value in values))


def similarity(first, second):
    return sum(a * b for a, b in zip(first, second))


def ask_gemini(texts, task_type):
    """Pide a Gemini los vectores de varios textos en una sola llamada (batchEmbedContents)."""
    model = settings.EVOCA_AI_EMBEDDING_MODEL
    body = {
        "requests": [
            {
                "model": f"models/{model}",
                "content": {"parts": [{"text": text}]},
                "taskType": task_type,
                "outputDimensionality": settings.EVOCA_AI_EMBEDDING_DIMENSIONS,
            }
            for text in texts
        ]
    }
    request = urllib.request.Request(
        f"https://generativelanguage.googleapis.com/v1beta/models/{model}:batchEmbedContents",
        data=json.dumps(body).encode("utf-8"),
        headers={"Content-Type": "application/json", "x-goog-api-key": settings.EVOCA_AI_API_KEY},
        method="POST",
    )
    with urllib.request.urlopen(request, timeout=settings.EVOCA_AI_EMBED_TIMEOUT) as response:
        data = json.load(response)
    try:
        return [item["values"] for item in data["embeddings"]]
    except (KeyError, TypeError) as error:
        raise ai.SuggestionUnavailable("respuesta sin vectores") from error


PROVIDERS = {"gemini": ask_gemini}


def embed(texts, task_type):
    """Vectores normalizados de los textos. Lanza SuggestionUnavailable si algo no cuadra."""
    ask = PROVIDERS.get(settings.EVOCA_AI_PROVIDER)
    if not ask or not settings.EVOCA_AI_API_KEY:
        raise ai.SuggestionUnavailable("IA no configurada")
    vectors = []
    for start in range(0, len(texts), BATCH_SIZE):
        chunk = texts[start : start + BATCH_SIZE]
        values = ask(chunk, task_type)
        if not isinstance(values, list) or len(values) != len(chunk):
            raise ai.SuggestionUnavailable("cantidad de vectores distinta")
        for vector in values:
            if not isinstance(vector, list) or len(vector) != settings.EVOCA_AI_EMBEDDING_DIMENSIONS:
                raise ai.SuggestionUnavailable("vector de otro tamaño")
            vectors.append(normalized(vector))
    return vectors


def ensure_embeddings(traces, limit=None):
    """
    Los vectores de las huellas, calculando solo los que faltan o quedaron viejos (la huella
    cambió o se cambió de modelo), como mucho `limit` en esta llamada (las más recientes
    primero). Devuelve ({id de la huella: vector}, cuántas quedaron sin preparar).
    """
    texts = {trace.pk: trace_text(trace) for trace in traces}
    hashes = {pk: text_hash(text) for pk, text in texts.items()}
    stored = {
        item.trace_id: item
        for item in TraceEmbedding.objects.filter(trace_id__in=list(texts)).only("trace_id", "text_hash", "vector")
    }
    vectors = {}
    missing = []
    for pk, digest in hashes.items():
        item = stored.get(pk)
        if item and item.text_hash == digest:
            vectors[pk] = array("f", bytes(item.vector))
        else:
            missing.append(pk)
    pending = 0
    if limit is not None and len(missing) > limit:
        recent = sorted((trace for trace in traces if trace.pk in set(missing)), key=lambda trace: trace.created_at, reverse=True)
        missing = [trace.pk for trace in recent[:limit]]
        pending = len(recent) - limit
    if missing:
        fresh = embed([texts[pk] for pk in missing], "RETRIEVAL_DOCUMENT")
        TraceEmbedding.objects.bulk_create(
            [
                TraceEmbedding(trace_id=pk, text_hash=hashes[pk], model=settings.EVOCA_AI_EMBEDDING_MODEL, vector=vector.tobytes())
                for pk, vector in zip(missing, fresh)
            ],
            update_conflicts=True,
            unique_fields=["trace"],
            update_fields=["text_hash", "model", "vector", "updated_at"],
        )
        vectors.update(zip(missing, fresh))
    return vectors, pending


def meaning_search(user, query):
    """
    ([(similitud, huella)], pendientes): las huellas parecidas a la frase, de la más a la menos
    parecida, y cuántas huellas aún no tienen vector (no entran en esta búsqueda).
    """
    traces = list(Trace.objects.filter(user=user))
    if not traces:
        return [], 0
    vectors, pending = ensure_embeddings(traces, limit=settings.EVOCA_SEARCH_EMBED_PER_REQUEST)
    query_vector = embed([query], "RETRIEVAL_QUERY")[0]
    scored = sorted(
        ((similarity(query_vector, vectors[trace.pk]), trace) for trace in traces if trace.pk in vectors),
        key=lambda item: item[0],
        reverse=True,
    )
    if not scored or scored[0][0] < settings.EVOCA_SEARCH_MIN_SIMILARITY:
        return [], pending
    # Solo lo que está cerca del mejor resultado: con frases vagas, todo se parece un poco.
    cutoff = max(settings.EVOCA_SEARCH_MIN_SIMILARITY, scored[0][0] - settings.EVOCA_SEARCH_SPREAD)
    return [(round(score, 2), trace) for score, trace in scored if score >= cutoff][:MAX_RESULTS], pending


def plain(text):
    """Minúsculas y sin tildes: «Canción» y «cancion» son la misma palabra."""
    decomposed = unicodedata.normalize("NFD", text.lower())
    return "".join(char for char in decomposed if unicodedata.category(char) != "Mn")


def words_of(text):
    return {word for word in WORD.findall(plain(text)) if word not in STOPWORDS and len(word) > 1}


def word_search(user, query):
    """Respaldo sin IA: [(parte de las palabras que coinciden, huella)], de más a menos."""
    wanted = words_of(query)
    if not wanted:
        return []
    scored = []
    for trace in Trace.objects.filter(user=user).order_by("-created_at"):
        found = words_of(f"{trace.note} {' '.join(trace.tags)}") & wanted
        if found:
            scored.append((round(len(found) / len(wanted), 2), trace))
    scored.sort(key=lambda item: item[0], reverse=True)
    return scored[:MAX_RESULTS]


def search(user, query):
    """
    Devuelve (resultados, modo, pendientes). El modo es "meaning" (por significado) o "words"
    (respaldo por palabras, cuando la IA no está configurada, falla o llegó a su límite).
    """
    try:
        results, pending = meaning_search(user, query)
        return results, "meaning", pending
    except (ai.SuggestionUnavailable, urllib.error.URLError, TimeoutError, OSError, ValueError) as error:
        # Solo el tipo de error (y el código HTTP): nunca la frase ni las notas.
        logger.warning("Búsqueda por significado no disponible: %s %s", type(error).__name__, getattr(error, "code", ""))
        return word_search(user, query), "words", 0


def level(score, mode):
    """Qué tan parecida es, en palabras: «high», «medium» o «low»."""
    if mode == "words":
        return "high" if score >= 1 else "medium" if score >= 0.5 else "low"
    return "high" if score >= HIGH_SIMILARITY else "medium" if score >= MEDIUM_SIMILARITY else "low"
