const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
const supabase = createClient(url, key);

async function inspectData() {
  console.log('\n--- Inspecting customers ---');
  const { data: custs } = await supabase.from('customers').select('id, first_name, last_name, shop_id, created_by_id').limit(5);
  console.log('Sample customers:', custs);

  console.log('\n--- Inspecting leads ---');
  const { data: leads } = await supabase.from('leads').select('id, first_name, last_name, shop_id, created_by_id').limit(5);
  console.log('Sample leads:', leads);

  console.log('\n--- Inspecting orders ---');
  const { data: orders } = await supabase.from('orders').select('order_id, shop_id, customer_id, total_amount').limit(5);
  console.log('Sample orders:', orders);

  console.log('\n--- Inspecting locations ---');
  const { data: locs } = await supabase.from('locations').select('*');
  console.log('Locations:', locs);
}

inspectData().catch(console.error);
