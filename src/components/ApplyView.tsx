import React, { useEffect, useState } from "react";
import { Mail, User, Phone, MapPin, Linkedin, FileText, UploadCloud, CheckCircle2, ArrowLeft, Camera } from "lucide-react";

// Nom de l'app (white-label) mémorisé lors de la dernière session connectée.
const appName = localStorage.getItem("nexus-app-name") || "Nexus Talent";
const appInitials =
  appName.split(" ").filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join("") || "NT";

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
  const [letterFile, setLetterFile] = useState<File | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
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
    const isImage = !!file && file.type.startsWith("image/");
    if (file && file.type !== "application/pdf" && !isImage) {
      setError("Le CV doit être au format PDF ou une image (JPG/PNG).");
      setCvFile(null);
      return;
    }
    setError(null);
    setCvFile(file);
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    if (file) {
      if (!file.type.startsWith("image/")) {
        setError("La photo doit être une image (JPG ou PNG).");
        return;
      }
      if (file.size > 2 * 1024 * 1024) {
        setError("La photo ne doit pas dépasser 2 Mo.");
        return;
      }
    }
    setError(null);
    setPhotoFile(file);
    setPhotoPreview(file ? URL.createObjectURL(file) : null);
  };

  const handleLetterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    const isDocx =
      file?.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      file?.name.toLowerCase().endsWith(".docx");
    if (file && file.type !== "application/pdf" && !isDocx) {
      setError("La lettre de motivation doit être au format PDF ou Word (.docx).");
      setLetterFile(null);
      return;
    }
    setError(null);
    setLetterFile(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!cvFile) {
      setError("Merci de joindre votre CV (PDF ou image JPG/PNG).");
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
      if (letterFile) fd.append("letter", letterFile);
      if (photoFile) fd.append("photo", photoFile);

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
      <div className="w-full min-h-screen flex items-center justify-center bg-background px-4">
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
    <div className="w-full min-h-screen flex bg-surface-container-lowest">
      <div className="w-full max-w-3xl mx-auto px-6 sm:px-10 py-12">
        <div className="flex items-center gap-3 mb-10">
          <div className="w-10 h-10 rounded-md bg-primary flex items-center justify-center shrink-0">
            <span className="font-mono text-on-primary text-xs font-bold">{appInitials}</span>
          </div>
          <div>
            <h1 className="font-sans font-bold text-lg text-on-surface leading-tight">{appName}</h1>
            <p className="font-mono text-[10px] text-on-surface-variant tracking-widest uppercase">Espace Candidat</p>
          </div>
        </div>

        <h2 className="font-sans text-[28px] font-semibold text-on-surface tracking-tight mb-2">Postuler à une offre</h2>
        <p className="text-on-surface-variant mb-8">Remplissez le formulaire ci-dessous et joignez votre CV (PDF ou image JPG/PNG).</p>

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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
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
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
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
                placeholder="+261 34 00 111 22"
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
                placeholder="Antananarivo, Madagascar"
                className="w-full bg-surface-container-low border border-outline-variant rounded-lg py-3 pl-10 pr-4 text-sm focus:outline-none focus:border-secondary focus:ring-2 focus:ring-secondary-container transition-all"
              />
            </div>
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
              Photo de profil <span className="text-on-surface-variant/70 normal-case tracking-normal">(optionnel)</span>
            </label>
            <label
              htmlFor="photo-upload"
              className="flex items-center gap-4 border border-dashed border-outline-variant rounded-lg py-4 px-4 cursor-pointer hover:bg-surface-container-low transition-all"
            >
              {photoPreview ? (
                <img src={photoPreview} alt="Aperçu" className="w-14 h-14 rounded-full object-cover border border-outline-variant shrink-0" />
              ) : (
                <span className="w-14 h-14 rounded-full bg-surface-container flex items-center justify-center shrink-0">
                  <Camera size={20} className="text-on-surface-variant" />
                </span>
              )}
              <span className="text-sm text-on-surface truncate">
                {photoFile ? photoFile.name : "Ajouter une photo (JPG ou PNG, 2 Mo max)"}
              </span>
            </label>
            <input id="photo-upload" type="file" accept="image/jpeg,image/png,image/webp" onChange={handlePhotoChange} className="hidden" />
          </div>

          <div>
            <label className="block font-mono text-[10px] uppercase tracking-wider text-on-surface-variant mb-1.5 font-semibold">
              CV (PDF ou image JPG/PNG) <span className="text-error">*</span>
            </label>
            <label
              htmlFor="cv-upload"
              className="flex items-center gap-3 border border-dashed border-outline-variant rounded-lg py-4 px-4 cursor-pointer hover:bg-surface-container-low transition-all"
            >
              {cvFile ? <FileText size={20} className="text-secondary shrink-0" /> : <UploadCloud size={20} className="text-on-surface-variant shrink-0" />}
              <span className="text-sm text-on-surface truncate">
                {cvFile ? cvFile.name : "Cliquez pour choisir votre CV (PDF ou image, 10 Mo max)"}
              </span>
            </label>
            <input id="cv-upload" type="file" accept="application/pdf,image/jpeg,image/png,image/webp" onChange={handleFileChange} className="hidden" />
          </div>

          <div>
            <label className="block font-mono text-[10px] uppercase tracking-wider text-on-surface-variant mb-1.5 font-semibold">
              Lettre de motivation (PDF ou Word) <span className="text-on-surface-variant/70 normal-case tracking-normal">(optionnel)</span>
            </label>
            <label
              htmlFor="letter-upload"
              className="flex items-center gap-3 border border-dashed border-outline-variant rounded-lg py-4 px-4 cursor-pointer hover:bg-surface-container-low transition-all"
            >
              {letterFile ? <FileText size={20} className="text-secondary shrink-0" /> : <UploadCloud size={20} className="text-on-surface-variant shrink-0" />}
              <span className="text-sm text-on-surface truncate">
                {letterFile ? letterFile.name : "Cliquez pour choisir votre lettre (PDF ou Word, 10 Mo max)"}
              </span>
            </label>
            <input
              id="letter-upload"
              type="file"
              accept="application/pdf,.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              onChange={handleLetterChange}
              className="hidden"
            />
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
