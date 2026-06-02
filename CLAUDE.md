# Orgía Sonora (Sonora Crew)

Herramienta de gestión interna para los 7 organizadores de las fiestas "San Sonorín". Reemplaza un Excel compartido que se quedaba sin actualizar. La primera edición gestionada fue **San Sonorín XI** (mayo 2026, ya celebrada); el sistema es **multi-edición** y ahora se trabaja en la siguiente ("Fiesta para SEPTIEMBRE").

## Tech Stack

- **Frontend**: Single HTML file (inline CSS + JS), sin build, sin frameworks
- **Base de datos**: Firebase Firestore (proyecto `sonora-xi`, compartido con app pública Sonora)
- **Backup**: Google Apps Script → Google Sheets (cuenta musikixe@gmail.com)
- **Hosting**: Vercel (auto-deploy desde GitHub)
- **Repo**: github.com/unzuetat/sonora-crew

## Arquitectura

```
index.html              — App completa (HTML + CSS + JS inline, ~5.400 líneas)
appscript/              — Proyecto clasp (Google Apps Script)
backup-appscript.js     — Copia de referencia del código Apps Script
firebase-rules/         — Reglas Firestore (firestore.rules) + firebase.json
informe/                — Generador del informe retrospectivo (generar-informe.js).
                          El HTML renderizado NO se versiona (lleva datos personales).
CLAUDE.md               — Contexto del proyecto
```

### Modelo de ediciones (importante)
- Colección global `sonora_editions`: docs `{ name, prefix, ts }`. La edición base (San Sonorín XI) usa prefijo `crew`; el resto `crew_<slug>`.
- Cada edición vive en colecciones con su prefijo: `<prefix>_payments`, `_expenses`, `_tasks`, `_decisions`, `_polls`, `_settings`, `_lineup_config`, `_lineup_djs`, `_lineup_proposals`, `_milestones`. Helpers `eCol()`/`eDoc()` usan `EDITION_PREFIX` (por dispositivo, en localStorage).
- **Edición de trabajo compartida** (`sonora_config/current` → `{ tasksPrefix, tasksEditionName }`): un puntero **compartido por los 7 vía Firebase** que gobierna **Tareas** e **Hitos** (helpers `tCol()`/`tDoc()`), independiente del resto de la app. Permite trabajar las tareas/hitos de la próxima fiesta mientras pagos/gastos siguen en la edición anterior. **Decisiones** no cambian de colección: se etiquetan con la edición (`edicion`) y las de ediciones anteriores se ven atenuadas.
- **Albergues** (`crew_hostels`): lista **global**, NO por edición (conocimiento de sitios reutilizable entre fiestas).

## Estado actual

### Funciona
- **Multi-edición**: selector en topbar; cada edición con datos independientes. Edición de trabajo compartida para Tareas/Hitos.
- **Auth**: login username + contraseña la 1ª vez (localStorage). 7 usuarios fijos: Panda, Dsastre, Gurke, Droglo, Magdalena, Cizette, Francis.
- **Pagos**: registro completo, stats, export CSV, sorting, display % bote.
- **Gastos**: reales + previsiones; convertir previsión en real guardando desviaciones; stats coloreadas; barra dual real/previsión; desglose por rama; CSV.
- **Saldar cuentas**: por persona, recaudado (pagos cobrados) vs adelantado (gastos pagados) → balance neto + transferencias mínimas (algoritmo greedy).
- **Tareas**: 8 ramas, multi-asignación, estados (pendiente→en curso→hecho), prioridades, filtros, edición inline con historial, "Me la pido". **Carga**: talla S/M/L (1/2/3) + marrón; vista **"Carga del equipo"** (puntos por persona repartidos entre responsables, marrones, media), enfocada a ver quién va cargado y echarle una mano (no a señalar a quien hace menos).
- **Hitos**: hitos a mano con fecha consensuada (con historial de cambios). Lista de cuenta atrás + línea de tiempo SVG. Siguen la edición de trabajo compartida.
- **Albergues**: directorio global comparativo. 3 ejes diferenciados → **Comunicación con dueños** (flujo de contacto), **Aptitud** (apto/sin valorar/descartado — vale para todas las ediciones, descartado en rojo y al fondo) y **Disponibilidad** (por fechas: disponible/sin info/sin propietario/no disponible). Características sí/no (piscina, permite fiestas, cocina, exterior, aparcamiento, vecinos cerca — esta con polaridad invertida: No = bueno). Datos (camas, precio, distancia de Valencia, web), pros/contras, seguimiento (quién contacta, fecha último contacto, qué se dijo/quedó), preseleccionado ⭐, filtros por los 3 ejes y resumen.
- **Decisiones**: registro con rama/estado, filtros; etiquetadas por edición; histórico de ediciones anteriores atenuado con toggle.
- **Encuestas**: votación entre los 7. Mayoría/consenso → Decisión.
- **Lineup por fiesta**: días agrupados por fiesta/evento; pool compartido de DJs; propuestas por fiesta; BPM por slot con escala de color (verde ≤130, amarillo ≤144, naranja ≤155, rojo >155); likes; vista comparar.
- **Badges de notificación** en topbar (tareas propias/compartidas, encuestas, lineup sin propuesta).
- **Ajustes**: % bote, bote previo, presupuesto, límites por rama (doc `settings/current` por edición).
- **Backup**: webhook tiempo real + snapshot diario + JSON completo + Enviar a Drive.
- **UI**: dark/light, responsive, tabs sticky. Orden de pestañas: **Albergues · Tareas · Hitos · Pagos · Gastos · Decisiones · Encuestas · Lineup · Saldar cuentas · Ajustes** (abre en Albergues).
- **Reglas Firestore**: separadas web/crew (ver Decisiones). Deploy: producción en Vercel, auto-deploy desde `main`.

