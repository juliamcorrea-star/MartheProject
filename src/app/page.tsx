"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowDown, ArrowRight, BookOpen, Check, ChevronRight, CircleHelp,
  ClipboardList, Droplets, Flame, GraduationCap, Leaf, LockKeyhole,
  LogOut, Maximize2, Pickaxe, Plus, RotateCcw, Satellite, Shield, Sun,
  TentTree, Utensils, UserRound, X,
} from "lucide-react";

type ResourceKey = "water" | "food" | "alloy" | "power";
type Resources = Record<ResourceKey, number>;
type ModuleId = "habitat" | "greenhouse" | "extractor" | "laboratory";
type ProgressSnapshot = { started: boolean; resources: Resources; builtModules: ModuleId[]; day: number; finalStep: number; campaignComplete: boolean; showEpilogue: boolean };
type Challenge = { solid: string; formula: string; question: string; answer: number; unit: string; hint: string };
type Profile = { id: string; name: string; email: string; role: "student" | "teacher"; key: string };
type ActivityRecord = { id: string; userId?: string; name: string; phase: string; answer: string; correct: boolean; kind: "access" | "answer"; at: string };
type AdminUser = Omit<Profile, "key"> & {
  createdAt: string;
  lastActivityAt: string | null;
  accessCount: number;
  correctCount: number;
  incorrectCount: number;
  progress: { started: boolean; builtCount: number; finalStep: number; complete: boolean; showEpilogue: boolean; resources: Resources; day: number } | null;
};

type Module = {
  id: ModuleId;
  name: string;
  description: string;
  icon: typeof TentTree;
  cost: Partial<Resources>;
  reward: Partial<Resources>;
  challenge: Challenge;
  position: string;
};

const initialResources: Resources = { water: 24, food: 18, alloy: 32, power: 22 };

const finalProblems = [
  { phase: "RESERVA DE OXIGÊNIO", question: "O tanque de emergência é cilíndrico, com raio de 2 m e altura de 5 m. Qual é seu volume? Use π = 3.", answer: 60, hint: "V = π × r² × h = 3 × 2² × 5" },
  { phase: "PERDA NA TEMPESTADE", question: "A tempestade danificou uma válvula que perde 8 m³ de oxigênio por dia. Quanto se perde em 2 dias?", answer: 16, hint: "Multiplique a perda diária pelos 2 dias" },
  { phase: "DEMANDA DA TRIPULAÇÃO", question: "Quatro tripulantes precisam de 3 m³ por pessoa a cada dia. Qual é a demanda total para 2 dias?", answer: 24, hint: "Multiplique 4 pessoas × 3 m³ × 2 dias" },
  { phase: "DECISÃO DE SOBREVIVÊNCIA", question: "O tanque começa com 60 m³. Desconte a perda de 16 m³ e a demanda de 24 m³. Quanto oxigênio resta?", answer: 20, hint: "Calcule 60 − 16 − 24" },
];

const modules: Module[] = [
  {
    id: "habitat", name: "Domo de abrigo", description: "Pressurização · 4 tripulantes", icon: TentTree,
    cost: { alloy: 10, power: 4 }, reward: { water: 7, food: 3, alloy: 6 }, position: "habitat",
    challenge: { solid: "Cilindro", formula: "V = π × r² × h", question: "O módulo de moradia tem raio de 3 m e altura de 4 m. Qual é seu volume? Use π = 3.", answer: 108, unit: "m³", hint: "V = 3 × 3² × 4" },
  },
  {
    id: "greenhouse", name: "Estufa hidropônica", description: "Cultivo · + alimento", icon: Leaf,
    cost: { alloy: 8, water: 4, power: 3 }, reward: { food: 12, water: 2, alloy: 3 }, position: "greenhouse",
    challenge: { solid: "Prisma retangular", formula: "V = comprimento × largura × altura", question: "A estufa mede 6 m × 3 m × 2 m. Qual é o volume interno para o cultivo?", answer: 36, unit: "m³", hint: "Multiplique as três dimensões: 6 × 3 × 2" },
  },
  {
    id: "extractor", name: "Extrator de gelo", description: "Permafrost · + água", icon: Droplets,
    cost: { alloy: 12, power: 5 }, reward: { water: 16, alloy: 2 }, position: "extractor",
    challenge: { solid: "Cubo", formula: "V = aresta³", question: "Um bloco de gelo tem arestas de 4 m. Qual é o volume de água congelada?", answer: 64, unit: "m³", hint: "Eleve a aresta ao cubo: 4 × 4 × 4" },
  },
  {
    id: "laboratory", name: "Laboratório de campo", description: "Pesquisa · + energia", icon: Satellite,
    cost: { alloy: 13, water: 3, food: 2 }, reward: { power: 12, food: 2, alloy: 4 }, position: "laboratory",
    challenge: { solid: "Esfera", formula: "V = ⁴⁄₃ × π × r³", question: "A cúpula esférica de um sensor tem raio de 3 m. Use π = 3. Qual é o volume?", answer: 108, unit: "m³", hint: "V = 4/3 × 3 × 3³" },
  },
];

const resourceMeta: Record<ResourceKey, { label: string; unit: string; icon: typeof Droplets }> = {
  water: { label: "Água", unit: "L", icon: Droplets },
  food: { label: "Alimento", unit: "kg", icon: Utensils },
  alloy: { label: "Liga", unit: "kg", icon: Pickaxe },
  power: { label: "Energia", unit: "kWh", icon: Sun },
};

function canAfford(resources: Resources, cost: Partial<Resources>) {
  return Object.entries(cost).every(([key, amount]) => resources[key as ResourceKey] >= (amount ?? 0));
}

function readStored<T,>(key: string, fallback: T): T {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) as T : fallback;
  } catch {
    return fallback;
  }
}

