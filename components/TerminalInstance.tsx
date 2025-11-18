import React, { useEffect, useRef, useState, useMemo } from 'react';
import type { TerminalState, PromptState, VirtualEnvironment } from '../types';
import DOMPurify from 'https://esm.sh/dompurify';

// ============================================================================
// Command History Class
// ============================================================================
class CommandHistory {
    private history: string[] = [];
    private maxSize: number = 1000;
    private currentIndex: number = -1;
    
    constructor(initialHistory: string[] = []) { 
        this.history = initialHistory;
        this.currentIndex = this.history.length;
    }
    
    add(command: string): void {
        if (!command.trim() || this.history[this.history.length - 1] === command) return;
        this.history.push(command);
        if (this.history.length > this.maxSize) this.history.shift();
        this.currentIndex = this.history.length;
    }
    
    navigateUp(): string | null {
        if (this.currentIndex > 0) {
            this.currentIndex--;
            return this.history[this.currentIndex];
        }
        return this.history.length > 0 ? this.history[0] : '';
    }
    
    navigateDown(): string | null {
        if (this.currentIndex < this.history.length - 1) {
            this.currentIndex++;
            return this.history[this.currentIndex];
        } else if (this.currentIndex === this.history.length - 1) {
            this.currentIndex = this.history.length;
            return '';
        }
        return null;
    }
    
    search(query: string): string[] {
        if (!query) return [];
        return this.history.filter(cmd => cmd.toLowerCase().includes(query.toLowerCase())).reverse();
    }
    
    reset(): void { this.currentIndex = this.history.length; }
}

// ============================================================================
// Autocomplete Engine Class
// ============================================================================
interface AutocompleteResult {
    suggestions: string[];
    commonPrefix: string;
}

class AutocompleteEngine {
    private commands: Map<string, string[]> = new Map([
        ['nmap', ['-sS', '-sT', '-sU', '-sV', '-sC', '-A', '-O', '-p', '-T0', '-T1', '-T2', '-T3', '-T4', '-T5', '--script', '--open', '-Pn', '-n']],
        ['hydra', ['-l', '-L', '-p', '-P', '-t', '-w', '-f', '-V']],
        ['ufw', ['status', 'enable', 'disable', 'allow', 'deny', 'delete', 'reset', 'reload', 'from']],
        ['ssh', []], ['ping', []], ['curl', []], ['hping3', ['--flood', '-S']],
        ['sudo', []], ['nano', []], ['cat', []], ['sha256sum', []]
    ]);
    private hosts: Set<string> = new Set();
    
    constructor(environment: VirtualEnvironment | null) {
        // FIX: Critical null check. The app would crash here if a user typed
        // in the terminal before starting a scenario, as environment would be null.
        if (!environment || !environment.networks) return;

        for (const network of Object.values(environment.networks)) {
            for (const host of network.hosts) {
                this.hosts.add(host.ip);
                this.hosts.add(host.hostname);
            }
        }
        // Add sudo subcommands
        this.commands.set('sudo', Array.from(this.commands.keys()));
    }
    
    autocomplete(input: string): AutocompleteResult {
        const tokens = input.split(' ');
        const currentToken = tokens[tokens.length - 1];
        const command = tokens[0];
        
        let suggestions: string[] = [];
        
        if (tokens.length === 1) {
            suggestions = Array.from(this.commands.keys()).filter(cmd => cmd.startsWith(currentToken));
        } else if (this.commands.has(command)) {
            const cmdFlags = this.commands.get(command) ?? [];
            if (currentToken.startsWith('-')) {
                suggestions = cmdFlags.filter(flag => flag.startsWith(currentToken));
            } else if (['ssh', 'ping', 'nmap', 'hydra', 'curl', 'hping3'].includes(command)) {
                suggestions = Array.from(this.hosts).filter(host => host.toLowerCase().startsWith(currentToken.toLowerCase()));
            } else if (command === 'ufw' && tokens[tokens.length - 2] === 'from') {
                suggestions = ['192.168.1.100']; // Simulating attacker IP
            }
        }
        
        const commonPrefix = this.findCommonPrefix(suggestions);
        return { suggestions, commonPrefix };
    }
    
    private findCommonPrefix(strings: string[]): string {
        if (!strings || strings.length === 0) return '';
        if (strings.length === 1) return strings[0];
        let prefix = strings[0];
        for (let i = 1; i < strings.length; i++) {
            while (!strings[i].startsWith(prefix)) {
                prefix = prefix.substring(0, prefix.length - 1);
                if (prefix === '') return '';
            }
        }
        return prefix;
    }
}

// ============================================================================
// Terminal Component
// ============================================================================
interface TerminalInstanceProps {
    terminalState: TerminalState;
    environment: VirtualEnvironment | null;
    onCommand: (command: string) => void;
    isReadOnly?: boolean;
}

