
import { createClient } from '@supabase/supabase-js'

// Placeholder credentials to allow the application to run in this environment.
// In a real deployment, these should be configured as environment variables.
const supabaseUrl = 'https://ivmrevmvnbpijxbktsgw.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml2bXJldm12bmJwaWp4Ymt0c2d3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTgzNjA0NDQsImV4cCI6MjAzMzkzNjQ0NH0.pWlSoYk1rTKJb2pENpTqw22SN385pya7eTqzTwdL550';

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
