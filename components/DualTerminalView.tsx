import React, { useContext, useState, useEffect } from 'react';
import { TerminalInstance } from './TerminalInstance';
import { LogViewer } from './LogViewer';
import { Icon } from '../constants';
import { SimulationContext } from '../SimulationContext';

const TerminalHeader: React.FC<{ team: 'Red' | 'Blue' }> = ({ team }) => {
    const isRed = team === 'Red';
    return (
        <div className={`flex items-center p-3 rounded-t-lg ${isRed ? 'bg-red-900/50' : 'bg-blue-900/50'}`}>
            <Icon name={isRed ? 'sword' : 'shield'} className={`h-5 w-5 mr-3 ${isRed ? 'text-red-400' : 'text-blue-400'}`} />
            <h3 className={`font-bold ${isRed ? 'text-red-300' : 'text-blue-300'}`}>{team} Team Terminal</h3>
        </div>
    );
};

export const DualTerminalView: React.FC = () => {
    const { userTeam } = useContext(SimulationContext);
    const [adminView, setAdminView] = useState<'Red' | 'Blue'>('Red');
    const [isControlling, setIsControlling] = useState(false);

    useEffect(() => {
        // Reset control when switching teams
        setIsControlling(false);
    }, [adminView]);


    if (!userTeam) {
        return (
            <div className="flex items-center justify-center h-96 text-white">
                Cargando asignación de equipo...
            </div>
        );
    }
    
    // Admin/Spectator View
    if (userTeam === 'spectator') {
        const viewedTeam = adminView;
        const isViewingRed = viewedTeam === 'Red';

        return (
            <div className="bg-[rgba(45,80,22,0.85)] p-4 md:p-6 rounded-2xl border border-[rgba(184,134,11,0.3)]">
                <div className="text-center mb-4">
                    <h2 className="text-2xl md:text-3xl font-bold text-white">Panel de Control del Administrador</h2>
                     <p className={`text-gray-300 max-w-3xl mx-auto mt-2 transition-colors duration-300 ${isControlling ? 'text-yellow-300 font-semibold' : ''}`}>
                        {isControlling ? `Tomando control del Equipo ${isViewingRed ? 'Rojo' : 'Azul'}.` : `Observando al Equipo ${isViewingRed ? 'Rojo' : 'Azul'}.`}
                    </p>
                </div>
                
                <div className="flex flex-col sm:flex-row justify-center items-center gap-4 mb-6">
                    {/* Team Selectors */}
                    <div className="flex justify-center items-center gap-4">
                        <button 
                            onClick={() => setAdminView('Red')}
                            className={`px-6 py-2 font-bold rounded-lg transition-all flex items-center gap-2 ${isViewingRed ? 'bg-red-800/80 text-white shadow-lg shadow-red-900/50 border border-red-500' : 'bg-gray-700/50 text-gray-300 hover:bg-red-700/50 border border-transparent'}`}
                        >
                            <Icon name="sword" className="h-5 w-5" /> Ver Equipo Rojo
                        </button>
                        <button 
                            onClick={() => setAdminView('Blue')}
                            className={`px-6 py-2 font-bold rounded-lg transition-all flex items-center gap-2 ${!isViewingRed ? 'bg-blue-800/80 text-white shadow-lg shadow-blue-900/50 border border-blue-500' : 'bg-gray-700/50 text-gray-300 hover:bg-blue-700/50 border border-transparent'}`}
                        >
                            <Icon name="shield" className="h-5 w-5" /> Ver Equipo Azul
                        </button>
                    </div>
                    {/* Control Toggle */}
                    <button
                        onClick={() => setIsControlling(!isControlling)}
                        className={`px-6 py-2 font-bold rounded-lg transition-all flex items-center gap-2 border ${
                            isControlling 
                                ? 'bg-yellow-600/80 text-white shadow-lg shadow-yellow-900/50 border-yellow-400' 
                                : 'bg-gray-700/50 text-gray-300 hover:bg-yellow-700/50 border-transparent'
                        }`}
                    >
                        <Icon name={isControlling ? 'binoculars' : 'keyboard'} className="h-5 w-5" />
                        {isControlling ? 'Devolver Control' : 'Tomar Control'}
                    </button>
                </div>

                <div className="max-w-4xl mx-auto animate-fade-in-fast">
                    <div className="flex flex-col space-y-4">
                        <TerminalHeader team={viewedTeam} />
                        <TerminalInstance team={viewedTeam} isControlling={isControlling} />
                        <LogViewer team={viewedTeam} />
                    </div>
                </div>

            </div>
        );
    }

    // Regular User View
    const teamName = userTeam === 'red' ? 'Red' : 'Blue';
    const teamRole = userTeam === 'red' ? 'atacante' : 'defensor';
    const otherTeamRole = userTeam === 'red' ? 'defensor (Equipo Azul)' : 'atacante (Equipo Rojo)';
    
    return (
        <div className="bg-[rgba(45,80,22,0.85)] p-4 md:p-6 rounded-2xl border border-[rgba(184,134,11,0.3)]">
            <div className="text-center mb-6">
                <h2 className="text-2xl md:text-3xl font-bold text-white">Terminal de Simulación - {teamName} Team</h2>
                <p className="text-gray-300 max-w-3xl mx-auto mt-2">
                    Tu rol es de {teamRole}. Tus acciones generarán logs visibles para ti y para el equipo {otherTeamRole}. Usa 'help' para ver tus comandos.
                </p>
            </div>
            <div className="max-w-4xl mx-auto">
                <div className="flex flex-col space-y-4">
                    <TerminalHeader team={teamName} />
                    <TerminalInstance team={teamName} />
                    <LogViewer team={teamName} />
                </div>
            </div>
        </div>
    );
};