export const TerminalInstance: React.FC<TerminalInstanceProps> = ({ terminalState, environment, onCommand, isReadOnly = false }) => {
    const { output, prompt, isBusy } = terminalState;
    
    const [input, setInput] = useState('');
    const endOfOutputRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const history = useRef(new CommandHistory(terminalState.history));
    
    const [searchMode, setSearchMode] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<string[]>([]);
    const [autocomplete, setAutocomplete] = useState<AutocompleteResult | null>(null);

    const autocompleteEngine = useMemo(() => new AutocompleteEngine(environment), [environment]);

    useEffect(() => {
        history.current = new CommandHistory(terminalState.history);
    }, [terminalState.history]);

    useEffect(() => {
        endOfOutputRef.current?.scrollIntoView({ behavior: "instant" });
    }, [output]);
    
    useEffect(() => {
        if (!searchMode && inputRef.current && document.activeElement !== inputRef.current) {
             inputRef.current.focus();
        }
    }, [searchMode, terminalState.id]);

    useEffect(() => {
        if (searchMode) setSearchResults(history.current.search(searchQuery));
    }, [searchQuery, searchMode]);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (isBusy || isReadOnly) return;

        if (e.ctrlKey && e.key === 'r') {
            e.preventDefault();
            setSearchMode(true);
            setSearchQuery('');
            setInput('');
        } else if (searchMode) {
             if (e.key === 'Escape') {
                e.preventDefault();
                setSearchMode(false);
                setInput('');
            } else if (e.key === 'Enter') {
                e.preventDefault();
                const bestMatch = searchResults[0] || searchQuery;
                setInput(bestMatch);
                setSearchMode(false);
                setTimeout(() => inputRef.current?.focus(), 0);
            }
        } else { // Normal Mode
            if (e.key === 'Enter' && input.trim()) {
                e.preventDefault();
                history.current.add(input);
                history.current.reset();
                onCommand(input);
                setInput('');
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setInput(history.current.navigateUp() ?? input);
            } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                setInput(history.current.navigateDown() ?? '');
            } else if (e.key === 'Tab') {
                e.preventDefault();
                const result = autocompleteEngine.autocomplete(input);
                if (result.suggestions.length === 1) {
                    const tokens = input.split(' ');
                    tokens[tokens.length - 1] = result.suggestions[0];
                    setInput(tokens.join(' ') + ' ');
                    setAutocomplete(null);
                } else if (result.suggestions.length > 1) {
                    if (result.commonPrefix) {
                        const tokens = input.split(' ');
                        const currentToken = tokens[tokens.length - 1];
                        if (result.commonPrefix.length > currentToken.length) {
                             tokens[tokens.length - 1] = result.commonPrefix;
                             setInput(tokens.join(' '));
                        }
                    }
                    setAutocomplete(result);
                }
            } else if (e.key !== 'Tab') {
                setAutocomplete(null);
            }
        }
    };

    const placeholder = isReadOnly ? "Modo de solo lectura" : isBusy ? "Procesando comando..." : "Escriba un comando y presione Enter...";
    const currentInput = searchMode ? searchQuery : input;
    const handleInputChange = searchMode ? setSearchQuery : setInput;

    return (
        <div 
            className="bg-[#0a0f1c] border border-gray-700 rounded-lg h-[400px] p-3 flex flex-col font-mono relative"
            onClick={() => inputRef.current?.focus()}
        >
            <div className="flex-grow overflow-y-auto text-sm pr-2 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800">
                {output.map((line, index) => (
                    <div key={index} className="mb-1">
                        {line.type === 'prompt' && <Prompt {...prompt} />}
                        {line.type === 'command' && <span className="text-white break-all">{line.text}</span>}
                        {line.type === 'output' && <pre className="whitespace-pre-wrap text-slate-300">{line.text}</pre>}
                        {line.type === 'html' && <div className="text-slate-300" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(line.html || '', { ALLOWED_TAGS: ['strong', 'span', 'pre', 'br'], ALLOWED_ATTR: ['class'] }) }} />}
                        {line.type === 'error' && <pre className="whitespace-pre-wrap text-red-500">{line.text}</pre>}
                    </div>
                ))}
                <div ref={endOfOutputRef} />
            </div>
            
             {!isReadOnly && (
                <div className="mt-2 flex-shrink-0">
                    {searchMode && (
                        <div className="text-yellow-400 text-xs mb-1">
                            (reverse-i-search)`{searchQuery}': {searchResults[0] || 'ninguna coincidencia'}
                        </div>
                    )}
                    <div className="flex items-center">
                        {!searchMode && <Prompt {...prompt} />}
                        <input
                            ref={inputRef}
                            type="text"
                            className="bg-transparent border-none outline-none text-white font-mono text-sm w-full"
                            value={currentInput}
                            onChange={e => handleInputChange(e.target.value)}
                            onKeyDown={handleKeyDown}
                            autoFocus
                            autoComplete="off"
                            autoCapitalize="off"
                            spellCheck="false"
                            disabled={(isBusy && !searchMode) || isReadOnly}
                            placeholder={placeholder}
                        />
                    </div>
                </div>
            )}

            {autocomplete && autocomplete.suggestions.length > 1 && (
                <div className="absolute bottom-10 left-3 bg-gray-900 border border-gray-700 rounded p-1 z-10 grid grid-cols-3 gap-x-4 gap-y-1">
                    {autocomplete.suggestions.map((suggestion) => (
                        <div key={suggestion} className="px-2 text-xs text-slate-300">
                            {suggestion}
                        </div>
                    ))}
                </div>
            )}
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
