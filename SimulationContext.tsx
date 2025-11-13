import React, { createContext, useState, useEffect, ReactNode, useRef } from 'react';
import { supabase } from './supabaseClient';
import type { SimulationState, LogEntry, SessionData, TerminalLine, PromptState } from './types';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { DEFAULT_SIMULATION_STATE, RED_TEAM_HELP_TEXT, BLUE_TEAM_HELP_TEXT, SCENARIO_HELP_TEXTS, GENERAL_HELP_TEXT } from './constants';

const getInitialPrompt = (team: 'Red' | 'Blue'): PromptState => {
    if (team === 'Blue') {
        return { user: 'pasante-blue', host: 'soc-valtorix', dir: '~' };
    }
    return { user: 'pasante-red', host: 'soc-valtorix', dir: '~' };
};

const getWelcomeMessage = (team: 'Red' | 'Blue'): TerminalLine[] => [
    { text: `Bienvenido a la terminal del Equipo ${team}.`, type: 'output' },
    { html: "Escriba <strong class='text-amber-300'>help</strong> para ver sus objetivos y comandos.", type: 'html' },
];

interface SimulationContextType {
    serverState: SimulationState | null;
    logs: LogEntry[];
    addLog: (log: Omit<LogEntry, 'id' | 'timestamp' | 'session_id'>) => Promise<void>;
    updateServerState: (newState: Partial<SimulationState>) => Promise<void>;
    userTeam: 'red' | 'blue' | 'spectator' | null;
    redOutput: TerminalLine[];
    blueOutput: TerminalLine[];
    redPrompt: PromptState;
    bluePrompt: PromptState;
    processAndBroadcastCommand: (team: 'Red' | 'Blue', command: string, isFromAdminControl?: boolean) => Promise<void>;
}

export const SimulationContext = createContext<SimulationContextType>({
    serverState: null,
    logs: [],
    addLog: async () => {},
    updateServerState: async () => {},
    userTeam: null,
    redOutput: [],
    blueOutput: [],
    redPrompt: getInitialPrompt('Red'),
    bluePrompt: getInitialPrompt('Blue'),
    processAndBroadcastCommand: async () => {},
});

interface CommandLogicParams {
    command: string;
    team: 'Red' | 'Blue';
    serverState: SimulationState;
    promptState: PromptState;
    addLog: (log: Omit<LogEntry, 'id' | 'timestamp' | 'session_id'>) => Promise<void>;
    updateServerState: (newState: Partial<SimulationState>) => Promise<void>;
    addDelayedOutput: (lines: TerminalLine[]) => void;
}

