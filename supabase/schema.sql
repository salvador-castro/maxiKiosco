-- ============================================================
-- BUFFET ALBERT EINSTEIN - Schema Supabase
-- Ejecutar en: Supabase Dashboard > SQL Editor
-- ============================================================

-- ============================================================
-- 1. SUCURSALES
-- ============================================================
CREATE TABLE IF NOT EXISTS branches (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insertar las 2 sucursales (solo si no existen)
INSERT INTO branches (name, address)
SELECT 'Sede Medrano', 'Avenida Medrano 951'
WHERE NOT EXISTS (SELECT 1 FROM branches WHERE name = 'Sede Medrano');
INSERT INTO branches (name, address)
SELECT 'Sede Campus', 'Mozart 2300'
WHERE NOT EXISTS (SELECT 1 FROM branches WHERE name = 'Sede Campus');

-- ============================================================
-- 2. PERFILES DE USUARIO (extiende auth.users)
-- ============================================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('vendedor', 'encargado', 'admin')),
  branch_id UUID REFERENCES branches(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger para crear perfil automáticamente al registrar usuario
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'role', 'vendedor')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS profiles_updated_at ON profiles;
CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- 3. PROVEEDORES
-- ============================================================
CREATE TABLE IF NOT EXISTS suppliers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  contact_name TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

DROP TRIGGER IF EXISTS suppliers_updated_at ON suppliers;
CREATE TRIGGER suppliers_updated_at
  BEFORE UPDATE ON suppliers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- 4. CATEGORÍAS
-- ============================================================
CREATE TABLE IF NOT EXISTS categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT
);

-- Categorías iniciales para buffet/kiosko (solo si no existen)
INSERT INTO categories (name)
SELECT unnest(ARRAY['Bebidas','Sandwiches','Medialunas y facturas','Café y infusiones','Snacks','Lácteos','Varios']) AS name
WHERE NOT EXISTS (SELECT 1 FROM categories LIMIT 1);

-- ============================================================
-- 5. PRODUCTOS
-- ============================================================
CREATE TABLE IF NOT EXISTS products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  barcode TEXT UNIQUE,
  category_id UUID REFERENCES categories(id),
  supplier_id UUID REFERENCES suppliers(id),
  price DECIMAL(10,2) NOT NULL DEFAULT 0,
  cost DECIMAL(10,2),
  unit TEXT DEFAULT 'unidad',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

DROP TRIGGER IF EXISTS products_updated_at ON products;
CREATE TRIGGER products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- 6. STOCK POR SUCURSAL
-- ============================================================
CREATE TABLE IF NOT EXISTS stock (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE NOT NULL,
  branch_id UUID REFERENCES branches(id) ON DELETE CASCADE NOT NULL,
  quantity DECIMAL(10,3) DEFAULT 0,
  min_quantity DECIMAL(10,3) DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(product_id, branch_id)
);

DROP TRIGGER IF EXISTS stock_updated_at ON stock;
CREATE TRIGGER stock_updated_at
  BEFORE UPDATE ON stock
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- 7. PROMOCIONES
-- ============================================================
CREATE TABLE IF NOT EXISTS promotions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL CHECK (type IN ('2x1', 'combo', 'descuento', 'porcentaje')),
  discount_amount DECIMAL(10,2),
  discount_percentage DECIMAL(5,2),
  price DECIMAL(10,2),
  branch_id UUID REFERENCES branches(id),  -- NULL = todas las sucursales
  is_active BOOLEAN DEFAULT true,
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS promotion_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  promotion_id UUID REFERENCES promotions(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES products(id) NOT NULL,
  quantity INTEGER DEFAULT 1,
  role TEXT NOT NULL CHECK (role IN ('trigger', 'reward', 'component'))
  -- trigger = el producto que activa la promo
  -- reward  = el producto que se lleva gratis/descuento
  -- component = parte de un combo (precio fijo)
);

-- ============================================================
-- 8. CAJAS
-- ============================================================
CREATE TABLE IF NOT EXISTS cash_registers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  branch_id UUID REFERENCES branches(id) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(name, branch_id)
);

-- Insertar cajas de ejemplo (2 en sucursal 1, 7 en sucursal 2)
-- Se pueden agregar más desde el panel de admin
-- Insertar cajas solo si no existen aún
DO $$
DECLARE
  medrano_id UUID;
  campus_id UUID;
BEGIN
  SELECT id INTO medrano_id FROM branches WHERE name = 'Sede Medrano';
  SELECT id INTO campus_id FROM branches WHERE name = 'Sede Campus';

  IF medrano_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM cash_registers WHERE branch_id = medrano_id) THEN
    INSERT INTO cash_registers (name, branch_id) VALUES ('Caja 1', medrano_id), ('Caja 2', medrano_id);
  END IF;

  IF campus_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM cash_registers WHERE branch_id = campus_id) THEN
    INSERT INTO cash_registers (name, branch_id)
    SELECT 'Caja ' || n, campus_id FROM generate_series(1,7) AS n;
  END IF;
