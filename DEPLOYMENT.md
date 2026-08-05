# Deploying NestFinder

Two pieces deploy separately: the **API** (Express + Socket.IO, needs a
long-running process) and the **client** (a static Vite build).

Everything below has been kept free-tier-friendly, since this is a student
project rather than a funded product.

---

## 1. Before anything else — rotate the secrets

The `.env` values used in development have been typed into chat and shared
screens. Treat all of them as compromised and generate fresh ones for
production:

| Variable | How to regenerate |
|---|---|
| `JWT_SECRET` | `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` |
| `GMAIL_APP_PASSWORD` | Revoke and reissue in Google Account → Security → App passwords |
| `TURNSTILE_SECRET_KEY` | Cloudflare dashboard → Turnstile → rotate |
| `MONGO_URI` | Atlas → Database Access → edit user → new password |

Rotating `JWT_SECRET` signs everyone out, which is the correct behaviour when a
secret may have leaked.

---

## 2. API — Render (or Railway / Fly)

**Root directory:** `server`
**Build command:** `npm ci`
**Start command:** `node server.js`
**Health check path:** `/healthz`

### Environment variables

Copy the keys from [`server/.env.example`](server/.env.example), then set:

```
NODE_ENV=production
PORT=                       # leave blank — the platform injects it
MONGO_URI=mongodb+srv://…   # a NEW password, not the development one
JWT_SECRET=…                # freshly generated, see above
JWT_EXPIRE=7d
CLIENT_URL=https://your-frontend-domain    # ← required, see note below
ADMIN_EMAIL=…
GMAIL_USER=…
GMAIL_APP_PASSWORD=…
TURNSTILE_SECRET_KEY=…      # optional — CAPTCHA is a no-op without it
SENTRY_DSN=…                # optional — errors are logged locally regardless

```

> **`CLIENT_URL` is not optional in production.** It is the CORS allowlist and
> the socket origin. Get it wrong and the frontend silently cannot call the API
> or open a live connection.

### Atlas network access

Add the platform's egress IPs, or `0.0.0.0/0` if the platform has no static IP.
Keep a strong database password either way — the allowlist is then the only
thing standing between the internet and the data.

### Uploads will not survive a redeploy

`server/uploads/` is on the container's local disk, which most platforms wipe on
every deploy. Before real users, attach a persistent disk (Render supports one)
or move uploads to object storage (Cloudinary's free tier is the usual choice
here). **This includes KYC identity documents**, so losing them is worse than
losing listing photos.

---

## 3. Client — Vercel or Netlify

**Root directory:** `client`
**Build command:** `npm run build`
**Output directory:** `dist`

### Environment variables

```
VITE_API_URL=https://your-api-domain/api
VITE_TURNSTILE_SITE_KEY=…    # optional
```

### SPA routing

The app uses client-side routing, so every path must fall through to
`index.html` or a refresh on `/listings/abc` will 404.

- **Vercel** — handled by `client/vercel.json` (included).
- **Netlify** — handled by `client/public/_redirects` (included).

---

## 4. After deploying — check these, don't assume

```bash
curl https://your-api-domain/healthz          # → {"ok":true,…,"db":"connected"}
```

Then in a browser:

1. Register a student → the verification email arrives.
2. Log in → `nf_token` is set, `HttpOnly` and `Secure` (check DevTools →
   Application → Cookies; it must **not** be readable from `document.cookie`).
3. Open a listing → images load (if they don't, uploads didn't survive the
   deploy — see above).
4. Send a message → it arrives live (proves the socket connected, i.e. CORS and
   `CLIENT_URL` are right).
5. Admin → **Health** shows zero errors.

Cookies are already set with `secure` + `sameSite: 'none'` when
`NODE_ENV=production`, so the API and client may live on different domains.

---

## 5. Monitoring

Errors are captured with no third-party signup:

- written to `server/logs/errors.jsonl` (rotates at 5MB),
- kept in memory and visible at **Admin → Health**,
- forwarded to Sentry as well if `SENTRY_DSN` is set.

Secrets are stripped from anything logged (`password`, `token`, `otp`, `bvn`
and similar keys are redacted).

---

## 6. Known limits before real users

- **Uploads are ephemeral** unless a disk or object storage is attached — the
  most important item on this list.
- **Payments run in sandbox.** Switching them on needs a payout queue first, or
  the app will tell a landlord money was released when it wasn't. See the
  booking notes.
- **Rate limits are per-instance** (`express-rate-limit` in memory). Fine on one
  instance; needs a shared store if ever scaled out.
