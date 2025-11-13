
import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import type { User } from '@supabase/supabase-js';
import type { SessionData, SimulationSession } from '../types';
import { Icon } from '../constants';

interface SessionManagerProps {
    user: User;
    setSessionData: (sessionData: SessionData) => void;
}

const defaultSimulationState = {
    firewall_enabled: false,
    ssh_hardened: false,
    banned_ips: [],
    payload_deployed: false,
    is_dos_active: false,
    admin_password_found: false,
    db_config_permissions: '644',
    hydra_run_count: 0,
    server_load: 5.0,
};


export const SessionManager: React.FC<SessionManagerProps> = ({ user, setSessionData }) => {
    const [sessions, setSessions] = useState<SimulationSession[]>([]);
    const [loading, setLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);
    const [newSessionName, setNewSessionName] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        fetchSessions();
    }, []);

    const fetchSessions = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('simulation_sessions')
            .select('*')
            .eq('is_active', true)
            .order('created_at', { ascending: false });

        if (error) {
            setError('Error al cargar las sesiones.');
            console.error(error);
        } else {
            setSessions(data || []);
        }
        setLoading(false);
    };

    const createNewSession = async (name: string): Promise<SimulationSession | null> => {
        // 1. Create the session
        const { data: sessionData, error: sessionError } = await supabase
            .from('simulation_sessions')
            .insert({ session_name: name.trim() })
            .select()
            .single();

        if (sessionError || !sessionData) {
            setError('No se pudo crear la sesión.');
            console.error(sessionError);
            return null;
        }

        // 2. Create the initial state for the session
        const { error: stateError } = await supabase
            .from('simulation_state')
            .insert({ session_id: sessionData.id, ...defaultSimulationState });
        
        if (stateError) {
             setError('No se pudo inicializar el estado de la sesión.');
             console.error(stateError);
             // TODO: Add cleanup logic to delete the session if state creation fails
             return null;
        }
        
        return sessionData;
    }

    const handleCreateSession = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newSessionName.trim()) {
            setError('El nombre de la sesión no puede estar vacío.');
            return;
        }
        if (sessions.some(s => s.session_name.toLowerCase() === newSessionName.trim().toLowerCase())) {
            setError('Ya existe una sesión con este nombre.');
            return;
        }

        setIsCreating(true);
        setError('');
        
        const newSession = await createNewSession(newSessionName);

        if (newSession) {
            setNewSessionName('');
            await fetchSessions();
        }
        
        setIsCreating(false);
    };

    const handleJoinSession = async (sessionId: string, sessionName: string, team: 'red' | 'blue') => {
        setLoading(true);
        setError('');

        // Check if role is already taken
        const { data: participants, error: checkError } = await supabase
            .from('session_participants')
            .select('team_role')
            .eq('session_id', sessionId)
            .eq('team_role', team);
        
        if (checkError) {
             setError('Error al verificar el equipo.');
             setLoading(false);
             return;
        }
        if (participants && participants.length > 0) {
            setError(`El rol de equipo ${team === 'red' ? 'Rojo' : 'Azul'} ya está ocupado en esta sesión.`);
            setLoading(false);
            return;
        }

        const { error } = await supabase
            .from('session_participants')
            .insert({ session_id: sessionId, user_id: user.id, team_role: team });

        if (error) {
            setError('No se pudo unir a la sesión.');
            console.error(error);
            setLoading(false);
        } else {
            setSessionData({ sessionId, sessionName, team });
        }
    };
    
    const handleJoinDefaultSession = async (team: 'red' | 'blue') => {
        const sessionName = team === 'red' ? 'Red Team Training' : 'Blue Team Training';
        setLoading(true);
        setError('');

        // Check if a session with this default name already exists
        let { data: existingSession, error: findError } = await supabase
            .from('simulation_sessions')
            .select('*')
            .eq('session_name', sessionName)
            .single();
            
        if (findError && findError.code !== 'PGRST116') { // PGRST116 = not found, which is fine
            setError("Error buscando sesión por defecto.");
            setLoading(false);
            return;
        }

        let sessionToJoin = existingSession;

        if (!existingSession) {
            // Create it on-demand
            const newSession = await createNewSession(sessionName);
            if (!newSession) {
                setLoading(false);
                return;
            }
            sessionToJoin = newSession;
            await fetchSessions();
        }
        
        if (sessionToJoin) {
            await handleJoinSession(sessionToJoin.id, sessionToJoin.session_name, team);
        }
        
        setLoading(false);
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4">
            <div className="w-full max-w-3xl">
                <div className="glass-morphism p-8 rounded-2xl shadow-2xl bg-[rgba(45,80,22,0.85)] backdrop-blur-xl border border-[rgba(184,134,11,0.3)]">
                    <div className="text-center mb-8">
                        <h2 className="text-2xl font-bold text-white">Lobby de Simulación</h2>
                        <p className="text-gray-300 mt-2">Elige un entrenamiento por defecto o crea/únete a una sesión personalizada.</p>
                    </div>

                    {error && <p className="mb-4 text-center text-red-400 bg-red-900/50 p-3 rounded-lg">{error}</p>}
                    
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                        <button onClick={() => handleJoinDefaultSession('red')} className="p-6 text-left bg-red-900/30 border border-red-500/50 rounded-lg hover:bg-red-900/60 transition-all duration-300 disabled:opacity-50 flex items-center space-x-4" disabled={loading}>
                            <Icon name="sword" className="h-10 w-10 text-red-400 flex-shrink-0"/>
                            <div>
                                <h3 className="font-bold text-red-300 text-lg">Entrenamiento Equipo Rojo</h3>
                                <p className="text-red-400/80 text-sm">Únete como atacante para auditar sistemas.</p>
                            </div>
                        </button>
                         <button onClick={() => handleJoinDefaultSession('blue')} className="p-6 text-left bg-blue-900/30 border border-blue-500/50 rounded-lg hover:bg-blue-900/60 transition-all duration-300 disabled:opacity-50 flex items-center space-x-4" disabled={loading}>
                            <Icon name="shield" className="h-10 w-10 text-blue-400 flex-shrink-0"/>
                            <div>
                                <h3 className="font-bold text-blue-300 text-lg">Entrenamiento Equipo Azul</h3>
                                <p className="text-blue-400/80 text-sm">Únete como defensor para asegurar y monitorear.</p>
                            </div>
                        </button>
                    </div>

                    <div className="bg-black/20 p-4 rounded-lg mb-6">
                        <h3 className="font-semibold text-lg text-yellow-300 mb-3">Crear Sesión Personalizada</h3>
                        <form onSubmit={handleCreateSession} className="flex flex-col sm:flex-row gap-3">
                            <input
                                type="text"
                                placeholder="Nombre de la nueva sesión"
                                value={newSessionName}
                                onChange={(e) => setNewSessionName(e.target.value)}
                                className="flex-grow px-4 py-2 bg-black/30 border border-[rgba(184,134,11,0.3)] rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--cv-gold)]"
                                disabled={isCreating}
                            />
                            <button type="submit" className="px-4 py-2 font-bold text-white bg-green-600/80 rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50 flex items-center justify-center" disabled={isCreating}>
                                <Icon name="plus-circle" className="h-5 w-5 mr-2"/>
                                {isCreating ? 'Creando...' : 'Crear'}
                            </button>
                        </form>
                    </div>

                    <div className="space-y-3 max-h-[30vh] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800">
                        <h3 className="font-semibold text-lg text-yellow-300 mb-3 sticky top-0 bg-[rgba(45,80,22,0.95)] backdrop-blur-sm py-2">Sesiones Personalizadas Activas</h3>
                        {loading && !isCreating && <p className="text-center text-gray-300">Cargando sesiones...</p>}
                        {!loading && sessions.filter(s => !s.session_name.includes('Training')).length === 0 && <p className="text-center text-gray-400">No hay sesiones personalizadas. ¡Crea una!</p>}
                        {sessions.filter(s => !s.session_name.includes('Training')).map(session => (
                            <div key={session.id} className="bg-black/20 p-4 rounded-lg flex flex-col sm:flex-row items-center justify-between gap-3 animate-fade-in-fast">
                                <div>
                                    <p className="font-bold text-white">{session.session_name}</p>
                                    <p className="text-xs text-gray-400">Creada: {new Date(session.created_at).toLocaleString()}</p>
                                </div>
                                <div className="flex gap-3">
                                    <button onClick={() => handleJoinSession(session.id, session.session_name, 'red')} className="px-4 py-2 font-bold text-white bg-red-600/80 rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50" disabled={loading}>Unirse (Rojo)</button>
                                    <button onClick={() => handleJoinSession(session.id, session.session_name, 'blue')} className="px-4 py-2 font-bold text-white bg-blue-600/80 rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50" disabled={loading}>Unirse (Azul)</button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};
