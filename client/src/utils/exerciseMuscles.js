/**
 * exerciseMuscles.js
 *
 * Maps exercise names to primary and secondary muscles using
 * react-body-highlighter slug conventions.
 *
 * Primary  → coral  (#D85A30) — main target
 * Secondary → amber (#EF9F27) — also working
 */

// All slugs use react-body-highlighter conventions
export const EXERCISE_MUSCLE_MAP = {
  'Bench Press':                { primary: ['chest', 'front-deltoids'],              secondary: ['triceps'] },
  'Incline Bench Press':        { primary: ['chest', 'front-deltoids'],              secondary: ['triceps'] },
  'Dumbbell Bench Press':       { primary: ['chest', 'front-deltoids'],              secondary: ['triceps'] },
  'Incline Dumbbell Press':     { primary: ['chest', 'front-deltoids'],              secondary: ['triceps'] },
  'Cable Chest Fly':            { primary: ['chest'],                                secondary: ['front-deltoids'] },
  'Push Up':                    { primary: ['chest', 'front-deltoids'],              secondary: ['triceps', 'abs'] },
  'Overhead Press':             { primary: ['front-deltoids'],                       secondary: ['triceps', 'trapezius'] },
  'Lateral Raise':              { primary: ['front-deltoids', 'back-deltoids'],      secondary: [] },
  'Cable Lateral Raises':       { primary: ['front-deltoids', 'back-deltoids'],      secondary: [] },
  'Pull Up':                    { primary: ['upper-back', 'biceps'],                 secondary: ['biceps', 'back-deltoids'] },
  'Lat Pulldown':               { primary: ['upper-back'],                           secondary: ['biceps', 'back-deltoids'] },
  'Seated Row':                 { primary: ['upper-back', 'lower-back'],             secondary: ['biceps', 'back-deltoids'] },
  'Deadlift':                   { primary: ['lower-back', 'gluteal', 'hamstring'],   secondary: ['trapezius', 'quadriceps'] },
  'Romanian Deadlift':          { primary: ['hamstring', 'gluteal', 'lower-back'],   secondary: [] },
  'Squat':                      { primary: ['quadriceps', 'gluteal'],                secondary: ['hamstring', 'lower-back'] },
  'Leg Press':                  { primary: ['quadriceps', 'gluteal'],                secondary: ['hamstring'] },
  'Lunge':                      { primary: ['quadriceps', 'gluteal'],                secondary: ['hamstring', 'calves'] },
  'Bicep Curl':                 { primary: ['biceps'],                               secondary: ['forearm'] },
  'Hammer Curl':                { primary: ['biceps'],                               secondary: ['forearm'] },
  'Tricep Pushdown':            { primary: ['triceps'],                              secondary: [] },
  'Cable Tricep Pushdowns':     { primary: ['triceps'],                              secondary: [] },
  'Close-Grip Dumbbell Press':  { primary: ['triceps'],                              secondary: ['chest', 'front-deltoids'] },
  'Skull Crusher':              { primary: ['triceps'],                              secondary: [] },
  'Dips':                       { primary: ['triceps', 'chest'],                     secondary: ['front-deltoids'] },
  'Plank':                      { primary: ['abs'],                                  secondary: ['lower-back', 'gluteal'] },
  'Crunch':                     { primary: ['abs'],                                  secondary: ['obliques'] },
  'Leg Curl':                   { primary: ['hamstring'],                            secondary: ['calves'] },
  'Leg Extension':              { primary: ['quadriceps'],                           secondary: [] },
  'Calf Raise':                 { primary: ['calves'],                               secondary: [] },
  'Face Pull':                  { primary: ['back-deltoids', 'trapezius'],           secondary: ['upper-back'] },
  'Shrug':                      { primary: ['trapezius'],                            secondary: [] },
  'Hip Thrust':                 { primary: ['gluteal'],                              secondary: ['hamstring'] },

  // Shoulders (additional)
  'Overhead Barbell Press':          { primary: ['front-deltoids'], secondary: ['triceps', 'trapezius'] },
  'Standing Barbell Overhead Press': { primary: ['front-deltoids'], secondary: ['triceps', 'trapezius'] },
  'Standing Overhead Press':         { primary: ['front-deltoids'], secondary: ['triceps', 'trapezius'] },
  'Barbell Overhead Press':          { primary: ['front-deltoids'], secondary: ['triceps', 'trapezius'] },
  'Standing Barbell Press':          { primary: ['front-deltoids'], secondary: ['triceps', 'trapezius'] },
  'Military Press':             { primary: ['front-deltoids'],                       secondary: ['triceps', 'trapezius'] },
  'Seated Barbell Press':       { primary: ['front-deltoids'],                       secondary: ['triceps'] },

  // Shoulders
  'Dumbbell Shoulder Press':    { primary: ['front-deltoids'],                       secondary: ['triceps', 'trapezius'] },
  'Overhead Dumbbell Press':    { primary: ['front-deltoids'],                       secondary: ['triceps', 'trapezius'] },
  'Arnold Press':               { primary: ['front-deltoids', 'back-deltoids'],      secondary: ['triceps'] },
  'Seated Dumbbell Press':      { primary: ['front-deltoids'],                       secondary: ['triceps'] },
  'Machine Shoulder Press':     { primary: ['front-deltoids'],                       secondary: ['triceps'] },
  'Push Press':                 { primary: ['front-deltoids'],                       secondary: ['triceps', 'quadriceps'] },
  'Landmine Press':             { primary: ['front-deltoids', 'chest'],              secondary: ['triceps'] },
  'Upright Row':                { primary: ['trapezius', 'front-deltoids'],          secondary: ['biceps'] },
  'Cable Upright Row':          { primary: ['trapezius', 'front-deltoids'],          secondary: [] },
  'Front Raise':                { primary: ['front-deltoids'],                       secondary: [] },
  'Dumbbell Front Raise':       { primary: ['front-deltoids'],                       secondary: [] },
  'Reverse Fly':                { primary: ['back-deltoids', 'trapezius'],           secondary: [] },
  'Dumbbell Reverse Fly':       { primary: ['back-deltoids', 'trapezius'],           secondary: [] },
  'Neck Press':                 { primary: ['front-deltoids', 'chest'],              secondary: ['triceps'] },

  // Chest
  'Barbell Bench Press':        { primary: ['chest', 'front-deltoids'],              secondary: ['triceps'] },
  'Chest Dip':                  { primary: ['chest', 'triceps'],                     secondary: ['front-deltoids'] },
  'Pec Deck':                   { primary: ['chest'],                                secondary: ['front-deltoids'] },
  'Cable Fly':                  { primary: ['chest'],                                secondary: ['front-deltoids'] },
  'Dumbbell Fly':               { primary: ['chest'],                                secondary: ['front-deltoids'] },

  // Back
  'Cable Row':                  { primary: ['upper-back'],                           secondary: ['biceps', 'back-deltoids'] },
  'T-Bar Row':                  { primary: ['upper-back', 'lower-back'],             secondary: ['biceps'] },
  'Chest Supported Row':        { primary: ['upper-back', 'back-deltoids'],          secondary: ['biceps'] },
  'Single Arm Dumbbell Row':    { primary: ['upper-back'],                           secondary: ['biceps'] },
  'Barbell Row':                { primary: ['upper-back', 'lower-back'],             secondary: ['biceps', 'back-deltoids'] },
  'Rack Pull':                  { primary: ['lower-back', 'trapezius'],              secondary: ['gluteal', 'hamstring'] },
  'Good Morning':               { primary: ['lower-back', 'hamstring'],              secondary: ['gluteal'] },

  // Legs
  'Bulgarian Split Squat':      { primary: ['quadriceps', 'gluteal'],                secondary: ['hamstring'] },
  'Step Up':                    { primary: ['quadriceps', 'gluteal'],                secondary: ['hamstring'] },
  'Hack Squat':                 { primary: ['quadriceps'],                           secondary: ['gluteal', 'hamstring'] },
  'Smith Machine Squat':        { primary: ['quadriceps', 'gluteal'],                secondary: ['hamstring'] },
  'Nordic Curl':                { primary: ['hamstring'],                            secondary: ['gluteal'] },
  'Leg Press Calf Raise':       { primary: ['calves'],                               secondary: [] },
  'Seated Calf Raise':          { primary: ['calves'],                               secondary: [] },

  // Triceps
  'Overhead Tricep Extension':  { primary: ['triceps'],                              secondary: [] },
  'Tricep Dip':                 { primary: ['triceps'],                              secondary: ['chest', 'front-deltoids'] },
  'Close Grip Bench Press':     { primary: ['triceps', 'chest'],                     secondary: ['front-deltoids'] },

  // Biceps
  'Preacher Curl':              { primary: ['biceps'],                               secondary: [] },
  'Incline Dumbbell Curl':      { primary: ['biceps'],                               secondary: [] },
  'Cable Curl':                 { primary: ['biceps'],                               secondary: ['forearm'] },
  'Concentration Curl':         { primary: ['biceps'],                               secondary: [] },
  'EZ Bar Curl':                { primary: ['biceps'],                               secondary: ['forearm'] },
  'Barbell Curl':               { primary: ['biceps'],                               secondary: ['forearm'] },

  // Core
  'Cable Crunch':               { primary: ['abs'],                                  secondary: ['obliques'] },
  'Hanging Leg Raise':          { primary: ['abs', 'adductor'],                      secondary: [] },
  'Ab Rollout':                 { primary: ['abs'],                                  secondary: ['lower-back'] },
  'Russian Twist':              { primary: ['obliques', 'abs'],                      secondary: [] },

  // Bodyweight / mat exercises
  'Push-Up':                    { primary: ['chest', 'front-deltoids'],              secondary: ['triceps', 'abs'] },
  'Pike Push-Up':               { primary: ['front-deltoids', 'shoulders'],          secondary: ['triceps'] },
  'Diamond Push-Up':            { primary: ['triceps', 'chest'],                     secondary: ['front-deltoids'] },
  'Glute Bridge':               { primary: ['gluteal', 'hamstrings'],                secondary: ['lower-back'] },
  'Single-Leg Glute Bridge':    { primary: ['gluteal', 'hamstrings'],                secondary: ['lower-back', 'abs'] },
  'Bodyweight Squat':           { primary: ['quadriceps', 'gluteal'],                secondary: ['hamstrings', 'calves'] },
  'Reverse Lunge':              { primary: ['quadriceps', 'gluteal'],                secondary: ['hamstrings'] },
  'Dead Bug':                   { primary: ['abs'],                                  secondary: ['lower-back'] },
  'Bird Dog':                   { primary: ['abs', 'lower-back'],                    secondary: ['gluteal'] },
  'Superman Hold':              { primary: ['lower-back', 'gluteal'],                secondary: ['hamstrings'] },
  'Mountain Climbers':          { primary: ['abs', 'front-deltoids'],                secondary: ['quadriceps'] },
  'Hollow Body Hold':           { primary: ['abs'],                                  secondary: ['front-deltoids'] },
  'Cossack Squat':              { primary: ['quadriceps', 'gluteal'],                secondary: ['hip-flexors', 'abs'] },
  'Resistance Band Pull-Apart': { primary: ['rear-deltoids', 'shoulders'],           secondary: [] },
  'Resistance Band Row':        { primary: ['upper-back', 'biceps'],                 secondary: ['rear-deltoids'] },
  'Resistance Band Curl':       { primary: ['biceps'],                               secondary: ['front-deltoids'] },
  'Resistance Band Lateral Walk': { primary: ['gluteal'],                            secondary: [] },
};

