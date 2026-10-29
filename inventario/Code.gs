/**
 * ════════════════════════════════════════════════════════════════════
 *  PRÉSTAMO DE MATERIAL · Plantilla v1.0
 *  Control de préstamos y devoluciones con escáner 2D / QR / cámara
 *  Google Sheets + Google Apps Script
 * ────────────────────────────────────────────────────────────────────
 *  Archivos del proyecto:  Code.gs · App.html · appsscript.json
 *  Instalación:            ver INSTALACION.md
 *
 *  Toda la personalización se hace en la hoja "Configuración";
 *  no hace falta tocar este código para adaptarlo a otra institución.
 * ════════════════════════════════════════════════════════════════════
 */

const VERSION = '2.1.0';

const HOJAS = {
  CONFIG: 'Configuración',
  MATERIALES: 'Materiales',
  USUARIOS: 'Usuarios',
  LABS: 'Laboratoristas',
  HISTORIAL: 'Historial'
};

/** Columnas de cada hoja. Se buscan por NOMBRE, así que el cliente puede
 *  reordenarlas o agregar columnas propias sin romper nada. */
const COLUMNAS = {
  [HOJAS.CONFIG]: ['Clave', 'Valor', 'Descripción'],
  [HOJAS.MATERIALES]: ['ID', 'Nombre', 'Categoría', 'Ubicación', 'Cantidad total', 'Disponible', 'Estatus', 'Notas'],
  [HOJAS.USUARIOS]: ['ID', 'Nombre', 'Correo', 'Área', 'Estatus', 'Notas', 'Reglamento'],
  [HOJAS.LABS]: ['Nombre', 'PIN', 'Correo', 'Activo', 'Notas'],
  [HOJAS.HISTORIAL]: ['ID Movimiento', 'Fecha préstamo', 'ID Material', 'Material', 'ID Usuario', 'Usuario', 'Correo', 'Área',
    'Entregó', 'Cantidad', 'Fecha límite', 'Cantidad devuelta', 'Estado', 'Fecha devolución', 'Recibió', 'Notas']
};

const CONFIG_DEFAULT = [
  ['NOMBRE_SISTEMA', 'Préstamo de Material', 'Título de la aplicación y de los correos.'],
  ['NOMBRE_INSTITUCION', 'Mi Institución', 'Aparece debajo del título.'],
  ['COLOR_PRINCIPAL', '#1F6FEB', 'Color de la marca en formato #RRGGBB.'],
  ['LOGO_URL', '', 'Opcional. URL pública (https) de una imagen del logo.'],
  ['DOMINIO_CORREO', '', 'Opcional. Ej. @escuela.edu.mx → si un usuario no tiene correo se usa ID + dominio.'],
  ['ENVIAR_CORREOS', 'Sí', 'Sí / No. Enviar comprobantes de préstamo y devolución.'],
  ['CORREO_ADMIN', '', 'Recibe el resumen diario de vencidos y las respuestas de los usuarios.'],
  ['DIAS_PRESTAMO', '7', 'Días para devolver. 0 = el mismo día. Vacío = sin fecha límite.'],
  ['BLOQUEAR_CON_VENCIDOS', 'Sí', 'Sí / No. No prestar a quien tenga material vencido.'],
  ['AUTOREGISTRO', 'Sí', 'Sí / No. Si la credencial no está en Usuarios, la persona captura su nombre y correo y queda registrada.'],
  ['AUTORIZAR_PRESTAMO', 'No', 'Sí / No. El laboratorista confirma cada préstamo con su contraseña (normalmente No: solo se revisa al devolver).'],
  ['REGLAMENTO_TEXTO', 'Me comprometo a cumplir el reglamento del laboratorio y a usar bata todo el tiempo que esté en el espacio.', 'Compromiso que el usuario acepta al registrarse.'],
  ['REGLAMENTO_URL', '', 'Opcional. Enlace (https) al reglamento completo; aparece junto a la casilla.'],
  ['AUTORIZAR_DEVOLUCION', 'Sí', 'Sí / No. El laboratorista confirma cada devolución con su contraseña.'],
  ['MINUTOS_SESION', '10', 'Minutos sin actividad para cerrar la sesión del laboratorista en la app.'],
  ['CATEGORIA_LOCKER', 'Locker', 'Los materiales con esta categoría aparecen en el mapa de lockers.'],
  ['LOCKERS_POR_FILA', '9', 'Columnas del mapa de lockers.'],
  ['URL_WEB', 'https://a7236laboratorios-bit.github.io/adminA4-237/inventario.html', 'Opcional. Página en GitHub Pages que usa esta hoja como backend.']
];

const PAGINAS = ['pedir', 'devolver', 'inicio', 'lockers', 'consulta', 'usuarios', 'etiquetas'];
const ALIAS_PAGINA = { prestamo: 'pedir', devolucion: 'devolver', visualizacion: 'lockers' };
const NOMBRE_PAGINA = {
  pedir: 'Pedir material (autoservicio)', devolver: 'Devolver material (autoservicio)',
  inicio: 'Panel del laboratorista', lockers: 'Mapa de lockers', consulta: 'Consulta',
  usuarios: 'Usuarios', etiquetas: 'Etiquetas QR'
};

// ════════════════════════════ MENÚ ════════════════════════════

function onOpen() {
  SpreadsheetApp.getUi().createMenu('📦 Almacén')
    .addItem('Instalar / reparar plantilla', 'instalar')
    .addItem('Abrir la aplicación (enlaces)', 'mostrarEnlaces')
    .addSeparator()
    .addItem('Recalcular disponibilidad', 'recalcular')
    .addItem('Generar lockers', 'generarLockers')
    .addSeparator()
    .addItem('Activar recordatorio diario de vencidos', 'activarRecordatorios')
    .addItem('Desactivar recordatorio diario', 'desactivarRecordatorios')
    .addItem('Enviar recordatorios ahora', 'revisarVencidos')
    .addSeparator()
    .addItem('Borrar datos de ejemplo', 'borrarEjemplos')
    .addToUi();
}

// ════════════════════════════ WEB APP ════════════════════════════

