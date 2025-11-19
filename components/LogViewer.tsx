import React, { useRef, useEffect, useContext } from 'react';
import type { LogEntry } from '../types';
import { Icon } from '../constants';
import { SimulationContext } from '../SimulationContext';

const LogSourceIndicator: React.FC<{ source_team: LogEntry['source_team'] }> = ({ source_team }) => {
    const config = {
        'red': { color: 'text-red-400', text: 'SRC:RED' },
        'blue': { color: 'text-blue-400', text: 'SRC:BLUE' },
        'System': { color: 'text-yellow-400', text: 'SRC:SYS' },
        'Network': { color: 'text-purple-400', text: 'SRC:NET' },
    };
    const key = source_team || 'System';
    const effectiveKey = (key.toLowerCase() === 'red' ? 'red' : key.toLowerCase() === 'blue' ? 'blue' : key) as keyof typeof config;
    const { color, text } = config[effectiveKey] || config['System'];
    return <span className={`font-bold mr-2 ${color}`}>{text}</span>;
};

const LogViewerComponent: React.FC = () => {
    const endOfLogsRef = useRef<HTMLDivElement>(null);
    const { logs, userTeam } = useContext(SimulationContext);

    // Filter logs based on user's role and log visibility.
    // 'spectator' (admin) should see all logs regardless of team visibility.
    const filteredLogs = logs.filter(log => 
        userTeam === 'spectator' || 
        log.team_visible === 'all' || 
        log.team_visible === userTeam
    );

    useEffect(() => {
        endOfLogsRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [filteredLogs]);

    return (
        <div className="flex flex-col">
             <div className="flex items-center p-3 rounded-t-lg bg-gray-900/50">
                <Icon name="file-clock" className="h-5 w-5 mr-3 text-gray-400" />
                <h3 className="font-bold text-gray-300">System & Event Logs</h3>
            </div>
            <div className="bg-[#0a0f1c] border border-t-0 border-gray-700 rounded-b-lg h-64 p-3 font-mono text-xs flex flex-col">
                <div className="flex-grow overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800">
                    {filteredLogs.length > 0 ? filteredLogs.map(log => (
                        <div key={log.id} className="flex items-start">
                            <span className="text-gray-500 mr-2 flex-shrink-0">{new Date(log.timestamp).toLocaleTimeString()}</span>
                            <div className="break-words">
                                <LogSourceIndicator source_team={log.source_team} />
                                <span className="text-slate-300">{log.message}</span>
                            </div>
                        </div>
                    )) : (
                        <div className="text-slate-600 italic text-center mt-4">No hay logs disponibles para esta vista.</div>
                    )}
                    <div ref={endOfLogsRef} />
                </div>
            </div>
        </div>
    );
};

export const LogViewer = React.memo(LogViewerComponent);
