/* MFC 2026 Camp App - Main Logic */

// ===== Navigation =====
function showScreen(screenId) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(screenId).classList.add('active');
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  const navBtn = document.querySelector(`[data-screen="${screenId}"]`);
  if (navBtn) navBtn.classList.add('active');
  stopScanner();
}

// ===== Check-In Screen =====
function startCheckin() {
  const readerEl = 'checkin-reader';
  document.getElementById(readerEl).innerHTML = '';
  document.getElementById('checkin-result').innerHTML = '';
  document.getElementById('checkin-scanner-area').style.display = 'block';

  initScanner(readerEl, async (qrId) => {
    const participant = PARTICIPANTS[qrId];
    if (!participant) {
      showCheckinResult('error', `Unknown QR code: ${qrId}`);
      return;
    }
    const result = await addCheckin(qrId);
    if (result.duplicate) {
      showCheckinResult('duplicate',
        `<strong>${participant.name}</strong><br>
         ${participant.packageLabel}<br>
         Already checked in at ${formatTime(result.time)}`);
    } else {
      showCheckinResult('success',
        `<strong>${participant.name}</strong><br>
         ${participant.packageLabel} (${participant.groupSize} people)<br>
         ✓ Checked in at ${formatTime(result.time)}`);
    }
  });

  startScanner();
}

function showCheckinResult(type, html) {
  const el = document.getElementById('checkin-result');
  el.className = `result-card ${type}`;
  el.innerHTML = html;
  document.getElementById('checkin-scanner-area').style.display = 'none';
}

// ===== Manual Lookup =====
function showManualLookup() {
  const list = Object.values(PARTICIPANTS)
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(p => `
      <div class="lookup-item" onclick="showParticipantDetail('${p.qrId}')">
        <strong>${p.name}</strong>
        <span class="tag">${p.packageLabel}</span>
      </div>
    `).join('');

  document.getElementById('checkin-result').innerHTML = `
    <input type="text" id="lookup-search" placeholder="Search by name..." oninput="filterLookup()" class="search-input">
    <div id="lookup-list">${list}</div>`;
  document.getElementById('checkin-scanner-area').style.display = 'none';
}

function filterLookup() {
  const q = document.getElementById('lookup-search').value.toLowerCase();
  document.querySelectorAll('.lookup-item').forEach(el => {
    el.style.display = el.textContent.toLowerCase().includes(q) ? '' : 'none';
  });
}

async function showParticipantDetail(qrId) {
  const p = PARTICIPANTS[qrId];
  const checkins = await getAllCheckins();
  const ci = checkins.find(c => c.qrId === qrId);
  const scans = await getAllMealScans();
  const mealCounts = {};
  scans.filter(s => s.qrId === qrId).forEach(s => {
    mealCounts[s.mealId] = (mealCounts[s.mealId] || 0) + 1;
  });
  const assignments = await getAllCabinAssignments();
  const cabin = assignments.find(a => a.qrId === qrId);

  const remaining = parseFloat(p.remainingAmount || '0');
  const paymentClass = remaining > 0 ? 'payment-due' : 'payment-clear';
  const paymentIcon = remaining > 0 ? '⚠️' : '✅';

  let mealHtml = '';
  MEALS.forEach(m => {
    const eligible = p.mealsAllowed.includes(m.id);
    if (!eligible) return;
    const used = mealCounts[m.id] || 0;
    const cls = used >= p.groupSize ? 'meal-done' : (used > 0 ? 'meal-partial' : 'meal-none');
    mealHtml += `<span class="detail-meal ${cls}">${m.name.replace(' ', '<br>')}<br>${used}/${p.groupSize}</span>`;
  });

  const html = `
    <div class="detail-card">
      <div class="detail-header">
        <h2>${p.name}</h2>
        <span class="tag">${p.packageLabel}</span>
      </div>

      <div class="detail-grid">
        <div class="detail-row">
          <span class="detail-label">📧 Email</span>
          <span class="detail-value">${p.email || '—'}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">📱 Phone</span>
          <span class="detail-value">${p.phone || '—'}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">📋 Ref</span>
          <span class="detail-value">${p.ref}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">👥 Group Size</span>
          <span class="detail-value">${p.groupSize} ${p.groupSize === 1 ? 'person' : 'people'}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">📅 Registered</span>
          <span class="detail-value">${p.registrationDate || '—'}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">🏠 Cabin</span>
          <span class="detail-value">${cabin ? 'Cabin ' + cabin.cabinNumber : 'Not assigned'}</span>
        </div>
      </div>

      <div class="detail-section">
        <div class="detail-section-title">${paymentIcon} Payment</div>
        <div class="detail-payment ${paymentClass}">
          <div class="pay-row"><span>Program Fee</span><span>$${p.programFee}</span></div>
          <div class="pay-row"><span>Amount Paid</span><span>$${p.amountPaid}</span></div>
          ${remaining > 0 ? `<div class="pay-row pay-due"><span>Remaining</span><span>$${p.remainingAmount}</span></div>` : ''}
          <div class="pay-row"><span>Status</span><span>${p.transactionStatus}</span></div>
        </div>
      </div>

      <div class="detail-section">
        <div class="detail-section-title">🍽️ Meals</div>
        <div class="detail-meals">${mealHtml}</div>
      </div>

      <div class="detail-section">
        <div class="detail-section-title">✅ Check-In</div>
        ${ci
          ? `<div class="detail-checkin checked">Checked in at ${formatTime(ci.time)}</div>`
          : `<button class="action-btn" onclick="manualCheckin('${p.qrId}')">Check In Now</button>`
        }
      </div>

      <button class="action-btn secondary" onclick="showManualLookup()" style="margin-top:12px;">← Back to List</button>
    </div>`;

  document.getElementById('checkin-result').innerHTML = html;
}