export default function Home() {
  return (
    <main className="site-home">
      <section className="site-hero" id="inicio">
        <div className="opening-image" aria-hidden="true" /><div className="opening-grain" aria-hidden="true" />
        <header className="site-nav"><Link className="wordmark" href="/" aria-label="MARTHE início"><span className="wordmark-mark">M</span> MARTHE</Link><nav aria-label="Navegação principal"><a href="#missao">A MISSÃO</a><a href="#aprendizagem">APRENDIZAGEM</a><a href="#educadores">EDUCADORES</a></nav><Link className="site-nav-cta" href="/expedicao">ENTRAR NA EXPEDIÇÃO <ArrowRight size={14} /></Link></header>
        <div className="site-hero-copy"><p className="eyebrow"><span /> LABORATÓRIO DE MATEMÁTICA · MARTE</p><h1>O próximo lar<br />da humanidade<br /><em>é uma equação.</em></h1><p>Uma missão de geometria espacial onde cada cálculo constrói abrigo, mantém recursos e pode salvar quatro vidas no planeta vermelho.</p><div className="site-hero-actions"><Link className="launch-button" href="/expedicao">INICIAR EXPEDIÇÃO <ArrowRight size={16} /></Link><a className="text-link" href="#missao">CONHECER A MISSÃO <ArrowDown size={14} /></a></div></div>
        <div className="site-hero-coordinate">18.65°N&nbsp;&nbsp; 226.2°E <span>·</span> PLANÍCIE DE AMAZONIS</div><div className="site-scroll-note">ROLE PARA EXPLORAR <ArrowDown size={13} /></div>
      </section>
      <section className="site-mission section-wrap" id="missao"><div className="section-label"><span>01</span><i /> O CENÁRIO</div><div className="mission-columns"><h2>Uma tempestade.<br /><em>Quatro tripulantes.</em></h2><div><p>Uma tempestade de poeira rompeu a válvula do tanque de oxigênio da Base Asterion. A equipe tem poucos dias para reconstruir sistemas essenciais e descobrir se a reserva restante será suficiente.</p><p>Para sobreviver, a tripulação precisa calcular volumes, administrar água, alimento, liga metálica e energia. Cada resposta certa vira uma estrutura. Cada etapa concluída aproxima a equipe da solução.</p><Link className="text-link dark-link" href="/expedicao">LER O INFORME DA MISSÃO <ArrowRight size={14} /></Link></div></div></section>
      <section className="site-learning" id="aprendizagem"><div className="section-wrap"><div className="section-label"><span>02</span><i /> O MÉTODO</div><div className="learning-heading"><h2>Matemática que<br /><em>mantém a base viva.</em></h2><p>Geometria espacial aplicada a decisões reais da missão. Resolva uma fase de cada vez e veja os cálculos ganharem forma no terreno.</p></div><div className="learning-steps"><article><span>01 / DIMENSIONAR</span><strong>Calcule volumes</strong><p>Cilindros, prismas, cubos e esferas aparecem como peças da infraestrutura.</p></article><article><span>02 / CONSTRUIR</span><strong>Gerencie recursos</strong><p>Use os materiais com cuidado para erguer abrigo, estufa, extrator e laboratório.</p></article><article><span>03 / RESOLVER</span><strong>Estabilize o oxigênio</strong><p>Combine os resultados em uma sequência final para decidir o destino da tripulação.</p></article></div></div></section>
      <section className="site-educators section-wrap" id="educadores"><div className="section-label"><span>03</span><i /> PARA EDUCADORES</div><div className="educator-content"><div><h2>Acompanhe o raciocínio,<br /><em>não só o resultado.</em></h2><p>O painel docente reúne acessos e tentativas dos estudantes, com acertos e erros por etapa. Use o registro para identificar conceitos que merecem uma nova conversa em sala.</p></div><Link className="educator-link" href="/expedicao?perfil=professor"><span>ÁREA DO PROFESSOR</span><ArrowRight size={17} /></Link></div></section>
      <footer className="site-footer"><Link className="wordmark" href="/"><span className="wordmark-mark">M</span> MARTHE</Link><span>UMA MISSÃO DE GEOMETRIA ESPACIAL</span><Link href="/expedicao">ACESSAR O JOGO <ArrowUpRightIcon /></Link></footer>
    </main>
  );
}

function ArrowUpRightIcon() {
  return <ArrowRight size={13} />;
}

