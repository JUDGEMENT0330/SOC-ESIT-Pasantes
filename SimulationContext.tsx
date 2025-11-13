import React, { createContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from './supabaseClient';
import type { SimulationState, LogEntry, SessionData } from './types';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { DEFAULT_SIMULATION_STATE } from './constants';

// Define the shape of the context
interface SimulationContextType {
    serverState: SimulationState | null;
    logs: LogEntry[];
    addLog: (log: Omit<LogEntry, 'id' | 'timestamp' | 'session_id'>) => Promise<void>;
    updateServerState: (newState: Partial<SimulationState>) => Promise<void>;
    userTeam: 'red' | 'blue' | 'spectator' | null;
}

// Create the context with a default value
export const SimulationContext = createContext<SimulationContextType>({
    serverState: null,
    logs: [],
    addLog: async () => {},
    updateServerState: async () => {},
    userTeam: null,
});

// Create the Provider component
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

            // Robust state initialization: If there's any error fetching state (e.g., RLS permission denied)
            // or if no state exists for the session yet, fall back to a default local state.
            // This prevents the UI from breaking or getting stuck.
            if (stateError && stateError.code !== 'PGRST116') {
                console.error("Error fetching simulation state, falling back to local state:", stateError);
                setServerState({ session_id: sessionId, ...DEFAULT_SIMULATION_STATE });
            } else if (!stateData) {
                console.warn(`No simulation state found for session ${sessionId}. Initializing with default local state.`);
                setServerState({ session_id: sessionId, ...DEFAULT_SIMULATION_STATE });
            } else {
                setServerState(stateData);
            }

            // Fetch initial logs regardless of state fetch outcome
            const { data: logsData, error: logsError } = await supabase
                .from('simulation_logs')
                .select('*')
                .eq('session_id', sessionId)
                .order('timestamp', { ascending: true });

            if (logsError) console.error('Error fetching initial logs:', logsError);
            else setLogs(logsData as LogEntry[]);
        };


        fetchInitialData();

        // Set up realtime subscriptions
        stateChannel = supabase
            .channel(`simulation-state-${sessionId}`)
            .on<SimulationState>(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'simulation_state', filter: `session_id=eq.${sessionId}` },
                (payload) => {
                    console.log('Realtime state update received:', payload.new);
                    // Handle UPDATE and INSERT events
                    if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
                        setServerState(payload.new as SimulationState);
                    }
                }
            )
            .subscribe();
        
        logsChannel = supabase
            .channel(`simulation-logs-${sessionId}`)
            .on<LogEntry>(
                 'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'simulation_logs', filter: `session_id=eq.${sessionId}` },
                (payload) => {
                    console.log('Realtime log received:', payload.new);
                    setLogs(prevLogs => [...prevLogs, payload.new as LogEntry]);
                }
            )
            .subscribe();

        // Cleanup function
        return () => {
            supabase.removeChannel(stateChannel);
            supabase.removeChannel(logsChannel);
        };
    }, [sessionId]);

    const addLog = async (log: Omit<LogEntry, 'id' | 'timestamp' | 'session_id'>) => {
        const newLog = {
            session_id: sessionId,
            source_team: log.source,
            message: log.message,
            team_visible: log.teamVisible,
        };
        const { error } = await supabase.from('simulation_logs').insert(newLog);
        if (error) console.error('Error adding log:', error);
    };

    const updateServerState = async (newState: Partial<SimulationState>) => {
        if (!serverState) return;
        
        const updatedState = {
          ...serverState,
          ...newState,
          last_updated: new Date().toISOString(),
          session_id: sessionId,
        };
    
        // Use upsert to create the state if it doesn't exist, or update it if it does.
        // This will attempt to self-heal a session with a missing state on the first action.
        const { error } = await supabase
            .from('simulation_state')
            .upsert(updatedState);

        if (error) {
            console.error('Error upserting server state:', error);
            // If the upsert fails (e.g., RLS), update the local state anyway for a responsive UI.
            // The state will be out of sync, but the app won't break for the current user.
            setServerState(updatedState);
        }
    };

    const value = {
        serverState,
        logs,
        addLog,
        updateServerState,
        userTeam: team,
    };

    return (
        <SimulationContext.Provider value={value}>
            {children}
        </SimulationContext.Provider>
    );
};
