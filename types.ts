import React from 'react';

// ============================================================================
// Core Simulation & Terminal Types
// ============================================================================

export interface TerminalLine {
    text?: string;
    html?: string;
    type: 'command' | 'output' | 'error' | 'title' | 'prompt' | 'html';
}

export interface PromptState {
    user: string;
    host: string;
    dir: string;
}

export interface TerminalState {
    id: string;
    name: string;
    output: TerminalLine[];
    prompt: PromptState;
    originalPrompt?: PromptState;
    history: string[];
    historyIndex: number;
    input: string;
    mode: 'normal' | 'msf'; // For special modes like msfconsole
    isBusy: boolean;
    currentHostIp?: string; // Track if SSH'd into a host
}


export interface ActiveProcess {
    id: string;
    terminalId: string;
    command: string;
    type: 'listener' | 'capture' | 'bruteforce' | 'dos';
    port?: number;
    startTime: number;
    output?: string;
}

// ============================================================================
// NEW: Virtual Environment Types
// ============================================================================

export interface Vulnerability {
    cve: string;
    description: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface VirtualHost {
    ip: string;
    hostname: string;
    os: 'linux' | 'windows';
    services: {
        [port: number]: {
            name: string;
            version: string;
            state: 'open' | 'closed' | 'filtered';
            vulnerabilities: Vulnerability[];
        }
    };
    users: {
        username: string;
        password: string; 
        privileges: 'root' | 'admin' | 'user';
    }[];
    files: {
        path: string;
        permissions: string;
        content?: string;
        hash: string;
    }[];
    systemState?: {
        cpuLoad: number; // percentage
        memoryUsage: number; // percentage
        networkConnections: number;
        failedLogins: number;
    };
}

export interface FirewallState {
    enabled: boolean;
    rules: {
        id: string;
        action: 'allow' | 'deny';
        protocol: 'tcp' | 'udp' | 'icmp' | 'any';
        sourceIP?: string;
        destPort?: number;
    }[];
}

export interface IDSState {
    enabled: boolean;
    signatures: string[];
    alerts: {
        timestamp: string;
        severity: 'low' | 'medium' | 'high' | 'critical';
        message: string;
        sourceIP: string;
    }[];
}

export interface VirtualEnvironment {
    networks: {
        [networkId: string]: {
            hosts: VirtualHost[];
            firewall: FirewallState;
            ids: IDSState;
        }
    };
    attackProgress: {
        reconnaissance: string[]; // IPs escaneadas
        compromised: string[]; // Hosts comprometidos
        credentials: { [key: string]: string }; // user@host -> password
        persistence: string[]; // Backdoors instalados
    };
    defenseProgress: {
        hardenedHosts: string[];
        blockedIPs: string[];
        patchedVulnerabilities: string[];
    };
    timeline: LogEntry[];
}


// ============================================================================
// NEW: Command System Types
// ============================================================================

export interface CommandContext {
    userTeam: 'red' | 'blue';
    terminalState: TerminalState;
    environment: VirtualEnvironment;
    setEnvironment: React.Dispatch<React.SetStateAction<VirtualEnvironment | null>>;
    startScenario: (scenarioId: string) => boolean;
}

export interface CommandResult {
    output: TerminalLine[];
    newEnvironment?: VirtualEnvironment;
    newTerminalState?: Partial<TerminalState>;
    process?: Omit<ActiveProcess, 'id' | 'terminalId' | 'startTime'>;
    duration?: number;
    clear?: boolean;
}

export type CommandHandler = (
    args: string[],
    context: CommandContext
) => Promise<CommandResult>;


// ============================================================================
// NEW: Interactive Scenario Types
// ============================================================================

export interface Objective {
    id: string;
    description: string;
    points: number;
    required: boolean;
    validator: (env: VirtualEnvironment) => boolean;
    hint?: string;
}

export interface InteractiveScenario {
    id: string;
    isInteractive: true;
    icon: string;
    color: string;
    title: string;
    subtitle: string;
    description: string;
    difficulty: 'beginner' | 'intermediate' | 'advanced';
    team: 'red' | 'blue' | 'both';
    initialEnvironment: VirtualEnvironment;
    objectives: Objective[];
    hints: {
        trigger: (env: VirtualEnvironment) => boolean;
        message: string;
    }[];
    evaluation: (env: VirtualEnvironment) => {
        completed: boolean;
        score: number;
        feedback: string[];
    };
}


// ============================================================================
// Legacy & App Structure Types
// ============================================================================

export interface TrainingScenario {
    id: string;
    icon: string;
    color: string;
    title: string;
    subtitle: string;
    content: React.ReactNode;
    isInteractive?: false;
}

export interface ResourceModule {
    id: string;
    icon: string;
    title: string;
    content: React.ReactNode;
}

export interface GlossaryTerm {
    term: string;
    definition: string;
}

export interface LogEntry {
    id: number;
    timestamp: string;
    source: 'Red Team' | 'Blue Team' | 'System' | 'Network';
    message: string;
    teamVisible: 'all' | 'red' | 'blue';
    // For Supabase compatibility
    session_id?: string;
    source_team?: 'Red' | 'Blue' | 'System' | 'Network';
}

export interface SessionData {
    sessionId: string;
    team: 'red' | 'blue' | 'spectator';
    sessionName: string;
}

export interface SessionParticipant {
    user_id: string;
    team_role: 'red' | 'blue';
}

export interface SimulationSession {
    id: string;
    session_name: string;
    created_at: string;
    is_active: boolean;
    session_participants: SessionParticipant[];
}
