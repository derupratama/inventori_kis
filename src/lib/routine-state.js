export function toggleCompletedStep(completed, stepId) {
  return { ...completed, [stepId]: !completed[stepId] }
}

export function setRoutineCompletion(completed, steps, shouldComplete) {
  return steps.reduce((next, step) => ({ ...next, [step.id]: shouldComplete }), completed)
}

export function toggleFavoriteId(favorites, productId) {
  return favorites.includes(productId)
    ? favorites.filter((id) => id !== productId)
    : [...favorites, productId]
}
