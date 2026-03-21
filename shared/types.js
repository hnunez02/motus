/**
 * @typedef {Object} UserProfile
 * @property {string} id
 * @property {string} email
 * @property {number} trainingAge
 * @property {string[]} goals
 * @property {string[]} equipment
 * @property {string[]} injuryFlags
 * @property {number} daysPerWeek
 */

/**
 * @typedef {Object} PerfProfile
 * @property {string} userId
 * @property {number} fatigueScore  0-10 EMA
 * @property {Record<string, number>} weeklyVolume
 * @property {Date} lastUpdated
 */

/**
 * @typedef {Object} Mesocycle
 * @property {string} id
 * @property {string} userId
 * @property {string} goal  "hypertrophy" | "strength" | "endurance"
 * @property {number} weeksTotal
 * @property {number} currentWeek
 * @property {boolean} isActive
 */

/**
 * @typedef {Object} WorkoutPlan
 * @property {string} id
 * @property {string} mesocycleId
 * @property {number} weekNum
 * @property {string} dayLabel
 * @property {string} modality  "lift" | "cardio"
 * @property {PlannedSet[]} plannedSets
 */

/**
 * @typedef {Object} PlannedSet
 * @property {string} id
 * @property {string} planId
 * @property {string} exerciseId
 * @property {number} setNumber
 * @property {number} targetReps
 * @property {number} targetRpe
 * @property {number} restSeconds
 * @property {string|null} notes
 */

/**
 * @typedef {Object} LoggedSet
 * @property {string} id
 * @property {string|null} plannedSetId
 * @property {string} userId
 * @property {string|null} exerciseId
 * @property {number} actualWeight
 * @property {number} actualReps
 * @property {number} loggedRpe
 * @property {number|null} targetRpe
 * @property {number|null} rpeDelta
 * @property {Date} loggedAt
 */

/**
 * @typedef {Object} Exercise
 * @property {string} id
 * @property {string} name
 * @property {string[]} muscleGroups
 * @property {string} category  "compound" | "isolation"
 * @property {string} modality  "lift" | "cardio"
 * @property {string[]} equipment
 * @property {string[]} formCues
 * @property {string|null} videoUrl
 */

/**
 * @typedef {Object} AiSessionResponse
 * @property {string} sessionTitle
 * @property {string} rationale
 * @property {string|null} fatigueNote
 * @property {AiExercise[]} exercises
 * @property {AiCitationRef[]} citations
 * @property {string} nextSessionNote
 */

/**
 * @typedef {Object} AiExercise
 * @property {string|null} exerciseId
 * @property {string} name
 * @property {number} sets
 * @property {string} reps
 * @property {number} rpe
 * @property {number} restSeconds
 * @property {string} formCue
 * @property {string} whyThisExercise
 * @property {string[]} substituteWith
 */

/**
 * @typedef {Object} AiCitationRef
 * @property {string} title
 * @property {string} keyFinding
 */

export {};
