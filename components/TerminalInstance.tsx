import React, { useState, useEffect, useRef, useContext } from 'react';
import type { TerminalLine, PromptState } from '../types';
import { SimulationContext } from '../SimulationContext';

type Team = 'Red' | 'Blue';

interface TerminalInstanceProps {
    team: Team;
    isControlling?: boolean; // Prop for admin control
}

export const TerminalInstance: React.FC<TerminalInstanceProps> = ({ team, isControlling = false }) => {
    const { 
        serverState, 
        userTeam, 
        redOutput, 
        blueOutput, 
        redPrompt, 
        bluePrompt, 
        processAndBroadcastCommand 
    } = useContext(SimulationContext);
    
    const isSpectator = userTeam === 'spectator';
    const output = team === 'Red' ? redOutput : blueOutput;
    const promptState = team === 'Red' ? redPrompt : bluePrompt;

    const [history, setHistory] = useState<string[]>([]);
    const [historyIndex, setHistoryIndex] = useState(0);
    const [input, setInput] = useState('');

    const endOfOutputRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        endOfOutputRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [output]);
    
    useEffect(() => {
        setHistory([]);
        setHistoryIndex(0);
        setInput('');
    }, [team]);


    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && input.trim()) {
            e.preventDefault();
            const command = input.trim();
            setHistory(prev => [...prev, command]);
            setHistoryIndex(history.length + 1);
            processAndBroadcastCommand(team, command, isControlling);
            setInput('');
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            const newIndex = Math.max(0, historyIndex - 1);
            setHistoryIndex(newIndex);
            setInput(history[newIndex] || '');
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            const newIndex = Math.min(history.length, historyIndex + 1);
            setHistoryIndex(newIndex);
            setInput(history[newIndex] || '');
        }
    };

    const canInteract = (isSpectator && isControlling && !!serverState) || 
                        (!isSpectator && team.toLowerCase() === userTeam && !!serverState);


    const getPlaceholderText = () => {
        if (!serverState) return "Sincronizando estado...";
        if (isSpectator) {
            return isControlling ? "Modo Control activado. Escriba un comando..." : "Modo Espectador (solo lectura)";
        }
        if (team.toLowerCase() !== userTeam) {
            return "Terminal de otro equipo...";
        }
        return "Escriba un comando...";
    };

    return (
        <div 
            className="bg-[#0a0f1c] border border-gray-700 rounded-b-lg h-[400px] p-3 flex flex-col font-mono"
            onClick={() => inputRef.current?.focus()}
        >
            <div className="flex-grow overflow-y-auto text-sm pr-2 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800">
                {output.map((line, index) => (
                    <div key={index} className="mb-1">
                        {line.type === 'prompt' && <Prompt {...promptState} />}
                        {line.type === 'command' && <span className="text-white break-all">{line.text}</span>}
                        {line.type === 'output' && <pre className="whitespace-pre-wrap text-slate-300">{line.text}</pre>}
                        {line.type === 'html' && <div className="text-slate-300" dangerouslySetInnerHTML={{ __html: line.html || '' }} />}
                        {line.type === 'error' && <pre className="whitespace-pre-wrap text-red-500">{line.text}</pre>}
                    </div>
                ))}
                <div ref={endOfOutputRef} />
            </div>
            <div className="flex items-center mt-2 flex-shrink-0">
                <Prompt {...promptState} />
                <input
                    ref={inputRef}
                    type="text"
                    className="bg-transparent border-none outline-none text-white font-mono text-sm w-full"
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    autoFocus
                    autoComplete="off"
                    autoCapitalize="off"
                    spellCheck="false"
                    disabled={!canInteract}
                    placeholder={getPlaceholderText()}
                />
            </div>
        </div>
    );
};

const Prompt: React.FC<PromptState> = ({ user, host, dir }) => (
    <span className="flex-shrink-0 mr-2">
        <span className={user.includes('blue') ? 'text-blue-400' : 'text-red-400'}>{user}</span>
        <span className="text-slate-400">@</span>
        <span className="prompt-host">{host}</span>
        <span className="text-slate-400">:</span>
        <span className="prompt-dir">{dir}</span>
        <span className="text-slate-400">{user === 'root' || user === 'admin' ? '# ' : '$ '}</span>
    </span>
);
