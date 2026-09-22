import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'npm:@supabase/supabase-js@2.57.4'

const BUCKET = 'madger-video-contest-sept-2026'
const CLOSES_AT = '2026-09-23T03:59:00.000Z'
const MAX_BYTES = 1024 * 1024 * 1024
const CHUNK_BYTES = 40 * 1024 * 1024
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
    const storagePath = `${entryId}/parts`
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
    const partCount = Math.ceil(fileSize / CHUNK_BYTES)
    const uploads = []
    for (let index = 0; index < partCount; index += 1) {
      const partNumber = index + 1
      const partName = `part-${String(partNumber).padStart(3, '0')}`
      const partPath = `${storagePath}/${partName}`
      const { data: upload, error: uploadError } = await db.storage.from(BUCKET)
        .createSignedUploadUrl(partPath, { upsert: false })
      if (uploadError || !upload?.signedUrl) {
        console.error('chunk upload URL:', uploadError?.message)
        return json(req, { ok: false, error: 'The contest server could not prepare every secure upload part.' }, 500)
      }
      uploads.push({
        part_number: partNumber,
        offset: index * CHUNK_BYTES,
        size: Math.min(CHUNK_BYTES, fileSize - (index * CHUNK_BYTES)),
        signed_url: upload.signedUrl,
      })
    }
    return json(req, { ok: true, entry_id: entryId, uploads, chunk_size: CHUNK_BYTES, storage_provider: 'supabase-segmented' })
  }

  if (body.action === 'finalize_parts') {
    if (!isUuid(body.entry_id)) return json(req, { ok: false, error: 'Invalid entry reference.' }, 400)
    const entryId = body.entry_id as string
    const { data: entry, error: entryError } = await db.from('madger_video_contest_entries')
      .select('id,file_size,upload_complete').eq('id', entryId).single()
    if (entryError || !entry) return json(req, { ok: false, error: 'Contest entry not found.' }, 404)
    if (entry.upload_complete) return json(req, { ok: true, entry_id: entryId })

    const expectedParts = Math.ceil(Number(entry.file_size) / CHUNK_BYTES)
    const { data: objects, error: listError } = await db.storage.from(BUCKET)
      .list(`${entryId}/parts`, { limit: 100, sortBy: { column: 'name', order: 'asc' } })
    const parts = (objects || []).filter(item => /^part-\d{3}$/.test(item.name))
    let totalSize = 0
    let partsValid = parts.length === expectedParts
    for (let index = 0; index < parts.length; index += 1) {
      const expectedName = `part-${String(index + 1).padStart(3, '0')}`
      const expectedSize = Math.min(CHUNK_BYTES, Number(entry.file_size) - (index * CHUNK_BYTES))
      const actualSize = Number(parts[index].metadata?.size ?? -1)
      if (parts[index].name !== expectedName || actualSize !== expectedSize) partsValid = false
      totalSize += actualSize
    }
    if (listError || !partsValid || totalSize !== Number(entry.file_size)) {
      return json(req, { ok: false, error: 'The uploaded video parts could not be verified. Please retry the upload.' }, 409)
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
