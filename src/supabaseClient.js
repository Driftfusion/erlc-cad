import { createClient } from '@supabase/supabase-js'

// Replace these with your own values from the Supabase dashboard
const supabaseUrl = 'https://rakluggxznhpzpchgupd.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJha2x1Z2d4em5ocHpwY2hndXBkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE4NjQ5NzIsImV4cCI6MjA3NzQ0MDk3Mn0.RoIKVnrBn7QfEIf7VMhm78txxsUJb30fm3cR3dDd4Zo'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
