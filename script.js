let names = [];
let white = new Set();
let black = new Set();
let filtered = [];
let selectedName = null;

const STORAGE_KEY = "jmena_app_state";

const CZ_CHARS = new Set("aábcčdďeěéfghiíjklmnňoópqrřsštťuúůvwxyýzž");

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

  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    white: [...white],
    black: [...black],
    filters
  }));
}

// ---------------- FILTER ----------------
function filter() {
  filtered = [];

  for (let [g, name] of names) {
    if (!name) continue;

    let n = name.trim().toLowerCase();
    n = n.charAt(0).toUpperCase() + n.slice(1);

    let t = n.toLowerCase();

    if (val("list_filter") === "Oblíbené" && !white.has(n)) continue;
    if (val("list_filter") === "Veto" && !black.has(n)) continue;

    let gender = val("gender");

    if (gender === "Chlapecká" && !(g === "MUZ" || g === "NEUTRALNI")) continue;
    if (gender === "Dívčí" && !(g === "ZENA" || g === "NEUTRALNI")) continue;
    if (gender === "Neutrální" && g !== "NEUTRALNI") continue;

    if (checked("no_diacritics") && hasDiacritics(n)) continue;

    if (checked("cz_only")) {
      if ([...n.toLowerCase()].some(c => !CZ_CHARS.has(c))) continue;
    }

    if (val("start") && !t.startsWith(val("start").toLowerCase())) continue;
    if (val("not_end") && t.endsWith(val("not_end").toLowerCase())) continue;
    if (val("contains") && !t.includes(val("contains").toLowerCase())) continue;
    if (val("not_contains") && t.includes(val("not_contains").toLowerCase())) continue;

    if (!checked("allow_double") && /(.)\1/.test(t)) continue;

    let len = t.length;

    if (val("exact_len")) {
      if (len !== parseInt(val("exact_len"))) continue;
    } else {
      if (val("min_len") && len < parseInt(val("min_len"))) continue;
      if (val("max_len") && len > parseInt(val("max_len"))) continue;
    }

    let icon = g === "MUZ" ? "♂" : g === "ZENA" ? "♀" : "○";
    let full = n;
    let mark = white.has(n) ? "⭐" : black.has(n) ? "❌" : "";
    let tag = g === "MUZ" ? "male" : g === "ZENA" ? "female" : "neutral";

    filtered.push({ icon, n, full, mark, tag });
  }

  filtered.sort((a, b) =>
    a.n.localeCompare(b.n, "cs", { sensitivity: "base" })
  );

  render();
  saveState();
}

// ---------------- RENDER ----------------
function render() {
  const table = document.getElementById("table");
  table.innerHTML = "";

  filtered.forEach(x => {
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

      document.querySelectorAll("tr").forEach(r =>
        r.classList.remove("selected")
      );
      tr.classList.add("selected");
    });

    table.appendChild(tr);
  });
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

  white.has(selectedName)
    ? white.delete(selectedName)
    : white.add(selectedName);

  black.delete(selectedName);
  filter();
}

function toggleBlack() {
  if (!selectedName) return;

  black.has(selectedName)
    ? black.delete(selectedName)
    : black.add(selectedName);

  white.delete(selectedName);
  filter();
}

// ---------------- DIACRITICS ----------------
function removeDiacritics(text) {
  return text.normalize("NFD").replace(/\p{Diacritic}/gu, "");
}

function hasDiacritics(text) {
  return text !== removeDiacritics(text);
}
