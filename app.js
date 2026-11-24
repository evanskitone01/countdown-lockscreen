const STORAGE_KEY = "countdown_lockscreen_studio_v1";

const state = {
  goal: "Final Exam",
  targetDate: "",
  targetTime: "09:00",
  ratio: "9:16",
  theme: "slate-gold",
  bgDataUrl: "",
  milestones: [
    { id: crypto.randomUUID(), offset: 14, text: "Gather study notes", done: false },
    { id: crypto.randomUUID(), offset: 7, text: "Finish core review", done: false },
    { id: crypto.randomUUID(), offset: 3, text: "Take practice test", done: false },
    { id: crypto.randomUUID(), offset: 1, text: "Light final recap", done: false }
  ]
};

// DOM references
const goalInput = document.getElementById("goal-input");
const dateInput = document.getElementById("date-input");
const timeInput = document.getElementById("time-input");
const ratioMobileBtn = document.getElementById("ratio-mobile");
const ratioDesktopBtn = document.getElementById("ratio-desktop");
const themeChips = document.querySelectorAll(".theme-chip");
const bgUpload = document.getElementById("bg-upload");
const milestoneEditor = document.getElementById("milestone-editor");
const regenBtn = document.getElementById("regen-btn");
const newLabelInput = document.getElementById("new-milestone-label");
const newOffsetInput = document.getElementById("new-milestone-offset");
const addMilestoneBtn = document.getElementById("add-milestone-btn");
const downloadPngBtn = document.getElementById("download-png-btn");
const downloadIcsBtn = document.getElementById("download-ics-btn");

const lockscreenEl = document.getElementById("lockscreen");
const liveClockEl = document.getElementById("live-clock");
const liveDateEl = document.getElementById("live-date");
const previewGoalEl = document.getElementById("preview-goal");
const previewDaysEl = document.getElementById("preview-days");
const liveCountdownEl = document.getElementById("live-countdown");
const previewListEl = document.getElementById("preview-list");
const exportCanvas = document.getElementById("export-canvas");

function getDefaultTargetDate() {
  const d = new Date();
  d.setDate(d.getDate() + 14);
  return d.toISOString().split("T")[0];
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore storage quota errors if a large image is uploaded
  }
}

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved) {
      Object.assign(state, saved);
    }
  } catch {
    // Ignore malformed JSON
  }
  if (!state.targetDate) {
    state.targetDate = getDefaultTargetDate();
  }
  if (!state.targetTime) {
    state.targetTime = "09:00";
  }
}

function getTargetDateTime() {
  if (!state.targetDate) return null;
  const [y, m, day] = state.targetDate.split("-").map(Number);
  const [hours = 9, minutes = 0] = (state.targetTime || "09:00").split(":").map(Number);
  return new Date(y, m - 1, day, hours, minutes, 0);
}

function getCountdownBreakdown() {
  const target = getTargetDateTime();
  if (!target) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, text: "00d 00h 00m 00s" };
  }

  const diffMs = Math.max(0, target.getTime() - Date.now());
  const totalSeconds = Math.floor(diffMs / 1000);

  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const pad = (n) => String(n).padStart(2, "0");
  return {
    days,
    hours,
    minutes,
    seconds,
    text: `${pad(days)}d ${pad(hours)}h ${pad(minutes)}m ${pad(seconds)}s`
  };
}

function calcDaysLeft() {
  return getCountdownBreakdown().days;
}

function updateLiveCountdown() {
  const cd = getCountdownBreakdown();
  previewDaysEl.textContent = cd.days;
  if (liveCountdownEl) {
    liveCountdownEl.textContent = cd.text;
  }
}

