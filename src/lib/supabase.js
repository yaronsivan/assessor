import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://svgdyrsfxcausecwrgbc.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN2Z2R5cnNmeGNhdXNlY3dyZ2JjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ0ODE0MTYsImV4cCI6MjA4MDA1NzQxNn0.5mauFuooWrYgzqRliGGBTcD0okrnNJzZklfwbLVyOyE';

// Debug: log what values we're using (only first/last chars of key for security)
console.log('Supabase init:', {
  url: supabaseUrl,
  keyStart: supabaseAnonKey?.substring(0, 20),
  keyEnd: supabaseAnonKey?.substring(supabaseAnonKey.length - 10),
  keyLength: supabaseAnonKey?.length,
  fromEnv: !!import.meta.env.VITE_SUPABASE_ANON_KEY
});

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Helper to detect device type
function getDeviceType() {
  const ua = navigator.userAgent;
  if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
    return 'tablet';
  }
  if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(ua)) {
    return 'mobile';
  }
  return 'desktop';
}

// Fetch geolocation from IP (using ipapi.co which supports HTTPS)
async function getGeolocation() {
  try {
    const response = await fetch('https://ipapi.co/json/');
    if (!response.ok) return null;
    const data = await response.json();
    return {
      geo_country: data.country_name,
      geo_region: data.region,
      geo_city: data.city,
      ip_address: data.ip
    };
  } catch (err) {
    console.error('Failed to get geolocation:', err);
    return null;
  }
}

// Save assessment when user enters name/email (returns session ID)
export async function saveAssessmentStart(name, email) {
  try {
    // Get geolocation early
    const geo = await getGeolocation();

    const { data, error } = await supabase
      .from('assessments')
      .insert({
        name,
        email,
        session_started_at: new Date().toISOString(),
        current_stage: 'survey',
        user_agent: navigator.userAgent,
        device_type: getDeviceType(),
        ...(geo || {})
      })
      .select('id')
      .single();

    if (error) {
      console.error('Supabase insert error:', error);
      return null;
    }

    console.log('Assessment started, ID:', data.id);
    return data.id;
  } catch (err) {
    console.error('Failed to save assessment start:', err);
    return null;
  }
}

// Update assessment with survey/profile data
export async function updateAssessmentProfile(assessmentId, profile) {
  if (!assessmentId) return;

  try {
    const { error } = await supabase
      .from('assessments')
      .update({
        knowledge_source: profile.knowledgeSource,
        fluency_level: profile.fluencyLevel,
        months_studied: profile.months || null,
        weekly_hours: profile.weeklyHours || null,
        total_hours: profile.totalHours || null,
        validation_trace: profile.trace || [],
        current_stage: 'game'
      })
      .eq('id', assessmentId);

    if (error) {
      console.error('Supabase update error:', error);
    }
  } catch (err) {
    console.error('Failed to update assessment profile:', err);
  }
}

// Update current question progress (for drop-off tracking)
export async function updateAssessmentProgress(assessmentId, questionIndex, questionHistory) {
  if (!assessmentId) return;

  try {
    const { error } = await supabase
      .from('assessments')
      .update({
        last_question_index: questionIndex,
        question_history: questionHistory
      })
      .eq('id', assessmentId);

    if (error) {
      console.error('Supabase progress update error:', error);
    }
  } catch (err) {
    console.error('Failed to update assessment progress:', err);
  }
}

// Track abandonment when user leaves mid-assessment
export function trackAbandonment(assessmentId, currentStage) {
  if (!assessmentId) return;

  const url = `${supabaseUrl}/rest/v1/assessments?id=eq.${assessmentId}`;

  fetch(url, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'apikey': supabaseAnonKey,
      'Authorization': `Bearer ${supabaseAnonKey}`,
      'Prefer': 'return=minimal'
    },
    body: JSON.stringify({
      abandoned_at: new Date().toISOString(),
      current_stage: currentStage
    }),
    keepalive: true
  }).catch(() => {});
}