export function MartheExperience() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileName, setProfileName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authMode, setAuthMode] = useState<"register" | "login">("register");
  const [authError, setAuthError] = useState("");
  const [authBusy, setAuthBusy] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Profile["role"]>("student");
  const [records, setRecords] = useState<ActivityRecord[]>([]);
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [adminSearch, setAdminSearch] = useState("");
  const [adminRoleFilter, setAdminRoleFilter] = useState<"all" | "student" | "teacher">("all");
  const [selectedAdminUserId, setSelectedAdminUserId] = useState<string | null>(null);
  const [editingAdminUser, setEditingAdminUser] = useState<AdminUser | null>(null);
  const [adminDataLoading, setAdminDataLoading] = useState(true);
  const [adminForm, setAdminForm] = useState({ name: "", email: "", role: "student" as Profile["role"], password: "" });
  const [adminBusy, setAdminBusy] = useState(false);
  const [adminError, setAdminError] = useState("");
  const [adminNotice, setAdminNotice] = useState("");
  const [deleteCandidate, setDeleteCandidate] = useState<AdminUser | null>(null);
  const [started, setStarted] = useState(false);
  const [resources, setResources] = useState<Resources>(initialResources);
  const [builtModules, setBuiltModules] = useState<ModuleId[]>([]);
  const [activeModule, setActiveModule] = useState<Module | null>(null);
  const [selectedModuleId, setSelectedModuleId] = useState<ModuleId>("habitat");
  const [mapZoom, setMapZoom] = useState(1);
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState<"correct" | "wrong" | "victory" | null>(null);
  const [day, setDay] = useState(1);
  const [finalStep, setFinalStep] = useState(0);
  const [campaignComplete, setCampaignComplete] = useState(false);
  const [showEpilogue, setShowEpilogue] = useState(false);
  const [progressSaveError, setProgressSaveError] = useState("");
  const [soundOn, setSoundOn] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [progressReady, setProgressReady] = useState(false);

  const persistProgressSnapshot = useCallback(async (progress: ProgressSnapshot) => {
    if (!profile || profile.role !== "student") return;

    try {
      localStorage.setItem(`marthe-progress-${profile.id}`, JSON.stringify(progress));
    } catch (error) {
      console.error("Local progress save error:", error);
    }

    try {
      const response = await fetch("/api/progress", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(progress),
      });
      const data: { error?: string } | null = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error ?? "Não foi possível salvar o progresso.");
      setProgressSaveError("");
    } catch (error) {
      console.error("Progress save error:", error);
      setProgressSaveError("Não foi possível sincronizar o progresso. A cópia local foi mantida.");
    }
  }, [profile]);

  function resetTransientModalState() {
    setActiveModule(null);
    setFeedback(null);
    setAnswer("");
    setEditingAdminUser(null);
    setDeleteCandidate(null);
  }

  useEffect(() => {
    resetTransientModalState();
    setFinalStep(0);
    const requestedRole = new URLSearchParams(window.location.search).get("perfil");
    if (requestedRole === "professor") setSelectedRole("teacher");
    fetch("/api/auth/me").then(async (response) => {
      if (!response.ok) throw new Error("Não foi possível verificar sua sessão. Tente novamente.");
      return (await response.json()).user as Omit<Profile, "key"> | null;
    }).then(async (user) => {
      if (user) {
        const nextProfile: Profile = { ...user, key: user.id };
        setProfile(nextProfile);
        await restoreProgress(nextProfile);
        setEmail(user.email);
        if (user.role === "teacher") {
          setAdminDataLoading(true);
          try {
            await loadAdminData();
          } catch (error) {
            setAdminError(error instanceof Error ? error.message : "Não foi possível carregar os dados administrativos.");
          } finally {
            setAdminDataLoading(false);
          }
        } else {
          setAdminDataLoading(false);
          const response = await fetch("/api/activity");
          if (response.ok) setRecords((await response.json()).activities as ActivityRecord[]);
        }
      } else {
        setAdminDataLoading(false);
      }
    }).catch(() => setAuthError("Não foi possível conectar ao servidor. Tente novamente.")).finally(() => setLoaded(true));
  }, []);

  useEffect(() => {
    if (!loaded || !progressReady || !profile || profile.role !== "student") return;
    const progress = { started, resources, builtModules, day, finalStep, campaignComplete, showEpilogue };
    const timeout = window.setTimeout(() => { void persistProgressSnapshot(progress); }, 350);
    return () => window.clearTimeout(timeout);
  }, [started, resources, builtModules, day, finalStep, campaignComplete, showEpilogue, loaded, progressReady, profile, persistProgressSnapshot]);

  async function loadAdminData() {
    const response = await fetch("/api/admin/users");
    const data: { users?: AdminUser[]; activities?: ActivityRecord[]; error?: string } | null = await response.json().catch(() => null);
    if (!response.ok) throw new Error(data?.error ?? "Não foi possível carregar os dados administrativos.");
    if (!data?.users || !data.activities) throw new Error("O servidor retornou dados administrativos inválidos.");
    const { users, activities } = data;
    setAdminError("");
    setAdminUsers(users);
    setRecords(activities);
    setSelectedAdminUserId((current) => current && users.some((user) => user.id === current) ? current : users[0]?.id ?? null);
  }

  async function restoreProgress(user: Profile) {
    if (user.role !== "student") { setProgressReady(false); return; }
    const oldKey = user.name.toLocaleLowerCase("pt-BR").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-");
    const localProgress = readStored<ProgressSnapshot>(`marthe-progress-${user.id}`, readStored(`marthe-progress-${oldKey}`, { started: false, resources: initialResources, builtModules: [], day: 1, finalStep: 0, campaignComplete: false, showEpilogue: false }));
    let saved = localProgress;
    try {
      const response = await fetch("/api/progress");
      if (response.ok) {
        const data = await response.json();
        if (data.progress) {
          saved = data.progress;
        } else if (localProgress.started || localProgress.builtModules.length > 0) {
          const syncResponse = await fetch("/api/progress", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(localProgress),
          });
          if (!syncResponse.ok) {
            const syncError = await syncResponse.json().catch(() => null);
            throw new Error(syncError?.error ?? "Não foi possível sincronizar o progresso local.");
          }
        }
      } else {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error ?? "Não foi possível carregar o progresso salvo.");
      }
    } catch (error) {
      console.error("Progress load error:", error);
      setProgressSaveError("Não foi possível sincronizar o progresso. A cópia local foi carregada.");
    }
    setStarted(saved.started);
    setResources(saved.resources);
    setBuiltModules(saved.builtModules);
    setDay(saved.day);
    const restoredFinalStep = Math.max(0, saved.finalStep ?? 0);
    const hasCompletedFinalSteps = restoredFinalStep >= finalProblems.length;
    setFinalStep(Math.min(restoredFinalStep, finalProblems.length - 1));
    setCampaignComplete(saved.campaignComplete || hasCompletedFinalSteps);
    setShowEpilogue(saved.showEpilogue || hasCompletedFinalSteps);
    setProgressReady(true);
  }

  async function enterProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAuthBusy(true);
    setAuthError("");
    try {
      const response = await fetch(`/api/auth/${authMode === "register" ? "register" : "login"}`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: profileName, email, password, role: selectedRole }),
      });
      const contentType = response.headers.get("content-type") ?? "";
      const responseBody = await response.text();
      let data: { user?: Omit<Profile, "key">; error?: string; message?: string } | null = null;

      if (contentType.toLowerCase().includes("application/json") && responseBody.trim()) {
        try {
          const parsed: unknown = JSON.parse(responseBody);
          if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
            const result = parsed as Record<string, unknown>;
            data = {
              user: result.user as Omit<Profile, "key"> | undefined,
              error: typeof result.error === "string" ? result.error : undefined,
              message: typeof result.message === "string" ? result.message : undefined,
            };
          }
        } catch {
          data = null;
        }
      }

      if (!response.ok) {
        const detail = data?.error ?? data?.message ?? responseBody.trim().slice(0, 500);
        throw new Error(detail || "Não foi possível acessar sua conta.");
      }
      if (!data?.user) {
        const detail = data?.error ?? data?.message ?? responseBody.trim().slice(0, 500);
        throw new Error(detail || "O servidor retornou uma resposta inválida. Tente novamente.");
      }

      const nextProfile: Profile = { ...data.user, key: data.user.id };
      setProfile(nextProfile);
      await restoreProgress(nextProfile);
      if (nextProfile.role === "teacher") {
        setAdminDataLoading(true);
        try {
          await loadAdminData();
        } catch (error) {
          console.error("Erro ao carregar painel docente:", error);
          setAdminError(error instanceof Error ? error.message : "Não foi possível carregar os dados administrativos.");
        } finally {
          setAdminDataLoading(false);
        }
      } else {
        setAdminDataLoading(false);
        const activityResponse = await fetch("/api/activity");
        if (activityResponse.ok) setRecords((await activityResponse.json()).activities as ActivityRecord[]);
      }
    } catch (error) {
      console.error("Erro ao acessar a conta:", error);
      const message = error instanceof Error ? error.message : "Não foi possível acessar sua conta.";
      if (profile?.role === "teacher") {
        setAdminError(message);
        setAdminDataLoading(false);
      } else {
        setAuthError(message);
      }
    } finally {
      setAuthBusy(false);
    }
  }

  function beginEditUser(user: AdminUser) {
    setEditingAdminUser(user);
    setAdminForm({ name: user.name, email: user.email, role: user.role, password: "" });
    setAdminError("");
    setAdminNotice("");
  }

  async function saveAdminUser(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingAdminUser) return;
    setAdminBusy(true);
    setAdminError("");
    try {
      const response = await fetch(`/api/admin/users/${editingAdminUser.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(adminForm),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Não foi possível atualizar a conta.");
      await loadAdminData();
      setEditingAdminUser(null);
      setAdminNotice("Conta atualizada.");
    } catch (error) {
      setAdminError(error instanceof Error ? error.message : "Não foi possível atualizar a conta.");
    } finally {
      setAdminBusy(false);
    }
  }

  async function deleteAdminUser() {
    if (!deleteCandidate) return;
    setAdminBusy(true);
    setAdminError("");
    try {
      const response = await fetch(`/api/admin/users/${deleteCandidate.id}`, { method: "DELETE" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Não foi possível remover a conta.");
      const removedName = deleteCandidate.name;
      setDeleteCandidate(null);
      await loadAdminData();
      setAdminNotice(`A conta de ${removedName} e seus dados foram removidos.`);
    } catch (error) {
      setAdminError(error instanceof Error ? error.message : "Não foi possível remover a conta.");
    } finally {
      setAdminBusy(false);
    }
  }

  async function leaveProfile() {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => undefined);
    setProfile(null);
    setProgressReady(false);
    resetTransientModalState();
    setFinalStep(0);
    setCampaignComplete(false);
    setShowEpilogue(false);
    setProgressSaveError("");
  }

  function openChallenge(module: Module) {
    setSelectedModuleId(module.id);
    setActiveModule(module);
    setAnswer("");
    setFeedback(null);
  }

  async function submitAnswer(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!profile || profile.role !== "student") return;
    const finalProblem = finalProblems[finalStep];
    const isFinal = activeModule === null && finalProblem !== undefined && builtModules.length === modules.length;
    const phaseName = activeModule?.name ?? finalProblem?.phase;
    const expectedAnswer = activeModule?.challenge.answer ?? finalProblem?.answer;
    if (expectedAnswer === undefined) return;
    const correct = Number(answer.replace(",", ".")) === expectedAnswer;
    fetch("/api/activity", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ phase: phaseName ?? "Desafio", answer, correct }) })
      .then(async (response) => {
        if (!response.ok) return;
        const data = await response.json();
        setRecords((current) => [data.activity as ActivityRecord, ...current].slice(0, 500));
      }).catch(() => undefined);
    if (!correct) {
      setFeedback("wrong");
      return;
    }
    if (isFinal) {
      const nextCampaignComplete = finalStep === finalProblems.length - 1;
      await persistProgressSnapshot({
        started: true,
        resources,
        builtModules,
        day,
        finalStep,
        campaignComplete: nextCampaignComplete,
        showEpilogue: nextCampaignComplete || showEpilogue,
      });
      if (finalStep === finalProblems.length - 1) {
        setCampaignComplete(true);
        setFeedback(null);
        setActiveModule(null);
        setShowEpilogue(true);
      } else {
        setFinalStep((current) => current + 1);
        setFeedback("correct");
      }
      setAnswer("");
      return;
    }
    if (!activeModule) return;
    const nextResources = { ...resources };
    Object.entries(activeModule.cost).forEach(([key, amount]) => {
      nextResources[key as ResourceKey] -= amount ?? 0;
    });
    Object.entries(activeModule.reward).forEach(([key, amount]) => {
      nextResources[key as ResourceKey] += amount ?? 0;
    });
    const nextBuiltModules = [...builtModules, activeModule.id];
    await persistProgressSnapshot({
      started: true,
      resources: nextResources,
      builtModules: nextBuiltModules,
      day: day + 1,
      finalStep,
      campaignComplete,
      showEpilogue,
    });
    setResources(nextResources);
    setBuiltModules(nextBuiltModules);
    setSelectedModuleId(modules[builtModules.length + 1]?.id ?? activeModule.id);
    setDay((current) => current + 1);
    setFeedback("correct");
  }

  function resetGame() {
    setStarted(false);
    setResources(initialResources);
    setBuiltModules([]);
    setDay(1);
    setFinalStep(0);
    setCampaignComplete(false);
    setShowEpilogue(false);
    setActiveModule(null);
  }

  function startExpedition() {
    setStarted(true);
    setDay((current) => current === 1 ? 1 : current);
  }

  const progress = Math.round((builtModules.length / modules.length) * 100);
  const currentFinalProblem = finalProblems[finalStep];

  if (!loaded) return <main className="opening-screen" aria-label="Carregando expedição" />;

  if (!profile) {
    return (
      <main className="opening-screen">
        <div className="opening-image" aria-hidden="true" /><div className="opening-grain" aria-hidden="true" />
        <header className="opening-nav"><Link className="wordmark" href="/"><span className="wordmark-mark">M</span> MARTHE</Link><span className="nav-coordinate">47°12′S&nbsp;&nbsp; 65°18′W</span><span className="signal-status"><span className="status-dot" /> SINAL ESTÁVEL</span></header>
        <section className="access-panel" id="acesso">
          <p className="eyebrow"><span /> CENTRO DE OPERAÇÕES · MARTE</p>
          <h1>{authMode === "register" ? <>Criar uma<br /><em>conta MARTHE.</em></> : <>Bom retorno<br /><em>à expedição.</em></>}</h1>
          <p className="access-description">{authMode === "register" ? "Cadastre seu perfil para salvar o progresso e acompanhar as atividades da missão." : "Entre com o e-mail e a senha da sua conta."}</p>
          <div className="auth-mode-switch" aria-label="Acesso à conta"><button type="button" className={authMode === "register" ? "auth-mode-active" : ""} onClick={() => { setAuthMode("register"); setAuthError(""); }}>CRIAR CONTA</button><button type="button" className={authMode === "login" ? "auth-mode-active" : ""} onClick={() => { setAuthMode("login"); setAuthError(""); }}>JÁ TENHO CONTA</button></div>
          <div className="role-switch" aria-label="Perfil da conta"><button type="button" className={selectedRole === "student" ? "role-selected" : ""} onClick={() => { setSelectedRole("student"); setAuthError(""); }}><UserRound size={15} /> ESTUDANTE</button><button type="button" className={selectedRole === "teacher" ? "role-selected" : ""} onClick={() => { setSelectedRole("teacher"); setAuthError(""); }}><GraduationCap size={16} /> PROFESSOR</button></div>
          <form className="access-form" onSubmit={enterProfile}>
            {authMode === "register" && <><label htmlFor="profile-name">NOME COMPLETO</label><input id="profile-name" autoComplete="name" value={profileName} onChange={(event) => setProfileName(event.target.value)} placeholder="Seu nome" required maxLength={48} /></>}
            <label htmlFor="profile-email">E-MAIL</label><input id="profile-email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="voce@exemplo.com" required maxLength={120} />
            <label htmlFor="profile-password">SENHA {authMode === "register" && <span>· MÍNIMO 4 CARACTERES</span>}</label><input id="profile-password" type="password" autoComplete={authMode === "register" ? "new-password" : "current-password"} value={password} onChange={(event) => setPassword(event.target.value)} placeholder={authMode === "register" ? "Crie uma senha" : "Sua senha"} required minLength={authMode === "register" ? 4 : 1} maxLength={128} />
            {authError && <p className="auth-error" role="alert">{authError}</p>}
            <button className="launch-button" type="submit" disabled={authBusy}>{authBusy ? "AGUARDE..." : authMode === "register" ? "CRIAR CONTA" : "ENTRAR"} <ArrowRight size={16} /></button>
          </form>
          <p className="access-note"><LockKeyhole size={12} /> SENHA PROTEGIDA · CONTA {selectedRole === "student" ? "DE ESTUDANTE" : "DOCENTE"}</p>
        </section>
        <div className="opening-bottom"><span>UMA MISSÃO DE GEOMETRIA ESPACIAL</span><ArrowDown size={15} /><span>VOLUME I — SOBREVIVÊNCIA</span></div>
      </main>
    );
  }

  if (profile.role === "teacher") {
    if (adminDataLoading) {
      return <main className="game-screen admin-screen" aria-busy="true">
        <header className="game-topbar"><a className="wordmark game-wordmark" href="#painel"><span className="wordmark-mark">M</span> MARTHE</a><div className="mission-title"><span className="mission-kicker">DOCENTE</span><span>Administração</span></div><div className="topbar-right"><span className="sol-counter">PERFIL <strong>PROFESSOR</strong></span></div></header>
        <section className="admin-content" id="painel">
          <div className="admin-heading"><div><p className="eyebrow"><span /> CENTRO DE ADMINISTRAÇÃO</p><h1>Gestão da <em>expedição.</em></h1><p role="status">Verificando seu perfil docente e carregando os dados.</p></div></div>
          <div className="admin-loading-metrics" aria-hidden="true">{Array.from({ length: 4 }, (_, index) => <div className="admin-loading-card" key={index} />)}</div>
          <div className="admin-loading-table" aria-hidden="true"><div /><div /><div /><div /></div>
        </section>
      </main>;
    }

    const studentRecords = records.filter((record) => record.kind === "answer");
    const correctCount = studentRecords.filter((record) => record.correct).length;
    const wrongCount = studentRecords.length - correctCount;
    const students = adminUsers.filter((user) => user.role === "student");
    const filteredUsers = adminUsers.filter((user) => {
      const matchesRole = adminRoleFilter === "all" || user.role === adminRoleFilter;
      const query = adminSearch.trim().toLocaleLowerCase("pt-BR");
      const matchesQuery = !query || `${user.name} ${user.email}`.toLocaleLowerCase("pt-BR").includes(query);
      return matchesRole && matchesQuery;
    });
    const selectedUser = adminUsers.find((user) => user.id === selectedAdminUserId) ?? null;
    const selectedActivities = selectedUser ? records.filter((record) => record.userId === selectedUser.id).slice(0, 8) : [];
    const accuracy = studentRecords.length ? Math.round((correctCount / studentRecords.length) * 100) : 0;
    const userAccuracy = selectedUser && selectedUser.correctCount + selectedUser.incorrectCount
      ? Math.round((selectedUser.correctCount / (selectedUser.correctCount + selectedUser.incorrectCount)) * 100)
      : 0;
    return <main className="game-screen admin-screen">
      <header className="game-topbar"><a className="wordmark game-wordmark" href="#painel"><span className="wordmark-mark">M</span> MARTHE</a><div className="mission-title"><span className="mission-kicker">DOCENTE</span><span>Administração</span></div><div className="topbar-right"><span className="sol-counter">PERFIL <strong>PROFESSOR</strong></span><button className="icon-button" title="Sair do painel" aria-label="Sair do painel" onClick={leaveProfile}><LogOut size={16} /></button></div></header>
      <section className="admin-content" id="painel">
        <div className="admin-heading"><div><p className="eyebrow"><span /> CENTRO DE ADMINISTRAÇÃO</p><h1>Gestão da <em>expedição.</em></h1><p>Contas, andamento e resultados da Base Asterion.</p></div><button className="admin-refresh" onClick={() => { setAdminBusy(true); loadAdminData().catch((error) => setAdminError(error.message)).finally(() => setAdminBusy(false)); }} disabled={adminBusy}><RotateCcw size={14} /> ATUALIZAR</button></div>
        {adminNotice && <p className="admin-notice" role="status"><Check size={14} /> {adminNotice}<button aria-label="Fechar aviso" onClick={() => setAdminNotice("")}><X size={14} /></button></p>}
        {adminError && !editingAdminUser && !deleteCandidate && <p className="admin-error" role="alert">{adminError}</p>}
        <div className="admin-metrics"><article><span>USUÁRIOS</span><strong>{adminUsers.length}</strong><small>{students.length} estudantes · {adminUsers.length - students.length} professores</small></article><article><span>RESPOSTAS CERTAS</span><strong>{correctCount}</strong><small>{accuracy}% de aproveitamento geral</small></article><article><span>RESPOSTAS INCORRETAS</span><strong>{wrongCount}</strong><small>tentativas para acompanhar</small></article><article><span>EXPEDIÇÕES CONCLUÍDAS</span><strong>{students.filter((user) => user.progress?.complete).length}</strong><small>de {students.length} estudantes</small></article></div>

        <div className="admin-workspace">
          <section className="admin-users-section" aria-labelledby="users-heading">
            <div className="admin-section-heading"><div><p className="eyebrow">CADASTROS E ANDAMENTO</p><h2 id="users-heading">Usuários</h2></div><span>{filteredUsers.length} DE {adminUsers.length}</span></div>
            <div className="admin-user-tools"><label className="admin-search"><UserRound size={15} /><input type="search" value={adminSearch} onChange={(event) => setAdminSearch(event.target.value)} placeholder="Buscar por nome ou e-mail" aria-label="Buscar usuários" /></label><div className="admin-filter" aria-label="Filtrar por perfil"><button className={adminRoleFilter === "all" ? "filter-active" : ""} onClick={() => setAdminRoleFilter("all")}>TODOS</button><button className={adminRoleFilter === "student" ? "filter-active" : ""} onClick={() => setAdminRoleFilter("student")}>ESTUDANTES</button><button className={adminRoleFilter === "teacher" ? "filter-active" : ""} onClick={() => setAdminRoleFilter("teacher")}>PROFESSORES</button></div></div>
            {filteredUsers.length === 0 ? <div className="empty-records"><BookOpen size={19} /><p>{adminUsers.length ? "Nenhum usuário corresponde à busca." : "Ainda não há contas cadastradas."}</p></div> : <div className="admin-user-table-wrap"><table className="admin-user-table"><thead><tr><th>CONTA</th><th>PERFIL</th><th>ANDAMENTO</th><th>RESULTADOS</th><th>ÚLTIMO ACESSO</th><th><span className="sr-only">Ações</span></th></tr></thead><tbody>{filteredUsers.map((user) => {
              const userTotal = user.correctCount + user.incorrectCount;
              const userRate = userTotal ? Math.round((user.correctCount / userTotal) * 100) : 0;
              const progressPercent = user.progress ? Math.round((user.progress.builtCount / modules.length) * 100) : 0;
              return <tr key={user.id} className={selectedUser?.id === user.id ? "admin-user-selected" : ""} onClick={() => setSelectedAdminUserId(user.id)}>
                <td><button className="admin-user-name" onClick={() => setSelectedAdminUserId(user.id)}><strong>{user.name}</strong><span>{user.email}</span></button></td>
                <td><span className={`account-role role-${user.role}`}>{user.role === "student" ? "ESTUDANTE" : "PROFESSOR"}</span></td>
                <td>{user.role === "student" ? <div className="user-progress"><div><span>{user.progress?.complete ? "CONCLUÍDA" : user.progress?.started ? "EM ANDAMENTO" : "NÃO INICIADA"}</span><strong>{user.progress?.builtCount ?? 0}/04</strong></div><i><b style={{ width: `${progressPercent}%` }} /></i></div> : <span className="teacher-access-label">PAINEL DOCENTE</span>}</td>
                <td>{user.role === "student" ? <span className="user-score"><strong>{user.correctCount}</strong> certas <i>·</i> <strong>{user.incorrectCount}</strong> erros <small>{userTotal ? `${userRate}%` : "—"}</small></span> : <span className="user-muted">—</span>}</td>
                <td><span className="user-last-seen">{user.lastActivityAt ? new Date(user.lastActivityAt).toLocaleDateString("pt-BR") : "Sem atividade"}</span></td>
                <td><button className="table-edit-button" aria-label={`Editar ${user.name}`} title="Editar conta" onClick={(event) => { event.stopPropagation(); beginEditUser(user); }}><ClipboardList size={15} /></button></td>
              </tr>;
            })}</tbody></table></div>}
          </section>

          <aside className="admin-user-details" aria-live="polite">
            {selectedUser ? <>
              <div className="admin-detail-heading"><div><p className="eyebrow">FICHA DA CONTA</p><h2>{selectedUser.name}</h2><span>{selectedUser.email}</span><small className="account-metadata">CADASTRO {new Date(selectedUser.createdAt).toLocaleDateString("pt-BR")} · {selectedUser.accessCount} ACESSOS</small></div><span className={`account-role role-${selectedUser.role}`}>{selectedUser.role === "student" ? "ESTUDANTE" : "PROFESSOR"}</span></div>
              {selectedUser.role === "student" ? <><div className="detail-progress"><div><span>PROGRESSO DA EXPEDIÇÃO</span><strong>{selectedUser.progress?.builtCount ?? 0} / 04 FASES</strong></div><i><b style={{ width: `${Math.round(((selectedUser.progress?.builtCount ?? 0) / modules.length) * 100)}%` }} /></i><small>{selectedUser.progress?.complete ? "Missão concluída" : selectedUser.progress?.started ? `Sol ${selectedUser.progress.day} · em andamento` : "Aguardando início"}</small></div><div className="student-phase-list">{modules.map((module, index) => { const phaseState = index < (selectedUser.progress?.builtCount ?? 0) ? "phase-complete" : index === (selectedUser.progress?.builtCount ?? 0) && selectedUser.progress?.started ? "phase-current" : "phase-locked"; return <div className={`student-phase ${phaseState}`} key={module.id}><span>{index < (selectedUser.progress?.builtCount ?? 0) ? <Check size={11} /> : String(index + 1).padStart(2, "0")}</span><strong>{module.name}</strong><small>{phaseState === "phase-complete" ? "CONCLUÍDA" : phaseState === "phase-current" ? "ETAPA ATUAL" : "BLOQUEADA"}</small></div>; })}<div className={`student-phase ${(selectedUser.progress?.finalStep ?? 0) > 0 ? "phase-current" : "phase-locked"}`}><span>{selectedUser.progress?.complete ? <Check size={11} /> : "05"}</span><strong>Estabilizar o oxigênio</strong><small>{selectedUser.progress?.complete ? "CONCLUÍDA" : (selectedUser.progress?.finalStep ?? 0) > 0 ? `${selectedUser.progress?.finalStep}/04 ETAPAS` : "BLOQUEADA"}</small></div></div>{selectedUser.progress?.started && selectedUser.progress.resources && <div className="student-resources"><span>ESTOQUE ATUAL · SOL {selectedUser.progress.day}</span><div>{(Object.keys(resourceMeta) as ResourceKey[]).map((key) => <span key={key}>{resourceMeta[key].label} <strong>{selectedUser.progress?.resources[key]} {resourceMeta[key].unit}</strong></span>)}</div></div>}<div className="detail-stats"><article><span>ACERTOS</span><strong>{selectedUser.correctCount}</strong></article><article><span>ERROS</span><strong>{selectedUser.incorrectCount}</strong></article><article><span>APROVEITAMENTO</span><strong>{userAccuracy}%</strong></article></div></> : <p className="teacher-detail-note">Conta docente com acesso ao painel de acompanhamento.</p>}
              <div className="admin-detail-actions"><button className="detail-edit-button" onClick={() => beginEditUser(selectedUser)}><ClipboardList size={14} /> EDITAR CONTA</button><button className="detail-delete-button" disabled={selectedUser.id === profile.id} title={selectedUser.id === profile.id ? "Não é possível excluir a própria conta" : "Remover conta e dados"} onClick={() => { setAdminError(""); setDeleteCandidate(selectedUser); }}><X size={14} /> REMOVER</button></div>
              <div className="student-activity-heading"><span>ATIVIDADE RECENTE</span><small>{selectedActivities.length} REGISTROS</small></div>
              {selectedActivities.length ? <div className="student-activity-list">{selectedActivities.map((record) => <article key={record.id}><span className={`activity-status ${record.kind === "access" ? "access-status" : record.correct ? "correct-status" : "wrong-status"}`}>{record.kind === "access" ? <UserRound size={12} /> : record.correct ? <Check size={12} /> : <X size={12} />}</span><div><strong>{record.kind === "access" ? record.answer : record.phase}</strong><small>{record.kind === "access" ? "Acesso" : `${record.correct ? "Acerto" : "Erro"} · resposta ${record.answer}`}</small></div><time>{new Date(record.at).toLocaleDateString("pt-BR")}</time></article>)}</div> : <p className="student-no-activity">Nenhuma atividade registrada para esta conta.</p>}
            </> : <div className="empty-records admin-select-empty"><UserRound size={20} /><p>Selecione uma conta para ver o progresso e administrar o acesso.</p></div>}
          </aside>
        </div>

        <section className="admin-table-section admin-global-activity"><div className="admin-section-heading"><div><p className="eyebrow">ACOMPANHAMENTO DA TURMA</p><h2>Atividade recente</h2></div><span>{records.length} EVENTOS</span></div>{records.length === 0 ? <div className="empty-records"><BookOpen size={19} /><p>Ainda não há acessos ou cálculos registrados.</p></div> : <div className="activity-list">{records.slice(0, 12).map((record) => <article className="activity-row" key={record.id}><span className={`activity-status ${record.kind === "access" ? "access-status" : record.correct ? "correct-status" : "wrong-status"}`}>{record.kind === "access" ? <UserRound size={14} /> : record.correct ? <Check size={14} /> : <X size={14} />}</span><div className="activity-main"><strong>{record.name}</strong><span>{record.kind === "access" ? "Acessou o sistema" : record.phase}</span></div><div className="activity-result"><span>{record.kind === "access" ? "ACESSO" : record.correct ? "ACERTO" : "ERRO"}</span><strong>{record.answer}</strong></div><time>{new Date(record.at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}</time></article>)}</div>}</section>
        <footer className="admin-footer"><span><span className="status-dot" /> CONTAS E ATIVIDADES SALVAS NO SERVIDOR</span><button onClick={leaveProfile}>SAIR <ArrowRight size={13} /></button></footer>
      </section>

      {editingAdminUser && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !adminBusy) setEditingAdminUser(null); }}><section className="admin-dialog" role="dialog" aria-modal="true" aria-labelledby="edit-account-title"><button className="modal-close icon-button" aria-label="Fechar edição" onClick={() => setEditingAdminUser(null)}><X size={16} /></button><p className="eyebrow"><span /> ADMINISTRAÇÃO DE CONTAS</p><h2 id="edit-account-title">Editar usuário</h2><form className="admin-edit-form" onSubmit={saveAdminUser}><label htmlFor="edit-user-name">NOME</label><input id="edit-user-name" value={adminForm.name} onChange={(event) => setAdminForm({ ...adminForm, name: event.target.value })} minLength={2} maxLength={48} required /><label htmlFor="edit-user-email">E-MAIL</label><input id="edit-user-email" type="email" value={adminForm.email} onChange={(event) => setAdminForm({ ...adminForm, email: event.target.value })} required /><label htmlFor="edit-user-role">PERFIL</label><select id="edit-user-role" value={adminForm.role} disabled={editingAdminUser.id === profile.id} onChange={(event) => setAdminForm({ ...adminForm, role: event.target.value as Profile["role"] })}><option value="student">Estudante</option><option value="teacher">Professor</option></select><label htmlFor="edit-user-password">DEFINIR NOVA SENHA <span>· OPCIONAL, MÍNIMO 4 CARACTERES</span></label><input id="edit-user-password" type="password" autoComplete="new-password" value={adminForm.password} onChange={(event) => setAdminForm({ ...adminForm, password: event.target.value })} minLength={4} maxLength={128} placeholder="Deixe em branco para manter" />{adminError && <p className="auth-error" role="alert">{adminError}</p>}<div className="admin-dialog-actions"><button type="button" className="epilogue-replay" onClick={() => setEditingAdminUser(null)} disabled={adminBusy}>CANCELAR</button><button className="launch-button" type="submit" disabled={adminBusy}>{adminBusy ? "SALVANDO..." : "SALVAR ALTERAÇÕES"} <Check size={15} /></button></div></form></section></div>}

      {deleteCandidate && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !adminBusy) setDeleteCandidate(null); }}><section className="admin-dialog delete-dialog" role="alertdialog" aria-modal="true" aria-labelledby="delete-account-title"><button className="modal-close icon-button" aria-label="Fechar confirmação" onClick={() => setDeleteCandidate(null)}><X size={16} /></button><p className="eyebrow"><span /> REMOÇÃO DEFINITIVA</p><h2 id="delete-account-title">Remover {deleteCandidate.name}?</h2><p className="delete-warning">A conta, o progresso salvo, as sessões e o histórico de atividades desta pessoa serão apagados permanentemente.</p>{adminError && <p className="auth-error" role="alert">{adminError}</p>}<div className="admin-dialog-actions"><button className="epilogue-replay" onClick={() => setDeleteCandidate(null)} disabled={adminBusy}>CANCELAR</button><button className="confirm-delete-button" onClick={deleteAdminUser} disabled={adminBusy}>{adminBusy ? "REMOVENDO..." : "SIM, REMOVER CONTA"}</button></div></section></div>}
    </main>;
  }

  if (!started) {
    return (
      <main className="opening-screen">
        <div className="opening-image" aria-hidden="true" />
        <div className="opening-grain" aria-hidden="true" />
        <header className="opening-nav">
          <a className="wordmark" href="#inicio" aria-label="MARTHE início"><span className="wordmark-mark">M</span> MARTHE</a>
          <span className="nav-coordinate">47°12′S&nbsp;&nbsp; 65°18′W</span>
          <button className="profile-chip" onClick={leaveProfile}><UserRound size={14} /> {profile.name} <LogOut size={13} /></button>
        </header>
        <section className="opening-copy mission-briefing" id="inicio">
          <p className="eyebrow opening-eyebrow"><span /> ALERTA 01 · BASE ASTERION · SOL {String(day).padStart(3, "0")}</p>
          <h1>A tempestade<br />rompeu a linha<br /><em>de oxigênio.</em></h1>
          <p className="briefing-lead">Quatro tripulantes precisam recuperar a base antes que a reserva acabe.</p>
          <div className="briefing-board"><article><span>O PROBLEMA</span><p>Uma válvula danificada está esvaziando o tanque.</p></article><article><span>SUA MISSÃO</span><p>Construa os módulos e calcule quanto oxigênio restará.</p></article></div>
          <div className="briefing-objectives"><span><i>01</i><b>DIMENSIONE</b> as estruturas</span><span><i>02</i><b>RECONSTRUA</b> a base</span><span><i>03</i><b>RESOLVA</b> a reserva final</span></div>
          <button className="launch-button" onClick={startExpedition}>COMEÇAR MISSÃO <ArrowRight size={17} strokeWidth={1.8} /></button>
          <div className="opening-footnote"><span>COMANDANTE {profile.name.toLocaleUpperCase("pt-BR")}</span><span className="footnote-rule" /><span>4 ETAPAS · 1 DECISÃO</span></div>
        </section>
        <div className="opening-side-note">MONS OLYMPUS&nbsp; · &nbsp; ALTITUDE 21.9 KM</div>
        <div className="opening-bottom"><span>UMA MISSÃO DE GEOMETRIA ESPACIAL</span><ArrowDown size={15} /><span>VOLUME I — SOBREVIVÊNCIA</span></div>
      </main>
    );
  }

  if (showEpilogue && campaignComplete) {
    return (
      <main className="epilogue-screen">
        <div className="epilogue-landscape" aria-hidden="true" />
        <header className="epilogue-header"><Link className="wordmark" href="/"><span className="wordmark-mark">M</span> MARTHE</Link><span className="epilogue-status"><span className="status-dot" /> TRANSMISSÃO ESTÁVEL</span><button className="profile-chip" onClick={leaveProfile}><UserRound size={14} /> {profile.name} <LogOut size={13} /></button></header>
        <section className="epilogue-copy"><p className="eyebrow"><span /> RELATÓRIO FINAL · BASE ASTERION · SOL {String(day).padStart(3, "0")}</p><h1>Lar,<br /><em>enfim.</em></h1><p className="epilogue-message">A válvula foi isolada. A reserva de oxigênio sustenta os quatro tripulantes, e a Base Asterion está pronta para atravessar a noite marciana.</p><p className="epilogue-quote">“A gente não só chegou a Marte. A gente fez dele casa.”<span>— COMANDANTE DA ASTERION</span></p><div className="epilogue-results"><article><span>OXIGÊNIO SEGURO</span><strong>20 <small>m³</small></strong><p>após perdas e consumo</p></article><article><span>ESTRUTURAS ATIVAS</span><strong>04 <small>/ 04</small></strong><p>base pronta para a tripulação</p></article><article><span>TRIPULANTES</span><strong>04 <small>/ 04</small></strong><p>todos em segurança</p></article></div><div className="epilogue-actions"><button className="launch-button" onClick={() => setShowEpilogue(false)}>REVER A BASE <ArrowRight size={16} /></button><button className="epilogue-replay" onClick={resetGame}><RotateCcw size={15} /> NOVA EXPEDIÇÃO</button></div></section>
        <footer className="epilogue-footer"><span>MISSÃO CONCLUÍDA</span><span>AMAZONIS PLANITIA · MARTE</span></footer>
      </main>
    );
  }

  return (
    <main className="game-screen">
      <header className="game-topbar">
        <a className="wordmark game-wordmark" href="#base"><span className="wordmark-mark">M</span> MARTHE</a>
        <div className="mission-title"><span className="mission-kicker">MISSÃO 01</span><span>Base Asterion</span></div>
        <div className="topbar-right"><span className="sol-counter">SOL <strong>{String(day).padStart(3, "0")}</strong></span><button className="icon-button" title="Reiniciar expedição" aria-label="Reiniciar expedição" onClick={resetGame}><RotateCcw size={16} /></button><button className="profile-chip game-profile" onClick={leaveProfile}><UserRound size={13} /> {profile.name}</button></div>
      </header>

      <section className="resource-strip" aria-label="Recursos da base">
        {(Object.keys(resourceMeta) as ResourceKey[]).map((key) => {
          const Icon = resourceMeta[key].icon;
          return <div className="resource-item" key={key}><span className={`resource-icon resource-${key}`}><Icon size={16} strokeWidth={1.7} /></span><span className="resource-name">{resourceMeta[key].label}</span><strong>{resources[key]}<small> {resourceMeta[key].unit}</small></strong></div>;
        })}
        <div className="crew-status"><span className="crew-dot" /> TRIPULAÇÃO <strong>04 / 04</strong></div>
      </section>

      <div className="game-layout" id="base">
        <section className="base-view" aria-label="Vista da base marciana">
          <div className="base-image" style={{ transform: `scale(${mapZoom})` }} />
          <div className="base-vignette" />
          <div className="view-toolbar"><span><span className="live-dot" /> AO VIVO · SETOR A-07</span><button className={`icon-button sound-button ${soundOn ? "sound-active" : ""}`} aria-label="Alternar som ambiente" title="Som ambiente" onClick={() => setSoundOn((value) => !value)}><Flame size={15} /></button></div>
          <div className="base-title"><p className="eyebrow"><span /> PLANO DE COLONIZAÇÃO</p><h1>Crie um lugar<br />para <em>ficar.</em></h1><p className="base-subtitle">Cada estrutura começa com uma pergunta.<br />Cada resposta mantém alguém vivo.</p></div>
          <div className="terrain-label terrain-one"><span>01</span> PLANÍCIE DE AMAZONIS</div><div className="terrain-label terrain-two"><span>02</span> DEPÓSITO DE GELO</div>
          <div className="base-grid" aria-hidden="true" />
          <div className="base-modules">
            {modules.map((module) => {
              const Icon = module.icon;
              const built = builtModules.includes(module.id);
              const moduleIndex = modules.findIndex((item) => item.id === module.id);
              const unlocked = moduleIndex === builtModules.length;
              const affordable = canAfford(resources, module.cost);
              const selected = selectedModuleId === module.id;
              return <button key={module.id} type="button" className={`map-module map-${module.position} ${built ? "module-built" : ""} ${selected ? "module-selected" : ""}`} aria-label={`${module.name}${built ? ", operacional" : unlocked && affordable ? ", disponível para construir" : ", bloqueado"}`} aria-pressed={selected} onClick={() => { setSelectedModuleId(module.id); if (unlocked && affordable && !built) openChallenge(module); }}>
                <span className="module-visual">{built ? <Icon size={21} strokeWidth={1.4} /> : unlocked && affordable ? <Plus size={19} strokeWidth={1.4} /> : <LockKeyhole size={16} strokeWidth={1.4} />}</span>
                <span className="module-map-label">{built ? module.name : unlocked && affordable ? "TOQUE PARA CONSTRUIR" : "SETOR BLOQUEADO"}</span>
              </button>;
            })}
          </div>
          {(() => {
            const selected = modules.find((module) => module.id === selectedModuleId) ?? modules[0];
            const selectedIndex = modules.findIndex((module) => module.id === selected.id);
            const built = builtModules.includes(selected.id);
            const unlocked = selectedIndex === builtModules.length;
            const affordable = canAfford(resources, selected.cost);
            const SelectedIcon = selected.icon;
            return <div className="map-selection" aria-live="polite"><span className={`map-selection-icon ${built ? "selection-built" : ""}`}><SelectedIcon size={17} /></span><div className="map-selection-copy"><span>{built ? "ESTRUTURA OPERACIONAL" : unlocked ? "PRÓXIMA CONSTRUÇÃO" : `ETAPA ${String(selectedIndex + 1).padStart(2, "0")} · BLOQUEADA`}</span><strong>{selected.name}</strong><small>{built ? "Integrada à base" : `${selected.description} · ${selected.challenge.solid}`}</small></div><button type="button" className="map-selection-action" disabled={built || !unlocked || !affordable} onClick={() => openChallenge(selected)}>{built ? <Check size={16} /> : unlocked && affordable ? <ArrowRight size={16} /> : <LockKeyhole size={15} />}</button></div>;
          })()}
          <div className="map-coordinates">18.65°N&nbsp;&nbsp; 226.2°E <span>·</span> ELEV. −4.1 KM</div>
          <div className="map-zoom"><button aria-label="Ampliar mapa" disabled={mapZoom >= 1.35} onClick={() => setMapZoom((zoom) => Math.min(1.35, Number((zoom + 0.1).toFixed(1))))}><Plus size={14} /></button><button aria-label="Restaurar enquadramento" disabled={mapZoom === 1} onClick={() => setMapZoom(1)}><Maximize2 size={13} /></button></div>
          <div className="map-scale"><span>0</span><i /><span>200 m</span></div>
        </section>

        <aside className="mission-panel">
          <div className="panel-heading"><div><p className="eyebrow">PROTOCOLO DE SOBREVIVÊNCIA</p><h2>O que vamos construir?</h2></div><Shield size={19} strokeWidth={1.5} /></div>
          <div className="progress-block"><div className="progress-label"><span>PROGRESSO DA BASE</span><strong>{String(builtModules.length).padStart(2, "0")} <i>/ 04</i></strong></div><div className="progress-track"><span style={{ width: `${progress}%` }} /></div></div>
          <div className="module-list">
            {modules.map((module, index) => {
              const Icon = module.icon;
              const built = builtModules.includes(module.id);
              const moduleIndex = modules.findIndex((item) => item.id === module.id);
              const unlocked = moduleIndex === builtModules.length;
              const affordable = canAfford(resources, module.cost);
              return <article className={`module-row ${built ? "row-built" : ""}`} key={module.id}>
                <div className="module-index">0{index + 1}</div><div className={`module-icon ${built ? "module-icon-built" : ""}`}><Icon size={19} strokeWidth={1.5} /></div>
                <div className="module-copy"><h3>{module.name}</h3><p>{built ? "OPERACIONAL" : module.description}</p></div>
                {built ? <span className="built-check"><Check size={15} /></span> : <button className="module-action" disabled={!unlocked || !affordable} aria-label={`Construir ${module.name}`} title={!unlocked ? "Conclua a etapa anterior" : affordable ? `Construir ${module.name}` : "Recursos insuficientes"} onClick={() => openChallenge(module)}>{unlocked && affordable ? <ChevronRight size={17} /> : <LockKeyhole size={14} />}</button>}
              </article>;
            })}
          </div>
          {builtModules.length === modules.length ? <button className="final-mission-button" onClick={() => { if (campaignComplete) { setShowEpilogue(true); } else { setActiveModule(null); setAnswer(""); setFeedback(null); } }}><span><Shield size={17} /> {campaignComplete ? "RELATÓRIO DA MISSÃO" : "CRISE FINAL DESBLOQUEADA"}</span><strong>{campaignComplete ? "VER EPÍLOGO" : "ESTABILIZAR O OXIGÊNIO"}</strong><ArrowRight size={16} /></button> : <div className="daily-brief"><div className="brief-icon"><CircleHelp size={17} /></div><div><span>NOTA DA COMANDANTE</span><p>Volume é espaço. Espaço é ar. Ar é vida.</p></div></div>}
          {progressSaveError && <p className="admin-error progress-save-error" role="alert">{progressSaveError}</p>}
          <div className="panel-footer"><span><span className="status-dot" /> SISTEMAS NOMINAIS</span><button onClick={() => setStarted(false)}>VER DIÁRIO <ArrowRight size={13} /></button></div>
        </aside>
      </div>

      {started && (activeModule !== null || (builtModules.length === modules.length && finalStep < finalProblems.length && (!campaignComplete || feedback === "victory"))) && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) { setActiveModule(null); setFeedback(null); setAnswer(""); } }}>
        <section className="challenge-modal" role="dialog" aria-modal="true" aria-labelledby="challenge-title">
          <button className="modal-close icon-button" aria-label="Fechar desafio" onClick={() => { setActiveModule(null); setFeedback(null); }}><X size={17} /></button>
          {feedback === "victory" ? <div className="success-state"><div className="success-icon"><Check size={26} /></div><p className="eyebrow">TRANSMISSÃO DE EMERGÊNCIA · RESOLVIDA</p><h2 id="challenge-title">A base vai<br /><em>sobreviver.</em></h2><p>Restam 20 m³ de oxigênio após a tempestade e a demanda da tripulação. A válvula foi isolada, a reserva é suficiente e os quatro colonos estão seguros.</p><button className="launch-button" onClick={() => { setFeedback(null); setActiveModule(null); setShowEpilogue(true); }}>RECEBER RELATÓRIO FINAL <ArrowRight size={16} /></button></div> : feedback === "correct" ? <div className="success-state"><div className="success-icon"><Check size={26} /></div><p className="eyebrow">{activeModule ? "ESTRUTURA OPERACIONAL" : "ETAPA CONFIRMADA"}</p><h2 id="challenge-title">{activeModule ? <>Bom trabalho,<br /><em>comandante.</em></> : <>Cálculo<br /><em>confirmado.</em></>}</h2><p>{activeModule ? `${activeModule.name} construído. Recursos atualizados e tripulação protegida por mais um sol.` : "A resposta foi registrada. O próximo cálculo continua a investigação da reserva de oxigênio."}</p><button className="launch-button" onClick={() => { setFeedback(null); setActiveModule(null); }}>CONTINUAR <ArrowRight size={16} /></button></div> : <>
            <p className="eyebrow modal-eyebrow"><span /> {activeModule ? "DESAFIO DE CONSTRUÇÃO" : "RESOLUÇÃO DA CRISE · ETAPA FINAL"}</p><div className="challenge-number">{activeModule ? `0${modules.findIndex((module) => module.id === activeModule.id) + 1}` : `0${Math.min(finalStep + 1, finalProblems.length)}`} <span>/ {activeModule ? "GEOMETRIA ESPACIAL" : "OXIGÊNIO DA BASE"}</span></div>
            <h2 id="challenge-title">{activeModule?.name ?? currentFinalProblem?.phase ?? "MISSÃO CONCLUÍDA"}</h2>{activeModule ? <div className="solid-card"><span>SÓLIDO EM ANÁLISE</span><strong>{activeModule.challenge.solid}</strong><i>{activeModule.challenge.formula}</i></div> : <div className="final-step-track">{finalProblems.map((problem, index) => <span className={index < finalStep ? "step-done" : index === finalStep ? "step-current" : ""} key={problem.phase}>{String(index + 1).padStart(2, "0")}</span>)}</div>}
            <p className="challenge-question">{activeModule?.challenge.question ?? currentFinalProblem?.question ?? "Todas as etapas da missão foram concluídas."}</p>
            <form onSubmit={submitAnswer}><label className="answer-label" htmlFor="volume-answer">RESPOSTA <span>{activeModule ? `EM ${activeModule.challenge.unit}` : "EM m³"}</span></label><div className="answer-field"><input autoFocus id="volume-answer" inputMode="decimal" type="number" step="any" value={answer} onChange={(event) => { setAnswer(event.target.value); setFeedback(null); }} placeholder="0" /><span>{activeModule?.challenge.unit ?? "m³"}</span></div>
              {feedback === "wrong" && <p className="answer-feedback">Ainda não. Dica: {activeModule?.challenge.hint ?? currentFinalProblem?.hint ?? "Revise os resultados das etapas anteriores"}.</p>}
              {activeModule && <div className="cost-preview"><span>CUSTO DA ESTRUTURA</span>{(Object.entries(activeModule.cost) as [ResourceKey, number][]).map(([key, amount]) => <span className="cost-item" key={key}>{amount} {resourceMeta[key].unit} {resourceMeta[key].label.toLowerCase()}</span>)}</div>}
              <button className="solve-button" type="submit" disabled={!answer}>VALIDAR CÁLCULO <ArrowRight size={16} /></button>
            </form>
          </>}
        </section>
      </div>}
      <div className="game-bottom-note"><span>MARTHE / ARQUIVO DE EXPEDIÇÃO</span><span>GRAVIDADE 0,38 G</span></div>
    </main>
  );
}
