export async function readJsonResponse(response, label, { allowEmpty = false } = {}) {
  if (!response?.ok) {
    const detail = typeof response?.text === 'function' ? (await response.text()).slice(0, 160) : ''
    throw new Error(`${label} failed: ${response?.status ?? 'no response'}${detail ? ` ${detail}` : ''}`)
  }
  if (allowEmpty && response.status === 204) return null
  const text = await response.text()
  if (!text && allowEmpty) return null
  try {
    return JSON.parse(text)
  } catch {
    throw new Error(`${label} returned invalid JSON`)
  }
}