function doGet(e) {
  const params = (e && e.parameter) || {};
  if (params.fn || params.action) {
    let args = [];
    try { args = params.args ? JSON.parse(params.args) : []; } catch (err) { args = []; }
    return ejecutarApi_(params.fn || params.action, args);
  }
  let p = String(params.p || params.pagina || Object.keys(params)[0] || 'pedir').toLowerCase();
  p = ALIAS_PAGINA[p] || p;                   // compatibilidad con enlaces anteriores
  if (PAGINAS.indexOf(p) < 0) p = 'pedir';
  const t = HtmlService.createTemplateFromFile('App');
  t.pagina = p;
  let titulo = 'Préstamo de Material';
  try { titulo = String(getConfig_().NOMBRE_SISTEMA || titulo); } catch (err) { /* hoja sin instalar */ }
  return t.evaluate()
    .setTitle(titulo)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

// ════════════════════════════ API (GitHub Pages) ════════════════════════════
//  inventario.html (alojado en GitHub Pages) llama a esta Web App con
//  POST {fn, args}. Solo se pueden ejecutar las funciones de esta lista.
//  · Autoservicio (sin sesión): identificar, autorregistrarse, pedir, devolver.
//    Pedir y devolver exigen la contraseña del laboratorista que autoriza.
//  · Administración: todo lo demás exige laboratorista + contraseña.

const API_FUNCIONES = {
  // autoservicio
  getAppData, identificarUsuario, registrarUsuario, identificarParaDevolucion,
  registrarPrestamo, registrarDevolucion, getLockers,
  // laboratorista
  validarLaboratorista, getResumen, buscarUsuario, prestamosDeUsuario, buscarParaDevolucion,
  consultar, listarActivos, listarUsuarios, getUsuariosAdmin, guardarUsuario
};

function doPost(e) {
  let body = {};
  try { body = JSON.parse((e && e.postData && e.postData.contents) || '{}'); } catch (err) { body = {}; }
  return ejecutarApi_(body.fn || body.action, Array.isArray(body.args) ? body.args : []);
}

function ejecutarApi_(fn, args) {
  let out;
  try {
    if (!Object.prototype.hasOwnProperty.call(API_FUNCIONES, fn)) throw new Error('Función "' + fn + '" no permitida.');
    out = { ok: true, data: API_FUNCIONES[fn].apply(null, args) };
  } catch (err) {
    out = { ok: false, error: String((err && err.message) || err) };
  }
  return ContentService.createTextOutput(JSON.stringify(out)).setMimeType(ContentService.MimeType.JSON);
}

/** Datos públicos para arrancar la app (sin datos personales). */
function getAppData() {
  const md = modelo_();
  const cfg = md.cfg;
  const color = String(cfg.COLOR_PRINCIPAL || '').trim();
  const logo = String(cfg.LOGO_URL || '').trim();
  return {
    version: VERSION,
    config: {
      sistema: String(cfg.NOMBRE_SISTEMA || 'Préstamo de Material'),
      institucion: String(cfg.NOMBRE_INSTITUCION || ''),
      color: /^#[0-9a-f]{3,8}$/i.test(color) ? color : '#1F6FEB',
      logo: /^https:\/\//i.test(logo) ? logo : '',
      autoregistro: si_(cfg.AUTOREGISTRO),
      autorizarPrestamo: si_(cfg.AUTORIZAR_PRESTAMO),
      reglamentoTexto: String(cfg.REGLAMENTO_TEXTO || '').trim(),
      reglamentoUrl: /^https:\/\//i.test(String(cfg.REGLAMENTO_URL || '').trim()) ? String(cfg.REGLAMENTO_URL).trim() : '',
      autorizarDevolucion: si_(cfg.AUTORIZAR_DEVOLUCION),
      dominioCorreo: dominio_(cfg),
      minutosSesion: Math.max(1, Math.min(240, num_(cfg.MINUTOS_SESION, 10))),
      diasPrestamo: String(cfg.DIAS_PRESTAMO === undefined ? '' : cfg.DIAS_PRESTAMO).trim(),
      lockersPorFila: Math.max(1, Math.min(24, num_(cfg.LOCKERS_POR_FILA, 9))),
      categoriaLocker: String(cfg.CATEGORIA_LOCKER || 'Locker')
    },
    laboratoristas: laboratoristas_().filter(l => l.activo).map(l => l.nombre),
    materiales: md.materiales.map(matPub_),
    resumen: resumen_(md)
  };
}

function getResumen() {
  const md = modelo_();
  return { resumen: resumen_(md), materiales: md.materiales.map(matPub_) };
}

function validarLaboratorista(nombre, pin) {
  const lab = verificarLab_({ lab: nombre, pin: pin });
  return { nombre: lab.nombre };
}

// ─────────────── AUTOSERVICIO (lo usa el propio usuario) ───────────────

/** El usuario escanea su credencial. Devuelve solo lo necesario para atenderlo. */
function identificarUsuario(codigo) {
  const cfg = getConfig_();
  const u = evaluarUsuario_(codigo, cfg, modelo_(cfg), usuarios_(cfg));
  return publicoUsuario_(u, cfg);
}

/**
 * Autorregistro: la credencial no estaba en Usuarios.
 * d = { id, nombre, correo, area? }
 */
function registrarUsuario(d) {
  d = d || {};
  const cfg = getConfig_();
  if (!si_(cfg.AUTOREGISTRO)) throw new Error('El registro de usuarios nuevos está desactivado. Acude con el laboratorista.');
  const id = String(d.id || '').trim();
  const nombre = String(d.nombre || '').replace(/\s+/g, ' ').trim();
  const correo = String(d.correo || '').trim().toLowerCase();
  const area = String(d.area || '').replace(/\s+/g, ' ').trim().slice(0, 80);
  if (!/^[A-Za-z0-9._-]{3,40}$/.test(id)) throw new Error('El ID de la credencial no es válido.');
  if (nombre.length < 5 || nombre.split(' ').length < 2 || nombre.length > 120) throw new Error('Escribe tu nombre completo (nombre y apellidos).');
  if (!emailValido_(correo)) throw new Error('Escribe un correo válido.');
  if (area.length < 2) throw new Error('Escribe tu carrera o área.');
  if (d.acepta !== true) throw new Error('Debes aceptar el reglamento y el uso de bata para registrarte.');
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    if (usuarios_(cfg)[id_(id)]) throw new Error('Ese ID ya está registrado. Vuelve a escanear tu credencial.');
    const t = tabla_(HOJAS.USUARIOS);
    const row = new Array(t.headers.length).fill('');
    const put = (col, v) => { const i = t.c(col, true); if (i >= 0) row[i] = v; };
    put('ID', id); put('Nombre', nombre); put('Correo', correo); put('Área', area);
    put('Estatus', 'Activo'); put('Notas', 'Autorregistro ' + fmt_(new Date()));
    put('Reglamento', 'Aceptado ' + fmt_(new Date()));
    t.sh.getRange(t.sh.getLastRow() + 1, 1, 1, row.length).setValues([row]);
    SpreadsheetApp.flush();
  } finally {
    lock.releaseLock();
  }
  return identificarUsuario(id);
}

/** Devolución: el usuario escanea su credencial o un artículo que tiene. */
function identificarParaDevolucion(codigo) {
  const cfg = getConfig_();
  const md = modelo_(cfg), usuarios = usuarios_(cfg), id = id_(codigo);
  if (!id) throw new Error('Escanea tu credencial o un artículo.');
  if (usuarios[id] || md.activos.some(a => id_(a.usuarioId) === id)) {
    return { tipo: 'usuario', usuario: publicoUsuario_(evaluarUsuario_(id, cfg, md, usuarios), cfg) };
  }
  const conMat = md.activos.filter(a => id_(a.materialId) === id);
  if (conMat.length) {
    const ids = [];
    conMat.forEach(a => { if (ids.indexOf(id_(a.usuarioId)) < 0) ids.push(id_(a.usuarioId)); });
    if (ids.length > 1) throw new Error('"' + conMat[0].material + '" lo tienen varias personas. Escanea tu credencial.');
    return { tipo: 'material', materialId: conMat[0].materialId, usuario: publicoUsuario_(evaluarUsuario_(ids[0], cfg, md, usuarios), cfg) };
  }
  if (md.porId[id]) throw new Error('"' + md.porId[id].nombre + '" no aparece como prestado.');
  throw new Error('No encontramos ese código. Escanea tu credencial.');
}

/** Lo que ve el propio usuario en el kiosco (correo enmascarado). */
function publicoUsuario_(u, cfg) {
  return {
    encontrado: u.encontrado, id: u.id, nombre: u.nombre, area: u.area,
    correo: enmascarar_(u.correo), estatus: u.estatus, vencidos: u.vencidos,
    puedePrestar: u.puedePrestar, motivo: u.motivo, puedeRegistrarse: !u.encontrado && si_(cfg.AUTOREGISTRO),
    activos: u.activos.map(a => ({
      idMov: a.idMov, materialId: a.materialId, material: a.material, cantidad: a.cantidad,
      pendiente: a.pendiente, fecha: a.fecha, limite: a.limite, vencido: a.vencido, dias: a.dias
    }))
  };
}

/** Quién autoriza un movimiento de autoservicio. */
function autorizador_(auth, cfg, requerido, clave) {
  if (!requerido) return { nombre: 'Autoservicio' };
  if (!auth || !String(auth.pin || '').trim()) throw new Error('AUTORIZAR: Falta la contraseña del laboratorista.');
  try {
    return verificarLab_(auth, cfg, clave);
  } catch (e) {
    throw new Error(String(e.message).replace(/^SESION:/, 'AUTORIZAR:'));
  }
}

// ─────────────── ADMINISTRACIÓN (solo laboratorista) ───────────────

function getUsuariosAdmin(auth) {
  const cfg = getConfig_();
  verificarLab_(auth, cfg);
  const md = modelo_(cfg), u = usuarios_(cfg);
  return Object.keys(u).map(k => {
    const act = md.activos.filter(a => id_(a.usuarioId) === k);
    return {
      id: u[k].id, nombre: u[k].nombre, correo: u[k].correo, area: u[k].area, estatus: u[k].estatus, notas: u[k].notas,
      activos: act.reduce((s, a) => s + a.pendiente, 0), vencidos: act.filter(a => a.vencido).length
    };
  });
}