function formatMilestoneDate(offsetDays) {
  if (!state.targetDate) return "";
  const [y, m, day] = state.targetDate.split("-").map(Number);
  const d = new Date(y, m - 1, day - offsetDays);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function regenerateTMinus() {
  const defaults = [
    { offset: 14, text: "Kick off prep" },
    { offset: 7, text: "Midpoint checkpoint" },
    { offset: 3, text: "Final polish & review" },
    { offset: 1, text: "Day-before readiness" }
  ];
  state.milestones = defaults.map((item) => ({
    id: crypto.randomUUID(),
    offset: item.offset,
    text: item.text,
    done: false
  }));
  saveState();
  render();
}

function updateClock() {
  const now = new Date();
  liveClockEl.textContent = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  liveDateEl.textContent = now.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
}

function render() {
  goalInput.value = state.goal;
  dateInput.value = state.targetDate;
  timeInput.value = state.targetTime;

  // Aspect ratio & theme
  lockscreenEl.className = `lockscreen theme-${state.theme} ${
    state.ratio === "9:16" ? "ratio-9-16" : "ratio-16-9"
  }`;
  ratioMobileBtn.classList.toggle("active", state.ratio === "9:16");
  ratioDesktopBtn.classList.toggle("active", state.ratio === "16:9");

  themeChips.forEach((chip) => {
    chip.classList.toggle("active", chip.dataset.theme === state.theme);
  });

  if (state.bgDataUrl) {
    lockscreenEl.style.backgroundImage = `linear-gradient(rgba(10, 15, 28, 0.55), rgba(10, 15, 28, 0.72)), url("${state.bgDataUrl}")`;
  } else {
    lockscreenEl.style.backgroundImage = "";
  }

  // Hero stats
  previewGoalEl.textContent = (state.goal || "MY GOAL").toUpperCase();
  updateLiveCountdown();

  // Sort milestones descending by offset (T-14 before T-1)
  const sorted = [...state.milestones].sort((a, b) => b.offset - a.offset);

  // Editor list
  milestoneEditor.innerHTML = "";
  sorted.forEach((m) => {
    const row = document.createElement("div");
    row.className = "milestone-item";

    const left = document.createElement("div");
    left.className = "milestone-left";

    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.checked = m.done;
    cb.addEventListener("change", () => {
      m.done = cb.checked;
      saveState();
      render();
    });

    const label = document.createElement("span");
    label.className = m.done ? "done" : "";
    label.textContent = `T-${m.offset} (${formatMilestoneDate(m.offset)}): ${m.text}`;

    const delBtn = document.createElement("button");
    delBtn.type = "button";
    delBtn.className = "delete-btn";
    delBtn.textContent = "×";
    delBtn.addEventListener("click", () => {
      state.milestones = state.milestones.filter((item) => item.id !== m.id);
      saveState();
      render();
    });

    left.append(cb, label);
    row.append(left, delBtn);
    milestoneEditor.appendChild(row);
  });

  // Preview checklist
  previewListEl.innerHTML = "";
  sorted.forEach((m) => {
    const li = document.createElement("li");
    li.className = m.done ? "done" : "";
    li.textContent = `${m.done ? "☑" : "☐"} T-${m.offset} · ${m.text}`;
    previewListEl.appendChild(li);
  });
}

function downloadWallpaperPng() {
  const isVertical = state.ratio === "9:16";
  const width = isVertical ? 1080 : 1920;
  const height = isVertical ? 1920 : 1080;

  exportCanvas.width = width;
  exportCanvas.height = height;
  const ctx = exportCanvas.getContext("2d");

  const paletteMap = {
    "slate-gold": { top: "#1e293b", bottom: "#0f172a", accent: "#facc15", text: "#f8fafc" },
    midnight: { top: "#1e1b4b", bottom: "#09090b", accent: "#38bdf8", text: "#fafafa" },
    botanical: { top: "#14532d", bottom: "#052e16", accent: "#86efac", text: "#f0fdf4" }
  };
  const pal = paletteMap[state.theme] || paletteMap["slate-gold"];

  const drawOverlayAndText = () => {
    ctx.fillStyle = pal.text;
    ctx.textAlign = "center";

    const centerX = width / 2;
    const baseY = isVertical ? height * 0.34 : height * 0.22;
    const cd = getCountdownBreakdown();

    ctx.fillStyle = pal.accent;
    ctx.font = `700 ${isVertical ? 32 : 24}px system-ui, sans-serif`;
    ctx.fillText("T-MINUS COUNTDOWN", centerX, baseY);

    ctx.fillStyle = pal.text;
    ctx.font = `800 ${isVertical ? 76 : 56}px system-ui, sans-serif`;
    ctx.fillText((state.goal || "MY GOAL").toUpperCase(), centerX, baseY + (isVertical ? 90 : 68));

    ctx.fillStyle = pal.accent;
    ctx.font = `900 ${isVertical ? 120 : 88}px system-ui, sans-serif`;
    ctx.fillText(`${cd.days} DAYS LEFT`, centerX, baseY + (isVertical ? 225 : 165));

    ctx.fillStyle = pal.text;
    ctx.font = `700 ${isVertical ? 40 : 30}px system-ui, sans-serif`;
    ctx.fillText(cd.text, centerX, baseY + (isVertical ? 280 : 205));

    // Milestones
    const sorted = [...state.milestones].sort((a, b) => b.offset - a.offset);
    let listY = baseY + (isVertical ? 355 : 255);
    ctx.font = `600 ${isVertical ? 36 : 26}px system-ui, sans-serif`;

    sorted.forEach((m) => {
      const box = m.done ? "[x]" : "[ ]";
      ctx.fillStyle = m.done ? "#94a3b8" : pal.text;
      ctx.fillText(`${box}  T-${m.offset} (${formatMilestoneDate(m.offset)}) — ${m.text}`, centerX, listY);
      listY += isVertical ? 58 : 42;
    });

    const link = document.createElement("a");
    link.download = `countdown-${(state.goal || "goal").toLowerCase().replace(/\s+/g, "-")}.png`;
    link.href = exportCanvas.toDataURL("image/png");
    link.click();
  };

  if (state.bgDataUrl) {
    const img = new Image();
    img.onload = () => {
      const scale = Math.max(width / img.width, height / img.height);
      const drawW = img.width * scale;
      const drawH = img.height * scale;
      ctx.drawImage(img, (width - drawW) / 2, (height - drawH) / 2, drawW, drawH);
      ctx.fillStyle = "rgba(9, 13, 22, 0.65)";
      ctx.fillRect(0, 0, width, height);
      drawOverlayAndText();
    };
    img.src = state.bgDataUrl;
  } else {
    const grad = ctx.createLinearGradient(0, 0, 0, height);
    grad.addColorStop(0, pal.top);
    grad.addColorStop(1, pal.bottom);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);
    drawOverlayAndText();
  }
}

