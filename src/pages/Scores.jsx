import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase.js'
import { useAuth } from '../AuthContext.jsx'
import { useToast, ToastContainer } from '../hooks/useToast.jsx'
import { format } from 'date-fns'
import './Scores.css'

const DEFAULT_HOLES = 18
const DEFAULT_PAR = 3

function buildHoles(count, par) {
  return Array.from({ length: count }, (_, i) => ({ hole: i + 1, par, score: '' }))
}

export default function Scores() {
  const { session, profile } = useAuth()
  const { toasts, addToast } = useToast()
  const [rounds, setRounds] = useState([])
  const [players, setPlayers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showScorecard, setShowScorecard] = useState(false)
  const [saving, setSaving] = useState(false)

  // Scorecard state
  const [holeCount, setHoleCount] = useState(18)
  const [courseName, setCourseName] = useState('')
  const [roundDate, setRoundDate] = useState(new Date().toISOString().slice(0, 10))
  const [roundNotes, setRoundNotes] = useState('')
  const [participants, setParticipants] = useState([
    { player_id: session.user.id, player_name: profile?.full_name || 'Me', holes: buildHoles(18, DEFAULT_PAR) }
  ])

  useEffect(() => { fetchData() }, [])

  async function fetchData() {
    const [{ data: r }, { data: p }] = await Promise.all([
      supabase.from('match_rounds').select(`*, match_scores(*, member_profiles(full_name))`).order('round_date', { ascending: false }).limit(20),
      supabase.from('member_profiles').select('id, full_name, bag_tag').eq('membership_status', 'Active').order('full_name')
    ])
    setRounds(r || [])
    setPlayers(p || [])
    setLoading(false)
  }

  function addPlayer(playerId) {
    const p = players.find(p => p.id === playerId)
    if (!p || participants.find(x => x.player_id === playerId)) return
    setParticipants(prev => [...prev, { player_id: playerId, player_name: p.full_name, holes: buildHoles(holeCount, DEFAULT_PAR) }])
  }

  function removePlayer(idx) {
    if (participants.length <= 1) return
    setParticipants(prev => prev.filter((_, i) => i !== idx))
  }

  function updateHole(playerIdx, holeIdx, field, value) {
    setParticipants(prev => prev.map((p, pi) => {
      if (pi !== playerIdx) return p
      const holes = p.holes.map((h, hi) => hi === holeIdx ? { ...h, [field]: value } : h)
      return { ...p, holes }
    }))
  }

  function updateHoleCount(n) {
    setHoleCount(n)
    setParticipants(prev => prev.map(p => ({ ...p, holes: buildHoles(n, DEFAULT_PAR) })))
  }

  function totalScore(holes) {
    return holes.reduce((sum, h) => sum + (parseInt(h.score) || 0), 0)
  }
  function totalPar(holes) {
    return holes.reduce((sum, h) => sum + (parseInt(h.par) || 0), 0)
  }
  function scoreToPar(holes) {
    const s = totalScore(holes), p = totalPar(holes)
    if (!s) return '—'
    const diff = s - p
    return diff === 0 ? 'E' : diff > 0 ? `+${diff}` : `${diff}`
  }

  async function handleSaveRound() {
    if (!courseName.trim()) return addToast('Course name required', 'error')
    const hasScores = participants.some(p => p.holes.some(h => h.score !== ''))
    if (!hasScores) return addToast('Enter at least one score', 'error')
    setSaving(true)
    try {
      const { data: round, error: rErr } = await supabase.from('match_rounds').insert({
        course_name: courseName,
        round_date: roundDate,
        holes: holeCount,
        notes: roundNotes || null,
        created_by: session.user.id,
      }).select().single()
      if (rErr) throw rErr

      await supabase.from('match_scores').insert(
        participants.map(p => ({
          round_id: round.id,
          player_id: p.player_id,
          total_score: totalScore(p.holes),
          total_par: totalPar(p.holes),
          hole_scores: p.holes,
        }))
      )
      addToast('Round saved!', 'success')
      setShowScorecard(false)
      fetchData()
    } catch (err) {
      addToast(err.message, 'error')
    }
    setSaving(false)
  }

  const availablePlayers = players.filter(p => !participants.find(x => x.player_id === p.id))

  return (
    <div className="scores-page">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="page-title">SCORES</h1>
          <p className="page-subtitle">Round scoring and history</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowScorecard(true)}>+ New Round</button>
      </div>

      {loading ? <div className="loading"><div className="spinner" /></div> :
       rounds.length === 0 ? (
        <div className="empty-state"><div className="empty-icon">🏌️</div><div className="empty-title">NO ROUNDS YET</div><p>Record your first round above.</p></div>
      ) : (
        <div className="rounds-list">
          {rounds.map((round, i) => {
            const scores = round.match_scores || []
            const sorted = [...scores].sort((a, b) => a.total_score - b.total_score)
            return (
              <div key={round.id} className="round-card fade-up" style={{ animationDelay: `${i * 40}ms` }}>
                <div className="round-header">
                  <div>
                    <div className="round-course">{round.course_name}</div>
                    <div className="round-date">{format(new Date(round.round_date), 'EEEE dd MMM yyyy')} · {round.holes} holes</div>
                  </div>
                  <div className="round-players">{scores.length} player{scores.length !== 1 ? 's' : ''}</div>
                </div>
                <div className="round-scores">
                  {sorted.map((s, si) => {
                    const diff = s.total_score - s.total_par
                    const isMe = s.player_id === session.user.id
                    return (
                      <div key={s.id} className={`score-row ${isMe ? 'score-me' : ''}`}>
                        <span className="score-pos">{si + 1}</span>
                        <span className="score-name">{s.member_profiles?.full_name || 'Unknown'}{isMe ? ' (me)' : ''}</span>
                        <span className={`score-val ${diff < 0 ? 'under' : diff > 0 ? 'over' : 'even'}`}>
                          {s.total_score} <span className="score-par">({diff === 0 ? 'E' : diff > 0 ? `+${diff}` : diff})</span>
                        </span>
                      </div>
                    )
                  })}
                </div>
                {round.notes && <div className="round-notes">💬 {round.notes}</div>}
              </div>
            )
          })}
        </div>
      )}

      {/* Scorecard modal */}
      {showScorecard && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowScorecard(false)}>
          <div className="modal scorecard-modal">
            <h2 className="modal-title">NEW ROUND</h2>
            <div className="sc-setup">
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Course *</label>
                  <input className="form-input" value={courseName} onChange={e => setCourseName(e.target.value)} placeholder="Course name" />
                </div>
                <div className="form-group">
                  <label className="form-label">Date</label>
                  <input className="form-input" type="date" value={roundDate} onChange={e => setRoundDate(e.target.value)} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Holes</label>
                  <select className="form-select" value={holeCount} onChange={e => updateHoleCount(parseInt(e.target.value))}>
                    <option value={9}>9 holes</option>
                    <option value={18}>18 holes</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Add Player</label>
                  <select className="form-select" value="" onChange={e => { addPlayer(e.target.value); e.target.value = '' }}>
                    <option value="">Select player to add...</option>
                    {availablePlayers.map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}
                  </select>
                </div>
              </div>
            </div>

            <div className="scorecard-wrap">
              <table className="scorecard-table">
                <thead>
                  <tr>
                    <th className="sc-hole">Hole</th>
                    <th className="sc-par">Par</th>
                    {participants.map((p, i) => (
                      <th key={i} className="sc-player">
                        <div className="sc-player-head">
                          {p.player_name}
                          {i > 0 && <button className="sc-remove" onClick={() => removePlayer(i)}>×</button>}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {participants[0].holes.map((hole, hi) => (
                    <tr key={hi}>
                      <td className="sc-hole-num">{hole.hole}</td>
                      <td>
                        <input
                          className="sc-input"
                          type="number"
                          min="1" max="9"
                          value={participants[0].holes[hi].par}
                          onChange={e => {
                            const val = e.target.value
                            setParticipants(prev => prev.map(p => ({ ...p, holes: p.holes.map((h, i) => i === hi ? { ...h, par: val } : h) })))
                          }}
                        />
                      </td>
                      {participants.map((p, pi) => {
                        const h = p.holes[hi]
                        const par = parseInt(participants[0].holes[hi].par) || DEFAULT_PAR
                        const score = parseInt(h.score)
                        const cls = h.score === '' ? '' : score < par - 1 ? 'eagle' : score === par - 1 ? 'birdie' : score === par ? 'par' : score === par + 1 ? 'bogey' : 'double'
                        return (
                          <td key={pi}>
                            <input
                              className={`sc-input sc-score ${cls}`}
                              type="number" min="1" max="15"
                              value={h.score}
                              onChange={e => updateHole(pi, hi, 'score', e.target.value)}
                            />
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                  <tr className="sc-total-row">
                    <td className="sc-hole-num">TOTAL</td>
                    <td className="sc-total">{totalPar(participants[0].holes)}</td>
                    {participants.map((p, i) => (
                      <td key={i} className="sc-total">
                        {totalScore(p.holes) || '—'}
                        {totalScore(p.holes) > 0 && <span className="sc-to-par"> ({scoreToPar(p.holes)})</span>}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="form-group" style={{ marginTop: 12 }}>
              <label className="form-label">Notes</label>
              <input className="form-input" value={roundNotes} onChange={e => setRoundNotes(e.target.value)} placeholder="Optional round notes" />
            </div>

            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setShowScorecard(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSaveRound} disabled={saving}>{saving ? 'Saving...' : '💾 Save Round'}</button>
            </div>
          </div>
        </div>
      )}

      <ToastContainer toasts={toasts} />
    </div>
  )
}
