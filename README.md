# Real-time Chat App (Next.js + Convex + Clerk)

## Getting started (local dev)

### 1) Configure Clerk

- Create a Clerk application
- Add these to `.env.local` (Next.js):
  - `CLERK_PUBLISHABLE_KEY=...`
  - `CLERK_SECRET_KEY=...`

### 2) Configure Convex

- Create a Convex project and set:
  - `NEXT_PUBLIC_CONVEX_URL=...` in `.env.local`

### 3) **IMPORTANT**: Enable Clerk auth in Convex (fixes “Unauthorized”)

This project uses `ConvexProviderWithClerk`, which fetches a Clerk JWT using the template name **`convex`**.

- In **Clerk Dashboard** → **JWT Templates**:
  - Create a template named **`convex`**
  - Copy the **Issuer** URL from that template
- In **Convex Dashboard** → **Settings** → **Environment Variables**:
  - Set `CLERK_JWT_ISSUER_DOMAIN` to that Issuer URL

You can also set it via CLI:

```bash
npx convex env set CLERK_JWT_ISSUER_DOMAIN "https://<your-clerk-issuer>"
```

### 4) Run the app

In one terminal:

```bash
npx convex dev
```

In another terminal:

```bash
npm run dev
```

Open `http://localhost:3000`.
# Real-Time-Chat-Application
