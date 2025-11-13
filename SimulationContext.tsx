
import React, { createContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from './supabaseClient';
import type { SimulationState, LogEntry, SessionData } from './types';
import type { RealtimeChannel } from '@supabase/supabase-js';

// Define the shape of the context
interface SimulationContextType {
    serverState: SimulationState | null;
    logs: LogEntry[];
    addLog: (log: Omit<LogEntry, 'id' | 'timestamp' | 'session_id'>) => Promise<void>;
    updateServerState: (newState: Partial<SimulationState>) => Promise<void>;
    // FIX: Add 'spectator' to the userTeam type to match all possible roles from SessionData.
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

        // Fetch initial data
        const fetchInitialData = async () => {
            // Fetch initial server state
            const { data: stateData, error: stateError } = await supabase
                .from('simulation_state')
                .select('*')
                .eq('session_id', sessionId)
                .single();

            if (stateError) console.error('Error fetching initial state:', stateError);
            else setServerState(stateData);

            // Fetch initial logs
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
