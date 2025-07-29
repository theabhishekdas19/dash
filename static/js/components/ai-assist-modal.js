// ===== AI ASSIST MODAL COMPONENT =====

/**
 * AI Assist Modal component for displaying AI assistance
 */
class AIAssistModalComponent {
    constructor() {
        this.modal = null;
        this.modalContent = null;
        this.isVisible = false;
        this.currentAlert = null;
        this.isStreaming = false;
        
        this.init();
    }

    /**
     * Initialize the AI assist modal component
     */
    init() {
        this.modal = AppHelpers.getElementById(window.APP_CONSTANTS.ELEMENT_IDS.ASSIST_BG);
        this.modalContent = AppHelpers.getElementById(window.APP_CONSTANTS.ELEMENT_IDS.ASSIST_CONTENT);
        
        if (!this.modal || !this.modalContent) {
            console.error('AI assist modal elements not found');
            return;
        }

        this.bindEvents();
    }

    /**
     * Bind event listeners for the modal
     */
    bindEvents() {
        // Close modal when clicking background
        AppHelpers.addEventListener(this.modal, 'click', (event) => {
            if (event.target === this.modal) {
                this.closeModal();
            }
        });

        // Close modal on Escape key
        AppHelpers.addEventListener(document, 'keydown', (event) => {
            if (event.key === 'Escape' && this.isVisible) {
                this.closeModal();
            }
        });

        // Create Pull Request button
        const createPRBtn = this.modal.querySelector('.btn-success');
        AppHelpers.addEventListener(createPRBtn, 'click', () => {
            this.handleCreatePullRequest();
        });

        // Close button in footer
        const closeBtn = this.modal.querySelector('.btn-secondary');
        AppHelpers.addEventListener(closeBtn, 'click', () => {
            this.closeModal();
        });

        // Modal close button (X)
        const modalCloseBtn = this.modal.querySelector('.modal-close');
        AppHelpers.addEventListener(modalCloseBtn, 'click', () => {
            this.closeModal();
        });
    }

    /**
     * Show AI assist modal for a specific alert
     * @param {Object} alert - Alert object
     */
    async showModal(alert) {
        if (!alert || typeof alert !== 'object') {
            console.error('Invalid alert data for AI assist');
            return;
        }

        this.currentAlert = alert;
        this.isVisible = true;
        this.isStreaming = true;

        // Show modal with loading state
        this.showLoadingState();
        AppHelpers.removeClass(this.modal, window.APP_CONSTANTS.CSS_CLASSES.HIDDEN);
        AppHelpers.addClass(this.modal, window.APP_CONSTANTS.CSS_CLASSES.SHOW);

        // Add modal open class to body to prevent scrolling
        document.body.classList.add('modal-open');

        try {
            // Start AI assistance streaming
            await this.streamAIResponse(alert);
        } catch (error) {
            console.error('AI assist failed:', error);
            this.showError(error.message);
        }
    }

    /**
     * Close the AI assist modal
     */
    closeModal() {
        if (!this.isVisible) return;

        // Cancel any ongoing streaming
        if (this.isStreaming) {
            window.aiService.cancelStream();
            this.isStreaming = false;
        }

        this.isVisible = false;
        this.currentAlert = null;

        // Hide modal
        AppHelpers.removeClass(this.modal, window.APP_CONSTANTS.CSS_CLASSES.SHOW);
        AppHelpers.addClass(this.modal, window.APP_CONSTANTS.CSS_CLASSES.HIDDEN);

        // Remove modal open class from body
        document.body.classList.remove('modal-open');

        // Clear content after animation
        setTimeout(() => {
            if (this.modalContent) {
                this.modalContent.innerHTML = '';
                AppHelpers.removeClass(this.modalContent, 'loading', 'error');
            }
        }, 300);
    }

    /**
     * Stream AI response for the alert
     * @param {Object} alert - Alert object
     */
    async streamAIResponse(alert) {
        try {
            await window.aiService.streamFixSuggestion(
                alert,
                (data) => this.updateStreamingContent(data),
                (finalData) => this.handleStreamingComplete(finalData),
                (error) => this.handleStreamingError(error)
            );
        } catch (error) {
            this.handleStreamingError(error);
        }
    }

