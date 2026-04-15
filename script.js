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

// ---------- LOAD CSV ----------
fetch("jmena.csv")
  .then(r => r.text())
  .then(text => {
    names = text
      .split("\n")
      .map(r => r.split(","))
      .filter(r => r.length >= 2)
      .map(r => {
        const name = r[0].trim().toLowerCase();
        return [
          name.charAt(0).toUpperCase() + name.slice(1),
          r[1].trim()
        ];
      });
    filter();
  });

// ---------- FILTER ----------
function filter() {
  const gender = val("gender");
  filtered = [];

  for (let [n, g] of names) {
    if (!n) continue;
    let t = n.toLowerCase();
    let len = n.length;

    if (val("list_filter") === "Oblíbené" && !white.has(n)) continue;
    if (val("list_filter") === "Veto" && !black.has(n)) continue;

    if (gender === "Chlapecká" && !(g === "MUZ" || g === "NEUTRALNI")) continue;
    if (gender === "Dívčí" && !(g === "ZENA" || g === "NEUTRALNI")) continue;
    if (gender === "Neutrální" && g !== "NEUTRALNI") continue;

    if (checked("no_diacritics") && hasDiacritics(n)) continue;

    if (checked("cz_only")) {
      for (let c of t) {
        if (!CZ_CHARS.has(c)) continue;
      }
    }

    if (val("start") && !t.startsWith(val("start").toLowerCase())) continue;
    if (val("not_end") && t.endsWith(val("not_end").toLowerCase())) continue;
    if (val("contains") && !t.includes(val("contains").toLowerCase())) continue;
    if (val("not_contains") && t.includes(val("not_contains").toLowerCase())) continue;

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

  filtered.sort((a, b) =>
    removeDiacritics(a.n.toLowerCase())
      .localeCompare(removeDiacritics(b.n.toLowerCase()))
  );

  render();
}

// ---------- FULL NAME ----------
function buildFull(n, g) {
  let m = val("sur_m");
  let f = val("sur_f");

  if (val("gender") === "Chlapecká") return m ? `${n} ${m}` : n;
  if (val("gender") === "Dívčí") return f ? `${n} ${f}` : n;

  if (g === "MUZ") return m ? `${n} ${m}` : n;
  if (g === "ZENA") return f ? `${n} ${f}` : n;

  return (m || f)
    ? `${m ? n + " " + m : n} / ${f ? n + " " + f : n}`
    : n;
}

// ---------- RENDER ----------
function render() {
  let html = "";
  for (let x of filtered) {
    html += `
<tr class="${x.tag} ${x.n === selectedName ? "selected" : ""}"
    onclick="selectRow('${x.n}')">
  <td>${x.icon}</td>
  <td>${x.n}</td>
  <td>${x.full}</td>
  <td>${x.mark}</td>
</tr>`;
  }
  document.getElementById("table").innerHTML = html;
}

// ---------- HELPERS ----------
function val(id) { return document.getElementById(id).value; }
function checked(id) { return document.getElementById(id).checked; }

document.querySelectorAll("input, select")
  .forEach(el => el.addEventListener("input", filter));

// ---------- RANDOM ----------
function randomPick() {
  if (!filtered.length) return;
  let x = filtered[Math.floor(Math.random() * filtered.length)];
  document.getElementById("random").innerText = x.n;
}

// ---------- SELECTION ----------
function selectRow(name) {
  selectedName = name;
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
