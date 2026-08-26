import os
import json
import time
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

groq_client = None
gemini_configured = False

def get_groq_client():
    global groq_client
    load_dotenv()
    if groq_client is None:
        api_key = os.getenv("GROQ_API_KEY")
        if api_key and api_key.strip():
            try:
                import groq
                groq_client = groq.Client(api_key=api_key.strip())
            except Exception as e:
                print(f"[groq] Client init error: {e}")
    return groq_client

def get_gemini_client():
    global gemini_configured
    load_dotenv()
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key or not api_key.strip():
        return False
    try:
        import google.generativeai as genai
        genai.configure(api_key=api_key.strip())
        gemini_configured = True
        return True
    except Exception as e:
        print(f"[gemini] Configuration error: {e}")
        return False

def chunk_transcript(segments, max_chunk_words=3000):
    chunks = []
    current_chunk = []
    current_word_count = 0
    for segment in segments:
        if not isinstance(segment, dict):
            continue
        text = segment.get("text", "")
        words = text.split()
        word_count = len(words)
        if current_word_count + word_count > max_chunk_words and current_chunk:
            chunks.append(current_chunk)
            current_chunk = [segment]
            current_word_count = word_count
        else:
            current_chunk.append(segment)
            current_word_count += word_count
    if current_chunk:
        chunks.append(current_chunk)
    return chunks

def call_gemini(prompt):
    """Execute analysis via Google Gemini API with JSON mode."""
    if not get_gemini_client():
        return None
    try:
        import google.generativeai as genai
        # Fastest models first
        model_names = ["gemini-2.5-flash", "gemini-flash-latest", "gemini-3.7-flash", "gemini-3.6-flash"]

        for m_name in model_names:
            try:
                model = genai.GenerativeModel(
                    model_name=m_name,
                    generation_config={"response_mime_type": "application/json", "temperature": 0.2}
                )
                response = model.generate_content(prompt)
                if response and response.text:
                    return json.loads(response.text)
            except Exception as e:
                print(f"[gemini] Model {m_name} failed: {e}")
                continue
    except Exception as e:
        print(f"[gemini] Generation error: {e}")
    return None


def call_groq_with_backoff(client, prompt, max_retries=3):
    models_to_try = [
        "openai/gpt-oss-120b",
        "openai/gpt-oss-20b",
        "qwen/qwen3.6-27b",
        "groq/compound"
    ]

    delay = 1.5
    for attempt in range(max_retries):
        for model in models_to_try:
            try:
                chat_completion = client.chat.completions.create(
                    messages=[
                        {"role": "system", "content": "You are a meeting intelligence assistant. Always output strictly valid JSON."},
                        {"role": "user", "content": prompt}
                    ],
                    model=model,
                    response_format={"type": "json_object"},
                    temperature=0.2
                )
                return json.loads(chat_completion.choices[0].message.content)
            except Exception as e:
                err_str = str(e).lower()
                if "rate limit" in err_str or "429" in err_str:
                    print(f"Rate limit for {model}. Retrying in {delay}s...")
                    time.sleep(delay)
                    delay *= 2
                    break
                print(f"Error ({model}): {str(e)}")
    return None

def call_ai_pipeline(prompt):
    """
    Multi-provider AI caller:
    1. Tries Groq LLaMA 3.3 (if GROQ_API_KEY configured)
    2. Tries Google Gemini (if GEMINI_API_KEY configured or as fallback)
    """
    # 1. Try Groq
    groq_c = get_groq_client()
    if groq_c:
        res = call_groq_with_backoff(groq_c, prompt)
        if res:
            return res

    # 2. Try Gemini
    res_gemini = call_gemini(prompt)
    if res_gemini:
        return res_gemini

    return None

