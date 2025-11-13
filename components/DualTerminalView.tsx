
import React from 'react';
import { TerminalInstance } from './TerminalInstance';
import { LogViewer } from './LogViewer';
import { Icon } from '../constants';

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
    return (
        <div className="bg-[rgba(45,80,22,0.85)] p-4 md:p-6 rounded-2xl border border-[rgba(184,134,11,0.3)]">
            <div className="text-center mb-6">
                <h2 className="text-2xl md:text-3xl font-bold text-white">Simulación: Equipo Rojo vs. Equipo Azul</h2>
                <p className="text-gray-300 max-w-3xl mx-auto mt-2">
                    El Equipo Rojo (atacante) debe auditar los servidores. El Equipo Azul (defensor) debe asegurarlos y detectar la intrusión. Las acciones en una terminal generarán logs en tiempo real para ambos equipos.
                </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Red Team Column */}
                <div className="flex flex-col space-y-4">
                    <TerminalHeader team="Red" />
                    <TerminalInstance team="Red" />
                    <LogViewer team="Red" />
                </div>

                {/* Blue Team Column */}
                <div className="flex flex-col space-y-4">
                    <TerminalHeader team="Blue" />
                    <TerminalInstance team="Blue" />
                    <LogViewer team="Blue" />
                </div>
            </div>
        </div>
    );
};
