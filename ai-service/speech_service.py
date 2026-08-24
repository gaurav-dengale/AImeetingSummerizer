"""
speech_service.py — High-Accuracy Continuous Audio Capture & Whisper Transcription

Features:
- Continuous non-blocking InputStream recording (zero audio dropped between chunks)
- Peak audio normalization to boost soft voice inputs
- Whisper domain context prompting with team names (Gaurav, Sarah, etc.)
- Full session transcription on stop so no words are cut off
"""
import os
import io
import time
import threading
import numpy as np
import sounddevice as sd
import scipy.io.wavfile as wav_io
from dotenv import load_dotenv

load_dotenv()

SAMPLE_RATE = 16000      # 16 kHz for Whisper
CHANNELS = 1             # Mono

_audio_stream: sd.InputStream | None = None
_audio_frames: list[np.ndarray] = []
_frames_lock = threading.Lock()
_is_recording = False
_live_segments: list[dict] = []
_live_lock = threading.Lock()

def _get_groq_client():
    """Return a Groq client, or None if the key is not set."""
    load_dotenv()
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        return None
    import groq
    return groq.Client(api_key=api_key.strip())

def _normalize_audio(audio_np: np.ndarray) -> np.ndarray:
    """Normalize audio volume so quiet microphone inputs are transcribed clearly."""
    if len(audio_np) == 0:
        return audio_np
    max_val = np.max(np.abs(audio_np))
    if max_val > 0 and max_val < 18000:
        # Scale up to ~24000 (safe headroom below 32767 for int16)
        scale = min(4.0, 24000.0 / max_val)
        normalized = np.clip(audio_np.astype(np.float32) * scale, -32768, 32767).astype(np.int16)
        return normalized
    return audio_np

def _audio_callback(indata, frames, time_info, status):
    """Continuous stream callback capturing incoming audio without gaps."""
    if status:
        print(f"[speech_service] Stream status: {status}")
    if _is_recording:
        with _frames_lock:
            _audio_frames.append(indata.copy())

def start_recording_session() -> dict:
    """Start continuous microphone recording."""
    global _audio_stream, _audio_frames, _is_recording, _live_segments
    load_dotenv()
    
    if _is_recording:
        return {"error": "A recording session is already active."}
        
    client = _get_groq_client()
    if client is None:
        return {"error": "GROQ_API_KEY is not set. Cannot transcribe audio."}

    with _frames_lock:
        _audio_frames = []
    with _live_lock:
        _live_segments = []
        
    try:
        _is_recording = True
        _audio_stream = sd.InputStream(
            samplerate=SAMPLE_RATE,
            channels=CHANNELS,
            dtype=np.int16,
            callback=_audio_callback,
            blocksize=int(SAMPLE_RATE * 0.5) # 500ms blocks
        )
        _audio_stream.start()
        print("[speech_service] Continuous microphone stream started.")
        return {"status": "recording", "sample_rate": SAMPLE_RATE}
    except Exception as e:
        _is_recording = False
        print(f"[speech_service] Failed to open microphone stream: {e}")
        return {"error": f"Failed to start microphone: {str(e)}"}

def stop_recording_session() -> dict:
    """
    Stop recording and transcribe the entire captured audio in one clean pass.
    """
    global _audio_stream, _is_recording, _audio_frames
    
    if not _is_recording:
        return {"error": "No active recording session."}
        
    _is_recording = False
    if _audio_stream:
        try:
            _audio_stream.stop()
            _audio_stream.close()
        except Exception as e:
            print(f"[speech_service] Error closing stream: {e}")
        _audio_stream = None

    with _frames_lock:
        frames_copy = list(_audio_frames)
        _audio_frames = []

    if not frames_copy:
        print("[speech_service] No audio frames captured.")
        return {"segments": []}

    # Concatenate all frames into one seamless audio array
    full_audio = np.concatenate(frames_copy, axis=0)
    full_audio = _normalize_audio(full_audio)
    
    # Check minimum duration (~0.5 sec)
    if len(full_audio) < SAMPLE_RATE * 0.5:
        print("[speech_service] Audio too short to transcribe.")
        return {"segments": []}

    # Convert to in-memory WAV buffer
    buf = io.BytesIO()
    wav_io.write(buf, SAMPLE_RATE, full_audio)
    buf.seek(0)
    wav_bytes = buf.read()

    client = _get_groq_client()
    if not client:
        return {"segments": [{"speaker": "Local Mic", "text": "Transcription error: GROQ_API_KEY missing."}]}

    print(f"[speech_service] Sending {len(wav_bytes)} bytes ({len(full_audio)/SAMPLE_RATE:.1f}s) to Groq Whisper...")

    models = ["whisper-large-v3-turbo", "whisper-large-v3"]
    transcript_text = ""

    # Provide vocabulary prompt with team names & context to boost accuracy
    vocab_prompt = "Meeting discussion with team members: Gaurav, Sarah, Alex, John Doe. Action items, tasks, deadlines, backend, database, schedule."

    for model_name in models:
        try:
            buf_call = io.BytesIO(wav_bytes)
            result = client.audio.transcriptions.create(
                file=("meeting_recording.wav", buf_call.read()),
                model=model_name,
                response_format="text",
                language="en",
                prompt=vocab_prompt,
                temperature=0.0
            )
            transcript_text = result.strip() if isinstance(result, str) else str(result).strip()
            if transcript_text:
                print(f"[speech_service] Whisper transcribed successfully: {transcript_text}")
                break
        except Exception as e:
            print(f"[speech_service] Whisper ({model_name}) error: {e}")
            continue

    if not transcript_text:
        return {"segments": []}

    # Return standard segment format
    return {
        "segments": [
            {
                "speaker": "Local Mic",
                "text": transcript_text
            }
        ]
    }

def get_live_segments() -> list[dict]:
    with _live_lock:
        return list(_live_segments)

def is_recording() -> bool:
    return _is_recording