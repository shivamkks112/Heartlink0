import React from 'react';
import { X, Play, Heart, Crown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// Shown when a free user runs out of daily likes: rewarded video (+5) or Premium
const OutOfSwipesModal = ({ isOpen, onClose, onWatchAd, watching = false, adsLeft = 0, likesPerAd = 5 }) => {
  const navigate = useNavigate();
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-6" data-testid="out-of-likes-modal">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-gray-900 rounded-3xl max-w-sm w-full overflow-hidden border border-white/10">
        <button onClick={onClose} className="absolute top-3 right-3 p-2 hover:bg-white/10 rounded-full z-10" data-testid="out-of-likes-close-btn">
          <X className="w-5 h-5 text-white/80" />
        </button>
        <div className="bg-gradient-to-br from-pink-500 to-rose-600 px-6 py-8 text-center text-white">
          <Heart className="w-12 h-12 mx-auto mb-3" />
          <h2 className="text-xl font-bold">Aaj ke likes khatam!</h2>
          <p className="text-white/80 text-sm mt-1.5">Passes unlimited hain. Kal 12 baje naye likes milenge.</p>
        </div>
        <div className="p-5 space-y-3">
          {adsLeft > 0 && onWatchAd && (
            <button
              onClick={onWatchAd}
              disabled={watching}
              className="w-full bg-emerald-500 text-white p-3.5 rounded-2xl flex items-center justify-center gap-2 font-semibold active:scale-[0.98] transition-transform disabled:opacity-60"
              data-testid="watch-ad-for-likes-btn"
            >
              {watching ? <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Play className="w-5 h-5" />}
              Watch a short video for +{likesPerAd} likes
            </button>
          )}
          {adsLeft > 0 && (
            <p className="text-center text-xs text-gray-400" data-testid="rewarded-ads-left">{adsLeft} video reward{adsLeft > 1 ? 's' : ''} left today</p>
          )}
          <button
            onClick={() => { onClose(); navigate('/premium'); }}
            className="w-full bg-gradient-to-r from-amber-400 to-orange-500 text-white p-3.5 rounded-2xl flex items-center justify-center gap-2 font-semibold active:scale-[0.98] transition-transform"
            data-testid="go-premium-unlimited-likes-btn"
          >
            <Crown className="w-5 h-5" /> Go Premium for unlimited likes
          </button>
        </div>
      </div>
    </div>
  );
};

export default OutOfSwipesModal;
