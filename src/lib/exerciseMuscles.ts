export type MuscleId =
    | 'chest'
    | 'upper_back'
    | 'lats'
    | 'shoulders'
    | 'biceps'
    | 'triceps'
    | 'forearms'
    | 'core'
    | 'lower_back'
    | 'glutes'
    | 'quadriceps'
    | 'hamstrings'
    | 'adductors'
    | 'calves'
    | 'hip_flexors'

export type MuscleView = 'front' | 'back'

export type ExerciseMuscleProfile = {
    primary: MuscleId[]
    secondary: MuscleId[]
}

export const MUSCLE_CATALOG: Record<MuscleId, { label: string; view: MuscleView }> = {
    chest: { label: 'Pecho', view: 'front' },
    upper_back: { label: 'Espalda alta', view: 'back' },
    lats: { label: 'Dorsales', view: 'back' },
    shoulders: { label: 'Hombros', view: 'front' },
    biceps: { label: 'Bíceps', view: 'front' },
    triceps: { label: 'Tríceps', view: 'back' },
    forearms: { label: 'Antebrazos', view: 'front' },
    core: { label: 'Abdomen', view: 'front' },
    lower_back: { label: 'Zona lumbar', view: 'back' },
    glutes: { label: 'Glúteos', view: 'back' },
    quadriceps: { label: 'Cuádriceps', view: 'front' },
    hamstrings: { label: 'Isquiotibiales', view: 'back' },
    adductors: { label: 'Aductores', view: 'front' },
    calves: { label: 'Pantorrillas', view: 'back' },
    hip_flexors: { label: 'Flexores de cadera', view: 'front' },
}

