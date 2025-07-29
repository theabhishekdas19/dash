// ===== AI SERVICE =====

/**
 * Service class for AI assistance interactions
 */
class AIService {
    constructor() {
        this.baseURL = window.APP_CONSTANTS.API_ENDPOINTS;
        this.isStreaming = false;
        this.currentStream = null;
    }

    /**
     * Stream AI fix suggestions for a security alert
     * @param {Object} alertData - Security alert data
     * @param {Function} onData - Callback for streaming data
     * @param {Function} onComplete - Callback when streaming completes
     * @param {Function} onError - Callback for errors
     * @returns {Promise<void>}
     */
    async streamFixSuggestion(alertData, onData, onComplete, onError) {
        if (this.isStreaming) {
            throw new Error('AI assistance is already in progress');
        }

        if (!alertData || typeof alertData !== 'object') {
            throw new Error('Valid alert data is required');
        }

        this.isStreaming = true;

        try {
            // Validate alert data
            const processedAlert = this._validateAlertData(alertData);

            // Make streaming request
            const response = await AppHelpers.http.post(
                this.baseURL.STREAM_FIX,
                processedAlert,
                { timeout: window.APP_CONSTANTS.GITHUB_CONFIG.API_TIMEOUT }
            );

            if (!response.ok) {
                await this._handleApiError(response);
            }

            // Handle streaming response
            await this._handleStreamingResponse(response, onData, onComplete, onError);

        } catch (error) {
            console.error('AI service error:', error);
            if (onError && typeof onError === 'function') {
                onError(error);
            }
            throw error;
        } finally {
            this.isStreaming = false;
            this.currentStream = null;
        }
    }

    /**
     * Cancel current streaming operation
     */
    cancelStream() {
        if (this.currentStream && this.currentStream.abort) {
            try {
                this.currentStream.abort();
            } catch (error) {
                console.warn('Failed to abort stream:', error);
            }
        }
        this.isStreaming = false;
        this.currentStream = null;
    }

    /**
     * Check if AI service is currently streaming
     * @returns {boolean} True if streaming is in progress
     */
    isStreamingInProgress() {
        return this.isStreaming;
    }

    /**
     * Validate and process alert data for AI analysis
     * @param {Object} alertData - Raw alert data
     * @returns {Object} Processed alert data
     * @private
     */
    _validateAlertData(alertData) {
        const requiredFields = ['vulnerability', 'package', 'severity'];
        const missingFields = requiredFields.filter(field => !alertData[field]);

        if (missingFields.length > 0) {
            throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
        }

        return {
            vulnerability: AppHelpers.escapeHtml(alertData.vulnerability),
            package: AppHelpers.escapeHtml(alertData.package),
            severity: alertData.severity,
            patched_in: alertData.patched_in || 'N/A',
            apply_fix_in: alertData.apply_fix_in || 'Unknown file',
            // Add additional context for AI
            repo_name: alertData.repo_name || 'Unknown repository',
            created_at: new Date().toISOString()
        };
    }

    /**
     * Handle streaming response from AI service
     * @param {Response} response - Fetch response object
     * @param {Function} onData - Data callback
     * @param {Function} onComplete - Complete callback
     * @param {Function} onError - Error callback
     * @private
     */
    async _handleStreamingResponse(response, onData, onComplete, onError) {
        try {
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            this.currentStream = reader;

            let buffer = '';
            let isComplete = false;

            while (!isComplete) {
                const { done, value } = await reader.read();

                if (done) {
                    isComplete = true;
                    break;
                }

                // Decode the chunk
                const chunk = decoder.decode(value, { stream: true });
                buffer += chunk;

                // Call onData callback with accumulated buffer
                if (onData && typeof onData === 'function') {
                    onData(buffer);
                }

                // Check for completion marker
                if (buffer.includes('✅ Done') || buffer.includes('Done')) {
                    isComplete = true;
                }
            }

            // Call completion callback
            if (onComplete && typeof onComplete === 'function') {
                onComplete(buffer);
            }

        } catch (error) {
            console.error('Streaming error:', error);
            if (onError && typeof onError === 'function') {
                onError(error);
            }
            throw error;
        }
    }

