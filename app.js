const currency = new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', minimumFractionDigits: 2 });
const DEFAULT_ROW = () => ({
  id: (self.crypto && crypto.randomUUID ? crypto.randomUUID() : String(Math.random())),
  name: '',
  unitPrice: 0,
  quantities: Array.from({ length: 8 }, () => 0),
});

const state = { rows: [DEFAULT_ROW()] };

const els = {
  tbody: document.getElementById('table-body'),
  addRow: document.getElementById('add-row'),
  clearAll: document.getElementById('clear-all'),
  sums: Array.from({ length: 8 }, (_, i) => document.getElementById(`sum-p${i + 1}`)),
  grandBase: document.getElementById('grand-base'),
  totalBase: document.getElementById('total-base'),
  total35: document.getElementById('total-35'),
  totalPlus35: document.getElementById('total-plus-35'),
  vat7: document.getElementById('vat-7'),
  totalFinal: document.getElementById('total-final'),
};

function recalc() {
  const perPointSums = Array.from({ length: 8 }, () => 0);
  let baseTotal = 0;

  for (const row of state.rows) {
    const qtySum = row.quantities.reduce((a, b) => a + Number(b || 0), 0);
    const rowTotal = Number(row.unitPrice || 0) * qtySum;
    row._rowTotal = rowTotal;
    baseTotal += rowTotal;
    for (let i = 0; i < 8; i++) {
      perPointSums[i] += Number(row.unitPrice || 0) * Number(row.quantities[i] || 0);
    }
  }

  perPointSums.forEach((sum, i) => { els.sums[i].textContent = Math.round(sum).toLocaleString('th-TH'); });
  els.grandBase.textContent = Math.round(baseTotal).toLocaleString('th-TH');

  const p35 = baseTotal * 0.35;
  const plus35 = baseTotal + p35;
  const vat = plus35 * 0.07;
  const finalT = plus35 + vat;

  els.totalBase.textContent = currency.format(baseTotal);
  els.total35.textContent = currency.format(p35);
  els.totalPlus35.textContent = currency.format(plus35);
  els.vat7.textContent = currency.format(vat);
  els.totalFinal.textContent = currency.format(finalT);
}

function render() {
  els.tbody.innerHTML = '';
  state.rows.forEach((row, idx) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="center">${idx + 1}</td>
      <td><input type="text" value="${row.name}" data-id="${row.id}" data-field="name" placeholder="ชื่อสินค้า"></td>
      <td class="numeric"><input type="number" min="0" step="1" value="${row.unitPrice}" data-id="${row.id}" data-field="unitPrice"></td>
      ${row.quantities.map((q, i) => `<td class="numeric"><input type="number" min="0" step="1" value="${q}" data-id="${row.id}" data-field="q${i}"></td>`).join('')}
      <td class="numeric" data-id="${row.id}" data-field="rowTotal">${Math.round(row._rowTotal || 0).toLocaleString('th-TH')}</td>
      <td class="center"><button class="remove" title="ลบ" data-id="${row.id}">✕</button></td>
    `;
    els.tbody.appendChild(tr);
  });
  recalc();
}

function updateField(rowId, field, value) {
  const row = state.rows.find(r => r.id === rowId);
  if (!row) return;
  if (field === 'name') row.name = value;
  else if (field === 'unitPrice') row.unitPrice = Number(value || 0);
  else if (field.startsWith('q')) {
    const i = Number(field.slice(1));
    row.quantities[i] = Number(value || 0);
  }
}

function addRow() {
  state.rows.push(DEFAULT_ROW());
  render();
  persist();
}

function removeRow(rowId) {
  state.rows = state.rows.filter(r => r.id !== rowId);
  if (state.rows.length === 0) state.rows.push(DEFAULT_ROW());
  render();
  persist();
}

function persist() { localStorage.setItem('pricing-rows', JSON.stringify(state.rows)); }
function load() {
  try {
    const raw = localStorage.getItem('pricing-rows');
    if (!raw) return;
    const rows = JSON.parse(raw);
    if (Array.isArray(rows)) {
      state.rows = rows.map(r => ({ ...DEFAULT_ROW(), ...r, id: r.id || (crypto.randomUUID ? crypto.randomUUID() : String(Math.random())) }));
    }
  } catch {}
}

function wireEvents() {
  els.addRow.addEventListener('click', addRow);
  els.clearAll.addEventListener('click', () => {
    if (!confirm('ล้างข้อมูลทั้งหมด?')) return;
    state.rows = [DEFAULT_ROW()];
    render();
    persist();
  });

  els.tbody.addEventListener('input', (e) => {
    const t = e.target;
    if (!(t instanceof HTMLInputElement)) return;
    const rowId = t.dataset.id;
    const field = t.dataset.field;
    if (!rowId || !field) return;
    updateField(rowId, field, t.value);
    recalc();
    const row = state.rows.find(r => r.id === rowId);
    const cell = t.closest('tr')?.querySelector('[data-field="rowTotal"]');
    if (row && cell) cell.textContent = Math.round(row._rowTotal || 0).toLocaleString('th-TH');
    persist();
  });

  els.tbody.addEventListener('click', (e) => {
    const t = e.target;
    if (t instanceof HTMLElement && t.classList.contains('remove')) {
      const id = t.dataset.id;
      if (id) removeRow(id);
    }
  });
}

function init() { load(); render(); wireEvents(); }
init();