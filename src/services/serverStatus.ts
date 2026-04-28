// src/services/serverStatus.ts

type ServerStatusListener = (isWakingUp: boolean) => void;

class ServerStatusManager {
    private listeners: Set<ServerStatusListener> = new Set();
    private isWakingUp = false;
    private activeRequests = 0;
    private wakeupTimers: Map<string, NodeJS.Timeout> = new Map();

    subscribe(listener: ServerStatusListener) {
        this.listeners.add(listener);
        return () => { this.listeners.delete(listener); };
    }

    private notify() {
        this.listeners.forEach(l => l(this.isWakingUp));
    }

    startRequest(requestId: string) {
        this.activeRequests++;
        
        // Se for o primeiro request ou estivermos monitorando, inicia o timer de 5s
        const timer = setTimeout(() => {
            if (this.activeRequests > 0) {
                this.isWakingUp = true;
                this.notify();
            }
        }, 5000);

        this.wakeupTimers.set(requestId, timer);
    }

    endRequest(requestId: string) {
        this.activeRequests = Math.max(0, this.activeRequests - 1);
        
        const timer = this.wakeupTimers.get(requestId);
        if (timer) {
            clearTimeout(timer);
            this.wakeupTimers.delete(requestId);
        }

        if (this.activeRequests === 0) {
            this.isWakingUp = false;
            this.notify();
        }
    }
}

export const serverStatusManager = new ServerStatusManager();
