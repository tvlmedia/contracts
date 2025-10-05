"use strict";

/* =========================
   pdf.js worker instellen (1x)
   ========================= */
if (window.pdfjsLib) {
  pdfjsLib.GlobalWorkerOptions.workerSrc =
    "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js";
} else {
  console.warn("pdf.js niet geladen — PDF import uit Drive wordt overgeslagen.");
}

/* =========================
   CONFIG: ENDPOINTS
   ========================= */
const DRIVE_ENDPOINT =
  "https://script.google.com/macros/s/AKfycbwOHc7ytcXLyi5D7HWrFha_hZbG5teEr9qFuprqLQ3h1OeePvkM0-LkYmbmgtafH1A/exec";
const MAIL_ENDPOINT =
  "https://script.google.com/macros/s/AKfycbyHJT1WGcgujp2iBX36FZZB8sAbgyi6YNzQw4Q7uDkbS0-wYCK5LV_w2qVTkIdQl00/exec";
const RESOLVE_ENDPOINT = "https://script.google.com/macros/s/AKfycbyOhqN0eWDYycX3sw55Fx2Syd9HCcNIOcolgJlvfPbFc3vMk_QkJESltHG-Cde33zoe/exec"; // <-- jouw resolve-webapp
/* =========================
   Utils
   ========================= */
const $ = (s) => document.querySelector(s);

const form        = $("#rentalForm");
const itemsTbody  = $("#itemsTable tbody");
const addBtn      = $("#btnAdd");
const csvInput    = $("#csvInput");
const acceptTerms = $("#acceptTerms");
const yearEl      = $("#year");
if (yearEl) yearEl.textContent = new Date().getFullYear();

function isValidEmail(s) {
  return typeof s === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());
}
// ——— validators / normalizers
const EMAIL_RE = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;
const NL_PHONE_RE = /^(?:\+31|0031|0)\s*6(?:[\s-]?\d){8}$/;

