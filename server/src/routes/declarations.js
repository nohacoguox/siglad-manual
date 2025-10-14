import { Router } from "express";
import { pool } from "../db.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { logAudit } from "../middleware/audit.js";

const router = Router();

const isStr = (v) => typeof v === "string" && v.trim().length > 0;
const to2 = (v, label) => {
  if (v == null) throw new Error(`${label} es requerido`);
  const x = String(v).trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(x)) throw new Error(`${label} debe ser ISO-3166 de 2 letras (ej: GT, SV)`);
  return x;
};
const to3 = (v, label) => {
  if (v == null) throw new Error(`${label} es requerido`);
  const x = String(v).trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(x)) throw new Error(`${label} debe ser ISO-4217 de 3 letras (ej: USD, GTQ)`);
  return x;
};
const toDec = (v, label) => {
  if (v == null || v === "") return null;
  const num = Number(v);
  if (!isFinite(num)) throw new Error(`${label} debe ser numérico`);
  return num;
};

function validateRequired(duca) {
  const missing = [];
  if (!isStr(duca?.numeroDocumento)) missing.push("duca.numeroDocumento");
  if (!isStr(duca?.fechaEmision)) missing.push("duca.fechaEmision");
  if (!isStr(duca?.paisEmisor)) missing.push("duca.paisEmisor");
  if (!isStr(duca?.tipoOperacion)) missing.push("duca.tipoOperacion");
  if (!isStr(duca?.exportador?.idExportador)) missing.push("duca.exportador.idExportador");
  if (!isStr(duca?.exportador?.nombreExportador)) missing.push("duca.exportador.nombreExportador");
  if (!isStr(duca?.importador?.idImportador)) missing.push("duca.importador.idImportador");
  if (!isStr(duca?.importador?.nombreImportador)) missing.push("duca.importador.nombreImportador");
  if (!isStr(duca?.transporte?.medioTransporte)) missing.push("duca.transporte.medioTransporte");
  if (!isStr(duca?.transporte?.placaVehiculo)) missing.push("duca.transporte.placaVehiculo");
  if (!isStr(duca?.transporte?.ruta?.aduanaSalida)) missing.push("duca.transporte.ruta.aduanaSalida");
  if (!isStr(duca?.transporte?.ruta?.aduanaEntrada)) missing.push("duca.transporte.ruta.aduanaEntrada");
  if (!isStr(duca?.transporte?.ruta?.paisDestino)) missing.push("duca.transporte.ruta.paisDestino");
  if (!duca?.mercancias || typeof duca.mercancias !== "object") missing.push("duca.mercancias");
  if (duca?.mercancias?.numeroItems == null) missing.push("duca.mercancias.numeroItems");
  if (!Array.isArray(duca?.mercancias?.items) || duca.mercancias.items.length === 0) missing.push("duca.mercancias.items[]");
  if (duca?.valores?.valorAduanaTotal == null) missing.push("duca.valores.valorAduanaTotal");
  if (!isStr(duca?.valores?.moneda)) missing.push("duca.valores.moneda");
  if (!isStr(duca?.estadoDocumento)) missing.push("duca.estadoDocumento");
  if (missing.length) {
    const err = new Error(`Verifique los campos obligatorios: ${missing.join(", ")}`);
    err._fa01 = true;
    throw err;
  }
}

