// =============================================================
// MFC 2026 - Google Apps Script for Camper Information
// =============================================================
// 
// SETUP:
// 1. Open Google Sheet → Extensions → Apps Script
// 2. Delete all code, paste this entire file
// 3. Deploy → Manage deployments → Edit → New version → Deploy
//    (Type: Web app, Execute as: Me, Who has access: Anyone)
// 4. Run testSaveAges() first to verify it works
//
// =============================================================

var SHEET_NAME = 'Ages';

// ===== Main entry points =====

function doGet(e) {
  Logger.log('doGet called');
  Logger.log('All parameters: ' + JSON.stringify(e.parameter));
  
  if (e.parameter.ref) {
    return saveAges(e.parameter);
  }
  
  return ContentService.createTextOutput(JSON.stringify({ status: 'ok' }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  Logger.log('doPost called');
  Logger.log('All parameters: ' + JSON.stringify(e.parameter));
  return saveAges(e.parameter);
}

// ===== Core save function =====

function saveAges(params) {
  try {
    var ref = params.ref || '';
    var name = params.name || '';
    var packageLabel = params.packageLabel || '';
    var groupSize = parseInt(params.groupSize) || 0;
    var nonSpicy = params.nonSpicy || 'No';
    var agesRaw = params.ages || '[]';
    var ages = JSON.parse(agesRaw);
    var gendersRaw = params.genders || '[]';
    var genders = JSON.parse(gendersRaw);
    var kidsMealsRaw = params.kidsMeals || '[]';
    var kidsMeals = JSON.parse(kidsMealsRaw);
    var timestamp = new Date().toISOString();
    
    Logger.log('Saving: ref=' + ref + ', name=' + name + ', nonSpicy=' + nonSpicy + ', ages=' + JSON.stringify(ages) + ', genders=' + JSON.stringify(genders));
    
    if (!ref) {
      Logger.log('ERROR: No ref provided');
      return ContentService.createTextOutput(JSON.stringify({ success: false, error: 'No ref' }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    var sheet = getOrCreateSheet();
    Logger.log('Using sheet: ' + sheet.getName());
    
    var existingRow = findRowByRef(sheet, ref);
    Logger.log('Existing row: ' + existingRow);
    
    // Build row data: ref, name, pkg, size, registration preference, then per-person data
    var rowData = [ref, name, packageLabel, groupSize, nonSpicy];
    for (var i = 0; i < 5; i++) {
      rowData.push(i < genders.length ? genders[i] : '');
      rowData.push(i < ages.length ? ages[i] : '');
      rowData.push(i < kidsMeals.length ? kidsMeals[i] : '');
    }
    rowData.push(timestamp);
    
    Logger.log('Row: ' + JSON.stringify(rowData));
    
    if (existingRow > 0) {
      sheet.getRange(existingRow, 1, 1, rowData.length).setValues([rowData]);
      Logger.log('Updated row ' + existingRow);
    } else {
      sheet.appendRow(rowData);
      Logger.log('Appended new row');
    }
    
    return ContentService.createTextOutput(JSON.stringify({ success: true }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (err) {
    Logger.log('ERROR: ' + err.message + '\n' + err.stack);
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ===== Helpers =====

function getOrCreateSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME);
  var headers = [[
    'Reference', 'Name', 'Package', 'Group Size', 'Non-Spicy',
    'Gender 1', 'Age 1', 'Kids Meal 1',
    'Gender 2', 'Age 2', 'Kids Meal 2',
    'Gender 3', 'Age 3', 'Kids Meal 3',
    'Gender 4', 'Age 4', 'Kids Meal 4',
    'Gender 5', 'Age 5', 'Kids Meal 5',
    'Submitted At'
  ]];
  
  if (!sheet) {
    Logger.log('Creating Ages sheet');
    sheet = ss.insertSheet(SHEET_NAME);
  }

  var existingHeaders = sheet.getRange(1, 1, 1, Math.max(1, Math.min(sheet.getMaxColumns(), headers[0].length))).getValues()[0];
  if (existingHeaders[4] === 'Gender 1') {
    Logger.log('Migrating existing Ages sheet to add Non-Spicy column');
    sheet.insertColumnAfter(4);
  }

  if (sheet.getMaxColumns() < headers[0].length) {
    sheet.insertColumnsAfter(sheet.getMaxColumns(), headers[0].length - sheet.getMaxColumns());
  }

  sheet.getRange(1, 1, 1, headers[0].length).setValues(headers);
  sheet.getRange(1, 1, 1, headers[0].length).setFontWeight('bold');
  
  return sheet;
}

function findRowByRef(sheet, ref) {
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(ref)) {
      return i + 1;
    }
  }
  return -1;
}

// ===== TEST — Run this manually to verify =====

function testSaveAges() {
  var result = saveAges({
    ref: 'TEST-004',
    name: 'Test Person',
    packageLabel: 'Cabin of 4',
    groupSize: '4',
    nonSpicy: 'Yes',
    ages: '[35, 33, 8, 5]',
    genders: '["Brother","Sister","Brother","Sister"]',
    kidsMeals: '["No","No","Yes","Yes"]'
  });
  Logger.log('Result: ' + result.getContent());
  Logger.log('Check Ages tab for TEST-004 row');
}
