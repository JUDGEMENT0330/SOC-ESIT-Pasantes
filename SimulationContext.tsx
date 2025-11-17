

import React, { createContext, useState, useEffect, ReactNode, useCallback, useRef, useMemo } from 'react';
import { supabase } from './supabaseClient';
import type { NetworkState, LogEntry, SessionData, TerminalLine, PromptState, TerminalState, ActiveProcess } from './types';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { RED_TEAM_HELP_TEXT, BLUE_TEAM_HELP_TEXT, GENERAL_HELP_TEXT } from './constants';

// ============================================================================
// Command Processor & Simulator (Simulated Backend)
// ============================================================================

const generateNmapOutput = (target: string, isFirewallEnabled: boolean): string => {
    const commonPorts = `
PORT     STATE  SERVICE
22/tcp   open   ssh
80/tcp   open   http
443/tcp  open   https`;
    const extraPorts = `
3306/tcp open   mysql
5432/tcp open   postgresql`;
    return `
Starting Nmap 7.92 ( https://nmap.org ) at ${new Date().toUTCString()}
Nmap scan report for ${target}
Host is up (0.021s latency).
Not shown: 995 closed tcp ports (reset)
${commonPorts}${isFirewallEnabled ? '' : extraPorts}

Nmap done: 1 IP address (1 host up) scanned in 2.58 seconds`;
};

const commandSimulator = async (
    command: string, 
    userTeam: 'red' | 'blue',
    currentPrompt: PromptState
): Promise<{ outputLines: TerminalLine[], process?: Omit<ActiveProcess, 'id' | 'terminalId' | 'startTime'>, duration?: number, newPrompt?: PromptState, clear?: boolean }> => {
    
    const args = command.trim().split(' ');
    const cmd = args[0].toLowerCase();
    const target = args[1] || '10.0.2.15'; // Default target

    // Mock network state
    const isFirewallEnabled = Math.random() > 0.5;

    switch (cmd) {
        case 'help':
            return { outputLines: [{ html: (userTeam === 'red' ? RED_TEAM_HELP_TEXT : BLUE_TEAM_HELP_TEXT) + GENERAL_HELP_TEXT, type: 'html' }] };
        case 'clear':
            return { outputLines: [], clear: true };
        case 'marca':
            return { outputLines: [{ html: `<pre class="text-yellow-300">
   ______      __           __      __            __  _
  / ____/_  __ / /_ _____   / /__   / /_   ____ _ / /_ (_)____   ____ _
 / /    / / / // __// ___/  / //_/  / __ \\ / __ \`// __// // __ \\ / __ \`/
/ /___ / /_/ // /_ / /__   / ,<    / / / // /_/ // /_ / // / / // /_/ /
\\____/ \\__,_/ \\__//\\___/  /_/|_|  /_/ /_/ \\__,_/ \\__//_//_/ /_/ \\__, /
                                                               /____/
</pre>`, type: 'html'}]};
        case 'nmap':
            return {
                outputLines: [{ text: `Simulating nmap scan on ${target}...`, type: 'output' }],
                duration: 2500,
            };
        case 'hydra':
             return {
                outputLines: [{ text: `[22][ssh] host: ${target} login: admin password: password123`, type: 'output' }],
                process: { command, type: 'bruteforce' },
                duration: 5000,
            };
        case 'ssh':
            const [user, host] = (args[1] || '').split('@');
            if (user && host) {
                return {
                    // FIX: Add missing 'type' property to TerminalLine objects
                    outputLines: [{text: `Connecting to ${host}...`, type: 'output'}, {text: `Logged in as ${user}.`, type: 'output'}],
                    newPrompt: { user, host, dir: '~' }
                }
            }
            return { outputLines: [{ text: `Usage: ssh <user>@<host>`, type: 'error' }]};
        case 'exit':
            // This is handled in processCommand by checking originalPrompt
            // FIX: Add missing 'type' property to TerminalLine object
            return { outputLines: [{text: 'Logging out...', type: 'output'}] };
        case 'ls':
            return { outputLines: [{ text: 'drwxr-xr-x 2 user user 4096 Jan 1 12:00 Documents\n-rw-r--r-- 1 user user 1024 Jan 1 12:00 notes.txt', type: 'output' }] };
        case 'whoami':
            return { outputLines: [{ text: currentPrompt.user, type: 'output' }] };
        case 'sudo':
            if (args[1] === 'ufw') {
                const status = isFirewallEnabled ? 'active' : 'inactive';
                 return { outputLines: [{ text: `Firewall is ${status}`, type: 'output' }] };
            }
            return { outputLines: [{ text: 'Sudo command simulation.', type: 'output'}]};
        case 'nc':
             if (args.includes('-lvnp')) {
                const port = parseInt(args[args.indexOf('-lvnp') + 1] || '4444');
                return {
                    outputLines: [{ text: `Listening on 0.0.0.0 ${port}`, type: 'output' }],
                    process: { command, type: 'listener', port }
                };
            }
            return { outputLines: [{ text: `nc: command not found or invalid arguments`, type: 'error' }]};
        case 'msfconsole':
            return {
                outputLines: [{
                    html: `
<pre class="text-red-400">
      =[ metasploit v6.3.30-dev                         ]
      + -- --=[ 2378 exploits - 1232 auxiliary - 416 post       ]
      + -- --=[ 1387 payloads - 46 encoders - 11 nops           ]
      + -- --=[ 9 evasion                                        ]
</pre>`,
                    type: 'html'
                }]
            };
        default:
            return { outputLines: [{ text: `comando no encontrado: ${cmd}`, type: 'error' }] };
    }
};


