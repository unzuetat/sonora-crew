# Orgía Sonora — Sonora Crew

Herramienta de gestión interna para los organizadores de la fiesta San Sonorín XI (29 mayo 2026).

## Stack

- **Single HTML file** (`index.html`) — sin build, sin frameworks
- **Firebase Firestore** — proyecto `sonora-xi` (compartido con la app pública de Sonora)
- **Colecciones Firebase**: `crew_payments`, `crew_tasks`, `crew_expenses`
- **Backup**: webhook configurable (Google Apps Script → Google Sheets)
- **Hosting**: Vercel (dominio: pendiente)

## Estructura

```
index.html          — App completa (HTML + CSS + JS inline)
backup-appscript.js — Template Google Apps Script para backup a Sheets
CLAUDE.md           — Este archivo
```

## Usuarios fijos (7 organizadores)

Panda, Dsastre, Gurke, Droglo, Madalena, Cizette, Francis.
Cada uno tiene contraseña para primer acceso (guardada en localStorage tras verificar).
Las contraseñas están hasheadas en el código como pares nombre:clave.

## Ramas organizativas

Sonido, Local, Logística, Decoración, Montaje, Desmontaje, Cartel/Artistas.

## Pestañas

1. **Pagos** — Tracking de pagos de entradas (quién pagó, a quién, cantidad, nº entradas, día, observaciones)
2. **Tareas** — Board de tareas por rama con estados (pendiente/en curso/hecho) y prioridades
3. **Gastos** — Tracking de gastos por rama con desglose visual
4. **Ajustes** — Configuración de webhook de backup

## Deploy

- Branch `main` = producción en Vercel
- Branch `test/*` = desarrollo, nunca se pushea directo a main
- Repo GitHub: `unzuetat/sonora-crew`

## Notas

- Idioma fijo: castellano (sin i18n)
- Dark/light theme automático
- PWA-ready (manifest.json pendiente de ajustar)
- Los miembros del crew son fijos, no se pueden añadir/quitar desde la UI
