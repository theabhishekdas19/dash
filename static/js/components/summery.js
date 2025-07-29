// ===== SUMMARY COMPONENT =====

/**
 * Summary component for displaying security statistics
 */
class SummaryComponent {
    constructor() {
        this.currentSummary = window.APP_CONSTANTS.DEFAULTS.SUMMARY;
        this.animationDuration = 300;
        this.countAnimations = new Map();
        
        this.init();
    }

    /**
     * Initialize the summary component
     */
    init() {
        this.elements = {
            totalCount: AppHelpers.getElementById(window.APP_CONSTANTS.ELEMENT_IDS.TOTAL_COUNT),
            criticalCount: AppHelpers.getElementById(window.APP_CONSTANTS.ELEMENT_IDS.CRITICAL_COUNT),
            highCount: AppHelpers.getElementById(window.APP_CONSTANTS.ELEMENT_IDS.HIGH_COUNT),
            mediumCount: AppHelpers.getElementById(window.APP_CONSTANTS.ELEMENT_IDS.MEDIUM_COUNT),
            lowCount: AppHelpers.getElementById(window.APP_CONSTANTS.ELEMENT_IDS.LOW_COUNT)
        };

        // Check if all elements exist
        const missingElements = Object.entries(this.elements)
            .filter(([key, element]) => !element)
            .map(([key]) => key);

        if (missingElements.length > 0) {
            console.error('Summary elements not found:', missingElements);
        }

        this.renderSummary(this.currentSummary);
    }

    /**
     * Update and render summary statistics
     * @param {Object} summary - Summary statistics object
     * @param {boolean} animate - Whether to animate the changes
     */
    renderSummary(summary, animate = false) {
        if (!summary || typeof summary !== 'object') {
            summary = window.APP_CONSTANTS.DEFAULTS.SUMMARY;
        }

        // Validate and set defaults for summary data
        const validatedSummary = {
            repos_found: this.validateCount(summary.repos_found),
            critical: this.validateCount(summary.critical),
            high: this.validateCount(summary.high),
            medium: this.validateCount(summary.medium),
            low: this.validateCount(summary.low)
        };

        // Update counts with optional animation
        if (animate) {
            this.animateCounterChanges(validatedSummary);
        } else {
            this.updateCountsDirectly(validatedSummary);
        }

        // Update severity indicators
        this.updateSeverityIndicators(validatedSummary);

        // Store current summary
        this.currentSummary = validatedSummary;

        // Trigger summary update callback
        if (this.onSummaryUpdated && typeof this.onSummaryUpdated === 'function') {
            this.onSummaryUpdated(validatedSummary);
        }
    }

    /**
     * Validate count value
     * @param {*} count - Count value to validate
     * @returns {number} Valid count (0 if invalid)
     */
    validateCount(count) {
        const parsedCount = parseInt(count, 10);
        return isNaN(parsedCount) || parsedCount < 0 ? 0 : parsedCount;
    }

    /**
     * Update counts directly without animation
     * @param {Object} summary - Summary statistics
     */
    updateCountsDirectly(summary) {
        this.setElementText(this.elements.totalCount, summary.repos_found);
        this.setElementText(this.elements.criticalCount, summary.critical);
        this.setElementText(this.elements.highCount, summary.high);
        this.setElementText(this.elements.mediumCount, summary.medium);
        this.setElementText(this.elements.lowCount, summary.low);
    }

    /**
     * Animate counter changes
     * @param {Object} newSummary - New summary statistics
     */
    animateCounterChanges(newSummary) {
        const updates = [
            { element: this.elements.totalCount, from: this.currentSummary.repos_found, to: newSummary.repos_found },
            { element: this.elements.criticalCount, from: this.currentSummary.critical, to: newSummary.critical },
            { element: this.elements.highCount, from: this.currentSummary.high, to: newSummary.high },
            { element: this.elements.mediumCount, from: this.currentSummary.medium, to: newSummary.medium },
            { element: this.elements.lowCount, from: this.currentSummary.low, to: newSummary.low }
        ];

        updates.forEach(update => {
            if (update.element && update.from !== update.to) {
                this.animateCounter(update.element, update.from, update.to);
            }
        });
    }

