let names = [];
let filtered = [];
let white = new Set();
let black = new Set();
let selectedName = null;

const CZ_CHARS = new Set("aábcčdďeěéfghiíjklmnňoópqrřsštťuúůvwxyýzž");

function removeDiacritics(t) {
  return t.normalize("NFD").replace(/\p{Diacritic}/gu, "");
}
function hasDiacritics(t) {
  return t !== removeDiacritics(t);
}

const val = id => document.getElementById(id).value.trim();
const checked = id => document.getElementById(id).checked;

// ---------- LOAD CSV ----------
fetch("jmena.csv")
  .then(r => r.text())
  .then(text => {
    names = text
      .split("\n")
      .map(r => r.split(","))
      .filter(r => r.length >= 2)
      .map(r => {
        const raw = r[0].trim().toLowerCase();
        const name = raw.charAt(0).toUpperCase() + raw.slice(1);
        const gender = r[1].trim();
        return [name, gender];
      });

    filter();
  });

// ---------- FILTER ----------
function filter() {
  filtered = [];

  const minLen = Number(val("min_len"));
  const maxLen = Number(val("max_len"));
  const exactLen = Number(val("exact_len"));

  for (const [n, g] of names) {
    const t = n.toLowerCase();
    const len = n.length;

    // --- délka ---
    if (val("exact_len") && len !== exactLen) continue;
    if (val("min_len") && len < minLen) continue;
    if (val("max_len") && len > maxLen) continue;

    // --- text ---
    if (val("start") && !t.startsWith(val("start").toLowerCase())) continue;
    if (val("not_end") && t.endsWith(val("not_end").toLowerCase())) continue;
    if (val("contains") && !t.includes(val("contains").toLowerCase())) continue;
    if (val("not_contains") && t.includes(val("not_contains").toLowerCase())) continue;

    // --- znaky ---
    if (checked("no_diacritics") && hasDiacritics(n)) continue;

    if (checked("cz_only")) {
      let ok = true;
      for (const c of t) {
        if (!CZ_CHARS.has(c)) {
          ok = false;
          break;
        }
      }
      if (!ok) continue;
    }

    if (!checked("allow_double") && /(.)\1/.test(t)) continue;

    // --- seznamy ---
    if (val("list_filter") === "Oblíbené" && !white.has(n)) continue;
    if (val("list_filter") === "Veto" && !black.has(n)) continue;

    // --- pohlaví ---
    const genderSel = val("gender");
    if (genderSel === "Chlapecká" && g !== "MUZ" && g !== "NEUTRALNI") continue;
    if (genderSel === "Dívčí" && g !== "ZENA" && g !== "NEUTRALNI") continue;
    if (genderSel === "Neutrální" && g !== "NEUTRALNI") continue;

    const icon = g === "MUZ" ? "♂" : g === "ZENA" ? "♀" : "○";
    const full = buildFull(n, g);
    const mark = white.has(n) ? "⭐" : black.has(n) ? "❌" : "";
    const tag = g === "MUZ" ? "male" : g === "ZENA" ? "female" : "neutral";

    filtered.push({ icon, n, full, mark, tag });
  }

  render();
}

// ---------- FULL ----------
function buildFull(n, g) {
  const m = val("sur_m");
  const f = val("sur_f");

  if (g === "MUZ") return m ? `${n} ${m}` : n;
  if (g === "ZENA") return f ? `${n} ${f}` : n;

  return (m || f)
    ? `${m ? n + " " + m : n}${m && f ? " / " : ""}${f ? n + " " + f : ""}`
    : n;
}

// ---------- RENDER ----------
function render() {
  document.getElementById("table").innerHTML = filtered.map(x => `
<tr class="${x.tag} ${x.n === selectedName ? "selected" : ""}"
    onclick="selectRow('${x.n}')">
  <td>${x.icon}</td>
  <td>${x.n}</td>
  <td>${x.full}</td>
  <td>${x.mark}</td>
</tr>`).join("");
}

// ---------- EVENTS ----------
document.querySelectorAll("input, select")
  .forEach(el => el.addEventListener("input", filter));

// ---------- RANDOM ----------
function randomPick() {
  if (!filtered.length) return;
  const x = filtered[Math.floor(Math.random() * filtered.length)];
  document.getElementById("random").innerText = x.n;
}

// ---------- SELECTION ----------
function selectRow(n) {
  selectedName = n;
  render();
}

// ---------- TOGGLES ----------
function toggleWhite() {
  if (!selectedName) return;
  white.has(selectedName) ? white.delete(selectedName) : white.add(selectedName);
  black.delete(selectedName);
  filter();
}

function toggleBlack() {
  if (!selectedName) return;
  black.has(selectedName) ? black.delete(selectedName) : black.add(selectedName);
  white.delete(selectedName);
  filter();
}
