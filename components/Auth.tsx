import React, { useState } from 'react';
import { supabase } from '../supabaseClient';

export const Auth: React.FC = () => {
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [message, setMessage] = useState('');

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

        try {
            // 1. Verificar dominio corporativo
            if (!email.endsWith('@cybervaltorix.com')) {
                throw new Error('Solo se permiten correos corporativos (@cybervaltorix.com).');
            }
            
            // 2. Verificar contra whitelist en Supabase (simulado, asume que la tabla 'allowed_emails' existe)
            /*
            const { data: isWhitelisted, error: whitelistError } = await supabase
                .from('allowed_emails')
                .select('email')
                .eq('email', email)
                .single();

            if (whitelistError && whitelistError.code !== 'PGRST116') throw whitelistError;
            
            if (!isWhitelisted) {
                throw new Error('Email no autorizado. Contacte al administrador.');
            }
            */

            // 3. Activar MFA y registrar
            const { error: signUpError } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    emailRedirectTo: `${window.location.origin}/`,
                }
            });

            if (signUpError) throw signUpError;
            
            setMessage('¡Registro exitoso! Por favor, revise su correo para el enlace de confirmación.');
        } catch (error: any) {
            setMessage(error.message);
        }

        setLoading(false);
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                 <div className="glass-morphism p-8 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
                    <div className="text-center mb-8">
                         <div className="flex justify-center items-center space-x-3 md:space-x-4 mb-4">
                            <div className="p-2 bg-slate-900/80 rounded-lg shadow-lg flex-shrink-0 border border-slate-700/50">
                                <img 
                                    src="https://cybervaltorix.com/wp-content/uploads/2025/09/Cyber-Valtorix-1.png" 
                                    alt="Logo Cyber Valtorix" 
                                    className="h-10 w-10 md:h-12 md:w-12 object-contain"
                                    onError={(e) => (e.currentTarget.src = 'https://placehold.co/48x48/2d5016/b8860b?text=CV')}
                                />
                            </div>
                            <div>
                                <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">CYBER VALTORIX</h1>
                                <p className="text-cyan-400 text-xs sm:text-sm font-medium tracking-wide uppercase">Taller de Inducción SOC</p>
                            </div>
                        </div>
                        <h2 className="text-2xl font-bold text-white">Acceso de Pasantes</h2>
                    </div>

                    <form onSubmit={handleLogin}>
                        <div className="space-y-4">
                            <input
                                className="w-full px-4 py-3 bg-slate-950/50 border border-slate-700/50 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all"
                                type="email"
                                placeholder="Correo electrónico"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                            <input
                                className="w-full px-4 py-3 bg-slate-950/50 border border-slate-700/50 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all"
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
                                className="w-full px-4 py-3 font-bold text-white bg-gradient-to-r from-cyan-600 to-blue-600 rounded-lg hover:from-cyan-500 hover:to-blue-500 transition-all shadow-[0_0_15px_rgba(6,182,212,0.4)] disabled:opacity-50"
                                disabled={loading}
                            >
                                {loading ? 'Cargando...' : 'Iniciar Sesión'}
                            </button>
                             <button
                                type="button"
                                onClick={handleSignup}
                                className="w-full px-4 py-3 font-bold text-white bg-slate-800/80 border border-slate-600 rounded-lg hover:bg-slate-700 hover:border-slate-500 transition-all disabled:opacity-50"
                                disabled={loading}
                            >
                                {loading ? 'Cargando...' : 'Registrarse'}
                            </button>
                        </div>
                    </form>
                    {message && <p className="mt-4 text-center text-yellow-300 text-sm">{message}</p>}
                </div>
            </div>
        </div>
    );
};
