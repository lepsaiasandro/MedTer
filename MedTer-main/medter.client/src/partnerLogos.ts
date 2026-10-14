/** Official partner logos for banner mark (local copies under /public/partners). */
const LOGOS: Record<string, string> = {
  psp: "/partners/psp-logo.png",
  aversi: "/partners/aversi-logo.png",
};

/** Resolve a local official logo path for a brand name, if we have one. */
export function partnerLogoUrl(brand: string): string | null {
  const key = brand.trim().toLowerCase();
  if (!key) return null;
  if (LOGOS[key]) return LOGOS[key];
  // Match brands like "Aversi Online" / "PSP Pharmacy"
  for (const [id, src] of Object.entries(LOGOS)) {
    if (key.includes(id)) return src;
  }
  return null;
}
