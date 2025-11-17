import React, { createContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react';
import { supabase } from './supabaseClient';
import type { VirtualEnvironment, LogEntry, SessionData, TerminalLine, PromptState, TerminalState, ActiveProcess, CommandHandler, CommandContext, CommandResult, VirtualHost, FirewallState, InteractiveScenario } from './types';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { RED_TEAM_HELP_TEXT, BLUE_TEAM_HELP_TEXT, GENERAL_HELP_TEXT, SCENARIO_HELP_TEXTS, TRAINING_SCENARIOS } from './constants';
import * as R from 'https://aistudiocdn.com/ramda@^0.32.0';

// ============================================================================
// DB State Type
// ============================================================================

interface SimulationStateRow {
    session_id: string;
    active_scenario_id?: string;
    live_environment?: VirtualEnvironment;
    red_terminal_state?: TerminalState;
    blue_terminal_state?: TerminalState;
}

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
        // This is an alias for ufw deny from
        return commandLibrary.ufw(['deny', 'from', args[args.indexOf('banip') + 1]], context);
    },
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
}

export const SimulationContext = createContext<SimulationContextType>({} as SimulationContextType);

interface SimulationProviderProps {
    children: ReactNode;
    sessionData: SessionData;
}

const createNewTerminal = (id: string, name: string, userTeam: 'red' | 'blue', scenarioTitle?: string): TerminalState => {
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
};

export const SimulationProvider: React.FC<SimulationProviderProps> = ({ children, sessionData }) => {
    const [environment, setEnvironment] = useState<VirtualEnvironment | null>(null);
    const [activeScenario, setActiveScenario] = useState<InteractiveScenario | null>(null);
    const [terminals, setTerminals] = useState<TerminalState[]>([]);
    
    const channelRef = useRef<RealtimeChannel | null>(null);
    const { sessionId, team } = sessionData;

    const updateStateFromPayload = useCallback((payload: SimulationStateRow) => {
        const scenario = TRAINING_SCENARIOS.find(s => s.id === payload.active_scenario_id) as InteractiveScenario | undefined;
        setActiveScenario(scenario ?? null);
        setEnvironment(payload.live_environment ?? null);

        if (team === 'spectator') {
            const spectatorTerminals = [];
            if (payload.red_terminal_state) spectatorTerminals.push(payload.red_terminal_state);
            if (payload.blue_terminal_state) spectatorTerminals.push(payload.blue_terminal_state);
            setTerminals(spectatorTerminals);
        } else {
            const myTerminalState = team === 'red' ? payload.red_terminal_state : payload.blue_terminal_state;
            if (myTerminalState) {
                setTerminals([myTerminalState]);
            } else if (scenario) {
                // If my terminal is missing, but a scenario is active, create it.
                setTerminals([createNewTerminal(`${team}-1`, `Terminal ${team === 'red' ? 'Rojo' : 'Azul'}`, team, scenario.title)]);
            } else {
                setTerminals([]);
            }
        }
    }, [team]);

    useEffect(() => {
        const fetchAndSetInitialState = async () => {
            const { data, error } = await supabase
                .from('simulation_state')
                .select('*')
                .eq('session_id', sessionId)
                .single();

            if (error && error.code !== 'PGRST116') { // PGRST116 means no rows found, which is fine.
                console.error("Error fetching initial state:", error);
                return;
            }
            if (data) {
                updateStateFromPayload(data);
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
    }, [sessionId, updateStateFromPayload]);

    const startScenario = useCallback(async (scenarioId: string): Promise<boolean> => {
        const scenario = TRAINING_SCENARIOS.find(s => s.id === scenarioId && s.isInteractive) as InteractiveScenario | undefined;
        if (!scenario) return false;

        const initialEnv = R.clone(scenario.initialEnvironment);
        const redTerminal = createNewTerminal('red-1', 'Equipo Rojo', 'red', scenario.title);
        const blueTerminal = createNewTerminal('blue-1', 'Equipo Azul', 'blue', scenario.title);

        const initialState: Omit<SimulationStateRow, 'session_id'> = {
            active_scenario_id: scenarioId,
            live_environment: initialEnv,
            red_terminal_state: redTerminal,
            blue_terminal_state: blueTerminal
        };

        const { error } = await supabase
            .from('simulation_state')
            .upsert({ session_id: sessionId, ...initialState });

        if (error) {
            console.error("Error starting scenario:", error);
            return false;
        }
        return true;
    }, [sessionId]);
    
    const processCommand = useCallback(async (terminalId: string, command: string) => {
        const terminal = terminals.find(t => t.id === terminalId);
        if (!terminal || !environment || team === 'spectator') return;

        // Optimistic UI update for responsiveness
         const newOutput: TerminalLine[] = [...terminal.output, { type: 'prompt', ...terminal.prompt }, { text: command, type: 'command' }];
         setTerminals(prev => prev.map(t => t.id === terminalId ? { ...t, output: newOutput, isBusy: true, history: [...t.history, command] } : t));
        
        const cmdStr = command.trim().split(' ')[0].toLowerCase();
        const handler = commandLibrary[cmdStr];
        
        const context: CommandContext = { userTeam: team, terminalState: terminal, environment: environment, setEnvironment, startScenario };

        let result: CommandResult;
        if (handler) {
            result = await handler(command.trim().split(' ').slice(1), context);
        } else {
            result = { output: [{ text: `comando no encontrado: ${cmdStr}`, type: 'error' }] };
        }
        
        const finalEnvironment = result.newEnvironment || environment;
        const timestamp = new Date().toISOString();
        // FIX: Explicitly type the source to satisfy the LogEntry type.
        const source: LogEntry['source'] = team === 'red' ? 'Red Team' : 'Blue Team';
        const finalTimelineEnv = { ...finalEnvironment, timeline: [...finalEnvironment.timeline, { id: finalEnvironment.timeline.length + 1, timestamp, source, message: command, teamVisible: 'all' }] };

        const updatedTerminalState: TerminalState = {
            ...terminal,
            ...result.newTerminalState,
            history: [...terminal.history, command],
            output: result.clear ? result.output : [...newOutput, ...result.output],
            isBusy: false,
        };

        const dbUpdatePayload: Partial<SimulationStateRow> = {
            live_environment: finalTimelineEnv,
            ...(team === 'red' && { red_terminal_state: updatedTerminalState }),
            ...(team === 'blue' && { blue_terminal_state: updatedTerminalState }),
        };

        const { error } = await supabase
            .from('simulation_state')
            .update(dbUpdatePayload)
            .eq('session_id', sessionId);

        if (error) {
            console.error('Failed to sync state:', error);
            // Revert optimistic update or show an error
             setTerminals(prev => prev.map(t => t.id === terminalId ? { ...t, isBusy: false, output: [...t.output, {text: "Error de sincronización con el servidor.", type: 'error'}] } : t));
        }
    }, [terminals, team, environment, sessionId, startScenario]);

    const logs = environment?.timeline || [];

    return (
        <SimulationContext.Provider value={{ environment, activeScenario, logs, terminals, userTeam: team, processCommand, startScenario }}>
            {children}
        </SimulationContext.Provider>
    );
};
