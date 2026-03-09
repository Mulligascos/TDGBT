import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { formatName } from '../utils';
import { X } from 'lucide-react';

// ─── HOOK ─────────────────────────────────────────────────────────────────────
// Call this in App.jsx — returns banners to show and a dismiss function
export const useAppBanners = (currentUser) => {
  const [banners, setBanners] = useState([]);

  const load = useCallback(async () => {
    if (!currentUser?.id) return;

    // Get all banners for this player (targeted or all-members)
    const { data: allBanners } = await supabase
      .from('app_banners')
      .select('*')
      .order('sent_at', { ascending: false });

    if (!allBanners?.length) return;

    // Filter to ones this player is a recipient of
    const mine = allBanners.filter(b =>
      b.all_members || (b.recipient_ids || []).includes(currentUser.id)
    );
    if (!mine.length) return;

    // Get this player's dismissals
    const { data: dismissals } = await supabase
      .from('app_banner_dismissals')
      .select('banner_id')
      .eq('player_id', currentUser.id);

    const dismissed = new Set((dismissals || []).map(d => d.banner_id));
    const visible = mine.filter(b => !dismissed.has(b.id));
    setBanners(visible);
  }, [currentUser?.id]);

  useEffect(() => { load(); }, [load]);

  const dismiss = useCallback(async (bannerId) => {
    setBanners(prev => prev.filter(b => b.id !== bannerId));
    await supabase.from('app_banner_dismissals').upsert(
      { banner_id: bannerId, player_id: currentUser.id },
      { onConflict: 'banner_id,player_id' }
    );
  }, [currentUser?.id]);

  return { banners, dismiss };
};

// ─── BANNER UI ────────────────────────────────────────────────────────────────
export const AppBanner = ({ banner, onDismiss }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Slight delay so it animates in
    const t = setTimeout(() => setVisible(true), 100);
    return () => clearTimeout(t);
  }, []);

  const handleDismiss = () => {
    setVisible(false);
    setTimeout(() => onDismiss(banner.id), 300);
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 300,
      transform: visible ? 'translateY(0)' : 'translateY(-110%)',
      transition: 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
    }}>
      <div style={{
        margin: '10px 12px 0',
        background: 'linear-gradient(135deg, #1a3a1a, #0f2a0f)',
        border: '1px solid rgba(74,222,128,0.3)',
        borderRadius: 16,
        padding: '14px 14px 14px 16px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
        display: 'flex', gap: 12, alignItems: 'flex-start',
      }}>
        <div style={{ fontSize: 24, flexShrink: 0, marginTop: 1 }}>📣</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: '#ffffff', fontFamily: "'Syne', sans-serif", marginBottom: 3 }}>
            {banner.title}
          </div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)', lineHeight: 1.45 }}>
            {banner.body}
          </div>
        </div>
        <button
          onClick={handleDismiss}
          style={{
            flexShrink: 0, width: 28, height: 28, borderRadius: 8,
            background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', color: 'rgba(255,255,255,0.7)',
          }}
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
};

// ─── STACKED BANNERS ──────────────────────────────────────────────────────────
// Shows multiple banners stacked — most recent on top
export const AppBanners = ({ banners, onDismiss }) => {
  if (!banners?.length) return null;
  // Show only the most recent one at a time
  return <AppBanner key={banners[0].id} banner={banners[0]} onDismiss={onDismiss} />;
};
