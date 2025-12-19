import { createClient } from '@supabase/supabase-js'

process.env.NEXT_PUBLIC_SUPABASE_URL = "https://ryseshfgerxozrbtxyqv.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ5c2VzaGZnZXJ4b3pyYnR4eXF2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIyODg3NzcsImV4cCI6MjA3Nzg2NDc3N30.JbUwwqamOR9YtrRKHEc9H0_QyNy8dSvQThs_fBW1zAc";
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const supabase = createClient(supabaseUrl, supabaseKey)

async function testConnection() {
  try {
    const { data, error } = await supabase.from('achievements').select('*').limit(1)
    if (error) {
      console.error('Supabase error:', error)
    } else {
      console.log('Supabase connection successful! Sample data:', data)
    }
  } catch (err) {
    console.error('Connection failed:', err)
  }
}

testConnection()
