// ===== ALERT CARD COMPONENT =====

/**
 * Alert card component for displaying security alerts
 */
class AlertCardComponent {
    constructor() {
        this.alerts = [];
        this.cardsContainer = null;
        this.init();
    }

    /**
     * Initialize the alert card component
     */
    init() {
        this.cardsContainer = AppHelpers.getElementById(window.APP_CONSTANTS.ELEMENT_IDS.CARDS_CONTAINER);
        if (!this.cardsContainer) {
            console.error('Cards container element not found');
        }
    }

    /**
     * Render multiple alert cards
     * @param {Array} alerts - Array of alert objects
     */
    renderAlerts(alerts) {
        if (!this.cardsContainer) {
            console.error('Cards container not initialized');
            return;
        }

        // Clear existing cards
        this.clearCards();

        if (!Array.isArray(alerts) || alerts.length === 0) {
            this.renderEmptyState();
            return;
        }

        this.alerts = alerts;

        // Create cards for each alert
        alerts.forEach((alert, index) => {
            const card = this.createAlertCard(alert, index);
            this.cardsContainer.appendChild(card);
        });

        // Hide empty state
        this.hideEmptyState();
    }

    /**
     * Create a single alert card element
     * @param {Object} alert - Alert object
     * @param {number} index - Alert index
     * @returns {HTMLElement} Alert card element
     */
    createAlertCard(alert, index) {
        if (!alert || typeof alert !== 'object') {
            console.error('Invalid alert data:', alert);
            return this.createErrorCard('Invalid alert data');
        }

        const card = document.createElement('div');
        card.className = `${window.APP_CONSTANTS.CSS_CLASSES.ALERT_CARD} ${alert.severity}`;
        card.setAttribute('data-alert-index', index);
        card.setAttribute('data-alert-id', alert.id || AppHelpers.generateId());

        // Create card content
        card.innerHTML = this.getCardHTML(alert);

        // Bind event listeners for this card
        this.bindCardEvents(card, alert);

        return card;
    }

    /**
     * Generate HTML content for alert card
     * @param {Object} alert - Alert object
     * @returns {string} HTML content
     */
    getCardHTML(alert) {
        const vulnerability = AppHelpers.escapeHtml(alert.vulnerability || 'Unknown vulnerability');
        const packageName = AppHelpers.escapeHtml(alert.package || 'Unknown package');
        const severity = alert.severity || 'low';
        const patchedIn = AppHelpers.escapeHtml(alert.patched_in || 'N/A');
        const applyFixIn = AppHelpers.escapeHtml(alert.apply_fix_in || 'Unknown file');

        // Truncate long vulnerability titles
        const displayTitle = AppHelpers.truncateText(
            vulnerability, 
            window.APP_CONSTANTS.UI_CONFIG.MAX_VULNERABILITY_TITLE_LENGTH
        );

        return `
            <div class="alert-header">
                <h3 class="alert-title" title="${vulnerability}">
                    ${displayTitle}
                </h3>
                <div class="alert-severity">
                    <span class="badge badge-${severity}">
                        ${severity.toUpperCase()}
                    </span>
                </div>
            </div>
            
            <div class="alert-meta">
                <div class="alert-meta-item">
                    <span class="alert-meta-label">Package:</span>
                    <span class="alert-meta-value">${packageName}</span>
                </div>
                <div class="alert-meta-item">
                    <span class="alert-meta-label">Patched in:</span>
                    <span class="alert-meta-value">${patchedIn}</span>
                </div>
                <div class="alert-meta-item">
                    <span class="alert-meta-label">Apply fix in:</span>
                    <span class="alert-meta-value">${applyFixIn}</span>
                </div>
            </div>

            <div class="alert-actions">
                <button class="alert-btn ai-assist-btn" data-action="ai-assist">
                    <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                        <path d="M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16zM5.78 4.58a.5.5 0 0 1 .04.706L4.36 6.75h3.14a.5.5 0 0 1 0 1H4.36l1.46 1.46a.5.5 0 1 1-.708.708l-2.5-2.5a.5.5 0 0 1 0-.708l2.5-2.5a.5.5 0 0 1 .664-.04z"/>
                    </svg>
                    AI Assist
                </button>
                <button class="alert-btn details-btn" data-action="details">
                    <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                        <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/>
                        <path d="m8.93 6.588-2.29.287-.082.38.45.083c.294.07.352.176.288.469l-.738 3.468c-.194.897.105 1.319.808 1.319.545 0 1.178-.252 1.465-.598l.088-.416c-.2.176-.492.246-.686.246-.275 0-.375-.193-.304-.533L8.93 6.588zM9 4.5a1 1 0 1 1-2 0 1 1 0 0 1 2 0z"/>
                    </svg>
                    Details
                </button>
            </div>
        `;
    }

