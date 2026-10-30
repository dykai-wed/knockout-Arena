# KNOCKOUT ARENA 💥

A fast-paced, cybernetic neon top-down arena combat game built with **React 19**, **TypeScript**, **Phaser 3 / 4**, **Tailwind CSS**, and **Web Audio API**.

Battle with kinetic knockback melee attacks, grapple-hook maneuvers, evasive dash bursts, character-class tactical abilities, glowing bumpers, interactive power-ups, and dynamic arena hazards (gravity wells, electric storm barriers, launch pads, shrinking sudden death). Fully playable on desktop browsers, Android smartphones/tablets, and iPhones/iPads.

---

## 🎮 Game Modes & Features

- **Solo Battle (100% Offline / Static)**: Fight against 0 to 5 configurable AI opponents (easy, normal, hard, extreme) across 5 distinct combat personalities (*Aggressor*, *Survivor*, *Opportunist*, *Controller*, *Duelist*).
- **Practice Tutorial (100% Offline / Static)**: Interactive 8-step guided combat course covering movement, primary strikes, knockback momentum, tether grappling, dash bursts, suit abilities, and hazard avoidance.
- **Play With Friends & Online Quick Match**: Real-time authoritative multiplayer room matches with custom game rules and character selection (Tracer, Vanguard, Hookshot, Vortex, Solar, Aegis).
- **Cross-Platform Responsive Controls**:
  - **Desktop**: WASD movement, mouse aiming, Left-Click (LMB) knockback attack, Right-Click (RMB) / Space grapple tether, Shift dash, E tactical ability, F contextual item collection, Esc pause.
  - **Mobile Touch (Android & iOS)**: Virtual 360° analog joystick (fixed corner or floating thumb), ergonomic right-hand combat cluster with large primary strike button, radial tactical cooldown indicator, proximity interact button, and an interactive **Edit Layout** mode to customize button positions.
- **Procedural Audio & VFX**: Zero external media files needed; sound synthesis is generated on the fly via Web Audio API oscillators, filters, noise buffers, and device vibration haptics.

---

## 🚀 GitHub Pages vs. Multiplayer Backend Architecture

| Mode / Feature | Runs on GitHub Pages? | Technical Explanation |
|---|---|---|
| **Solo Battle vs AI** | ✅ **Yes (100% Client-Side)** | All physics, AI logic, input handling, and rendering run in the browser bundle via Phaser 3 and React. No backend server needed. |
| **Combat Tutorial** | ✅ **Yes (100% Client-Side)** | Step-by-step training simulation executes entirely client-side. |
| **Settings & Key Remapping** | ✅ **Yes (100% Client-Side)** | Keybindings, touch layout, aim assist, and audio preferences are persisted to the browser's `localStorage`. |
| **Online Multiplayer (Lobbies & Quick Match)** | ⚡ **Requires WebSocket Backend** | GitHub Pages provides static file hosting only and cannot run persistent Node.js servers or WebSockets. To enable online rooms, host the included `server.ts` on any Node.js hosting platform (e.g. Render, Railway, Fly.io, Heroku) and point the frontend to it. |

---

## 🛠️ Prerequisites & Installation

- **Node.js**: Version 18.x or 20.x (LTS recommended)
- **npm**: Version 9.x or 10.x

### 1. Clone the repository
```bash
git clone https://github.com/<your-username>/<your-repo-name>.git
cd <your-repo-name>
```

### 2. Install dependencies
```bash
npm install
```

---

## 💻 Running Locally

### Development Mode (with local WebSocket multiplayer server)
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your web browser. This launches Express + WebSocket server (`server.ts`) alongside Vite middleware with hot reloading.

### Type Checking & Linting
```bash
npm run lint
```

### Production Build
```bash
npm run build
```
This generates the optimized, production-ready static bundle inside the `dist/` directory, along with a `404.html` fallback and `.nojekyll` for GitHub Pages.

