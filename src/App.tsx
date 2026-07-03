import React, { useState, useEffect } from "react";
import Sidebar from "./components/Sidebar";
import TopBar from "./components/TopBar";
import LoginView from "./components/LoginView";
import DashboardView from "./components/DashboardView";
import JobsView from "./components/JobsView";
import CandidatesView from "./components/CandidatesView";
import CandidateProfileView from "./components/CandidateProfileView";
import PipelineView from "./components/PipelineView";
import RecommendationView from "./components/RecommendationView";
import AiSearchView from "./components/AiSearchView";
import EmailInboxView from "./components/EmailInboxView";
import ReportsView from "./components/ReportsView";
import DevCenterView from "./components/DevCenterView";
import { Company, User, Job, Candidate, EmailItem, PipelineStage } from "./types";
import { apiFetch, apiJson, setAccessToken } from "./lib/api";
import { SidebarContext } from "./SidebarContext";

export default function App() {
  // null = not yet known (checking for an existing session), false = confirmed logged out
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<string>("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);

  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null);
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
      const candidatesRes = await apiJson(`/api/candidates?page=${candPage}&limit=${CANDIDATES_PAGE_SIZE}`);
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
      const res = await apiJson(`/api/candidates?page=${page}&limit=${CANDIDATES_PAGE_SIZE}`);
      setCandidates(res.data);
      setCandidatesMeta(res.meta);
    } catch (error) {
      console.error("Error loading candidates page:", error);
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

  const handleUpdateCandidateCv = async (id: string, cvText: string) => {
    const res = await apiFetch(`/api/candidates/${id}`, {
      method: "PUT",
      body: JSON.stringify({ cvText })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Échec de l'enregistrement du CV.");
    }
    const updated = await res.json();
    setCandidates(prev => prev.map(c => (c.id === id ? updated : c)));
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

  const handleImportEmail = async (emailId: string, targetJobId: string) => {
    try {
      const res = await apiFetch(`/api/emails/${emailId}/import`, {
        method: "POST",
        body: JSON.stringify({ jobId: targetJobId })
      });
      if (res.ok) await fetchData();
      else alert("Impossible d'importer le candidat depuis cet email.");
    } catch (e) {
      console.error(e);
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

  const selectedCandidate = candidates.find(c => c.id === selectedCandidateId) || null;
  const selectedJob = selectedCandidate ? jobs.find(j => j.id === selectedCandidate.jobId) : undefined;

  const navigateTo = (view: string) => {
    setSelectedCandidateId(null);
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
          onSaveCv={handleUpdateCandidateCv}
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
            loading={loading}
          />
        );
      case "reports":
        return <ReportsView stats={dashboardStats} companyName={activeCompany?.name || "Nexus Client"} onNavigateToView={navigateTo} />;
      case "users": {
        const usersQuery = searchQuery.trim().toLowerCase();
        const visibleUsers = allUsers
          .filter(u => u.companyId === activeCompany?.id)
          .filter(u => !usersQuery || u.name.toLowerCase().includes(usersQuery) || u.email.toLowerCase().includes(usersQuery));
        return (
          <div className="flex-1 bg-background min-h-screen flex flex-col">
            <TopBar activeUser={activeUser} searchValue={searchQuery} onSearchChange={setSearchQuery} />
            <main className="p-8">
              <h2 className="font-sans text-2xl font-semibold text-primary mb-6">Utilisateurs</h2>
              <div className="bg-white border border-outline-variant rounded-xl overflow-hidden">
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
          </div>
        );
      }
      case "settings":
        return (
          <div className="flex-1 bg-background min-h-screen flex flex-col">
            <TopBar activeUser={activeUser} />
            <main className="p-8 max-w-2xl">
              <h2 className="font-sans text-2xl font-semibold text-primary mb-6">Paramètres</h2>
              <div className="bg-white border border-outline-variant rounded-xl p-6 space-y-4">
                <div>
                  <label className="block font-mono text-[10px] uppercase tracking-wider text-on-surface-variant font-semibold mb-1.5">Entreprise</label>
                  <p className="text-sm text-on-surface font-medium">{activeCompany?.name}</p>
                </div>
                <div>
                  <label className="block font-mono text-[10px] uppercase tracking-wider text-on-surface-variant font-semibold mb-1.5">Domaine</label>
                  <p className="text-sm text-on-surface font-medium">{activeCompany?.domain}</p>
                </div>
              </div>
            </main>
          </div>
        );
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
          onCreateJob={() => navigateTo("jobs")}
          onLogout={handleLogout}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />
        <div className="flex-1 flex flex-col h-screen overflow-y-auto">
          {renderMainContent()}
        </div>
      </div>
    </SidebarContext.Provider>
  );
}
