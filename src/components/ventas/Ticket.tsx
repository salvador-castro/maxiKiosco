import React from 'react';
import { QRCodeSVG } from 'qrcode.react';

// Tipos para los datos del ticket
export interface TicketData {
  items: {
    cantidad: number;
    descripcion: string;
    precioUnitario: number;
    subtotal: number;
  }[];
  total: number;
  fecha: string;
  nroComprobante?: string; // Formateado
  
  // Datos crudos para QR
  ptoVta?: number;
  tipoCmp?: number;
  nroCmp?: number;
  
  cae?: string;
  vtoCae?: string;
  formaPago: string;
  cliente?: {
    nombre: string;
    dni?: string; // CUIT/DNI
    tipoDoc?: number; // 99 (Consumidor Final), 80 (CUIT), 96 (DNI)
    domicilio?: string;
  };
}

interface TicketProps {
  data: TicketData | null;
}

export const Ticket = React.forwardRef<HTMLDivElement, TicketProps>(({ data }, ref) => {
  if (!data) return null;

  return (
    <div ref={ref} id="ticket-print-area" className="ticket-container hidden print:block text-black font-mono text-[10px] leading-tight">
      <style>{`
        @media print {
          @page { margin: 0; size: 80mm auto; }
          body { background-color: white; margin: 0; padding: 0; }
          body * { visibility: hidden; height: 0; overflow: hidden; }
          #ticket-print-area, #ticket-print-area * { visibility: visible; height: auto; overflow: visible; }
          #ticket-print-area {
             position: absolute; top: 0; left: 0; width: 80mm;
             padding: 10px; margin: 0; background-color: white;
          }
        }
        .ticket-line { border-bottom: 1px solid black; margin: 4px 0; }
        .ticket-dashed { border-bottom: 1px dashed black; margin: 4px 0; }
      `}</style>
      
      {/* HEADER TIPO FACTURA */}
      <div className="flex flex-col items-center mb-1">
        <h1 className="text-xl font-bold">FACTURA C</h1>
        <p className="font-bold">ORIGINAL Cod.: 011</p>
      </div>
      <div className="ticket-line"></div>

      {/* DATOS EMPRESA */}
      <div className="flex flex-col gap-0.5">
        <p className="font-bold">BUFFET ALBERT EINSTEN SA</p>
        <p>CUIT: 20-39208874-2</p>
        <p>Responsable Monotributo</p>
        <p>Mozart 2300</p>
        <p>Ing. Brutos: 20-39208874-2</p>
        <p>Inicio Actividad: 01/01/2024</p>
      </div>
      <div className="ticket-line"></div>

      {/* DATOS COMPROBANTE */}
      <div className="flex justify-between">
        <span>FECHA: {new Date(data.fecha).toLocaleDateString()}</span>
        <span>Nro. T: {data.nroComprobante || '-----'}</span>
      </div>
      <div className="ticket-line"></div>

      {/* DATOS CLIENTE */}
      <div className="flex flex-col gap-0.5">
        <p>Cliente: Consumidor Final</p>
        <p>Cond. Ante IVA: Consumidor Final</p>
      </div>
      <div className="ticket-line"></div>

      {/* ITEMS */}
      <div className="mb-2">
        <div className="flex justify-between font-bold mb-1">
          <span>Cantidad / Precio Unit.</span>
          <span>IMPORTE</span>
        </div>
        
        {data.items.map((item, index) => (
          <div key={index} className="mb-1">
            <div className="flex gap-2">
              <span>{item.cantidad.toFixed(2)} x {item.precioUnitario.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="truncate pr-2">{item.descripcion}</span>
              <span>${(item.cantidad * item.precioUnitario).toFixed(2)}</span>
            </div>
          </div>
        ))}
      </div>
      <div className="ticket-line"></div>

      {/* TOTALES */}
      <div className="flex justify-between items-end mb-1">
        <span className="font-bold text-sm uppercase">{data.formaPago} Total:</span>
        <span className="font-bold text-xl">${data.total.toFixed(2)}</span>
      </div>
      <div className="ticket-line"></div>

      {/* FISCAL - CAE */}
      {data.cae ? (
        <div className="flex flex-col items-center gap-1 mt-2">
           <div className="flex justify-between w-full px-2 font-bold">
             <span>CAE: {data.cae}</span>
             <span>VTO. CAE: {data.vtoCae ? new Date(data.vtoCae).toLocaleDateString() : ''}</span>
           </div>
           
           {/* QR AFIP Real */}
           <div className="my-2">
             {(() => {
                const qrData = {
                    ver: 1,
                    fecha: data.fecha.split('T')[0], // YYYY-MM-DD
                    cuit: 20392088742, // CUIT EMISOR
                    ptoVta: data.ptoVta || 1,
                    tipoCmp: data.tipoCmp || 11,
                    nroCmp: data.nroCmp || 1,
                    importe: data.total,
                    moneda: "PES",
                    ctz: 1,
                    tipoDocRec: 99, // Consumidor Final
                    nroDocRec: 0,
                    tipoCodAut: "E",
                    codAut: Number(data.cae)
                };
                // Encode base64
                const jsonStr = JSON.stringify(qrData);
                const base64Str = btoa(jsonStr);
                const url = `https://www.afip.gob.ar/fe/qr/?p=${base64Str}`;

                return (
                    <QRCodeSVG 
                        value={url} 
                        size={90} 
                        level="M" 
                        includeMargin={false}
                    />
                );
             })()}
           </div>

           <div className="flex flex-col items-center">
             <span className="font-bold text-lg italic tracking-widest">AFIP</span>
             <span className="text-[8px]">Comprobante Autorizado</span>
             <p className="text-[8px] text-center mt-1 w-4/5 leading-tight">
               Esta Administración Federal no se responsabiliza por los datos ingresados en el detalle de la operación
             </p>
           </div>
        </div>
      ) : (
        <div className="text-center italic mt-2">
          Documento no válido como factura
        </div>
      )}
    </div>
  );
});

Ticket.displayName = 'Ticket';