### Preview Production Build Locally
```bash
npm run preview
```
Previews the static production bundle locally on [http://localhost:4173](http://localhost:4173) without starting the Node backend.

---

## 🌐 Deploying to GitHub & GitHub Pages

### Step 1: Create a GitHub Repository
1. Log in to [GitHub](https://github.com).
2. Click the **+** icon in the top-right corner and select **New repository**.
3. Name your repository (for example, `knockout-arena`).
4. Set the repository to **Public** (required for free GitHub Pages).
5. Do **not** check "Add a README file", ".gitignore", or "license" (this project already includes them).
6. Click **Create repository**.

### Step 2: Push Your Project to GitHub
In your project directory terminal, run:

```bash
git init
git add .
git commit -m "Initial release of Knockout Arena"
git branch -M main
git remote add origin https://github.com/<your-username>/<your-repo-name>.git
git push -u origin main
```
*(Replace `<your-username>` and `<your-repo-name>` with your actual GitHub username and repository name).*

### Step 3: Configure GitHub Pages in Repository Settings
To allow GitHub Actions to deploy your website automatically:

1. On GitHub, navigate to your repository.
2. Click the **Settings** tab near the top.
3. In the left navigation sidebar under "Code and automation", click **Pages**.
4. Under **Build and deployment**:
   - Change **Source** from *Deploy from a branch* to **GitHub Actions**.
5. No branch configuration is needed—the included workflow (`.github/workflows/deploy.yml`) handles everything automatically.

### Step 4: Automatic Deployment
- Once you push to the `main` (or `master`) branch, the GitHub Action automatically runs:
  1. Checks out the code.
  2. Sets up Node.js 20.
  3. Runs `npm ci` using `package-lock.json`.
  4. Executes `npm run build` to create `dist/`.
  5. Uploads the build artifact and publishes to GitHub Pages.
- You can monitor deployment progress under the **Actions** tab of your repository.
- You can also manually trigger a redeployment anytime via **Actions** > **Deploy to GitHub Pages** > **Run workflow**.

### Step 5: Finding Your Live Game URL
Once the workflow completes with a green checkmark:
- Go to **Settings** > **Pages**.
- Your published URL will be displayed at the top:
  - **Project site format**: `https://<your-username>.github.io/<your-repo-name>/`
  - **User/Org site format**: `https://<your-username>.github.io/` (if the repository is named `<your-username>.github.io`)

Because `vite.config.ts` uses relative asset resolution (`base: './'`), the game works out-of-the-box on both root domains and subfolder project URLs without breaking asset paths.

---

## 🔌 Connecting a Multiplayer Server (Optional)

When playing on GitHub Pages, solo combat and offline AI work automatically. If you want online multiplayer rooms and matchmaking:

1. **Deploy `server.ts` to a hosting provider**:
   - Deploy this repository to a free Node.js hosting platform such as [Render](https://render.com), [Railway](https://railway.app), or [Fly.io](https://fly.io).
   - Start command: `npm run start` (or `node server.ts`).
   - Port: `process.env.PORT || 3000`.
2. **Connect from the GitHub Pages game**:
   - In KNOCKOUT ARENA on GitHub Pages, open **Settings** > **Network**.
   - Enter your public WebSocket URL (for example: `wss://my-arena-server.onrender.com/ws`).
   - Click **Save & Close**.
   - Alternatively, build with an environment variable:
     ```bash
     VITE_WS_URL=wss://your-server-host.com/ws npm run build
     ```
   - When no backend server is available, the game displays a clear connection message directing the player to Solo Battle or the Server Settings panel without freezing.

---

## 🔧 Troubleshooting Common Deployment Issues

### 1. GitHub Action fails on `npm ci`
- **Cause**: Missing or desynchronized `package-lock.json`.
- **Fix**: Run `npm install` locally to ensure `package-lock.json` is updated and committed to the repository.

### 2. Blank screen or 404 on assets
- **Cause**: Absolute asset paths (`/assets/...`) instead of relative paths (`./assets/...`).
- **Fix**: The repository's `vite.config.ts` is configured with `base: './'`. Always build with `npm run build`.

### 3. Page shows 404 when refreshed
- **Cause**: GitHub Pages doesn't natively support client-side SPA routing without a fallback.
- **Fix**: The build script automatically copies `dist/index.html` to `dist/404.html`, and `public/.nojekyll` prevents Jekyll from filtering assets.

### 4. Multiplayer shows "Failed to connect"
- **Cause**: GitHub Pages is static and does not execute the Node.js backend.
- **Fix**: Play **Solo Battle** (fully supported offline) or deploy `server.ts` to a server host and configure the URL in **Settings** > **Network**.

---

## 📄 License & Credits

Built with open-source technologies: React, Phaser, Tailwind CSS, Lucide Icons, and Motion. Released under the Apache-2.0 License.
