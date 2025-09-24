// Supabase Configuration for Celloxen Platform
const SUPABASE_URL = 'https://defifwzgazqlrigwumqn.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRlZmlmd3pnYXpxbHJpZ3d1bXFuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcyNTM0MjYsImV4cCI6MjA3MjgyOTQyNn0.wcUBq6Pszjtqn5aBtuu3iXBE4BLmu8x9LtJbsMWlIiA';

// Create and export the client directly
const { createClient } = window.supabase;
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Export for ES6 modules
export const supabase = supabaseClient;

// Also make available globally for non-module scripts
window.supabaseClient = supabaseClient;

console.log('Supabase client initialized');
