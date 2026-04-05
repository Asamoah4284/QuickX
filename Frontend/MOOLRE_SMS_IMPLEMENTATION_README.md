# Moolre SMS

SMS is sent **only from the backend**, not the Next.js app.

- **Implementation:** `backend/src/services/sms.js` (Moolre Open API)
- **Configuration:** `backend/.env` — set `MOOLRE_API_KEY` and optional `MOOLRE_SENDER_ID`
- **Example env:** `backend/.env.example`

Triggers: teacher invites, OTP, attendance (absent parent), leave approvals, bulk teacher import, etc.

To test, run a script from the backend folder (with `dotenv` loading `backend/.env`):

```bash
cd backend && node scripts/test-moolre-sms.js
```

(Use your own test number in the script.)
