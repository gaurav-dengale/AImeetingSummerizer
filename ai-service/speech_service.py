"""
speech_service.py — Local Speech Recognition via Groq Whisper

Records microphone audio in 5-second chunks using sounddevice,
transcribes each chunk with Groq's whisper-large-v3-turbo model,
and accumulates segments in the same format that Vexa returns,
so the existing groq_service AI pipeline works without any changes.
"""
import os
import io
import time
import threading
import tempfile
import numpy as np
import sounddevice as sd
import scipy.io.wavfile as wav_io

SAMPLE_RATE = 16000      # Whisper works best at 16 kHz
CHUNK_SECONDS = 5        # Duration of each audio chunk sent to Whisper
CHANNELS = 1             # Mono

# ---------------------------------------------------------------------------
# Module-level state — one recording session at a time
# ---------------------------------------------------------------------------
_recording_thread: threading.Thread | None = None
_stop_event = threading.Event()
_segments: list[dict] = []          # accumulated {"speaker", "text"} dicts
_segments_lock = threading.Lock()
_is_recording = False


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _get_groq_client():
    """Return a Groq client, or None if the key is not set."""
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        return None
    import groq
    return groq.Client(api_key=api_key)


def _transcribe_chunk(audio_np: np.ndarray, sample_rate: int) -> str:
    """
    Save a NumPy audio array as an in-memory WAV and transcribe it
    using the Groq Whisper API.  Returns the transcribed text string.
    """
    client = _get_groq_client()
    if client is None:
        print("[speech_service] GROQ_API_KEY not set — cannot transcribe.")
        return ""

    # Write the audio to an in-memory bytes buffer as a proper WAV file
    buf = io.BytesIO()
    wav_io.write(buf, sample_rate, audio_np)
    buf.seek(0)

    try:
        result = client.audio.transcriptions.create(
            file=("chunk.wav", buf.read()),
            model="whisper-large-v3-turbo",
            response_format="text",
            language="en",
        )
        # result is a plain string when response_format="text"
        text = result.strip() if isinstance(result, str) else str(result).strip()
        return text
    except Exception as e:
        print(f"[speech_service] Whisper transcription error: {e}")
        return ""


def _recording_loop():
    """
    Background thread: records audio in CHUNK_SECONDS-long bursts,
    transcribes each one, and appends non-empty results to _segments.
    Stops when _stop_event is set.
    """
    global _is_recording
    _is_recording = True
    print(f"[speech_service] Recording started (chunks of {CHUNK_SECONDS}s @ {SAMPLE_RATE}Hz).")

    while not _stop_event.is_set():
        # Record one chunk
        num_frames = int(CHUNK_SECONDS * SAMPLE_RATE)
        try:
            audio = sd.rec(
                num_frames,
                samplerate=SAMPLE_RATE,
                channels=CHANNELS,
                dtype=np.int16,
            )
            sd.wait()  # Block until the chunk is fully recorded
        except Exception as e:
            print(f"[speech_service] Recording error: {e}")
            time.sleep(1)
            continue

        if _stop_event.is_set():
            break  # Don't bother transcribing the last partial chunk

        # Transcribe the chunk
        text = _transcribe_chunk(audio, SAMPLE_RATE)
        if text:
            segment = {"speaker": "Local Mic", "text": text}
            with _segments_lock:
                _segments.append(segment)
            print(f"[speech_service] Transcribed: {text[:80]}...")

    _is_recording = False
    print("[speech_service] Recording stopped.")


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def start_recording_session() -> dict:
    """
    Start recording from the default microphone in a background thread.
    Returns {"status": "recording"} or {"error": "..."}.
    """
    global _recording_thread, _segments

    if _is_recording:
        return {"error": "A recording session is already active."}

    if _get_groq_client() is None:
        return {"error": "GROQ_API_KEY is not set. Cannot transcribe audio."}

    # Reset state for new session
    _stop_event.clear()
    with _segments_lock:
        _segments = []

    _recording_thread = threading.Thread(target=_recording_loop, daemon=True)
    _recording_thread.start()

    return {"status": "recording", "chunk_seconds": CHUNK_SECONDS, "sample_rate": SAMPLE_RATE}


def stop_recording_session() -> dict:
    """
    Stop the active recording session and return all accumulated segments
    in Vexa-compatible format:
        {"segments": [{"speaker": "Local Mic", "text": "..."}, ...]}
    """
    global _recording_thread

    if not _is_recording and not (_recording_thread and _recording_thread.is_alive()):
        return {"error": "No active recording session."}

    _stop_event.set()
    if _recording_thread:
        _recording_thread.join(timeout=CHUNK_SECONDS + 2)

    with _segments_lock:
        result_segments = list(_segments)

    print(f"[speech_service] Session ended. Captured {len(result_segments)} segment(s).")
    return {"segments": result_segments}


def get_live_segments() -> list[dict]:
    """
    Return a snapshot of the segments transcribed so far during an
    active recording session.  Safe to call from any thread.
    """
    with _segments_lock:
        return list(_segments)


def is_recording() -> bool:
    """True if a recording session is currently running."""
    return _is_recording
