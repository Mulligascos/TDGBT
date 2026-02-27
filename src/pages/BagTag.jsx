import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase.js'
import { useAuth } from '../AuthContext.jsx'
import { useToast, ToastContainer } from '../hooks/useToast.jsx'
import './BagTag.css'

const DIVISIONS = ['All', 'Mixed', 'Female', 'Junior', 'Senior']

export default function BagTag() {
  const { session, profile } = useAuth()
  const [tab, setTab] = useState('leaderboard')

  return (
    <div className="bagtag-page">
      <div className="page-header">
        <h1 className="page-title">BAG TAGS</h1>
        <p className="page-subtitle">Challenge rankings — tag #1 is the goal</p>
      </div>

      <div className="tab-bar">
        {[['leaderboard', '🏆 Leaderboard'], ['challenge', '⚔️ Record Challenge'], ['history', '📋 History']].map(([key, label]) => (
          <button key={key} className={`tab-btn ${tab === key ? 'active' : ''}`} onClick={() => setTab(key)}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'leaderboard' && <BagTagLeaderboard currentUserId={session.user.id} />}
      {tab === 'challenge' && <BagTagChallenge currentUserId={session.user.id} profile={profile} onDone={() => setTab('leaderboard')} />}
      {tab === 'history' && <BagTagHistory />}
    </div>
  )
}

/* ── Leaderboard ── */
function BagTagLeaderboard({ currentUserId }) {
  const [players, setPlayers] = useState([])
  const [loading, setLoading] = useState(true)
  const [division, setDivision] = useState('All')
  const [lastUpdated, setLastUpdated] = useState(null)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => { fetchPlayers() }, [])

  async function fetchPlayers(isRefresh = false) {
    if (isRefresh) setRefreshing(true); else setLoading(true)
    const { data } = await supabase.from('players').select('*').eq('player_status', 'Active').order('bag_tag', { ascending: true })
    setPlayers(data || [])
    setLastUpdated(new Date())
    setLoading(false); setRefreshing(false)
  }

  const filtered = division === 'All' ? players : players.filter(p => p.player_division === division)
  const byDiv = DIVISIONS.filter(d => d !== 'All').reduce((acc, d) => {
    const dp = players.filter(p => p.player_division === d)
    if (dp.length) acc[d] = dp
    return acc
  }, {})

  return (
    <div>
      <div className="lb-toolbar">
        <div className="filter-bar" style={{ flex: 1 }}>
          {DIVISIONS.map(d => <button key={d} className={`filter-chip ${division === d ? 'active' : ''}`} onClick={() => setDivision(d)}>{d}</button>)}
        </div>
        <div className="refresh-area">
          {lastUpdated && <span className="last-updated">Updated {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>}
          <button className="btn btn-secondary btn-sm" onClick={() => fetchPlayers(true)} disabled={refreshing}>
            <span style={{ display: 'inline-block', animation: refreshing ? 'spin .7s linear infinite' : 'none' }}>↻</span>
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      {loading ? <div className="loading"><div className="spinner" /></div> :
        division === 'All' ? (
          <div className="div-grid">
            {Object.entries(byDiv).map(([div, dp]) => (
              <div key={div} className="card">
                <div className="div-header"><span className="div-title">{div}</span><span className="div-count">{dp.length}</span></div>
                <RankTable players={dp} currentUserId={currentUserId} />
              </div>
            ))}
          </div>
        ) : (
          <div className="card">
            <RankTable players={filtered} currentUserId={currentUserId} />
          </div>
        )
      }
    </div>
  )
}

function RankTable({ players, currentUserId }) {
  if (!players.length) return <div className="empty-state"><div className="empty-icon">🥏</div><div className="empty-title">NO PLAYERS</div></div>
  return (
    <table>
      <thead><tr><th>Tag</th><th>Player</th><th>Division</th></tr></thead>
      <tbody>
        {players.map((p, i) => (
          <tr key={p.player_id} className={p.player_id === currentUserId ? 'row-me' : ''}>
            <td>
              <span className={`tag-badge ${p.bag_tag === 1 ? 'tag-gold' : p.bag_tag === 2 ? 'tag-silver' : p.bag_tag === 3 ? 'tag-bronze' : ''}`}>
                {p.bag_tag === 1 && '👑 '}#{p.bag_tag}
              </span>
            </td>
            <td style={{ fontWeight: 500 }}>{p.player_name}{p.player_id === currentUserId ? ' ← you' : ''}</td>
            <td><span className={`badge badge-${p.player_division === 'Female' ? 'orange' : p.player_division === 'Junior' ? 'green' : p.player_division === 'Senior' ? 'yellow' : 'blue'}`}>{p.player_division}</span></td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

/* ── Challenge ── */
function BagTagChallenge({ currentUserId, profile, onDone }) {
  const { toasts, addToast } = useToast()
  const [players, setPlayers] = useState([])
  const [saving, setSaving] = useState(false)
  const [challengeType, setChallengeType] = useState('Direct')
  const [challengeDate, setChallengeDate] = useState(new Date().toISOString().slice(0, 16))
  const [notes, setNotes] = useState('')
  const [challenger, setChallenger] = useState(currentUserId)
  const [challenged, setChallenged] = useState('')
  const [winner, setWinner] = useState('')
  const [groupParticipants, setGroupParticipants] = useState([{ player_id: currentUserId, finish_position: 1 }])

  useEffect(() => {
    supabase.from('players').select('*').eq('player_status', 'Active').order('bag_tag', { ascending: true, nullsLast: true })
      .then(({ data }) => setPlayers(data || []))
  }, [])

  function getPlayer(id) { return players.find(p => p.player_id === id) }

  async function handleSubmit() {
    if (challengeType === 'Direct') {
      if (!challenger || !challenged) return addToast('Select both players', 'error')
      if (challenger === challenged) return addToast('Players must be different', 'error')
      if (!winner) return addToast('Select the winner', 'error')
    } else {
      const valid = groupParticipants.filter(p => p.player_id)
      if (valid.length < 2) return addToast('Need at least 2 participants', 'error')
    }
    setSaving(true)
    try {
      const { data: challenge, error: cErr } = await supabase.from('challenges').insert({
        challenge_type: challengeType, challenge_date: challengeDate, division: 'Mixed', notes: notes || null
      }).select().single()
      if (cErr) throw cErr
      if (challengeType === 'Direct') await doDirectChallenge(challenge.challenge_id)
      else await doGroupChallenge(challenge.challenge_id)
      addToast('Challenge recorded!', 'success')
      setTimeout(onDone, 1000)
    } catch (err) { addToast(err.message, 'error') }
    setSaving(false)
  }

  async function doDirectChallenge(cid) {
    const p1 = getPlayer(challenger), p2 = getPlayer(challenged)
    const winP = getPlayer(winner), loseP = winner === challenger ? p2 : p1
    const lo = Math.min(p1.bag_tag, p2.bag_tag), hi = Math.max(p1.bag_tag, p2.bag_tag)
    const { error: pErr } = await supabase.from('challenge_participants').insert([
      { challenge_id: cid, player_id: winP.player_id, bag_tag_before: winP.bag_tag, bag_tag_after: lo, finish_position: 1 },
      { challenge_id: cid, player_id: loseP.player_id, bag_tag_before: loseP.bag_tag, bag_tag_after: hi, finish_position: 2 }
    ])
    if (pErr) throw pErr
    if (winP.bag_tag !== lo) { const { error: e } = await supabase.from('players').update({ bag_tag: 999999 }).eq('player_id', winP.player_id); if (e) throw e }
    const { error: e2 } = await supabase.from('players').update({ bag_tag: hi }).eq('player_id', loseP.player_id); if (e2) throw e2
    const { error: e3 } = await supabase.from('players').update({ bag_tag: lo }).eq('player_id', winP.player_id); if (e3) throw e3
  }

  async function doGroupChallenge(cid) {
    const valid = groupParticipants.filter(p => p.player_id).sort((a, b) => a.finish_position - b.finish_position)
    const pp = valid.map(p => getPlayer(p.player_id)).filter(Boolean)
    const tags = pp.map(p => p.bag_tag).filter(t => t != null).sort((a, b) => a - b)
    const { error: pErr } = await supabase.from('challenge_participants').insert(valid.map((p, i) => {
      const pd = getPlayer(p.player_id)
      return { challenge_id: cid, player_id: p.player_id, bag_tag_before: pd.bag_tag, bag_tag_after: tags[i] ?? pd.bag_tag, finish_position: p.finish_position }
    }))
    if (pErr) throw pErr
    for (let i = 0; i < valid.length; i++) {
      const { error: te } = await supabase.from('players').update({ bag_tag: 999000 + i }).eq('player_id', valid[i].player_id)
      if (te) throw te
    }
    for (let i = 0; i < valid.length; i++) {
      if (tags[i] != null) { const { error: ue } = await supabase.from('players').update({ bag_tag: tags[i] }).eq('player_id', valid[i].player_id); if (ue) throw ue }
    }
  }

  const cp = getPlayer(challenger), dp = getPlayer(challenged)

  return (
    <div className="challenge-layout">
      <div className="card">
        <div className="section-label">DETAILS</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="type-toggle">
            <button className={`type-btn ${challengeType === 'Direct' ? 'active' : ''}`} onClick={() => setChallengeType('Direct')}>⚔️ Direct (1v1)</button>
            <button className={`type-btn ${challengeType === 'Group' ? 'active' : ''}`} onClick={() => setChallengeType('Group')}>🏆 Group</button>
          </div>
          <div className="form-group"><label className="form-label">Date & Time</label>
            <input className="form-input" type="datetime-local" value={challengeDate} onChange={e => setChallengeDate(e.target.value)} />
          </div>
          <div className="form-group"><label className="form-label">Notes (optional)</label>
            <textarea className="form-textarea" rows={2} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Course, event..." style={{ minHeight: 60 }} />
          </div>
        </div>
      </div>

      <div className="card">
        {challengeType === 'Direct' ? (
          <div>
            <div className="section-label">HEAD-TO-HEAD</div>
            <div className="vs-row">
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">Challenger</label>
                <select className="form-select" value={challenger} onChange={e => { setChallenger(e.target.value); setWinner('') }}>
                  <option value="">Select...</option>
                  {players.map(p => <option key={p.player_id} value={p.player_id} disabled={p.player_id === challenged}>#{p.bag_tag} — {p.player_name}</option>)}
                </select>
                {cp && <div className="hint-text">Current tag: #{cp.bag_tag}</div>}
              </div>
              <div className="vs-label">VS</div>
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">Being Challenged</label>
                <select className="form-select" value={challenged} onChange={e => { setChallenged(e.target.value); setWinner('') }}>
                  <option value="">Select...</option>
                  {players.map(p => <option key={p.player_id} value={p.player_id} disabled={p.player_id === challenger}>#{p.bag_tag} — {p.player_name}</option>)}
                </select>
                {dp && <div className="hint-text">Current tag: #{dp.bag_tag}</div>}
              </div>
            </div>
            {cp && dp && (
              <div style={{ marginTop: 16 }}>
                <label className="form-label">Who Won?</label>
                <div className="winner-row">
                  <button className={`winner-btn ${winner === challenger ? 'selected' : ''}`} onClick={() => setWinner(challenger)}>🏆 {cp.player_name}</button>
                  <button className={`winner-btn ${winner === challenged ? 'selected' : ''}`} onClick={() => setWinner(challenged)}>🏆 {dp.player_name}</button>
                </div>
                {winner && (
                  <div className="result-preview">
                    <div className="result-row"><span>{cp.player_name}</span><strong className={winner === challenger ? 'tag-win' : 'tag-lose'}>#{cp.bag_tag} → #{winner === challenger ? Math.min(cp.bag_tag, dp.bag_tag) : Math.max(cp.bag_tag, dp.bag_tag)}</strong></div>
                    <div className="result-row"><span>{dp.player_name}</span><strong className={winner === challenged ? 'tag-win' : 'tag-lose'}>#{dp.bag_tag} → #{winner === challenged ? Math.min(cp.bag_tag, dp.bag_tag) : Math.max(cp.bag_tag, dp.bag_tag)}</strong></div>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div>
            <div className="section-label">GROUP RESULTS</div>
            <p className="hint-text" style={{ marginBottom: 12 }}>Enter players in finishing order. 1st place gets the lowest tag.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {groupParticipants.map((p, idx) => (
                <div key={idx} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <div className="pos-pill">{p.finish_position}</div>
                  <select className="form-select" style={{ flex: 1 }} value={p.player_id} onChange={e => setGroupParticipants(prev => prev.map((x, i) => i === idx ? { ...x, player_id: e.target.value } : x))}>
                    <option value="">Select player...</option>
                    {players.map(pl => <option key={pl.player_id} value={pl.player_id} disabled={groupParticipants.some((x, i) => i !== idx && x.player_id === pl.player_id)}>#{pl.bag_tag} — {pl.player_name}</option>)}
                  </select>
                  <button className="btn-icon btn-sm" onClick={() => { const up = (idx) => { const a = [...groupParticipants]; [a[idx], a[idx - 1]] = [a[idx - 1], a[idx]]; setGroupParticipants(a.map((x, i) => ({ ...x, finish_position: i + 1 }))) }; if (idx > 0) up(idx) }} disabled={idx === 0} style={{ padding: '4px 8px', fontSize: 13 }}>↑</button>
                  <button className="btn-icon btn-sm" onClick={() => { const dn = (idx) => { const a = [...groupParticipants]; [a[idx], a[idx + 1]] = [a[idx + 1], a[idx]]; setGroupParticipants(a.map((x, i) => ({ ...x, finish_position: i + 1 }))) }; if (idx < groupParticipants.length - 1) dn(idx) }} disabled={idx === groupParticipants.length - 1} style={{ padding: '4px 8px', fontSize: 13 }}>↓</button>
                  <button className="btn-icon" onClick={() => setGroupParticipants(prev => prev.filter((_, i) => i !== idx).map((x, i) => ({ ...x, finish_position: i + 1 })))} disabled={groupParticipants.length <= 2} style={{ padding: '4px 8px', color: 'var(--danger)' }}>×</button>
                </div>
              ))}
            </div>
            <button className="btn btn-secondary btn-sm" style={{ marginTop: 10 }} onClick={() => setGroupParticipants(prev => [...prev, { player_id: '', finish_position: prev.length + 1 }])}>+ Add Player</button>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={saving}>{saving ? 'Recording...' : '🏁 Record Result'}</button>
        </div>
      </div>
      <ToastContainer toasts={toasts} />
    </div>
  )
}

/* ── History ── */
function BagTagHistory() {
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('bag_tag_history').select('*, players(player_name, player_division)').order('changed_at', { ascending: false }).limit(100)
      .then(({ data }) => { setHistory(data || []); setLoading(false) })
  }, [])

  if (loading) return <div className="loading"><div className="spinner" /></div>
  if (!history.length) return <div className="empty-state"><div className="empty-icon">📋</div><div className="empty-title">NO HISTORY YET</div></div>

  return (
    <div className="card table-wrap">
      <table>
        <thead><tr><th>Date</th><th>Player</th><th>Change</th></tr></thead>
        <tbody>
          {history.map(h => {
            const improved = h.new_tag < h.old_tag
            return (
              <tr key={h.id}>
                <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-muted)' }}>{new Date(h.changed_at).toLocaleDateString()}</td>
                <td style={{ fontWeight: 500 }}>{h.players?.player_name}</td>
                <td>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, display: 'flex', gap: 6, alignItems: 'center' }}>
                    <span style={{ color: 'var(--text-muted)' }}>#{h.old_tag}</span>
                    <span style={{ color: 'var(--text-dim)' }}>→</span>
                    <span style={{ color: improved ? 'var(--accent)' : 'var(--danger)', fontWeight: 700 }}>#{h.new_tag}</span>
                    {improved ? <span style={{ fontSize: 11, color: 'var(--accent)', background: 'var(--accent-dim)', padding: '1px 6px', borderRadius: 4 }}>▲{h.old_tag - h.new_tag}</span>
                              : <span style={{ fontSize: 11, color: 'var(--danger)', background: 'rgba(248,113,113,.1)', padding: '1px 6px', borderRadius: 4 }}>▼{h.new_tag - h.old_tag}</span>}
                  </span>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
