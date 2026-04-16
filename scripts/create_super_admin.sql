-- Create Super Admin User
-- Note: This needs to be run in Supabase Dashboard > SQL Editor with service role access

-- User credentials
-- Username: diego_sv
-- Email: diego_sv@instapro-crm.local  
-- Password: InstD37%

-- Run this SQL in Supabase Dashboard:
-- 1. Go to https://app.supabase.com/
-- 2. Select your project (InstaPro CRM)
-- 3. Go to SQL Editor > New Query
-- 4. Paste the code below and run it

SELECT
  auth.uid() as user_id,
  auth.email() as user_email,
  auth.role() as user_role;
