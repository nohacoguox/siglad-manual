import React, { useState, useEffect } from "react";

const API = import.meta.env.VITE_API_URL || "http://localhost:4000";

function Card({ title, actions, children }) {
  return (
    <div className="card">
      <div className="card-pad pb-0 flex items-center justify-between">
        <h3 className="text-lg font-semibold">{title}</h3>
        {actions}
      </div>
      <div className="card-pad pt-4">{children}</div>
    </div>
  );
}

function Button({ variant = "ghost", className = "", ...props }) {
  const base = "btn";
  const map = { solid: "btn-solid", ghost: "btn-ghost", danger: "btn-danger" };
  return <button className={`${base} ${map[variant]} ${className}`} {...props} />;
}

function PrimaryButton(props) {
  return <Button variant="solid" {...props} />;
}

function Input(props) {
  return <input className="input" {...props} />;
}

function Select(props) {
  return <select className="select" {...props} />;
}

function useAuthFetch() {
  return async (path, options = {}) => {
    const token = localStorage.getItem("token");
    const res = await fetch(`${API}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {}),
        Authorization: `Bearer ${token}`,
      },
      credentials: "include",
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Request failed");
    return data;
  };
}

function ThemeSwitcher() {
  const pref = localStorage.getItem("theme") || "auto";
  const [mode, setMode] = useState(pref);
  useEffect(() => {
    localStorage.setItem("theme", mode);
    const body = document.body;
    body.classList.remove("theme--dark");
    if (mode === "dark") body.classList.add("theme--dark");
    if (mode === "light") body.classList.remove("theme--dark");
  }, [mode]);
  return (
    <Select value={mode} onChange={(e) => setMode(e.target.value)}>
      <option value="auto">Apariencia: Auto</option>
      <option value="light">Claro</option>
      <option value="dark">Oscuro</option>
    </Select>
  );
}

function Login({ onAuth }) {
  const [email, setEmail] = useState("trans@siglad.local");
  const [password, setPassword] = useState("Trans123$");
  const [error, setError] = useState("");
  const submit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const res = await fetch(`${API}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Login failed");
      localStorage.setItem("token", data.token);
      localStorage.setItem("role", data.role);
      onAuth(data.role);
    } catch (e) {
      setError(e.message);
    }
  };
  return (
    <div className="min-h-screen flex items-center justify-center">
      <form onSubmit={submit} className="card card-pad w-full max-w-md space-y-4">
        <h2 className="text-2xl font-semibold text-center">SIGLAD</h2>
        <Input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <Input placeholder="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        <PrimaryButton className="w-full">Ingresar</PrimaryButton>
        {error && <div className="text-red-600 text-sm">{error}</div>}
        <p className="text-center text-sm text-[var(--subtle)]">
          Demo: trans@siglad.local / Trans123$ · agente@siglad.local / Agent123$ · admin@siglad.local / Admin123$
        </p>
      </form>
    </div>
  );
}