async function manualCheckin(qrId) {
  const participant = PARTICIPANTS[qrId];
  const result = await addCheckin(qrId);
  if (result.duplicate) {
    showParticipantDetail(qrId);
  } else {
    showParticipantDetail(qrId);
  }
}

// ===== Meal Tracking Screen =====
let selectedMeal = null;

function selectMeal(mealId) {
  selectedMeal = mealId;
  document.querySelectorAll('.meal-btn').forEach(b => b.classList.remove('selected'));
  document.querySelector(`[data-meal="${mealId}"]`).classList.add('selected');
  document.getElementById('meal-scan-btn').disabled = false;
  document.getElementById('meal-result').innerHTML = '';
}

function startMealScan() {
  if (!selectedMeal) return;

  const readerEl = 'meal-reader';
  document.getElementById(readerEl).innerHTML = '';
  document.getElementById('meal-result').innerHTML = '';
  document.getElementById('meal-scanner-area').style.display = 'block';

  initScanner(readerEl, async (qrId) => {
    const participant = PARTICIPANTS[qrId];
    if (!participant) {
      showMealResult('error', `Unknown QR code: ${qrId}`);
      return;
    }

    const result = await addMealScan(qrId, selectedMeal);
    if (result.error) {
      showMealResult('error',
        `<strong>${participant.name}</strong><br>
         ${participant.packageLabel}<br>
         ✗ ${result.error}`);
    } else {
      const mealName = MEALS.find(m => m.id === selectedMeal).name;
      showMealResult('success',
        `<strong>${participant.name}</strong><br>
         ${mealName}<br>
         ✓ Token ${result.tokenNumber} of ${result.groupSize} used<br>
         <small>${formatTime(result.time)}</small>`);
    }
  });

  startScanner();
}

function showMealResult(type, html) {
  const el = document.getElementById('meal-result');
  el.className = `result-card ${type}`;
  el.innerHTML = html;
  document.getElementById('meal-scanner-area').style.display = 'none';
}

