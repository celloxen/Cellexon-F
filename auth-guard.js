// SIMPLIFIED AUTH GUARD FOR CELLOXEN - TEMPORARY FIX
(function() {
    'use strict';
    
    const currentPage = window.location.pathname.split('/').pop();
    const publicPages = ['index.html', 'unified-login.html', 'test-login.html', ''];
    
    // Skip auth check for public pages
    if (publicPages.includes(currentPage)) {
        return;
    }
    
    // Get auth data
    const authData = JSON.parse(localStorage.getItem('celloxen_auth') || sessionStorage.getItem('celloxen_auth') || '{}');
    
    // Check if user is logged in
    if (!authData.username) {
        alert('Please login to access this page');
        window.location.href = 'unified-login.html';
        return;
    }
    
    // Define which pages each user type can access
    const superAdminPages = ['super-admin-dashboard.html', 'super-admin-registration.html', 'leads-management.html'];
    const clinicPages = ['clinic-dashboard.html', 'patient-management.html', 'health-assessment.html', 'treatment-interface.html', 'iris-analysis.html', 'vital-signs.html'];
    
    // Check access based on user type
    if (authData.userType === 'super_admin') {
        // Super admin can access everything
        console.log('Super Admin access granted');
    } else if (authData.userType === 'clinic' || authData.userType === 'clinic_admin') {
        // Clinic users can only access clinic pages
        if (superAdminPages.includes(currentPage)) {
            alert('Access denied. This page is for super administrators only.');
            window.location.href = 'clinic-dashboard.html';
            return;
        }
        console.log('Clinic access granted');
    } else {
        // Unknown user type
        alert('Invalid user type. Please login again.');
        window.location.href = 'unified-login.html';
        return;
    }
    
    // Make auth data available globally
    window.celloxenAuth = authData;
    
    // Simple logout function
    window.celloxenLogout = function() {
        localStorage.removeItem('celloxen_auth');
        sessionStorage.clear();
        window.location.href = 'unified-login.html';
    };
    
    console.log('Auth Guard: User authenticated -', authData.username, '(' + authData.userType + ')');
})();
