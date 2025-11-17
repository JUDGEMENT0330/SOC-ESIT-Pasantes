import React, { useEffect, useRef } from 'react';
import type { TerminalState, PromptState } from '../types';
import DOMPurify from 'https://esm.sh/dompurify';
import { ALL_COMMANDS } from '../constants';

interface TerminalInstanceProps {
    terminalState: TerminalState;
    onCommand: (command: string) => void;
    onInputChange: (input: string) => void;
    onHistoryNav: (direction: 'up' | 'down') => void;
}

export const TerminalInstance: React.FC<TerminalInstanceProps> = ({ terminalState, onCommand, onInputChange, onHistoryNav }) => {
    const { output, prompt, input, isBusy, history } = terminalState;
    
    const endOfOutputRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        endOfOutputRef.current?.scrollIntoView({ behavior: "instant" });
    }, [output]);
    
    useEffect(() => {
        if (inputRef.current && inputRef.current.value !== input) {
            inputRef.current.value = input;
        }
    }, [input]);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (isBusy) return;

        if (e.key === 'Enter' && input.trim()) {
            e.preventDefault();
            onCommand(input);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            onHistoryNav('up');
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            onHistoryNav('down');
        } else if (e.key === 'Tab') {
             e.preventDefault();
             const currentInput = input.split(' ').pop() || '';
             if (!currentInput) return;
             
             const matching = ALL_COMMANDS.filter(cmd => cmd.startsWith(currentInput));
             if (matching.length === 1) {
                 const newCommand = matching[0];
                 const parts = input.split(' ');
                 parts[parts.length - 1] = newCommand;
                 onInputChange(parts.join(' ') + ' ');
             }
        }
    };

    const placeholder = isBusy ? "Procesando comando..." : "Escriba un comando y presione Enter...";

    return (
        <div 
            className="bg-[#0a0f1c] border border-gray-700 rounded-lg h-[400px] p-3 flex flex-col font-mono"
            onClick={() => inputRef.current?.focus()}
            role="application"
            aria-label="Terminal de simulación"
            aria-live="polite"
            aria-atomic="false"
        >
            <div className="flex-grow overflow-y-auto text-sm pr-2 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800">
                {output.map((line, index) => (
                    <div key={index} className="mb-1">
                        {line.type === 'prompt' && <Prompt {...prompt} />}
                        {line.type === 'command' && <span className="text-white break-all">{line.text}</span>}
                        {line.type === 'output' && <pre className="whitespace-pre-wrap text-slate-300">{line.text}</pre>}
                        {line.type === 'html' && <div className="text-slate-300" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(line.html || '', {
                            ALLOWED_TAGS: ['strong', 'span', 'pre', 'br'],
                            ALLOWED_ATTR: ['class']
                        }) }} />}
                        {line.type === 'error' && <pre className="whitespace-pre-wrap text-red-500">{line.text}</pre>}
                    </div>
                ))}
                <div ref={endOfOutputRef} />
            </div>
            <div className="flex items-center mt-2 flex-shrink-0">
                <Prompt {...prompt} />
                <input
                    ref={inputRef}
                    type="text"
                    className="bg-transparent border-none outline-none text-white font-mono text-sm w-full"
                    defaultValue={input}
                    onChange={e => onInputChange(e.target.value)}
                    onKeyDown={handleKeyDown}
                    autoFocus
                    autoComplete="off"
                    autoCapitalize="off"
                    spellCheck="false"
                    disabled={isBusy}
                    placeholder={placeholder}
                    aria-label="Línea de comandos"
                    aria-describedby="terminal-help"
                />
            </div>
            <div id="terminal-help" className="sr-only">
                Use flechas arriba/abajo para historial. Tab para autocompletar.
            </div>
        </div>
    );
};

const Prompt: React.FC<PromptState> = ({ user, host, dir }) => {
    const userColor = user.includes('blue') ? 'text-blue-400' : (user === 'root' ? 'text-red-500' : 'text-red-400');
    return (
        <span className="flex-shrink-0 mr-2">
            <span className={userColor}>{user}</span>
            <span className="text-slate-400">@</span>
            <span className="prompt-host">{host}</span>
            <span className="text-slate-400">:</span>
            <span className="prompt-dir">{dir}</span>
            <span className="text-slate-400">{user === 'root' || user === 'admin' || user === 'blue-team' ? '# ' : '$ '}</span>
        </span>
    );
};
