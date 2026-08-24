import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Mic, MicOff, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { api, ApiError, type Segment, type TranscriptResponse } from "../lib/api";
import { cardHover, cardTap } from "../lib/variants";
import MagneticButton from "./MagneticButton";

interface Props {
  onLiveSegments: (segments: Segment[]) => void;
  onResult: (data: TranscriptResponse) => void;
}

export default function MicCard({ onLiveSegments, onResult }: Props) {
  const [recording, setRecording] = useState(false);
  const [busy, setBusy] = useState(false);
  const [statusText, setStatusText] = useState("Ready to record audio.");
  const pollRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (pollRef.current) window.clearInterval(pollRef.current);
    };
  }, []);

  function startPolling() {
    if (pollRef.current) window.clearInterval(pollRef.current);
    pollRef.current = window.setInterval(async () => {
      try {
        const data = await api.getLiveTranscript();
        if (data.segments?.length) onLiveSegments(data.segments);
      } catch {
        // transient — ignore, next tick will retry
      }
    }, 3000);
  }

  function stopPolling() {
    if (pollRef.current) {
      window.clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }

  async function handleStart() {
    setBusy(true);
    setStatusText("Starting microphone...");
    try {
      const res = await api.startLocalRecording();
      setRecording(true);
      setStatusText(
        `Recording live (${res.chunk_seconds ?? 5}s chunks @ ${res.sample_rate ?? 16000} Hz)...`
      );
      startPolling();
      toast.success("Microphone recording started");
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : "Failed to start recording";
      setStatusText(msg);
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  }

  async function handleStop() {
    setBusy(true);
    stopPolling();
    setStatusText("Processing audio with Groq LLM...");
    try {
      const data = await api.stopAndAnalyzeLocal();
      setRecording(false);
      if (data.warning) {
        setStatusText(data.warning);
        toast.warning(data.warning);
      } else {
        setStatusText("Recording completed and analyzed.");
        toast.success("Microphone transcription analyzed");
      }
      onResult(data);
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : "Failed to stop recording";
      setStatusText(msg);
      toast.error(msg);
      setRecording(false);
    } finally {
      setBusy(false);
    }
  }

  return (
    <motion.div whileHover={cardHover} whileTap={cardTap} className="glass-card h-full">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <Mic className="w-5 h-5 text-primary" /> Local Speech &amp; Whisper
        </h2>
        {recording && (
          <span className="inline-flex items-center gap-2 text-xs font-semibold text-rose-400">
            <span className="w-2.5 h-2.5 rounded-full bg-accent-rose animate-pulse-ring" />
            RECORDING LIVE
          </span>
        )}
      </div>
      <p className="text-ink-muted text-sm mb-4">
        Capture audio via microphone chunks and transcribe in real time with Groq Whisper.
      </p>

      <div className="flex flex-wrap gap-3 mb-4">
        <MagneticButton className="btn-primary" onClick={handleStart} disabled={busy || recording}>
          {busy && !recording ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mic className="w-4 h-4" />}
          Start Recording
        </MagneticButton>
        <button className="btn-danger" onClick={handleStop} disabled={busy || !recording}>
          {busy && recording ? <Loader2 className="w-4 h-4 animate-spin" /> : <MicOff className="w-4 h-4" />}
          Stop &amp; Extract AI
        </button>
      </div>

      <p className="text-xs text-ink-muted">{statusText}</p>
    </motion.div>
  );
}