function checkLengths(duca) {
  const max = (s, n, field) => {
    if (s == null) return s;
    const t = String(s);
    if (t.length > n) throw new Error(`${field} excede el tamaño máximo (${n})`);
    return t;
  };
  duca.numeroDocumento = max(duca.numeroDocumento, 20, "numeroDocumento");
  duca.tipoOperacion = max(duca.tipoOperacion, 20, "tipoOperacion");
  duca.exportador.idExportador = max(duca.exportador.idExportador, 15, "exportador.idExportador");
  duca.exportador.nombreExportador = max(duca.exportador.nombreExportador, 100, "exportador.nombreExportador");
  duca.exportador.direccionExportador = max(duca.exportador.direccionExportador, 120, "exportador.direccionExportador");
  duca.exportador.contactoExportador = duca.exportador.contactoExportador || {};
  duca.exportador.contactoExportador.telefono = max(duca.exportador.contactoExportador.telefono, 15, "exportador.contactoExportador.telefono");
  duca.exportador.contactoExportador.email = max(duca.exportador.contactoExportador.email, 60, "exportador.contactoExportador.email");
  duca.importador.idImportador = max(duca.importador.idImportador, 15, "importador.idImportador");
  duca.importador.nombreImportador = max(duca.importador.nombreImportador, 100, "importador.nombreImportador");
  duca.importador.direccionImportador = max(duca.importador.direccionImportador, 120, "importador.direccionImportador");
  duca.importador.contactoImportador = duca.importador.contactoImportador || {};
  duca.importador.contactoImportador.telefono = max(duca.importador.contactoImportador.telefono, 15, "importador.contactoImportador.telefono");
  duca.importador.contactoImportador.email = max(duca.importador.contactoImportador.email, 60, "importador.contactoImportador.email");
  duca.transporte.medioTransporte = max(duca.transporte.medioTransporte, 20, "transporte.medioTransporte");
  duca.transporte.placaVehiculo = max(duca.transporte.placaVehiculo, 10, "transporte.placaVehiculo");
  duca.transporte.conductor = duca.transporte.conductor || {};
  duca.transporte.conductor.nombreConductor = max(duca.transporte.conductor.nombreConductor, 80, "transporte.conductor.nombreConductor");
  duca.transporte.conductor.licenciaConductor = max(duca.transporte.conductor.licenciaConductor, 20, "transporte.conductor.licenciaConductor");
  duca.transporte.ruta = duca.transporte.ruta || {};
  duca.transporte.ruta.aduanaSalida = max(duca.transporte.ruta.aduanaSalida, 50, "transporte.ruta.aduanaSalida");
  duca.transporte.ruta.aduanaEntrada = max(duca.transporte.ruta.aduanaEntrada, 50, "transporte.ruta.aduanaEntrada");
  duca.mercancias.items.forEach((it, i) => {
    it.descripcion = max(it.descripcion, 120, `mercancias.items[${i}].descripcion`);
    it.unidadMedida = max(it.unidadMedida, 10, `mercancias.items[${i}].unidadMedida`);
  });
  if (duca.resultadoSelectivo) {
    duca.resultadoSelectivo.codigo = max(duca.resultadoSelectivo.codigo, 1, "resultadoSelectivo.codigo");
    duca.resultadoSelectivo.descripcion = max(duca.resultadoSelectivo.descripcion, 60, "resultadoSelectivo.descripcion");
  }
  duca.estadoDocumento = max(duca.estadoDocumento, 20, "estadoDocumento");
  duca.firmaElectronica = max(duca.firmaElectronica, 64, "firmaElectronica");
}

function normalizeCodes(duca) {
  duca.paisEmisor = to2(duca.paisEmisor, "paisEmisor");
  if (duca.transporte?.conductor?.paisLicencia) duca.transporte.conductor.paisLicencia = to2(duca.transporte.conductor.paisLicencia, "transporte.conductor.paisLicencia");
  duca.transporte.ruta.paisDestino = to2(duca.transporte.ruta.paisDestino, "transporte.ruta.paisDestino");
  duca.valores.moneda = to3(duca.valores.moneda, "valores.moneda");
}

function validateItems(duca) {
  const items = duca.mercancias.items;
  if (duca.mercancias.numeroItems !== items.length) {
    throw new Error(`mercancias.numeroItems (${duca.mercancias.numeroItems}) no coincide con items.length (${items.length})`);
  }
  items.forEach((it, i) => {
    const miss = [];
    if (it.linea == null) miss.push("linea");
    if (!isStr(it.descripcion)) miss.push("descripcion");
    if (it.cantidad == null) miss.push("cantidad");
    if (!isStr(it.unidadMedida)) miss.push("unidadMedida");
    if (it.valorUnitario == null) miss.push("valorUnitario");
    if (!isStr(it.paisOrigen)) miss.push("paisOrigen");
    if (miss.length) throw new Error(`mercancias.items[${i}] faltan: ${miss.join(", ")}`);
    if (!/^[A-Z]{2}$/.test(String(it.paisOrigen).toUpperCase())) {
      throw new Error(`mercancias.items[${i}].paisOrigen debe ser ISO-3166 de 2 letras`);
    }
  });
}

