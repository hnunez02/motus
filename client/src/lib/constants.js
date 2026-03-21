export const MODALITIES = [
  { id: 'lift',   label: '💪 Lift',   emoji: '💪' },
  { id: 'cardio', label: '🏃 Cardio', emoji: '🏃' },
]

export const SPLITS = [
  { id: 'push',      label: 'Push',      muscles: ['chest','shoulders','triceps'] },
  { id: 'pull',      label: 'Pull',      muscles: ['back','biceps','rear_delt'] },
  { id: 'legs',      label: 'Legs',      muscles: ['quads','hamstrings','glutes','calves'] },
  { id: 'upper',     label: 'Upper',     muscles: ['chest','back','shoulders','arms'] },
  { id: 'full_body', label: 'Full Body', muscles: [] },
  { id: 'custom',    label: 'Custom',    muscles: [] },
]

export const MUSCLE_GROUPS = [
  { id: 'chest',       label: 'Chest',       split: 'push' },
  { id: 'shoulders',   label: 'Shoulders',   split: 'push' },
  { id: 'triceps',     label: 'Triceps',     split: 'push' },
  { id: 'back',        label: 'Back',        split: 'pull' },
  { id: 'biceps',      label: 'Biceps',      split: 'pull' },
  { id: 'rear_delt',   label: 'Rear Delts',  split: 'pull' },
  { id: 'quads',       label: 'Quads',       split: 'legs' },
  { id: 'hamstrings',  label: 'Hamstrings',  split: 'legs' },
  { id: 'glutes',      label: 'Glutes',      split: 'legs' },
  { id: 'calves',      label: 'Calves',      split: 'legs' },
  { id: 'core',        label: 'Core',        split: 'any' },
]

export const GOALS = [
  { id: 'strength',    label: 'Strength (heavy weight, low reps)',    repRange: '1-5',  rpe: '8-9' },
  { id: 'hypertrophy', label: 'Hypertrophy (muscle growth)',          repRange: '6-12', rpe: '7-8' },
  { id: 'endurance',   label: 'Endurance (light weight, high reps)',  repRange: '12+',  rpe: '6-7' },
]

export const CARDIO_TYPES = [
  { id: 'zone2', label: 'Zone 2 (easy, conversational pace)', description: 'Low intensity, 60-70% max HR' },
  { id: 'hiit',  label: 'HIIT (High Intensity Intervals)',    description: 'High intensity intervals' },
  { id: 'liss',  label: 'LISS (Long, Steady Cardio)',         description: 'Steady state, 45-60 min' },
  { id: 'tempo', label: 'Tempo (comfortably hard)',            description: 'Comfortably hard, 80% max HR' },
]

export const RPE_DESCRIPTIONS = {
  label: 'RPE — Rate of Perceived Exertion (how hard is this set?)',
  6:  'Very easy — could do 4+ more reps',
  7:  'Easy — could do 3 more reps',
  8:  'Moderate — could do 2 more reps',
  9:  'Hard — could do 1 more rep',
  10: 'Max effort — could not do another rep',
}