END $$;

-- ============================================================
-- 9. SESIONES DE CAJA (TURNOS)
-- ============================================================
CREATE TABLE IF NOT EXISTS cash_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  cash_register_id UUID REFERENCES cash_registers(id) NOT NULL,
  user_id UUID REFERENCES profiles(id) NOT NULL,
  shift TEXT NOT NULL CHECK (shift IN ('mañana', 'tarde', 'noche')),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  opening_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  closing_cash_amount DECIMAL(10,2),
  closing_transfer_amount DECIMAL(10,2),
  closing_debit_amount DECIMAL(10,2),
  notes TEXT,
  opened_at TIMESTAMPTZ DEFAULT NOW(),
  closed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 10. VENTAS
-- ============================================================
CREATE TABLE IF NOT EXISTS sales (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  cash_session_id UUID REFERENCES cash_sessions(id) NOT NULL,
  user_id UUID REFERENCES profiles(id) NOT NULL,
  branch_id UUID REFERENCES branches(id) NOT NULL,
  payment_method TEXT NOT NULL CHECK (payment_method IN ('efectivo', 'debito', 'transferencia')),
  subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
  discount DECIMAL(10,2) NOT NULL DEFAULT 0,
  total DECIMAL(10,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'cancelled')),
  fiscal_type TEXT CHECK (fiscal_type IN ('comanda', 'factura_b', 'factura_c', 'ticket')),
  fiscal_number TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sale_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sale_id UUID REFERENCES sales(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES products(id),
  promotion_id UUID REFERENCES promotions(id),
  product_name TEXT NOT NULL,  -- snapshot del nombre
  quantity DECIMAL(10,3) NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  discount DECIMAL(10,2) NOT NULL DEFAULT 0,
  subtotal DECIMAL(10,2) NOT NULL
);

-- ============================================================
-- 11. ROW LEVEL SECURITY (RLS)
-- ============================================================

-- Limpiar policies existentes para evitar duplicados
DROP POLICY IF EXISTS "branches_select" ON branches;
DROP POLICY IF EXISTS "branches_modify" ON branches;
DROP POLICY IF EXISTS "profiles_select_own" ON profiles;
DROP POLICY IF EXISTS "profiles_insert" ON profiles;
DROP POLICY IF EXISTS "profiles_update" ON profiles;
DROP POLICY IF EXISTS "profiles_delete" ON profiles;
DROP POLICY IF EXISTS "suppliers_select" ON suppliers;
DROP POLICY IF EXISTS "suppliers_modify" ON suppliers;
DROP POLICY IF EXISTS "categories_select" ON categories;
DROP POLICY IF EXISTS "categories_modify" ON categories;
DROP POLICY IF EXISTS "products_select" ON products;
DROP POLICY IF EXISTS "products_modify" ON products;
DROP POLICY IF EXISTS "stock_select" ON stock;
DROP POLICY IF EXISTS "stock_modify" ON stock;
DROP POLICY IF EXISTS "promotions_select" ON promotions;
DROP POLICY IF EXISTS "promotions_modify" ON promotions;
DROP POLICY IF EXISTS "promotion_items_select" ON promotion_items;
DROP POLICY IF EXISTS "promotion_items_modify" ON promotion_items;
DROP POLICY IF EXISTS "cash_registers_select" ON cash_registers;
DROP POLICY IF EXISTS "cash_registers_modify" ON cash_registers;
DROP POLICY IF EXISTS "cash_sessions_select" ON cash_sessions;
DROP POLICY IF EXISTS "cash_sessions_insert" ON cash_sessions;
DROP POLICY IF EXISTS "cash_sessions_update" ON cash_sessions;
DROP POLICY IF EXISTS "sales_select" ON sales;
DROP POLICY IF EXISTS "sales_insert" ON sales;
DROP POLICY IF EXISTS "sales_update" ON sales;
DROP POLICY IF EXISTS "sale_items_select" ON sale_items;
DROP POLICY IF EXISTS "sale_items_insert" ON sale_items;

ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE promotion_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_registers ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;

-- Función helper para obtener el rol del usuario actual
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION get_user_branch()
RETURNS UUID AS $$
  SELECT branch_id FROM profiles WHERE id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- BRANCHES: todos los autenticados pueden leer
CREATE POLICY "branches_select" ON branches FOR SELECT TO authenticated USING (true);
CREATE POLICY "branches_modify" ON branches FOR ALL TO authenticated
  USING (get_user_role() = 'admin');

-- PROFILES: cada uno ve el suyo; encargado y admin ven todos
CREATE POLICY "profiles_select_own" ON profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR get_user_role() IN ('encargado', 'admin'));
-- El trigger handle_new_user usa SECURITY DEFINER (bypassa RLS), pero por si acaso
-- permitimos insert cuando el id coincide con el usuario autenticado (primer login)
CREATE POLICY "profiles_insert" ON profiles FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid() OR get_user_role() IN ('encargado', 'admin'));
CREATE POLICY "profiles_update" ON profiles FOR UPDATE TO authenticated
  USING (id = auth.uid() OR get_user_role() IN ('encargado', 'admin'));
