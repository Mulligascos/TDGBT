import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase.js'
import { useAuth } from '../AuthContext.jsx'
import { useToast, ToastContainer } from '../hooks/useToast.jsx'
import { format } from 'date-fns'
import './News.css'

const CATEGORIES = ['General', 'Tournament', 'Announcement', 'Results', 'Social']

const emptyPost = { title: '', body: '', excerpt: '', category: 'General', cover_image: '', published: true }

export default function News() {
  const { isAdmin, session } = useAuth()
  const { toasts, addToast } = useToast()
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editPost, setEditPost] = useState(null)
  const [form, setForm] = useState(emptyPost)
  const [saving, setSaving] = useState(false)
  const [expanded, setExpanded] = useState(null)

  useEffect(() => { fetchPosts() }, [])

  async function fetchPosts() {
    const query = supabase.from('news_posts').select('*, member_profiles(full_name)').order('created_at', { ascending: false })
    if (!isAdmin) query.eq('published', true)
    const { data } = await query
    setPosts(data || [])
    setLoading(false)
  }

  function openCreate() { setEditPost(null); setForm(emptyPost); setShowModal(true) }
  function openEdit(p) { setEditPost(p); setForm({ title: p.title, body: p.body, excerpt: p.excerpt || '', category: p.category || 'General', cover_image: p.cover_image || '', published: p.published }); setShowModal(true) }

  async function handleSave() {
    if (!form.title.trim() || !form.body.trim()) return addToast('Title and body required', 'error')
    setSaving(true)
    const payload = { ...form, author_id: session.user.id }
    const { error } = editPost
      ? await supabase.from('news_posts').update(payload).eq('id', editPost.id)
      : await supabase.from('news_posts').insert(payload)
    setSaving(false)
    if (error) addToast(error.message, 'error')
    else { addToast(editPost ? 'Post updated!' : 'Post published!', 'success'); setShowModal(false); fetchPosts() }
  }

  async function handleDelete(id) {
    if (!confirm('Delete this post?')) return
    await supabase.from('news_posts').delete().eq('id', id)
    addToast('Post deleted', 'success'); fetchPosts()
  }

  return (
    <div className="news-page">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="page-title">CLUB NEWS</h1>
          <p className="page-subtitle">Latest updates from the club</p>
        </div>
        {isAdmin && <button className="btn btn-primary" onClick={openCreate}>+ New Post</button>}
      </div>

      {loading ? <div className="loading"><div className="spinner" /> Loading...</div> :
       posts.length === 0 ? (
        <div className="empty-state"><div className="empty-icon">📰</div><div className="empty-title">NO POSTS YET</div></div>
      ) : (
        <div className="news-grid">
          {posts.map((post, i) => (
            <article key={post.id} className={`news-article fade-up ${!post.published ? 'unpublished' : ''}`} style={{ animationDelay: `${i * 40}ms` }}>
              {post.cover_image && <img src={post.cover_image} className="article-img" alt="" />}
              <div className="article-body">
                <div className="article-meta">
                  <span className={`badge badge-${post.category === 'Tournament' ? 'yellow' : post.category === 'Announcement' ? 'blue' : post.category === 'Results' ? 'orange' : 'green'}`}>
                    {post.category}
                  </span>
                  {!post.published && <span className="badge badge-muted">Draft</span>}
                  <span className="article-date">{format(new Date(post.created_at), 'dd MMM yyyy')}</span>
                </div>
                <h2 className="article-title">{post.title}</h2>
                <div className={`article-content ${expanded === post.id ? 'expanded' : ''}`}>
                  <p>{post.body}</p>
                </div>
                <div className="article-footer">
                  <span className="article-author">By {post.member_profiles?.full_name || 'Admin'}</span>
                  <div className="article-actions">
                    <button className="btn btn-secondary btn-sm" onClick={() => setExpanded(expanded === post.id ? null : post.id)}>
                      {expanded === post.id ? 'Show less' : 'Read more'}
                    </button>
                    {isAdmin && <>
                      <button className="btn btn-secondary btn-sm" onClick={() => openEdit(post)}>Edit</button>
                      <button className="btn btn-danger btn-sm" onClick={() => handleDelete(post.id)}>Delete</button>
                    </>}
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal" style={{ maxWidth: 640 }}>
            <h2 className="modal-title">{editPost ? 'EDIT POST' : 'NEW POST'}</h2>
            <div className="modal-fields">
              <div className="form-group">
                <label className="form-label">Title *</label>
                <input className="form-input" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Post title" />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Category</label>
                  <select className="form-select" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                    {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Status</label>
                  <select className="form-select" value={form.published ? 'published' : 'draft'} onChange={e => setForm(f => ({ ...f, published: e.target.value === 'published' }))}>
                    <option value="published">Published</option>
                    <option value="draft">Draft</option>
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Cover Image URL (optional)</label>
                <input className="form-input" value={form.cover_image} onChange={e => setForm(f => ({ ...f, cover_image: e.target.value }))} placeholder="https://..." />
              </div>
              <div className="form-group">
                <label className="form-label">Body *</label>
                <textarea className="form-textarea" value={form.body} onChange={e => setForm(f => ({ ...f, body: e.target.value }))} placeholder="Write your post..." rows={6} />
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : (editPost ? 'Save Changes' : 'Publish')}</button>
            </div>
          </div>
        </div>
      )}
      <ToastContainer toasts={toasts} />
    </div>
  )
}
