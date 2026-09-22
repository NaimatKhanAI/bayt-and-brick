import http from 'node:http'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { randomBytes, scryptSync } from 'node:crypto'
import { initialAreas } from './src/areas.js'
import { accessControl } from './admin-access.mjs'
import { categories, allListings } from './src/data.js'

const root = process.cwd(), local = path.join(root, '.local'), uploads = path.join(root, 'uploads')
await fs.mkdir(local, { recursive: true }); await fs.mkdir(uploads, { recursive: true })
const dbPath = path.join(local, 'database.json'), authPath = path.join(local, 'admin.json')
let db
try { db = JSON.parse(await fs.readFile(dbPath, 'utf8')) } catch { db = { properties: allListings.map(p => ({ ...p, yearlyPrice: p.price * 12, description: 'A thoughtfully arranged home with comfortable living spaces and room for everyday life.', demo: true })), enquiries: [] }; await fs.writeFile(dbPath, JSON.stringify(db)) }
if (!Array.isArray(db.areas)) {
  db.areas = initialAreas.map((a, i) => ({ ...a, id: 'area-' + i }))
  for (const p of db.properties) if (!db.areas.some(a => a.name === p.area)) db.areas.push({ id: randomBytes(8).toString('hex'), name: p.area, emirate: p.location.split(',').pop().trim(), image: p.image, note: '' })
  await fs.writeFile(dbPath, JSON.stringify(db))
}
let admin
try { admin = JSON.parse(await fs.readFile(authPath, 'utf8')) } catch {
  const password = process.env.ADMIN_PASSWORD || randomBytes(18).toString('base64url'), salt = randomBytes(16).toString('hex')
  admin = { username: process.env.ADMIN_USERNAME || 'admin', salt, hash: scryptSync(password, salt, 64).toString('hex') }
  await fs.writeFile(authPath, JSON.stringify(admin), { mode: 0o600 })
  if (!process.env.ADMIN_PASSWORD) await fs.writeFile(path.join(local, 'admin-access.txt'), `Admin URL: /admin\nUsername: ${admin.username}\nPassword: ${password}\nKeep this file private.\n`, { mode: 0o600 })
}
// Hosting-managed credentials also override an existing installation on restart.
if (process.env.ADMIN_PASSWORD) {
  const salt = randomBytes(16).toString('hex')
  admin = { username: process.env.ADMIN_USERNAME || admin.username || 'admin', salt, hash: scryptSync(process.env.ADMIN_PASSWORD, salt, 64).toString('hex') }
  await fs.writeFile(authPath, JSON.stringify(admin), { mode: 0o600 })
  await fs.rm(path.join(local, 'admin-access.txt'), { force: true })
}
const sessions = new Map(), limits = new Map()
let queue = Promise.resolve()
const save = () => { const snapshot = JSON.stringify(db, null, 2); queue = queue.then(async () => { await fs.writeFile(dbPath + '.tmp', snapshot); await fs.rename(dbPath + '.tmp', dbPath) }); return queue }
const access = accessControl(db, admin, sessions, save)
await save()
const validDate = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0,10) === value
const json = (res, status, value) => { res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(value)) }
async function body(req, max = 1024 * 1024) { let chunks = [], size = 0; for await (const c of req) { size += c.length; if (size > max) throw Object.assign(new Error('File or request is too large.'), { status: 413 }); chunks.push(c) } return Buffer.concat(chunks) }
const parse = async req => JSON.parse((await body(req)).toString())
function rate(req, key, max) { const k = req.socket.remoteAddress + key, now = Date.now(); let l = limits.get(k); if (!l || now > l.until) { l = { count: 0, until: now + 900000 }; limits.set(k, l) } if (++l.count > max) throw Object.assign(new Error('Too many attempts. Try again in 15 minutes.'), { status: 429 }) }
const clean = (v, max = 500) => typeof v === 'string' ? v.trim().slice(0, max) : ''
const mediaOK = v => typeof v === 'string' && /^\/(assets|uploads)\/[a-zA-Z0-9_.-]+$/.test(v)
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.mp4': 'video/mp4', '.webm': 'video/webm', '.ico': 'image/x-icon' }
const server = http.createServer(async (req, res) => {
  res.setHeader('X-Content-Type-Options', 'nosniff'); res.setHeader('X-Frame-Options', 'DENY'); res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
  try {
    const url = new URL(req.url, 'http://localhost'), p = url.pathname, method = req.method
    if (p.startsWith('/api/') && !['GET', 'HEAD'].includes(method) && req.headers.origin && new URL(req.headers.origin).host !== req.headers.host) return json(res, 403, { error: 'Request origin is not allowed.' })
    const token = (req.headers.cookie || '').match(/(?:^|;\s*)bb_session=([^;]+)/)?.[1], session = sessions.get(token), actor = session && session.expires > Date.now() ? access.resolve(session.userId) : null, authorized = Boolean(actor)
    if (p === '/api/areas' && method === 'GET') return json(res, 200, db.areas)
    if (p === '/api/properties' && method === 'GET') return json(res, 200, db.properties.filter(property => !property.hidden))
    if (p === '/api/session' && method === 'GET') return json(res, 200, { authenticated: Boolean(authorized), user: actor })
    if (p === '/api/login' && method === 'POST') {
      rate(req, 'login', 10); const data = await parse(req), user = access.login(data.username, data.password)
      if (!user) return json(res, 401, { error: 'Incorrect username or password.' })
      const next = randomBytes(32).toString('hex'); sessions.set(next, { expires: Date.now() + 28800000, userId: user.id })
      access.record(user,'login','session',user.id,'Signed in'); await save()
      res.setHeader('Set-Cookie', `bb_session=${next}; HttpOnly; SameSite=Strict; Path=/; Max-Age=28800${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`); return json(res, 200, { ok: true, user })
    }
    if (p === '/api/logout' && method === 'POST') { sessions.delete(token); res.setHeader('Set-Cookie', 'bb_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0'); return json(res, 200, { ok: true }) }
    if (p === '/api/enquiries' && method === 'POST') {
      rate(req, 'enquiry', 20); const d = await parse(req)
      if (!clean(d.name) || !/^[+\d ()-]{7,25}$/.test(d.phone || '') || !/^\d{4}-\d{2}-\d{2}$/.test(d.date || '')) return json(res, 400, { error: 'Please enter your name, a valid phone number and move-in date.' })
      db.enquiries.unshift({ id: randomBytes(8).toString('hex'), name: clean(d.name, 100), phone: clean(d.phone, 25), date: d.date, message: clean(d.message, 2000), property: clean(d.property), created: new Date().toISOString() }); await save(); return json(res, 201, { ok: true })
    }
    if (p.startsWith('/api/')) {
      if (!authorized) return json(res, 401, { error: 'Please sign in as an administrator.' })
      if (/^\/api\/(users|roles|activity)(\/|$)/.test(p)) {
        const result = await access.handle(p, method, method === 'POST' ? await parse(req) : {}, actor)
        if (result) return json(res, ...result)
      }
      if (p === '/api/admin/properties' && method === 'GET') return json(res, 200, db.properties)
      if (/^\/api\/properties\/[^/]+\/visibility$/.test(p) && method === 'POST') {
        if (actor.id !== 'owner') return json(res,403,{error:'Only the super admin can hide or unhide properties.'})
        const d = await parse(req), previous = db.properties.find(item => item.id === p.split('/')[3])
        if (!previous) return json(res,404,{error:'Property not found.'})
        if (typeof d.hidden !== 'boolean') return json(res,400,{error:'Choose a valid visibility setting.'})
        const item = {...previous, hidden:d.hidden, updatedAt:new Date().toISOString()}
        db.properties = db.properties.map(property => property.id === item.id ? item : property)
        access.record(actor,d.hidden?'hide':'unhide','property',item.id,item.name,previous,item)
        await save(); return json(res,200,item)
      }
      if (p === '/api/areas' && method === 'POST') {
        access.requirePermission(actor, 'areas.manage')
        const d = await parse(req), name = clean(d.name, 100), emirate = clean(d.emirate, 100)
        if (!name || !['Dubai','Sharjah','Abu Dhabi','Ajman','Ras Al Khaimah','Fujairah','Umm Al Quwain'].includes(emirate)) return json(res, 400, { error: 'Enter an area name and select an emirate.' })
        if (db.areas.some(a => a.name.toLowerCase() === name.toLowerCase())) return json(res, 409, { error: 'This area already exists.' })
        const area = { id: randomBytes(8).toString('hex'), name, emirate, note: clean(d.note, 500), image: '/assets/muwaileh-neighbourhood.webp' }
        db.areas.push(area); access.record(actor,'create','area',area.id,area.name,null,area); await save(); return json(res, 201, area)
      }
      if (p.startsWith('/api/areas/') && method === 'DELETE') {
        access.requirePermission(actor,'areas.manage')
        const area = db.areas.find(a => a.id === p.split('/').pop())
        if (!area) return json(res, 404, { error: 'Area not found.' })
        if (db.properties.some(p => p.area === area.name)) return json(res, 409, { error: 'Move or remove the properties in this area before deleting it.' })
        db.areas = db.areas.filter(a => a.id !== area.id); access.record(actor,'delete','area',area.id,area.name,area); await save(); return json(res, 200, { ok: true })
      }
      if (p === '/api/enquiries' && method === 'GET') { access.requirePermission(actor,'enquiries.view'); return json(res, 200, db.enquiries) }
      if (p === '/api/upload' && method === 'POST') {
        if (!actor.permissions.includes('properties.create')) access.requirePermission(actor,'properties.edit')
        const b = await body(req, 50 * 1024 * 1024); let ext
        if (b.subarray(0, 3).equals(Buffer.from([255,216,255]))) ext = '.jpg'
        else if (b.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) ext = '.png'
        else if (b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP') ext = '.webp'
        else if (b.toString('ascii', 4, 8) === 'ftyp') ext = '.mp4'
        else if (b.subarray(0, 4).equals(Buffer.from([26,69,223,163]))) ext = '.webm'
        if (!ext) return json(res, 400, { error: 'Upload a JPG, PNG, WebP, MP4 or WebM file.' })
        const name = randomBytes(16).toString('hex') + ext; await fs.writeFile(path.join(uploads, name), b); access.record(actor,'upload','media',name,name); await save(); return json(res, 201, { url: '/uploads/' + name, video: ['.mp4', '.webm'].includes(ext) })
      }
      if (p === '/api/properties' && method === 'POST') {
        const d = await parse(req)
        const previous = d.id ? db.properties.find(x => x.id === d.id) : null
        access.requirePermission(actor, d.id ? 'properties.edit' : 'properties.create')
        if (d.id && !previous) return json(res,404,{error:'Property not found.'})
        if (d.hidden !== undefined && (typeof d.hidden !== 'boolean' || (actor.id !== 'owner' && d.hidden !== Boolean(previous?.hidden)))) return json(res,403,{error:'Only the super admin can change property visibility.'})
        if (['showCallButton','showWhatsappButton'].some(key => d[key] !== undefined && typeof d[key] !== 'boolean')) return json(res,400,{error:'Contact button settings must be true or false.'})
        if (d.availableFrom && !validDate(d.availableFrom)) return json(res,400,{error:'Enter a valid availability date.'})
        if (d.bathrooms !== undefined && (!Number.isInteger(Number(d.bathrooms)) || Number(d.bathrooms) < 1 || Number(d.bathrooms) > 20)) return json(res,400,{error:'Bathrooms must be between 1 and 20.'})
        if (!clean(d.name) || !categories.some(c => c.slug === d.slug) || !clean(d.area) || !(Number(d.price) > 0) || !(Number(d.yearlyPrice) > 0) || !Array.isArray(d.images) || !d.images.length || !d.images.every(mediaOK) || (d.video && !mediaOK(d.video))) return json(res, 400, { error: 'Add a title, home type, area, both rental prices and at least one photo.' })
        if (!Number.isFinite(Number(d.price)) || !Number.isFinite(Number(d.yearlyPrice)) || !clean(d.location) || !d.images.every(v => /\.(jpg|jpeg|png|webp)$/i.test(v)) || (d.video && !/\.(mp4|webm)$/i.test(d.video))) return json(res, 400, { error: 'Use valid prices, a location, image photos and a supported video file.' })
        for (const media of [...d.images, d.video].filter(v => v && v.startsWith('/uploads/'))) { try { await fs.access(path.join(uploads, path.basename(media))) } catch { return json(res, 400, { error: 'One of your uploaded files is missing. Please upload it again.' }) } }
        if (!db.areas.some(a => a.name === clean(d.area))) return json(res, 400, { error: 'Select an existing area or add it in the Areas tab first.' })
        const id = db.properties.find(x => x.id === d.id)?.id || randomBytes(8).toString('hex')
        const item = { id, hidden: actor.id === 'owner' && typeof d.hidden === 'boolean' ? d.hidden : Boolean(previous?.hidden), showCallButton: d.showCallButton ?? previous?.showCallButton ?? true, showWhatsappButton: d.showWhatsappButton ?? previous?.showWhatsappButton ?? true, name: clean(d.name), slug: d.slug, category: categories.find(c => c.slug === d.slug).label, availableFrom: d.availableFrom || '', bathrooms: Number(d.bathrooms || previous?.bathrooms || (d.slug === '2-bhk' ? 2 : 1)), area: clean(d.area), location: clean(d.location), price: Number(d.price), yearlyPrice: Number(d.yearlyPrice), size: clean(d.size), furnished: Boolean(d.furnished), description: clean(d.description, 5000), images: d.images.slice(0, 30), image: d.images[0], video: d.video || '', available: 'Enquire for availability', reference: previous?.reference || 'BB-' + id.slice(-6).toUpperCase(), demo: false, createdAt: previous?.createdAt || new Date().toISOString(), updatedAt: new Date().toISOString() }
        db.properties = [item, ...db.properties.filter(x => x.id !== id)]; access.record(actor,previous?'update':'create','property',id,item.name,previous,item); await save(); return json(res, 200, item)
      }
      if (p.startsWith('/api/properties/') && method === 'DELETE') {
        if (actor.id !== 'owner') return json(res,403,{error:'Only the super admin can delete properties.'})
        const previous = db.properties.find(x => x.id === p.split('/').pop())
        if (!previous) return json(res,404,{error:'Property not found.'})
        db.properties = db.properties.filter(x => x.id !== previous.id)
        access.record(actor,'delete','property',previous.id,previous.name,previous); await save(); return json(res,200,{ok:true})
      }
      if (p === '/api/media' && method === 'DELETE') { access.requirePermission(actor,'media.delete'); const { url: media } = await parse(req); if (!mediaOK(media) || !media.startsWith('/uploads/')) return json(res, 400, { error: 'Only uploaded media can be deleted.' }); if (db.properties.some(x => x.images.includes(media) || x.video === media)) return json(res, 409, { error: 'Remove this media from its property and save first.' }); await fs.rm(path.join(uploads, path.basename(media)), { force: true }); access.record(actor,'delete','media',media,media); await save(); return json(res, 200, { ok: true }) }
      return json(res, 404, { error: 'Not found.' })
    }
    const base = p.startsWith('/uploads/') ? uploads : path.join(root, 'dist'), relative = p.startsWith('/uploads/') ? p.slice(9) : p.slice(1)
    let file = path.resolve(base, relative || 'index.html')
    if (!file.startsWith(base + path.sep)) return json(res, 403, { error: 'Forbidden' })
    let data
    try { data = await fs.readFile(file) } catch { if (path.extname(p) || p.startsWith('/uploads/')) return json(res, 404, { error: 'File not found.' }); file = path.join(base, 'index.html'); data = await fs.readFile(file) }
    const contentType = mime[path.extname(file)] || 'application/octet-stream'
    if (req.headers.range && contentType.startsWith('video/')) {
      const match = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range)
      const start = match?.[1] ? Number(match[1]) : Math.max(0, data.length - Number(match?.[2] || 0))
      const end = match?.[1] && match?.[2] ? Math.min(Number(match[2]), data.length - 1) : data.length - 1
      if (!match || start > end || start >= data.length) { res.writeHead(416, { 'Content-Range': `bytes */${data.length}` }); return res.end() }
      res.writeHead(206, { 'Content-Type': contentType, 'Accept-Ranges': 'bytes', 'Content-Range': `bytes ${start}-${end}/${data.length}`, 'Content-Length': end - start + 1 }); return res.end(data.subarray(start, end + 1))
    }
    res.writeHead(200, { 'Content-Type': contentType, 'Content-Length': data.length, ...(contentType.startsWith('video/') ? { 'Accept-Ranges': 'bytes' } : {}) }); res.end(data)
  } catch (error) { json(res, error.status || 400, { error: error.status ? error.message : 'Unable to complete the request. Check your input and try again.' }) }
})
server.listen(Number(process.env.PORT || 3001), process.env.HOST || '127.0.0.1', () => console.log('Holidayzone running at http://localhost:' + server.address().port))
