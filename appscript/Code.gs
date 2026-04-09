const SHEET_NAME = 'Pagos Sonora';
const SHEET_GASTOS = 'Gastos Sonora';
const LOG_PREFIX = 'Log ';
const MAX_LOGS = 30; // Mantener últimos 30 días de snapshots

function setup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // Hoja de pagos
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(SHEET_NAME);
  sheet.getRange('A1:I1').setValues([[
    'Firebase ID', 'Fecha', 'Quién paga', 'A quién',
    'Cantidad (€)', 'Nº Entradas', 'Día', 'Observaciones', 'Registrado por'
  ]]);
  sheet.getRange('A1:I1').setFontWeight('bold');
  sheet.setFrozenRows(1);

  // Hoja de gastos
  let sheet2 = ss.getSheetByName(SHEET_GASTOS);
  if (!sheet2) sheet2 = ss.insertSheet(SHEET_GASTOS);
  sheet2.getRange('A1:I1').setValues([[
    'Firebase ID', 'Fecha', 'Concepto', 'Rama',
    'Cantidad (€)', 'Pagado por', 'Estado', 'Notas', 'Registrado por'
  ]]);
  sheet2.getRange('A1:I1').setFontWeight('bold');
  sheet2.setFrozenRows(1);
}

/**
 * SNAPSHOT DIARIO — se ejecuta cada 24h via trigger
 * Crea una pestaña "Log YYYY-MM-DD" con copia de pagos y gastos.
 * Mantiene los últimos MAX_LOGS días y borra los más antiguos.
 */
function dailySnapshot() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const today = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
  const logName = LOG_PREFIX + today;

  // Si ya existe el log de hoy, borrarlo para recrear
  const existing = ss.getSheetByName(logName);
  if (existing) ss.deleteSheet(existing);

  // Crear nueva hoja de log
  const logSheet = ss.insertSheet(logName);

  // Copiar pagos
  const pagos = ss.getSheetByName(SHEET_NAME);
  if (pagos && pagos.getLastRow() > 0) {
    const pagosData = pagos.getDataRange().getValues();
    logSheet.getRange(1, 1, 1, 1).setValue('═══ PAGOS ═══');
    logSheet.getRange(1, 1).setFontWeight('bold').setFontSize(12);
    if (pagosData.length > 0) {
      logSheet.getRange(2, 1, pagosData.length, pagosData[0].length).setValues(pagosData);
      logSheet.getRange(2, 1, 1, pagosData[0].length).setFontWeight('bold');
    }
  }

  // Copiar gastos
  const gastos = ss.getSheetByName(SHEET_GASTOS);
  const startRow = (pagos ? pagos.getLastRow() : 0) + 4;
  if (gastos && gastos.getLastRow() > 0) {
    const gastosData = gastos.getDataRange().getValues();
    logSheet.getRange(startRow, 1, 1, 1).setValue('═══ GASTOS ═══');
    logSheet.getRange(startRow, 1).setFontWeight('bold').setFontSize(12);
    if (gastosData.length > 0) {
      logSheet.getRange(startRow + 1, 1, gastosData.length, gastosData[0].length).setValues(gastosData);
      logSheet.getRange(startRow + 1, 1, 1, gastosData[0].length).setFontWeight('bold');
    }
  }

  // Timestamp
  logSheet.getRange(startRow + (gastos ? gastos.getLastRow() : 0) + 3, 1)
    .setValue('Snapshot generado: ' + new Date().toLocaleString('es-ES'))
    .setFontStyle('italic')
    .setFontColor('#999999');

  // Mover al final
  ss.setActiveSheet(logSheet);
  ss.moveActiveSheet(ss.getSheets().length);

  // Limpiar logs antiguos (mantener solo MAX_LOGS)
  const allSheets = ss.getSheets();
  const logSheets = allSheets
    .filter(s => s.getName().startsWith(LOG_PREFIX))
    .sort((a, b) => a.getName().localeCompare(b.getName()));

  while (logSheets.length > MAX_LOGS) {
    const oldest = logSheets.shift();
    ss.deleteSheet(oldest);
  }
}

