-- =====================================================================
-- SIGLAD - Esquema base
-- Compatible con PostgreSQL 13+ (probado en 16/17)
-- =====================================================================

-- Reinicia el esquema público (¡borra todo!)
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;

-- Extensiones requeridas
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "citext";

-- Si el rol 'siglad' existe, hacemos dueño del schema
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'siglad') THEN
    ALTER SCHEMA public OWNER TO siglad;
  END IF;
END$$;

-- =====================================================================
-- Tabla: users
-- =====================================================================
CREATE TABLE public.users (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name           VARCHAR(100)         NOT NULL,
  email          CITEXT               NOT NULL UNIQUE,
  password_hash  TEXT                 NOT NULL,
  role           VARCHAR(20)          NOT NULL CHECK (role IN ('TRANSPORTISTA','AGENTE','ADMIN')),
  status         VARCHAR(10)          NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','INACTIVE')),
  created_at     TIMESTAMPTZ          NOT NULL DEFAULT NOW()
);

-- Opcional: índice adicional por rol/estado
CREATE INDEX IF NOT EXISTS ix_users_role     ON public.users(role);
CREATE INDEX IF NOT EXISTS ix_users_status   ON public.users(status);

-- Cambiar ownership si existe el rol
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'siglad') THEN
    ALTER TABLE public.users OWNER TO siglad;
  END IF;
END$$;

-- =====================================================================
-- Catálogos de actores económicos
-- =====================================================================

-- Importadores
CREATE TABLE public.importers (
  id         VARCHAR(15)  PRIMARY KEY,
  nombre     VARCHAR(100) NOT NULL,
  estado     VARCHAR(10)  NOT NULL DEFAULT 'ACTIVO' CHECK (estado IN ('ACTIVO','INACTIVO')),
  created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ix_importers_estado ON public.importers(estado);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'siglad') THEN
    ALTER TABLE public.importers OWNER TO siglad;
  END IF;
END$$;

-- Exportadores
CREATE TABLE public.exporters (
  id         VARCHAR(15)  PRIMARY KEY,
  nombre     VARCHAR(100) NOT NULL,
  estado     VARCHAR(10)  NOT NULL DEFAULT 'ACTIVO' CHECK (estado IN ('ACTIVO','INACTIVO')),
  created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ix_exporters_estado ON public.exporters(estado);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'siglad') THEN
    ALTER TABLE public.exporters OWNER TO siglad;
  END IF;
END$$;

-- =====================================================================
-- Declaraciones (DUCA)
-- =====================================================================
CREATE TABLE public.declarations (
  id                         UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Encabezado
  numero_documento           VARCHAR(20)   NOT NULL UNIQUE,
  fecha_emision              DATE          NOT NULL,
  pais_emisor                CHAR(2)       NOT NULL,
  tipo_operacion             VARCHAR(20)   NOT NULL,

  -- Exportador (valor de la DUCA, no FK obligatoria)
  exportador_id              VARCHAR(15)   NOT NULL,
  exportador_nombre          VARCHAR(100)  NOT NULL,
  exportador_direccion       VARCHAR(120),
  exportador_tel             VARCHAR(15),
  exportador_email           VARCHAR(60),

  -- Importador (valor de la DUCA, no FK obligatoria)
  importador_id              VARCHAR(15)   NOT NULL,
  importador_nombre          VARCHAR(100)  NOT NULL,
  importador_direccion       VARCHAR(120),
  importador_tel             VARCHAR(15),
  importador_email           VARCHAR(60),

  -- Transporte
  medio_transporte           VARCHAR(20)   NOT NULL,
  placa_vehiculo             VARCHAR(10)   NOT NULL,
  conductor_nombre           VARCHAR(80),
  conductor_licencia         VARCHAR(20),
  conductor_pais_licencia    CHAR(2),

  -- Ruta
  ruta_aduana_salida         VARCHAR(50)   NOT NULL,
  ruta_aduana_entrada        VARCHAR(50)   NOT NULL,
  ruta_pais_destino          CHAR(2)       NOT NULL,
  ruta_km_aprox              INTEGER,

  -- Valores
  valor_factura              NUMERIC(12,2),
  gastos_transporte          NUMERIC(10,2),
  seguro                     NUMERIC(10,2),
  otros_gastos               NUMERIC(10,2),
  valor_aduana_total         NUMERIC(12,2) NOT NULL,
  moneda                     CHAR(3)       NOT NULL,

  -- Selectivo (opcional)
  selectivo_codigo           CHAR(1),
  selectivo_descripcion      VARCHAR(60),

  -- Estado del documento (texto de la DUCA)
  estado_documento           VARCHAR(20)   NOT NULL,

  -- Firma
  firma_electronica          VARCHAR(64),

  -- Metadatos
  owner_user_id              UUID          NOT NULL REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  estado                     VARCHAR(15)   NOT NULL DEFAULT 'PENDIENTE' CHECK (estado IN ('PENDIENTE','VALIDADA','RECHAZADA','EN REVISION')),
  created_at                 TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_declarations_owner   ON public.declarations(owner_user_id);
CREATE INDEX IF NOT EXISTS ix_declarations_estado  ON public.declarations(estado);
CREATE INDEX IF NOT EXISTS ix_declarations_created ON public.declarations(created_at DESC);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'siglad') THEN
    ALTER TABLE public.declarations OWNER TO siglad;
  END IF;