/** Crea o edita un usuario. d = { id, nombre, correo, area, estatus, notas, nuevo } */
function guardarUsuario(auth, d) {
  d = d || {};
  const cfg = getConfig_();
  verificarLab_(auth, cfg);
  const id = String(d.id || '').trim();
  if (!/^[A-Za-z0-9._-]{1,40}$/.test(id)) throw new Error('ID inválido (solo letras, números, punto, guion).');
  const nombre = String(d.nombre || '').replace(/\s+/g, ' ').trim();
  if (!nombre) throw new Error('Falta el nombre.');
  const correo = String(d.correo || '').trim();
  if (correo && !emailValido_(correo)) throw new Error('Correo inválido.');
  const estatus = norm_(d.estatus) === 'bloqueado' ? 'Bloqueado' : 'Activo';
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const t = tabla_(HOJAS.USUARIOS), cId = t.c('ID');
    const i = t.rows.findIndex(r => id_(r[cId]) === id_(id));
    if (d.nuevo && i >= 0) throw new Error('Ya existe un usuario con ese ID.');
    if (!d.nuevo && i < 0) throw new Error('No se encontró el usuario ' + id + '.');
    const row = i >= 0 ? t.rows[i].slice() : new Array(t.headers.length).fill('');
    const put = (col, v) => { const k = t.c(col, true); if (k >= 0) row[k] = v; };
    put('ID', i >= 0 ? row[cId] : id); put('Nombre', nombre); put('Correo', correo);
    put('Área', String(d.area || '').trim()); put('Estatus', estatus); put('Notas', String(d.notas || '').trim().slice(0, 500));
    const fila = i >= 0 ? i + 2 : t.sh.getLastRow() + 1;
    t.sh.getRange(fila, 1, 1, row.length).setValues([row]);
    SpreadsheetApp.flush();
  } finally {
    lock.releaseLock();
  }
  return getUsuariosAdmin(auth);
}

function buscarUsuario(auth, codigo) {
  const cfg = getConfig_();
  verificarLab_(auth, cfg);
  return evaluarUsuario_(codigo, cfg, modelo_(cfg), usuarios_(cfg));
}

function prestamosDeUsuario(auth, codigo) {
  return buscarUsuario(auth, codigo);
}

/**
 * Registra un préstamo.
 * auth = { pin } del laboratorista que autoriza (si AUTORIZAR_PRESTAMO = Sí).
 * p = { usuarioId, articulos: [{id, cantidad}], notas? }
 */
function registrarPrestamo(auth, p) {
  p = p || {};
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  let res, cfg, aviso;
  try {
    cfg = getConfig_();
    const md = modelo_(cfg);
    const u = evaluarUsuario_(p.usuarioId, cfg, md, usuarios_(cfg));
    if (!u.puedePrestar) throw new Error(u.motivo);
    const lab = autorizador_(auth, cfg, si_(cfg.AUTORIZAR_PRESTAMO), 'u_' + id_(u.id));
    const nombreU = u.nombre;

    // Agrupa artículos repetidos
    const pedidos = {}, orden = [];
    (p.articulos || []).forEach(a => {
      const id = id_(a && a.id);
      if (!id) return;
      const c = Number(a.cantidad);
      if (!(c >= 1) || Math.floor(c) !== c) throw new Error('Cantidad inválida para "' + a.id + '".');
      if (!(id in pedidos)) { pedidos[id] = 0; orden.push(id); }
      pedidos[id] += c;
    });
    if (!orden.length) throw new Error('Agrega al menos un artículo.');

    // Valida existencia y disponibilidad (con el candado puesto, no hay carreras)
    const errores = [];
    orden.forEach(id => {
      const m = md.porId[id];
      if (!m) errores.push('"' + id + '" no existe en Materiales');
      else if (pedidos[id] > m.disponible) errores.push(m.nombre + ' (' + m.id + '): pediste ' + pedidos[id] + ', hay ' + m.disponible + ' disponible(s)');
    });
    if (errores.length) throw new Error('No se registró el préstamo:\n• ' + errores.join('\n• '));

    const ahora = new Date();
    const limite = fechaLimite_(ahora, cfg);
    const correo = u.correo;
    const notas = String(p.notas || '').trim().slice(0, 500);
    const H = md.H, ncol = md.th.headers.length;
    let seq = siguienteSeq_(md);

    const filas = orden.map(id => {
      const m = md.porId[id];
      const row = new Array(ncol).fill('');
      const put = (i, v) => { if (i >= 0) row[i] = v; };
      put(H.idMov, 'P' + String(seq++).padStart(6, '0'));
      put(H.fecha, ahora);
      put(H.mat, m.id);
      put(H.matNom, m.nombre);
      put(H.usr, u.id);
      put(H.usrNom, nombreU);
      put(H.correo, correo);
      put(H.area, u.area);
      put(H.entrego, lab.nombre);
      put(H.cant, pedidos[id]);
      put(H.limite, limite);
      put(H.dev, 0);
      put(H.estado, 'Prestado');
      put(H.notas, notas);
      return row;
    });
    const sh = md.th.sh;
    sh.getRange(sh.getLastRow() + 1, 1, filas.length, ncol).setValues(filas);
    SpreadsheetApp.flush();

    const md2 = actualizarMateriales_(cfg);
    const items = orden.map(id => ({ id: md.porId[id].id, nombre: md.porId[id].nombre, cantidad: pedidos[id] }));
    res = {
      ok: true, usuario: nombreU, usuarioId: u.id, items: items,
      fechaLimite: fmt_(limite, 'dd/MM/yyyy'), correo: '',
      materiales: md2.materiales.map(matPub_), resumen: resumen_(md2)
    };
    aviso = { para: correo, nombre: nombreU, id: u.id, items: items, fecha: ahora, limite: limite, lab: lab.nombre };
  } finally {
    lock.releaseLock();
  }
  // El correo se manda fuera del candado para no frenar a otros mostradores
  if (correoPrestamo_(cfg, aviso)) res.correo = enmascarar_(aviso.para);
  return res;
}

/**
 * Busca qué devolver a partir de un código escaneado: puede ser la credencial
 * del usuario o directamente un artículo prestado.
 */
function buscarParaDevolucion(auth, codigo) {
  const cfg = getConfig_();
  verificarLab_(auth, cfg);
  const md = modelo_(cfg), usuarios = usuarios_(cfg), id = id_(codigo);
  if (!id) throw new Error('Escanea la credencial o un artículo.');

  if (usuarios[id] || md.activos.some(a => id_(a.usuarioId) === id)) {
    return { tipo: 'usuario', usuario: evaluarUsuario_(id, cfg, md, usuarios) };
  }
  const conMat = md.activos.filter(a => id_(a.materialId) === id);
  if (conMat.length) {
    const ids = [];
    conMat.forEach(a => { if (ids.indexOf(id_(a.usuarioId)) < 0) ids.push(id_(a.usuarioId)); });
    if (ids.length === 1) {
      return { tipo: 'material', materialId: conMat[0].materialId, usuario: evaluarUsuario_(ids[0], cfg, md, usuarios) };
    }
    return {
      tipo: 'elegir', materialId: conMat[0].materialId, material: conMat[0].material,
      poseedores: ids.map(x => {
        const l = conMat.filter(a => id_(a.usuarioId) === x);
        return { id: l[0].usuarioId, nombre: l[0].usuario, pendiente: l.reduce((s, a) => s + a.pendiente, 0) };
      })
    };
  }
  if (md.porId[id]) throw new Error('"' + md.porId[id].nombre + '" no está prestado en este momento.');
  throw new Error('No se encontró ningún usuario ni artículo prestado con el código "' + String(codigo).trim() + '".');
}

/**
 * Registra una devolución (total o parcial).
 * p = { usuarioId, items: [{idMov, cantidad}], notas? }
 */
