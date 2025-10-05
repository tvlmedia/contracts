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
  "https://script.googleusercontent.com/macros/echo?user_content_key=AehSKLjDBKd9uA_nV_cED5o0Sy8OEhl7th0bqhoij4uWE_yrwdZwkOa7ZH0cVcm4yRGiIxqqknMAjb_3vZEqsOxoxCpclWWcHBgDCczpKMJ5wjIL45C-Zu0XToFfUtvvU3P1GrFHurLUZveSnMYkLNpmtfiKKjmTNKJGMN7oA1GfCCKBvYxtAIRxBGAG8_WcaIchGpIpbxQ3rErd-1Wx-DZer8N3IkRW9qu9r3aPq3NMntO2rsgcCWPaauem6tMLs100MW_ukw5xV3am4-oesGLpqbVcklJBkNj9nOgEW4N5MGma6Q9VooYd3Xtx4d0pfw&lib=MeWuCCcpF7n6CEzeDUYALnNbD0KRScYky";
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
  const now = new Date();
  const rounded = new Date(now);
  rounded.setMinutes(Math.ceil(rounded.getMinutes() / 15) * 15, 0, 0);

  const common = {
    enableTime: true,
    dateFormat: "d-m-Y, H:i",
    time_24hr: true,
    allowInput: false,
    disableMobile: true
  };

  const addMinutes = (d, mins) => {
    const x = new Date(d);
    x.setMinutes(x.getMinutes() + mins, 0, 0);
    return x;
  };
  const midnight = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

  function hardenReturnCalendar(pick) {
    if (!fpReturn || !pick) return;
    const minDay = midnight(pick);
    const minStamp = pick.getTime();

    fpReturn.set("disable", [(date) => date < minDay]);
    fpReturn.set("minDate", pick);
    const minReturn = addMinutes(pick, 15);
    const current = fpReturn.selectedDates?.[0];
    if (!current || current.getTime() < minStamp || current < minReturn) {
      fpReturn.setDate(minReturn, false);
    }
  }

  fpReturn = flatpickr("#returnDateTime", { ...common, minDate: rounded });

  fpPickup = flatpickr("#pickupDateTime", {
    ...common,
    defaultDate: rounded,
    minDate: rounded,
    // juiste signatures
    onReady(selectedDates, _dateStr, instance) {
      const pick = instance?.selectedDates?.[0] || selectedDates?.[0] || rounded;
      hardenReturnCalendar(pick);
    },
    onChange(selectedDates) {
      hardenReturnCalendar(selectedDates?.[0] || rounded);
    },
    onValueUpdate(selectedDates) {
      hardenReturnCalendar(selectedDates?.[0] || rounded);
    }
  });

  hardenReturnCalendar(fpPickup?.selectedDates?.[0] || rounded);
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

  // 2) Mail
  try {
    const ab = doc.output("arraybuffer");
    const b64 = base64FromArrayBuffer(ab);

    const res = await fetch(MAIL_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({
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
      })
    });

    if (!res.ok) throw new Error(`Mail endpoint HTTP ${res.status}`);
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

  async function unlockWith(name) {
  // zet (of ververs) sig+name in URL
  const hash = await sha256(name);
  const next = new URL(location.href);
  next.searchParams.set("sig", hash);
  next.searchParams.set("name", name);
  history.replaceState(null, "", next.toString());

  // overlay sluiten
  document.body.classList.remove("locked");

  // slimme naamverwerking
  const looksLikePerson = /^[A-Z][a-z]+(?:\s+(?:van|de|der|den|von|da|di))?\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?$/.test(name.trim());
  const nameField = document.querySelector('input[name="renterName"]');
  const companyField = document.querySelector('input[name="company"]');

  if (looksLikePerson) {
    if (nameField && !nameField.value) nameField.value = name.trim();
  } else {
    if (companyField && !companyField.value) companyField.value = name.trim();
  }

  (nameField || companyField || document.querySelector('input,select,textarea,button'))?.focus?.();

  // signature canvas natrappen
  setTimeout(() => window.dispatchEvent(new Event("resize")), 50);

  // indien ?order=... aanwezig is -> importeren
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

  // We focussen op het bovenste stuk waar klantgegevens staan
  const head = txt.slice(0, 2500);

  // ——— Email
  const emailMatch = head.match(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i);
  const email = emailMatch ? emailMatch[0] : "";

  // ——— Telefoon (zelfde regel, volgende regel, of elders in de kop)
  // herkent: 06 12 34 56 78 • 06-12345678 • +31 6 1234 5678 • +31612345678
  const phoneBlock = head.slice(
    Math.max(0, head.toLowerCase().indexOf("phone")),
    Math.max(0, head.toLowerCase().indexOf("phone")) + 120
  );
  const telRe = /(?:(?:\+31|0)\s*6[\s-]?\d(?:[\s-]?\d){7,8})/;
  let phone = "";

  // 1) direct op/na "Phone"/"Telefoon"
  const m1 = /(?:Phone|Telefoon)\s*[:\s]*([\s\S]{0,40})/i.exec(phoneBlock || "");
  if (m1) {
    const cand = (m1[1] || "").split(/\r?\n/)[0];
    const mTel = telRe.exec(cand) || telRe.exec(head.slice(head.toLowerCase().indexOf("phone"), head.length));
    if (mTel) phone = mTel[0];
  }
  // 2) elders in de kop
  if (!phone) {
    const mTelAny = telRe.exec(head);
    if (mTelAny) phone = mTelAny[0];
  }
  phone = phone.replace(/\s{2,}/g, " ").trim();

  // ——— Pak regels rondom de e-mail (meestal staat naam/bedrijf vlakbij)
  let around = head;
  if (emailMatch) {
    const i = emailMatch.index;
    const start = Math.max(0, i - 500);
    const end = Math.min(head.length, i + 500);
    around = head.slice(start, end);
  }
  const lines = around
    .split(/\r?\n/)
    .map(s => s.replace(/\u00A0/g, " ").trim())
    .filter(Boolean);

  // Zoek het mini-blokje boven de e-mail (typisch: Bedrijf, Naam, Adres… E-mail)
  let company = "";
  let name = "";

  // Neem maximaal ~4 regels direct boven de e-mail als ‘blok’
  let above = [];
  if (emailMatch) {
    const headBefore = head.slice(0, emailMatch.index).split(/\r?\n/).map(s => s.trim());
    // loop terug tot lege regel of 4 regels
    for (let i = headBefore.length - 1; i >= 0 && above.length < 6; i--) {
      const L = headBefore[i];
      if (!L) break;
      above.unshift(L);
      if (/^\s*$/.test(headBefore[i-1] || "")) break;
    }
  } else {
    // fallback: pak eerste 10 regels van het document
    above = head.split(/\r?\n/).slice(0, 10).map(s => s.trim()).filter(Boolean);
  }

  // verwijder duidelijke labels
  const clean = (s) => s.replace(/^(company|bedrijf|organisation|organization|adres|address)\s*:?\s*/i, "");

  const block = above.map(clean).filter(Boolean);

  // heuristiek: vaak is regel 1 bedrijf en regel 2 naam
  const capNameRe = /^([A-Z][a-z]+(?:\s+(?:van|de|der|den|von|da|di))?\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})$/;
  // kies kandidaten die geen e-mail/prijs/labels zijn
  const candidates = block.filter(s =>
    !/@/.test(s) &&
    !/€|EUR|BTW|Invoice|Factuur/i.test(s) &&
    s.length <= 60
  );

  // probeer bedrijf/naam uit kandidaten te halen
  // strategie:
  // 1) als er 2 nette korte regels boven e-mail staan: [bedrijf, naam]
  // 2) als slechts één regel naam-achtig is → naam; andere kortere uppercase-ish → bedrijf
  if (candidates.length >= 2) {
    const first = candidates[0], second = candidates[1];

    const looksLikeName1 = capNameRe.test(first);
    const looksLikeName2 = capNameRe.test(second);

    if (!looksLikeName1 && looksLikeName2) {
      company = first;
      name = second;
    } else if (looksLikeName1 && !looksLikeName2) {
      name = first;
      company = second;
    } else if (!looksLikeName1 && !looksLikeName2) {
      // beide lijken geen naam → neem eerste als bedrijf, tweede als naam fallback
      company = first;
      name = second;
    } else {
      // beide lijken naam → neem eerste als naam; bedrijf onbekend
      name = first;
    }
  } else if (candidates.length === 1) {
    // één regel: besluit of het een naam of een bedrijf is
    if (capNameRe.test(candidates[0])) name = candidates[0];
    else company = candidates[0];
  }

  // ——— Veldjes invullen (alleen als leeg)
  setIfEmpty('input[name="email"]', email);
  setIfEmpty('input[name="renterName"]', name);
  setIfEmpty('input[name="company"]', company);
  setIfEmpty('input[name="phone"]', phone);
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
fillRenterFromText(text);
if (typeof fillDatesFromText === "function") fillDatesFromText(text);

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
