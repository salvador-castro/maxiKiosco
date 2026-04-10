export type UserRole = 'vendedor' | 'encargado' | 'admin'
export type Shift = 'mañana' | 'tarde' | 'noche'
export type PaymentMethod = 'efectivo' | 'debito' | 'transferencia'
export type FiscalType = 'comanda' | 'factura_b' | 'factura_c' | 'ticket'
export type SessionStatus = 'open' | 'closed'
export type SaleStatus = 'completed' | 'cancelled'
export type PromotionType = '2x1' | 'combo' | 'descuento' | 'porcentaje'
export type PromotionItemRole = 'trigger' | 'reward' | 'component'

export interface Database {
  public: {
    Tables: {
      branches: {
        Row: Branch
        Insert: Omit<Branch, 'id' | 'created_at'>
        Update: Partial<Omit<Branch, 'id' | 'created_at'>>
      }
      profiles: {
        Row: Profile
        Insert: Omit<Profile, 'created_at' | 'updated_at'>
        Update: Partial<Omit<Profile, 'id' | 'created_at'>>
      }
      suppliers: {
        Row: Supplier
        Insert: Omit<Supplier, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Supplier, 'id' | 'created_at'>>
      }
      categories: {
        Row: Category
        Insert: Omit<Category, 'id'>
        Update: Partial<Omit<Category, 'id'>>
      }
      products: {
        Row: Product
        Insert: Omit<Product, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Product, 'id' | 'created_at'>>
      }
      stock: {
        Row: Stock
        Insert: Omit<Stock, 'id' | 'updated_at'>
        Update: Partial<Omit<Stock, 'id'>>
      }
      promotions: {
        Row: Promotion
        Insert: Omit<Promotion, 'id' | 'created_at'>
        Update: Partial<Omit<Promotion, 'id' | 'created_at'>>
      }
      promotion_items: {
        Row: PromotionItem
        Insert: Omit<PromotionItem, 'id'>
        Update: Partial<Omit<PromotionItem, 'id'>>
      }
      cash_registers: {
        Row: CashRegister
        Insert: Omit<CashRegister, 'id' | 'created_at'>
        Update: Partial<Omit<CashRegister, 'id' | 'created_at'>>
      }
      cash_sessions: {
        Row: CashSession
        Insert: Omit<CashSession, 'id' | 'opened_at' | 'created_at'>
        Update: Partial<Omit<CashSession, 'id' | 'created_at'>>
      }
      sales: {
        Row: Sale
        Insert: Omit<Sale, 'id' | 'created_at'>
        Update: Partial<Omit<Sale, 'id' | 'created_at'>>
      }
      sale_items: {
        Row: SaleItem
        Insert: Omit<SaleItem, 'id'>
        Update: Partial<Omit<SaleItem, 'id'>>
      }
    }
  }
}

export interface Branch {
  id: string
  name: string
  address: string | null
  created_at: string
}

export interface Profile {
  id: string
  full_name: string
  role: UserRole
  branch_id: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Supplier {
  id: string
  name: string
  contact_name: string | null
  phone: string | null
  email: string | null
  address: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface Category {
  id: string
  name: string
  description: string | null
}

export interface Product {
  id: string
  name: string
  barcode: string | null
  category_id: string | null
  supplier_id: string | null
  price: number
  cost: number | null
  unit: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Stock {
  id: string
  product_id: string
  branch_id: string
  quantity: number
  min_quantity: number
  updated_at: string
}

export interface Promotion {
  id: string
  name: string
  description: string | null
  type: PromotionType
  discount_amount: number | null
  discount_percentage: number | null
  price: number | null
  branch_id: string | null
  is_active: boolean
  starts_at: string | null
  ends_at: string | null
  created_at: string
}

export interface PromotionItem {
  id: string
  promotion_id: string
  product_id: string
  quantity: number
  role: PromotionItemRole
}

export interface CashRegister {
  id: string
  name: string
  branch_id: string
  is_active: boolean
  created_at: string
}

export interface CashSession {
  id: string
  cash_register_id: string
  user_id: string
  shift: Shift
  status: SessionStatus
  opening_amount: number
  closing_cash_amount: number | null
  closing_transfer_amount: number | null
  closing_debit_amount: number | null
  notes: string | null
  opened_at: string
  closed_at: string | null
  created_at: string
}

export interface Sale {
  id: string
  cash_session_id: string
  user_id: string
  branch_id: string
  payment_method: PaymentMethod
  subtotal: number
  discount: number
  total: number
  status: SaleStatus
  fiscal_type: FiscalType | null
  fiscal_number: string | null
  created_at: string
}

export interface SaleItem {
  id: string
  sale_id: string
  product_id: string | null
  promotion_id: string | null
  product_name: string
  quantity: number
  unit_price: number
  discount: number
  subtotal: number
}

// Tipos con joins frecuentes
export interface SaleWithItems extends Sale {
  sale_items: SaleItem[]
  profile: Pick<Profile, 'full_name'>
}

export interface PromotionWithItems extends Promotion {
  promotion_items: (PromotionItem & { products: Product })[]
}

export interface StockWithProduct extends Stock {
  products: Product & {
    categories: Category | null
  }
}

export interface CashSessionWithRegister extends CashSession {
  cash_registers: CashRegister & {
    branches: Branch
  }
  profiles: Pick<Profile, 'full_name'>
}
