import React, { useState, useEffect, useRef } from 'react';
import type { TerminalLine, PromptState, LogEntry } from '../types';
import { RED_TEAM_HELP_TEXT, BLUE_TEAM_HELP_TEXT, SCENARIO_HELP_TEXTS } from '../constants';

type Team = 'Red' | 'Blue';

interface TerminalInstanceProps {
    team: Team;
    addLogEntry: (log: Omit<LogEntry, 'id' | 'timestamp'>) => void;
    serverState: React.MutableRefObject<{
        rootLoginEnabled: boolean; // Retained for compatibility if needed elsewhere
        firewallEnabled: boolean;
        hydraRunCount: number;
        dbConfigPermissions: string;
        sshHardened: boolean;
    }>;
}

const getInitialPrompt = (team: Team): PromptState => {
    if (team === 'Blue') {
        // Blue team starts on their own machine, needs to SSH into the target
        return { user: 'pasante-blue', host: 'soc-valtorix', dir: '~' };
    }
    return { user: 'pasante-red', host: 'soc-valtorix', dir: '~' };
};

const getWelcomeMessage = (team: Team): TerminalLine[] => [
    { text: `Bienvenido a la terminal del Equipo ${team}.`, type: 'output' },
    { text: "Escriba 'help' para ver sus objetivos y comandos.", type: 'output' },
    { text: "Para guías de escenarios, escriba 'help [id_escenario]', ej: help escenario7", type: 'output' }
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
                if (args[1] && SCENARIO_HELP_TEXTS[args[1]]) {
                    addTerminalOutput({ html: SCENARIO_HELP_TEXTS[args[1]], type: 'html' });
                } else {
                    addTerminalOutput({ html: isRedTeam ? RED_TEAM_HELP_TEXT : BLUE_TEAM_HELP_TEXT, type: 'html' });
                }
                return;
            case 'clear': setOutput([]); return;
            case 'marca': addTerminalOutput({ text: 'Marca: CYBER VALTORIX S.A. DE C.V.', type: 'output' }); return;
            case 'exit': 
                if (onBoveda) {
                    addTerminalOutput({ text: `(SIMULACIÓN) Conexión a ${promptState.host} cerrada.`, type: 'output' });
                    setPromptState(getInitialPrompt(team));
                } else {
                    addTerminalOutput({ text: 'Error: No hay sesión SSH activa para cerrar.', type: 'error' });
                }
                return;
        }

        // --- RED TEAM COMMANDS (from soc-valtorix) ---
        if (isRedTeam && !onBoveda) {
            switch(cmd) {
                case 'nmap':
                    addTerminalOutput({ text: `(SIMULACIÓN) Ejecutando Nmap en BOVEDA-WEB...` , type: 'output' });
                    addLogEntry({ source: 'Red Team', message: 'Escaneo Nmap detectado contra BOVEDA-WEB.', teamVisible: 'blue' });
                    setTimeout(() => {
                        const openPorts = serverState.current.firewallEnabled
                            ? 'Puertos abiertos: 22/tcp (ssh), 80/tcp (http)'
                            : 'Puertos abiertos: 22/tcp (ssh), 80/tcp (http), 443/tcp (https), 3306/tcp (mysql)';
                        addTerminalOutput({ text: `Resultado:\n${openPorts}`, type: 'output' });
                    }, 1000);
                    return;
                case 'hydra':
                    addTerminalOutput({ text: `(SIMULACIÓN) Ejecutando Hydra contra SSH en BOVEDA-WEB...`, type: 'output' });
                    serverState.current.hydraRunCount += 100; // Simulate many attempts
                    addLogEntry({ source: 'Red Team', message: `[!!] Múltiples intentos de login SSH fallidos para 'root' desde 192.168.1.100. (Posible ataque de fuerza bruta)`, teamVisible: 'blue' });
                    setTimeout(() => {
                         if (!serverState.current.sshHardened) {
                            addTerminalOutput({ text: `[ÉXITO] Contraseña encontrada para 'root': '123456'`, type: 'output' });
                             addLogEntry({ source: 'Red Team', message: `[CRÍTICO] Login de 'root' exitoso en BOVEDA-WEB desde 192.168.1.100.`, teamVisible: 'blue' });
                         } else {
                            addTerminalOutput({ text: `[FALLIDO] No se encontraron contraseñas. El servidor puede haber sido asegurado.`, type: 'error' });
                         }
                    }, 2000);
                    return;
                case 'ssh':
                    const user = args[1]?.split('@')[0];
                    const host = args[1]?.split('@')[1];
                    if (host?.toUpperCase() === 'BOVEDA-WEB') {
                        addTerminalOutput({ text: `(SIMULACIÓN) Conectando a ${host}...`, type: 'output' });
                        if (user === 'root' && serverState.current.hydraRunCount > 0 && !serverState.current.sshHardened) {
                            addTerminalOutput({ text: `Contraseña ('123456'): [ÉXITO]`, type: 'output' });
                            setPromptState({ user: 'root', host: 'BOVEDA-WEB', dir: '#' });
                        } else {
                             addTerminalOutput({ text: 'Acceso denegado.', type: 'error' });
                        }
                    } else {
                        addTerminalOutput({ text: 'Host desconocido.', type: 'error' });
                    }
                    return;
                case 'curl':
                case 'dirb':
                case 'nikto':
                     addTerminalOutput({ text: `(SIMULACIÓN) Ejecutando ${cmd} contra BOVEDA-WEB...`, type: 'output' });
                     addLogEntry({ source: 'Red Team', message: `Herramienta de reconocimiento web (${cmd}) detectada contra BOVEDA-WEB.`, teamVisible: 'blue' });
                     if (cmd === 'curl' && args[1]?.includes('db_config.php')) {
                          setTimeout(() => {
                              if (serverState.current.dbConfigPermissions === '644') {
                                 addTerminalOutput({ text: `HTTP/1.1 200 OK\n\n<?php\n$db_user="admin";\n$db_pass="S3cuRePa$$w0rd!"\n?>`, type: 'output' });
                                 addLogEntry({ source: 'Red Team', message: `[CRÍTICO] Archivo de configuración sensible 'db_config.php' fue accedido por el Equipo Rojo.`, teamVisible: 'all' });
                              } else {
                                  addTerminalOutput({ text: `HTTP/1.1 403 Forbidden`, type: 'error' });
                              }
                          }, 500);
                     }
                     return;
            }
        }
        
        // --- BLUE TEAM COMMANDS ---
        if (isBlueTeam) {
             if (cmd === 'ssh' && args[1] === 'blue-team@BOVEDA-WEB' && !onBoveda) {
                addTerminalOutput({ text: `(SIMULACIÓN) Conectando... Bienvenido a BOVEDA-WEB.`, type: 'output' });
                setPromptState({ user: 'blue-team', host: 'BOVEDA-WEB', dir: '~' });
                return;
            }

            if (onBoveda) {
                const effectiveCmd = cmd === 'sudo' ? args[1] : cmd;
                const effectiveArgs = cmd === 'sudo' ? args.slice(1) : args;

                switch(effectiveCmd) {
                    case 'ufw':
                         if (effectiveArgs[1] === 'enable') {
                             serverState.current.firewallEnabled = true;
                             addTerminalOutput({ text: `(SIMULACIÓN) Firewall activado.`, type: 'output' });
                             addLogEntry({ source: 'Blue Team', message: 'Firewall (UFW) HABILITADO en BOVEDA-WEB.', teamVisible: 'all' });
                         } else if (effectiveArgs[1] === 'status') {
                             addTerminalOutput({ text: `Estado: ${serverState.current.firewallEnabled ? 'activo' : 'inactivo'}`, type: 'output' });
                         } else if (effectiveArgs[1] === 'allow') {
                            addTerminalOutput({ text: `(SIMULACIÓN) Regla UFW añadida para ${effectiveArgs[2]}.`, type: 'output' });
                         }
                         return;
                    case 'nano':
                        if (effectiveArgs[1] === 'sshd_config') {
                             serverState.current.sshHardened = true;
                             addTerminalOutput({ text: `(SIMULACIÓN) 'PermitRootLogin' cambiado a 'no'. Recuerde reiniciar el servicio sshd.`, type: 'output' });
                             addLogEntry({ source: 'Blue Team', message: `Configuración de SSH modificada en BOVEDA-WEB (hardening).`, teamVisible: 'all' });
                        }
                        return;
                    case 'systemctl':
                         if (effectiveArgs[1] === 'restart' && effectiveArgs[2] === 'sshd') {
                             addTerminalOutput({ text: `(SIMULACIÓN) Reiniciando servicio sshd... Configuración aplicada.`, type: 'output' });
                             addLogEntry({ source: 'Blue Team', message: `Servicio SSH reiniciado. Hardening aplicado.`, teamVisible: 'all' });
                         }
                        return;
                    case 'grep':
                         addTerminalOutput({ text: `(SIMULACIÓN) Buscando en auth.log...\n${serverState.current.hydraRunCount > 0 ? `${serverState.current.hydraRunCount} resultados encontrados para "Failed password for root"` : 'No se encontraron resultados.'}`, type: 'output' });
                         addLogEntry({ source: 'Blue Team', message: 'Revisando logs de autenticación en BOVEDA-WEB.', teamVisible: 'blue' });
                        return;
                    case 'ss':
                        addTerminalOutput({ text: `(SIMULACIÓN) Puertos escuchando:\n22/tcp, 80/tcp${!serverState.current.firewallEnabled ? ', 443/tcp, 3306/tcp' : ''}` , type: 'output' });
                        return;
                    case 'ls':
                        if (effectiveArgs[1] === '-l' && effectiveArgs[2]?.includes('db_config.php')) {
                            const perms = serverState.current.dbConfigPermissions === '640' ? 'r--' : 'r--';
                            addTerminalOutput({ text: `-rw-r--${perms} 1 www-data www-data 58 Jul 15 10:00 /var/www/html/db_config.php`, type: 'output' });
                        } else {
                             addTerminalOutput({ text: `(SIMULACIÓN)\ntotal 8\ndrwxr-xr-x 2 root root 4096 Jul 15 09:00 bin\ndrwxr-xr-x 2 root root 4096 Jul 15 09:01 etc`, type: 'output' });
                        }
                        return;
                    case 'chmod':
                        if (effectiveArgs[1] === '640' && effectiveArgs[2]?.includes('db_config.php')) {
                            serverState.current.dbConfigPermissions = '640';
                            addTerminalOutput({ text: `(SIMULACIÓN) Permisos de '/var/www/html/db_config.php' cambiados a 640.`, type: 'output' });
                            addLogEntry({ source: 'Blue Team', message: `Permisos restringidos en db_config.php. Buen trabajo.`, teamVisible: 'all' });
                        } else {
                            addTerminalOutput({ text: `(SIMULACIÓN) Permisos cambiados.`, type: 'output' });
                        }
                        return;
                    case 'openssl':
                        if (effectiveArgs[1] === 's_client') {
                            addTerminalOutput({text: '(SIMULACIÓN) Verificando certificado SSL/TLS...\n--- \nCertificado: \n    CN=BOVEDA-WEB\n    Válido\n    Protocolo: TLSv1.3\n    Cifrado: AES-256-GCM\n--- \nVerificación: OK', type: 'output'});
                            addLogEntry({ source: 'Blue Team', message: `Validación de certificado SSL/TLS realizada en BOVEDA-WEB.`, teamVisible: 'blue' });
                        } else {
                            addTerminalOutput({ text: 'Comando openssl no reconocido.', type: 'error' });
                        }
                        return;
                }
            }
        }


        addTerminalOutput({ text: `Error: comando '${cmd}' no reconocido o no disponible en este contexto.`, type: 'error' });
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
        <span className={user.includes('blue') ? 'text-blue-400' : 'text-red-400'}>{user}</span>
        <span className="text-slate-400">@</span>
        <span className="prompt-host">{host}</span>
        <span className="text-slate-400">:</span>
        <span className="prompt-dir">{dir}</span>
        <span className="text-slate-400">{user === 'root' ? '# ' : '$ '}</span>
    </span>
);
