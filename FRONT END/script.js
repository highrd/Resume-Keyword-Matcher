// // script.js
// const fileInput = document.getElementById('fileInput');
// const fileContent = document.getElementById('fileContent');

// fileInput.addEventListener('change', (event) => {
//     const file = event.target.files[0]; // Get the selected file
    
//     if (file) {
//         const reader = new FileReader();

//         // Define what happens once the file is read
//         reader.onload = function(e) {
//             fileContent.textContent = e.target.result; // Displays file text
//         };

//         // Read the file as plain text
//         reader.readAsText(file);
//     }
// });

// ===== Resume Keyword Matcher — frontend logic =====
// start.html loads this file via <script src="script.js">, so everything
// lives here: the original file-upload handler, plus the backend calls,
// the resume/posting comparison, and rendering the results.
//
// Talks to the FastAPI backend in test_fastapi.py. Run it locally first
// (see HANDOVER.md) — it's expected at API_BASE below.
const API_BASE = "http://localhost:8000";

// ---- Resume file upload ----
// .txt files are plain text already, so they're read instantly in the
// browser. .pdf and .docx are binary formats — reading them with
// readAsText() just dumps raw bytes as garbled characters, so those are
// sent to the backend's /api/parse-resume endpoint, which uses pypdf /
// python-docx to pull out the real text.
document.getElementById("resumeFile").addEventListener("change", async function (event) {
  const file = event.target.files[0];
  if (!file) return;

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
      <p class="rkm-score-label">of the job listing's detected skills also appear in your resume</p>
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

function flattenSkills(skillsDict) {
  // skillsDict looks like { programming_languages: [...], tools: [...] }
  const set = new Set();
  Object.values(skillsDict).forEach((list) => list.forEach((s) => set.add(s)));
  return set;
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
    const [resumeSkills, jobSkills, jobKeywords] = await Promise.all([
      extractSkills(resumeText),
      extractSkills(jobText),
      extractKeywords(jobText),
    ]);

    const resumeSet = flattenSkills(resumeSkills);
    const jobSet = flattenSkills(jobSkills);

    const matched = [...jobSet].filter((skill) => resumeSet.has(skill)).sort();
    const missing = [...jobSet].filter((skill) => !resumeSet.has(skill)).sort();
    const score = jobSet.size === 0 ? 0 : Math.round((matched.length / jobSet.size) * 100);

    document.getElementById("rkmScoreValue").textContent = score;
    renderChips(document.getElementById("rkmMatched"), matched, "rkm-chip-match");
    renderChips(document.getElementById("rkmMissing"), missing, "rkm-chip-missing");
    renderChips(
      document.getElementById("rkmKeywords"),
      jobKeywords.slice(0, 15).map((k) => `${k.word} (${k.frequency})`),
      "rkm-chip-neutral"
    );

    results.hidden = false;
    setStatus(
      jobSet.size === 0
        ? "No specific technical skills were detected in that listing — showing top keywords instead."
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