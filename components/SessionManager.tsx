
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
            setSessions(data);
        }
        setLoading(false);
    };

    const handleCreateSession = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newSessionName.trim()) {
            setError('El nombre de la sesión no puede estar vacío.');
            return;
        }
        setLoading(true);
        setError('');

        // 1. Create the session
        const { data: sessionData, error: sessionError } = await supabase
            .from('simulation_sessions')
            .insert({ session_name: newSessionName.trim() })
            .select()
            .single();

        if (sessionError || !sessionData) {
            setError('No se pudo crear la sesión.');
            console.error(sessionError);
            setLoading(false);
            return;
        }

        // 2. Create the initial state for the session
        const { error: stateError } = await supabase
            .from('simulation_state')
            .insert({ session_id: sessionData.id, ...defaultSimulationState });
        
        if (stateError) {
             setError('No se pudo inicializar el estado de la sesión.');
             console.error(stateError);
             // TODO: Add cleanup logic to delete the session if state creation fails
             setLoading(false);
             return;
        }

        setNewSessionName('');
        fetchSessions();
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

    return (
        <div className="min-h-screen flex items-center justify-center p-4">
            <div className="w-full max-w-2xl">
                <div className="glass-morphism p-8 rounded-2xl shadow-2xl bg-[rgba(45,80,22,0.85)] backdrop-blur-xl border border-[rgba(184,134,11,0.3)]">
                    <div className="text-center mb-8">
                        <h2 className="text-2xl font-bold text-white">Lobby de Simulación</h2>
                        <p className="text-gray-300 mt-2">Crea una nueva sesión de entrenamiento o únete a una existente.</p>
                    </div>

                    {error && <p className="mb-4 text-center text-red-400 bg-red-900/50 p-3 rounded-lg">{error}</p>}
                    
                    <div className="bg-black/20 p-4 rounded-lg mb-6">
                        <h3 className="font-semibold text-lg text-yellow-300 mb-3">Crear Nueva Sesión</h3>
                        <form onSubmit={handleCreateSession} className="flex flex-col sm:flex-row gap-3">
                            <input
                                type="text"
                                placeholder="Nombre de la nueva sesión"
                                value={newSessionName}
                                onChange={(e) => setNewSessionName(e.target.value)}
                                className="flex-grow px-4 py-2 bg-black/30 border border-[rgba(184,134,11,0.3)] rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--cv-gold)]"
                                disabled={loading}
                            />
                            <button type="submit" className="px-4 py-2 font-bold text-white bg-green-600/80 rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50 flex items-center justify-center" disabled={loading}>
                                <Icon name="plus-circle" className="h-5 w-5 mr-2"/>
                                Crear
                            </button>
                        </form>
                    </div>

                    <div className="space-y-3 max-h-[40vh] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800">
                        <h3 className="font-semibold text-lg text-yellow-300 mb-3 sticky top-0 bg-[rgba(45,80,22,0.85)] py-2">Sesiones Activas</h3>
                        {loading && <p className="text-center text-gray-300">Cargando sesiones...</p>}
                        {!loading && sessions.length === 0 && <p className="text-center text-gray-400">No hay sesiones activas. ¡Crea la primera!</p>}
                        {sessions.map(session => (
                            <div key={session.id} className="bg-black/20 p-4 rounded-lg flex flex-col sm:flex-row items-center justify-between gap-3">
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