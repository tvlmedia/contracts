// Utils
const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);

const itemsTbody = $("#itemsTable tbody");
const addBtn = $("#btnAdd");
const csvInput = $("#csvInput");
const form = $("#rentalForm");
const acceptTerms = $("#acceptTerms");
const yearEl = $("#year");
yearEl.textContent = new Date().getFullYear();

// Signature Pad setup
let signaturePad;
window.addEventListener("load", () => {
  const canvas = document.getElementById("signaturePad");
  const resize = () => {
    const ratio = Math.max(window.devicePixelRatio || 1, 1);
    canvas.width = canvas.offsetWidth * ratio;
    canvas.height = 220 * ratio;
    canvas.getContext("2d").scale(ratio, ratio);
    if (signaturePad && signaturePad.isEmpty()) signaturePad.clear();
  };
  window.addEventListener("resize", resize);
  resize();
  signaturePad = new SignaturePad(canvas, { backgroundColor: "rgba(255,255,255,1)" });
});

// -------- Date/Time pickers (Flatpickr) --------
document.addEventListener("DOMContentLoaded", () => {
  // rond “nu” af op 15 minuten
  const now = new Date();
  const rounded = new Date(now.getTime());
  rounded.setMinutes(Math.ceil(rounded.getMinutes() / 15) * 15, 0, 0);

  const fpCommon = { enableTime: true, dateFormat: "d-m-Y, H:i", time_24hr: true };

  if (window.flatpickr) {
    window.flatpickr("#pickupDateTime", { ...fpCommon, defaultDate: rounded });
    window.flatpickr("#returnDateTime", { ...fpCommon });
  }
});

// -------- Pickup/Return location dropdowns --------
const ADDRESS_OFFICE = "Beek en Donk (Donkersvoorstestraat 3)";

function syncLocation(mode) {
  const modeSel = document.getElementById(mode + "Mode");
  const deliveryWrap = document.getElementById(mode + "DeliveryWrap");
  const deliveryInput = document.getElementById(mode + "DeliveryInput");
  const hiddenField = document.getElementById(mode + "Location");

  if (modeSel.value === "delivery") {
    deliveryWrap.style.display = "";
    hiddenField.value = deliveryInput.value.trim() || "Bezorging – adres nog invullen";
  } else {
    deliveryWrap.style.display = "none";
    hiddenField.value = ADDRESS_OFFICE;
  }
}

// wire events
["pickup","return"].forEach(m=>{
  const modeSel = document.getElementById(m+"Mode");
  const deliveryInput = document.getElementById(m+"DeliveryInput");
  if (modeSel) {
    modeSel.addEventListener("change", ()=>syncLocation(m));
  }
  if (deliveryInput) {
    ["input","blur"].forEach(ev=>deliveryInput.addEventListener(ev, ()=>syncLocation(m)));
  }
  // init with defaults
  syncLocation(m);
});

// Voor de zekerheid: net vóór PDF maken nog één keer syncen
form.addEventListener("submit", () => {
  syncLocation("pickup");
  syncLocation("return");
});

$("#btnClearSig").addEventListener("click", () => signaturePad.clear());

// Add row to table
function addRow({Item="", Serial="", Qty=1, Condition=""}) {
  const tr = document.createElement("tr");
  tr.innerHTML = `
    <td><input type="text" value="${Item}" placeholder="Item" /></td>
    <td><input type="text" value="${Serial}" placeholder="Serial" /></td>
    <td><input type="number" value="${Qty}" min="1" /></td>
    <td><input type="text" value="${Condition}" placeholder="Condition" /></td>
    <td><button type="button" class="remove">✕</button></td>
  `;
  itemsTbody.appendChild(tr);
  tr.querySelector(".remove").addEventListener("click", () => tr.remove());
}

// Add row via inputs
addBtn.addEventListener("click", () => {
  const Item = $("#addItem").value.trim();
  const Serial = $("#addSerial").value.trim();
  const Qty = parseInt($("#addQty").value || "1", 10);
  const Condition = $("#addCondition").value.trim();
  if (!Item) { alert("Vul minstens een itemnaam in."); return; }
  addRow({ Item, Serial, Qty: isNaN(Qty) ? 1 : Qty, Condition });
  $("#addItem").value = ""; $("#addSerial").value = ""; $("#addQty").value = 1; $("#addCondition").value = "";
});

