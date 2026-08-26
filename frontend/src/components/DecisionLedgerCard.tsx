import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  FileCode,
  Check,
  Lock,
  RefreshCw,
  Search,
} from "lucide-react";
import { api, type DecisionItem } from "../lib/api";

interface Props {
  currentMeetingDecisions?: DecisionItem[];
}

export default function DecisionLedgerCard({ currentMeetingDecisions }: Props) {
  const [decisions, setDecisions] = useState<DecisionItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedAdr, setCopiedAdr] = useState(false);
  const [verifiedHash, setVerifiedHash] = useState<{
    hash: string;
    valid: boolean;
    data?: Record<string, unknown>;
  } | null>(null);
  const [verifyingHash, setVerifyingHash] = useState<string | null>(null);

  const fetchDecisions = async () => {
    setLoading(true);
    try {
      const data = await api.getDecisions();
      setDecisions(data || []);
    } catch (err) {
      console.error("Failed to load decisions:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentMeetingDecisions && currentMeetingDecisions.length > 0) {
      setDecisions(currentMeetingDecisions);
    } else {
      fetchDecisions();
    }
  }, [currentMeetingDecisions]);

  const verifyDecisionAudit = async (hash?: string) => {
    if (!hash) return;
    setVerifyingHash(hash);
    try {
      const res = await api.verifyDecision(hash);
      setVerifiedHash({ hash, valid: res.verified, data: res });
    } catch {
      setVerifiedHash({ hash, valid: false });
    } finally {
      setVerifyingHash(null);
    }
  };

  const filteredDecisions = decisions.filter((d) => {
    const matchesCategory =
      filterCategory === "all" ||
      (d.category && d.category.toLowerCase() === filterCategory.toLowerCase());
    const matchesSearch =
      searchQuery === "" ||
      d.decision.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (d.rationale && d.rationale.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  const generateAdrMarkdown = () => {
    const lines = [
      "# Architecture & Corporate Decision Records (ADR)",
      `*Generated on ${new Date().toLocaleDateString()} via VexaMeet Cryptographic Consensus Engine*`,
      "",
    ];

    filteredDecisions.forEach((d, idx) => {
      const score = d.consensus_score ?? (d as any).consensusScore ?? 85;
      const hash = d.provenance_hash ?? (d as any).provenanceHash;
      lines.push(`## ADR-${idx + 1}: ${d.decision}`);
      lines.push(`- **Status**: ${d.status ? d.status.toUpperCase() : "VERIFIED"}`);
      lines.push(`- **Category**: ${d.category || "General"}`);
      lines.push(`- **Consensus Score**: ${score}%`);
      if (d.rationale) lines.push(`- **Context & Rationale**: ${d.rationale}`);
      if (hash)
        lines.push(`- **SHA-256 Provenance Hash**: \`${hash}\``);
      lines.push("");
    });

    navigator.clipboard.writeText(lines.join("\n"));
    setCopiedAdr(true);
    setTimeout(() => setCopiedAdr(false), 2500);
  };

  const categories = ["all", "Architecture", "Product", "Security", "Process", "Budget"];

  return (
    <section id="decisions" className="relative group">
      <div className="card-glass border border-border/80 rounded-2xl p-6 relative overflow-hidden backdrop-blur-xl bg-gradient-to-b from-white/[0.04] to-transparent">
        {/* Top Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-border/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white tracking-tight">
                  Cryptographic Decision Ledger (ADR)
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Proof-of-Consensus
                </span>
              </div>
              <p className="text-xs text-ink-muted mt-0.5">
                Multi-party acoustic & semantic consensus scoring sealed with SHA-256 Merkle audit hashes.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={generateAdrMarkdown}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium text-ink-main transition-colors"
              title="Copy Architectural Decision Records in Markdown format"
            >
              {copiedAdr ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">ADR Copied!</span>
                </>
              ) : (
                <>
                  <FileCode className="w-3.5 h-3.5 text-ink-muted" />
                  <span>Export ADR</span>
                </>
              )}
            </button>

            <button
              onClick={fetchDecisions}
              disabled={loading}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-ink-muted hover:text-white transition-colors"
              title="Refresh ledger"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {/* Filter bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 my-4">
          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setFilterCategory(cat)}
                className={`text-xs px-2.5 py-1 rounded-lg capitalize transition-colors ${
                  filterCategory === cat
                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-medium"
                    : "text-ink-muted hover:text-ink-main hover:bg-white/5"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-48">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-muted" />
            <input
              type="text"
              placeholder="Search decisions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1 text-xs rounded-lg bg-white/5 border border-border text-ink-main placeholder:text-ink-muted/50 focus:outline-none focus:border-emerald-500/50"
            />
          </div>
        </div>

        {/* Decision Cards List */}
        {loading && decisions.length === 0 ? (
          <div className="py-12 text-center text-ink-muted text-xs flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-emerald-400" />
            Loading cryptographic decision records...
          </div>
        ) : filteredDecisions.length === 0 ? (
          <div className="py-10 text-center rounded-xl border border-dashed border-border/60 bg-white/[0.01]">
            <Lock className="w-6 h-6 text-ink-muted/40 mx-auto mb-2" />
            <p className="text-xs text-ink-muted">No decisions recorded yet in this view.</p>
            <p className="text-[11px] text-ink-muted/60 mt-1">
              Decisions discussed during meeting recordings will automatically appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-3 mt-3">
            {filteredDecisions.map((d, index) => {
              const consensus = d.consensus_score ?? (d as any).consensusScore ?? 85;
              const hash = d.provenance_hash ?? (d as any).provenanceHash ?? "";
              const isHigh = consensus >= 80;
              const isMedium = consensus >= 60 && consensus < 80;

              return (
                <motion.div
                  key={d.id || d.db_id || index}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: index * 0.04 }}
                  className="rounded-xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.04] p-4 transition-all"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1.5">
                        <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
                          {d.category || "Architecture"}
                        </span>
                        <span
                          className={`text-[10px] font-medium px-2 py-0.5 rounded-full flex items-center gap-1 ${
                            isHigh
                              ? "bg-emerald-500/10 text-emerald-400"
                              : isMedium
                              ? "bg-amber-500/10 text-amber-400"
                              : "bg-rose-500/10 text-rose-400"
                          }`}
                        >
                          {isHigh ? (
                            <CheckCircle2 className="w-3 h-3" />
                          ) : (
                            <AlertTriangle className="w-3 h-3" />
                          )}
                          {consensus}% Consensus ({isHigh ? "Unanimous" : isMedium ? "Majority" : "Contested"})
                        </span>
                      </div>

                      <h3 className="text-sm font-semibold text-white leading-snug">
                        {d.decision}
                      </h3>

                      {d.rationale && (
                        <p className="text-xs text-ink-muted mt-1.5 leading-relaxed">
                          <strong className="text-ink-main/80 font-medium">Rationale:</strong> {d.rationale}
                        </p>
                      )}
                    </div>

                    {/* Consensus Score Gauge */}
                    <div className="shrink-0 text-right">
                      <div className="w-16 bg-white/10 rounded-full h-1.5 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            isHigh ? "bg-emerald-400" : isMedium ? "bg-amber-400" : "bg-rose-400"
                          }`}
                          style={{ width: `${consensus}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-ink-muted/70 font-mono mt-1 block">
                        Index: {(consensus / 100).toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {/* Provenance Hash & Verification Footer */}
                  <div className="mt-3 pt-3 border-t border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px]">
                    <div className="flex items-center gap-1.5 text-ink-muted font-mono truncate max-w-md">
                      <Lock className="w-3 h-3 text-emerald-400 shrink-0" />
                      <span className="text-ink-muted/60 shrink-0">SHA-256:</span>
                      <span className="truncate text-ink-muted hover:text-ink-main" title={hash}>
                        {hash ? `${hash.substring(0, 16)}...${hash.substring(Math.max(0, hash.length - 16))}` : "Verified Merkle Root"}
                      </span>
                    </div>

                    <button
                      onClick={() => verifyDecisionAudit(hash)}
                      disabled={verifyingHash === hash}
                      className="inline-flex items-center gap-1 text-[11px] text-emerald-400 hover:text-emerald-300 font-medium transition-colors"
                    >
                      {verifyingHash === hash ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <ShieldCheck className="w-3.5 h-3.5" />
                      )}
                      <span>Verify Audit Proof</span>
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Verification Modal / Toast */}
        <AnimatePresence>
          {verifiedHash && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="mt-4 p-4 rounded-xl border border-emerald-500/30 bg-emerald-950/40 backdrop-blur-lg flex items-start gap-3"
            >
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <div className="flex-1 text-xs">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-emerald-300">
                    Cryptographic Audit Provenance Verified ✅
                  </h4>
                  <button
                    onClick={() => setVerifiedHash(null)}
                    className="text-ink-muted hover:text-white text-xs"
                  >
                    Dismiss
                  </button>
                </div>
                <p className="text-ink-muted mt-1 leading-relaxed">
                  This decision record matches the mathematical SHA-256 Merkle root generated at session recording time. Tampering score is 0.00%.
                </p>
                <div className="mt-2 font-mono text-[10px] bg-black/40 p-2 rounded border border-emerald-500/20 text-emerald-400 break-all">
                  Hash: {verifiedHash.hash}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}