async function assertImporterActive(client, duca) {
  const id = duca.importador.idImportador;
  const { rows } = await client.query("SELECT estado FROM importers WHERE id=$1", [id]);
  if (!rows[0] || rows[0].estado !== "ACTIVO") {
    const err = new Error("Importador no existe o está INACTIVO");
    err._fa01 = true;
    throw err;
  }
}

async function assertUniqueDuca(client, numero) {
  const r = await client.query("SELECT 1 FROM declarations WHERE numero_documento=$1", [numero]);
  if (r.rowCount) {
    const err = new Error("Ya existe una DUCA con ese número");
    err._fa01 = true;
    throw err;
  }
}

router.post("/", requireAuth, requireRole("TRANSPORTISTA"), async (req, res) => {
  const duca = req.body?.duca;
  try {
    validateRequired(duca);
    checkLengths(duca);
    normalizeCodes(duca);
    validateItems(duca);

    const valorFactura = toDec(duca?.valores?.valorFactura, "valores.valorFactura");
    const gastosTransporte = toDec(duca?.valores?.gastosTransporte, "valores.gastosTransporte");
    const seguro = toDec(duca?.valores?.seguro, "valores.seguro");
    const otrosGastos = toDec(duca?.valores?.otrosGastos, "valores.otrosGastos");
    const valorAduanaTotal = toDec(duca?.valores?.valorAduanaTotal, "valores.valorAduanaTotal");

    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await assertUniqueDuca(client, duca.numeroDocumento);
      await assertImporterActive(client, duca);

      const ins = await client.query(
        `INSERT INTO declarations (
          numero_documento, fecha_emision, pais_emisor, tipo_operacion,
          exportador_id, exportador_nombre, exportador_direccion, exportador_tel, exportador_email,
          importador_id, importador_nombre, importador_direccion, importador_tel, importador_email,
          medio_transporte, placa_vehiculo, conductor_nombre, conductor_licencia, conductor_pais_licencia,
          ruta_aduana_salida, ruta_aduana_entrada, ruta_pais_destino, ruta_km_aprox,
          valor_factura, gastos_transporte, seguro, otros_gastos, valor_aduana_total, moneda,
          selectivo_codigo, selectivo_descripcion, estado_documento, firma_electronica,
          owner_user_id, estado
        )
        VALUES (
          $1,$2,$3,$4,
          $5,$6,$7,$8,$9,
          $10,$11,$12,$13,$14,
          $15,$16,$17,$18,$19,
          $20,$21,$22,$23,
          $24,$25,$26,$27,$28,$29,
          $30,$31,$32,$33,
          $34,'PENDIENTE'
        ) RETURNING id`,
        [
          duca.numeroDocumento, duca.fechaEmision, duca.paisEmisor, duca.tipoOperacion,
          duca.exportador?.idExportador || null, duca.exportador?.nombreExportador || null, duca.exportador?.direccionExportador || null,
          duca.exportador?.contactoExportador?.telefono || null, duca.exportador?.contactoExportador?.email || null,
          duca.importador?.idImportador || null, duca.importador?.nombreImportador || null, duca.importador?.direccionImportador || null,
          duca.importador?.contactoImportador?.telefono || null, duca.importador?.contactoImportador?.email || null,
          duca.transporte?.medioTransporte, duca.transporte?.placaVehiculo || null,
          duca.transporte?.conductor?.nombreConductor || null, duca.transporte?.conductor?.licenciaConductor || null, duca.transporte?.conductor?.paisLicencia || null,
          duca.transporte?.ruta?.aduanaSalida || null, duca.transporte?.ruta?.aduanaEntrada || null, duca.transporte?.ruta?.paisDestino || null, duca.transporte?.ruta?.kilometrosAproximados || null,
          valorFactura, gastosTransporte, seguro, otrosGastos, valorAduanaTotal, duca.valores?.moneda,
          duca.resultadoSelectivo?.codigo || null, duca.resultadoSelectivo?.descripcion || null,
          duca.estadoDocumento, duca.firmaElectronica || null,
          req.user.sub
        ]
      );

      const decId = ins.rows[0].id;

      for (const it of duca.mercancias.items) {
        await client.query(
          `INSERT INTO declaration_items (declaration_id, linea, descripcion, cantidad, unidad_medida, valor_unitario, pais_origen)
           VALUES ($1,$2,$3,$4,$5,$6,$7)`,
          [decId, it.linea, it.descripcion, it.cantidad, it.unidadMedida, it.valorUnitario, String(it.paisOrigen).toUpperCase()]
        );
      }

      await client.query("COMMIT");
      await logAudit({
        userId: req.user.sub,
        action: "CREATE",
        entity: "DECLARATION",
        entityId: decId,
        operation: "Registro declaración",
        result: "EXITO",
        num_declaracion: duca.numeroDocumento,
        req,
      });
      return res.status(201).json({ message: "Declaración registrada correctamente", id: decId });
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    } finally {
      client.release();
    }
  } catch (err) {
    if (err._fa01 || /Verifique los campos obligatorios/i.test(err.message)) {
      await logAudit({ userId: req.user?.sub, action: "CREATE", entity: "DECLARATION", result: "FALLO", operation: "Registro declaración", req, details: err.message, num_declaracion: duca?.numeroDocumento || null });
      return res.status(400).json({ error: "Verifique los campos obligatorios", detail: err.message });
    }
    await logAudit({ userId: req.user?.sub, action: "CREATE", entity: "DECLARATION", result: "FALLO", operation: "Registro declaración", req, details: "Error interno/DB", num_declaracion: duca?.numeroDocumento || null });
    return res.status(500).json({ error: "Error de conexión (FA02). Intente nuevamente." });
  }
});