// This function contains all the logic moved from TerminalInstance
const processCommandLogic = async ({ command, team, serverState, promptState, addLog, updateServerState, addDelayedOutput }: CommandLogicParams): Promise<{ outputLines: TerminalLine[], newPrompt?: PromptState, clear?: boolean }> => {
    let outputLines: TerminalLine[] = [];
    let newPrompt: PromptState | undefined;
    let clear = false;
    
    const attackerIp = '188.45.67.123';
    const portalAdminPassword = 'portal@admin123';
    const isAttackerBanned = serverState.banned_ips.includes(attackerIp);

    const args = command.trim().split(' ');
    const cmd = args[0].toLowerCase();
    
    const isRedTeam = team === 'Red';
    const isBlueTeam = team === 'Blue';
    const currentHost = promptState.host.toUpperCase();

    switch (cmd) {
        case 'help':
            const scenarioId = args[1];
            if (scenarioId && SCENARIO_HELP_TEXTS[scenarioId]) {
                const scenarioHelp = SCENARIO_HELP_TEXTS[scenarioId];
                const teamSpecificHelp = team === 'Red' ? scenarioHelp.red : scenarioHelp.blue;
                outputLines.push({ html: scenarioHelp.general + teamSpecificHelp, type: 'html' });
            } else if (isRedTeam) {
                outputLines.push({ html: RED_TEAM_HELP_TEXT, type: 'html' });
            } else if (isBlueTeam) {
                outputLines.push({ html: BLUE_TEAM_HELP_TEXT, type: 'html' });
            } else {
                outputLines.push({ html: GENERAL_HELP_TEXT, type: 'html' });
            }
            break;
        case 'clear':
            clear = true;
            break;
        case 'marca':
            outputLines.push({ text: 'Marca: CYBER VALTORIX S.A. DE C.V.', type: 'output' });
            break;
        case 'exit': 
            if (currentHost !== 'SOC-VALTORIX') {
                outputLines.push({ text: `(SIMULACIÓN) Conexión a ${promptState.host} cerrada.`, type: 'output' });
                newPrompt = getInitialPrompt(team);
            } else {
                outputLines.push({ text: 'Error: No hay sesión SSH activa para cerrar.', type: 'error' });
            }
            break;
        // Host-specific command guard
        default:
            if (currentHost === 'SOC-VALTORIX') {
                const hostSpecificCommands = ['ufw', 'nano', 'systemctl', 'grep', 'ss', 'ls', 'chmod', 'openssl', 'top', 'htop', 'journalctl', 'fail2ban-client', 'sha256sum', 'wget'];
                const commandToCheck = cmd === 'sudo' ? args[1] : cmd;
                if (hostSpecificCommands.includes(commandToCheck)) {
                    outputLines.push({ text: `Error: El comando '${commandToCheck}' solo está disponible después de conectarse a un host de simulación (ej. ssh blue-team@PORTAL-WEB).`, type: 'error' });
                    return { outputLines, newPrompt, clear };
                }
            }

            if (isRedTeam && currentHost === 'SOC-VALTORIX') {
                await handleRedTeamCommands();
            } else if (isBlueTeam) {
                await handleBlueTeamCommands();
            } else if (currentHost !== 'SOC-VALTORIX') {
                 await handleCompromisedHostCommands();
            } else {
                outputLines.push({ text: `Error: comando '${cmd}' no reconocido o no disponible en este contexto.`, type: 'error' });
            }
    }
    
    async function handleRedTeamCommands() {
        // Fix: Improve target host parsing to handle URLs and various command formats.
        const targetArg = args.find(arg => arg.toUpperCase().includes('BOVEDA-WEB') || arg.toUpperCase().includes('PORTAL-WEB'));
        let targetHost = '';
        if (targetArg) {
            if (targetArg.toUpperCase().includes('BOVEDA-WEB')) targetHost = 'BOVEDA-WEB';
            else if (targetArg.toUpperCase().includes('PORTAL-WEB')) targetHost = 'PORTAL-WEB';
        }

        if (cmd !== 'ssh' && !['BOVEDA-WEB', 'PORTAL-WEB'].includes(targetHost)) {
             const targetCommands = ['nmap', 'hydra', 'hping3', 'dirb', 'nikto', 'curl'];
             if (targetCommands.includes(cmd)) {
                 outputLines.push({ text: `Error: Host objetivo no válido o no especificado. (Ej: ${cmd} BOVEDA-WEB)`, type: 'error' });
                 return;
             }
        }
        if (isAttackerBanned && ['nmap', 'hydra', 'hping3', 'ssh'].includes(cmd)) {
            outputLines.push({ text: `(SIMULACIÓN) Error: No route to host. El firewall parece estar bloqueando tu IP.`, type: 'error' });
            return;
        }

        switch(cmd) {
            case 'nmap':
                outputLines.push({ text: `(SIMULACIÓN) Ejecutando Nmap en ${targetHost}...`, type: 'output' });
                await addLog({ source: 'Red Team', message: `Escaneo Nmap detectado contra ${targetHost} desde ${attackerIp}.`, teamVisible: 'blue' });
                setTimeout(() => {
                    const openPorts = serverState.firewall_enabled ? 'Puertos abiertos: 22/tcp (ssh), 80/tcp (http)' : 'Puertos abiertos: 22/tcp (ssh), 80/tcp (http), 443/tcp (https), 3306/tcp (mysql)';
                    addDelayedOutput([{ text: `Resultado:\n${openPorts}`, type: 'output' }]);
                }, 1000);
                break;
            case 'hydra':
                // Fix: Dynamically set the user based on the target to fix the unintentional comparison error.
                const user = targetHost === 'PORTAL-WEB' ? 'admin' : 'root';
                outputLines.push({ text: `(SIMULACIÓN) Ejecutando Hydra contra SSH en ${targetHost} para el usuario '${user}'...`, type: 'output' });
                await updateServerState({ ...serverState, hydra_run_count: serverState.hydra_run_count + 100 });
                await addLog({ source: 'Red Team', message: `[!!] Múltiples intentos de login SSH fallidos para '${user}' desde ${attackerIp}. (Posible ataque de fuerza bruta)`, teamVisible: 'blue' });
                setTimeout(async () => {
                     let hydraResult: TerminalLine;
                     if (targetHost === 'BOVEDA-WEB' && !serverState.ssh_hardened) {
                        hydraResult = { text: `[ÉXITO] Contraseña encontrada para 'root': '123456'`, type: 'output' };
                        await addLog({ source: 'Red Team', message: `[CRÍTICO] Login de 'root' exitoso en BOVEDA-WEB desde ${attackerIp}.`, teamVisible: 'blue' });
                     } else if (targetHost === 'PORTAL-WEB') {
                        await updateServerState({ ...serverState, admin_password_found: true });
                        hydraResult = { text: `[ÉXITO] Contraseña encontrada para 'admin': '${portalAdminPassword}'`, type: 'output' };
                        await addLog({ source: 'Red Team', message: `[CRÍTICO] Contraseña de 'admin' para PORTAL-WEB obtenida por fuerza bruta desde ${attackerIp}.`, teamVisible: 'all' });
                     } else {
                        hydraResult = { text: `[FALLIDO] No se encontraron contraseñas. El servidor puede haber sido asegurado.`, type: 'error' };
                     }
                     addDelayedOutput([hydraResult]);
                }, 2000);
                break;
            case 'ssh':
                const [sshUser, sshHost] = (args[1] || '').split('@');
                const targetSshHost = sshHost?.toUpperCase();
                if (['BOVEDA-WEB', 'PORTAL-WEB'].includes(targetSshHost)) {
                    outputLines.push({ text: `(SIMULACIÓN) Conectando a ${sshHost}...`, type: 'output' });
                    let accessGranted = false;
                    if (targetSshHost === 'BOVEDA-WEB' && sshUser === 'root' && !serverState.ssh_hardened) {
                        accessGranted = true;
                        newPrompt = { user: 'root', host: 'BOVEDA-WEB', dir: '#' };
                    } else if (targetSshHost === 'PORTAL-WEB' && sshUser === 'admin' && serverState.admin_password_found) {
                         accessGranted = true;
                         newPrompt = { user: 'admin', host: 'PORTAL-WEB', dir: '~' };
                    }
                    if(accessGranted) {
                         outputLines.push({ text: `Contraseña: [ÉXITO] Bienvenido.`, type: 'output' });
                         await addLog({ source: 'Red Team', message: `[CRÍTICO] Acceso SSH exitoso como '${sshUser}' en ${targetSshHost} desde ${attackerIp}.`, teamVisible: 'blue' });
                    } else {
                         outputLines.push({ text: 'Acceso denegado.', type: 'error' });
                    }
                } else {
                    outputLines.push({ text: 'Host desconocido.', type: 'error' });
                }
                break;
            case 'john':
                outputLines.push({ text: `(SIMULACIÓN) Ejecutando John the Ripper... Contraseña crackeada: '${portalAdminPassword}'`, type: 'output' });
                await updateServerState({ ...serverState, admin_password_found: true });
                await addLog({ source: 'Red Team', message: `Contraseña de 'admin' obtenida offline.`, teamVisible: 'red' });
                break;
            case 'hping3':
                await updateServerState({ ...serverState, is_dos_active: true, server_load: 99.9 });
                outputLines.push({ text: `(SIMULACIÓN) Inundación SYN iniciada contra ${targetHost}. Presione Ctrl+C para detener.`, type: 'output' });
                await addLog({ source: 'Red Team', message: `[ALERTA] Patrón de tráfico anómalo consistente con un ataque DoS detectado desde ${attackerIp} contra ${targetHost}.`, teamVisible: 'blue' });
                break;
            case 'curl':
            case 'dirb':
            case 'nikto':
                 outputLines.push({ text: `(SIMULACIÓN) Ejecutando ${cmd} contra ${targetHost}...`, type: 'output' });
                 await addLog({ source: 'Red Team', message: `Herramienta de reconocimiento web (${cmd}) detectada contra ${targetHost}.`, teamVisible: 'blue' });
                 if (cmd === 'curl' && args[1]?.includes('db_config.php')) {
                      setTimeout(async () => {
                          if (serverState.db_config_permissions === '644') {
                             addDelayedOutput([{ text: `HTTP/1.1 200 OK\n\n<?php\n$db_user="admin";\n$db_pass="S3cuRePa$$w0rd!"\n?>`, type: 'output' }]);
                             await addLog({ source: 'Red Team', message: `[CRÍTICO] Archivo de configuración sensible 'db_config.php' fue accedido por el Equipo Rojo.`, teamVisible: 'all' });
                          } else {
                              addDelayedOutput([{ text: `HTTP/1.1 403 Forbidden`, type: 'error' }]);
                          }
                      }, 500);
                 }
                 break;
            default:
                outputLines.push({ text: `Error: comando '${cmd}' no reconocido o no disponible en este contexto.`, type: 'error' });
        }
    }

    async function handleBlueTeamCommands() {
         if (cmd === 'ssh' && args[1]?.startsWith('blue-team@')) {
            const host = args[1].split('@')[1].toUpperCase();
             if (['BOVEDA-WEB', 'PORTAL-WEB'].includes(host)) {
                outputLines.push({ text: `(SIMULACIÓN) Conectando... Bienvenido a ${host}.`, type: 'output' });
                newPrompt = { user: 'blue-team', host: host, dir: '~' };
                return;
            }
        }
        if (currentHost !== 'SOC-VALTORIX') {
            const effectiveCmd = cmd === 'sudo' ? args[1] : cmd;
            const effectiveArgs = cmd === 'sudo' ? args.slice(1) : args;
            switch(effectiveCmd) {
                case 'ufw':
                     if (effectiveArgs[1] === 'enable') {
                         await updateServerState({ ...serverState, firewall_enabled: true });
                         outputLines.push({ text: `(SIMULACIÓN) Firewall activado en ${currentHost}.`, type: 'output' });
                         await addLog({ source: 'Blue Team', message: `Firewall (UFW) HABILITADO en ${currentHost}.`, teamVisible: 'all' });
                     } else if (effectiveArgs[1] === 'status') {
                         outputLines.push({ text: `Estado: ${serverState.firewall_enabled ? 'activo' : 'inactivo'}`, type: 'output' });
                     } else if (effectiveArgs[1] === 'allow') {
                        outputLines.push({ text: `(SIMULACIÓN) Regla UFW añadida para ${effectiveArgs[2]}.`, type: 'output' });
                     } else if (effectiveArgs[1] === 'deny' && effectiveArgs[3]) {
                        const newBannedIps = [...serverState.banned_ips, effectiveArgs[3]];
                        await updateServerState({ ...serverState, banned_ips: newBannedIps });
                         outputLines.push({ text: `(SIMULACIÓN) IP ${effectiveArgs[3]} bloqueada.`, type: 'output' });
                         await addLog({ source: 'Blue Team', message: `IP ${effectiveArgs[3]} ha sido bloqueada manualmente en el firewall de ${currentHost}.`, teamVisible: 'all' });
                     }
                     break;
                case 'nano':
                    if (effectiveArgs[1] === 'sshd_config') {
                         await updateServerState({ ...serverState, ssh_hardened: true });
                         outputLines.push({ text: `(SIMULACIÓN) 'PermitRootLogin' cambiado a 'no'. Recuerde reiniciar el servicio sshd.`, type: 'output' });
                         await addLog({ source: 'Blue Team', message: `Configuración de SSH modificada en ${currentHost} (hardening).`, teamVisible: 'all' });
                    }
                    break;
                case 'systemctl':
                     if (effectiveArgs[1] === 'restart' && effectiveArgs[2] === 'sshd') {
                         outputLines.push({ text: `(SIMULACIÓN) Reiniciando servicio sshd... Configuración aplicada.`, type: 'output' });
                         await addLog({ source: 'Blue Team', message: `Servicio SSH reiniciado en ${currentHost}. Hardening aplicado.`, teamVisible: 'all' });
                     }
                    break;
                case 'grep':
                     outputLines.push({ text: `(SIMULACIÓN) Buscando en auth.log...\n${serverState.hydra_run_count > 0 ? `${serverState.hydra_run_count} resultados encontrados para "Failed password"` : 'No se encontraron resultados.'}`, type: 'output' });
                     await addLog({ source: 'Blue Team', message: `Revisando logs de autenticación en ${currentHost}.`, teamVisible: 'blue' });
                    break;
                case 'ss':
                    outputLines.push({ text: `(SIMULACIÓN) Puertos escuchando:\n22/tcp, 80/tcp${!serverState.firewall_enabled ? ', 443/tcp, 3306/tcp' : ''}` , type: 'output' });
                    break;
                case 'ls':
                    if (effectiveArgs[1] === '-l' && effectiveArgs[2]?.includes('db_config.php')) {
                        const perms = serverState.db_config_permissions === '640' ? 'r--' : 'r--';
                        outputLines.push({ text: `-rw-r--${perms} 1 www-data www-data 58 Jul 15 10:00 /var/www/html/db_config.php`, type: 'output' });
                    } else {
                         outputLines.push({ text: `(SIMULACIÓN)\ntotal 8\ndrwxr-xr-x 2 root root 4096 Jul 15 09:00 bin\ndrwxr-xr-x 2 root root 4096 Jul 15 09:01 etc`, type: 'output' });
                    }
                    break;
                case 'chmod':
                    if (effectiveArgs[1] === '640' && effectiveArgs[2]?.includes('db_config.php')) {
                        await updateServerState({ ...serverState, db_config_permissions: '640' });
                        outputLines.push({ text: `(SIMULACIÓN) Permisos de '/var/www/html/db_config.php' cambiados a 640.`, type: 'output' });
                        await addLog({ source: 'Blue Team', message: `Permisos restringidos en db_config.php. Buen trabajo.`, teamVisible: 'all' });
                    } else {
                        outputLines.push({ text: `(SIMULACIÓN) Permisos cambiados.`, type: 'output' });
                    }
                    break;
                case 'openssl':
                    if (effectiveArgs[1] === 's_client') {
                        outputLines.push({text: '(SIMULACIÓN) Verificando certificado SSL/TLS...\n--- \nCertificado: \n    CN=BOVEDA-WEB\n    Válido\n    Protocolo: TLSv1.3\n    Cifrado: AES-256-GCM\n--- \nVerificación: OK', type: 'output'});
                        await addLog({ source: 'Blue Team', message: `Validación de certificado SSL/TLS realizada en BOVEDA-WEB.`, teamVisible: 'blue' });
                    } else {
                        outputLines.push({ text: 'Comando openssl no reconocido.', type: 'error' });
                    }
                    break;
                case 'top': case 'htop':
                     const load = serverState.is_dos_active ? 99.9 : 5.0;
                     outputLines.push({ text: `(SIMULACIÓN) Carga del sistema: ${load.toFixed(1)}%`, type: 'output' });
                     break;
                case 'journalctl':
                     outputLines.push({ text: `(SIMULACIÓN) Revisando logs de sshd...\n-- Logs --\n` +
                        `Jul 15 10:01:03 ${currentHost} sshd[1121]: Failed password for admin from ${attackerIp} port 12345\n`.repeat(5) +
                        `Jul 15 10:01:04 ${currentHost} sshd[1122]: Failed password for admin from ${attackerIp} port 12346\n`.repeat(5), type: 'output' });
                     break;
                case 'fail2ban-client':
                     if (effectiveArgs[2] === 'banip' && effectiveArgs[3]) {
                        const newBannedIps = [...serverState.banned_ips, effectiveArgs[3]];
                        await updateServerState({ ...serverState, banned_ips: newBannedIps });
                        outputLines.push({ text: `(SIMULACIÓN) IP ${effectiveArgs[3]} baneada por Fail2Ban.`, type: 'output' });
                        await addLog({ source: 'Blue Team', message: `IP ${effectiveArgs[3]} ha sido bloqueada vía Fail2Ban en ${currentHost}.`, teamVisible: 'all' });
                     }
                    break;
                case 'sha256sum':
                    const originalHash = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'; // empty file hash
                    const compromisedHash = 'a1b2c3d4e5f6...compromised';
                    const currentHash = serverState.payload_deployed ? compromisedHash : originalHash;
                    outputLines.push({ text: `${currentHash}  /var/www/html/index.php`, type: 'output' });
                    if(serverState.payload_deployed) {
                        await addLog({ source: 'System', message: `[CRÍTICO] ¡ALERTA DE FIM! El hash de /var/www/html/index.php no coincide. El sistema está comprometido.`, teamVisible: 'all' });
                    }
                    break;
                default:
                    outputLines.push({ text: `Error: comando '${cmd}' no reconocido o no disponible en este contexto.`, type: 'error' });
            }
        } else {
             outputLines.push({ text: `Error: comando '${cmd}' no reconocido o no disponible en este contexto.`, type: 'error' });
        }
    }

    async function handleCompromisedHostCommands() {
        if (cmd === 'wget') {
             await updateServerState({ ...serverState, payload_deployed: true });
             outputLines.push({ text: `(SIMULACIÓN) --10:05:10--  http://malware-repo.bad/payload.sh\nConectando a malware-repo.bad... conectado.\n... Guardado.`, type: 'output' });
             await addLog({ source: 'Red Team', message: `[ALERTA] Tráfico de red saliente sospechoso detectado desde ${currentHost} a un repositorio de malware conocido.`, teamVisible: 'blue' });
             return;
         }
        outputLines.push({ text: `Error: comando '${cmd}' no reconocido o no disponible en este contexto.`, type: 'error' });
    }

    return { outputLines, newPrompt, clear };
};

