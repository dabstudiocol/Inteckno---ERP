-- =============================================================================
-- INTECKNO ERP - ARQUITECTURA DE BASE DE DATOS EMPRESARIAL POSTGRESQL (ACID)
-- Módulo: Inventario Técnico, Kardex Inmutable y Control Operativo STC
-- Compatibilidad: PostgreSQL 14+, Google Cloud SQL, Supabase, Neon
-- =============================================================================

-- Extensiones requeridas
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "btree_gist";

-- Esquema dedicado para la operación ERP
CREATE SCHEMA IF NOT EXISTS erp;
SET search_path TO erp, public;

-- -----------------------------------------------------------------------------
-- 1. CATÁLOGOS BASE
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS inventory_categories (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS warehouses (
    id VARCHAR(50) PRIMARY KEY,
    code VARCHAR(30) UNIQUE NOT NULL,
    name VARCHAR(150) NOT NULL,
    location_type VARCHAR(50) NOT NULL DEFAULT 'BODEGA_PRINCIPAL', -- BODEGA_PRINCIPAL, TALLER_CENTRAL, VEHICULO_CUADRILLA, ESTACION_MONTANA, CUARENTENA
    address TEXT,
    responsible_user_id VARCHAR(50),
    is_active BOOLEAN DEFAULT TRUE
);

-- -----------------------------------------------------------------------------
-- 2. PRODUCTOS Y REPUESTOS TÉCNICOS (CATÁLOGO MAESTRO)
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sku VARCHAR(60) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    category_id VARCHAR(50) REFERENCES inventory_categories(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    unit VARCHAR(30) NOT NULL DEFAULT 'UNIDAD',
    
    -- Costos y Valoración
    cost_price_usd NUMERIC(15, 4) DEFAULT 0.0000 CHECK (cost_price_usd >= 0),
    cost_price_cop NUMERIC(15, 2) DEFAULT 0.00 CHECK (cost_price_cop >= 0),
    
    -- Existencias y Bloqueos
    real_stock NUMERIC(15, 4) DEFAULT 0.0000 CHECK (real_stock >= 0),
    reserved_stock NUMERIC(15, 4) DEFAULT 0.0000 CHECK (reserved_stock >= 0),
    min_stock NUMERIC(15, 4) DEFAULT 0.0000 CHECK (min_stock >= 0),
    available_stock NUMERIC(15, 4) GENERATED ALWAYS AS (GREATEST(0.0000, real_stock - reserved_stock)) STORED,
    
    -- Clasificación Especializada STC / Teleféricos / Ensayos No Destructivos (END / NDT)
    is_critical_spare BOOLEAN DEFAULT FALSE,
    is_homologated_itk BOOLEAN DEFAULT FALSE,
    warehouse_id VARCHAR(50) REFERENCES warehouses(id) ON UPDATE CASCADE ON DELETE SET NULL,
    location_name VARCHAR(100) DEFAULT 'Bodega Principal',
    shelf VARCHAR(50) DEFAULT 'Estante A-1',
    tracking_type VARCHAR(30) DEFAULT 'AGREGADO' CHECK (tracking_type IN ('SERIALIZADO', 'AGREGADO')),
    physical_state VARCHAR(30) DEFAULT 'solido' CHECK (physical_state IN ('solido', 'liquido', 'gas_vapor', 'otro')),
    
    -- Metadatos Técnicos y Documentales
    m365_excel_row_id VARCHAR(100),
    safety_data_sheet_url TEXT,
    technical_data_sheet_url TEXT,
    calibration_info TEXT,
    calibration_expiry_date DATE,
    calibration_is_valid BOOLEAN DEFAULT TRUE,
    
    -- Propiedades dimensionales (Cables y Conductores STC)
    is_dimensional BOOLEAN DEFAULT FALSE,
    cable_diameter_mm NUMERIC(8, 2),
    cable_manufacturer VARCHAR(100),
    
    observations TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_warehouse ON products(warehouse_id);

-- -----------------------------------------------------------------------------
-- 3. KARDEX INMUTABLE (LIBRO DIARIO DE MOVIMIENTOS CONTABLES Y FÍSICOS)
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS inventory_kardex (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    kardex_code VARCHAR(60) UNIQUE NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    product_sku VARCHAR(60) NOT NULL,
    product_name VARCHAR(255) NOT NULL,
    
    -- Tipo de movimiento formal contable
    movement_type VARCHAR(40) NOT NULL CHECK (
        movement_type IN (
            'ENTRADA_COMPRA',
            'SALIDA_PROYECTO',
            'RETORNO_CAMPO',
            'BAJA_MERMA',
            'AJUSTE_INVENTARIO',
            'TRASLADO_BODEGA'
        )
    ),
    
    -- Cuantificación y Balances
    quantity NUMERIC(15, 4) NOT NULL,
    previous_stock NUMERIC(15, 4) NOT NULL CHECK (previous_stock >= 0),
    new_stock NUMERIC(15, 4) NOT NULL CHECK (new_stock >= 0),
    unit_cost_cop NUMERIC(15, 2) DEFAULT 0.00 NOT NULL,
    total_cost_cop NUMERIC(15, 2) DEFAULT 0.00 NOT NULL,
    
    -- Trazabilidad Cruzada con Proyectos y Compras
    project_code VARCHAR(50),
    project_item_code VARCHAR(50),
    remission_number VARCHAR(50),
    purchase_order_number VARCHAR(50),
    
    -- Responsable y Auditoría
    user_id VARCHAR(50) NOT NULL,
    user_name VARCHAR(150) NOT NULL,
    user_email VARCHAR(150),
    source VARCHAR(40) DEFAULT 'erp_web' CHECK (source IN ('erp_web', 'm365_excel_online', 'qr_scanner_movil')),
    
    reason TEXT NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_kardex_product ON inventory_kardex(product_id);
CREATE INDEX IF NOT EXISTS idx_kardex_timestamp ON inventory_kardex(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_kardex_project ON inventory_kardex(project_code);
CREATE INDEX IF NOT EXISTS idx_kardex_remission ON inventory_kardex(remission_number);

-- -----------------------------------------------------------------------------
-- 4. REMISIONES DE SALIDA Y CONTROL DE CONSUMO EN TERRENO
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS dispatch_remissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    remission_number VARCHAR(60) UNIQUE NOT NULL,
    departure_date DATE NOT NULL,
    project_code VARCHAR(50) NOT NULL,
    responsible_technician_name VARCHAR(150) NOT NULL,
    dispatcher_user_id VARCHAR(50) NOT NULL,
    status VARCHAR(30) DEFAULT 'en_campo' CHECK (status IN ('en_campo', 'retornado_parcial', 'retornado_total', 'liquidado')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS remission_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    remission_id UUID NOT NULL REFERENCES dispatch_remissions(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    sku VARCHAR(60) NOT NULL,
    name VARCHAR(255) NOT NULL,
    unit VARCHAR(30) NOT NULL,
    qty_dispatched NUMERIC(15, 4) NOT NULL CHECK (qty_dispatched > 0),
    qty_returned NUMERIC(15, 4) DEFAULT 0 CHECK (qty_returned >= 0),
    qty_consumed NUMERIC(15, 4) GENERATED ALWAYS AS (GREATEST(0, qty_dispatched - qty_returned)) STORED,
    suggested_unit_cost_cop NUMERIC(15, 2) DEFAULT 0.00,
    approved_unit_cost_cop NUMERIC(15, 2) DEFAULT 0.00,
    cost_approved_by VARCHAR(100),
    cost_approved_at TIMESTAMP WITH TIME ZONE,
    imputed_to_project_cost BOOLEAN DEFAULT FALSE,
    project_item_code VARCHAR(50),
    notes TEXT
);

-- -----------------------------------------------------------------------------
-- 5. PROCEDIMIENTO TRANSACCIONAL CON BLOQUEO PESIMISTA (SELECT FOR UPDATE)
-- Previene matemáticamente las condiciones de carrera y asegura stock no negativo
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION process_kardex_movement(
    p_product_id UUID,
    p_delta NUMERIC(15, 4),
    p_movement_type VARCHAR(40),
    p_unit_cost_cop NUMERIC(15, 2),
    p_project_code VARCHAR(50),
    p_remission_number VARCHAR(50),
    p_user_id VARCHAR(50),
    p_user_name VARCHAR(150),
    p_reason TEXT,
    p_source VARCHAR(40) DEFAULT 'erp_web'
) RETURNS JSONB AS $$
DECLARE
    v_prod RECORD;
    v_new_stock NUMERIC(15, 4);
    v_new_cost_cop NUMERIC(15, 2);
    v_kardex_id UUID;
    v_kardex_code VARCHAR(60);
    v_total_cost_cop NUMERIC(15, 2);
BEGIN
    -- 1. BLOQUEO EXCLUSIVO DE LA FILA DEL PRODUCTO (SELECT FOR UPDATE)
    -- Ninguna otra transacción concurrente puede leer o modificar este SKU hasta que termine esta función.
    SELECT * INTO v_prod FROM products WHERE id = p_product_id FOR UPDATE;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Producto con ID % no encontrado en base de datos.', p_product_id;
    END IF;

    -- 2. CÁLCULO Y VALIDACIÓN DE EXISTENCIAS
    v_new_stock := v_prod.real_stock + p_delta;
    
    IF v_new_stock < 0 THEN
        RAISE EXCEPTION 'Stock insuficiente para SKU % (%). Stock actual: %, Solicitado: %', 
            v_prod.sku, v_prod.name, v_prod.real_stock, ABS(p_delta);
    END IF;

    -- 3. CÁLCULO DE COSTO PROMEDIO PONDERADO (Solo en entradas de compra)
    IF p_movement_type = 'ENTRADA_COMPRA' AND p_delta > 0 AND p_unit_cost_cop > 0 THEN
        IF (v_prod.real_stock + p_delta) > 0 THEN
            v_new_cost_cop := ((v_prod.real_stock * v_prod.cost_price_cop) + (p_delta * p_unit_cost_cop)) / (v_prod.real_stock + p_delta);
        ELSE
            v_new_cost_cop := p_unit_cost_cop;
        END IF;
    ELSE
        v_new_cost_cop := v_prod.cost_price_cop;
    END IF;

    v_total_cost_cop := ABS(p_delta) * p_unit_cost_cop;

    -- 4. ACTUALIZACIÓN DEL PRODUCTO
    UPDATE products
    SET 
        real_stock = v_new_stock,
        cost_price_cop = v_new_cost_cop,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = p_product_id;

    -- 5. INSERCIÓN DEL ASIENTO INMUTABLE EN KARDEX
    v_kardex_code := 'KDX-' || TO_CHAR(CURRENT_TIMESTAMP, 'YYYYMMDDHH24MISS') || '-' || SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 4);

    INSERT INTO inventory_kardex (
        kardex_code,
        timestamp,
        product_id,
        product_sku,
        product_name,
        movement_type,
        quantity,
        previous_stock,
        new_stock,
        unit_cost_cop,
        total_cost_cop,
        project_code,
        remission_number,
        user_id,
        user_name,
        source,
        reason
    ) VALUES (
        v_kardex_code,
        CURRENT_TIMESTAMP,
        p_product_id,
        v_prod.sku,
        v_prod.name,
        p_movement_type,
        p_delta,
        v_prod.real_stock,
        v_new_stock,
        p_unit_cost_cop,
        v_total_cost_cop,
        p_project_code,
        p_remission_number,
        p_user_id,
        p_user_name,
        p_source,
        p_reason
    ) RETURNING id INTO v_kardex_id;

    RETURN jsonb_build_object(
        'success', true,
        'kardex_code', v_kardex_code,
        'product_id', p_product_id,
        'sku', v_prod.sku,
        'previous_stock', v_prod.real_stock,
        'new_stock', v_new_stock,
        'cost_price_cop', v_new_cost_cop
    );
END;
$$ LANGUAGE plpgsql;

-- -----------------------------------------------------------------------------
-- 6. VISTAS ANALÍTICAS PARA REPORTING FINANCIERO Y CONTROL DE PROYECTOS
-- -----------------------------------------------------------------------------

-- Valoración total del inventario por categoría
CREATE OR REPLACE VIEW v_inventory_valuation AS
SELECT 
    c.name AS category_name,
    COUNT(p.id) AS total_skus,
    SUM(p.real_stock) AS total_physical_units,
    SUM(p.real_stock * p.cost_price_cop) AS total_valuation_cop,
    SUM(p.real_stock * p.cost_price_usd) AS total_valuation_usd
FROM products p
LEFT JOIN inventory_categories c ON p.category_id = c.id
GROUP BY c.name;

-- Consumo consolidado de materiales por código de proyecto
CREATE OR REPLACE VIEW v_project_material_consumption AS
SELECT 
    k.project_code,
    k.product_sku,
    k.product_name,
    SUM(ABS(k.quantity)) AS total_qty_consumed,
    SUM(k.total_cost_cop) AS total_cost_incurred_cop,
    COUNT(DISTINCT k.remission_number) AS remissions_count,
    MIN(k.timestamp) AS first_dispatch_at,
    MAX(k.timestamp) AS last_dispatch_at
FROM inventory_kardex k
WHERE k.movement_type = 'SALIDA_PROYECTO' AND k.project_code IS NOT NULL
GROUP BY k.project_code, k.product_sku, k.product_name;
