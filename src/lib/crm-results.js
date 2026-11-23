// What the results screen sends to the CRM (`/api/email/send-assessment-result`).
//
// The CRM finds the visitor's contact by PHONE first, then by email. The phone
// matters: a contact the office or WhatsApp created usually has no email, so a
// result sent with the email alone lands on a second, email-only contact and
// the assessor sees no earlier test (Elad, 2026-11-23: 205 people split since
// 2026-05-23, when the survey profile stopped carrying the phone).

/**
 * The survey engine (`hooks/useSurvey.js`) builds the profile from name and
 * email only; the phone is resolved earlier, on the details step. Put it on
 * the profile so the results screen has it.
 */
export function withResolvedPhone(profile, resolvedPhone) {
  if (profile?.phone || !resolvedPhone) return profile;
  return { ...profile, phone: resolvedPhone };
}

export function buildCrmResultsBody({ profile, results, assessmentId }) {
  const body = {
    to: profile?.email,
    name: profile?.name,
    level: results?.recommendedLevel,
    assessmentId,
    organization: 'ulpan_bayit',
  };
  if (profile?.phone) body.phone = profile.phone;
  return body;
}
