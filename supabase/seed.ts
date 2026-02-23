/**
 * NovaNet – Admin Seed Script
 * Creates the admin user via Supabase service role (bypasses RLS).
 *
 * Usage:
 *   npx ts-node --project tsconfig.json supabase/seed.ts
 *
 * Requires .env.local with:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   ADMIN_EMAIL
 *   ADMIN_PASSWORD
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';


// Load .env.local
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const adminEmail = process.env.ADMIN_EMAIL!;
const adminPassword = process.env.ADMIN_PASSWORD!;

if (!supabaseUrl || !serviceRoleKey || !adminEmail || !adminPassword) {
  console.error('❌ Missing environment variables. Check your .env.local file.');
  process.exit(1);
}

// Service role client – bypasses RLS, use only server-side
const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function seedAdmin() {
  console.log('🌱 Seeding admin account...');

  // 1. Create auth user
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: adminEmail,
    password: adminPassword,
    email_confirm: true,
    user_metadata: {
      username: 'admin',
      display_name: 'NovaNet Admin',
    },
  });

  if (authError) {
    // User may already exist
    if (authError.message.includes('already been registered')) {
      console.log('ℹ️  Admin user already exists. Skipping creation.');
    } else {
      console.error('❌ Error creating admin auth user:', authError.message);
      process.exit(1);
    }
  } else {
    console.log('✅ Admin auth user created:', authData.user.id);
  }

  // 2. Promote to admin role in profiles table
  const { error: updateError } = await supabase
    .from('profiles')
    .update({ role: 'admin', display_name: 'NovaNet Admin' })
    .eq('id', (await supabase.auth.admin.listUsers()).data.users.find(
      (u) => u.email === adminEmail
    )?.id ?? '');

  if (updateError) {
    console.error('❌ Error updating profile role:', updateError.message);
  } else {
    console.log('✅ Admin role granted.');
  }

  // 3. Seed some sample blocked words (anti-toxicity)
  const blockedWords = ['spam', 'hate', 'slur1', 'slur2'];
  const { error: wordsError } = await supabase
    .from('blocked_words')
    .upsert(blockedWords.map((word) => ({ word })), { onConflict: 'word' });

  if (wordsError) {
    console.warn('⚠️  Could not seed blocked words:', wordsError.message);
  } else {
    console.log('✅ Blocked words seeded.');
  }

  console.log('\n🎉 Seed complete! You can now log in at /auth/login with:');
  console.log(`   Email:    ${adminEmail}`);
  console.log(`   Password: [your ADMIN_PASSWORD]`);
}

seedAdmin().catch(console.error);
