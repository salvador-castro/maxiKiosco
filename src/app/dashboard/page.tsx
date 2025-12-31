import AdminShell from '@/components/admin/AdminShell'

export const metadata = {
  title: "Dashboard",
};

export default function AdminPage() {
  return (
    <AdminShell>
      <div className='text-slate-200'>Contenido Admin</div>
    </AdminShell>
  )
}
