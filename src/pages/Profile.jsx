import { useState, useRef } from 'react'
import { supabase } from '../lib/supabase.js'
import { useAuth } from '../AuthContext.jsx'
import { useToast, ToastContainer } from '../hooks/useToast.jsx'
import './Profile.css'

const DIVISIONS = ['Mixed', 'Female', 'Junior', 'Senior']

export default function Profile() {
  const { profile, session, fetchProfile } = useAuth()
  const { toasts, addToast } = useToast()
  const fileRef = useRef()
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [form, setForm] = useState({
    full_name: profile?.full_name || '',
    phone: profile?.phone || '',
    division: profile?.division || 'Mixed',
    bio: profile?.bio || '',
    emergency_contact: profile?.emergency_contact || '',
    pdga_number: profile?.pdga_number || '',
  })

  function set(field, val) { setForm(f => ({ ...f, [field]: val })) }

  async function handleSave() {
    setSaving(true)
    const { error } = await supabase.from('member_profiles').update({
      full_name: form.full_name,
      phone: form.phone,
      division: form.division,
      bio: form.bio,
      emergency_contact: form.emergency_contact,
      pdga_number: form.pdga_number,
    }).eq('id', session.user.id)
    setSaving(false)
    if (error) addToast(error.message, 'error')
    else { addToast('Profile saved!', 'success'); fetchProfile(session.user.id) }
  }

  async function handlePhotoUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) return addToast('Photo must be under 5MB', 'error')
    setUploading(true)
    const ext = file.name.split('.').pop()
    const path = `avatars/${session.user.id}.${ext}`
    const { error: upErr } = await supabase.storage.from('member-photos').upload(path, file, { upsert: true })
    if (upErr) { addToast(upErr.message, 'error'); setUploading(false); return }
    const { data } = supabase.storage.from('member-photos').getPublicUrl(path)
    const { error: dbErr } = await supabase.from('member_profiles').update({ photo_url: data.publicUrl }).eq('id', session.user.id)
    setUploading(false)
    if (dbErr) addToast(dbErr.message, 'error')
    else { addToast('Photo updated!', 'success'); fetchProfile(session.user.id) }
  }

  const initials = form.full_name ? form.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : '?'

  const memberSince = profile?.created_at ? new Date(profile.created_at).getFullYear() : '—'

  return (
    <div className="profile-page">
      <div className="page-header">
        <h1 className="page-title">MY PROFILE</h1>
        <p className="page-subtitle">Manage your member details</p>
      </div>

      <div className="profile-layout">
        {/* Left: photo + summary */}
        <div className="profile-sidebar">
          <div className="card profile-card">
            <div className="photo-wrap">
              {profile?.photo_url
                ? <img src={profile.photo_url} className="profile-photo" alt="" />
                : <div className="profile-photo profile-initials">{initials}</div>
              }
              <button className="photo-edit-btn" onClick={() => fileRef.current?.click()} disabled={uploading}>
                {uploading ? '⏳' : '📷'}
              </button>
              <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhotoUpload} />
            </div>
            <div className="profile-summary">
              <div className="profile-name">{profile?.full_name || 'Your Name'}</div>
              <div className="profile-email">{session?.user?.email}</div>
              <div className="profile-badges">
                {profile?.division && <span className={`badge badge-${profile.division === 'Female' ? 'orange' : profile.division === 'Junior' ? 'green' : profile.division === 'Senior' ? 'yellow' : 'blue'}`}>{profile.division}</span>}
                <span className={`badge ${profile?.membership_status === 'Active' ? 'badge-green' : 'badge-muted'}`}>
                  {profile?.membership_status || 'Active'}
                </span>
                {profile?.role === 'admin' && <span className="badge badge-yellow">★ Admin</span>}
              </div>
            </div>

            <div className="profile-stats">
              <div className="stat-row">
                <span className="stat-label">Bag Tag</span>
                <span className="stat-val">{profile?.bag_tag ? `#${profile.bag_tag}` : '—'}</span>
              </div>
              <div className="stat-row">
                <span className="stat-label">PDGA #</span>
                <span className="stat-val">{form.pdga_number || '—'}</span>
              </div>
              <div className="stat-row">
                <span className="stat-label">Member since</span>
                <span className="stat-val">{memberSince}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right: edit form */}
        <div className="profile-form">
          <div className="card">
            <h3 className="card-section-title">PERSONAL DETAILS</h3>
            <div className="modal-fields">
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Full Name</label>
                  <input className="form-input" value={form.full_name} onChange={e => set('full_name', e.target.value)} placeholder="Your full name" />
                </div>
                <div className="form-group">
                  <label className="form-label">Phone</label>
                  <input className="form-input" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+64 21 000 0000" />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Division</label>
                  <select className="form-select" value={form.division} onChange={e => set('division', e.target.value)}>
                    {DIVISIONS.map(d => <option key={d}>{d}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">PDGA Number</label>
                  <input className="form-input" value={form.pdga_number} onChange={e => set('pdga_number', e.target.value)} placeholder="Optional" />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Bio</label>
                <textarea className="form-textarea" value={form.bio} onChange={e => set('bio', e.target.value)} placeholder="Tell the club a bit about yourself..." rows={3} />
              </div>
              <div className="form-group">
                <label className="form-label">Emergency Contact</label>
                <input className="form-input" value={form.emergency_contact} onChange={e => set('emergency_contact', e.target.value)} placeholder="Name and phone number" />
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : '💾 Save Profile'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <ToastContainer toasts={toasts} />
    </div>
  )
}