    /**
     * Update streaming content in real-time
     * @param {string} data - Streaming data
     */
    updateStreamingContent(data) {
        if (!this.modalContent || !this.isVisible) return;

        // Remove loading state
        AppHelpers.removeClass(this.modalContent, 'loading');

        // Format and display the streaming content
        const formattedData = window.aiService.formatResponse(data);
        this.modalContent.textContent = formattedData;

        // Auto-scroll to bottom
        this.modalContent.scrollTop = this.modalContent.scrollHeight;
    }

    /**
     * Handle streaming completion
     * @param {string} finalData - Final AI response
     */
    handleStreamingComplete(finalData) {
        this.isStreaming = false;

        if (!this.modalContent || !this.isVisible) return;

        // Display final formatted response
        const formattedResponse = window.aiService.formatResponse(finalData);
        this.modalContent.textContent = formattedResponse;

        // Enable Create PR button
        const createPRBtn = this.modal.querySelector('.btn-success');
        if (createPRBtn) {
            createPRBtn.disabled = false;
        }

        // Cache the response
        if (this.currentAlert && this.currentAlert.id) {
            window.aiService.cacheResponse(this.currentAlert.id, finalData);
        }

        // Show completion notification
        if (this.onNotification && typeof this.onNotification === 'function') {
            this.onNotification(
                window.APP_CONSTANTS.SUCCESS_MESSAGES.AI_RESPONSE_COMPLETE,
                window.APP_CONSTANTS.NOTIFICATION_TYPES.SUCCESS
            );
        }
    }

    /**
     * Handle streaming errors
     * @param {Error} error - Error object
     */
    handleStreamingError(error) {
        this.isStreaming = false;

        console.error('AI streaming error:', error);
        this.showError(error.message || 'Failed to get AI assistance');

        // Show error notification
        if (this.onNotification && typeof this.onNotification === 'function') {
            this.onNotification(
                error.message || window.APP_CONSTANTS.ERROR_MESSAGES.AI_SERVICE_ERROR,
                window.APP_CONSTANTS.NOTIFICATION_TYPES.ERROR
            );
        }
    }

    /**
     * Show loading state in modal
     */
    showLoadingState() {
        if (!this.modalContent) return;

        AppHelpers.addClass(this.modalContent, 'loading');
        this.modalContent.innerHTML = `
            <div class="loading-indicator">
                <div class="loading-dots">
                    <div class="loading-dot"></div>
                    <div class="loading-dot"></div>
                    <div class="loading-dot"></div>
                </div>
                <span>🤖 Analyzing vulnerability and generating fix suggestions...</span>
            </div>
        `;

        // Disable Create PR button during loading
        const createPRBtn = this.modal.querySelector('.btn-success');
        if (createPRBtn) {
            createPRBtn.disabled = true;
        }
    }

    /**
     * Show error state in modal
     * @param {string} errorMessage - Error message to display
     */
    showError(errorMessage) {
        if (!this.modalContent) return;

        AppHelpers.removeClass(this.modalContent, 'loading');
        AppHelpers.addClass(this.modalContent, 'error');

        this.modalContent.innerHTML = `
            <div class="error-state">
                <div class="error-icon">⚠️</div>
                <div class="error-message">${AppHelpers.escapeHtml(errorMessage)}</div>
                <div class="error-details">
                    Please try again or check your connection and API credentials.
                </div>
                <button class="btn btn-primary retry-btn" style="margin-top: 1rem;">
                    Try Again
                </button>
            </div>
        `;

        // Bind retry button
        const retryBtn = this.modalContent.querySelector('.retry-btn');
        AppHelpers.addEventListener(retryBtn, 'click', () => {
            if (this.currentAlert) {
                this.showModal(this.currentAlert);
            }
        });
    }

