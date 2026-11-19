import React, { useEffect, useRef, useState } from 'react';
import adsService, { AD_CONFIG } from '@/services/AdsService';

export const NATIVE_AD_EVERY = 6;

// One native ad feed per screen; only for male non-premium users on the Android/iOS app.
export const useNativeAdFeed = (feedId, user, enabled = true) => {
  const [feed, setFeed] = useState(null);
  const [failed, setFailed] = useState([]);
  const adUser = Boolean(user) && user.gender?.toLowerCase() === 'male' && !user.is_premium && !user.isPremium;

  useEffect(() => {
    if (!enabled || !adUser || !adsService.isNative()) return undefined;
    let active = true;
    let instance = null;
    (async () => {
      try {
        await adsService.initialize();
        const { NativeAdFeed, NativeAdTemplate, NativeAdPluginEvents } = await import('@capacitor-community/admob');
        instance = await NativeAdFeed.create({
          feedId,
          adId: AD_CONFIG.NATIVE_ID,
          template: NativeAdTemplate.Medium,
          isTesting: false,
          style: { backgroundColor: '#ffffff', cornerRadius: 16, headlineColor: '#111827', bodyColor: '#6b7280', callToActionBackgroundColor: '#D6336C', callToActionTextColor: '#ffffff' },
        });
        await instance.addListener(NativeAdPluginEvents.AdImpression, () => adsService._track('native'));
        await instance.addListener(NativeAdPluginEvents.FailedToLoad, (e) => setFailed(f => [...f, e.slotKey]));
        if (active) setFeed(instance); else instance.destroy();
      } catch (e) {
        console.log('NativeAdFeed unavailable:', e?.message);
      }
    })();
    return () => { active = false; if (instance) instance.destroy().catch(() => {}); setFeed(null); };
  }, [feedId, adUser, enabled]);

  return { feed, failed };
};

// Size comes from the measured container (CSS px == Android dp in the WebView; the plugin maps it to the native view)
const AD_ASPECT = 0.9; // height / width for the Medium template (media 16:9 + text + CTA)
const MIN_AD_HEIGHT = 250;

export const NativeAdCard = ({ feed, slotKey, failed, fill = false }) => {
  const wrapRef = useRef(null);
  const ref = useRef(null);
  const [height, setHeight] = useState(0);

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return undefined;
    const measure = () => {
      const r = wrap.getBoundingClientRect();
      const avail = fill ? (wrap.parentElement?.getBoundingClientRect().height || r.height) : Infinity;
      const h = Math.floor(Math.min(Math.max(r.width * AD_ASPECT, MIN_AD_HEIGHT), avail));
      setHeight(r.width > 0 && h > 0 ? h : 0);
    };
    measure();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null;
    ro?.observe(wrap);
    if (fill && wrap.parentElement) ro?.observe(wrap.parentElement);
    window.addEventListener('orientationchange', measure);
    window.addEventListener('resize', measure);
    return () => { ro?.disconnect(); window.removeEventListener('orientationchange', measure); window.removeEventListener('resize', measure); };
  }, [fill]);

  useEffect(() => {
    const el = ref.current;
    if (!feed || !el || !height) return undefined;
    feed.attach(slotKey, el);
    return () => { try { feed.detach(el); } catch (_) { /* feed destroyed */ } };
  }, [feed, slotKey, height]);

  if (!feed || failed.includes(slotKey)) return null;
  return (
    <div ref={wrapRef} className="col-span-2 w-full max-w-full bg-white rounded-2xl shadow-md overflow-hidden" data-testid={`native-ad-${slotKey}`}>
      <div ref={ref} style={{ width: '100%', maxWidth: '100%', height }} />
    </div>
  );
};

export default NativeAdCard;