// ===== Dashboard =====
async function loadDashboard() {
  const checkins = await getAllCheckins();
  const scans = await getAllMealScans();

  const checkinMap = {};
  checkins.forEach(c => { checkinMap[c.qrId] = c.time; });

  const scanMap = {};
  scans.forEach(s => {
    const key = `${s.qrId}|${s.mealId}`;
    scanMap[key] = (scanMap[key] || 0) + 1;
  });

  // Stats
  const totalRegs = Object.keys(PARTICIPANTS).length;
  const checkedIn = checkins.length;
  const totalMealScans = scans.length;
  document.getElementById('stats').innerHTML = `
    <div class="stat"><span class="stat-num">${checkedIn}</span><span class="stat-label">/ ${totalRegs} Checked In</span></div>
    <div class="stat"><span class="stat-num">${totalMealScans}</span><span class="stat-label">Total Meal Scans</span></div>
  `;

  // Table
  const participants = Object.values(PARTICIPANTS).sort((a, b) => a.name.localeCompare(b.name));
  let html = `<table class="dash-table">
    <thead><tr>
      <th>Name</th><th>Pkg</th><th>In</th>`;
  MEALS.forEach(m => { html += `<th title="${m.name}">${m.id.split('-')[1]}</th>`; });
  html += `</tr></thead><tbody>`;

  participants.forEach(p => {
    const ci = checkinMap[p.qrId];
    html += `<tr>
      <td class="name-cell">${p.name}</td>
      <td>${p.groupSize}</td>
      <td class="${ci ? 'cell-yes' : 'cell-no'}">${ci ? '✓' : ''}</td>`;
    MEALS.forEach(m => {
      const count = scanMap[`${p.qrId}|${m.id}`] || 0;
      const max = p.groupSize;
      const eligible = p.mealsAllowed.includes(m.id);
      let cls = 'cell-no';
      if (!eligible) cls = 'cell-na';
      else if (count >= max) cls = 'cell-full';
      else if (count > 0) cls = 'cell-partial';
      html += `<td class="${cls}">${eligible ? `${count}/${max}` : '—'}</td>`;
    });
    html += `</tr>`;
  });

  html += `</tbody></table>`;
  document.getElementById('dash-table-container').innerHTML = html;
}

function filterDashboard() {
  const q = document.getElementById('dash-search').value.toLowerCase();
  document.querySelectorAll('.dash-table tbody tr').forEach(tr => {
    tr.style.display = tr.textContent.toLowerCase().includes(q) ? '' : 'none';
  });
}