// Update assessment with results (returns the record ID for future updates)
export async function saveAssessmentComplete(sessionId, profile, results, webhookResult) {
  try {
    const updateData = {
      session_completed_at: new Date().toISOString(),
      current_stage: 'completed',
      finished_level: results.finishedLevel,
      recommended_level: results.recommendedLevel,
      beyond_max_level: results.beyondMaxLevel || false,
      total_questions_asked: results.totalAsked,
      question_history: results.questionHistory || [],
      decisions: results.decisions || [],
      webhook_status: webhookResult?.status || 'not_sent',
      webhook_response: webhookResult?.response || null,
      webhook_sent_at: webhookResult?.sentAt || null
    };

    // If we have a session ID, update existing record
    if (sessionId) {
      const { data: existing } = await supabase
        .from('assessments')
        .select('session_started_at')
        .eq('id', sessionId)
        .single();

      if (existing?.session_started_at) {
        const startTime = new Date(existing.session_started_at);
        const endTime = new Date();
        updateData.duration_seconds = Math.round((endTime - startTime) / 1000);
      }

      const { error } = await supabase
        .from('assessments')
        .update(updateData)
        .eq('id', sessionId);

      if (error) {
        console.error('Supabase update error:', error);
        return null;
      }
      console.log('Assessment completed in Supabase, ID:', sessionId);
      return sessionId;
    } else {
      // No session ID - insert new record with all data (fallback)
      const geo = await getGeolocation();
      const { data, error } = await supabase
        .from('assessments')
        .insert({
          name: profile.name,
          email: profile.email,
          session_started_at: new Date().toISOString(),
          knowledge_source: profile.knowledgeSource,
          fluency_level: profile.fluencyLevel,
          months_studied: profile.months || null,
          weekly_hours: profile.weeklyHours || null,
          total_hours: profile.totalHours || null,
          validation_trace: profile.trace || [],
          user_agent: navigator.userAgent,
          device_type: getDeviceType(),
          ...(geo || {}),
          ...updateData
        })
        .select('id')
        .single();

      if (error) {
        console.error('Supabase insert error:', error);
        return null;
      }
      console.log('Assessment saved to Supabase, ID:', data.id);
      return data.id;
    }
  } catch (err) {
    console.error('Failed to save assessment:', err);
    return null;
  }
}

// Track a user action on the results page
export async function trackResultsAction(assessmentId, action, details = {}) {
  if (!assessmentId) return;

  try {
    // First get current actions_log
    const { data: existing } = await supabase
      .from('assessments')
      .select('actions_log')
      .eq('id', assessmentId)
      .single();

    const currentLog = existing?.actions_log || [];
    const newAction = {
      action,
      timestamp: new Date().toISOString(),
      ...details
    };

    const updateData = {
      actions_log: [...currentLog, newAction]
    };

    // Update specific flags based on action
    if (action === 'view_courses') {
      updateData.clicked_view_courses = true;
    } else if (action === 'schedule_assessment') {
      updateData.clicked_schedule_assessment = true;
    } else if (action === 'select_course_type') {
      updateData.clicked_course_type = details.courseType;
    }

    const { error } = await supabase
      .from('assessments')
      .update(updateData)
      .eq('id', assessmentId);

    if (error) {
      console.error('Failed to track action:', error);
    }
  } catch (err) {
    console.error('Failed to track action:', err);
  }
}

// Send final tracking data when page is closing (using sendBeacon)
export function trackResultsExit(assessmentId, resultsStartTime) {
  if (!assessmentId) return;

  const timeOnResults = Math.round((Date.now() - resultsStartTime) / 1000);

  // Use sendBeacon for reliable delivery on page close
  const payload = JSON.stringify({
    assessment_id: assessmentId,
    time_on_results_seconds: timeOnResults,
    results_page_exited_at: new Date().toISOString()
  });

  // sendBeacon to a Supabase Edge Function or use the REST API directly
  const url = `${supabaseUrl}/rest/v1/assessments?id=eq.${assessmentId}`;

  // Create the beacon with PATCH request via fetch (sendBeacon only supports POST)
  // Instead, we'll use a simple fetch with keepalive
  fetch(url, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'apikey': supabaseAnonKey,
      'Authorization': `Bearer ${supabaseAnonKey}`,
      'Prefer': 'return=minimal'
    },
    body: JSON.stringify({
      time_on_results_seconds: timeOnResults,
      results_page_exited_at: new Date().toISOString()
    }),
    keepalive: true // This ensures the request completes even if page closes
  }).catch(() => {
    // Ignore errors on page close
  });
}
