import React, { useContext, useState, useEffect } from 'react';
import { TerminalInstance } from './TerminalInstance';
import { LogViewer } from './LogViewer';
import { Icon } from '../constants';
import { SimulationContext } from '../SimulationContext';

export const DualTerminalView: React.FC = () => {
    const { terminals, addTerminal, updateTerminalInput, processCommand, userTeam, navigateHistory, environment } = useContext(SimulationContext);
    
    // Ensure there's always an active terminal if terminals exist
    const [activeTerminalId, setActiveTerminalId] = useState<string | null>(null);
    useEffect(() => {
        if (!activeTerminalId && terminals.length > 0) {
            setActiveTerminalId(terminals[0].id);
        }
    }, [terminals, activeTerminalId]);


    const activeTerminal = terminals.find(t => t.id === activeTerminalId);

    const handleAddTerminal = () => {
        const newTerminal = addTerminal();
        setActiveTerminalId(newTerminal.id);
    };

    const handleCommand = (command: string) => {
        if (activeTerminalId) {
            processCommand(activeTerminalId, command);
        }
    };
    
    const handleInputChange = (input: string) => {
        if (activeTerminalId) {
            updateTerminalInput(activeTerminalId, input);
        }
    };

    const handleHistoryNav = (direction: 'up' | 'down') => {
        if (activeTerminalId) {
            navigateHistory(activeTerminalId, direction);
        }
    };

    if (userTeam === 'spectator') {
        return (
             <div className="bg-[rgba(45,80,22,0.85)] p-4 md:p-6 rounded-2xl border border-[rgba(184,134,11,0.3)] text-center h-[500px] flex flex-col justify-center items-center">
                <Icon name="binoculars" className="h-16 w-16 text-yellow-400 mb-4"/>
                <h2 className="text-2xl font-bold text-white mb-4">Modo Espectador</h2>
                <p className="text-gray-300 max-w-md">El dashboard de administración para monitorear todas las sesiones y terminales en tiempo real está en desarrollo y reemplazará esta vista.</p>
             </div>
        )
    }

    return (
        <div className="bg-[rgba(45,80,22,0.85)] p-4 md:p-6 rounded-2xl border border-[rgba(184,134,11,0.3)]">
            <div className="text-center mb-6">
                <h2 className="text-2xl md:text-3xl font-bold text-white">Consola de Operaciones</h2>
                <p className="text-gray-300 max-w-3xl mx-auto mt-2">
                    Utilice múltiples terminales para gestionar tareas complejas. Las tareas persistentes como listeners continuarán en segundo plano.
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
                <button
                    onClick={handleAddTerminal}
                    className="ml-2 px-3 py-1 text-sm text-gray-300 hover:bg-gray-700 rounded"
                    title="Nueva Terminal"
                >
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
                            onInputChange={handleInputChange}
                        />
                    ) : (
                        <div className="bg-[#0a0f1c] border border-gray-700 rounded-lg h-[400px] flex items-center justify-center text-gray-400">
                           Crea una nueva terminal para empezar.
                        </div>
                    )}
                    <LogViewer />
                </div>
            </div>
        </div>
    );
};
