import React, { createContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react';
import { supabase } from './supabaseClient';
import type { VirtualEnvironment, LogEntry, SessionData, TerminalLine, PromptState, TerminalState, ActiveProcess, CommandHandler, CommandContext, CommandResult, VirtualHost, FirewallState, InteractiveScenario } from './types';
// FIX: The `RealtimeChannel` type might not be exported in this version. Using `any` to avoid breaking the build.
import type { RealtimeChannel } from '@supabase/supabase-js';
import { RED_TEAM_HELP_TEXT, BLUE_TEAM_HELP_TEXT, GENERAL_HELP_TEXT, SCENARIO_HELP_TEXTS, TRAINING_SCENARIOS } from './constants';
import * as R from 'https://aistudiocdn.com/ramda@^0.32.0';

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
    for (const network of Object.values(env.networks)) {
        const host = network.hosts.find(h => h.ip === searchTerm || h.hostname.toLowerCase() === searchTerm);
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
        
        const userAccount = targetHost.users.find(u => u.username === user);
        const hasCredentials = environment.attackProgress.credentials[`${user}@${targetHost.ip}`] === userAccount?.password || user === 'blue-team';

        if (!userAccount || !hasCredentials) {
            const newEnv = updateHostState(environment, targetHost.ip, { failedLogins: (targetHost.systemState?.failedLogins || 0) + 1 });
            return { output: [{ text: `Permiso denegado, por favor intente de nuevo.`, type: 'error' }], duration: 1500, newEnvironment: newEnv };
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
    nmap: async (args, { environment }) => {
        const target = args.find(arg => !arg.startsWith('-'));
        if (!target) return { output: [{ text: 'Se requiere un objetivo. Uso: nmap [opciones] <host>', type: 'error' }]};

        const targetHost = findHost(environment, target);
        if (!targetHost) return { output: [{ text: `Note: Host ${target} seems down.`, type: 'output' }], duration: 1500 };

        const fw = environment.networks.dmz.firewall;
        const visiblePorts = Object.entries(targetHost.services).filter(([port]) => {
            if (!fw.enabled) return true;
            const portNum = parseInt(port);
            return fw.rules.some(r => r.destPort === portNum && r.action === 'allow' && !r.sourceIP);
        });
        
        let outputText = `\nStarting Nmap...\nNmap scan report for ${targetHost.hostname} (${targetHost.ip})\nHost is up.\n`;
        if (fw.enabled) outputText += `Not shown: ${Object.keys(targetHost.services).length - visiblePorts.length} filtered ports\n`;
        outputText += 'PORT\tSTATE\tSERVICE\n';
        visiblePorts.forEach(([port, service]) => {
            outputText += `${port}/tcp\t${service.state}\t${service.name}\n`;
        });
        
        const newEnv = R.clone(environment);
        if (!newEnv.attackProgress.reconnaissance.includes(targetHost.ip)) {
            newEnv.attackProgress.reconnaissance.push(targetHost.ip);
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

        const userAccount = targetHost.users.find(u => u.username === userArg);
        const passwordFound = userAccount && (userAccount.password === 'toor' || userAccount.password === 'P@ssw0rd');

        let newEnv = updateHostState(environment, targetHost.ip, { failedLogins: (targetHost.systemState?.failedLogins || 0) + 20 });
        
        if (passwordFound) {
            newEnv.attackProgress.credentials[`${userArg}@${targetHost.ip}`] = userAccount.password;
            return {
                output: [{ text: `[22][ssh] host: ${host} login: ${userArg} password: ${userAccount.password}`, type: 'output' }],
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
            case 'enable': fw.enabled = true; outputText = 'Firewall is active and enabled on system startup'; break;
            case 'disable': fw.enabled = false; outputText = 'Firewall stopped and disabled on system startup'; break;
            case 'status':
                outputText = `Status: ${fw.enabled ? 'active' : 'inactive'}\n\nTo                         Action      From\n--                         ------      ----\n`;
                fw.rules.forEach(r => { outputText += `${r.destPort || 'Any'}/${r.protocol || 'any'}                  ${r.action.toUpperCase()}        ${r.sourceIP || 'Anywhere'}\n`; });
                break;
            case 'allow':
                const allowPort = parseInt(args[1]);
                if (isNaN(allowPort)) return { output: [{text: "Regla inválida", type: 'error'}]};
                fw.rules = fw.rules.filter(r => !(r.destPort === allowPort && !r.sourceIP));
                fw.rules.push({ id: `allow-${allowPort}`, action: 'allow', destPort: allowPort, protocol: 'any'});
                outputText = `Rule added`;
                break;
            case 'deny':
                if (args[1] === 'from') {
                    const ip = args[2];
                    if (!ip) return { output: [{text: "Se requiere una IP.", type: 'error'}]};
                    fw.rules.push({ id: `deny-ip-${ip}`, action: 'deny', sourceIP: ip, protocol: 'any'});
                    outputText = `Rule added`;
                } else {
                    const denyPort = parseInt(args[1]);
                    if (isNaN(denyPort)) return { output: [{text: "Regla inválida", type: 'error'}]};
                    fw.rules = fw.rules.filter(r => r.destPort !== denyPort);
                    fw.rules.push({ id: `deny-${denyPort}`, action: 'deny', destPort: denyPort, protocol: 'any'});
                    outputText = `Rule added`;
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
        if (fileIndex === -1) return { output: [{text: `El archivo no existe. (Simulado)`, type: 'error'}] };

        if (path === '/etc/ssh/sshd_config') {
            host.files[fileIndex].content = host.files[fileIndex].content?.replace('PermitRootLogin yes', 'PermitRootLogin no');
        } else if (path === '/var/www/html/index.php') {
            host.files[fileIndex].content = '<?php echo "Sitio Comprometido"; ?>';
            host.files[fileIndex].hash = 'hacked_hash_456';
        }
        return { output: [{text: `Archivo guardado. (Simulado)`, type: 'output'}], newEnvironment: R.set(R.lensPath(hostPath), host, newEnv) };
    },
    systemctl: async (args, { environment }) => {
        if (args[0] === 'restart' && args[1] === 'sshd') return { output: [{text: `Servicio sshd reiniciado. (Simulado)`, type: 'output'}], duration: 800 };
        return { output: [{text: `Comando systemctl no reconocido.`, type: 'error'}] };
    },
    top: async (args, { environment, terminalState }) => {
        if (!terminalState.currentHostIp) return { output: [{text: "Este comando debe ejecutarse en un host.", type: 'error'}] };
        const host = findHost(environment, terminalState.currentHostIp);
        if (!host || !host.systemState) return { output: [] };
        const { cpuLoad, memoryUsage, networkConnections } = host.systemState;
        const outputText = `top - ${new Date().toTimeString().split(' ')[0]} up 1 day, 2:30,  1 user,  load average: ${cpuLoad.toFixed(2)}, 0.8, 0.5
Tasks: 1 total,   1 running,   0 sleeping,   0 stopped,   0 zombie
%Cpu(s): ${cpuLoad.toFixed(1)} us,  ${(cpuLoad / 3).toFixed(1)} sy,  0.0 ni, ${(100 - cpuLoad - (cpuLoad/3)).toFixed(1)} id
MiB Mem :  ${(memoryUsage * 1024).toFixed(1)} total,  ${(memoryUsage * 512).toFixed(1)} free,  ${(memoryUsage * 512).toFixed(1)} used
MiB Swap:    0.0 total,    0.0 free,    0.0 used.`;
        return { output: [{ text: outputText, type: 'output' }] };
    },
    hping3: async (args, { environment, setEnvironment }) => {
        const target = args.find(arg => !arg.startsWith('-'));
        if (!target) return { output: [{ text: 'Se requiere un objetivo.', type: 'error' }] };
        const targetHost = findHost(environment, target);
        if (!targetHost) return { output: [{ text: `Host desconocido: ${target}`, type: 'error' }] };

        const originalCpuLoad = targetHost.systemState?.cpuLoad || 5.0;
        setEnvironment(env => updateHostState(env!, targetHost.ip, { cpuLoad: 99.8 }));
        setTimeout(() => {
             setEnvironment(env => updateHostState(env!, targetHost.ip, { cpuLoad: originalCpuLoad }));
        }, 20000); // DoS lasts for 20 seconds

        return {
            output: [{ text: `HPING ${target} (eth0 ${target}): S set, 40 headers + 0 data bytes, flooding`, type: 'output' }],
            process: { command: `hping3 ${args.join(' ')}`, type: 'dos' },
            duration: 1000 // Command returns immediately but process runs
        };
    },
    journalctl: async(args, { environment, terminalState }) => {
        if (!terminalState.currentHostIp) return { output: [{text: "Este comando debe ejecutarse en un host.", type: 'error'}] };
        const host = findHost(environment, terminalState.currentHostIp);
        if (!host || !host.systemState) return { output: [] };
        let output = '-- Logs begin at Mon 2024-01-01 --\n';
        for (let i = 0; i < host.systemState.failedLogins; i++) {
            const time = new Date(Date.now() - i * 1000).toTimeString().split(' ')[0];
            output += `Jan 01 ${time} ${host.hostname} sshd[123${i}]: Failed password for invalid user admin from 192.168.1.100 port 54321 ssh2\n`;
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
        return commandLibrary.ufw(['deny', 'from', args[args.indexOf('banip') + 1]], context);
    },
    ss: async (args, { environment, terminalState }) => {
        if (!terminalState.currentHostIp) return { output: [{text: "Este comando debe ejecutarse en un host.", type: 'error'}] };
        const host = findHost(environment, terminalState.currentHostIp);
        if (!host) return { output: [] };
        let outputText = 'Netid  State      Recv-Q Send-Q     Local Address:Port         Peer Address:Port\n';
        const fw = environment.networks.dmz.firewall;
        Object.entries(host.services).forEach(([port, service]) => {
            const isAllowed = !fw.enabled || fw.rules.some(r => r.destPort === parseInt(port) && r.action === 'allow');
            if (service.state === 'open' && isAllowed) {
                outputText += `tcp    LISTEN     0      128                  *:${port}                    *:*\n`;
            }
        });
        return { output: [{ text: outputText, type: 'output' }] };
    },
    ls: async (args, { environment, terminalState }) => {
        if (!terminalState.currentHostIp) return { output: [{text: "Este comando debe ejecutarse en un host.", type: 'error'}] };
        const host = findHost(environment, terminalState.currentHostIp);
        if (!host) return { output: [] };
        const showDetails = args.includes('-l') || args.includes('-la');
        const relevantFiles = host.files;
        if (showDetails) {
            let outputText = 'total 12\n';
            relevantFiles.forEach(file => {
                 outputText += `-rwx-r-${file.permissions} 1 root root 1024 Jan 1 12:00 ${file.path.split('/').pop()}\n`;
            });
            return { output: [{ text: outputText, type: 'output' }] };
        } else {
            return { output: [{ text: relevantFiles.map(f => f.path.split('/').pop()).join('  '), type: 'output' }] };
        }
    },
    cat: async (args, { environment, terminalState }) => {
        if (!terminalState.currentHostIp) return { output: [{text: "Este comando debe ejecutarse en un host.", type: 'error'}] };
        if (args.length < 1) return { output: [{text: "cat: falta un operando", type: 'error'}] };
        const path = args[0].includes('/') ? args[0] : `/var/www/html/${args[0]}`;
        const host = findHost(environment, terminalState.currentHostIp);
        const file = host?.files.find(f => f.path === path);
        if (!file) return { output: [{text: `cat: ${path}: No existe el fichero o el directorio`, type: 'error'}]};
        return { output: [{ text: file.content || '', type: 'output' }] };
    },
    grep: async (args, { environment, terminalState }) => {
        if (args.length < 2) return { output: [{text: "Uso: grep <patrón> <archivo>", type: 'error'}] };
        const pattern = args[0];
        const file = args[1];
        if (file === '/var/log/auth.log') {
            const host = findHost(environment, terminalState.currentHostIp!);
            if (!host || !host.systemState) return { output: [] };
             let output = '';
             for (let i = 0; i < host.systemState.failedLogins; i++) {
                 const line = `Failed password for invalid user admin from 192.168.1.100 port 54321 ssh2`;
                 if (line.toLowerCase().includes(pattern.toLowerCase())) {
                     output += `Jan 01 12:0${i}:00 ${host.hostname} sshd[123${i}]: ${line}\n`;
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
                output += `SSL-Session:\n    Protocol  : TLSv1.2\n    Cipher    : DHE-RSA-AES256-SHA\n    <strong class="text-red-500">WARNING: Weak SSL Cipher detected!</strong>\n`;
            } else {
                 output += `SSL-Session:\n    Protocol  : TLSv1.3\n    Cipher    : TLS_AES_256_GCM_SHA384\n`;
            }
            return { output: [{html: `<pre>${output}</pre>`, type: 'html'}]};
        }
        return { output: [{text: 'Comando OpenSSL no implementado', type: 'error'}]};
    },
    htop: async(args, context) => commandLibrary.top(args, context), // Alias
    dirb: async(args) => ({ output: [{ text: `---- Scanning URL: ${args[0]} ----\n+ /index.php (CODE:200|SIZE:123)\n+ /images (CODE:301|SIZE:0) --> http://${args[0]}/images/\n+ /uploads (CODE:403|SIZE:43)\n+ /db_config.php (CODE:200|SIZE:87)`, type: 'output' }], duration: 2000 }),
    curl: async(args, context) => commandLibrary.cat([args[0].split('/').pop() || ''], context), // Simplified alias
    nikto: async(args) => ({ output: [{ text: `- Nikto v2.1.6\n---------------------------------------------------------------------------\n+ Target IP:          10.0.10.5\n+ Target Hostname:    BOVEDA-WEB\n+ Server: Apache/2.4.6\n+ The anti-clickjacking X-Frame-Options header is not present.\n+ OSVDB-3233: /icons/README: Apache default file found.\n`, type: 'output' }], duration: 3000 }),
    john: async(args) => ({ output: [{ text: `Loaded 1 password hash\nPress 'q' or Ctrl-C to abort, almost any other key for status\n0g 0:00:00:18 0.00% (ETA: 2024-01-02 10:30) 0g/s \npassword123      (root)\n1g 0:00:00:25 DONE (2024-01-01 14:45) 0.04g/s \nSession completed`, type: 'output' }], duration: 2500 }),
    wget: async(args) => ({ output: [{ text: `Connecting to ${args[0]}... connected.\nHTTP request sent, awaiting response... 200 OK\nLength: 1024 (1K) [application/x-sh]\nSaving to: 'payload.sh'\n\npayload.sh           100%[===================>]   1.00K  --.-KB/s    in 0s`, type: 'output' }], duration: 1200 }),
};


// ============================================================================
// Simulation Context
// ============================================================================
interface SimulationContextType {
    environment: VirtualEnvironment | null;
    activeScenario: InteractiveScenario | null;
    logs: LogEntry[];
    terminals: TerminalState[];
    userTeam: 'red' | 'blue' | 'spectator' | null;
    processCommand: (terminalId: string, command: string) => Promise<void>;
    startScenario: (scenarioId: string) => Promise<boolean>;
    addNewTerminal: () => void;
    removeTerminal: (terminalId: string) => void;
}

export const SimulationContext = createContext<SimulationContextType>({} as SimulationContextType);

interface SimulationProviderProps {
    children: ReactNode;
    sessionData: SessionData;
}

export const SimulationProvider: React.FC<SimulationProviderProps> = ({ children, sessionData }) => {
    const [environment, setEnvironment] = useState<VirtualEnvironment | null>(null);
    const [activeScenario, setActiveScenario] = useState<InteractiveScenario | null>(null);
    const [terminals, setTerminals] = useState<TerminalState[]>([]);
    
    const channelRef = useRef<any | null>(null);
    const { sessionId, team } = sessionData;

    const createNewTerminal = useCallback((id: string, name: string, userTeam: 'red' | 'blue', scenarioTitle?: string): TerminalState => {
        const user = userTeam === 'red' ? 'pasante-red' : 'pasante-blue';
        const welcomeMessage = scenarioTitle 
            ? `Bienvenido a <strong>${name}</strong>. Escenario activo: <strong>${scenarioTitle}</strong>.`
            : `Bienvenido a <strong>${name}</strong>. Use 'start-scenario [id]' para comenzar.`;
        
        return {
            id,
            name,
            output: [{ html: `${welcomeMessage} Escriba 'help' para ver los comandos.`, type: 'html' }],
            prompt: { user, host: 'soc-valtorix', dir: '~' },
            history: [],
            historyIndex: -1,
            input: '',
            mode: 'normal',
            isBusy: false,
        };
    }, []);

    const updateStateFromPayload = useCallback((payload: SimulationStateRow) => {
        const scenario = TRAINING_SCENARIOS.find(s => s.id === payload.active_scenario && s.isInteractive) as InteractiveScenario | undefined;
        setActiveScenario(scenario ?? null);
        if (scenario) {
            setEnvironment(mapDbRowToEnvironment(payload, scenario));
        } else {
            setEnvironment(null);
        }
        setTerminals(mapDbRowToTerminals(payload));
    }, []);
    
     const updateDbState = useCallback(async (state: Partial<SimulationStateRow>) => {
        // Filter out any keys with undefined values, as Supabase might reject them.
        const cleanState = Object.entries(state).reduce((acc, [key, value]) => {
            if (value !== undefined) {
                // FIX: Use a type assertion to bypass TypeScript's inability to match
                // the dynamic key with the correct value type within the reducer. The
                // logic is sound; this is a common workaround for this TS limitation.
                (acc as any)[key] = value;
            }
            return acc;
        }, {} as Partial<SimulationStateRow>);
        
        if (Object.keys(cleanState).length === 0) return;

        const { error } = await supabase
            .from('simulation_state')
            .update(cleanState)
            .eq('session_id', sessionId);
        if (error) {
             console.error('Failed to sync state:', error.message);
             // Optionally, add user-facing feedback about sync issues.
        }
    }, [sessionId]);

    useEffect(() => {
        const fetchAndSetInitialState = async () => {
            const { data, error } = await supabase
                .from('simulation_state')
                .select('*')
                .eq('session_id', sessionId)
                .single();

            if (error && error.code !== 'PGRST116') { // PGRST116 is "No rows found"
                console.error("Error fetching initial state:", error);
                return;
            }

            const currentUserTeam = team as 'red' | 'blue' | 'spectator';
            const teamTerminalsInDb = currentUserTeam === 'red' ? data?.terminal_output_red : data?.terminal_output_blue;
            
            if ((currentUserTeam === 'red' || currentUserTeam === 'blue') && (!data || !Array.isArray(teamTerminalsInDb) || teamTerminalsInDb.length === 0)) {
                 const teamName = currentUserTeam === 'red' ? 'Rojo' : 'Azul';
                 const newUserTerminal = createNewTerminal(`${currentUserTeam}-1`, `Terminal ${teamName} 1`, currentUserTeam);

                 const existingRed = (data?.terminal_output_red && Array.isArray(data.terminal_output_red)) ? data.terminal_output_red : [];
                 const existingBlue = (data?.terminal_output_blue && Array.isArray(data.terminal_output_blue)) ? data.terminal_output_blue : [];

                 const updatedData = {
                     ...(data || { session_id: sessionId }),
                     terminal_output_red: currentUserTeam === 'red' ? [newUserTerminal] : existingRed,
                     terminal_output_blue: currentUserTeam === 'blue' ? [newUserTerminal] : existingBlue,
                 };
                
                 updateStateFromPayload(updatedData);

                 const { error: upsertError } = await supabase
                     .from('simulation_state')
                     .upsert(updatedData);
                 if (upsertError) {
                    console.error("Failed to create or update terminal state in DB:", upsertError);
                 }

            } else if (data) {
                updateStateFromPayload(data as SimulationStateRow);
            }
        };

        fetchAndSetInitialState();
        
        const channel = supabase.channel(`session-${sessionId}`)
            .on<SimulationStateRow>('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'simulation_state',
                filter: `session_id=eq.${sessionId}`
            }, (payload) => {
                updateStateFromPayload(payload.new as SimulationStateRow);
            })
            .subscribe((status, err) => {
                if (status === 'SUBSCRIBED') console.log('Connected to session channel!');
                if (err) console.error('Channel subscription error:', err);
            });
        
        channelRef.current = channel;

        return () => {
            if (channelRef.current) {
                supabase.removeChannel(channelRef.current);
                channelRef.current = null;
            }
        };
    }, [sessionId, team, createNewTerminal, updateStateFromPayload, updateDbState]);
    
    const addNewTerminal = useCallback(() => {
        if (team === 'spectator') return;
        const currentUserTeam = team as 'red' | 'blue';
    
        setTerminals(prev => {
            const teamTerminals = prev.filter(t => t.id.startsWith(currentUserTeam));
            const maxId = teamTerminals.reduce((max, t) => {
                const num = parseInt(t.id.split('-')[1] || '0');
                return Math.max(max, num);
            }, 0);
            
            const newId = `${currentUserTeam}-${maxId + 1}`;
            const teamName = currentUserTeam === 'red' ? 'Rojo' : 'Azul';
            const newTerminal = createNewTerminal(newId, `Terminal ${teamName} ${maxId + 1}`, currentUserTeam, activeScenario?.title);
            const newState = [...prev, newTerminal];
            
            updateDbState(mapTerminalsToDbRow(newState));
            
            return newState;
        });
    }, [team, createNewTerminal, updateDbState, activeScenario]);

    const removeTerminal = useCallback((terminalId: string) => {
        if (team === 'spectator') return;
        const currentUserTeam = team as 'red' | 'blue';

         setTerminals(prev => {
            if (prev.filter(t => t.id.startsWith(currentUserTeam)).length <= 1) return prev; // Don't remove the last one
            const newState = prev.filter(t => t.id !== terminalId);
            
            updateDbState(mapTerminalsToDbRow(newState));

            return newState;
        });
    }, [team, updateDbState]);

    const startScenario = useCallback(async (scenarioId: string): Promise<boolean> => {
        const scenario = TRAINING_SCENARIOS.find(s => s.id === scenarioId && s.isInteractive) as InteractiveScenario | undefined;
        if (!scenario) return false;

        const initialEnv = R.clone(scenario.initialEnvironment);
        const redTerminal = createNewTerminal('red-1', 'Equipo Rojo 1', 'red', scenario.title);
        const blueTerminal = createNewTerminal('blue-1', 'Equipo Azul 1', 'blue', scenario.title);

        const dbRow = mapEnvironmentToDbRow(initialEnv);

        const initialState: SimulationStateRow = {
            session_id: sessionId,
            active_scenario: scenarioId,
            ...dbRow,
            terminal_output_red: [redTerminal],
            terminal_output_blue: [blueTerminal],
        };

        const { error } = await supabase
            .from('simulation_state')
            .upsert(initialState);

        if (error) {
            console.error("Error starting scenario:", error);
            return false;
        }
        return true;
    }, [sessionId, createNewTerminal]);
    
    const processCommand = useCallback(async (terminalId: string, command: string) => {
        const terminalIndex = terminals.findIndex(t => t.id === terminalId);
        if (terminalIndex === -1 || team === 'spectator') return;

        const terminal = terminals[terminalIndex];
        const cmdStr = command.trim().split(' ')[0].toLowerCase();
        const isEnvIndependent = ['help', 'start-scenario', 'clear', 'marca', 'whoami', 'exit'].includes(cmdStr);

        if (!environment && !isEnvIndependent) {
            const outputWithError: TerminalLine[] = [
                ...terminal.output,
                { type: 'prompt', ...terminal.prompt },
                { text: command, type: 'command' },
                { text: "Error: Ningún escenario interactivo está activo. Use 'start-scenario [id]' para comenzar.", type: 'error' }
            ];
            const updatedTerminals = R.update(terminalIndex, { ...terminal, output: outputWithError }, terminals);
            setTerminals(updatedTerminals);
            updateDbState(mapTerminalsToDbRow(updatedTerminals));
            return;
        }

        const optimisticHistory = [...terminal.history, command];
        const newOutput: TerminalLine[] = [...terminal.output, { type: 'prompt', ...terminal.prompt }, { text: command, type: 'command' }];
        const busyTerminals = R.update(terminalIndex, { ...terminal, output: newOutput, isBusy: true, history: optimisticHistory }, terminals);
        setTerminals(busyTerminals);
        
        const handler = commandLibrary[cmdStr];
        const context: CommandContext = { userTeam: team as 'red' | 'blue', terminalState: terminal, environment: environment!, setEnvironment, startScenario };

        let result: CommandResult;
        if (handler) {
            result = await handler(command.trim().split(' ').slice(1), context);
        } else {
            result = { output: [{ text: `comando no encontrado: ${cmdStr}`, type: 'error' }] };
        }
        
        let finalEnvironment = result.newEnvironment || environment;

        const updatedTerminalState: TerminalState = {
            ...terminal,
            ...result.newTerminalState,
            history: optimisticHistory,
            output: result.clear ? result.output : [...newOutput, ...result.output],
            isBusy: false,
        };
        const finalTerminals = R.update(terminalIndex, updatedTerminalState, terminals);

        if (finalEnvironment) {
            const timestamp = new Date().toISOString();
            const source: LogEntry['source'] = team === 'red' ? 'Red Team' : 'Blue Team';
            const newLogEntry: LogEntry = {
                id: (finalEnvironment.timeline?.length || 0) + 1,
                timestamp,
                source,
                message: command,
                teamVisible: 'all',
            };
            finalEnvironment = {
                ...finalEnvironment,
                timeline: [...(finalEnvironment.timeline || []), newLogEntry]
            };
        }

        const dbUpdatePayload: Partial<SimulationStateRow> = {
            ...mapEnvironmentToDbRow(finalEnvironment),
            ...mapTerminalsToDbRow(finalTerminals)
        };
        
        await updateDbState(dbUpdatePayload);

    }, [terminals, team, environment, sessionId, startScenario, updateDbState]);

    const logs = environment?.timeline || [];

    return (
        <SimulationContext.Provider value={{ environment, activeScenario, logs, terminals, userTeam: team, processCommand, startScenario, addNewTerminal, removeTerminal }}>
            {children}
        </SimulationContext.Provider>
    );
};
