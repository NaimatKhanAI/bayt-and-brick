import { useEffect, useState } from 'react'
import { api } from './shared'
import './team-admin.css'

const emptyUser = { name: '', username: '', password: '', roleId: '', active: true }
const emptyRole = { name: '', permissions: [] }
const format = value => value == null ? '?' : typeof value === 'object' ? JSON.stringify(value) : String(value)
export default function TeamAdmin({ tab, auth }) {
  const [users, setUsers] = useState([]), [roles, setRoles] = useState([]), [permissions, setPermissions] = useState({}), [activity, setActivity] = useState([])
  const [user, setUser] = useState(null), [role, setRole] = useState(null), [busy, setBusy] = useState(false), [loading, setLoading] = useState(true), [error, setError] = useState(''), [notice, setNotice] = useState('')
  const [query, setQuery] = useState(''), [actor, setActor] = useState(''), [action, setAction] = useState(''), [from, setFrom] = useState(''), [to, setTo] = useState('')
  async function load() {
    setError(''); setLoading(true)
    try {
      if (tab === 'users') setUsers(await api('/users'))
      if (tab === 'users' || tab === 'roles') { const data = await api('/roles'); setRoles(data.roles); setPermissions(data.permissions) }
      if (tab === 'activity') setActivity(await api('/activity'))
    } catch (e) { setError(e.message) } finally { setLoading(false) }
  }
  useEffect(() => { load(); setUser(null); setRole(null); setNotice('') }, [tab])
  async function save(e, entity, value) {
    e.preventDefault(); setBusy(true); setError(''); setNotice('')
    try { await api('/'+entity,{method:'POST',body:JSON.stringify(value)}); setUser(null); setRole(null); await load(); setNotice(entity === 'users' ? 'User saved. Previous sessions for this user have been signed out.' : 'Role saved. Assigned users must sign in again to load their permissions.') }
    catch(e) { setError(e.message) } finally { setBusy(false) }
  }
  async function removeRole(item) {
    if (!window.confirm('Delete role '+item.name+'? Assigned users must be moved to another role first.')) return
    setBusy(true); setError('')
    try { await api('/roles/'+item.id,{method:'DELETE'}); await load(); setNotice('Role deleted.') } catch(e) { setError(e.message) } finally { setBusy(false) }
  }
  const filtered = activity.filter(e => (!actor || e.actorId === actor) && (!action || e.action === action) && (!from || e.at.slice(0,10) >= from) && (!to || e.at.slice(0,10) <= to) && `${e.actor} ${e.label} ${e.entity}`.toLowerCase().includes(query.toLowerCase()))
  return <section className="team-admin">
    <div className="team-title"><div><h2>{tab === 'users' ? 'People & access' : tab === 'roles' ? 'Roles & permissions' : 'Activity history'}</h2><p>{tab === 'users' ? 'Create accounts, assign roles, reset passwords and deactivate access.' : tab === 'roles' ? 'Choose exactly what each role can do. Super admin keeps full access.' : 'Review who changed what, including the full record of deleted properties. Dates use UTC.'}</p></div><button className="btn btn-outline" disabled={busy||loading} onClick={load}>Refresh</button></div>
    {error&&<p className="error" role="alert">{error}</p>}{notice&&<p className="notice" role="status">{notice}</p>}
    {loading ? <p role="status">Loading?</p> : tab === 'users' ? <>
      <button className="btn" onClick={()=>setUser({...emptyUser,roleId:roles[0]?.id||''})}>Add user</button>
      {user&&<form className="team-form" onSubmit={e=>save(e,'users',user)}><h3>{user.id?'Edit user':'New user'}</h3><fieldset disabled={busy}><div className="team-fields"><label>Full name<input required maxLength={100} value={user.name} onChange={e=>setUser({...user,name:e.target.value})}/></label><label>Username<input required minLength={3} maxLength={80} autoComplete="off" value={user.username} onChange={e=>setUser({...user,username:e.target.value})}/></label><label>{user.id?'New password (leave blank to keep)':'Password'}<input type="password" autoComplete="new-password" required={!user.id} minLength={8} maxLength={200} value={user.password} onChange={e=>setUser({...user,password:e.target.value})}/></label><label>Role<select aria-label="Role" required value={user.roleId} onChange={e=>setUser({...user,roleId:e.target.value})}><option value="">Choose role</option>{roles.map(r=><option key={r.id} value={r.id}>{r.name}</option>)}</select></label><label>Status<select aria-label="Status" value={String(user.active)} onChange={e=>setUser({...user,active:e.target.value==='true'})}><option value="true">Active</option><option value="false">Inactive - block login</option></select></label></div><p className="muted">Users and roles management permissions grant administrative control. Assign them only to trusted people.</p><div className="team-actions"><button className="btn">Save user</button><button type="button" className="btn btn-outline" onClick={()=>setUser(null)}>Cancel</button></div></fieldset></form>}
      <div className="team-table-wrap"><table><thead><tr><th>User</th><th>Username</th><th>Role</th><th>Status</th><th>Manage</th></tr></thead><tbody>{users.map(u=><tr key={u.id}><td>{u.name}</td><td>{u.username}</td><td>{u.id==='owner'?'Super admin':roles.find(r=>r.id===u.roleId)?.name||'No role'}</td><td><span className={'team-status '+(!u.active?'inactive':'')}>{u.active?'Active':'Inactive'}</span></td><td>{u.id==='owner'?<small>Protected account</small>:u.id===auth.id?<small>Your account</small>:<button className="btn btn-outline" disabled={busy} onClick={()=>setUser({...u,password:''})}>Edit access</button>}</td></tr>)}</tbody></table></div>
    </> : tab === 'roles' ? <>
      <button className="btn" onClick={()=>setRole({...emptyRole})}>Create role</button>
      {role&&<form className="team-form" onSubmit={e=>save(e,'roles',role)}><h3>{role.id?'Edit role':'New role'}</h3><fieldset disabled={busy}><label>Role name<input required maxLength={80} value={role.name} onChange={e=>setRole({...role,name:e.target.value})}/></label><div className="permission-grid">{Object.entries(permissions).map(([key,label])=><label key={key}><input type="checkbox" checked={role.permissions.includes(key)} onChange={e=>setRole({...role,permissions:e.target.checked?[...role.permissions,key]:role.permissions.filter(p=>p!==key)})}/><span>{label}</span></label>)}</div><div className="team-actions"><button className="btn">Save role</button><button type="button" className="btn btn-outline" onClick={()=>setRole(null)}>Cancel</button></div></fieldset></form>}
      <div className="role-grid">{roles.map(r=><article key={r.id}><h3>{r.name}</h3><ul>{r.permissions.length?r.permissions.map(p=><li key={p}>{permissions[p]}</li>):<li>View public properties only</li>}</ul><div className="team-actions"><button className="btn btn-outline" disabled={busy} onClick={()=>setRole({...r,permissions:[...r.permissions]})}>Edit role</button><button className="text-link" disabled={busy} onClick={()=>removeRole(r)}>Delete role</button></div></article>)}</div>
    </> : <>
      <div className="activity-filters"><label>Search<input placeholder="Property, user or record" value={query} onChange={e=>setQuery(e.target.value)}/></label><label>User<select value={actor} onChange={e=>setActor(e.target.value)}><option value="">All users</option>{[...new Map(activity.map(e=>[e.actorId,e.actor])).entries()].map(([id,name])=><option key={id} value={id}>{name}</option>)}</select></label><label>Action<select value={action} onChange={e=>setAction(e.target.value)}><option value="">All actions</option>{['create','update','delete','upload','login'].map(a=><option key={a}>{a}</option>)}</select></label><label>From<input type="date" value={from} onChange={e=>setFrom(e.target.value)}/></label><label>To<input type="date" min={from} value={to} onChange={e=>setTo(e.target.value)}/></label></div>
      {from&&to&&from>to&&<p className="error" role="alert">From date must not be after To date.</p>}
      <p role="status">{filtered.length} events</p><div className="activity-list">{filtered.map(e=><article key={e.id}><div><strong>{e.actor}</strong><span className={'team-status '+(e.action==='delete'?'inactive':'')}>{e.action}</span><time dateTime={e.at}>{new Date(e.at).toLocaleString()}</time></div><p>{e.entity}: {e.label}</p>{(e.before||e.after)&&<details><summary>View recorded changes</summary><div className="team-table-wrap"><table><thead><tr><th>Field</th><th>Before</th><th>After</th></tr></thead><tbody>{[...new Set([...Object.keys(e.before||{}),...Object.keys(e.after||{})])].filter(k=>JSON.stringify(e.before?.[k])!==JSON.stringify(e.after?.[k])).map(k=><tr key={k}><th>{k}</th><td>{format(e.before?.[k])}</td><td>{format(e.after?.[k])}</td></tr>)}</tbody></table></div></details>}</article>)}{!filtered.length&&<div className="empty"><h3>No matching activity</h3><p>Try another filter. Changes made before activity tracking was enabled are not recorded.</p></div>}</div>
    </>}
  </section>
}
