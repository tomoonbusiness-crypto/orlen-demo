# Orlen — Deploy on Vercel (Static)

**Important:** Put *all* these files at the **root** of your GitHub repo.

Expected tree:
```
/index.html
/services.html
/membership.html
/request.html
/contact.html
/assets/styles.css
/assets/site.js
/assets/portals.js
/assets/orlen-logo.svg
/portal/login.html
/portal/signup.html
/portal/client.html
/portal/partner.html
/portal/admin.html
```

## Vercel settings
- **Framework Preset**: `Other`
- **Build Command**: *(leave empty)*
- **Output Directory**: `.` (root)
- Then click **Deploy**.

## Troubleshooting (CSS not loading)
1. Open your site and press **⌥⌘I** (Mac) / **Ctrl+Shift+I** (Win) → **Network** tab.
2. Reload. If you see **404** for `assets/styles.css`, your repo tree is wrong.
3. On GitHub, ensure the file exists at exactly: `assets/styles.css` (lowercase path).
4. Re-commit and redeploy from Vercel (Deployments → Redeploy).
