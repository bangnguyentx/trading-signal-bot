class TradingSignalsApp {
    constructor() {
        this.signals = [];
        this.autoRefresh = true;
        this.currentFilter = 'all';
        this.init();
    }

    init() {
        this.bindEvents();
        this.loadSignals();
        this.startAutoRefresh();
    }

    bindEvents() {
        // Filter buttons
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.setFilter(e.target.dataset.filter);
            });
        });

        // Auto refresh toggle
        document.getElementById('autoRefresh').addEventListener('change', (e) => {
            this.autoRefresh = e.target.checked;
        });

        // Modal close
        document.querySelector('.close').addEventListener('click', () => {
            this.closeModal();
        });

        // Close modal when clicking outside
        window.addEventListener('click', (e) => {
            if (e.target === document.getElementById('signalModal')) {
                this.closeModal();
            }
        });
    }

    setFilter(filter) {
        this.currentFilter = filter;
        
        // Update active button
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.filter === filter);
        });

        this.renderSignals();
    }

    async loadSignals() {
        try {
            document.getElementById('loading').style.display = 'block';
            
            const response = await fetch('/api/signals');
            const data = await response.json();
            
            this.signals = data.signals;
            this.renderSignals();
            this.updateStats();
            this.updateLastUpdate();
            
        } catch (error) {
            console.error('Error loading signals:', error);
            this.showError('Failed to load signals');
        } finally {
            document.getElementById('loading').style.display = 'none';
        }
    }

    renderSignals() {
        const tbody = document.getElementById('signalsBody');
        const filteredSignals = this.filterSignals();
        
        if (filteredSignals.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="10" style="text-align: center; padding: 40px; color: var(--text-light);">
                        <i class="fas fa-search" style="font-size: 2rem; margin-bottom: 10px; display: block;"></i>
                        No signals found for current filter
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = filteredSignals.map(signal => this.renderSignalRow(signal)).join('');
    }

    filterSignals() {
        if (this.currentFilter === 'all') {
            return this.signals;
        }

        const filterMap = {
            'momentum': 'Momentum Master',
            'breakout': 'Breakout Pro', 
            'trend': 'Trend Following',
            'breakout-trading': 'Breakout Trading'
        };

        return this.signals.filter(signal => 
            signal.comboType === filterMap[this.currentFilter]
        );
    }

    renderSignalRow(signal) {
        const confidenceClass = this.getConfidenceClass(signal.confidence);
        const timeAgo = this.getTimeAgo(signal.timestamp);
        const expiresIn = this.getExpiresIn(signal.timestamp, signal.comboType);
        
        return `
            <tr class="signal-row ${signal.isNew ? 'new-signal' : ''}" data-id="${signal.id}">
                <td><strong>${signal.symbol}</strong></td>
                <td><span class="signal-badge badge-${this.getComboClass(signal.comboType)}">${signal.comboType}</span></td>
                <td class="direction-${signal.direction.toLowerCase()}">${signal.direction}</td>
                <td>$${signal.entry.toFixed(4)}</td>
                <td>$${signal.stopLoss.toFixed(4)}</td>
                <td>$${signal.takeProfit.toFixed(4)}</td>
                <td>
                    <div class="confidence-bar">
                        <div class="confidence-fill ${confidenceClass}" style="width: ${signal.confidence}%"></div>
                    </div>
                    ${signal.confidence}%
                </td>
                <td>${timeAgo}</td>
                <td>${expiresIn}</td>
                <td>
                    <button class="action-btn btn-view" onclick="app.viewSignalDetails('${signal.id}')">
                        <i class="fas fa-chart-line"></i> Details
                    </button>
                </td>
            </tr>
        `;
    }

    getComboClass(comboType) {
        const classMap = {
            'Momentum Master': 'momentum',
            'Breakout Pro': 'breakout',
            'Trend Following': 'trend',
            'Breakout Trading': 'breakout-trading'
        };
        return classMap[comboType] || 'momentum';
    }

    getConfidenceClass(confidence) {
        if (confidence >= 80) return 'confidence-high';
        if (confidence >= 60) return 'confidence-medium';
        return 'confidence-low';
    }

    getTimeAgo(timestamp) {
        const now = new Date();
        const signalTime = new Date(timestamp);
        const diffMs = now - signalTime;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        return `${Math.floor(diffHours / 24)}d ago`;
    }

    getExpiresIn(timestamp, comboType) {
        const signalTime = new Date(timestamp);
        const now = new Date();
        let expireMs;

        if (comboType === 'Momentum Master' || comboType === 'Breakout Pro') {
            expireMs = 60 * 60 * 1000; // 1 hour
        } else {
            expireMs = 24 * 60 * 60 * 1000; // 24 hours
        }

        const expiresAt = new Date(signalTime.getTime() + expireMs);
        const timeLeft = expiresAt - now;

        if (timeLeft <= 0) return 'Expired';

        const hoursLeft = Math.floor(timeLeft / 3600000);
        const minutesLeft = Math.floor((timeLeft % 3600000) / 60000);

        if (hoursLeft > 0) return `${hoursLeft}h ${minutesLeft}m`;
        return `${minutesLeft}m`;
    }

    viewSignalDetails(signalId) {
        const signal = this.signals.find(s => s.id === signalId);
        if (!signal) return;

        const modalContent = document.getElementById('modalContent');
        modalContent.innerHTML = this.renderSignalDetails(signal);
        
        document.getElementById('signalModal').style.display = 'block';
    }

    renderSignalDetails(signal) {
        const riskReward = ((signal.takeProfit - signal.entry) / (signal.entry - signal.stopLoss)).toFixed(2);
        
        return `
            <div class="signal-details">
                <div class="detail-header">
                    <h4>${signal.symbol} - ${signal.comboType}</h4>
                    <span class="direction-${signal.direction.toLowerCase()}">${signal.direction}</span>
                </div>
                
                <div class="detail-grid">
                    <div class="detail-item">
                        <label>Entry Price:</label>
                        <span>$${signal.entry.toFixed(4)}</span>
                    </div>
                    <div class="detail-item">
                        <label>Stop Loss:</label>
                        <span>$${signal.stopLoss.toFixed(4)}</span>
                    </div>
                    <div class="detail-item">
                        <label>Take Profit:</label>
                        <span>$${signal.takeProfit.toFixed(4)}</span>
                    </div>
                    <div class="detail-item">
                        <label>Risk/Reward:</label>
                        <span>1:${riskReward}</span>
                    </div>
                    <div class="detail-item">
                        <label>Confidence:</label>
                        <span>${signal.confidence}%</span>
                    </div>
                    <div class="detail-item">
                        <label>Found At:</label>
                        <span>${new Date(signal.timestamp).toLocaleString()}</span>
                    </div>
                </div>

                <div class="strategy-info">
                    <h5>Strategy Logic:</h5>
                    <p>${this.getStrategyDescription(signal.comboType)}</p>
                </div>

                <div class="actions">
                    <button class="action-btn btn-view" onclick="app.copyTrade('${signal.id}')">
                        <i class="fas fa-copy"></i> Copy Trade Details
                    </button>
                </div>
            </div>
        `;
    }

    getStrategyDescription(comboType) {
        const descriptions = {
            'Momentum Master': 'Day trading strategy focusing on momentum signals with VWAP, EMA crossovers, and volume confirmation. Ideal for 15min-2hr trades.',
            'Breakout Pro': 'Breakout trading strategy using Bollinger Bands squeeze, volume spikes, and ATR for targets. Perfect for volatility breakouts.',
            'Trend Following': 'Swing trading strategy following established trends with moving averages and MACD. Targets multi-day moves.',
            'Breakout Trading': 'Classic breakout strategy focusing on range breaks with volume confirmation and Fibonacci extensions.'
        };
        return descriptions[comboType] || 'Advanced trading strategy signal.';
    }

    copyTrade(signalId) {
        const signal = this.signals.find(s => s.id === signalId);
        if (!signal) return;

        const tradeText = `
${signal.symbol} - ${signal.comboType}
Direction: ${signal.direction}
Entry: $${signal.entry}
Stop Loss: $${signal.stopLoss}
Take Profit: $${signal.takeProfit}
Confidence: ${signal.confidence}%
Time: ${new Date(signal.timestamp).toLocaleString()}
        `.trim();

        navigator.clipboard.writeText(tradeText).then(() => {
            this.showNotification('Trade details copied to clipboard!');
        });
    }

    closeModal() {
        document.getElementById('signalModal').style.display = 'none';
    }

    updateStats() {
        document.getElementById('totalSignals').textContent = this.signals.length;
        
        const activeSignals = this.signals.filter(signal => {
            const signalTime = new Date(signal.timestamp);
            const now = new Date();
            let expireMs;

            if (signal.comboType === 'Momentum Master' || signal.comboType === 'Breakout Pro') {
                expireMs = 60 * 60 * 1000;
            } else {
                expireMs = 24 * 60 * 60 * 1000;
            }

            return (now - signalTime) < expireMs;
        }).length;

        document.getElementById('activeSignals').textContent = activeSignals;
    }

    updateLastUpdate() {
        document.getElementById('lastUpdate').textContent = 
            `Last update: ${new Date().toLocaleTimeString()}`;
    }

    startAutoRefresh() {
        setInterval(() => {
            if (this.autoRefresh) {
                this.loadSignals();
            }
        }, 10000); // 10 seconds
    }

    showError(message) {
        // Simple error notification
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: var(--danger);
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            z-index: 1000;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        `;
        errorDiv.textContent = message;
        document.body.appendChild(errorDiv);

        setTimeout(() => {
            document.body.removeChild(errorDiv);
        }, 5000);
    }

    showNotification(message) {
        // Simple success notification
        const notifDiv = document.createElement('div');
        notifDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: var(--success);
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            z-index: 1000;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        `;
        notifDiv.textContent = message;
        document.body.appendChild(notifDiv);

        setTimeout(() => {
            document.body.removeChild(notifDiv);
        }, 3000);
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new TradingSignalsApp();
});

// Add some basic styles for modal content
const additionalStyles = `
.signal-details {
    line-height: 1.6;
}

.detail-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
    padding-bottom: 15px;
    border-bottom: 2px solid var(--border);
}

.detail-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 15px;
    margin-bottom: 20px;
}

.detail-item {
    display: flex;
    justify-content: space-between;
    padding: 10px;
    background: var(--light);
    border-radius: 6px;
}

.detail-item label {
    font-weight: 600;
    color: var(--text-light);
}

.strategy-info {
    background: var(--light);
    padding: 15px;
    border-radius: 8px;
    margin-bottom: 20px;
}

.strategy-info h5 {
    margin-bottom: 10px;
    color: var(--primary);
}

.actions {
    text-align: center;
}
`;

const styleSheet = document.createElement('style');
styleSheet.textContent = additionalStyles;
document.head.appendChild(styleSheet);
