// ===== MAIN APPLICATION =====

/**
 * Main application class that orchestrates all components
 */
class DependabotApp {
    constructor() {
        this.components = {};
        this.notifications = [];
        this.isInitialized = false;
        
        // Bind methods to preserve context
        this.handleRepositorySelected = this.handleRepositorySelected.bind(this);
        this.handleLoadAlerts = this.handleLoadAlerts.bind(this);
        this.handleAIAssistRequest = this.handleAIAssistRequest.bind(this);
        this.showNotification = this.showNotification.bind(this);
    }

    /**
     * Initialize the application
     */
    async init() {
        try {
            console.log('Initializing Dependabot Security Dashboard...');
            
            // Wait for DOM to be ready
            if (document.readyState === 'loading') {
                await new Promise(resolve => {
                    document.addEventListener('DOMContentLoaded', resolve);
                });
            }

            // Initialize all components
            this.initializeComponents();
            
            // Set up component communication
            this.setupComponentCommunication();
            
            // Set up global error handling
            this.setupGlobalErrorHandling();
            
            // Load user preferences
            this.loadUserPreferences();
            
            this.isInitialized = true;
            console.log('Dependabot Security Dashboard initialized successfully');
            
            // Show welcome notification
            this.showNotification(
                'Welcome to Dependabot Security Dashboard',
                window.APP_CONSTANTS.NOTIFICATION_TYPES.INFO
            );
            
        } catch (error) {
            console.error('Failed to initialize application:', error);
            this.showNotification(
                'Failed to initialize application: ' + error.message,
                window.APP_CONSTANTS.NOTIFICATION_TYPES.ERROR
            );
        }
    }

    /**
     * Initialize all application components
     */
    initializeComponents() {
        try {
            // Initialize sidebar component
            this.components.sidebar = new SidebarComponent();
            console.log('Sidebar component initialized');

            // Initialize alert cards component
            this.components.alertCards = new AlertCardComponent();
            console.log('Alert cards component initialized');

            // Initialize AI assist modal component
            this.components.aiAssistModal = new AIAssistModalComponent();
            console.log('AI assist modal component initialized');

            // Initialize summary component
            this.components.summary = new SummaryComponent();
            console.log('Summary component initialized');

            // Make AI modal available globally for HTML handlers
            window.aiAssistModal = this.components.aiAssistModal;

        } catch (error) {
            console.error('Error initializing components:', error);
            throw new Error('Component initialization failed: ' + error.message);
        }
    }

    /**
     * Set up communication between components
     */
    setupComponentCommunication() {
        // Sidebar callbacks
        this.components.sidebar.onRepositorySelected = this.handleRepositorySelected;
        this.components.sidebar.onLoadAlerts = this.handleLoadAlerts;
        this.components.sidebar.onShowNotification = this.showNotification;

        // Alert cards callbacks
        this.components.alertCards.onAIAssistRequested = this.handleAIAssistRequest;
        this.components.alertCards.onDetailsRequested = this.handleDetailsRequest.bind(this);

        // AI assist modal callbacks
        this.components.aiAssistModal.onCreatePullRequest = this.handleCreatePullRequest.bind(this);
        this.components.aiAssistModal.onNotification = this.showNotification;

        // Summary component callbacks
        this.components.summary.onSummaryUpdated = this.handleSummaryUpdated.bind(this);
    }

    /**
     * Set up global error handling
     */
    setupGlobalErrorHandling() {
        // Handle unhandled promise rejections
        window.addEventListener('unhandledrejection', (event) => {
            console.error('Unhandled promise rejection:', event.reason);
            this.showNotification(
                'An unexpected error occurred: ' + (event.reason.message || 'Unknown error'),
                window.APP_CONSTANTS.NOTIFICATION_TYPES.ERROR
            );
        });

        // Handle global JavaScript errors
        window.addEventListener('error', (event) => {
            console.error('Global error:', event.error);
            this.showNotification(
                'Application error: ' + (event.error.message || 'Unknown error'),
                window.APP_CONSTANTS.NOTIFICATION_TYPES.ERROR
            );
        });
    }

    /**
     * Handle repository selection
     * @param {Object} repository - Selected repository object
     */
    handleRepositorySelected(repository) {
        console.log('Repository selected:', repository.full_name);
        
        // Clear previous alerts
        this.components.alertCards.clearCards();
        
        // Update UI state
        this.updateLoadButtonState(true);
        
        // Store selected repository
        AppHelpers.storage.set('selected_repository', repository);
    }

