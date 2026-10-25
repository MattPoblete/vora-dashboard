import "server-only";
import type { Sql } from "postgres";

// Numbers for the role dashboards. They run through db(): the user's postgres role + RLS decide what each query can see
// (a vendedor only counts their own pair's lives), so none of these needs its own permission check.
export type Fila = { k: string; v: number };
export type Dia = { dia: string; n: number };

const HOY = `(now() at time zone 'America/Santiago')::date`;
const dia = (col: string) => `(${col} at time zone 'America/Santiago')::date`;

// last 7 Santiago days, oldest first, zero-filled; `fuente` yields rows (d date)
async function ultimos7(q: Sql, fuente: string): Promise<Dia[]> {
  return (await q.unsafe(
    `select to_char(g, 'DD/MM') dia, count(f.d)::int n
     from generate_series(${HOY} - 6, ${HOY}, interval '1 day') g
     left join (${fuente}) f on f.d = g::date group by g order by g`,
  )) as unknown as Dia[];
}

export async function estadVentas(q: Sql) {
  const [hoy] = await q`
    select count(*)::int n, coalesce(sum(v.monto), 0)::int monto
    from ventas v join lives l on l.id = v.live_id and l.inicio is not null
    where (v.creado_en at time zone 'America/Santiago')::date = (now() at time zone 'America/Santiago')::date`;
  const [live] = await q`
    select l.vendedores, l.inicio,
           (select count(*)::int from ventas v where v.live_id = l.id) n,
           (select coalesce(sum(monto), 0)::int from ventas v where v.live_id = l.id) monto
    from lives l where l.inicio is not null and l.fin is null order by l.id desc limit 1`;
  const semana = await ultimos7(
    q,
    `select ${dia("v.creado_en")} d from ventas v join lives l on l.id = v.live_id and l.inicio is not null`,
  );
  const materiales = await q<Fila[]>`
    select lower(trim(v.material)) k, count(*)::int v
    from ventas v join lives l on l.id = v.live_id and l.inicio is not null
    where v.material is not null and v.creado_en > now() - interval '30 days'
    group by 1 order by 2 desc limit 4`;
  return { hoy, live: live ?? null, semana, materiales };
}

export async function estadCentral(q: Sql) {
  const estados = await q<Fila[]>`
    select v.estado::text k, count(*)::int v
    from ventas v join lives l on l.id = v.live_id and l.inicio is not null
    where v.estado in ('reservada', 'esperando_pago', 'pagada') group by 1`;
  const [porCobrar] = await q`
    select coalesce(sum(v.monto), 0)::int monto
    from ventas v join lives l on l.id = v.live_id and l.inicio is not null
    where v.estado in ('reservada', 'esperando_pago')`;
  const [pagos] = await q`
    select count(*)::int n, coalesce(sum(monto), 0)::int monto from pagos
    where validado_en is not null and (validado_en at time zone 'America/Santiago')::date = (now() at time zone 'America/Santiago')::date`;
  const semana = await ultimos7(
    q,
    `select ${dia("cerrado_en")} d from pedidos where cerrado_en is not null`,
  );
  return { estados, porCobrar: porCobrar.monto as number, pagos, semana };
}

export async function estadEmpaque(q: Sql) {
  const [cola] = await q`
    select count(distinct pedido_id)::int pedidos, count(*)::int prendas
    from ventas where estado = 'por_empaquetar' and pedido_id is not null`;
  const couriers = await q<Fila[]>`
    select p.courier::text k, count(*)::int v from pedidos p
    where p.courier is not null
      and exists (select 1 from ventas v where v.pedido_id = p.id and v.estado = 'por_empaquetar')
    group by 1 order by 2 desc`;
  const [viejo] = await q`
    select min(p.cerrado_en) desde from pedidos p
    where exists (select 1 from ventas v where v.pedido_id = p.id and v.estado = 'por_empaquetar')`;
  const semana = await ultimos7(
    q,
    `select ${dia("empaquetado_en")} d from paquetes where empaquetado_en is not null`,
  );
  return { cola, couriers, desde: viejo.desde as Date | null, semana };
}

export async function estadDespacho(q: Sql) {
  const couriers = await q<Fila[]>`
    select courier::text k, count(*)::int v from paquetes
    where recolectado_en is null and empaquetado_en is not null group by 1 order by 2 desc`;
  const [viejo] = await q`
    select min(empaquetado_en) desde from paquetes where recolectado_en is null and empaquetado_en is not null`;
  const semana = await ultimos7(
    q,
    `select ${dia("recolectado_en")} d from paquetes where recolectado_en is not null`,
  );
  return { couriers, desde: viejo.desde as Date | null, semana };
}

export async function estadAdmin(q: Sql) {
  const [t] = await q`
    select count(*)::int ventas,
           coalesce(sum(v.monto) filter (where v.estado not in ('liberada', 'no_habla')), 0)::bigint monto
    from ventas v join lives l on l.id = v.live_id and l.inicio is not null`;
  const [lives] =
    await q`select count(*) filter (where fin is null)::int activos, count(*)::int total from lives where inicio is not null`;
  const estados = await q<Fila[]>`
    select v.estado::text k, count(*)::int v from ventas v join lives l on l.id = v.live_id and l.inicio is not null
    group by 1 order by 2 desc`;
  const parejas = await q<Fila[]>`
    select l.vendedores k, count(*)::int v from ventas v join lives l on l.id = v.live_id
    where l.inicio is not null and l.vendedores is not null and v.creado_en > now() - interval '30 days'
    group by 1 order by 2 desc`;
  const clientes = await q<Fila[]>`
    select c.nombre k, count(*)::int v from ventas v join clientes c on c.id = v.cliente_id
    join lives l on l.id = v.live_id and l.inicio is not null group by c.id order by 2 desc limit 4`;
  const semana = await ultimos7(
    q,
    `select ${dia("v.creado_en")} d from ventas v join lives l on l.id = v.live_id and l.inicio is not null`,
  );
  return { t, lives, estados, parejas, clientes, semana };
}
