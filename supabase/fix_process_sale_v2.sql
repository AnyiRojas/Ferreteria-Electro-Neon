-- Eliminar la versión antigua de process_sale (7 parámetros)
drop function if exists process_sale(
  jsonb, numeric, numeric, text, numeric, numeric, text
);
