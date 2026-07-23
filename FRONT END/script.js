//learnign script.js 

const API_BASE = "http://localhost:8000";  // backend api location

document.getElementById("resumeFile").addEventListener("change", async function (event) {   // the resume file event lisener to see if the file was added or changed
  const file = event.target.files[0];      //looks at the first file that the document inputed in by the user
  if (!file) return;               //if the file is not found go back

  const name = file.name.toLowerCase();              // changes the file name to lowercase 
  const resumeTextarea = document.getElementById("resumeText");      //get the document text 
// LOOKS at all file types and it is within a if statement 
  const name = file.name.toLowerCase();
  const resumeTextarea = document.getElementById("resumeText");

  if (name.endsWith(".txt")) {
    const reader = new FileReader();
    reader.onload = function (e) {
      resumeTextarea.value = e.target.result;
    };
    reader.readAsText(file);
    return;
  }

  if (name.endsWith(".pdf") || name.endsWith(".docx")) {
    setStatus("Reading file…");
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await fetch(`${API_BASE}/api/parse-resume`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.detail || "Could not read this file.");
      }
      resumeTextarea.value = data.text;
      setStatus("");
    } catch (err) {
      console.error(err);
      setStatus(`Couldn't read that file: ${err.message}`, true);
    }
    return;
  }

  setStatus("Unsupported file type. Upload a .pdf, .docx, or .txt file.", true);
});

// ---- Build the results UI ----
// start.html has no markup for a status line or a results panel, so both
// are created here and inserted right after the existing .form-row.
// start.html itself is never modified — this only adds new elements at
// runtime.
(function buildResultsUI() {
  const style = document.createElement("style");
  style.textContent = `
    .rkm-status {
      font-family: inherit;
      margin: 10px 0 0;
      font-size: 0.9rem;
      color: #6b7280;
      min-height: 1.2em;
    }
    .rkm-status.rkm-status-error { color: #c23b3b; }

    #submitBtn:disabled { opacity: 0.6; cursor: not-allowed; }

    .rkm-results {
      font-family: inherit;
      margin-top: 28px;
      padding: 24px;
      border: 1px solid #e3e6ec;
      border-radius: 10px;
      background: #ffffff;
      color: #1c1f26;
      box-sizing: border-box;
    }
    .rkm-results * { box-sizing: border-box; }

    .rkm-score-block {
      text-align: center;
      padding-bottom: 20px;
      margin-bottom: 20px;
      border-bottom: 1px solid #e3e6ec;
    }
    .rkm-score {
      font-size: 2.75rem;
      font-weight: 700;
      color: #3454d1;
      line-height: 1;
    }
    .rkm-score-percent { font-size: 1.5rem; font-weight: 600; margin-left: 2px; }
    .rkm-score-label {
      margin: 8px auto 0;
      max-width: 360px;
      font-size: 0.9rem;
      color: #6b7280;
    }

    .rkm-columns {
      display: flex;
      gap: 24px;
      flex-wrap: wrap;
      margin-bottom: 20px;
    }
    .rkm-col { flex: 1 1 220px; }

    .rkm-heading {
      font-size: 0.85rem;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      font-weight: 600;
      margin: 0 0 10px;
      color: #394150;
    }
    .rkm-heading-match { color: #1f8a5f; }
    .rkm-heading-missing { color: #c23b3b; }

    .rkm-chips { display: flex; flex-wrap: wrap; gap: 8px; }
    .rkm-chip {
      display: inline-block;
      padding: 5px 12px;
      border-radius: 999px;
      font-size: 0.85rem;
      font-weight: 500;
      background: #eef1f5;
      color: #394150;
    }
    .rkm-chip-match { background: #e5f6ee; color: #1f8a5f; }
    .rkm-chip-missing { background: #fdecec; color: #c23b3b; }
    .rkm-chip-neutral { background: #eef1f5; color: #394150; }

    .rkm-empty { font-size: 0.85rem; color: #9aa1ac; font-style: italic; }

    .rkm-keywords { padding-top: 20px; border-top: 1px solid #e3e6ec; }

    @media (max-width: 520px) {
      .rkm-columns { flex-direction: column; gap: 20px; }
    }
  `;
  document.head.appendChild(style);

  const statusEl = document.createElement("p");
  statusEl.id = "rkmStatus";
  statusEl.className = "rkm-status";
  statusEl.setAttribute("role", "status");

  const results = document.createElement("section");
  results.id = "rkmResults";
  results.className = "rkm-results";
  results.hidden = true;
  results.innerHTML = `
    <div class="rkm-score-block">
      <div class="rkm-score"><span id="rkmScoreValue">0</span><span class="rkm-score-percent">%</span></div>
      <p class="rkm-score-label">of the job listing's key phrases have a semantic match in your resume</p>
    </div>
    <div class="rkm-columns">
      <div class="rkm-col">
        <h2 class="rkm-heading rkm-heading-match">Matched skills</h2>
        <div id="rkmMatched" class="rkm-chips"></div>
      </div>
      <div class="rkm-col">
        <h2 class="rkm-heading rkm-heading-missing">Missing from your resume</h2>
        <div id="rkmMissing" class="rkm-chips"></div>
      </div>
    </div>
    <div class="rkm-keywords">
      <h2 class="rkm-heading">Top keywords in the listing</h2>
      <div id="rkmKeywords" class="rkm-chips"></div>
    </div>
  `;

  const formRow = document.querySelector(".form-row");
  formRow.insertAdjacentElement("afterend", statusEl);
  statusEl.insertAdjacentElement("afterend", results);
})();

