import React, { useState } from "react";
import { 
  Mail, 
  Paperclip, 
  Inbox, 
  ArrowRight, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  ChevronRight,
  Sparkles,
  X
} from "lucide-react";
import { EmailItem, Job } from "../types";

interface EmailInboxViewProps {
  emails: EmailItem[];
  jobs: Job[];
  onImportEmail: (emailId: string, jobId: string) => Promise<void>;
  onNavigateToView: (view: string) => void;
  loading: boolean;
}

export default function EmailInboxView({ 
  emails, 
  jobs, 
  onImportEmail, 
  onNavigateToView,
  loading 
}: EmailInboxViewProps) {
  const [selectedMail, setSelectedMail] = useState<EmailItem | null>(null);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [targetJobId, setTargetJobId] = useState(jobs[0]?.id || "");
  const [importingId, setImportingId] = useState<string | null>(null);

  const handleImportClick = () => {
    if (jobs.length > 0) setTargetJobId(jobs[0].id);
    setShowImportDialog(true);
  };

  const handleConfirmImport = async () => {
    if (!selectedMail) return;
    setImportingId(selectedMail.id);
    setShowImportDialog(false);
    try {
      await onImportEmail(selectedMail.id, targetJobId);
      // Update local state copy to show "Imported"
      selectedMail.status = "Imported";
    } catch (e) {
      console.error(e);
    } finally {
      setImportingId(null);
    }
  };

  return (
    <div className="flex-1 bg-background min-h-screen p-8 overflow-y-auto">
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold tracking-tight text-on-surface font-sans">Boite aux Lettres Sourcing (Email Sorter)</h2>
        <p className="text-sm text-on-surface-variant mt-1">
          Lisez automatiquement les emails entrants (Gmail, IMAP, Outlook), extrayez les pièces jointes (CV, Lettres) et convertissez-les en fiches candidats.
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Left Side: Emails List */}
        <div className="xl:col-span-1 bg-white rounded-xl border border-outline-variant shadow-sm overflow-hidden flex flex-col h-[calc(100vh-230px)]">
          <div className="p-4 bg-background border-b border-outline-variant flex items-center gap-2">
            <Inbox size={16} className="text-on-surface-variant" />
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-on-surface-variant">Emails Entrants Reçus</span>
          </div>

          <div className="divide-y divide-slate-150 overflow-y-auto flex-1">
            {emails.length === 0 ? (
              <div className="p-8 text-center text-on-surface-variant">
                <Mail className="mx-auto opacity-30 mb-2" size={28} />
                <p className="text-xs">Aucun email reçu</p>
              </div>
            ) : (
              emails.map(mail => {
                const isSelected = selectedMail?.id === mail.id;
                return (
                  <div
                    key={mail.id}
                    onClick={() => {
                      setSelectedMail(mail);
                    }}
                    className={`p-4 cursor-pointer transition-colors text-left ${
                      isSelected ? "bg-secondary-container/20/60 border-l-4 border-secondary" : "hover:bg-background/50"
                    }`}
                  >
                    <div className="flex justify-between items-start mb-1.5">
                      <span className="text-xs font-bold text-on-surface truncate max-w-[150px]">{mail.from}</span>
                      <span className="text-[10px] font-mono text-on-surface-variant shrink-0">
                        {new Date(mail.date).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                    <h4 className="text-xs font-bold text-on-surface-variant truncate font-sans">{mail.subject}</h4>
                    <p className="text-[11px] text-on-surface-variant truncate mt-1 leading-snug">{mail.body}</p>
                    
                    <div className="flex items-center justify-between mt-3">
                      {mail.attachmentName && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-mono font-semibold text-on-surface-variant bg-surface-container rounded-md px-1.5 py-0.5 border border-outline-variant">
                          <Paperclip size={10} className="shrink-0" />
                          {mail.attachmentName}
                        </span>
                      )}

                      {mail.status === "Imported" ? (
                        <span className="text-[9px] font-mono font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100 uppercase tracking-wide">
                          Importé
                        </span>
                      ) : (
                        <span className="text-[9px] font-mono font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-100 uppercase tracking-wide">
                          À traiter
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Side: Selected Email Content Viewer */}
        <div className="xl:col-span-2">
          {selectedMail ? (
            <div className="bg-white rounded-xl border border-outline-variant shadow-sm p-6 flex flex-col h-[calc(100vh-230px)] overflow-hidden">
              {/* Header */}
              <div className="flex justify-between items-start border-b border-slate-150 pb-4 mb-4 shrink-0">
                <div>
                  <h3 className="text-sm font-bold text-on-surface font-sans">{selectedMail.subject}</h3>
                  <p className="text-xs text-on-surface-variant mt-1">
                    De: <span className="font-semibold text-on-surface-variant">{selectedMail.from}</span> • le {new Date(selectedMail.date).toLocaleString("fr-FR")}
                  </p>
                </div>

                <div className="shrink-0">
                  {selectedMail.status === "Imported" ? (
                    <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-semibold bg-emerald-50 border border-emerald-100 py-1.5 px-3 rounded-lg">
                      <CheckCircle2 size={15} />
                      Candidat Importé
                    </div>
                  ) : importingId === selectedMail.id ? (
                    <button disabled className="bg-secondary-container/20 border border-secondary-container text-secondary font-bold text-xs px-4 py-2 rounded-lg flex items-center gap-2">
                      <RefreshCw className="animate-spin" size={13} />
                      Traitement IA...
                    </button>
                  ) : (
                    <button
                      onClick={handleImportClick}
                      className="bg-accent hover:brightness-110 text-on-primary font-bold text-xs px-4 py-2.5 rounded-lg flex items-center gap-1.5 shadow-sm transition-colors"
                    >
                      <Paperclip size={14} />
                      Importer dans l'ATS
                    </button>
                  )}
                </div>
              </div>

              {/* Scrollable mail body and CV previews */}
              <div className="flex-1 overflow-y-auto space-y-6">
                {/* Mail Message */}
                <div className="bg-background border border-outline-variant rounded-lg p-4 text-xs text-on-surface-variant whitespace-pre-wrap font-sans leading-relaxed">
                  {selectedMail.body}
                </div>

                {/* Attached Document preview */}
                {selectedMail.attachmentName && (
                  <div className="border border-slate-150 rounded-xl p-5">
                    <div className="flex items-center justify-between mb-4 pb-2 border-b border-outline-variant">
                      <span className="text-[10px] font-mono font-bold text-on-surface-variant uppercase tracking-wider flex items-center gap-1.5">
                        <Paperclip size={12} className="text-on-surface-variant" />
                        Pièce jointe : {selectedMail.attachmentName}
                      </span>
                      <span className="text-[9px] font-mono text-on-surface-variant">LECTURE TEXTUELLE IA OK</span>
                    </div>

                    <pre className="bg-slate-950 text-slate-300 p-4 rounded-lg text-[10px] font-mono leading-relaxed whitespace-pre-wrap max-h-60 overflow-y-auto border border-slate-800">
                      {selectedMail.attachmentContent}
                    </pre>
                  </div>
                )}
              </div>

              {/* Bottom bar if imported */}
              {selectedMail.status === "Imported" && (
                <div className="mt-4 pt-4 border-t border-slate-150 flex justify-end shrink-0">
                  <button
                    onClick={() => onNavigateToView("candidates")}
                    className="text-xs font-semibold text-secondary hover:text-on-secondary-container flex items-center gap-1 group"
                  >
                    Voir le candidat
                    <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-background rounded-xl border border-dashed border-outline-variant p-12 text-center text-on-surface-variant h-[calc(100vh-230px)] flex flex-col items-center justify-center">
              <Mail size={44} className="opacity-30 mb-2" />
              <p className="text-xs font-semibold">Sélectionnez un email sourcing dans le volet de gauche.</p>
              <p className="text-[11px] opacity-70 mt-1 max-w-sm">Le parseur IA lira l'email et la pièce jointe pour alimenter automatiquement votre ATS.</p>
            </div>
          )}
        </div>
      </div>

      {/* Target Job Selector Dialog for Sourcing Import */}
      {showImportDialog && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl border border-outline-variant shadow-xl max-w-md w-full">
            <div className="p-5 border-b border-outline-variant flex justify-between items-center">
              <h4 className="font-bold text-sm text-on-surface flex items-center gap-1.5">
                <Sparkles size={16} className="text-secondary" />
                Importer le candidat
              </h4>
              <button 
                onClick={() => setShowImportDialog(false)}
                className="text-on-surface-variant hover:text-on-surface-variant p-1 rounded-lg"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <p className="text-xs text-on-surface-variant leading-relaxed font-sans">
                Sélectionnez l'offre d'emploi à associer à la fiche de candidature de <span className="font-semibold text-on-surface-variant">{selectedMail?.from}</span> :
              </p>
              
              <div>
                <label className="block text-[9px] font-mono text-on-surface-variant uppercase tracking-wider mb-1 font-bold">Associer au poste</label>
                <select
                  value={targetJobId}
                  onChange={e => setTargetJobId(e.target.value)}
                  className="w-full bg-background border border-outline-variant rounded p-2.5 text-xs font-semibold text-on-surface focus:outline-none"
                >
                  {jobs.map(j => (
                    <option key={j.id} value={j.id}>{j.title}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="p-5 border-t border-outline-variant flex justify-end gap-3">
              <button
                onClick={() => setShowImportDialog(false)}
                className="px-3 py-1.5 text-xs font-semibold text-on-surface-variant hover:bg-surface-container rounded-lg transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleConfirmImport}
                className="bg-accent hover:brightness-110 text-on-primary font-bold px-4 py-1.5 rounded-lg text-xs shadow-sm transition-colors"
              >
                Confirmer l'Import
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function RefreshCw({ className, size }: { className?: string; size?: number }) {
  return <div className={`animate-spin inline-block rounded-full border-2 border-t-transparent border-slate-950 ${className}`} style={{ width: size, height: size }}></div>;
}