function looksLikePerson(name){
  const s = (name||"").trim();
  // Voorbeelden: "Pipo de Clown", "Jan van Dijk"
  return /^([A-ZÀ-ÖØ-Ý][a-zà-öø-ÿ]+(?:\s+(?:van|de|der|den|von|da|di))?\s+[A-ZÀ-ÖØ-Ý][a-zà-öø-ÿ]+(?:\s+[A-ZÀ-ÖØ-Ý][a-zà-öø-ÿ]+){0,2})$/.test(s);
}
function looksLikeCompany(s){
  s = (s||"").trim();
  if (!s) return false;
  if (EMAIL_RE.test(s) || NL_PHONE_RE.test(s)) return false;
  // heuristieken: BV, B.V., VOF, NV, Studio, Media, Productions, Group etc. of ALLCAPS, of 1 woord + cijfer
  if (/\b(BV|B\.V\.|VOF|N\.?V\.?|Holding|Group|Studio|Media|Productions?|Creative|Events?)\b/i.test(s)) return true;
  if (/^[A-Z0-9&/'\-. ]{3,}$/.test(s) && s.split(" ").length <= 6) return true;
  return s.split(" ").length <= 6; // milde fallback
}
function normalizePhoneNL(raw){
  let s = (raw||"").replace(/[^\d+]/g,"");
  if (s.startsWith("06")) s = "+31" + s.slice(1);
  if (s.startsWith("0031")) s = "+" + s.slice(2);
  if (s.startsWith("31") && !s.startsWith("+31")) s = "+31" + s.slice(2);
  return s;
}

// ——— gate input classificatie
function classifyLoginInput(v){
  const s = (v||"").trim();
  if (EMAIL_RE.test(s)) return { type:"email", value:s };
  if (NL_PHONE_RE.test(s.replace(/\s+/g,"").replace(/-/g,""))) return { type:"phone", value:normalizePhoneNL(s) };
  if (looksLikePerson(s)) return { type:"person", value:s };
  if (looksLikeCompany(s)) return { type:"company", value:s };
  return { type:"unknown", value:s };
}

// ——— “slim” setten: overschrijft ook foute waarden (tel/e-mail in naam/bedrijf)
function setSmart(sel, val, validator){
  if (!val) return;
  const el = document.querySelector(sel);
  if (!el) return;
  const cur = (el.value||"").trim();
  const bad = !cur || (validator && !validator(cur));
  // overschrijf als leeg of ‘duidelijk fout’ (bv. tel/e-mail in tekstvak)
  const clearlyWrong =
    /name|renter/i.test(sel)  ? (EMAIL_RE.test(cur) || NL_PHONE_RE.test(cur)) :
    /company/i.test(sel)      ? (EMAIL_RE.test(cur) || NL_PHONE_RE.test(cur)) :
    /email/i.test(sel)        ? !EMAIL_RE.test(cur) :
    /phone/i.test(sel)        ? !NL_PHONE_RE.test(cur.replace(/\s+/g,"").replace(/-/g,"")) : false;

  if (bad || clearlyWrong) el.value = val;
}

function base64FromArrayBuffer(ab) {
  const bytes = new Uint8Array(ab);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}
function normalizeForClient(s){
  return String(s||"").toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .replace(/[^a-z0-9\s@._&'/-]+/g,' ')
    .replace(/\s+/g,' ')
    .trim();
}

// simpele score of de tekst bij de zoekterm past
function scoreTextMatch(txt, q){
  const t = normalizeForClient(txt);
  const tokens = q.split(" ").filter(Boolean);
  if (!tokens.length) return 0;
  let hits = 0;
  for (const tok of tokens) if (t.includes(tok)) hits++;
  const emailBonus   = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/.test(t) ? 0.1 : 0;
  const companyBonus = /(company|bedrijf|organization|invoice|factuur|klant)/.test(t) ? 0.1 : 0;
  return Math.min(1, hits/tokens.length + emailBonus + companyBonus);
}

// kies de beste kandidaat op basis van PDF-inhoud, anders fallback naar nieuwste
async function pickBestOrderByContent(cands, query){
  const q = normalizeForClient(query);
  for (const c of cands){            // lijst is al nieuwste→oudste
    try {
      const ab = await fetchPdfFromDrive(c.name);    // je hebt deze al
      const txt = await extractTextFromPdf(ab);      // heb je ook al
      if (scoreTextMatch(txt, q) >= 0.65) return c.name;
    } catch {}
  }
  // geen duidelijke match → pak de allernieuwste toch
  return cands[0]?.name || "";
}
// Mini toast
function toast(msg, isError = false) {
  let el = document.getElementById("tvl-toast");
  if (!el) {
    el = document.createElement("div");
    el.id = "tvl-toast";
    el.style.cssText = `
      position: fixed; left: 50%; transform: translateX(-50%);
      bottom: 18px; z-index: 120001; padding: 10px 14px; border-radius: 10px;
      background: ${isError ? "#b00020" : "#2c7be5"}; color: #fff; font: 14px/1.3 system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif;
      box-shadow: 0 10px 20px rgba(0,0,0,.25);`;
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.style.background = isError ? "#b00020" : "#2c7be5";
  el.style.display = "block";
  clearTimeout(toast._t);
  toast._t = setTimeout(() => (el.style.display = "none"), 2600);
}

/* =========================
   Signature Pad
   ========================= */
let signaturePad;

function initSignaturePad() {
  const canvas = document.getElementById("signaturePad");
  if (!canvas || !window.SignaturePad) {
    console.warn("SignaturePad of canvas ontbreekt.");
    return;
  }

  const resize = () => {
    const ratio = Math.max(window.devicePixelRatio || 1, 1);
    const w = canvas.offsetWidth || canvas.clientWidth || 700;
    const h = 220;
    canvas.width = w * ratio;
    canvas.height = h * ratio;
    const ctx = canvas.getContext("2d");
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    if (signaturePad && signaturePad.isEmpty()) signaturePad.clear();
  };

  signaturePad = new SignaturePad(canvas, { backgroundColor: "rgba(255,255,255,1)" });
  window.addEventListener("resize", resize);
  new ResizeObserver(resize).observe(canvas);
  resize();

  $("#btnClearSig")?.addEventListener("click", () => signaturePad.clear());
}
window.addEventListener("load", initSignaturePad);

/* =========================
   Date/Time pickers
   ========================= */
let fpPickup, fpReturn;

(function initDateTimePickers() {
  if (!window.flatpickr) {
    console.warn("Flatpickr niet geladen");
    return;
  }

  // — helpers
  const now = new Date();
  const roundedNow = new Date(now);
  roundedNow.setMinutes(Math.ceil(roundedNow.getMinutes() / 15) * 15, 0, 0);

  const addMinutes = (d, mins) => {
    const x = new Date(d);
    x.setMinutes(x.getMinutes() + mins, 0, 0);
    return x;
  };
  const nextDay17 = (d) => {
    const x = new Date(d);
    x.setDate(x.getDate() + 1);
    x.setHours(17, 0, 0, 0);
    return x;
  };
  const midnight = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

  const common = {
    enableTime: true,
    dateFormat: "d-m-Y, H:i",
    time_24hr: true,
    allowInput: false,
    disableMobile: true
  };

  // Ensure the return calendar can’t go before pickup,
  // and if needed, auto-bump to either pickup+15min or next day 17:00 (whichever is later).
  function hardenReturnCalendar(pick) {
    if (!fpReturn || !pick) return;

    const minDay = midnight(pick);
    const minReturn = addMinutes(pick, 15);
    const target = new Date(Math.max(minReturn.getTime(), nextDay17(pick).getTime()));

    fpReturn.set("disable", [(date) => date < minDay]);
    fpReturn.set("minDate", pick);

    const current = fpReturn.selectedDates?.[0];
    if (!current || current.getTime() < target.getTime()) {
      // update without triggering onChange loop
      fpReturn.setDate(target, false);
    }
  }

  // Create pickers with defaults:
  // - pickup: now (rounded to 15m)
  // - return: next day @ 17:00 (or pickup+15m if that’s later)
  const defaultPickup = roundedNow;
  const defaultReturn = new Date(
    Math.max(nextDay17(defaultPickup).getTime(), addMinutes(defaultPickup, 15).getTime())
  );

  fpReturn = flatpickr("#returnDateTime", {
    ...common,
    minDate: defaultPickup,
    defaultDate: defaultReturn
  });

  fpPickup = flatpickr("#pickupDateTime", {
    ...common,
    defaultDate: defaultPickup,
    minDate: roundedNow,
    onReady(selectedDates, _dateStr, instance) {
      const pick = instance?.selectedDates?.[0] || defaultPickup;
      hardenReturnCalendar(pick);
    },
    onChange(selectedDates) {
      hardenReturnCalendar(selectedDates?.[0] || defaultPickup);
    },
    onValueUpdate(selectedDates) {
      hardenReturnCalendar(selectedDates?.[0] || defaultPickup);
    }
  });

  // First pass
  hardenReturnCalendar(fpPickup?.selectedDates?.[0] || defaultPickup);

  // make available globally if you were using these
  window.fpPickup = fpPickup;
  window.fpReturn = fpReturn;
})();

/* =========================
   Locaties dropdowns
   ========================= */
const ADDRESS_OFFICE = "Beek en Donk (Donkersvoorstestraat 3)";

function syncLocation(mode) {
  const modeSel = document.getElementById(mode + "Mode");
  const wrap = document.getElementById(mode + "DeliveryWrap");
  const input = document.getElementById(mode + "DeliveryInput");
  const hidden = document.getElementById(mode + "Location");
  if (!modeSel || !wrap || !input || !hidden) return;

  const isDelivery = modeSel.value === "delivery";
  wrap.classList.toggle("hidden", !isDelivery);
  input.disabled = !isDelivery;
  input.required = isDelivery;

  if (isDelivery) {
    hidden.value = (input.value || "").trim() || "Brengen – adres nog invullen";
    requestAnimationFrame(() => input.focus());
  } else {
    input.value = "";
    hidden.value = ADDRESS_OFFICE;
  }
}
["pickup", "return"].forEach((m) => {
  const sel = document.getElementById(m + "Mode");
  const inp = document.getElementById(m + "DeliveryInput");
  if (sel) sel.addEventListener("change", () => syncLocation(m));
  if (inp) inp.addEventListener("input", () => syncLocation(m));
  syncLocation(m);
});

form?.addEventListener("submit", () => {
  syncLocation("pickup");
  syncLocation("return");
});

/* =========================
   Items tabel
   ========================= */
function addRow({ Item = "", Serial = "", Qty = 1, Condition = "" }) {
  const tr = document.createElement("tr");
  tr.innerHTML = `
    <td><input type="text" value="${Item}" placeholder="Item" /></td>
    <td><input type="text" value="${Serial}" placeholder="Serial" /></td>
    <td><input type="number" value="${Qty}" min="1" /></td>
    <td><input type="text" value="${Condition}" placeholder="Condition" /></td>
    <td><button type="button" class="remove" aria-label="Verwijder rij">✕</button></td>`;
  itemsTbody.appendChild(tr);
  tr.querySelector(".remove")?.addEventListener("click", () => tr.remove());
}

addBtn?.addEventListener("click", () => {
  const Item = $("#addItem")?.value.trim();
  const Serial = $("#addSerial")?.value.trim();
  const Qty = parseInt($("#addQty")?.value || "1", 10);
  const Condition = $("#addCondition")?.value.trim();
  if (!Item) { alert("Vul minstens een itemnaam in."); return; }
  addRow({ Item, Serial, Qty: isNaN(Qty) ? 1 : Qty, Condition });
  const a = $("#addItem"), b = $("#addSerial"), c = $("#addQty"), d = $("#addCondition");
  if (a) a.value = ""; if (b) b.value = ""; if (c) c.value = 1; if (d) d.value = "";
});

/* =========================
   CSV upload
   ========================= */
csvInput?.addEventListener("change", (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  if (!window.Papa) { toast("CSV parser (Papa) ontbreekt.", true); return; }
  Papa.parse(file, {
    header: true,
    skipEmptyLines: true,
    complete: (results) => {
      if (!Array.isArray(results.data)) return;
      results.data.forEach((row) => {
        addRow({
          Item: row.Item || row.item || "",
          Serial: row.Serial || row.serial || "",
          Qty: parseInt(row.Qty || row.qty || "1", 10) || 1,
          Condition: row.Condition || row.condition || ""
        });
      });
    }
  });
});

/* =========================
   Helpers
   ========================= */
function collectItems() {
  const rows = [...itemsTbody.querySelectorAll("tr")];
  return rows.map((tr) => {
    const [i, s, q, c] = [...tr.querySelectorAll("input")];
    return {
      Item: (i?.value || "").trim(),
      Serial: (s?.value || "").trim(),
      Qty: parseInt(q?.value || "1", 10) || 1,
      Condition: (c?.value || "").trim()
    };
  }).filter((r) => r.Item);
}
function makeId() {
  const ts = new Date().toISOString().replace(/[-:T.Z]/g, "").slice(0, 14);
  const rnd = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `TVL-${ts}-${rnd}`;
}
async function getIP() {
  try {
    const r = await fetch("https://api.ipify.org?format=json");
    if (!r.ok) throw new Error("ipify HTTP " + r.status);
    return await r.json();
  } catch (_) { return {}; }
}

/* =========================
   PDF genereren + mailen
   ========================= */
form?.addEventListener("submit", async (e) => {
  e.preventDefault();

  if (!window.jspdf?.jsPDF) { alert("PDF-bibliotheek ontbreekt. Controleer je script-tags."); return; }
  if (!acceptTerms?.checked) { alert("Je moet akkoord gaan met de algemene voorwaarden."); return; }
  if (!signaturePad || signaturePad.isEmpty()) { alert("Zet een handtekening aub."); return; }

  const fd = new FormData(form);
  const data = Object.fromEntries(fd.entries());
  const items = collectItems();
  if (items.length === 0 && !confirm("De gear-lijst is leeg. Toch doorgaan en PDF maken?")) return;

  const pickDT = fpPickup?.selectedDates?.[0] || null;
  const retDT  = fpReturn?.selectedDates?.[0] || null;
  if (!pickDT || !retDT) { alert("Vul eerst de ophaal- en retourdatum in."); return; }
  const minReturn = new Date(pickDT.getTime() + 15 * 60 * 1000);
  if (retDT < minReturn) {
    fpReturn?.setDate(minReturn, true);
    alert("Retour kan niet vóór ophaal (min. +15 min). Ik heb de retourtijd aangepast.");
    return;
  }

  const id = makeId();
  const now = new Date();
  const ip = (await getIP()).ip || "n/a";

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const margin = 36;
  let y = margin;

  // Header
  doc.setFillColor(0, 0, 0);
  doc.rect(0, 0, doc.internal.pageSize.getWidth(), 54, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("TVL Rental – Overdrachtsformulier & Akkoord", margin, 34);

  // Meta
  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  y = 72;

  const metaLeft = [
    ["Formulier ID", id],
    ["Datum/Tijd", now.toLocaleString()],
    ["Project", data.project || ""],
    ["PO/Referentie", data.po || ""]
  ];
  const metaRight = [
    ["Huurder", data.renterName || ""],
    ["Bedrijf", data.company || ""],
    ["E-mail", data.email || ""],
    ["Telefoon", data.phone || ""]
  ];
  y = drawTwoCols(doc, metaLeft, metaRight, margin, y, 260, 16);

  // Periode
  y += 12;
  doc.setFont("helvetica", "bold"); doc.setFontSize(12);
  doc.text("Periode", margin, y);
  doc.setFont("helvetica", "normal"); doc.setFontSize(11);
  y += 18;
  const termsHref = document.getElementById("termsLink")?.href || "";
  y = drawTwoCols(
    doc,
    [
      ["Ophaal", data.pickup || ""],
      ["Retour", data.return || ""],
      ["Ophalen op", data.pickupLocation || ""],
      ["Retour op", data.returnLocation || ""]
    ],
    [
      ["AV akkoord", acceptTerms.checked ? "Ja" : "Nee"],
      ["AV link", termsHref],
      ["IP (best-effort)", ip],
      ["User-Agent", navigator.userAgent]
    ],
    margin, y, 260, 16
  );

  // Items
  y += 18;
  doc.setFont("helvetica", "bold"); doc.setFontSize(12);
  doc.text("Overgedragen items", margin, y);
  doc.setFont("helvetica", "normal");
  y += 10;

  doc.autoTable({
    startY: y,
    margin: { left: margin, right: margin },
    styles: { fontSize: 10, cellPadding: 6 },
    headStyles: { fillColor: [16, 21, 27], textColor: 255 },
    head: [["Item", "Serial", "Qty", "Condition"]],
    body: items.length ? items.map((r) => [r.Item, r.Serial, r.Qty, r.Condition]) : [["—", "—", "—", "—"]]
  });

  const afterTableY = doc.lastAutoTable ? doc.lastAutoTable.finalY + 16 : y + 40;

  // Verklaring + handtekening
  const declaration =
    "Ondergetekende bevestigt alle genoemde items in goede orde te hebben ontvangen en gaat akkoord met de Algemene Voorwaarden van TVL Rental.";
  const sigTitleY = drawParagraph(doc, declaration, margin, afterTableY, 522, 12);
  const sigY = sigTitleY + 18;

  const sigDataUrl = signaturePad.toDataURL("image/png");
  const sigW = 300, sigH = 100;
  doc.setDrawColor(180);
  doc.rect(margin, sigY - 2, sigW + 4, sigH + 4);
  doc.addImage(sigDataUrl, "PNG", margin + 2, sigY, sigW, sigH);
  doc.setFontSize(10);
  doc.text(`Naam: ${data.renterName || ""}`, margin + sigW + 20, sigY + 16);
  doc.text(`E-mail: ${data.email || ""}`,  margin + sigW + 20, sigY + 34);
  doc.text(`Datum/tijd: ${now.toLocaleString()}`, margin + sigW + 20, sigY + 52);
  doc.text(`Formulier ID: ${id}`, margin + sigW + 20, sigY + 70);

  // Footer
  doc.setFontSize(9);
  const foot = "Dit document is automatisch gegenereerd op basis van ingevulde gegevens. Bij onduidelijkheid prevaleert de overeenkomst en de Algemene Voorwaarden.";
  const pageH = doc.internal.pageSize.getHeight();
  drawParagraph(doc, foot, margin, pageH - 40, 522, 10);

  const safeProject = (data.project || "project").replace(/[^a-z0-9_\-]+/gi, "_");
  const filename = `TVL_Rental_Overdracht_${safeProject}_${id}.pdf`;

  // 1) Download
  doc.save(filename);

// 2) Mail (simple request: text/plain -> geen preflight)
try {
  const ab  = doc.output("arraybuffer");
  const b64 = base64FromArrayBuffer(ab);

  const payload = {
    subject: `TVL Overdracht – ${safeProject} (${id})`,
    body: `
      <p>Nieuwe overdracht PDF.</p>
      <ul>
        <li><b>Formulier ID</b>: ${id}</li>
        <li><b>Project</b>: ${data.project || ""}</li>
        <li><b>Huurder</b>: ${data.renterName || ""}</li>
        <li><b>Ophaal</b>: ${data.pickup || ""}</li>
        <li><b>Retour</b>: ${data.return || ""}</li>
      </ul>
      <p>Bijlage: ${filename}</p>
    `,
    filename,
    mimeType: "application/pdf",
    attachmentBase64: b64,
    cc: isValidEmail(data.email) ? data.email : "",
    replyTo: isValidEmail(data.email) ? data.email : ""
  };

  const res = await fetch(MAIL_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" }, // ✅ simple request
    body: JSON.stringify(payload)
  });

  const text = await res.text();
  console.log("MAIL response:", res.status, text);

  if (!res.ok) throw new Error(`Mail endpoint HTTP ${res.status}: ${text}`);

  toast(`PDF gemaild naar info@tvlrental.nl${isValidEmail(data.email) ? " + cc naar huurder" : ""} ✅`);
} catch (err) {
  console.error(err);
  toast("Mailen mislukte (verbinding of endpoint) — PDF wel gedownload.", true);
}
});

/* =========================
   PDF layout helpers
   ========================= */
function drawTwoCols(doc, leftPairs, rightPairs, x, y, colW, lineH) {
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  leftPairs.forEach((row, i) => {
    doc.setFont("helvetica", "bold");   doc.text(`${row[0]}:`, x, y + i * lineH);
    doc.setFont("helvetica", "normal"); doc.text(String(row[1] ?? ""), x + 110, y + i * lineH);
  });
  rightPairs.forEach((row, i) => {
    doc.setFont("helvetica", "bold");   doc.text(`${row[0]}:`, x + colW + 40, y + i * lineH);
    doc.setFont("helvetica", "normal"); doc.text(String(row[1] ?? ""), x + colW + 150, y + i * lineH, { maxWidth: 250 });
  });
  const rows = Math.max(leftPairs.length, rightPairs.length);
  return y + rows * lineH + 4;
}

function drawParagraph(doc, text, x, y, maxW, fontSize = 11) {
  doc.setFont("helvetica", "normal");
  doc.setFontSize(fontSize);
  const lines = doc.splitTextToSize(text, maxW);
  doc.text(lines, x, y);
  return y + lines.length * (fontSize + 2);
}

/* =========================
   Gate (naam/wachtwoord) + resolver
   ========================= */
(async function initGate() {
  const gate  = document.getElementById("gate");
  const input = gate?.querySelector("#gateName");
  const btn   = gate?.querySelector("#gateBtn");
  const err   = gate?.querySelector("#gateErr");

  if (!gate || !input || !btn) {
    console.warn("Gate niet gevonden of incomplete markup:", { gate: !!gate, input: !!input, btn: !!btn });
    return;
  }

  // client-side normalizer (matcht server normalize grotendeels)
  function normalizeForClient(s){
    return s.toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
      .replace(/\s+/g,' ')
      .trim();
  }

  async function sha256(str) {
    const data = new TextEncoder().encode(str.trim().toLowerCase());
    const buf  = await crypto.subtle.digest("SHA-256", data);
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,"0")).join("");
  }

  const url   = new URL(location.href);
  const sig   = url.searchParams.get("sig");
  const qName = url.searchParams.get("name");

 async function unlockWith(inputValue) {
  // URL bijwerken
  const hash = await sha256(inputValue);
  const next = new URL(location.href);
  next.searchParams.set("sig",  hash);
  next.searchParams.set("name", inputValue);
  history.replaceState(null, "", next.toString());

  // overlay sluiten
  document.body.classList.remove("locked");

  // ——— zet gate-invoer op het JUISTE veld
  const kind = classifyLoginInput(inputValue);

  if (kind.type === "email") {
    setSmart('input[name="email"]', kind.value, v => EMAIL_RE.test(v));
  } else if (kind.type === "phone") {
    setSmart('input[name="phone"]', kind.value, v => NL_PHONE_RE.test(v.replace(/\s+/g,"").replace(/-/g,"")));
  } else if (kind.type === "person") {
    setSmart('input[name="renterName"]', kind.value, v => !EMAIL_RE.test(v) && !NL_PHONE_RE.test(v));
  } else if (kind.type === "company" || kind.type === "unknown") {
    // unknown → behandel als bedrijf (valt later te corrigeren door PDF-parser)
    setSmart('input[name="company"]', kind.value, v => !EMAIL_RE.test(v) && !NL_PHONE_RE.test(v));
  }

  // focus ergens bruikbaars
  (document.querySelector('input[name="renterName"]')
    || document.querySelector('input[name="company"]')
    || document.querySelector('input,select,textarea,button'))?.focus?.();

  // signature canvas natrappen
  setTimeout(() => window.dispatchEvent(new Event("resize")), 50);

  // PDF import
  try { await afterUnlock(); } catch (e) { console.error(e); }
}

  // 1) Auto-unlock als sig+name al kloppen
  if (sig && qName && (await sha256(qName)) === sig.toLowerCase()) {
    await unlockWith(qName);
    return;
  }

  // 2) Gate tonen
  document.body.classList.add("locked");
  if (qName) input.value = qName;

  // 3) Door-knop: resolve naam/bedrijf -> order
 async function handleGo() {
  const name = (input.value || "").trim();
  if (!name) {
    input.focus();
    err?.classList.remove("hidden");
    setTimeout(() => err?.classList.add("hidden"), 1500);
    return;
  }

  try {
    toast("Zoeken naar jouw order…");
    const q = normalizeForClient(name);

    // ✅ vraag kandidaten op (nieuwste eerst) – LET OP: search, niet query
    const r = await fetch(RESOLVE_ENDPOINT + "?search=" + encodeURIComponent(q) + "&limit=50");
    if (!r.ok) throw new Error("resolve HTTP " + r.status);
    const js = await r.json();

    if (!js.ok || !Array.isArray(js.items) || js.items.length === 0) {
      toast(`Geen PDF-kandidaten gevonden voor “${name}”.`, true);
      err?.classList.remove("hidden");
      setTimeout(() => err?.classList.add("hidden"), 2500);
      return;
    }

    // ✅ check inhoud van kandidaten en kies beste (of fallback naar nieuwste)
    const order = await pickBestOrderByContent(js.items, name);
    if (!order) {
      toast("Kon geen geschikte PDF kiezen.", true);
      return;
    }

    // schrijf keuze in URL en ga door met de normale flow
    const next = new URL(location.href);
    next.searchParams.set("order", order);
    next.searchParams.set("name",  name);
    history.replaceState(null, "", next.toString());

    await unlockWith(name);
  } catch (e) {
    console.error(e);
    toast("Zoeken mislukt (verbinding).", true);
  }
}

  btn.addEventListener("click", handleGo);
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") { e.preventDefault(); handleGo(); }
  });
})();
/* =========================
   PDF import uit Drive + parsing
   ========================= */
async function afterUnlock() {
  const url = new URL(location.href);
  const order = url.searchParams.get("order"); // bijv. "contract-228.pdf"
  if (!order) return;
  if (!window.pdfjsLib) { console.warn("pdf.js ontbreekt — kan geen PDF uit Drive lezen."); return; }

  try {
    toast("Gear-lijst laden…");
    const pdfAb = await fetchPdfFromDrive(order);
    const text  = await extractTextFromPdf(pdfAb);

    // console.debug("DEBUG PDF text:\n", text); // <- aanzetten om te tunen

    fillRenterFromText(text);
    fillDatesFromText(text);

    const rows  = parseBooqableItems(text);
    if (Array.isArray(rows) && rows.length) {
      itemsTbody.innerHTML = "";
      rows.forEach(addRow);
      toast(`Gear-lijst geïmporteerd (${rows.length} regels) ✅`);
    } else {
      toast("Geen items gevonden in PDF.", true);
    }
  } catch (e) {
    console.error(e);
    toast("Kon PDF niet laden of lezen.", true);
  }
}

async function fetchPdfFromDrive(filename){
  const res = await fetch(`${DRIVE_ENDPOINT}?file=` + encodeURIComponent(filename), {
    method: "GET",
    headers: { "Accept": "application/json" }
  });
  if (!res.ok) throw new Error("Drive endpoint HTTP " + res.status);
  const json = await res.json();
  if (!json.ok) throw new Error(json.error || "download failed");
  const bytes = Uint8Array.from(atob(json.data), c => c.charCodeAt(0));
  return bytes.buffer; // ArrayBuffer
}

/* ==== PDF → regels met kolomgaten bewaard ==== */
async function extractTextFromPdf(arrayBuffer){
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const allLines = [];

  for (let p = 1; p <= pdf.numPages; p++){
    const page = await pdf.getPage(p);
    const content = await page.getTextContent();

    // groepeer tekstitems per Y-rij
    const rows = {};
    for (const it of content.items){
      const t = it.transform;
      const x = t[4], y = t[5];
      const key = Math.round(y/2)*2;         // Y-snapping
      (rows[key] ||= []).push({ x, str: it.str, w: it.width || 0 });
    }

    const yKeys = Object.keys(rows).map(Number).sort((a,b)=>b-a);
    for (const yk of yKeys){
      const segs = rows[yk].sort((a,b)=>a.x-b.x);
      let line = "";
      for (let i=0;i<segs.length;i++){
        const cur = segs[i];
        line += (i===0 ? "" : gap(segs[i-1], cur)) + cur.str;
      }
      allLines.push(line.replace(/\u00A0/g," ").replace(/\s{2,}/g," ").trim());
    }
    allLines.push("");
  }
  return allLines.join("\n");

  // voeg extra spaties toe als het X-gat groot is (houd kolommen zichtbaar)
  function gap(prev, cur){
    const dx = cur.x - (prev.x + (prev.w || 0));
    if (dx > 40) return "    ";   // groot gat → 4 spaties
    if (dx > 20) return "  ";     // medium → 2 spaties
    return " ";                   // klein → 1 spatie
  }
}

/* ==== Normalizer ==== */
function norm(s){
  return (s||"")
    .replace(/\u00A0/g, " ")   // NBSP
    .replace(/[’‘]/g,"'")
    .replace(/[“”]/g,'"')
    .replace(/×/g,"x")
    .replace(/–|—/g,"-")
    .replace(/\s{2,}/g," ")
    .trim();
}

/* ==== Velden uit PDF kop (bedrijf/naam/e-mail/telefoon) ==== */
function setIfEmpty(sel, val) {
  if (!val) return;
  const el = document.querySelector(sel);
  if (el && !el.value) el.value = val.trim();
}

function fillRenterFromText(txt) {
  if (!txt) return;

  const head = txt.slice(0, 20000);

  // ---- onze eigen gegevens wegfilteren
  const OUR_BRAND   = /(TVL\s*Rental|TVL\s*Media)/i;
  const OUR_EMAILS  = /@tvlmedia\.nl|@tvlrental\.nl/i;
  const OUR_ADDRESS = /(Donkersvoorstestraat|Beek\s*en\s*Donk|5741\s*RL)/i;

  // ---- patterns/heuristieken
  const EMAIL_ONE = EMAIL_RE;                                // bestaat al bovenin je script
  const EMAIL_ALL = new RegExp(EMAIL_RE.source, "gi");
  const ANY_NL_MOBILE = /(?:(?:\+31|0031|0)\s*6(?:[\s-]?\d){8})/;
  const ANY_NL_PHONE  = /(?:(?:\+31|0031|0)\s*(?:\d[\s-]?){8,10}\d)/;

  const COUNTRY = /\b(netherlands|nederland|the\s*netherlands)\b/i;
  const POSTCODE = /\b\d{4}\s?[A-Z]{2}\b/;
  const STREET = /\b(straat|laan|weg|plein|gracht|dreef|kade|avenue|road|lane|drive|boulevard)\b/i;

  const looksCountry = s => COUNTRY.test(s);
  const looksAddress = s => looksCountry(s) || POSTCODE.test(s) || STREET.test(s) || /\b\d{1,4}\b/.test(s);
  const looksPhone   = s => ANY_NL_PHONE.test(s);
  const looksEmail   = s => EMAIL_ONE.test(s);

  const CAP_NAME = /^([A-ZÀ-ÖØ-Ý][a-zà-öø-ÿ]+(?:\s+(?:van|de|der|den|von|da|di))?\s+[A-ZÀ-ÖØ-Ý][a-zà-öø-ÿ]+(?:\s+[A-ZÀ-ÖØ-Ý][a-zà-öø-ÿ]+){0,2})$/;
  const looksName  = s => CAP_NAME.test(s) && !looksAddress(s) && !looksEmail(s) && !looksPhone(s) && !looksCountry(s);
  const looksCo    = s => (/\b(BV|B\.V\.|N\.?V\.?|VOF|Holding|Group|Studio|Media|Productions?|Creative|Events?)\b/i.test(s)
                        || /[A-Z].*[A-Z]/.test(s)) && !looksAddress(s) && !looksEmail(s) && !looksPhone(s) && !looksCountry(s);

  const notOurs = s => !(OUR_BRAND.test(s) || OUR_ADDRESS.test(s) || OUR_EMAILS.test(s));

  const lines = head.split(/\r?\n/)
    .map(s => s.replace(/\u00A0/g, " ").replace(/\s{2,}/g, " ").trim())
    .filter(Boolean);

  // ---- venster bepalen: onder "Customer/Klant" óf rondom eerste niet-TVL e-mail
  const hdrIdx = lines.findIndex(l => /(bill\s*to|customer|klant|client)/i.test(l) && notOurs(l));

  let winStart = 0, winEnd = 0;
  if (hdrIdx >= 0) {
    winStart = Math.max(0, hdrIdx + 1);
    winEnd   = Math.min(lines.length, hdrIdx + 14);
  } else {
    const allEmails = [...head.matchAll(EMAIL_ALL)].map(m => ({ text: m[0], idx: m.index || 0 }))
      .filter(m => notOurs(m.text));
    if (allEmails.length) {
      const pick = allEmails[0]; // eerste niet-TVL e-mail
      // vind regelindex bij benadering
      let charCount = 0, rowIdx = 0;
      for (; rowIdx < lines.length; rowIdx++) {
        charCount += lines[rowIdx].length + 1;
        if (charCount >= pick.idx) break;
      }
      winStart = Math.max(0, rowIdx - 6);
      winEnd   = Math.min(lines.length, rowIdx + 10);
    } else {
      // no fallback → gebruik bovenste stuk
      winStart = 0;
      winEnd   = Math.min(lines.length, 18);
    }
  }

  const windowLines = lines.slice(winStart, winEnd)
    .filter(l => notOurs(l))
    .filter(l => !/^(pickup|return|date|datum|subtotal|totaal|total|payment|btw|vat|invoice|factuur)\b/i.test(l));

  // ---- e-mail & telefoon in het venster (fallback: globaal)
  let email = (windowLines.find(looksEmail) || "");
  if (!email) {
    const all = [...head.matchAll(EMAIL_ALL)].map(m => m[0]).filter(notOurs);
    email = all[0] || "";
  }
  let phone = (windowLines.join("\n").match(ANY_NL_MOBILE)?.[0] ||
               windowLines.join("\n").match(ANY_NL_PHONE)?.[0] || "");
  if (!phone) {
    const m = head.match(ANY_NL_MOBILE) || head.match(ANY_NL_PHONE);
    if (m && notOurs(m[0])) phone = m[0];
  }
  phone = normalizePhoneNL(phone);

  // ---- bedrijf + naam uit het venster
  const cleaned = windowLines.filter(l => !looksEmail(l) && !looksPhone(l) && !looksAddress(l) && !looksCountry(l));

  let company = "";
  let name = "";

  // patroon: bedrijf → naam
  for (let i = 0; i < cleaned.length - 1; i++) {
    const a = cleaned[i], b = cleaned[i+1];
    if (looksCo(a) && looksName(b)) { company = a; name = b; break; }
    if (looksName(a) && looksCo(b)) { name = a; company = b; break; }
  }
  if (!company && cleaned[0]) company = cleaned[0];
  if (!name && cleaned[1])     name    = cleaned[1];

  // ---- afleiden bedrijf uit domein indien nodig
  function inferCompanyFromEmail(em){
    if (!em) return "";
    const domain = (em.split("@")[1] || "").toLowerCase();
    if (!domain || /tvlmedia\.nl|tvlrental\.nl/.test(domain)) return "";
    const base = domain.replace(/^www\./,"").replace(/\.[a-z]{2,}$/,"");
    if (!base) return "";
    const pretty = base.replace(/[-_]+/g," ").replace(/\s+/g," ").trim()
      .split(" ").map(w => w ? w[0].toUpperCase()+w.slice(1) : w).join(" ");
    return pretty;
  }
  if (!company || looksCountry(company)) {
    const inferred = inferCompanyFromEmail(email);
    if (inferred && !looksCountry(inferred)) company = inferred;
  }

  // ---- invullen (alleen overschrijven als huidige inhoud onzin is)
  setSmart('input[name="company"]',    company, v => !EMAIL_ONE.test(v) && !COUNTRY.test(String(v)));
  setSmart('input[name="renterName"]', name,    v => !EMAIL_ONE.test(v) && !ANY_NL_PHONE.test(String(v)));
  setSmart('input[name="email"]',      email,   v => EMAIL_ONE.test(v));
  setSmart('input[name="phone"]',      phone,   v => NL_PHONE_RE.test(String(v).replace(/\s+/g,"").replace(/-/g,"")));
}
function fillDatesFromText(txt){
  if (!txt) return;

  // NL/EN datum: 31-12-2025 of 31/12/2025; tijd 08:30 of 8:30
  const d = "(\\d{2}[-\\/]\\d{2}[-\\/]\\d{4})";
  const t = "(\\d{1,2}:\\d{2})";
  const rxPick = new RegExp(`(?:Pickup|Ophaal|Start)\\s+${d}\\s+${t}`, "i");
  const rxRet  = new RegExp(`(?:Return|Retour|Einde)\\s+${d}\\s+${t}`, "i");

  const mP = rxPick.exec(txt);
  const mR = rxRet.exec(txt);

  const fmt = (d, t) => `${d}, ${t}`;

  const fpP = document.getElementById("pickupDateTime")?._flatpickr;
  const fpR = document.getElementById("returnDateTime")?._flatpickr;

  if (mP && fpP) fpP.setDate(fmt(mP[1], mP[2]), true);   // true = trigger change
  if (mR && fpR) fpR.setDate(fmt(mR[1], mR[2]), true);
}


/* ==== Sterke multi-pass item parser (Booqable-achtig) ==== */
function parseBooqableItems(rawText){
  const rows = [];
  const lines = rawText
    .split(/\n+/)
    .map(s => s.replace(/\u00A0/g," ").replace(/\s{2,}/g," ").trim())
    .filter(Boolean);

  const push = (Item, Serial="", Qty=1, Condition="")=>{
    if (!Item) return;
    // strip prijs- of eurostaarten
    Item = Item.replace(/\s+€.*$/,"").replace(/\s+EUR.*$/i,"").trim();
    rows.push({ Item, Serial: (Serial||"").trim(), Qty: Number(Qty)||1, Condition: (Condition||"").trim() });
  };

  // — A: "2 x Aputure 600D Pro ... 1 day/dagen/weken"
  for (const line of lines){
    const m = line.match(/^(?<qty>\d+)\s*(?:x|×)?\s+(?<item>.+?)\s+(?:\d+\s*)?(?:day|days|dag|dagen|week|weken)\b/i);
    if (m){ push(m.groups.item, "", m.groups.qty); }
  }

  // — B: "Item … Qty: 2" of "Item … Aantal: 2"
  for (const line of lines){
    const m = line.match(/^(?<item>.+?)\s+(?:Qty|Aantal)\s*[: ]\s*(?<qty>\d+)\b/i);
    if (m){ push(m.groups.item, "", m.groups.qty); }
  }

  // — C: Zelfde regel met serial
  for (const line of lines){
    const m = line.match(/^(?<qty>\d+)?\s*(?:x|×)?\s*(?<item>.+?)\s+(?:Serial|S\/N|SN|Serienummer|ID|Asset|Barcode)\s*[:# ]\s*(?<sn>[A-Z0-9\-\/._]+)/i);
    if (m){ push(m.groups.item, m.groups.sn, m.groups.qty||1); }
  }

  // — D: Tabel-achtige regels (meerdere kolommen door grote gaten → ≥3 spaties)
  for (const line of lines){
    const cols = line.split(/\s{3,}/).map(c=>c.trim());
    if (cols.length >= 3){
      // kies de langste kolom als item; een zuiver nummer als qty
      let qtyCol = cols.find(c => /^\d+$/.test(c));
      if (qtyCol){
        const itemCol = cols.slice().sort((a,b)=>b.length-a.length)[0];
        push(itemCol, "", qtyCol);
      }
    }
  }

  // — E: Item gevolgd door aparte "Qty/Aantal" op volgende regel
  if (!rows.length){
    for (let i=0;i<lines.length-1;i++){
      const l1 = lines[i], l2 = lines[i+1];
      const m = l2.match(/(?:Qty|Aantal)\s*[: ]\s*(\d+)/i);
      if (m && !/total|totaal|sum|subtotal/i.test(l1)) push(l1, "", m[1]);
    }
  }

  // — F: Serial op volgende regel
  for (let i=0;i<rows.length;i++){
    if (rows[i].Serial) continue;
    const next = lines.find(l => /(?:Serial|S\/N|SN|Serienummer)\s*[:# ]\s*[A-Z0-9\-\/._]+/i.test(l));
    if (next) {
      const m = next.match(/(?:Serial|S\/N|SN|Serienummer)\s*[:# ]\s*([A-Z0-9\-\/._]+)/i);
      if (m) rows[i].Serial = m[1];
    }
  }

  // — G: Dedupe (merge op Item+Serial)
  const map = new Map();
  for (const r of rows){
    const key = (r.Item.toLowerCase()+"|"+(r.Serial||"").toLowerCase());
    if (!map.has(key)) map.set(key, r);
    else map.get(key).Qty += r.Qty;
  }
  return [...map.values()];
}
