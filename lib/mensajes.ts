import {
  COURIERS,
  ETIQUETA,
  REQUERIDOS,
  type Campo,
  type Tarjeta,
  type VentaB,
} from "./central";

// Transfer data comes from .env (TRANSFERENCIA_*). It is read on every call, server side only. A missing value falls
// back to a [PLACEHOLDER] so the copy box warns instead of sending an empty line to a customer.
const env = (clave: string, ejemplo: string) =>
  process.env[clave]?.trim() || ejemplo;

export const transferencia = () => ({
  banco: env("TRANSFERENCIA_BANCO", "[BANCO]"),
  tipoCuenta: env("TRANSFERENCIA_TIPO_CUENTA", "[TIPO DE CUENTA]"),
  numeroCuenta: env("TRANSFERENCIA_NUMERO_CUENTA", "[N° DE CUENTA]"),
  titular: env("TRANSFERENCIA_TITULAR", "[TITULAR]"),
  rut: env("TRANSFERENCIA_RUT", "[RUT]"),
  email: env("TRANSFERENCIA_EMAIL", "[EMAIL PARA COMPROBANTE]"),
});

const clp = (n: number) => "$" + n.toLocaleString("es-CL");

export function mensajeTransferencia(
  nombre: string,
  ventas: VentaB[],
  total: number,
) {
  const t = transferencia();
  const prendas = ventas
    .map(
      (v) =>
        `• #${v.codigo}${v.talla ? ` · talla ${v.talla}` : ""} · ${clp(v.monto)}`,
    )
    .join("\n");
  return `¡Hola ${nombre}! 👋💜 Gracias por comprar en Vora Boutique.

Estas son tus prendas:
${prendas}

Total a transferir: ${clp(total)}

Datos de transferencia:
Banco: ${t.banco}
Tipo de cuenta: ${t.tipoCuenta}
N° de cuenta: ${t.numeroCuenta}
Titular: ${t.titular}
RUT: ${t.rut}
Email: ${t.email}

Cuando hagas la transferencia, mándanos el comprobante por aquí 🙏 y después te pediremos tus datos de envío. ¡Gracias!`;
}

export const primerNombre = (t: Tarjeta) =>
  t.cliente.nombre_completo?.split(" ")[0] ?? t.cliente.nombre;

// asks the client to confirm what we have, or to send what we lack, depending on the courier chosen so far
export function mensajeConfirmacion(t: Tarjeta) {
  const saludo = `¡Hola ${primerNombre(t)}! 😊 Ya recibimos tu pago, ¡gracias!`;
  const courier = t.pedido?.courier;

  if (!courier) {
    const pide = COURIERS.filter((c) => c.id !== "retiro_tienda")
      .map(
        (c) =>
          `${c.label}: ${REQUERIDOS[c.id].map((k) => ETIQUETA[k]).join(", ")}`,
      )
      .join("\n");
    return `${saludo}

Para despachar tu pedido cuéntanos cómo lo quieres recibir:
• Starken
• BlueExpress
• Retiro en tienda

Según el courier necesitamos:
${pide}

Respóndenos con tus datos y lo dejamos listo 📦`;
  }

  const label = COURIERS.find((c) => c.id === courier)!.label;
  if (courier === "retiro_tienda") {
    return `${saludo}

Quedó anotado que retiras en tienda 🛍️ Te avisaremos apenas tu pedido esté listo. ¿Nos confirmas que está bien?`;
  }

  const val: Record<Campo, string | null | undefined> = {
    nombre_completo: t.cliente.nombre_completo,
    rut: t.dir?.rut,
    email: t.dir?.email,
    telefono_envio: t.dir?.telefono,
    direccion: t.dir?.direccion,
    ciudad: t.dir?.ciudad,
  };
  const lineas = REQUERIDOS[courier]
    .map((k) => `${ETIQUETA[k]}: ${val[k]?.trim() || "(falta)"}`)
    .join("\n");
  return `${saludo}

Tu pedido saldrá por ${label} 📦 Por favor confirma que estos datos estén correctos:

${lineas}

Si algo está mal o falta, respóndenos con la corrección 🙏 ¡Gracias!`;
}
