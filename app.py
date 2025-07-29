import os
import time
import logging
from threading import Lock
import requests
from flask import Flask, render_template, request, jsonify, Response
from dotenv import load_dotenv, find_dotenv
from langchain_openai import AzureChatOpenAI
from langchain_core.prompts import ChatPromptTemplate

# ===== CONFIGURATION & SETUP =====
load_dotenv(find_dotenv())

# Configure logging
logging.basicConfig(
    level=getattr(logging, os.getenv('LOG_LEVEL', 'INFO').upper()),
    format="%(asctime)s • %(levelname)s • %(funcName)s • %(message)s"
)
logger = logging.getLogger(__name__)

# ===== GITHUB AUTHENTICATION =====
GITHUB_TOKEN = os.getenv("GITHUB_TOKEN")
if not GITHUB_TOKEN:
    raise RuntimeError("GITHUB_TOKEN environment variable is required")

GH_HEADERS = {
    "Authorization": f"Bearer {GITHUB_TOKEN}",
    "Accept": "application/vnd.github+json",
    "User-Agent": "Dependabot-Security-Dashboard/1.0"
}

# Configuration constants
REQUEST_TIMEOUT = int(os.getenv('REQUEST_TIMEOUT', 30))
MAX_REPOS_PER_REQUEST = int(os.getenv('MAX_REPOS_PER_REQUEST', 100))

# ===== AZURE AD OAUTH2 TOKEN PROVIDER =====
_auth_lock = Lock()
_cached_token = None
_token_expiry = 0

def get_auth_token_provider():
    """
    Get or refresh Azure AD OAuth2 token for Azure OpenAI access.
    Uses client credentials flow with caching for efficiency.
    """
    global _cached_token, _token_expiry
    
    with _auth_lock:
        # Return cached token if still valid (with 30s buffer)
        if _cached_token and time.time() < _token_expiry - 30:
            return _cached_token
        
        # Get credentials from environment
        auth_url = os.getenv("AZURE_OPENAI_AUTH_URL")
        scope = os.getenv("AZURE_OPENAI_SCOPE")
        client_id = os.getenv("AZURE_OPENAI_CLIENT_ID")
        client_secret = os.getenv("AZURE_OPENAI_CLIENT_SECRET")
        
        # Validate all required credentials are present
        required_vars = [auth_url, scope, client_id, client_secret]
        if not all(required_vars):
            raise RuntimeError("Missing Azure AD credentials. Check environment variables.")
        
        try:
            # Request new token
            response = requests.post(
                auth_url,
                data={
                    "grant_type": "client_credentials",
                    "scope": scope,
                    "client_id": client_id,
                    "client_secret": client_secret
                },
                timeout=REQUEST_TIMEOUT
            )
            response.raise_for_status()
            
            token_data = response.json()
            _cached_token = token_data["access_token"]
            _token_expiry = time.time() + token_data.get("expires_in", 3600)
            
            logger.info("Successfully refreshed Azure AD token")
            return _cached_token
            
        except requests.RequestException as e:
            logger.error(f"Failed to get Azure AD token: {e}")
            raise RuntimeError(f"Azure AD authentication failed: {e}")

# ===== AZURE OPENAI SETUP =====
def initialize_azure_openai():
    """Initialize Azure OpenAI client with proper configuration."""
    endpoint = os.getenv("AZURE_OPENAI_ENDPOINT")
    api_version = os.getenv("AZURE_OPENAI_API_VERSION", "2025-01-01-preview")
    deployment = os.getenv("AZURE_OPENAI_DEPLOYMENT")
    project_id = os.getenv("AZURE_OPENAI_PROJECT_ID")
    
    required_settings = [endpoint, deployment, project_id]
    if not all(required_settings):
        raise RuntimeError("Missing Azure OpenAI configuration. Check environment variables.")
    
    try:
        return AzureChatOpenAI(
            azure_endpoint=endpoint,
            api_version=api_version,
            azure_deployment=deployment,
            azure_ad_token_provider=get_auth_token_provider,
            default_headers={"projectId": project_id},
            temperature=0.0,
            streaming=True,
            verbose=False
        )
    except Exception as e:
        logger.error(f"Failed to initialize Azure OpenAI: {e}")
        raise RuntimeError(f"Azure OpenAI initialization failed: {e}")

