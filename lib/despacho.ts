import type postgres from "postgres";
import { patron } from "./busqueda";
import type { Courier } from "./central";

export type PaqueteD = {
  id: number;
  courier: Courier;
  empaquetado_en: Date;
  cliente: string;
  nombre_completo: string | null;
  ciudad: string | null;
  codigos: number[];
};

// packages already packed whose sales are still por_enviar; one row per package
export async function cargarDespacho(
  q: postgres.Sql,
  busqueda = "", // nick, name, city, package number or a sale number
): Promise<PaqueteD[]> {
  const like = patron(busqueda);
  const numero = patron(busqueda.replace(/^#/, ""));
  return (await q`
    select p.id, p.courier::text courier, p.empaquetado_en, c.nombre cliente, c.nombre_completo, d.ciudad,
           (select array_agg(v.codigo order by v.codigo) from ventas v where v.paquete_id = p.id and v.estado = 'por_enviar') codigos
    from paquetes p
    join clientes c on c.id = p.cliente_id
    left join direcciones_envio d on d.id = p.direccion_envio_id and p.courier is distinct from 'retiro_tienda' -- a pickup has no address to show
    where p.recolectado_en is null
      and exists (select 1 from ventas v where v.paquete_id = p.id and v.estado = 'por_enviar')
      ${
        busqueda
          ? q`and (c.nombre ilike ${like} or c.nombre_completo ilike ${like} or d.ciudad ilike ${like}
                or p.id::text ilike ${numero}
                or exists (select 1 from ventas v where v.paquete_id = p.id and v.estado = 'por_enviar'
                           and v.codigo::text ilike ${numero}))`
          : q``
      }
    order by p.courier, p.empaquetado_en`) as unknown as PaqueteD[];
}
