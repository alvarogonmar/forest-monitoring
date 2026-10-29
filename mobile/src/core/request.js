// No native dependencies here: the complete lifecycle can be tested without a phone.
export class RequestController {
    deps;
    state = { ready: false, request: null, phase: 'idle', online: null, error: null };
    listeners = new Set();
    active = true;
    busy = false;
    rerun = false;
    abort = null;
    constructor(deps) { this.deps = deps; }
    snapshot = () => this.state;
    subscribe = (listener) => {
        this.listeners.add(listener);
        return () => { this.listeners.delete(listener); };
    };
    update(patch) {
        this.state = { ...this.state, ...patch };
        this.listeners.forEach(listener => listener());
    }
    async restore() {
        try {
            const request = await this.deps.read();
            this.update({ ready: true, request, phase: request?.status === 'confirmed' ? 'confirmed' : request ? 'pending' : 'idle', error: null });
            await this.resume();
        }
        catch {
            // Do not overwrite an unreadable request with a new one.
            this.update({ error: 'No pudimos recuperar la solicitud guardada. Reintenta para evitar perderla.' });
        }
    }
    setConnection(online) {
        if (online === this.state.online)
            return;
        this.update({ online });
        if (online !== true)
            this.abort?.abort();
        else
            void this.resume();
    }
    setActive(active) {
        this.active = active;
        if (!active)
            this.abort?.abort();
        else
            void this.resume();
    }
    async create() {
        if (!this.state.ready || this.busy || this.state.request)
            return;
        this.busy = true;
        this.update({ phase: 'saving', error: null });
        try {
            const request = { version: 1, id: this.deps.id(), createdAt: new Date().toISOString(), coordinates: null, status: 'pending', receipt: null };
            await this.deps.write(request);
            this.update({ request, phase: 'pending' });
        }
        catch {
            this.update({ phase: 'idle', error: 'No se pudo guardar la solicitud en este teléfono. Libera espacio y vuelve a intentarlo.' });
        }
        finally {
            this.busy = false;
        }
        await this.resume();
    }
    async resume() {
        if (this.busy) {
            this.rerun = true;
            return;
        }
        if (!this.state.ready || !this.active || !this.state.request || this.state.request.status === 'confirmed')
            return;
        this.busy = true;
        this.rerun = false;
        this.update({ error: null });
        try {
            let request = this.state.request;
            if (!request.coordinates) {
                this.update({ phase: 'locating' });
                const coordinates = await this.deps.locate();
                request = { ...request, coordinates };
                await this.deps.write(request);
                this.update({ request });
            }
            this.update({ phase: 'pending' });
            if (this.state.online !== true || !this.active)
                return;
            const abort = new AbortController();
            this.abort = abort;
            this.update({ phase: 'sending' });
            const receipt = await this.deps.send(request, abort.signal);
            if (abort.signal.aborted || !this.active || this.state.online !== true)
                return;
            const confirmed = { ...request, status: 'confirmed', receipt };
            await this.deps.write(confirmed);
            this.update({ request: confirmed, phase: 'confirmed' });
        }
        catch (error) {
            const aborted = this.abort?.signal.aborted;
            this.update({ phase: 'pending', error: aborted ? null : error instanceof Error ? error.message : 'No pudimos completar la solicitud. Sigue guardada; puedes reintentar.' });
            // Failed location/storage needs an explicit retry, not a tight loop.
            if (!aborted)
                this.rerun = false;
        }
        finally {
            this.abort = null;
            this.busy = false;
            if (this.state.phase === 'sending')
                this.update({ phase: 'pending' });
            if (this.rerun && this.active && this.state.online === true) {
                this.rerun = false;
                void this.resume();
            }
        }
    }
    async reset() {
        if (this.busy || this.state.request?.status !== 'confirmed')
            return;
        this.busy = true;
        try {
            await this.deps.write(null);
            this.update({ request: null, phase: 'idle', error: null });
        }
        catch {
            this.update({ error: 'No se pudo iniciar otra demostración. Reintenta.' });
        }
        finally {
            this.busy = false;
        }
    }
}
