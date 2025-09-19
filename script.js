
// ====== LENS COMPARISON TOOL SCRIPT (WERKEND MET PDF LOGO) ======
if (window.innerWidth < 768) {
  document.body.classList.add("mobile-mode");
}
// === SENSOR DATA (mm) – Venice is je basis (6K 3:2) ===
const cameras = {
  "ARRI Alexa Mini LF": {
    "Open Gate": { w: 36.696, h: 25.542, label: "Open Gate" },
    "2.39:1": { w: 36.696, h: 15.312, label: "2.39:1" },
    "4.3K LF 16:9": { w: 35.640, h: 20.047, label: "4.3K LF 16:9" },
    "16:9": { w: 31.680, h: 17.820, label: "16:9" },
    "3.4K S35": { w: 28.248, h: 18.166, label: "3:2" },
    "3.2K S35 16:9": { w: 26.400, h: 14.850, label: "16:9" },
    "2.8K LF 1:1": { w: 23.760, h: 23.760, label: "1:1" },
    "2.8K S35 4:3": { w: 23.760, h: 17.820, label: "4:3" },
    "2.8K S35 16:9": { w: 23.760, h: 13.365, label: "16:9" }
  },
  "Arri Alexa Mini": {
    "Open Gate": { w: 28.248, h: 18.166, label: "Open Gate" },
    "3.2K": { w: 26.400, h: 14.850, label: "3.2K (16:9)" },
    "4K UHD": { w: 26.400, h: 14.850, label: "4K UHD (16:9)" },
    "4:3 2.8K": { w: 23.760, h: 17.820, label: "4:3 2.8K" },
    "HD": { w: 23.760, h: 13.365, label: "HD (16:9)" },
    "2K": { w: 23.661, h: 13.299, label: "2K (16:9)" },
    "2.39:1 2K Ana": { w: 42.240, h: 17.696, label: "2.39:1 2K Ana" },
    "HD Ana": { w: 31.680, h: 17.820, label: "HD Ana (16:9)" },
    "S16 HD": { w: 13.200, h: 7.425, label: "S16 HD (16:9)" }
  },
  "ARRI Alexa 35": {
    "4.6K 3:2 Open Gate": { w: 27.994, h: 19.221, label: "4.6K 3:2 Open Gate" },
    "4.6K 16:9": { w: 27.994, h: 15.746, label: "4.6K 16:9" },
    "4K 16:9": { w: 24.883, h: 13.997, label: "4K 16:9" },
    "4K 2:1": { w: 24.883, h: 12.442, label: "4K 2:1" },
    "3.3K 6:5": { w: 20.218, h: 16.949, label: "3.3K 6:5" },
    "3K 1:1": { w: 18.662, h: 18.662, label: "3K 1:1" },
    "2.7K 8:9": { w: 16.664, h: 18.747, label: "2.7K 8:9" },
    "2K 16:9 S16": { w: 12.442, h: 6.998, label: "2K 16:9 S16" }
  },
  "Sony Venice": {
    "6K 3:2": { w: 36.167, h: 24.111, label: "6K 3:2" },
    "6K 1.85:1": { w: 36.203, h: 19.567, label: "6K 1.85:1" },
    "6K 17:9": { w: 36.203, h: 19.088, label: "6K 17:9" },
    "6K 2.39:1": { w: 36.167, h: 15.153, label: "6K 2.39:1" },
    "5.7K 16:9": { w: 33.907, h: 19.076, label: "5.7K 16:9" },
    "4K 6:5": { w: 24.494, h: 20.523, label: "4K 6:5" },
    "4K 4:3": { w: 24.494, h: 18.084, label: "4K 4:3" },
    "4K 17:9": { w: 24.494, h: 12.917, label: "4K 17:9" },
    "4K 2.39:1": { w: 24.494, h: 10.262, label: "4K 2.39:1" },
    "3.8K 16:9": { w: 22.963, h: 12.917, label: "3.8K 16:9" }
  },
  "Sony FX6": {
    "4K DCI": { w: 35.616, h: 18.858, label: "4K DCI" }
  },
  "Sony FX9": {
    "4K 17:9 (6K FF Imager Mode)": { w: 35.688, h: 18.818, label: "4K 17:9 (6K FF Imager Mode)" },
    "4K 16:9 (5.6K FF Imager Mode)": { w: 33.454, h: 18.818, label: "4K 16:9 (5.6K FF Imager Mode)" },
    "Full-HD (6K FF Imager Mode)": { w: 33.454, h: 18.818, label: "Full-HD (6K FF Imager Mode)" },
    "4K 17:9 (5K Crop Mode)": { w: 29.748, h: 15.682, label: "4K 17:9 (5K Crop Mode)" },
    "4K 17:9 (S35 Imager Mode)": { w: 24.330, h: 12.830, label: "4K 17:9 (S35 Imager Mode)" },
    "3.8K 16:9 (S35 Imager mode)": { w: 22.810, h: 12.830, label: "3.8K 16:9 (S35 Imager Mode)" },
    "Full-HD (4K S35 Imager Mode)": { w: 22.810, h: 12.830, label: "Full-HD (4K S35 Imager Mode)" },
    "S16 2K": { w: 12.165, h: 6.415, label: "S16 2K" }
  },
  "DJI Ronin 4D 6K": {
    "6K FF 17:9": { w: 35.688, h: 18.818, label: "6K FF 17:9" },
    "6K FF 2.39:1": { w: 35.688, h: 14.921, label: "6K FF 2.39:1" },
    "4K S35 17:9": { w: 24.330, h: 12.830, label: "4K S35 17:9" },
    "4K S35 2.39:1": { w: 24.330, h: 10.169, label: "4K S35 2.39:1" }
  },
  "DJI Ronin 4D 8K": {
    "8K FF 17:9": { w: 36.045, h: 19.008, label: "8K FF 17:9" },
    "8K FF 2.39:1": { w: 36.045, h: 15.066, label: "8K FF 2.39:1" },
    "5.5K S35 17:9": { w: 24.499, h: 12.989, label: "5.5K S35 17:9" }
  },
  "RED Komodo-X": {
    "6K 17:9": { w: 27.034, h: 14.256, label: "6K 17:9" },
    "6K 2.4:1": { w: 27.034, h: 11.405, label: "6K 2.4:1" },
    "6K 16:9": { w: 25.344, h: 14.256, label: "6K 16:9" },
    "5K 17:9": { w: 22.528, h: 11.880, label: "5K 17:9" },
    "6K 3:2": { w: 21.384, h: 14.256, label: "6K 3:2" },
    "6K 4:3": { w: 19.008, h: 14.256, label: "6K 4:3" },
    "4K 17:9": { w: 18.022, h: 9.504, label: "4K 17:9" },
    "6K 6:5": { w: 17.107, h: 14.256, label: "6K 6:5" },
    "4K 16:9": { w: 16.896, h: 9.504, label: "4K 16:9" },
    "2K 17:9": { w: 9.011, h: 4.752, label: "2K 17:9" }
  },
  "RED Komodo 6K": {
    "6K 17:9": { w: 27.034, h: 14.256, label: "6K 17:9" },
    "6K 2.4:1": { w: 27.034, h: 11.405, label: "6K 2.4:1" },
    "6K 16:9": { w: 25.344, h: 14.256, label: "6K 16:9" },
    "5K 17:9": { w: 22.528, h: 11.880, label: "5K 17:9" },
    "6K 3:2": { w: 21.384, h: 14.256, label: "6K 3:2" },
    "6K 4:3": { w: 19.008, h: 14.256, label: "6K 4:3" },
    "4K 17:9": { w: 18.022, h: 9.504, label: "4K 17:9" },
    "6K 6:5": { w: 17.107, h: 14.256, label: "6K 6:5" },
    "4K 16:9": { w: 16.896, h: 9.504, label: "4K 16:9" },
    "2K 17:9": { w: 9.011, h: 4.752, label: "2K 17:9" }
  },
 "RED V-Raptor XL 8K VV": {
  "8K 17:9": { w: 40.960, h: 21.600, label: "8K 17:9" },
  "8K 2:1": { w: 40.960, h: 20.480, label: "8K 2:1" },
  "8K 2.4:1": { w: 40.960, h: 17.280, label: "8K 2.4:1" },
  "8K 16:9": { w: 38.400, h: 21.600, label: "8K 16:9" },
  "7K 17:9": { w: 35.840, h: 18.900, label: "7K 17:9" },
  "7K 2:1": { w: 35.840, h: 17.920, label: "7K 2:1" },
  "7K 2.4:1": { w: 35.840, h: 15.010, label: "7K 2.4:1" },
  "7K 16:9": { w: 33.600, h: 18.900, label: "7K 16:9" },
  "8K 3:2": { w: 32.400, h: 21.600, label: "8K 3:2" },
  "6K 17:9": { w: 30.720, h: 16.200, label: "6K 17:9" },
  "6K 2:1": { w: 30.720, h: 15.360, label: "6K 2:1" },
  "6K 2.4:1": { w: 30.720, h: 12.960, label: "6K 2.4:1" },
  "8K 4:3": { w: 28.800, h: 21.600, label: "8K 4:3" },
  "6K 16:9": { w: 28.800, h: 16.200, label: "6K 16:9" },
  "7K 3:2": { w: 28.350, h: 18.900, label: "7K 3:2" },
  "8K 6:5": { w: 25.920, h: 21.600, label: "8K 6:5" },
  "5K 17:9": { w: 25.600, h: 13.500, label: "5K 17:9" },
  "5K 2:1": { w: 25.600, h: 12.800, label: "5K 2:1" },
  "5K 2.4:1": { w: 25.600, h: 10.800, label: "5K 2.4:1" },
  "7K 4:3": { w: 25.200, h: 18.900, label: "7K 4:3" },
  "5K 16:9": { w: 24.000, h: 13.500, label: "5K 16:9" },
  "7K 6:5": { w: 22.680, h: 18.900, label: "7K 6:5" },
  "8K 1:1": { w: 21.600, h: 21.600, label: "8K 1:1" },
  "4K 17:9": { w: 20.480, h: 10.800, label: "4K 17:9" },
  "4K 2:1": { w: 20.480, h: 10.240, label: "4K 2:1" },
  "4K 2.4:1": { w: 20.480, h: 8.640, label: "4K 2.4:1" },
  "4K 16:9": { w: 19.200, h: 10.800, label: "4K 16:9" },
  "7K 1:1": { w: 18.900, h: 18.900, label: "7K 1:1" },
  "6K 1:1": { w: 16.200, h: 16.200, label: "6K 1:1" },
  "3K 17:9": { w: 15.360, h: 8.100, label: "3K 17:9" },
  "3K 2:1": { w: 15.360, h: 7.680, label: "3K 2:1" },
  "3K 2.4:1": { w: 15.360, h: 6.480, label: "3K 2.4:1" },
  "5K 1:1": { w: 13.500, h: 13.500, label: "5K 1:1" },
  "4K 1:1": { w: 10.800, h: 10.800, label: "4K 1:1" },
  "2K 17:9": { w: 10.240, h: 5.400, label: "2K 17:9" },
  "2K 2:1": { w: 10.240, h: 5.120, label: "2K 2:1" },
  "2K 2.4:1": { w: 10.240, h: 4.320, label: "2K 2.4:1" },
  "2K 16:9": { w: 9.600, h: 5.400, label: "2K 16:9" },
  "3K 16:9": { w: 9.400, h: 8.100, label: "3K 16:9" },
  "3K 1:1": { w: 8.100, h: 8.100, label: "3K 1:1" },
  "2K 1:1": { w: 5.400, h: 5.400, label: "2K 1:1" }
},

"RED V-Raptor 8K VV": {
  "8K 17:9": { w: 40.960, h: 21.600, label: "8K 17:9" },
  "8K 2:1": { w: 40.960, h: 20.480, label: "8K 2:1" },
  "8K 2.4:1": { w: 40.960, h: 17.280, label: "8K 2.4:1" },
  "8K 16:9": { w: 38.400, h: 21.600, label: "8K 16:9" },
  "7K 17:9": { w: 35.840, h: 18.900, label: "7K 17:9" },
  "7K 2:1": { w: 35.840, h: 17.920, label: "7K 2:1" },
  "7K 2.4:1": { w: 35.840, h: 15.010, label: "7K 2.4:1" },
  "7K 16:9": { w: 33.600, h: 18.900, label: "7K 16:9" },
  "8K 3:2": { w: 32.400, h: 21.600, label: "8K 3:2" },
  "6K 17:9": { w: 30.720, h: 16.200, label: "6K 17:9" },
  "6K 2:1": { w: 30.720, h: 15.360, label: "6K 2:1" },
  "6K 2.4:1": { w: 30.720, h: 12.960, label: "6K 2.4:1" },
  "8K 4:3": { w: 28.800, h: 21.600, label: "8K 4:3" },
  "6K 16:9": { w: 28.800, h: 16.200, label: "6K 16:9" },
  "7K 3:2": { w: 28.350, h: 18.900, label: "7K 3:2" },
  "8K 6:5": { w: 25.920, h: 21.600, label: "8K 6:5" },
  "5K 17:9": { w: 25.600, h: 13.500, label: "5K 17:9" },
  "5K 2:1": { w: 25.600, h: 12.800, label: "5K 2:1" },
  "5K 2.4:1": { w: 25.600, h: 10.800, label: "5K 2.4:1" },
  "7K 4:3": { w: 25.200, h: 18.900, label: "7K 4:3" },
  "5K 16:9": { w: 24.000, h: 13.500, label: "5K 16:9" },
  "7K 6:5": { w: 22.680, h: 18.900, label: "7K 6:5" },
  "8K 1:1": { w: 21.600, h: 21.600, label: "8K 1:1" },
  "4K 17:9": { w: 20.480, h: 10.800, label: "4K 17:9" },
  "4K 2:1": { w: 20.480, h: 10.240, label: "4K 2:1" },
  "4K 2.4:1": { w: 20.480, h: 8.640, label: "4K 2.4:1" },
  "4K 16:9": { w: 19.200, h: 10.800, label: "4K 16:9" },
  "7K 1:1": { w: 18.900, h: 18.900, label: "7K 1:1" },
  "6K 1:1": { w: 16.200, h: 16.200, label: "6K 1:1" },
  "3K 17:9": { w: 15.360, h: 8.100, label: "3K 17:9" },
  "3K 2:1": { w: 15.360, h: 7.680, label: "3K 2:1" },
  "3K 2.4:1": { w: 15.360, h: 6.480, label: "3K 2.4:1" },
  "5K 1:1": { w: 13.500, h: 13.500, label: "5K 1:1" },
  "4K 1:1": { w: 10.800, h: 10.800, label: "4K 1:1" },
  "2K 17:9": { w: 10.240, h: 5.400, label: "2K 17:9" },
  "2K 2:1": { w: 10.240, h: 5.120, label: "2K 2:1" },
  "2K 2.4:1": { w: 10.240, h: 4.320, label: "2K 2.4:1" },
  "2K 16:9": { w: 9.600, h: 5.400, label: "2K 16:9" },
  "3K 16:9": { w: 9.400, h: 8.100, label: "3K 16:9" },
  "3K 1:1": { w: 8.100, h: 8.100, label: "3K 1:1" },
  "2K 1:1": { w: 5.400, h: 5.400, label: "2K 1:1" }
},

"Blackmagic URSA Cine 12K LF": {
  "12K Open Gate": { w: 35.635, h: 23.316, label: "12K Open Gate" },
  "12K 16:9": { w: 35.635, h: 18.792, label: "12K 16:9" },
  "12K 17:9": { w: 35.635, h: 18.792, label: "12K 17:9" },
  "12K 2.4:1": { w: 35.635, h: 14.825, label: "12K 2.4:1" },
  "12K 6:5": { w: 27.979, h: 23.316, label: "12K 6:5" },
  "9K 3:2": { w: 27.283, h: 18.166, label: "9K 3:2" },
  "9K 17:9": { w: 27.005, h: 14.198, label: "9K 17:9" },
  "9K 2.4:1": { w: 27.005, h: 11.206, label: "9K 2.4:1" },
  "9K 16:9": { w: 25.195, h: 14.198, label: "9K 16:9" },
  "9K 6:5": { w: 22.272, h: 18.583, label: "9K 6:5" }
}
};

