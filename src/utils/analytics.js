// Facebook Pixel and GA4 tracking utilities

// Initialize Facebook Pixel
export const initFacebookPixel = () => {
  const pixelId = import.meta.env.VITE_FB_PIXEL_ID;

  if (!pixelId) {
    console.log('Facebook Pixel: Not initialized - VITE_FB_PIXEL_ID not set');
    return;
  }

  console.log('Facebook Pixel: Initializing with ID:', pixelId);

  // Facebook Pixel Code
  !function(f,b,e,v,n,t,s)
  {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
  n.callMethod.apply(n,arguments):n.queue.push(arguments)};
  if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
  n.queue=[];t=b.createElement(e);t.async=!0;
  t.src=v;s=b.getElementsByTagName(e)[0];
  s.parentNode.insertBefore(t,s)}(window, document,'script',
  'https://connect.facebook.net/en_US/fbevents.js');

  window.fbq('init', pixelId);
  window.fbq('track', 'PageView');
  console.log('Facebook Pixel: Initialized and PageView tracked');
};

// Initialize Google Analytics 4
export const initGA4 = () => {
  const measurementId = import.meta.env.VITE_GA4_MEASUREMENT_ID;

  if (!measurementId) {
    console.log('Google Analytics: Not initialized - VITE_GA4_MEASUREMENT_ID not set');
    return;
  }

  console.log('Google Analytics: Initializing with ID:', measurementId);

  // Set up dataLayer and gtag function first
  window.dataLayer = window.dataLayer || [];
  window.gtag = function(){window.dataLayer.push(arguments);};
  window.gtag('js', new Date());
  window.gtag('config', measurementId);

  // Then load the GA4 script
  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
  script.onload = () => {
    console.log('Google Analytics: Script loaded and initialized');
  };
  script.onerror = () => {
    console.error('Google Analytics: Failed to load script');
  };
  document.head.appendChild(script);

  console.log('Google Analytics: Configuration queued, script loading...');
};

// Track Facebook Pixel event
export const trackFBEvent = (eventName, params = {}) => {
  if (typeof window.fbq === 'function') {
    window.fbq('track', eventName, params);
  }
};

// Track GA4 event
export const trackGA4Event = (eventName, params = {}) => {
  if (typeof window.gtag === 'function') {
    window.gtag('event', eventName, params);
  }
};

// Combined tracking function
export const trackEvent = (eventName, params = {}) => {
  console.log('📊 Tracking event:', eventName, params);
  trackFBEvent(eventName, params);
  trackGA4Event(eventName, params);
};

// Specific event trackers
export const trackAssessmentStarted = () => {
  trackEvent('AssessmentStarted', {
    event_category: 'engagement',
    event_label: 'Started Hebrew Level Assessment'
  });
};

export const trackAssessmentCompleted = (level) => {
  trackEvent('AssessmentCompleted', {
    event_category: 'conversion',
    event_label: 'Completed Hebrew Level Assessment',
    recommended_level: level
  });
  // Also track as Lead for Facebook
  trackFBEvent('Lead', { content_name: `Level ${level}` });
};

export const trackViewCourses = (level) => {
  trackEvent('ViewCourses', {
    event_category: 'engagement',
    event_label: 'Viewed Course Options',
    recommended_level: level
  });
};

export const trackScheduleAssessment = (level) => {
  trackEvent('ScheduleAssessment', {
    event_category: 'engagement',
    event_label: 'Opened Schedule Assessment Modal',
    recommended_level: level
  });
};

export const trackWhatsAppClick = (level) => {
  trackEvent('WhatsAppClick', {
    event_category: 'contact',
    event_label: 'Clicked WhatsApp Contact',
    recommended_level: level
  });
  // Track as Contact for Facebook
  trackFBEvent('Contact', { content_name: 'WhatsApp' });
};

export const trackCalComBooking = (level) => {
  trackEvent('CalComBooking', {
    event_category: 'contact',
    event_label: 'Clicked Cal.com Booking',
    recommended_level: level
  });
  // Track as Contact for Facebook
  trackFBEvent('Contact', { content_name: 'Cal.com' });
};

export const trackContactUs = () => {
  trackEvent('ContactUsClick', {
    event_category: 'contact',
    event_label: 'Clicked Contact Us Button'
  });
  trackFBEvent('Contact', { content_name: 'Contact Modal' });
};