function registrarDevolucion(auth, p) {
  p = p || {};
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  let res, cfg, aviso;
  try {
    cfg = getConfig_();
    const md = modelo_(cfg);
    const uid = id_(p.usuarioId);
    if (!uid) throw new Error('Falta el usuario que devuelve.');
    const lab = autorizador_(auth, cfg, si_(cfg.AUTORIZAR_DEVOLUCION), 'u_' + uid);

    const agg = {}, orden = [];
    (p.items || []).forEach(it => {
      const k = String((it && it.idMov) || '').trim();
      const c = Number(it && it.cantidad);
      if (!k || !c) return;
      if (!(c >= 1) || Math.floor(c) !== c) throw new Error('Cantidad inválida en ' + k + '.');
      if (!(k in agg)) { agg[k] = 0; orden.push(k); }
      agg[k] += c;
    });
    if (!orden.length) throw new Error('Marca al menos un artículo para devolver.');

    const porMov = {};
    md.activos.forEach(a => { porMov[a.idMov] = a; });
    const errores = [];
    orden.forEach(k => {
      const a = porMov[k];
      if (!a) errores.push('El movimiento ' + k + ' ya no tiene piezas pendientes');
      else if (id_(a.usuarioId) !== uid) errores.push(a.material + ' no está prestado a este usuario');
      else if (agg[k] > a.pendiente) errores.push(a.material + ': solo tiene ' + a.pendiente + ' pieza(s) pendiente(s)');
    });
    if (errores.length) throw new Error('No se registró la devolución:\n• ' + errores.join('\n• '));

    const ahora = new Date(), sh = md.th.sh, H = md.H;
    const notas = String(p.notas || '').trim().slice(0, 500);
    const items = [];
    let correo = '', nombreU = '';
    orden.forEach(k => {
      const a = porMov[k];
      const nueva = a.devuelta + agg[k];
      const completo = nueva >= a.cantidad;
      sh.getRange(a.fila, H.dev + 1).setValue(nueva);
      sh.getRange(a.fila, H.estado + 1).setValue(completo ? 'Devuelto' : 'Parcial');
      sh.getRange(a.fila, H.fechaDev + 1).setValue(ahora);
      sh.getRange(a.fila, H.recibio + 1).setValue(lab.nombre);
      if (notas && H.notas >= 0) {
        const prev = String(md.th.rows[a.fila - 2][H.notas] || '').trim();
        sh.getRange(a.fila, H.notas + 1).setValue((prev ? prev + ' | ' : '') + 'Dev: ' + notas);
      }
      items.push({ id: a.materialId, nombre: a.material, cantidad: agg[k], pendiente: a.cantidad - nueva });
      correo = correo || a.correo;
      nombreU = nombreU || a.usuario;
    });
    SpreadsheetApp.flush();

    const md2 = actualizarMateriales_(cfg);
    const restantes = md2.activos.filter(a => id_(a.usuarioId) === uid);
    res = {
      ok: true, usuario: nombreU, items: items, correo: '',
      restantes: restantes.reduce((s, a) => s + a.pendiente, 0),
      materiales: md2.materiales.map(matPub_), resumen: resumen_(md2)
    };
    aviso = { para: correo, nombre: nombreU, items: items, fecha: ahora, lab: lab.nombre, restantes: restantes };
  } finally {
    lock.releaseLock();
  }
  if (correoDevolucion_(cfg, aviso)) res.correo = enmascarar_(aviso.para);
  return res;
}

/** Mapa de lockers. Sin sesión válida no se exponen datos personales. */
function getLockers(auth) {
  const cfg = getConfig_();
  let detalle = false;
  if (auth && auth.lab) {
    try { verificarLab_(auth, cfg); detalle = true; } catch (e) { detalle = false; }
  }
  const md = modelo_(cfg);
  const cat = norm_(cfg.CATEGORIA_LOCKER || 'Locker');
  const lockers = md.materiales.filter(m => norm_(m.categoria) === cat).map(m => {
    const act = md.activos.filter(a => id_(a.materialId) === id_(m.id));
    return {
      id: m.id, nombre: m.nombre, ubicacion: m.ubicacion,
      ocupado: act.length > 0, vencido: act.some(a => a.vencido),
      prestamos: act.map(a => detalle ? movPub_(a) : {
        fecha: fmt_(a.fecha, 'dd/MM/yyyy'), limite: fmt_(a.limite, 'dd/MM/yyyy'), dias: dias_(a.fecha), vencido: a.vencido
      })
    };
  });
  return { detalle: detalle, lockers: lockers };
}

/** Busca por ID de usuario, ID de material o por texto en nombres. */
function consultar(auth, texto) {
  const cfg = getConfig_();
  verificarLab_(auth, cfg);
  const md = modelo_(cfg), usuarios = usuarios_(cfg);
  const id = id_(texto), q = norm_(texto);
  if (!q) throw new Error('Escribe o escanea algo para buscar.');
  const out = { usuario: null, material: null, movimientos: [], coincidencias: [] };

  if (usuarios[id] || md.movs.some(m => id_(m.usuarioId) === id)) {
    out.usuario = evaluarUsuario_(id, cfg, md, usuarios);
    out.movimientos = md.movs.filter(m => id_(m.usuarioId) === id);
  } else if (md.porId[id] || md.movs.some(m => id_(m.materialId) === id)) {
    out.material = md.porId[id] ? matPub_(md.porId[id]) : { id: String(texto).trim(), nombre: '(ya no está en Materiales)' };
    out.movimientos = md.movs.filter(m => id_(m.materialId) === id);
  } else {
    Object.keys(usuarios).forEach(k => {
      const u = usuarios[k];
      if (norm_(u.nombre).indexOf(q) >= 0 || norm_(u.id).indexOf(q) >= 0) out.coincidencias.push({ tipo: 'Usuario', id: u.id, nombre: u.nombre, extra: u.area });
    });
    md.materiales.forEach(m => {
      if (norm_(m.nombre).indexOf(q) >= 0 || norm_(m.id).indexOf(q) >= 0) out.coincidencias.push({ tipo: 'Material', id: m.id, nombre: m.nombre, extra: m.ubicacion });
    });
    out.coincidencias = out.coincidencias.slice(0, 40);
  }
  out.movimientos = out.movimientos.slice().reverse().slice(0, 300).map(movPub_);
  return out;
}

function listarActivos(auth, soloVencidos) {
  const cfg = getConfig_();
  verificarLab_(auth, cfg);
  const md = modelo_(cfg);
  return md.activos
    .filter(a => !soloVencidos || a.vencido)
    .sort((a, b) => (a.limite ? a.limite.getTime() : 9e15) - (b.limite ? b.limite.getTime() : 9e15))
    .map(movPub_);
}

function listarUsuarios(auth) {
  const cfg = getConfig_();
  verificarLab_(auth, cfg);
  const u = usuarios_(cfg);
  return Object.keys(u).map(k => ({ id: u[k].id, nombre: u[k].nombre, area: u[k].area }));
}

// ════════════════════════════ MODELO ════════════════════════════

/** Lee Materiales + Historial una sola vez y calcula disponibilidad. */
function modelo_(cfg) {
  cfg = cfg || getConfig_();
  const tm = tabla_(HOJAS.MATERIALES);
  const M = {
    id: tm.c('ID'), nombre: tm.c('Nombre'), cat: tm.c('Categoría', true),
    ubi: tm.c('Ubicación', true), total: tm.c('Cantidad total', true)
  };
  const materiales = [], porId = {}, duplicados = [];
  tm.rows.forEach((r, i) => {
    const id = id_(r[M.id]);
    if (!id) return;
    if (porId[id]) { duplicados.push(i + 2); return; }
    const m = {
      fila: i + 2,
      id: String(r[M.id]).trim(),
      nombre: String(r[M.nombre]).trim() || String(r[M.id]).trim(),
      categoria: String(cel_(r, M.cat)).trim(),
      ubicacion: String(cel_(r, M.ubi)).trim(),
      total: Math.max(0, num_(cel_(r, M.total), 1)),
      prestado: 0
    };
    materiales.push(m);
    porId[id] = m;
  });

  const th = tabla_(HOJAS.HISTORIAL);
  const H = colsHist_(th);
  const ahora = Date.now();
  const movs = [];
  th.rows.forEach((r, i) => {
    const idMov = String(r[H.idMov]).trim();
    if (!idMov) return;
    const cant = Math.max(0, num_(r[H.cant], 1));
    const dev = Math.min(Math.max(0, num_(r[H.dev], 0)), cant);
    const estadoTxt = String(r[H.estado]).trim();
    const est = norm_(estadoTxt);
    const pend = (est === 'devuelto' || est === 'cancelado') ? 0 : cant - dev;
    const lim = fecha_(cel_(r, H.limite));
    const mov = {
      fila: i + 2, idMov: idMov,
      fecha: fecha_(r[H.fecha]),
      materialId: String(r[H.mat]).trim(), material: String(r[H.matNom]).trim(),
      usuarioId: String(r[H.usr]).trim(), usuario: String(cel_(r, H.usrNom)).trim(),
      correo: String(cel_(r, H.correo)).trim(), area: String(cel_(r, H.area)).trim(),
      entrego: String(cel_(r, H.entrego)).trim(),
      cantidad: cant, devuelta: dev, pendiente: pend, limite: lim,
      estado: estadoTxt || (pend ? 'Prestado' : 'Devuelto'),
      fechaDev: fecha_(r[H.fechaDev]), recibio: String(r[H.recibio]).trim(),
      activo: pend > 0,
      vencido: pend > 0 && !!lim && lim.getTime() < ahora
    };
    movs.push(mov);
    if (pend > 0) {
      const m = porId[id_(mov.materialId)];
      if (m) m.prestado += pend;
    }
  });
  materiales.forEach(m => {
    m.disponible = Math.max(m.total - m.prestado, 0);
    m.estatus = estatusMat_(m);
  });
  return { cfg, tm, th, H, materiales, porId, duplicados, movs, activos: movs.filter(x => x.activo) };
}

