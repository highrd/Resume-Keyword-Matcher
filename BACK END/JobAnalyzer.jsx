import React, { useState } from 'react';
import axios from 'axios';
import './JobAnalyzer.css';

const API_BASE = 'http://localhost:8000/api';

export default function JobAnalyzer() {
  const [jobText, setJobText] = useState('');
  const [keywords, setKeywords] = useState([]);
  const [skills, setSkills] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('keywords');

  const handleExtractKeywords = async () => {
    if (!jobText.trim()) {
      setError('Please paste a job posting');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await axios.post(`${API_BASE}/extract-keywords`, {
        text: jobText
      });

      if (response.data.success) {
        setKeywords(response.data.keywords);
        setActiveTab('keywords');
      } else {
        setError('Failed to extract keywords');
      }
    } catch (err) {
      setError('Error: ' + (err.response?.data?.detail || err.message));
    } finally {
      setLoading(false);
    }
  };

  const handleExtractSkills = async () => {
    if (!jobText.trim()) {
      setError('Please paste a job posting');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await axios.post(`${API_BASE}/extract-skills`, {
        text: jobText
      });

      if (response.data.success) {
        setSkills(response.data.skills);
        setActiveTab('skills');
      } else {
        setError('Failed to extract skills');
      }
    } catch (err) {
      setError('Error: ' + (err.response?.data?.detail || err.message));
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setJobText('');
    setKeywords([]);
    setSkills({});
    setError('');
  };

  return (
    <div className="container">
      <header className="header">
        <h1>💼 Job Posting Analyzer</h1>
        <p>Extract keywords and technical skills using AI</p>
      </header>

      <div className="input-section">
        <textarea
          value={jobText}
          onChange={(e) => setJobText(e.target.value)}
          placeholder="Paste your job posting here... (e.g., 'Senior Python Developer - 5+ years experience with Django, Flask, AWS...')"
          rows="10"
          className="textarea"
        />
        
        <div className="char-count">
          {jobText.length} characters
        </div>
      </div>

      <div className="button-section">
        <button 
          onClick={handleExtractKeywords}
          disabled={loading}
          className="btn btn-primary"
        >
          {loading ? '⏳ Processing...' : '🔍 Extract Keywords'}
        </button>
        <button 
          onClick={handleExtractSkills}
          disabled={loading}
          className="btn btn-success"
        >
          {loading ? '⏳ Processing...' : '⚙️ Extract Skills'}
        </button>
        <button 
          onClick={handleClear}
          disabled={loading}
          className="btn btn-secondary"
        >
          🗑️ Clear
        </button>
      </div>

      {error && (
        <div className="alert alert-error">
          <span>⚠️ {error}</span>
          <button 
            onClick={() => setError('')}
            style={{ background: 'none', border: 'none', color: '#c53030', cursor: 'pointer', fontSize: '18px' }}
          >
            ✕
          </button>
        </div>
      )}

      {(keywords.length > 0 || Object.keys(skills).length > 0) && (
        <div className="results-container">
          <div className="tabs">
            <button 
              className={`tab ${activeTab === 'keywords' ? 'active' : ''}`}
              onClick={() => setActiveTab('keywords')}
            >
              Keywords ({keywords.length})
            </button>
            <button 
              className={`tab ${activeTab === 'skills' ? 'active' : ''}`}
              onClick={() => setActiveTab('skills')}
            >
              Skills ({Object.keys(skills).length})
            </button>
          </div>

          {activeTab === 'keywords' && keywords.length > 0 && (
            <div className="results-section">
              <h2>📊 Top Keywords</h2>
              <div className="keywords-grid">
                {keywords.map((item, idx) => (
                  <div key={idx} className="keyword-card">
                    <div className="keyword-word">{item.word}</div>
                    <div className="keyword-freq">{item.frequency}x</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'skills' && Object.keys(skills).length > 0 && (
            <div className="results-section">
              <h2>🛠️ Technical Skills Detected</h2>
              {Object.entries(skills).map(([category, skillList]) => (
                <div key={category} className="skill-category">
                  <h3>
                    {category === 'programming_languages' && '💻'}
                    {category === 'frameworks' && '🏗️'}
                    {category === 'databases' && '🗄️'}
                    {category === 'tools' && '⚒️'}
                    {' '} {category.replace(/_/g, ' ').toUpperCase()}
                  </h3>
                  <div className="skill-tags">
                    {skillList.map((skill, idx) => (
                      <span key={idx} className="skill-tag">{skill}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <footer className="footer">
        <p>Backend: FastAPI + spaCy | Frontend: React</p>
        <p>API running on <code>http://localhost:8000</code></p>
      </footer>
    </div>
  );
}
