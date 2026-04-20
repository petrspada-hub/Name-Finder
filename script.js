let names = [];
let nameGenderMap = {};   // ← MAPA: jméno → pohlaví
let white = new Set();
let black = new Set();
let filtered = [];
let selectedName = null;

const STORAGE_KEY = "jmena_app_state";
const CZ_CHARS = new Set("aábcčdďeěéfghiíjklmnňoópqrřsštťuúůvwxyýzž");

// ===== PAGINATION =====
let currentPage = 1;
let ROWS_PER_PAGE = 30;
let lastResultCount = null;

// ---------------- DIACRITICS ----------------
function removeDiacritics(text) {
  return text.normalize("NFD").replace(/\p{Diacritic}/gu, "");
}
function hasDiacritics(text) {
  return text !== removeDiacritics(text);
}

// ---------------- INIT ----------------
document.addEventListener("DOMContentLoaded", () => {
  loadState();
  bindEvents();

  fetch("jmena.csv")
    .then(r => r.text())
    .then(text => {
      names = [];
      nameGenderMap = {};

      text
        .split(/\r?\n/)
        .map(r => r.split(","))
        .filter(r => r.length >= 2 && r[0] && r[1])
        .forEach(r => {
          const g = r[0].trim().toUpperCase();
          const n = r[1].trim();
          names.push([g, n]);
          nameGenderMap[n.toLowerCase()] = g;  // ← klíčový fix
        });

      filter();
      updateExportButton();
    });
});

// ---------------- STATE ----------------
function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return;

  try {
    const data = JSON.parse(raw);
    white = new Set(data.white || []);
    black = new Set(data.black || []);
    if (data.filters) {
      for (let id in data.filters) {
        const el = document.getElementById(id);
        if (!el) continue;
        el.type === "checkbox"
          ? (el.checked = data.filters[id])
          : (el.value = data.filters[id]);
      }
    }
  } catch {}
}

function saveState() {
  const filters = {};
  document.querySelectorAll("input, select").forEach(el => {
    if (!el.id) return;
    filters[el.id] = el.type === "checkbox" ? el.checked : el.value;
  });
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ white: [...white], black: [...black], filters })
  );
}

// ---------------- FILTER ----------------
function filter() {
  const oldCount = lastResultCount;
  filtered = [];

  for (let [g, name] of names) {
    let n = name.trim();
    let t = n.toLowerCase();

    if (val("list_filter") === "Oblíbené" && !white.has(n)) continue;
    if (val("list_filter") === "Veto" && !black.has(n)) continue;

    let gender = val("gender");
    if (gender === "Chlapecká" && g !== "MUZ") continue;
    if (gender === "Dívčí" && g !== "ZENA") continue;
    if (gender === "Neutrální" && g !== "NEUTRALNI") continue;
    if (gender === "Chlapecká + N" && !(g === "MUZ" || g === "NEUTRALNI")) continue;
    if (gender === "Dívčí + N" && !(g === "ZENA" || g === "NEUTRALNI")) continue;

    if (checked("no_diacritics") && hasDiacritics(n)) continue;
    if (checked("cz_only") && [...t].some(c => !CZ_CHARS.has(c))) continue;

    if (val("start") && !t.startsWith(val("start").toLowerCase())) continue;
    if (val("contains") && !t.includes(val("contains").toLowerCase())) continue;

    let ne = val("not_end").toLowerCase().split(",").filter(Boolean);
    if (ne.some(p => t.endsWith(p))) continue;

    let nc = val("not_contains").toLowerCase().split(",").filter(Boolean);
    if (nc.some(p => t.includes(p))) continue;

    if (!checked("allow_double") && /(.)\1/.test(t)) continue;

    let len = t.length;
    if (val("exact_len") && len !== +val("exact_len")) continue;
    if (!val("exact_len")) {
      if (val("min_len") && len < +val("min_len")) continue;
      if (val("max_len") && len > +val("max_len")) continue;
    }

    let icon = g === "MUZ" ? "♂" : g === "ZENA" ? "♀" : "○";
    let mark = white.has(n) ? "⭐" : black.has(n) ? "❌" : "";
    let tag = g === "MUZ" ? "male" : g === "ZENA" ? "female" : "neutral";

    filtered.push({ icon, n, full: buildFull(n, g), mark, tag, g });
  }

  filtered.sort((a, b) => a.n.localeCompare(b.n, "cs"));
  if (oldCount !== null && oldCount !== filtered.length) currentPage = 1;
  lastResultCount = filtered.length;

  render();
  updateExportButton();
  saveState();
}