// Pak de elementen
const cameraSelect = document.getElementById("cameraSelect");
const BASE_SENSOR = cameras["Sony Venice"]["6K 3:2"]; // jouw referentie
const sensorFormatSelect = document.getElementById("sensorFormatSelect");
const comparisonWrapper = document.getElementById("comparisonWrapper"); // ← verplaatst naar boven


function isWrapperFullscreen() {
  const fe = document.fullscreenElement || document.webkitFullscreenElement;
  return fe === comparisonWrapper;
}
async function enterWrapperFullscreen() {
  if (comparisonWrapper.requestFullscreen) return comparisonWrapper.requestFullscreen();
  if (comparisonWrapper.webkitRequestFullscreen) return comparisonWrapper.webkitRequestFullscreen();
}
async function exitAnyFullscreen() {
  if (document.exitFullscreen) return document.exitFullscreen();
  if (document.webkitExitFullscreen) return document.webkitExitFullscreen();
}
function setWrapperSizeByAR(w, h) {
  if (isWrapperFullscreen()) return; // in fullscreen geen inline heights forceren

  const width = comparisonWrapper.getBoundingClientRect().width;

  // ← in SBS willen we 2× zo breed: 3:2 wordt 6:2
  const arWidth = sbsActive ? (w * 2) : w;

const height = Math.round(width * (h / arWidth)); // ← geen * 1.35
  
  comparisonWrapper.style.removeProperty('aspect-ratio');
  comparisonWrapper.style.setProperty('height',     `${height}px`, 'important');
  comparisonWrapper.style.setProperty('min-height', `${height}px`, 'important');
  comparisonWrapper.style.setProperty('max-height', `${height}px`, 'important');
}
function clearInlineHeights() {
  comparisonWrapper.style.removeProperty('height');
  comparisonWrapper.style.removeProperty('min-height');
  comparisonWrapper.style.removeProperty('max-height');
}







function applyCurrentFormat() {
  const cam = cameraSelect.value;
  const fmt = sensorFormatSelect.value;
  if (!cam || !fmt) return;

  const { w, h } = cameras[cam][fmt];

  // reset schaal var
  comparisonWrapper.style.removeProperty("--sensor-scale");

  // Altijd exact naar gekozen formaat schalen
  setWrapperSizeByAR(w, h);
  requestAnimationFrame(() => (w, h));

  document.body.classList.add("sensor-mode");

  // Schaal t.o.v. Venice
  let scale = BASE_SENSOR.w / w;
  if (Math.abs(BASE_SENSOR.w - w) < 0.1) scale = 1;
  comparisonWrapper.style.setProperty("--sensor-scale", scale.toFixed(4));

  // Bars/slider opnieuw positioneren
  updateFullscreenBars();
  resetSplitToMiddle();
}

// Vul camera dropdown
Object.keys(cameras).forEach(cam => {
  cameraSelect.add(new Option(cam, cam));
});

// Vul formats wanneer camera verandert
cameraSelect.addEventListener("change", () => {
  sensorFormatSelect.innerHTML = "";
  const cam = cameraSelect.value;
 if (!cam) {
  sensorFormatSelect.disabled = true;
  document.body.classList.remove("sensor-mode");
  comparisonWrapper.style.removeProperty('height');      // geen geforceerde hoogte
  comparisonWrapper.style.setProperty('aspect-ratio', 'auto');
  return;
}
 
  
  const formats = cameras[cam];
  Object.keys(formats).forEach(fmt => {
    sensorFormatSelect.add(new Option(formats[fmt].label, fmt));
  });
  sensorFormatSelect.disabled = false;
  // default: eerste optie meteen toepassen
  sensorFormatSelect.dispatchEvent(new Event("change"));
});





sensorFormatSelect.addEventListener("change", applyCurrentFormat);
function onFsChange() {
  if (isWrapperFullscreen()) {
    // In fullscreen: nooit inline heights
    clearInlineHeights();

    // stabiel her-meten zolang de browserbalk in- en uitfadet
    pulseFsBars({ duration: 1400 });
  } else {
    // UIT fullscreen: direct de juiste hoogte terugzetten
    const { w, h } = getCurrentWH();
    comparisonWrapper.style.setProperty('aspect-ratio', 'auto'); // vangnet
    setWrapperSizeByAR(w, h);
    requestAnimationFrame(() => setWrapperSizeByAR(w, h));

    // FS-balk variabelen resetten
    comparisonWrapper.style.setProperty('--lb-top', '0px');
    comparisonWrapper.style.setProperty('--lb-bottom', '0px');
    comparisonWrapper.style.setProperty('--lb-left', '0px');
    comparisonWrapper.style.setProperty('--lb-right', '0px');

    // Slider meteen terug op volle hoogte buiten fullscreen
    slider.style.top = '0px';
    slider.style.height = '100%';
    slider.style.bottom = '0';
  }

  // Balken + slider opnieuw
  updateFullscreenBars();
  requestAnimationFrame(() => {
    updateFullscreenBars();
    resetSplitToMiddle();
  });

  // Extra vangnet tegen 'mini' state
  requestAnimationFrame(() => {
    if (!isWrapperFullscreen()) {
      const { w, h } = getCurrentWH();
      setWrapperSizeByAR(w, h);
    }
  });
}
function getCurrentWH() {
  const cam = cameraSelect.value;
  const fmt = sensorFormatSelect.value;
  if (!cam || !fmt) return { w: BASE_SENSOR.w, h: BASE_SENSOR.h };
  return cameras[cam][fmt];
}

