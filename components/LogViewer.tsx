import React, { useRef, useEffect, useContext } from 'react';
import type { LogEntry } from '../types';
import { Icon } from '../constants';
import { SimulationContext } from '../SimulationContext';

const LogSourceIndicator: React.FC<{ source: LogEntry['source'] }> = ({ source }) => {
    const config = {
        'Red Team': { color: 'text-red-400', text: 'SRC:RED' },
        'Blue Team': { color: 'text-blue-400', text: 'SRC:BLUE' },
        'System': { color: 'text-yellow-400', text: 'SRC:SYS' },
        'Network': { color: 'text-purple-400', text: 'SRC:NET' },
    };
    const { color, text } = config[source] || config['System'];
    return <span className={`font-bold mr-2 ${color}`}>{text}</span>;
};

export const LogViewer: React.FC = () => {
    const endOfLogsRef = useRef<HTMLDivElement>(null);
    const { logs, userTeam } = useContext(SimulationContext);

    // Filter logs based on user's role and log visibility
    const filteredLogs = logs.filter(log => log.teamVisible === 'all' || log.teamVisible === userTeam);

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
                    {filteredLogs.map(log => (
                        <div key={log.id} className="flex items-start">
                            <span className="text-gray-500 mr-2 flex-shrink-0">{new Date(log.timestamp).toLocaleTimeString()}</span>
                            <div className="break-words">
                                <LogSourceIndicator source={log.source} />
                                <span className="text-slate-300">{log.message}</span>
                            </div>
                        </div>
                    ))}
                    <div ref={endOfLogsRef} />
                </div>
            </div>
        </div>
    );
};
