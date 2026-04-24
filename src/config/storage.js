const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY  // service_role key, NO la anon key
);

const BUCKET = process.env.SUPABASE_BUCKET || 'storage-sena';

module.exports = { supabase, BUCKET };
