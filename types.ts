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
    history: string[];
    historyIndex: number;
    input: string;
    mode: 'normal' | 'msf'; // For special modes like msfconsole
    isBusy: boolean;
}

export interface ActiveProcess {
    id: string;
    terminalId: string;
    command: string;
    type: 'listener' | 'capture' | 'bruteforce';
    port?: number;
    startTime: number;
    output?: string;
}

export interface VirtualHost {
    ip: string;
    hostname: string;
    owner: 'red' | 'blue' | 'neutral';
    ports: { [port: number]: { service: string; state: 'open' | 'closed' | 'filtered' } };
}

// This replaces the old SimulationState. It's the shared state for the whole session.
export interface NetworkState {
    session_id: string;
    hosts: VirtualHost[];
    last_updated?: string;
    // The following properties are preserved for compatibility with the original structure
    // but should be considered deprecated in favor of the new granular state.
    firewall_enabled: boolean;
    ssh_hardened: boolean;
    banned_ips: string[];
    payload_deployed: boolean;
    is_dos_active: boolean;
    admin_password_found: boolean;
    db_config_permissions: string;
    hydra_run_count: number;
    server_load: number;
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
