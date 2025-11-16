const database = require('./database');
const strategies = require('./strategies');

class TradingSignalScanner {
    constructor() {
        this.symbols = [
            'BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'ADAUSDT', 'DOTUSDT',
            'LINKUSDT', 'LTCUSDT', 'BCHUSDT', 'XLMUSDT', 'XRPUSDT',
            'EOSUSDT', 'TRXUSDT', 'ETCUSDT', 'XTZUSDT', 'ATOMUSDT',
            'NEOUSDT', 'IOTAUSDT', 'VETUSDT', 'THETAUSDT', 'ALGOUSDT',
            'QTUMUSDT', 'ONTUSDT', 'ZILUSDT', 'BATUSDT', 'OMGUSDT',
            'ZRXUSDT', 'ICXUSDT', 'KNCUSDT', 'SNXUSDT', 'COMPUSDT'
        ];
        this.lastScanTime = null;
    }

    async scanAllSymbols() {
        console.log(`🔍 Starting scan of ${this.symbols.length} symbols...`);
        this.lastScanTime = new Date();

        let totalSignals = 0;

        for (const symbol of this.symbols) {
            try {
                const signals = await this.scanSymbol(symbol);
                totalSignals += signals.length;
                
                // Add small delay to avoid rate limiting
                await this.delay(100);
            } catch (error) {
                console.error(`Error scanning ${symbol}:`, error.message);
            }
        }

        console.log(`✅ Scan completed. Found ${totalSignals} signals across ${this.symbols.length} symbols`);
        return totalSignals;
    }

    async scanSymbol(symbol) {
        const signals = [];
        
        try {
            // Get market data from Binance
            const marketData = await this.fetchMarketData(symbol);
            if (!marketData) return signals;

            // Check all strategies
            const strategyResults = await Promise.all([
                strategies.checkMomentumMaster(marketData),
                strategies.checkBreakoutPro(marketData),
                strategies.checkTrendFollowing(marketData),
                strategies.checkBreakoutTrading(marketData)
            ]);

            // Process results
            strategyResults.forEach((result, index) => {
                if (result && result.valid) {
                    const signal = {
                        id: this.generateSignalId(symbol, result.strategyName),
                        symbol: symbol,
                        comboType: result.strategyName,
                        direction: result.direction,
                        entry: result.entry,
                        stopLoss: result.stopLoss,
                        takeProfit: result.takeProfit,
                        confidence: result.confidence,
                        timestamp: new Date().toISOString(),
                        isNew: true
                    };

                    // Save to database
                    if (database.addSignal(signal)) {
                        signals.push(signal);
                        console.log(`🎯 New signal: ${symbol} - ${result.strategyName} - ${result.direction}`);
                    }
                }
            });

        } catch (error) {
            console.error(`Scan error for ${symbol}:`, error);
        }

        return signals;
    }

    async fetchMarketData(symbol) {
        try {
            // Using public Binance API for klines data
            const response = await fetch(
                `https://fapi.binance.com/fapi/v1/klines?symbol=${symbol}&interval=15m&limit=100`
            );
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const klines = await response.json();
            
            // Transform data
            const marketData = {
                symbol: symbol,
                klines: klines.map(k => ({
                    timestamp: k[0],
                    open: parseFloat(k[1]),
                    high: parseFloat(k[2]),
                    low: parseFloat(k[3]),
                    close: parseFloat(k[4]),
                    volume: parseFloat(k[5]),
                    closeTime: k[6]
                })),
                currentPrice: parseFloat(klines[klines.length - 1][4]),
                timestamp: new Date().toISOString()
            };

            return marketData;

        } catch (error) {
            console.error(`Failed to fetch data for ${symbol}:`, error.message);
            return null;
        }
    }

    generateSignalId(symbol, strategyName) {
        const timestamp = Date.now();
        return `${symbol}_${strategyName.replace(/\s+/g, '_')}_${timestamp}`;
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    getLastScanTime() {
        return this.lastScanTime;
    }
}

module.exports = new TradingSignalScanner();
