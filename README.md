npmn Launch

```bash
npm run dev
# Open http://localhost:3000
```

### Step 7: Create Supabase Storage bucket

In Supabase Dashboard → Storage → New bucket:
- Name: `media`
- Public: ✅ Yes

---

## ☁️ Deployment on Vercel

### Step 1: Push to GitHub

```bash
git init
git add .
git commit -m "feat: NovaNet initial commit"
git remote add origin https://github.com/yourname/novanet.git
git push -u origin main
```

### Step 2: Connect to Vercel

1. Go to [vercel.com](https://vercel.com) → New Project
2. Import your GitHub repository
3. Framework preset: **Next.js** (auto-detected)

### Step 3: Add environment variables

In Vercel Project Settings → Environment Variables, add all variables from `.env.local`:

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role (never expose to client) |
| `ADMIN_EMAIL` | Admin email |
| `ADMIN_PASSWORD` | Admin password (never commit this!) |
| `NEXT_PUBLIC_APP_URL` | Your Vercel deployment URL |
| `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` | Optional: Cloudinary |
| `CLOUDINARY_API_KEY` | Optional: Cloudinary |
| `CLOUDINARY_API_SECRET` | Optional: Cloudinary |

### Step 4: Deploy

Click **Deploy**. Vercel will build and deploy automatically.

### Step 5: Run seed on production

After first deployment, run the seed script pointing to production:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co \
SUPABASE_SERVICE_ROLE_KEY=your-key \
ADMIN_EMAIL=benoitmouafo6@gmail.com \
ADMIN_PASSWORD=Eren.1234 \
npx ts-node supabase/seed.ts
```

### Step 6: Verify

- [ ] Auth: register, login, logout
- [ ] Feed: create post, like, comment
- [ ] Stories: create + view
- [ ] Messages: start conversation, send/receive
- [ ] Groups: create, join
- [ ] Profile: view, follow
- [ ] Admin: login as admin, view panel at `/admin`
- [ ] Open Graph: share URL → logo appears in preview

---

## 🔐 Admin Access

- **URL**: `/admin`
- **Email**: `benoitmouafo6@gmail.com`
- **Password**: Value of `ADMIN_PASSWORD` env var

The admin can:
- View all users
- Review & resolve content reports
- Remove flagged posts
- View site statistics

---

## 🎨 Customization

### Brand colors

Edit `tailwind.config.ts` → `colors.nova` and `colors.accent`:

```typescript
nova: {
  500: '#4757f5', // Change this to your brand color
},
accent: {
  500: '#f530b0', // Change this for the gradient end
},
```

### App name

Change `NEXT_PUBLIC_APP_NAME` in `.env.local`.

### Logo

Replace `public/logo.png` (192×192) and `public/og-image.png` (1200×630).

---

## 📚 Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript 5.7 |
| Styling | Tailwind CSS 3.4 |
| Database | PostgreSQL via Supabase |
| Auth | Supabase Auth |
| Realtime | Supabase Realtime |
| Storage | Supabase Storage / Cloudinary |
| Validation | Zod |
| Dates | date-fns |
| Icons | Lucide React |
| Toasts | react-hot-toast |
| Deployment | Vercel |

---

## 📄 License

MIT © NovaNet