    /**
     * Bind event listeners for a card
     * @param {HTMLElement} card - Card element
     * @param {Object} alert - Alert object
     */
    bindCardEvents(card, alert) {
        // AI Assist button
        const aiAssistBtn = card.querySelector('.ai-assist-btn');
        AppHelpers.addEventListener(aiAssistBtn, 'click', (event) => {
            event.preventDefault();
            this.handleAIAssistClick(alert, card);
        });

        // Details button
        const detailsBtn = card.querySelector('.details-btn');
        AppHelpers.addEventListener(detailsBtn, 'click', (event) => {
            event.preventDefault();
            this.handleDetailsClick(alert, card);
        });

        // Card hover effects
        AppHelpers.addEventListener(card, 'mouseenter', () => {
            this.handleCardHover(card, true);
        });

        AppHelpers.addEventListener(card, 'mouseleave', () => {
            this.handleCardHover(card, false);
        });
    }

    /**
     * Handle AI Assist button click
     * @param {Object} alert - Alert object
     * @param {HTMLElement} card - Card element
     */
    handleAIAssistClick(alert, card) {
        // Add loading state to the button
        const aiAssistBtn = card.querySelector('.ai-assist-btn');
        this.setButtonLoading(aiAssistBtn, true);

        // Trigger AI assist callback
        if (this.onAIAssistRequested && typeof this.onAIAssistRequested === 'function') {
            this.onAIAssistRequested(alert, (error) => {
                // Reset button state after AI assist completes or fails
                this.setButtonLoading(aiAssistBtn, false);
                
                if (error) {
                    this.showCardError(card, 'Failed to get AI assistance');
                }
            });
        }
    }

    /**
     * Handle Details button click
     * @param {Object} alert - Alert object
     * @param {HTMLElement} card - Card element
     */
    handleDetailsClick(alert, card) {
        // Show detailed information modal or expanded view
        if (this.onDetailsRequested && typeof this.onDetailsRequested === 'function') {
            this.onDetailsRequested(alert);
        } else {
            // Default action: show alert in console for debugging
            console.log('Alert Details:', alert);
        }
    }

    /**
     * Handle card hover effects
     * @param {HTMLElement} card - Card element
     * @param {boolean} isHovering - Whether mouse is hovering
     */
    handleCardHover(card, isHovering) {
        if (isHovering) {
            AppHelpers.addClass(card, 'hover');
        } else {
            AppHelpers.removeClass(card, 'hover');
        }
    }

    /**
     * Set button loading state
     * @param {HTMLElement} button - Button element
     * @param {boolean} loading - Whether button is loading
     */
    setButtonLoading(button, loading) {
        if (!button) return;

        if (loading) {
            button.disabled = true;
            AppHelpers.addClass(button, window.APP_CONSTANTS.CSS_CLASSES.LOADING);
            
            // Store original text and replace with loading indicator
            if (!button.dataset.originalText) {
                button.dataset.originalText = button.textContent;
            }
            button.innerHTML = `
                <div class="spinner"></div>
                Loading...
            `;
        } else {
            button.disabled = false;
            AppHelpers.removeClass(button, window.APP_CONSTANTS.CSS_CLASSES.LOADING);
            
            // Restore original content
            if (button.dataset.originalText) {
                button.innerHTML = button.dataset.originalText;
                delete button.dataset.originalText;
            }
        }
    }

    /**
     * Show error state on card
     * @param {HTMLElement} card - Card element
     * @param {string} message - Error message
     */
    showCardError(card, message) {
        // Add error class to card
        AppHelpers.addClass(card, 'error');
        
        // Show temporary error message
        const errorDiv = document.createElement('div');
        errorDiv.className = 'card-error';
        errorDiv.textContent = message;
        
        card.appendChild(errorDiv);
        
        // Remove error after delay
        setTimeout(() => {
            AppHelpers.removeClass(card, 'error');
            if (errorDiv.parentNode) {
                errorDiv.parentNode.removeChild(errorDiv);
            }
        }, 3000);
    }

