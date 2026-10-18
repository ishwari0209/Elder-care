# Saathi Backend (MongoDB)

## Setup
1. Install Node.js and MongoDB.
2. In this folder run `npm install`.
3. Copy `.env.example` to `.env` and set a strong `JWT_SECRET`.
4. Set `MONGODB_URI=mongodb://127.0.0.1:27017/saathi_db`.
5. Run `npm run dev`.

## API
Public:
- POST `/api/auth/signup`
- POST `/api/auth/login`
- GET `/api/health`

All user data endpoints require `Authorization: Bearer <token>`:
- GET/PUT `/api/profile`
- GET/POST/PUT/DELETE `/api/routines`
- GET/POST/PUT/DELETE `/api/medicines`
- GET/PUT `/api/contacts`
- GET/POST `/api/completions`
- GET `/api/care-status`

Routine and medicine sync endpoints:
- PUT `/api/routines/sync/all`
- PUT `/api/medicines/sync/all`

Every routine, medicine, contact, profile, and completion is scoped to the authenticated user's ID.
