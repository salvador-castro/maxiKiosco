const { createClient } = require('@supabase/supabase-js');

// Read from environment
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

async function getSchemaInfo() {
  console.log('=============== PRODUCTOS ===============');
  const { data: prod, error: prodError } = await supabase
    .from('productos')
    .select('*')
    .limit(2);
  
  if (prodError) console.error('Error:', prodError.message);
  else if (prod && prod.length > 0) {
    console.log('Columns:', Object.keys(prod[0]).join(', '));
    console.log('Sample:', JSON.stringify(prod[0], null, 2));
  } else {
    console.log('No data');
  }

  console.log('\n=============== CATEGORIAS ===============');
  const { data: cat, error: catError } = await supabase
    .from('categorias')
    .select('*')
    .limit(2);
  
  if (catError) console.error('Error:', catError.message);
  else if (cat && cat.length > 0) {
    console.log('Columns:', Object.keys(cat[0]).join(', '));
    console.log('Sample:', JSON.stringify(cat[0], null, 2));
  } else {
    console.log('No data');
  }

  console.log('\n=============== VENTAS ===============');
  const { data: ventas, error: ventasError } = await supabase
    .from('ventas')
    .select('*')
    .limit(2);
  
  if (ventasError) console.error('Error:', ventasError.message);
  else if (ventas && ventas.length > 0) {
    console.log('Columns:', Object.keys(ventas[0]).join(', '));
    console.log('Sample:', JSON.stringify(ventas[0], null, 2));
  } else {
    console.log('No data');
  }

  console.log('\n=============== VENTA_ITEMS ===============');
  const { data: items, error: itemsError } = await supabase
    .from('venta_items')
    .select('*')
    .limit(2);
  
  if (itemsError) console.error('Error:', itemsError.message);
  else if (items && items.length > 0) {
    console.log('Columns:', Object.keys(items[0]).join(', '));
    console.log('Sample:', JSON.stringify(items[0], null, 2));
  } else {
    console.log('No data');
  }

  console.log('\n=============== STOCK_SEDE ===============');
  const { data: stock, error: stockError } = await supabase
    .from('stock_sede')
    .select('*')
    .limit(2);
  
  if (stockError) console.error('Error:', stockError.message);
  else if (stock && stock.length > 0) {
    console.log('Columns:', Object.keys(stock[0]).join(', '));
    console.log('Sample:', JSON.stringify(stock[0], null, 2));
  } else {
    console.log('No data');
  }

  console.log('\n=============== PAGOS ===============');
  const { data: pagos, error: pagosError } = await supabase
    .from('pagos')
    .select('*')
    .limit(2);
  
  if (pagosError) console.error('Error:', pagosError.message);
  else if (pagos && pagos.length > 0) {
    console.log('Columns:', Object.keys(pagos[0]).join(', '));
    console.log('Sample:', JSON.stringify(pagos[0], null, 2));
  } else {
    console.log('No data');
  }

  process.exit(0);
}

getSchemaInfo().catch((e) => {
  console.error('Fatal error:', e);
  process.exit(1);
});