// Fix: Define SimulationProviderProps interface
interface SimulationProviderProps {
    children: ReactNode;
    sessionData: SessionData;
}

export const SimulationProvider: React.FC<SimulationProviderProps> = ({ children, sessionData }) => {
    const [serverState, setServerState] = useState<SimulationState | null>(null);
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [redOutput, setRedOutput] = useState<TerminalLine[]>([]);
    const [blueOutput, setBlueOutput] = useState<TerminalLine[]>([]);
    const [redPrompt, setRedPrompt] = useState<PromptState>(getInitialPrompt('Red'));
    const [bluePrompt, setBluePrompt] = useState<PromptState>(getInitialPrompt('Blue'));
    const [terminalChannel, setTerminalChannel] = useState<RealtimeChannel | null>(null);
    const clientId = useRef(crypto.randomUUID());
    const { sessionId, team } = sessionData;

    useEffect(() => {
        if (!sessionId) return;
        
        setRedOutput(getWelcomeMessage('Red'));
        setBlueOutput(getWelcomeMessage('Blue'));
        setRedPrompt(getInitialPrompt('Red'));
        setBluePrompt(getInitialPrompt('Blue'));

        let stateChannel: RealtimeChannel;
        let logsChannel: RealtimeChannel;

        const fetchInitialData = async () => {
            const { data: stateData, error: stateError } = await supabase.from('simulation_state').select('*').eq('session_id', sessionId).maybeSingle();
            if (stateError && stateError.code !== 'PGRST116') {
                console.error("Error fetching simulation state, falling back to local state:", stateError);
                setServerState({ session_id: sessionId, ...DEFAULT_SIMULATION_STATE });
            } else if (!stateData) {
                console.warn(`No simulation state found for session ${sessionId}. Initializing with default local state.`);
                setServerState({ session_id: sessionId, ...DEFAULT_SIMULATION_STATE });
            } else {
                setServerState(stateData);
            }

            const { data: logsData, error: logsError } = await supabase.from('simulation_logs').select('*').eq('session_id', sessionId).order('timestamp', { ascending: true });
            if (logsError) console.error('Error fetching initial logs:', logsError);
            else setLogs(logsData as LogEntry[]);
        };

        fetchInitialData();

        stateChannel = supabase.channel(`simulation-state-${sessionId}`).on<SimulationState>('postgres_changes', { event: '*', schema: 'public', table: 'simulation_state', filter: `session_id=eq.${sessionId}` }, (payload) => {
            if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
                setServerState(payload.new as SimulationState);
            }
        }).subscribe();
        
        logsChannel = supabase.channel(`simulation-logs-${sessionId}`).on<LogEntry>('postgres_changes', { event: 'INSERT', schema: 'public', table: 'simulation_logs', filter: `session_id=eq.${sessionId}` }, (payload) => {
            setLogs(prevLogs => [...prevLogs, payload.new as LogEntry]);
        }).subscribe();

        const termChannel = supabase.channel(`terminal-updates-${sessionId}`);
        termChannel.on('broadcast', { event: 'terminal_update' }, ({ payload }) => {
            if (payload.senderId === clientId.current) return;

            const { team, lines, newPrompt, clear } = payload;
            const setOutput = team === 'Red' ? setRedOutput : setBlueOutput;
            const setPrompt = team === 'Red' ? setRedPrompt : setBluePrompt;

            if (clear) {
                setOutput([]);
            } else if (lines) {
                setOutput(prev => [...prev, ...lines]);
            }
            if (newPrompt) {
                setPrompt(newPrompt);
            }
        }).subscribe();
        setTerminalChannel(termChannel);

        return () => {
            supabase.removeChannel(stateChannel);
            supabase.removeChannel(logsChannel);
            supabase.removeChannel(termChannel);
        };
    }, [sessionId]);

    const addLog = async (log: Omit<LogEntry, 'id' | 'timestamp' | 'session_id'>) => {
        const newLog = { session_id: sessionId, source_team: log.source, message: log.message, team_visible: log.teamVisible };
        const { error } = await supabase.from('simulation_logs').insert(newLog);
        if (error) console.error('Error adding log:', error);
    };

    const updateServerState = async (newState: Partial<SimulationState>) => {
        if (!serverState) return;
        const updatedState = { ...serverState, ...newState, last_updated: new Date().toISOString(), session_id: sessionId };
        const { error } = await supabase.from('simulation_state').upsert(updatedState);
        if (error) {
            console.error('Error upserting server state:', error);
            setServerState(updatedState);
        }
    };
    
    const addBroadcastedOutput = async (team: 'Red' | 'Blue', lines: TerminalLine[]) => {
        if (!terminalChannel) return;
        const setOutput = team === 'Red' ? setRedOutput : setBlueOutput;
        setOutput(prev => [...prev, ...lines]);
        await terminalChannel.send({
            type: 'broadcast', event: 'terminal_update',
            payload: { team, lines, senderId: clientId.current }
        });
    };

    const processAndBroadcastCommand = async (team: 'Red' | 'Blue', command: string, isFromAdminControl: boolean = false) => {
        if (!terminalChannel || !serverState) return;

        const currentUserTeam = sessionData.team;
        if (currentUserTeam === 'spectator' && !isFromAdminControl) return;
        if (currentUserTeam !== 'spectator' && team.toLowerCase() !== currentUserTeam) return;

        const promptState = team === 'Red' ? redPrompt : bluePrompt;
        const promptLine: TerminalLine = { type: 'prompt' };
        const commandLine: TerminalLine = { text: command, type: 'command' };

        const { outputLines, newPrompt, clear } = await processCommandLogic({
            command, team, serverState, promptState, addLog, updateServerState,
            addDelayedOutput: (lines) => addBroadcastedOutput(team, lines)
        });

        const setOutput = team === 'Red' ? setRedOutput : setBlueOutput;
        const setPrompt = team === 'Red' ? setRedPrompt : setBluePrompt;

        if (clear) {
            setOutput([]);
            await terminalChannel.send({ type: 'broadcast', event: 'terminal_update', payload: { team, clear: true, senderId: clientId.current } });
        } else {
            const allNewLines = [promptLine, commandLine, ...outputLines];
            setOutput(prev => [...prev, ...allNewLines]);
            if (newPrompt) setPrompt(newPrompt);
            await terminalChannel.send({
                type: 'broadcast', event: 'terminal_update',
                payload: { team, lines: allNewLines, newPrompt, senderId: clientId.current }
            });
        }
    };

    const value = {
        serverState, logs, addLog, updateServerState, userTeam: team,
        redOutput, blueOutput, redPrompt, bluePrompt, processAndBroadcastCommand
    };

    return <SimulationContext.Provider value={value}>{children}</SimulationContext.Provider>;
};
