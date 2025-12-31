
export function formatCurrency(amount: number): string {
    return new Intl.NumberFormat("es-AR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(amount);
}

export function numeroALetras(amount: number): string {
    const enteros = Math.floor(amount);
    const centavos = Math.round((amount - enteros) * 100);

    const letrasEnteros = convertirNumero(enteros);

    if (centavos === 0) {
        return `${letrasEnteros} PESOS`;
    } else {
        const letrasCentavos = convertirNumero(centavos);
        return `${letrasEnteros} CON ${letrasCentavos}`;
    }
}

function convertirNumero(n: number): string {
    if (n === 0) return "CERO";
    if (n < 0) return "MENOS " + convertirNumero(Math.abs(n));

    const UNIDADES = ["", "UN", "DOS", "TRES", "CUATRO", "CINCO", "SEIS", "SIETE", "OCHO", "NUEVE"];
    const DECENAS = ["", "DIEZ", "VEINTE", "TREINTA", "CUARENTA", "CINCUENTA", "SESENTA", "SETENTA", "OCHENTA", "NOVENTA"];
    const DIEZ_A_VEINTE = ["DIEZ", "ONCE", "DOCE", "TRECE", "CATORCE", "QUINCE", "DIECISEIS", "DIECISIETE", "DIECIOCHO", "DIECINUEVE"];
    const CENTENAS = ["", "CIENTO", "DOSCIENTOS", "TRESCIENTOS", "CUATROCIENTOS", "QUINIENTOS", "SEISCIENTOS", "SETECIENTOS", "OCHOCIENTOS", "NOVECIENTOS"];

    let output = "";

    if (n >= 1000000) {
        const millones = Math.floor(n / 1000000);
        const resto = n % 1000000;
        if (millones === 1) output += "UN MILLON";
        else output += convertirNumero(millones) + " MILLONES";

        if (resto > 0) output += " " + convertirNumero(resto);
        return output;
    }

    if (n >= 1000) {
        const miles = Math.floor(n / 1000);
        const resto = n % 1000;
        if (miles === 1) output += "MIL";
        else output += convertirNumero(miles) + " MIL";

        if (resto > 0) output += " " + convertirNumero(resto);
        return output;
    }

    if (n >= 100) {
        if (n === 100) return "CIEN";
        const centenas = Math.floor(n / 100);
        const resto = n % 100;
        output += CENTENAS[centenas];
        if (resto > 0) output += " " + convertirNumero(resto);
        return output;
    }

    if (n >= 20) {
        const decenas = Math.floor(n / 10);
        const resto = n % 10;
        if (decenas === 2 && resto > 0) return "VEINTI" + UNIDADES[resto].slice(resto === 1 ? 0 : 0); // VEINTIUNO vs VEINTIUN handled later?
        // simple approach for 21-29: Veintiuno... 
        // Correct spanish: 21 -> Veintiuno (noun) but Veintiún (adj). 
        // "SON VEINTIUN PESOS". 
        // My array UNIDADES has "UN". 
        // Let's fix 20s.
        if (decenas === 2) {
            if (resto === 0) return "VEINTE";
            // 21 -> VEINTIUN (prefix-like). But strictly it's "VEINTIÚN" before masc noun.
            // We will assume simpler forms or improve logic.
            // Simplified: VEINTI + UNIDADES[resto]
            return "VEINTI" + (resto === 1 ? "UN" : UNIDADES[resto]);
        }

        output += DECENAS[decenas];
        if (resto > 0) {
            output += " Y " + (resto === 1 ? "UN" : UNIDADES[resto]);
        }
        return output;
    }

    if (n >= 10 && n < 20) {
        return DIEZ_A_VEINTE[n - 10];
    }

    if (n > 0) {
        // 1 -> UN
        return UNIDADES[n];
    }

    return "";
}
