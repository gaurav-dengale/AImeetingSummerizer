import os
import uvicorn
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Any, Dict
from dotenv import load_dotenv

load_dotenv()

from groq_service import extract_meeting_intelligence
from speech_service import (
    start_recording_session,
    stop_recording_session,
    get_live_segments,
    is_recording
)

app = FastAPI(
    title="VexaMeet Python AI & Audio Microservice",
    version="1.0.0",
    description="Microservice providing Groq LLM meeting processing and Whisper microphone audio transcription."
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class Segment(BaseModel):
    speaker: Optional[str] = "Speaker"
    text: str

class TranscriptPayload(BaseModel):
    segments: Optional[List[Dict[str, Any]]] = []
    meeting_id: Optional[str] = None

@app.get("/health")
def health_check():
    return {
        "status": "UP",
        "service": "ai-audio-microservice",
        "groq_configured": bool(os.getenv("GROQ_API_KEY")),
        "is_recording": is_recording()
    }

@app.post("/ai/process_transcript")
def process_transcript(payload: TranscriptPayload):
    transcript_data = {
        "segments": payload.segments or [],
        "meeting_id": payload.meeting_id
    }
    result = extract_meeting_intelligence(transcript_data)
    return result

@app.post("/audio/start")
def start_mic_recording():
    res = start_recording_session()
    if "error" in res:
        raise HTTPException(status_code=400, detail=res["error"])
    return res

@app.post("/audio/stop")
def stop_mic_recording():
    transcript_data = stop_recording_session()
    if "error" in transcript_data:
        raise HTTPException(status_code=400, detail=transcript_data["error"])
        
    ai_result = extract_meeting_intelligence(transcript_data)
    return {
        "transcript": transcript_data,
        "ai_result": ai_result
    }

@app.get("/audio/live")
def get_live_audio():
    return {
        "is_recording": is_recording(),
        "segments": get_live_segments()
    }

if __name__ == "__main__":
    port = int(os.getenv("AI_SERVICE_PORT", 5001))
    uvicorn.run("main:app", host="127.0.0.1", port=port, reload=True)
