// Supabase Configuration for Celloxen Platform
// This file creates a single Supabase client instance

const SUPABASE_URL = 'https://defifwzgazqlrigwumqn.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRlZmlmd3pnYXpxbHJpZ3d1bXFuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzExMDY0OTAsImV4cCI6MjA0NjY4MjQ5MH0.DknLuqU8P7K5B8qLLxTWDh-HBMKzPnVzIKCqNLLVHCE';

// Wait for the Supabase library to load from CDN
function initializeSupabase() {
    if (typeof window.supabase === 'undefined') {
        // If Supabase isn't loaded yet, wait and try again
        setTimeout(initializeSupabase, 100);
        return;
    }
    
    // Create client only once
    if (!window.supabaseClient) {
        window.supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        console.log('Celloxen Supabase client initialized successfully');
    }
}

// Initialize on load
initializeSupabase();

// Export the client (will be undefined initially, then populated)
export const supabase = new Proxy({}, {
    get: function(target, prop) {
        if (!window.supabaseClient) {
            console.warn('Supabase client not ready yet');
            return () => Promise.resolve({ data: null, error: 'Client not initialized' });
        }
        return window.supabaseClient[prop];
    }
});
