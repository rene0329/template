export function keepStableCollection(current, next) {
  const nextCollection = Array.isArray(next) ? next : []
  return JSON.stringify(current) === JSON.stringify(nextCollection)
    ? current
    : nextCollection
}
