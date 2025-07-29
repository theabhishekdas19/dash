// ===== SIDEBAR COMPONENT =====

/**
 * Sidebar component for repository search and selection
 */
class SidebarComponent {
    constructor() {
        this.repositories = [];
        this.selectedRepository = null;
        this.isLoading = false;
        this.notification = null;
        
        // Debounced search function
        this.debouncedSearch = AppHelpers.debounce(
            this.performSearch.bind(this),
            window.APP_CONSTANTS.UI_CONFIG.DEBOUNCE_DELAY
        );

        this.init();
    }

    /**
     * Initialize the sidebar component
     */
    init() {
        this.bindEvents();
        this.loadStoredValues();
        this.renderEmptyState();
    }

    /**
     * Bind event listeners
     */
    bindEvents() {
        const searchBtn = AppHelpers.getElementById(window.APP_CONSTANTS.ELEMENT_IDS.SEARCH_BTN);
        const loadBtn = AppHelpers.getElementById(window.APP_CONSTANTS.ELEMENT_IDS.LOAD_BTN);
        const orgInput = AppHelpers.getElementById(window.APP_CONSTANTS.ELEMENT_IDS.ORG_INPUT);
        const filterInput = AppHelpers.getElementById(window.APP_CONSTANTS.ELEMENT_IDS.FILTER_INPUT);

        // Search button click
        AppHelpers.addEventListener(searchBtn, 'click', this.handleSearchClick.bind(this));

        // Load alerts button click
        AppHelpers.addEventListener(loadBtn, 'click', this.handleLoadAlertsClick.bind(this));

        // Enter key press on inputs
        AppHelpers.addEventListener(orgInput, 'keypress', (event) => {
            if (event.key === 'Enter') {
                this.handleSearchClick();
            }
        });

        AppHelpers.addEventListener(filterInput, 'keypress', (event) => {
            if (event.key === 'Enter') {
                this.handleSearchClick();
            }
        });

        // Input change events for real-time validation
        AppHelpers.addEventListener(orgInput, 'input', this.handleInputChange.bind(this));
        AppHelpers.addEventListener(filterInput, 'input', this.handleInputChange.bind(this));
    }

    /**
     * Handle search button click
     */
    async handleSearchClick() {
        if (this.isLoading) {
            return;
        }

        const orgInput = AppHelpers.getElementById(window.APP_CONSTANTS.ELEMENT_IDS.ORG_INPUT);
        const filterInput = AppHelpers.getElementById(window.APP_CONSTANTS.ELEMENT_IDS.FILTER_INPUT);

        const organization = orgInput.value.trim();
        const query = filterInput.value.trim();

        // Validate inputs
        const validation = window.gitHubApiService.validateSearchParams(organization, query);
        if (!validation.isValid) {
            this.showNotification(validation.errors.join('. '), window.APP_CONSTANTS.NOTIFICATION_TYPES.ERROR);
            return;
        }

        await this.performSearch(organization, query);
    }

    /**
     * Handle load alerts button click
     */
    async handleLoadAlertsClick() {
        if (!this.selectedRepository) {
            this.showNotification('Please select a repository first', window.APP_CONSTANTS.NOTIFICATION_TYPES.WARNING);
            return;
        }

        if (this.onLoadAlerts && typeof this.onLoadAlerts === 'function') {
            await this.onLoadAlerts(this.selectedRepository);
        }
    }

    /**
     * Handle input change events
     */
    handleInputChange() {
        const orgInput = AppHelpers.getElementById(window.APP_CONSTANTS.ELEMENT_IDS.ORG_INPUT);
        const filterInput = AppHelpers.getElementById(window.APP_CONSTANTS.ELEMENT_IDS.FILTER_INPUT);

        // Store values for persistence
        AppHelpers.storage.set(window.APP_CONSTANTS.STORAGE_KEYS.LAST_ORGANIZATION, orgInput.value);
        AppHelpers.storage.set(window.APP_CONSTANTS.STORAGE_KEYS.LAST_FILTER, filterInput.value);
    }

