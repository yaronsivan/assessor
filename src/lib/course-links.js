// course-links.js — single source of truth for sending assessed users to the
// rebuilt ulpan.co.il course pages. The new site uses word slugs
// (/courses/gimmel?modality=Online), not the legacy WP codes (/course/o-b-1/).

const SITE_ORIGIN = 'https://ulpan.co.il';

export const CEFR_TO_SLUG = {
  'A1.1': 'aleph',
  'A1.2': 'aleph-plus',
  'A1.3': 'aleph-plus-plus',
  'A2.1': 'bet',
  'A2.2': 'bet-plus',
  'A2.3': 'bet-plus-plus',
  'B1.1': 'gimmel',
  'B1.2': 'gimmel-plus',
  'B1.3': 'gimmel-plus-plus',
  'B2.1': 'dalet',
  'B2.2': 'dalet-plus',
};

/** "Bet+ (A2.2)" -> "bet-plus"; null when the CEFR code is unknown. */
export function levelToCourseSlug(levelName) {
  const match = /\(([^)]+)\)/.exec(levelName || '');
  return (match && CEFR_TO_SLUG[match[1]]) || null;
}

/**
 * Course page URL for an assessed level. modality: 'In-Person' | 'Online'.
 * Unknown levels fall back to the full course grid (never a 404).
 */
export function courseUrl(levelName, modality) {
  const slug = levelToCourseSlug(levelName);
  const path = slug ? `/courses/${slug}` : '/courses';
  const query = modality ? `?modality=${encodeURIComponent(modality)}` : '';
  return `${SITE_ORIGIN}${path}${query}`;
}