    /**
     * Animate a single counter
     * @param {HTMLElement} element - Element to animate
     * @param {number} from - Starting value
     * @param {number} to - Ending value
     */
    animateCounter(element, from, to) {
        if (!element) return;

        // Cancel any existing animation for this element
        const existingAnimation = this.countAnimations.get(element);
        if (existingAnimation) {
            clearInterval(existingAnimation);
        }

        const difference = to - from;
        const steps = Math.min(Math.abs(difference), 20); // Max 20 steps
        const stepValue = difference / steps;
        const stepDuration = this.animationDuration / steps;

        let currentValue = from;
        let stepCount = 0;

        const interval = setInterval(() => {
            stepCount++;
            
            if (stepCount >= steps) {
                currentValue = to;
                clearInterval(interval);
                this.countAnimations.delete(element);
            } else {
                currentValue += stepValue;
            }

            this.setElementText(element, Math.round(currentValue));
        }, stepDuration);

        this.countAnimations.set(element, interval);
    }

    /**
     * Safely set element text content
     * @param {HTMLElement} element - Target element
     * @param {number} value - Value to set
     */
    setElementText(element, value) {
        if (element) {
            element.textContent = value.toString();
        }
    }

    /**
     * Update severity indicators (badges) visual state
     * @param {Object} summary - Summary statistics
     */
    updateSeverityIndicators(summary) {
        // Update critical indicator
        this.updateSeverityBadge('critical', summary.critical);
        
        // Update high indicator
        this.updateSeverityBadge('high', summary.high);
        
        // Update medium indicator
        this.updateSeverityBadge('medium', summary.medium);
        
        // Update low indicator
        this.updateSeverityBadge('low', summary.low);

        // Update overall status
        this.updateOverallStatus(summary);
    }

    /**
     * Update individual severity badge appearance
     * @param {string} severity - Severity level
     * @param {number} count - Count for this severity
     */
    updateSeverityBadge(severity, count) {
        const badge = AppHelpers.querySelector(`.badge-${severity}`);
        if (!badge) return;

        // Add or remove active class based on count
        AppHelpers.toggleClass(badge, 'has-alerts', count > 0);
        
        // Add pulse animation for high counts
        if (count > 0) {
            AppHelpers.addClass(badge, 'has-alerts');
            
            if (severity === 'critical' && count > 0) {
                AppHelpers.addClass(badge, 'pulse-critical');
                setTimeout(() => AppHelpers.removeClass(badge, 'pulse-critical'), 1000);
            }
        } else {
            AppHelpers.removeClass(badge, 'has-alerts');
        }
    }

    /**
     * Update overall security status indicator
     * @param {Object} summary - Summary statistics
     */
    updateOverallStatus(summary) {
        const totalAlerts = summary.critical + summary.high + summary.medium + summary.low;
        let statusClass = 'status-safe';
        let statusText = 'All Clear';

        if (summary.critical > 0) {
            statusClass = 'status-critical';
            statusText = 'Critical Issues';
        } else if (summary.high > 0) {
            statusClass = 'status-warning';
            statusText = 'High Priority Issues';
        } else if (summary.medium > 0 || summary.low > 0) {
            statusClass = 'status-info';
            statusText = 'Minor Issues';
        }

        // Find status indicator element (if it exists)
        const statusElement = AppHelpers.querySelector('.security-status');
        if (statusElement) {
            statusElement.className = `security-status ${statusClass}`;
            AppHelpers.setTextContent(statusElement, statusText);
        }
    }

    /**
     * Get current summary data
     * @returns {Object} Current summary statistics
     */
    getCurrentSummary() {
        return { ...this.currentSummary };
    }

    /**
     * Get total alert count
     * @returns {number} Total number of alerts
     */
    getTotalAlerts() {
        return this.currentSummary.critical + 
               this.currentSummary.high + 
               this.currentSummary.medium + 
               this.currentSummary.low;
    }