/**
 * Instalar el trigger diario.
 * Ejecutar esta función UNA VEZ manualmente desde el editor.
 */
function installDailyTrigger() {
  // Borrar triggers existentes de dailySnapshot para no duplicar
  ScriptApp.getProjectTriggers().forEach(t => {
    if (t.getHandlerFunction() === 'dailySnapshot') {
      ScriptApp.deleteTrigger(t);
    }
  });
  // Crear trigger: cada día a las 04:00
  ScriptApp.newTrigger('dailySnapshot')
    .timeBased()
    .everyDays(1)
    .atHour(4)
    .create();
}

// ══════════════════════════════════
// WEBHOOK (tiempo real)
// ══════════════════════════════════

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const ss = SpreadsheetApp.getActiveSpreadsheet();

    // Test ping
    if (data.test) {
      return ContentService.createTextOutput(JSON.stringify({ ok: true, msg: 'Webhook activo' }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // Resync: clear and re-insert all
    if (data.resync && data.payments) {
      let sheet = ss.getSheetByName(SHEET_NAME);
      if (!sheet) { setup(); sheet = ss.getSheetByName(SHEET_NAME); }
      const lastRow = sheet.getLastRow();
      if (lastRow > 1) sheet.deleteRows(2, lastRow - 1);
      data.payments.forEach(p => appendPayment(sheet, p));
      return ContentService.createTextOutput(JSON.stringify({ ok: true, count: data.payments.length }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // Single payment
    if (data.action === 'new_payment') {
      let sheet = ss.getSheetByName(SHEET_NAME);
      if (!sheet) { setup(); sheet = ss.getSheetByName(SHEET_NAME); }
      appendPayment(sheet, data);
      return ContentService.createTextOutput(JSON.stringify({ ok: true }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // Single expense
    if (data.action === 'new_expense') {
      let sheet = ss.getSheetByName(SHEET_GASTOS);
      if (!sheet) { setup(); sheet = ss.getSheetByName(SHEET_GASTOS); }
      appendExpense(sheet, data);
      return ContentService.createTextOutput(JSON.stringify({ ok: true }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // Full backup — creates/updates sheets for all data types
    if (data.action === 'full_backup') {
      const edition = data.edition || 'Backup';
      const prefix = edition + ' — ';

      // Pagos
      if (data.payments && data.payments.length) {
        const name = prefix + 'Pagos';
        let sh = ss.getSheetByName(name);
        if (!sh) sh = ss.insertSheet(name);
        sh.clear();
        sh.appendRow(['ID', 'Fecha', 'Quién paga', 'A quién', 'Cantidad (€)', 'Entradas', 'Día', 'Observaciones', 'Registrado por']);
        sh.getRange(1, 1, 1, 9).setFontWeight('bold');
        data.payments.forEach(p => {
          const d = p.ts ? Utilities.formatDate(new Date(p.ts), Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm') : '';
          sh.appendRow([p.id||'', d, p.who||'', p.to||'', p.amount||0, p.tickets||0, p.day||'', p.obs||'', p.registeredBy||'']);
        });
      }

      // Gastos
      if (data.expenses && data.expenses.length) {
        const name = prefix + 'Gastos';
        let sh = ss.getSheetByName(name);
        if (!sh) sh = ss.insertSheet(name);
        sh.clear();
        sh.appendRow(['ID', 'Fecha', 'Concepto', 'Rama', 'Cantidad (€)', 'Pagado por', 'Estado', 'Notas', 'Registrado por']);
        sh.getRange(1, 1, 1, 9).setFontWeight('bold');
        data.expenses.forEach(e => {
          const d = e.ts ? Utilities.formatDate(new Date(e.ts), Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm') : '';
          sh.appendRow([e.id||'', d, e.concept||'', e.rama||'', e.amount||0, e.paidBy||'', e.status||'', e.notes||'', e.registeredBy||'']);
        });
      }

      // Tareas
      if (data.tasks && data.tasks.length) {
        const name = prefix + 'Tareas';
        let sh = ss.getSheetByName(name);
        if (!sh) sh = ss.insertSheet(name);
        sh.clear();
        sh.appendRow(['ID', 'Tarea', 'Rama', 'Estado', 'Prioridad', 'Responsables', 'Notas', 'Creado por']);
        sh.getRange(1, 1, 1, 8).setFontWeight('bold');
        data.tasks.forEach(t => {
          const assigned = Array.isArray(t.assigned) ? t.assigned.join(', ') : (t.assigned||'');
          sh.appendRow([t.id||'', t.title||'', t.rama||'', t.status||'', t.priority||'', assigned, t.notes||'', t.createdBy||'']);
        });
      }

      // Decisiones
      if (data.decisions && data.decisions.length) {
        const name = prefix + 'Decisiones';
        let sh = ss.getSheetByName(name);
        if (!sh) sh = ss.insertSheet(name);
        sh.clear();
        sh.appendRow(['ID', 'Tema', 'Detalle', 'Rama', 'Estado', 'Creado por', 'Fecha']);
        sh.getRange(1, 1, 1, 7).setFontWeight('bold');
        data.decisions.forEach(dec => {
          const d = dec.ts ? Utilities.formatDate(new Date(dec.ts), Session.getScriptTimeZone(), 'dd/MM/yyyy') : '';
          sh.appendRow([dec.id||'', dec.title||'', dec.detail||'', dec.rama||'', dec.status||'', dec.createdBy||'', d]);
        });
      }

      // Encuestas
      if (data.polls && data.polls.length) {
        const name = prefix + 'Encuestas';
        let sh = ss.getSheetByName(name);
        if (!sh) sh = ss.insertSheet(name);
        sh.clear();
        sh.appendRow(['ID', 'Tema', 'Detalle', 'Autor', 'Votos', 'Nº votos', 'Fecha']);
        sh.getRange(1, 1, 1, 7).setFontWeight('bold');
        data.polls.forEach(p => {
          const d = p.ts ? Utilities.formatDate(new Date(p.ts), Session.getScriptTimeZone(), 'dd/MM/yyyy') : '';
          const votes = Array.isArray(p.votes) ? p.votes.join(', ') : '';
          sh.appendRow([p.id||'', p.topic||'', p.detail||'', p.author||'', votes, (p.votes||[]).length, d]);
        });
      }

      // Lineup DJs
      if (data.lineup_djs && data.lineup_djs.length) {
        const name = prefix + 'DJs';
        let sh = ss.getSheetByName(name);
        if (!sh) sh = ss.insertSheet(name);
        sh.clear();
        sh.appendRow(['ID', 'Nombre', 'Estilo', 'Notas', 'Añadido por']);
        sh.getRange(1, 1, 1, 5).setFontWeight('bold');
        data.lineup_djs.forEach(dj => {
          sh.appendRow([dj.id||'', dj.name||'', dj.style||'', dj.comments||'', dj.addedBy||'']);
        });
      }

      return ContentService.createTextOutput(JSON.stringify({ ok: true, msg: 'Full backup saved', edition }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    return ContentService.createTextOutput(JSON.stringify({ ok: true, msg: 'No action' }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ ok: false, error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function appendPayment(sheet, p) {
  const date = p.ts ? new Date(p.ts) : new Date();
  const dateStr = Utilities.formatDate(date, Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm');
  sheet.appendRow([
    p.firebaseId || p.id || '',
    dateStr,
    p.who || '',
    p.to || '',
    p.amount || 0,
    p.tickets || 0,
    p.day || '',
    p.obs || '',
    p.registeredBy || ''
  ]);
}

function appendExpense(sheet, e) {
  const date = e.ts ? new Date(e.ts) : new Date();
  const dateStr = Utilities.formatDate(date, Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm');
  sheet.appendRow([
    e.firebaseId || e.id || '',
    dateStr,
    e.concept || '',
    e.rama || '',
    e.amount || 0,
    e.paidBy || '',
    e.status || '',
    e.notes || '',
    e.registeredBy || ''
  ]);
}
