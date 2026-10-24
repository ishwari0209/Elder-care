# Saathi frontend cleanup

Changes made:
- Removed Google sign-in button from Login and Signup screens.
- Removed Google sign-in API helper, configuration, and translations.
- Removed the Google Sign-In Expo plugin from app.json.
- Removed the standalone NotificationTest screen, its navigation route, and the test button from the landing screen.
- Preserved regular email/password signup/login, email OTP verification, and notification implementation.

The uploaded frontend archive did not include package.json or lockfiles, so dependency manifests could not be edited here. From the full frontend project folder, run:

```cmd
npm uninstall @react-native-google-signin/google-signin expo-auth-session
```

Only uninstall `expo-auth-session` if it is not used elsewhere in your full project. Review `package.json` afterward.
