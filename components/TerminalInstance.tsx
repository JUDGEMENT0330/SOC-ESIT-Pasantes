import React, { useState, useEffect, useRef, useContext } from 'react';
import type { TerminalLine, PromptState } from '../types';
import { RED_TEAM_HELP_TEXT, BLUE_TEAM_HELP_TEXT, SCENARIO_HELP_TEXTS, GENERAL_HELP_TEXT } from '../constants';
import { SimulationContext } from '../SimulationContext';

type Team = 'Red' | 'Blue';

interface TerminalInstanceProps {
    team: Team;
    isControlling?: boolean; // Prop for admin control
}

const getInitialPrompt = (team: Team): PromptState => {
    if (team === 'Blue') {
        return { user: 'pasante-blue', host: 'soc-valtorix', dir: '~' };
    }
    return { user: 'pasante-red', host: 'soc-valtorix', dir: '~' };
};

const getWelcomeMessage = (team: Team): TerminalLine[] => [
    { text: `Bienvenido a la terminal del Equipo ${team}.`, type: 'output' },
    { html: "Escriba <strong class='text-amber-300'>help</strong> para ver sus objetivos y comandos.", type: 'html' },
];

export const TerminalInstance: React.FC<TerminalInstanceProps> = ({ team, isControlling = false }) => {
    const { serverState, addLog, updateServerState, userTeam } = useContext(SimulationContext);
    const isSpectator = userTeam === 'spectator';

    const [output, setOutput] = useState<TerminalLine[]>(getWelcomeMessage(team));
    const [history, setHistory] = useState<string[]>([]);
    const [historyIndex, setHistoryIndex] = useState(0);
    const [input, setInput] = useState('');
    const [promptState, setPromptState] = useState<PromptState>(getInitialPrompt(team));

    const endOfOutputRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Static values for the simulation
    const attackerIp = '188.45.67.123';
    const portalAdminPassword = 'portal@admin123';


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
        // --- Authorization Check ---
        if (isSpectator) {
            if (!isControlling) {
                // Admin is spectating, do nothing.
                return;
            }
            // Admin is controlling, proceed. The 'team' prop determines which team's commands are simulated.
        } else {
            // This is a regular user. Check if they are on their assigned team's terminal.
            if (team.toLowerCase() !== userTeam) {
                addTerminalOutput({ text: "Acción no permitida: Esta no es la terminal de tu equipo.", type: 'error' });
                return;
            }
        }

        const args = command.trim().split(' ');
        const cmd = args[0].toLowerCase();
        
        const isRedTeam = team === 'Red';
        const isBlueTeam = team === 'Blue';
        const currentHost = promptState.host.toUpperCase();

        if (!serverState) {
            addTerminalOutput({ text: "Sincronizando estado...", type: 'output' });
            return;
        }

        const isAttackerBanned = serverState.banned_ips.includes(attackerIp);

        // Universal Commands
        switch (cmd) {
            case 'help':
                const scenarioId = args[1];
                if (scenarioId && SCENARIO_HELP_TEXTS[scenarioId]) {
                    const scenarioHelp = SCENARIO_HELP_TEXTS[scenarioId];
                    const teamSpecificHelp = team === 'Red' ? scenarioHelp.red : scenarioHelp.blue;
                    const fullHelp = scenarioHelp.general + teamSpecificHelp;
                    addTerminalOutput({ html: fullHelp, type: 'html' });
                } else if (isRedTeam) {
                    addTerminalOutput({ html: RED_TEAM_HELP_TEXT, type: 'html' });
                } else if (isBlueTeam) {
                    addTerminalOutput({ html: BLUE_TEAM_HELP_TEXT, type: 'html' });
                } else {
                     addTerminalOutput({ html: GENERAL_HELP_TEXT, type: 'html' });
                }
                return;
            case 'clear': setOutput([]); return;
            case 'marca': addTerminalOutput({ text: 'Marca: CYBER VALTORIX S.A. DE C.V.', type: 'output' }); return;
            case 'exit': 
                if (currentHost !== 'SOC-VALTORIX') {
                    addTerminalOutput({ text: `(SIMULACIÓN) Conexión a ${promptState.host} cerrada.`, type: 'output' });
                    setPromptState(getInitialPrompt(team));
                } else {
                    addTerminalOutput({ text: 'Error: No hay sesión SSH activa para cerrar.', type: 'error' });
                }
                return;
        }

        // --- Contextual Command Check ---
        if (currentHost === 'SOC-VALTORIX') {
            const hostSpecificCommands = [
                'ufw', 'nano', 'systemctl', 'grep', 'ss', 'ls', 'chmod', 'openssl', 'top', 
                'htop', 'journalctl', 'fail2ban-client', 'sha256sum', 'wget'
            ];
            const commandToCheck = cmd === 'sudo' ? args[1] : cmd;
            if (hostSpecificCommands.includes(commandToCheck)) {
                addTerminalOutput({ text: `Error: El comando '${commandToCheck}' solo está disponible después de conectarse a un host de simulación (ej. ssh blue-team@PORTAL-WEB).`, type: 'error' });
                return;
            }
        }

        // --- RED TEAM COMMANDS (from soc-valtorix) ---
        if (isRedTeam && currentHost === 'SOC-VALTORIX') {
            const targetHost = args[args.length - 1].toUpperCase();

            if (cmd !== 'ssh' && !['BOVEDA-WEB', 'PORTAL-WEB'].includes(targetHost)) {
                 const targetCommands = ['nmap', 'hydra', 'hping3', 'dirb', 'nikto', 'curl'];
                 if (targetCommands.includes(cmd)) {
                     addTerminalOutput({ text: `Error: Host objetivo no válido o no especificado. (Ej: ${cmd} BOVEDA-WEB)`, type: 'error' });
                     return;
                 }
            }
            
            if (isAttackerBanned && ['nmap', 'hydra', 'hping3', 'ssh'].includes(cmd)) {
                addTerminalOutput({ text: `(SIMULACIÓN) Error: No route to host. El firewall parece estar bloqueando tu IP.`, type: 'error' });
                return;
            }

            switch(cmd) {
                case 'nmap':
                    addTerminalOutput({ text: `(SIMULACIÓN) Ejecutando Nmap en ${targetHost}...` , type: 'output' });
                    addLog({ source: 'Red Team', message: `Escaneo Nmap detectado contra ${targetHost} desde ${attackerIp}.`, teamVisible: 'blue' });
                    setTimeout(() => {
                        const openPorts = serverState.firewall_enabled
                            ? 'Puertos abiertos: 22/tcp (ssh), 80/tcp (http)'
                            : 'Puertos abiertos: 22/tcp (ssh), 80/tcp (http), 443/tcp (https), 3306/tcp (mysql)';
                        addTerminalOutput({ text: `Resultado:\n${openPorts}`, type: 'output' });
                    }, 1000);
                    return;
                case 'hydra':
                    const user = args.find(a => a === '-l')?.split(' ')[1] || 'root';
                    addTerminalOutput({ text: `(SIMULACIÓN) Ejecutando Hydra contra SSH en ${targetHost} para el usuario '${user}'...`, type: 'output' });
                    updateServerState({ ...serverState, hydra_run_count: serverState.hydra_run_count + 100 });
                    addLog({ source: 'Red Team', message: `[!!] Múltiples intentos de login SSH fallidos para '${user}' desde ${attackerIp}. (Posible ataque de fuerza bruta)`, teamVisible: 'blue' });
                    setTimeout(() => {
                         if (targetHost === 'BOVEDA-WEB' && !serverState.ssh_hardened) {
                            addTerminalOutput({ text: `[ÉXITO] Contraseña encontrada para 'root': '123456'`, type: 'output' });
                            addLog({ source: 'Red Team', message: `[CRÍTICO] Login de 'root' exitoso en BOVEDA-WEB desde ${attackerIp}.`, teamVisible: 'blue' });
                         } else if (targetHost === 'PORTAL-WEB' && user === 'admin') {
                            updateServerState({ ...serverState, admin_password_found: true });
                            addTerminalOutput({ text: `[ÉXITO] Contraseña encontrada para 'admin': '${portalAdminPassword}'`, type: 'output' });
                            addLog({ source: 'Red Team', message: `[CRÍTICO] Contraseña de 'admin' para PORTAL-WEB obtenida por fuerza bruta desde ${attackerIp}.`, teamVisible: 'all' });
                         } else {
                            addTerminalOutput({ text: `[FALLIDO] No se encontraron contraseñas. El servidor puede haber sido asegurado.`, type: 'error' });
                         }
                    }, 2000);
                    return;
                case 'ssh':
                    const [sshUser, sshHost] = (args[1] || '').split('@');
                    const targetSshHost = sshHost?.toUpperCase();
                    if (['BOVEDA-WEB', 'PORTAL-WEB'].includes(targetSshHost)) {
                        addTerminalOutput({ text: `(SIMULACIÓN) Conectando a ${sshHost}...`, type: 'output' });
                        let accessGranted = false;
                        if (targetSshHost === 'BOVEDA-WEB' && sshUser === 'root' && !serverState.ssh_hardened) {
                            accessGranted = true;
                            setPromptState({ user: 'root', host: 'BOVEDA-WEB', dir: '#' });
                        } else if (targetSshHost === 'PORTAL-WEB' && sshUser === 'admin' && serverState.admin_password_found) {
                             accessGranted = true;
                             setPromptState({ user: 'admin', host: 'PORTAL-WEB', dir: '~' });
                        }
                        
                        if(accessGranted) {
                             addTerminalOutput({ text: `Contraseña: [ÉXITO] Bienvenido.`, type: 'output' });
                             addLog({ source: 'Red Team', message: `[CRÍTICO] Acceso SSH exitoso como '${sshUser}' en ${targetSshHost} desde ${attackerIp}.`, teamVisible: 'blue' });
                        } else {
                             addTerminalOutput({ text: 'Acceso denegado.', type: 'error' });
                        }
                    } else {
                        addTerminalOutput({ text: 'Host desconocido.', type: 'error' });
                    }
                    return;
                case 'john':
                    addTerminalOutput({ text: `(SIMULACIÓN) Ejecutando John the Ripper... Contraseña crackeada: '${portalAdminPassword}'`, type: 'output' });
                    updateServerState({ ...serverState, admin_password_found: true });
                    addLog({ source: 'Red Team', message: `Contraseña de 'admin' obtenida offline.`, teamVisible: 'red' });
                    return;
                case 'hping3':
                    updateServerState({ ...serverState, is_dos_active: true, server_load: 99.9 });
                    addTerminalOutput({ text: `(SIMULACIÓN) Inundación SYN iniciada contra ${targetHost}. Presione Ctrl+C para detener.`, type: 'output' });
                    addLog({ source: 'Red Team', message: `[ALERTA] Patrón de tráfico anómalo consistente con un ataque DoS detectado desde ${attackerIp} contra ${targetHost}.`, teamVisible: 'blue' });
                    return;
                case 'curl':
                case 'dirb':
                case 'nikto':
                     addTerminalOutput({ text: `(SIMULACIÓN) Ejecutando ${cmd} contra ${targetHost}...`, type: 'output' });
                     addLog({ source: 'Red Team', message: `Herramienta de reconocimiento web (${cmd}) detectada contra ${targetHost}.`, teamVisible: 'blue' });
                     if (cmd === 'curl' && args[1]?.includes('db_config.php')) {
                          setTimeout(() => {
                              if (serverState.db_config_permissions === '644') {
                                 addTerminalOutput({ text: `HTTP/1.1 200 OK\n\n<?php\n$db_user="admin";\n$db_pass="S3cuRePa$$w0rd!"\n?>`, type: 'output' });
                                 addLog({ source: 'Red Team', message: `[CRÍTICO] Archivo de configuración sensible 'db_config.php' fue accedido por el Equipo Rojo.`, teamVisible: 'all' });
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
             if (cmd === 'ssh' && args[1]?.startsWith('blue-team@')) {
                const host = args[1].split('@')[1].toUpperCase();
                 if (['BOVEDA-WEB', 'PORTAL-WEB'].includes(host)) {
                    addTerminalOutput({ text: `(SIMULACIÓN) Conectando... Bienvenido a ${host}.`, type: 'output' });
                    setPromptState({ user: 'blue-team', host: host, dir: '~' });
                    return;
                }
            }

            if (currentHost !== 'SOC-VALTORIX') {
                const effectiveCmd = cmd === 'sudo' ? args[1] : cmd;
                const effectiveArgs = cmd === 'sudo' ? args.slice(1) : args;

                switch(effectiveCmd) {
                    case 'ufw':
                         if (effectiveArgs[1] === 'enable') {
                             updateServerState({ ...serverState, firewall_enabled: true });
                             addTerminalOutput({ text: `(SIMULACIÓN) Firewall activado en ${currentHost}.`, type: 'output' });
                             addLog({ source: 'Blue Team', message: `Firewall (UFW) HABILITADO en ${currentHost}.`, teamVisible: 'all' });
                         } else if (effectiveArgs[1] === 'status') {
                             addTerminalOutput({ text: `Estado: ${serverState.firewall_enabled ? 'activo' : 'inactivo'}`, type: 'output' });
                         } else if (effectiveArgs[1] === 'allow') {
                            addTerminalOutput({ text: `(SIMULACIÓN) Regla UFW añadida para ${effectiveArgs[2]}.`, type: 'output' });
                         } else if (effectiveArgs[1] === 'deny' && effectiveArgs[3]) {
                            const newBannedIps = [...serverState.banned_ips, effectiveArgs[3]];
                            updateServerState({ ...serverState, banned_ips: newBannedIps });
                             addTerminalOutput({ text: `(SIMULACIÓN) IP ${effectiveArgs[3]} bloqueada.`, type: 'output' });
                             addLog({ source: 'Blue Team', message: `IP ${effectiveArgs[3]} ha sido bloqueada manualmente en el firewall de ${currentHost}.`, teamVisible: 'all' });
                         }
                         return;
                    case 'nano':
                        if (effectiveArgs[1] === 'sshd_config') {
                             updateServerState({ ...serverState, ssh_hardened: true });
                             addTerminalOutput({ text: `(SIMULACIÓN) 'PermitRootLogin' cambiado a 'no'. Recuerde reiniciar el servicio sshd.`, type: 'output' });
                             addLog({ source: 'Blue Team', message: `Configuración de SSH modificada en ${currentHost} (hardening).`, teamVisible: 'all' });
                        }
                        return;
                    case 'systemctl':
                         if (effectiveArgs[1] === 'restart' && effectiveArgs[2] === 'sshd') {
                             addTerminalOutput({ text: `(SIMULACIÓN) Reiniciando servicio sshd... Configuración aplicada.`, type: 'output' });
                             addLog({ source: 'Blue Team', message: `Servicio SSH reiniciado en ${currentHost}. Hardening aplicado.`, teamVisible: 'all' });
                         }
                        return;
                    case 'grep':
                         addTerminalOutput({ text: `(SIMULACIÓN) Buscando en auth.log...\n${serverState.hydra_run_count > 0 ? `${serverState.hydra_run_count} resultados encontrados para "Failed password"` : 'No se encontraron resultados.'}`, type: 'output' });
                         addLog({ source: 'Blue Team', message: `Revisando logs de autenticación en ${currentHost}.`, teamVisible: 'blue' });
                        return;
                    case 'ss':
                        addTerminalOutput({ text: `(SIMULACIÓN) Puertos escuchando:\n22/tcp, 80/tcp${!serverState.firewall_enabled ? ', 443/tcp, 3306/tcp' : ''}` , type: 'output' });
                        return;
                    case 'ls':
                        if (effectiveArgs[1] === '-l' && effectiveArgs[2]?.includes('db_config.php')) {
                            const perms = serverState.db_config_permissions === '640' ? 'r--' : 'r--';
                            addTerminalOutput({ text: `-rw-r--${perms} 1 www-data www-data 58 Jul 15 10:00 /var/www/html/db_config.php`, type: 'output' });
                        } else {
                             addTerminalOutput({ text: `(SIMULACIÓN)\ntotal 8\ndrwxr-xr-x 2 root root 4096 Jul 15 09:00 bin\ndrwxr-xr-x 2 root root 4096 Jul 15 09:01 etc`, type: 'output' });
                        }
                        return;
                    case 'chmod':
                        if (effectiveArgs[1] === '640' && effectiveArgs[2]?.includes('db_config.php')) {
                            updateServerState({ ...serverState, db_config_permissions: '640' });
                            addTerminalOutput({ text: `(SIMULACIÓN) Permisos de '/var/www/html/db_config.php' cambiados a 640.`, type: 'output' });
                            addLog({ source: 'Blue Team', message: `Permisos restringidos en db_config.php. Buen trabajo.`, teamVisible: 'all' });
                        } else {
                            addTerminalOutput({ text: `(SIMULACIÓN) Permisos cambiados.`, type: 'output' });
                        }
                        return;
                    case 'openssl':
                        if (effectiveArgs[1] === 's_client') {
                            addTerminalOutput({text: '(SIMULACIÓN) Verificando certificado SSL/TLS...\n--- \nCertificado: \n    CN=BOVEDA-WEB\n    Válido\n    Protocolo: TLSv1.3\n    Cifrado: AES-256-GCM\n--- \nVerificación: OK', type: 'output'});
                            addLog({ source: 'Blue Team', message: `Validación de certificado SSL/TLS realizada en BOVEDA-WEB.`, teamVisible: 'blue' });
                        } else {
                            addTerminalOutput({ text: 'Comando openssl no reconocido.', type: 'error' });
                        }
                        return;
                    // Scenario 8 commands
                    case 'top': case 'htop':
                         const load = serverState.is_dos_active ? 99.9 : 5.0;
                         addTerminalOutput({ text: `(SIMULACIÓN) Carga del sistema: ${load.toFixed(1)}%`, type: 'output' });
                         return;
                    case 'journalctl':
                         addTerminalOutput({ text: `(SIMULACIÓN) Revisando logs de sshd...\n-- Logs --\n` +
                            `Jul 15 10:01:03 ${currentHost} sshd[1121]: Failed password for admin from ${attackerIp} port 12345\n`.repeat(5) +
                            `Jul 15 10:01:04 ${currentHost} sshd[1122]: Failed password for admin from ${attackerIp} port 12346\n`.repeat(5), type: 'output' });
                         return;
                    case 'fail2ban-client':
                         if (effectiveArgs[2] === 'banip' && effectiveArgs[3]) {
                            const newBannedIps = [...serverState.banned_ips, effectiveArgs[3]];
                            updateServerState({ ...serverState, banned_ips: newBannedIps });
                            addTerminalOutput({ text: `(SIMULACIÓN) IP ${effectiveArgs[3]} baneada por Fail2Ban.`, type: 'output' });
                            addLog({ source: 'Blue Team', message: `IP ${effectiveArgs[3]} ha sido bloqueada vía Fail2Ban en ${currentHost}.`, teamVisible: 'all' });
                         }
                        return;
                    case 'sha256sum':
                        const originalHash = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'; // empty file hash
                        const compromisedHash = 'a1b2c3d4e5f6...compromised';
                        const currentHash = serverState.payload_deployed ? compromisedHash : originalHash;
                        addTerminalOutput({ text: `${currentHash}  /var/www/html/index.php`, type: 'output' });
                        if(serverState.payload_deployed) {
                            addLog({ source: 'System', message: `[CRÍTICO] ¡ALERTA DE FIM! El hash de /var/www/html/index.php no coincide. El sistema está comprometido.`, teamVisible: 'all' });
                        }
                        return;
                }
            }
        }
        
        // --- Commands available inside a compromised host ---
        if (currentHost !== 'SOC-VALTORIX') {
             if (cmd === 'wget') {
                 updateServerState({ ...serverState, payload_deployed: true });
                 addTerminalOutput({ text: `(SIMULACIÓN) --10:05:10--  http://malware-repo.bad/payload.sh\nConectando a malware-repo.bad... conectado.\n... Guardado.`, type: 'output' });
                 addLog({ source: 'Red Team', message: `[ALERTA] Tráfico de red saliente sospechoso detectado desde ${currentHost} a un repositorio de malware conocido.`, teamVisible: 'blue' });
                 return;
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

    const canInteract = (isSpectator && isControlling && !!serverState) || 
                        (!isSpectator && team.toLowerCase() === userTeam && !!serverState);


    const getPlaceholderText = () => {
        if (!serverState) return "Sincronizando estado...";
        if (isSpectator) {
            return isControlling ? "Modo Control activado. Escriba un comando..." : "Modo Espectador (solo lectura)";
        }
        if (team.toLowerCase() !== userTeam) {
            return "Terminal de otro equipo...";
        }
        return "Escriba un comando...";
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
                    disabled={!canInteract}
                    placeholder={getPlaceholderText()}
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
        <span className="text-slate-400">{user === 'root' || user === 'admin' ? '# ' : '$ '}</span>
    </span>
);
