let names = [];
let white = new Set();
let black = new Set();
let filtered = [];
let selectedName = null;

const CZ_CHARS = new Set("aábcčdďeěéfghiíjklmnňoópqrřsštťuúůvwxyýzž");

function removeDiacritics(text) {
  return text.normalize("NFD").replace(/\p{Diacritic}/gu, "");
}

function hasDiacritics(text) {
  return text !== removeDiacritics(text);
}

// ---------------- LOAD CSV ----------------
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

// ---------------- FILTER ----------------
function filter() {
  filtered = [];

  for (let [g, name] of names) {
    if (!name) continue;

    let n = name.trim();
    let t = n.toLowerCase();

    // list filter
    if (val("list_filter") === "Oblíbené" && !white.has(n)) continue;
    if (val("list_filter") === "Veto" && !black.has(n)) continue;

    // gender
    let gender = val("gender");

    if (gender === "Chlapecká" && !(g === "MUZ" || g === "NEUTRALNI")) continue;
    if (gender === "Dívčí" && !(g === "ZENA" || g === "NEUTRALNI")) continue;
    if (gender === "Neutrální" && g !== "NEUTRALNI") continue;

    // diacritics
    if (checked("no_diacritics") && hasDiacritics(n)) continue;

    if (checked("cz_only")) {
      for (let c of n.toLowerCase()) {
        if (!CZ_CHARS.has(c)) continue;
      }
    }

    // text filters
    if (val("start") && !t.startsWith(val("start").toLowerCase())) continue;
    if (val("not_end") && t.endsWith(val("not_end").toLowerCase())) continue;
    if (val("contains") && !t.includes(val("contains").toLowerCase())) continue;
    if (val("not_contains") && t.includes(val("not_contains").toLowerCase())) continue;

    if (!checked("allow_double") && /(.)\1/.test(t)) continue;

    // length filters (OPRAVENO)
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

    filtered.push({ icon, n, full, mark, tag, g });
  }

  // správné české řazení
  filtered.sort((a, b) =>
    removeDiacritics(a.n)
      .toLowerCase()
      .localeCompare(removeDiacritics(b.n).toLowerCase(), "cs", { sensitivity: "base" })
  );

  render();
}

// ---------------- FULL NAME ----------------
function buildFull(n, g) {
  let m = val("sur_m");
  let f = val("sur_f");

  if (val("gender") === "Chlapecká") return m ? `${n} ${m}` : n;
  if (val("gender") === "Dívčí") return f ? `${n} ${f}` : n;

  if (val("gender") === "Neutrální")
    return (m || f) ? `${n} ${m} / ${n} ${f}` : n;

  if (g === "MUZ") return m ? `${n} ${m}` : n;
  if (g === "ZENA") return f ? `${n} ${f}` : n;

  return (m || f)
    ? [m ? `${n} ${m}` : n, f ? `${n} ${f}` : n].join(" / ")
    : n;
}

// ---------------- RENDER ----------------
function render() {
  let html = "";

  for (let x of filtered) {
    html += `
      <tr onclick="selectRow(this, '${x.n}')" class="${x.tag}">
        <td>${x.icon}</td>
        <td>${x.n}</td>
        <td>${x.full}</td>
        <td>${x.mark}</td>
      </tr>
    `;
  }

  document.getElementById("table").innerHTML = html;
}

// ---------------- ROW SELECTION ----------------
function selectRow(el, name) {
  selectedName = name;

  document.querySelectorAll("#table tr").forEach(r =>
    r.classList.remove("selected")
  );

  el.classList.add("selected");
}

// ---------------- HELPERS ----------------
function val(id) {
  return document.getElementById(id).value;
}

function checked(id) {
  return document.getElementById(id).checked;
}

// ---------------- EVENTS ----------------
document.querySelectorAll("input, select").forEach(el => {
  el.addEventListener("input", filter);
});

// ---------------- RANDOM ----------------
function randomPick() {
  if (!filtered.length) return;
  let x = filtered[Math.floor(Math.random() * filtered.length)];
  document.getElementById("random").innerText = x.n;
}

// ---------------- TOGGLES ----------------
function getSelected() {
  return selectedName;
}

function toggleWhite() {
  let name = getSelected();
  if (!name) return;

  if (white.has(name)) white.delete(name);
  else white.add(name);

  black.delete(name);
  filter();
}

function toggleBlack() {
  let name = getSelected();
  if (!name) return;

  if (black.has(name)) black.delete(name);
  else black.add(name);

  white.delete(name);
  filter();
}
