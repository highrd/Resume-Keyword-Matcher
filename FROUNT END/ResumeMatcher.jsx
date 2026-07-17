import React, { useState, useRef } from 'react';
import axios from 'axios';
import './ResumeMatcher.css';

const API_BASE = 'http://localhost:8000/api';

// escape a word for safe use inside a regex, then test for a whole-word
// (or whole-symbol, for things like "c++"/"c#") match inside a body of text
function containsTerm(haystack, term) {
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`(?<![a-zA-Z0-9])${escaped}(?![a-zA-Z0-9])`, 'i');
  return pattern.test(haystack);
}

function scoreLabel(score) {
  if (score >= 80) return { label: 'STRONG MATCH', tone: 'good' };
  if (score >= 55) return { label: 'NEEDS WORK', tone: 'mid' };
  return { label: 'WEAK MATCH', tone: 'low' };
}

export default function ResumeMatcher() {
  const [resumeText, setResumeText] = useState('');
  const [jobText, setJobText] = useState('');
  const [result, setResult] = useState(null);
  const [baseline, setBaseline] = useState(null);
  const [loading, setLoading] = useState(false);
  const [parsingFile, setParsingFile] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('missing');
  const fileInputRef = useRef(null);

  const handleFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const name = file.name.toLowerCase();
    setError('');

    // .txt is plain text already — read it directly, no round trip needed
    if (name.endsWith('.txt')) {
      const reader = new FileReader();
      reader.onload = (evt) => setResumeText(evt.target.result);
      reader.readAsText(file);
      return;
    }

    // .pdf / .docx need real parsing — send to the backend
    if (name.endsWith('.pdf') || name.endsWith('.docx')) {
      setParsingFile(true);
      const formData = new FormData();
      formData.append('file', file);
      try {
        const response = await axios.post(`${API_BASE}/parse-resume`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        if (response.data.success) {
          setResumeText(response.data.text);
        } else {
          setError('Could not read this file.');
        }
      } catch (err) {
        setError('Error reading file: ' + (err.response?.data?.detail || err.message));
      } finally {
        setParsingFile(false);
      }
      return;
    }

    setError('Unsupported file type. Upload a .pdf, .docx, or .txt file.');
  };

  const runScan = async () => {
    if (!resumeText.trim() || !jobText.trim()) {
      setError('Paste both a resume and a job description before scanning.');
      return;
    }
    setLoading(true);
    setError('');

    try {
      const [jobKw, jobSkillsRes] = await Promise.all([
        axios.post(`${API_BASE}/extract-keywords`, { text: jobText }),
        axios.post(`${API_BASE}/extract-skills`, { text: jobText }),
      ]);

      if (!jobKw.data.success || !jobSkillsRes.data.success) {
        setError('The analyzer could not process this text. Try again.');
        setLoading(false);
        return;
      }

      const jobKeywords = jobKw.data.keywords; // [{word, frequency}]
      const jobSkills = jobSkillsRes.data.skills; // {category: [skill,...]}

      const matchedKeywords = [];
      const missingKeywords = [];
      jobKeywords.forEach((k) => {
        (containsTerm(resumeText, k.word) ? matchedKeywords : missingKeywords).push(k);
      });

      const matchedSkills = {};
      const missingSkills = {};
      Object.entries(jobSkills).forEach(([category, list]) => {
        list.forEach((skill) => {
          const bucket = containsTerm(resumeText, skill) ? matchedSkills : missingSkills;
          if (!bucket[category]) bucket[category] = [];
          bucket[category].push(skill);
        });
      });

      const totalTerms = jobKeywords.length;
      const score = totalTerms === 0 ? 0 : Math.round((matchedKeywords.length / totalTerms) * 100);

      const suggestions = buildSuggestions(score, missingKeywords, missingSkills);

      setResult({
        score,
        matchedKeywords,
        missingKeywords,
        matchedSkills,
        missingSkills,
        suggestions,
        scannedAt: Date.now(),
      });
      setActiveTab('missing');
    } catch (err) {
      setError('Error: ' + (err.response?.data?.detail || err.message));
    } finally {
      setLoading(false);
    }
  };

  const buildSuggestions = (score, missingKeywords, missingSkills) => {
    const tips = [];
    if (missingKeywords.length > 0) {
      const top = missingKeywords.slice(0, 6).map((k) => k.word).join(', ');
      tips.push(`Work these terms into your resume, in the listing's own wording: ${top}.`);
    }
    const missingSkillTerms = Object.values(missingSkills).flat();
    if (missingSkillTerms.length > 0) {
      tips.push(`Call out hands-on experience with: ${missingSkillTerms.slice(0, 8).join(', ')}.`);
    }
    if (score < 55) {
      tips.push('Mirror the listing\'s exact phrasing where it\'s honest to do so — ATS parsers match strings, not synonyms.');
    }
    if (score >= 80) {
      tips.push('Strong overlap already. Focus any remaining edits on quantifying results rather than adding more keywords.');
    }
    if (tips.length === 0) {
      tips.push('No major gaps found — this resume already mirrors the listing closely.');
    }
    return tips;
  };

  const saveBaseline = () => {
    if (!result) return;
    setBaseline({ ...result, resumeSnapshot: resumeText });
  };

  const clearBaseline = () => setBaseline(null);

  const handleClear = () => {
    setResumeText('');
    setJobText('');
    setResult(null);
    setBaseline(null);
    setError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const delta = baseline && result ? result.score - baseline.score : null;
  const newlyMatched =
    baseline && result
      ? result.matchedKeywords.filter(
          (k) => !baseline.matchedKeywords.some((b) => b.word === k.word)
        )
      : [];

  return (
    <div className="rm-page">
      <header className="rm-header">
        <span className="rm-eyebrow">ATS SCAN</span>
        <h1>Resume Match Scanner</h1>
        <p>Drop in your resume and a job posting — see exactly which terms an ATS will flag as missing.</p>
      </header>

      <div className="rm-input-grid">
        <div className="rm-panel">
          <div className="rm-panel-head">
            <label htmlFor="resumeText">Resume</label>
            <label className="rm-file-btn">
              {parsingFile ? 'Reading file…' : 'Upload .pdf / .docx / .txt'}
              <input
                ref={fileInputRef}
                type="file"
                accept=".txt,.pdf,.docx"
                onChange={handleFile}
                disabled={parsingFile}
                hidden
              />
            </label>
          </div>
          <textarea
            id="resumeText"
            className="rm-textarea"
            value={resumeText}
            onChange={(e) => setResumeText(e.target.value)}
            placeholder="Paste your resume text here..."
          />
          <div className="rm-char-count">{resumeText.length} characters</div>
        </div>

        <div className="rm-vs">VS</div>

        <div className="rm-panel">
          <div className="rm-panel-head">
            <label htmlFor="jobText">Job description</label>
          </div>
          <textarea
            id="jobText"
            className="rm-textarea"
            value={jobText}
            onChange={(e) => setJobText(e.target.value)}
            placeholder="Paste the job posting text here..."
          />
          <div className="rm-char-count">{jobText.length} characters</div>
        </div>
      </div>

      <div className="rm-actions">
        <button className="rm-btn rm-btn-primary" onClick={runScan} disabled={loading}>
          {loading ? 'Scanning…' : 'Run scan'}
        </button>
        <button className="rm-btn rm-btn-secondary" onClick={handleClear} disabled={loading}>
          Clear
        </button>
      </div>

      {error && <div className="rm-alert">{error}</div>}

      {result && (
        <div className="rm-results">
          <div className="rm-score-row">
            <div className={`rm-score-readout tone-${scoreLabel(result.score).tone}`}>
              <span className="rm-score-num">{result.score}%</span>
              <span className="rm-score-label">{scoreLabel(result.score).label}</span>
            </div>

            <div className="rm-baseline-controls">
              {!baseline && (
                <button className="rm-btn rm-btn-ghost" onClick={saveBaseline}>
                  📌 Save as "Before"
                </button>
              )}
              {baseline && (
                <>
                  <div className="rm-compare">
                    <span>Before: {baseline.score}%</span>
                    <span>→</span>
                    <span>After: {result.score}%</span>
                    <span className={delta >= 0 ? 'rm-delta-up' : 'rm-delta-down'}>
                      {delta >= 0 ? '+' : ''}
                      {delta} pts
                    </span>
                  </div>
                  <button className="rm-btn rm-btn-ghost" onClick={clearBaseline}>
                    Reset baseline
                  </button>
                </>
              )}
            </div>
          </div>

          {baseline && newlyMatched.length > 0 && (
            <div className="rm-newly-matched">
              <span className="rm-newly-matched-label">Newly matched since baseline:</span>
              {newlyMatched.map((k) => (
                <span key={k.word} className="rm-pill pill-match">{k.word}</span>
              ))}
            </div>
          )}

          <div className="rm-tabs">
            <button className={`rm-tab ${activeTab === 'missing' ? 'active' : ''}`} onClick={() => setActiveTab('missing')}>
              Missing ({result.missingKeywords.length})
            </button>
            <button className={`rm-tab ${activeTab === 'matched' ? 'active' : ''}`} onClick={() => setActiveTab('matched')}>
              Matched ({result.matchedKeywords.length})
            </button>
            <button className={`rm-tab ${activeTab === 'skills' ? 'active' : ''}`} onClick={() => setActiveTab('skills')}>
              Skills
            </button>
            <button className={`rm-tab ${activeTab === 'suggestions' ? 'active' : ''}`} onClick={() => setActiveTab('suggestions')}>
              Suggestions
            </button>
          </div>

          <div className="rm-tab-body">
            {activeTab === 'missing' && (
              result.missingKeywords.length > 0 ? (
                <div className="rm-pill-grid">
                  {result.missingKeywords.map((k) => (
                    <span key={k.word} className="rm-pill pill-miss">{k.word}</span>
                  ))}
                </div>
              ) : (
                <p className="rm-empty">No missing keywords — the resume covers everything the listing surfaced.</p>
              )
            )}

            {activeTab === 'matched' && (
              result.matchedKeywords.length > 0 ? (
                <div className="rm-pill-grid">
                  {result.matchedKeywords.map((k) => (
                    <span key={k.word} className="rm-pill pill-match">{k.word}</span>
                  ))}
                </div>
              ) : (
                <p className="rm-empty">No overlap yet between the resume and the listing.</p>
              )
            )}

            {activeTab === 'skills' && (
              <div className="rm-skills">
                {Object.keys(result.matchedSkills).length === 0 && Object.keys(result.missingSkills).length === 0 && (
                  <p className="rm-empty">No recognized technical skills in this listing.</p>
                )}
                {Array.from(new Set([...Object.keys(result.matchedSkills), ...Object.keys(result.missingSkills)])).map((category) => (
                  <div key={category} className="rm-skill-category">
                    <h3>{category.replace(/_/g, ' ')}</h3>
                    <div className="rm-pill-grid">
                      {(result.matchedSkills[category] || []).map((s) => (
                        <span key={s} className="rm-pill pill-match">{s}</span>
                      ))}
                      {(result.missingSkills[category] || []).map((s) => (
                        <span key={s} className="rm-pill pill-miss">{s}</span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'suggestions' && (
              <ul className="rm-suggestions">
                {result.suggestions.map((tip, i) => (
                  <li key={i}>{tip}</li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
