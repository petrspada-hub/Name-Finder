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
      .split("\n")
      .map(r => r.split(","))
      .filter(r => r.length >= 2)
      .map(r => {
        const gender = r[0].trim();              // DRUH_JMENA
        const raw = r[1].trim().toLowerCase();   // JMENO
        const name = raw.charAt(0).toUpperCase() + raw.slice(1);
        return [gender, name];
      });

    filter();
  });

// ---------------- FILTER ----------------
function filter() {
  const genderSel = val("gender");
  filtered = [];

  for (let [g, n] of names) {
    if (!n) continue;

    const t = n.toLowerCase();
    const len = n.length;

    // --- seznamy ---
    if (val("list_filter") === "Oblíbené" && !white.has(n)) continue;
    if (val("list_filter") === "Veto" && !black.has(n)) continue;

    // --- pohlaví ---
    if (genderSel === "Chlapecká" && !(g === "MUZ" || g === "NEUTRALNI")) continue;
    if (genderSel === "Dívčí" && !(g === "ZENA" || g === "NEUTRALNI")) continue;
    if (genderSel === "Neutrální" && g !== "NEUTRALNI") continue;

    // --- diakritika ---
    if (checked("no_diacritics") && hasDiacritics(n)) continue;

    // --- CZ znaky ---
    if (checked("cz_only")) {
      let ok = true;
      for (let c of t) {
        if (!CZ_CHARS.has(c)) {
          ok = false;
          break;
        }
      }
      if (!ok) continue;
    }

    // --- textové filtry ---
    if (val("start") && !t.startsWith(val("start").toLowerCase())) continue;
    if (val("not_end") && t.endsWith(val("not_end").toLowerCase())) continue;
    if (val("contains") && !t.includes(val("contains").toLowerCase())) continue;
    if (val("not_contains") && t.includes(val("not_contains").toLowerCase())) continue;

    // ✅ --- DÉLKY (OPRAVENO) ---
    if (val("exact_len") && len !== Number(val("exact_len"))) continue;
    if (val("min_len") && len < Number(val("min_len"))) continue;
    if (val("max_len") && len > Number(val("max_len"))) continue;

    if (!checked("allow_double") && /(.)\1/.test(t)) continue;

    const icon = g === "MUZ" ? "♂" : g === "ZENA" ? "♀" : "○";
    const full = buildFull(n, g);
    const mark = white.has(n) ? "⭐" : black.has(n) ? "❌" : "";
    const tag = g === "MUZ" ? "male" : g === "ZENA" ? "female" : "neutral";

    filtered.push({ icon, n, full, mark, tag });
  }

  render();
}

// ---------------- FULL NAME ----------------
function buildFull(n, g) {
  let m = val("sur_m");
  let f = val("sur_f");

  if (g === "MUZ") return m ? `${n} ${m}` : n;
  if (g === "ZENA") return f ? `${n} ${f}` : n;
  return n;
}

// ---------------- RENDER ----------------
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

// ---------------- HELPERS ----------------
function val(id) {
  return document.getElementById(id).value;
}
function checked(id) {
  return document.getElementById(id).checked;
}

// ---------------- EVENTS ----------------
document.querySelectorAll("input, select")
  .forEach(el => el.addEventListener("input", filter));

// ---------------- RANDOM ----------------
function randomPick() {
  if (!filtered.length) return;
  let x = filtered[Math.floor(Math.random() * filtered.length)];
  document.getElementById("random").innerText = x.n;
}

// ---------------- SELECTION ----------------
function selectRow(name) {
  selectedName = name;
  render();
}

// ---------------- TOGGLES ----------------
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
