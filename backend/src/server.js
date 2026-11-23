import { createApp } from './app.js';
import { createPasswordVerifier, createSupabaseClient } from './services/supabase.js';
import { createRoutesRepository } from './repositories/routes.js';
import { createHelpRequestsRepository } from './repositories/helpRequests.js';
import { createAdminSessionsRepository } from './repositories/adminSessions.js';
import { createAdminAuth } from './services/adminAuth.js';

const portText = process.env.PORT ?? '3001';
if (!/^[1-9]\d{0,4}$/.test(portText) || Number(portText) > 65535) {
    console.error('PORT debe ser un entero entre 1 y 65535.');
    process.exit(1);
}

const port = Number(portText);
const host = process.env.HOST ?? '127.0.0.1';
let supabase;
let verifyPassword;
try {
    supabase = createSupabaseClient();
    verifyPassword = createPasswordVerifier();
} catch (error) {
    console.error(error.message);
    process.exit(1);
}
if (!supabase) {
    console.log('Supabase pendiente: completa SUPABASE_URL y SUPABASE_SECRET_KEY en backend/.env.');
}
const routesRepository = supabase ? createRoutesRepository(supabase) : null;
const helpRequestsRepository = supabase ? createHelpRequestsRepository(supabase) : null;
const allowedOrigins = (process.env.ALLOWED_ORIGINS ?? '').split(',').map(value => value.trim()).filter(Boolean);
const adminAuth = supabase ? createAdminAuth({ repository: createAdminSessionsRepository(supabase), verifyPassword }) : null;
if (!verifyPassword) console.log('Login pendiente: configura SUPABASE_PUBLISHABLE_KEY en backend/.env.');
const server = createApp({ routesRepository, helpRequestsRepository, allowedOrigins,
    adminAuth, secureCookies: process.env.NODE_ENV === 'production' }).listen(port, host, () => {
    console.log(`Forest API disponible en http://${host}:${port}/api/health`);
});

server.on('error', (error) => {
    console.error(error.code === 'EADDRINUSE'
        ? `El puerto ${port} ya está ocupado. Configura otro PORT en .env.`
        : 'No se pudo iniciar el servidor. Revisa HOST y PORT.');
    process.exitCode = 1;
});

for (const signal of ['SIGINT', 'SIGTERM']) {
    process.once(signal, () => {
        server.close();
        setTimeout(() => process.exit(1), 10_000).unref();
    });
}
