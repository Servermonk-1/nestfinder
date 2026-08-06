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
| `BREVO_API_KEY` | Revoke and reissue in Brevo → SMTP & API → API Keys |
| `TURNSTILE_SECRET_KEY` | Cloudflare dashboard → Turnstile → rotate |
| `MONGO_URI` | Atlas → Database Access → edit user → new password |
| `CLOUDINARY_API_SECRET` | Cloudinary console → Settings → Access Keys → generate a new key, then disable the old one |

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
BREVO_API_KEY=…             # Brevo → SMTP & API → API Keys
EMAIL_FROM=NestFinder <no-reply@yourdomain.com>   # must be a VERIFIED Brevo sender
TURNSTILE_SECRET_KEY=…      # optional — CAPTCHA is a no-op without it
SENTRY_DSN=…                # optional — errors are logged locally regardless

CLOUDINARY_CLOUD_NAME=…     # ← required, see note below
CLOUDINARY_API_KEY=…
CLOUDINARY_API_SECRET=…
```

> **Email must go over HTTPS, not SMTP.** Render blocks outbound connections on
> ports 25, 465, and 587, so any SMTP transport (Gmail included) times out there
> no matter how it is configured. Brevo is called over 443, which is why it is
> the transport. Without `BREVO_API_KEY` the app runs in demo mode: logins still
> work, but the OTP is printed to the server log instead of emailed.

> **`CLIENT_URL` is not optional in production.** It is the CORS allowlist and
> the socket origin. Get it wrong and the frontend silently cannot call the API
> or open a live connection.

> **The `CLOUDINARY_*` keys are not optional in production either.** Every
> upload path depends on them. Without them the API still boots and logs a
> warning at startup — but uploads fail, and that includes KYC documents and
> payment receipts.

### Atlas network access

Add the platform's egress IPs, or `0.0.0.0/0` if the platform has no static IP.
Keep a strong database password either way — the allowlist is then the only
thing standing between the internet and the data.

### Image & file storage — Cloudinary

Render's filesystem is **ephemeral**: the container is replaced on every deploy
and can be recycled at any time. Anything written to disk is gone, while the
MongoDB row pointing at it survives — which is how a listing ends up with broken
images. Nothing is written to disk any more; every upload is streamed straight
to Cloudinary and only the resulting URL is stored.

Set it up once:

1. Create a free account at [cloudinary.com](https://cloudinary.com) — the free
   tier covers this project comfortably.
2. Open **Dashboard → Product Environment Credentials** and copy the three
   values: **Cloud name**, **API Key**, **API Secret**.
3. In Render → your service → **Environment**, add:

   ```
   CLOUDINARY_CLOUD_NAME=your-cloud-name
   CLOUDINARY_API_KEY=123456789012345
   CLOUDINARY_API_SECRET=your-api-secret
   ```

4. Redeploy. The startup log should read `☁️  Cloudinary configured: <name>`.
   If it reads `⚠️  Cloudinary credentials missing`, one of the three is unset
   or misspelled.

Uploads are organised into folders so the media library stays navigable:

| Folder | Contents |
|---|---|
| `nestfinder/listings` | Listing photos |
| `nestfinder/avatars` | Profile pictures |
| `nestfinder/kyc` | Identity documents (images and PDFs) |
| `nestfinder/payments` | Receipts and blockchain screenshots |

Nothing on the client needs configuring — the API returns absolute Cloudinary
URLs and the frontend renders them as-is.

**Existing listings uploaded before this change** still hold old relative paths
like `uploads/listing-123.jpg`. Those files are already gone from Render, so
those images stay broken; re-upload the photos on any affected listing. New
uploads are unaffected.

> **Keep the API secret secret.** It signs deletion requests. If it leaks,
> rotate it in the Cloudinary console (Settings → Access Keys) and update the
> Render environment variable.

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
3. Open a listing → images load. They are served from
   `res.cloudinary.com`, not from the API — check the Network tab if one is
   missing. A listing created before the Cloudinary migration will still be
   broken; re-upload its photos.
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

- **Payments run in sandbox.** Switching them on needs a payout queue first, or
  the app will tell a landlord money was released when it wasn't. See the
  booking notes.
- **Rate limits are per-instance** (`express-rate-limit` in memory). Fine on one
  instance; needs a shared store if ever scaled out.
