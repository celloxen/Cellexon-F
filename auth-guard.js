// CELLOXEN AUTHENTICATION GUARD SYSTEM
// File Path: auth-guard.js
// Include this file in ALL protected pages

class CelloxenAuthGuard {
    constructor() {
        this.currentPath = window.location.pathname;
        this.loginPage = '/unified-login.html';
        this.sessionTimeout = 2 * 60 * 60 * 1000; // 2 hours in milliseconds
        this.warningTime = 10 * 60 * 1000; // 10 minutes before logout warning
        
        // Hide page content immediately
        this.hidePageContent();
        
        // Check authentication
        this.checkAuthentication();
        
        // Set up session monitoring
        this.setupSessionMonitoring();
        
        // Set up activity tracking
        this.setupActivityTracking();
    }
    
    // Hide all page content until authentication is verified
    hidePageContent() {
        // Create loading overlay to prevent content flash
        const overlay = document.createElement('div');
        overlay.id = 'celloxen-auth-overlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: #f8fafc;
            z-index: 99999;
            display: flex;
            justify-content: center;
            align-items: center;
            font-family: 'Segoe UI', sans-serif;
        `;
        
        overlay.innerHTML = `
            <div style="text-align: center;">
                <div style="width: 50px; height: 50px; border: 4px solid #e5e7eb; border-top: 4px solid #10b981; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 20px;"></div>
                <div style="color: #1f2937; font-size: 18px; font-weight: 500;">Verifying Authentication...</div>
                <div style="color: #6b7280; font-size: 14px; margin-top: 8px;">Securing your Celloxen session</div>
            </div>
            <style>
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            </style>
        `;
        
        document.body.insertBefore(overlay, document.body.firstChild);
        document.body.style.overflow = 'hidden';
    }
    
    // Show page content after successful authentication
    showPageContent() {
        const overlay = document.getElementById('celloxen-auth-overlay');
        if (overlay) {
            overlay.style.opacity = '0';
            overlay.style.transition = 'opacity 0.3s ease';
            setTimeout(() => {
                overlay.remove();
                document.body.style.overflow = '';
            }, 300);
        }
    }
    
    // Show 404 page with login link
    show404Page() {
        const overlay = document.getElementById('celloxen-auth-overlay');
        if (overlay) {
            overlay.innerHTML = `
                <div style="text-align: center; max-width: 500px; padding: 40px;">
                    <div style="font-size: 72px; color: #ef4444; margin-bottom: 20px;">404</div>
                    <h2 style="color: #1f2937; margin-bottom: 16px;">Access Denied</h2>
                    <p style="color: #6b7280; margin-bottom: 32px; line-height: 1.6;">
                        You don't have permission to access this page or your session has expired.
                        Please log in to continue using the Celloxen platform.
                    </p>
                    <button onclick="window.location.href='${this.loginPage}'" 
                            style="background: #10b981; color: white; border: none; padding: 12px 24px; border-radius: 6px; font-size: 16px; cursor: pointer; font-weight: 500; margin-right: 12px;">
                        Go to Login
                    </button>
                    <button onclick="window.location.href='/'" 
                            style="background: #6b7280; color: white; border: none; padding: 12px 24px; border-radius: 6px; font-size: 16px; cursor: pointer; font-weight: 500;">
                        Home
                    </button>
                </div>
            `;
        }
    }
    
    // Main authentication check
    async checkAuthentication() {
        try {
            const authData = this.getAuthData();
            
            if (!authData) {
                console.log('Celloxen Auth: No authentication data found');
                this.redirectToLogin();
                return false;
            }
            
            // Check if session has expired
            if (this.isSessionExpired(authData)) {
                console.log('Celloxen Auth: Session expired');
                this.clearAuthData();
                this.redirectToLogin('Your session has expired. Please log in again.');
                return false;
            }
            
            // Check user permissions for current page
            if (!this.hasPageAccess(authData)) {
                console.log('Celloxen Auth: Insufficient permissions for this page');
                this.show404Page();
                return false;
            }
            
            // Update last activity time
            this.updateLastActivity();
            
            // Authentication successful
            console.log('Celloxen Auth: Authentication verified for user:', authData.username, '(', authData.userType, ')');
            this.showPageContent();
            
            return true;
            
        } catch (error) {
            console.error('Celloxen Auth: Authentication check failed:', error);
            this.redirectToLogin('Authentication error. Please log in again.');
            return false;
        }
    }
    
    // Get authentication data from localStorage
    getAuthData() {
        try {
            const authDataStr = localStorage.getItem('celloxen_auth');
            if (!authDataStr) return null;
            
            return JSON.parse(authDataStr);
        } catch (error) {
            console.error('Celloxen Auth: Error parsing auth data:', error);
            localStorage.removeItem('celloxen_auth');
            return null;
        }
    }
    
    // Check if session has expired
    isSessionExpired(authData) {
        if (!authData.loginTime || !authData.lastActivity) return true;
        
        const now = new Date().getTime();
        const lastActivity = new Date(authData.lastActivity).getTime();
        
        return (now - lastActivity) > this.sessionTimeout;
    }
    
    // Check if user has access to current page
    hasPageAccess(authData) {
        const userType = authData.userType;
        const currentPage = this.currentPath.toLowerCase();
        
        // Define page access rules for Celloxen platform
        const accessRules = {
            'super_admin': [
                '/super-admin-registration.html',
                '/admin-dashboard.html',
                '/clinic-management.html',
                '/system-settings.html',
                '/global-analytics.html'
            ],
            'clinic': [
                '/patient-management.html',
                '/health-assessment.html',
                '/treatment-interface.html',
                '/iris-analysis.html',
                '/vital-signs.html',
                '/clinic-dashboard.html',
                '/clinic-reports.html',
                '/session-tracking.html'
            ]
        };
        
        // Super admin has access to everything
        if (userType === 'super_admin') {
            return true;
        }
        
        // Check if clinic user has access to current page
        if (userType === 'clinic') {
            return accessRules.clinic.some(allowedPage => 
                currentPage.includes(allowedPage.toLowerCase()) || 
                currentPage.includes(allowedPage.replace('.html', '').toLowerCase()) ||
                currentPage === '/' || currentPage === '/index.html'
            );
        }
        
        return false;
    }
    
    // Update last activity timestamp
    updateLastActivity() {
        const authData = this.getAuthData();
        if (authData) {
            authData.lastActivity = new Date().toISOString();
            localStorage.setItem('celloxen_auth', JSON.stringify(authData));
        }
    }
    
    // Clear authentication data
    clearAuthData() {
        localStorage.removeItem('celloxen_auth');
        localStorage.removeItem('celloxen_session');
        localStorage.removeItem('celloxen_clinic_data');
        sessionStorage.clear();
    }
    
    // Redirect to login page
    redirectToLogin(message = '') {
        if (message) {
            localStorage.setItem('celloxen_login_message', message);
        }
        
        // Prevent redirect loops
        if (!this.currentPath.includes('unified-login.html')) {
            window.location.href = this.loginPage;
        }
    }
    
    // Set up session monitoring
    setupSessionMonitoring() {
        // Check session every minute
        setInterval(() => {
            const authData = this.getAuthData();
            if (authData && this.isSessionExpired(authData)) {
                this.clearAuthData();
                this.redirectToLogin('Your session has expired due to inactivity.');
            }
        }, 60000); // Check every minute
        
        // Show warning before session expires
        setInterval(() => {
            const authData = this.getAuthData();
            if (authData) {
                const now = new Date().getTime();
                const lastActivity = new Date(authData.lastActivity).getTime();
                const timeUntilExpiry = this.sessionTimeout - (now - lastActivity);
                
                // Show warning at 10 minutes before expiry
                if (timeUntilExpiry <= this.warningTime && timeUntilExpiry > 0) {
                    this.showSessionWarning(Math.floor(timeUntilExpiry / 60000));
                }
            }
        }, 30000); // Check every 30 seconds
    }
    
    // Set up activity tracking
    setupActivityTracking() {
        const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
        
        let activityTimeout;
        
        const trackActivity = () => {
            clearTimeout(activityTimeout);
            activityTimeout = setTimeout(() => {
                this.updateLastActivity();
            }, 1000); // Debounce activity updates
        };
        
        events.forEach(event => {
            document.addEventListener(event, trackActivity, true);
        });
    }
    
    // Show session warning modal
    showSessionWarning(minutesLeft) {
        // Remove existing warning if present
        const existingWarning = document.getElementById('celloxen-session-warning');
        if (existingWarning) return;
        
        const modal = document.createElement('div');
        modal.id = 'celloxen-session-warning';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            z-index: 999999;
            display: flex;
            justify-content: center;
            align-items: center;
            font-family: 'Segoe UI', sans-serif;
        `;
        
        modal.innerHTML = `
            <div style="background: white; padding: 30px; border-radius: 12px; max-width: 400px; text-align: center; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);">
                <div style="color: #f59e0b; font-size: 48px; margin-bottom: 16px;">⚠️</div>
                <h3 style="color: #1f2937; margin-bottom: 16px; font-size: 20px;">Session Expiring Soon</h3>
                <p style="color: #6b7280; margin-bottom: 24px; line-height: 1.5;">
                    Your Celloxen session will expire in ${minutesLeft} minute${minutesLeft !== 1 ? 's' : ''}. 
                    Would you like to extend your session?
                </p>
                <div style="display: flex; gap: 12px; justify-content: center;">
                    <button onclick="celloxenAuth.extendSession()" 
                            style="background: #10b981; color: white; border: none; padding: 12px 24px; border-radius: 6px; cursor: pointer; font-weight: 500;">
                        Extend Session
                    </button>
                    <button onclick="celloxenAuth.logout()" 
                            style="background: #ef4444; color: white; border: none; padding: 12px 24px; border-radius: 6px; cursor: pointer; font-weight: 500;">
                        Logout Now
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
    }
    
    // Extend session
    extendSession() {
        this.updateLastActivity();
        const modal = document.getElementById('celloxen-session-warning');
        if (modal) {
            modal.remove();
        }
        
        this.showMessage('Session extended successfully', 'success');
    }
    
    // Logout function
    logout() {
        this.clearAuthData();
        window.location.href = this.loginPage;
    }
    
    // Show message to user
    showMessage(message, type = 'info') {
        const messageDiv = document.createElement('div');
        messageDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 16px 20px;
            border-radius: 8px;
            color: white;
            font-weight: 500;
            z-index: 999999;
            font-family: 'Segoe UI', sans-serif;
            background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'};
            box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
            transition: opacity 0.3s ease;
        `;
        messageDiv.textContent = message;
        
        document.body.appendChild(messageDiv);
        
        setTimeout(() => {
            messageDiv.style.opacity = '0';
            setTimeout(() => messageDiv.remove(), 300);
        }, 3000);
    }
    
    // Static method to get current user info
    static getCurrentUser() {
        try {
            const authDataStr = localStorage.getItem('celloxen_auth');
            return authDataStr ? JSON.parse(authDataStr) : null;
        } catch {
            return null;
        }
    }
    
    // Static method to check if user is authenticated
    static isAuthenticated() {
        const authData = CelloxenAuthGuard.getCurrentUser();
        if (!authData) return false;
        
        const now = new Date().getTime();
        const lastActivity = new Date(authData.lastActivity).getTime();
        const sessionTimeout = 2 * 60 * 60 * 1000; // 2 hours
        
        return (now - lastActivity) <= sessionTimeout;
    }
}

// Initialize auth guard when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Only initialize on protected pages (not login page)
    if (!window.location.pathname.includes('unified-login.html')) {
        window.celloxenAuth = new CelloxenAuthGuard();
    }
});

// Make available globally
window.CelloxenAuthGuard = CelloxenAuthGuard;