### Pendiente
- **Cerrar cuentas de San Sonorín XI**: falta registrar el **alquiler del local (~2.392 €, aún como previsión)** y otros gastos sueltos; hasta entonces "Saldar cuentas" no propone transferencias (todos figuran con cash de la org). Magdalena adelantó ~60% del gasto real.
- **Archivado ligero**: marcar San Sonorín XI como edición archivada (no implementado).
- **Activar trigger diario**: ejecutar `installDailyTrigger` en Apps Script (musikixe@gmail.com).
- **Verificar webhook**: comprobar que pagos/gastos llegan al Google Sheet "Sonora Crew Backup".
- **PWA**: manifest.json para instalar como app en móvil.

## Decisiones importantes

- **Single HTML file** en vez de React/Vite: "ligero pero robusto".
- **Firebase compartido** con Sonora XI: mismo proyecto, colecciones con prefijo `crew_`.
- **Multi-edición con prefijo dinámico** (`eCol`/`eDoc`) + **edición de trabajo compartida** para Tareas/Hitos vía `sonora_config` (`tCol`/`tDoc`). Decisiones se etiquetan por edición (no cambian de colección).
- **Albergues = lista global** (`crew_hostels`), no por edición. 3 ejes: **aptitud** (propiedad del sitio, para siempre) ≠ **disponibilidad** (por fechas) ≠ **comunicación** (flujo con dueños). "Vecinos cerca": un No es lo bueno (verde).
- **Carga de tareas**: talla S/M/L + marrón; el balance resalta a quien va cargado para ayudarle (ámbar + 🤝), no marca en rojo a quien hace menos.
- **Reglas Firestore separadas web/crew** (en `firebase-rules/firestore.rules`): la web pública mantiene reglas estrictas con Firebase Auth; la crew tiene un bloque independiente `if col.matches('crew_.*') || sonora_editions || sonora_config` (sin auth, a nivel UI) que cubre cualquier colección/edición futura. **Las reglas reales se publican a mano en Firebase Console** (la crew no usa Firebase Auth; auth solo a nivel de UI).
- **Rename de etiquetas conserva id interno**: ej. la rama "Comida y bebida" sigue siendo `desmontaje` en Firebase para no migrar datos.
- **Contraseñas en código** (1ª vez, luego localStorage), **webhook hardcodeado**, **sin i18n** (castellano fijo), **miembros fijos** (roster no editable).
- **var(--primary) no existe**: usar `#8b5cf6` directamente. **script type=module**: nada de `onclick` inline, usar `addEventListener`.
- **Backup doble**: tiempo real + snapshot diario (cron 4AM, 30 días). **Apps Script bajo musikixe@gmail.com**.

## Despliegues

| Entorno | URL | Rama |
|---------|-----|------|
| Producción | https://sonora-crew.vercel.app | main |
| Test | (sin URL Vercel) | ramas `test/*` efímeras, mergeadas a main |

## URLs y recursos

- **App**: https://sonora-crew.vercel.app
- **Repo**: github.com/unzuetat/sonora-crew
- **Firebase Console**: console.firebase.google.com (proyecto sonora-xi, cuenta musikixe@gmail.com) — reglas Firestore se editan aquí
- **Apps Script editor**: script.google.com (proyecto "Sonora Crew Backup", cuenta musikixe@gmail.com)
- **Apps Script ID**: 1z_Ines3l1JsHpC7yFD8ygzJPxNDQ60zZxKlCfJxaAauZe_P3T4QLyVOG
- **Google Sheet backup**: Drive de musikixe@gmail.com, archivo "Sonora Crew Backup"
- **Webhook URL**: https://script.google.com/macros/s/AKfycbwow1eAN2ww4aZF0QtsKPC7JO0KODKFltwhpEJRKCT7NoRJPLpq5PKagggGoQIF1gjy_A/exec
- **App pública Sonora XI**: proyecto separado en /Users/telmo/Projects/Sonora
