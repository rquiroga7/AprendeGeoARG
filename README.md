# GeoAprende 🗺️

Juego educativo diseñado para que estudiantes de primaria aprendan los **departamentos** y sus **ciudades cabecera** de la República Argentina.

## 🎯 Objetivo

El objetivo es que los chicos aprendan de forma interactiva y divertida la división política de las provincias argentinas: ubicación geográfica de cada departamento, su nombre y su ciudad cabecera.

## 🕹️ Cómo se juega

- Se muestra un mapa departamental de una provincia Argentina.
- El juego propone distintos desafíos: encontrar un departamento, identificar su cabecera, etc.
- El estudiante interactúa haciendo clic en el mapa para responder.

## 🚧 Estado del proyecto

- **Actualmente**: solo está disponible la provincia de **Córdoba** con todos sus departamentos y ciudades cabeceras.
- **Próximamente**: se agregarán todas las provincias argentinas.

## 🛠️ Tecnologías

- React 19
- Vite
- SVG interactivo con datos departamentales

## 🚀 Desarrollo

```bash
npm install
npm run dev
```

## 📦 Build y despliegue

```bash
npm run build
npm run preview   # previsualizar el build localmente
```

El proyecto está configurado para ser hosteado en **GitHub Pages**. El build genera los archivos estáticos en la carpeta `dist/`.

### Deploy manual

```bash
npm run deploy
```

### Deploy con GitHub Actions

El proyecto también puede desplegarse automáticamente con GitHub Actions. Ver [la documentación oficial](https://vite.dev/guide/static-deploy.html#github-pages).

---

Hecho con ❤️ para que aprender geografía sea más divertido. Por Rodrigo Quiroga ([@rquiroga777](https://x.com/rquiroga777) en Twitter/X).
