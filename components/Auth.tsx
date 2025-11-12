
import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { Icon } from '../constants';

export const Auth: React.FC = () => {
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [message, setMessage] = useState('');
    const [showSetup, setShowSetup] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setMessage('');
        setLoading(true);
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
            setMessage(error.message);
        }
        setLoading(false);
    };

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        setMessage('');
        setLoading(true);
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) {
            setMessage(error.message);
        } else {
            setMessage('¡Registro exitoso! Por favor, revise su correo para el enlace de confirmación.');
        }
        setLoading(false);
    };

    const setupSQL = `-- 1. Copia y pega esto en el SQL Editor de Supabase

create table if not exists user_progress (
  id uuid references auth.users on delete cascade not null primary key,
  completed_scenarios text[] default '{}',
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

alter table user_progress enable row level security;

create policy "Users can view their own progress"
  on user_progress for select
  using ( auth.uid() = id );

create policy "Users can update their own progress"
  on user_progress for insert
  with check ( auth.uid() = id );

create policy "Users can update their own progress - update"
  on user_progress for update
  using ( auth.uid() = id );

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.user_progress (id)
  values (new.id);
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();`;

    const copyToClipboard = () => {
        navigator.clipboard.writeText(setupSQL);
        setMessage('Código SQL copiado al portapapeles.');
        setTimeout(() => setMessage(''), 3000);
    };

    if (showSetup) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4">
                <div className="w-full max-w-2xl">
                     <div className="glass-morphism p-8 rounded-2xl shadow-2xl bg-[rgba(45,80,22,0.95)] backdrop-blur-xl border border-[rgba(184,134,11,0.3)] max-h-[90vh] flex flex-col">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold text-white flex items-center">
                                <Icon name="terminal" className="mr-2 h-6 w-6 text-[var(--cv-gold)]" />
                                Configuración de Base de Datos
                            </h2>
                            <button onClick={() => setShowSetup(false)} className="text-gray-400 hover:text-white">
                                <span className="text-2xl">&times;</span>
                            </button>
                        </div>
                        
                        <div className="text-gray-300 text-sm mb-4 space-y-2">
                            <p>Para que la plataforma guarde el progreso de los alumnos, necesitas crear una tabla en tu proyecto de Supabase.</p>
                            <ol className="list-decimal list-inside text-gray-400 ml-2">
                                <li>Ve a tu proyecto en <a href="https://supabase.com/dashboard" target="_blank" rel="noopener noreferrer" className="text-blue-400 underline">Supabase Dashboard</a>.</li>
                                <li>Abre el <strong>SQL Editor</strong> (ícono de página en la barra lateral).</li>
                                <li>Crea una <strong>New Query</strong>.</li>
                                <li>Copia el código de abajo y pégalo.</li>
                                <li>Dale click a <strong>Run</strong>.</li>
                            </ol>
                        </div>

                        <div className="relative flex-grow overflow-hidden border border-gray-700 rounded-lg bg-black/50">
                            <pre className="w-full h-64 p-4 text-xs font-mono text-green-400 overflow-auto whitespace-pre-wrap">
                                {setupSQL}
                            </pre>
                            <button 
                                onClick={copyToClipboard}
                                className="absolute top-2 right-2 bg-[var(--cv-gold)] text-black px-3 py-1 rounded text-xs font-bold hover:bg-yellow-400 transition-colors"
                            >
                                Copiar
                            </button>
                        </div>

                        <div className="mt-6 text-center">
                            <button 
                                onClick={() => setShowSetup(false)}
                                className="text-gray-400 hover:text-white text-sm underline"
                            >
                                Volver al Inicio de Sesión
                            </button>
                        </div>
                        {message && <p className="mt-2 text-center text-green-400 text-sm">{message}</p>}
                     </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                 <div className="glass-morphism p-8 rounded-2xl shadow-2xl bg-[rgba(45,80,22,0.85)] backdrop-blur-xl border border-[rgba(184,134,11,0.3)]">
                    <div className="text-center mb-8">
                         <div className="flex justify-center items-center space-x-3 md:space-x-4 mb-4">
                            <div className="p-2 bg-gray-900/50 rounded-lg shadow-lg flex-shrink-0">
                                <img 
                                    src="https://cybervaltorix.com/wp-content/uploads/2025/09/Logo-Valtorix-1.png" 
                                    alt="Logo Cyber Valtorix" 
                                    className="h-10 w-10 md:h-12 md:w-12 object-contain"
                                    onError={(e) => (e.currentTarget.src = 'https://placehold.co/48x48/2d5016/b8860b?text=CV')}
                                />
                            </div>
                            <div>
                                <h1 className="text-xl sm:text-2xl font-bold text-white">CYBER VALTORIX</h1>
                                <p className="text-yellow-200 text-xs sm:text-sm font-medium">Taller de Inducción SOC</p>
                            </div>
                        </div>
                        <h2 className="text-2xl font-bold text-white">Acceso de Pasantes</h2>
                    </div>

                    <form onSubmit={handleLogin}>
                        <div className="space-y-4">
                            <input
                                className="w-full px-4 py-3 bg-black/30 border border-[rgba(184,134,11,0.3)] rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--cv-gold)]"
                                type="email"
                                placeholder="Correo electrónico"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                            <input
                                className="w-full px-4 py-3 bg-black/30 border border-[rgba(184,134,11,0.3)] rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--cv-gold)]"
                                type="password"
                                placeholder="Contraseña"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </div>
                        <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4 mt-6">
                            <button
                                type="submit"
                                className="w-full px-4 py-3 font-bold text-white bg-green-600/80 rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50"
                                disabled={loading}
                            >
                                {loading ? 'Cargando...' : 'Iniciar Sesión'}
                            </button>
                             <button
                                type="button"
                                onClick={handleSignup}
                                className="w-full px-4 py-3 font-bold text-white bg-blue-600/80 rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
                                disabled={loading}
                            >
                                {loading ? 'Cargando...' : 'Registrarse'}
                            </button>
                        </div>
                    </form>
                    {message && <p className="mt-4 text-center text-yellow-300 text-sm">{message}</p>}
                    
                    <div className="mt-8 border-t border-white/10 pt-4 text-center">
                        <button 
                            onClick={() => setShowSetup(true)}
                            className="text-xs text-gray-400 hover:text-[var(--cv-gold)] transition-colors underline"
                        >
                            ¿Primera vez? Configurar Base de Datos (Admin)
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
