// Single source of truth for every ad surface (banner, native, interstitial, rewarded prompts)
export const isAdFreeUser = (user) => Boolean(user?.is_admin || user?.ad_free || user?.is_premium || user?.isPremium);

export const shouldShowAds = (user) => Boolean(user) && user.gender?.toLowerCase() === 'male' && !isAdFreeUser(user);