/**
 * Returns { primary, secondary } for an exercise name.
 * Case-insensitive, trims whitespace, handles slight variations via partial match.
 * Falls back to { primary: [], secondary: [] } for unknown exercises.
 *
 * @param {string} exerciseName
 * @returns {{ primary: string[], secondary: string[] }}
 */
export function getMusclesForExercise(exerciseName) {
  if (!exerciseName) return { primary: [], secondary: [] };
  const needle = exerciseName.toLowerCase().trim();

  // 1. Exact case-insensitive match
  const exactKey = Object.keys(EXERCISE_MUSCLE_MAP).find(
    (k) => k.toLowerCase() === needle
  );
  if (exactKey) return EXERCISE_MUSCLE_MAP[exactKey];

  // 2. Normalized match — hyphens → spaces, collapse whitespace
  const normalize = (s) => s.toLowerCase().replace(/-/g, ' ').replace(/\s+/g, ' ').trim();
  const normalizedNeedle = normalize(exerciseName);
  const normKey = Object.keys(EXERCISE_MUSCLE_MAP).find(
    (k) => normalize(k) === normalizedNeedle
  );
  if (normKey) return EXERCISE_MUSCLE_MAP[normKey];

  // 3. Partial match — needle contains a known key
  const partialKey = Object.keys(EXERCISE_MUSCLE_MAP).find(
    (k) => needle.includes(k.toLowerCase())
  );
  if (partialKey) return EXERCISE_MUSCLE_MAP[partialKey];

  // 4. Reverse partial — a known key contains the needle
  const reverseKey = Object.keys(EXERCISE_MUSCLE_MAP).find(
    (k) => k.toLowerCase().includes(needle)
  );
  return reverseKey
    ? EXERCISE_MUSCLE_MAP[reverseKey]
    : { primary: [], secondary: [] };
}
