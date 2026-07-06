import React, { useState, useEffect, lazy, Suspense } from "react";
import Sidebar from "./components/Sidebar";
import TopBar from "./components/TopBar";
import LoginView from "./components/LoginView";
import DashboardView from "./components/DashboardView";
import JobsView from "./components/JobsView";
import CandidatesView from "./components/CandidatesView";
import CandidateProfileView from "./components/CandidateProfileView";
import PipelineView from "./components/PipelineView";
import RecommendationView from "./components/RecommendationView";
import EmailInboxView from "./components/EmailInboxView";
import SettingsView from "./components/SettingsView";
// Vues lourdes (recharts / gros contenus) chargées à la demande → code-splitting
// pour alléger le bundle principal (chunks séparés générés par Vite).
const ReportsView = lazy(() => import("./components/ReportsView"));
const AiSearchView = lazy(() => import("./components/AiSearchView"));
const DevCenterView = lazy(() => import("./components/DevCenterView"));
import { Company, User, Job, Candidate, EmailItem, PipelineStage, UserRole } from "./types";
import { apiFetch, apiJson, setAccessToken } from "./lib/api";
import { SidebarContext } from "./SidebarContext";

export default function App() {
  // null = not yet known (checking for an existing session), false = confirmed logged out
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<string>("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  // Mode sombre : préférence persistée en local, appliquée via la classe
  // "dark" sur <html> (les tokens de couleur basculent alors via index.css).
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    const stored = window.localStorage.getItem("nexus-dark-mode");
    if (stored !== null) return stored === "true";
    return window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false;
  });
  // Compteur incrémenté par le bouton "Nouvelle Offre" de la sidebar, pour
  // déclencher l'ouverture du modal de création dans JobsView (voir plus bas).
  const [openJobCreateSignal, setOpenJobCreateSignal] = useState(0);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
    window.localStorage.setItem("nexus-dark-mode", String(darkMode));
  }, [darkMode]);

  // Modal "Ajouter un utilisateur" (vue Utilisateurs)
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [creatingUser, setCreatingUser] = useState(false);
  const [userFormError, setUserFormError] = useState<string | null>(null);
  const [userForm, setUserForm] = useState({ name: "", email: "", password: "", role: UserRole.RH });
  const [loading, setLoading] = useState(true);
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);

  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null);
  // Candidat récupéré par fetch ciblé (ouverture d'une fiche hors page paginée).
  const [selectedCandidateForProfile, setSelectedCandidateForProfile] = useState<Candidate | null>(null);
  const [showRecommendation, setShowRecommendation] = useState(false);

  // Core Data States
  const [activeCompany, setActiveCompany] = useState<Company | null>(null);
  const [activeUser, setActiveUser] = useState<User | null>(null);
  const [allCompanies, setAllCompanies] = useState<Company[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);

  const [jobs, setJobs] = useState<Job[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [emails, setEmails] = useState<EmailItem[]>([]);
  const [dashboardStats, setDashboardStats] = useState<any>(null);

  // Pagination des candidats (les routes candidates/emails renvoient { data, meta }).
  const CANDIDATES_PAGE_SIZE = 20;
  const [candidatesPage, setCandidatesPage] = useState(1);
  const [candidatesMeta, setCandidatesMeta] = useState<{ total: number; page: number; limit: number; totalPages: number }>({
    total: 0,
    page: 1,
    limit: CANDIDATES_PAGE_SIZE,
    totalPages: 1,
  });
  // Tri serveur des candidats (porte sur toute la base). "sortKey" pilote le <select>.
  const [candidatesSortKey, setCandidatesSortKey] = useState("recent");
  const sortParamsFor = (sortKey: string): { field: string; order: "asc" | "desc" } => {
    switch (sortKey) {
      case "name_asc":   return { field: "name", order: "asc" };
      case "name_desc":  return { field: "name", order: "desc" };
      case "score_asc":  return { field: "score", order: "asc" };
      case "score_desc": return { field: "score", order: "desc" };
      default:           return { field: "createdAt", order: "desc" }; // "recent"
    }
  };
  const candidatesQuery = (page: number, sortKey: string) => {
    const { field, order } = sortParamsFor(sortKey);
    return `/api/candidates?page=${page}&limit=${CANDIDATES_PAGE_SIZE}&sortField=${field}&sortOrder=${order}`;
  };

  const fetchData = async (candPage = candidatesPage) => {
    setLoading(true);
    try {
      const contextData = await apiJson("/api/context");

      setActiveCompany(contextData.activeCompany);
      setActiveUser(contextData.activeUser);
      setAllCompanies(contextData.allCompanies);
      setAllUsers(contextData.allUsers);

      setJobs(await apiJson("/api/jobs"));

      // candidates & emails sont désormais paginés → on extrait .data.
      const candidatesRes = await apiJson(candidatesQuery(candPage, candidatesSortKey));
      setCandidates(candidatesRes.data);
      setCandidatesMeta(candidatesRes.meta);
      setCandidatesPage(candidatesRes.meta.page);

      const emailsRes = await apiJson("/api/emails?page=1&limit=100");
      setEmails(emailsRes.data);

      setDashboardStats(await apiJson("/api/dashboard/stats"));
    } catch (error) {
      console.error("Error loading ATS data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCandidatesPageChange = async (page: number) => {
    setCandidatesPage(page);
    try {
      const res = await apiJson(candidatesQuery(page, candidatesSortKey));
      setCandidates(res.data);
      setCandidatesMeta(res.meta);
    } catch (error) {
      console.error("Error loading candidates page:", error);
    }
  };

  // Changement de tri : refetch depuis la page 1 avec les nouveaux params serveur.
  const handleCandidatesSortChange = async (sortKey: string) => {
    setCandidatesSortKey(sortKey);
    setCandidatesPage(1);
    try {
      const res = await apiJson(candidatesQuery(1, sortKey));
      setCandidates(res.data);
      setCandidatesMeta(res.meta);
    } catch (error) {
      console.error("Error loading sorted candidates:", error);
    }
  };

  // On first mount, try to silently restore a session from the httpOnly
  // refresh cookie (e.g. after a page reload). If it fails, show the login screen.
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/auth/refresh", { method: "POST", credentials: "include" });
        if (res.ok) {
          const data = await res.json();
          setAccessToken(data.accessToken);
          setActiveUser(data.user);
          setAuthenticated(true);
        } else {
          setAuthenticated(false);
        }
      } catch {
        setAuthenticated(false);
      } finally {
        // Important: loading starts at true (it's reused later for data fetching),
        // but the login button must not show its "in progress" state before the
        // user has even attempted to log in.
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (authenticated) fetchData();
  }, [authenticated]);

  const handleLogin = async (email: string, password: string) => {
    setAuthError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (!res.ok) {
        setAuthError(data.error || "Échec de la connexion.");
        setLoading(false);
        return;
      }
      setAccessToken(data.accessToken);
      setActiveUser(data.user);
      setAuthenticated(true);
    } catch (e) {
      console.error(e);
      setAuthError("Impossible de joindre le serveur. Réessayez.");
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    } catch (e) {
      console.error(e);
    } finally {
      setAccessToken(null);
      setAuthenticated(false);
      setActiveUser(null);
      setActiveCompany(null);
      setCandidates([]);
      setJobs([]);
      setEmails([]);
      setDashboardStats(null);
      setSelectedCandidateId(null);
      setActiveView("dashboard");
    }
  };

  const handleSwitchContext = async (companyId: string, userId: string) => {
    setLoading(true);
    try {
      const res = await apiFetch("/api/switch-context", {
        method: "POST",
        body: JSON.stringify({ companyId, userId })
      });
      if (res.ok) {
        const data = await res.json();
        setAccessToken(data.accessToken);
        setActiveUser(data.user);
        await fetchData();
      } else {
        setLoading(false);
      }
    } catch (e) {
      console.error(e);
      setLoading(false);
    }
  };

  const handleCreateJob = async (jobData: Partial<Job>) => {
    setLoading(true);
    try {
      const res = await apiFetch("/api/jobs", {
        method: "POST",
        body: JSON.stringify(jobData)
      });
      if (res.ok) await fetchData();
    } catch (e) {
      console.error(e);
      setLoading(false);
    }
  };

  const handleEditJob = async (id: string, jobData: Partial<Job>) => {
    setLoading(true);
    try {
      const res = await apiFetch(`/api/jobs/${id}`, {
        method: "PUT",
        body: JSON.stringify(jobData)
      });
      if (res.ok) await fetchData();
    } catch (e) {
      console.error(e);
      setLoading(false);
    }
  };

  const handleDeleteJob = async (id: string) => {
    setLoading(true);
    try {
      const res = await apiFetch(`/api/jobs/${id}`, { method: "DELETE" });
      if (res.ok) await fetchData();
    } catch (e) {
      console.error(e);
      setLoading(false);
    }
  };

  const handleAddCandidate = async (candData: Partial<Candidate>) => {
    setLoading(true);
    try {
      const res = await apiFetch("/api/candidates", {
        method: "POST",
        body: JSON.stringify(candData)
      });
      if (res.ok) await fetchData();
    } catch (e) {
      console.error(e);
      setLoading(false);
    }
  };

  const handleUpdateStage = async (id: string, stage: PipelineStage) => {
    try {
      const res = await apiFetch(`/api/candidates/${id}/stage`, {
        method: "PUT",
        body: JSON.stringify({ stage })
      });
      if (res.ok) {
        setCandidates(prev => prev.map(c => (c.id === id ? { ...c, stage } : c)));
        setDashboardStats(await apiJson("/api/dashboard/stats"));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleAnalyzeCandidate = async (id: string) => {
    setAnalyzingId(id);
    try {
      const res = await apiFetch(`/api/candidates/${id}/analyze`, { method: "POST" });
      if (res.ok) {
        const updatedCandidate = await res.json();
        setCandidates(prev => prev.map(c => (c.id === id ? updatedCandidate : c)));
        setDashboardStats(await apiJson("/api/dashboard/stats"));
      } else {
        const errData = await res.json();
        alert("Erreur lors de l'analyse IA sémantique : " + (errData.error || "Erreur inconnue"));
      }
    } catch (e: any) {
      console.error(e);
      alert("Une erreur de communication est survenue: " + e.message);
    } finally {
      setAnalyzingId(null);
    }
  };

  // Mise à jour partielle d'un candidat (profil, CV, lettre, avatar…) via PUT.
  const handleUpdateCandidate = async (id: string, patch: Partial<Candidate>) => {
    const res = await apiFetch(`/api/candidates/${id}`, {
      method: "PUT",
      body: JSON.stringify(patch)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Échec de l'enregistrement.");
    }
    const updated = await res.json();
    setCandidates(prev => prev.map(c => (c.id === id ? updated : c)));
  };

  const openAddUserModal = () => {
    setUserForm({ name: "", email: "", password: "", role: UserRole.RH });
    setUserFormError(null);
    setShowAddUserModal(true);
  };

  const closeAddUserModal = () => {
    if (creatingUser) return;
    setShowAddUserModal(false);
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (creatingUser) return;
    setCreatingUser(true);
    setUserFormError(null);
    try {
      const res = await apiFetch("/api/users", {
        method: "POST",
        body: JSON.stringify(userForm)
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Échec de la création de l'utilisateur.");
      }
      const created = await res.json();
      setAllUsers(prev => [...prev, created]);
      setShowAddUserModal(false);
    } catch (err: any) {
      setUserFormError(err?.message || "Une erreur est survenue.");
    } finally {
      setCreatingUser(false);
    }
  };

  const handleDeleteCandidate = async (id: string) => {
    setLoading(true);
    try {
      const res = await apiFetch(`/api/candidates/${id}`, { method: "DELETE" });
      if (res.ok) await fetchData();
    } catch (e) {
      console.error(e);
      setLoading(false);
    }
  };

  const handleImportEmail = async (emailId: string, targetJobId: string): Promise<{ ok: boolean; status: number; candidateId?: string; error?: string }> => {
    try {
      const res = await apiFetch(`/api/emails/${emailId}/import`, {
        method: "POST",
        body: JSON.stringify({ jobId: targetJobId })
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) await fetchData();
      return { ok: res.ok, status: res.status, candidateId: data.candidateId, error: data.error };
    } catch (e) {
      console.error(e);
      return { ok: false, status: 0, error: "Impossible de joindre le serveur." };
    }
  };

  // Ouvre la fiche d'un candidat depuis une autre vue (ex. email déjà importé).
  // Récupère le candidat par fetch ciblé pour garantir l'ouverture de la fiche
  // même s'il n'est pas dans la page courante de la liste paginée.
  const openCandidateById = async (candidateId: string) => {
    setShowRecommendation(false);
    setActiveView("candidates");
    setSelectedCandidateId(candidateId);
    try {
      const candidate = await apiJson(`/api/candidates/${candidateId}`);
      setSelectedCandidateForProfile(candidate);
    } catch (e) {
      console.error("Impossible de charger la fiche candidat:", e);
    }
  };

  if (authenticated === null) {
    // Still checking for an existing session via the refresh cookie.
    return (
      <div className="w-screen h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-secondary" />
      </div>
    );
  }

  if (!authenticated) {
    return <LoginView onLogin={handleLogin} loading={loading} error={authError} />;
  }

  const selectedCandidate =
    candidates.find(c => c.id === selectedCandidateId) ||
    (selectedCandidateForProfile?.id === selectedCandidateId ? selectedCandidateForProfile : null);
  const selectedJob = selectedCandidate ? jobs.find(j => j.id === selectedCandidate.jobId) : undefined;

  const navigateTo = (view: string) => {
    setSelectedCandidateId(null);
    setSelectedCandidateForProfile(null);
    setShowRecommendation(false);
    setSearchQuery(""); // la recherche est réinitialisée à chaque changement de vue
    setActiveView(view);
    setSidebarOpen(false); // referme le drawer mobile après navigation
  };

  const openCandidateProfile = (candidate: Candidate) => {
    setSelectedCandidateId(candidate.id);
    setShowRecommendation(false);
  };

  // Ouvre la fiche candidat depuis une autre vue (Dashboard, Recherche IA...).
  // Bascule d'abord sur "candidates" PUIS sélectionne — l'ordre importe car
  // navigateTo réinitialise la sélection ; ici on ne passe pas par navigateTo.
  const openCandidateFromView = (candidate: Candidate) => {
    setActiveView("candidates");
    setSelectedCandidateId(candidate.id);
    setShowRecommendation(false);
  };

  const renderMainContent = () => {
    // Candidate detail / recommendation drilldown takes over candidates & pipeline views
    if (selectedCandidate && (activeView === "candidates" || activeView === "pipeline")) {
      if (showRecommendation) {
        return (
          <RecommendationView
            candidate={selectedCandidate}
            job={selectedJob}
            activeUser={activeUser}
            onBack={() => setShowRecommendation(false)}
          />
        );
      }
      return (
        <CandidateProfileView
          candidate={selectedCandidate}
          job={selectedJob}
          activeUser={activeUser}
          onBack={() => setSelectedCandidateId(null)}
          onUpdateStage={handleUpdateStage}
          onAnalyzeCandidate={handleAnalyzeCandidate}
          analyzing={analyzingId === selectedCandidate.id}
          onOpenRecommendation={() => setShowRecommendation(true)}
          onSaveCandidate={handleUpdateCandidate}
        />
      );
    }

    switch (activeView) {
      case "dashboard":
        return <DashboardView stats={dashboardStats} onNavigateToView={navigateTo} onSelectCandidate={openCandidateFromView} onRefresh={fetchData} loading={loading} activeUser={activeUser} searchQuery={searchQuery} onSearchChange={setSearchQuery} />;
      case "jobs":
        return (
          <JobsView
            jobs={jobs}
            activeUser={activeUser}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onCreateJob={handleCreateJob}
            onEditJob={handleEditJob}
            onDeleteJob={handleDeleteJob}
            loading={loading}
            openCreateSignal={openJobCreateSignal}
          />
        );
      case "candidates":
        return (
          <CandidatesView
            candidates={candidates}
            jobs={jobs}
            activeUser={activeUser}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onSelectCandidate={openCandidateProfile}
            onAddCandidate={handleAddCandidate}
            loading={loading}
            page={candidatesMeta.page}
            totalPages={candidatesMeta.totalPages}
            totalCandidates={candidatesMeta.total}
            onPageChange={handleCandidatesPageChange}
            sortKey={candidatesSortKey}
            onSortChange={handleCandidatesSortChange}
          />
        );
      case "pipeline":
        return (
          <PipelineView
            candidates={candidates}
            jobs={jobs}
            activeUser={activeUser}
            onSelectCandidate={openCandidateProfile}
            onUpdateStage={handleUpdateStage}
            loading={loading}
          />
        );
      case "ai-search":
        return <AiSearchView candidates={candidates} jobs={jobs} onSelectCandidate={openCandidateFromView} />;
      case "emails":
        return (
          <EmailInboxView
            emails={emails}
            jobs={jobs}
            onImportEmail={handleImportEmail}
            onNavigateToView={navigateTo}
            onOpenCandidate={openCandidateById}
            loading={loading}
          />
        );
      case "reports":
        return <ReportsView stats={dashboardStats} companyName={activeCompany?.name || "Nexus Client"} onNavigateToView={navigateTo} />;
      case "users": {
        const usersQuery = searchQuery.trim().toLowerCase();
        // Seuls les admins (plateforme ou entreprise) peuvent créer des utilisateurs — miroir du contrôle serveur.
        const canManageUsers =
          activeUser?.role === UserRole.AdminPlateforme || activeUser?.role === UserRole.AdminEntreprise;
        const visibleUsers = allUsers
          .filter(u => u.companyId === activeCompany?.id)
          .filter(u => !usersQuery || u.name.toLowerCase().includes(usersQuery) || u.email.toLowerCase().includes(usersQuery));
        return (
          <div className="flex-1 bg-background min-h-screen flex flex-col">
            <TopBar activeUser={activeUser} searchValue={searchQuery} onSearchChange={setSearchQuery} />
            <main className="p-4 md:p-8">
              <div className="flex justify-between items-center mb-6 gap-3 flex-wrap">
                <h2 className="font-sans text-2xl font-semibold text-on-surface">Utilisateurs</h2>
                {canManageUsers && (
                  <button
                    onClick={openAddUserModal}
                    className="h-10 px-4 bg-accent hover:bg-accent-dark text-white rounded-[8px] text-sm font-bold flex items-center gap-2 transition-all shrink-0"
                  >
                    <span className="text-lg leading-none">+</span>
                    Ajouter un utilisateur
                  </button>
                )}
              </div>
              <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-surface-container-low text-on-surface-variant font-mono text-[10px] uppercase tracking-wider">
                    <tr>
                      <th className="px-6 py-3">Nom</th>
                      <th className="px-6 py-3">Email</th>
                      <th className="px-6 py-3">Rôle</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant">
                    {visibleUsers.map(u => (
                      <tr key={u.id} className="hover:bg-surface-container-low">
                        <td className="px-6 py-3 text-sm font-bold text-on-surface">{u.name}</td>
                        <td className="px-6 py-3 text-sm text-on-surface-variant">{u.email}</td>
                        <td className="px-6 py-3 text-sm text-on-surface-variant">{u.role}</td>
                      </tr>
                    ))}
                    {visibleUsers.length === 0 && (
                      <tr>
                        <td colSpan={3} className="px-6 py-8 text-center text-sm text-on-surface-variant">Aucun utilisateur trouvé.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </main>

            {/* Modal "Ajouter un utilisateur" */}
            {showAddUserModal && (
              <div
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
                onClick={closeAddUserModal}
              >
                <div
                  className="w-full max-w-md max-h-[90vh] overflow-y-auto bg-surface-container-lowest rounded-xl p-6 shadow-[0px_10px_25px_rgba(15,23,42,0.08)]"
                  onClick={e => e.stopPropagation()}
                >
                  <div className="flex items-center justify-between mb-5">
                    <h3 className="font-sans text-lg font-semibold text-on-surface">Ajouter un utilisateur</h3>
                    <button
                      type="button"
                      onClick={closeAddUserModal}
                      disabled={creatingUser}
                      className="text-on-surface-variant hover:text-on-surface transition-colors disabled:opacity-40 text-xl leading-none"
                    >
                      ×
                    </button>
                  </div>

                  <form onSubmit={handleCreateUser} className="space-y-4">
                    <div>
                      <label htmlFor="user-name" className="block font-mono text-[10px] uppercase tracking-wider text-on-surface-variant mb-1.5">Nom <span className="text-error">*</span></label>
                      <input
                        id="user-name"
                        type="text"
                        required
                        autoFocus
                        value={userForm.name}
                        onChange={e => setUserForm(f => ({ ...f, name: e.target.value }))}
                        className="w-full bg-surface-container-lowest border border-outline-variant rounded-[8px] px-3 py-2 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent transition-all"
                        placeholder="Jean Dupont"
                      />
                    </div>

                    <div>
                      <label htmlFor="user-email" className="block font-mono text-[10px] uppercase tracking-wider text-on-surface-variant mb-1.5">Email <span className="text-error">*</span></label>
                      <input
                        id="user-email"
                        type="email"
                        required
                        value={userForm.email}
                        onChange={e => setUserForm(f => ({ ...f, email: e.target.value }))}
                        className="w-full bg-surface-container-lowest border border-outline-variant rounded-[8px] px-3 py-2 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent transition-all"
                        placeholder="jean@exemple.com"
                      />
                    </div>

                    <div>
                      <label htmlFor="user-password" className="block font-mono text-[10px] uppercase tracking-wider text-on-surface-variant mb-1.5">Mot de passe <span className="text-error">*</span></label>
                      <input
                        id="user-password"
                        type="password"
                        required
                        value={userForm.password}
                        onChange={e => setUserForm(f => ({ ...f, password: e.target.value }))}
                        className="w-full bg-surface-container-lowest border border-outline-variant rounded-[8px] px-3 py-2 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent transition-all"
                        placeholder="••••••••"
                      />
                    </div>

                    <div>
                      <label htmlFor="user-role" className="block font-mono text-[10px] uppercase tracking-wider text-on-surface-variant mb-1.5">Rôle</label>
                      <select
                        id="user-role"
                        value={userForm.role}
                        onChange={e => setUserForm(f => ({ ...f, role: e.target.value as UserRole }))}
                        className="w-full bg-surface-container-lowest border border-outline-variant rounded-[8px] px-3 py-2 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent transition-all"
                      >
                        {Object.values(UserRole).map(r => (
                          <option key={r} value={r}>{r}</option>
                        ))}
                      </select>
                    </div>

                    {userFormError && <p className="text-error text-sm">{userFormError}</p>}

                    <div className="flex justify-end gap-3 pt-2">
                      <button
                        type="button"
                        onClick={closeAddUserModal}
                        disabled={creatingUser}
                        className="h-10 px-4 rounded-[8px] text-sm font-bold text-on-surface-variant hover:bg-surface-container-low transition-all disabled:opacity-40"
                      >
                        Annuler
                      </button>
                      <button
                        type="submit"
                        disabled={creatingUser}
                        className="h-10 px-4 bg-accent hover:bg-accent-dark text-white rounded-[8px] text-sm font-bold transition-all disabled:opacity-50"
                      >
                        {creatingUser ? "Création…" : "Ajouter"}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        );
      }
      case "settings":
        return <SettingsView activeUser={activeUser} activeCompany={activeCompany} />;
      case "dev-center":
        return <DevCenterView />;
      default:
        return <DashboardView stats={dashboardStats} onNavigateToView={navigateTo} onSelectCandidate={openCandidateFromView} onRefresh={fetchData} loading={loading} activeUser={activeUser} searchQuery={searchQuery} onSearchChange={setSearchQuery} />;
    }
  };

  return (
    <SidebarContext.Provider value={{ openSidebar: () => setSidebarOpen(true) }}>
      <div className="flex w-screen h-screen overflow-hidden bg-background font-sans text-on-background antialiased">
        <Sidebar
          activeView={activeView}
          setActiveView={navigateTo}
          activeCompany={activeCompany}
          activeUser={activeUser}
          allCompanies={allCompanies}
          allUsers={allUsers}
          onSwitchContext={handleSwitchContext}
          onCreateJob={() => { navigateTo("jobs"); setOpenJobCreateSignal(s => s + 1); }}
          onLogout={handleLogout}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          darkMode={darkMode}
          onToggleDarkMode={() => setDarkMode(d => !d)}
        />
        <div className="flex-1 flex flex-col h-screen overflow-y-auto">
          <Suspense
            fallback={
              <div className="flex-1 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-secondary" />
              </div>
            }
          >
            {renderMainContent()}
          </Suspense>
        </div>
      </div>
    </SidebarContext.Provider>
  );
}
