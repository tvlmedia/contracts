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
    next.searchParams.set("sig",  hash);
    next.searchParams.set("name", name);
    history.replaceState(null, "", next.toString());

    // overlay sluiten
    document.body.classList.remove("locked");

    // naam invullen + focus
    const nameField = document.querySelector('input[name="renterName"]');
    if (nameField && !nameField.value) nameField.value = name.trim();
    (nameField || document.querySelector('input,select,textarea,button'))?.focus?.();

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
      const r = await fetch(RESOLVE_ENDPOINT + "?query=" + encodeURIComponent(q));
      if (!r.ok) throw new Error("resolve HTTP " + r.status);
      const json = await r.json();

      if (!json.ok || !json.order) {
        toast(`Geen match gevonden voor “${name}”.`, true);
        err?.classList.remove("hidden");
        setTimeout(() => err?.classList.add("hidden"), 2500);
        return;
      }

      // Zet order + name + sig in URL zonder reload
      const next = new URL(location.href);
      next.searchParams.set("order", json.order);
      next.searchParams.set("name",  name);
      if (json.sig) next.searchParams.set("sig", json.sig);
      history.replaceState(null, "", next.toString());

      // Ga door
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

/* ==== NIEUW: PDF → nette regels op basis van Y ==== */
async function extractTextFromPdf(arrayBuffer){
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const allLines = [];

  for (let p = 1; p <= pdf.numPages; p++){
    const page = await pdf.getPage(p);
    const content = await page.getTextContent();

    const rows = {};
    for (const it of content.items){
      const t = it.transform;
      const x = t[4], y = t[5];
      const key = Math.round(y/2)*2; // snap y om ruis te dempen
      (rows[key] ||= []).push({ x, str: it.str });
    }

    const yKeys = Object.keys(rows).map(Number).sort((a,b)=>b-a);
    for (const yk of yKeys){
      const parts = rows[yk].sort((a,b)=>a.x-b.x).map(o=>o.str);
      allLines.push(parts.join(" "));
    }
    allLines.push("");
  }
  return allLines.join("\n");
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

/* ==== Autofill helpers ==== */
function fillDatesFromText(txt){
  const pick = /Pickup\s+(\d{2}-\d{2}-\d{4})\s+(\d{2}:\d{2})/i.exec(txt);
  const ret  = /Return\s+(\d{2}-\d{2}-\d{4})\s+(\d{2}:\d{2})/i.exec(txt);
  const fmt = (d, t) => `${d}, ${t}`;
  const fpP = document.getElementById("pickupDateTime")?._flatpickr;
  const fpR = document.getElementById("returnDateTime")?._flatpickr;
  if (pick && fpP) fpP.setDate(fmt(pick[1], pick[2]), true);
  if (ret  && fpR) fpR.setDate(fmt(ret[1],  ret[2]),  true);
}

function fillRenterFromText(txt){
  const email = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i.exec(txt);
  const emailEl = document.querySelector('input[name="email"]');
  if (email && emailEl) emailEl.value = email[0];

  let name = "";
  if (email) {
    const before = txt.slice(0, email.index).split(/\r?\n/).pop() || "";
    if (before && !/totaal|btw|insurance|verze/i.test(before)) name = before.trim();
  }
  if (!name) {
    const nm = /([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})/.exec(txt);
    if (nm) name = nm[1];
  }
  const nameEl = document.querySelector('input[name="renterName"]');
  if (name && nameEl) nameEl.value = name;
}

/* ==== Sterke multi-pass item parser ==== */
function parseBooqableItems(rawText){
  const rows = [];
  const lines = rawText.split(/\n+/).map(norm).filter(Boolean);

  const push = (Item, Serial="", Qty=1, Condition="")=>{
    if (!Item) return;
    rows.push({
      Item: Item.replace(/\s+€.*$/,"").trim(),
      Serial: (Serial||"").trim(),
      Qty: Number(Qty)||1,
      Condition: (Condition||"").trim()
    });
  };

  // A) "qty x item ... day(s)/dag(en)/week(en)"
  for (const line of lines){
    const m = line.match(/^(?<qty>\d+)\s*(?:x)?\s+(?<item>.+?)\s+(?:(?:\d+\s*)?(?:day|days|dag|dagen|week|weken)\b)/i);
    if (m){ push(m.groups.item, "", m.groups.qty); continue; }
  }

  // B) "... Qty: n" of "... Aantal: n"
  for (const line of lines){
    const m = line.match(/^(?<item>.+?)\s+(?:Qty|Aantal)\s*[: ]\s*(?<qty>\d+)\b/i);
    if (m){ push(m.groups.item, "", m.groups.qty); continue; }
  }

  // C) Zelfde regel met Serial/SN/ID
  for (const line of lines){
    const m = line.match(/^(?<qty>\d+)?\s*(?:x)?\s*(?<item>.+?)\s+(?:Serial|S\/N|SN|Serienummer|ID|Asset|Barcode)\s*[:# ]\s*(?<sn>[A-Z0-9\-\/._]+)/i);
    if (m){ push(m.groups.item, m.groups.sn, m.groups.qty||1); continue; }
  }

  // D) Tabelregels op grote whitespaceblokken
  for (const line of lines){
    const cols = line.split(/\s{3,}/).map(c=>c.trim());
    if (cols.length >= 3){
      const [A,B,C,D] = cols;
      if (/^\d+$/.test(C))       push(A, B, C, D||"");
      else if (/^\d+$/.test(B))  push(A, "", B, C||"");
    }
  }

  // E) Naam + volgende regel qty
  if (!rows.length){
    for (let i=0;i<lines.length-1;i++){
      const l1 = lines[i], l2 = lines[i+1];
      const m = l2.match(/(?:Qty|Aantal)\s*[: ]\s*(\d+)/i);
      if (m && !/total|totaal|sum/i.test(l1)) push(l1, "", m[1]);
    }
  }

  // F) Dedupe (merge qty)
  const map = new Map();
  for (const r of rows){
    const key = (r.Item.toLowerCase()+"|"+(r.Serial||"").toLowerCase());
    if (!map.has(key)) map.set(key, r);
    else map.get(key).Qty += r.Qty;
  }
  return [...map.values()];
}
