# Quick-X frontend

## PWA install + Web Push

The app is installable (Add to Home Screen) via `vite-plugin-pwa` and can receive device push notifications.

1. Generate VAPID keys once in the Backend folder:
   `npx web-push generate-vapid-keys`
2. Set on the **Backend** (Render / local `.env`):
   - `VAPID_PUBLIC_KEY`
   - `VAPID_PRIVATE_KEY`
   - `VAPID_SUBJECT=mailto:ops@quickxlearn.com`
3. Set the **same public key** on the Frontend build env:
   - `VITE_VAPID_PUBLIC_KEY=<public key>`
4. Deploy over **HTTPS**. On iOS, users must Add to Home Screen before push works (Safari 16.4+).

See also `Backend/.env.example` and `.env.example` in this folder.

---

# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react/README.md) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript and enable type-aware lint rules. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
