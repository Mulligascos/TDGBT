import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase.js'
import { useAuth } from '../AuthContext.jsx'
import { useToast, ToastContainer } from '../hooks/useToast.jsx'
import { format, isFuture, isPast } from 'date-fns'
import './Events.css'

const EVENT_TYPES = ['Tournament', 'Social Round', 'League', 'Clinic', 'Meeting', 'Other']
const emptyEvent = { title: '', description: '', event_date: '', location: '', event_type: 'Social Round', max_registrations: '' }

export default function Events() {
  const { isAdmin, session } = useAuth()
  const { toasts, addToast } = useToast()
  const [events, setEvents] = useState([])
  const [registrations, setRegistrations] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editEvent, setEditEvent] = useState(null)
  const [form, setForm] = useState(emptyEvent)
  const [saving, setSaving] = useState(false)
  const [filter, setFilter] = useState('upcoming')

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    const [{ data: evs }, { data: regs }] = await Promise.all([
      supabase.from('events').select('*').order('event_date', { ascending: true }),
      supabase.from('event_registrations').select('*').eq('member_id', session.user.id)
    ])
    setEvents(evs || [])
    setRegistrations(regs || [])
    setLoading(false)
  }

  const isRegistered = (eventId) => registrations.some(r => r.event_id === eventId)

  async function toggleRegistration(event) {
    if (isRegistered(event.id)) {
      await supabase.from('event_registrations').delete().eq('event_id', event.id).eq('member_id', session.user.id)
      addToast('Removed from event', 'info')
    } else {
      await supabase.from('event_registrations').insert({ event_id: event.id, member_id: session.user.id })
      addToast("You're registered!", 'success')
    }
    fetchAll()
  }

  function openCreate() { setEditEvent(null); setForm(emptyEvent); setShowModal(true) }
  function openEdit(e) {
    setEditEvent(e)
    setForm({ title: e.title, description: e.description || '', event_date: e.event_date?.slice(0, 16), location: e.location || '', event_type: e.event_type, max_registrations: e.max_registrations || '' })
    setShowModal(true)
  }

  async function handleSave() {
    if (!form.title.trim() || !form.event_date) return addToast('Title and date required', 'error')
    setSaving(true)
    const payload = { ...form, max_registrations: form.max_registrations ? parseInt(form.max_registrations) : null }
    const { error } = editEvent
      ? await supabase.from('events').update(payload).eq('id', editEvent.id)
      : await supabase.from('events').insert(payload)
    setSaving(false)
    if (error) addToast(error.message, 'error')
    else { addToast(editEvent ? 'Event updated!' : 'Event created!', 'success'); setShowModal(false); fetchAll() }
  }

  async function handleDelete(id) {
    if (!confirm('Delete this event?')) return
    await supabase.from('events').delete().eq('id', id)
    addToast('Event deleted', 'success'); fetchAll()
  }

  const filtered = events.filter(e => {
    const d = new Date(e.event_date)
    if (filter === 'upcoming') return isFuture(d)
    if (filter === 'past') return isPast(d)
    return true
  })

  return (
    <div className="events-page">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="page-title">EVENTS</h1>
          <p className="page-subtitle">Club calendar and registrations</p>
        </div>
        {isAdmin && <button className="btn btn-primary" onClick={openCreate}>+ Add Event</button>}
      </div>

      <div className="filter-bar">
        {['upcoming', 'past', 'all'].map(f => (
          <button key={f} className={`filter-chip ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {loading ? <div className="loading"><div className="spinner" /></div> :
       filtered.length === 0 ? (
        <div className="empty-state"><div className="empty-icon">📅</div><div className="empty-title">NO {filter.toUpperCase()} EVENTS</div></div>
      ) : (
        <div className="events-grid">
          {filtered.map((ev, i) => {
            const past = isPast(new Date(ev.event_date))
            const registered = isRegistered(ev.id)
            return (
              <div key={ev.id} className={`event-card fade-up ${past ? 'past' : ''}`} style={{ animationDelay: `${i * 40}ms` }}>
                <div className="event-card-header">
                  <div className="event-card-date">
                    <div className="ecd-day">{format(new Date(ev.event_date), 'dd')}</div>
                    <div className="ecd-month">{format(new Date(ev.event_date), 'MMM yyyy')}</div>
                  </div>
                  <span className={`badge badge-${ev.event_type === 'Tournament' ? 'yellow' : ev.event_type === 'League' ? 'orange' : ev.event_type === 'Clinic' ? 'blue' : 'green'}`}>
                    {ev.event_type}
                  </span>
                </div>
                <h3 className="event-card-title">{ev.title}</h3>
                {ev.description && <p className="event-card-desc">{ev.description}</p>}
                <div className="event-card-details">
                  {ev.location && <div className="ecd-detail">📍 {ev.location}</div>}
                  <div className="ecd-detail">🕐 {format(new Date(ev.event_date), 'EEEE, h:mm a')}</div>
                  {ev.max_registrations && <div className="ecd-detail">👥 Max {ev.max_registrations} players</div>}
                </div>
                <div className="event-card-footer">
                  {!past && (
                    <button
                      className={`btn btn-sm ${registered ? 'btn-danger' : 'btn-primary'}`}
                      onClick={() => toggleRegistration(ev)}
                    >
                      {registered ? '✕ Cancel RSVP' : '✓ RSVP'}
                    </button>
                  )}
                  {past && <span className="badge badge-muted">Past event</span>}
                  {isAdmin && (
                    <div style={{ display: 'flex', gap: 6, marginLeft: 'auto' }}>
                      <button className="btn btn-secondary btn-sm" onClick={() => openEdit(ev)}>Edit</button>
                      <button className="btn btn-danger btn-sm" onClick={() => handleDelete(ev.id)}>Delete</button>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal">
            <h2 className="modal-title">{editEvent ? 'EDIT EVENT' : 'NEW EVENT'}</h2>
            <div className="modal-fields">
              <div className="form-group">
                <label className="form-label">Title *</label>
                <input className="form-input" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Event name" />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Date & Time *</label>
                  <input className="form-input" type="datetime-local" value={form.event_date} onChange={e => setForm(f => ({ ...f, event_date: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Type</label>
                  <select className="form-select" value={form.event_type} onChange={e => setForm(f => ({ ...f, event_type: e.target.value }))}>
                    {EVENT_TYPES.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Location</label>
                  <input className="form-input" value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} placeholder="Course or venue" />
                </div>
                <div className="form-group">
                  <label className="form-label">Max Players</label>
                  <input className="form-input" type="number" value={form.max_registrations} onChange={e => setForm(f => ({ ...f, max_registrations: e.target.value }))} placeholder="Leave blank for unlimited" />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea className="form-textarea" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Event details..." rows={3} />
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : (editEvent ? 'Save Changes' : 'Create Event')}</button>
            </div>
          </div>
        </div>
      )}
      <ToastContainer toasts={toasts} />
    </div>
  )
}
