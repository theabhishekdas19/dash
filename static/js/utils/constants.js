// ===== APPLICATION CONSTANTS =====

// API Endpoints
const API_ENDPOINTS = {
    SEARCH_REPOS: '/search_repos',
    LOAD_ALERTS: '/load_alerts',
    STREAM_FIX: '/stream_fix'
};

// Severity Levels
const SEVERITY_LEVELS = {
    CRITICAL: 'critical',
    HIGH: 'high',
    MEDIUM: 'medium',
    LOW: 'low'
};

// Severity Colors
const SEVERITY_COLORS = {
    [SEVERITY_LEVELS.CRITICAL]: '#da3633',
    [SEVERITY_LEVELS.HIGH]: '#fb8500',
    [SEVERITY_LEVELS.MEDIUM]: '#0969da',
    [SEVERITY_LEVELS.LOW]: '#1a7f37'
};

// Severity Order (for sorting)
const SEVERITY_ORDER = {
    [SEVERITY_LEVELS.CRITICAL]: 4,
    [SEVERITY_LEVELS.HIGH]: 3,
    [SEVERITY_LEVELS.MEDIUM]: 2,
    [SEVERITY_LEVELS.LOW]: 1
};

// UI States
const UI_STATES = {
    LOADING: 'loading',
    ERROR: 'error',
    SUCCESS: 'success',
    IDLE: 'idle'
};

// Element IDs
const ELEMENT_IDS = {
    ORG_INPUT: 'org-input',
    FILTER_INPUT: 'filter-input',
    SEARCH_BTN: 'search-btn',
    LOAD_BTN: 'load-btn',
    REPO_LIST: 'repo-list',
    CARDS_CONTAINER: 'cards-container',
    EMPTY_STATE: 'empty-state',
    LOADING_OVERLAY: 'loading-overlay',
    NOTIFICATION_CONTAINER: 'notification-container',
    ASSIST_BG: 'assist-bg',
    ASSIST_CONTENT: 'assist-content',
    
    // Summary counters
    TOTAL_COUNT: 'total-count',
    CRITICAL_COUNT: 'c-count',
    HIGH_COUNT: 'h-count',
    MEDIUM_COUNT: 'm-count',
    LOW_COUNT: 'l-count'
};

// CSS Classes
const CSS_CLASSES = {
    HIDDEN: 'hidden',
    LOADING: 'loading',
    SELECTED: 'selected',
    SHOW: 'show',
    REPO_ITEM: 'repo-item',
    ALERT_CARD: 'alert-card',
    BTN_TEXT: 'btn-text',
    BTN_LOADER: 'btn-loader',
    SEVERITY_DOT: 'severity-dot',
    BADGE: 'badge',
    NOTIFICATION: 'notification'
};

// Notification Types
const NOTIFICATION_TYPES = {
    SUCCESS: 'success',
    ERROR: 'error',
    INFO: 'info',
    WARNING: 'warning'
};

// GitHub API Constants
const GITHUB_CONFIG = {
    MAX_REPOS_PER_PAGE: 100,
    MAX_ALERTS_PER_PAGE: 100,
    API_TIMEOUT: 30000
};

// UI Configuration
const UI_CONFIG = {
    NOTIFICATION_DURATION: 5000,
    ANIMATION_DURATION: 300,
    DEBOUNCE_DELAY: 300,
    MAX_REPO_NAME_LENGTH: 50,
    MAX_VULNERABILITY_TITLE_LENGTH: 80
};

// Error Messages
const ERROR_MESSAGES = {
    NETWORK_ERROR: 'Network error occurred. Please check your connection.',
    GITHUB_API_ERROR: 'GitHub API error. Please check your token and permissions.',
    INVALID_ORGANIZATION: 'Please enter a valid GitHub organization name.',
    INVALID_FILTER: 'Please enter a search filter for repositories.',
    NO_REPOSITORIES_FOUND: 'No repositories found matching your criteria.',
    FAILED_TO_LOAD_ALERTS: 'Failed to load security alerts for this repository.',
    AI_SERVICE_ERROR: 'AI service is currently unavailable. Please try again later.',
    UNAUTHORIZED: 'Unauthorized access. Please check your GitHub token.',
    RATE_LIMITED: 'Rate limit exceeded. Please wait before making more requests.'
};

// Success Messages
const SUCCESS_MESSAGES = {
    REPOSITORIES_LOADED: 'Repositories loaded successfully',
    ALERTS_LOADED: 'Security alerts loaded successfully',
    AI_RESPONSE_COMPLETE: 'AI analysis completed'
};

// Default Values
const DEFAULTS = {
    ORGANIZATION: '',
    FILTER_QUERY: '',
    SUMMARY: {
        repos_found: 0,
        critical: 0,
        high: 0,
        medium: 0,
        low: 0
    }
};

// Regular Expressions
const REGEX_PATTERNS = {
    GITHUB_ORG: /^[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}$/i,
    GITHUB_REPO: /^[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,100}$/i
};

// Local Storage Keys
const STORAGE_KEYS = {
    LAST_ORGANIZATION: 'dependabot_last_org',
    LAST_FILTER: 'dependabot_last_filter',
    USER_PREFERENCES: 'dependabot_preferences'
};

// Export constants for use in other modules
window.APP_CONSTANTS = {
    API_ENDPOINTS,
    SEVERITY_LEVELS,
    SEVERITY_COLORS,
    SEVERITY_ORDER,
    UI_STATES,
    ELEMENT_IDS,
    CSS_CLASSES,
    NOTIFICATION_TYPES,
    GITHUB_CONFIG,
    UI_CONFIG,
    ERROR_MESSAGES,
    SUCCESS_MESSAGES,
    DEFAULTS,
    REGEX_PATTERNS,
    STORAGE_KEYS
};