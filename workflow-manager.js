// Supabase Configuration for Celloxen Platform
const SUPABASE_URL = 'https://defifwzgazqlrigwumqn.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRlZmlmd3pnYXpxbHJpZ3d1bXFuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcyNTM0MjYsImV4cCI6MjA3MjgyOTQyNn0.wcUBq6Pszjtqn5aBtuu3iXBE4BLmu8x9LtJbsMWlIiA';

// Wait for Supabase to be available
function waitForSupabase() {
    return new Promise((resolve) => {
        if (window.supabase && window.supabase.createClient) {
            resolve();
        } else {
            // Check every 50ms for Supabase to be loaded
            const checkInterval = setInterval(() => {
                if (window.supabase && window.supabase.createClient) {
                    clearInterval(checkInterval);
                    resolve();
                }
            }, 50);
            
            // Timeout after 5 seconds
            setTimeout(() => {
                clearInterval(checkInterval);
                console.error('Supabase failed to load after 5 seconds');
                resolve(); // Resolve anyway to prevent hanging
            }, 5000);
        }
    });
}

// Create client after ensuring Supabase is loaded
let supabaseClient = null;

async function initializeSupabase() {
    await waitForSupabase();
    
    if (window.supabase && window.supabase.createClient) {
        const { createClient } = window.supabase;
        supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        console.log('Supabase client initialized in config');
        return supabaseClient;
    } else {
        console.error('Supabase library not available');
        return null;
    }
}

// Initialize immediately
const supabasePromise = initializeSupabase();

// Export a proxy that waits for initialization
export const supabase = new Proxy({}, {
    get: function(target, prop) {
        if (!supabaseClient) {
            console.warn('Supabase client not yet initialized, returning pending promise');
            // Return a function that waits for initialization
            return async function(...args) {
                await supabasePromise;
                if (supabaseClient && supabaseClient[prop]) {
                    return supabaseClient[prop](...args);
                }
                throw new Error('Supabase client not available');
            };
        }
        return supabaseClient[prop];
    }
});

// Also export the initialization promise for modules that need to wait
export { supabasePromise };

// Make client available globally once initialized
supabasePromise.then(client => {
    if (client) {
        window.supabaseClient = client;
    }
});
