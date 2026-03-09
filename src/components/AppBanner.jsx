import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { formatName } from '../utils';
import { X } from 'lucide-react';

// ─── HOOK ─────────────────────────────────────────────────────────────────────
// Call this in App.jsx — returns banners to show and a dismiss function
export const useAppBanners = (currentUser) => {
  const [banners, setBanners] = useState([]);

  useEffect(() => {
    const playerId = currentUser?.id;
    if (!playerId) { setBanners([]); return; }

    let cancelled = false;

    const load = async () => {
      console.log('[Banner] loading for player:', playerId);

      const { data: allBanners, error } = await supabase
        .from('app_banners')
        .select('*')
        .order('sent_at', { ascending: false });

      console.log('[Banner] allBanners:', allBanners, 'error:', error);
      if (cancelled) return;
      if (error) { console.error('Banner fetch error:', error); return; }
      if (!allBanners?.length) { console.log('[Banner] no banners in DB'); setBanners([]); return; }

      const mine = allBanners.filter(b =>
        b.all_members === true || (b.recipient_ids || []).includes(playerId)
      );
      console.log('[Banner] mine:', mine, 'playerId:', playerId);
      if (!mine.length) { console.log('[Banner] none matched player'); setBanners([]); return; }

      const { data: dismissals } = await supabase
        .from('app_banner_dismissals')
        .select('banner_id')
        .eq('player_id', playerId);

      console.log('[Banner] dismissals:', dismissals);
      if (cancelled) return;
      const dismissed = new Set((dismissals || []).map(d => d.banner_id));
      const visible = mine.filter(b => !dismissed.has(b.id));
      console.log('[Banner] visible:', visible);
      setBanners(visible);
    };

    load();
    return () => { cancelled = true; };
  }, [currentUser?.id]);

  const dismiss = useCallback(async (bannerId) => {
    const playerId = currentUser?.id;
    if (!playerId) return;
    setBanners(prev => prev.filter(b => b.id !== bannerId));
    await supabase.from('app_banner_dismissals').upsert(
      { banner_id: bannerId, player_id: playerId },
      { onConflict: 'banner_id,player_id' }
    );
  }, [currentUser?.id]);

  return { banners, dismiss };
};

// ─── BANNER UI ────────────────────────────────────────────────────────────────
export const AppBanner = ({ banner, onDismiss }) => {
  const handleDismiss = () => onDismiss(banner.id);

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 300,
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
