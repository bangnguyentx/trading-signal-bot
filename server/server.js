const express = require('express');
const cors = require('cors');
const path = require('path');
const database = require('./database');
const scanner = require('./scanner');

class TradingSignalServer {
    constructor() {
        this.app = express();
        this.port = process.env.PORT || 3000;
        this.setupMiddleware();
        this.setupRoutes();
        this.startScanner();
    }

    setupMiddleware() {
        this.app.use(cors());
        this.app.use(express.json());
        this.app.use(express.static(path.join(__dirname, '../public')));
    }

    setupRoutes() {
        // API Routes
        this.app.get('/api/signals', (req, res) => {
            const signals = database.getSignals();
            res.json({
                success: true,
                signals: signals,
                total: signals.length,
                timestamp: new Date().toISOString()
            });
        });

        this.app.get('/api/stats', (req, res) => {
            const signals = database.getSignals();
            const stats = this.calculateStats(signals);
            res.json({
                success: true,
                ...stats
            });
        });

        this.app.delete('/api/signals/:id', (req, res) => {
            const deleted = database.deleteSignal(req.params.id);
            res.json({
                success: deleted,
                message: deleted ? 'Signal deleted' : 'Signal not found'
            });
        });

        // Serve frontend
        this.app.get('/', (req, res) => {
            res.sendFile(path.join(__dirname, '../public/index.html'));
        });
    }

    calculateStats(signals) {
        const now = new Date();
        const oneHourAgo = new Date(now - 60 * 60 * 1000);
        const oneDayAgo = new Date(now - 24 * 60 * 60 * 1000);

        const recentSignals = signals.filter(s => new Date(s.timestamp) > oneHourAgo);
        const dailySignals = signals.filter(s => new Date(s.timestamp) > oneDayAgo);

        const comboCounts = {};
        signals.forEach(signal => {
            comboCounts[signal.comboType] = (comboCounts[signal.comboType] || 0) + 1;
        });

        return {
            totalSignals: signals.length,
            recentSignals: recentSignals.length,
            dailySignals: dailySignals.length,
            comboCounts: comboCounts,
            lastScan: scanner.getLastScanTime()
        };
    }

    startScanner() {
        // Start scanning every 5 minutes
        setInterval(() => {
            scanner.scanAllSymbols();
        }, 5 * 60 * 1000);

        // Initial scan
        setTimeout(() => {
            scanner.scanAllSymbols();
        }, 5000);
    }

    start() {
        this.app.listen(this.port, () => {
            console.log(`🚀 Trading Signal Server running on port ${this.port}`);
            console.log(`📊 Dashboard: http://localhost:${this.port}`);
            console.log(`🔍 Scanner started - Monitoring 30 coins on Binance Futures`);
        });
    }
}

// Start the server
const server = new TradingSignalServer();
server.start();

module.exports = server;
