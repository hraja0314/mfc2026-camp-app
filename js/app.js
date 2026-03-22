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
      <div class="lookup-item" onclick="manualCheckin('${p.qrId}')">
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

async function manualCheckin(qrId) {
  const participant = PARTICIPANTS[qrId];
  const result = await addCheckin(qrId);
  if (result.duplicate) {
    showCheckinResult('duplicate',
      `<strong>${participant.name}</strong><br>Already checked in at ${formatTime(result.time)}`);
  } else {
    showCheckinResult('success',
      `<strong>${participant.name}</strong><br>✓ Checked in at ${formatTime(result.time)}`);
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

// ===== Helpers =====
function formatTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
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
    });
  });

  showScreen('home');
});
