// Supabase Configuration - Singleton Pattern
// This ensures only one instance of the Supabase client is created

// Check if client already exists
if (typeof window.supabaseClient === 'undefined') {
    const SUPABASE_URL = 'https://defifwzgazqlrigwumqn.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRlZmlmd3pnYXpxbHJpZ3d1bXFuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzExMDY0OTAsImV4cCI6MjA0NjY4MjQ5MH0.DknLuqU8P7K5B8qLLxTWDh-HBMKzPnVzIKCqNLLVHCE';
    
    // Create client only once and store globally
    window.supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    
    console.log('Celloxen Supabase client initialized successfully');
} else {
    console.log('Celloxen Supabase client already initialized');
}

// Export the singleton instance
export const supabase = window.supabaseClient;