function colsHist_(th) {
  return {
    idMov: th.c('ID Movimiento'), fecha: th.c('Fecha préstamo'), mat: th.c('ID Material'), matNom: th.c('Material'),
    usr: th.c('ID Usuario'), usrNom: th.c('Usuario', true), correo: th.c('Correo', true), area: th.c('Área', true),
    entrego: th.c('Entregó', true), cant: th.c('Cantidad'), limite: th.c('Fecha límite', true),
    dev: th.c('Cantidad devuelta'), estado: th.c('Estado'), fechaDev: th.c('Fecha devolución'),
    recibio: th.c('Recibió'), notas: th.c('Notas', true)
  };
}

function estatusMat_(m) {
  if (m.total <= 0) return 'Sin existencias';
  if (m.prestado <= 0) return 'Disponible';
  if (m.disponible <= 0) return m.total > 1 ? 'Agotado' : 'Prestado';
  return 'Parcial';
}

/** Escribe Disponible y Estatus en la hoja Materiales (en bloque). */
function actualizarMateriales_(cfg) {
  const md = modelo_(cfg);
  const tm = md.tm, n = tm.rows.length;
  if (!n) return md;
  const cDisp = tm.c('Disponible', true), cEst = tm.c('Estatus', true);
  const disp = tm.rows.map(() => ['']), est = tm.rows.map(() => ['']);
  md.materiales.forEach(m => { disp[m.fila - 2][0] = m.disponible; est[m.fila - 2][0] = m.estatus; });
  md.duplicados.forEach(f => { est[f - 2][0] = 'ID duplicado'; });
  if (cDisp >= 0) tm.sh.getRange(2, cDisp + 1, n, 1).setValues(disp);
  if (cEst >= 0) tm.sh.getRange(2, cEst + 1, n, 1).setValues(est);
  return md;
}

function usuarios_(cfg) {
  const t = tabla_(HOJAS.USUARIOS);
  const U = { id: t.c('ID'), nombre: t.c('Nombre'), correo: t.c('Correo', true), area: t.c('Área', true), estatus: t.c('Estatus', true), notas: t.c('Notas', true) };
  const map = {};
  t.rows.forEach(r => {
    const id = id_(r[U.id]);
    if (!id || map[id]) return;
    const idTxt = String(r[U.id]).trim();
    map[id] = {
      id: idTxt,
      nombre: String(r[U.nombre]).trim(),
      correo: correoDe_(idTxt, cel_(r, U.correo), cfg),
      area: String(cel_(r, U.area)).trim(),
      estatus: String(cel_(r, U.estatus)).trim() || 'Activo',
      notas: String(cel_(r, U.notas)).trim()
    };
  });
  return map;
}

function evaluarUsuario_(codigo, cfg, md, usuarios) {
  const id = id_(codigo);
  if (!id) throw new Error('Escanea o escribe el ID del usuario.');
  const u = usuarios[id];
  const act = md.activos.filter(a => id_(a.usuarioId) === id);
  const nVenc = act.filter(a => a.vencido).length;
  const r = {
    encontrado: !!u,
    id: u ? u.id : String(codigo).trim(),
    nombre: u ? u.nombre : (act[0] ? act[0].usuario : ''),
    correo: u ? u.correo : '',
    area: u ? u.area : '',
    estatus: u ? u.estatus : 'No registrado',
    activos: act.map(movPub_),
    vencidos: nVenc,
    puedePrestar: true,
    motivo: ''
  };
  if (!u) {
    r.puedePrestar = false;
    r.motivo = si_(cfg.AUTOREGISTRO)
      ? 'Tu credencial aún no está registrada.'
      : 'El ID "' + r.id + '" no está registrado. Acude con el laboratorista.';
  } else if (u && norm_(u.estatus) === 'bloqueado') {
    r.puedePrestar = false;
    r.motivo = 'Usuario BLOQUEADO.' + (u.notas && norm_(u.notas) !== 'ejemplo' ? ' Motivo: ' + u.notas : '');
  } else if (nVenc && si_(cfg.BLOQUEAR_CON_VENCIDOS)) {
    r.puedePrestar = false;
    r.motivo = 'Tiene ' + nVenc + ' préstamo(s) vencido(s). Debe devolverlos antes de pedir más.';
  }
  return r;
}

function laboratoristas_() {
  const t = tabla_(HOJAS.LABS);
  const c = { n: t.c('Nombre'), pin: t.c('PIN', true), correo: t.c('Correo', true), act: t.c('Activo', true) };
  return t.rows.filter(r => String(r[c.n]).trim()).map(r => ({
    nombre: String(r[c.n]).trim(),
    pin: String(cel_(r, c.pin)).trim(),
    correo: String(cel_(r, c.correo)).trim(),
    activo: String(cel_(r, c.act)).trim() === '' ? true : si_(cel_(r, c.act))
  }));
}

/** Valida al laboratorista (y su PIN). Bloquea 5 min tras 5 intentos fallidos. */
/**
 * Valida al laboratorista por su contraseña (columna PIN de la hoja Laboratoristas).
 *  · auth = { lab, pin } → inicio de sesión del modo administrador.
 *  · auth = { pin }      → autorización en el kiosco: se identifica solo con la contraseña.
 * Bloquea 5 minutos tras 5 intentos fallidos (por laboratorista o por usuario del kiosco).
 */
function verificarLab_(auth, cfg, clave) {
  cfg = cfg || getConfig_();
  auth = auth || {};
  const nombre = String(auth.lab || '').trim();
  const pin = String(auth.pin || '').trim();
  if (!nombre && !pin) throw new Error('SESION: Inicia sesión como laboratorista.');
  const cache = CacheService.getScriptCache();
  const key = 'pinfail_' + norm_(nombre || clave || 'kiosco').replace(/[^a-z0-9]/g, '_').slice(0, 200);
  const fallos = Number(cache.get(key) || 0);
  if (fallos >= 5) throw new Error('SESION: Demasiados intentos fallidos. Espera 5 minutos.');
  const activos = laboratoristas_().filter(l => l.activo);
  const fallar = msg => { cache.put(key, String(fallos + 1), 300); throw new Error('SESION: ' + msg); };
  let lab;
  if (nombre) {
    lab = activos.find(l => norm_(l.nombre) === norm_(nombre));
    if (!lab) throw new Error('SESION: "' + nombre + '" no existe o está inactivo en la hoja Laboratoristas.');
    if (!lab.pin) throw new Error('SESION: ' + lab.nombre + ' no tiene contraseña en la hoja Laboratoristas.');
    if (pin !== lab.pin) fallar('Contraseña incorrecta.');
  } else {
    const l = activos.filter(x => x.pin && x.pin === pin);
    if (!l.length) fallar('Contraseña de laboratorista incorrecta.');
    if (l.length > 1) throw new Error('SESION: Esa contraseña la comparten varios laboratoristas; cada uno debe tener la suya.');
    lab = l[0];
  }
  if (fallos) cache.remove(key);
  return lab;
}

function resumen_(md) {
  const usuarios = {};
  let piezas = 0, vencidos = 0;
  md.activos.forEach(a => {
    usuarios[id_(a.usuarioId)] = 1;
    piezas += a.pendiente;
    if (a.vencido) vencidos++;
  });
  return {
    prestamosActivos: md.activos.length,
    piezasFuera: piezas,
    vencidos: vencidos,
    usuariosConMaterial: Object.keys(usuarios).length,
    materiales: md.materiales.length,
    agotados: md.materiales.filter(m => m.total > 0 && m.disponible === 0).length
  };
}

function matPub_(m) {
  return {
    id: m.id, nombre: m.nombre, categoria: m.categoria, ubicacion: m.ubicacion,
    total: m.total, prestado: m.prestado, disponible: m.disponible, estatus: m.estatus
  };
}

function movPub_(a) {
  return {
    idMov: a.idMov, materialId: a.materialId, material: a.material,
    usuarioId: a.usuarioId, usuario: a.usuario, area: a.area, entrego: a.entrego,
    cantidad: a.cantidad, devuelta: a.devuelta, pendiente: a.pendiente, estado: a.estado,
    fecha: fmt_(a.fecha), limite: fmt_(a.limite, 'dd/MM/yyyy'), vencido: a.vencido,
    dias: dias_(a.fecha), fechaDev: fmt_(a.fechaDev), recibio: a.recibio
  };
}

function siguienteSeq_(md) {
  let max = 0;
  md.th.rows.forEach(r => {
    const m = /^P(\d+)$/i.exec(String(r[md.H.idMov]).trim());
    if (m) max = Math.max(max, Number(m[1]));
  });
  return max + 1;
}