function Transportista() {
  const fetcher = useAuthFetch();
  const [list, setList] = useState([]);
  const [msg, setMsg] = useState("");
  const TIPOS = ["IMPORTACION", "EXPORTACION", "TRANSITO"];
  const MEDIOS = ["TERRESTRE", "MARITIMO", "AEREO"];
  const PAISES_2 = ["GT", "SV", "HN", "NI", "CR", "PA", "MX", "US", "CA", "CO", "PE", "BR", "AR", "CL", "EC", "VE", "PY", "UY", "BO"];
  const MONEDAS = ["USD", "GTQ", "EUR", "MXN", "CRC", "HNL", "NIO", "PAB", "COP", "PEN", "BRL", "ARS", "CLP", "UYU", "BOB"];
  const [imps, setImps] = useState([]);
  const [qImp, setQImp] = useState("");
  const [exps, setExps] = useState([]);
  const [qExp, setQExp] = useState("");
  const [form, setForm] = useState({
    numeroDocumento: "",
    fechaEmision: "",
    paisEmisor: "GT",
    tipoOperacion: "IMPORTACION",
    exportador: { idExportador: "", nombreExportador: "", direccionExportador: "", telefono: "", email: "" },
    importador: { idImportador: "", nombreImportador: "", direccionImportador: "", telefono: "", email: "" },
    transporte: {
      medioTransporte: "TERRESTRE",
      placaVehiculo: "",
      conductor: { nombreConductor: "", licenciaConductor: "", paisLicencia: "GT" },
      ruta: { aduanaSalida: "", aduanaEntrada: "", paisDestino: "SV", kilometrosAproximados: "" },
    },
    valores: { valorFactura: "", gastosTransporte: "", seguro: "", otrosGastos: "", valorAduanaTotal: "", moneda: "USD" },
    resultadoSelectivo: { codigo: "", descripcion: "" },
    estadoDocumento: "CONFIRMADO",
    firmaElectronica: "",
  });
  const [items, setItems] = useState([{ linea: 1, descripcion: "", cantidad: "", unidadMedida: "", valorUnitario: "", paisOrigen: "GT" }]);

  const load = async () => setList(await fetcher("/status/mine"));
  const loadImps = async (q = "") => setImps(await fetcher(`/catalogs/importers?status=ACTIVO${q ? `&q=${encodeURIComponent(q)}` : ""}`));
  const loadExps = async (q = "") => setExps(await fetcher(`/catalogs/exporters?status=ACTIVO${q ? `&q=${encodeURIComponent(q)}` : ""}`));

  useEffect(() => {
    load();
    loadImps();
    loadExps();
  }, []);

  const addItem = () => {
    const next = (items[items.length - 1]?.linea || 0) + 1;
    setItems([...items, { linea: next, descripcion: "", cantidad: "", unidadMedida: "", valorUnitario: "", paisOrigen: "GT" }]);
  };
  const delItem = (i) => setItems(items.filter((_, idx) => idx !== i));
  const updItem = (i, patch) => setItems(items.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));

  const registrar = async (e) => {
    e.preventDefault();
    setMsg("");
    if (!form.exportador.idExportador) return setMsg("Debe seleccionar un exportador ACTIVO");
    if (!form.importador.idImportador) return setMsg("Debe seleccionar un importador ACTIVO");
    const payload = {
      duca: {
        numeroDocumento: form.numeroDocumento.trim(),
        fechaEmision: form.fechaEmision,
        paisEmisor: form.paisEmisor,
        tipoOperacion: form.tipoOperacion,
        exportador: {
          idExportador: form.exportador.idExportador.trim(),
          nombreExportador: form.exportador.nombreExportador.trim(),
          direccionExportador: form.exportador.direccionExportador || null,
          contactoExportador: { telefono: form.exportador.telefono || null, email: form.exportador.email || null },
        },
        importador: {
          idImportador: form.importador.idImportador.trim(),
          nombreImportador: form.importador.nombreImportador.trim(),
          direccionImportador: form.importador.direccionImportador || null,
          contactoImportador: { telefono: form.importador.telefono || null, email: form.importador.email || null },
        },
        transporte: {
          medioTransporte: form.transporte.medioTransporte,
          placaVehiculo: form.transporte.placaVehiculo.trim(),
          conductor: {
            nombreConductor: form.transporte.conductor.nombreConductor || null,
            licenciaConductor: form.transporte.conductor.licenciaConductor || null,
            paisLicencia: form.transporte.conductor.paisLicencia || null,
          },
          ruta: {
            aduanaSalida: form.transporte.ruta.aduanaSalida.trim(),
            aduanaEntrada: form.transporte.ruta.aduanaEntrada.trim(),
            paisDestino: form.transporte.ruta.paisDestino,
            kilometrosAproximados: form.transporte.ruta.kilometrosAproximados ? Number(form.transporte.ruta.kilometrosAproximados) : null,
          },
        },
        mercancias: {
          numeroItems: items.length,
          items: items.map((x) => ({
            linea: Number(x.linea),
            descripcion: x.descripcion.trim(),
            cantidad: Number(x.cantidad),
            unidadMedida: x.unidadMedida.trim().toUpperCase(),
            valorUnitario: Number(x.valorUnitario),
            paisOrigen: x.paisOrigen,
          })),
        },
        valores: {
          valorFactura: form.valores.valorFactura ? Number(form.valores.valorFactura) : null,
          gastosTransporte: form.valores.gastosTransporte ? Number(form.valores.gastosTransporte) : null,
          seguro: form.valores.seguro ? Number(form.valores.seguro) : null,
          otrosGastos: form.valores.otrosGastos ? Number(form.valores.otrosGastos) : null,
          valorAduanaTotal: Number(form.valores.valorAduanaTotal),
          moneda: form.valores.moneda,
        },
        resultadoSelectivo:
          form.resultadoSelectivo.codigo || form.resultadoSelectivo.descripcion
            ? { codigo: form.resultadoSelectivo.codigo || null, descripcion: form.resultadoSelectivo.descripcion || null }
            : undefined,
        estadoDocumento: form.estadoDocumento,
        firmaElectronica: form.firmaElectronica || null,
      },
    };
    try {
      await fetcher("/declarations", { method: "POST", body: JSON.stringify(payload) });
      setMsg("Declaración registrada correctamente ✔️");
      setItems([{ linea: 1, descripcion: "", cantidad: "", unidadMedida: "", valorUnitario: "", paisOrigen: "GT" }]);
      setForm((f) => ({
        ...f,
        numeroDocumento: "",
        fechaEmision: "",
        exportador: { ...f.exportador, idExportador: "", nombreExportador: "" },
        importador: { ...f.importador, idImportador: "", nombreImportador: "" },
        transporte: { ...f.transporte, placaVehiculo: "" },
        valores: { ...f.valores, valorFactura: "", gastosTransporte: "", seguro: "", otrosGastos: "", valorAduanaTotal: "" },
      }));
      await load();
    } catch (e) {
      setMsg(e?.error || e.message);
    }
  };

  return (
    <div className="space-y-6">
      <form onSubmit={registrar} className="section">
        <h2 className="h2">Registro de Declaración DUCA</h2>
        <div className="grid md:grid-cols-2 gap-3">
          <Input placeholder="Número Documento (20 máx.)" value={form.numeroDocumento} onChange={(e) => setForm({ ...form, numeroDocumento: e.target.value.slice(0, 20) })} />
          <Input type="date" value={form.fechaEmision} onChange={(e) => setForm({ ...form, fechaEmision: e.target.value })} />
        </div>
        <div className="grid md:grid-cols-3 gap-3">
          <Select value={form.paisEmisor} onChange={(e) => setForm({ ...form, paisEmisor: e.target.value })}>{PAISES_2.map((p) => <option key={p} value={p}>{p}</option>)}</Select>
          <Select value={form.tipoOperacion} onChange={(e) => setForm({ ...form, tipoOperacion: e.target.value })}>{TIPOS.map((t) => <option key={t} value={t}>{t}</option>)}</Select>
          <Select value={form.valores.moneda} onChange={(e) => setForm({ ...form, valores: { ...form.valores, moneda: e.target.value } })}>{MONEDAS.map((m) => <option key={m} value={m}>{m}</option>)}</Select>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <div className="label mb-2">Exportador</div>
            <div className="flex gap-2 mb-2">
              <Input placeholder="Buscar por id/nombre" value={qExp} onChange={(e) => setQExp(e.target.value)} onKeyDown={(e) => e.key === "Enter" && loadExps(qExp)} />
              <Button onClick={() => loadExps(qExp)}>Buscar</Button>
            </div>
            <Select
              value={form.exportador.idExportador}
              onChange={(e) => {
                const id = e.target.value;
                const sel = exps.find((x) => x.id === id);
                setForm({ ...form, exportador: { ...form.exportador, idExportador: id, nombreExportador: sel ? sel.nombre : "" } });
              }}
            >
              <option value="">-- Selecciona exportador ACTIVO --</option>
              {exps.map((x) => (
                <option key={x.id} value={x.id}>{x.id} — {x.nombre}</option>
              ))}
            </Select>
            <Input className="mt-2" placeholder="Nombre Exportador" value={form.exportador.nombreExportador} readOnly />
          </div>

          <div>
            <div className="label mb-2">Importador</div>
            <div className="flex gap-2 mb-2">
              <Input placeholder="Buscar por id/nombre" value={qImp} onChange={(e) => setQImp(e.target.value)} onKeyDown={(e) => e.key === "Enter" && loadImps(qImp)} />
              <Button onClick={() => loadImps(qImp)}>Buscar</Button>
            </div>
            <Select
              value={form.importador.idImportador}
              onChange={(e) => {
                const id = e.target.value;
                const sel = imps.find((x) => x.id === id);
                setForm({ ...form, importador: { ...form.importador, idImportador: id, nombreImportador: sel ? sel.nombre : "" } });
              }}
            >
              <option value="">-- Selecciona importador ACTIVO --</option>
              {imps.map((x) => (
                <option key={x.id} value={x.id}>{x.id} — {x.nombre}</option>
              ))}
            </Select>
            <Input className="mt-2" placeholder="Nombre Importador" value={form.importador.nombreImportador} readOnly />
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <div className="label mb-2">Transporte</div>
            <div className="grid grid-cols-2 gap-2">
              <Select value={form.transporte.medioTransporte} onChange={(e) => setForm({ ...form, transporte: { ...form.transporte, medioTransporte: e.target.value } })}>{MEDIOS.map((m) => <option key={m} value={m}>{m}</option>)}</Select>
              <Input placeholder="Placa (10)" value={form.transporte.placaVehiculo} onChange={(e) => setForm({ ...form, transporte: { ...form.transporte, placaVehiculo: e.target.value.slice(0, 10) } })} />
            </div>
            <div className="grid grid-cols-3 gap-2 mt-2">
              <Input placeholder="Conductor (opcional 80)" value={form.transporte.conductor.nombreConductor} onChange={(e) => setForm({ ...form, transporte: { ...form.transporte, conductor: { ...form.transporte.conductor, nombreConductor: e.target.value.slice(0, 80) } } })} />
              <Input placeholder="Licencia (20)" value={form.transporte.conductor.licenciaConductor} onChange={(e) => setForm({ ...form, transporte: { ...form.transporte, conductor: { ...form.transporte.conductor, licenciaConductor: e.target.value.slice(0, 20) } } })} />
              <Select value={form.transporte.conductor.paisLicencia} onChange={(e) => setForm({ ...form, transporte: { ...form.transporte, conductor: { ...form.transporte.conductor, paisLicencia: e.target.value } } })}>{PAISES_2.map((p) => <option key={p} value={p}>{p}</option>)}</Select>
            </div>
          </div>

          <div>
            <div className="label mb-2">Ruta</div>
            <div className="grid grid-cols-2 gap-2">
              <Input placeholder="Aduana salida (50)" value={form.transporte.ruta.aduanaSalida} onChange={(e) => setForm({ ...form, transporte: { ...form.transporte, ruta: { ...form.transporte.ruta, aduanaSalida: e.target.value.slice(0, 50) } } })} />
              <Input placeholder="Aduana entrada (50)" value={form.transporte.ruta.aduanaEntrada} onChange={(e) => setForm({ ...form, transporte: { ...form.transporte, ruta: { ...form.transporte.ruta, aduanaEntrada: e.target.value.slice(0, 50) } } })} />
            </div>
            <div className="grid grid-cols-2 gap-2 mt-2">
              <Select value={form.transporte.ruta.paisDestino} onChange={(e) => setForm({ ...form, transporte: { ...form.transporte, ruta: { ...form.transporte.ruta, paisDestino: e.target.value } } })}>{PAISES_2.map((p) => <option key={p} value={p}>{p}</option>)}</Select>
              <Input placeholder="Km aprox (opcional)" inputMode="numeric" value={form.transporte.ruta.kilometrosAproximados} onChange={(e) => setForm({ ...form, transporte: { ...form.transporte, ruta: { ...form.transporte.ruta, kilometrosAproximados: e.target.value.replace(/[^0-9]/g, "") } } })} />
            </div>
          </div>
        </div>

        <div>
          <div className="label mb-2">Valores</div>
          <div className="grid md:grid-cols-5 gap-2">
            {[
              ["valorFactura", "Factura"],
              ["gastosTransporte", "Gastos"],
              ["seguro", "Seguro"],
              ["otrosGastos", "Otros"],
              ["valorAduanaTotal", "Aduana Total*"],
            ].map(([key, label]) => (
              <Input key={key} placeholder={label} inputMode="decimal" value={form.valores[key]} onChange={(e) => setForm({ ...form, valores: { ...form.valores, [key]: e.target.value.replace(/[^0-9.]/g, "") } })} />
            ))}
          </div>
        </div>

        <div>
          <div className="label mb-2">Mercancías (líneas: {items.length})</div>
          <div className="space-y-2">
            {items.map((it, i) => (
              <div key={i} className="grid md:grid-cols-6 gap-2 items-center">
                <Input placeholder="Línea" inputMode="numeric" value={it.linea} onChange={(e) => updItem(i, { linea: e.target.value.replace(/[^0-9]/g, "") })} />
                <Input className="md:col-span-2" placeholder="Descripción (120)" value={it.descripcion} onChange={(e) => updItem(i, { descripcion: e.target.value.slice(0, 120) })} />
                <Input placeholder="Cantidad" inputMode="numeric" value={it.cantidad} onChange={(e) => updItem(i, { cantidad: e.target.value.replace(/[^0-9]/g, "") })} />
                <Input placeholder="Unidad (10)" value={it.unidadMedida} onChange={(e) => updItem(i, { unidadMedida: e.target.value.slice(0, 10).toUpperCase() })} />
                <div className="flex gap-2">
                  <Input placeholder="Valor Unit." inputMode="decimal" value={it.valorUnitario} onChange={(e) => updItem(i, { valorUnitario: e.target.value.replace(/[^0-9.]/g, "") })} />
                  <Select value={it.paisOrigen} onChange={(e) => updItem(i, { paisOrigen: e.target.value })}>{PAISES_2.map((p) => <option key={p} value={p}>{p}</option>)}</Select>
                </div>
                {items.length > 1 && <button type="button" className="text-red-600 text-sm" onClick={() => delItem(i)}>Eliminar</button>}
              </div>
            ))}
          </div>
          <div className="mt-2">
            <Button onClick={addItem}>+ Agregar línea</Button>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-2">
          <Input placeholder="Selectivo código (1)" value={form.resultadoSelectivo.codigo} onChange={(e) => setForm({ ...form, resultadoSelectivo: { ...form.resultadoSelectivo, codigo: e.target.value.slice(0, 1) } })} />
          <Input className="md:col-span-2" placeholder="Selectivo descripción (60)" value={form.resultadoSelectivo.descripcion} onChange={(e) => setForm({ ...form, resultadoSelectivo: { ...form.resultadoSelectivo, descripcion: e.target.value.slice(0, 60) } })} />
        </div>

        <Input placeholder="Firma electrónica (64)" value={form.firmaElectronica} onChange={(e) => setForm({ ...form, firmaElectronica: e.target.value.slice(0, 64) })} />

        <div className="flex items-center justify-between pt-2">
          <PrimaryButton>Registrar DUCA</PrimaryButton>
          {msg && <span className={`text-sm ${/error|fallo|inválido|invalido|no existe/i.test(msg) ? "text-red-600" : "text-[var(--accent)]"}`}>{msg}</span>}
        </div>
      </form>

      <Card title="Mis Declaraciones">
        <div className="divide-y text-sm">
          {list.map((x) => (
            <div key={x.id} className="py-2 flex justify-between">
              <span className="font-medium">{x.numero_documento}</span>
              <span className={`badge ${
                x.estado === "VALIDADA" ? "badge-ok" :
                x.estado === "RECHAZADA" ? "bg-red-100 text-red-700" :
                x.estado === "EN REVISION" ? "badge-warn" : "badge-mute"
              }`}>{x.estado}</span>
            </div>
          ))}
          {!list.length && <div className="empty">Sin declaraciones aún.</div>}
        </div>
      </Card>
    </div>
  );
}

