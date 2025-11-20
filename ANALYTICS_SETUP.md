# Analytics Setup Instructions

This app tracks user behavior using Facebook Pixel and Google Analytics 4 (GA4).

## Events Being Tracked

1. **AssessmentStarted** - When user begins the assessment (after entering name/email)
2. **AssessmentCompleted** - When user completes the assessment and sees results
3. **ViewCourses** - When user clicks "View Courses" button
4. **ScheduleAssessment** - When user clicks "Schedule In-Person Assessment"
5. **WhatsAppClick** - When user clicks WhatsApp contact button
6. **CalComBooking** - When user clicks Cal.com booking button
7. **ContactUsClick** - When user clicks "Contact Us" in header

## Setup in Vercel

### 1. Get Your Tracking IDs

**Facebook Pixel ID:**
1. Go to [Facebook Business Manager](https://business.facebook.com)
2. Navigate to Events Manager
3. Select your Pixel
4. Copy the Pixel ID (format: a number like `123456789012345`)

**Google Analytics 4 Measurement ID:**
1. Go to [Google Analytics](https://analytics.google.com)
2. Navigate to Admin > Data Streams
3. Select your web data stream
4. Copy the Measurement ID (format: `G-XXXXXXXXXX`)

### 2. Add Environment Variables in Vercel

1. Go to your project in [Vercel Dashboard](https://vercel.com/dashboard)
2. Click on "Settings"
3. Click on "Environment Variables"
4. Add these two variables:

   **Variable 1:**
   - Key: `VITE_FB_PIXEL_ID`
   - Value: Your Facebook Pixel ID (e.g., `123456789012345`)
   - Environment: Production, Preview, Development

   **Variable 2:**
   - Key: `VITE_GA_MEASUREMENT_ID`
   - Value: Your GA4 Measurement ID (e.g., `G-XXXXXXXXXX`)
   - Environment: Production, Preview, Development

5. Click "Save"
6. Redeploy your site for the changes to take effect

### 3. Verify Tracking is Working

**Facebook Pixel:**
1. Install [Facebook Pixel Helper](https://chrome.google.com/webstore/detail/facebook-pixel-helper/) browser extension
2. Visit your deployed site
3. Click the extension icon - you should see your Pixel firing

**Google Analytics:**
1. Go to Google Analytics
2. Navigate to Reports > Realtime
3. Visit your deployed site
4. You should see yourself in the realtime report

### 4. Testing Locally (Optional)

If you want to test tracking locally:

1. Create a `.env.local` file in the `/web` directory
2. Add your tracking IDs:
   ```
   VITE_FB_PIXEL_ID=your_pixel_id
   VITE_GA_MEASUREMENT_ID=your_measurement_id
   ```
3. Restart your dev server

**Note:** The `.env.local` file is git-ignored and won't be committed to the repository.

## Facebook Conversion Events

The following events are also tracked as Facebook conversion events:
- **Lead** - Fired when assessment is completed
- **Contact** - Fired when user clicks WhatsApp, Cal.com, or Contact Us

These can be used for Facebook Ads optimization and retargeting.