function fechaLimite_(ahora, cfg) {
  const v = String(cfg.DIAS_PRESTAMO === undefined ? '' : cfg.DIAS_PRESTAMO).trim();
  if (v === '' || isNaN(Number(v))) return '';
  const d = new Date(ahora.getTime());
  d.setDate(d.getDate() + Math.max(0, Math.floor(Number(v))));
  d.setHours(23, 59, 0, 0);
  return d;
}

// ════════════════════════════ CORREOS ════════════════════════════

function correoPrestamo_(cfg, a) {
  if (!a) return false;
  const filas = a.items.map(i => [i.id, i.nombre, i.cantidad]);
  const cuerpo =
    '<p>Hola <b>' + esc_(a.nombre) + '</b>,</p>' +
    '<p>Se registró el siguiente préstamo a tu nombre (ID ' + esc_(a.id) + '):</p>' +
    tablaCorreo_(['ID', 'Material', 'Cant.'], filas) +
    '<p>Fecha: ' + fmt_(a.fecha) + '<br>Entregó: ' + esc_(a.lab) +
    (a.limite ? '<br><b>Devolver a más tardar el ' + fmt_(a.limite, 'dd/MM/yyyy') + '</b>' : '') + '</p>' +
    '<p style="color:#6b7280">Eres responsable del material hasta que lo devuelvas.</p>';
  return enviarCorreo_(cfg, a.para, 'Préstamo registrado', cuerpo);
}

function correoDevolucion_(cfg, a) {
  if (!a) return false;
  const filas = a.items.map(i => [i.id, i.nombre, i.cantidad]);
  let cuerpo =
    '<p>Hola <b>' + esc_(a.nombre) + '</b>,</p>' +
    '<p>Se registró la devolución de:</p>' +
    tablaCorreo_(['ID', 'Material', 'Cant.'], filas) +
    '<p>Fecha: ' + fmt_(a.fecha) + '<br>Recibió: ' + esc_(a.lab) + '</p>';
  if (a.restantes && a.restantes.length) {
    cuerpo += '<p><b>Aún tienes pendiente:</b></p>' +
      tablaCorreo_(['ID', 'Material', 'Pend.', 'Límite'], a.restantes.map(r => [r.materialId, r.material, r.pendiente, fmt_(r.limite, 'dd/MM/yyyy')]));
  } else {
    cuerpo += '<p style="color:#16a34a"><b>No tienes material pendiente. ¡Gracias!</b></p>';
  }
  return enviarCorreo_(cfg, a.para, 'Devolución registrada', cuerpo);
}

function enviarCorreo_(cfg, para, asunto, cuerpo) {
  if (!si_(cfg.ENVIAR_CORREOS) || !emailValido_(para)) return false;
  try {
    if (MailApp.getRemainingDailyQuota() < 1) { console.warn('Sin cuota diaria de correo.'); return false; }
    const color = /^#[0-9a-f]{3,8}$/i.test(String(cfg.COLOR_PRINCIPAL).trim()) ? String(cfg.COLOR_PRINCIPAL).trim() : '#1F6FEB';
    const html =
      '<div style="font-family:Arial,Helvetica,sans-serif;max-width:620px;margin:auto;border:1px solid #e5e7eb;border-radius:10px;overflow:hidden">' +
      '<div style="background:' + color + ';color:#fff;padding:16px 20px">' +
      '<div style="font-size:18px;font-weight:bold">' + esc_(cfg.NOMBRE_SISTEMA) + '</div>' +
      '<div style="font-size:13px;opacity:.9">' + esc_(cfg.NOMBRE_INSTITUCION) + '</div></div>' +
      '<div style="padding:20px;color:#111827;font-size:14px;line-height:1.5">' + cuerpo + '</div>' +
      '<div style="padding:12px 20px;background:#f9fafb;color:#6b7280;font-size:12px">Mensaje automático del sistema de préstamos.</div></div>';
    const opts = { to: para, subject: asunto + ' · ' + cfg.NOMBRE_SISTEMA, htmlBody: html, name: String(cfg.NOMBRE_SISTEMA) };
    if (emailValido_(cfg.CORREO_ADMIN)) opts.replyTo = String(cfg.CORREO_ADMIN).trim();
    MailApp.sendEmail(opts);
    return true;
  } catch (e) {
    console.error('No se pudo enviar correo a ' + para + ': ' + e);
    return false;
  }
}

function tablaCorreo_(enc, filas) {
  const td = 'style="border-bottom:1px solid #e5e7eb;padding:6px 8px;text-align:left"';
  return '<table style="border-collapse:collapse;width:100%;font-size:13px"><tr>' +
    enc.map(h => '<th ' + td + '>' + esc_(h) + '</th>').join('') + '</tr>' +
    filas.map(f => '<tr>' + f.map(v => '<td ' + td + '>' + esc_(v) + '</td>').join('') + '</tr>').join('') +
    '</table>';
}

// ════════════════════════════ RECORDATORIOS ════════════════════════════

/** Avisa a cada usuario con material vencido y manda un resumen al admin. */
function revisarVencidos() {
  const cfg = getConfig_();
  const md = actualizarMateriales_(cfg);
  const usuarios = usuarios_(cfg);
  const venc = md.activos.filter(a => a.vencido);
  const porUsuario = {};
  venc.forEach(a => { const k = id_(a.usuarioId); (porUsuario[k] = porUsuario[k] || []).push(a); });
  let enviados = 0;
  Object.keys(porUsuario).forEach(k => {
    const l = porUsuario[k];
    const para = (usuarios[k] && usuarios[k].correo) || l[0].correo;
    const cuerpo =
      '<p>Hola <b>' + esc_(l[0].usuario) + '</b>,</p>' +
      '<p>Tienes material <b style="color:#dc2626">vencido</b>. Por favor devuélvelo lo antes posible:</p>' +
      tablaCorreo_(['ID', 'Material', 'Pend.', 'Venció'], l.map(a => [a.materialId, a.material, a.pendiente, fmt_(a.limite, 'dd/MM/yyyy')]));
    if (enviarCorreo_(cfg, para, 'Material vencido', cuerpo)) enviados++;
  });
  if (venc.length && emailValido_(cfg.CORREO_ADMIN)) {
    enviarCorreo_(cfg, String(cfg.CORREO_ADMIN).trim(), 'Resumen de vencidos (' + venc.length + ')',
      '<p>Préstamos vencidos al ' + fmt_(new Date()) + ':</p>' +
      tablaCorreo_(['Usuario', 'ID', 'Material', 'Pend.', 'Venció'],
        venc.map(a => [a.usuario, a.usuarioId, a.material, a.pendiente, fmt_(a.limite, 'dd/MM/yyyy')])));
  }
  const r = { vencidos: venc.length, usuarios: Object.keys(porUsuario).length, correos: enviados };
  toast_(r.vencidos + ' préstamo(s) vencido(s) · ' + r.correos + ' correo(s) enviado(s).');
  return r;
}

function activarRecordatorios() {
  desactivarRecordatorios(true);
  ScriptApp.newTrigger('revisarVencidos').timeBased().everyDays(1).atHour(8).create();
  avisar_('Listo. Todos los días entre 8 y 9 a.m. se avisará por correo a quien tenga material vencido' +
    ' y se mandará un resumen a CORREO_ADMIN (si está configurado).');
}

function desactivarRecordatorios(silencioso) {
  ScriptApp.getProjectTriggers().forEach(t => {
    if (t.getHandlerFunction() === 'revisarVencidos') ScriptApp.deleteTrigger(t);
  });
  if (silencioso !== true) avisar_('Recordatorio diario desactivado.');
}

// ════════════════════════════ ADMINISTRACIÓN ════════════════════════════

function recalcular() {
  actualizarMateriales_();
  toast_('Disponibilidad recalculada.');
}

