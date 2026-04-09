# Orgía Sonora (Sonora Crew)

Herramienta de gestión interna para los 7 organizadores de la fiesta San Sonorín XI (29 mayo 2026). Reemplaza un Excel compartido que se quedaba sin actualizar.

## Tech Stack

- **Frontend**: Single HTML file (inline CSS + JS), sin build, sin frameworks
- **Base de datos**: Firebase Firestore (proyecto `sonora-xi`, compartido con app pública Sonora)
- **Backup**: Google Apps Script → Google Sheets (cuenta musikixe@gmail.com)
- **Hosting**: Vercel (auto-deploy desde GitHub)
- **Repo**: github.com/unzuetat/sonora-crew

## Arquitectura

```
index.html              — App completa (HTML + CSS + JS inline, ~2000 líneas)
appscript/              — Proyecto clasp (Google Apps Script)
  Code.gs               — Webhook handler + snapshot diario
  appsscript.json       — Manifest
backup-appscript.js     — Copia de referencia del código Apps Script
firebase-rules/         — Reglas Firestore
CLAUDE.md               — Contexto del proyecto
```

### Colecciones Firebase
- `crew_payments` — Pagos de entradas
- `crew_tasks` — Tareas por rama
- `crew_expenses` — Gastos por rama
- `crew_decisions` — Decisiones consensuadas
- `crew_lineup_config` — Config del lineup (días + array de slots por día con duración variable). Single doc ID: "current"
- `crew_lineup_djs` — Pool compartido de DJs (nombre, estilo, notas). Sin asignación directa.
- `crew_lineup_proposals` — Propuesta por persona. Cada doc tiene `assignments` map (key: "dayIdx-slotIdx", value: DJ doc ID)

## Estado actual

### Funciona
- **Auth**: Login por username + contraseña en primer acceso (localStorage). 7 usuarios fijos: Panda, Dsastre, Gurke, Droglo, Madalena, Cizette, Francis. Contraseñas = nombre real en minúsculas.
- **Pagos**: Registro completo (quién pagó, a quién, cantidad, nº entradas, día, observaciones). Stats en tiempo real. Export CSV. Sorting por columnas.
- **Tareas**: 8 ramas (sonido, local, logística, decoración, montaje, desmontaje, cartel/artistas, otros). Multi-asignación con crew chips. Sin asignar + "Me la pido" para auto-asignarse. Estados: pendiente → en curso → hecho. Prioridades: normal/alta/urgente. Filtros por rama y estado.
- **Gastos**: Tracking por rama. Desglose visual con barras. Estados: pagado/pendiente/a reembolsar. Export CSV.
- **Decisiones**: Registro con título, detalle/contexto, rama, estado (aprobada/en debate/descartada). Cambio rápido de estado.
- **Lineup**: Gestión de DJs y slots con propuestas por persona. Config de días con slots de duración variable (30m/1h/1.5h/2h/2.5h/3h mezclables). Pool compartido de DJs (nombre, estilo, notas). Cada organizador crea su propuesta y asigna DJs a slots. Vista "Comparar" muestra todas las propuestas en tabla lado a lado. Stats de horas/slots/disponibilidad. Reset completo para nueva fiesta.
- **Backup tiempo real**: Webhook a Google Sheets — cada pago y gasto se envía al instante. URL hardcodeada en la app.
- **Backup diario**: Snapshot cada 24h (4:00 AM) que crea pestaña "Log YYYY-MM-DD" con copia de pagos y gastos. Mantiene últimos 30 días.
- **UI**: Dark/light theme. Responsive. Logo Orgía (dorado) Sonora (morado). Topbar con "eres: [nombre]".
- **Firebase rules**: Actualizadas via API REST, permiten lectura/escritura en todas las colecciones crew_*.
- **Deploy**: Producción en Vercel, auto-deploy desde main.

### Pendiente
- **Activar trigger diario**: Telmo debe ejecutar `installDailyTrigger` desde el editor de Apps Script (musikixe@gmail.com) para activar el snapshot cada 24h.
- **Verificar webhook**: Comprobar que los datos de pagos/gastos llegan correctamente al Google Sheet "Sonora Crew Backup".
- **PWA**: manifest.json pendiente de crear para instalar como app en móvil (icono home screen).
- **Resumen quién debe a quién**: Telmo mostró interés, no implementado.
- **Categorías en pagos**: Se preguntó si quería categorías por rama en pagos (ej: pago de sonido vs bebida). Sin implementar.

## Decisiones importantes

- **Single HTML file** en vez de React/Vite: el usuario pidió "ligero pero robusto"
- **Firebase compartido** con Sonora XI: mismo proyecto, colecciones con prefijo `crew_`
- **Contraseñas en código**: primera vez solo, luego localStorage
- **Webhook hardcodeado**: todos los usuarios lo tienen sin configurar nada
- **Sin i18n**: castellano fijo, se quitó el toggle EN
- **Miembros fijos**: roster no editable desde la UI
- **Reglas Firestore abiertas** (`allow read, write: if true`): aceptable para este caso de uso
- **Backup doble**: tiempo real (cada entrada) + snapshot diario (cron 4AM, 30 días de historial)
- **Apps Script bajo musikixe@gmail.com**: clasp login y deploy manual desde esa cuenta

## Despliegues

| Entorno | URL | Rama |
|---------|-----|------|
| Producción | https://sonora-crew.vercel.app | main |
| Test | (sin URL Vercel) | test/dev |

## URLs y recursos

- **App**: https://sonora-crew.vercel.app
- **Repo**: github.com/unzuetat/sonora-crew
- **Firebase Console**: console.firebase.google.com (proyecto sonora-xi, cuenta musikixe@gmail.com)
- **Apps Script editor**: script.google.com (proyecto "Sonora Crew Backup", cuenta musikixe@gmail.com)
- **Apps Script ID**: 1z_Ines3l1JsHpC7yFD8ygzJPxNDQ60zZxKlCfJxaAauZe_P3T4QLyVOG
- **Google Sheet backup**: Drive de musikixe@gmail.com, archivo "Sonora Crew Backup"
- **Webhook URL**: https://script.google.com/macros/s/AKfycbwow1eAN2ww4aZF0QtsKPC7JO0KODKFltwhpEJRKCT7NoRJPLpq5PKagggGoQIF1gjy_A/exec
- **App pública Sonora XI**: proyecto separado en /Users/telmo/Projects/Sonora
