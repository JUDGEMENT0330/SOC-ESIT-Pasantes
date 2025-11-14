
import React, { createContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from './supabaseClient';
import type { SimulationState, LogEntry, SessionData, TerminalLine, PromptState } from './types';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { DEFAULT_SIMULATION_STATE, RED_TEAM_HELP_TEXT, BLUE_TEAM_HELP_TEXT, SCENARIO_HELP_TEXTS, GENERAL_HELP_TEXT } from './constants';

interface SimulationContextType {
    serverState: SimulationState | null;
    logs: LogEntry[];
    addLog: (log: Omit<LogEntry, 'id' | 'timestamp' | 'session_id'>) => Promise<void>;
    updateServerState: (newState: Partial<SimulationState>) => Promise<void>;
    userTeam: 'red' | 'blue' | 'spectator' | null;
    processCommand: (team: 'Red' | 'Blue', command: string, isFromAdminControl?: boolean) => Promise<void>;
}

export const SimulationContext = createContext<SimulationContextType>({
    serverState: null,
    logs: [],
    addLog: async () => {},
    updateServerState: async () => {},
    userTeam: null,
    processCommand: async () => {},
});

interface CommandLogicParams {
    command: string;
    team: 'Red' | 'Blue';
    serverState: SimulationState;
    addLog: (log: Omit<LogEntry, 'id' | 'timestamp' | 'session_id'>) => Promise<void>;
    updateServerState: (newState: Partial<SimulationState>) => Promise<void>;
    addDelayedOutput: (lines: TerminalLine[]) => void;
}

const processCommandLogic = async ({ command, team, serverState, addLog, updateServerState, addDelayedOutput }: CommandLogicParams): Promise<{ outputLines: TerminalLine[], newPrompt?: PromptState, clear?: boolean }> => {
    let outputLines: TerminalLine[] = [];
    let newPrompt: PromptState | undefined;
    let clear = false;
    
    const attackerIp = '188.45.67.123';
    const portalAdminPassword = 'portal@admin123';
    const isAttackerBanned = serverState.banned_ips.includes(attackerIp);
    const promptState = team === 'Red' 
        ? (serverState.prompt_red || DEFAULT_SIMULATION_STATE.prompt_red)
        : (serverState.prompt_blue || DEFAULT_SIMULATION_STATE.prompt_blue);

    const args = command.trim().split(' ');
    const cmd = args[0].toLowerCase();
    
    const isRedTeam = team === 'Red';
    const currentHost = promptState.host.toUpperCase();

    // 1. Handle global commands first
    switch (cmd) {
        case 'help':
            const scenarioId = args[1];
            if (scenarioId && SCENARIO_HELP_TEXTS[scenarioId]) {
                const scenarioHelp = SCENARIO_HELP_TEXTS[scenarioId];
                const teamSpecificHelp = team === 'Red' ? scenarioHelp.red : scenarioHelp.blue;
                outputLines.push({ html: scenarioHelp.general + teamSpecificHelp, type: 'html' });
            } else if (isRedTeam) {
                outputLines.push({ html: RED_TEAM_HELP_TEXT, type: 'html' });
            } else { // Blue Team
                outputLines.push({ html: BLUE_TEAM_HELP_TEXT, type: 'html' });
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
                newPrompt = team === 'Red' 
                    ? DEFAULT_SIMULATION_STATE.prompt_red 
                    : DEFAULT_SIMULATION_STATE.prompt_blue;
            } else {
                outputLines.push({ text: 'Error: No hay sesión SSH activa para cerrar.', type: 'error' });
            }
            break;
    }
    
    // If a global command was handled, we can return early.
    if (outputLines.length > 0 || clear) {
        return { outputLines, newPrompt, clear };
    }

    // 2. Handle context-specific commands with clear routing
    if (isRedTeam) {
        if (currentHost === 'SOC-VALTORIX') {
            await handleRedTeamLocalCommands();
        } else {
            await handleRedTeamRemoteCommands();
        }
    } else { // isBlueTeam
        if (currentHost === 'SOC-VALTORIX') {
            await handleBlueTeamLocalCommands();
        } else {
            await handleBlueTeamRemoteCommands();
        }
    }

    // 3. If no command matched in the specific handlers, show a generic error.
    if(outputLines.length === 0 && !clear) {
        outputLines.push({ text: `Error: comando '${cmd}' no reconocido o no disponible en este contexto.`, type: 'error' });
    }
    
    // ============================================================================
    // Command Handler Functions
    // ============================================================================

    async function handleRedTeamLocalCommands() {
        const targetArg = args.find(arg => arg.toUpperCase().includes('BOVEDA-WEB') || arg.toUpperCase().includes('PORTAL-WEB'));
        let targetHost = '';
        if (targetArg) {
            if (targetArg.toUpperCase().includes('BOVEDA-WEB')) targetHost = 'BOVEDA-WEB';
            else if (targetArg.toUpperCase().includes('PORTAL-WEB')) targetHost = 'PORTAL-WEB';
        }

        const targetCommands = ['nmap', 'hydra', 'hping3', 'dirb', 'nikto', 'curl', 'ssh'];
        if (targetCommands.includes(cmd) && !targetHost) {
             outputLines.push({ text: `Error: Host objetivo no válido o no especificado. (Ej: ${cmd} BOVEDA-WEB)`, type: 'error' });
             return;
        }

        if (isAttackerBanned && ['nmap', 'hydra', 'hping3', 'ssh'].includes(cmd)) {
            outputLines.push({ text: `(SIMULACIÓN) Error: No route to host. El firewall parece estar bloqueando tu IP.`, type: 'error' });
            return;
        }

        switch(cmd) {
            case 'nmap':
                outputLines.push({ text: `(SIMULACIÓN) Ejecutando Nmap en ${targetHost}...`, type: 'output' });
                await addLog({ source: 'Red Team', message: `Escaneo Nmap detectado contra ${targetHost} desde ${attackerIp}.`, teamVisible: 'all' });
                setTimeout(() => {
                    const openPorts = serverState.firewall_enabled ? 'Puertos abiertos: 22/tcp (ssh), 80/tcp (http)' : 'Puertos abiertos: 22/tcp (ssh), 80/tcp (http), 443/tcp (https), 3306/tcp (mysql)';
                    addDelayedOutput([{ text: `Resultado:\n${openPorts}`, type: 'output' }]);
                }, 1000);
                break;
            case 'hydra':
                const user = targetHost === 'PORTAL-WEB' ? 'admin' : 'root';
                outputLines.push({ text: `(SIMULACIÓN) Ejecutando Hydra contra SSH en ${targetHost} para el usuario '${user}'...`, type: 'output' });
                await updateServerState({ hydra_run_count: serverState.hydra_run_count + 100 });
                await addLog({ source: 'Red Team', message: `[!!] Múltiples intentos de login SSH fallidos para '${user}' desde ${attackerIp}. (Posible ataque de fuerza bruta)`, teamVisible: 'all' });
                setTimeout(async () => {
                     let hydraResult: TerminalLine;
                     if (targetHost === 'BOVEDA-WEB' && !serverState.ssh_hardened) {
                        hydraResult = { text: `[ÉXITO] Contraseña encontrada para 'root': '123456'`, type: 'output' };
                        await addLog({ source: 'Red Team', message: `[CRÍTICO] Login de 'root' exitoso en BOVEDA-WEB desde ${attackerIp}.`, teamVisible: 'all' });
                     } else if (targetHost === 'PORTAL-WEB') {
                        await updateServerState({ admin_password_found: true });
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
                let accessGranted = false;
                if (targetSshHost === 'BOVEDA-WEB' && sshUser === 'root' && !serverState.ssh_hardened) {
                    accessGranted = true;
                    newPrompt = { user: 'root', host: 'BOVEDA-WEB', dir: '#' };
                } else if (targetSshHost === 'PORTAL-WEB' && sshUser === 'admin' && serverState.admin_password_found) {
                     accessGranted = true;
                     newPrompt = { user: 'admin', host: 'PORTAL-WEB', dir: '~' };
                }
                if(accessGranted) {
                     outputLines.push({ text: `Contraseña: [ÉXITO] Bienvenido a ${targetSshHost}.`, type: 'output' });
                     await addLog({ source: 'Red Team', message: `[CRÍTICO] Acceso SSH exitoso como '${sshUser}' en ${targetSshHost} desde ${attackerIp}.`, teamVisible: 'all' });
                } else {
                     outputLines.push({ text: `ssh: Conexión a ${sshHost} puerto 22: Acceso denegado.`, type: 'error' });
                }
                break;
            case 'john':
                outputLines.push({ text: `(SIMULACIÓN) Ejecutando John the Ripper... Contraseña crackeada: '${portalAdminPassword}'`, type: 'output' });
                await updateServerState({ admin_password_found: true });
                await addLog({ source: 'Red Team', message: `Contraseña de 'admin' obtenida offline.`, teamVisible: 'all' });
                break;
            case 'hping3':
                await updateServerState({ is_dos_active: true, server_load: 99.9 });
                outputLines.push({ text: `(SIMULACIÓN) Inundación SYN iniciada contra ${targetHost}. Presione Ctrl+C para detener.`, type: 'output' });
                await addLog({ source: 'Red Team', message: `[ALERTA] Patrón de tráfico anómalo consistente con un ataque DoS detectado desde ${attackerIp} contra ${targetHost}.`, teamVisible: 'all' });
                break;
            case 'curl':
            case 'dirb':
            case 'nikto':
                 outputLines.push({ text: `(SIMULACIÓN) Ejecutando ${cmd} contra ${targetHost}...`, type: 'output' });
                 await addLog({ source: 'Red Team', message: `Herramienta de reconocimiento web (${cmd}) detectada contra ${targetHost}.`, teamVisible: 'all' });
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
        }
    }
    
    async function handleRedTeamRemoteCommands() {
        const attackTools = ['nmap', 'hydra', 'hping3', 'dirb', 'nikto', 'john'];
        if (attackTools.includes(cmd)) {
            outputLines.push({ text: `Error: La herramienta '${cmd}' es un software de ataque y solo se puede ejecutar desde su terminal 'soc-valtorix', no desde un host comprometido.`, type: 'error' });
            return;
        }

        if (cmd === 'wget') {
             await updateServerState({ payload_deployed: true });
             outputLines.push({ text: `(SIMULACIÓN) --10:05:10--  http://malware-repo.bad/payload.sh\nConectando a malware-repo.bad... conectado.\n... Guardado.`, type: 'output' });
             await addLog({ source: 'Red Team', message: `[ALERTA] Tráfico de red saliente sospechoso detectado desde ${currentHost} a un repositorio de malware conocido.`, teamVisible: 'all' });
         }
    }

    async function handleBlueTeamLocalCommands() {
         if (cmd === 'ssh' && args[1]?.startsWith('blue-team@')) {
            const host = args[1].split('@')[1].toUpperCase();
             if (['BOVEDA-WEB', 'PORTAL-WEB'].includes(host)) {
                outputLines.push({ text: `(SIMULACIÓN) Conectando... Bienvenido a ${host}.`, type: 'output' });
                newPrompt = { user: 'blue-team', host: host, dir: '~' };
            }
        }
    }

    async function handleBlueTeamRemoteCommands() {
        const effectiveCmd = cmd === 'sudo' ? args[1] : cmd;
        const effectiveArgs = cmd === 'sudo' ? args.slice(1) : args;
        switch(effectiveCmd) {
            case 'ufw':
                 if (effectiveArgs[1] === 'enable') {
                     await updateServerState({ firewall_enabled: true });
                     outputLines.push({ text: `(SIMULACIÓN) Firewall activado en ${currentHost}.`, type: 'output' });
                     await addLog({ source: 'Blue Team', message: `Firewall (UFW) HABILITADO en ${currentHost}.`, teamVisible: 'all' });
                 } else if (effectiveArgs[1] === 'status') {
                     const rules = serverState.ssh_hardened ? '22/tcp (ssh) ALLOW\n80/tcp (http) ALLOW' : 'Firewall no configurado. ¡Peligro!';
                     outputLines.push({ text: `Estado: ${serverState.firewall_enabled ? 'activo\n\nReglas:\n' + rules : 'inactivo'}`, type: 'output' });
                 } else if (effectiveArgs[1] === 'allow') {
                    outputLines.push({ text: `(SIMULACIÓN) Regla UFW añadida para ${effectiveArgs[2]}.`, type: 'output' });
                 } else if (effectiveArgs[1] === 'deny' && effectiveArgs[3]) {
                    const newBannedIps = [...serverState.banned_ips, effectiveArgs[3]];
                    await updateServerState({ banned_ips: newBannedIps });
                     outputLines.push({ text: `(SIMULACIÓN) IP ${effectiveArgs[3]} bloqueada.`, type: 'output' });
                     await addLog({ source: 'Blue Team', message: `IP ${effectiveArgs[3]} ha sido bloqueada manualmente en el firewall de ${currentHost}.`, teamVisible: 'all' });
                 }
                 break;
            case 'nano':
                if (effectiveArgs[1] === 'sshd_config') {
                     await updateServerState({ ssh_hardened: true });
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
                 const hydraCount = serverState.hydra_run_count;
                 if (hydraCount > 0) {
                     outputLines.push({ text: `(SIMULACIÓN) Buscando en auth.log...\n` +
                        `sshd[1121]: Failed password for root from ${attackerIp}\n`.repeat(Math.min(5, hydraCount)) +
                        `${hydraCount} resultados encontrados.`, type: 'output' });
                 } else {
                     outputLines.push({ text: `(SIMULACIÓN) Buscando en auth.log...\nNo se encontraron resultados.`, type: 'output' });
                 }
                 await addLog({ source: 'Blue Team', message: `Revisando logs de autenticación en ${currentHost}.`, teamVisible: 'all' });
                break;
            case 'ss':
                outputLines.push({ text: `(SIMULACIÓN) Puertos escuchando:\n22/tcp, 80/tcp${!serverState.firewall_enabled ? ', 443/tcp, 3306/tcp' : ''}` , type: 'output' });
                break;
            case 'ls':
                if (effectiveArgs[1] === '-l' && effectiveArgs[2]?.includes('db_config.php')) {
                    const perms = serverState.db_config_permissions === '640' ? '-rw-r-----' : '-rw-r--r--';
                    outputLines.push({ text: `${perms} 1 www-data www-data 58 Jul 15 10:00 /var/www/html/db_config.php`, type: 'output' });
                } else {
                     outputLines.push({ text: `(SIMULACIÓN)\ntotal 8\ndrwxr-xr-x 2 root root 4096 Jul 15 09:00 bin\ndrwxr-xr-x 2 root root 4096 Jul 15 09:01 etc`, type: 'output' });
                }
                break;
            case 'chmod':
                if (effectiveArgs[1] === '640' && effectiveArgs[2]?.includes('db_config.php')) {
                    await updateServerState({ db_config_permissions: '640' });
                    outputLines.push({ text: `(SIMULACIÓN) Permisos de '/var/www/html/db_config.php' cambiados a 640.`, type: 'output' });
                    await addLog({ source: 'Blue Team', message: `Permisos restringidos en db_config.php. Buen trabajo.`, teamVisible: 'all' });
                } else {
                    outputLines.push({ text: `(SIMULACIÓN) Permisos cambiados.`, type: 'output' });
                }
                break;
            case 'openssl':
                if (effectiveArgs[1] === 's_client') {
                    outputLines.push({text: '(SIMULACIÓN) Verificando certificado SSL/TLS...\n--- \nCertificado: \n    CN=BOVEDA-WEB\n    Válido\n    Protocolo: TLSv1.3\n    Cifrado: AES-256-GCM\n--- \nVerificación: OK', type: 'output'});
                    await addLog({ source: 'Blue Team', message: `Validación de certificado SSL/TLS realizada en BOVEDA-WEB.`, teamVisible: 'all' });
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
                    await updateServerState({ banned_ips: newBannedIps });
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
        }
    }

    return { outputLines, newPrompt, clear };
};

interface SimulationProviderProps {
    children: ReactNode;
    sessionData: SessionData;
}

export const SimulationProvider: React.FC<SimulationProviderProps> = ({ children, sessionData }) => {
    const [serverState, setServerState] = useState<SimulationState | null>(null);
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const { sessionId, team } = sessionData;

    useEffect(() => {
        if (!sessionId) return;
        
        let stateChannel: RealtimeChannel;
        let logsChannel: RealtimeChannel;

        const fetchInitialData = async () => {
            const { data: stateData, error: stateError } = await supabase
                .from('simulation_state')
                .select('*')
                .eq('session_id', sessionId)
                .maybeSingle();

            if (stateError) {
                console.error("Error fetching simulation state, falling back to local state:", stateError);
                setServerState({ session_id: sessionId, ...DEFAULT_SIMULATION_STATE });
                return;
            }

            if (!stateData) {
                console.warn(`No simulation state found for session ${sessionId}. Initializing state in database.`);
                // Prompts are local-only and should not be in the initial DB insert.
                const { prompt_red, prompt_blue, ...initialStateForDb } = DEFAULT_SIMULATION_STATE;
                
                const { error: insertError } = await supabase
                    .from('simulation_state')
                    .insert({ session_id: sessionId, ...initialStateForDb });
                
                if (insertError) {
                    console.error("Failed to initialize simulation state in DB, will use local state:", insertError);
                }
                // Always set local state to the full default state after attempting to initialize.
                setServerState({ session_id: sessionId, ...DEFAULT_SIMULATION_STATE });
            } else {
                // Merge DB state with local defaults to ensure all fields, like prompts, are present.
                setServerState({ ...DEFAULT_SIMULATION_STATE, ...stateData });
            }

            const { data: logsData, error: logsError } = await supabase.from('simulation_logs').select('*').eq('session_id', sessionId).order('timestamp', { ascending: true });
            if (logsError) {
                console.error('Error fetching initial logs:', logsError);
            } else if (logsData) {
                const transformedLogs = logsData.map(log => {
                    let source: LogEntry['source'] = 'System';
                    if (log.source_team === 'Red') {
                        source = 'Red Team';
                    } else if (log.source_team === 'Blue') {
                        source = 'Blue Team';
                    }
                    return { ...log, source, teamVisible: log.team_visible };
                });
                setLogs(transformedLogs);
            }
        };

        fetchInitialData();

        stateChannel = supabase.channel(`simulation-state-${sessionId}`).on<SimulationState>('postgres_changes', { event: '*', schema: 'public', table: 'simulation_state', filter: `session_id=eq.${sessionId}` }, (payload) => {
            if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
                // When receiving updates, merge them into the existing state to preserve local-only fields like prompts.
                setServerState(prevState => ({ ...(prevState || DEFAULT_SIMULATION_STATE), ...payload.new as SimulationState }));
            }
        }).subscribe();
        
        logsChannel = supabase.channel(`simulation-logs-${sessionId}`).on<any>('postgres_changes', { event: 'INSERT', schema: 'public', table: 'simulation_logs', filter: `session_id=eq.${sessionId}` }, (payload) => {
            const newLog = payload.new;
            let source: LogEntry['source'] = 'System';
            if (newLog.source_team === 'Red') source = 'Red Team';
            else if (newLog.source_team === 'Blue') source = 'Blue Team';
            
            setLogs(prevLogs => [...prevLogs, { ...newLog, source, teamVisible: newLog.team_visible }]);
        }).subscribe();


        return () => {
            supabase.removeChannel(stateChannel);
            supabase.removeChannel(logsChannel);
        };
    }, [sessionId]);

    const addLog = async (log: Omit<LogEntry, 'id' | 'timestamp' | 'session_id'>) => {
        const sourceTeamMap = {
            'Red Team': 'Red',
            'Blue Team': 'Blue',
            'System': 'System',
        } as const;
    
        const source_team = sourceTeamMap[log.source] || 'System';
    
        const newLog = { 
            session_id: sessionId, 
            source_team: source_team, 
            message: log.message, 
            team_visible: log.teamVisible 
        };
        const { error } = await supabase.from('simulation_logs').insert(newLog);
        if (error) console.error('Error adding log:', error);
    };

    const updateServerState = async (newState: Partial<SimulationState>) => {
        if (!serverState) {
            console.error("updateServerState called before serverState is initialized.");
            return;
        }

        const currentState = serverState;
        const updatedStateForLocalUI = { ...currentState, ...newState };
        setServerState(updatedStateForLocalUI);
    
        const { error: fetchError } = await supabase
            .from('simulation_state')
            .select('*')
            .eq('session_id', sessionId)
            .maybeSingle();
    
        if (fetchError) {
            console.error("Could not fetch current state before update. Aborting remote update.", fetchError);
            return;
        }
    
        const baseState = serverState;
        const updatedState = { ...baseState, ...newState, last_updated: new Date().toISOString() };
        
        // The prompts are local-only state and should not be persisted.
        const { 
            prompt_red, 
            prompt_blue, 
            ...stateForDb 
        } = updatedState;
        
        const { error } = await supabase.from('simulation_state').upsert(stateForDb);
    
        if (error) {
            console.error('Error upserting server state:', error);
            // If the update fails, the optimistic local update will remain.
            // This is acceptable as the realtime channel will eventually correct any desync.
        }
    };
    
    const processCommand = async (team: 'Red' | 'Blue', command: string, isFromAdminControl: boolean = false) => {
        if (!serverState) return;

        const currentUserTeam = sessionData.team;
        if (currentUserTeam === 'spectator' && !isFromAdminControl) return;
        if (currentUserTeam !== 'spectator' && team.toLowerCase() !== currentUserTeam) return;

        // Create a stable copy of the state for this command execution
        const stateAtCommandStart = { ...serverState };

        const addDelayedOutput = (lines: TerminalLine[]) => {
            setTimeout(() => {
                setServerState(prevState => {
                    if (!prevState) return null;
                    const outputKey = team === 'Red' ? 'terminal_output_red' : 'terminal_output_blue';
                    const currentOutput = prevState[outputKey] || [];
                    const updatedState = {
                        ...prevState,
                        [outputKey]: [...currentOutput, ...lines]
                    };
                    // Persist the delayed output
                    updateServerState({ [outputKey]: updatedState[outputKey] });
                    return updatedState;
                });
            }, 500); // Delay to simulate processing
        };

        const { outputLines, newPrompt, clear } = await processCommandLogic({
            command, team, serverState: stateAtCommandStart, addLog, updateServerState, addDelayedOutput
        });

        const outputKey = team === 'Red' ? 'terminal_output_red' : 'terminal_output_blue';
        const promptKey = team === 'Red' ? 'prompt_red' : 'prompt_blue';
        const currentOutput = stateAtCommandStart[outputKey] || [];
        
        const promptLine: TerminalLine = { type: 'prompt' };
        const commandLine: TerminalLine = { text: command, type: 'command' };
        const allNewLines = [promptLine, commandLine, ...outputLines];

        const newStateUpdate: Partial<SimulationState> = {};
        
        if (clear) {
            const welcomeMessage = team === 'Red' ? DEFAULT_SIMULATION_STATE.terminal_output_red : DEFAULT_SIMULATION_STATE.terminal_output_blue;
            newStateUpdate[outputKey] = welcomeMessage;
        } else {
            newStateUpdate[outputKey] = [...currentOutput, ...allNewLines];
        }

        if (newPrompt) {
            newStateUpdate[promptKey] = newPrompt;
        }

        // This will update both local UI optimistically and the database.
        await updateServerState(newStateUpdate);
    };

    const value = {
        serverState, logs, addLog, updateServerState, userTeam: team,
        processCommand
    };

    return <SimulationContext.Provider value={value}>{children}</SimulationContext.Provider>;
};