// 1) Helper: doel-AR van de layout (rekening met SxS)
function getTargetAR() {
  const { w, h } = getCurrentWH();      // mm van gekozen sensor
  return sbsActive ? (2 * w) / h : w / h; // 6:2 in SxS, anders normaal
}
// Luister naar fullscreen wissels (buiten de functie!)
document.addEventListener('fullscreenchange', onFsChange);
document.addEventListener('webkitfullscreenchange', onFsChange); // Safari

window.addEventListener('resize', () => {
  if (isWrapperFullscreen()) {
    updateFullscreenBars();
    resetSplitToMiddle();
  } else {
    const { w, h } = getCurrentWH();
    setWrapperSizeByAR(w, h);                 // 3:2 of 6:2, afhankelijk van SBS
  }
});



const lenses = [
  "IronGlass Red P",
  "IronGlass MKII", 
  "IronGlass Zeiss Jena",
  "DZO Vespid",
  "DZO Arles",
  "Cooke Panchro FF",
  "Lomo Standard Speed"
];

const notes = {
  "ironglass_red_p_35mm": "37mm",
  "ironglass_red_p_50mm": "58mm",
  "ironglass_mkii_35mm": "37mm",
  "ironglass_zeiss_jena_50mm": "50mm",
  "cooke_panchro_ff_35mm": "32mm",
  "cooke_panchro_ff_50mm": "50mm",
  "dzo_vespid_80mm": "75mm",
  "dzo_vespid_85mm": "75mm",
  "dzo_arles_80mm": "75mm",
  "dzo_arles_85mm": "75mm",
  "lomo_standard_speed_80mm": "75mm",
  "lomo_standard_speed_85mm": "75mm",
  "cooke_panchro_ff_80mm": "75mm",
  "cooke_panchro_ff_85mm": "75mm",
  "ironglass_zeiss_jena_80mm": "75mm",
  "ironglass_zeiss_jena_85mm": "75mm",
  "ironglass_red_p_80mm": "75mm",
  "ironglass_red_p_85mm": "75mm",
  "ironglass_mkii_80mm": "75mm",
  "ironglass_mkii_85mm": "75mm",
  "ironglass_red_p_75mm": "85mm",
  "ironglass_mkii_75mm": "85mm",
  "ironglass_zeiss_jena_75mm": "80mm",
};

const lensImageMap = {
  // RED P
  "ironglass_red_p_35mm_t2_8":   "red_p_37mm_t2_8.jpg",
  "ironglass_red_p_50mm_t2_8":   "red_p_58mm_t2_8.jpg",
  "ironglass_red_p_75mm_t2_8":   "red_p_85mm_t2_8.jpg",

  // MKII (eigen files, niet red_p)
  "ironglass_mkii_35mm_t2_8":    "mkii_37mm_t2_8.jpg",
  "ironglass_mkii_50mm_t2_8":    "mkii_50mm_t2_8.jpg",    // voeg toe als je 50 hebt
  "ironglass_mkii_75mm_t2_8":    "mkii_85mm_t2_8.jpg",

  // Zeiss Jena
  "ironglass_zeiss_jena_75mm_t2_8": "jena_80mm_t2_8.jpg",
};



const lensDescriptions = {
  "IronGlass Red P": {
    text: "De IronGlass RED P set is een zeldzame vondst: bestaande uit de alleroudste series Sovjet-lenzen met single coating en maximale karakterweergave. Geen tweaks, geen trucjes – puur vintage glasoptiek.",
    url: "https://tvlrental.nl/ironglassredp/"
  },
  "IronGlass Zeiss Jena": {
    text: "De Zeiss Jena’s zijn een uitstekende keuze voor cinematografen die zoeken naar een zachte vintage signatuur zonder zware distortie of gekke flares. Ze voegen karakter toe, maar laten de huid spreken.",
    url: "https://tvlrental.nl/ironglasszeissjena/"
  },
  "IronGlass MKII": {
  text: "De IronGlass MKII Sovjet set is na de RED P de heftigste variant: zwaar getweakte oude Sovjet-lenzen met extreem karakter, flare en vervorming. Ideaal voor een rauwe, experimentele look.",
  url: "https://tvlrental.nl/ironglassmkii/"
},
  "Cooke Panchro FF": {
    text: "Karakteristieke full frame lenzenset met een klassieke Cooke-look. Subtiele glow en zachte roll-off, perfect voor een romantische of authentieke sfeer.",
    url: "https://tvlrental.nl/cookepanchro/"
  },
  "DZO Arles": {
    text: "Scherpe en cleane full-frame cine primes met zachte bokeh en moderne flarecontrole. Ideaal voor commercials en high-end narratieve projecten.",
    url: "https://tvlrental.nl/dzoarles/"
  },
  "DZO Vespid": {
    text: "Betaalbare maar serieuze cine-lenzen met consistente look, lichte vintage feel en goede optische prestaties. Full frame coverage.",
    url: "https://tvlrental.nl/dzovespid/"
  },
  "Lomo Standard Speed": {
    text: "Zachte vintage lenzen met unieke glow en flare. Niet voor elk project, maar heerlijk voor rauwe of experimentele looks.",
    url: "https://tvlrental.nl/lomostandardspeed/"
  }
};

const leftSelect = document.getElementById("leftLens");
const rightSelect = document.getElementById("rightLens");
// NIEUW: twee T-stop selects
const tStopLeftSelect  = document.getElementById("tStopLeftSelect");
const tStopRightSelect = document.getElementById("tStopRightSelect");
const focalLengthSelect = document.getElementById("focalLength");
const beforeImgTag = document.getElementById("beforeImgTag");
const afterImgTag = document.getElementById("afterImgTag");
const afterWrapper = document.getElementById("afterWrapper");
const slider = document.getElementById("slider");
// --- SBS DOM ---
const sbsWrapper = document.createElement("div");
sbsWrapper.id = "sbsWrapper";
sbsWrapper.innerHTML = `
  <div class="pane"><img id="sbsLeftImg"  alt=""></div>
  <div class="pane"><img id="sbsRightImg" alt=""></div>
`;
comparisonWrapper.appendChild(sbsWrapper);

sbsWrapper.style.display = 'none';   // ⬅️ hier toevoegen

const sbsLeftImg  = sbsWrapper.querySelector("#sbsLeftImg");
const sbsRightImg = sbsWrapper.querySelector("#sbsRightImg");
// Enforce 'contain' in SxS
[sbsLeftImg, sbsRightImg].forEach(im => {
  im.style.setProperty('width', '100%', 'important');
  im.style.setProperty('height', '100%', 'important');
  im.style.setProperty('object-fit', 'contain', 'important');
});
let sbsActive = false;
let isExportingPdf = false; // blokkeer UI-toggles terwijl er geëxporteerd wordt
const leftLabel = document.getElementById("leftLabel");
const rightLabel = document.getElementById("rightLabel");
const downloadLeftRawButton  = document.getElementById("downloadLeftRawButton");
const downloadRightRawButton = document.getElementById("downloadRightRawButton");
const flareToggle = document.getElementById("flareToggle");
// Waar staan je assets?
const IMG_BASE = "https://tvlmedia.github.io/lens-compare/images/";
const RAW_BASE = IMG_BASE + "raw/";

const scaleSlider = document.getElementById("scaleSlider");
const scaleVal    = document.getElementById("scaleVal");
let userScale = 1; // 1 = 100%

function syncTStopsOnContextChange() {
  const t = tStopLeftSelect.value || "2.8";
  tStopLeftSelect.value  = t;
  tStopRightSelect.value = t;
}

// --- T-stops vullen ---
const DEFAULT_T_STOPS = ["2.8","5.6"]; // voeg toe wat je hebt

function fillTStops(selectEl, options = DEFAULT_T_STOPS) {
  selectEl.innerHTML = "";
  options.forEach(t => selectEl.add(new Option(`T${t}`, t)));
}

// eenmalig vullen bij load
fillTStops(tStopLeftSelect);
fillTStops(tStopRightSelect);

// zet default waarde (moet NA het vullen)
tStopLeftSelect.value  = "2.8";
tStopRightSelect.value = "2.8";

function setUserScaleFromPct(pct) {
  // clamp 100–120%
  userScale = Math.min(1.3, Math.max(1.0, pct / 100));
  // voor de viewer (CSS)
  document.documentElement.style.setProperty("--viewer-scale", String(userScale));
  // UI tekstje
  if (scaleVal) scaleVal.textContent = Math.round(userScale * 100) + "%";
  // (optioneel) clip/slider nog even herpositioneren
  updateFullscreenBars();
  resetSplitToMiddle();
}

if (scaleSlider) {
  scaleSlider.addEventListener("input", e => setUserScaleFromPct(e.target.value));
  setUserScaleFromPct(scaleSlider.value || 100);
}

// === Flare toggle (eenmalige setup) ===
flareToggle.dataset.mode = flareToggle.dataset.mode || "noflare";
flareToggle.textContent  = flareToggle.dataset.mode === "flare" ? "Flare: ON" : "Flare: OFF";

flareToggle.addEventListener("click", () => {
  const cur = flareToggle.dataset.mode === "flare" ? "noflare" : "flare";
  flareToggle.dataset.mode = cur;
  flareToggle.textContent  = cur === "flare" ? "Flare: ON" : "Flare: OFF";
  updateImages(); // herlaad de juiste beelden
});

// Direct bij pageload 1x runnen
onFsChange();

function updateLensInfo() {
  const left = leftSelect.value;
  const right = rightSelect.value;
  const leftDesc = lensDescriptions[left]?.text || "";
  const rightDesc = lensDescriptions[right]?.text || "";

  const lensInfoDiv = document.getElementById("lensInfo");
  lensInfoDiv.innerHTML = `
    <p><strong>${left}:</strong> ${leftDesc}</p>
    <p><strong>${right}:</strong> ${rightDesc}</p>
  `;
}

lenses.forEach(lens => {
  leftSelect.add(new Option(lens, lens));
  rightSelect.add(new Option(lens, lens));
});