// ---- Build the history UI ----
// Same approach as buildResultsUI() above: start.html is never touched,
// this just injects a toggle button + panel after the page title. The
// panel lists past comparisons pulled from localStorage (see the History
// helpers below) so nothing here needs the backend to render.
(function buildHistoryUI() {
  const style = document.createElement("style");
  style.textContent = `
    .rkm-history-bar {
      display: flex;
      justify-content: flex-end;
      margin: -10px 0 18px;
    }
    #rkmHistoryToggle {
      font-family: inherit;
      font-size: 0.85rem;
      padding: 6px 14px;
      border: 1px solid #888;
      border-radius: 20px;
      background: white;
      cursor: pointer;
      color: #394150;
    }
    #rkmHistoryToggle:hover { background: #f0f0f0; }

    .rkm-history {
      font-family: inherit;
      margin-bottom: 28px;
      padding: 20px 24px;
      border: 1px solid #e3e6ec;
      border-radius: 10px;
      background: #fafbfc;
      color: #1c1f26;
      box-sizing: border-box;
    }
    .rkm-history * { box-sizing: border-box; }

    .rkm-history-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 14px;
    }
    .rkm-history-header h2 {
      font-size: 0.95rem;
      margin: 0;
      font-weight: 600;
    }
    .rkm-history-clear {
      font-family: inherit;
      font-size: 0.78rem;
      padding: 4px 10px;
      border: 1px solid #c23b3b;
      border-radius: 14px;
      background: white;
      color: #c23b3b;
      cursor: pointer;
    }
    .rkm-history-clear:hover { background: #fdecec; }

    .rkm-history-list { display: flex; flex-direction: column; gap: 8px; }

    .rkm-history-entry {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 10px 12px;
      border: 1px solid #e3e6ec;
      border-radius: 8px;
      background: #ffffff;
      cursor: pointer;
    }
    .rkm-history-entry:hover { border-color: #3454d1; }

    .rkm-history-score {
      flex: 0 0 auto;
      min-width: 46px;
      text-align: center;
      padding: 3px 0;
      border-radius: 6px;
      font-size: 0.8rem;
      font-weight: 700;
      color: white;
    }
    .rkm-history-score-high { background: #1f8a5f; }
    .rkm-history-score-mid { background: #b8860b; }
    .rkm-history-score-low { background: #c23b3b; }

    .rkm-history-info { flex: 1 1 auto; min-width: 0; }
    .rkm-history-label {
      font-size: 0.88rem;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .rkm-history-time { font-size: 0.75rem; color: #9aa1ac; margin-top: 2px; }

    .rkm-history-delete {
      flex: 0 0 auto;
      font-family: inherit;
      font-size: 0.9rem;
      width: 26px;
      height: 26px;
      border: none;
      border-radius: 50%;
      background: transparent;
      color: #9aa1ac;
      cursor: pointer;
      line-height: 1;
    }
    .rkm-history-delete:hover { background: #fdecec; color: #c23b3b; }

    .rkm-history-empty { font-size: 0.85rem; color: #9aa1ac; font-style: italic; }
  `;
  document.head.appendChild(style);

  const bar = document.createElement("div");
  bar.className = "rkm-history-bar";
  bar.innerHTML = `<button type="button" id="rkmHistoryToggle">History (0)</button>`;

  const panel = document.createElement("section");
  panel.id = "rkmHistory";
  panel.className = "rkm-history";
  panel.hidden = true;
  panel.innerHTML = `
    <div class="rkm-history-header">
      <h2>Past comparisons</h2>
      <button type="button" id="rkmHistoryClear" class="rkm-history-clear">Clear all</button>
    </div>
    <div id="rkmHistoryList" class="rkm-history-list"></div>
  `;

  const title = document.querySelector(".page-title");
  title.insertAdjacentElement("afterend", panel);
  title.insertAdjacentElement("afterend", bar);

  document.getElementById("rkmHistoryToggle").addEventListener("click", () => {
    panel.hidden = !panel.hidden;
  });
  document.getElementById("rkmHistoryClear").addEventListener("click", clearHistory);
})();

