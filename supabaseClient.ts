
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://mxhnkoxuoogorhynygdi.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im14aG5rb3h1b29nb3JoeW55Z2RpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI4OTg4NzAsImV4cCI6MjA3ODQ3NDg3MH0.hQDaN09JMBhXr0-3IbAZ4shsjR6x0JP8eUxtRqUGA0s'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
