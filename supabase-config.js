// Cellexon Supabase Configuration
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm'

const supabaseUrl = 'https://wtwvccofppeyfnpojwml.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind0d3ZjY29mcHBleWZucG9qd21sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcyNDMxNTMsImV4cCI6MjA3MjgxOTE1M30.VFn7DJpotP9m1LILEoNb2mQX9c9NZTNh6x96APaE5Jk'

export const supabase = createClient(supabaseUrl, supabaseKey)

console.log('Cellexon Supabase client loaded successfully')
