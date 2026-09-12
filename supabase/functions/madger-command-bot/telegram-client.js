export function createTelegramClient(token, fetchImpl = fetch) {
  const api = token ? 'https://api.telegram.org/bot' + token : ''
  return async function telegram(method, body) {
    if (!api) throw new Error('TELEGRAM_BOT_TOKEN is not configured')
    const response = await fetchImpl(api + '/' + method, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })
    let result
    try {
      result = await response.json()
    } catch {
      throw new Error('Telegram ' + method + ' returned an invalid response')
    }
    if (!response.ok || !result?.ok) {
      throw new Error('Telegram ' + method + ' failed: ' + (result?.description ?? response.status))
    }
    return result.result
  }
}

export function keyboard(rows) {
  return { inline_keyboard: rows }
}

export function isGroupChat(chat) {
  return chat?.type === 'group' || chat?.type === 'supergroup'
}