// ---- Helpers ----

function setStatus(message, isError = false) {
  const el = document.getElementById("rkmStatus");
  el.textContent = message;
  el.classList.toggle("rkm-status-error", isError);
}

async function extractSkills(text) {
  const res = await fetch(`${API_BASE}/api/extract-skills`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) {
    throw new Error(`extract-skills failed: ${res.status}`);
  }
  const data = await res.json();
  if (!data.success) {
    throw new Error("Backend reported a failure extracting skills.");
  }
  return data.skills; // { category: [skill, ...], ... }
}

async function semanticMatch(resumeText, jobText) {
  const res = await fetch(`${API_BASE}/api/semantic-match`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ resume_text: resumeText, job_text: jobText }),
  });
  if (!res.ok) {
    throw new Error(`semantic-match failed: ${res.status}`);
  }
  const data = await res.json();
  if (!data.success) {
    throw new Error("Backend reported a failure computing the semantic match.");
  }
  // { matched: [{ job_phrase, resume_phrase, score }], missing: [phrase, ...], score: 0-100 }
  return data;
}

async function extractKeywords(text) {
  const res = await fetch(`${API_BASE}/api/extract-keywords`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) {
    throw new Error(`extract-keywords failed: ${res.status}`);
  }
  const data = await res.json();
  if (!data.success) {
    throw new Error("Backend reported a failure extracting keywords.");
  }
  return data.keywords; // [{ word, frequency }, ...]
}

function renderChips(container, items, className) {
  container.innerHTML = "";
  if (items.length === 0) {
    const note = document.createElement("span");
    note.className = "rkm-empty";
    note.textContent = "None found.";
    container.appendChild(note);
    return;
  }
  items.forEach((item) => {
    const chip = document.createElement("span");
    chip.className = `rkm-chip ${className}`;
    chip.textContent = item;
    container.appendChild(chip);
  });
}

// ---- History (saved in this browser via localStorage) ----
// Every successful comparison is stored client-side so it can be revisited
// without re-running it through the backend. Nothing here is sent to the
// server — history is per-browser only, so it won't follow the user to a
// different browser or device. That also means "load" below just redraws
// the saved score/matched/missing/keywords instantly, no fetch involved.
const HISTORY_KEY = "rkm_history_v1";
const MAX_HISTORY_ENTRIES = 20;

function loadHistoryEntries() {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.error("Couldn't read history from localStorage:", err);
    return [];
  }
}

function saveHistoryEntries(entries) {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(entries));
  } catch (err) {
    // Most likely quota exceeded, or localStorage disabled (some browsers
    // block it in private/incognito mode). The comparison itself still
    // worked, so only the history save is affected.
    console.error("Couldn't save history to localStorage:", err);
    setStatus("Result ready, but history couldn't be saved in this browser.", true);
  }
}

function addHistoryEntry(entry) {
  const entries = loadHistoryEntries();
  entries.unshift(entry);
  saveHistoryEntries(entries.slice(0, MAX_HISTORY_ENTRIES));
}

function deleteHistoryEntry(id) {
  saveHistoryEntries(loadHistoryEntries().filter((e) => e.id !== id));
  renderHistoryList();
}

function clearHistory() {
  if (!confirm("Clear all saved comparisons? This can't be undone.")) return;
  saveHistoryEntries([]);
  renderHistoryList();
}

function scoreClass(score) {
  if (score >= 70) return "rkm-history-score-high";
  if (score >= 40) return "rkm-history-score-mid";
  return "rkm-history-score-low";
}

function formatHistoryLabel(jobText) {
  const firstLine = jobText.split("\n").find((line) => line.trim().length > 0) || jobText;
  const trimmed = firstLine.trim();
  return trimmed.length > 70 ? trimmed.slice(0, 70) + "…" : trimmed;
}