// Welke RAW-file hoort bij welke combi (key = <lens>_<focal>_t<stop>)
// Tip: laat de key aansluiten op je bestaande keys (dus "ironglass_red_p_35mm_t2_8" die evt. mapt naar 37mm)
// Welke RAW-file hoort bij welke combi (key = <lens>_<focal>_t<stop>)
const rawFileMap = {
  "ironglass_red_p_35mm_t2_8": "images/raw/RedP_37mm_T2.8_RAW.tif",
  "ironglass_zeiss_jena_35mm_t2_8": "images/raw/ZeissJena_35mm_T2.8_RAW.tif",
  "ironglass_red_p_50mm_t2_8": "images/raw/RedP_58mm_T2.8_RAW.tif",
  "ironglass_zeiss_jena_50mm_t2_8": "images/raw/ZeissJena_50mm_T2.8_RAW.tif",
  "cooke_panchro_ff_50mm_t2_8": "images/raw/CookeFF_50mm_T2.8_RAW.tif"
};
function setDownloadButton(buttonEl, key) {
  const file = rawFileMap[key] ? (RAW_BASE + rawFileMap[key].split("/").pop()) : null;
  if (file) {
    buttonEl.disabled = false;
    buttonEl.title = "Download RAW";

    buttonEl.onclick = () => {
      const url = new URL(file, location.href);
      const sameOrigin = url.origin === location.origin;

      if (sameOrigin) {
        // Forceer download
        const a = document.createElement("a");
        a.href = url.href;
        a.download = url.pathname.split("/").pop(); // bestandsnaam
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      } else {
        // Cross-origin: sommige hosts negeren download-attribute
        // dan is nieuw tabblad de veiligste fallback
        window.open(url.href, "_blank", "noopener,noreferrer");
      }
    };
  } else {
    buttonEl.disabled = true;
    buttonEl.title = "RAW download (coming soon)";
    buttonEl.onclick = null;
  }
}
function updateImages() {
  const leftLens  = leftSelect.value.toLowerCase().replace(/\s+/g, "_");
  const rightLens = rightSelect.value.toLowerCase().replace(/\s+/g, "_");

  // ⬇️ Links en rechts hebben eigen T-stop
  const tStopLeftRaw  = tStopLeftSelect.value;          // "2.8"
  const tStopRightRaw = tStopRightSelect.value;         // "2.8"
  const tStopLeft     = tStopLeftRaw.replace(".", "_"); // "2_8"
  const tStopRight    = tStopRightRaw.replace(".", "_");// "2_8"

  const focalNom  = focalLengthSelect.value;            // "35mm" | "50mm" | ...
  const flareMode = flareToggle?.dataset.mode || "noflare";

  const aliasFor = (lens, nominalFocal) =>
    notes[`${lens}_${nominalFocal}`] || nominalFocal;

  const resolveImagePath = (lens, nominalFocal, tStr, flare) => {
  const aliasFocal = aliasFor(lens, nominalFocal);
  // 1) Probeer eerst de alias (bijv. 32mm / 37mm), daarna pas de nominale 35mm
  const bases = (aliasFocal !== nominalFocal)
    ? [ `${lens}_${aliasFocal}_t${tStr}`, `${lens}_${nominalFocal}_t${tStr}` ]
    : [ `${lens}_${nominalFocal}_t${tStr}` ];

  const candidates = [];
  bases.forEach(base => {
    // Alleen toevoegen als de mapping echt bestaat
    if (lensImageMap[`${base}_${flare}`]) candidates.push(lensImageMap[`${base}_${flare}`]);
    if (lensImageMap[base])               candidates.push(lensImageMap[base]);
    // Standaard bestandsnamen (vallen terug op jouw repo-naamgeving)
    candidates.push(`${base}_${flare}.jpg`);
    candidates.push(`${base}.jpg`);
  });

  // Neem de eerste kandidaat (alias komt nu eerst)
  return `${IMG_BASE}${candidates[0]}`;
};

  // ⬇️ Let op: links gebruikt tStopLeft, rechts tStopRight
  const imgLeft  = resolveImagePath(leftLens,  focalNom, tStopLeft,  flareMode);
  const imgRight = resolveImagePath(rightLens, focalNom, tStopRight, flareMode);

  beforeImgTag.src = imgRight; // rechts = before
  afterImgTag.src  = imgLeft;  // links  = after

  // Labels
  const leftFocalForLabel  = aliasFor(leftLens,  focalNom);
  const rightFocalForLabel = aliasFor(rightLens, focalNom);

  const leftUrl  = lensDescriptions[leftSelect.value]?.url  || "#";
  const rightUrl = lensDescriptions[rightSelect.value]?.url || "#";

  leftLabel.innerHTML  =
    `Lens: <a href="${leftUrl}" target="_blank" rel="noopener noreferrer">` +
    `${leftSelect.value} ${leftFocalForLabel} T${tStopLeftRaw}</a>`;

  rightLabel.innerHTML =
    `Lens: <a href="${rightUrl}" target="_blank" rel="noopener noreferrer">` +
    `${rightSelect.value} ${rightFocalForLabel} T${tStopRightRaw}</a>`;

  // RAW-download keys per kant
  const rawLeftKey  = `${leftLens}_${leftFocalForLabel}_t${tStopLeft}`;
  const rawRightKey = `${rightLens}_${rightFocalForLabel}_t${tStopRight}`;
  setDownloadButton(downloadLeftRawButton,  rawLeftKey);
  setDownloadButton(downloadRightRawButton, rawRightKey);
  // ← SBS-panelen up-to-date houden
  if (sbsActive) {
    sbsLeftImg.src  = afterImgTag.src;   // links = after
    sbsRightImg.src = beforeImgTag.src;  // rechts = before
  }

  resetSplitToMiddle();
}




// Info-tekst updaten bij lenskeuze
[leftSelect, rightSelect].forEach(el =>
  el.addEventListener("change", updateLensInfo)
);

// Render-triggers
tStopLeftSelect.addEventListener("change", updateImages);
tStopRightSelect.addEventListener("change", updateImages);

focalLengthSelect.addEventListener("change", () => {
  syncTStopsOnContextChange(); // eerst T-stops gelijk trekken
  updateImages();              // dan renderen
});

[leftSelect, rightSelect].forEach(el => {
  el.addEventListener("change", () => {
    syncTStopsOnContextChange(); // bij lenswissel ook sync
    updateImages();
  });
});

leftSelect.value = "IronGlass Red P";
rightSelect.value = "IronGlass Zeiss Jena";

focalLengthSelect.value = "35mm";
tStopLeftSelect.value  = "2.8";
tStopRightSelect.value = "2.8";
updateLensInfo();
updateImages();



// Init (optioneel: standaard op Venice 6K 3:2)
cameraSelect.value = "Sony Venice";
cameraSelect.dispatchEvent(new Event("change"));
// fullscreen-balken direct goedzetten (ook als je al fullscreen zit)
updateFullscreenBars();
resetSplitToMiddle();   
if (isWrapperFullscreen()) clearInlineHeights();// <<< nieuw



// Force update to fix initial load issue
setTimeout(() => updateImages(), 50);

let isDragging = false;





// Mouse events
// Mouse events
slider.addEventListener("mousedown", () => {
  isDragging = true;
  document.body.classList.add("dragging");
});

window.addEventListener("mouseup", () => {
  isDragging = false;
  document.body.classList.remove("dragging");
});

window.addEventListener("mousemove", e => {
  if (!isDragging) return;
  updateSliderPosition(e.clientX);
});

// Touch events
slider.addEventListener("touchstart", (e) => {
  e.preventDefault();
  isDragging = true;
  document.body.classList.add("dragging");
}, { passive: false });

window.addEventListener("touchend", () => {
  isDragging = false;
  document.body.classList.remove("dragging");
});



window.addEventListener("touchmove", (e) => {
  if (!isDragging || e.touches.length !== 1) return;
  e.preventDefault();
  updateSliderPosition(e.touches[0].clientX);
}, { passive: false });
document.getElementById("toggleButton").addEventListener("click", () => {
  // lenzen wisselen
  const l = leftSelect.value; leftSelect.value = rightSelect.value; rightSelect.value = l;
  // T-stops meewisselen
  const t = tStopLeftSelect.value; tStopLeftSelect.value = tStopRightSelect.value; tStopRightSelect.value = t;

  updateLensInfo();
  updateImages();
});
 function toggleFullscreen() {
  (async () => {
    if (isWrapperFullscreen()) {
      await exitAnyFullscreen();
      const { w, h } = getCurrentWH();
      comparisonWrapper.style.setProperty('aspect-ratio', 'auto');
      setWrapperSizeByAR(w, h);
      requestAnimationFrame(() => setWrapperSizeByAR(w, h));
      comparisonWrapper.style.setProperty('--lb-top', '0px');
      comparisonWrapper.style.setProperty('--lb-bottom', '0px');
      comparisonWrapper.style.setProperty('--lb-left', '0px');
      comparisonWrapper.style.setProperty('--lb-right', '0px');
    } else {
      clearInlineHeights();
      await enterWrapperFullscreen();
      pulseFsBars({ duration: 1400 });
    }

    updateFullscreenBars();
    requestAnimationFrame(() => {
      updateFullscreenBars();
      resetSplitToMiddle();
    });
  })();
}
function setSideBySide(on, { force = false } = {}) {
  if (isExportingPdf && !force) return;
  const next = !!on;
  if (!force && sbsActive === next) return;

  sbsActive = next;
  document.body.classList.toggle("sbs-mode", sbsActive);
  comparisonWrapper.classList.toggle("sbs-mode", sbsActive);

  // Pak de wrappers (before = parent van beforeImgTag)
const beforeWrapper = beforeImgTag.parentElement;

if (sbsActive) {
  // SxS AAN: toon SxS, verberg slider-versie
  sbsWrapper.style.display = 'flex';
  beforeWrapper.style.display = 'none';
  afterWrapper.style.display  = 'none';
} else {
  // SxS UIT: verberg SxS, toon slider-versie
  sbsWrapper.style.display = 'none';
  beforeWrapper.style.display = '';
  afterWrapper.style.display  = '';
}

  if (sbsActive) {
    // in SxS: reset en toon hele foto’s
    sbsLeftImg.src  = afterImgTag.src;
    sbsRightImg.src = beforeImgTag.src;
    sbsLeftImg.style.transform  = '';
    sbsRightImg.style.transform = '';

    slider.style.display = "none";

    // letter/pillarbox naar 0 in SxS
    comparisonWrapper.style.setProperty('--lb-top','0px');
    comparisonWrapper.style.setProperty('--lb-bottom','0px');
    comparisonWrapper.style.setProperty('--lb-left','0px');
    comparisonWrapper.style.setProperty('--lb-right','0px');
    comparisonWrapper._lbLeft = comparisonWrapper._lbRight = comparisonWrapper._lbTop = comparisonWrapper._lbBottom = 0;

    // fullscreen: geen inline heights forceren
    if (isWrapperFullscreen()) {
      clearInlineHeights();
    }
  } else {
    slider.style.display = "";
  }

  // Hoogte/AR opnieuw zetten (buiten fullscreen)
  const { w, h } = getCurrentWH();
  setWrapperSizeByAR(w, h);
  requestAnimationFrame(() => setWrapperSizeByAR(w, h));

  if (!sbsActive) {
    updateFullscreenBars();
    resetSplitToMiddle();
  }
}
function whenImagesReadyThenReset() {
  const wait = (im) => (im.complete && im.naturalWidth > 0)
    ? Promise.resolve()
    : new Promise((res, rej) => { im.onload = res; im.onerror = rej; });

  Promise.all([wait(beforeImgTag), wait(afterImgTag)]).then(() => {
    updateFullscreenBars();   // zet lb-waarden (0 buiten FS)
    resetSplitToMiddle();     // clip-path + slider juist
  });
}

