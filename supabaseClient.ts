
import { createClient } from '@supabase/supabase-js'

// Placeholder credentials to allow the application to run in this environment.
// In a real deployment, these should be configured as environment variables.
const supabaseUrl = 'https://ivmrevmvnbpijxbktsgw.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml2bXJldm12bmJwaWp4Ymt0c2d3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjE0MjU4MjIsImV4cCI6MjAzNjkxMTgyMn0.5b2Tz0-aM6hDbzG7Yw_5599_2Zk4fK4iXU-B5b_qF_k';

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
