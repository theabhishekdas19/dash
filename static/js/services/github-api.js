// ===== GITHUB API SERVICE =====

/**
 * Service class for GitHub API interactions
 */
class GitHubApiService {
    constructor() {
        this.baseURL = window.APP_CONSTANTS.API_ENDPOINTS;
        this.isLoading = false;
    }

    /**
     * Search repositories in an organization
     * @param {string} organization - GitHub organization name
     * @param {string} query - Search query
     * @returns {Promise<Object>} API response with repos and summary
     */
    async searchRepositories(organization, query) {
        if (this.isLoading) {
            throw new Error('Another request is in progress');
        }

        if (!organization || !query) {
            throw new Error('Organization and query are required');
        }

        if (!AppHelpers.isValidGitHubOrg(organization)) {
            throw new Error(window.APP_CONSTANTS.ERROR_MESSAGES.INVALID_ORGANIZATION);
        }

        this.isLoading = true;

        try {
            const url = `${this.baseURL.SEARCH_REPOS}?org=${encodeURIComponent(organization)}&q=${encodeURIComponent(query)}`;
            
            const response = await AppHelpers.http.get(url, {
                timeout: window.APP_CONSTANTS.GITHUB_CONFIG.API_TIMEOUT
            });

            if (!response.ok) {
                await this._handleApiError(response);
            }

            const data = await response.json();
            
            // Validate response data
            if (!data || typeof data !== 'object') {
                throw new Error('Invalid response format');
            }

            // Ensure repos is an array
            data.repos = Array.isArray(data.repos) ? data.repos : [];
            
            // Ensure summary has default values
            data.summary = {
                repos_found: 0,
                critical: 0,
                high: 0,
                medium: 0,
                low: 0,
                ...data.summary
            };

            // Sort repositories by severity
            data.repos = AppHelpers.sortReposBySeverity(data.repos);

            return data;

        } catch (error) {
            console.error('Failed to search repositories:', error);
            throw new Error(AppHelpers.getErrorMessage(error));
        } finally {
            this.isLoading = false;
        }
    }

    /**
     * Load security alerts for a specific repository
     * @param {string} repositoryFullName - Full repository name (org/repo)
     * @returns {Promise<Array>} Array of security alerts
     */
    async loadSecurityAlerts(repositoryFullName) {
        if (this.isLoading) {
            throw new Error('Another request is in progress');
        }

        if (!repositoryFullName || typeof repositoryFullName !== 'string') {
            throw new Error('Repository full name is required');
        }

        if (!repositoryFullName.includes('/')) {
            throw new Error('Invalid repository name format. Expected: org/repo');
        }

        this.isLoading = true;

        try {
            const response = await AppHelpers.http.post(
                this.baseURL.LOAD_ALERTS,
                { repo: repositoryFullName },
                { timeout: window.APP_CONSTANTS.GITHUB_CONFIG.API_TIMEOUT }
            );

            if (!response.ok) {
                await this._handleApiError(response);
            }

            const alerts = await response.json();
            
            // Validate response is an array
            if (!Array.isArray(alerts)) {
                throw new Error('Invalid alerts response format');
            }

            // Process and validate each alert
            return alerts.map(alert => this._processAlert(alert));

        } catch (error) {
            console.error('Failed to load security alerts:', error);
            throw new Error(AppHelpers.getErrorMessage(error));
        } finally {
            this.isLoading = false;
        }
    }

    /**
     * Get loading state
     * @returns {boolean} True if API request is in progress
     */
    isRequestInProgress() {
        return this.isLoading;
    }

    /**
     * Process and validate a single alert object
     * @param {Object} alert - Raw alert data
     * @returns {Object} Processed alert data
     * @private
     */
    _processAlert(alert) {
        if (!alert || typeof alert !== 'object') {
            throw new Error('Invalid alert data');
        }

        // Set default values for required fields
        const processedAlert = {
            vulnerability: alert.vulnerability || 'Unknown vulnerability',
            package: alert.package || 'Unknown package',
            severity: alert.severity || 'low',
            patched_in: alert.patched_in || 'N/A',
            apply_fix_in: alert.apply_fix_in || 'Unknown file',
            id: AppHelpers.generateId(),
            ...alert
        };

        // Validate severity level
        if (!Object.values(window.APP_CONSTANTS.SEVERITY_LEVELS).includes(processedAlert.severity)) {
            processedAlert.severity = window.APP_CONSTANTS.SEVERITY_LEVELS.LOW;
        }

        // Truncate long text fields
        processedAlert.vulnerability = AppHelpers.truncateText(
            processedAlert.vulnerability,
            window.APP_CONSTANTS.UI_CONFIG.MAX_VULNERABILITY_TITLE_LENGTH
        );

        return processedAlert;
    }

    /**
     * Handle API error responses
     * @param {Response} response - Fetch response object
     * @private
     */
    async _handleApiError(response) {
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;

        try {
            const errorData = await response.json();
            if (errorData.error) {
                errorMessage = errorData.error;
            }
        } catch (parseError) {
            // Use default error message if response is not JSON
        }

        const error = new Error(errorMessage);
        error.status = response.status;
        error.statusText = response.statusText;
        
        throw error;
    }

    /**
     * Get cached repositories (if implementing caching)
     * @returns {Array} Cached repositories or empty array
     */
    getCachedRepositories() {
        return AppHelpers.storage.get('cached_repositories', []);
    }

    /**
     * Cache repositories (if implementing caching)
     * @param {Array} repositories - Repositories to cache
     */
    cacheRepositories(repositories) {
        if (Array.isArray(repositories)) {
            AppHelpers.storage.set('cached_repositories', {
                data: repositories,
                timestamp: Date.now()
            });
        }
    }

    /**
     * Clear cached data
     */
    clearCache() {
        AppHelpers.storage.remove('cached_repositories');
    }

    /**
     * Validate organization and query parameters
     * @param {string} organization - GitHub organization
     * @param {string} query - Search query
     * @returns {Object} Validation result
     */
    validateSearchParams(organization, query) {
        const errors = [];

        if (!organization || typeof organization !== 'string' || organization.trim() === '') {
            errors.push(window.APP_CONSTANTS.ERROR_MESSAGES.INVALID_ORGANIZATION);
        }

        if (!query || typeof query !== 'string' || query.trim() === '') {
            errors.push(window.APP_CONSTANTS.ERROR_MESSAGES.INVALID_FILTER);
        }

        if (organization && !AppHelpers.isValidGitHubOrg(organization.trim())) {
            errors.push('Organization name contains invalid characters');
        }

        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }

    /**
     * Get repository statistics
     * @param {Array} repositories - Array of repository objects
     * @returns {Object} Repository statistics
     */
    getRepositoryStats(repositories) {
        if (!Array.isArray(repositories)) {
            return window.APP_CONSTANTS.DEFAULTS.SUMMARY;
        }

        const stats = {
            repos_found: repositories.length,
            critical: 0,
            high: 0,
            medium: 0,
            low: 0
        };

        repositories.forEach(repo => {
            if (repo.counts && typeof repo.counts === 'object') {
                stats.critical += repo.counts.critical || 0;
                stats.high += repo.counts.high || 0;
                stats.medium += repo.counts.medium || 0;
                stats.low += repo.counts.low || 0;
            }
        });

        return stats;
    }
}

// Create singleton instance
window.gitHubApiService = new GitHubApiService();

// Export for module usage
window.GitHubApiService = GitHubApiService;