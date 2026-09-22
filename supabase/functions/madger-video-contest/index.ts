import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'npm:@supabase/supabase-js@2.57.4'

const BUCKET = 'madger-video-contest-sept-2026'
const CLOSES_AT = '2026-09-23T03:59:00.000Z'
const MAX_BYTES = 1024 * 1024 * 1024
const R2_STATUS_URL = 'https://madgercoin.com/api/contest-upload/status'
const ALLOWED_TYPES = new Set(['video/mp4', 'video/quicktime', 'video/webm', 'video/x-m4v', 'video/mpeg'])
const ALLOWED_ORIGINS = new Set(['https://madgercoin.com', 'https://www.madgercoin.com'])

function cors(req: Request) {
  const origin = req.headers.get('origin') || ''
  return {
    'Access-Control-Allow-Origin': ALLOWED_ORIGINS.has(origin) ? origin : 'https://madgercoin.com',
    'Access-Control-Allow-Headers': 'content-type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Max-Age': '86400',
    'Cache-Control': 'no-store',
    'Content-Type': 'application/json',
    'Vary': 'Origin',
    'X-Content-Type-Options': 'nosniff',
  }
}

function json(req: Request, body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: cors(req) })
}

const isOpen = () => Date.now() <= Date.parse(CLOSES_AT)
const clean = (value: unknown, max: number) =>
  typeof value === 'string' && value.trim().length > 0 && value.trim().length <= max ? value.trim() : null
const stem = (name: string) => name.lastIndexOf('.') > 0 ? name.slice(0, name.lastIndexOf('.')) : name
const isUuid = (value: unknown) =>
  typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)

async function hash(value: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('')
}

async function uploadToken(key: string, entry: { id: string, file_size: number, file_name: string }) {
  const cryptoKey = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(key), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  )
  const message = `${entry.id}:${entry.file_size}:${entry.file_name}`
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, new TextEncoder().encode(message))
  return Array.from(new Uint8Array(signature), b => b.toString(16).padStart(2, '0')).join('')
}

