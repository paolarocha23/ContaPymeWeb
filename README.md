# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.

## PWA / modo sin conexión

El Service Worker se genera automáticamente con `vite-plugin-pwa` al ejecutar `npm run build`
(y también en desarrollo, porque `devOptions.enabled` está activo). Precarga la interfaz,
sus imágenes y las fuentes de Google, y responde las navegaciones con `index.html` cacheado.

Para probarlo:

1. `npm run build`
2. `npm run preview`
3. Abrir DevTools → Application → Service Workers y marcar **Offline**.
4. Recargar: la landing y el login deben seguir funcionando.

Las peticiones a `/api` **no** se cachean: necesitan el servidor y contienen datos por usuario.
Cuando no hay red, se muestra un aviso y un mensaje de error claro en lugar de `Failed to fetch`.

## URL de la API

El frontend usa `/api` por defecto (proxy de Vite a `localhost:5001`). Para apuntar a otro
backend, define `VITE_API_URL` antes de compilar:

```bash
# .env
VITE_API_URL=https://tu-backend.onrender.com/api
```

En Netlify: **Site configuration → Environment variables → Add variable**,
`VITE_API_URL` con la URL completa terminada en `/api`, y luego **rebuild/redeploy**.
Las variables `VITE_*` se incorporan al bundle en el build, así que cambiar el valor
sin reconstruir no surte efecto. El backend debe estar en HTTPS (si el frontend lo está)
y permitir CORS desde el dominio de Netlify.