    /**
     * Get most severe level with alerts
     * @returns {string} Most severe level or 'safe' if no alerts
     */
    getMostSevereLevel() {
        if (this.currentSummary.critical > 0) return 'critical';
        if (this.currentSummary.high > 0) return 'high';
        if (this.currentSummary.medium > 0) return 'medium';
        if (this.currentSummary.low > 0) return 'low';
        return 'safe';
    }

    /**
     * Check if there are any alerts
     * @returns {boolean} True if there are any alerts
     */
    hasAlerts() {
        return this.getTotalAlerts() > 0;
    }

    /**
     * Check if there are critical alerts
     * @returns {boolean} True if there are critical alerts
     */
    hasCriticalAlerts() {
        return this.currentSummary.critical > 0;
    }

    /**
     * Get alert distribution as percentages
     * @returns {Object} Distribution percentages
     */
    getAlertDistribution() {
        const total = this.getTotalAlerts();
        
        if (total === 0) {
            return { critical: 0, high: 0, medium: 0, low: 0 };
        }

        return {
            critical: Math.round((this.currentSummary.critical / total) * 100),
            high: Math.round((this.currentSummary.high / total) * 100),
            medium: Math.round((this.currentSummary.medium / total) * 100),
            low: Math.round((this.currentSummary.low / total) * 100)
        };
    }

    /**
     * Reset summary to default values
     * @param {boolean} animate - Whether to animate the reset
     */
    reset(animate = false) {
        this.renderSummary(window.APP_CONSTANTS.DEFAULTS.SUMMARY, animate);
    }

    /**
     * Add to current summary counts
     * @param {Object} additionalCounts - Additional counts to add
     * @param {boolean} animate - Whether to animate the changes
     */
    addCounts(additionalCounts, animate = true) {
        if (!additionalCounts || typeof additionalCounts !== 'object') {
            return;
        }

        const newSummary = {
            repos_found: this.currentSummary.repos_found + (additionalCounts.repos_found || 0),
            critical: this.currentSummary.critical + (additionalCounts.critical || 0),
            high: this.currentSummary.high + (additionalCounts.high || 0),
            medium: this.currentSummary.medium + (additionalCounts.medium || 0),
            low: this.currentSummary.low + (additionalCounts.low || 0)
        };

        this.renderSummary(newSummary, animate);
    }

    /**
     * Set callback for summary updates
     * @param {Function} callback - Callback function
     */
    onSummaryUpdated(callback) {
        this.onSummaryUpdated = callback;
    }

    /**
     * Export summary data for reporting
     * @returns {Object} Summary data with metadata
     */
    exportSummaryData() {
        return {
            summary: this.getCurrentSummary(),
            totalAlerts: this.getTotalAlerts(),
            mostSevereLevel: this.getMostSevereLevel(),
            distribution: this.getAlertDistribution(),
            timestamp: new Date().toISOString(),
            hasAlerts: this.hasAlerts(),
            hasCriticalAlerts: this.hasCriticalAlerts()
        };
    }

    /**
     * Create summary text description
     * @returns {string} Human-readable summary
     */
    getDescriptiveText() {
        const total = this.getTotalAlerts();
        
        if (total === 0) {
            return `No security alerts found across ${this.currentSummary.repos_found} repositories.`;
        }

        const parts = [];
        if (this.currentSummary.critical > 0) parts.push(`${this.currentSummary.critical} critical`);
        if (this.currentSummary.high > 0) parts.push(`${this.currentSummary.high} high`);
        if (this.currentSummary.medium > 0) parts.push(`${this.currentSummary.medium} medium`);
        if (this.currentSummary.low > 0) parts.push(`${this.currentSummary.low} low`);

        const alertsList = parts.join(', ');
        return `Found ${total} security alert${total === 1 ? '' : 's'} (${alertsList}) across ${this.currentSummary.repos_found} repositories.`;
    }
}

// Export the component
window.SummaryComponent = SummaryComponent;