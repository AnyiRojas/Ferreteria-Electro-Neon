-- Migración: productos agotados NO se desactivan automáticamente
-- Al llegar a stock = 0 el producto sigue activo (visible en inventario)
-- para que el administrador pueda reabastecer editando la cantidad.
--
-- Ejecutar en el SQL Editor de Supabase.

create or replace function process_sale(
  p_items          jsonb,
  p_total          numeric,
  p_discount       numeric,
  p_payment_method text,
  p_cash_received  numeric,
  p_change_given   numeric,
  p_notes          text
)
returns uuid language plpgsql as $$
declare
  v_sale_id uuid;
  v_item    jsonb;
begin
  insert into sales (total, discount, payment_method, cash_received, change_given, notes)
  values (p_total, p_discount, p_payment_method, p_cash_received, p_change_given, p_notes)
  returning id into v_sale_id;

  for v_item in select * from jsonb_array_elements(p_items) loop
    insert into sale_items (sale_id, product_id, quantity, unit_price, subtotal)
    values (
      v_sale_id,
      (v_item->>'product_id')::uuid,
      (v_item->>'quantity')::integer,
      (v_item->>'unit_price')::numeric,
      (v_item->>'subtotal')::numeric
    );

    -- Solo actualiza el stock; NO toca active para que el producto
    -- permanezca visible aunque llegue a 0.
    update products
    set stock = greatest(0, stock - (v_item->>'quantity')::integer)
    where id = (v_item->>'product_id')::uuid;

    insert into stock_movements (product_id, type, quantity, reason, reference_id)
    values (
      (v_item->>'product_id')::uuid,
      'out',
      (v_item->>'quantity')::integer,
      'Venta',
      v_sale_id
    );
  end loop;

  return v_sale_id;
end;
$$;
