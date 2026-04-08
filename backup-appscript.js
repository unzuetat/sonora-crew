/**
 * SONORA CREW — Google Apps Script para backup automático
 *
 * INSTRUCCIONES:
 * 1. Ve a https://script.google.com y crea un nuevo proyecto
 * 2. Pega este código en el editor
 * 3. Ejecuta la función `setup()` una vez (crea la hoja automáticamente)
 * 4. Deploy > New deployment > Web app
 *    - Execute as: Me
 *    - Who has access: Anyone
 * 5. Copia la URL del deployment y pégala en SonoraCrew > Ajustes > Webhook URL
 * 6. Dale a "Probar" para verificar que funciona
 *
 * Cada pago nuevo aparecerá como una fila en la hoja de Google Sheets.
 * Si haces "Enviar todo" desde SonoraCrew, se sincronizarán todos los pagos existentes.
 */

const SHEET_NAME = 'Pagos Sonora';

function setup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
  }
  // Headers
  sheet.getRange('A1:I1').setValues([[
    'Firebase ID', 'Fecha', 'Quién paga', 'A quién',
    'Cantidad (€)', 'Nº Entradas', 'Día', 'Observaciones', 'Registrado por'
  ]]);
  sheet.getRange('A1:I1').setFontWeight('bold');
  sheet.setFrozenRows(1);
  // Format
  sheet.setColumnWidth(1, 120);
  sheet.setColumnWidth(2, 160);
  sheet.setColumnWidth(3, 140);
  sheet.setColumnWidth(4, 140);
  sheet.setColumnWidth(5, 100);
  sheet.setColumnWidth(6, 90);
  sheet.setColumnWidth(7, 120);
  sheet.setColumnWidth(8, 200);
  sheet.setColumnWidth(9, 140);
}

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(SHEET_NAME);
    if (!sheet) {
      setup();
      sheet = ss.getSheetByName(SHEET_NAME);
    }

    // Test ping
    if (data.test) {
      return ContentService.createTextOutput(JSON.stringify({ ok: true, msg: 'Webhook activo' }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // Resync: clear and re-insert all
    if (data.resync && data.payments) {
      // Clear all except header
      const lastRow = sheet.getLastRow();
      if (lastRow > 1) {
        sheet.deleteRows(2, lastRow - 1);
      }
      // Insert all payments
      data.payments.forEach(p => appendPayment(sheet, p));
      return ContentService.createTextOutput(JSON.stringify({ ok: true, count: data.payments.length }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // Single payment
    if (data.action === 'new_payment') {
      appendPayment(sheet, data);
      return ContentService.createTextOutput(JSON.stringify({ ok: true }))
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
