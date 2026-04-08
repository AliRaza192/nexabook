/**
 * Database Seed Script
 * Run with: npx tsx src/db/seed.ts
 */

import { db } from './index';
import { organizations, profiles } from './schema';

async function seed() {
  console.log('🌱 Seeding database...');

  try {
    // Create a demo organization
    const [org] = await db
      .insert(organizations)
      .values({
        name: 'Acme Corporation',
        slug: 'acme-corp',
        ntn: '1234567-8',
        strn: 'ST-123456789',
        address: '123 Business Street',
        city: 'Karachi',
        country: 'Pakistan',
        email: 'info@acmecorp.com',
        phone: '+92-21-12345678',
        planType: 'professional',
        currency: 'PKR',
        fiscalYearStart: '07-01',
      })
      .returning();

    console.log('✅ Created organization:', org.name);

    // Create a demo admin profile
    const [profile] = await db
      .insert(profiles)
      .values({
        userId: 'user_demo_clerk_id', // Replace with actual Clerk user ID
        orgId: org.id,
        role: 'admin',
        fullName: 'John Doe',
        email: 'john@acmecorp.com',
        phone: '+92-300-1234567',
        department: 'Management',
        designation: 'CEO',
      })
      .returning();

    console.log('✅ Created admin profile:', profile.fullName);
    console.log('🎉 Database seeded successfully!');
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  }
}

seed()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => {
    process.exit(0);
  });