function constantTimeEqual(left: string, right: string) {
  if (left.length !== right.length) return false
  let difference = 0
  for (let index = 0; index < left.length; index += 1) difference |= left.charCodeAt(index) ^ right.charCodeAt(index)
  return difference === 0
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors(req) })
  if (req.method === 'GET') {
    return json(req, { ok: true, assets_ready: true, accepting: isOpen(), closes_at: CLOSES_AT })
  }
  if (req.method !== 'POST') return json(req, { ok: false, error: 'Method not allowed.' }, 405)
  const url = Deno.env.get('SUPABASE_URL')
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !key) return json(req, { ok: false, error: 'The contest server is temporarily unavailable.' }, 503)

  let body: Record<string, unknown>
  try { body = await req.json() } catch { return json(req, { ok: false, error: 'Invalid request.' }, 400) }
  const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })

  if (body.action === 'init') {
    if (!isOpen()) return json(req, { ok: false, error: 'The contest entry window has closed.' }, 410)
    const entrantName = clean(body.entrant_name, 120)
    const contactEmail = clean(body.contact_email, 254)
    const socialHandle = clean(body.social_handle, 120)
    const videoTitle = clean(body.video_title, 180)
    const publicPostUrl = clean(body.public_post_url, 500)
    const walletAddress = clean(body.wallet_address, 64)
    const fileName = clean(body.file_name, 180)
    const contentType = clean(body.content_type, 100)
    const fileSize = Number(body.file_size)
    const safeName = fileName && fileName !== '.' && fileName !== '..' && !/[\\/\u0000-\u001f\u007f]/.test(fileName)
    let validPostUrl = false
    try { validPostUrl = Boolean(publicPostUrl && new URL(publicPostUrl).protocol === 'https:') } catch { /* invalid */ }

    if (!entrantName || !contactEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail) ||
        !socialHandle || !videoTitle || !publicPostUrl || !validPostUrl ||
        !walletAddress || !/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(walletAddress) ||
        !fileName || !safeName || stem(fileName) !== videoTitle ||
        !Number.isSafeInteger(fileSize) || fileSize <= 0 || fileSize > MAX_BYTES ||
        !contentType || !ALLOWED_TYPES.has(contentType)) {
      return json(req, { ok: false, error: 'Check every entry field and select a supported video file no larger than 1 GB. The file name must exactly match the video title.' }, 400)
    }

    const confirmations = [
      'hashtag_confirmed', 'dex_rocket_confirmed', 'likeness_assets_confirmed',
      'originality_rights_confirmed', 'ownership_transfer_confirmed',
      'vesting_confirmed', 'eligibility_confirmed',
    ]
    if (!confirmations.every(name => body[name] === true)) {
      return json(req, { ok: false, error: 'Every required contest confirmation must be accepted.' }, 400)
    }

    const forwarded = req.headers.get('cf-connecting-ip') ||
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
    const ipHash = await hash(forwarded + ':' + key.slice(-24))
    const since = new Date(Date.now() - 3600000).toISOString()
    const { count, error: countError } = await db.from('madger_video_contest_entries')
      .select('id', { count: 'exact', head: true }).eq('submitted_ip_hash', ipHash).gte('created_at', since)
    if (countError) return json(req, { ok: false, error: 'The contest server could not prepare this submission.' }, 500)
    if ((count || 0) >= 30) return json(req, { ok: false, error: 'Too many submission attempts. Please wait and try again.' }, 429)

    const entryId = crypto.randomUUID()
    const storagePath = `${entryId}/${fileName}`
    const { error: insertError } = await db.from('madger_video_contest_entries').insert({
      id: entryId, entrant_name: entrantName, contact_email: contactEmail.toLowerCase(),
      social_handle: socialHandle, video_title: videoTitle, public_post_url: publicPostUrl,
      wallet_address: walletAddress, file_name: fileName, file_size: fileSize,
      content_type: contentType, storage_path: storagePath, hashtag_confirmed: true,
      dex_rocket_confirmed: true, likeness_assets_confirmed: true,
      originality_rights_confirmed: true, ownership_transfer_confirmed: true,
      vesting_confirmed: true, eligibility_confirmed: true, upload_complete: false,
      sync_status: 'pending', user_agent: (req.headers.get('user-agent') || '').slice(0, 500) || null,
      submitted_ip_hash: ipHash,
    })
    if (insertError) {
      console.error('entry insert:', insertError.message)
      return json(req, { ok: false, error: 'The contest server could not save the entry details.' }, 500)
    }
    const token = await uploadToken(key, { id: entryId, file_size: fileSize, file_name: fileName })
    return json(req, { ok: true, entry_id: entryId, upload_token: token, storage_provider: 'r2' })
  }

  if (body.action === 'verify_r2_upload' || body.action === 'finalize_r2') {
    if (!isUuid(body.entry_id) || typeof body.upload_token !== 'string') {
      return json(req, { ok: false, error: 'Invalid upload authorization.' }, 400)
    }
    const entryId = body.entry_id as string
    const { data: entry, error: entryError } = await db.from('madger_video_contest_entries')
      .select('id,file_name,file_size,content_type,storage_path,upload_complete').eq('id', entryId).single()
    if (entryError || !entry) return json(req, { ok: false, error: 'Contest entry not found.' }, 404)
    const expectedToken = await uploadToken(key, entry)
    if (!constantTimeEqual(body.upload_token, expectedToken)) {
      return json(req, { ok: false, error: 'Invalid upload authorization.' }, 403)
    }

    if (body.action === 'verify_r2_upload') {
      return json(req, {
        ok: true, entry_id: entry.id, storage_path: entry.storage_path,
        file_name: entry.file_name, file_size: entry.file_size,
        content_type: entry.content_type, upload_complete: entry.upload_complete,
      })
    }

    if (entry.upload_complete) return json(req, { ok: true, entry_id: entryId })
    let statusResponse: Response
    try {
      statusResponse = await fetch(`${R2_STATUS_URL}?entry_id=${encodeURIComponent(entryId)}`, {
        headers: { 'x-upload-token': body.upload_token },
      })
    } catch {
      return json(req, { ok: false, error: 'The uploaded video could not be verified. Please try again.' }, 503)
    }
    const object = await statusResponse.json().catch(() => null)
    if (!statusResponse.ok || !object?.ok || Number(object.size) !== Number(entry.file_size)) {
      return json(req, { ok: false, error: 'The uploaded video could not be verified. Please retry the upload.' }, 409)
    }
    const { error: updateError } = await db.from('madger_video_contest_entries')
      .update({ upload_complete: true, sync_status: 'ready', updated_at: new Date().toISOString() }).eq('id', entryId)
    if (updateError) return json(req, { ok: false, error: 'The entry upload succeeded but final confirmation failed. Please try again.' }, 500)
    return json(req, { ok: true, entry_id: entryId })
  }

  if (body.action === 'finalize') {
    if (!isUuid(body.entry_id)) return json(req, { ok: false, error: 'Invalid entry reference.' }, 400)
    const entryId = body.entry_id as string
    const { data: entry, error: entryError } = await db.from('madger_video_contest_entries')
      .select('id,file_name,file_size,upload_complete').eq('id', entryId).single()
    if (entryError || !entry) return json(req, { ok: false, error: 'Contest entry not found.' }, 404)
    if (entry.upload_complete) return json(req, { ok: true, entry_id: entryId })

    const { data: objects, error: listError } = await db.storage.from(BUCKET)
      .list(entryId, { limit: 100, search: entry.file_name })
    const object = objects?.find(item => item.name === entry.file_name)
    if (listError || !object || Number(object.metadata?.size ?? -1) !== Number(entry.file_size)) {
      return json(req, { ok: false, error: 'The uploaded video could not be verified. Please retry the upload.' }, 409)
    }

    const { error: updateError } = await db.from('madger_video_contest_entries')
      .update({ upload_complete: true, sync_status: 'ready', updated_at: new Date().toISOString() }).eq('id', entryId)
    if (updateError) return json(req, { ok: false, error: 'The entry upload succeeded but final confirmation failed. Please try again.' }, 500)
    return json(req, { ok: true, entry_id: entryId })
  }

  return json(req, { ok: false, error: 'Unknown contest action.' }, 400)
})