// na je eerste update:
updateImages();
whenImagesReadyThenReset();

// en zorg dat elke wijziging dit ook triggert:
beforeImgTag.addEventListener('load', whenImagesReadyThenReset);
afterImgTag.addEventListener('load',  whenImagesReadyThenReset);


document.getElementById("fullscreenButton")?.addEventListener("click", toggleFullscreen);

// ==== PDF helpers: sensor-canvas + contain placement ====
function loadHTMLImage(src) {
  return new Promise((res, rej) => {
    const im = new Image();
    im.crossOrigin = "anonymous";
    im.onload = () => res(im);
    im.onerror = rej;
    im.src = src;
  });
}
// === Helpers voor UI-screenshots (gebruikt op PDF pag. 4) ===
async function screenshotEl(el) {
  if (!el) return null;
  const cvs = await html2canvas(el, {
    useCORS: true,
    backgroundColor: null,             // transparant over zwart
    scale: window.devicePixelRatio || 1
  });
  return cvs.toDataURL("image/png");   // PNG behoudt transparantie
}

async function placeToWidth(pdf, dataURL, x, y, maxW) {
  const im = await loadHTMLImage(dataURL); // gebruikt je bestaande loader
  const naturalW = im.naturalWidth || im.width;
  const naturalH = im.naturalHeight || im.height;
  const ratio = naturalH / naturalW;

  const w = Math.min(maxW, naturalW);
  const h = Math.round(w * ratio);

  pdf.addImage(dataURL, "PNG", x, y, w, h);
  return { w, h };
}
function fitContain(srcW, srcH, boxW, boxH) {
  const srcAR = srcW / srcH, boxAR = boxW / boxH;
  let w, h;
  if (srcAR > boxAR) { w = boxW; h = Math.round(w / srcAR); }
  else { h = boxH; w = Math.round(h * srcAR); }
  const x = Math.round((boxW - w) / 2);
  const y = Math.round((boxH - h) / 2);
  return { w, h, x, y };
}

// Render naar exacte SENSOR-AR op gewenste hoogte, met extra crop/zoom via `scale`
async function renderToSensorAR(imgOrURL, targetAR, outH, scale = 1) {
  const img = typeof imgOrURL === "string" ? await loadHTMLImage(imgOrURL) : imgOrURL;
  const H = outH;
  const W = Math.round(H * targetAR);

  const cvs = document.createElement("canvas");
  cvs.width = W; cvs.height = H;
  const ctx = cvs.getContext("2d", { alpha:false });
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  // cover-fit naar (W,H)
  const srcAR = (img.naturalWidth || img.width) / (img.naturalHeight || img.height);
  let drawW, drawH, offX, offY;
  if (srcAR < targetAR) {        // te “smal” → vul breedte
    drawW = W; 
    drawH = W / srcAR; 
    offX = 0; 
    offY = (H - drawH) / 2;
  } else {                       // te “breed” → vul hoogte
    drawH = H; 
    drawW = H * srcAR; 
    offY = 0; 
    offX = (W - drawW) / 2;
  }

  // Extra crop/zoom (alleen PDF): vergroot de getekende bron, centreer
  if (scale !== 1) {
    const oldW = drawW, oldH = drawH;
    drawW = oldW * scale;
    drawH = oldH * scale;
    offX -= (drawW - oldW) / 2;
    offY -= (drawH - oldH) / 2;
  }

  ctx.drawImage(img, Math.round(offX), Math.round(offY), Math.round(drawW), Math.round(drawH));
  return { dataURL: cvs.toDataURL("image/jpeg", 1.0), W, H };
}

// Plaats een (W,H) image contain in PDF-box
async function placeContain(pdf, dataURL, box) {
  const im = await loadHTMLImage(dataURL);
  const fit = fitContain(im.naturalWidth || im.width, im.naturalHeight || im.height, box.w, box.h);
  pdf.addImage(dataURL, "JPEG", box.x + fit.x, box.y + fit.y, fit.w, fit.h);
}
// Zelfde als placeContain maar geeft de werkelijke plaatsing terug (x,y,w,h)
async function placeContainWithBox(pdf, dataURL, box) {
  const im = await loadHTMLImage(dataURL);
  const fit = fitContain(im.naturalWidth || im.width, im.naturalHeight || im.height, box.w, box.h);
  const x = box.x + fit.x, y = box.y + fit.y, w = fit.w, h = fit.h;
  pdf.addImage(dataURL, "JPEG", x, y, w, h);
  return { x, y, w, h };
}
// --- helper: cover-fit (laat staan als je 'm al hebt) ---
function fitCover(srcW, srcH, boxW, boxH) {
  const srcAR = srcW / srcH, boxAR = boxW / boxH;
  let w,h;
  if (srcAR < boxAR) { h = boxH; w = Math.round(h * srcAR); }
  else               { w = boxW; h = Math.round(w / srcAR); }
  const x = Math.round((boxW - w)/2), y = Math.round((boxH - h)/2);
  return { w,h,x,y };
}
async function placeCoverWithBox(pdf, dataURL, box) {
  const im  = await loadHTMLImage(dataURL);
  const fit = fitCover(im.naturalWidth || im.width, im.naturalHeight || im.height, box.w, box.h);
  const x = box.x + fit.x, y = box.y + fit.y, w = fit.w, h = fit.h;
  pdf.addImage(dataURL, "JPEG", x, y, w, h);
  return { x, y, w, h };
}

async function screenshotActiveImage() {
  updateFullscreenBars();
  const el = document.getElementById("comparisonWrapper");
  const scale = 2;

  // html2canvas doet de capture
  const big = await html2canvas(el, { scale, useCORS: true, backgroundColor: "#000" });

  // Gebruik je berekende letterbox/pillarbox waarden
  const lbL = el._lbLeft || 0;
  const lbR = el._lbRight || 0;
  const lbT = el._lbTop || 0;
  const lbB = el._lbBottom || 0;

  // Crop exact het bruikbare beeld zonder squeeze
  const usableW = el._usableW || (el.getBoundingClientRect().width - lbL - lbR);
  const usableH = el.getBoundingClientRect().height - lbT - lbB;

  const sx = Math.round(lbL * scale);
  const sy = Math.round(lbT * scale);
  const sw = Math.round(usableW * scale);
  const sh = Math.round(usableH * scale);

  const out = document.createElement("canvas");
  out.width = sw;
  out.height = sh;
  const ctx = out.getContext("2d", { alpha: false });
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(big, sx, sy, sw, sh, 0, 0, sw, sh);

  return out.toDataURL("image/jpeg", 1.0);
}
// Maak een nette CTA-"knop" met klikbare link
function drawCtaButton({ pdf, x, y, w, h, label, url }) {
  // zwarte achtergrond
  pdf.setDrawColor(0, 0, 0);
  pdf.setFillColor(0, 0, 0);
  pdf.roundedRect(x, y, w, h, 6, 6, "F");
  // witte tekst
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(12);
  pdf.text(label, x + w / 2, y + Math.round(h / 2) + 4, { align: "center", baseline: "middle" });
  // klikbare zone
  pdfLinkRect(pdf, x, y, w, h, url);
}

// Screenshot van één container die alles bevat, zonder croppen of resamplen
async function screenshotTool() {
  // Kies een wrapper die AL je UI bevat (controls + viewer + info).
  // Pas het id hieronder aan naar jouw echte outer container.
  const el =
    document.getElementById("toolRoot") ||        // ← maak dit div-je desnoods
    document.getElementById("comparisonWrapper")  // fallback: alleen viewer
      ?.parentElement;                             // (vaak de container rond controls+viewer)

  if (!el) return null;

  const canvas = await html2canvas(el, {
    useCORS: true,
    backgroundColor: "#000",
    scale: window.devicePixelRatio || 1, // geen extra schalen die AR veranderen
    windowWidth: document.documentElement.clientWidth,
    windowHeight: document.documentElement.clientHeight
  });

  return canvas.toDataURL("image/jpeg", 1.0);
}

// helper: crop uit html2canvas resultaat (rekening houdend met scale:2)
function cropFromCanvas(sourceCanvas, sx, sy, sw, sh, SCALE = window.devicePixelRatio || 1) {
  const out = document.createElement("canvas");
  out.width  = Math.max(1, Math.round(sw * SCALE));
  out.height = Math.max(1, Math.round(sh * SCALE));
  const ctx = out.getContext("2d", { alpha: false });
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(
    sourceCanvas,
    Math.round(sx * SCALE), Math.round(sy * SCALE),
    Math.round(sw * SCALE), Math.round(sh * SCALE),
    0, 0, out.width, out.height
  );
  return out.toDataURL("image/jpeg", 1.0);
}
function getCurrentSplitFraction() {
  const wrapperRect = comparisonWrapper.getBoundingClientRect();
  const lbLeft  = comparisonWrapper._lbLeft  || 0;
  const lbRight = comparisonWrapper._lbRight || 0;
  const usableW = Math.max(1, Math.round(wrapperRect.width - lbLeft - lbRight));

  const sliderRect = slider.getBoundingClientRect();
  const xInUsable = (sliderRect.left + sliderRect.width / 2) - wrapperRect.left - lbLeft;

  return Math.min(1, Math.max(0, xInUsable / usableW));
}