    /**
     * Create error card for invalid alert data
     * @param {string} message - Error message
     * @returns {HTMLElement} Error card element
     */
    createErrorCard(message) {
        const card = document.createElement('div');
        card.className = `${window.APP_CONSTANTS.CSS_CLASSES.ALERT_CARD} error`;
        
        card.innerHTML = `
            <div class="alert-header">
                <h3 class="alert-title">⚠️ Error</h3>
            </div>
            <div class="alert-meta">
                <p style="color: #da3633; margin: 0;">${AppHelpers.escapeHtml(message)}</p>
            </div>
        `;
        
        return card;
    }

    /**
     * Clear all alert cards
     */
    clearCards() {
        if (this.cardsContainer) {
            this.cardsContainer.innerHTML = '';
        }
        this.alerts = [];
    }

    /**
     * Render empty state when no alerts are available
     */
    renderEmptyState() {
        const emptyState = AppHelpers.getElementById(window.APP_CONSTANTS.ELEMENT_IDS.EMPTY_STATE);
        if (emptyState) {
            AppHelpers.removeClass(emptyState, window.APP_CONSTANTS.CSS_CLASSES.HIDDEN);
        }
    }

    /**
     * Hide empty state
     */
    hideEmptyState() {
        const emptyState = AppHelpers.getElementById(window.APP_CONSTANTS.ELEMENT_IDS.EMPTY_STATE);
        if (emptyState) {
            AppHelpers.addClass(emptyState, window.APP_CONSTANTS.CSS_CLASSES.HIDDEN);
        }
    }

    /**
     * Get alert by index
     * @param {number} index - Alert index
     * @returns {Object|null} Alert object or null
     */
    getAlert(index) {
        return this.alerts[index] || null;
    }

    /**
     * Get all alerts
     * @returns {Array} Array of alert objects
     */
    getAllAlerts() {
        return this.alerts;
    }

    /**
     * Filter alerts by severity
     * @param {string} severity - Severity level to filter by
     * @returns {Array} Filtered alerts
     */
    filterBySeverity(severity) {
        return this.alerts.filter(alert => alert.severity === severity);
    }

    /**
     * Sort alerts by severity
     * @param {boolean} descending - Whether to sort in descending order
     */
    sortBySeverity(descending = true) {
        const severityOrder = window.APP_CONSTANTS.SEVERITY_ORDER;
        
        this.alerts.sort((a, b) => {
            const severityA = severityOrder[a.severity] || 0;
            const severityB = severityOrder[b.severity] || 0;
            
            return descending ? severityB - severityA : severityA - severityB;
        });

        // Re-render with sorted alerts
        this.renderAlerts(this.alerts);
    }

    /**
     * Set callback for AI assist requests
     * @param {Function} callback - AI assist callback
     */
    onAIAssistRequested(callback) {
        this.onAIAssistRequested = callback;
    }

    /**
     * Set callback for details requests
     * @param {Function} callback - Details callback
     */
    onDetailsRequested(callback) {
        this.onDetailsRequested = callback;
    }

    /**
     * Update card with new alert data
     * @param {number} index - Alert index
     * @param {Object} newAlert - Updated alert object
     */
    updateAlert(index, newAlert) {
        if (index >= 0 && index < this.alerts.length) {
            this.alerts[index] = newAlert;
            
            // Find and update the specific card
            const card = this.cardsContainer.querySelector(`[data-alert-index="${index}"]`);
            if (card) {
                card.innerHTML = this.getCardHTML(newAlert);
                this.bindCardEvents(card, newAlert);
            }
        }
    }

    /**
     * Remove alert card
     * @param {number} index - Alert index
     */
    removeAlert(index) {
        if (index >= 0 && index < this.alerts.length) {
            // Remove from alerts array
            this.alerts.splice(index, 1);
            
            // Remove card from DOM
            const card = this.cardsContainer.querySelector(`[data-alert-index="${index}"]`);
            if (card) {
                card.remove();
            }
            
            // Update remaining card indices
            this.updateCardIndices();
            
            // Show empty state if no alerts remain
            if (this.alerts.length === 0) {
                this.renderEmptyState();
            }
        }
    }

    /**
     * Update card indices after removal
     * @private
     */
    updateCardIndices() {
        const cards = this.cardsContainer.querySelectorAll(`.${window.APP_CONSTANTS.CSS_CLASSES.ALERT_CARD}`);
        cards.forEach((card, index) => {
            card.setAttribute('data-alert-index', index);
        });
    }
}

// Export the component
window.AlertCardComponent = AlertCardComponent;