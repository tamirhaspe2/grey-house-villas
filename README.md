<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/432f37b2-5459-410c-8ee4-e59990622203

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Production checklist (Grey House / VILLA)

After `npm run build`, deploy **`dist/`** as static assets and run **`server.ts`** (or your host’s Node process) so API routes work.

| Area | What to verify |
|------|----------------|
| **API + SPA** | Same origin serves `/` and `/api/*` (or reverse proxy). Booking uses `GET /api/booking-pricing`, `PUT /api/admin/booking-pricing`, `GET /api/bookings/dates`, `POST /api/booking`. |
| **Firestore** | If `useFirestore` is on: `config/bookingPricing` document exists or seeds from JSON on first read; admin **Save** after deploy syncs pricing + weekend days + seasons. |
| **Admin** | Password/cookies work in production (`credentials: 'include'`). Re-save **Booking** once if live DB has old `weekendDays` (e.g. Fri–Sun should be `5, 6, 0`). |
| **Sockets** | `io()` matches server URL in prod if frontend and API differ by host. |
| **Env** | Set the same secrets as local (e.g. Firebase, Resend) on the host. |

Run `npm run lint` before pushing.
