import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
// FIX: The `User` type might not be exported directly in this version. Aliasing `AuthUser` is a common workaround.
import type { AuthUser as User } from '@supabase/supabase-js';
import type { SessionData, SimulationSession } from '../types';
import { Icon } from '../constants';

interface SessionManagerProps {
    user: User;
    setSessionData: (sessionData: SessionData) => void;
    isAdmin: boolean;
}

export const SessionManager: React.FC<SessionManagerProps> = ({ user, setSessionData, isAdmin }) => {
    const [sessions, setSessions] = useState<SimulationSession[]>([]);
    const [loading, setLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);
    const [newSessionName, setNewSessionName] = useState('');
    const [error, setError] = useState('');

    const fetchSessions = async () => {
        setLoading(true);
        setError('');
        try {
            const { data, error: fetchError } = await supabase
                .from('simulation_sessions')
                .select(`
                    *,
                    session_participants (
                        user_id,
                        team_role
                    )
                `)
                .eq('is_active', true)
                .order('created_at', { ascending: false });

            if (fetchError) throw fetchError;

            setSessions(data || []);
        } catch (err: any) {
            setError(`Error al cargar las sesiones: ${err.message}`);
            console.error(err);
        } finally {
            setLoading(false);
        }
    };
    
    useEffect(() => {
        fetchSessions();

        const channel = supabase.channel('session-manager-realtime')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'simulation_sessions' }, () => fetchSessions())
            .on('postgres_changes', { event: '*', schema: 'public', table: 'session_participants' }, () => fetchSessions())
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const createNewSession = async (name: string): Promise<SimulationSession | null> => {
        try {
            const { data: sessionData, error: sessionError } = await supabase
                .from('simulation_sessions')
                .insert({ session_name: name.trim(), created_by: user.id })
                .select()
                .single();

            if (sessionError) throw sessionError;

            // Insert a minimal row into simulation_state to establish the session.
            // The full state will be populated when a scenario is started.
            const { error: stateError } = await supabase
                .from('simulation_state')
                .insert({ session_id: sessionData.id });
            
            if (stateError) {
                // Attempt to clean up the session if state creation fails
                await supabase.from('simulation_sessions').delete().eq('id', sessionData.id);
                throw stateError;
            }
            
            return { ...sessionData, session_participants: [] };
        } catch (err: any) {
            let userMessage = `Error creando la sesión: ${err.message}`;
            if (err.message?.includes('violates row-level security policy')) {
                userMessage = "Error creando la sesión: La política de seguridad (RLS) de la base de datos lo impidió. Asegúrese de que la política de inserción en 'simulation_sessions' sea correcta.";
            }
            setError(userMessage);
            console.error(err);
            return null;
        }
    }

    const handleCreateSession = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newSessionName.trim()) return;
        if (sessions.some(s => s.session_name.toLowerCase() === newSessionName.trim().toLowerCase())) {
            setError('Ya existe una sesión con este nombre.');
            return;
        }

        setIsCreating(true);
        setError('');
        
        await createNewSession(newSessionName);
        // The realtime subscription will update the UI, no need to manually set state.
        setNewSessionName('');
        setIsCreating(false);
    };

    const handleDeleteSession = async (sessionId: string) => {
        if (!isAdmin) return;
        if (window.confirm('¿Está seguro de que desea eliminar esta sesión para todos los usuarios? Esta acción es irreversible.')) {
            setLoading(true);
            setError('');
    
            // Run dependency deletions in parallel for efficiency
            const deletePromises = [
                supabase.from('session_participants').delete().eq('session_id', sessionId),
                supabase.from('simulation_state').delete().eq('session_id', sessionId),
                supabase.from('simulation_logs').delete().eq('session_id', sessionId)
            ];
    
            const results = await Promise.all(deletePromises);
            
            const errors = results.map(r => r.error).filter(Boolean);
    
            if (errors.length > 0) {
                const errorMessages = errors.map(e => e.message).join('; ');
                setError(`Error limpiando dependencias de la sesión. Es posible que una política de seguridad (RLS) lo esté bloqueando. Detalles: ${errorMessages}`);
                setLoading(false);
                return; // Stop if dependencies can't be deleted
            }
    
            // If dependencies are gone, delete the main session
            const { error: sessionError } = await supabase.from('simulation_sessions').delete().eq('id', sessionId);
            if (sessionError) {
                setError(`Error al eliminar la sesión principal: ${sessionError.message}`);
            }
            
            setLoading(false); // Realtime will update the list
        }
    };

    const handleJoinSession = async (sessionId: string, sessionName: string, team: 'red' | 'blue' | 'spectator') => {
        // For admin/spectators, we must also insert into session_participants to satisfy RLS policies.
        // Previously, this just set local state, which prevented logs from loading.
        
        setLoading(true);
        setError('');
    
        try {
            // 1. Get all current participants for this session
            const { data: participants, error: fetchError } = await supabase
                .from('session_participants')
                .select('user_id, team_role')
                .eq('session_id', sessionId);
    
            if (fetchError) throw fetchError;
    
            // 2. Check if the desired role is occupied by SOMEONE ELSE (not applicable for spectator mode generally)
            if (team !== 'spectator') {
                const roleOccupant = participants.find(p => p.team_role === team);
                if (roleOccupant && roleOccupant.user_id !== user.id) {
                    throw new Error(`El rol de equipo ${team === 'red' ? 'Rojo' : 'Azul'} ya está ocupado.`);
                }
            }
    
            // 3. Upsert the participant record. This handles all cases:
            // - New user joining a session.
            // - Existing user re-joining.
            // - Admin joining as spectator (Crucial for RLS log visibility).
            // NOTE: If 'spectator' is not allowed by DB constraints, this might fail. 
            // We wrap in a try/catch specifically for the spectator insert in case of strict DB enums.
            
            let upsertError = null;
            try {
                const { error } = await supabase
                    .from('session_participants')
                    .upsert({ 
                        session_id: sessionId, 
                        user_id: user.id, 
                        team_role: team 
                    });
                upsertError = error;
            } catch (e) {
                // If DB rejects 'spectator', we proceed anyway so Admin can at least see the UI,
                // though logs might still be blocked by RLS.
                if (team === 'spectator') {
                    console.warn("Could not register as spectator in DB (likely enum constraint). Proceeding locally.", e);
                } else {
                    throw e;
                }
            }

            if (upsertError && team !== 'spectator') throw upsertError;
    
            // 4. Success: set session data and enter the simulation
            setSessionData({ sessionId, sessionName, team });
    
        } catch (err: any) {
            setError(`No se pudo unir a la sesión: ${err.message}`);
            console.error(err);
            setLoading(false); // Only set loading false on error, success transitions away
        }
    };
    
    const handleJoinDefaultSession = async (team: 'red' | 'blue') => {
        if (isAdmin) return; // Admins should not use this function
        const sessionName = team === 'red' ? 'Entrenamiento Equipo Rojo' : 'Entrenamiento Equipo Azul';
        setLoading(true);
        setError('');

        try {
            let { data: existingSessions } = await supabase
                .from('simulation_sessions')
                .select('id, session_name')
                .eq('session_name', sessionName)
                .limit(1);

            let sessionToJoin = existingSessions?.[0] || null;

            if (!sessionToJoin) {
                const newSession = await createNewSession(sessionName);
                if (!newSession) { setLoading(false); return; }
                sessionToJoin = newSession;
            }
            
            await handleJoinSession(sessionToJoin.id, sessionToJoin.session_name, team);

        } catch (err: any) {
            console.error('Error joining default session:', err);
            setError(`Error al unirse a la sesión por defecto: ${err.message}`);
            setLoading(false);
        }
    };

    const sessionsForUser = isAdmin ? sessions : sessions.filter(s => !s.session_name.includes('Entrenamiento'));

    return (
        <div className="min-h-screen flex items-center justify-center p-4">
            <div className="w-full max-w-3xl">
                <div className="glass-morphism p-8 rounded-2xl shadow-[0_0_40px_rgba(0,0,0,0.6)] border border-slate-700/50">
                    <div className="text-center mb-8">
                        <h2 className="text-2xl font-bold text-white tracking-tight">Lobby de Simulación</h2>
                        <p className="text-slate-400 mt-2">Elige un entrenamiento por defecto o crea/únete a una sesión personalizada.</p>
                    </div>

                    {error && <p className="mb-4 text-center text-red-400 bg-red-900/20 border border-red-500/30 p-3 rounded-lg animate-fade-in-fast">{error}</p>}
                    
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                        <button onClick={() => handleJoinDefaultSession('red')} className="p-6 text-left bg-red-950/30 border border-red-500/30 rounded-xl hover:bg-red-900/50 hover:border-red-500/60 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-4 group shadow-lg hover:shadow-red-900/20" disabled={loading || isAdmin}>
                            <img 
                                src="https://cybervaltorix.com/wp-content/uploads/2025/11/pngwing.com-2.png" 
                                alt="Logo Equipo Rojo" 
                                className="h-12 w-12 object-contain flex-shrink-0 drop-shadow-[0_0_5px_rgba(220,38,38,0.5)] group-hover:scale-110 transition-transform"
                            />
                            <div>
                                <h3 className="font-bold text-red-400 text-lg group-hover:text-red-300">Entrenamiento Equipo Rojo</h3>
                                <p className="text-slate-400 text-sm group-hover:text-slate-300">Únete como atacante para auditar sistemas.</p>
                            </div>
                        </button>
                         <button onClick={() => handleJoinDefaultSession('blue')} className="p-6 text-left bg-blue-950/30 border border-blue-500/30 rounded-xl hover:bg-blue-900/50 hover:border-blue-500/60 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-4 group shadow-lg hover:shadow-blue-900/20" disabled={loading || isAdmin}>
                            <img 
                                src="https://cybervaltorix.com/wp-content/uploads/2025/09/Cyber-Valtorix-Full.png" 
                                alt="Logo Equipo Azul" 
                                className="h-12 w-12 object-contain flex-shrink-0 drop-shadow-[0_0_5px_rgba(37,99,235,0.5)] group-hover:scale-110 transition-transform"
                            />
                            <div>
                                <h3 className="font-bold text-blue-400 text-lg group-hover:text-blue-300">Entrenamiento Equipo Azul</h3>
                                <p className="text-slate-400 text-sm group-hover:text-slate-300">Únete como defensor para asegurar y monitorear.</p>
                            </div>
                        </button>
                    </div>
                    {isAdmin && <p className="text-center text-yellow-400 mb-6 -mt-4 animate-fade-in-fast font-medium bg-yellow-900/20 py-2 rounded border border-yellow-600/30">Como administrador, puede observar cualquier sesión activa desde la lista de abajo.</p>}


                    {!isAdmin && (
                        <div className="bg-slate-900/60 p-4 rounded-lg mb-6 border border-slate-700/50">
                            <h3 className="font-semibold text-lg text-cyan-400 mb-3 flex items-center">
                                <Icon name="plus-circle" className="h-5 w-5 mr-2"/>
                                Crear Sesión Personalizada
                            </h3>
                            <form onSubmit={handleCreateSession} className="flex flex-col sm:flex-row gap-3">
                                <input
                                    type="text"
                                    placeholder="Nombre de la nueva sesión"
                                    value={newSessionName}
                                    onChange={(e) => setNewSessionName(e.target.value)}
                                    className="flex-grow px-4 py-2 bg-black/40 border border-slate-600/50 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                                    disabled={isCreating || loading}
                                />
                                <button type="submit" className="px-6 py-2 font-bold text-white bg-gradient-to-r from-green-600 to-emerald-600 rounded-lg hover:from-green-500 hover:to-emerald-500 transition-all disabled:opacity-50 flex items-center justify-center shadow-[0_0_10px_rgba(34,197,94,0.3)]" disabled={isCreating || loading}>
                                    {isCreating ? 'Creando...' : 'Crear'}
                                </button>
                            </form>
                        </div>
                    )}

                    <div className="space-y-3 max-h-[30vh] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-slate-800">
                        <h3 className="font-semibold text-lg text-slate-300 mb-3 sticky top-0 bg-slate-950/90 backdrop-blur-md py-2 z-10 border-b border-slate-700/50">{isAdmin ? "Sesiones Activas para Observar" : "Sesiones Personalizadas Activas"}</h3>
                        {loading && !isCreating && <p className="text-center text-slate-500">Cargando sesiones...</p>}
                        {!loading && sessionsForUser.length === 0 && <p className="text-center text-slate-500 py-4">{isAdmin ? "No hay sesiones activas." : "No hay sesiones personalizadas. ¡Crea una!"}</p>}
                        {sessionsForUser.map(session => {
                            const redParticipant = session.session_participants.find(p => p.team_role === 'red');
                            const blueParticipant = session.session_participants.find(p => p.team_role === 'blue');

                            const isUserInRed = redParticipant?.user_id === user.id;
                            const isUserInBlue = blueParticipant?.user_id === user.id;
                            const isRedOccupiedByOther = redParticipant && !isUserInRed;
                            const isBlueOccupiedByOther = blueParticipant && !isUserInBlue;

                            return (
                                <div key={session.id} className="bg-slate-900/40 border border-slate-700/30 hover:border-slate-500/50 p-4 rounded-lg flex flex-col sm:flex-row items-center justify-between gap-3 animate-fade-in-fast transition-all hover:bg-slate-800/40">
                                    <div className="flex-grow text-center sm:text-left">
                                        <p className="font-bold text-white font-mono">{session.session_name}</p>
                                        <p className="text-xs text-slate-500">Creada: {new Date(session.created_at).toLocaleString()}</p>
                                    </div>
                                    <div className="flex gap-3 flex-shrink-0">
                                        {isAdmin ? (
                                            <>
                                                <button onClick={() => handleJoinSession(session.id, session.session_name, 'spectator')} className="px-4 py-2 font-bold text-black bg-yellow-500 rounded-lg hover:bg-yellow-400 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 shadow-[0_0_10px_rgba(234,179,8,0.4)]" disabled={loading}>
                                                    <Icon name="binoculars" className="h-4 w-4"/> Ver Sesión
                                                </button>
                                                <button onClick={() => handleDeleteSession(session.id)} className="px-3 py-2 font-bold text-white bg-red-900/50 border border-red-500/50 rounded-lg hover:bg-red-800/80 transition-colors disabled:opacity-50 flex items-center" disabled={loading}>
                                                    <Icon name="trash" className="h-4 w-4"/>
                                                </button>
                                            </>
                                        ) : (
                                            <>
                                                <button onClick={() => handleJoinSession(session.id, session.session_name, 'red')} className={`px-4 py-2 font-bold text-white rounded-lg transition-colors disabled:opacity-50 border ${isUserInRed ? 'bg-red-600 hover:bg-red-500 border-red-500' : 'bg-transparent border-red-500/50 hover:bg-red-900/30 text-red-400'} ${isRedOccupiedByOther ? 'opacity-50 cursor-not-allowed border-red-900 text-red-800' : ''}`} disabled={loading || isRedOccupiedByOther}>
                                                    {isRedOccupiedByOther ? 'Ocupado' : (isUserInRed ? 'Reunirse' : 'Unirse (Rojo)')}
                                                </button>
                                                <button onClick={() => handleJoinSession(session.id, session.session_name, 'blue')} className={`px-4 py-2 font-bold text-white rounded-lg transition-colors disabled:opacity-50 border ${isUserInBlue ? 'bg-blue-600 hover:bg-blue-500 border-blue-500' : 'bg-transparent border-blue-500/50 hover:bg-blue-900/30 text-blue-400'} ${isBlueOccupiedByOther ? 'opacity-50 cursor-not-allowed border-blue-900 text-blue-800' : ''}`} disabled={loading || isBlueOccupiedByOther}>
                                                    {isBlueOccupiedByOther ? 'Ocupado' : (isUserInBlue ? 'Reunirse' : 'Unirse (Azul)')}
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
};
