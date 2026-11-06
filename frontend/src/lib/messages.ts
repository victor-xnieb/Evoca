/** Motivos por los que no se puede crear la cuenta (los mismos textos que da el servidor). */
export const MINOR_MESSAGE = "Evoca es solo para personas mayores de 18 años, por eso no podemos crear la cuenta."

export const HEALTH_DATA_MESSAGE =
  "Sin tu autorización expresa no podemos crear la cuenta: Evoca guarda emociones y recuerdos, que la ley trata como datos sensibles."

export const ACCOUNT_DELETED_NOTICE = "Tu cuenta y todos tus datos fueron eliminados."

/** Lo que falta para guardar una huella (los mismos textos que da el servidor). */
export const MISSING_TRACE_FIELDS = {
  sensory_type: "Elige qué despertó este recuerdo.",
  note: "Escribe una nota corta sobre el recuerdo.",
  emotion: "Elige la emoción que sentiste.",
  mood_intensity: "Elige qué tan intenso fue, de 1 a 5.",
} as const

export const NOTE_MAX_LENGTH = 500

/** Nombre de cada nivel de intensidad, de 1 a 5. */
export const INTENSITY_LABELS = ["Muy baja", "Baja", "Media", "Alta", "Muy alta"] as const

/** Ideas para la nota según el tipo elegido. */
export const NOTE_PLACEHOLDERS: Record<string, string> = {
  default: "Por ejemplo: el café de la cocina de mi abuela.",
  aroma: "Por ejemplo: el café de la cocina de mi abuela.",
  color: "Por ejemplo: el azul del mar en Santa Marta.",
  song: "Por ejemplo: la canción que sonaba en el bus del colegio.",
  flavor: "Por ejemplo: el pandebono de los domingos.",
  texture: "Por ejemplo: la cobija de lana de la finca.",
  place: "Por ejemplo: el parque donde aprendí a montar bicicleta.",
}

export const TRACE_UPDATED_NOTICE = "Guardaste los cambios de tu huella."
export const TRACE_DELETED_NOTICE = "Borraste la huella."