    /**
     * Handle loading alerts for selected repository
     * @param {Object} repository - Repository object
     */
    async handleLoadAlerts(repository) {
        if (!repository || !repository.full_name) {
            this.showNotification(
                'Invalid repository selected',
                window.APP_CONSTANTS.NOTIFICATION_TYPES.ERROR
            );
            return;
        }

        console.log('Loading alerts for repository:', repository.full_name);

        // Show loading state
        this.setLoadingState(true);
        this.updateLoadButtonState(false);

        try {
            // Load alerts from API
            const alerts = await window.gitHubApiService.loadSecurityAlerts(repository.full_name);
            
            // Render alert cards
            this.components.alertCards.renderAlerts(alerts);
            
            // Show success notification
            const alertCount = alerts.length;
            this.showNotification(
                `Loaded ${alertCount} security alert${alertCount === 1 ? '' : 's'} for ${repository.full_name}`,
                window.APP_CONSTANTS.NOTIFICATION_TYPES.SUCCESS
            );

            // Update page title
            document.title = `Dependabot Alerts - ${repository.full_name} (${alertCount} alerts)`;

        } catch (error) {
            console.error('Failed to load alerts:', error);
            this.showNotification(
                `Failed to load alerts: ${error.message}`,
                window.APP_CONSTANTS.NOTIFICATION_TYPES.ERROR
            );
            
            // Show empty state
            this.components.alertCards.renderEmptyState();
        } finally {
            this.setLoadingState(false);
            this.updateLoadButtonState(true);
        }
    }

    /**
     * Handle AI assist request for an alert
     * @param {Object} alert - Alert object
     * @param {Function} callback - Completion callback
     */
    async handleAIAssistRequest(alert, callback) {
        if (!alert) {
            console.error('No alert provided for AI assist');
            if (callback) callback(new Error('No alert provided'));
            return;
        }

        console.log('AI assist requested for alert:', alert.vulnerability);

        try {
            // Add repository context to alert
            const selectedRepo = AppHelpers.storage.get('selected_repository');
            if (selectedRepo) {
                alert.repo_name = selectedRepo.full_name;
            }

            // Update modal header with alert info
            this.components.aiAssistModal.updateModalHeader(alert);

            // Check for cached response first
            if (alert.id && this.components.aiAssistModal.loadCachedResponse(alert)) {
                console.log('Loaded cached AI response for alert:', alert.id);
                this.components.aiAssistModal.showModal(alert);
                if (callback) callback(null);
                return;
            }

            // Show AI assist modal and start streaming
            await this.components.aiAssistModal.showModal(alert);
            
            if (callback) callback(null);

        } catch (error) {
            console.error('AI assist failed:', error);
            this.showNotification(
                `AI assistance failed: ${error.message}`,
                window.APP_CONSTANTS.NOTIFICATION_TYPES.ERROR
            );
            
            if (callback) callback(error);
        }
    }

    /**
     * Handle details request for an alert
     * @param {Object} alert - Alert object
     */
    handleDetailsRequest(alert) {
        console.log('Details requested for alert:', alert);
        
        // For now, show detailed information in console
        // In the future, this could open a detailed modal
        this.showNotification(
            `Alert details: ${alert.vulnerability} in ${alert.package}`,
            window.APP_CONSTANTS.NOTIFICATION_TYPES.INFO
        );
    }

    /**
     * Handle create pull request request
     * @param {Object} alert - Alert object
     * @param {string} aiResponse - AI response content
     */
    handleCreatePullRequest(alert, aiResponse) {
        console.log('Create PR requested for alert:', alert);
        
        // Placeholder for PR creation functionality
        this.showNotification(
            'Pull Request creation is not yet implemented. This feature will be available in a future update.',
            window.APP_CONSTANTS.NOTIFICATION_TYPES.INFO
        );
    }

    /**
     * Handle summary updates
     * @param {Object} summary - Updated summary data
     */
    handleSummaryUpdated(summary) {
        console.log('Summary updated:', summary);
        
        // Store summary for persistence
        AppHelpers.storage.set('last_summary', summary);
    }

    /**
     * Show notification to user
     * @param {string} message - Notification message
     * @param {string} type - Notification type
     */
    showNotification(message, type = window.APP_CONSTANTS.NOTIFICATION_TYPES.INFO) {
        const notification = {
            id: AppHelpers.generateId(),
            message: message,
            type: type,
            timestamp: Date.now()
        };

        this.notifications.push(notification);
        this.renderNotification(notification);

        // Auto-remove notification after delay
        setTimeout(() => {
            this.removeNotification(notification.id);
        }, window.APP_CONSTANTS.UI_CONFIG.NOTIFICATION_DURATION);
    }

    /**
     * Render a notification in the UI
     * @param {Object} notification - Notification object
     */
    renderNotification(notification) {
        const container = this.getNotificationContainer();
        
        const notificationElement = document.createElement('div');
        notificationElement.className = `${window.APP_CONSTANTS.CSS_CLASSES.NOTIFICATION} ${notification.type}`;
        notificationElement.setAttribute('data-notification-id', notification.id);
        
        notificationElement.innerHTML = `
            <div class="notification-content">
                <div class="notification-icon">
                    ${this.getNotificationIcon(notification.type)}
                </div>
                <div class="notification-text">
                    ${AppHelpers.escapeHtml(notification.message)}
                </div>
            </div>
        `;

        // Add click to dismiss
        AppHelpers.addEventListener(notificationElement, 'click', () => {
            this.removeNotification(notification.id);
        });

        container.appendChild(notificationElement);

        // Trigger animation
        setTimeout(() => {
            AppHelpers.addClass(notificationElement, window.APP_CONSTANTS.CSS_CLASSES.SHOW);
        }, 10);
    }

