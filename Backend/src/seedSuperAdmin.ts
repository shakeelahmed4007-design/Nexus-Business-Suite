import { supabaseAdmin } from './config/supabaseAdmin';

async function seedUser(email: string, pass: string, fullName: string, role: string, shopId: string | null = null) {
  let userId: string | undefined;

  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password: pass,
    email_confirm: true,
    user_metadata: {
      full_name: fullName,
      role,
      shop_id: shopId,
    },
  });

  if (error) {
    if (error.message.toLowerCase().includes('already')) {
      const { data: usersData } = await supabaseAdmin.auth.admin.listUsers();
      const existingUser = usersData?.users?.find(u => u.email === email);
      userId = existingUser?.id;
      
      if (userId) {
        await supabaseAdmin.auth.admin.updateUserById(userId, {
          password: pass,
          email_confirm: true,
          user_metadata: {
            full_name: fullName,
            role,
            shop_id: shopId,
          },
        });
      }
    } else {
      console.error(`❌ Error creating user ${email}:`, error.message);
      return null;
    }
  } else {
    userId = data.user.id;
  }

  if (userId) {
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert({
        id: userId,
        email,
        full_name: fullName,
        role: (role === 'admin' ? 'shop_admin' : role === 'sales' ? 'staff' : role) as any,
        shop_id: shopId,
      }, { onConflict: 'id' });

    if (profileError) {
      console.error(`❌ Error updating profile for ${email}:`, profileError.message);
    } else {
      console.log(`✅ Seeded ${role}: ${email}`);
    }
  }

  return userId;
}

async function seedAllUsers() {
  console.log(`⏳ Seeding demo users for Super Admin, Admin, and Sales roles...`);

  try {
    // 1. Create Demo Shop
    let shopId: string | null = null;
    const { data: existingShop } = await supabaseAdmin
      .from('shops')
      .select('id')
      .eq('name', 'Nexus Main Branch')
      .maybeSingle();

    if (existingShop) {
      shopId = existingShop.id;
    } else {
      const { data: newShop, error: shopErr } = await supabaseAdmin
        .from('shops')
        .insert({
          name: 'Nexus Main Branch',
          status: 'active',
          module_access: ['crm', 'pos', 'inventory', 'sales', 'reports'],
        })
        .select()
        .single();

      if (!shopErr && newShop) {
        shopId = newShop.id;
      }
    }

    // 2. Seed Super Admin
    await seedUser(
      process.env.SUPER_ADMIN_EMAIL || 'superadmin@nexus.com',
      'SuperAdmin@123456',
      'Super Admin',
      'super_admin',
      null
    );
    await seedUser(
      'admin@nexus.com',
      'Admin@123456',
      'Super Admin',
      'super_admin',
      null
    );

    // 3. Seed Admin (Branch Manager)
    await seedUser(
      'adminuser@nexus.com',
      'Admin@123456',
      'Branch Admin',
      'admin',
      shopId
    );
    await seedUser(
      'shopadmin@nexus.com',
      'ShopAdmin@123456',
      'Shop Admin',
      'admin',
      shopId
    );

    // 4. Seed Sales User
    await seedUser(
      'sales@nexus.com',
      'Sales@123456',
      'Sales Member',
      'sales',
      shopId
    );
    await seedUser(
      'staff@nexus.com',
      'Staff@123456',
      'Staff Member',
      'sales',
      shopId
    );

    console.log(`-----------------------------------------------`);
    console.log(`🎉 Demo Users Seeded Successfully!`);
    console.log(`1. Super Admin: superadmin@nexus.com / SuperAdmin@123456 (or admin@nexus.com / Admin@123456)`);
    console.log(`2. Admin:       adminuser@nexus.com  / Admin@123456`);
    console.log(`3. Sales:       sales@nexus.com      / Sales@123456`);
    console.log(`-----------------------------------------------`);
  } catch (err: any) {
    console.error('❌ Seed script error:', err.message);
  }
}

seedAllUsers();