// ---------------- FULL NAME ----------------
function buildFull(n, g) {
  const m = val("sur_m");
  const f = val("sur_f");
  if (g === "MUZ") return m ? `${n} ${m}` : n;
  if (g === "ZENA") return f ? `${n} ${f}` : n;
  return (m || f) ? `${n} ${m} / ${n} ${f}` : n;
}

// ---------------- RENDER ----------------
function render() {
  const table = document.getElementById("table");
  table.innerHTML = "";
  const start = (currentPage - 1) * ROWS_PER_PAGE;
  const end = start + ROWS_PER_PAGE;

  filtered.slice(start, end).forEach(x => {
    const tr = document.createElement("tr");
    tr.className = x.tag;
    tr.innerHTML = `
      <td>${x.icon}</td>
      <td>${x.n}</td>
      <td>${x.full}</td>
      <td>${x.mark}</td>`;
    tr.onclick = () => {
      selectedName = x.n;
      document.querySelectorAll("tr").forEach(r => r.classList.remove("selected"));
      tr.classList.add("selected");
    };
    table.appendChild(tr);
  });
}

// ---------------- EXPORT ----------------
function updateExportButton() {
  document.getElementById("exportBtn").style.display =
    (white.size || black.size) ? "inline-block" : "none";
}

function exportLists() {
  if (!white.size && !black.size) return;

  const wb = XLSX.utils.book_new();

  function addSheet(set, name) {
    const rows = [["Pohlaví", "Jméno", "Celé jméno"]];
    [...set].forEach(n => {
      const g = nameGenderMap[n.toLowerCase()];
      if (!g) return;
      const gender = g === "MUZ" ? "Chlapecké" : g === "ZENA" ? "Dívčí" : "Neutrální";
      rows.push([gender, n, buildFull(n, g)]);
    });
    if (rows.length > 1)
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), name);
  }

  addSheet(white, "Oblíbené");
  addSheet(black, "Veto");

  const d = new Date();
  const stamp =
    String(d.getFullYear()).slice(2) +
    String(d.getMonth() + 1).padStart(2, "0") +
    String(d.getDate()).padStart(2, "0");

  XLSX.writeFile(wb, `Name-Finder_My-Names_${stamp}.xlsx`);
}

// ---------------- HELPERS ----------------
function bindEvents() {
  document.querySelectorAll("input, select").forEach(el =>
    el.addEventListener("input", filter)
  );
}
function val(id) { return document.getElementById(id).value; }
function checked(id) { return document.getElementById(id).checked; }

// ---------------- RANDOM ----------------
function randomPick() {
  if (filtered.length)
    document.getElementById("random").innerText =
      filtered[Math.floor(Math.random() * filtered.length)].n;
}

// ---------------- TOGGLES ----------------
function toggleWhite() {
  if (!selectedName) return;
  white.has(selectedName) ? white.delete(selectedName) : white.add(selectedName);
  black.delete(selectedName);
  updateExportButton();
  filter();
}
function toggleBlack() {
  if (!selectedName) return;
  black.has(selectedName) ? black.delete(selectedName) : black.add(selectedName);
  white.delete(selectedName);
  updateExportButton();
  filter();
}