function Agente() {
  const fetcher = useAuthFetch();
  const [pend, setPend] = useState([]);
  const [detalle, setDetalle] = useState(null);
  const [err, setErr] = useState("");
  const load = async () => setPend(await fetcher("/validation/pending"));
  useEffect(() => { load(); }, []);
  const ver = async (id) => { setErr(""); try { setDetalle(await fetcher(`/declarations/${id}`)); } catch (e) { setErr(e.message); } };
  const decidir = async (id, decision) => { setErr(""); try { await fetcher(`/validation/${id}/decision`, { method: "POST", body: JSON.stringify({ decision }) }); setDetalle(null); await load(); } catch (e) { setErr(e.message); } };
  return (
    <div className="grid md:grid-cols-2 gap-6">
      <Card title="Pendientes">
        <div className="space-y-2">
          {pend.map((x) => (
            <div key={x.id} className="flex items-center justify-between border rounded-xl p-3">
              <div>
                <div className="font-medium">{x.numero_documento}</div>
                <div className="text-sm text-[var(--subtle)]">{x.importador_nombre} — {x.valor_aduana_total} {x.moneda}</div>
              </div>
              <div className="flex gap-2">
                <Button onClick={() => ver(x.id)}>Ver</Button>
                <PrimaryButton onClick={() => decidir(x.id, "VALIDADA")}>Validar</PrimaryButton>
                <Button variant="danger" onClick={() => decidir(x.id, "RECHAZADA")}>Rechazar</Button>
              </div>
            </div>
          ))}
          {!pend.length && <div className="empty">No hay pendientes.</div>}
        </div>
      </Card>

      <Card title="Detalle" actions={detalle && <span className="text-sm text-[var(--subtle)]">{detalle.numero_documento}</span>}>
        {err && <p className="text-red-600 text-sm mb-2">{err}</p>}
        {!detalle ? (
          <p className="text-[var(--subtle)]">Selecciona una declaración.</p>
        ) : (
          <div className="space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-2">
              <div><b>Emisión:</b> {detalle.fecha_emision?.slice(0, 10)}</div>
              <div><b>Moneda:</b> {detalle.moneda}</div>
              <div><b>Exportador:</b> {detalle.exportador_nombre}</div>
              <div><b>Importador:</b> {detalle.importador_nombre}</div>
              <div><b>Medio:</b> {detalle.medio_transporte}</div>
              <div><b>Valor Aduana:</b> {detalle.valor_aduana_total}</div>
            </div>
            <div>
              <b>Mercancías</b>
              <ul className="list-disc ml-6">
                {detalle.items?.map((it) => (
                  <li key={it.linea}>L{it.linea}: {it.descripcion} — {it.cantidad} {it.unidad_medida} @ {it.valor_unitario} ({it.pais_origen})</li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

function AdminUsuarios({ fetcher }) {
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "TRANSPORTISTA", status: "ACTIVE" });
  const [error, setError] = useState("");
  const load = async () => setUsers(await fetcher("/users"));
  useEffect(() => { load(); }, []);
  const create = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await fetcher("/users", { method: "POST", body: JSON.stringify(form) });
      setForm({ name: "", email: "", password: "", role: "TRANSPORTISTA", status: "ACTIVE" });
      await load();
    } catch (e) { setError(e.message); }
  };
  const toggle = async (u) => { await fetcher(`/users/${u.id}`, { method: "PATCH", body: JSON.stringify({ status: u.status === "ACTIVE" ? "INACTIVE" : "ACTIVE" }) }); await load(); };
  const del = async (u) => { await fetcher(`/users/${u.id}`, { method: "DELETE" }); await load(); };
  return (
    <div className="grid md:grid-cols-2 gap-6">
      <div className="card card-pad">
        <h3 className="text-lg font-semibold mb-3">Crear usuario</h3>
        <form onSubmit={create} className="grid gap-3">
          <Input placeholder="Nombre" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Input placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <Input placeholder="Password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          <div className="grid grid-cols-2 gap-3">
            <Select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              <option value="TRANSPORTISTA">TRANSPORTISTA</option>
              <option value="AGENTE">AGENTE</option>
              <option value="ADMIN">ADMIN</option>
            </Select>
            <Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              <option value="ACTIVE">ACTIVE</option>
              <option value="INACTIVE">INACTIVE</option>
            </Select>
          </div>
          <PrimaryButton>Crear</PrimaryButton>
          {error && <p className="text-red-600 text-sm">{error}</p>}
        </form>
      </div>

      <div className="card card-pad">
        <h3 className="text-lg font-semibold mb-3">Usuarios</h3>
        <div className="overflow-x-auto">
          <table className="tbl">
            <thead>
              <tr><th className="th">Nombre</th><th className="th">Email</th><th className="th">Rol</th><th className="th">Estado</th><th className="th"></th></tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td className="td">{u.name}</td>
                  <td className="td">{u.email}</td>
                  <td className="td">{u.role}</td>
                  <td className="td"><span className={`badge ${u.status === "ACTIVE" ? "badge-ok" : "badge-mute"}`}>{u.status}</span></td>
                  <td className="td text-right">
                    <Button className="mr-2" onClick={() => toggle(u)}>{u.status === "ACTIVE" ? "Desactivar" : "Activar"}</Button>
                    <Button variant="danger" onClick={() => del(u)}>Eliminar</Button>
                  </td>
                </tr>
              ))}
              {!users.length && <tr><td className="td py-6 text-center text-slate-500" colSpan="5">Sin usuarios</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function AdminImportadores({ fetcher }) {
  const [list, setList] = useState([]);
  const [q, setQ] = useState("");
  const [form, setForm] = useState({ id: "", nombre: "", estado: "ACTIVO" });
  const [msg, setMsg] = useState("");
  const load = async () => setList(await fetcher(`/admin/importers${q ? `?q=${encodeURIComponent(q)}` : ""}`));
  useEffect(() => { load(); }, []);
  const save = async (e) => {
    e.preventDefault();
    setMsg("");
    if (!form.id || !form.nombre) return setMsg("id y nombre son requeridos");
    await fetcher(`/admin/importers/${encodeURIComponent(form.id)}`, { method: "PUT", body: JSON.stringify({ nombre: form.nombre, estado: form.estado }) });
    setMsg("Guardado ✔️");
    setForm({ id: "", nombre: "", estado: "ACTIVO" });
    await load();
  };
  const toggle = async (imp) => {
    const next = imp.estado === "ACTIVO" ? "INACTIVO" : "ACTIVO";
    await fetcher(`/admin/importers/${encodeURIComponent(imp.id)}/estado`, { method: "PATCH", body: JSON.stringify({ estado: next }) });
    await load();
  };
  return (
    <div className="grid md:grid-cols-2 gap-6">
      <div className="card card-pad">
        <h3 className="text-lg font-semibold mb-3">Crear / Actualizar importador</h3>
        <form onSubmit={save} className="grid gap-3">
          <Input placeholder="ID (15)" value={form.id} onChange={(e) => setForm({ ...form, id: e.target.value.slice(0, 15) })} />
          <Input placeholder="Nombre (100)" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value.slice(0, 100) })} />
          <Select value={form.estado} onChange={(e) => setForm({ ...form, estado: e.target.value })}>
            <option value="ACTIVO">ACTIVO</option>
            <option value="INACTIVO">INACTIVO</option>
          </Select>
          <PrimaryButton>Guardar</PrimaryButton>
          {msg && <p className="text-sm text-[var(--accent)]">{msg}</p>}
        </form>
      </div>

      <div className="card card-pad">
        <div className="flex items-center gap-2 mb-3">
          <h3 className="text-lg font-semibold">Importadores</h3>
          <Input className="ml-auto w-64" placeholder="Buscar por id/nombre" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && load()} />
          <Button onClick={load}>Buscar</Button>
        </div>
        <div className="overflow-x-auto">
          <table className="tbl">
            <thead>
              <tr><th className="th">ID</th><th className="th">Nombre</th><th className="th">Estado</th><th className="th">Creado</th><th className="th"></th></tr>
            </thead>
            <tbody>
              {list.map((imp) => (
                <tr key={imp.id}>
                  <td className="td">{imp.id}</td>
                  <td className="td">{imp.nombre}</td>
                  <td className="td"><span className={`badge ${imp.estado === "ACTIVO" ? "badge-ok" : "badge-mute"}`}>{imp.estado}</span></td>
                  <td className="td">{new Date(imp.created_at).toLocaleString()}</td>
                  <td className="td text-right">
                    <Button onClick={() => toggle(imp)}>{imp.estado === "ACTIVO" ? "Inactivar" : "Activar"}</Button>
                  </td>
                </tr>
              ))}
              {!list.length && <tr><td className="td py-6 text-center text-slate-500" colSpan="5">Sin resultados</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function AdminExportadores({ fetcher }) {
  const [list, setList] = useState([]);
  const [q, setQ] = useState("");
  const [form, setForm] = useState({ id: "", nombre: "", estado: "ACTIVO" });
  const [msg, setMsg] = useState("");
  const load = async () => setList(await fetcher(`/admin/exporters${q ? `?q=${encodeURIComponent(q)}` : ""}`));
  useEffect(() => { load(); }, []);
  const save = async (e) => {
    e.preventDefault();
    setMsg("");
    if (!form.id || !form.nombre) return setMsg("id y nombre son requeridos");
    await fetcher(`/admin/exporters/${encodeURIComponent(form.id)}`, { method: "PUT", body: JSON.stringify({ nombre: form.nombre, estado: form.estado }) });
    setMsg("Guardado ✔️");
    setForm({ id: "", nombre: "", estado: "ACTIVO" });
    await load();
  };
  const toggle = async (exp) => {
    const next = exp.estado === "ACTIVO" ? "INACTIVO" : "ACTIVO";
    await fetcher(`/admin/exporters/${encodeURIComponent(exp.id)}/estado`, { method: "PATCH", body: JSON.stringify({ estado: next }) });
    await load();
  };
  return (
    <div className="grid md:grid-cols-2 gap-6">
      <div className="card card-pad">
        <h3 className="text-lg font-semibold mb-3">Crear / Actualizar exportador</h3>
        <form onSubmit={save} className="grid gap-3">
          <Input placeholder="ID (15)" value={form.id} onChange={(e) => setForm({ ...form, id: e.target.value.slice(0, 15) })} />
          <Input placeholder="Nombre (100)" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value.slice(0, 100) })} />
          <Select value={form.estado} onChange={(e) => setForm({ ...form, estado: e.target.value })}>
            <option value="ACTIVO">ACTIVO</option>
            <option value="INACTIVO">INACTIVO</option>
          </Select>
          <PrimaryButton>Guardar</PrimaryButton>
          {msg && <p className="text-sm text-[var(--accent)]">{msg}</p>}
        </form>
      </div>

      <div className="card card-pad">
        <div className="flex items-center gap-2 mb-3">
          <h3 className="text-lg font-semibold">Exportadores</h3>
          <Input className="ml-auto w-64" placeholder="Buscar por id/nombre" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && load()} />
          <Button onClick={load}>Buscar</Button>
        </div>
        <div className="overflow-x-auto">
          <table className="tbl">
            <thead>
              <tr><th className="th">ID</th><th className="th">Nombre</th><th className="th">Estado</th><th className="th">Creado</th><th className="th"></th></tr>
            </thead>
            <tbody>
              {list.map((exp) => (
                <tr key={exp.id}>
                  <td className="td">{exp.id}</td>
                  <td className="td">{exp.nombre}</td>
                  <td className="td"><span className={`badge ${exp.estado === "ACTIVO" ? "badge-ok" : "badge-mute"}`}>{exp.estado}</span></td>
                  <td className="td">{new Date(exp.created_at).toLocaleString()}</td>
                  <td className="td text-right">
                    <Button onClick={() => toggle(exp)}>{exp.estado === "ACTIVO" ? "Inactivar" : "Activar"}</Button>
                  </td>
                </tr>
              ))}
              {!list.length && <tr><td className="td py-6 text-center text-slate-500" colSpan="5">Sin resultados</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Admin() {
  const fetcher = useAuthFetch();
  const [tab, setTab] = useState("usuarios");
  return (
    <div className="space-y-4">
      <div className="card card-pad inline-flex gap-2">
        <Button className={tab === "usuarios" ? "btn-solid text-white" : ""} onClick={() => setTab("usuarios")}>Usuarios</Button>
        <Button className={tab === "importadores" ? "btn-solid text-white" : ""} onClick={() => setTab("importadores")}>Importadores</Button>
        <Button className={tab === "exportadores" ? "btn-solid text-white" : ""} onClick={() => setTab("exportadores")}>Exportadores</Button>
      </div>
      {tab === "usuarios" ? <AdminUsuarios fetcher={fetcher} /> : tab === "importadores" ? <AdminImportadores fetcher={fetcher} /> : <AdminExportadores fetcher={fetcher} />}
    </div>
  );
}

export default function App() {
  const [role, setRole] = useState(localStorage.getItem("role"));
  if (!role) return <Login onAuth={setRole} />;
  return (
    <>
      <header className="header">
        <div className="container-ux py-3 flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="brand-square" />
            <div className="h1">SIGLAD</div>
          </div>
          <span className="ml-2 text-sm text-[var(--subtle)]">Rol: {role}</span>
          <div className="ml-auto flex items-center gap-2">
            <ThemeSwitcher />
            <Button onClick={() => { localStorage.clear(); location.reload(); }}>Salir</Button>
          </div>
        </div>
      </header>
      <main className="container-ux py-6 space-y-6">
        {role === "TRANSPORTISTA" && <Transportista />}
        {role === "AGENTE" && <Agente />}
        {role === "ADMIN" && <Admin />}
      </main>
    </>
  );
}