CREATE POLICY "profiles_delete" ON profiles FOR DELETE TO authenticated
  USING (get_user_role() IN ('encargado', 'admin'));

-- SUPPLIERS: solo admin CRUD, todos leen
CREATE POLICY "suppliers_select" ON suppliers FOR SELECT TO authenticated USING (true);
CREATE POLICY "suppliers_modify" ON suppliers FOR ALL TO authenticated
  USING (get_user_role() = 'admin');

-- CATEGORIES: todos leen, encargado/admin modifican
CREATE POLICY "categories_select" ON categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "categories_modify" ON categories FOR ALL TO authenticated
  USING (get_user_role() IN ('encargado', 'admin'));

-- PRODUCTS: todos leen, encargado/admin modifican
CREATE POLICY "products_select" ON products FOR SELECT TO authenticated USING (true);
CREATE POLICY "products_modify" ON products FOR ALL TO authenticated
  USING (get_user_role() IN ('encargado', 'admin'));

-- STOCK: todos leen, encargado/admin modifican
CREATE POLICY "stock_select" ON stock FOR SELECT TO authenticated USING (true);
CREATE POLICY "stock_modify" ON stock FOR ALL TO authenticated
  USING (get_user_role() IN ('encargado', 'admin'));

-- PROMOTIONS: todos leen, encargado/admin modifican
CREATE POLICY "promotions_select" ON promotions FOR SELECT TO authenticated USING (true);
CREATE POLICY "promotions_modify" ON promotions FOR ALL TO authenticated
  USING (get_user_role() IN ('encargado', 'admin'));

CREATE POLICY "promotion_items_select" ON promotion_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "promotion_items_modify" ON promotion_items FOR ALL TO authenticated
  USING (get_user_role() IN ('encargado', 'admin'));

-- CASH REGISTERS: todos leen, encargado/admin modifican
CREATE POLICY "cash_registers_select" ON cash_registers FOR SELECT TO authenticated USING (true);
CREATE POLICY "cash_registers_modify" ON cash_registers FOR ALL TO authenticated
  USING (get_user_role() IN ('encargado', 'admin'));

-- CASH SESSIONS: vendedor ve las suyas; encargado/admin ven todas de su sucursal; admin ve todas
CREATE POLICY "cash_sessions_select" ON cash_sessions FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR get_user_role() IN ('encargado', 'admin')
  );
CREATE POLICY "cash_sessions_insert" ON cash_sessions FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "cash_sessions_update" ON cash_sessions FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR get_user_role() IN ('encargado', 'admin'));

-- SALES: vendedor ve las suyas; encargado/admin ven todas
CREATE POLICY "sales_select" ON sales FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR get_user_role() IN ('encargado', 'admin'));
CREATE POLICY "sales_insert" ON sales FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "sales_update" ON sales FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR get_user_role() IN ('encargado', 'admin'));

CREATE POLICY "sale_items_select" ON sale_items FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM sales
      WHERE sales.id = sale_items.sale_id
        AND (sales.user_id = auth.uid() OR get_user_role() IN ('encargado', 'admin'))
    )
  );
CREATE POLICY "sale_items_insert" ON sale_items FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM sales
      WHERE sales.id = sale_items.sale_id AND sales.user_id = auth.uid()
    )
  );

-- ============================================================
-- 12. FUNCIÓN PARA DESCONTAR STOCK EN UNA VENTA
-- ============================================================
CREATE OR REPLACE FUNCTION deduct_stock_on_sale()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.product_id IS NOT NULL THEN
    UPDATE stock
    SET quantity = quantity - NEW.quantity
    WHERE product_id = NEW.product_id
      AND branch_id = (
        SELECT branch_id FROM sales WHERE id = NEW.sale_id
      );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS deduct_stock_trigger ON sale_items;
CREATE TRIGGER deduct_stock_trigger
  AFTER INSERT ON sale_items
  FOR EACH ROW EXECUTE FUNCTION deduct_stock_on_sale();

-- ============================================================
-- 13. FUNCIÓN PARA RESTAURAR STOCK EN VENTA CANCELADA
-- ============================================================
CREATE OR REPLACE FUNCTION restore_stock_on_cancel()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'cancelled' AND OLD.status = 'completed' THEN
    UPDATE stock s
    SET quantity = quantity + si.quantity
    FROM sale_items si
    WHERE si.sale_id = NEW.id
      AND si.product_id IS NOT NULL
      AND s.product_id = si.product_id
      AND s.branch_id = NEW.branch_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS restore_stock_trigger ON sales;
CREATE TRIGGER restore_stock_trigger
  AFTER UPDATE ON sales
  FOR EACH ROW EXECUTE FUNCTION restore_stock_on_cancel();