function renderHistoryList() {
  const entries = loadHistoryEntries();
  document.getElementById("rkmHistoryToggle").textContent = `History (${entries.length})`;

  const list = document.getElementById("rkmHistoryList");
  list.innerHTML = "";

  if (entries.length === 0) {
    const empty = document.createElement("p");
    empty.className = "rkm-history-empty";
    empty.textContent = "No comparisons yet — submitted results will appear here.";
    list.appendChild(empty);
    return;
  }

  entries.forEach((entry) => {
    const row = document.createElement("div");
    row.className = "rkm-history-entry";

    const score = document.createElement("span");
    score.className = `rkm-history-score ${scoreClass(entry.score)}`;
    score.textContent = `${entry.score}%`;

    const info = document.createElement("div");
    info.className = "rkm-history-info";
    const label = document.createElement("div");
    label.className = "rkm-history-label";
    label.textContent = formatHistoryLabel(entry.jobText);
    const time = document.createElement("div");
    time.className = "rkm-history-time";
    time.textContent = new Date(entry.timestamp).toLocaleString();
    info.appendChild(label);
    info.appendChild(time);

    const del = document.createElement("button");
    del.type = "button";
    del.className = "rkm-history-delete";
    del.setAttribute("aria-label", "Delete this entry");
    del.textContent = "×";
    del.addEventListener("click", (event) => {
      event.stopPropagation(); // don't also trigger the row's "load" click
      deleteHistoryEntry(entry.id);
    });

    row.addEventListener("click", () => loadHistoryEntry(entry.id));
    row.appendChild(score);
    row.appendChild(info);
    row.appendChild(del);
    list.appendChild(row);
  });
}

function loadHistoryEntry(id) {
  const entry = loadHistoryEntries().find((e) => e.id === id);
  if (!entry) return;

  document.getElementById("resumeText").value = entry.resumeText;
  document.getElementById("jobText").value = entry.jobText;

  document.getElementById("rkmScoreValue").textContent = entry.score;
  renderChips(document.getElementById("rkmMatched"), entry.matched || [], "rkm-chip-match");
  renderChips(document.getElementById("rkmMissing"), entry.missing || [], "rkm-chip-missing");
  renderChips(
    document.getElementById("rkmKeywords"),
    (entry.keywords || []).slice(0, 15).map((k) => `${k.word} (${k.frequency})`),
    "rkm-chip-neutral"
  );

  document.getElementById("rkmResults").hidden = false;
  document.getElementById("rkmHistory").hidden = true;
  setStatus("Loaded a past comparison from history — the backend wasn't called.");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

// ---- Main flow: wire up the existing Submit button ----

document.getElementById("submitBtn").addEventListener("click", async function (event) {
  event.preventDefault();

  const resumeText = document.getElementById("resumeText").value.trim();
  const jobText = document.getElementById("jobText").value.trim();
  const btn = document.getElementById("submitBtn");
  const results = document.getElementById("rkmResults");

  if (!resumeText || !jobText) {
    setStatus("Add both your resume and the job listing before submitting.", true);
    return;
  }

  btn.disabled = true;
  setStatus("Analyzing…");
  results.hidden = true;

  try {
    const [semantic, jobKeywords] = await Promise.all([
      semanticMatch(resumeText, jobText),
      extractKeywords(jobText),
    ]);

    const score = semantic.score; // already 0-100 from the backend
    const matchedLabels = semantic.matched.map(
      (m) => `${m.job_phrase} \u2194 ${m.resume_phrase} (${Math.round(m.score * 100)}%)`
    );

    document.getElementById("rkmScoreValue").textContent = score;
    renderChips(document.getElementById("rkmMatched"), matchedLabels, "rkm-chip-match");
    renderChips(document.getElementById("rkmMissing"), semantic.missing, "rkm-chip-missing");
    renderChips(
      document.getElementById("rkmKeywords"),
      jobKeywords.slice(0, 15).map((k) => `${k.word} (${k.frequency})`),
      "rkm-chip-neutral"
    );

    addHistoryEntry({
      id: `${Date.now()}`,
      timestamp: Date.now(),
      resumeText,
      jobText,
      score,
      matched: matchedLabels,
      missing: semantic.missing,
      keywords: jobKeywords,
    });
    renderHistoryList();

    results.hidden = false;
    setStatus(
      semantic.matched.length === 0 && semantic.missing.length === 0
        ? "No comparable phrases were found in that listing — showing top keywords instead."
        : ""
    );
  } catch (err) {
    console.error(err);
    setStatus(
      `Couldn't reach the backend. Make sure the FastAPI server is running at ${API_BASE}.`,
      true
    );
  } finally {
    btn.disabled = false;
  }
});

renderHistoryList();
