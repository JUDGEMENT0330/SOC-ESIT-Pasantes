
import React, { createContext, useState, useEffect, ReactNode, useCallback, useRef, useMemo } from 'react';
import { supabase } from './supabaseClient';
// FIX: Import FirewallState type to resolve 'Cannot find name' error.
import type { VirtualEnvironment, LogEntry, SessionData, TerminalLine, PromptState, TerminalState, ActiveProcess, CommandHandler, CommandContext, CommandResult, VirtualHost, FirewallState } from './types';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { RED_TEAM_HELP_TEXT, BLUE_TEAM_HELP_TEXT, GENERAL_HELP_TEXT, fortressScenario } from './constants';
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
        // Simplified: Assume password is known if user is in `credentials` or is blue-team
        const hasCredentials = environment.attackProgress.credentials[`${user}@${targetHost.ip}`] === userAccount?.password || user === 'blue-team';

        if (!userAccount || !hasCredentials) return { output: [{ text: `Permiso denegado, por favor intente de nuevo.`, type: 'error' }], duration: 1500 };
        
        return {
            output: [{ text: `Bienvenido a ${targetHost.hostname}.`, type: 'output' }],
            duration: 1000,
            newTerminalState: {
                prompt: { user, host: targetHost.hostname, dir: '~' },
                originalPrompt: terminalState.prompt,
                currentHostIp: targetHost.ip
            }
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
            return fw.rules.some(r => r.destPort === portNum && r.action === 'allow');
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
        const userArg = args.indexOf('-l') > -1 ? args[args.indexOf('-l') + 1] : null;
        const targetArg = args.find(a => a.startsWith('ssh://'));
        if (!userArg || !targetArg) return { output: [{ text: "Uso: hydra -l <user> -P <wordlist> ssh://<host>", type: 'error'}] };
        
        const host = targetArg.replace('ssh://', '');
        const targetHost = findHost(environment, host);
        if (!targetHost) return { output: [{ text: `Host desconocido: ${host}`, type: 'error' }] };

        const userAccount = targetHost.users.find(u => u.username === userArg);
        if (userAccount && userAccount.password === 'toor') {
            const newEnv = R.clone(environment);
            newEnv.attackProgress.credentials[`${userArg}@${targetHost.ip}`] = 'toor';
            return {
                output: [{ text: `[22][ssh] host: ${host} login: ${userArg} password: toor`, type: 'output' }],
                duration: 5000,
                newEnvironment: newEnv
            };
        }
        return { output: [{ text: 'No se encontraron contraseñas válidas.', type: 'output' }], duration: 5000 };
    },
    'sudo': async (args, context) => {
        const cmd = args[0];
        if (!cmd) return { output: [{text: "sudo: se requiere un comando", type: 'error'}] };
        const handler = commandLibrary[cmd];
        if (!handler) return { output: [{text: `sudo: ${cmd}: comando no encontrado`, type: 'error'}]};
        // Simplified sudo: just run the command
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
                outputText = `Status: ${fw.enabled ? 'active' : 'inactive'}\n\nTo                         Action      From\n--                         ------      ----\n`;
                fw.rules.forEach(r => {
                    outputText += `${r.destPort || 'Any'}/${r.protocol || 'any'}                  ${r.action.toUpperCase()}        ${r.sourceIP || 'Anywhere'}\n`;
                });
                break;
            case 'allow':
                const allowPort = parseInt(args[1]);
                if (isNaN(allowPort)) return { output: [{text: "Regla inválida", type: 'error'}]};
                fw.rules = fw.rules.filter(r => r.destPort !== allowPort);
                fw.rules.push({ id: `allow-${allowPort}`, action: 'allow', destPort: allowPort, protocol: 'any'});
                outputText = `Rule added`;
                break;
            case 'deny':
                 const denyPort = parseInt(args[1]);
                if (isNaN(denyPort)) return { output: [{text: "Regla inválida", type: 'error'}]};
                fw.rules = fw.rules.filter(r => r.destPort !== denyPort);
                fw.rules.push({ id: `deny-${denyPort}`, action: 'deny', destPort: denyPort, protocol: 'any'});
                outputText = `Rule added`;
                break;
            default:
                return { output: [{text: "Comando no reconocido", type: 'error'}] };
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
    ls: async (args, { environment, terminalState }) => {
        if (!terminalState.currentHostIp) return { output: [{text: "Este comando debe ejecutarse en un host.", type: 'error'}] };
        const host = findHost(environment, terminalState.currentHostIp);
        if (!host) return { output: [] };

        if (args.includes('/var/www/html/')) {
            const file = host.files.find(f => f.path.includes('db_config'));
             if (file) return { output: [{ text: `-rwx-r----- 1 www-data www-data 1024 Jan 1 12:00 db_config.php`, type: 'output' }] };
        }
        return { output: [{ text: 'drwxr-xr-x 2 user user 4096 Jan 1 12:00 Documents\n-rw-r--r-- 1 user user 1024 Jan 1 12:00 notes.txt', type: 'output' }] };
    },
    nano: async (args, { environment, terminalState }) => {
         if (!terminalState.currentHostIp) return { output: [{text: "Este comando debe ejecutarse en un host.", type: 'error'}] };
        if (args.length < 1) return { output: [{text: "nano: se requiere un nombre de archivo para editar", type: 'error'}] };
        const path = args[0];
        
        const newEnv = R.clone(environment);
        const hostPath = ['networks', 'dmz', 'hosts', 0];
        let host = R.path(hostPath, newEnv) as VirtualHost;
        const fileIndex = host.files.findIndex(f => f.path === path);
        
        if (fileIndex !== -1 && path === '/etc/ssh/sshd_config') {
            host.files[fileIndex].content = host.files[fileIndex].content?.replace('PermitRootLogin yes', 'PermitRootLogin no');
            return { output: [{text: `Archivo guardado. (Simulado)`, type: 'output'}], newEnvironment: R.set(R.lensPath(hostPath), host, newEnv) };
        }
        return { output: [{text: `Archivo guardado. (Simulado)`, type: 'output'}] };
    },
    systemctl: async (args, { environment }) => {
        if (args[0] === 'restart' && args[1] === 'sshd') {
            return { output: [{text: `Servicio sshd reiniciado. (Simulado)`, type: 'output'}], duration: 800 };
        }
        return { output: [{text: `Comando systemctl no reconocido.`, type: 'error'}] };
    },
    curl: async (args, { environment, terminalState }) => {
        if (args.length < 1) return { output: [{text: "curl: la URL no tiene el formato correcto", type: 'error'}]};
        const url = args[0].replace('http://', '').split('/')[0];
        const file = args[0].replace('http://', '').split('/')[1];

        const host = findHost(environment, url);
        if (!host || !file) return { output: [{text: "No se pudo resolver el host.", type: 'error'}] };
        
        const targetFile = host.files.find(f => f.path.includes(file));
        const canRead = parseInt(targetFile?.permissions || '0', 8) & 0b00000100; // Check "other" read bit

        if (targetFile && canRead) {
            return { output: [{text: targetFile.content || '', type: 'output'}] };
        }
        return { output: [{text: `curl: (7) Failed to connect to ${url} port 80: Connection refused`, type: 'error'}]};
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
    const [environment, setEnvironment] = useState<VirtualEnvironment>(R.clone(fortressScenario.initialEnvironment));
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
        const terminal = terminals.find(t => t.id === terminalId);
        if (!terminal || terminal.history.length === 0) return;

        let newIndex = terminal.historyIndex;
        if (direction === 'up') {
            newIndex = newIndex === -1 ? terminal.history.length - 1 : Math.max(0, newIndex - 1);
        } else {
            newIndex = newIndex === -1 ? -1 : Math.min(terminal.history.length, newIndex + 1);
        }
        
        const newInput = newIndex >= 0 && newIndex < terminal.history.length ? terminal.history[newIndex] : '';
        updateTerminalState(terminalId, { historyIndex: newIndex, input: newInput });

    }, [terminals, updateTerminalState]);

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

        const newHistory = terminal.history[terminal.history.length - 1] === command ? terminal.history : [...terminal.history, command];
        updateTerminalState(terminalId, {
            output: [...terminal.output, { type: 'prompt', ...terminal.prompt }, { text: command, type: 'command' }],
            history: newHistory,
            historyIndex: -1,
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
