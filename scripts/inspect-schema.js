const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function inspectSchema() {
  const tables = ['productos', 'ventas', 'venta_items', 'stock_sede', 'categorias', 'caja_sesiones', 'pagos', 'facturas'];
  
  for (const table of tables) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`TABLE: ${table}`);
    console.log('='.repeat(60));
    
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .limit(1);
    
    if (error) {
      console.log(`Error: ${error.message}`);
    } else if (data && data.length > 0) {
      console.log('Columns:', Object.keys(data[0]).join(', '));
      console.log('\nSample data:', JSON.stringify(data[0], null, 2));
    } else {
      console.log('No data found (table might be empty)');
      // Try to get table structure from information_schema
    }
  }
}

inspectSchema().catch(console.error);
