import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'
import { permissions } from './src/permissions.js'
const id = () => randomBytes(12).toString('hex')
const fail = (message, status = 400) => { throw Object.assign(new Error(message), { status }) }
const publicUser = ({ salt, hash, ...user }) => user
const passwordHash = password => { const salt = id(); return { salt, hash: scryptSync(password, salt, 64).toString('hex') } }
export function accessControl(db, owner, sessions, save) {
  db.users ||= []
  db.roles ||= [
    { id: 'editor', name: 'Property editor', permissions: ['properties.create','properties.edit'] },
    { id: 'manager', name: 'Property manager', permissions: ['properties.create','properties.edit','media.delete','areas.manage','enquiries.view','audit.view'] },
    { id: 'viewer', name: 'Viewer', permissions: [] },
  ]
  // Deletion and visibility are owner-only, including existing custom roles.
  db.roles.forEach(role => { role.permissions = [...new Set(role.permissions.map(permission => permission === 'properties.delete' ? 'media.delete' : permission))] })
  db.activity ||= []
  function resolve(userId) {
    if (userId === 'owner') return { id: 'owner', username: owner.username || 'admin', name: 'Administrator', roleId: 'owner', roleName: 'Super admin', active: true, permissions: Object.keys(permissions) }
    const user = db.users.find(u => u.id === userId && u.active)
    if (!user) return null
    const role = db.roles.find(r => r.id === user.roleId)
    return { ...publicUser(user), roleName: role?.name || 'No role', permissions: role?.permissions || [] }
  }
  function requirePermission(actor, permission) { if (!actor?.permissions.includes(permission)) fail('Your role does not allow this action.', 403) }
  function record(actor, action, entity, entityId, label, before = null, after = null) {
    db.activity.unshift({ id: id(), at: new Date().toISOString(), actorId: actor.id, actor: actor.username, action, entity, entityId, label, before: before ? structuredClone(before) : null, after: after ? structuredClone(after) : null })
  }
  function invalidate(userId) { for (const [token, session] of sessions) if (session.userId === userId) sessions.delete(token) }
  function login(username, password) {
    const account = username === (owner.username || 'admin') ? { ...owner, id: 'owner' } : db.users.find(u => u.username.toLowerCase() === String(username).toLowerCase() && u.active)
    const salt = account?.salt || 'invalid-account', hash = scryptSync(typeof password === 'string' ? password.slice(0,200) : '', salt, 64)
    if (!account || !timingSafeEqual(hash, Buffer.from(account.hash, 'hex'))) return null
    return resolve(account.id)
  }
  async function handle(p, method, data, actor) {
    if (p === '/api/users' && method === 'GET') { requirePermission(actor,'users.manage'); return [200, [resolve('owner'), ...db.users.map(publicUser)]] }
    if (p === '/api/roles' && method === 'GET') { if (!actor.permissions.some(p => ['users.manage','roles.manage'].includes(p))) fail('Your role does not allow this action.',403); return [200, { roles: db.roles, permissions }] }
    if (p === '/api/activity' && method === 'GET') { requirePermission(actor,'audit.view'); return [200, db.activity] }
    if (p === '/api/users' && method === 'POST') {
      requirePermission(actor,'users.manage')
      if (data.id === 'owner' || data.id === actor.id) fail('Your own account and the super admin cannot be changed here.')
      const before = data.id ? db.users.find(u => u.id === data.id) : null
      if (data.id && !before) fail('User not found.',404)
      const username = String(data.username || '').trim(), name = String(data.name || '').trim().slice(0,100)
      if (!/^[a-zA-Z0-9_.@-]{3,80}$/.test(username) || !name || !db.roles.some(r => r.id === data.roleId)) fail('Enter a name, valid username and existing role.')
      if (username.toLowerCase() === (owner.username || 'admin').toLowerCase() || db.users.some(u => u.id !== data.id && u.username.toLowerCase() === username.toLowerCase())) fail('This username already exists.',409)
      if ((!before || data.password) && (typeof data.password !== 'string' || data.password.length < 8 || data.password.length > 200)) fail('Use a password between 8 and 200 characters.')
      const user = { ...(before || {}), id: before?.id || id(), username, name, roleId: data.roleId, active: data.active !== false, created: before?.created || new Date().toISOString(), ...(!before || data.password ? passwordHash(data.password) : {}) }
      db.users = [user, ...db.users.filter(u => u.id !== user.id)]
      invalidate(user.id)
      record(actor, before ? 'update' : 'create', 'user', user.id, username, before && publicUser(before), publicUser(user))
      await save(); return [200, publicUser(user)]
    }
    if (p === '/api/roles' && method === 'POST') {
      requirePermission(actor,'roles.manage')
      const before = data.id ? db.roles.find(r => r.id === data.id) : null
      if (data.id && !before) fail('Role not found.',404)
      const name = String(data.name || '').trim().slice(0,80)
      if (!name || !Array.isArray(data.permissions) || data.permissions.some(p => !Object.hasOwn(permissions,p))) fail('Enter a role name and valid permissions.')
      if (db.roles.some(r => r.id !== data.id && r.name.toLowerCase() === name.toLowerCase())) fail('This role name already exists.',409)
      const role = { id: before?.id || id(), name, permissions: [...new Set(data.permissions)] }
      db.roles = [role, ...db.roles.filter(r => r.id !== role.id)]
      db.users.filter(u => u.roleId === role.id).forEach(u => invalidate(u.id))
      record(actor,before ? 'update' : 'create','role',role.id,role.name,before,role)
      await save(); return [200, role]
    }
    if (p.startsWith('/api/roles/') && method === 'DELETE') {
      requirePermission(actor,'roles.manage')
      const role = db.roles.find(r => r.id === p.split('/').pop())
      if (!role) fail('Role not found.',404)
      if (db.users.some(u => u.roleId === role.id)) fail('Reassign every user in this role before deleting it.',409)
      db.roles = db.roles.filter(r => r.id !== role.id)
      record(actor,'delete','role',role.id,role.name,role); await save(); return [200, { ok: true }]
    }
    return null
  }
  return { resolve, requirePermission, record, login, handle }
}
