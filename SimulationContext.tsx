import React, { createContext, useState, useEffect, ReactNode, useCallback, useRef, useMemo } from 'react';
import { supabase } from './supabaseClient';
import type { VirtualEnvironment, LogEntry, SessionData, TerminalLine, PromptState, TerminalState, ActiveProcess, CommandHandler, CommandContext, CommandResult, VirtualHost, FirewallState, InteractiveScenario } from './types';
import { RealtimeChannel } from '@supabase/supabase-js';
import { RED_TEAM_HELP_TEXT, BLUE_TEAM_HELP_TEXT, GENERAL_HELP_TEXT, SCENARIO_HELP_TEXTS, TRAINING_SCENARIOS, SCENARIO_7_GUIDE, SCENARIO_8_GUIDE, SCENARIO_9_GUIDE } from './constants';
import * as R from 'https://aistudiocdn.com/ramda@^0.32.0';
import { GoogleGenAI } from "https://esm.sh/@google/genai";

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
    const defaultRedPrompt: PromptState = { user: 'pasante-red', host: 'soc-valtorix', dir: '~' };
    const defaultBluePrompt: PromptState = { user: 'pasante-blue', host: 'soc-valtorix', dir: '~' };

    const redData = row.terminal_output_red as any[] | undefined;
    if (Array.isArray(redData)) {
        if (redData.length > 0 && typeof redData[0].id === 'string') {
            // New format is valid: TerminalState[]
            redTerminals.push(...(redData as TerminalState[]));
        } else if (redData.length > 0 && typeof redData[0].type === 'string') {
            // Old format detected: TerminalLine[]. Migrate it.
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
            // New format is valid: TerminalState[]
            blueTerminals.push(...(blueData as TerminalState[]));
        } else if (blueData.length > 0 && typeof blueData[0].type === 'string') {
            // Old format detected: TerminalLine[]. Migrate it.
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

const findHost = (env: VirtualEnvironment, hostnameOrIp: string): VirtualHost | undefined => {
    if (!hostnameOrIp) return undefined;
    const searchTerm = hostnameOrIp.toLowerCase();
    // Fix: Explicitly cast to array or any to avoid TS unknown error
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

// NEW: Robust Argument Parser
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
    // NEW: AI Analyst Integration
    analyze: async (args, { environment, userTeam, activeScenario }) => {
        if (!process.env.API_KEY) {
            return { output: [{ text: "Error: API_KEY no configurada para el Analista Virtual.", type: 'error' }] };
        }
        
        // Gather context for the AI
        const logs = environment.timeline.slice(-15).map(l => `[${l.source_team || 'SYS'}] ${l.message}`).join('\n');
        const scenarioContext = activeScenario ? `Escenario: ${activeScenario.title}. Desc: ${activeScenario.description}` : "Sin escenario activo.";
        
        // Inyectar guía experta si estamos en el escenario 7, 8 o 9
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
   ______      __           __      __            __  _
  / ____/_  __ / /_ _____   / /__   / /_   ____ _ / /_ (_)____   ____ _
 / /    / / / // __// ___/  / //_/  / __ \\ / __ \`// __// // __ \\ / __ \`/
/ /___ / /_/ // /_ / /__   / ,<    / / / // /_/ // /_ / // / / // /_/ /
\\____/ \\__,_/ \\__//\\___/  /_/|_|  /_/ /_/ \\__,_/ \\__//_//_/ /_/ \\__, /
                                                               /____/
</pre>`, type: 'html'}]}),
    whoami: async (args, { terminalState }) => ({ output: [{ text: terminalState.prompt.user, type: 'output' }] }),
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
        // If we are already in WEB-DMZ-01 (10.0.0.10) and trying to access DB-FINANCE-01 (10.10.0.50)
        if (terminalState.currentHostIp === '10.0.0.10' && targetHost.ip === '10.10.0.50') {
            // Allow pivoting
        } else if (targetHost.ip === '10.10.0.50' && !terminalState.currentHostIp) {
             // Trying to access internal network from outside (attacker machine) directly
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
        
        // Check if user exists, or if attacker has found valid credentials
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
            // Deny rules take precedence
            const isDenied = fw.rules.some(r => r.action === 'deny' && (r.destPort === portNum || !r.destPort) && (!r.sourceIP || r.sourceIP === 'Anywhere'));
            if (isDenied) return false;

            // Allow if there's a specific allow rule
            return fw.rules.some(r => r.action === 'allow' && (r.destPort === portNum || !r.destPort) && (!r.sourceIP || r.sourceIP === 'Anywhere'));
        });
        
        let outputText = `\nStarting Nmap 7.94 ( https://nmap.org )\nNmap scan report for ${targetHost.hostname} (${targetHost.ip})\nHost is up (0.00023s latency).\n`;
        const filteredCount = Object.keys(targetHost.services).length - visiblePorts.length;
        if (filteredCount > 0) outputText += `Not shown: ${filteredCount} filtered tcp ports (no-response)\n`;
        
        outputText += 'PORT\tSTATE\tSERVICE\tVERSION\n';
        // Fix: Explicitly cast service to any or correct type to access properties
        visiblePorts.forEach(([port, rawService]) => {
            const service = rawService as any;
            outputText += `${port}/tcp\t${service.state}\t${service.name}\t${service.version}\n`;
        });
        
        const newEnv = R.clone(environment);
        if (!newEnv.attackProgress.reconnaissance.includes(targetHost.hostname)) {
            newEnv.attackProgress.reconnaissance.push(targetHost.hostname);
        }
        
        return { output: [{ text: outputText, type: 'output' }], duration: 2500, newEnvironment: newEnv };
    },
     hydra: async (args, { environment }) => {
        const userArg = args.includes('-l') ? args[args.indexOf('-l') + 1] : null;
        const targetArg = args.find(a => a.startsWith('ssh://'));
        if (!userArg || !targetArg) return { output: [{ text: "Uso: hydra -l <user> -P <wordlist> ssh://<host>", type: 'error'}] };
        
        const host = targetArg.replace('ssh://', '');
        const targetHost = findHost(environment, host);
        if (!targetHost) return { output: [{ text: `Host desconocido: ${host}`, type: 'error' }] };

        // Check Fail2Ban / Firewall status first
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
            const output = `Hydra v9.5 (c) 2023 by van Hauser/THC\n[DATA] attacking ssh://${targetHost.ip}:22/\n[STATUS] 8.00 tries/min, 20 tries in 00:01h, 16 active\n[22][ssh] host: ${targetHost.ip}   login: ${userArg}   password: ${userAccount.password}\n1 of 1 target successfully completed, 1 valid password found`;
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
    ufw: async (args, { environment, terminalState }) => {
        if (!terminalState.currentHostIp) return { output: [{text: "Este comando debe ejecutarse en un host.", type: 'error'}] };
        const host = findHost(environment, terminalState.currentHostIp);
        if (!host) return { output: [], newEnvironment: environment };

        const newEnv = R.clone(environment);
        const fwPath = ['networks', 'dmz', 'firewall'];
        let fw = R.path(fwPath, newEnv) as FirewallState;
        
        let outputText = '';

        switch (args[0]) {
            case 'enable': 
                fw.enabled = true; 
                outputText = 'Firewall is active and enabled on system startup'; 
                break;
            case 'disable': 
                fw.enabled = false; 
                outputText = 'Firewall stopped and disabled on system startup'; 
                break;
            case 'status':
                 const status = fw.enabled ? 'active' : 'inactive';
                 if (args[1] === 'numbered' || fw.enabled) {
                    outputText = `Status: ${status}\nLogging: on (low)\nDefault: deny (incoming), allow (outgoing), disabled (routed)\n\nTo                         Action      From\n--                         ------      ----\n`;
                    fw.rules.forEach(r => { 
                        const port = r.destPort ? `${r.destPort}/${r.protocol}` : 'Any';
                        const from = r.sourceIP || 'Anywhere';
                        outputText += `${port.padEnd(26)} ${r.action.toUpperCase().padEnd(11)} ${from}\n`; 
                    });
                    if (fw.rules.length === 0) outputText += "(No rules)";
                 } else {
                    outputText = `Status: ${status}`;
                 }
                break;
            case 'allow':
                const allowPortStr = args[1]?.split('/')[0];
                const allowPort = parseInt(allowPortStr);
                if (isNaN(allowPort)) return { output: [{text: "Regla inválida", type: 'error'}]};
                fw.rules = fw.rules.filter(r => !(r.destPort === allowPort && !r.sourceIP));
                fw.rules.push({ id: `allow-${allowPort}`, action: 'allow', destPort: allowPort, protocol: 'tcp'});
                outputText = `Rule added`;
                break;
            case 'deny':
                if (args[1] === 'from') {
                    const ip = args[2];
                    if (!ip) return { output: [{text: "Se requiere una IP.", type: 'error'}]};
                    newEnv.defenseProgress.blockedIPs.push(ip);
                    fw.rules.push({ id: `deny-ip-${ip}`, action: 'deny', sourceIP: ip, protocol: 'any'});
                    outputText = `Rule added`;
                    // Scenario 8 Logic: if attacker IP is blocked, reduce CPU load
                    if(host.ip === '10.0.20.10' && ip === '192.168.1.100') {
                        host.systemState = { ...host.systemState, cpuLoad: 15, networkConnections: 50 };
                        // We need to ensure this host update persists in the newEnv structure
                         const hostIndex = newEnv.networks.dmz.hosts.findIndex(h => h.ip === '10.0.20.10');
                         if (hostIndex !== -1) {
                             newEnv.networks.dmz.hosts[hostIndex] = host;
                         }
                    }
                } else {
                    return { output: [{text: "Sintaxis de deny incompleta. Use 'ufw deny from <IP>'", type: 'error'}]};
                }
                break;
            default: return { output: [{text: `Comando ufw no reconocido: ${args[0]}`, type: 'error'}] };
        }
        
        return { output: [{ text: outputText, type: 'output' }], newEnvironment: R.set(R.lensPath(fwPath), fw, newEnv) };
    },
    chmod: async (args, { environment, terminalState }) => {
         if (!terminalState.currentHostIp) return { output: [{text: "Este comando debe ejecutarse en un host.", type: 'error'}] };
        if (args.length < 2) return { output: [{text: "chmod: falta un operando", type: 'error'}] };
        
        const perms = args[0];
        const path = args[1];
        
        const newEnv = R.clone(environment);
        const hostPath = ['networks', 'dmz', 'hosts', 0]; // Assuming one host for now
        let host = R.path(hostPath, newEnv) as VirtualHost;

        const fileIndex = host.files.findIndex(f => f.path === path);
        if (fileIndex === -1) return { output: [{text: `chmod: no se puede acceder a '${path}': No existe el fichero o el directorio`, type: 'error'}] };
        
        host.files[fileIndex].permissions = perms;

        return { output: [], newEnvironment: R.set(R.lensPath(hostPath), host, newEnv) };
    },
    nano: async (args, { environment, terminalState }) => {
         if (!terminalState.currentHostIp) return { output: [{text: "Este comando debe ejecutarse en un host.", type: 'error'}] };
        if (args.length < 1) return { output: [{text: "nano: se requiere un nombre de archivo para editar", type: 'error'}] };
        const path = args[0];
        
        const newEnv = R.clone(environment);
        const hostPath = ['networks', 'dmz', 'hosts', 0];
        let host = R.path(hostPath, newEnv) as VirtualHost;
        const fileIndex = host.files.findIndex(f => f.path === path);
        if (fileIndex === -1) return { output: [{text: `[ Error leyendo ${path}: No existe el fichero o el directorio ]`, type: 'error'}] };

        let message = `File ${path} saved. (Simulado)`;
        
        if (path === '/etc/ssh/sshd_config') {
            if (host.files[fileIndex].content.includes('PermitRootLogin yes')) {
                host.files[fileIndex].content = host.files[fileIndex].content.replace('PermitRootLogin yes', 'PermitRootLogin no');
                message = `[ Wrote 120 lines to ${path} ] (PermitRootLogin updated)`;
            }
        } else if (path === '/var/www/html/index.php') {
            // Simulate red team webshell injection
            host.files[fileIndex].content = '<?php if(isset($_GET["x"])){system($_GET["x"]);} ?>' + host.files[fileIndex].content;
            host.files[fileIndex].hash = 'hacked_hash_modified_index'; // Change hash to indicate modification
            newEnv.attackProgress.persistence.push('index_modified');
            message = `[ Wrote 5 lines to ${path} ] (Backdoor injected)`;
        }
        return { output: [{text: message, type: 'output'}], duration: 1500, newEnvironment: R.set(R.lensPath(hostPath), host, newEnv) };
    },
    top: async (args, { environment, terminalState }) => {
        if (!terminalState.currentHostIp) return { output: [{text: "Este comando debe ejecutarse en un host.", type: 'error'}] };
        const host = findHost(environment, terminalState.currentHostIp);
        if (!host || !host.systemState) return { output: [] };
        const { cpuLoad, networkConnections } = host.systemState;
        
        // Realistic calculation based on load
        const loadVal = cpuLoad > 50 ? (cpuLoad / 10) + 2 : 0.05;
        const loadStr = `${loadVal.toFixed(2)}, ${(loadVal * 0.9).toFixed(2)}, ${(loadVal * 0.8).toFixed(2)}`;
        
        // If under attack
        const isUnderAttack = cpuLoad > 90;
        const processList = isUnderAttack 
            ? ` 1234 root      20   0  123456  45678  12345 R  89.3   5.6   0:45.67 ksoftirqd/0\n 5678 root      20   0  234567  56789  23456 R  87.1   6.8   0:42.34 ksoftirqd/1`
            : `  952 root      20   0 1234564  23456  12344 S   0.3   0.5   1:23.45 systemd\n 1023 www-data  20   0  654321  45612   3456 S   0.1   1.2   0:12.34 apache2`;

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
        // Trigger DoS State
        setEnvironment(env => updateHostState(env!, targetHost.ip, { cpuLoad: 99.8, networkConnections: 4589 }));
        
        // DoS lasts for 20 seconds
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
        // Fix: Use failedLogins instead of failed
        for (let i = 0; i < host.systemState.failedLogins; i++) {
            const time = new Date(Date.now() - i * 1000).toTimeString().split(' ')[0];
            output += `Nov 18 ${time} ${host.hostname} sshd[123${i}]: Failed password for invalid user admin from 192.168.1.100 port 54321 ssh2\n`;
        }
        if (host.systemState.failedLogins === 0) {
            output += `Nov 18 10:00:00 ${host.hostname} systemd[1]: Started OpenBSD Secure Shell server.`;
        }
        return { output: [{ text: output, type: 'output' }] };
    },
    sha256sum: async (args, { environment, terminalState }) => {
        if (!terminalState.currentHostIp) return { output: [{text: "Este comando debe ejecutarse en un host.", type: 'error'}] };
        if (args.length < 1) return { output: [{text: "sha256sum: falta un operando", type: 'error'}] };
        const path = args[0];
        const host = findHost(environment, terminalState.currentHostIp);
        const file = host?.files.find(f => f.path === path);
        if (!file) return { output: [{text: `sha256sum: ${path}: No existe el fichero o el directorio`, type: 'error'}]};
        return { output: [{ text: `${file.hash}  ${path}`, type: 'output' }] };
    },
    'fail2ban-client': async (args, context) => {
        if (args.includes('banip')) {
            const ip = args[args.indexOf('banip') + 1];
            return commandLibrary.ufw(['deny', 'from', ip], context);
        }
         return { output: [{text: `Fail2Ban v0.11.2 running`, type: 'output'}] };
    },
    ss: async (args, { environment, terminalState }) => {
        if (!terminalState.currentHostIp) return { output: [{text: "Este comando debe ejecutarse en un host.", type: 'error'}] };
        const host = findHost(environment, terminalState.currentHostIp);
        if (!host) return { output: [] };
        
        const isUnderAttack = (host.systemState?.networkConnections || 0) > 1000;

        if (isUnderAttack) {
             let outputText = 'State      Recv-Q Send-Q     Local Address:Port         Peer Address:Port\n';
             outputText += `ESTAB      0      0          10.0.20.10:80              192.168.1.100:54321\n`;
             outputText += `ESTAB      0      0          10.0.20.10:80              192.168.1.100:54322\n`;
             outputText += `... (3419 more lines) ...\n`;
             return { output: [{ text: outputText, type: 'output' }] };
        }

        let outputText = 'Netid  State      Recv-Q Send-Q     Local Address:Port         Peer Address:Port\n';
        const fw = environment.networks.dmz.firewall;
        // Fix: Explicitly cast service to any or correct type
        Object.entries(host.services).forEach(([port, rawService]) => {
            const service = rawService as any;
            const isAllowed = !fw.enabled || fw.rules.some(r => r.destPort === parseInt(port) && r.action === 'allow');
            if (service.state === 'open' && isAllowed) {
                 let processName = 'unknown';
                if (port === '22') processName = 'sshd';
                if (port === '80' || port === '443') processName = 'apache2/nginx';
                if (port === '3306') processName = 'mysqld';
                outputText += `tcp    LISTEN     0      128                  *:${port.padEnd(22)}*:*\t\tusers:(("${processName}",pid=1234,fd=3))\n`;
            }
        });
        return { output: [{ text: outputText, type: 'output' }] };
    },
    netstat: async (args, context) => commandLibrary.ss(args, context), // Alias for ss
    ls: async (args, { environment, terminalState }) => {
        if (!terminalState.currentHostIp) return { output: [{text: "Este comando debe ejecutarse en un host.", type: 'error'}] };
        const host = findHost(environment, terminalState.currentHostIp);
        if (!host) return { output: [] };
        const path = args.find(a => !a.startsWith('-')) || '/var/www/html'; 
        const showDetails = args.includes('-l') || args.includes('-la');
        const relevantFiles = host.files.filter(f => f.path.startsWith(path));
        
        if (relevantFiles.length === 0) return { output: [{text: `ls: no se puede acceder a '${path}': No existe el fichero o el directorio`, type: 'error'}]};

        if (showDetails) {
            let outputText = `total ${relevantFiles.length * 4}\n`;
            relevantFiles.forEach(file => {
                // Simplified permission logic
                const perms = file.permissions === '640' ? '-rw-r-----' : (file.permissions === '600' ? '-rw-------' : '-rw-r--r--');
                 outputText += `${perms} 1 www-data www-data 145 Nov 18 10:00 ${file.path.split('/').pop()}\n`;
            });
            return { output: [{ text: outputText, type: 'output' }] };
        } else {
            return { output: [{ text: relevantFiles.map(f => f.path.split('/').pop()).join('  '), type: 'output' }] };
        }
    },
    cat: async (args, { environment, terminalState }) => {
        if (!terminalState.currentHostIp) return { output: [{text: "Este comando debe ejecutarse en un host.", type: 'error'}] };
        if (args.length < 1) return { output: [{text: "cat: falta un operando", type: 'error'}] };
        
        // Handle absolute paths or assume webroot
        let path = args[0];
        if (!path.startsWith('/')) {
             if (args[0].includes('index.php') || args[0].includes('db_config') || args[0].includes('view.php')) {
                 path = `/var/www/html/${args[0]}`;
             } else {
                 // Fallback to check relative
                 const host = findHost(environment, terminalState.currentHostIp);
                 const found = host?.files.find(f => f.path.endsWith(args[0]));
                 if (found) path = found.path;
             }
        }

        const host = findHost(environment, terminalState.currentHostIp);
        const file = host?.files.find(f => f.path === path);

        if (!file) return { output: [{text: `cat: ${path}: No existe el fichero o el directorio`, type: 'error'}]};
        
        const perms = parseInt(file.permissions, 10);
        // Very basic permission check: if permissions are strict and user isn't root, deny
        if (isNaN(perms) || ((perms & 0o004) === 0 && terminalState.prompt.user !== 'root')) {
             return { output: [{text: `cat: ${path}: Permission denied`, type: 'error'}]};
        }

        return { output: [{ text: file.content || '', type: 'output' }] };
    },
    grep: async (args, { environment, terminalState }) => {
        if (args.length < 2) return { output: [{text: "Uso: grep <patrón> <archivo>", type: 'error'}] };
        const pattern = args[0];
        const file = args[1];
        
        if (file.includes('auth.log')) {
            const host = findHost(environment, terminalState.currentHostIp!);
            if (!host || !host.systemState) return { output: [] };
             let output = '';
             const failed = host.systemState.failedLogins || 0;
             for (let i = 0; i < Math.min(failed, 20); i++) { // Limit to 20 lines
                 const line = `Failed password for invalid user admin from 192.168.1.100 port 54321 ssh2`;
                 if (line.toLowerCase().includes(pattern.toLowerCase().replace(/['"]/g, ''))) {
                     output += `Nov 18 10:15:${20+i} ${host.hostname} sshd[123${i}]: ${line}\n`;
                 }
             }
             return { output: [{ text: output, type: 'output' }] };
        }
        return { output: [{ text: '', type: 'output' }] };
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
        let output = `USER         PID %CPU %MEM    VSZ   RSS TTY      STAT START   TIME COMMAND\n`;
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
            let output = `CONNECTED(00000003)\n---\nCertificate chain\n 0 s:/C=MX/ST=None/L=None/O=Valtorix/CN=${host.hostname}\n   i:/C=MX/ST=None/L=None/O=Valtorix/CN=ValtorixCA\n---\n`;
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
            // Fetch existing state
            const { data: stateData } = await supabase
                .from('simulation_state')
                .select('*')
                .eq('session_id', sessionData.sessionId)
                .single();

            const { data: logData } = await supabase
                .from('simulation_logs')
                .select('*')
                .eq('session_id', sessionData.sessionId)
                .order('timestamp', { ascending: true });

            if (stateData && stateData.active_scenario) {
                setActiveScenarioId(stateData.active_scenario);
                const scenario = TRAINING_SCENARIOS.find(s => s.id === stateData.active_scenario) as InteractiveScenario;
                if (scenario) {
                    setEnvironment(mapDbRowToEnvironment(stateData, scenario));
                    setTerminals(mapDbRowToTerminals(stateData));
                }
            }
            
            if (logData) setLogs(logData as LogEntry[]);
        };

        initSession();

        // Realtime Subscription
        const channel = supabase.channel(`session:${sessionData.sessionId}`)
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'simulation_state', filter: `session_id=eq.${sessionData.sessionId}` }, (payload) => {
                const newState = payload.new as SimulationStateRow;
                if (newState.active_scenario) {
                    const scenario = TRAINING_SCENARIOS.find(s => s.id === newState.active_scenario) as InteractiveScenario;
                    if (scenario) {
                        setActiveScenarioId(newState.active_scenario);
                        setEnvironment(mapDbRowToEnvironment(newState, scenario));
                        setTerminals(mapDbRowToTerminals(newState));
                    }
                }
            })
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'simulation_logs', filter: `session_id=eq.${sessionData.sessionId}` }, (payload) => {
                setLogs(prev => [...prev, payload.new as LogEntry]);
            })
            .subscribe();

        channelRef.current = channel;

        return () => {
            supabase.removeChannel(channel);
        };
    }, [sessionData.sessionId]);


    const startScenario = async (scenarioId: string) => {
        const scenario = TRAINING_SCENARIOS.find(s => s.id === scenarioId);
        // Correctly narrow the type to InteractiveScenario.
        // TrainingScenario has 'isInteractive' as optional false, while InteractiveScenario has 'isInteractive' as true.
        // Checking for truthiness of isInteractive ensures it is an InteractiveScenario.
        if (!scenario || !scenario.isInteractive) return false;
        
        const newEnv = R.clone(scenario.initialEnvironment);
        setEnvironment(newEnv);
        setActiveScenarioId(scenarioId);
        setLogs([]);
        
        const initialTerminals: TerminalState[] = [
            {
                id: 'red-1',
                name: 'Terminal Rojo 1',
                output: [{ text: "Bienvenido a Kali Linux (Simulado). Tu objetivo es la máquina 10.0.10.5", type: 'output' }],
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

        const row = mapEnvironmentToDbRow(newEnv);
        const terminalRow = mapTerminalsToDbRow(initialTerminals);
        
        await supabase.from('simulation_state').update({ 
            ...row, 
            ...terminalRow,
            active_scenario: scenarioId 
        }).eq('session_id', sessionData.sessionId);
        
        await supabase.from('simulation_logs').delete().eq('session_id', sessionData.sessionId);

        return true;
    };

    const processCommand = async (terminalId: string, cmdString: string) => {
        if (!cmdString.trim() || !environment || !activeScenario) return;

        const terminalIndex = terminals.findIndex(t => t.id === terminalId);
        if (terminalIndex === -1) return;

        const currentTerminal = terminals[terminalIndex];
        
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

        if (handler) {
            try {
                const context: CommandContext = {
                    userTeam: terminalId.startsWith('red') ? 'red' : 'blue',
                    terminalState: currentTerminal,
                    environment,
                    activeScenario,
                    setEnvironment,
                    startScenario
                };
                result = await handler(args.slice(1), context);
            } catch (err: any) {
                result = { output: [{ text: `Error ejecuntando comando: ${err.message}`, type: 'error' }] };
            }
        }

        // 3. Update State with Results
        const finalTerminals = [...terminals]; // Refresh from state if needed, but for now rely on local vars
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
            
            // Check objectives and log if completed
            // This logic could be expanded
        }

        // 4. Sync to DB
        const dbRowEnv = result.newEnvironment ? mapEnvironmentToDbRow(result.newEnvironment) : {};
        const dbRowTerminals = mapTerminalsToDbRow(finalTerminals);
        
        await supabase.from('simulation_state').update({ ...dbRowEnv, ...dbRowTerminals }).eq('session_id', sessionData.sessionId);

        // 5. Log entry if meaningful action
        if (cmdName !== 'clear' && cmdName !== 'ls' && cmdName !== 'cd') {
            const logEntry = {
                session_id: sessionData.sessionId,
                message: `${currentTerminal.prompt.user}: ${cmdString}`,
                team_visible: 'all', // Simplified
                source_team: terminalId.startsWith('red') ? 'red' : 'blue'
            };
            await supabase.from('simulation_logs').insert(logEntry);
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
        // Sync
        const dbRowTerminals = mapTerminalsToDbRow(newTerminals);
        supabase.from('simulation_state').update(dbRowTerminals).eq('session_id', sessionData.sessionId).then();
    };

    const removeTerminal = (id: string) => {
         const newTerminals = terminals.filter(t => t.id !== id);
         setTerminals(newTerminals);
         const dbRowTerminals = mapTerminalsToDbRow(newTerminals);
         supabase.from('simulation_state').update(dbRowTerminals).eq('session_id', sessionData.sessionId).then();
    };

    const toggleAiOpponent = () => setIsAiActive(!isAiActive);

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