    /**
     * Perform repository search
     * @param {string} organization - GitHub organization name
     * @param {string} query - Search query
     */
    async performSearch(organization, query) {
        this.setLoadingState(true);
        this.clearResults();

        try {
            const data = await window.gitHubApiService.searchRepositories(organization, query);
            
            this.repositories = data.repos || [];
            this.renderRepositoryList(this.repositories);
            this.renderSummary(data.summary);

            if (this.repositories.length === 0) {
                this.showNotification(
                    window.APP_CONSTANTS.ERROR_MESSAGES.NO_REPOSITORIES_FOUND, 
                    window.APP_CONSTANTS.NOTIFICATION_TYPES.INFO
                );
                this.renderEmptyState();
            } else {
                this.showNotification(
                    `Found ${this.repositories.length} repositories`,
                    window.APP_CONSTANTS.NOTIFICATION_TYPES.SUCCESS
                );
            }

        } catch (error) {
            console.error('Search failed:', error);
            this.showNotification(error.message, window.APP_CONSTANTS.NOTIFICATION_TYPES.ERROR);
            this.renderEmptyState();
        } finally {
            this.setLoadingState(false);
        }
    }

    /**
     * Render repository list
     * @param {Array} repositories - Array of repository objects
     */
    renderRepositoryList(repositories) {
        const repoList = AppHelpers.getElementById(window.APP_CONSTANTS.ELEMENT_IDS.REPO_LIST);
        
        if (!repoList) {
            console.error('Repository list element not found');
            return;
        }

        // Clear existing list
        repoList.innerHTML = '';

        if (!Array.isArray(repositories) || repositories.length === 0) {
            repoList.innerHTML = '<li class="repo-item-empty">No repositories found</li>';
            return;
        }

        // Create repository items
        repositories.forEach((repo, index) => {
            const listItem = this.createRepositoryItem(repo, index);
            repoList.appendChild(listItem);
        });
    }

    /**
     * Create a repository list item
     * @param {Object} repo - Repository object
     * @param {number} index - Repository index
     * @returns {HTMLElement} Repository list item element
     */
    createRepositoryItem(repo, index) {
        const li = document.createElement('li');
        li.className = window.APP_CONSTANTS.CSS_CLASSES.REPO_ITEM;
        li.setAttribute('data-repo-index', index);
        li.setAttribute('data-repo-name', repo.full_name);

        // Create severity dot
        const severityDot = AppHelpers.createSeverityDot(repo.severity);

        // Truncate repository name if too long
        const displayName = AppHelpers.truncateText(
            repo.full_name, 
            window.APP_CONSTANTS.UI_CONFIG.MAX_REPO_NAME_LENGTH
        );

        li.innerHTML = `
            <div class="repo-info">
                ${severityDot.outerHTML}
                <span class="repo-name" title="${AppHelpers.escapeHtml(repo.full_name)}">
                    ${AppHelpers.escapeHtml(displayName)}
                </span>
            </div>
            <div class="repo-counts">
                C${repo.counts.critical || 0} 
                H${repo.counts.high || 0} 
                M${repo.counts.medium || 0} 
                L${repo.counts.low || 0}
            </div>
        `;

        // Add click event listener
        AppHelpers.addEventListener(li, 'click', () => {
            this.selectRepository(repo, li);
        });

        return li;
    }

    /**
     * Select a repository
     * @param {Object} repo - Repository object
     * @param {HTMLElement} element - Repository list item element
     */
    selectRepository(repo, element) {
        // Remove previous selection
        const previousSelected = AppHelpers.querySelector(`.${window.APP_CONSTANTS.CSS_CLASSES.REPO_ITEM}.${window.APP_CONSTANTS.CSS_CLASSES.SELECTED}`);
        if (previousSelected) {
            AppHelpers.removeClass(previousSelected, window.APP_CONSTANTS.CSS_CLASSES.SELECTED);
        }

        // Add selection to current item
        AppHelpers.addClass(element, window.APP_CONSTANTS.CSS_CLASSES.SELECTED);

        // Update selected repository
        this.selectedRepository = repo;

        // Enable load alerts button
        const loadBtn = AppHelpers.getElementById(window.APP_CONSTANTS.ELEMENT_IDS.LOAD_BTN);
        if (loadBtn) {
            loadBtn.disabled = false;
        }

        // Trigger selection callback
        if (this.onRepositorySelected && typeof this.onRepositorySelected === 'function') {
            this.onRepositorySelected(repo);
        }
    }

    /**
     * Render summary statistics
     * @param {Object} summary - Summary statistics object
     */
    renderSummary(summary) {
        if (!summary || typeof summary !== 'object') {
            summary = window.APP_CONSTANTS.DEFAULTS.SUMMARY;
        }

        // Update counter elements
        AppHelpers.setTextContent(
            AppHelpers.getElementById(window.APP_CONSTANTS.ELEMENT_IDS.TOTAL_COUNT),
            summary.repos_found || 0
        );
        AppHelpers.setTextContent(
            AppHelpers.getElementById(window.APP_CONSTANTS.ELEMENT_IDS.CRITICAL_COUNT),
            summary.critical || 0
        );
        AppHelpers.setTextContent(
            AppHelpers.getElementById(window.APP_CONSTANTS.ELEMENT_IDS.HIGH_COUNT),
            summary.high || 0
        );
        AppHelpers.setTextContent(
            AppHelpers.getElementById(window.APP_CONSTANTS.ELEMENT_IDS.MEDIUM_COUNT),
            summary.medium || 0
        );
        AppHelpers.setTextContent(
            AppHelpers.getElementById(window.APP_CONSTANTS.ELEMENT_IDS.LOW_COUNT),
            summary.low || 0
        );
    }

