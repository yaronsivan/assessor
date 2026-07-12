import { describe, expect, it } from 'vitest';
import { courseUrl, levelToCourseSlug } from './course-links';

describe('levelToCourseSlug', () => {
  it.each([
    ['Aleph (A1.1)', 'aleph'],
    ['Aleph+ (A1.2)', 'aleph-plus'],
    ['Aleph++ (A1.3)', 'aleph-plus-plus'],
    ['Bet (A2.1)', 'bet'],
    ['Bet+ (A2.2)', 'bet-plus'],
    ['Bet++ (A2.3)', 'bet-plus-plus'],
    ['Gimmel (B1.1)', 'gimmel'],
    ['Gimmel+ (B1.2)', 'gimmel-plus'],
    ['Gimmel++ (B1.3)', 'gimmel-plus-plus'],
    ['Dalet (B2.1)', 'dalet'],
  ])('maps %s to %s', (level, slug) => {
    expect(levelToCourseSlug(level)).toBe(slug);
  });

  it('returns null for unknown or missing codes', () => {
    expect(levelToCourseSlug('Almost Native (C2.1)')).toBeNull();
    expect(levelToCourseSlug('nonsense')).toBeNull();
    expect(levelToCourseSlug(undefined)).toBeNull();
  });
});

describe('courseUrl', () => {
  it('builds modality-preset level pages on the new site', () => {
    expect(courseUrl('Gimmel (B1.1)', 'In-Person')).toBe(
      'https://ulpan.co.il/courses/gimmel?modality=In-Person',
    );
    expect(courseUrl('Dalet (B2.1)', 'Online')).toBe(
      'https://ulpan.co.il/courses/dalet?modality=Online',
    );
  });

  it('falls back to the course grid for unknown levels', () => {
    expect(courseUrl('Almost Native (C2.1)', 'Online')).toBe(
      'https://ulpan.co.il/courses?modality=Online',
    );
  });
});