# Initialize LLM
llm = initialize_azure_openai()

# ===== GITHUB API HELPERS =====
def fetch_org_repos(org: str):
    """
    Fetch repositories for a given GitHub organization.
    
    Args:
        org: GitHub organization name
        
    Returns:
        List of repository objects from GitHub API
        
    Raises:
        requests.RequestException: If API request fails
    """
    logger.info(f"Fetching repositories for organization: {org}")
    
    url = f"https://api.github.com/orgs/{org}/repos"
    params = {
        "per_page": MAX_REPOS_PER_REQUEST,
        "sort": "updated",
        "direction": "desc"
    }
    
    try:
        response = requests.get(url, headers=GH_HEADERS, params=params, timeout=REQUEST_TIMEOUT)
        response.raise_for_status()
        
        repos = response.json()
        logger.info(f"Successfully fetched {len(repos)} repositories for {org}")
        return repos
        
    except requests.RequestException as e:
        logger.error(f"Failed to fetch repositories for {org}: {e}")
        raise

def fetch_code_matches(org: str, query: str):
    """
    Search for code matches in an organization using GitHub's code search API.
    
    Args:
        org: GitHub organization name
        query: Search query
        
    Returns:
        Set of repository full names that match the search
    """
    logger.info(f"Searching for code matches: org={org}, query={query}")
    
    # Build search query for GitHub's code search API
    search_query = f"projectFriendlyName:{query} filename:vitals.yaml org:{org}"
    url = "https://api.github.com/search/code"
    params = {"q": search_query}
    
    try:
        response = requests.get(url, headers=GH_HEADERS, params=params, timeout=REQUEST_TIMEOUT)
        
        if response.status_code != 200:
            logger.warning(f"Code search failed with status {response.status_code}")
            return set()
        
        data = response.json()
        matches = {item["repository"]["full_name"].lower() 
                  for item in data.get("items", [])}
        
        logger.info(f"Found {len(matches)} code matches")
        return matches
        
    except requests.RequestException as e:
        logger.error(f"Code search failed: {e}")
        return set()

def fetch_dependabot_alerts(owner: str, repo: str):
    """
    Fetch Dependabot security alerts for a specific repository.
    
    Args:
        owner: Repository owner
        repo: Repository name
        
    Returns:
        List of Dependabot alert objects
    """
    logger.info(f"Fetching Dependabot alerts for {owner}/{repo}")
    
    url = f"https://api.github.com/repos/{owner}/{repo}/dependabot/alerts"
    params = {"per_page": MAX_REPOS_PER_REQUEST}
    
    try:
        response = requests.get(url, headers=GH_HEADERS, params=params, timeout=REQUEST_TIMEOUT)
        
        if response.status_code == 404:
            logger.info(f"Repository {owner}/{repo} not found or no access")
            return []
        elif response.status_code == 403:
            logger.warning(f"Access forbidden for {owner}/{repo}")
            return []
        
        response.raise_for_status()
        alerts = response.json()
        
        logger.info(f"Successfully fetched {len(alerts)} alerts for {owner}/{repo}")
        return alerts
        
    except requests.RequestException as e:
        logger.error(f"Failed to fetch alerts for {owner}/{repo}: {e}")
        return []

def get_highest_severity(counts):
    """
    Determine the highest severity level from vulnerability counts.
    
    Args:
        counts: Dictionary with severity counts
        
    Returns:
        String representing the highest severity level
    """
    severity_order = ["critical", "high", "medium", "low"]
    
    for severity in severity_order:
        if counts.get(severity, 0) > 0:
            return severity
    
    return "low"