    /**
     * Set loading state
     * @param {boolean} loading - Whether component is loading
     */
    setLoadingState(loading) {
        this.isLoading = loading;

        const searchBtn = AppHelpers.getElementById(window.APP_CONSTANTS.ELEMENT_IDS.SEARCH_BTN);
        const loadBtn = AppHelpers.getElementById(window.APP_CONSTANTS.ELEMENT_IDS.LOAD_BTN);

        if (searchBtn) {
            searchBtn.disabled = loading;
            AppHelpers.toggleClass(searchBtn, window.APP_CONSTANTS.CSS_CLASSES.LOADING, loading);
        }

        if (loadBtn && !this.selectedRepository) {
            loadBtn.disabled = true;
        }
    }

    /**
     * Clear search results
     */
    clearResults() {
        this.repositories = [];
        this.selectedRepository = null;

        // Clear repository list
        const repoList = AppHelpers.getElementById(window.APP_CONSTANTS.ELEMENT_IDS.REPO_LIST);
        if (repoList) {
            repoList.innerHTML = '';
        }

        // Reset summary
        this.renderSummary(window.APP_CONSTANTS.DEFAULTS.SUMMARY);

        // Disable load button
        const loadBtn = AppHelpers.getElementById(window.APP_CONSTANTS.ELEMENT_IDS.LOAD_BTN);
        if (loadBtn) {
            loadBtn.disabled = true;
        }
    }

    /**
     * Render empty state
     */
    renderEmptyState() {
        const repoList = AppHelpers.getElementById(window.APP_CONSTANTS.ELEMENT_IDS.REPO_LIST);
        if (repoList) {
            repoList.innerHTML = `
                <li class="repo-item-empty">
                    <div style="text-align: center; padding: 2rem; color: #656d76;">
                        <div style="font-size: 2rem; margin-bottom: 0.5rem;">🔍</div>
                        <div>Enter organization and filter to search repositories</div>
                    </div>
                </li>
            `;
        }
    }

    /**
     * Load stored values from localStorage
     */
    loadStoredValues() {
        const lastOrg = AppHelpers.storage.get(window.APP_CONSTANTS.STORAGE_KEYS.LAST_ORGANIZATION, '');
        const lastFilter = AppHelpers.storage.get(window.APP_CONSTANTS.STORAGE_KEYS.LAST_FILTER, '');

        const orgInput = AppHelpers.getElementById(window.APP_CONSTANTS.ELEMENT_IDS.ORG_INPUT);
        const filterInput = AppHelpers.getElementById(window.APP_CONSTANTS.ELEMENT_IDS.FILTER_INPUT);

        if (orgInput && lastOrg) {
            orgInput.value = lastOrg;
        }

        if (filterInput && lastFilter) {
            filterInput.value = lastFilter;
        }
    }

    /**
     * Show notification message
     * @param {string} message - Notification message
     * @param {string} type - Notification type
     */
    showNotification(message, type = window.APP_CONSTANTS.NOTIFICATION_TYPES.INFO) {
        if (this.onShowNotification && typeof this.onShowNotification === 'function') {
            this.onShowNotification(message, type);
        }
    }

    /**
     * Get selected repository
     * @returns {Object|null} Selected repository or null
     */
    getSelectedRepository() {
        return this.selectedRepository;
    }

    /**
     * Get all repositories
     * @returns {Array} Array of repositories
     */
    getRepositories() {
        return this.repositories;
    }

    /**
     * Set callback for repository selection
     * @param {Function} callback - Selection callback
     */
    onRepositorySelected(callback) {
        this.onRepositorySelected = callback;
    }

    /**
     * Set callback for load alerts action
     * @param {Function} callback - Load alerts callback
     */
    onLoadAlerts(callback) {
        this.onLoadAlerts = callback;
    }

    /**
     * Set callback for showing notifications
     * @param {Function} callback - Notification callback
     */
    onShowNotification(callback) {
        this.onShowNotification = callback;
    }
}

// Export the component
window.SidebarComponent = SidebarComponent;