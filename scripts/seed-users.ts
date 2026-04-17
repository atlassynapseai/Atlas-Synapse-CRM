import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const emails = [
  'company@atlassynapseai.com',
  'mdahl@atlassynapseai.com',
  'gloriabarsoum@atlassynapseai.com',
];

async function seedUsers() {
  console.log('Seeding users in Supabase Auth...');

  for (const email of emails) {
    try {
      // List all users and check if this email exists
      const { data: allUsers } = await supabase.auth.admin.listUsers();
      const existingUser = allUsers?.users?.find(u => u.email === email);

      if (existingUser) {
        console.log(`✓ User ${email} already exists`);
        continue;
      }

      // Create the user with a temporary password
      const tempPassword = Math.random().toString(36).slice(-12);
      const { data, error } = await supabase.auth.admin.createUser({
        email,
        password: tempPassword,
        email_confirm: true, // Pre-confirm the email
        user_metadata: {
          role: 'admin',
          created_via: 'seeding',
        },
      });

      if (error) {
        console.error(`✗ Error creating user ${email}:`, error.message);
      } else {
        console.log(`✓ Created user ${email}`);
      }
    } catch (error) {
      console.error(`✗ Error processing ${email}:`, error);
    }
  }

  console.log('\nUser seeding complete!');
}

seedUsers().catch(console.error);
