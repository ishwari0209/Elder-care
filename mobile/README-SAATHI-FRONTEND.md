# Saathi frontend update

This is the updated Expo React Native frontend source based on the uploaded project. It keeps existing profile, routine, medicine, emergency-contact, review, and dashboard screens.

## Run
1. Copy the `mobile` folder into your project (or copy its `src` files into your existing `D:\Elderly-care\mobile` project after making a backup).
2. In the mobile folder run `npm install` only if needed.
3. Run `npx expo start`.

## Flow updated
- Public landing page has Login and Sign Up in the top bar.
- Get Started opens Sign Up.
- Login/Sign Up navigate to Dashboard.
- Dashboard shows a Create Profile prompt when profile name/phone are missing.
- Dashboard includes a Log out action.

## Important limitation
Authentication is currently only a frontend demonstration. The login form does not verify credentials and signup does not create an account in MongoDB. Do not use real passwords or sensitive health data. To make this production-ready, the Express backend must implement account creation/login, password hashing, signed sessions/JWT, authenticated profile/routine/medicine endpoints, and per-user data ownership. The current profile/routine state is in React context and is not persistent per account.
