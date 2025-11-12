
import React, { useState, useEffect, useRef } from 'react';
import type { TerminalLine, PromptState, LogEntry } from '../types';
import { GENERAL_HELP_TEXT, RED_TEAM_HELP_TEXT, BLUE_TEAM_HELP_TEXT } from '../constants';

type Team = 'Red' | 'Blue';

interface TerminalInstanceProps {
    team: Team;
    addLogEntry: (log: Omit<LogEntry, 'id' | 'timestamp'>) => void;
    serverState: React.MutableRefObject<{
        rootLoginEnabled: boolean;
        firewallEnabled: boolean;
        hydraRunCount: number;
    }>;
}

const getInitialPrompt = (team: Team): PromptState => {
    if (team === 'Blue') {
        return { user: 'blue-team', host: 'BOVEDA-WEB', dir: '~' };
    }
    return { user: 'pasante', host: 'soc-valtorix', dir: '~' };
};

const getWelcomeMessage = (team: Team): TerminalLine[] => [
    { text: `Bienvenido a la terminal del Equipo ${team}.`, type: 'output' },
    { text: "Escriba 'help' para ver sus objetivos y comandos.", type: 'output' }
];

export const TerminalInstance: React.FC<TerminalInstanceProps> = ({ team, addLogEntry, serverState }) => {
    const [output, setOutput] = useState<TerminalLine[]>(getWelcomeMessage(team));
    const [history, setHistory] = useState<string[]>([]);
    const [historyIndex, setHistoryIndex] = useState(0);
    const [input, setInput] = useState('');
    const [promptState, setPromptState] = useState<PromptState>(getInitialPrompt(team));

    const endOfOutputRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        endOfOutputRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [output]);
    
    useEffect(() => {
        // Reset state if team changes (unlikely, but good practice)
        setOutput(getWelcomeMessage(team));
        setPromptState(getInitialPrompt(team));
    }, [team]);

    const addTerminalOutput = (line: TerminalLine) => {
        setOutput(prev => [...prev, line]);
    };
    
    const processCommand = (command: string) => {
        const args = command.trim().split(' ');
        const cmd = args[0].toLowerCase();
        
        const isRedTeam = team === 'Red';
        const isBlueTeam = team === 'Blue';
        const onBoveda = promptState.host.toUpperCase() === 'BOVEDA-WEB';

        // Universal Commands
        switch (cmd) {
            case 'help': 
                addTerminalOutput({ html: isRedTeam ? RED_TEAM_HELP_TEXT : BLUE_TEAM_HELP_TEXT, type: 'html' });
                return;
            case 'clear': setOutput([]); return;
            case 'marca': addTerminalOutput({ text: 'Marca: CYBER VALTORIX S.A. DE C.V.', type: 'output' }); return;
            case 'exit': 
                if (promptState.host !== getInitialPrompt(team).host) {
                    addTerminalOutput({ text: `(SIMULACIÓN) Conexión a ${promptState.host} cerrada.`, type: 'output' });
                    setPromptState(getInitialPrompt(team));
                } else {
                    addTerminalOutput({ text: 'Error: No hay sesión SSH activa para cerrar.', type: 'error' });
                }
                return;
        }

        // Red Team Commands
        if (isRedTeam) {
            switch(cmd) {
                case 'nmap':
                    addTerminalOutput({ text: `(SIMULACIÓN) Ejecutando Nmap...\n${serverState.current.firewallEnabled ? 'Resultado: Puertos 80, 22 abiertos.' : 'Resultado: Puertos 80, 443, 3306, 22 abiertos.'}` , type: 'output' });
                    addLogEntry({ source: 'Red Team', message: 'Escaneo Nmap detectado contra BOVEDA-WEB.', teamVisible: 'blue' });
                    return;
                case 'hydra':
                    addTerminalOutput({ text: `(SIMULACIÓN) Ejecutando Hydra contra SSH en BOVEDA-WEB...`, type: 'output' });
                    serverState.current.hydraRunCount += 100;
                    addLogEntry({ source: 'Red Team', message: `[!!] Múltiples intentos de login SSH fallidos para 'root' desde 192.168.1.100. (Posible ataque de fuerza bruta)`, teamVisible: 'blue' });
                    setTimeout(() => {
                         if (serverState.current.rootLoginEnabled) {
                            addTerminalOutput({ text: `[ÉXITO] Contraseña encontrada: '123456'`, type: 'output' });
                             addLogEntry({ source: 'Red Team', message: `[CRÍTICO] Login de 'root' exitoso en BOVEDA-WEB desde 192.168.1.100.`, teamVisible: 'blue' });
                         } else {
                            addTerminalOutput({ text: `[FALLIDO] No se encontraron contraseñas.`, type: 'error' });
                         }
                    }, 1000);
                    return;
                case 'ssh':
                     if (args[1] === 'blue-team@BOVEDA-WEB') {
                         addTerminalOutput({ text: `(SIMULACIÓN) Conectando...`, type: 'output' });
                         setPromptState({ user: 'blue-team', host: 'BOVEDA-WEB', dir: '~' });
                     } else {
                         addTerminalOutput({ text: 'Acceso denegado.', type: 'error' });
                     }
                    return;
                 // Add other red team commands here
            }
        }
        
        // Blue Team Commands
        if (isBlueTeam && onBoveda) {
             switch(cmd) {
                 case 'sudo':
                     processCommand(args.slice(1).join(' '));
                     return;
                 case 'ufw':
                     if (args[1] === 'enable') {
                         serverState.current.firewallEnabled = true;
                         addTerminalOutput({ text: `(SIMULACIÓN) Firewall activado.`, type: 'output' });
                         addLogEntry({ source: 'Blue Team', message: 'Firewall (UFW) HABILITADO en BOVEDA-WEB.', teamVisible: 'all' });
                     } else if (args[1] === 'status') {
                         addTerminalOutput({ text: `Estado: ${serverState.current.firewallEnabled ? 'activo' : 'inactivo'}`, type: 'output' });
                     } else {
                        addTerminalOutput({ text: `(SIMULACIÓN) Regla UFW añadida.`, type: 'output' });
                     }
                     return;
                case 'nano':
                    if (args[1] === 'sshd_config') {
                         serverState.current.rootLoginEnabled = false;
                         addTerminalOutput({ text: `(SIMULACIÓN) 'PermitRootLogin' cambiado a 'no'.`, type: 'output' });
                         addLogEntry({ source: 'Blue Team', message: `Configuración de SSH modificada en BOVEDA-WEB (PermitRootLogin=no).`, teamVisible: 'all' });
                    }
                    return;
                case 'grep':
                     addTerminalOutput({ text: `(SIMULACIÓN) Buscando en auth.log...\n${serverState.current.hydraRunCount > 0 ? `${serverState.current.hydraRunCount} resultados encontrados para "Failed password for root"` : 'No se encontraron resultados.'}`, type: 'output' });
                     addLogEntry({ source: 'Blue Team', message: 'Revisando logs de autenticación en BOVEDA-WEB.', teamVisible: 'blue' });
                    return;
                case 'ss':
                    addTerminalOutput({ text: `(SIMULACIÓN) Puertos escuchando:\n22/tcp, 80/tcp${!serverState.current.firewallEnabled ? ', 443/tcp, 3306/tcp' : ''}` , type: 'output' });
                    return;
             }
        }

        addTerminalOutput({ text: `Error: comando no reconocido o no disponible en este contexto.`, type: 'error' });
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && input.trim()) {
            e.preventDefault();
            const command = input.trim();
            setHistory(prev => [...prev, command]);
            setHistoryIndex(history.length + 1);
            addTerminalOutput({ type: 'prompt' });
            addTerminalOutput({ text: command, type: 'command' });
            processCommand(command);
            setInput('');
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            const newIndex = Math.max(0, historyIndex - 1);
            setHistoryIndex(newIndex);
            setInput(history[newIndex] || '');
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            const newIndex = Math.min(history.length, historyIndex + 1);
            setHistoryIndex(newIndex);
            setInput(history[newIndex] || '');
        }
    };

    return (
        <div 
            className="bg-[#0a0f1c] border border-gray-700 rounded-b-lg h-[400px] p-3 flex flex-col font-mono"
            onClick={() => inputRef.current?.focus()}
        >
            <div className="flex-grow overflow-y-auto text-sm pr-2 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800">
                {output.map((line, index) => (
                    <div key={index} className="mb-1">
                        {line.type === 'prompt' && <Prompt {...promptState} />}
                        {line.type === 'command' && <span className="text-white break-all">{line.text}</span>}
                        {line.type === 'output' && <pre className="whitespace-pre-wrap text-slate-300">{line.text}</pre>}
                        {line.type === 'html' && <div className="text-slate-300" dangerouslySetInnerHTML={{ __html: line.html || '' }} />}
                        {line.type === 'error' && <pre className="whitespace-pre-wrap text-red-500">{line.text}</pre>}
                    </div>
                ))}
                <div ref={endOfOutputRef} />
            </div>
            <div className="flex items-center mt-2 flex-shrink-0">
                <Prompt {...promptState} />
                <input
                    ref={inputRef}
                    type="text"
                    className="bg-transparent border-none outline-none text-white font-mono text-sm w-full"
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    autoFocus
                    autoComplete="off"
                    autoCapitalize="off"
                    spellCheck="false"
                />
            </div>
        </div>
    );
};

const Prompt: React.FC<PromptState> = ({ user, host, dir }) => (
    <span className="flex-shrink-0 mr-2">
        <span className={user.includes('blue') ? 'text-blue-400' : 'prompt-user'}>{user}</span>
        <span className="text-slate-400">@</span>
        <span className="prompt-host">{host}</span>
        <span className="text-slate-400">:</span>
        <span className="prompt-dir">{dir}</span>
        <span className="text-slate-400">$ </span>
    </span>
);
