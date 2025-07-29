// ===== UTILITY HELPER FUNCTIONS =====

/**
 * Utility class containing common helper functions
 */
class AppHelpers {
    
    /**
     * Safely get an element by ID
     * @param {string} id - Element ID
     * @returns {HTMLElement|null} Element or null if not found
     */
    static getElementById(id) {
        return document.getElementById(id);
    }

    /**
     * Safely query selector
     * @param {string} selector - CSS selector
     * @returns {HTMLElement|null} Element or null if not found
     */
    static querySelector(selector) {
        return document.querySelector(selector);
    }

    /**
     * Add event listener with error handling
     * @param {HTMLElement} element - Target element
     * @param {string} event - Event type
     * @param {Function} handler - Event handler
     */
    static addEventListener(element, event, handler) {
        if (element && typeof handler === 'function') {
            element.addEventListener(event, handler);
        }
    }

    /**
     * Safely set text content
     * @param {HTMLElement} element - Target element
     * @param {string} text - Text to set
     */
    static setTextContent(element, text) {
        if (element) {
            element.textContent = text;
        }
    }

    /**
     * Safely set inner HTML
     * @param {HTMLElement} element - Target element
     * @param {string} html - HTML to set
     */
    static setInnerHTML(element, html) {
        if (element) {
            element.innerHTML = html;
        }
    }

    /**
     * Toggle CSS class on element
     * @param {HTMLElement} element - Target element
     * @param {string} className - CSS class name
     * @param {boolean} force - Force add/remove
     */
    static toggleClass(element, className, force) {
        if (element) {
            if (force !== undefined) {
                element.classList.toggle(className, force);
            } else {
                element.classList.toggle(className);
            }
        }
    }

    /**
     * Add CSS class to element
     * @param {HTMLElement} element - Target element
     * @param {string} className - CSS class name
     */
    static addClass(element, className) {
        if (element) {
            element.classList.add(className);
        }
    }

    /**
     * Remove CSS class from element
     * @param {HTMLElement} element - Target element
     * @param {string} className - CSS class name
     */
    static removeClass(element, className) {
        if (element) {
            element.classList.remove(className);
        }
    }

    /**
     * Check if element has CSS class
     * @param {HTMLElement} element - Target element
     * @param {string} className - CSS class name
     * @returns {boolean} True if element has class
     */
    static hasClass(element, className) {
        return element ? element.classList.contains(className) : false;
    }

    /**
     * Debounce function calls
     * @param {Function} func - Function to debounce
     * @param {number} wait - Wait time in milliseconds
     * @returns {Function} Debounced function
     */
    static debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    /**
     * Throttle function calls
     * @param {Function} func - Function to throttle
     * @param {number} limit - Limit in milliseconds
     * @returns {Function} Throttled function
     */
    static throttle(func, limit) {
        let inThrottle;
        return function(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }

    /**
     * Escape HTML to prevent XSS
     * @param {string} unsafe - Unsafe HTML string
     * @returns {string} Escaped HTML string
     */
    static escapeHtml(unsafe) {
        if (typeof unsafe !== 'string') return '';
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    /**
     * Format date to readable string
     * @param {Date|string} date - Date to format
     * @returns {string} Formatted date string
     */
    static formatDate(date) {
        try {
            const dateObj = new Date(date);
            return dateObj.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });
        } catch (error) {
            return 'Invalid date';
        }
    }

    /**
     * Truncate text to specified length
     * @param {string} text - Text to truncate
     * @param {number} maxLength - Maximum length
     * @returns {string} Truncated text
     */
    static truncateText(text, maxLength) {
        if (typeof text !== 'string') return '';
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    }

    /**
     * Validate GitHub organization name
     * @param {string} orgName - Organization name to validate
     * @returns {boolean} True if valid
     */
    static isValidGitHubOrg(orgName) {
        if (!orgName || typeof orgName !== 'string') return false;
        return window.APP_CONSTANTS.REGEX_PATTERNS.GITHUB_ORG.test(orgName);
    }

    /**
     * Get severity color
     * @param {string} severity - Severity level
     * @returns {string} Color hex code
     */
    static getSeverityColor(severity) {
        return window.APP_CONSTANTS.SEVERITY_COLORS[severity] || '#d0d7de';
    }

