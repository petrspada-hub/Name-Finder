let names = [];
let white = new Set();
let black = new Set();
let filtered = [];
let selectedName = null;

const STORAGE_KEY = "jmena_app_state";
const CZ_CHARS = new Set("aábcčdďeěéfghiíjklmnňoópqrřsštťuúůvwxyýzž");

// ===== PAGINATION =====
let currentPage = 1;
const ROWS_PER_PAGE = 30;
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
      names = text
        .split(/\r?\n/)
        .map(r => r.split(","))
        .filter(r => r.length >= 2 && r[0] && r[1])
        .map(r => [r[0].trim().toUpperCase(), r[1].trim()]);
      filter();
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
        if (el.type === "checkbox") el.checked = data.filters[id];
        else el.value = data.filters[id];
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
    JSON.stringify({
      white: [...white],
      black: [...black],
      filters
    })
  );
}

// ---------------- FILTER ----------------
function filter() {
  const oldCount = lastResultCount;
  filtered = [];

  for (let [g, name] of names) {
    if (!name) continue;

    let n = name.trim().toLowerCase();
    n = n.charAt(0).toUpperCase() + n.slice(1);
    let t = n.toLowerCase();

    // list filter
    if (val("list_filter") === "Oblíbené" && !white.has(n)) continue;
    if (val("list_filter") === "Veto" && !black.has(n)) continue;

    // gender
    let gender = val("gender");
    if (gender === "Chlapecká + N" && !(g === "MUZ" || g === "NEUTRALNI")) continue;
    if (gender === "Dívčí + N" && !(g === "ZENA" || g === "NEUTRALNI")) continue;
    if (gender === "Pouze chlapecká" && g !== "MUZ") continue;
    if (gender === "Pouze dívčí" && g !== "ZENA") continue;
    if (gender === "Neutrální" && g !== "NEUTRALNI") continue;

    // diacritics
    if (checked("no_diacritics") && hasDiacritics(n)) continue;

    if (checked("cz_only")) {
      if ([...n.toLowerCase()].some(c => !CZ_CHARS.has(c))) continue;
    }

    // text filters
    if (val("start") && !t.startsWith(val("start").toLowerCase())) continue;

    let ne = val("not_end").toLowerCase().split(",").map(s => s.trim()).filter(Boolean);
    if (ne.some(p => t.endsWith(p))) continue;

    if (val("contains") && !t.includes(val("contains").toLowerCase())) continue;

    let nc = val("not_contains").toLowerCase().split(",").map(s => s.trim()).filter(Boolean);
    if (nc.some(p => t.includes(p))) continue;

    if (!checked("allow_double") && /(.)\1/.test(t)) continue;

    // length filters
    let len = t.length;
    if (val("exact_len")) {
      if (len !== parseInt(val("exact_len"))) continue;
    } else {
      if (val("min_len") && len < parseInt(val("min_len"))) continue;
      if (val("max_len") && len > parseInt(val("max_len"))) continue;
    }

    let icon = g === "MUZ" ? "♂" : g === "ZENA" ? "♀" : "○";
    let full = buildFull(n, g);
    let mark = white.has(n) ? "⭐" : black.has(n) ? "❌" : "";
    let tag = g === "MUZ" ? "male" : g === "ZENA" ? "female" : "neutral";

    filtered.push({ icon, n, full, mark, tag });
  }

  filtered.sort((a, b) =>
    a.n.localeCompare(b.n, "cs", { sensitivity: "base" })
  );

  if (oldCount !== null && oldCount !== filtered.length) {
    currentPage = 1;
  }
  lastResultCount = filtered.length;

  render();
  saveState();
}

// ---------------- FULL NAME ----------------
function buildFull(n, g) {
  let m = document.getElementById("sur_m").value;
  let f = document.getElementById("sur_f").value;
  let gender = document.getElementById("gender").value;

  if (gender === "Chlapecká + N") return g === "ZENA" ? n : (m ? `${n} ${m}` : n);
  if (gender === "Dívčí + N") return g === "MUZ" ? n : (f ? `${n} ${f}` : n);

  if (gender === "Pouze chlapecká") return m ? `${n} ${m}` : n;
  if (gender === "Pouze dívčí") return f ? `${n} ${f}` : n;

  if (gender === "Neutrální")
    return (m || f) ? `${n} ${m} / ${n} ${f}` : n;

  if (g === "MUZ") return m ? `${n} ${m}` : n;
  if (g === "ZENA") return f ? `${n} ${f}` : n;

  return (m || f)
    ? [m ? `${n} ${m}` : n, f ? `${n} ${f}` : n].join(" / ")
    : n;
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
      <td>${x.mark}</td>
    `;
    tr.addEventListener("click", () => {
      selectedName = x.n;
      document.querySelectorAll("tr").forEach(r => r.classList.remove("selected"));
      tr.classList.add("selected");
    });
    table.appendChild(tr);
  });

  renderPagination();
}

// ---------------- PAGINATION ----------------
function renderPagination() {
  let p = document.getElementById("pagination");
  if (!p) {
    p = document.createElement("div");
    p.id = "pagination";
    p.style.margin = "10px 0";
    document.body.appendChild(p);
  }

  const pages = Math.ceil(filtered.length / ROWS_PER_PAGE);
  p.innerHTML = `
    <button ${currentPage === 1 ? "disabled" : ""} onclick="prevPage()">←</button>
    Strana ${currentPage} / ${pages}
    <button ${currentPage === pages ? "disabled" : ""} onclick="nextPage()">→</button>
  `;
}

function prevPage() {
  if (currentPage > 1) {
    currentPage--;
    render();
  }
}

function nextPage() {
  const pages = Math.ceil(filtered.length / ROWS_PER_PAGE);
  if (currentPage < pages) {
    currentPage++;
    render();
  }
}

// ---------------- EVENTS ----------------
function bindEvents() {
  document.querySelectorAll("input, select").forEach(el => {
    el.addEventListener("input", filter);
  });
}

// ---------------- HELPERS ----------------
function val(id) {
  return document.getElementById(id).value;
}
function checked(id) {
  return document.getElementById(id).checked;
}

// ---------------- RANDOM ----------------
function randomPick() {
  if (!filtered.length) return;
  document.getElementById("random").innerText =
    filtered[Math.floor(Math.random() * filtered.length)].n;
}

// ---------------- TOGGLES ----------------
function toggleWhite() {
  if (!selectedName) return;
  if (white.has(selectedName)) white.delete(selectedName);
  else white.add(selectedName);
  black.delete(selectedName);
  filter();
}

function toggleBlack() {
  if (!selectedName) return;
  if (black.has(selectedName)) black.delete(selectedName);
  else black.add(selectedName);
  white.delete(selectedName);
  filter();
}
