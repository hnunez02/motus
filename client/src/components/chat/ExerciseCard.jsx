export default function ExerciseCard({ exercise, index }) {
  console.log('Exercise data:', exercise);
  return (
    <div className="bg-surface-elevated rounded-card p-3">
      <div className="flex justify-between items-start mb-1">
        <span className="text-xs text-text-muted font-mono">#{index + 1}</span>
        <span className="text-xs text-text-muted">Rest {exercise.restSeconds}s</span>
      </div>
      <h3 className="font-semibold text-text-primary">{exercise.name}</h3>
      <div className="flex gap-3 mt-1 text-sm text-text-secondary">
        <span>{exercise.sets} sets</span>
        <span>{exercise.reps} reps</span>
        <span>RPE {exercise.rpe}</span>
      </div>
      {exercise.formCue && (
        <p className="text-xs text-brand mt-2 italic">💡 {exercise.formCue}</p>
      )}
      {(exercise.whyThisExercise || exercise.exerciseExplanation) && (
        <div className="mt-2 space-y-1.5">
          {exercise.whyThisExercise && (
            <div>
              <span className="text-[10px] text-text-muted uppercase tracking-wide">The science</span>
              <p className="text-xs text-brand mt-0.5">{exercise.whyThisExercise}</p>
            </div>
          )}
          <div>
            <span className="text-[10px] text-text-muted uppercase tracking-wide">What this means for you</span>
            <p className="text-sm text-text-secondary mt-0.5">
              {exercise.exerciseExplanation || 'Tap generate to get a full explanation for this exercise.'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
