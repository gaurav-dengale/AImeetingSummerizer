import { useState } from "react";
import { motion } from "framer-motion";
import { Settings, MessageSquare, FileSpreadsheet, ServerCog, CalendarCheck, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { api, ApiError } from "../lib/api";
import { cardHover, cardTap } from "../lib/variants";

interface Props {
  vexaBaseUrl?: string;
  onSaved: () => void;
}

export default function SettingsCard({ vexaBaseUrl, onSaved }: Props) {
  const [slackToken, setSlackToken] = useState("");
  const [csvPath, setCsvPath] = useState("");
  const [vexaUrl, setVexaUrl] = useState(vexaBaseUrl || "http://localhost:8056");
  const [vexaAdminKey, setVexaAdminKey] = useState("token");
  const [vexaEmail, setVexaEmail] = useState("user@example.com");
  const [vexaName, setVexaName] = useState("John Doe");
  const [busy, setBusy] = useState<string | null>(null);

  async function saveSlackToken() {
    if (!slackToken.trim()) {
      toast.error("Enter a Slack token first");
      return;
    }
    setBusy("slack");
    try {
      const res = await api.setSlackToken(slackToken.trim());
      toast.success(res.message ?? "Slack token saved");
      onSaved();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Failed to save Slack token");
    } finally {
      setBusy(null);
    }
  }

  async function saveCsvPath() {
    if (!csvPath.trim()) {
      toast.error("Enter a CSV path first");
      return;
    }
    setBusy("csv");
    try {
      const res = await api.setContactsCsvPath(csvPath.trim());
      toast.success(`Contacts CSV updated. Loaded ${res.contacts_count ?? 0} contacts.`);
      onSaved();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Failed to update contacts CSV path");
    } finally {
      setBusy(null);
    }
  }

  async function setupVexa() {
    if (!vexaUrl.trim() || !vexaAdminKey.trim() || !vexaEmail.trim()) {
      toast.error("Fill in Base URL, Admin Token, and Email");
      return;
    }
    setBusy("vexa");
    try {
      const res = await api.setupVexaAdmin(vexaUrl.trim(), vexaAdminKey.trim(), vexaEmail.trim(), vexaName.trim());
      toast.success(`${res.message ?? "Vexa configured"} Token: ${res.api_token}`);
      onSaved();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Failed to configure Vexa");
    } finally {
      setBusy(null);
    }
  }

  return (
    <motion.div whileHover={cardHover} whileTap={cardTap} className="glass-card">
      <h2 className="text-lg font-bold flex items-center gap-2 mb-5">
        <Settings className="w-5 h-5 text-primary" /> Settings
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <div>
          <h4 className="text-sm font-semibold text-ink-muted mb-2.5 flex items-center gap-1.5">
            <MessageSquare className="w-4 h-4" /> Slack Bot Token
          </h4>
          <input
            type="password"
            className="input-control mb-3"
            placeholder="xoxb-..."
            value={slackToken}
            onChange={(e) => setSlackToken(e.target.value)}
          />
          <button className="btn-secondary w-full" onClick={saveSlackToken} disabled={busy === "slack"}>
            {busy === "slack" && <Loader2 className="w-4 h-4 animate-spin" />}
            Save Slack Token
          </button>
        </div>

        <div>
          <h4 className="text-sm font-semibold text-ink-muted mb-2.5 flex items-center gap-1.5">
            <FileSpreadsheet className="w-4 h-4" /> Contacts CSV Path
          </h4>
          <input
            type="text"
            className="input-control mb-3"
            placeholder="/path/to/contacts.csv"
            value={csvPath}
            onChange={(e) => setCsvPath(e.target.value)}
          />
          <button className="btn-secondary w-full" onClick={saveCsvPath} disabled={busy === "csv"}>
            {busy === "csv" && <Loader2 className="w-4 h-4 animate-spin" />}
            Save CSV Path
          </button>
        </div>

        <div>
          <h4 className="text-sm font-semibold text-ink-muted mb-2.5 flex items-center gap-1.5">
            <ServerCog className="w-4 h-4" /> Vexa Self-Hosted Admin
          </h4>
          <input
            type="text"
            className="input-control mb-2"
            placeholder="Base URL"
            value={vexaUrl}
            onChange={(e) => setVexaUrl(e.target.value)}
          />
          <input
            type="password"
            className="input-control mb-2"
            placeholder="Admin Token"
            value={vexaAdminKey}
            onChange={(e) => setVexaAdminKey(e.target.value)}
          />
          <input
            type="text"
            className="input-control mb-2"
            placeholder="User email"
            value={vexaEmail}
            onChange={(e) => setVexaEmail(e.target.value)}
          />
          <input
            type="text"
            className="input-control mb-3"
            placeholder="User name"
            value={vexaName}
            onChange={(e) => setVexaName(e.target.value)}
          />
          <button className="btn-secondary w-full" onClick={setupVexa} disabled={busy === "vexa"}>
            {busy === "vexa" && <Loader2 className="w-4 h-4 animate-spin" />}
            Register &amp; Mint Token
          </button>
        </div>

        <div>
          <h4 className="text-sm font-semibold text-ink-muted mb-2.5 flex items-center gap-1.5">
            <CalendarCheck className="w-4 h-4" /> Google Calendar &amp; Gmail
          </h4>
          <p className="text-xs text-ink-muted mb-3">
            Authorize once so task emails and calendar events can be created automatically.
          </p>
          <a href="/authorize_google" className="btn-secondary w-full">
            Authorize Google
          </a>
        </div>
      </div>
    </motion.div>
  );
}
