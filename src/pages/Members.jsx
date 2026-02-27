import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase.js'
import { useAuth } from '../AuthContext.jsx'
import { useToast, ToastContainer } from '../hooks/useToast.jsx'
import './Members.css'

export default function Members() {
  const { isAdmin, session, inviteMember } = useAuth()
  const [showInvite, setShowInvite] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteFullName, setInviteFullName] = useState('')
  const [inviting, setInviting] = useState(false)
  const { toasts, addToast } = useToast()
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('All')
  const [editMember, setEditMember] = useState(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => { fetchMembers() }, [])

  async function fetchMembers() {
    const { data } = await supabase.from('member_profiles').select('*').order('full_name')
    setMembers(data || [])
    setLoading(false)
  }

  async function handleStatusChange(member, status) {
    const { error } = await supabase.from('member_profiles').update({ membership_status: status }).eq('id', member.id)
    if (error) addToast(error.message, 'error')
    else { addToast(`${member.full_name} set to ${status}`, 'success'); fetchMembers() }
  }

  async function handleRoleChange(member, role) {
    const { error } = await supabase.from('member_profiles').update({ role }).eq('id', member.id)
    if (error) addToast(error.message, 'error')
    else { addToast(`${member.full_name} is now ${role}`, 'success'); fetchMembers() }
  }

  async function handleSaveEdit() {
    setSaving(true)
    const { error } = await supabase.from('member_profiles').update({
      full_name: editMember.full_name,
      phone: editMember.phone,
      division: editMember.division,
      membership_status: editMember.membership_status,
      bag_tag: editMember.bag_tag || null,
    }).eq('id', editMember.id)
    setSaving(false)
    if (error) addToast(error.message, 'error')
    else { addToast('Member updated!', 'success'); setEditMember(null); fetchMembers() }
  }

  const filtered = members
    .filter(m => filter === 'All' || m.membership_status === filter || m.division === filter)
    .filter(m => !search || m.full_name?.toLowerCase().includes(search.toLowerCase()) || m.email?.toLowerCase().includes(search.toLowerCase()))

  const initials = (name) => name ? name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : '?'

  return (
    <div className="members-page">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="page-title">MEMBERS</h1>
          <p className="page-subtitle">{members.filter(m => m.membership_status === 'Active').length} active · {members.length} total</p>
        </div>
        {isAdmin && (
          <button className="btn btn-primary" onClick={() => setShowInvite(true)}>+ Invite Member</button>
        )}
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
        <input className="form-input" style={{ maxWidth: 260 }} placeholder="Search members..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>
      <div className="filter-bar">
        {['All', 'Active', 'Inactive', 'Mixed', 'Female', 'Junior', 'Senior'].map(f => (
          <button key={f} className={`filter-chip ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>{f}</button>
        ))}
      </div>

      {loading ? <div className="loading"><div className="spinner" /></div> : (
        <div className="members-grid">
          {filtered.map((m, i) => (
            <div key={m.id} className="member-card fade-up" style={{ animationDelay: `${i * 30}ms` }}>
              <div className="member-card-top">
                {m.photo_url
                  ? <img src={m.photo_url} className="avatar avatar-md" alt="" />
                  : <div className="avatar avatar-md">{initials(m.full_name)}</div>
                }
                <div className="member-info">
                  <div className="member-name">{m.full_name || 'No name set'}</div>
                  <div className="member-email">{m.email}</div>
                  <div className="member-badges">
                    {m.division && <span className={`badge badge-${m.division === 'Female' ? 'orange' : m.division === 'Junior' ? 'green' : m.division === 'Senior' ? 'yellow' : 'blue'}`}>{m.division}</span>}
                    <span className={`badge ${m.membership_status === 'Active' ? 'badge-green' : 'badge-muted'}`}>{m.membership_status || 'Active'}</span>
                    {m.role === 'admin' && <span className="badge badge-yellow">★ Admin</span>}
                  </div>
                </div>
                {m.bag_tag && <div className="member-tag">#{m.bag_tag}</div>}
              </div>

              {m.bio && <p className="member-bio">{m.bio}</p>}

              <div className="member-details">
                {m.phone && <span className="member-detail">📞 {m.phone}</span>}
                {m.pdga_number && <span className="member-detail">PDGA #{m.pdga_number}</span>}
              </div>

              {isAdmin && m.id !== session.user.id && (
                <div className="member-admin-actions">
                  <button className="btn btn-secondary btn-sm" onClick={() => setEditMember({ ...m })}>Edit</button>
                  <button
                    className={`btn btn-sm ${m.membership_status === 'Active' ? 'btn-danger' : 'btn-primary'}`}
                    onClick={() => handleStatusChange(m, m.membership_status === 'Active' ? 'Inactive' : 'Active')}
                  >
                    {m.membership_status === 'Active' ? 'Deactivate' : 'Activate'}
                  </button>
                  {m.role !== 'admin'
                    ? <button className="btn btn-secondary btn-sm" onClick={() => handleRoleChange(m, 'admin')}>Make Admin</button>
                    : <button className="btn btn-danger btn-sm" onClick={() => handleRoleChange(m, 'member')}>Remove Admin</button>
                  }
                </div>
              )}
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="empty-state" style={{ gridColumn: '1/-1' }}>
              <div className="empty-icon">👥</div><div className="empty-title">NO MEMBERS FOUND</div>
            </div>
          )}
        </div>
      )}

      {editMember && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setEditMember(null)}>
          <div className="modal">
            <h2 className="modal-title">EDIT MEMBER</h2>
            <div className="modal-fields">
              <div className="form-group"><label className="form-label">Full Name</label>
                <input className="form-input" value={editMember.full_name || ''} onChange={e => setEditMember(m => ({ ...m, full_name: e.target.value }))} />
              </div>
              <div className="form-row">
                <div className="form-group"><label className="form-label">Phone</label>
                  <input className="form-input" value={editMember.phone || ''} onChange={e => setEditMember(m => ({ ...m, phone: e.target.value }))} />
                </div>
                <div className="form-group"><label className="form-label">Bag Tag #</label>
                  <input className="form-input" type="number" value={editMember.bag_tag || ''} onChange={e => setEditMember(m => ({ ...m, bag_tag: e.target.value }))} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group"><label className="form-label">Division</label>
                  <select className="form-select" value={editMember.division || 'Mixed'} onChange={e => setEditMember(m => ({ ...m, division: e.target.value }))}>
                    {['Mixed', 'Female', 'Junior', 'Senior'].map(d => <option key={d}>{d}</option>)}
                  </select>
                </div>
                <div className="form-group"><label className="form-label">Status</label>
                  <select className="form-select" value={editMember.membership_status || 'Active'} onChange={e => setEditMember(m => ({ ...m, membership_status: e.target.value }))}>
                    <option>Active</option><option>Inactive</option><option>Pending</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setEditMember(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSaveEdit} disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</button>
            </div>
          </div>
        </div>
      )}
      {showInvite && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowInvite(false)}>
          <div className="modal">
            <h2 className="modal-title">INVITE MEMBER</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 20 }}>
              An email will be sent to the new member with a link to set their password.
            </p>
            <div className="modal-fields">
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input
                  className="form-input"
                  value={inviteFullName}
                  onChange={e => setInviteFullName(e.target.value)}
                  placeholder="Member's full name"
                  autoFocus
                />
              </div>
              <div className="form-group">
                <label className="form-label">Email Address *</label>
                <input
                  className="form-input"
                  type="email"
                  value={inviteEmail}
                  onChange={e => setInviteEmail(e.target.value)}
                  placeholder="member@example.com"
                />
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => { setShowInvite(false); setInviteEmail(''); setInviteFullName('') }}>Cancel</button>
              <button className="btn btn-primary" disabled={inviting} onClick={async () => {
                if (!inviteEmail.trim()) return addToast('Email is required', 'error')
                setInviting(true)
                const { error } = await inviteMember(inviteEmail.trim().toLowerCase())
                if (error) {
                  addToast(error.message, 'error')
                } else {
                  // Pre-create the profile with their name if provided
                  if (inviteFullName.trim()) {
                    await supabase.from('member_profiles')
                      .update({ full_name: inviteFullName.trim() })
                      .eq('email', inviteEmail.trim().toLowerCase())
                  }
                  addToast(`Invite sent to ${inviteEmail}`, 'success')
                  setShowInvite(false)
                  setInviteEmail('')
                  setInviteFullName('')
                  fetchMembers()
                }
                setInviting(false)
              }}>
                {inviting ? 'Sending...' : '✉️ Send Invite'}
              </button>
            </div>
          </div>
        </div>
      )}

      <ToastContainer toasts={toasts} />
    </div>
  )
}
