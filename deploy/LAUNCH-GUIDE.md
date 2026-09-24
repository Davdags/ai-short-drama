# NucleusArt — Launch Guide

Everything to put NucleusArt online at your domain. Part A is yours (accounts and payments); Part B is running the scripts; Part C is the launch-day checklist.

---

## Part A — Accounts to set up (about 1 hour)

### A1. Server (Hetzner Cloud, ~$15–20/month)
1. Go to **hetzner.com/cloud** → Sign up (ID check may take a few minutes).
2. **New Project** → name it `nucleusart` → **Add Server**:
   - Location: **Ashburn (US)** or **Falkenstein (EU)** — whichever is closer to most customers.
   - Image: **Ubuntu 24.04**
   - Type: **Shared vCPU → CPX31** (4 vCPU, 8 GB RAM, 160 GB disk)
   - Networking: keep **Public IPv4** on.
   - SSH key: on your laptop open Git Bash and run `ssh-keygen -t ed25519` (press Enter to accept defaults), then `cat ~/.ssh/id_ed25519.pub` and paste the output into Hetzner's **Add SSH key**.
   - Name: `nucleusart-1` → **Create & Buy now**.
3. Copy the server's **IPv4 address** (e.g. `5.161.x.x`). Send it to Claude.

### A2. Domain (~$10–70/year)
1. Buy a domain at **Cloudflare Registrar**, **Namecheap** or **Porkbun** (e.g. `nucleusart.ai`, `.io`, `.com`).
2. In the domain's **DNS settings**, add two records:
   - Type **A**, Name `@`, Value = *server IPv4*, TTL Auto (on Cloudflare: **DNS only**, grey cloud).
   - Type **A**, Name `www`, Value = *server IPv4*.
3. DNS can take 5–60 minutes to work. Send the domain name to Claude.

### A3. Email sending (Resend, free up to 3,000 emails/month) — required
1. Sign up at **resend.com**.
2. **Domains → Add Domain** → enter your domain → Resend shows 3–4 DNS records (TXT/MX/CNAME). Add them in your domain's DNS exactly as shown → click **Verify** (can take up to an hour).
3. **API Keys → Create API Key** (permission: Sending access) → copy the key (`re_...`). You paste it into the server settings yourself in Part B.

### A4. Google sign-in (free) — optional but recommended
1. **console.cloud.google.com** → create project `NucleusArt`.
2. **APIs & Services → OAuth consent screen** → External → app name `NucleusArt`, support email, your domain → Save. Publish the app when ready.
3. **Credentials → Create credentials → OAuth client ID** → Web application:
   - Authorized JavaScript origins: `https://nucleusart.studio`
   - Authorized redirect URIs: `https://nucleusart.studio/api/auth/callback/google`
4. Copy the **Client ID** and **Client secret**.

### A5. EvoLink
1. Top up your EvoLink balance (balance was ~385 credits on Sep 22).
2. On your live key: **Model Restrictions** → tick only the models NucleusArt offers; **Daily Quota** → set with generous headroom.

---

## Part B — Deploy (Claude runs this with you)

From the project folder on your laptop (Git Bash):

```bash
# 1. Create the production settings with fresh random passwords
node deploy/create-env.mjs nucleusart.studio

# 2. Open deploy/.env.production and fill in:
#    EVOLINK_API_KEYS, ALERT_EMAIL, RESEND_API_KEY, EMAIL_FROM
#    (and GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET if ready)

# 3. One-time server setup (Docker, firewall, swap, nightly backups)
scp deploy/server-setup.sh root@SERVER_IP:/root/
ssh root@SERVER_IP "bash /root/server-setup.sh"

# 4. Deploy (first build ~5–10 minutes; re-run this for every update)
bash deploy/deploy.sh root@SERVER_IP
```

After the first deploy:
1. Open `https://nucleusart.studio` → **Sign up** with your admin username (`davdags`) → verify the email.
2. Give the admin account credits:
   ```bash
   ssh root@SERVER_IP "cd /opt/nucleusart/deploy && docker compose -f docker-compose.prod.yml --env-file .env.production exec -T worker npx tsx scripts/admin-grant-credits.ts --user=davdags --credits=100000 --reason='launch top-up'"
   ```
3. Queue dashboard (optional): `ssh -L 3010:localhost:3010 root@SERVER_IP` then open `http://localhost:3010/admin/queues` (user `admin`, password = `BULL_BOARD_PASSWORD` in `.env.production`).

---

## Part C — Launch-day checklist

**Site & security**
- [ ] `https://nucleusart.studio` loads with the padlock; `www.` redirects to the bare domain.
- [ ] Home, Pricing, Affiliate, Terms, Privacy, Refund pages load; footer links work.
- [ ] Legal pages show your real company name and country (not `[COMPANY LEGAL NAME]`).
- [ ] Support email and social links are real (`src/lib/site-config.ts`).

**Accounts**
- [ ] Sign up with email → verification email arrives → click → **50 credits** appear.
- [ ] "Forgot password" email arrives and the reset works.
- [ ] Google sign-in works and gives 50 credits immediately.

**Generation & credits**
- [ ] New account: Model preferences show the models; no API key field anywhere.
- [ ] Story with **15s + 5s shots** → script → storyboard gives **3 panels**.
- [ ] One image generates and the credit balance drops by the expected amount.
- [ ] One 4s 480p video (sound off) generates and charges ~126 credits.
- [ ] Same with **sound on** → the character speaks the panel's line.
- [ ] **Lip sync** on a sound-off clip works (uses the public link).
- [ ] With 0 credits, a generation is refused with the "not enough credits" message.

**Operations**
- [ ] `scripts/billing-reconcile-evolink.ts` shows charged ≈ 5× EvoLink credits.
- [ ] Low-balance alert email configured (`ALERT_EMAIL`).
- [ ] Next morning: a backup file exists in `/opt/nucleusart/backups/`.
