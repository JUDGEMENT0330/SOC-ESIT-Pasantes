
import React from 'react';

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

export interface TrainingScenario {
    id: string;
    icon: string;
    color: string;
    title: string;
    subtitle: string;
    content: React.ReactNode;
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
    source: 'Red Team' | 'Blue Team' | 'System';
    message: string;
    teamVisible: 'all' | 'red' | 'blue';
    // For Supabase compatibility
    session_id?: string;
    source_team?: 'Red' | 'Blue' | 'System';
}


export interface TrainingModuleProps {
    scenario: TrainingScenario;
    isCompleted: boolean;
    onToggleComplete: (scenarioId: string) => void;
}

// New types for multiplayer simulation
export interface SimulationState {
    session_id: string;
    firewall_enabled: boolean;
    ssh_hardened: boolean;
    banned_ips: string[];
    payload_deployed: boolean;
    is_dos_active: boolean;
    admin_password_found: boolean;
    db_config_permissions: string;
    hydra_run_count: number;
    server_load: number;
    last_updated?: string;
}

export interface SessionData {
    sessionId: string;
    team: 'red' | 'blue';
    sessionName: string;
}

export interface SimulationSession {
    id: string;
    session_name: string;
    created_at: string;
    is_active: boolean;
}