async function doExport() {
  const csv = await exportCSV();
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `mfc2026_export_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function confirmReset() {
  const msg = 'This will DELETE all check-ins, meal scans, and cabin assignments.\n\nAre you sure?';
  if (!confirm(msg)) return;
  if (!confirm('REALLY delete everything? This cannot be undone.')) return;
  resetAllData();
}

async function resetAllData() {
  const db = await openDB();
  const tx = db.transaction(['checkins', 'mealScans', 'cabinAssignments'], 'readwrite');
  tx.objectStore('checkins').clear();
  tx.objectStore('mealScans').clear();
  tx.objectStore('cabinAssignments').clear();
  tx.oncomplete = () => {
    alert('All data has been reset.');
    loadDashboard();
  };
}

// ===== Helpers =====
function formatTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

// ===== Cabins Screen =====
async function loadCabins() {
  const assignments = await getAllCabinAssignments();
  const assignMap = {};
  const cabinToQr = {};
  assignments.forEach(a => {
    assignMap[a.qrId] = a.cabinNumber;
    cabinToQr[a.cabinNumber] = a.qrId;
  });

  // Stats
  const needsCabin = Object.values(PARTICIPANTS).filter(p => p.package !== 4);
  const assigned = needsCabin.filter(p => assignMap[p.qrId]);
  document.getElementById('cabin-stats').innerHTML = `
    <div class="stat"><span class="stat-num">${assigned.length}</span><span class="stat-label">/ ${needsCabin.length} Assigned</span></div>
    <div class="stat"><span class="stat-num">${62 - Object.keys(cabinToQr).length}</span><span class="stat-label">Cabins Free</span></div>
  `;

  // Assignment list
  const groups = [
    { label: '4-Person Cabins Needed', participants: Object.values(PARTICIPANTS).filter(p => p.package === 2) },
    { label: '5-Person Cabins Needed', participants: Object.values(PARTICIPANTS).filter(p => p.package === 3) },
    { label: 'Singles (Shared Cabin)', participants: Object.values(PARTICIPANTS).filter(p => p.package === 1) },
  ];

  let html = '';
  groups.forEach(g => {
    html += `<div class="section-title" style="margin-top:12px;">${g.label}</div>`;
    g.participants.sort((a, b) => a.name.localeCompare(b.name)).forEach(p => {
      const cabin = assignMap[p.qrId];
      html += `
        <div class="assign-row" onclick="openCabinPicker('${p.qrId}')">
          <div class="assign-info">
            <strong>${p.name}</strong>
            <span class="tag">${p.packageLabel}</span>
          </div>
          <div class="assign-cabin ${cabin ? 'assigned' : 'unassigned'}">
            ${cabin ? `Cabin ${cabin}` : 'Tap to assign'}
          </div>
        </div>`;
    });
  });
  document.getElementById('cabin-assign-list').innerHTML = html;

  // Cabin map
  renderCabinMap(cabinToQr);
}

function renderCabinMap(cabinToQr) {
  let html = '';
  const sections = [
    { label: 'Cabins 1–19 (4-person)', start: 1, end: 19 },
    { label: 'Cabins 20–42 (5-person)', start: 20, end: 42 },
    { label: 'Cabins 43–62 (4-person)', start: 43, end: 62 },
  ];

  sections.forEach(sec => {
    html += `<div class="section-title" style="margin-top:12px;">${sec.label}</div><div class="cabin-grid">`;
    for (let i = sec.start; i <= sec.end; i++) {
      const qrId = cabinToQr[i];
      const p = qrId ? PARTICIPANTS[qrId] : null;
      const cls = p ? 'cabin-cell occupied' : 'cabin-cell free';
      html += `<div class="${cls}" title="${p ? p.name : 'Free'}">
        <span class="cabin-num">${i}</span>
        <span class="cabin-occupant">${p ? p.name.split(' ')[0] : '—'}</span>
      </div>`;
    }
    html += `</div>`;
  });

  document.getElementById('cabin-grid-container').innerHTML = html;
}

async function openCabinPicker(qrId) {
  const p = PARTICIPANTS[qrId];
  const assignments = await getAllCabinAssignments();
  const occupied = new Set(assignments.map(a => a.cabinNumber));
  const current = assignments.find(a => a.qrId === qrId);
  const requiredCapacity = p.groupSize;

  // Build picker
  const available = CABINS.filter(c =>
    c.capacity >= requiredCapacity && (!occupied.has(c.number) || (current && current.cabinNumber === c.number))
  );

  let html = `<div class="cabin-picker-overlay" id="cabin-picker">
    <div class="cabin-picker">
      <div class="picker-header">
        <strong>${p.name}</strong> — ${p.packageLabel}
        <button class="picker-close" onclick="closeCabinPicker()">✕</button>
      </div>
      ${current ? `<button class="action-btn secondary" onclick="removeCabinAssignment('${qrId}')" style="margin:8px 0;">Remove current assignment (Cabin ${current.cabinNumber})</button>` : ''}
      <div class="picker-cabins">`;

  available.forEach(c => {
    const isCurrent = current && current.cabinNumber === c.number;
    html += `<button class="picker-cabin-btn ${isCurrent ? 'current' : ''}" onclick="selectCabin('${qrId}', ${c.number})">
      ${c.number} <small>(${c.type})</small>
      ${isCurrent ? ' ✓' : ''}
    </button>`;
  });

  html += `</div></div></div>`;
  document.body.insertAdjacentHTML('beforeend', html);
}

function closeCabinPicker() {
  const el = document.getElementById('cabin-picker');
  if (el) el.remove();
}

async function selectCabin(qrId, cabinNumber) {
  await assignCabin(qrId, cabinNumber);
  closeCabinPicker();
  loadCabins();
}

async function removeCabinAssignment(qrId) {
  await unassignCabin(qrId);
  closeCabinPicker();
  loadCabins();
}

function showCabinView(view) {
  document.querySelectorAll('.cabin-view').forEach(v => v.style.display = 'none');
  document.querySelectorAll('.cabin-tab').forEach(t => t.classList.remove('active'));
  document.getElementById(`cabin-${view === 'assignments' ? 'assignments' : 'map'}`).style.display = 'block';
  event.target.classList.add('active');
}

// ===== Init =====
document.addEventListener('DOMContentLoaded', () => {
  // Build meal buttons
  const mealGrid = document.getElementById('meal-grid');
  MEALS.forEach(m => {
    mealGrid.innerHTML += `
      <button class="meal-btn" data-meal="${m.id}" onclick="selectMeal('${m.id}')">
        <span class="meal-name">${m.name}</span>
        <span class="meal-day">${m.day}</span>
      </button>`;
  });

  // Nav
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const screen = btn.dataset.screen;
      showScreen(screen);
      if (screen === 'dashboard') loadDashboard();
      if (screen === 'cabins') loadCabins();
    });
  });

  showScreen('home');
});