// Bouw split uit twee sensor‑canvassen (zelfde W,H) + witte middenlijn
// Bouw split uit twee sensor‑canvassen (zelfde W,H) en neem de actuele viewer‑split over
async function buildSplitFromSensor(leftURL, rightURL, W, H) {
  const L = await loadHTMLImage(leftURL);
  const R = await loadHTMLImage(rightURL);

  const cvs = document.createElement("canvas");
  cvs.width = W;
  cvs.height = H;

  const ctx = cvs.getContext("2d", { alpha: false });
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  // Gebruik de echte slider-positie uit de viewer (gecorrigeerd voor pillar/letterbox)
  const frac = getCurrentSplitFraction();   // 0..1
  const splitX = Math.round(W * frac);      // px in de sensor-canvas

  // Links tot split
  if (splitX > 0) {
    ctx.drawImage(L, 0, 0, splitX, H, 0, 0, splitX, H);
  }

  // Rechts vanaf split
  if (splitX < W) {
    const wRight = W - splitX;
    ctx.drawImage(R, splitX, 0, wRight, H, splitX, 0, wRight, H);
  }

  // Middenlijn
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(Math.max(0, splitX - 1), 0, 2, H);

  return cvs.toDataURL("image/jpeg", 1.0);
}
function getSensorText() {
  const cam = cameraSelect.value;
  const fmt = sensorFormatSelect.value;
  const label = cameras[cam]?.[fmt]?.label || "";
  return `${cam} – ${label}`;
}
// helper: wacht tot een <img> echt geladen is
function waitForImage(imgEl) {
  return new Promise((resolve, reject) => {
    if (imgEl.complete && imgEl.naturalWidth > 0) return resolve();
    imgEl.onload = () => resolve();
    imgEl.onerror = reject;
  });
}

async function captureViewerWithUI() {
  // Gewoon letterlijk screenshotten van de hele tool zoals je hem ziet
  return await screenshotTool();
}

// als je <script type="module"> gebruikt of zeker wilt zijn dat hij globaal is:
window.captureViewerWithUI = captureViewerWithUI;