# ===== FLASK APPLICATION =====
app = Flask(
    __name__,
    static_folder="static",
    template_folder="templates"
)

# Configure Flask
app.config['DEBUG'] = os.getenv('FLASK_DEBUG', 'False').lower() == 'true'
app.config['ENV'] = os.getenv('FLASK_ENV', 'production')

@app.route("/")
def index():
    """Serve the main dashboard page."""
    return render_template("index.html")

@app.route("/search_repos")
def search_repos():
    """
    Search for repositories in a GitHub organization.
    
    Query Parameters:
        org: GitHub organization name
        q: Search query filter
        
    Returns:
        JSON response with repositories and summary statistics
    """
    org = request.args.get("org", "").strip()
    query = request.args.get("q", "").strip().lower()
    
    # Validate input parameters
    if not org or not query:
        logger.warning("Missing required parameters: org or q")
        return jsonify({"repos": [], "summary": {}})
    
    try:
        # Fetch all repositories for the organization
        all_repos = fetch_org_repos(org)
        
        # Search for code matches
        code_matches = fetch_code_matches(org, query)
        
        # Filter repositories and collect security data
        matched_repos = []
        summary_stats = {
            "repos_found": 0,
            "critical": 0,
            "high": 0,
            "medium": 0,
            "low": 0
        }
        
        for repo in all_repos:
            repo_full_name = repo["full_name"].lower()
            repo_name = repo["name"].lower()
            
            # Check if repository matches search criteria
            if query in repo_name or repo_full_name in code_matches:
                # Get Dependabot alerts for this repository
                owner, name = repo["full_name"].split("/", 1)
                alerts = fetch_dependabot_alerts(owner, name)
                
                # Count alerts by severity
                severity_counts = {"critical": 0, "high": 0, "medium": 0, "low": 0}
                
                for alert in alerts:
                    severity = alert.get("security_advisory", {}).get("severity", "low").lower()
                    if severity in severity_counts:
                        severity_counts[severity] += 1
                
                # Add to summary statistics
                for severity in severity_counts:
                    summary_stats[severity] += severity_counts[severity]
                
                # Add repository to matched list
                matched_repos.append({
                    "full_name": repo["full_name"],
                    "counts": severity_counts,
                    "severity": get_highest_severity(severity_counts)
                })
        
        summary_stats["repos_found"] = len(matched_repos)
        
        logger.info(f"Search completed: found {len(matched_repos)} repositories")
        return jsonify({"repos": matched_repos, "summary": summary_stats})
        
    except Exception as e:
        logger.error(f"Repository search failed: {e}")
        return jsonify({"error": str(e)}), 500

@app.route("/load_alerts", methods=["POST"])
def load_alerts():
    """
    Load detailed security alerts for a specific repository.
    
    Request Body:
        repo: Full repository name (owner/repo)
        
    Returns:
        JSON array of formatted security alerts
    """
    try:
        data = request.get_json() or {}
        repo_full_name = data.get("repo", "").strip()
        
        if not repo_full_name:
            logger.warning("Missing repository name in request")
            return jsonify([])
        
        # Parse repository owner and name
        try:
            owner, repo = repo_full_name.split("/", 1)
        except ValueError:
            logger.warning(f"Invalid repository name format: {repo_full_name}")
            return jsonify([])
        
        # Fetch raw alerts from GitHub API
        raw_alerts = fetch_dependabot_alerts(owner, repo)
        
        # Format alerts for frontend consumption
        formatted_alerts = []
        
        for alert in raw_alerts:
            security_advisory = alert.get("security_advisory", {})
            vulnerabilities = alert.get("vulnerabilities", [{}])
            first_vulnerability = vulnerabilities[0] if vulnerabilities else {}
            
            formatted_alert = {
                "vulnerability": security_advisory.get("summary", "Unknown vulnerability"),
                "package": first_vulnerability.get("package", {}).get("name", "Unknown package"),
                "severity": security_advisory.get("severity", "low").lower(),
                "patched_in": first_vulnerability.get("first_patched_version") or "N/A",
                "apply_fix_in": "pom.xml",  # Default for demo purposes
                "id": alert.get("number", f"alert_{len(formatted_alerts)}")
            }
            
            formatted_alerts.append(formatted_alert)
        
        logger.info(f"Loaded {len(formatted_alerts)} alerts for {repo_full_name}")
        return jsonify(formatted_alerts)
        
    except Exception as e:
        logger.error(f"Failed to load alerts: {e}")
        return jsonify({"error": str(e)}), 500