    /**
     * Get highest severity from counts
     * @param {Object} counts - Severity counts object
     * @returns {string} Highest severity level
     */
    static getHighestSeverity(counts) {
        if (!counts || typeof counts !== 'object') return 'low';
        
        const severityOrder = window.APP_CONSTANTS.SEVERITY_ORDER;
        let highest = 'low';
        let highestValue = 0;

        for (const [severity, count] of Object.entries(counts)) {
            if (count > 0 && severityOrder[severity] > highestValue) {
                highest = severity;
                highestValue = severityOrder[severity];
            }
        }

        return highest;
    }

    /**
     * Sort repositories by severity
     * @param {Array} repos - Array of repository objects
     * @returns {Array} Sorted repositories
     */
    static sortReposBySeverity(repos) {
        if (!Array.isArray(repos)) return [];
        
        const severityOrder = window.APP_CONSTANTS.SEVERITY_ORDER;
        return repos.sort((a, b) => {
            const severityA = severityOrder[a.severity] || 0;
            const severityB = severityOrder[b.severity] || 0;
            return severityB - severityA; // Descending order (critical first)
        });
    }

    /**
     * Create loading spinner element
     * @returns {HTMLElement} Spinner element
     */
    static createSpinner() {
        const spinner = document.createElement('div');
        spinner.className = 'spinner';
        return spinner;
    }

    /**
     * Create severity dot element
     * @param {string} severity - Severity level
     * @returns {HTMLElement} Severity dot element
     */
    static createSeverityDot(severity) {
        const dot = document.createElement('span');
        dot.className = `${window.APP_CONSTANTS.CSS_CLASSES.SEVERITY_DOT} ${severity}`;
        return dot;
    }

    /**
     * Local storage helpers
     */
    static storage = {
        /**
         * Set item in local storage
         * @param {string} key - Storage key
         * @param {*} value - Value to store
         */
        set(key, value) {
            try {
                localStorage.setItem(key, JSON.stringify(value));
            } catch (error) {
                console.warn('Failed to save to localStorage:', error);
            }
        },

        /**
         * Get item from local storage
         * @param {string} key - Storage key
         * @param {*} defaultValue - Default value if not found
         * @returns {*} Stored value or default
         */
        get(key, defaultValue = null) {
            try {
                const item = localStorage.getItem(key);
                return item ? JSON.parse(item) : defaultValue;
            } catch (error) {
                console.warn('Failed to read from localStorage:', error);
                return defaultValue;
            }
        },

        /**
         * Remove item from local storage
         * @param {string} key - Storage key
         */
        remove(key) {
            try {
                localStorage.removeItem(key);
            } catch (error) {
                console.warn('Failed to remove from localStorage:', error);
            }
        }
    };

    /**
     * HTTP request helpers
     */
    static http = {
        /**
         * Make GET request
         * @param {string} url - Request URL
         * @param {Object} options - Request options
         * @returns {Promise} Fetch promise
         */
        async get(url, options = {}) {
            return fetch(url, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers
                },
                ...options
            });
        },

        /**
         * Make POST request
         * @param {string} url - Request URL
         * @param {*} data - Request data
         * @param {Object} options - Request options
         * @returns {Promise} Fetch promise
         */
        async post(url, data, options = {}) {
            return fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers
                },
                body: JSON.stringify(data),
                ...options
            });
        }
    };

    /**
     * Error handling helper
     * @param {Error} error - Error object
     * @returns {string} User-friendly error message
     */
    static getErrorMessage(error) {
        if (!error) return window.APP_CONSTANTS.ERROR_MESSAGES.NETWORK_ERROR;

        if (error.name === 'TypeError' || error.message.includes('Failed to fetch')) {
            return window.APP_CONSTANTS.ERROR_MESSAGES.NETWORK_ERROR;
        }

        if (error.status === 401) {
            return window.APP_CONSTANTS.ERROR_MESSAGES.UNAUTHORIZED;
        }

        if (error.status === 429) {
            return window.APP_CONSTANTS.ERROR_MESSAGES.RATE_LIMITED;
        }

        return error.message || window.APP_CONSTANTS.ERROR_MESSAGES.NETWORK_ERROR;
    }

    /**
     * Generate unique ID
     * @returns {string} Unique ID
     */
    static generateId() {
        return `id_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
}

// Make helpers available globally
window.AppHelpers = AppHelpers;