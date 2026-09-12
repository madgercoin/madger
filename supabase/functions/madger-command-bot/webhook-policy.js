export function secureStringEqual(left, right) {
  const a = String(left ?? '')
  const b = String(right ?? '')
  if (!a || a.length !== b.length) return false
  let difference = 0
  for (let index = 0; index < a.length; index += 1) {
    difference |= a.charCodeAt(index) ^ b.charCodeAt(index)
  }
  return difference === 0
}

export function isWebhookAuthorized(supplied, expected) {
  return secureStringEqual(supplied, expected)
}

export function isDuplicateUpdateError(error) {
  return /duplicate|unique constraint/i.test(String(error ?? ''))
}
