import TopNavbarShell from '@/components/layout/TopNavbarShell'
import "./globals.css";

export const metadata = {
  title: {
    default: "Albert Einstein",
    template: "%s - Albert Einstein",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="bg-slate-950 text-slate-100">
        <TopNavbarShell />
        {children}
      </body>
    </html>
  )
}
