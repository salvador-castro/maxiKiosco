"use client";

import Link from "next/link";

export default function Home() {
  return (
    <div 
      className="relative flex min-h-screen items-center justify-center overflow-hidden"
      style={{
        backgroundImage: 'url(https://kxaygskhpuykrtysklim.supabase.co/storage/v1/object/public/backgrounds/dashboardPrincipal.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }}
    >
      {/* Gradient Overlay con animación */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-900/40 via-blue-900/50 to-indigo-900/60 animate-gradient"></div>
      
      {/* Elementos decorativos flotantes */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-indigo-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>
      </div>
      
      {/* Contenido principal */}
      <div className="relative z-10 flex flex-col items-center gap-8 px-4">
        {/* Glassmorphism Card */}
        <div className="backdrop-blur-xl bg-white/10 rounded-3xl p-12 shadow-2xl border border-white/20 transform transition-all duration-500 hover:scale-105 hover:bg-white/15">
          <div className="flex flex-col items-center gap-8">
            {/* Logo o título */}
            <div className="text-center space-y-4">
              <h1 className="text-6xl font-bold text-white tracking-tight animate-fade-in">
                Bienvenido
              </h1>
              <div className="h-1 w-24 mx-auto bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 rounded-full"></div>
              <p className="text-xl text-gray-200 font-light mt-4 animate-fade-in-delay">
                Tu sistema de gestión inteligente
              </p>
            </div>

            {/* Botón principal con efectos modernos */}
            <Link
              href="/login"
              className="group relative px-12 py-5 bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 text-white font-semibold text-lg rounded-2xl shadow-2xl transition-all duration-300 hover:shadow-purple-500/50 hover:scale-110 overflow-hidden"
            >
              {/* Efecto de brillo animado */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
              
              <span className="relative z-10 flex items-center gap-3">
                Iniciar Sesión
                <svg 
                  className="w-5 h-5 transform group-hover:translate-x-1 transition-transform" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </span>
            </Link>

            {/* Indicadores decorativos */}
            <div className="flex gap-3 mt-4">
              <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse"></div>
              <div className="w-2 h-2 bg-pink-400 rounded-full animate-pulse animation-delay-200"></div>
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse animation-delay-400"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