    /**
     * Handle AI service API errors
     * @param {Response} response - Fetch response object
     * @private
     */
    async _handleApiError(response) {
        let errorMessage = window.APP_CONSTANTS.ERROR_MESSAGES.AI_SERVICE_ERROR;

        try {
            const errorData = await response.json();
            if (errorData.error) {
                errorMessage = errorData.error;
            }
        } catch (parseError) {
            // Use default error message if response is not JSON
        }

        // Map specific HTTP status codes to user-friendly messages
        switch (response.status) {
            case 401:
                errorMessage = window.APP_CONSTANTS.ERROR_MESSAGES.UNAUTHORIZED;
                break;
            case 429:
                errorMessage = window.APP_CONSTANTS.ERROR_MESSAGES.RATE_LIMITED;
                break;
            case 503:
                errorMessage = 'AI service is temporarily unavailable. Please try again later.';
                break;
            case 500:
                errorMessage = 'AI service encountered an internal error. Please try again.';
                break;
        }

        const error = new Error(errorMessage);
        error.status = response.status;
        error.statusText = response.statusText;
        
        throw error;
    }

    /**
     * Format AI response for display
     * @param {string} rawResponse - Raw AI response
     * @returns {string} Formatted response
     */
    formatResponse(rawResponse) {
        if (!rawResponse || typeof rawResponse !== 'string') {
            return '';
        }

        // Remove any potential HTML tags for security
        let formatted = AppHelpers.escapeHtml(rawResponse);

        // Add basic formatting for better readability
        formatted = formatted
            .replace(/\n\n/g, '\n\n')  // Preserve double line breaks
            .replace(/^(\d+\))/gm, '\n$1')  // Add line breaks before numbered lists
            .replace(/^(-\s)/gm, '\n$1')  // Add line breaks before bullet points
            .trim();

        return formatted;
    }

    /**
     * Get AI assistance summary for alert
     * @param {Object} alertData - Alert data
     * @returns {Object} AI assistance summary
     */
    getAssistanceSummary(alertData) {
        if (!alertData) {
            return {
                canAssist: false,
                reason: 'No alert data provided'
            };
        }

        const summary = {
            canAssist: true,
            severity: alertData.severity,
            hasFixAvailable: alertData.patched_in !== 'N/A',
            estimatedComplexity: this._estimateFixComplexity(alertData),
            recommendations: this._generateQuickRecommendations(alertData)
        };

        return summary;
    }

    /**
     * Estimate fix complexity based on alert data
     * @param {Object} alertData - Alert data
     * @returns {string} Complexity level (low, medium, high)
     * @private
     */
    _estimateFixComplexity(alertData) {
        if (!alertData.severity) return 'medium';

        switch (alertData.severity) {
            case window.APP_CONSTANTS.SEVERITY_LEVELS.CRITICAL:
                return 'high';
            case window.APP_CONSTANTS.SEVERITY_LEVELS.HIGH:
                return 'medium';
            case window.APP_CONSTANTS.SEVERITY_LEVELS.MEDIUM:
                return 'medium';
            case window.APP_CONSTANTS.SEVERITY_LEVELS.LOW:
                return 'low';
            default:
                return 'medium';
        }
    }

    /**
     * Generate quick recommendations based on alert data
     * @param {Object} alertData - Alert data
     * @returns {Array} Array of recommendation strings
     * @private
     */
    _generateQuickRecommendations(alertData) {
        const recommendations = [];

        if (alertData.patched_in && alertData.patched_in !== 'N/A') {
            recommendations.push(`Update ${alertData.package} to version ${alertData.patched_in}`);
        }

        if (alertData.severity === window.APP_CONSTANTS.SEVERITY_LEVELS.CRITICAL) {
            recommendations.push('This is a critical vulnerability - prioritize immediate fixing');
        }

        recommendations.push('Review the AI suggestions for detailed fix instructions');
        
        return recommendations;
    }

    /**
     * Cache AI response for future reference
     * @param {string} alertId - Alert identifier
     * @param {string} response - AI response
     */
    cacheResponse(alertId, response) {
        if (!alertId || !response) return;

        try {
            const cache = AppHelpers.storage.get('ai_responses', {});
            cache[alertId] = {
                response: response,
                timestamp: Date.now()
            };
            AppHelpers.storage.set('ai_responses', cache);
        } catch (error) {
            console.warn('Failed to cache AI response:', error);
        }
    }

    /**
     * Get cached AI response
     * @param {string} alertId - Alert identifier
     * @returns {string|null} Cached response or null
     */
    getCachedResponse(alertId) {
        if (!alertId) return null;

        try {
            const cache = AppHelpers.storage.get('ai_responses', {});
            const cached = cache[alertId];
            
            if (cached && cached.response) {
                // Check if cache is still valid (24 hours)
                const isValid = (Date.now() - cached.timestamp) < (24 * 60 * 60 * 1000);
                return isValid ? cached.response : null;
            }
        } catch (error) {
            console.warn('Failed to get cached AI response:', error);
        }

        return null;
    }

    /**
     * Clear cached AI responses
     */
    clearCache() {
        AppHelpers.storage.remove('ai_responses');
    }
}

// Create singleton instance
window.aiService = new AIService();

// Export for module usage
window.AIService = AIService;