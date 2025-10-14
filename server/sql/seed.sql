INSERT INTO users (name, email, password_hash, role, status) VALUES
('Administrador', 'admin@siglad.local', '$2b$12$1N9m7ktbw3mfEaTfOhBpduFuJ6dA2u24MIEIMS2/1ID0SxEAx4fQu', 'ADMIN', 'ACTIVE'),
('Transportista Demo', 'trans@siglad.local', '$2b$12$HqruUvJVFp600VNk0nkgcejCAzE9cJwW6IsIL1IfYUgqKc2GeCm.e', 'TRANSPORTISTA', 'ACTIVE'),
('Agente Aduanero Demo', 'agente@siglad.local', '$2b$12$qGIXF2JW7bB0rd/FllYCju4NP/Y6BP5jJ5vCjX9K3cVM8z3ol6Fs2', 'AGENTE', 'ACTIVE');

WITH t AS (SELECT id FROM users WHERE email='trans@siglad.local')
INSERT INTO declarations (numero_documento, fecha_emision, pais_emisor, tipo_operacion, exportador_nombre, importador_nombre, medio_transporte, valor_aduana_total, moneda, estado_documento, estado, owner_user_id)
SELECT 'GT2025DUCA001234','2025-10-04','GT','IMPORTACION','Comercial del Norte S.A.','Distribuciones del Sur Ltda.','TERRESTRE',34400.00,'USD','CONFIRMADO','PENDIENTE', t.id FROM t;

WITH d AS (SELECT id FROM declarations WHERE numero_documento='GT2025DUCA001234')
INSERT INTO declaration_items (declaration_id, linea, descripcion, cantidad, unidad_medida, valor_unitario, pais_origen)
SELECT d.id, 1, 'Componentes electrónicos', 500, 'CAJA', 45.50, 'CN' FROM d
UNION ALL
SELECT d.id, 2, 'Cables industriales', 200, 'ROLLO', 20.00, 'MX' FROM d;
