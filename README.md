# AprendeGeoARG 🗺️

Juego educativo para aprender los **departamentos** y **ciudades cabecera** de todas las **24 provincias** de la República Argentina.

Disponible en: https://rquiroga7.github.io/AprendeGeoARG/

## 🎯 Objetivo

Aprender de forma interactiva y divertida la división política de las provincias argentinas: ubicación geográfica de cada departamento, su nombre y su ciudad cabecera.

## 🕹️ Modos de juego

### 📍 Encontrar departamentos
Se muestra un mapa departamental y un nombre de departamento; hay que hacer clic en la ubicación correcta del mapa.

### 🏙️ Capitales
Se muestra un departamento destacado en el mapa y hay que elegir su ciudad cabecera entre varias opciones.

Ambos modos tienen **niveles progresivos**: cada nivel agrega más departamentos (ordenados de norte a sur) y exige mayor precisión.

## 🏆 Sistema de puntuación

| Intento | Puntos |
|---------|--------|
| 1° | 10 |
| 2° | 5 |
| 3° | 2 |
| 4°+ | 0 |

Puntaje máximo por ronda = total de departamentos × 10.

## 🏅 Ranking (por porcentaje)

| % del máximo | Rango |
|-------------|-------|
| < 5% | Bronce I |
| ≥ 5% | Bronce II |
| ≥ 20% | Bronce III |
| ≥ 35% | Plata I |
| ≥ 47% | Plata II |
| ≥ 57% | Plata III |
| ≥ 67% | Oro I |
| ≥ 75% | Oro II |
| ≥ 81% | Oro III |
| ≥ 86% | Diamante |
| ≥ 90% | Campeón |
| ≥ 93% | Gran Campeón |
| ≥ 96% | Leyenda Supersónica |

## 🗺️ Provincias

Todas las 24 provincias argentinas, cada una con todos sus departamentos/partidos ordenados geográficamente de norte a sur:

Buenos Aires, Catamarca, Chaco, Chubut, CABA, Córdoba, Corrientes, Entre Ríos, Formosa, Jujuy, La Pampa, La Rioja, Mendoza, Misiones, Neuquén, Río Negro, Salta, San Juan, San Luis, Santa Cruz, Santa Fe, Santiago del Estero, Tierra del Fuego, Tucumán.

Los datos cartográficos provienen de [mgaitan/departamentos_argentina](https://github.com/mgaitan/departamentos_argentina) y se convierten de GeoJSON a SVG paths.

### 🗺️ Tierra del Fuego

La provincia de Tierra del Fuego, Antártida e Islas del Atlántico Sur incluye:
- **Río Grande** y **Ushuaia** en el sector continental de la Isla Grande.
- **Islas Malvinas** e **Islas del Atlántico Sur** como departamentos insulares, mostrados en ventanas *picture-in-picture* (PIP) superpuestas al mapa principal.
- Los reclamos antárticos argentinos no se representan en el mapa.

## 🛠️ Tecnologías

- React 19 + Vite
- SVG interactivo con zoom y paneo mediante manipulación de viewBox
- Datos departamentales convertidos de GeoJSON a SVG paths (Python)
- Zoom táctil con pinza (pinch) y arrastre
- Estadísticas por provincia y modo guardadas en localStorage

## 🚀 Desarrollo

```bash
npm install
npm run dev
```

## 📦 Build y deploy

```bash
npm run build
npm run deploy
```

## 🗃️ Datos

Los archivos GeoJSON se descargan de [mgaitan/departamentos_argentina](https://github.com/mgaitan/departamentos_argentina) y se convierten a SVG paths con el script:

```bash
python3 scripts/convert_data.py
```

Esto genera los archivos en `src/data/provinces/` (un JSON por provincia) y el índice `src/data/provinces.json`. La conversión incluye:
- Proyección de coordenadas geográficas a SVG con preservación de aspecto.
- Recorte de latitudes antárticas para Tierra del Fuego.
- Extracción automática de las Islas Malvinas desde el dataset de Atlántico Sur.
- Cálculo de viewBox por departamento insular para las ventanas PIP.

## 👩‍🏫 Créditos

Hecho con ❤️ para que aprender geografía sea más divertido. Por Noelia Maldonado y Rodrigo Quiroga ([@rquiroga777](https://x.com/rquiroga777)).
