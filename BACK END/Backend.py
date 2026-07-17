# backend/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from collections import Counter
import spacy
from typing import List, Tuple

# Initialize spaCy model
nlp = spacy.load("en_core_web_sm")

app = FastAPI()

# Allow requests from your frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Your React frontend
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class JobPosting(BaseModel):
    text: str

class KeywordResponse(BaseModel):
    keywords: List[dict]
    success: bool

class SkillsResponse(BaseModel):
    skills: dict
    success: bool

def extract_keywords_spacy(job_posting: str, top_n: int = 20) -> List[Tuple[str, int]]:
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

def extract_technical_skills(job_posting: str) -> dict:
    """Extract technical skills from job posting"""
    doc = nlp(job_posting.lower())
    text_lower = job_posting.lower()
    
    # Define technical skills
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
    import re
    
    for category, skill_set in skills.items():
        found = []
        for skill in skill_set:
            if re.search(r'\b' + skill + r'\b', text_lower):
                found.append(skill)
        
        if found:
            detected_skills[category] = found
    
    return detected_skills

@app.get("/api/health")
async def health_check():
    """Check if backend is running"""
    return {"status": "ok", "message": "Backend is running"}

@app.post("/api/extract-keywords", response_model=KeywordResponse)
async def extract_keywords(job: JobPosting):
    """Extract keywords from job posting"""
    try:
        keywords = extract_keywords_spacy(job.text, top_n=20)
        return KeywordResponse(
            keywords=[{"word": k, "frequency": f} for k, f in keywords],
            success=True
        )
    except Exception as e:
        return KeywordResponse(
            keywords=[],
            success=False
        )

@app.post("/api/extract-skills", response_model=SkillsResponse)
async def extract_skills(job: JobPosting):
    """Extract technical skills"""
    try:
        skills = extract_technical_skills(job.text)
        return SkillsResponse(
            skills=skills,
            success=True
        )
    except Exception as e:
        return SkillsResponse(
            skills={},
            success=False
        )

# Run with: uvicorn main:app --reload