// CSV upload
csvInput.addEventListener("change", (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  Papa.parse(file, {
    header: true,
    skipEmptyLines: true,
    complete: (results) => {
      if (!Array.isArray(results.data)) return;
      results.data.forEach(row => {
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

// Collect table data
function collectItems() {
  const rows = [...itemsTbody.querySelectorAll("tr")];
  return rows.map(tr => {
    const [i, s, q, c] = [...tr.querySelectorAll("input")];
    return {
      Item: i.value.trim(),
      Serial: s.value.trim(),
      Qty: parseInt(q.value || "1", 10) || 1,
      Condition: c.value.trim()
    };
  }).filter(r => r.Item);
}

// Unique ID
function makeId() {
  const ts = new Date().toISOString().replace(/[-:T.Z]/g, "").slice(0,14);
  const rnd = Math.random().toString(36).slice(2,7).toUpperCase();
  return `TVL-${ts}-${rnd}`;
}

// Form submit -> PDF
form.addEventListener("submit", async (e) => {
  e.preventDefault();

  if (!acceptTerms.checked) {
    alert("Je moet akkoord gaan met de algemene voorwaarden.");
    return;
  }
  if (!signaturePad || signaturePad.isEmpty()) {
    alert("Zet een handtekening aub.");
    return;
  }

  const fd = new FormData(form);
  const data = Object.fromEntries(fd.entries());
  const items = collectItems();
  if (items.length === 0) {
    if (!confirm("De gear-lijst is leeg. Toch doorgaan en PDF maken?")) return;
  }

  const id = makeId();
  const now = new Date();
  const ip = (await getIP()).ip || "n/a"; // best-effort

  // PDF
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const margin = 36;
  let y = margin;

  // Header
  doc.setFillColor(0,0,0);
  doc.rect(0,0,doc.internal.pageSize.getWidth(), 54, "F");
  doc.setTextColor(255,255,255);
  doc.setFont("helvetica","bold");
  doc.setFontSize(16);
  doc.text("TVL Rental – Overdrachtsformulier & Akkoord", margin, 34);

  doc.setTextColor(0,0,0);
  doc.setFont("helvetica","normal");
  doc.setFontSize(11);
  y = 72;

  // Meta blok
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
  doc.setFont("helvetica","bold"); doc.setFontSize(12);
  doc.text("Periode", margin, y);
  doc.setFont("helvetica","normal"); doc.setFontSize(11);
  y += 18;
  y = drawTwoCols(doc,
    [["Ophaal", data.pickup || ""], ["Retour", data.return || ""], ["Ophalen op", data.pickupLocation || ""], ["Retour op", data.returnLocation || ""]],
    [["AV akkoord", acceptTerms.checked ? "Ja" : "Nee"], ["AV link", document.getElementById("termsLink").href], ["IP (best-effort)", ip], ["User-Agent", navigator.userAgent]],
    margin, y, 260, 16
  );

  // Items tabel
  y += 18;
  doc.setFont("helvetica","bold"); doc.setFontSize(12);
  doc.text("Overgedragen items", margin, y);
  doc.setFont("helvetica","normal");
  y += 10;

  doc.autoTable({
    startY: y,
    margin: { left: margin, right: margin },
    styles: { fontSize: 10, cellPadding: 6 },
    headStyles: { fillColor: [16,21,27], textColor: 255 },
    head: [["Item","Serial","Qty","Condition"]],
    body: items.length ? items.map(r => [r.Item, r.Serial, r.Qty, r.Condition]) : [["—","—","—","—"]]
  });

  let afterTableY = doc.lastAutoTable ? doc.lastAutoTable.finalY + 16 : y + 40;

  // Verklaring + handtekening
  const declaration = "Ondergetekende bevestigt alle genoemde items in goede orde te hebben ontvangen en gaat akkoord met de Algemene Voorwaarden van TVL Rental.";
  const sigTitleY = drawParagraph(doc, declaration, margin, afterTableY, 522, 12);
  const sigY = sigTitleY + 18;

  // Signature image
  const sigDataUrl = signaturePad.toDataURL("image/png");
  const sigW = 300, sigH = 100;
  doc.setDrawColor(180); doc.rect(margin, sigY-2, sigW+4, sigH+4);
  doc.addImage(sigDataUrl, "PNG", margin+2, sigY, sigW, sigH);
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

  // Save
  const safeProject = (data.project || "project").replace(/[^a-z0-9_\-]+/gi,"_");
  doc.save(`TVL_Rental_Overdracht_${safeProject}_${id}.pdf`);
});

// helpers for layout
function drawTwoCols(doc, leftPairs, rightPairs, x, y, colW, lineH) {
  doc.setFontSize(11); doc.setFont("helvetica","normal");
  leftPairs.forEach((row,i)=>{
    doc.setFont("helvetica","bold"); doc.text(`${row[0]}:`, x, y + i*lineH);
    doc.setFont("helvetica","normal"); doc.text(String(row[1] ?? ""), x + 110, y + i*lineH);
  });
  rightPairs.forEach((row,i)=>{
    doc.setFont("helvetica","bold"); doc.text(`${row[0]}:`, x + colW + 40, y + i*lineH);
    doc.setFont("helvetica","normal"); doc.text(String(row[1] ?? ""), x + colW + 150, y + i*lineH, { maxWidth: 250 });
  });
  const rows = Math.max(leftPairs.length, rightPairs.length);
  return y + rows*lineH + 4;
}

function drawParagraph(doc, text, x, y, maxW, fontSize=11) {
  doc.setFont("helvetica","normal"); doc.setFontSize(fontSize);
  const lines = doc.splitTextToSize(text, maxW);
  doc.text(lines, x, y);
  return y + lines.length * (fontSize + 2);
}

// Best-effort IP capture (kan je ook weglaten)
async function getIP() {
  try {
    const r = await fetch("https://api.ipify.org?format=json");
    return await r.json();
  } catch (_) { return {}; }
}
