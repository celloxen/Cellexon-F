// Cellexon Supabase Configuration - Fresh Database
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm'

const supabaseUrl = 'https://defifwzgazqlrigwumqn.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRlZmlmd3pnYXpxbHJpZ3d1bXFuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcyNTM0MjYsImV4cCI6MjA3MjgyOTQyNn0.wcUBq6Pszjtqn5aBtuu3iXBE4BLmu8x9LtJbsMWlIiA'

export const supabase = createClient(supabaseUrl, supabaseKey)

console.log('Cellexon Supabase client loaded successfully')