    /**
     * Remove notification from UI
     * @param {string} notificationId - Notification ID
     */
    removeNotification(notificationId) {
        const notificationElement = AppHelpers.querySelector(`[data-notification-id="${notificationId}"]`);
        if (notificationElement) {
            AppHelpers.removeClass(notificationElement, window.APP_CONSTANTS.CSS_CLASSES.SHOW);
            
            setTimeout(() => {
                if (notificationElement.parentNode) {
                    notificationElement.parentNode.removeChild(notificationElement);
                }
            }, 300);
        }

        // Remove from notifications array
        this.notifications = this.notifications.filter(n => n.id !== notificationId);
    }

    /**
     * Get notification container, create if doesn't exist
     * @returns {HTMLElement} Notification container element
     */
    getNotificationContainer() {
        let container = AppHelpers.getElementById(window.APP_CONSTANTS.ELEMENT_IDS.NOTIFICATION_CONTAINER);
        
        if (!container) {
            container = document.createElement('div');
            container.id = window.APP_CONSTANTS.ELEMENT_IDS.NOTIFICATION_CONTAINER;
            container.className = 'notification-container';
            document.body.appendChild(container);
        }
        
        return container;
    }

    /**
     * Get notification icon for type
     * @param {string} type - Notification type
     * @returns {string} Icon HTML
     */
    getNotificationIcon(type) {
        const icons = {
            [window.APP_CONSTANTS.NOTIFICATION_TYPES.SUCCESS]: '✅',
            [window.APP_CONSTANTS.NOTIFICATION_TYPES.ERROR]: '❌',
            [window.APP_CONSTANTS.NOTIFICATION_TYPES.WARNING]: '⚠️',
            [window.APP_CONSTANTS.NOTIFICATION_TYPES.INFO]: 'ℹ️'
        };
        
        return icons[type] || 'ℹ️';
    }

    /**
     * Set application loading state
     * @param {boolean} loading - Whether app is loading
     */
    setLoadingState(loading) {
        const loadingOverlay = AppHelpers.getElementById(window.APP_CONSTANTS.ELEMENT_IDS.LOADING_OVERLAY);
        
        if (loadingOverlay) {
            AppHelpers.toggleClass(loadingOverlay, window.APP_CONSTANTS.CSS_CLASSES.HIDDEN, !loading);
        }
    }

    /**
     * Update load button state
     * @param {boolean} enabled - Whether button should be enabled
     */
    updateLoadButtonState(enabled) {
        const loadBtn = AppHelpers.getElementById(window.APP_CONSTANTS.ELEMENT_IDS.LOAD_BTN);
        if (loadBtn) {
            loadBtn.disabled = !enabled;
        }
    }

    /**
     * Load user preferences
     */
    loadUserPreferences() {
        const preferences = AppHelpers.storage.get(window.APP_CONSTANTS.STORAGE_KEYS.USER_PREFERENCES, {});
        
        // Apply preferences (placeholder for future features)
        console.log('Loaded user preferences:', preferences);
    }

    /**
     * Save user preferences
     * @param {Object} preferences - User preferences object
     */
    saveUserPreferences(preferences) {
        AppHelpers.storage.set(window.APP_CONSTANTS.STORAGE_KEYS.USER_PREFERENCES, preferences);
    }

    /**
     * Get application status
     * @returns {Object} Application status information
     */
    getAppStatus() {
        return {
            isInitialized: this.isInitialized,
            componentsLoaded: Object.keys(this.components).length,
            activeNotifications: this.notifications.length,
            selectedRepository: AppHelpers.storage.get('selected_repository'),
            lastSummary: AppHelpers.storage.get('last_summary')
        };
    }

    /**
     * Cleanup application resources
     */
    cleanup() {
        // Cancel any ongoing operations
        if (window.aiService) {
            window.aiService.cancelStream();
        }

        // Clear notifications
        this.notifications.forEach(notification => {
            this.removeNotification(notification.id);
        });

        // Clear components
        Object.values(this.components).forEach(component => {
            if (component.cleanup && typeof component.cleanup === 'function') {
                component.cleanup();
            }
        });

        console.log('Application cleanup completed');
    }
}

// Initialize application when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Create and initialize the main application
        window.dependabotApp = new DependabotApp();
        await window.dependabotApp.init();
        
        console.log('Dependabot Security Dashboard is ready!');
    } catch (error) {
        console.error('Failed to start application:', error);
        
        // Show fallback error message
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = `
            position: fixed; top: 20px; right: 20px; left: 20px;
            background: #ffebee; border: 1px solid #f44336; border-radius: 4px;
            padding: 1rem; color: #c62828; z-index: 9999;
        `;
        errorDiv.innerHTML = `
            <strong>Application Error:</strong> ${AppHelpers.escapeHtml(error.message)}<br>
            <small>Please refresh the page and try again.</small>
        `;
        document.body.appendChild(errorDiv);
    }
});

// Handle page unload
window.addEventListener('beforeunload', () => {
    if (window.dependabotApp) {
        window.dependabotApp.cleanup();
    }
});

// Export for external access
window.DependabotApp = DependabotApp;