def extract_meeting_intelligence(transcript_data):
    """
    Main AI extraction function supporting Groq and Google Gemini:
    - 3-5 bullet summary (#4)
    - Tasks with confidence scores 0-100 (#12 confidence-gated dispatch)
    - Tasks with priority based on sentiment/urgency (#14 sentiment-aware)
    - Speaker-attributed tasks (#7)
    """
    segments = transcript_data.get("segments", [])
    if not segments:
        return {
            "scheduled_event": None,
            "tasks": [],
            "summary": "No speech segments found in transcript."
        }

    chunks = chunk_transcript(segments)
    all_tasks = []
    all_events = []
    all_summaries = []
    all_decisions = []
    all_blockers = []

    for i, chunk in enumerate(chunks):
        if i > 0:
            time.sleep(0.5)

        chunk_lines = []
        for s in chunk:
            if isinstance(s, dict):
                speaker = s.get("speaker", "Unknown")
                text = s.get("text", "").strip()
                if text:
                    chunk_lines.append(f"[{speaker}]: {text}")

        chunk_text = "\n".join(chunk_lines)
        if not chunk_text.strip():
            continue

        now_str = datetime.now().strftime("%Y-%m-%d %H:%M (%A)")

        prompt = f"""
Current Date & Time: {now_str}

Analyze this meeting transcript and extract structured intelligence including action tasks, consensus decisions, and architectural/project blockers.

IMPORTANT RULES:
- confidence: 0-100 score for tasks. High confidence (80-100) only if assignee, task, and deadline are CLEARLY stated.
- priority: "critical" if urgent/deadline language used, "medium" for normal tasks, "low" for future/optional.
- decisions: Extract formal agreements reached. Include:
  * "decision": Clear statement of what was decided.
  * "category": "Architecture" | "Product" | "Process" | "Budget" | "Security" | "General".
  * "rationale": Why this was agreed upon.
  * "consensus_score": 0-100 score indicating degree of vocal/semantic agreement across speakers. (90-100 = unanimous/strong affirmation, 60-80 = majority agreement, <60 = contested).
  * "approvers": List of speaker names who affirmed.
  * "dissenters": List of speaker names who expressed concern or objected.
- blockers_risks: Extract any technical/resource roadblocks or risk items discussed.

Output valid JSON with this exact schema:
{{
    "summary_bullets": [string, string, string],
    "scheduling_intent": boolean,
    "event_title": string or null,
    "start_time": string (ISO 8601 YYYY-MM-DDTHH:MM:SS) or null,
    "end_time": string (ISO 8601 YYYY-MM-DDTHH:MM:SS) or null,
    "attendees": [string],
    "location": string or null,
    "notes": string or null,
    "task_assignments": [
        {{
            "assignee": string,
            "task": string,
            "due_date": string (ISO 8601 YYYY-MM-DD) or null,
            "confidence": integer 0-100,
            "priority": "critical" | "medium" | "low",
            "sentiment_cues": string
        }}
    ],
    "decisions": [
        {{
            "decision": string,
            "category": string,
            "rationale": string,
            "consensus_score": integer 0-100,
            "approvers": [string],
            "dissenters": [string]
        }}
    ],
    "blockers_risks": [
        {{
            "risk": string,
            "severity": "high" | "medium" | "low",
            "owner": string or null
        }}
    ]
}}

Transcript:
\"\"\"{chunk_text}\"\"\"
"""
        res = call_ai_pipeline(prompt)
        if res:
            if res.get("scheduling_intent") and res.get("start_time") and res.get("end_time"):
                all_events.append({
                    "event_title": res.get("event_title") or "Meeting Follow-up",
                    "start_time":  res.get("start_time"),
                    "end_time":    res.get("end_time"),
                    "attendees":   res.get("attendees") or [],
                    "location":    res.get("location"),
                    "notes":       res.get("notes")
                })

            bullets = res.get("summary_bullets", [])
            if bullets:
                all_summaries.extend(bullets)

            for t in res.get("task_assignments", []):
                all_tasks.append({
                    "assignee":      t.get("assignee", ""),
                    "task":          t.get("task", ""),
                    "due_date":      t.get("due_date"),
                    "confidence":    t.get("confidence", 50),
                    "priority":      t.get("priority", "medium"),
                    "sentiment_cues": t.get("sentiment_cues", "")
                })

            for d in res.get("decisions", []):
                if isinstance(d, dict) and d.get("decision"):
                    all_decisions.append({
                        "decision":        d.get("decision", ""),
                        "category":        d.get("category", "General"),
                        "rationale":       d.get("rationale", ""),
                        "consensus_score": d.get("consensus_score", 85),
                        "approvers":       d.get("approvers", []),
                        "dissenters":      d.get("dissenters", [])
                    })

            for b in res.get("blockers_risks", []):
                if isinstance(b, dict) and b.get("risk"):
                    all_blockers.append({
                        "risk":     b.get("risk", ""),
                        "severity": b.get("severity", "medium"),
                        "owner":    b.get("owner")
                    })

    summary_bullets = all_summaries[:5] if all_summaries else ["Meeting processed — no summary available."]
    summary_text = "\n".join(f"• {b}" for b in summary_bullets)

    return {
        "scheduled_event":  all_events[0] if all_events else None,
        "tasks":            all_tasks,
        "decisions":        all_decisions,
        "blockers_risks":   all_blockers,
        "summary":          summary_text,
        "summary_bullets":  summary_bullets,
        "total_segments":   len(segments),
        "total_tasks":      len(all_tasks),
        "total_decisions":  len(all_decisions)
    }

def answer_meeting_query(query: str, meeting_context: str) -> dict:
    """
    RAG / Semantic Q&A over meeting transcripts and intelligence records.
    Returns direct grounded answer with citations.
    """
    prompt = f"""
You are an intelligent executive meeting assistant. Answer the user's question accurately based ONLY on the provided meeting context.
If the information is not present in the context, clearly state that it was not discussed.

User Question: {query}

Meeting Context & Transcripts:
\"\"\"{meeting_context[:12000]}\"\"\"

Output valid JSON with this exact schema:
{{
    "answer": string (clear, executive, formatted response),
    "key_citations": [
        {{
            "speaker": string,
            "quote": string (direct snippet or mention from transcript),
            "relevance": string
        }}
    ],
    "related_action_items": [string],
    "confidence": integer 0-100
}}
"""
    res = call_ai_pipeline(prompt)
    if res and isinstance(res, dict):
        return res
    return {
        "answer": "Unable to process query or no relevant context found.",
        "key_citations": [],
        "related_action_items": [],
        "confidence": 0
    }