function normalize(value: string | null | undefined) {
    return (value ?? '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, ' ')
        .trim()
}

function includesAny(value: string, terms: string[]) {
    return terms.some((term) => value.includes(term))
}

function withoutDuplicates(primary: MuscleId[], secondary: MuscleId[]): ExerciseMuscleProfile {
    const uniquePrimary = [...new Set(primary)]
    const primarySet = new Set(uniquePrimary)
    return {
        primary: uniquePrimary,
        secondary: [...new Set(secondary)].filter((muscle) => !primarySet.has(muscle)),
    }
}

/**
 * Convierte el nombre y la categoría existentes en una explicación anatómica
 * simple. Las reglas específicas van antes que las categorías generales para
 * evitar presentar como exacto un grupo amplio como “Piernas” o “Espalda”.
 */
export function resolveExerciseMuscles(input: {
    name?: string | null
    muscleGroup?: string | null
    category?: string | null
}): ExerciseMuscleProfile {
    const name = normalize(input.name)
    const group = normalize([input.muscleGroup, input.category].filter(Boolean).join(' '))

    // Core y estabilidad
    if (includesAny(name, ['bird dog', 'perro de caza'])) {
        return withoutDuplicates(['core', 'lower_back'], ['glutes', 'shoulders'])
    }
    if (includesAny(name, ['dead bug', 'bicho muerto', 'escarabajo muerto'])) {
        return withoutDuplicates(['core'], ['hip_flexors'])
    }
    if (includesAny(name, ['plancha', 'plank', 'hollow', 'rueda abdominal', 'ab wheel'])) {
        return withoutDuplicates(['core'], ['shoulders', 'glutes'])
    }
    if (includesAny(name, ['crunch', 'abdominal', 'sit up', 'elevacion de piernas'])) {
        return withoutDuplicates(['core'], ['hip_flexors'])
    }
    if (includesAny(name, ['pallof', 'woodchop', 'lenador'])) {
        return withoutDuplicates(['core'], ['shoulders'])
    }

    // Glúteos y tren inferior
    if (includesAny(name, ['hip thrust', 'hip trust', 'empuje de cadera', 'elevacion de cadera', 'puente de glute', 'puente glute', 'glute bridge', 'patada de glute', 'extension de glute', 'extension glute'])) {
        return withoutDuplicates(['glutes'], ['hamstrings', 'core'])
    }
    if (includesAny(name, ['abduccion', 'abductor', 'caminata lateral', 'monster walk'])) {
        return withoutDuplicates(['glutes'], ['core'])
    }
    if (includesAny(name, ['aduccion', 'aductor'])) {
        return withoutDuplicates(['adductors'], ['core'])
    }
    if (includesAny(name, ['sentadilla', 'squat', 'prensa', 'leg press', 'zancada', 'estocada', 'lunge', 'split squat', 'bulgara', 'subida al cajon', 'subidas al cajon', 'step up'])) {
        return withoutDuplicates(['quadriceps', 'glutes'], ['hamstrings', 'core'])
    }
    if (includesAny(name, ['extension de rodilla', 'extension de pierna', 'extension cuadricep', 'leg extension', 'sissy squat'])) {
        return withoutDuplicates(['quadriceps'], [])
    }
    if (includesAny(name, ['curl femoral', 'curl de pierna', 'femoral sentado', 'femoral acostado', 'leg curl', 'nordic', 'nordico'])) {
        return withoutDuplicates(['hamstrings'], ['glutes', 'calves'])
    }
    if (includesAny(name, ['peso muerto', 'deadlift', 'good morning', 'buen dia'])) {
        return withoutDuplicates(['hamstrings', 'glutes'], ['lower_back', 'core'])
    }
    if (includesAny(name, ['gemelo', 'pantorrilla', 'calf raise', 'elevacion de talon'])) {
        return withoutDuplicates(['calves'], [])
    }

    // Empujes y tirones de torso
    if (includesAny(name, ['press banca', 'press de pecho', 'press pecho', 'press inclinado', 'chest press', 'apertura', 'fly', 'pec deck', 'flexion de brazo', 'flexiones', 'push up', 'pushup'])) {
        return withoutDuplicates(['chest'], ['triceps', 'shoulders'])
    }
    if (includesAny(name, ['remo', 'row', 'jalon', 'polea al pecho', 'pullover', 'pull over', 'pulldown', 'dominada', 'pull up', 'pullup'])) {
        return withoutDuplicates(['lats', 'upper_back'], ['biceps', 'forearms'])
    }
    if (includesAny(name, ['face pull', 'pajaro', 'reverse fly', 'apertura inversa'])) {
        return withoutDuplicates(['upper_back', 'shoulders'], ['biceps'])
    }
    if (includesAny(name, ['press militar', 'press de hombro', 'shoulder press', 'elevacion lateral', 'vuelo lateral', 'elevacion frontal'])) {
        return withoutDuplicates(['shoulders'], ['triceps'])
    }
    if (includesAny(name, ['curl de bicep', 'curl bicep', 'curl martillo', 'hammer curl'])) {
        return withoutDuplicates(['biceps'], ['forearms'])
    }
    if (includesAny(name, ['triceps', 'press frances', 'extension de codo', 'fondos', 'dips'])) {
        return withoutDuplicates(['triceps'], ['shoulders', 'chest'])
    }

    // Cardio: se muestra la musculatura que más impulsa el movimiento.
    if (includesAny(name, ['bicicleta', 'bike', 'eliptico', 'eliptica', 'cinta', 'treadmill', 'correr', 'caminata'])) {
        return withoutDuplicates(['quadriceps', 'calves'], ['glutes', 'hamstrings', 'core'])
    }
    if (includesAny(name, ['remo ergometro', 'rowing', 'burpee', 'jumping jack', 'salto'])) {
        return withoutDuplicates(['quadriceps', 'glutes'], ['shoulders', 'core', 'calves'])
    }

    // Respaldo para ejercicios nuevos o nombres poco habituales.
    if (includesAny(group, ['glute'])) return withoutDuplicates(['glutes'], ['hamstrings', 'core'])
    if (includesAny(group, ['pecho', 'chest'])) return withoutDuplicates(['chest'], ['triceps', 'shoulders'])
    if (includesAny(group, ['espalda', 'dorsal', 'back'])) return withoutDuplicates(['lats', 'upper_back'], ['biceps', 'lower_back'])
    if (includesAny(group, ['hombro', 'shoulder'])) return withoutDuplicates(['shoulders'], ['triceps'])
    if (includesAny(group, ['bicep'])) return withoutDuplicates(['biceps'], ['forearms'])
    if (includesAny(group, ['tricep'])) return withoutDuplicates(['triceps'], ['shoulders'])
    if (includesAny(group, ['abdomen', 'abdominal', 'core'])) return withoutDuplicates(['core'], ['lower_back'])
    if (includesAny(group, ['isquio', 'femoral', 'hamstring'])) return withoutDuplicates(['hamstrings'], ['glutes'])
    if (includesAny(group, ['cuadricep'])) return withoutDuplicates(['quadriceps'], ['glutes'])
    if (includesAny(group, ['aductor'])) return withoutDuplicates(['adductors'], [])
    if (includesAny(group, ['gemelo', 'pantorrilla', 'calf'])) return withoutDuplicates(['calves'], [])
    if (includesAny(group, ['pierna', 'tren inferior'])) return withoutDuplicates(['quadriceps', 'glutes', 'hamstrings'], ['calves', 'core'])
    if (includesAny(group, ['cardio'])) return withoutDuplicates(['quadriceps', 'calves'], ['glutes', 'hamstrings', 'core'])
    if (includesAny(group, ['cuerpo completo', 'full body'])) return withoutDuplicates(['quadriceps', 'glutes', 'core'], ['shoulders', 'hamstrings'])

    return { primary: [], secondary: [] }
}

export function muscleLabel(muscle: MuscleId) {
    return MUSCLE_CATALOG[muscle].label
}
