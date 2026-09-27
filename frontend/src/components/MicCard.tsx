import { useEffect, useRef, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Mic, MicOff, Loader2, Radio } from "lucide-react";
import { toast } from "sonner";
import { api, ApiError, type Segment, type TranscriptResponse } from "../lib/api";
import { cardHover, cardTap } from "../lib/variants";
import MagneticButton from "./MagneticButton";
import FeatureTip from "./FeatureTip";

interface Props {
  onLiveSegments: (segments: Segment[]) => void;
  onResult: (data: TranscriptResponse) => void;
}

function WaveformVisualizer({ active }: { active: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  const cleanup = useCallback(() => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    analyserRef.current?.disconnect();
    audioCtxRef.current?.close();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    analyserRef.current = null;
    audioCtxRef.current = null;
    streamRef.current = null;
  }, []);

  const drawIdle = useCallback((canvas: HTMLCanvasElement) => {
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const { width, height } = canvas;
    ctx.clearRect(0, 0, width, height);
    const barCount = 32;
    const barW = width / (barCount * 1.6);
    const gap = (width - barCount * barW) / (barCount + 1);
    for (let i = 0; i < barCount; i++) {
      const x = gap + i * (barW + gap);
      const barH = 3;
      const y = (height - barH) / 2;
      ctx.fillStyle = "rgba(56,189,248,0.2)";
      ctx.beginPath();
      ctx.roundRect(x, y, barW, barH, 2);
      ctx.fill();
    }
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (!active) {
      cleanup();
      drawIdle(canvas);
      return;
    }

    let running = true;
    navigator.mediaDevices
      .getUserMedia({ audio: true, video: false })
      .then((stream) => {
        if (!running) { stream.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current = stream;
        const actx = new AudioContext();
        audioCtxRef.current = actx;
        const analyser = actx.createAnalyser();
        analyser.fftSize = 128;
        analyserRef.current = analyser;
        actx.createMediaStreamSource(stream).connect(analyser);
        const bufLen = analyser.frequencyBinCount;
        const data = new Uint8Array(bufLen);
        const BARS = 32;
        function draw() {
          if (!running) return;
          const c = canvas!;
          const g = c.getContext("2d")!;
          const { width, height } = c;
          analyser.getByteFrequencyData(data);
          g.clearRect(0, 0, width, height);
          const step = Math.floor(bufLen / BARS);
          const barW = width / (BARS * 1.6);
          const gap = (width - BARS * barW) / (BARS + 1);
          for (let i = 0; i < BARS; i++) {
            const val = data[i * step] / 255;
            const barH = Math.max(3, val * height * 0.85);
            const x = gap + i * (barW + gap);
            const y = (height - barH) / 2;
            const grad = g.createLinearGradient(x, y, x, y + barH);
            grad.addColorStop(0, `rgba(56,189,248,${0.5 + val * 0.5})`);
            grad.addColorStop(1, `rgba(168,85,247,${0.3 + val * 0.5})`);
            g.fillStyle = grad;
            g.beginPath();
            g.roundRect(x, y, barW, barH, 2);
            g.fill();
          }
          animFrameRef.current = requestAnimationFrame(draw);
        }
        draw();
      })
      .catch(() => { if (canvas) drawIdle(canvas); });
    return () => { running = false; cleanup(); };
  }, [active, cleanup, drawIdle]);

  return (
    <canvas
      ref={canvasRef}
      width={480}
      height={56}
      className="w-full h-14 rounded-xl"
    />
  );
}

export default function MicCard({ onLiveSegments, onResult }: Props) {
  const [recording, setRecording] = useState(false);
  const [busy, setBusy] = useState(false);
  const [statusText, setStatusText] = useState("Ready to record audio.");
  const pollRef = useRef<number | null>(null);

  useEffect(() => { return () => { if (pollRef.current) window.clearInterval(pollRef.current); }; }, []);

  function startPolling() {
    if (pollRef.current) window.clearInterval(pollRef.current);
    pollRef.current = window.setInterval(async () => {
      try {
        const data = await api.getLiveTranscript();
        if (data.segments?.length) onLiveSegments(data.segments);
      } catch { /* transient */ }
    }, 3000);
  }
  function stopPolling() {
    if (pollRef.current) { window.clearInterval(pollRef.current); pollRef.current = null; }
  }

  async function handleStart() {
    setBusy(true);
    setStatusText("Starting microphone...");
    try {
      const res = await api.startLocalRecording();
      setRecording(true);
      setStatusText(`Recording live · ${res.chunk_seconds ?? 5}s chunks · ${(res.sample_rate ?? 16000) / 1000}kHz`);
      startPolling();
      toast.success("Microphone recording started");
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : "Failed to start recording";
      setStatusText(msg);
      toast.error(msg);
    } finally { setBusy(false); }
  }

  async function handleStop() {
    setBusy(true);
    stopPolling();
    setStatusText("Processing audio with Groq Whisper + LLM...");
    try {
      const data = await api.stopAndAnalyzeLocal();
      setRecording(false);
      if (data.warning) { setStatusText(data.warning); toast.warning(data.warning); }
      else { setStatusText("Recording complete — AI analysis applied."); toast.success("Microphone transcription analyzed"); }
      onResult(data);
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : "Failed to stop recording";
      setStatusText(msg);
      toast.error(msg);
      setRecording(false);
    } finally { setBusy(false); }
  }

  return (
    <motion.div whileHover={cardHover} whileTap={cardTap} className="glass-card h-full flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <Mic className="w-5 h-5 text-primary" /> Local Speech &amp; Whisper
          <FeatureTip tip="Records audio from your microphone and transcribes it using Groq Whisper AI in real time. Best for in-person meetings or solo notes." />
        </h2>
        {recording && (
          <span className="inline-flex items-center gap-2 text-xs font-semibold text-rose-400">
            <Radio className="w-3.5 h-3.5 animate-pulse" />
            LIVE
          </span>
        )}
      </div>

      <p className="text-ink-muted text-sm -mt-2">
        Capture audio via microphone and transcribe in real time with Groq Whisper.
      </p>

      <div className="bg-black/30 border border-border rounded-xl p-3">
        <WaveformVisualizer active={recording} />
      </div>

      <div className="flex flex-wrap gap-3 mt-auto">
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
