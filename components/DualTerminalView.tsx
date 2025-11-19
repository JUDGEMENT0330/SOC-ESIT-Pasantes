import React, { useContext, useState, useEffect } from 'react';
import { TerminalInstance } from './TerminalInstance';
import { LogViewer } from './LogViewer';
import { Icon } from '../constants';
import { SimulationContext } from '../SimulationContext';

export const DualTerminalView: React.FC = () => {
    const { terminals, processCommand, userTeam, environment, activeScenario, addNewTerminal, removeTerminal } = useContext(SimulationContext);
    
    const [activeTerminalId, setActiveTerminalId] = useState<string | null>(null);
    const [spectatorViewMode, setSpectatorViewMode] = useState<'dual' | 'red' | 'blue'>('dual');
    
    // Filter to only show terminals for the current user's team
    const teamTerminals = userTeam !== 'spectator' ? terminals.filter(t => t.id.startsWith(userTeam as string)) : [];

    useEffect(() => {
        // Automatically select a terminal for the user
        if (teamTerminals.length > 0) {
            const currentActiveTerminal = teamTerminals.find(t => t.id === activeTerminalId);
            // If the active terminal is no longer valid (e.g., it was removed) or none is selected, select one.
            if (!currentActiveTerminal) {
                setActiveTerminalId(teamTerminals[teamTerminals.length - 1].id);
            }
        } else {
            setActiveTerminalId(null);
        }
    }, [terminals, userTeam, activeTerminalId]); // Rerun when terminals change


    const activeTerminal = terminals.find(t => t.id === activeTerminalId);

    const handleCommand = (command: string) => {
        if (activeTerminalId) {
            processCommand(activeTerminalId, command);
        }
    };

    if (userTeam === 'spectator') {
        const redTerminals = terminals.filter(t => t.id.startsWith('red'));
        const blueTerminals = terminals.filter(t => t.id.startsWith('blue'));

        const getButtonClass = (mode: 'dual' | 'red' | 'blue') => {
            const base = 'px-3 py-1 text-xs font-bold rounded-full transition-colors';
            if (spectatorViewMode === mode) {
                return `${base} bg-yellow-400 text-black shadow-[0_0_10px_rgba(250,204,21,0.5)]`;
            }
            return `${base} bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-600`;
        };

        return (
             <div className="glass-morphism p-4 md:p-6 rounded-2xl">
                <div className="text-center mb-4">
                    <h2 className="text-2xl md:text-3xl font-bold text-white">Vista de Espectador</h2>
                    <p className="text-slate-400 max-w-3xl mx-auto mt-2 text-sm">
                        Observando la sesión en tiempo real. Use el Panel de Admin para tomar control de un equipo.
                    </p>
                </div>

                <div className="flex justify-center items-center gap-3 mb-4 border-y border-slate-700/50 py-3">
                     <span className="text-sm font-semibold text-slate-400">Vistas:</span>
                     <button onClick={() => setSpectatorViewMode('dual')} className={getButtonClass('dual')}>Vista Dual</button>
                     <button onClick={() => setSpectatorViewMode('red')} className={getButtonClass('red')}>Solo Rojo</button>
                     <button onClick={() => setSpectatorViewMode('blue')} className={getButtonClass('blue')}>Solo Azul</button>
                </div>
                
                <div className={`grid gap-4 ${spectatorViewMode === 'dual' ? 'md:grid-cols-2' : 'grid-cols-1'}`}>
                    {(spectatorViewMode === 'dual' || spectatorViewMode === 'red') && (
                        <div>
                            <h3 className="font-bold text-red-400 mb-2 text-center flex items-center justify-center gap-2">
                                <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                                Terminales Equipo Rojo ({redTerminals.length})
                            </h3>
                            {redTerminals.length > 0 ? (
                                redTerminals.map(term => <TerminalInstance key={term.id} terminalState={term} environment={environment} onCommand={() => {}} isReadOnly={true} />)
                            ) : <div className="h-[400px] bg-black/40 rounded-lg flex items-center justify-center text-slate-500 border border-slate-800 border-dashed">Terminal inactiva</div>}
                        </div>
                    )}
                    {(spectatorViewMode === 'dual' || spectatorViewMode === 'blue') && (
                        <div>
                             <h3 className="font-bold text-blue-400 mb-2 text-center flex items-center justify-center gap-2">
                                <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
                                Terminales Equipo Azul ({blueTerminals.length})
                            </h3>
                            {blueTerminals.length > 0 ? (
                                blueTerminals.map(term => <TerminalInstance key={term.id} terminalState={term} environment={environment} onCommand={() => {}} isReadOnly={true} />)
                            ) : <div className="h-[400px] bg-black/40 rounded-lg flex items-center justify-center text-slate-500 border border-slate-800 border-dashed">Terminal inactiva</div>}
                        </div>
                    )}
                </div>
                <div className="mt-4">
                    <LogViewer />
                </div>
             </div>
        );
    }

    if (teamTerminals.length === 0) {
        return (
            <div className="glass-morphism p-4 md:p-6 rounded-2xl text-center h-[500px] flex flex-col justify-center items-center">
                <Icon name="terminal" className="h-16 w-16 text-slate-500 mb-4 opacity-50"/>
                <h2 className="text-2xl font-bold text-white mb-4">Terminal No Disponible</h2>
                <p className="text-slate-400 max-w-md">Un momento, inicializando entorno...</p>
            </div>
        );
    }
    
    return (
        <div className="glass-morphism p-4 md:p-6 rounded-2xl">
            <div className="text-center mb-6">
                <h2 className="text-2xl md:text-3xl font-bold text-white tracking-tight">Consola de Operaciones</h2>
                <p className="text-slate-400 max-w-3xl mx-auto mt-2">
                   Ejecute comandos para completar los objetivos de su equipo.
                </p>
            </div>

            <div className="flex items-center border-b border-slate-700/50 mb-2 overflow-x-auto">
                {teamTerminals.map(term => {
                    return (
                        <button
                            key={term.id}
                            onClick={() => setActiveTerminalId(term.id)}
                            className={`flex items-center gap-2 pr-4 pl-4 py-2 text-sm font-medium border-b-2 transition-all duration-300 whitespace-nowrap ${
                                activeTerminalId === term.id
                                    ? 'border-cyan-400 text-white bg-white/5'
                                    : 'border-transparent text-slate-500 hover:text-slate-300 hover:bg-white/5'
                            }`}
                        >
                            <span>{term.name}</span>
                             {teamTerminals.length > 1 && (
                                <span 
                                    onClick={(e) => { e.stopPropagation(); removeTerminal(term.id); }} 
                                    className="ml-2 p-1 rounded-full hover:bg-red-500/20 group"
                                    title="Cerrar terminal"
                                >
                                    <Icon name="trash" className="h-3 w-3 text-slate-600 group-hover:text-red-400 transition-colors"/>
                                </span>
                            )}
                        </button>
                    )
                })}
                 <button onClick={addNewTerminal} className="p-2 ml-2 text-slate-500 hover:text-cyan-400 transition-colors" title="Añadir nueva terminal">
                    <Icon name="plus-circle" className="h-5 w-5" />
                </button>
            </div>

            <div className="w-full mx-auto">
                <div className="flex flex-col space-y-4">
                    {activeTerminal ? (
                        <TerminalInstance
                            key={activeTerminal.id}
                            terminalState={activeTerminal}
                            environment={environment}
                            onCommand={handleCommand}
                        />
                    ) : (
                        <div className="bg-black/20 border border-slate-800 rounded-lg h-[400px] flex items-center justify-center text-slate-500">
                           Seleccione una terminal.
                        </div>
                    )}
                    <LogViewer />
                </div>
            </div>
        </div>
    );
};