router.get("/:id", requireAuth, requireRole(["AGENTE", "ADMIN"]), async (req, res) => {
  const { id } = req.params;
  try {
    const header = await pool.query(
      `SELECT
         d.id,
         d.numero_documento,
         d.fecha_emision,
         d.pais_emisor,
         d.tipo_operacion,
         d.estado AS estado_documento,
         d.medio_transporte,
         d.placa_vehiculo,
         d.ruta_aduana_salida AS aduana_salida,
         d.ruta_aduana_entrada AS aduana_entrada,
         d.ruta_pais_destino AS pais_destino,
         d.ruta_km_aprox AS km_aprox,
         d.moneda,
         d.valor_aduana_total,
         d.exportador_id,
         d.exportador_nombre,
         d.importador_id,
         d.importador_nombre
       FROM declarations d
       WHERE d.id = $1`,
      [id]
    );
    if (!header.rowCount) return res.status(404).json({ error: "Declaración no encontrada" });

    const items = await pool.query(
      `SELECT linea, descripcion, cantidad, unidad_medida, valor_unitario, pais_origen
       FROM declaration_items
       WHERE declaration_id = $1
       ORDER BY linea`,
      [id]
    );

    const h = header.rows[0];
    return res.json({
      id: h.id,
      numero_documento: h.numero_documento,
      fecha_emision: h.fecha_emision,
      pais_emisor: h.pais_emisor,
      tipo_operacion: h.tipo_operacion,
      estado_documento: h.estado_documento,
      medio_transporte: h.medio_transporte,
      placa_vehiculo: h.placa_vehiculo,
      aduana_salida: h.aduana_salida,
      aduana_entrada: h.aduana_entrada,
      pais_destino: h.pais_destino,
      kilometros_aproximados: h.km_aprox,
      moneda: h.moneda,
      valor_aduana_total: h.valor_aduana_total,
      exportador_id: h.exportador_id,
      exportador_nombre: h.exportador_nombre,
      importador_id: h.importador_id,
      importador_nombre: h.importador_nombre,
      items: items.rows,
    });
  } catch (err) {
    return res.status(500).json({ error: "Error al obtener la declaración" });
  }
});

router.get("/status/mine", requireAuth, requireRole("TRANSPORTISTA"), async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT id, numero_documento, estado, created_at
       FROM declarations
       WHERE owner_user_id = $1
       ORDER BY created_at DESC`,
      [req.user.sub]
    );
    return res.json(r.rows);
  } catch (e) {
    return res.status(500).json({ error: "No se pudo obtener el estado" });
  }
});

export default router;