function mostrarEnlaces() {
  let url = '';
  try { url = ScriptApp.getService().getUrl(); } catch (e) { url = ''; }
  if (!url) {
    avisar_('Todavía no publicas la aplicación.\n\nEn Extensiones > Apps Script: Implementar > Nueva implementación > Aplicación web. (Ver INSTALACION.md)');
    return;
  }
  const web = String(getConfig_().URL_WEB || '').trim();
  const base = /^https:\/\//i.test(web) ? web + '?api=' + encodeURIComponent(url) + '&p=' : url + '?p=';
  const items = PAGINAS.map(p =>
    '<li style="margin-bottom:10px"><a target="_blank" href="' + esc_(base + p) + '">' + NOMBRE_PAGINA[p] + '</a><br>' +
    '<code style="font-size:11px;color:#555">' + esc_(base + p) + '</code></li>').join('');
  SpreadsheetApp.getUi().showModalDialog(
    HtmlService.createHtmlOutput('<div style="font-family:Arial;font-size:13px">' +
      '<p><b>URL del backend (/exec)</b> — pégala en DEFAULT_API_URL de inventario.html:<br><code style="font-size:11px">' + esc_(url) + '</code></p>' +
      '<ul style="padding-left:18px">' + items + '</ul>' +
      '<p style="color:#666">Tip: abre "Préstamo" en la computadora del mostrador y guárdalo en favoritos.</p></div>')
      .setWidth(680).setHeight(520),
    'Enlaces de la aplicación');
}

function generarLockers() {
  const ui = ui_();
  let n = 12;
  if (ui) {
    const r = ui.prompt('Generar lockers', '¿Cuántos lockers hay? Se crean como L1, L2, L3… (los que ya existen no se duplican).', ui.ButtonSet.OK_CANCEL);
    if (r.getSelectedButton() !== ui.Button.OK) return;
    n = parseInt(r.getResponseText(), 10);
    if (!(n > 0 && n <= 2000)) { ui.alert('Escribe un número entre 1 y 2000.'); return; }
  }
  const cfg = getConfig_(), md = modelo_(cfg), tm = md.tm;
  const cat = String(cfg.CATEGORIA_LOCKER || 'Locker');
  const nuevos = [];
  for (let i = 1; i <= n; i++) {
    const id = 'L' + i;
    if (md.porId[id_(id)]) continue;
    const row = new Array(tm.headers.length).fill('');
    row[tm.c('ID')] = id;
    row[tm.c('Nombre')] = 'Locker ' + i;
    if (tm.c('Categoría', true) >= 0) row[tm.c('Categoría', true)] = cat;
    if (tm.c('Cantidad total', true) >= 0) row[tm.c('Cantidad total', true)] = 1;
    nuevos.push(row);
  }
  if (nuevos.length) tm.sh.getRange(tm.sh.getLastRow() + 1, 1, nuevos.length, tm.headers.length).setValues(nuevos);
  actualizarMateriales_(cfg);
  avisar_(nuevos.length + ' locker(s) agregado(s) a la hoja Materiales.');
}

function borrarEjemplos() {
  const ui = ui_();
  if (ui && ui.alert('Borrar datos de ejemplo',
    'Se eliminarán las filas que digan "Ejemplo" en la columna Notas (Materiales, Usuarios, Laboratoristas e Historial). ¿Continuar?',
    ui.ButtonSet.YES_NO) !== ui.Button.YES) return;
  let total = 0;
  [HOJAS.HISTORIAL, HOJAS.MATERIALES, HOJAS.USUARIOS, HOJAS.LABS].forEach(h => {
    const t = tabla_(h), c = t.c('Notas', true);
    if (c < 0) return;
    for (let i = t.rows.length - 1; i >= 0; i--) {
      if (norm_(t.rows[i][c]) === 'ejemplo') { t.sh.deleteRow(i + 2); total++; }
    }
  });
  actualizarMateriales_();
  avisar_(total + ' fila(s) de ejemplo eliminada(s).\n\nAgrega al menos un laboratorista (con PIN) en la hoja Laboratoristas para poder usar la app.');
}

// ════════════════════════════ INSTALADOR ════════════════════════════

/** Crea (o repara) toda la estructura en una hoja de cálculo en blanco. */
function instalar() {
  const ss = SpreadsheetApp.getActive();
  const nuevas = [];
  [HOJAS.CONFIG, HOJAS.MATERIALES, HOJAS.USUARIOS, HOJAS.LABS, HOJAS.HISTORIAL].forEach((nombre, i) => {
    let sh = ss.getSheetByName(nombre), nueva = false;
    if (!sh) {
      sh = ss.insertSheet(nombre, Math.min(i, ss.getSheets().length));
      nueva = true;
      nuevas.push(nombre);
    }
    asegurarEncabezados_(sh, COLUMNAS[nombre]);
    if (nueva) {
      darFormato_(sh, nombre);
      datosEjemplo_(sh, nombre);
    }
  });
  completarConfig_();
  ['Hoja 1', 'Hoja1', 'Sheet1', 'Sheet 1'].forEach(n => {
    const s = ss.getSheetByName(n);
    if (s && s.getLastRow() === 0 && ss.getSheets().length > 1) ss.deleteSheet(s);
  });
  actualizarMateriales_();
  avisar_(nuevas.length
    ? 'Plantilla instalada (' + nuevas.join(', ') + ').\n\n' +
      '1) Ajusta la hoja Configuración.\n2) Cambia la contraseña 1234 del laboratorista de ejemplo (columna PIN).\n' +
      '3) Publica la app: Extensiones > Apps Script > Implementar > Nueva implementación > Aplicación web.\n' +
      '4) Cuando cargues tus datos reales usa Almacén > Borrar datos de ejemplo.'
    : 'La estructura ya estaba completa. Se agregaron las columnas o claves de configuración que faltaban.');
}

function asegurarEncabezados_(sh, cols) {
  const lastCol = sh.getLastColumn();
  if (!lastCol) { sh.getRange(1, 1, 1, cols.length).setValues([cols]); return; }
  const actuales = sh.getRange(1, 1, 1, lastCol).getValues()[0].map(norm_);
  const faltan = cols.filter(c => actuales.indexOf(norm_(c)) < 0);
  if (faltan.length) sh.getRange(1, lastCol + 1, 1, faltan.length).setValues([faltan]);
}

function completarConfig_() {
  const sh = SpreadsheetApp.getActive().getSheetByName(HOJAS.CONFIG);
  const last = sh.getLastRow();
  const existentes = last > 1 ? sh.getRange(2, 1, last - 1, 1).getValues().map(r => String(r[0]).trim().toUpperCase()) : [];
  const faltan = CONFIG_DEFAULT.filter(r => existentes.indexOf(r[0]) < 0);
  if (!faltan.length) return;
  sh.getRange(last + 1, 1, faltan.length, 3).setValues(faltan);
  faltan.forEach((r, i) => {
    if (r[1] === 'Sí' || r[1] === 'No') {
      sh.getRange(last + 1 + i, 2).setDataValidation(
        SpreadsheetApp.newDataValidation().requireValueInList(['Sí', 'No'], true).setAllowInvalid(false).build());
    }
  });
}

