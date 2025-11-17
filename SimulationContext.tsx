import React, { createContext, useState, useEffect, ReactNode, useCallback, useRef, useMemo } from 'react';
import { supabase } from './supabaseClient';
import type { VirtualEnvironment, LogEntry, SessionData, TerminalLine, PromptState, TerminalState, ActiveProcess, CommandHandler, CommandContext, CommandResult, VirtualHost, FirewallState } from './types';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { RED_TEAM_HELP_TEXT, BLUE_TEAM_HELP_TEXT, GENERAL_HELP_TEXT, fortressScenario, rageScenario } from './constants';
import * as R from 'ramda';

// ============================================================================
// Command Processor & Simulator (NEW Architecture)
// ============================================================================

const findHost = (env: VirtualEnvironment, hostnameOrIp: string): VirtualHost | undefined => {
    for (const network of Object.values(env.networks)) {
        const host = network.hosts.find(h => h.ip === hostnameOrIp || h.hostname === hostnameOrIp);
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
    help: async (args, { userTeam }) => ({
        output: [{ html: (userTeam === 'red' ? RED_TEAM_HELP_TEXT : BLUE_TEAM_HELP_TEXT) + GENERAL_HELP_TEXT, type: 'html' }]
    }),
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
            default: return { output: [{text: "Comando no reconocido", type: 'error'}] };
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
        setEnvironment(env => updateHostState(env, targetHost.ip, { cpuLoad: 99.8 }));
        setTimeout(() => {
             setEnvironment(env => updateHostState(env, targetHost.ip, { cpuLoad: originalCpuLoad }));
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
        // This is an alias for ufw deny from
        return commandLibrary.ufw(['deny', 'from', args[args.indexOf('banip') + 1]], context);
    },
};


// ============================================================================
// Simulation Context
// ============================================================================
interface SimulationContextType {
    environment: VirtualEnvironment | null;
    logs: LogEntry[];
    terminals: TerminalState[];
    userTeam: 'red' | 'blue' | 'spectator' | null;
    addLog: (log: Omit<LogEntry, 'id' | 'timestamp' | 'session_id'>) => Promise<void>;
    addTerminal: () => TerminalState;
    updateTerminalInput: (terminalId: string, input: string) => void;
    processCommand: (terminalId: string, command: string) => Promise<void>;
    navigateHistory: (terminalId: string, direction: 'up' | 'down') => void;
}

export const SimulationContext = createContext<SimulationContextType>({} as SimulationContextType);

interface SimulationProviderProps {
    children: ReactNode;
    sessionData: SessionData;
}

const createNewTerminal = (id: string, name: string, userTeam: 'red' | 'blue'): TerminalState => {
    const user = userTeam === 'red' ? 'pasante-red' : 'pasante-blue';
    return {
        id,
        name,
        output: [{ html: `Bienvenido a la <strong>${name}</strong>. Escriba 'help' para ver los comandos.`, type: 'html' }],
        prompt: { user, host: 'soc-valtorix', dir: '~' },
        history: [],
        historyIndex: -1,
        input: '',
        mode: 'normal',
        isBusy: false,
    };
};

export const SimulationProvider: React.FC<SimulationProviderProps> = ({ children, sessionData }) => {
    // TODO: Select scenario based on session/user choice.
    const [environment, setEnvironment] = useState<VirtualEnvironment>(R.clone(rageScenario.initialEnvironment));
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [terminals, setTerminals] = useState<TerminalState[]>([]);
    const [processes, setProcesses] = useState<ActiveProcess[]>([]);
    
    const commandCount = useRef(0);
    const resetTime = useRef(Date.now());

    const { sessionId, team } = sessionData;

    useEffect(() => {
        if (team !== 'spectator') {
            setTerminals([createNewTerminal('1', 'Terminal 1', team)]);
        }
    }, [team]);


    const addLog = useCallback(async (log: Omit<LogEntry, 'id' | 'timestamp' | 'session_id'>) => {
        const sourceTeamMap = { 'Red Team': 'Red', 'Blue Team': 'Blue', 'System': 'System', 'Network': 'Network' } as const;
        const newLog = { 
            session_id: sessionId, 
            source_team: sourceTeamMap[log.source] || 'System', 
            message: log.message, 
            team_visible: log.teamVisible 
        };
        const { error } = await supabase.from('simulation_logs').insert(newLog);
        if (error) console.error('Error adding log:', error);
    }, [sessionId]);

    const updateTerminalState = useCallback((terminalId: string, updates: Partial<TerminalState> | ((prevState: TerminalState) => Partial<TerminalState>)) => {
        setTerminals(prev => prev.map(t => {
            if (t.id === terminalId) {
                const changes = typeof updates === 'function' ? updates(t) : updates;
                return { ...t, ...changes };
            }
            return t;
        }));
    }, []);

    const addTerminal = useCallback(() => {
        if (team === 'spectator') return null as any;
        let newTerminal: TerminalState;
        setTerminals(prev => {
            const newId = (prev.length + 1).toString();
            newTerminal = createNewTerminal(newId, `Terminal ${newId}`, team);
            return [...prev, newTerminal];
        });
        return newTerminal!;
    }, [team]);

     const updateTerminalInput = useCallback((terminalId: string, input: string) => {
        updateTerminalState(terminalId, { input });
    }, [updateTerminalState]);
    
    const navigateHistory = useCallback((terminalId: string, direction: 'up' | 'down') => {
        // This is now handled locally in TerminalInstance with CommandHistory class
    }, []);

    const processCommand = useCallback(async (terminalId: string, command: string) => {
        const terminal = terminals.find(t => t.id === terminalId);
        if (!terminal || team === 'spectator' || !environment) return;
        
        // Rate Limiting
        const now = Date.now();
        if (now - resetTime.current > 60000) { // Reset every minute
            commandCount.current = 0;
            resetTime.current = now;
        }
        if (commandCount.current >= 30) { // 30 commands per minute
             updateTerminalState(terminalId, (prev) => ({
                output: [...prev.output, { type: 'prompt', ...prev.prompt }, { text: command, type: 'command' }, { text: '⚠️ Rate limit excedido. Espere 60 segundos.', type: 'error' }],
                input: ''
            }));
            return;
        }
        commandCount.current++;

        updateTerminalState(terminalId, { isBusy: true });
        
        const timestamp = new Date().toISOString();
        const logMessage = `User executed command: ${command}`;
        // addLog({ source: team === 'red' ? 'Red Team' : 'Blue Team', message: logMessage, teamVisible: 'all' });
        
        setEnvironment(env => ({ ...env!, timeline: [...env!.timeline, { id: env!.timeline.length + 1, timestamp, source: team === 'red' ? 'Red Team' : 'Blue Team', source_team: team === 'red' ? 'Red' : 'Blue', message: command, teamVisible: 'all'}] }));


        updateTerminalState(terminalId, {
            output: [...terminal.output, { type: 'prompt', ...terminal.prompt }, { text: command, type: 'command' }],
            input: ''
        });
        
        const cmdStr = command.trim().split(' ')[0].toLowerCase();
        const handler = commandLibrary[cmdStr];
        
        const context: CommandContext = { userTeam: team, terminalState: terminal, environment, setEnvironment };

        const result: CommandResult = handler 
            ? await handler(command.trim().split(' ').slice(1), context)
            : { output: [{ text: `comando no encontrado: ${cmdStr}`, type: 'error' }] };

        const handleResult = () => {
             updateTerminalState(terminalId, (prev) => ({
                output: result.clear ? [] : [...prev.output, ...result.output],
                isBusy: false,
                ...(result.newTerminalState || {})
            }));
            if (result.newEnvironment) {
                setEnvironment(result.newEnvironment);
            }
        };

        if (result.duration) {
             setTimeout(handleResult, result.duration);
        } else {
             handleResult();
        }

    }, [terminals, team, addLog, updateTerminalState, environment]);


    const value = useMemo(() => ({
        environment, logs, terminals, userTeam: team,
        addLog, addTerminal, updateTerminalInput, processCommand, navigateHistory,
    }), [environment, logs, terminals, team, addLog, addTerminal, updateTerminalInput, processCommand, navigateHistory]);

    return <SimulationContext.Provider value={value}>{children}</SimulationContext.Provider>;
};