// ============================================================================
// Simulation Context
// ============================================================================
interface SimulationContextType {
    networkState: NetworkState | null;
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
    const [networkState, setNetworkState] = useState<NetworkState | null>(null);
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
        if (!terminal || team === 'spectator') return;
        
        // Rate Limiting
        const now = Date.now();
        if (now - resetTime.current > 60000) { // Reset every minute
            commandCount.current = 0;
            resetTime.current = now;
        }
        if (commandCount.current >= 20) { // 20 commands per minute
             updateTerminalState(terminalId, (prev) => ({
                output: [...prev.output, { type: 'prompt' }, { text: command, type: 'command' }, { text: '⚠️ Rate limit excedido. Espere 60 segundos.', type: 'error' }],
                input: ''
            }));
            return;
        }
        commandCount.current++;

        updateTerminalState(terminalId, { isBusy: true });

        updateTerminalState(terminalId, (prev) => ({
            output: [...prev.output, { type: 'prompt' }, { text: command, type: 'command' }],
            history: prev.history[prev.history.length - 1] === command ? prev.history : [...prev.history, command],
            historyIndex: -1,
            input: ''
        }));
        
        await addLog({
            source: team === 'red' ? 'Red Team' : 'Blue Team',
            message: `Ejecutó el comando: '${command}' en ${terminal.name}`,
            teamVisible: 'all',
        });
        
        if (command.toLowerCase() === 'exit' && terminal.originalPrompt) {
            updateTerminalState(terminalId, { prompt: terminal.originalPrompt, originalPrompt: undefined, isBusy: false, output: [...terminal.output, {type: 'prompt'}, {type: 'command', text: 'exit'}, {type: 'output', text:'Connection closed.'}] });
            return;
        }
        
        const { outputLines, process, duration, newPrompt, clear } = await commandSimulator(command, team, terminal.prompt);

        const handleResult = () => {
             updateTerminalState(terminalId, (prev) => ({
                output: clear ? [] : [...prev.output, ...outputLines],
                prompt: newPrompt || prev.prompt,
                originalPrompt: newPrompt ? prev.prompt : prev.originalPrompt,
                isBusy: false
            }));
        };

        if (duration) {
             setTimeout(handleResult, duration);
        } else {
             handleResult();
        }

        if (process) {
            const newProcess: ActiveProcess = {
                id: crypto.randomUUID(),
                terminalId,
                startTime: Date.now(),
                ...process,
            };
            setProcesses(prev => [...prev, newProcess]);
            await addLog({ source: 'System', message: `Proceso persistente '${command}' iniciado.`, teamVisible: team });
        }
    }, [terminals, team, addLog, updateTerminalState]);


    const value = useMemo(() => ({
        networkState, logs, terminals, userTeam: team,
        addLog, addTerminal, updateTerminalInput, processCommand, navigateHistory,
    }), [networkState, logs, terminals, team, addLog, addTerminal, updateTerminalInput, processCommand, navigateHistory]);

    return <SimulationContext.Provider value={value}>{children}</SimulationContext.Provider>;
};