END$$;

-- =====================================================================
-- Ítems de la declaración
-- =====================================================================
CREATE TABLE public.declaration_items (
  id               BIGSERIAL     PRIMARY KEY,
  declaration_id   UUID          NOT NULL REFERENCES public.declarations(id) ON UPDATE CASCADE ON DELETE CASCADE,
  linea            INTEGER       NOT NULL,
  descripcion      VARCHAR(120)  NOT NULL,
  cantidad         INTEGER       NOT NULL,
  unidad_medida    VARCHAR(10)   NOT NULL,
  valor_unitario   NUMERIC(10,2) NOT NULL,
  pais_origen      CHAR(2)       NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_decl_items_declaration_linea
  ON public.declaration_items(declaration_id, linea);
CREATE INDEX IF NOT EXISTS ix_decl_items_decl
  ON public.declaration_items(declaration_id);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'siglad') THEN
    ALTER TABLE public.declaration_items OWNER TO siglad;
  END IF;
END$$;

-- =====================================================================
-- Bitácora / Auditoría
-- =====================================================================
CREATE TABLE public.audit_logs (
  id               UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  user_id          UUID         REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL,
  action           VARCHAR(30)  NOT NULL,              -- p.ej. CREATE / UPDATE / DELETE / LOGIN
  entity           VARCHAR(40)  NOT NULL,              -- p.ej. DECLARATION / USER / IMPORTER / EXPORTER
  entity_id        UUID,                               
  operation        VARCHAR(80)  NOT NULL,              -- p.ej. "Registro declaración"
  result           VARCHAR(15)  NOT NULL,              -- EXITO / FALLO
  num_declaracion  VARCHAR(20),
  ip               INET,
  user_agent       TEXT,
  details          TEXT
);

CREATE INDEX IF NOT EXISTS ix_audit_created       ON public.audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS ix_audit_user          ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS ix_audit_entity        ON public.audit_logs(entity, entity_id);
CREATE INDEX IF NOT EXISTS ix_audit_numdeclaracion ON public.audit_logs(num_declaracion);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'siglad') THEN
    ALTER TABLE public.audit_logs OWNER TO siglad;
  END IF;
END$$;

-- =====================================================================
-- Reglas de integridad referencial “suaves” a catálogos
-- (No forzamos FK a importers/exporters porque la DUCA guarda valores
--  “tal como vienen”, pero se puede habilitar si tus flujos lo requieren)
-- =====================================================================

-- Ejemplo de FK opcionales (descomenta si quieres forzar existencia):
-- ALTER TABLE public.declarations
--   ADD CONSTRAINT fk_decl_importer
--   FOREIGN KEY (importador_id) REFERENCES public.importers(id);

-- ALTER TABLE public.declarations
--   ADD CONSTRAINT fk_decl_exporter
--   FOREIGN KEY (exportador_id) REFERENCES public.exporters(id);

-- =====================================================================
-- Listo
-- =====================================================================
