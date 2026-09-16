import { useState } from 'react'
import { MapPin, Trash2, Plus } from 'lucide-react'
import { api } from './shared'

export default function AreaAdmin({ areas, properties, reload }) {
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [notice, setNotice] = useState(''), [deleting, setDeleting] = useState(null)
  async function add(e) {
    e.preventDefault(); const form = e.currentTarget; setBusy(true); setError(''); setNotice('')
    try { await api('/areas', { method: 'POST', body: JSON.stringify(Object.fromEntries(new FormData(form))) }); await reload(); form.reset(); setNotice('Area added. It is now available in search and neighbourhoods.') }
    catch (e) { setError(e.message) } finally { setBusy(false) }
  }
  async function remove() {
    setBusy(true); setError(''); setNotice('')
    try { await api('/areas/' + deleting.id, { method: 'DELETE' }); await reload(); setNotice('Area removed.'); setDeleting(null) }
    catch (e) { setError(e.message); setDeleting(null) } finally { setBusy(false) }
  }
  return <section className="area-management"><h2>Manage neighbourhoods</h2><p>Add the areas where you offer homes. Move an area's properties before deleting it.</p>
    <form className="area-add-form" onSubmit={add}><label>Area name<input name="name" required maxLength={100} placeholder="e.g. Business Bay" /></label><label>Emirate<select name="emirate" required>{['Dubai','Sharjah','Abu Dhabi','Ajman','Ras Al Khaimah','Fujairah','Umm Al Quwain'].map(e=><option key={e}>{e}</option>)}</select></label><label>Short description<input name="note" maxLength={500} placeholder="What makes this neighbourhood special?" /></label><button className="btn" disabled={busy}><Plus size={16}/> Add area</button></form>
    {error&&<p className="error" role="alert">{error}</p>}{notice&&<p className="notice" role="status">{notice}</p>}
    <div className="managed-areas">{areas.map(a=>{const count=properties.filter(p=>p.area===a.name).length;return <article key={a.id}><MapPin/><div><h3>{a.name}</h3><p>{a.emirate} · {count} {count===1?'property':'properties'}</p></div><button className="delete-btn" disabled={busy||count>0} title={count?'Move properties to another area first':'Delete area'} aria-label={'Delete '+a.name} onClick={()=>setDeleting(a)}><Trash2 size={18}/></button></article>})}</div>
    {deleting&&<div className="modal-backdrop"><div className="confirm-box" role="dialog" aria-modal="true" aria-label="Delete area" onKeyDown={e=>{if(e.key==='Escape'&&!busy)setDeleting(null);if(e.key==='Tab'){e.preventDefault();const buttons=[...e.currentTarget.querySelectorAll('button')];buttons[(buttons.indexOf(document.activeElement)+1)%buttons.length]?.focus()}}}><h2>Delete {deleting.name}?</h2><p>This area will be removed from the website's neighbourhoods and filters.</p><div><button className="btn btn-outline" autoFocus disabled={busy} onClick={()=>setDeleting(null)}>Keep area</button><button className="btn danger" disabled={busy} onClick={remove}>Delete area</button></div></div></div>}
  </section>
}