function downloadRemindersIcs() {
  if (!state.targetDate) return;
  const [y, m, day] = state.targetDate.split("-").map(Number);

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Countdown Lock Screen Studio//EN"
  ];

  state.milestones.forEach((item) => {
    const eventDate = new Date(y, m - 1, day - item.offset);
    const yyyy = eventDate.getFullYear();
    const mm = String(eventDate.getMonth() + 1).padStart(2, "0");
    const dd = String(eventDate.getDate()).padStart(2, "0");
    const stamp = `${yyyy}${mm}${dd}`;

    lines.push(
      "BEGIN:VEVENT",
      `UID:${item.id}@lockscreen-studio`,
      `DTSTAMP:${stamp}T090000Z`,
      `DTSTART;VALUE=DATE:${stamp}`,
      `SUMMARY:T-${item.offset} (${state.goal}): ${item.text}`,
      "END:VEVENT"
    );
  });

  lines.push("END:VCALENDAR");

  const blob = new Blob([lines.join("\r\n")], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "countdown-milestones.ics";
  link.click();
  URL.revokeObjectURL(url);
}

// Event Listeners
goalInput.addEventListener("input", (e) => {
  state.goal = e.target.value;
  saveState();
  render();
});

dateInput.addEventListener("change", (e) => {
  state.targetDate = e.target.value;
  saveState();
  render();
});

timeInput.addEventListener("change", (e) => {
  state.targetTime = e.target.value || "09:00";
  saveState();
  render();
});

ratioMobileBtn.addEventListener("click", () => {
  state.ratio = "9:16";
  saveState();
  render();
});

ratioDesktopBtn.addEventListener("click", () => {
  state.ratio = "16:9";
  saveState();
  render();
});

themeChips.forEach((chip) => {
  chip.addEventListener("click", () => {
    state.theme = chip.dataset.theme;
    saveState();
    render();
  });
});

bgUpload.addEventListener("change", (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    state.bgDataUrl = String(reader.result || "");
    saveState();
    render();
  };
  reader.readAsDataURL(file);
});

regenBtn.addEventListener("click", regenerateTMinus);

addMilestoneBtn.addEventListener("click", () => {
  const text = newLabelInput.value.trim();
  const offset = Math.max(0, Number(newOffsetInput.value) || 0);
  if (!text) return;
  state.milestones.push({
    id: crypto.randomUUID(),
    offset,
    text,
    done: false
  });
  newLabelInput.value = "";
  saveState();
  render();
});

downloadPngBtn.addEventListener("click", downloadWallpaperPng);
downloadIcsBtn.addEventListener("click", downloadRemindersIcs);

// Initialize
loadState();
updateClock();
updateLiveCountdown();
render();
setInterval(() => {
  updateClock();
  updateLiveCountdown();
}, 1000);