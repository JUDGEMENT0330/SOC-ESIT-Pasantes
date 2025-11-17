
import React, { createContext, useState, useEffect, ReactNode, useCallback } from 'react';
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
    userTeam: 'red' | 'blue'
): Promise<{ outputLines: TerminalLine[], process?: Omit<ActiveProcess, 'id' | 'terminalId' | 'startTime'>, duration?: number }> => {
    
    const args = command.trim().split(' ');
    const cmd = args[0].toLowerCase();
    const target = args[1] || '10.0.2.15'; // Default target

    // Mock network state
    const isFirewallEnabled = Math.random() > 0.5;

    switch (cmd) {
        case 'help':
            return { outputLines: [{ html: (userTeam === 'red' ? RED_TEAM_HELP_TEXT : BLUE_TEAM_HELP_TEXT) + GENERAL_HELP_TEXT, type: 'html' }] };
        case 'nmap':
            await new Promise(res => setTimeout(res, 2500)); // Simulate scan time
            return {
                outputLines: [{ text: generateNmapOutput(target, isFirewallEnabled), type: 'output' }],
                duration: 2500,
            };
        case 'hydra':
             return {
                outputLines: [{ text: `[22][ssh] host: ${target} login: admin password: password123`, type: 'output' }],
                process: { command, type: 'bruteforce' },
                duration: 5000,
            };
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
        historyIndex: 0,
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

    const addTerminal = () => {
        if (team === 'spectator') return null as any;
        const newId = (terminals.length + 1).toString();
        const newTerminal = createNewTerminal(newId, `Terminal ${newId}`, team);
        setTerminals(prev => [...prev, newTerminal]);
        return newTerminal;
    };

    const updateTerminalState = (terminalId: string, updates: Partial<TerminalState> | ((prevState: TerminalState) => Partial<TerminalState>)) => {
        setTerminals(prev => prev.map(t => {
            if (t.id === terminalId) {
                const changes = typeof updates === 'function' ? updates(t) : updates;
                return { ...t, ...changes };
            }
            return t;
        }));
    };

     const updateTerminalInput = (terminalId: string, input: string) => {
        updateTerminalState(terminalId, { input });
    };

    const processCommand = async (terminalId: string, command: string) => {
        const terminal = terminals.find(t => t.id === terminalId);
        if (!terminal || team === 'spectator') return;

        updateTerminalState(terminalId, { isBusy: true });

        // Add command to output and history
        updateTerminalState(terminalId, (prev) => ({
            output: [...prev.output, { type: 'prompt' }, { text: command, type: 'command' }],
            history: [...prev.history, command],
            input: ''
        }));
        
        await addLog({
            source: team === 'red' ? 'Red Team' : 'Blue Team',
            message: `Ejecutó el comando: '${command}' en ${terminal.name}`,
            teamVisible: 'all',
        });
        
        const { outputLines, process, duration } = await commandSimulator(command, team);

        if (duration) {
             setTimeout(() => {
                updateTerminalState(terminalId, (prev) => ({
                    output: [...prev.output, ...outputLines],
                    isBusy: false
                }));
             }, duration);
        } else {
             updateTerminalState(terminalId, (prev) => ({
                output: [...prev.output, ...outputLines],
                isBusy: false
            }));
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
    };


    const value = {
        networkState, logs, terminals, userTeam: team,
        addLog, addTerminal, updateTerminalInput, processCommand,
    };

    return <SimulationContext.Provider value={value}>{children}</SimulationContext.Provider>;
};
