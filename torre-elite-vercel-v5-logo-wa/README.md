# Torre Élite (React + Vite) — Vercel robusto

## Vercel
- Framework Preset: **Vite**
- Build Command: `npm run build`
- Output Directory: `dist`

## Datos
- `public/apartments.json` (incluido)
- Planos en `public/planos/` (incluidos placeholders para todos los IDs)
- La app intenta cargar datos desde varias rutas:
  - `${import.meta.env.BASE_URL}apartments.json`
  - `/apartments.json`
  - `apartments.json`
- Si falla, muestra un cuadro de error con la causa.

## Local
```bash
npm install
npm run dev
```

## Personalizar
- Cambia `wa.me/50400000000` en `src/App.jsx` por tu número de ventas.
- Colores: Disponible = verde; Reservado = rosado.
- Precio vacío se muestra como "—".
