import type postgres from "postgres";
import { patron } from "./busqueda";
import { COURIERS, fono, type Courier } from "./central";

export type PrendaE = {
  id: number;
  codigo: number;
  talla: string | null;
  material: string | null;
  detalle: string | null;
};
export type Paquete = {
  pedido: number;
  cerrado_en: Date;
  courier: Courier;
  cliente: string; // nick
  nombre_completo: string | null;
  telefono: string | null;
  rut: string | null;
  email: string | null;
  telefono_envio: string | null;
  direccion: string | null;
  ciudad: string | null;
  prendas: PrendaE[];
};

export const nombreCourier = (c: Courier) =>
  COURIERS.find((x) => x.id === c)?.label ?? c;

// exactly the fields each courier's label asks for
export function lineasEtiqueta(p: Paquete): [string, string][] {
  const v = (x: string | null) => x?.trim() || "(falta)";
  const tel = (x: string | null) => v(x && fono(x));
  if (p.courier === "starken")
    return [
      ["Nombre", v(p.nombre_completo)],
      ["RUT", v(p.rut)],
      ["Dirección de destino", v(p.direccion)],
      ["Email", v(p.email)],
      ["Ciudad", v(p.ciudad)],
    ];
  if (p.courier === "bluex")
    return [
      ["Nombre", v(p.nombre_completo)],
      ["Dirección", v(p.direccion)],
      ["Teléfono", tel(p.telefono_envio)],
      ["Ciudad", v(p.ciudad)],
    ];
  return [
    ["Cliente", v(p.nombre_completo ?? p.cliente)],
    ["Teléfono", tel(p.telefono)],
  ];
}

export async function cargarEmpaque(
  q: postgres.Sql,
  ids?: number[],
  busqueda = "", // nick, name, phone, order number or a sale number
): Promise<Paquete[]> {
  const like = patron(busqueda);
  const numero = patron(busqueda.replace(/^#/, ""));
  const rows = await q`
    select p.id pedido, p.cerrado_en, p.courier::text courier, c.nombre cliente, c.nombre_completo, c.telefono,
           d.rut, d.email, d.telefono telefono_envio, d.direccion, d.ciudad
    from pedidos p
    join clientes c on c.id = p.cliente_id
    left join direcciones_envio d on d.id = p.direccion_envio_id
    where p.courier is not null
      and exists (select 1 from ventas v where v.pedido_id = p.id and v.estado = 'por_empaquetar')
      ${ids ? q`and p.id in ${q(ids)}` : q``}
      ${
        busqueda
          ? q`and (c.nombre ilike ${like} or c.nombre_completo ilike ${like} or c.telefono ilike ${like}
                or p.id::text ilike ${numero}
                or exists (select 1 from ventas v where v.pedido_id = p.id and v.estado = 'por_empaquetar'
                           and v.codigo::text ilike ${numero}))`
          : q``
      }
    order by c.nombre, p.cerrado_en`;
  if (!rows.length) return [];
  const prendas = await q`
    select id, pedido_id, codigo, talla, material, detalle from ventas
    where pedido_id in ${q(rows.map((r) => r.pedido))} and estado = 'por_empaquetar' order by codigo`;
  return rows.map((r) => ({
    ...r,
    prendas: prendas.filter((x) => x.pedido_id === r.pedido),
  })) as unknown as Paquete[];
}

// badge colors per courier; Starken uses its brand green, so "retiro en tienda" takes the peach from the palette
export const COLOR_COURIER: Record<Courier, string> = {
  starken: "bg-starken/20 text-starken-fg",
  bluex: "bg-info/20 text-info-fg",
  retiro_tienda: "bg-secondary/30 text-text",
};
