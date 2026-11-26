"""
Ánimo de una huella (HU4, HU6 y las que lo usen después): combina la emoción con su intensidad.

La intensidad dice qué tan fuerte fue la emoción, no qué tan bien estaba la persona. Una
tristeza de intensidad 5 es un ánimo muy bajo y una de intensidad 1, uno bueno; con las
emociones agradables es al revés. Así:

- emociones agradables (alegría, calma, gratitud): ánimo = intensidad;
- emociones difíciles (tristeza, ansiedad, enojo, miedo): ánimo = 6 − intensidad;
- nostalgia (agridulce): ánimo neutro (3), sea cual sea su intensidad.

El ánimo va de 1 (muy bajo) a 5 (muy bueno).
"""

from .models import Trace

PLEASANT = {Trace.Emotion.ALEGRIA, Trace.Emotion.CALMA, Trace.Emotion.GRATITUD}
DIFFICULT = {Trace.Emotion.TRISTEZA, Trace.Emotion.ANSIEDAD, Trace.Emotion.ENOJO, Trace.Emotion.MIEDO}
NEUTRAL_MOOD = 3


def mood_score(emotion, intensity):
    """Ánimo de 1 a 5 de una huella según su emoción e intensidad."""
    if emotion in PLEASANT:
        return intensity
    if emotion in DIFFICULT:
        return 6 - intensity
    return NEUTRAL_MOOD
