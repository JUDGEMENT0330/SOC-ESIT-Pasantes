
import React, { useState, useEffect, useContext, useMemo } from 'react';
import { DualTerminalView } from './components/DualTerminalView';
import { Auth } from './components/Auth';
import { supabase } from './supabaseClient';
import { GLOSSARY_TERMS, TRAINING_SCENARIOS, RESOURCE_MODULES, Icon, CisoCard, CisoTable } from './constants';
import type { TrainingScenario, ResourceModule, LogEntry, SessionData, InteractiveScenario, VirtualEnvironment } from './types';
// FIX: The `Session` type might not be exported directly in this version. Aliasing `AuthSession` is a common workaround.
import type { AuthSession as Session } from '@supabase/supabase-js';
import { SessionManager } from './components/SessionManager';
import { SimulationContext, SimulationProvider } from './SimulationContext';


// ============================================================================
// Main App Component
// ============================================================================

const ADMIN_EMAIL = process.env.VITE_ADMIN_EMAIL || 'alexmancia@cybervaltorix.com';

export default function App() {
    const [session, setSession] = useState<Session | null>(null);
    const [sessionData, setSessionData] = useState<SessionData | null>(null);
    const [completedScenarios, setCompletedScenarios] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAdmin, setIsAdmin] = useState(false);
    const [impersonatedTeam, setImpersonatedTeam] = useState<'red' | 'blue' | null>(null);

    // Effect for handling authentication state changes. Runs only once on mount.
    useEffect(() => {
        setLoading(true);
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setIsAdmin(session?.user?.email === ADMIN_EMAIL);
            setLoading(false);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            setIsAdmin(session?.user?.email === ADMIN_EMAIL);
            if (_event === 'SIGNED_OUT') {
                setSessionData(null);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    // Effect for fetching user progress. Runs only when the user logs in or out.
    useEffect(() => {
        if (session?.user?.id) {
            fetchProgress();
        } else {
            setCompletedScenarios([]);
        }
    }, [session?.user?.id]);

    const fetchProgress = async () => {
        if (!session?.user) return;
        try {
            const { data, error } = await supabase
                .from('user_progress')
                .select('completed_scenarios')
                .eq('id', session.user.id)
                .single();

            if (error && error.code !== 'PGRST116') {
                console.error('Error fetching progress:', error);
            }
            if (data) {
                setCompletedScenarios(data.completed_scenarios || []);
            }
        } catch (error) {
            console.error('Error fetching progress:', error);
        }
    };

    const updateProgress = async (scenarioId: string) => {
        if (!session?.user) return;
        
        const newCompleted = completedScenarios.includes(scenarioId)
            ? completedScenarios.filter(id => id !== scenarioId)
            : [...completedScenarios, scenarioId];

        setCompletedScenarios(newCompleted);

        try {
            const { error } = await supabase
                .from('user_progress')
                .upsert({ id: session.user.id, completed_scenarios: newCompleted });

            if (error) {
                console.error('Error updating progress:', error);
                setCompletedScenarios(completedScenarios);
            }
        } catch (error) {
             console.error('Error updating progress:', error);
             setCompletedScenarios(completedScenarios);
        }
    };

    const handleSetImpersonatedTeam = async (team: 'red' | 'blue' | null) => {
        if (!isAdmin || !sessionData || !session?.user) {
            console.error("No se puede suplantar la identidad: falta el estado de administrador, los datos de la sesión o la sesión del usuario.");
            return;
        }

        // We handle admin participation solely on the client-side to avoid 
        // calling non-existent RPC functions or complicating DB logic.
        // The admin view simply impersonates the UI state of the selected team.
        setImpersonatedTeam(team);
    };

    const handleExitSession = () => {
        setSessionData(null);
        setImpersonatedTeam(null);
    };

    const handleLogout = async () => {
        const { error } = await supabase.auth.signOut();
        if (error) {
            console.error('Error al cerrar sesión:', error);
        }
    };
    
     const effectiveSessionData = useMemo(() => {
        if (sessionData && isAdmin && impersonatedTeam) {
            return { ...sessionData, team: impersonatedTeam };
        }
        return sessionData;
    }, [isAdmin, impersonatedTeam, sessionData]);


    if (loading) {
        return <div className="flex items-center justify-center min-h-screen text-white">Cargando sesión...</div>;
    }

    if (!session || !session.user) {
        return <Auth />;
    }

    if (!effectiveSessionData) {
        return <SessionManager user={session.user} setSessionData={setSessionData} isAdmin={isAdmin} />;
    }

    return (
        <SimulationProvider sessionData={effectiveSessionData} key={effectiveSessionData.sessionId}>
            <MainApp 
                session={session}
                sessionData={effectiveSessionData} 
                completedScenarios={completedScenarios} 
                updateProgress={updateProgress}
                exitSession={handleExitSession}
                logout={handleLogout}
                isAdmin={isAdmin}
                setImpersonatedTeam={handleSetImpersonatedTeam}
            />
        </SimulationProvider>
    );
}

// ============================================================================
// Main Application View (for authenticated users)
// ============================================================================

interface MainAppProps {
    session: Session;
    sessionData: SessionData;
    completedScenarios: string[];
    updateProgress: (scenarioId: string) => void;
    exitSession: () => void;
    logout: () => void;
    isAdmin: boolean;
    setImpersonatedTeam: (team: 'red' | 'blue' | null) => Promise<void>;
}

const MainApp: React.FC<MainAppProps> = ({ session, sessionData, completedScenarios, updateProgress, exitSession, logout, isAdmin, setImpersonatedTeam }) => {
    const [activeTab, setActiveTab] = useState('terminal');
    const impersonatedTeam = sessionData.team === 'spectator' ? null : sessionData.team;

    return (
        <div className="flex flex-col min-h-screen font-sans">
            <Header 
                activeTab={activeTab} 
                sessionData={sessionData} 
                exitSession={exitSession} 
                logout={logout}
                isAdmin={isAdmin}
                impersonatedTeam={impersonatedTeam}
                setImpersonatedTeam={setImpersonatedTeam}
            />
            <main className="container mx-auto p-4 md:p-8 mt-4 md:mt-8 flex-grow">
                <Tabs activeTab={activeTab} setActiveTab={setActiveTab} />
                <TabContent 
                    activeTab={activeTab} 
                    completedScenarios={completedScenarios} 
                    updateProgress={updateProgress}
                />
            </main>
            <Footer />
        </div>
    );
}


// ============================================================================
// Layout Components
// ============================================================================

interface HeaderProps {
    activeTab: string;
    sessionData: SessionData;
    exitSession: () => void;
    logout: () => void;
    isAdmin: boolean;
    impersonatedTeam: 'red' | 'blue' | null;
    setImpersonatedTeam: (team: 'red' | 'blue' | null) => Promise<void>;
}

const Header: React.FC<HeaderProps> = ({ activeTab, sessionData, exitSession, logout, isAdmin, impersonatedTeam, setImpersonatedTeam }) => {
    const { isAiActive, toggleAiOpponent } = useContext(SimulationContext);
    const tabs = ['inicio', 'capacitacion', 'recursos', 'evaluacion', 'terminal'];
    const tabIndex = tabs.indexOf(activeTab);
    const progressWidth = ((tabIndex + 1) / tabs.length) * 100;

    const getTeamDisplay = () => {
        switch (sessionData.team) {
            case 'red': return { text: 'Rojo (Ataque)', color: 'text-red-400 drop-shadow-[0_0_5px_rgba(248,113,113,0.5)]' };
            case 'blue': return { text: 'Azul (Defensa)', color: 'text-blue-400 drop-shadow-[0_0_5px_rgba(96,165,250,0.5)]' };
            case 'spectator': return { text: 'Espectador (Admin)', color: 'text-yellow-400' };
            default: return { text: 'N/A', color: 'text-gray-400' };
        }
    };
    const teamDisplay = getTeamDisplay();


    return (
        <header className="shadow-[0_0_20px_rgba(0,0,0,0.5)] relative bg-slate-950/80 backdrop-blur-xl border-b border-slate-800/50 z-50">
            <div className="container mx-auto px-4 py-4 md:px-6 md:py-6">
                <div className="flex items-center justify-between">
                     <div className="flex items-center space-x-3 md:space-x-4">
                        <div className="p-2 bg-slate-900/80 rounded-lg shadow-[0_0_10px_rgba(59,130,246,0.2)] border border-slate-700/50 flex-shrink-0">
                             <img 
                                src="https://cybervaltorix.com/wp-content/uploads/2025/09/Cyber-Valtorix-1.png" 
                                alt="Logo Cyber Valtorix" 
                                className="h-10 w-10 md:h-12 md:w-12 object-contain"
                                onError={(e) => (e.currentTarget.src = 'https://placehold.co/48x48/1e293b/3b82f6?text=CV')}
                            />
                        </div>
                         <div>
                            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight font-mono">CYBER VALTORIX</h1>
                            <p className="text-slate-400 text-xs sm:text-sm font-medium tracking-wide uppercase flex items-center">
                                <span className="w-2 h-2 rounded-full bg-green-500 mr-2 animate-pulse shadow-[0_0_5px_#22c55e]"></span>
                                SOC Induction Framework v2.0
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center space-x-3 md:space-x-6">
                        <div className="text-right hidden sm:block bg-black/30 px-4 py-2 rounded border border-slate-800">
                           <p className="text-white text-sm font-semibold truncate max-w-[150px] font-mono" title={sessionData.sessionName}>{sessionData.sessionName}</p>
                           <p className={`text-xs mt-0.5 font-bold uppercase tracking-wider ${teamDisplay.color}`}>
                                {teamDisplay.text}
                           </p>
                        </div>
                        
                        {!isAdmin && sessionData.team !== 'spectator' && (
                            <button 
                                onClick={toggleAiOpponent}
                                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold border transition-all shadow-lg ${isAiActive ? 'bg-purple-900/50 border-purple-500 text-purple-300 animate-pulse' : 'bg-slate-800 border-slate-600 text-slate-400 hover:bg-slate-700'}`}
                                title={isAiActive ? "Desactivar IA" : "Activar Oponente IA"}
                            >
                                <Icon name="bot" className="h-4 w-4" />
                                <span className="hidden sm:inline">{isAiActive ? 'IA Activa' : 'Activar IA'}</span>
                            </button>
                        )}

                        <div className="flex space-x-2">
                            <button onClick={exitSession} className="bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-slate-500 p-2 rounded-lg transition-all hover:scale-105 hover:shadow-[0_0_10px_rgba(148,163,184,0.2)]" title="Salir de la Sesión">
                                <Icon name="log-out" className="h-5 w-5 text-slate-300" />
                            </button>
                             <button onClick={logout} className="bg-red-950/30 hover:bg-red-900/50 border border-red-900/50 hover:border-red-500/50 p-2 rounded-lg transition-all hover:scale-105 hover:shadow-[0_0_10px_rgba(239,68,68,0.3)]" title="Cerrar Sesión">
                                <Icon name="power" className="h-5 w-5 text-red-400" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            {isAdmin && (
                 <div className="bg-slate-900/90 text-center py-2 px-4 border-t border-yellow-500/20 backdrop-blur-sm">
                    <div className="flex items-center justify-center gap-4">
                        <span className="text-yellow-500 font-bold text-xs uppercase tracking-widest flex items-center gap-2">
                            <Icon name="shield" className="w-3 h-3" /> Admin Mode:
                        </span>
                        {sessionData.team === 'spectator' ? (
                            <>
                                <button onClick={() => setImpersonatedTeam('red')} className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white bg-red-600/20 border border-red-500/50 rounded hover:bg-red-600 hover:text-white transition-all">Join Red</button>
                                <button onClick={() => setImpersonatedTeam('blue')} className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white bg-blue-600/20 border border-blue-500/50 rounded hover:bg-blue-600 hover:text-white transition-all">Join Blue</button>
                            </>
                        ) : (
                             <div className="flex items-center gap-2">
                                 <p className="text-slate-300 text-xs">
                                    Acting as <strong className={impersonatedTeam === 'red' ? 'text-red-400' : 'text-blue-400'}>{impersonatedTeam === 'red' ? 'RED TEAM' : 'BLUE TEAM'}</strong>
                                </p>
                                <button onClick={() => setImpersonatedTeam(null)} className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-black bg-yellow-500 rounded hover:bg-yellow-400 transition-colors shadow-[0_0_10px_rgba(234,179,8,0.5)]">Reset to Spectator</button>
                            </div>
                        )}
                    </div>
                </div>
            )}
            <div 
                className="h-[2px] bg-gradient-to-r from-blue-500 via-cyan-400 to-purple-500 shadow-[0_0_15px_rgba(6,182,212,0.8)] transition-all duration-500 ease-out relative z-20" 
                style={{ width: `${progressWidth}%` }}
            ></div>
        </header>
    );
};

const Footer: React.FC = () => (
    <footer className="text-center py-8 px-4">
        <div className="glass-morphism rounded-xl p-6 max-w-2xl mx-auto bg-slate-900/40 border border-slate-800/60">
            <p className="text-slate-300 text-sm font-medium mb-2 font-mono">CYBER VALTORIX S.A. DE C.V.</p>
            <p className="text-slate-500 text-xs">Plataforma de Inducción del Centro de Operaciones de Seguridad (SOC)</p>
        </div>
    </footer>
);


// ============================================================================
// Tab Navigation and Content
// ============================================================================

const TABS_CONFIG = [
    { id: 'terminal', icon: 'terminal', label: 'Terminal' },
    { id: 'capacitacion', icon: 'graduation-cap', label: 'Capacitación' },
    { id: 'recursos', icon: 'library', label: 'Recursos' },
    { id: 'evaluacion', icon: 'star', label: 'Evaluación' },
    { id: 'inicio', icon: 'book-open', label: 'Glosario' },
];

const Tabs: React.FC<{ activeTab: string; setActiveTab: (tab: string) => void }> = ({ activeTab, setActiveTab }) => {
    const tabRefs = React.useRef<(HTMLButtonElement | null)[]>([]);

    useEffect(() => {
        const activeTabIndex = TABS_CONFIG.findIndex(tab => tab.id === activeTab);
        if (window.innerWidth < 768 && tabRefs.current[activeTabIndex]) {
            tabRefs.current[activeTabIndex]?.scrollIntoView({
                behavior: 'smooth',
                block: 'nearest',
                inline: 'center',
            });
        }
    }, [activeTab]);

    return (
        <div className="mb-8 sticky top-0 md:top-auto md:relative z-40 -mx-4 px-4 py-3 bg-slate-950/90 backdrop-blur-lg md:bg-transparent md:backdrop-blur-none md:-mx-0 md:px-0 md:py-0 border-b md:border-none border-slate-800/50">
            <nav className="flex overflow-x-auto whitespace-nowrap space-x-2 md:flex-wrap md:gap-2 md:space-x-0 nav-tabs scrollbar-hide" aria-label="Tabs">
                {TABS_CONFIG.map((tab, index) => (
                    <button
                        key={tab.id}
                        ref={el => { tabRefs.current[index] = el; }}
                        onClick={() => setActiveTab(tab.id)}
                        className={`nav-tab flex-shrink-0 px-4 py-3 rounded-lg font-semibold text-sm transition-all duration-200 flex items-center justify-center border
                            ${activeTab === tab.id
                                ? 'bg-slate-800/80 text-white shadow-[0_0_15px_rgba(59,130,246,0.15)] border-slate-500'
                                : 'bg-transparent text-slate-400 border-transparent hover:bg-slate-800/50 hover:text-slate-200 hover:border-slate-700'
                            }`}
                    >
                        <Icon name={tab.icon} className={`h-4 w-4 mr-2 ${activeTab === tab.id ? 'text-cyan-400' : 'text-slate-500'}`} />
                        <span>{tab.label}</span>
                    </button>
                ))}
            </nav>
        </div>
    );
};

interface TabContentProps {
    activeTab: string;
    completedScenarios: string[];
    updateProgress: (scenarioId: string) => void;
}

const TabContent: React.FC<TabContentProps> = ({ activeTab, completedScenarios, updateProgress }) => {
    const [currentTab, setCurrentTab] = useState(activeTab);
    const [isFading, setIsFading] = useState(false);

    useEffect(() => {
        if (activeTab !== currentTab) {
            setIsFading(true);
            setTimeout(() => {
                setCurrentTab(activeTab);
                setIsFading(false);
            }, 150);
        }
    }, [activeTab, currentTab]);


    const renderContent = () => {
        switch (currentTab) {
            case 'inicio': return <GlossarySection />;
            case 'capacitacion': return <TrainingSection completedScenarios={completedScenarios} updateProgress={updateProgress} />;
            case 'recursos': return <ResourcesSection />;
            case 'evaluacion': return <EvaluationSection />;
            case 'terminal': return <DualTerminalView />;
            default: return null;
        }
    };
    return <div className={`transition-opacity duration-150 ${isFading ? 'opacity-0' : 'opacity-100'}`}>{renderContent()}</div>;
};

// ============================================================================
// Content Sections
// ============================================================================

const SectionWrapper: React.FC<{ children: React.ReactNode, title: string, subtitle: string, className?: string }> = ({ children, title, subtitle, className }) => (
    <div className={`glass-morphism p-6 md:p-8 rounded-2xl bg-slate-900/60 border border-slate-700/50 ${className}`}>
        <div className="mb-8 border-b border-slate-700/50 pb-6 relative">
            <h2 className="text-2xl md:text-3xl font-bold mb-2 text-white flex items-center gap-3">
                <span className="w-1 h-8 bg-gradient-to-b from-cyan-400 to-blue-600 rounded-full"></span>
                {title}
            </h2>
            <p className="text-sm md:text-base text-slate-400 pl-4">{subtitle}</p>
        </div>
        {children}
    </div>
);

const GlossarySection: React.FC = () => (
    <SectionWrapper title="Glosario de Inducción del SOC" subtitle='Su vocabulario fundamental. Revise la pestaña "Recursos" para explicaciones detalladas.'>
        <CisoCard icon="book-open-check" title="Términos Fundamentales">
             <dl className="grid md:grid-cols-2 gap-x-8 gap-y-6">
                {GLOSSARY_TERMS.map(term => (
                    <React.Fragment key={term.term}>
                        <div>
                            <dt className="text-white font-semibold mb-1 font-mono text-sm text-cyan-300">{term.term}</dt>
                            <dd className="text-slate-400 text-sm border-l-2 border-slate-700 pl-3 hover:border-cyan-500 transition-colors">{term.definition}</dd>
                        </div>
                    </React.Fragment>
                ))}
            </dl>
        </CisoCard>
    </SectionWrapper>
);

interface TrainingSectionProps {
    completedScenarios: string[];
    updateProgress: (scenarioId: string) => void;
}
const TrainingSection: React.FC<TrainingSectionProps> = ({ completedScenarios, updateProgress }) => {
    const { environment, activeScenario } = useContext(SimulationContext);

    return (
        <SectionWrapper title="Talleres de Operaciones de Seguridad (SOC) - Nivel Pasante" subtitle="DE: CISO, CYBER VALTORIX S.A. DE C.V.">
             <div className="learning-module bg-slate-900/50 border border-slate-700 rounded-2xl p-6 mb-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-20 h-20 bg-blue-500/10 rounded-full blur-xl pointer-events-none"></div>
                <h3 className="text-lg font-bold text-cyan-400 mb-4 flex items-center">
                    <Icon name="info" className="h-5 w-5 mr-2" />
                    Instrucciones de los Talleres
                </h3>
                <div className="text-slate-300 text-sm leading-relaxed space-y-3 relative z-10">
                    <p>Tienen tiempo asignado para completar estos escenarios. Los documentos en la pestaña "Recursos" son su base teórica. Esta es la aplicación práctica.</p>
                    <p>No busquen "la respuesta correcta". Quiero su análisis, su proceso de pensamiento y las acciones de contención que proponen. Usen el modelo "Maestro/Estudiante": preparen su solución y estén listos para defenderla.</p>
                     <div className="flex items-center gap-2 p-3 bg-blue-950/30 border border-blue-500/30 rounded-lg mt-4">
                        <Icon name="terminal" className="text-blue-400 h-4 w-4"/>
                        <p className="text-blue-200 font-bold text-xs font-mono">¡Nuevo! Inicia escenarios con <code className="bg-black/60 px-1.5 py-0.5 rounded text-cyan-400 border border-cyan-900">start-scenario [id]</code> (ej. <code className="bg-black/60 px-1.5 py-0.5 rounded text-cyan-400 border border-cyan-900">start-scenario escenario7</code>).</p>
                     </div>
                </div>
            </div>
            <div className="space-y-4">
              {TRAINING_SCENARIOS.map(scenario => <TrainingModule 
                    key={scenario.id} 
                    scenario={scenario} 
                    isCompleted={completedScenarios.includes(scenario.id)}
                    onToggleComplete={() => updateProgress(scenario.id)}
                    // Pass the live environment ONLY to the active scenario
                    environment={activeScenario?.id === scenario.id ? environment : null}
                    activeScenarioId={activeScenario?.id ?? null}
                />)}
            </div>
        </SectionWrapper>
    );
};

const ResourcesSection: React.FC = () => (
    <SectionWrapper title="Biblioteca de Recursos del SOC" subtitle="Análisis detallado de los conceptos clave. Use esto para resolver los escenarios de capacitación.">
        <div className="space-y-6">
            {RESOURCE_MODULES.map(resource => <LearningModule key={resource.id} resource={resource} />)}
        </div>
    </SectionWrapper>
);

// ============================================================================
// NEW: Evaluation Section
// ============================================================================
const scenarioEvaluations = [
    {
        title: 'Escenario 7: Fortaleza Digital',
        blueTeam: {
            headers: ['Tarea', 'Puntos', 'Verificación'],
            rows: [
                ['Firewall activado', '20', 'sudo ufw status | grep active'],
                ['Solo puertos necesarios', '+5', 'MySQL bloqueado'],
                ['SSH sin root login', '15', 'grep PermitRootLogin /etc/ssh/sshd_config'],
                ['Archivos protegidos', '15', 'ls -l /var/www/html/db_config.php'],
                ['SSL endurecido (Opcional)', '10', 'Cifrados fuertes'],
                ['Fail2Ban configurado (Bonus)', '+10', ''],
                ['Monitoreo activo (Bonus)', '+5', ''],
            ],
            total: '60 (+15 Bonus)'
        },
        redTeam: {
            headers: ['Tarea', 'Puntos', 'Verificación'],
            rows: [
                ['Reconocimiento', '10', 'nmap ejecutado'],
                ['Credenciales obtenidas', '25', 'Hydra exitoso'],
                ['Acceso SSH', '20', 'Shell root activa'],
                ['index.php modificado', '35', 'Hash diferente'],
                ['Persistencia (Bonus)', '+15', 'Usuario/cron/webshell'],
            ],
            total: '85 (+15 Bonus)'
        }
    },
    {
        title: 'Escenario 8: Furia en la Red',
        blueTeam: {
            headers: ['Tarea', 'Puntos'],
            rows: [
                ['DoS detectado (top/htop)', '10'],
                ['Bruteforce detectado (logs)', '10'],
                ['IP bloqueada', '25'],
                ['Backdoor detectado', '20'],
                ['Sistema restaurado', '25'],
                ['Fail2Ban instalado (Bonus)', '+10'],
            ],
            total: '90 (+10 Bonus)'
        },
        redTeam: {
            headers: ['Tarea', 'Puntos'],
            rows: [
                ['DoS exitoso', '20'],
                ['Credenciales obtenidas', '30'],
                ['Backdoor instalado', '35'],
                ['Persistencia', '15'],
                ['No detectado (Bonus)', '+15'],
            ],
            total: '100 (+15 Bonus)'
        }
    },
    {
        title: 'Escenario 9: La Cadena de Infección',
        blueTeam: {
            headers: ['Tarea', 'Puntos'],
            rows: [
                ['Reconocimiento detectado', '10'],
                ['Explotación detectada y contenida', '25'],
                ['Shell terminada', '15'],
                ['Pivoteo detectado y bloqueado', '30'],
                ['Sistema limpio', '25'],
                ['WAF implementado (Bonus)', '+15'],
            ],
            total: '105 (+15 Bonus)'
        },
        redTeam: {
            headers: ['Tarea', 'Puntos'],
            rows: [
                ['Reconocimiento y LFI encontrado', '25'],
                ['RCE logrado', '25'],
                ['Root en DMZ', '20'],
                ['Pivoteo exitoso', '30'],
                ['Datos exfiltrados', '35'],
                ['Persistencia (Bonus)', '+15'],
            ],
            total: '135 (+15 Bonus)'
        }
    },
     {
        title: 'Escenario 10: La Escalada del Dominio',
        blueTeam: {
            headers: ['Tarea', 'Puntos'],
            rows: [
                ['Monitoreo configurado', '10'],
                ['Enumeración detectada', '10'],
                ['Kerberoasting detectado', '20'],
                ['Cuenta comprometida asegurada', '20'],
                ['Movimiento lateral bloqueado', '15'],
                ['AD restaurado', '25'],
                ['gMSA implementado (Bonus)', '+20'],
            ],
            total: '100 (+20 Bonus)'
        },
        redTeam: {
            headers: ['Tarea', 'Puntos'],
            rows: [
                ['Enumeración con BloodHound', '15'],
                ['Kerberoasting exitoso', '30'],
                ['Contraseña crackeada', '20'],
                ['DC comprometido', '25'],
                ['DCSync exitoso', '30'],
                ['Golden Ticket creado (Bonus)', '+15'],
            ],
            total: '120 (+15 Bonus)'
        }
    }
];

const EvaluationSection: React.FC = () => {
    const [expanded, setExpanded] = useState<string | null>(null);

    return (
        <SectionWrapper title="Criterios de Evaluación de Escenarios" subtitle="Revisa los objetivos y la puntuación para cada taller práctico.">
            <div className="space-y-4">
                {scenarioEvaluations.map(evalItem => (
                    <CollapsibleModule
                        key={evalItem.title}
                        isExpanded={expanded === evalItem.title}
                        toggle={() => setExpanded(expanded === evalItem.title ? null : evalItem.title)}
                        header={
                            <div className="flex items-center space-x-4 flex-grow min-w-0">
                                <Icon name="star" className="h-5 w-5 text-yellow-500 drop-shadow-[0_0_5px_rgba(234,179,8,0.5)]" />
                                <h4 className="font-bold text-white truncate text-sm md:text-base">{evalItem.title}</h4>
                            </div>
                        }
                    >
                        <div className="grid md:grid-cols-2 gap-8">
                            <div>
                                <h5 className="font-bold text-blue-400 mb-2 text-sm uppercase tracking-wider border-b border-blue-900 pb-1">Equipo Azul (Total: {evalItem.blueTeam.total})</h5>
                                <CisoTable headers={evalItem.blueTeam.headers} rows={evalItem.blueTeam.rows} />
                            </div>
                            <div>
                                <h5 className="font-bold text-red-400 mb-2 text-sm uppercase tracking-wider border-b border-red-900 pb-1">Equipo Rojo (Total: {evalItem.redTeam.total})</h5>
                                <CisoTable headers={evalItem.redTeam.headers} rows={evalItem.redTeam.rows} />
                            </div>
                        </div>
                    </CollapsibleModule>
                ))}
            </div>
        </SectionWrapper>
    );
};


// ============================================================================
// Reusable UI Components
// ============================================================================

const CollapsibleModule: React.FC<{
    header: React.ReactNode;
    children: React.ReactNode;
    defaultExpanded?: boolean;
    className?: string;
    isExpanded: boolean;
    toggle: () => void;
}> = ({ header, children, className, isExpanded, toggle }) => {
    const contentRef = React.useRef<HTMLDivElement>(null);

    return (
        <div className={`bg-slate-900/40 border border-slate-700/50 rounded-xl transition-all duration-300 hover:border-slate-500 hover:bg-slate-800/30 ${isExpanded ? 'border-slate-500 bg-slate-800/50 shadow-[0_0_15px_rgba(15,23,42,0.5)]' : ''} ${className}`}>
            <div className="p-4">
                <div className="flex items-center justify-between cursor-pointer" onClick={toggle}>
                    {header}
                    <Icon name="chevron-down" className={`h-4 w-4 text-slate-500 transition-transform duration-300 flex-shrink-0 ${isExpanded ? 'rotate-180 text-white' : ''}`} />
                </div>
                 <div
                    ref={contentRef}
                    className="overflow-hidden transition-[max-height] duration-500 ease-in-out"
                    style={{ maxHeight: isExpanded ? `${contentRef.current?.scrollHeight}px` : '0px' }}
                >
                    <div className="mt-4 pt-4 border-t border-slate-700/50">
                        {children}
                    </div>
                </div>
            </div>
        </div>
    );
};

interface TrainingModuleProps {
    scenario: TrainingScenario | InteractiveScenario;
    isCompleted: boolean;
    onToggleComplete: () => void;
    environment: VirtualEnvironment | null; // Null if not the active scenario
    activeScenarioId: string | null;
}
const TrainingModule: React.FC<TrainingModuleProps> = ({ scenario, isCompleted, onToggleComplete, environment, activeScenarioId }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    
    // Auto-expand the module if it becomes the active scenario
    useEffect(() => {
        if (scenario.isInteractive && activeScenarioId === scenario.id) {
            setIsExpanded(true);
        }
    }, [activeScenarioId, scenario.id, scenario.isInteractive]);

    const handleToggleComplete = (e: React.MouseEvent) => {
        e.stopPropagation();
        onToggleComplete();
    };

    const statusConfig: { [key: string]: { text: string, className: string } } = {
        'initial': { text: 'Pendiente', className: 'bg-slate-800 text-slate-400 border border-slate-700' },
        'completed': { text: 'Completado', className: 'bg-green-900/30 text-green-400 border border-green-500/30 shadow-[0_0_5px_rgba(34,197,94,0.2)]' }
    };
    
    const currentStatus = isCompleted ? statusConfig.completed : statusConfig.initial;

    const renderContent = () => {
        // FIX: Use the 'in' operator for a more robust type guard, as the optional
        // `isInteractive` property on TrainingScenario can be ambiguous for the compiler.
        if ('content' in scenario) {
            // This is a TrainingScenario
            return scenario.content;
        } else {
            // This is an InteractiveScenario
            // If this is the active scenario, 'environment' will be the live state.
            // Otherwise, it's null, so we show the initial state.
            const envForDisplay = environment ?? scenario.initialEnvironment;

            return <ScenarioView
                scenario={scenario}
                environment={envForDisplay}
                isActive={activeScenarioId === scenario.id}
            />;
        }
    };

    return (
        <CollapsibleModule
            isExpanded={isExpanded}
            toggle={() => setIsExpanded(!isExpanded)}
            header={
                <>
                    <div className="flex items-center space-x-4 flex-grow min-w-0">
                        <div className={`w-10 h-10 ${scenario.color}/10 rounded-lg flex items-center justify-center flex-shrink-0 border border-white/10 shadow-inner`}>
                            <Icon name={scenario.icon} className={`h-5 w-5 ${scenario.color.replace('bg-', 'text-').replace('-500','-400')}`} />
                        </div>
                        <div className="min-w-0">
                             <div className="flex items-center">
                                <h4 className="font-bold text-white truncate text-sm md:text-base group-hover:text-cyan-300 transition-colors">{scenario.title}</h4>
                                {activeScenarioId === scenario.id && (
                                    <span className="ml-3 px-2 py-0.5 text-[10px] font-bold text-green-400 bg-green-900/20 border border-green-500/30 rounded-full animate-pulse flex items-center gap-1 shadow-[0_0_5px_rgba(74,222,128,0.3)]">
                                        <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_3px_#22c55e]"></div>
                                        ACTIVE
                                    </span>
                                )}
                                {scenario.isInteractive && activeScenarioId !== scenario.id && (
                                    <span className="ml-3 px-2 py-0.5 text-[10px] font-bold text-indigo-400 bg-indigo-900/20 border border-indigo-500/30 rounded-full">
                                        SIMULATION
                                    </span>
                                )}
                            </div>
                            <p className="text-xs text-slate-500 truncate">{scenario.subtitle}</p>
                        </div>
                    </div>
                    {!scenario.isInteractive && (
                        <div className="flex items-center space-x-2 ml-2 flex-shrink-0">
                            <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider hidden sm:inline ${currentStatus.className}`}>{currentStatus.text}</span>
                            <button 
                                onClick={handleToggleComplete}
                                title="Marcar como completado"
                                className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 border
                                    ${isCompleted 
                                        ? 'bg-green-600 border-green-600 text-white shadow-[0_0_10px_rgba(22,163,74,0.5)]' 
                                        : 'bg-slate-800 border-slate-700 text-slate-500 hover:bg-slate-700 hover:border-slate-500 hover:text-white'
                                    }`}
                            >
                                <Icon name="check" className="h-3 w-3" />
                            </button>
                        </div>
                    )}
                </>
            }
        >
           {renderContent()}
        </CollapsibleModule>
    );
};

const LearningModule: React.FC<{ resource: ResourceModule }> = ({ resource }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    return (
        <CollapsibleModule
            isExpanded={isExpanded}
            toggle={() => setIsExpanded(!isExpanded)}
            header={
                <div className="flex items-center space-x-4">
                    <h3 className="text-lg font-bold text-slate-200 flex items-center hover:text-cyan-400 transition-colors">
                        <Icon name={resource.icon} className="h-5 w-5 mr-3 text-cyan-500 drop-shadow-[0_0_3px_rgba(6,182,212,0.5)]"/>
                        {resource.title}
                    </h3>
                </div>
            }
        >
            {resource.content}
        </CollapsibleModule>
    );
};


// ============================================================================
// NEW: Interactive Scenario View Component
// ============================================================================
interface ScenarioViewProps {
    scenario: InteractiveScenario;
    environment: VirtualEnvironment;
    isActive: boolean;
}

export const ScenarioView: React.FC<ScenarioViewProps> = ({ scenario, environment, isActive }) => {
    const [completedObjectives, setCompletedObjectives] = useState<Set<string>>(new Set());
    const [activeHints, setActiveHints] = useState<string[]>([]);
    const { userTeam } = useContext(SimulationContext);
    
    useEffect(() => {
        const completed = new Set<string>();
        scenario.objectives.forEach(obj => {
            if (obj.validator(environment)) {
                completed.add(obj.id);
            }
        });
        setCompletedObjectives(completed);
        
        const hints = scenario.hints
            .filter(hint => hint.trigger(environment))
            .map(hint => hint.message);
        setActiveHints(hints);
    }, [environment, scenario]);
    
    const teamObjectives = scenario.objectives.filter(obj => {
        if (userTeam === 'red') return obj.id.startsWith('red-');
        if (userTeam === 'blue') return obj.id.startsWith('blue-');
        return true;
    });

    const totalPoints = teamObjectives.reduce((sum, obj) => sum + obj.points, 0);
    const earnedPoints = teamObjectives
        .filter(obj => completedObjectives.has(obj.id))
        .reduce((sum, obj) => sum + obj.points, 0);
    
    const progressPercent = totalPoints > 0 ? (earnedPoints / totalPoints) * 100 : 0;
    
    return <div className="space-y-6 mt-4">
            <div className={`p-6 rounded-xl border transition-all duration-500 ${isActive ? 'bg-slate-900/80 border-cyan-500/30 shadow-[0_0_30px_rgba(6,182,212,0.1)]' : 'bg-slate-900/40 border-slate-800'}`}>
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h3 className="text-xl font-bold text-white font-mono tracking-tight">{scenario.title}</h3>
                        <p className="text-slate-400 mt-1 text-sm">{scenario.description}</p>
                    </div>
                    <span className={`px-3 py-1 rounded text-[10px] font-bold uppercase tracking-widest border ${
                        scenario.difficulty === 'beginner' ? 'bg-green-900/20 border-green-500/30 text-green-400' :
                        scenario.difficulty === 'intermediate' ? 'bg-yellow-900/20 border-yellow-500/30 text-yellow-400' :
                        'bg-red-900/20 border-red-500/30 text-red-400'
                    }`}>
                        {scenario.difficulty}
                    </span>
                </div>
                
                {isActive && (
                    <div className="mt-6 animate-fade-in-fast">
                        <div className="flex justify-between text-xs font-semibold uppercase tracking-wider mb-2">
                            <span className="text-slate-500">Mission Progress</span>
                            <span className="text-white font-mono">{earnedPoints} / {totalPoints} Pts</span>
                        </div>
                        <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-700/50">
                            <div 
                                className="bg-gradient-to-r from-blue-500 to-cyan-400 h-full rounded-full transition-all duration-1000 ease-out relative shadow-[0_0_10px_rgba(6,182,212,0.5)]"
                                style={{ width: `${progressPercent}%` }}
                            >
                                <div className="absolute inset-0 bg-white/20 animate-[shimmer_2s_infinite]"></div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
            
            {isActive && activeHints.length > 0 && (
                <div className="space-y-2">
                    {activeHints.map((hint, idx) => (
                        <div key={idx} className="bg-yellow-900/10 border-l-4 border-yellow-500 p-4 animate-fade-in-fast backdrop-blur-sm">
                            <div className="flex items-start">
                                <Icon name="alert-triangle" className="h-4 w-4 text-yellow-500 mr-3 flex-shrink-0 mt-0.5" />
                                <p className="text-yellow-200 text-sm">{hint}</p>
                            </div>
                        </div>
                    ))}
                </div>
            )}
            
            <div className="grid gap-3">
                {teamObjectives.map(objective => {
                    const isCompleted = completedObjectives.has(objective.id);
                    const isRedTeam = objective.id.startsWith('red-');
                    
                    return (
                        <div 
                            key={objective.id}
                            className={`p-4 rounded-lg border transition-all duration-300 backdrop-blur-sm ${
                                isCompleted 
                                    ? 'bg-green-900/10 border-green-500/30 shadow-[0_0_10px_rgba(34,197,94,0.1)]' 
                                    : isRedTeam 
                                        ? 'bg-red-950/20 border-red-500/10 hover:border-red-500/30'
                                        : 'bg-blue-950/20 border-blue-500/10 hover:border-blue-500/30'
                            }`}
                        >
                            <div className="flex items-start justify-between">
                                <div className="flex-grow">
                                    <div className="flex items-center mb-1">
                                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center mr-3 flex-shrink-0 ${isCompleted ? 'bg-green-500 border-green-500 shadow-[0_0_5px_#22c55e]' : 'border-slate-600'}`}>
                                            {isCompleted && <Icon name="check" className="h-3 w-3 text-black font-bold" />}
                                        </div>
                                        <h4 className={`text-sm font-medium ${isCompleted ? 'text-green-400 line-through decoration-green-500/50' : 'text-slate-200'}`}>
                                            {objective.description}
                                        </h4>
                                    </div>
                                    {!isCompleted && objective.hint && (
                                        <details className="mt-2 ml-7 group">
                                            <summary className="text-[10px] font-bold uppercase tracking-wider text-slate-500 cursor-pointer hover:text-slate-300 select-none list-none flex items-center">
                                                <span className="bg-slate-800 px-2 py-0.5 rounded border border-slate-700 group-hover:border-slate-500 transition-colors">Show Hint</span>
                                            </summary>
                                            <p className="text-xs text-slate-400 mt-2 ml-1 border-l-2 border-slate-700 pl-3 italic">{objective.hint}</p>
                                        </details>
                                    )}
                                </div>
                                <span className={`ml-4 text-xs font-mono font-bold ${
                                    isCompleted ? 'text-green-500' : 'text-slate-600'
                                }`}>
                                    +{objective.points} pts
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>;
}