@app.route("/stream_fix", methods=["POST"])
def stream_fix():
    """
    Stream AI-generated fix suggestions for a security alert.
    
    Request Body:
        Alert object with vulnerability details
        
    Returns:
        Server-sent events stream with AI response
    """
    try:
        alert = request.get_json() or {}
        
        # Validate required alert fields
        required_fields = ["vulnerability", "package", "severity"]
        missing_fields = [field for field in required_fields if not alert.get(field)]
        
        if missing_fields:
            logger.warning(f"Missing required alert fields: {missing_fields}")
            return jsonify({"error": f"Missing fields: {', '.join(missing_fields)}"}), 400
        
        # Create AI prompt template
        prompt_template = """Below is a Dependabot security alert. Please provide:

1) A concise code fix snippet
2) The exact file path to apply the fix
3) Any merge conflict resolution strategy if needed
4) Step-by-step implementation instructions

Alert Details:
- Vulnerability: {vulnerability}
- Package: {package}
- Severity: {severity}
- Patched Version: {patched_in}
- Apply Fix In: {apply_fix_in}

Please provide a comprehensive but concise response with actionable steps."""

        prompt = ChatPromptTemplate.from_template(prompt_template)
        chain = prompt | llm
        
        def generate_stream():
            """Generate streaming response from AI."""
            try:
                logger.info(f"Starting AI fix stream for {alert.get('package')} vulnerability")
                
                # Invoke the AI chain and stream response
                response = chain.invoke(alert)
                
                # Split response into words for streaming effect
                words = response.content.split()
                
                for word in words:
                    yield f"{word} "
                    time.sleep(0.05)  # Small delay for streaming effect
                
                yield "\n\n✅ Analysis complete!"
                logger.info("AI fix stream completed successfully")
                
            except Exception as e:
                logger.error(f"AI streaming failed: {e}")
                yield f"\n\n❌ Error: {str(e)}"
        
        return Response(
            generate_stream(),
            mimetype="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive"
            }
        )
        
    except Exception as e:
        logger.error(f"Stream fix endpoint failed: {e}")
        return jsonify({"error": str(e)}), 500

@app.errorhandler(404)
def not_found(error):
    """Handle 404 errors."""
    return jsonify({"error": "Endpoint not found"}), 404

@app.errorhandler(500)
def internal_error(error):
    """Handle 500 errors."""
    logger.error(f"Internal server error: {error}")
    return jsonify({"error": "Internal server error"}), 500

# ===== APPLICATION STARTUP =====
if __name__ == "__main__":
    # Configuration
    host = os.getenv('APP_HOST', '0.0.0.0')
    port = int(os.getenv('APP_PORT', 8000))
    debug = os.getenv('FLASK_DEBUG', 'False').lower() == 'true'
    
    logger.info(f"Starting Dependabot Security Dashboard on {host}:{port}")
    logger.info(f"Debug mode: {debug}")
    
    try:
        app.run(
            host=host,
            port=port,
            debug=debug,
            threaded=True
        )
    except KeyboardInterrupt:
        logger.info("Application shutdown requested")
    except Exception as e:
        logger.error(f"Failed to start application: {e}")
        raise