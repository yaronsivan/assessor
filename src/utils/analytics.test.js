import { describe, it, expect, beforeEach } from 'vitest';
import { trackAssessmentCompleted } from './analytics';

describe('trackAssessmentCompleted', () => {
  beforeEach(() => {
    window.dataLayer = [];
    delete window.gtag;
    delete window.fbq;
    document.cookie = 'click_gclid=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
    document.cookie = 'click_fbclid=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
  });

  it('pushes the GTM assessment_completed event with the level', () => {
    trackAssessmentCompleted('Gimmel (B1.1)');
    const pushed = window.dataLayer.find((e) => e.event === 'assessment_completed');
    expect(pushed).toMatchObject({
      event: 'assessment_completed',
      assessment_level: 'Gimmel (B1.1)',
    });
  });

  it('includes gclid from the click cookie when present', () => {
    document.cookie = 'click_gclid=g123; path=/';
    trackAssessmentCompleted('Bet (A2.1)');
    const pushed = window.dataLayer.find((e) => e.event === 'assessment_completed');
    expect(pushed.gclid).toBe('g123');
  });

  it('creates dataLayer if the GTM snippet has not defined it yet', () => {
    delete window.dataLayer;
    trackAssessmentCompleted('Aleph (A1.1)');
    expect(window.dataLayer.some((e) => e.event === 'assessment_completed')).toBe(true);
  });
});
