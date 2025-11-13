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
            // Step 1: Attempt to fetch the simulation state.
            const { data: stateData, error: stateError } = await supabase
                .from('simulation_state')
                .select('*')
                .eq('session_id', sessionId)
                .maybeSingle();

            // Step 2: If state is not found (either null data or a PGRST116 error), create a default one.
            if (!stateData && (!stateError || stateError.code === 'PGRST116')) {
                console.warn(`No state found for session ${sessionId}. Creating default state to recover.`);
                const { data: newStateData, error: insertError } = await supabase
                    .from('simulation_state')
                    .insert({ session_id: sessionId, ...DEFAULT_SIMULATION_STATE })
                    .select()
                    .single();

                if (insertError) {
                    console.error('CRITICAL: Failed to create missing simulation state:', insertError);
                    setServerState(null); // Recovery failed
                } else {
                    console.log('Successfully created and set initial state.');
                    setServerState(newStateData);
                }
            } else if (stateError) {
                // Step 3: Handle other, unexpected errors during fetch.
                console.error('Error fetching initial state:', stateError);
                setServerState(null);
            } else {
                // Step 4: If fetch was successful, set the state.
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
                { event: 'UPDATE', schema: 'public', table: 'simulation_state', filter: `session_id=eq.${sessionId}` },
                (payload) => {
                    console.log('Realtime state update received:', payload.new);
                    setServerState(payload.new as SimulationState);
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
        
        // Remove session_id from update payload as it's the primary key
        const { session_id, ...updateData } = newState;

        const { error } = await supabase
            .from('simulation_state')
            .update({ ...updateData, last_updated: new Date().toISOString() })
            .eq('session_id', sessionId);

        if (error) console.error('Error updating server state:', error);
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
