import React, { useEffect, useState } from "react";
import { Archive, RotateCcw, Trash2, MapPin } from "lucide-react";
import TopBar from "./TopBar";
import { Job, User } from "../types";
import { apiJson } from "../lib/api";

interface ArchivedJobsViewProps {
  activeUser: User | null;
  onRestoreJob: (id: string) => Promise<void>;
  onDeleteJobPermanently: (id: string) => Promise<void>;
}

export default function ArchivedJobsView({ activeUser, onRestoreJob, onDeleteJobPermanently }: ArchivedJobsViewProps) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const fetchArchived = async () => {
    setLoading(true);
    try {
      const rows = await apiJson("/api/jobs?status=Archived");
      setJobs(rows);
    } catch (e) {
      console.error("Erreur chargement des offres archivées:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchArchived(); }, []);

  const handleRestore = async (job: Job) => {
    if (!window.confirm(`Restaurer l'offre "${job.title}" ? Elle redeviendra active.`)) return;
    setBusyId(job.id);
    try {
      await onRestoreJob(job.id);
      await fetchArchived();
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (job: Job) => {
    if (!window.confirm(`Supprimer définitivement l'offre "${job.title}" ? Cette action est irréversible.`)) return;
    setBusyId(job.id);
    try {
      await onDeleteJobPermanently(job.id);
      await fetchArchived();
    } finally {
      setBusyId(null);
    }
  };

  const formatDate = (iso?: string) => (iso ? new Date(iso).toLocaleDateString("fr-FR") : "—");

  return (
    <div className="flex-1 bg-background min-h-screen flex flex-col">
      <TopBar activeUser={activeUser} />
      <div className="flex-1 p-4 md:p-8 overflow-y-auto">
        <div className="mb-8">
          <h2 className="text-2xl font-bold tracking-tight text-on-surface font-sans flex items-center gap-2">
            <Archive size={24} className="text-on-surface-variant" />
            Offres archivées
          </h2>
          <p className="text-sm text-on-surface-variant mt-1">
            Restaurez une offre pour la réactiver, ou supprimez-la définitivement.
          </p>
        </div>

        {loading ? (
          <div className="text-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-secondary mx-auto" />
          </div>
        ) : jobs.length === 0 ? (
          <div className="bg-surface-container-lowest rounded-xl border border-dashed border-outline-variant p-12 text-center">
            <Archive className="mx-auto text-on-surface-variant/40 mb-4" size={44} />
            <h3 className="font-sans font-bold text-on-surface-variant text-sm">Aucune offre archivée</h3>
          </div>
        ) : (
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left">
                <thead className="bg-surface-container-low text-on-surface-variant font-mono text-[10px] uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3 font-medium">Titre</th>
                    <th className="px-4 py-3 font-medium">Localisation</th>
                    <th className="px-4 py-3 font-medium">Archivée le</th>
                    <th className="px-4 py-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant">
                  {jobs.map(job => (
                    <tr key={job.id} className="hover:bg-surface-container-low transition-all">
                      <td className="px-4 py-3 text-sm font-bold text-on-surface">{job.title}</td>
                      <td className="px-4 py-3 text-sm text-on-surface-variant">
                        <span className="flex items-center gap-1.5"><MapPin size={13} className="shrink-0" />{job.location}</span>
                      </td>
                      <td className="px-4 py-3 text-sm text-on-surface-variant">{formatDate(job.updatedAt)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleRestore(job)}
                            disabled={busyId === job.id}
                            className="h-8 px-3 rounded-lg text-xs font-bold text-secondary border border-outline-variant hover:bg-surface-container-low transition-all flex items-center gap-1.5 disabled:opacity-50"
                          >
                            <RotateCcw size={13} />
                            Restaurer
                          </button>
                          <button
                            onClick={() => handleDelete(job)}
                            disabled={busyId === job.id}
                            className="h-8 px-3 rounded-lg text-xs font-bold text-red-600 border border-red-200 hover:bg-red-50 transition-all flex items-center gap-1.5 disabled:opacity-50"
                          >
                            <Trash2 size={13} />
                            Supprimer
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
