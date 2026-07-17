from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import spacy
from collections import Counter
from typing import List
import re
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("job_keyword_extractor")

# Load spaCy model
nlp = spacy.load("en_core_web_sm")

app = FastAPI(
    title="Job Keyword Extractor",
    description="Extract keywords and skills from job postings",
    version="1.0.0"
)

# BUG FIX: The React frontend (http://localhost:3000) was being blocked by the
# browser's CORS policy because no CORSMiddleware was ever registered here,
# despite HANDOVER.md claiming "CORS is enabled by default". Without this,
# every request from the frontend fails before it even reaches the routes
# below (confirmed: an OPTIONS preflight returned 405 with no CORS headers).
#
# allow_origins=["*"] here (rather than pinning to one port) because the
# frontend is plain static HTML/JS and might be served from a few different
# local dev setups (VS Code Live Server, `python -m http.server`, etc.) each
# using a different port. Note: allow_credentials must be False when using
# "*", which is fine here since this API doesn't use cookies/auth.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Data models
class JobPosting(BaseModel):
    text: str

class KeywordResponse(BaseModel):
    keywords: List[dict]
    success: bool

class SkillsResponse(BaseModel):
    skills: dict
    success: bool

# Helper function to extract keywords
def extract_keywords_spacy(job_posting: str, top_n: int = 20):
    """Extract keywords using spaCy"""
    doc = nlp(job_posting.lower())
    
    # Extract nouns, proper nouns, and adjectives
    keywords = [
        token.text for token in doc 
        if token.pos_ in ['NOUN', 'PROPN', 'ADJ']
        and len(token.text) > 3
        and not token.is_stop
    ]
    
    # Count frequency
    keyword_counts = Counter(keywords)
    return keyword_counts.most_common(top_n)

# Helper function to extract skills
def extract_technical_skills(job_posting: str) -> dict:
    """Extract technical skills from job posting"""
    text_lower = job_posting.lower()
    
    skills = {
        'programming_languages': {
            'python', 'java', 'javascript', 'c#', 'c++', 'ruby', 'php', 'swift',
            'golang', 'rust', 'typescript', 'kotlin', 'scala', 'r', 'matlab'
        },
        'frameworks': {
            'django', 'flask', 'react', 'vue', 'angular', 'spring', 'express',
            'fastapi', 'asp.net', 'laravel', 'rails', 'torch', 'tensorflow',
            'keras', 'scikit', 'pandas', 'numpy'
        },
        'databases': {
            'postgresql', 'mysql', 'mongodb', 'redis', 'elasticsearch',
            'cassandra', 'dynamodb', 'oracle', 'sql', 'firebase', 'graphql'
        },
        'tools': {
            'aws', 'azure', 'gcp', 'docker', 'kubernetes', 'jenkins', 'git',
            'gitlab', 'github', 'jira', 'linux', 'windows', 'macos'
        }
    }
    
    detected_skills = {}
    
    for category, skill_set in skills.items():
        found = []
        for skill in skill_set:
            # BUG FIX: skill names were interpolated into the regex unescaped
            # AND wrapped in \b...\b, which broke matching for any skill
            # containing regex metacharacters or symbols:
            #   - "c++"     -> unescaped, "+" is a quantifier, so \bc++\b
            #                  actually matched any lone "c" (false positive:
            #                  a posting mentioning grade "C" "detected" C++).
            #   - "c#"      -> "#" is not a \w character, and \b only matches
            #                  at a \w/\W transition. Right after "#" both
            #                  sides are non-word whenever followed by a
            #                  space/punctuation/end-of-string, so \b NEVER
            #                  matched there -> C# was silently never detected.
            #   - "asp.net" -> "." matches any character when unescaped, so
            #                  "asp net" or "aspXnet" would wrongly match too.
            #                  Even after escaping, \b after the literal "."
            #                  has the same failure mode as "c#" above.
            # Fix: re.escape() the skill text, and replace \b with an explicit
            # "not preceded/followed by a letter or digit" check, which works
            # correctly regardless of whether the skill ends in a symbol.
            pattern = r'(?<![a-zA-Z0-9])' + re.escape(skill) + r'(?![a-zA-Z0-9])'
            if re.search(pattern, text_lower):
                found.append(skill)
        
        if found:
            detected_skills[category] = found
    
    return detected_skills

# Routes
@app.get("/")
def read_root():
    """Welcome message"""
    return {
        "message": "Job Keyword Extractor API",
        "version": "1.0.0",
        "docs": "/docs"
    }

@app.get("/api/health")
def health_check():
    """Check if backend is running"""
    return {"status": "ok", "message": "Backend is running ✓"}

@app.post("/api/extract-keywords", response_model=KeywordResponse)
def extract_keywords(job: JobPosting):
    """Extract keywords from job posting"""
    try:
        keywords = extract_keywords_spacy(job.text, top_n=20)
        return KeywordResponse(
            keywords=[{"word": k, "frequency": f} for k, f in keywords],
            success=True
        )
    except Exception as e:
        # BUG FIX: previously the exception was caught into `e` and then
        # thrown away, so failures returned success:false with zero
        # information about what actually went wrong. Now it's logged.
        logger.exception("extract_keywords failed: %s", e)
        return KeywordResponse(
            keywords=[],
            success=False
        )

@app.post("/api/extract-skills", response_model=SkillsResponse)
def extract_skills(job: JobPosting):
    """Extract technical skills"""
    try:
        skills = extract_technical_skills(job.text)
        return SkillsResponse(
            skills=skills,
            success=True
        )
    except Exception as e:
        # BUG FIX: same silent-swallow issue as extract_keywords above.
        logger.exception("extract_skills failed: %s", e)
        return SkillsResponse(
            skills={},
            success=False
        )

if __name__ == "__main__":
    import uvicorn
    print("🚀 Starting FastAPI server...")
    print("📚 API Docs available at: http://localhost:8000/docs")
    uvicorn.run(app, host="0.0.0.0", port=8000)