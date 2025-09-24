// supabase-config.js - Fixed initialization with proper error handling
const SUPABASE_URL = 'https://defifwzgazqlrigwumqn.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRlZmlmd3pnYXpxbHJpZ3d1bXFuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcyNTM0MjYsImV4cCI6MjA3MjgyOTQyNn0.wcUBq6Pszjtqn5aBtuu3iXBE4BLmu8x9LtJbsMWlIiA';

// Store client instance
let supabaseClient = null;
let initPromise = null;

// Initialize Supabase when ready
function initializeSupabase() {
    if (supabaseClient) return Promise.resolve(supabaseClient);
    
    if (!initPromise) {
        initPromise = new Promise((resolve) => {
            function checkAndInit() {
                if (typeof window !== 'undefined' && window.supabase && window.supabase.createClient) {
                    const { createClient } = window.supabase;
                    supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
                    console.log('Supabase client initialized successfully');
                    
                    // Make available globally
                    window.supabaseClient = supabaseClient;
                    resolve(supabaseClient);
                } else {
                    // Check again in 50ms
                    setTimeout(checkAndInit, 50);
                }
            }
            checkAndInit();
        });
    }
    
    return initPromise;
}

// Export proxy that initializes on first use
export const supabase = new Proxy({}, {
    get(target, prop) {
        if (!supabaseClient) {
            // Try immediate init if possible
            if (typeof window !== 'undefined' && window.supabase && window.supabase.createClient) {
                const { createClient } = window.supabase;
                supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
                window.supabaseClient = supabaseClient;
            } else {
                // Return async version
                return async function(...args) {
                    await initializeSupabase();
                    return supabaseClient[prop](...args);
                };
            }
        }
        
        const value = supabaseClient[prop];
        if (typeof value === 'function') {
            return value.bind(supabaseClient);
        }
        return value;
    }
});

// Export initialization promise for modules that need to wait
export const supabaseReady = initializeSupabase();

// Auto-initialize if Supabase is already loaded
if (typeof window !== 'undefined' && window.supabase && window.supabase.createClient) {
    initializeSupabase();
}

export default supabase;
