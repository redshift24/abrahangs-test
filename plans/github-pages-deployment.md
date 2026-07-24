# GitHub Pages Deployment Guide for Abrahangs Web

## Prerequisites
- GitHub account (you have this)
- Git installed locally
- Your project folder: `c:/Users/Paras/Documents/Development/Abrahangs web`

---

## Step 1: Open a Terminal in Your Project Folder

**Option A — VSCode Integrated Terminal (Easiest):**
1. In VSCode, go to menu **Terminal** → **New Terminal**
2. The terminal will open at the bottom of VSCode, already in your project folder
3. Skip to Step 2

**Option B — PowerShell (Built into Windows 10):**
1. Open **File Explorer**
2. Navigate to: `c:/Users/Paras/Documents/Development/Abrahangs web`
3. Click in the address bar at the top (where the folder path is shown)
4. Type `powershell` and press **Enter**
5. A blue PowerShell window will open, already in your project folder

**Option C — PowerShell from Start Menu:**
1. Press the **Windows Key** to open the Start Menu
2. Type `powershell`
3. Click **Windows PowerShell**
4. In the blue window, type:
   ```powershell
   cd "c:/Users/Paras/Documents/Development/Abrahangs web"
   ```
5. Press **Enter**

---

## Step 2: Initialize Git Repository

In the terminal (PowerShell or VSCode terminal), type each command and press **Enter**:

```powershell
git init
git add .
git commit -m "Initial commit: Abrahangs Web PWA"
```

---

## Step 3: Create GitHub Repository

1. Go to https://github.com/new in your browser
2. Repository name: `abrahangs-web` (or your preferred name)
3. Set to **Public** (required for free GitHub Pages)
4. **Do NOT** initialize with README, .gitignore, or license
5. Click **Create repository**

---

## Step 4: Link Local Repo to GitHub

After creating the repo, GitHub will show you commands. In your terminal, run:

```powershell
git remote add origin https://github.com/<YOUR-USERNAME>/abrahangs-web.git
git branch -M main
git push -u origin main
```

Replace `<YOUR-USERNAME>` with your actual GitHub username.

---

## Step 5: Enable GitHub Pages

1. Go to your repository on GitHub
2. Click **Settings** → **Pages** (in the left sidebar)
3. Under **Source**, select:
   - Branch: `main`
   - Folder: `/ (root)`
4. Click **Save**

---

## Step 4: Enable GitHub Pages

1. Go to your repository on GitHub
2. Click **Settings** → **Pages** (in the left sidebar)
3. Under **Source**, select:
   - Branch: `main`
   - Folder: `/ (root)`
4. Click **Save**

---

## Step 5: Access Your Deployed App

After a few minutes, your app will be live at:

```
https://<YOUR-USERNAME>.github.io/abrahangs-web/
```

GitHub will show the URL at the top of the Pages settings page.

---

## Step 6: Verify PWA Features

Once deployed, test:
- [ ] App loads correctly at the GitHub Pages URL
- [ ] Service worker registers (check DevTools → Application → Service Workers)
- [ ] PWA install prompt appears (on mobile/desktop)
- [ ] Offline mode works after first load
- [ ] All pages navigate correctly (`index.html` → `hang-workout.html` → `history.html`)

---

## Updating Your App

When you make changes:

```bash
git add .
git commit -m "Description of changes"
git push origin main
```

GitHub Pages will automatically rebuild and deploy within a few minutes.

---

## Custom Domain (Optional)

To use a custom domain like `abrahangs.com`:

1. Buy a domain from any registrar
2. In GitHub Pages settings, add your custom domain
3. Update your domain's DNS settings:
   - Add an `A` record pointing to GitHub's IPs: `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`
   - Or add a `CNAME` record pointing to `<YOUR-USERNAME>.github.io`

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| 404 on sub-pages | Ensure `start_url` in manifest uses relative path `./hang-workout.html` |
| Service worker not registering | Must be served over HTTPS (GitHub Pages provides this) |
| PWA not installable | Check manifest is valid and served with correct MIME type |
| Images not loading | Verify paths in HTML are relative (not absolute) |

---

## Notes for Your Project

Your project is already well-configured for GitHub Pages:
- All paths in `manifest.json` are relative
- Service worker uses relative paths for caching
- No build step required — pure static files
- HTTPS is automatic on GitHub Pages (required for PWA)
