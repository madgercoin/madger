export async function firstSuccessful(endpoints, operation, label = 'service') {
  const errors = []
  for (const endpoint of endpoints ?? []) {
    try {
      return { value: await operation(endpoint), endpoint, errors }
    } catch (error) {
      const message = String(error instanceof Error ? error.message : error).slice(0, 120)
      errors.push({ endpoint, message })
    }
  }
  const summary = errors.map(item => item.endpoint + ': ' + item.message).join('; ')
  throw new Error(label + ' exhausted ' + errors.length + ' endpoint' + (errors.length === 1 ? '' : 's') + (summary ? ' (' + summary + ')' : ''))
}
