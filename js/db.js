/* IndexedDB data layer for MFC 2026 Camp App */

const DB_NAME = 'mfc2026';
const DB_VERSION = 2;

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('checkins')) {
        db.createObjectStore('checkins', { keyPath: 'qrId' });
      }
      if (!db.objectStoreNames.contains('mealScans')) {
        const store = db.createObjectStore('mealScans', { keyPath: 'id', autoIncrement: true });
        store.createIndex('byQrMeal', ['qrId', 'mealId'], { unique: false });
        store.createIndex('byMeal', 'mealId', { unique: false });
      }
      if (!db.objectStoreNames.contains('cabinAssignments')) {
        const store = db.createObjectStore('cabinAssignments', { keyPath: 'qrId' });
        store.createIndex('byCabin', 'cabinNumber', { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function addCheckin(qrId) {
  const db = await openDB();
  const existing = await getCheckin(qrId);
  if (existing) return { duplicate: true, time: existing.time };

  return new Promise((resolve, reject) => {
    const tx = db.transaction('checkins', 'readwrite');
    const time = new Date().toISOString();
    tx.objectStore('checkins').put({ qrId, time });
    tx.oncomplete = () => resolve({ duplicate: false, time });
    tx.onerror = () => reject(tx.error);
  });
}

async function getCheckin(qrId) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('checkins', 'readonly');
    const req = tx.objectStore('checkins').get(qrId);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}

async function getAllCheckins() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('checkins', 'readonly');
    const req = tx.objectStore('checkins').getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function addMealScan(qrId, mealId) {
  const db = await openDB();
  const count = await getMealScanCount(qrId, mealId);
  const participant = PARTICIPANTS[qrId];
  if (!participant) return { error: 'Unknown QR code' };
  if (!participant.mealsAllowed.includes(mealId)) return { error: 'Not eligible for this meal' };
  if (count >= participant.groupSize) return { error: `All ${participant.groupSize} tokens used` };

  return new Promise((resolve, reject) => {
    const tx = db.transaction('mealScans', 'readwrite');
    const record = {
      qrId,
      mealId,
      tokenNumber: count + 1,
      time: new Date().toISOString(),
    };
    tx.objectStore('mealScans').add(record);
    tx.oncomplete = () => resolve({
      success: true,
      tokenNumber: record.tokenNumber,
      groupSize: participant.groupSize,
      time: record.time,
    });
    tx.onerror = () => reject(tx.error);
  });
}

async function getMealScanCount(qrId, mealId) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('mealScans', 'readonly');
    const idx = tx.objectStore('mealScans').index('byQrMeal');
    const req = idx.getAll([qrId, mealId]);
    req.onsuccess = () => resolve(req.result.length);
    req.onerror = () => reject(req.error);
  });
}

async function getAllMealScans() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('mealScans', 'readonly');
    const req = tx.objectStore('mealScans').getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function getMealScansForQr(qrId) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('mealScans', 'readonly');
    const req = tx.objectStore('mealScans').getAll();
    req.onsuccess = () => {
      resolve(req.result.filter(s => s.qrId === qrId));
    };
    req.onerror = () => reject(req.error);
  });
}

async function exportCSV() {
  const checkins = await getAllCheckins();
  const scans = await getAllMealScans();
  const assignments = await getAllCabinAssignments();

  const checkinMap = {};
  checkins.forEach(c => { checkinMap[c.qrId] = c.time; });

  const assignMap = {};
  assignments.forEach(a => { assignMap[a.qrId] = a.cabinNumber; });

  const scanMap = {};
  scans.forEach(s => {
    if (!scanMap[s.qrId]) scanMap[s.qrId] = {};
    if (!scanMap[s.qrId][s.mealId]) scanMap[s.qrId][s.mealId] = 0;
    scanMap[s.qrId][s.mealId]++;
  });

  const mealIds = MEALS.map(m => m.id);
  let csv = 'QR_ID,GroupLead,Package,GroupSize,Cabin,CheckInTime';
  mealIds.forEach(m => { csv += ',' + m; });
  csv += '\n';

  Object.values(PARTICIPANTS).forEach(p => {
    csv += `${p.qrId},"${p.name}",${p.package},${p.groupSize},${assignMap[p.qrId] || ''},${checkinMap[p.qrId] || ''}`;
    mealIds.forEach(m => {
      csv += ',' + ((scanMap[p.qrId] && scanMap[p.qrId][m]) || 0);
    });
    csv += '\n';
  });

  return csv;
}

// ===== Cabin Assignments =====

async function assignCabin(qrId, cabinNumber) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('cabinAssignments', 'readwrite');
    tx.objectStore('cabinAssignments').put({ qrId, cabinNumber });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function unassignCabin(qrId) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('cabinAssignments', 'readwrite');
    tx.objectStore('cabinAssignments').delete(qrId);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function getCabinAssignment(qrId) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('cabinAssignments', 'readonly');
    const req = tx.objectStore('cabinAssignments').get(qrId);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}

async function getAllCabinAssignments() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('cabinAssignments', 'readonly');
    const req = tx.objectStore('cabinAssignments').getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
