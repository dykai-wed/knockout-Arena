# KNOCKOUT ARENA 💥

A fast-paced, neon futuristic 2D physics arena brawler built with **TypeScript**, **Phaser 3**, **React**, and **Tailwind CSS**.

---

## 🚀 How to Run on GitHub Pages

GitHub Pages serves static web assets directly from your repository. Knockout Arena's client-side combat simulation, physics engine, AI bots, sound synthesis, and touch controls run entirely in the browser bundle!

### Option 1: Automatic Deployment with GitHub Actions (Recommended)

1. **Push your code to GitHub**:
   ```bash
   git init
   git add .
   git commit -m "Initial commit - Knockout Arena"
   git branch -M main
   git remote add origin https://github.com/<your-username>/<your-repo-name>.git
   git push -u origin main
   ```

2. **Enable GitHub Pages**:
   - Go to your repository on GitHub.
   - Navigate to **Settings** > **Pages** (in the left sidebar).
   - Under **Build and deployment** > **Source**, select **GitHub Actions**.

3. **That's it!**
   - The included workflow file (`.github/workflows/deploy.yml`) will automatically trigger on push.
   - Once the action finishes (~1 minute), your game is live at:
     `https://<your-username>.github.io/<your-repo-name>/`

---

### Option 2: Manual Deploy with `gh-pages`

If you prefer building and deploying manually from your terminal:

1. Install `gh-pages` dev dependency:
   ```bash
   npm install --save-dev gh-pages
   ```
2. Build the production bundle:
   ```bash
   npm run build
   ```
3. Deploy the `dist` folder:
   ```bash
   npx gh-pages -d dist
   ```

---

## 🌐 Offline vs Multiplayer on GitHub Pages

| Mode | On GitHub Pages | Details |
|---|---|---|
| **Solo Battle** | ✅ **Works 100% Offline** | Fully client-side Phaser physics simulation, 6 character classes, 5 AI bot archetypes, sound FX, and touch controls. No server required! |
| **How to Play & Practice** | ✅ **Works 100% Offline** | Interactive tutorial guide & practice configurations. |
| **Play With Friends & Quick Match** | ⚡ **Optional Backend** | GitHub Pages only serves static files (no background Node processes). To use real-time multiplayer rooms, host `server.ts` on any free platform (e.g. Render, Railway, Fly.io), and enter your backend URL in **Settings > Multiplayer Server** (or set `VITE_WS_URL`). |

---

## 💻 Local Development

1. Install dependencies:
   ```bash
   npm install
   ```
2. Run local development server (includes full-stack WebSocket multiplayer server):
   ```bash
   npm run dev
   ```
3. Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🎮 Controls

### Desktop (Keyboard & Mouse)
- **WASD / Arrow Keys**: Move combatant
- **Mouse Cursor**: Aim directional reticle
- **Left Mouse Click (LMB)**: Knockback attack
- **Shift**: Dash maneuver (25 stamina)
- **Space**: Grapple hook (20 stamina)
- **E**: Tactical ability (Overdrive, Smoke, Aegis, Magnet, etc.)
- **Esc**: Pause match

### Mobile (Smartphones & Tablets)
- **Left Virtual Joystick**: Move combatant
- **Right Action Buttons**: Attack, Dash, Grapple, and Tactical Ability
- **Haptic Vibration**: Pulse feedback on impacts, collisions, and knockbacks (can be toggled in Settings)