// --- PDF link helpers: maak URL absoluut en linkbaar ---
function ensureAbsoluteUrl(url) {
  if (!url) return "";
  if (/^https?:\/\//i.test(url)) return url;
  try { return new URL(url, "https://tvlrental.nl/").href; }
  catch { return "https://tvlrental.nl/"; }
}
function pdfLinkRect(pdf, x, y, w, h, url) {
  const abs = ensureAbsoluteUrl(url);
  if (abs) pdf.link(x, y, w, h, { url: abs }); // <-- i.p.v. linkRect
}
function pdfTextWithLink(pdf, text, x, y, url, opts = {}) {
  const abs = ensureAbsoluteUrl(url);
  if (abs) pdf.textWithLink(text, x, y, { url: abs, ...opts });
  else pdf.text(text, x, y, opts);
}
document.getElementById("downloadPdfButton")?.addEventListener("click", async () => {
  const wasSBS = sbsActive;
  const sbsBtn = document.getElementById("sbsToggle");
  isExportingPdf = true;
  try {
    if (sbsBtn) sbsBtn.disabled = true;    // UI toggle blokkeren

    if (wasSBS) {
      setSideBySide(false, { force: true }); // ← BELANGRIJK: force tijdens export
      // 1–2 frames wachten zodat layout/AR klopt vóór we maten pakken
      await new Promise(r => requestAnimationFrame(r));
      await new Promise(r => requestAnimationFrame(r));
      updateFullscreenBars();
      resetSplitToMiddle();
    }

    // ====== JE BESTAANDE PDF-CODE HIERONDER (ongewijzigd) ======

    // ====== JE BESTAANDE PDF-CODE HIERONDER (ongewijzigd) ======
    const { jsPDF } = window.jspdf;
    updateFullscreenBars();

    const pdf = new jsPDF({ orientation: "landscape", unit: "px", format: "a4" });

  // Layout constants
  const TOP_BAR = 40;
  const BOTTOM_BAR = 80;
  const PAGE_MARGIN = 24;

  function getContentBox(pageW, pageH) {
    const x = PAGE_MARGIN;
    const y = TOP_BAR + PAGE_MARGIN;
    const w = pageW - PAGE_MARGIN * 2;
    const h = pageH - TOP_BAR - BOTTOM_BAR - PAGE_MARGIN * 2;
    return { x, y, w, h };
  }

  
  function drawTopBar(text) {
    const pageWidth = pdf.internal.pageSize.getWidth();
    const barHeight = TOP_BAR;
    pdf.setFillColor(0, 0, 0);
    pdf.rect(0, 0, pageWidth, barHeight, "F");
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(16);
    pdf.text(text, pageWidth / 2, Math.round(barHeight / 2) + 2, {
      align: "center",
      baseline: "middle"
    });
  }
  
  function drawBottomBar({ text = "", link = "", logo = null, ctaLabel = "", ctaUrl = "" }) {
  const pageWidth  = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const barHeight  = BOTTOM_BAR;

  // zwarte balk
  pdf.setFillColor(0, 0, 0);
  pdf.rect(0, pageHeight - barHeight, pageWidth, barHeight, "F");

  // linkertekst (beschrijving)
  if (text) {
    pdf.setFontSize(12);
    pdf.setTextColor(255, 255, 255);
    pdf.text(text, 20, pageHeight - barHeight + 25, { maxWidth: pageWidth - 120 });
  }

  // optionele link onder de tekst
  if (link) {
    const displayText = "Klik hier voor alle info over deze lens";
    pdf.setFontSize(10);
    pdf.setTextColor(0, 102, 255);
   pdfTextWithLink(pdf, displayText, 20, pageHeight - barHeight + 55, link);
  }

  // logo rechts
  if (logo) {
    const targetHeight = 50;
    const ratio = logo.width / logo.height;
    const targetWidth = targetHeight * ratio;
    const xLogo = pageWidth - targetWidth - 12;
    const yLogo = pageHeight - targetHeight - 12;
    pdf.addImage(logo, "PNG", xLogo, yLogo, targetWidth, targetHeight);
  }

  // gecentreerde CTA-knop in de balk
  if (ctaLabel && ctaUrl) {
    const btnW = Math.min(320, pageWidth - 2 * PAGE_MARGIN);
    const btnH = 32;
    const btnX = Math.round((pageWidth - btnW) / 2);
    const btnY = Math.round(pageHeight - (barHeight / 2) - (btnH / 2));

    pdf.setDrawColor(0, 0, 0);
    pdf.setFillColor(0, 0, 0);
    pdf.roundedRect(btnX, btnY, btnW, btnH, 4, 4, "F");

    pdf.setTextColor(255, 255, 255);
 pdf.setFontSize(18); // groter
pdf.setFont("helvetica", "normal"); // normaal, geen rare bold-render
pdf.setTextColor(255, 255, 255); // wit
pdf.text(ctaLabel, btnX + btnW / 2, btnY + btnH / 2 + 6, { 
  align: "center", 
  baseline: "middle" 
});

  pdfLinkRect(pdf, btnX, btnY, btnW, btnH, ctaUrl);
  }
}
  function drawBottomBarPage1(logo, sensorText) {
  const pageWidth  = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const barHeight  = BOTTOM_BAR;

  // zwarte balk
  pdf.setFillColor(0, 0, 0);
  pdf.rect(0, pageHeight - barHeight, pageWidth, barHeight, "F");

  // regel 1: sensor mode (bovenin de balk)
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(14);                 // pas evt. aan (14–18)
  const ySensor = pageHeight - barHeight + 48;
  pdf.text(`Camera/Sensor mode: ${sensorText}`, pageWidth / 2, ySensor, {
    align: "center",
    baseline: "middle"
  });

  // regel 2: CTA (onderin de balk)
  const cta = "Benieuwd naar alle lenzen? Klik hier";
  pdf.setFontSize(16);
  const yCta = pageHeight - 18;        // afstand boven onderrand
  pdf.text(cta, pageWidth / 2, yCta, { align: "center", baseline: "middle" });

  // klikbare link over de CTA-tekst
  const textWidth = pdf.getTextWidth(cta);
  const linkX = (pageWidth - textWidth) / 2;
  const linkY = yCta - 10;             // kleine marge
  const linkH = 20;
  pdfLinkRect(pdf, linkX, linkY, textWidth, linkH, "https://tvlrental.nl/lenses/");
  // logo rechts
  if (logo) {
    const targetHeight = 50;
    const ratio = logo.width / logo.height;
    const targetWidth = targetHeight * ratio;
    const xLogo = pageWidth - targetWidth - 12;
    const yLogo = pageHeight - targetHeight - 12;
    pdf.addImage(logo, "PNG", xLogo, yLogo, targetWidth, targetHeight);
  }
}
  function fillBlack() {
    const pw = pdf.internal.pageSize.getWidth();
    const ph = pdf.internal.pageSize.getHeight();
    pdf.setFillColor(0, 0, 0);
    pdf.rect(0, 0, pw, ph, "F");
  }

  // Data uit UI
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const box   = getContentBox(pageW, pageH);

// Sensor‑AR uit de huidige selectie (exact zoals de viewer)
const targetAR = getTargetAR();

// Export-resolutie (scherpte).  ~300 DPI benadering op A4 landscape content-box
const exportScale = 8; // 2.5–3 is meestal top; 3 geeft veel detail
const exportH = Math.round(box.h * exportScale);

  // Zoom/crop factor tov Venice breedte: nooit “uitzoomen”, alleen extra crop als kleiner is

const { w: sW } = getCurrentWH();
const zoom = Math.max(1, BASE_SENSOR.w / sW);
// Wil je minder agressief? Neem bv: const zoom = 1 + 0.6 * (Math.max(1, BASE_SENSOR.w / sW) - 1);
  
  

  
  const leftText  = leftLabel.textContent;
  const rightText = rightLabel.textContent;
  const leftName  = leftSelect.value;
  const rightName = rightSelect.value;
  const focal     = focalLengthSelect.value;
  const tLeftRaw  = tStopLeftSelect.value;
const tRightRaw = tStopRightSelect.value;
const tLeft  = String(tLeftRaw).replace(/\./g, "_");
const tRight = String(tRightRaw).replace(/\./g, "_");

  const logoUrl = "https://tvlmedia.github.io/lens-compare/LOGOVOORPDF.png";
const logo = await loadHTMLImage(logoUrl);
const sensorText = getSensorText(); // bv. "Sony Venice – 6K 3:2"
  

  // === Sensor-canvas render (1:1 met viewer) ===
const li = await loadHTMLImage(afterImgTag.src);   // left = after
const ri = await loadHTMLImage(beforeImgTag.src);  // right = before

const leftSensor  = await renderToSensorAR(li, targetAR, exportH, zoom * userScale);
const rightSensor = await renderToSensorAR(ri, targetAR, exportH, zoom * userScale);

// Split canvas met dezelfde (W,H) als sensor-canvassen
const splitData = await buildSplitFromSensor(leftSensor.dataURL, rightSensor.dataURL, leftSensor.W, leftSensor.H);

// Voor losse pagina's gebruiken we de sensor-canvassen zelf
const leftData  = leftSensor.dataURL;
const rightData = rightSensor.dataURL;

  // === PDF render ===
  fillBlack();
drawTopBar(`${leftText} vs ${rightText}`);
  const fullBox = { x: 0, y: TOP_BAR, w: pageW, h: pageH - TOP_BAR - BOTTOM_BAR };
await placeContain(pdf, splitData, fullBox);
// Sensor‑tekst net boven de bottombar

drawBottomBarPage1(logo, sensorText);
  
  // --- Pagina 2: LINKER beeld ---
pdf.addPage();
fillBlack();
drawTopBar(`${leftText} – ${sensorText}`);
await placeContain(pdf, leftData, fullBox);
drawBottomBar({
  text: lensDescriptions[leftName]?.text || "",
  link: lensDescriptions[leftName]?.url || "",
  logo
});

// --- Pagina 3: RECHTER beeld ---
pdf.addPage();
fillBlack();
drawTopBar(`${rightText} – ${sensorText}`);
await placeContain(pdf, rightData, fullBox);
drawBottomBar({
  text: lensDescriptions[rightName]?.text || "",
  link: lensDescriptions[rightName]?.url || "",
  logo
});

 

// --- Pagina 4: p1 + UI erboven/onder ---
pdf.addPage();
fillBlack();
drawTopBar(`${leftText} vs ${rightText}`);


const x     = PAGE_MARGIN;
const maxW  = pageW - PAGE_MARGIN * 2;

// Screenshots van UI-stroken
const controlsEl = document.querySelector('#toolRoot .controls') || document.querySelector('.controls');
const infoEl     = document.getElementById('infoContainer');

// Activeer compact-styling tijdens screenshot
document.body.classList.add('pdf-compact');

const controlsShot = await screenshotEl(controlsEl);
const infoShot     = await screenshotEl(infoEl);

// Zet styling terug
document.body.classList.remove('pdf-compact');

let curY = TOP_BAR + PAGE_MARGIN;

// 1) Controls-balk plaatsen (volledige breedte van content)
let controlsH = 0;
if (controlsShot) {
  const w = Math.round(maxW * 0.7);                 // 🔽 kleiner
  const cx = x + Math.round((maxW - w) / 2);        // centreer
  const placed = await placeToWidth(pdf, controlsShot, cx, curY, w);
  controlsH = placed.h;
  curY += controlsH + 8;                             // kleinere gap
}

// 2) Split-beeld (zelfde asset als p1), “contain” in de resterende hoogte
const bottomReserved = (infoShot ? 12 : 0) + (infoShot ? 1 : 0); // gap + straks info
const availH = (pageH - BOTTOM_BAR - PAGE_MARGIN) - curY - (infoShot ? 1200 : 0); // ruimschoots buffer
const fullBoxP4 = { x, y: curY, w: maxW, h: (pageH - BOTTOM_BAR - PAGE_MARGIN) - curY - (infoShot ?  (bottomReserved + 1) : 0) };
await placeContain(pdf, splitData, fullBoxP4);

// 3) Info/labels/RAW-buttons onder het beeld
if (infoShot) {
  // plaats strak tegen onderkant van de image-box, met 12px marge
  const infoY = fullBoxP4.y + fullBoxP4.h + 12;
  await placeToWidth(pdf, infoShot, x, infoY, maxW);
}

// CTA-balk onderin blijft hetzelfde
drawBottomBar({
  text: "",
  link: "",
  logo,
  ctaLabel: "Open de interactieve Lens Comparison Tool",
  ctaUrl: "https://tvlrental.nl/lens-comparison/"
});

// ==== Bestandsnaam maken in vorm:
// TVLRENTAL_Lens1_Lens2_mm_Tstop_Camera_Sensormode ====

const makeSafe = (s) => (s || "")
  .toString()
  // laat alleen letters, cijfers en underscores toe
  .replace(/[^\w]+/g, "");



// Haal camera & sensormode op
const cameraName = cameraSelect.value || "UnknownCamera";
// gebruik het label als het er is (bijv. "6K 3:2"), anders de key
const sensorModeLabel =
  (cameras[cameraName]?.[sensorFormatSelect.value]?.label) ||
  sensorFormatSelect.value || "UnknownSensorMode";

// Maak de delen safe
const safeLeft        = makeSafe(leftName);
const safeRight       = makeSafe(rightName);
const safeCamera      = makeSafe(cameraName);
const safeSensorMode  = makeSafe(sensorModeLabel);
const safeFocal       = makeSafe(focal); // "35mm" blijft "35mm"

// Bouw bestandsnaam
const filename = `TVLRENTAL_${safeLeft}_${safeRight}_${safeFocal}_T${tLeft}vsT${tRight}_${safeCamera}_${safeSensorMode}.pdf`;
  
// Opslaan
    pdf.save(filename);
  } finally {
    if (wasSBS) {
      setSideBySide(true, { force: true });  // herstel vorige SxS-staat
    }
    updateFullscreenBars();
    resetSplitToMiddle();
    if (sbsBtn) sbsBtn.disabled = false;
    isExportingPdf = false;
  }
});
 


// ==== DETAIL VIEWER ====
const detailOverlay = document.getElementById("detailOverlay");
const leftDetail = document.getElementById("leftDetail");
const rightDetail = document.getElementById("rightDetail");
const leftDetailImg = leftDetail.querySelector("img");
const rightDetailImg = rightDetail.querySelector("img");
const detailToggleButton = document.getElementById("detailViewToggle");

let detailActive = false;

detailToggleButton.addEventListener("click", () => {
  detailActive = !detailActive;
  detailOverlay.classList.toggle("active", detailActive);
  detailToggleButton.classList.toggle("active", detailActive);
  if (!detailActive) {
    leftDetail.style.display = "none";
    rightDetail.style.display = "none";
  }
});
document.getElementById("sbsToggle")?.addEventListener("click", () => {
  setSideBySide(!sbsActive);
});
// --- vervangt je huidige updateZoomViewer helper ---
function updateZoomViewerAt(e, detailBox, detailImg, srcImgOrRect, opts = {}) {
  const ZOOM = opts.zoom || 3.2;
  const SIZE = opts.size || 260;

  // bron-rect: mag een DOM img zijn of direct een rect
  const rect = srcImgOrRect.getBoundingClientRect
    ? srcImgOrRect.getBoundingClientRect()
    : srcImgOrRect;

  // muis t.o.v. de bron-rect
  const relX = (e.clientX - rect.left) / rect.width;
  const relY = (e.clientY - rect.top)  / rect.height;

  // buiten de bron? verberg en stop
  if (relX < 0 || relX > 1 || relY < 0 || relY > 1) {
    detailBox.style.display = "none";
    return false;
  }

  // koppel juiste beeldbron
  if (detailImg.src !== (srcImgOrRect.src || detailImg.src)) {
    // als srcImgOrRect een <img> is, pak zijn src
    if (srcImgOrRect.src) detailImg.src = srcImgOrRect.src;
  }

  // zoomed afbeeldingsafmetingen gebaseerd op de getoonde rect
  const zoomW = rect.width  * ZOOM;
  const zoomH = rect.height * ZOOM;

  // offset zodat het aangeklikte punt in het midden van het vierkant zit
  const offX = -(relX * zoomW) + (SIZE / 2);
  const offY = -(relY * zoomH) + (SIZE / 2);

  // positioneer het vierkant op de muis
  detailBox.style.left   = `${e.clientX - SIZE / 2}px`;
  detailBox.style.top    = `${e.clientY - SIZE / 2}px`;
  detailBox.style.width  = `${SIZE}px`;
  detailBox.style.height = `${SIZE}px`;
  detailBox.style.display = "block";

  // zet de grote afbeelding binnen het vierkant
  detailImg.style.width  = `${zoomW}px`;
  detailImg.style.height = `${zoomH}px`;
  detailImg.style.transform = `translate(${offX}px, ${offY}px)`;

  return true;
}

// --- vervangt je huidige mousemove handler ---
document.addEventListener("mousemove", (e) => {
  if (!detailActive) return;

  // SxS modus: beide panelen updaten met dezelfde relatieve positie
  if (sbsActive) {
    const L = sbsLeftImg.getBoundingClientRect();
    const R = sbsRightImg.getBoundingClientRect();

    const inLeft  = e.clientX >= L.left && e.clientX <= L.right &&
                    e.clientY >= L.top  && e.clientY <= L.bottom;
    const inRight = e.clientX >= R.left && e.clientX <= R.right &&
                    e.clientY >= R.top  && e.clientY <= R.bottom;

    let relX, relY, usedRect;
    if (inLeft) {
      relX = (e.clientX - L.left) / L.width;
      relY = (e.clientY - L.top)  / L.height;
      usedRect = L;
    } else if (inRight) {
      relX = (e.clientX - R.left) / R.width;
      relY = (e.clientY - R.top)  / R.height;
      usedRect = R;
    } else {
      leftDetail.style.display  = "none";
      rightDetail.style.display = "none";
      return;
    }

    const updateWithRel = (detailBox, detailImg, srcEl, rect, rx, ry, zoom=3.2, size=260) => {
      if (detailImg.src !== srcEl.src) detailImg.src = srcEl.src;

      detailBox.style.left   = `${e.clientX - size/2}px`;
      detailBox.style.top    = `${e.clientY - size/2}px`;
      detailBox.style.width  = `${size}px`;
      detailBox.style.height = `${size}px`;
      detailBox.style.display = "block";

      const zoomW = rect.width  * zoom;
      const zoomH = rect.height * zoom;
      const offX  = -(rx * zoomW) + (size/2);
      const offY  = -(ry * zoomH) + (size/2);

      detailImg.style.width  = `${zoomW}px`;
      detailImg.style.height = `${zoomH}px`;
      detailImg.style.transform = `translate(${offX}px, ${offY}px)`;
    };

    updateWithRel(leftDetail,  leftDetailImg,  sbsLeftImg,  L, relX, relY);
    updateWithRel(rightDetail, rightDetailImg, sbsRightImg, R, relX, relY);
    return;
  }

  // Single-view (slider): gebruik after/before
  const showL = updateZoomViewerAt(e, leftDetail,  leftDetailImg,  afterImgTag);
  const showR = updateZoomViewerAt(e, rightDetail, rightDetailImg, beforeImgTag);

  if (!showL && !showR) {
    leftDetail.style.display  = "none";
    rightDetail.style.display = "none";
  }
});


comparisonWrapper.addEventListener("mouseleave", () => {
  leftDetail.style.display = "none";
  rightDetail.style.display = "none";
});

// ⎋ Sluit detail viewer met ESC
document.addEventListener("keydown", (e) => {
 if (e.key === "Escape" && detailActive) {
  detailActive = false;
  detailOverlay.classList.remove("active");
  detailToggleButton.classList.remove("active"); // <== DIT OOK!
  leftDetail.style.display = "none";
  rightDetail.style.display = "none";
}
});
function updateFullscreenBars() {
  // In SBS: geen letter/pillarbox en geen slider-clip
  if (sbsActive) {
    comparisonWrapper.style.setProperty('--lb-top','0px');
    comparisonWrapper.style.setProperty('--lb-bottom','0px');
    comparisonWrapper.style.setProperty('--lb-left','0px');
    comparisonWrapper.style.setProperty('--lb-right','0px');
    comparisonWrapper._lbLeft = comparisonWrapper._lbRight = comparisonWrapper._lbTop = comparisonWrapper._lbBottom = 0;
    comparisonWrapper._usableW = comparisonWrapper.getBoundingClientRect().width;
    return;
  }

  const rect  = comparisonWrapper.getBoundingClientRect();
  const hostW = Math.max(1, Math.round(rect.width));
  const hostH = Math.max(1, Math.round(rect.height));

  const targetAR = getTargetAR();
  const hostAR   = hostW / hostH;

  let usedW, usedH;
  let lbLeft = 0, lbRight = 0, lbTop = 0, lbBottom = 0;

  if (hostAR > targetAR) {
    usedH = hostH;
    usedW = Math.round(usedH * targetAR);
    const side = Math.floor((hostW - usedW) / 2);
    lbLeft = lbRight = side;
  } else {
    usedW = hostW;
    usedH = Math.round(usedW / targetAR);
    const bar = Math.floor((hostH - usedH) / 2);
    lbTop = lbBottom = bar;
  }

  comparisonWrapper.style.setProperty('--lb-top',    lbTop + 'px');
  comparisonWrapper.style.setProperty('--lb-bottom', lbBottom + 'px');
  comparisonWrapper.style.setProperty('--lb-left',   lbLeft + 'px');
  comparisonWrapper.style.setProperty('--lb-right',  lbRight + 'px');

  comparisonWrapper._lbLeft   = lbLeft;
  comparisonWrapper._lbRight  = lbRight;
  comparisonWrapper._lbTop    = lbTop;
  comparisonWrapper._lbBottom = lbBottom;
  comparisonWrapper._usableW  = usedW;
}

// VERVANGT resetSplitToMiddle()
function resetSplitToMiddle() {
  if (sbsActive) return;  // geen slider in SBS
  const rect    = comparisonWrapper.getBoundingClientRect();
  const lbLeft  = comparisonWrapper._lbLeft  || 0;
  const lbRight = comparisonWrapper._lbRight || 0;
  const usable  = Math.max(1, Math.round(rect.width - lbLeft - lbRight));

  const mid = Math.round(usable / 2);

  // clip aan beide kanten: links = lbLeft, rechts = lbRight + rest
  const leftInsetPx  = lbLeft;
  const rightInsetPx = lbRight + (usable - mid);

  const inset = `inset(0 ${rightInsetPx}px 0 ${leftInsetPx}px)`;
  afterWrapper.style.clipPath = inset;
  afterWrapper.style.webkitClipPath = inset;

  // lijn precies midden in bruikbare beeldvlak
  slider.style.left = (lbLeft + mid) + 'px';

// ✅ lijn alleen over bruikbare hoogte
const lbTop    = comparisonWrapper._lbTop    || 0;
const lbBottom = comparisonWrapper._lbBottom || 0;
const usableHeight = Math.max(1, Math.round(rect.height - lbTop - lbBottom));

slider.style.top    = lbTop + 'px';
slider.style.height = usableHeight + 'px';
slider.style.bottom = 'auto';
}

// VERVANGT updateSliderPosition()
function updateSliderPosition(clientX) {
  const rect    = comparisonWrapper.getBoundingClientRect();
  const lbLeft  = comparisonWrapper._lbLeft  || 0;
  const lbRight = comparisonWrapper._lbRight || 0;
  const usable  = Math.max(1, Math.round(rect.width - lbLeft - lbRight));

  // cursorpositie binnen het bruikbare beeld (tussen de pillarboxen)
  const xInUsable = clientX - rect.left - lbLeft;
  const clamped   = Math.max(0, Math.min(Math.round(xInUsable), usable));

  // clip aan beide kanten: links vast = lbLeft, rechts = lbRight + rest
  const leftInsetPx  = lbLeft;
  const rightInsetPx = lbRight + (usable - clamped);

 const OVERLAP = 1; // 1 CSS px overlap
const inset = `inset(0 ${Math.max(0, rightInsetPx - OVERLAP)}px 0 ${leftInsetPx}px)`;
  afterWrapper.style.clipPath = inset;
  afterWrapper.style.webkitClipPath = inset;

  // lijn op exact dezelfde X als de overgang
  slider.style.left = (lbLeft + clamped) + 'px';

// ✅ lijn alleen over bruikbare hoogte
const lbTop    = comparisonWrapper._lbTop    || 0;
const lbBottom = comparisonWrapper._lbBottom || 0;
const usableHeight = Math.max(1, Math.round(rect.height - lbTop - lbBottom));

slider.style.top    = lbTop + 'px';
slider.style.height = usableHeight + 'px';
slider.style.bottom = 'auto';
}
function pulseFsBars({ duration = 1400 } = {}) {
  const start = performance.now();
  (function tick(now) {
    if (!isWrapperFullscreen()) return;
    updateFullscreenBars();
    resetSplitToMiddle();
    if (now - start < duration) requestAnimationFrame(tick);
  })(start);
}
// === Keyboard shortcuts ===
function onGlobalKeydown(e) {
  // voorkom conflict met browser/OS sneltoetsen
  if (e.ctrlKey || e.metaKey || e.altKey) return;

  const tag = (document.activeElement?.tagName || "").toUpperCase();
  if (["INPUT", "TEXTAREA"].includes(tag)) return; // SELECT laten we door

  if (isExportingPdf) return; // geen sneltoetsen tijdens export
  
  const k = (e.key || "").toLowerCase();
  if (k === "p") {
    e.preventDefault();
    toggleFullscreen();
  }
  if (k === "d") {
    e.preventDefault();
    document.getElementById("detailViewToggle")?.click();
  }
  if (k === "s") {
  e.preventDefault();
  setSideBySide(!sbsActive);
}
  if (k === "f") {
  e.preventDefault();
  flareToggle.click(); // zelfde als handmatig op de knop drukken
    }
}

/* ---------- AUTO SCALE (v2, mm-based + slider sync) ---------- */

/** Doelpercentages per focal (pak hoogste van links/rechts) */
const LENS_SCALE_TABLE = {
  "35mm": {
    panchro: 100,
    "red p": 116,
    mkii: 117,
    jena: 112,
    vespid: 109,
    arles: 110,
    "lomo standard speed": 110,
  },
  "75mm": {
    panchro: 100,
    "red p": 118,
    mkii: 117,
    jena: 110,
    vespid: 100,
    arles: 100,
    "lomo standard speed": 100,
  },
};

function normalizeLensKey(label = "") {
  const s = label.toLowerCase();
  if (s.includes("panchro")) return "panchro";
  if (s.includes("red p")) return "red p";
  if (s.includes("mk ii") || s.includes("mkii") || s.includes("mk2")) return "mkii";
  if (s.includes("jena")) return "jena";
  if (s.includes("vespid")) return "vespid";
  if (s.includes("arles")) return "arles";
  if (s.includes("lomo") && s.includes("standard")) return "lomo standard speed";
  return "";
}

function isScaleAllowedBySensor() {
  const { w, h } = getCurrentWH(); // mm
  const EPS   = 0.001;
  const W_MIN = 30.720; 
  const H_MIN = 16.200;
  return (w > W_MIN + EPS) && (h > H_MIN + EPS);
}

function scaleForLens(lensLabel, focalStr) {
  const key = normalizeLensKey(lensLabel);
  const focalKey = (String(focalStr).includes("75") ? "75mm" : "35mm");
  const table = LENS_SCALE_TABLE[focalKey] || {};
  return table[key] || 100;
}

function applyScalePercent(pct) {
  const p = Math.max(100, Math.min(130, Math.round(pct)));
  if (scaleSlider) scaleSlider.value = String(p);
  setUserScaleFromPct(p);
}

function autoScaleNow() {
  if (!isScaleAllowedBySensor()) {
    applyScalePercent(100);
    return;
  }

  const leftLabel  = leftSelect?.value || "";
  const rightLabel = rightSelect?.value || "";
  const focalStr   = focalLengthSelect?.value || "35mm";

  const leftPct  = scaleForLens(leftLabel,  focalStr);
  const rightPct = scaleForLens(rightLabel, focalStr);

  applyScalePercent(Math.max(leftPct, rightPct));
}

["change", "input"].forEach(evt => {
  leftSelect?.addEventListener(evt,  autoScaleNow);
  rightSelect?.addEventListener(evt, autoScaleNow);
  focalLengthSelect?.addEventListener(evt, autoScaleNow);
  sensorFormatSelect?.addEventListener(evt, autoScaleNow);
  cameraSelect?.addEventListener(evt, autoScaleNow);
});

autoScaleNow();

window.addEventListener("keydown", onGlobalKeydown, { capture: true });
(function enforceBlankTargets(){
  const setBlank = (a) => {
    if (!a.target) a.target = "_blank";
    const rel = (a.getAttribute("rel") || "").split(/\s+/);
    if (!rel.includes("noopener")) rel.push("noopener");
    if (!rel.includes("noreferrer")) rel.push("noreferrer");
    a.setAttribute("rel", rel.join(" ").trim());
  };
  document.querySelectorAll("a[href]").forEach(setBlank);
  new MutationObserver(muts => muts.forEach(m => {
    m.addedNodes.forEach(n => {
      if (n.nodeType !== 1) return;
      if (n.matches?.("a[href]")) setBlank(n);
      n.querySelectorAll?.("a[href]").forEach(setBlank);
    });
  })).observe(document.documentElement, { childList: true, subtree: true });
})();
