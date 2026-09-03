import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  GitMerge,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Shield,
  Link2,
  TrendingDown,
  Eye,
  Zap,
  Lock,
  ChevronRight,
} from "lucide-react";
import { api, type ReversalAlert, type StabilityIndex, type SupersessionChainLink } from "../lib/api";

interface Props {
  /** Reversal alerts from the latest meeting processing */
  liveAlerts?: ReversalAlert[];
}

export default function DecisionReversalCard({ liveAlerts }: Props) {
  const [alerts, setAlerts] = useState<ReversalAlert[]>([]);
  const [stability, setStability] = useState<StabilityIndex | null>(null);
  const [loadingStability, setLoadingStability] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [expandedChain, setExpandedChain] = useState<number | null>(null);
  const [chainData, setChainData] = useState<SupersessionChainLink[]>([]);
  const [chainLoading, setChainLoading] = useState(false);

  // Merge live alerts from current meeting processing
  useEffect(() => {
    if (liveAlerts && liveAlerts.length > 0) {
      setAlerts(liveAlerts);
    }
  }, [liveAlerts]);

  const fetchStability = useCallback(async () => {
    setLoadingStability(true);
    try {
      const data = await api.getStabilityIndex();
      setStability(data);
    } catch (err) {
      console.error("Failed to load stability index:", err);
    } finally {
      setLoadingStability(false);
    }
  }, []);

  useEffect(() => {
    fetchStability();
  }, [fetchStability]);

  const handleSupersede = async (alert: ReversalAlert) => {
    const key = `${alert.original_decision_id}-${alert.new_decision_id}`;
    setActionLoading(key);
    try {
      const res = await api.supersedeDecision(alert.original_decision_id, alert.new_decision_id);
      setSuccessMessage(res.message || "Decision superseded successfully.");
      setAlerts((prev) =>
        prev.filter(
          (a) =>
            !(a.original_decision_id === alert.original_decision_id &&
              a.new_decision_id === alert.new_decision_id)
        )
      );
      fetchStability();
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err) {
      console.error("Supersession error:", err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleCoexist = async (alert: ReversalAlert) => {
    const key = `${alert.original_decision_id}-${alert.new_decision_id}`;
    setActionLoading(key);
    try {
      const res = await api.markDecisionsCoexisting(alert.original_decision_id, alert.new_decision_id);
      setSuccessMessage(res.message || "Decisions marked as coexisting.");
      setAlerts((prev) =>
        prev.filter(
          (a) =>
            !(a.original_decision_id === alert.original_decision_id &&
              a.new_decision_id === alert.new_decision_id)
        )
      );
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err) {
      console.error("Coexist error:", err);
    } finally {
      setActionLoading(null);
    }
  };

  const loadChain = async (decisionId: number) => {
    if (expandedChain === decisionId) {
      setExpandedChain(null);
      return;
    }
    setChainLoading(true);
    setExpandedChain(decisionId);
    try {
      const res = await api.getSupersessionChain(decisionId);
      setChainData(res.chain || []);
    } catch (err) {
      console.error("Failed to load chain:", err);
      setChainData([]);
    } finally {
      setChainLoading(false);
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 70) return "text-rose-400 bg-rose-500/10 border-rose-500/30";
    if (confidence >= 50) return "text-amber-400 bg-amber-500/10 border-amber-500/30";
    return "text-blue-400 bg-blue-500/10 border-blue-500/30";
  };

  const getConfidenceLabel = (confidence: number) => {
    if (confidence >= 70) return "High";
    if (confidence >= 50) return "Moderate";
    return "Low";
  };

  const getStabilityColor = (index: number) => {
    if (index >= 85) return "text-emerald-400";
    if (index >= 60) return "text-amber-400";
    return "text-rose-400";
  };

  const getStabilityBarColor = (index: number) => {
    if (index >= 85) return "bg-emerald-400";
    if (index >= 60) return "bg-amber-400";
    return "bg-rose-400";
  };

  return (
    <section id="reversals" className="relative group">
      <div className="card-glass border border-border/80 rounded-2xl p-6 relative overflow-hidden backdrop-blur-xl bg-gradient-to-b from-rose-500/[0.03] to-transparent">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-border/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
              <GitMerge className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white tracking-tight">
                  Decision Reversal & Supersession Tracker
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20">
                  Patent Pending
                </span>
              </div>
              <p className="text-xs text-ink-muted mt-0.5">
                Automated semantic contradiction detection with cryptographic supersession chains.
              </p>
            </div>
          </div>

          <button
            onClick={fetchStability}
            disabled={loadingStability}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium text-ink-main transition-colors w-fit"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingStability ? "animate-spin" : ""}`} />
            <span>Refresh Stability</span>
          </button>
        </div>

        {/* Decision Stability Index Gauge */}
        {stability && (
          <div className="mt-5 grid grid-cols-12 gap-4">
            <div className="col-span-12 sm:col-span-4 p-4 rounded-xl bg-black/20 border border-white/[0.06]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
                  Stability Index
                </span>
                <Shield className={`w-4 h-4 ${getStabilityColor(stability.stability_index)}`} />
              </div>
              <div className={`text-3xl font-black ${getStabilityColor(stability.stability_index)}`}>
                {stability.stability_index}%
              </div>
              <div className="w-full bg-slate-800 rounded-full h-1.5 mt-2 overflow-hidden">
                <div
                  className={`h-1.5 rounded-full transition-all duration-700 ${getStabilityBarColor(stability.stability_index)}`}
                  style={{ width: `${stability.stability_index}%` }}
                />
              </div>
              <p className="text-[10px] text-ink-muted mt-1.5">
                {stability.stability_index >= 85 ? "Stable decision-making" :
                 stability.stability_index >= 60 ? "Some decisions reversed" : "High reversal rate — review needed"}
              </p>
            </div>

            <div className="col-span-6 sm:col-span-4 p-4 rounded-xl bg-black/20 border border-white/[0.06]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
                  Total Decisions
                </span>
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-2xl font-black text-slate-100">
                {stability.total_decisions}
              </div>
              <div className="mt-2 flex items-center gap-3 text-[10px]">
                <span className="text-emerald-400">✓ {stability.verified_count} verified</span>
                <span className="text-amber-400">⚠ {stability.contested_count} contested</span>
              </div>
            </div>

            <div className="col-span-6 sm:col-span-4 p-4 rounded-xl bg-black/20 border border-white/[0.06]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
                  Reversal Rate
                </span>
                <TrendingDown className="w-4 h-4 text-rose-400" />
              </div>
              <div className="text-2xl font-black text-rose-400">
                {stability.reversal_rate}%
              </div>
              <p className="text-[10px] text-ink-muted mt-2">
                {stability.superseded_count} decision{stability.superseded_count !== 1 ? "s" : ""} superseded
              </p>
            </div>
          </div>
        )}

        {/* Success Alert */}
        <AnimatePresence>
          {successMessage && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="mt-4 p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-950/40 text-xs text-emerald-300 flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{successMessage}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Reversal Alerts */}
        {alerts.length === 0 ? (
          <div className="py-10 text-center rounded-xl border border-dashed border-border/60 bg-white/[0.01] mt-5">
            <CheckCircle2 className="w-7 h-7 text-emerald-400/60 mx-auto mb-2" />
            <p className="text-xs font-medium text-ink-main">
              Zero Decision Contradictions Detected
            </p>
            <p className="text-[11px] text-ink-muted/60 mt-1">
              All current decisions are consistent with historical records. Supersession chain integrity verified.
            </p>
          </div>
        ) : (
          <div className="space-y-4 mt-5">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-rose-400" />
              <span className="text-sm font-bold text-white">
                {alerts.length} Potential Reversal{alerts.length !== 1 ? "s" : ""} Detected
              </span>
            </div>

            {alerts.map((alert, index) => {
              const key = `${alert.original_decision_id}-${alert.new_decision_id}`;
              const isLoading = actionLoading === key;
              const confidenceClass = getConfidenceColor(alert.contradiction_confidence);

              return (
                <motion.div
                  key={key}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: index * 0.05 }}
                  className="rounded-xl border border-rose-500/20 bg-rose-500/[0.02] p-4 relative overflow-hidden"
                >
                  {/* Alert Header */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-2">
                        <span className={`text-[10px] font-mono px-2 py-0.5 rounded border font-bold flex items-center gap-1 ${confidenceClass}`}>
                          <AlertTriangle className="w-3 h-3" />
                          {getConfidenceLabel(alert.contradiction_confidence)} REVERSAL ({alert.contradiction_confidence}%)
                        </span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/5 text-ink-muted">
                          {alert.original_category || "General"}
                        </span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-500/10 text-rose-300">
                          Similarity: {alert.similarity_score}%
                        </span>
                      </div>
                      <p className="text-[11px] text-ink-muted leading-relaxed">
                        {alert.contradiction_reason}
                      </p>
                    </div>
                  </div>

                  {/* Side-by-Side Comparison */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3 pt-3 border-t border-rose-500/10">
                    {/* Original Decision */}
                    <div className="p-3 rounded-lg bg-black/30 border border-white/5">
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <XCircle className="w-3 h-3 text-rose-400" />
                        <span className="text-[10px] font-bold uppercase text-rose-400 tracking-wider">
                          Original Decision
                        </span>
                      </div>
                      <p className="text-xs text-white leading-relaxed line-clamp-3">
                        {alert.original_decision}
                      </p>
                      <div className="mt-2 flex items-center gap-2 text-[10px] text-ink-muted">
                        <span>Consensus: {alert.original_consensus_score}%</span>
                        <button
                          onClick={() => loadChain(alert.original_decision_id)}
                          className="flex items-center gap-1 text-rose-400 hover:text-rose-300"
                        >
                          <Link2 className="w-3 h-3" />
                          <span>View Chain</span>
                        </button>
                      </div>
                    </div>

                    {/* New (Contradicting) Decision */}
                    <div className="p-3 rounded-lg bg-black/30 border border-emerald-500/10">
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <ArrowRight className="w-3 h-3 text-emerald-400" />
                        <span className="text-[10px] font-bold uppercase text-emerald-400 tracking-wider">
                          New Decision
                        </span>
                      </div>
                      <p className="text-xs text-white leading-relaxed line-clamp-3">
                        {alert.new_decision}
                      </p>
                    </div>
                  </div>

                  {/* Supersession Chain (Expanded) */}
                  <AnimatePresence>
                    {expandedChain === alert.original_decision_id && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-3 pt-3 border-t border-white/5 overflow-hidden"
                      >
                        <div className="flex items-center gap-1.5 mb-2">
                          <Link2 className="w-3.5 h-3.5 text-purple-400" />
                          <span className="text-[10px] font-bold uppercase text-purple-400 tracking-wider">
                            Supersession Chain
                          </span>
                        </div>
                        {chainLoading ? (
                          <div className="flex items-center gap-2 text-xs text-ink-muted py-2">
                            <RefreshCw className="w-3 h-3 animate-spin" /> Tracing chain...
                          </div>
                        ) : chainData.length === 0 ? (
                          <p className="text-[11px] text-ink-muted">No chain history found.</p>
                        ) : (
                          <div className="flex items-start gap-1.5 overflow-x-auto pb-2">
                            {chainData.map((link, idx) => (
                              <div key={link.id} className="flex items-center gap-1.5 shrink-0">
                                <div
                                  className={`p-2 rounded-lg border text-[10px] max-w-[180px] ${
                                    link.status === "superseded"
                                      ? "border-rose-500/20 bg-rose-500/5 line-through opacity-60"
                                      : "border-emerald-500/20 bg-emerald-500/5"
                                  }`}
                                >
                                  <div className="flex items-center gap-1 mb-0.5">
                                    {link.status === "superseded" ? (
                                      <XCircle className="w-2.5 h-2.5 text-rose-400" />
                                    ) : (
                                      <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" />
                                    )}
                                    <span className="font-mono text-ink-muted">#{link.id}</span>
                                  </div>
                                  <p className="text-white truncate">{link.decision}</p>
                                  <div className="flex items-center gap-1 mt-1 text-ink-muted">
                                    <Lock className="w-2 h-2" />
                                    <span className="truncate">{link.provenance_hash?.substring(0, 12)}...</span>
                                  </div>
                                </div>
                                {idx < chainData.length - 1 && (
                                  <ChevronRight className="w-3 h-3 text-purple-400 shrink-0" />
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Action Buttons */}
                  <div className="mt-3 pt-3 border-t border-rose-500/10 flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => handleSupersede(alert)}
                      disabled={isLoading}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500 hover:bg-rose-400 text-white font-semibold text-xs transition-all shadow-md shadow-rose-500/20"
                    >
                      {isLoading ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Zap className="w-3.5 h-3.5" />
                      )}
                      <span>Supersede & Seal</span>
                    </button>

                    <button
                      onClick={() => handleCoexist(alert)}
                      disabled={isLoading}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-ink-main text-xs font-medium transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Mark as Coexisting</span>
                    </button>

                    <button
                      onClick={() => loadChain(alert.original_decision_id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-purple-400 text-xs font-medium transition-colors"
                    >
                      <Link2 className="w-3.5 h-3.5" />
                      <span>Trace Chain</span>
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
