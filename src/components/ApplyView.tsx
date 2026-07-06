import React, { useEffect, useState } from "react";
import { Mail, User, Phone, MapPin, Linkedin, FileText, UploadCloud, CheckCircle2, ArrowLeft } from "lucide-react";

interface PublicJob {
  id: string;
  title: string;
  location: string;
  contractType: string;
}

export default function ApplyView() {
  const [jobs, setJobs] = useState<PublicJob[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(true);

  const [form, setForm] = useState({
    jobId: "",
    name: "",
    email: "",
    phone: "",
    location: "",
    linkedinUrl: "",
  });
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/public/jobs");
        if (res.ok) {
          const data = await res.json();
          setJobs(data);
          if (data.length > 0) {
            setForm((f) => ({ ...f, jobId: data[0].id }));
          }
        }
      } catch (e) {
        console.error("Erreur chargement des offres:", e);
      } finally {
        setLoadingJobs(false);
      }
    })();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    if (file && file.type !== "application/pdf") {
      setError("Le CV doit être au format PDF.");
      setCvFile(null);
      return;
    }
    setError(null);
    setCvFile(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!cvFile) {
      setError("Merci de joindre votre CV au format PDF.");
      return;
    }
    if (!form.jobId) {
      setError("Merci de sélectionner une offre.");
      return;
    }

    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append("jobId", form.jobId);
      fd.append("name", form.name);
      fd.append("email", form.email);
      fd.append("phone", form.phone);
      fd.append("location", form.location);
      fd.append("linkedinUrl", form.linkedinUrl);
      fd.append("cv", cvFile);

      const res = await fetch("/api/public/apply", { method: "POST", body: fd });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Une erreur est survenue. Veuillez réessayer.");
        setSubmitting(false);
        return;
      }

      setSuccess(true);
    } catch (e) {
      console.error(e);
      setError("Impossible de joindre le serveur. Réessayez.");
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="w-screen h-screen flex items-center justify-center bg-background px-4">
        <div className="max-w-md w-full bg-surface-container-lowest border border-outline-variant rounded-xl p-8 text-center shadow-sm">
          <div className="w-14 h-14 rounded-full bg-secondary-container flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 size={28} className="text-secondary" />
          </div>
          <h2 className="font-sans text-xl font-semibold text-on-surface mb-2">Candidature envoyée !</h2>
          <p className="text-sm text-on-surface-variant mb-6">
            Merci pour votre candidature. Notre équipe de recrutement va l'examiner et reviendra vers vous prochainement.
          </p>
          <a
            href="/"
            className="inline-flex items-center gap-2 text-sm font-bold text-secondary hover:underline"
          >
            <ArrowLeft size={16} /> Retour à l'accueil
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="w-screen min-h-screen flex bg-surface-container-lowest overflow-y-auto">
      <div className="w-full max-w-xl mx-auto px-6 sm:px-10 py-12">
        <div className="flex items-center gap-3 mb-10">
          <div className="w-10 h-10 rounded-md bg-primary flex items-center justify-center shrink-0">
            <span className="font-mono text-on-primary text-xs font-bold">NT</span>
          </div>
          <div>
            <h1 className="font-sans font-bold text-lg text-on-surface leading-tight">Nexus Talent</h1>
            <p className="font-mono text-[10px] text-on-surface-variant tracking-widest uppercase">Espace Candidat</p>
          </div>
        </div>

        <h2 className="font-sans text-[28px] font-semibold text-on-surface tracking-tight mb-2">Postuler à une offre</h2>
        <p className="text-on-surface-variant mb-8">Remplissez le formulaire ci-dessous et joignez votre CV au format PDF.</p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block font-mono text-[10px] uppercase tracking-wider text-on-surface-variant mb-1.5 font-semibold">
              Offre visée <span className="text-error">*</span>
            </label>
            {loadingJobs ? (
              <p className="text-sm text-on-surface-variant">Chargement des offres…</p>
            ) : jobs.length === 0 ? (
              <p className="text-sm text-error">Aucune offre n'est disponible pour le moment.</p>
            ) : (
              <select
                required
                value={form.jobId}
                onChange={(e) => setForm((f) => ({ ...f, jobId: e.target.value }))}
                className="w-full bg-surface-container-low border border-outline-variant rounded-lg py-3 px-4 text-sm focus:outline-none focus:border-secondary focus:ring-2 focus:ring-secondary-container transition-all"
              >
                {jobs.map((j) => (
                  <option key={j.id} value={j.id}>
                    {j.title} — {j.location} ({j.contractType})
                  </option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label className="block font-mono text-[10px] uppercase tracking-wider text-on-surface-variant mb-1.5 font-semibold">
              Nom complet <span className="text-error">*</span>
            </label>
            <div className="relative">
              <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Jean Dupont"
                className="w-full bg-surface-container-low border border-outline-variant rounded-lg py-3 pl-10 pr-4 text-sm focus:outline-none focus:border-secondary focus:ring-2 focus:ring-secondary-container transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block font-mono text-[10px] uppercase tracking-wider text-on-surface-variant mb-1.5 font-semibold">
              Email <span className="text-error">*</span>
            </label>
            <div className="relative">
              <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="jean.dupont@exemple.com"
                className="w-full bg-surface-container-low border border-outline-variant rounded-lg py-3 pl-10 pr-4 text-sm focus:outline-none focus:border-secondary focus:ring-2 focus:ring-secondary-container transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block font-mono text-[10px] uppercase tracking-wider text-on-surface-variant mb-1.5 font-semibold">
              Téléphone
            </label>
            <div className="relative">
              <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                placeholder="06 12 34 56 78"
                className="w-full bg-surface-container-low border border-outline-variant rounded-lg py-3 pl-10 pr-4 text-sm focus:outline-none focus:border-secondary focus:ring-2 focus:ring-secondary-container transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block font-mono text-[10px] uppercase tracking-wider text-on-surface-variant mb-1.5 font-semibold">
              Localisation
            </label>
            <div className="relative">
              <MapPin size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
              <input
                type="text"
                value={form.location}
                onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                placeholder="Paris, France"
                className="w-full bg-surface-container-low border border-outline-variant rounded-lg py-3 pl-10 pr-4 text-sm focus:outline-none focus:border-secondary focus:ring-2 focus:ring-secondary-container transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block font-mono text-[10px] uppercase tracking-wider text-on-surface-variant mb-1.5 font-semibold">
              Profil LinkedIn
            </label>
            <div className="relative">
              <Linkedin size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
              <input
                type="text"
                value={form.linkedinUrl}
                onChange={(e) => setForm((f) => ({ ...f, linkedinUrl: e.target.value }))}
                placeholder="linkedin.com/in/jeandupont"
                className="w-full bg-surface-container-low border border-outline-variant rounded-lg py-3 pl-10 pr-4 text-sm focus:outline-none focus:border-secondary focus:ring-2 focus:ring-secondary-container transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block font-mono text-[10px] uppercase tracking-wider text-on-surface-variant mb-1.5 font-semibold">
              CV (PDF) <span className="text-error">*</span>
            </label>
            <label
              htmlFor="cv-upload"
              className="flex items-center gap-3 border border-dashed border-outline-variant rounded-lg py-4 px-4 cursor-pointer hover:bg-surface-container-low transition-all"
            >
              {cvFile ? <FileText size={20} className="text-secondary shrink-0" /> : <UploadCloud size={20} className="text-on-surface-variant shrink-0" />}
              <span className="text-sm text-on-surface truncate">
                {cvFile ? cvFile.name : "Cliquez pour choisir votre CV (PDF, 10 Mo max)"}
              </span>
            </label>
            <input id="cv-upload" type="file" accept="application/pdf" onChange={handleFileChange} className="hidden" />
          </div>

          {error && (
            <p className="text-sm text-error bg-error-container/40 border border-error-container rounded-lg px-3 py-2">{error}</p>
          )}

          <button
            type="submit"
            disabled={submitting || loadingJobs || jobs.length === 0}
            className="w-full bg-secondary text-white py-3 rounded-lg font-bold text-sm hover:brightness-110 transition-all disabled:opacity-60"
          >
            {submitting ? "Envoi en cours…" : "Envoyer ma candidature"}
          </button>
        </form>

        <a href="/" className="mt-8 inline-flex items-center gap-2 text-sm text-on-surface-variant hover:text-secondary">
          <ArrowLeft size={16} /> Retour à l'accueil
        </a>
      </div>
    </div>
  );
}
