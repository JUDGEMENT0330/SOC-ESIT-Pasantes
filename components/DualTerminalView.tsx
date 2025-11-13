
import React, { useContext } from 'react';
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

    if (!userTeam) {
        return (
            <div className="flex items-center justify-center h-96 text-white">
                Cargando asignación de equipo...
            </div>
        );
    }
    
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
                {/* Single Team Column */}
                <div className="flex flex-col space-y-4">
                    <TerminalHeader team={teamName} />
                    <TerminalInstance team={teamName} />
                    <LogViewer team={teamName} />
                </div>
            </div>
        </div>
    );
};
