// Spoken reminder sounds (played by the phone itself, even when the app is closed).
// The 6 files live in assets/sounds/ and must be listed in the expo-notifications
// plugin in app.json (see SOUNDS_SETUP.md), then the app must be REBUILT.
// If you have not rebuilt yet, set this to false to use the normal system sound.
export const USE_VOICE_SOUNDS = true;

export const NAME_TO_CODE = { English: 'en', Hindi: 'hi', Marathi: 'mr' };

// kind: 'routine' | 'medicine'   code: 'en' | 'hi' | 'mr'
export const soundFile = (kind, code) => `${kind}_${code}.wav`;
