import React, { useContext, useState, useEffect } from 'react';
import { TerminalInstance } from './TerminalInstance';
import { LogViewer } from './LogViewer';
import { Icon } from '../constants';
import { SimulationContext } from '../SimulationContext';

export const DualTerminalView: React.FC = () => {
    const { terminals, processCommand, userTeam, environment, activeScenario } = useContext(SimulationContext);
    
    // Ensure there's always an active terminal if terminals exist
    const [activeTerminalId, setActiveTerminalId] = useState<string | null>(null);
    useEffect(() => {
        if (!activeTerminalId && terminals.length > 0 && userTeam !== 'spectator') {
            setActiveTerminalId(terminals[0].id);
        }
    }, [terminals, activeTerminalId, userTeam]);


    const activeTerminal = terminals.find(t => t.id === activeTerminalId);

    const handleCommand = (command: string) => {
        if (activeTerminalId) {
            processCommand(activeTerminalId, command);
        }
    };

    if (userTeam === 'spectator') {
        const [spectatorViewMode, setSpectatorViewMode] = useState<'dual' | 'red' | 'blue'>('dual');
        const redTerminal = terminals.find(t => t.id.startsWith('red'));
        const blueTerminal = terminals.find(t => t.id.startsWith('blue'));

        const getButtonClass = (mode: 'dual' | 'red' | 'blue') => {
            const base = 'px-3 py-1 text-xs font-bold rounded-full transition-colors';
            if (spectatorViewMode === mode) {
                return `${base} bg-yellow-400 text-black`;
            }
            return `${base} bg-gray-700 text-white hover:bg-gray-600`;
        };

        return (
             <div className="bg-[rgba(45,80,22,0.85)] p-4 md:p-6 rounded-2xl border border-[rgba(184,134,11,0.3)]">
                <div className="text-center mb-4">
                    <h2 className="text-2xl md:text-3xl font-bold text-white">Vista de Espectador</h2>
                    <p className="text-gray-300 max-w-3xl mx-auto mt-2 text-sm">
                        Observando la sesión en tiempo real. Use el Panel de Admin para tomar control de un equipo.
                    </p>
                </div>

                <div className="flex justify-center items-center gap-3 mb-4 border-y border-gray-700 py-2">
                     <span className="text-sm font-semibold text-gray-300">Vistas:</span>
                     <button onClick={() => setSpectatorViewMode('dual')} className={getButtonClass('dual')}>Vista Dual</button>
                     <button onClick={() => setSpectatorViewMode('red')} className={getButtonClass('red')}>Solo Rojo</button>
                     <button onClick={() => setSpectatorViewMode('blue')} className={getButtonClass('blue')}>Solo Azul</button>
                </div>
                
                {!activeScenario && (
                    <div className="text-center py-10 text-gray-400 h-[400px] flex items-center justify-center bg-black/20 rounded-lg">Esperando que los equipos inicien un escenario...</div>
                )}

                {activeScenario && (
                    <div className={`grid gap-4 ${spectatorViewMode === 'dual' ? 'md:grid-cols-2' : 'grid-cols-1'}`}>
                        {(spectatorViewMode === 'dual' || spectatorViewMode === 'red') && (
                            <div>
                                <h3 className="font-bold text-red-400 mb-2 text-center">Terminal Equipo Rojo</h3>
                                {redTerminal ? (
                                    <TerminalInstance terminalState={redTerminal} environment={environment} onCommand={() => {}} isReadOnly={true} />
                                ) : <div className="h-[400px] bg-black/20 rounded-lg flex items-center justify-center text-gray-500">Terminal inactiva</div>}
                            </div>
                        )}
                        {(spectatorViewMode === 'dual' || spectatorViewMode === 'blue') && (
                            <div>
                                <h3 className="font-bold text-blue-400 mb-2 text-center">Terminal Equipo Azul</h3>
                                {blueTerminal ? (
                                    <TerminalInstance terminalState={blueTerminal} environment={environment} onCommand={() => {}} isReadOnly={true} />
                                ) : <div className="h-[400px] bg-black/20 rounded-lg flex items-center justify-center text-gray-500">Terminal inactiva</div>}
                            </div>
                        )}
                    </div>
                )}
                <div className="mt-4">
                    <LogViewer />
                </div>
             </div>
        );
    }

    if (terminals.length === 0) {
        return (
            <div className="bg-[rgba(45,80,22,0.85)] p-4 md:p-6 rounded-2xl border border-[rgba(184,134,11,0.3)] text-center h-[500px] flex flex-col justify-center items-center">
                <Icon name="terminal" className="h-16 w-16 text-gray-400 mb-4"/>
                <h2 className="text-2xl font-bold text-white mb-4">Terminal No Disponible</h2>
                <p className="text-gray-300 max-w-md">Un momento, inicializando entorno...</p>
            </div>
        );
    }
    
    return (
        <div className="bg-[rgba(45,80,22,0.85)] p-4 md:p-6 rounded-2xl border border-[rgba(184,134,11,0.3)]">
            <div className="text-center mb-6">
                <h2 className="text-2xl md:text-3xl font-bold text-white">Consola de Operaciones</h2>
                <p className="text-gray-300 max-w-3xl mx-auto mt-2">
                   Ejecute comandos para completar los objetivos de su equipo.
                </p>
            </div>

            <div className="flex items-center border-b border-gray-700 mb-2">
                {terminals.map(term => (
                    <button
                        key={term.id}
                        onClick={() => setActiveTerminalId(term.id)}
                        className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                            activeTerminalId === term.id
                                ? 'border-[var(--cv-gold)] text-white'
                                : 'border-transparent text-gray-400 hover:text-white'
                        }`}
                    >
                        {term.name}
                    </button>
                ))}
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
                        <div className="bg-[#0a0f1c] border border-gray-700 rounded-lg h-[400px] flex items-center justify-center text-gray-400">
                           Seleccione una terminal.
                        </div>
                    )}
                    <LogViewer />
                </div>
            </div>
        </div>
    );
};
