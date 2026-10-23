// Google Cloud Console → APIs & Services → Credentials → create OAuth client IDs:
//  • Web application  → webClientId   (also used on web / by the backend)
//  • Android          → androidClientId (package: com.anonymous.saathimobile + your SHA-1)
//  • iOS (optional)   → iosClientId
// Put the SAME ids in the backend .env as GOOGLE_CLIENT_IDS (comma-separated).
export const GOOGLE = {
  webClientId: '399784159637-flh5tvfmrtnq084l2du2ogunhfsq88m9.apps.googleusercontent.com',
  androidClientId: '399784159637-4fgs65fsfalto0khtq5q2ust988oo01c.apps.googleusercontent.com ',
  iosClientId: '399784159637-flh5tvfmrtnq084l2du2ogunhfsq88m9.apps.googleusercontent.com',
};