function darFormato_(sh, nombre) {
  const cols = COLUMNAS[nombre];
  const filas = Math.max(sh.getMaxRows() - 1, 1);
  const col = n => cols.indexOf(n) + 1;
  const rango = n => sh.getRange(2, col(n), filas, 1);
  const lista = (n, vals) => rango(n).setDataValidation(
    SpreadsheetApp.newDataValidation().requireValueInList(vals, true).setAllowInvalid(false).build());
  const anchos = w => w.forEach((px, i) => sh.setColumnWidth(i + 1, px));
  const regla = (r, texto, fondo, letra) => SpreadsheetApp.newConditionalFormatRule()
    .whenTextEqualTo(texto).setBackground(fondo).setFontColor(letra).setRanges([r]).build();

  sh.getRange(1, 1, 1, cols.length)
    .setFontWeight('bold').setBackground('#1F6FEB').setFontColor('#FFFFFF').setVerticalAlignment('middle');
  sh.setFrozenRows(1);
  sh.setRowHeight(1, 30);

  switch (nombre) {
    case HOJAS.CONFIG:
      anchos([220, 280, 520]);
      sh.getRange(2, 1, filas, 1).setFontWeight('bold');
      sh.getRange(2, 3, filas, 1).setFontColor('#6b7280');
      break;

    case HOJAS.MATERIALES: {
      anchos([110, 240, 130, 130, 110, 100, 120, 200]);
      rango('ID').setNumberFormat('@');
      rango('Cantidad total').setNumberFormat('0');
      rango('Disponible').setBackground('#f3f4f6');
      rango('Estatus').setBackground('#f3f4f6');
      sh.getRange(1, col('Disponible')).setNote('Lo calcula el sistema. No lo edites.');
      sh.getRange(1, col('Estatus')).setNote('Lo calcula el sistema. No lo edites.');
      sh.getRange(1, col('Cantidad total')).setNote('Piezas que existen con este ID. Vacío = 1.');
      const r = rango('Estatus');
      sh.setConditionalFormatRules([
        regla(r, 'Disponible', '#dcfce7', '#166534'),
        regla(r, 'Parcial', '#fef3c7', '#92400e'),
        regla(r, 'Prestado', '#fee2e2', '#991b1b'),
        regla(r, 'Agotado', '#fee2e2', '#991b1b'),
        regla(r, 'ID duplicado', '#fed7aa', '#9a3412')
      ]);
      break;
    }

    case HOJAS.USUARIOS: {
      anchos([130, 240, 240, 180, 110, 220]);
      rango('ID').setNumberFormat('@');
      lista('Estatus', ['Activo', 'Bloqueado']);
      sh.getRange(1, col('ID')).setNote('El mismo valor que trae el código de la credencial.');
      sh.setConditionalFormatRules([regla(rango('Estatus'), 'Bloqueado', '#fee2e2', '#991b1b')]);
      break;
    }

    case HOJAS.LABS:
      anchos([220, 90, 240, 80, 200]);
      rango('PIN').setNumberFormat('@');
      lista('Activo', ['Sí', 'No']);
      sh.getRange(1, col('PIN')).setNote('Contraseña del laboratorista: autoriza préstamos/devoluciones y abre el modo administrador. Debe ser distinta para cada uno.');
      break;

    case HOJAS.HISTORIAL: {
      anchos([100, 130, 100, 200, 110, 190, 200, 140, 150, 75, 100, 80, 95, 130, 150, 200]);
      ['ID Material', 'ID Usuario'].forEach(n => rango(n).setNumberFormat('@'));
      ['Fecha préstamo', 'Fecha devolución'].forEach(n => rango(n).setNumberFormat('dd/MM/yyyy HH:mm'));
      rango('Fecha límite').setNumberFormat('dd/MM/yyyy');
      lista('Estado', ['Prestado', 'Parcial', 'Devuelto', 'Cancelado']);
      const L = letra_(col('Fecha límite')), E = letra_(col('Estado'));
      const filasTodas = sh.getRange(2, 1, filas, cols.length);
      sh.setConditionalFormatRules([
        SpreadsheetApp.newConditionalFormatRule()
          .whenFormulaSatisfied('=AND($' + L + '2<>"",$' + L + '2<NOW(),$' + E + '2<>"Devuelto",$' + E + '2<>"Cancelado")')
          .setBackground('#fee2e2').setRanges([filasTodas]).build(),
        regla(rango('Estado'), 'Devuelto', '#dcfce7', '#166534'),
        regla(rango('Estado'), 'Parcial', '#fef3c7', '#92400e'),
        regla(rango('Estado'), 'Prestado', '#dbeafe', '#1e40af')
      ]);
      sh.getRange(1, col('Estado')).setNote('Para anular un registro equivocado escribe "Cancelado".');
      sh.protect().setDescription('Historial: lo escribe la app').setWarningOnly(true);
      break;
    }
  }
}

function datosEjemplo_(sh, nombre) {
  const E = 'Ejemplo';
  let filas = [];
  if (nombre === HOJAS.MATERIALES) {
    filas = [
      ['MAT001', 'Multímetro digital', 'Electrónica', 'Estante A1', 5, '', '', E],
      ['MAT002', 'Osciloscopio 2 canales', 'Electrónica', 'Mesa 2', 2, '', '', E],
      ['MAT003', 'Cautín 60 W', 'Electrónica', 'Estante A2', 8, '', '', E],
      ['MAT004', 'Vernier digital', 'Metrología', 'Cajón B1', 6, '', '', E],
      ['MAT005', 'Taladro inalámbrico', 'Herramienta', 'Gabinete C', 1, '', '', E],
      ['MAT006', 'Kit Arduino UNO', 'Electrónica', 'Estante A3', 10, '', '', E]
    ];
    for (let i = 1; i <= 12; i++) filas.push(['L' + i, 'Locker ' + i, 'Locker', 'Pasillo', 1, '', '', E]);
  } else if (nombre === HOJAS.USUARIOS) {
    filas = [
      ['A00000001', 'Ana López Ruiz', 'ana.lopez@example.com', 'Mecatrónica', 'Activo', E],
      ['A00000002', 'Luis Pérez Gómez', 'luis.perez@example.com', 'Biomédica', 'Activo', E],
      ['A00000003', 'María García Soto', 'maria.garcia@example.com', 'Mecatrónica', 'Bloqueado', E]
    ];
  } else if (nombre === HOJAS.LABS) {
    filas = [['Laboratorista Demo', '1234', '', 'Sí', E]];
  }
  if (filas.length) sh.getRange(2, 1, filas.length, filas[0].length).setValues(filas);
}

// ════════════════════════════ UTILIDADES ════════════════════════════

function getConfig_() {
  const cfg = {};
  CONFIG_DEFAULT.forEach(r => { cfg[r[0]] = r[1]; });
  const sh = SpreadsheetApp.getActive().getSheetByName(HOJAS.CONFIG);
  if (sh && sh.getLastRow() > 1) {
    sh.getRange(2, 1, sh.getLastRow() - 1, 2).getValues().forEach(r => {
      const k = String(r[0]).trim().toUpperCase();
      if (k) cfg[k] = (r[1] === null || r[1] === undefined) ? '' : r[1];
    });
  }
  return cfg;
}

/** Lee una hoja completa y permite ubicar columnas por nombre. */
function tabla_(nombre) {
  const sh = SpreadsheetApp.getActive().getSheetByName(nombre);
  if (!sh) throw new Error('No existe la hoja "' + nombre + '". En la hoja de cálculo usa el menú 📦 Almacén > Instalar / reparar plantilla.');
  const lastRow = sh.getLastRow(), lastCol = sh.getLastColumn();
  const values = (lastRow && lastCol) ? sh.getRange(1, 1, lastRow, lastCol).getValues() : [[]];
  const headers = values.shift().map(h => String(h).trim());
  const idx = {};
  headers.forEach((h, i) => { if (h && idx[norm_(h)] === undefined) idx[norm_(h)] = i; });
  return {
    sh: sh, headers: headers, rows: values,
    c: function (col, opcional) {
      const i = idx[norm_(col)];
      if (i === undefined) {
        if (opcional) return -1;
        throw new Error('Falta la columna "' + col + '" en la hoja "' + nombre + '". Usa 📦 Almacén > Instalar / reparar plantilla.');
      }
      return i;
    }
  };
}

function cel_(r, i) { return i < 0 ? '' : r[i]; }
function norm_(s) { return String(s === null || s === undefined ? '' : s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase(); }
function id_(v) { return String(v === null || v === undefined ? '' : v).trim().toUpperCase(); }
function si_(v) { return /^(s[ií]|yes|y|true|1|x|verdadero)$/i.test(String(v).trim()); }
function num_(v, def) { if (v === '' || v === null || v === undefined) return def; const n = Number(v); return isNaN(n) ? def : n; }
function fecha_(v) {
  if (v instanceof Date) return isNaN(v.getTime()) ? null : v;
  if (v === '' || v === null || v === undefined) return null;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
}
function fmt_(d, f) { return (d instanceof Date && !isNaN(d.getTime())) ? Utilities.formatDate(d, Session.getScriptTimeZone(), f || 'dd/MM/yyyy HH:mm') : ''; }
function dias_(d) { return (d instanceof Date) ? Math.max(0, Math.floor((Date.now() - d.getTime()) / 86400000)) : 0; }
function emailValido_(s) { return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(s || '').trim()); }
function correoDe_(id, correo, cfg) {
  correo = String(correo || '').trim();
  if (correo) return correo;
  let dom = String(cfg.DOMINIO_CORREO || '').trim();
  if (!dom || !id) return '';
  if (dom.charAt(0) !== '@') dom = '@' + dom;
  return String(id).trim().toLowerCase() + dom;
}
function dominio_(cfg) {
  let dom = String(cfg.DOMINIO_CORREO || '').trim();
  if (dom && dom.charAt(0) !== '@') dom = '@' + dom;
  return dom;
}
function enmascarar_(c) {
  const m = /^([^@]{0,2})([^@]*)(@.*)$/.exec(String(c || '').trim());
  return m ? m[1] + (m[2] ? '•••' : '') + m[3] : '';
}
function esc_(s) {
  return String(s === null || s === undefined ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function letra_(n) { let s = ''; while (n > 0) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); } return s; }
function ui_() { try { return SpreadsheetApp.getUi(); } catch (e) { return null; } }
function avisar_(msg) { const ui = ui_(); if (ui) ui.alert(msg); else console.log(msg); }
function toast_(msg) { try { SpreadsheetApp.getActive().toast(msg, 'Almacén', 6); } catch (e) { console.log(msg); } }
