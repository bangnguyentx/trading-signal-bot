const fs = require('fs');
const path = require('path');

class SignalDatabase {
    constructor() {
        this.dataFile = path.join(__dirname, 'data', 'signals.json');
        this.ensureDataDirectory();
        this.signals = this.loadSignals();
        this.startCleanupInterval();
    }

    ensureDataDirectory() {
        const dataDir = path.dirname(this.dataFile);
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }
    }

    loadSignals() {
        try {
            if (fs.existsSync(this.dataFile)) {
                const data = fs.readFileSync(this.dataFile, 'utf8');
                return JSON.parse(data);
            }
        } catch (error) {
            console.error('Error loading signals database:', error);
        }
        return [];
    }

    saveSignals() {
        try {
            fs.writeFileSync(this.dataFile, JSON.stringify(this.signals, null, 2));
            return true;
        } catch (error) {
            console.error('Error saving signals database:', error);
            return false;
        }
    }

    addSignal(signal) {
        // Check if similar signal already exists (same symbol and strategy within 1 hour)
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        const existingSignal = this.signals.find(s => 
            s.symbol === signal.symbol && 
            s.comboType === signal.comboType &&
            new Date(s.timestamp) > oneHourAgo
        );

        if (existingSignal) {
            console.log(`⚠️ Signal already exists for ${signal.symbol} - ${signal.comboType}`);
            return false;
        }

        this.signals.push(signal);
        const saved = this.saveSignals();
        
        if (saved) {
            console.log(`💾 Saved signal: ${signal.symbol} - ${signal.comboType}`);
        }
        
        return saved;
    }

    getSignals() {
        this.cleanupExpiredSignals();
        return this.signals
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
            .map(signal => ({ ...signal, isNew: this.isNewSignal(signal) }));
    }

    deleteSignal(signalId) {
        const initialLength = this.signals.length;
        this.signals = this.signals.filter(s => s.id !== signalId);
        
        if (this.signals.length !== initialLength) {
            this.saveSignals();
            return true;
        }
        return false;
    }

    isNewSignal(signal) {
        const signalTime = new Date(signal.timestamp);
        const now = new Date();
        return (now - signalTime) < 5 * 60 * 1000; // 5 minutes
    }

    cleanupExpiredSignals() {
        const now = new Date();
        const initialCount = this.signals.length;
        
        this.signals = this.signals.filter(signal => {
            const signalTime = new Date(signal.timestamp);
            let expireMs;

            if (signal.comboType === 'Momentum Master' || signal.comboType === 'Breakout Pro') {
                expireMs = 60 * 60 * 1000; // 1 hour
            } else {
                expireMs = 24 * 60 * 60 * 1000; // 24 hours
            }

            return (now - signalTime) < expireMs;
        });

        if (this.signals.length !== initialCount) {
            console.log(`🧹 Cleaned up ${initialCount - this.signals.length} expired signals`);
            this.saveSignals();
        }
    }

    startCleanupInterval() {
        // Cleanup every hour
        setInterval(() => {
            this.cleanupExpiredSignals();
        }, 60 * 60 * 1000);
    }

    getStats() {
        this.cleanupExpiredSignals();
        
        const now = new Date();
        const oneHourAgo = new Date(now - 60 * 60 * 1000);
        const oneDayAgo = new Date(now - 24 * 60 * 60 * 1000);

        const recentSignals = this.signals.filter(s => new Date(s.timestamp) > oneHourAgo);
        const dailySignals = this.signals.filter(s => new Date(s.timestamp) > oneDayAgo);

        const comboCounts = {};
        this.signals.forEach(signal => {
            comboCounts[signal.comboType] = (comboCounts[signal.comboType] || 0) + 1;
        });

        return {
            total: this.signals.length,
            recent: recentSignals.length,
            daily: dailySignals.length,
            combos: comboCounts
        };
    }
}

module.exports = new SignalDatabase();