    /**
     * Handle Create Pull Request button click
     */
    handleCreatePullRequest() {
        if (!this.currentAlert) {
            console.error('No current alert for PR creation');
            return;
        }

        // Get the AI response content
        const aiResponse = this.modalContent.textContent;

        if (this.onCreatePullRequest && typeof this.onCreatePullRequest === 'function') {
            this.onCreatePullRequest(this.currentAlert, aiResponse);
        } else {
            // Default behavior: show notification that feature is not implemented
            if (this.onNotification && typeof this.onNotification === 'function') {
                this.onNotification(
                    'Pull Request creation feature is not yet implemented',
                    window.APP_CONSTANTS.NOTIFICATION_TYPES.INFO
                );
            }
        }
    }

    /**
     * Check if modal is currently visible
     * @returns {boolean} True if modal is visible
     */
    isModalVisible() {
        return this.isVisible;
    }

    /**
     * Get current alert being assisted
     * @returns {Object|null} Current alert or null
     */
    getCurrentAlert() {
        return this.currentAlert;
    }

    /**
     * Check if AI is currently streaming
     * @returns {boolean} True if streaming is in progress
     */
    isStreamingInProgress() {
        return this.isStreaming;
    }

    /**
     * Get modal content text
     * @returns {string} Modal content text
     */
    getModalContent() {
        return this.modalContent ? this.modalContent.textContent : '';
    }

    /**
     * Set modal content directly (for testing or cached responses)
     * @param {string} content - Content to set
     */
    setModalContent(content) {
        if (this.modalContent) {
            AppHelpers.removeClass(this.modalContent, 'loading', 'error');
            this.modalContent.textContent = content;
        }
    }

    /**
     * Load cached response if available
     * @param {Object} alert - Alert object
     * @returns {boolean} True if cached response was loaded
     */
    loadCachedResponse(alert) {
        if (!alert || !alert.id) return false;

        const cachedResponse = window.aiService.getCachedResponse(alert.id);
        if (cachedResponse) {
            this.setModalContent(cachedResponse);
            
            // Enable Create PR button
            const createPRBtn = this.modal.querySelector('.btn-success');
            if (createPRBtn) {
                createPRBtn.disabled = false;
            }

            return true;
        }

        return false;
    }

    /**
     * Set callback for Create Pull Request action
     * @param {Function} callback - PR creation callback
     */
    onCreatePullRequest(callback) {
        this.onCreatePullRequest = callback;
    }

    /**
     * Set callback for notifications
     * @param {Function} callback - Notification callback
     */
    onNotification(callback) {
        this.onNotification = callback;
    }

    /**
     * Update modal header with alert information
     * @param {Object} alert - Alert object
     */
    updateModalHeader(alert) {
        const modalHeader = this.modal.querySelector('.modal-header h3');
        if (modalHeader && alert) {
            const severityIcon = this.getSeverityIcon(alert.severity);
            modalHeader.innerHTML = `
                ${severityIcon} AI Security Assistant
                <small style="font-weight: normal; opacity: 0.8; margin-left: 0.5rem;">
                    ${AppHelpers.escapeHtml(alert.package || 'Unknown package')}
                </small>
            `;
        }
    }

    /**
     * Get severity icon for modal header
     * @param {string} severity - Severity level
     * @returns {string} Icon emoji
     */
    getSeverityIcon(severity) {
        switch (severity) {
            case window.APP_CONSTANTS.SEVERITY_LEVELS.CRITICAL:
                return '🚨';
            case window.APP_CONSTANTS.SEVERITY_LEVELS.HIGH:
                return '⚠️';
            case window.APP_CONSTANTS.SEVERITY_LEVELS.MEDIUM:
                return '🔶';
            case window.APP_CONSTANTS.SEVERITY_LEVELS.LOW:
                return '🔷';
            default:
                return '🤖';
        }
    }
}

// Make closeModal available globally for HTML onclick handlers
window.closeModal = function() {
    if (window.aiAssistModal) {
        window.aiAssistModal.closeModal();
    }
};

// Export the component
window.AIAssistModalComponent = AIAssistModalComponent;