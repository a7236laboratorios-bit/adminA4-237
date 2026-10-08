/********************************************************************************
 * SISTEMA DE GESTIÓN DE PROTOTIPADO RÁPIDO — LABORATORIO DE MECATRÓNICA (A7-237)
 * TECNOLÓGICO DE MONTERREY
 * 
 * Servicios: Impresión 3D | Corte y Grabado Láser | Prototipado de PCB
 * Conexión: Google Forms + Google Sheets + Apps Script Web App + Gmail
 ********************************************************************************/

/***** CONFIGURACIÓN GENERAL *****/
const CONFIG = {
  // Hoja donde caen las respuestas del formulario
  HOJA_RESPUESTAS: "Servicio de Prototipado Rapido",

  // Hoja donde se guardan usuarios y contraseñas del panel administrativo
  HOJA_CONTRASENAS: "contraseña",

  // ID del Google Sheet para conexión garantizada (bound o standalone)
  ID_SPREADSHEET: "1oPwQWPuMcwc0Zo2PFuBia5U4CTxgvY1vvEKz3Bn62Aw",

  // URL del ejecutable Web App (/exec) para peticiones y sincronización
  URL_WEB_APP: "https://script.google.com/macros/s/AKfycbxfHs9GPJTxdVX_Ncf25wR1_73VGQL3KuEhB11PNZGO9iJC2Tj_WMn5_hYrnyxE7wGH6A/exec",

  // Datos institucionales para correos
  REMITENTE_NOMBRE: "Laboratorio de Mecatrónica",
  CORREO_CONTACTO: "a7236laboratorios@gmail.com", // Correo interno para dudas/contacto
  CC_INTERNA: "ricardo.fermin@tec.mx, nunez.yazmin@tec.mx, a7236laboratorios@gmail.com", // Correos siempre en copia obligatoria
  CORREO_PRUEBAS: "nunez.yazmin@tec.mx",      // Correo configurado para pruebas
  HORARIO_ENTREGA: "Lun–Vie 7:00–20:00 en el Laboratorio de Mecatrónica (A7-237)",

  // URL pública de la cola de impresión y prototipado (GitHub Pages)
  URL_COLA_PUBLIC: "https://a7236laboratorios-bit.github.io/adminA4-237/index.html",

  // Mapeo canónico de columnas (1-based, compatible con la estructura real de la hoja)
  COL: {
    timestamp: 1,                 // Col A: Timestamp
    nombre: 2,                    // Col B: Nombre Completo
    matricula: 3,                 // Col C: Matricula
    correo: 4,                    // Col D: Correo Institcional
    materia: 5,                   // Col E: Materia o Bloque
    profesor: 6,                  // Col F: Profesor
    servicio: 7,                  // Col G: ¿Qué servicio quieres usar?

    // Sección 3D (Cols H–M)
    archivo_imprimir: 8,          // Col H: Archivo a imprimir (.gcode)
    tipo_material: 9,             // Col I: Tipo de Material
    marca_material: 10,           // Col J: Marca del Material
    fecha_limite: 11,             // Col K: Fecha límite deseada
    acepta: 12,                   // Col L: Acepto el reglamento
    observaciones: 13,            // Col M: Observaciones

    // Sección Láser (Cols N–T)
    archivo_cortar: 14,           // Col N: Archivo a cortar (.DXF)
    material: 15,                 // Col O: Material
    espesor: 16,                  // Col P: Espesor (mm)
    dimensiones: 17,              // Col Q: Tamaño de la placa (mm)
    fecha_limite_laser: 18,       // Col R: ¿Para cuándo la quiere?
    reglamento_laser: 19,         // Col S: ¿Aceptas el Reglamento?
    comentarios: 20,              // Col T: Comentarios

    // Sección PCB (Cols U–X)
    archivo_pcb: 21,              // Col U: Archivo a imprimir (.gbr)
    capas_pcb: 22,                // Col V: Cantidad de Caras
    reglamento_pcb: 23,           // Col W: Acepta el Reglamento?
    comentarios_observaciones: 24,// Col X: Comentarios u Observaciones

    // Gestión interna del Laboratorio (Cols Y–AG)
    ticket: 25,                   // Col Y: Ticket
    estado: 26,                   // Col Z: Estado
    impresora: 27,                // Col AA: Impresora asignada
    t_estimado: 28,               // Col AB: Tiempo estimado (h)
    t_inicio: 29,                 // Col AC: Inicio impresión (timestamp)
    t_fin: 30,                    // Col AD: Fin impresión (timestamp)
    lugar_entrega: 31,            // Col AE: Lugar de Entrega
    notas: 32,                    // Col AF: Notas internas
    notificado: 33                // Col AG: Notificado
  },

  // Requisitos específicos mostrados en las notificaciones
  REQUISITOS_FILAMENTO: [
    "Filamento 1.75 mm (PLA, PETG, TPU, ABS, etc.).",
    "Bobina debidamente etiquetada con tu N° de Ticket y Nombre.",
    "Color y marca a tu elección (en buen estado, sin humedad).",
    "Traer suficiente material para toda la impresión (sugerencia: +15% de margen)."
  ].join("<br>"),

  REQUISITOS_LASER: [
    "Archivo vectorial (.DXF) a escala 1:1 en milímetros.",
    "Declarar el espesor exacto del material (mm) y traerlo al laboratorio.",
    "Solo cortamos materiales autorizados: MDF y Acrílico."
  ].join("<br>"),

  REQUISITOS_PCB: [
    "Archivos Gerber listos en formato .zip o archivo (.gbr) sin errores de DRC.",
    "Definir número de caras (1 o 2 caras) y dimensiones exactas de la placa.",
    "Presentarse al laboratorio para validar clearances, brocas y tiempo de maquinado."
  ].join("<br>")
};

/*******************************************************
 * ADMINISTRADOR WEB — CONFIGURACIÓN Y SEGURIDAD
 *******************************************************/
const ADMIN_CONFIG = {
  ESTADOS_ACTIVOS: [
    "En revisión",
    "Aprobada",
    "En impresión",
    "En proceso de corte"
  ],
  ESTADOS: [
    "Aprobada",
    "En revisión",
    "Lista",
    "Rechazada",
    "En impresión",
    "En proceso de corte",
    "Cancelada"
  ],
  IMPRESORAS: [
    "Sin asignar",
    "Impresora 1",
    "Impresora 2",
    "Láser 1",
    "Láser 2",
    "CNC / PCB 1"
  ]
};

// La contraseña y usuario se leen directamente de la hoja "contraseña"
const ADMIN_SESSION_SECONDS = 21600; // 6 horas de sesión
const ADMIN_SESSION_PREFIX = "ADMIN_SESSION_V2_";

/*******************************************************
 * UTILIDADES DE TEXTO Y DETECCIÓN INTELIGENTE
 *******************************************************/

/**
 * Normaliza cadenas quitando acentos y espacios adicionales.
 */
function norm(s) {
  return (s || "")
    .toString()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Detecta el tipo de servicio estandarizado: "3d" | "laser" | "pcb"
 */
function tipoServicio(servicioRaw) {
  const v = (servicioRaw || "")
    .toString()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  // PCB (placas, circuitos, gerber)
  if (/pcb|placa|circuito(?:s)?(?:\s+impres[oa])?|gerber/i.test(v)) return "pcb";
  // Láser (corte, grabado, cortadora)
  if (/laser|corte|grabado|cortadora/i.test(v)) return "laser";
  // 3D (impresión 3D, filamento, aditiva)
  if (/3d|impresion|impresora|impreso|filamento/i.test(v)) return "3d";

  return "3d"; // Por defecto
}

/**
 * Obtiene el mapeo de columnas dinámico basado en los encabezados reales de la hoja.
 * Si algún encabezado cambia de lugar, esta función lo encuentra automáticamente.
 */
function obtenerIndices(sh) {
  if (!sh) sh = obtenerHojaRespuestas();
  const cols = Object.assign({}, CONFIG.COL);
  try {
    const lastCol = Math.max(sh.getLastColumn(), 34);
    const headers = sh.getRange(1, 1, 1, lastCol).getValues()[0];
    
    headers.forEach((hRaw, idx) => {
      const colNum = idx + 1;
      const h = norm(hRaw);
      if (!h) return;

      if (h === "ticket") cols.ticket = colNum;
      else if (h === "estado") cols.estado = colNum;
      else if (/impresora\s*asignada|maquina/i.test(h)) cols.impresora = colNum;
      else if (/tiempo\s*estimado/i.test(h)) cols.t_estimado = colNum;
      else if (/inicio\s*impresion/i.test(h)) cols.t_inicio = colNum;
      else if (/fin\s*impresion/i.test(h)) cols.t_fin = colNum;
      else if (/lugar\s*de\s*entrega/i.test(h)) cols.lugar_entrega = colNum;
      else if (/notas\s*internas/i.test(h)) cols.notas = colNum;
      else if (h === "notificado") cols.notificado = colNum;
      else if (/servicio/i.test(h)) cols.servicio = colNum;
      else if (/nombre/i.test(h)) cols.nombre = colNum;
      else if (/matricula/i.test(h)) cols.matricula = colNum;
      else if (/correo/i.test(h)) cols.correo = colNum;
      else if (/materia/i.test(h)) cols.materia = colNum;
      else if (/profesor/i.test(h)) cols.profesor = colNum;
      else if (/gcode/i.test(h)) cols.archivo_imprimir = colNum;
      else if (/tipo\s*de\s*material/i.test(h)) cols.tipo_material = colNum;
      else if (/marca\s*del\s*material/i.test(h)) cols.marca_material = colNum;
      else if (/fecha\s*limite\s*deseada/i.test(h)) cols.fecha_limite = colNum;
      else if (/dxf/i.test(h)) cols.archivo_cortar = colNum;
      else if (/^material$/i.test(h)) cols.material = colNum;
      else if (/espesor/i.test(h)) cols.espesor = colNum;
      else if (/tama.o\s*de\s*la\s*placa/i.test(h)) cols.dimensiones = colNum;
      else if (/para\s*cuando/i.test(h)) cols.fecha_limite_laser = colNum;
      else if (/gbr/i.test(h)) cols.archivo_pcb = colNum;
      else if (/cantidad\s*de\s*caras/i.test(h)) cols.capas_pcb = colNum;
      else if (/acepta.*reglamento/i.test(h) && colNum >= 21) cols.reglamento_pcb = colNum;
      else if (/comentarios.*observaciones/i.test(h)) cols.comentarios_observaciones = colNum;
    });
  } catch (err) {
    Logger.log("obtenerIndices: Fallback a columnas estáticas. Error: %s", err);
  }
  return cols;
}

/*******************************************************
 * MENÚ PERSONALIZADO EN GOOGLE SHEETS
 *******************************************************/
function onOpen() {
  try {
    const ui = SpreadsheetApp.getUi();
    ui.createMenu("👾 Lab Prototipado")
      .addItem("⚙️ Configurar triggers automáticos", "instalarTriggers")
      .addSeparator()
      .addItem("🔑 Abrir / Crear hoja de contraseñas", "abrirHojaContrasenas")
      .addSeparator()
      .addItem("📧 Enviar prueba rápida (Yazmin)", "testCorreoYazmin")
      .addItem("📨 Probar TODAS las plantillas de correo", "testEnviarTodasLasPlantillas")
      .addItem("🧪 Probar simulación de envío de formulario", "testSimularFormSubmit")
      .addItem("🩺 Diagnóstico completo del sistema", "testDiagnosticoCompleto")
      .addSeparator()
      .addItem("🔧 Corregir filas desfasadas existentes", "corregirFilasDesfasadasExistentes")
      .addToUi();
  } catch (err) {
    Logger.log("onOpen: UI no disponible en contexto headless. Info: %s", err);
  }
}

/*******************************************************
 * INSTALACIÓN DE TRIGGERS
 *******************************************************/
function instalarTriggers(showAlert = true) {
  const ss = SpreadsheetApp.getActive();
  ScriptApp.getProjectTriggers().forEach(t => ScriptApp.deleteTrigger(t));

  ScriptApp.newTrigger("onFormSubmit")
    .forSpreadsheet(ss)
    .onFormSubmit()
    .create();

  ScriptApp.newTrigger("onEditHandler")
    .forSpreadsheet(ss)
    .onEdit()
    .create();

  if (showAlert) {
    try {
      SpreadsheetApp.getUi().alert(
        "✅ Triggers configurados correctamente.\n\n" +
        "1. onFormSubmit: Asigna ticket y envía correo al recibir solicitud.\n" +
        "2. onEditHandler: Monitorea cambios de estado en la hoja para enviar notificaciones."
      );
    } catch (err) {
      Logger.log("Triggers creados exitosamente (sin UI).");
    }
  }
}

/*******************************************************
 * EVENTO: AL ENVIAR FORMULARIO (onFormSubmit)
 *******************************************************/
function onFormSubmit(e) {
  try {
    let sh;
    let row;

    if (e && e.range) {
      sh = e.range.getSheet();
      if (sh.getName() !== CONFIG.HOJA_RESPUESTAS) return;
      row = e.range.getRow();
    } else {
      // Si se ejecuta manualmente desde el editor sin evento 'e'
      sh = obtenerHojaRespuestas();
      row = sh.getLastRow();
      Logger.log("onFormSubmit ejecutado manualmente sobre la última fila: %s", row);
    }

    if (row < 2) return;

    const cols = obtenerIndices(sh);
    const data = sh.getRange(row, 1, 1, Math.max(sh.getLastColumn(), 34)).getValues()[0];

    // Verificar si ya tiene ticket asignado
    let ticket = valor(data, cols.ticket);
    if (!ticket) {
      const matricula = valor(data, cols.matricula);
      ticket = generarTicket(matricula);
      sh.getRange(row, cols.ticket).setValue(ticket);
    }

    // Inicializar estado y bandera de notificación
    sh.getRange(row, cols.estado).setValue("En revisión");
    sh.getRange(row, cols.notificado).setValue("no");

    const servicioTxt = (valor(data, cols.servicio) || "").toString().trim();
    const tipo = tipoServicio(servicioTxt);
    const nombre = valor(data, cols.nombre);
    const correo = valor(data, cols.correo);

    Logger.log('onFormSubmit fila %s ticket="%s" servicio="%s" tipo="%s" para="%s"', row, ticket, servicioTxt, tipo, correo);

    const asunto = `[${ticket}] Solicitud recibida — ${servicioTxt || "Prototipado"}`;
    let html;
    if (tipo === "laser") {
      html = tplRecibidoLaser(nombre, ticket);
    } else if (tipo === "pcb") {
      html = tplRecibidoPCB(nombre, ticket);
    } else {
      html = tplRecibido3D(nombre, ticket);
    }

    if (correo && correo.includes("@")) {
      enviarCorreo({ para: correo, asunto, html });
    }
  } catch (err) {
    Logger.log("Error crítico en onFormSubmit: %s\nStack: %s", err, err.stack);
  }
}

/*******************************************************
 * EVENTO: AL EDITAR HOJA (onEditHandler)
 *******************************************************/
function onEditHandler(e) {
  try {
    if (!e || !e.range) {
      Logger.log("onEditHandler: evento e no disponible.");
      return;
    }

    const sh = e.range.getSheet();
    if (sh.getName() !== CONFIG.HOJA_RESPUESTAS) return;

    const row = e.range.getRow();
    if (row < 2) return;

    const cols = obtenerIndices(sh);
    const colEdited = e.range.getColumn();

    // Solo procesar si se editó la columna de estado o notas
    if (colEdited === cols.estado || colEdited === cols.notas) {
      procesarCambioEstado(sh, row, cols);
    }
  } catch (err) {
    Logger.log("Error en onEditHandler: %s", err);
  }
}

/*******************************************************
 * GESTOR UNIFICADO DE CAMBIO DE ESTADO Y CORREOS
 * (Usado tanto por onEdit como por el Panel Web)
 *******************************************************/
function procesarCambioEstado(sh, row, cols) {
  if (!sh) sh = obtenerHojaRespuestas();
  if (!cols) cols = obtenerIndices(sh);

  const lastCol = Math.max(sh.getLastColumn(), 34);
  const data = sh.getRange(row, 1, 1, lastCol).getValues()[0];

  const estado = String(valor(data, cols.estado) || "").trim();
  const ticket = String(valor(data, cols.ticket) || "").trim();
  const correo = String(valor(data, cols.correo) || "").trim();
  const nombre = String(valor(data, cols.nombre) || "").trim();
  const servicio = String(valor(data, cols.servicio) || "").trim();
  const notificado = String(valor(data, cols.notificado) || "").toLowerCase().trim();
  const tipo = tipoServicio(servicio);

  Logger.log('procesarCambioEstado Fila %s: Ticket=%s | Estado=%s | Notificado=%s', row, ticket, estado, notificado);

  // Marcar tiempos con formato fecha+hora
  if (estado === "En impresión" || estado === "En proceso de corte") {
    if (!valor(data, cols.t_inicio)) {
      const cell = sh.getRange(row, cols.t_inicio);
      cell.setValue(new Date());
      cell.setNumberFormat("dd/mm/yyyy hh:mm:ss");
    }
  }

  if (estado === "Lista") {
    if (!valor(data, cols.t_fin)) {
      const cell = sh.getRange(row, cols.t_fin);
      cell.setValue(new Date());
      cell.setNumberFormat("dd/mm/yyyy hh:mm:ss");
    }
  }

  if (!correo || !correo.includes("@")) {
    Logger.log("procesarCambioEstado: No hay correo válido para la fila %s", row);
    return;
  }

  // Notificación: Aprobada
  if (estado === "Aprobada" && notificado !== "aprobada") {
    const asunto = `[${ticket}] APROBADA — ${servicio}`;
    let html;
    if (tipo === "laser") {
      html = tplAprobadaLaser(nombre, ticket);
    } else if (tipo === "pcb") {
      html = tplAprobadaPCB(nombre, ticket);
    } else {
      html = tplAprobadaConFilamento(nombre, ticket);
    }
    enviarCorreo({ para: correo, asunto, html });
    sh.getRange(row, cols.notificado).setValue("aprobada");
  }

  // Notificación: Lista para recoger
  if (estado === "Lista" && notificado !== "lista") {
    const asunto = `[${ticket}] Lista para recoger — ${servicio}`;
    let html;
    if (tipo === "laser") {
      html = tplListaSalonLaser(nombre, ticket);
    } else if (tipo === "pcb") {
      html = tplListaSalonPCB(nombre, ticket);
    } else {
      html = tplListaSalon(nombre, ticket);
    }
    enviarCorreo({ para: correo, asunto, html });
    sh.getRange(row, cols.notificado).setValue("lista");
  }

  // Notificación: Rechazada
  if (estado === "Rechazada" && notificado !== "rechazada") {
    const notas = valor(data, cols.notas) || "Archivo o material no apto o con errores de diseño.";
    const asunto = `[${ticket}] Solicitud RECHAZADA — ${servicio}`;
    const html = tplRechazada(nombre, ticket, notas);
    enviarCorreo({ para: correo, asunto, html });
    sh.getRange(row, cols.notificado).setValue("rechazada");
  }
}

/*******************************************************
 * FUNCIONES DE APOYO Y ENVÍO DE CORREO
 *******************************************************/
function generarTicket(matricula) {
  const base = (matricula || "ALUMNO").toString().trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `L3D-${base}-${rand}`;
}

function enviarCorreo({ para, asunto, html, cc }) {
  if (!para) return;

  // Lista obligatoria de correos siempre en copia
  const ccBase = ["ricardo.fermin@tec.mx", "nunez.yazmin@tec.mx"];
  if (CONFIG.CC_INTERNA) {
    CONFIG.CC_INTERNA.split(",").forEach(c => {
      const limpio = c.trim();
      if (limpio && !ccBase.includes(limpio)) ccBase.push(limpio);
    });
  }

  // Integrar cualquier cc adicional que se envíe como parámetro
  const todosCC = [...ccBase];
  if (cc) {
    cc.split(",").forEach(c => {
      const limpio = c.trim();
      if (limpio && !todosCC.includes(limpio)) todosCC.push(limpio);
    });
  }

  // Excluir al destinatario principal de la copia para evitar correos duplicados
  const ccFinal = todosCC.filter(c => c.toLowerCase() !== String(para).trim().toLowerCase());

  GmailApp.sendEmail(para, asunto, "", {
    name: CONFIG.REMITENTE_NOMBRE,
    htmlBody: html,
    cc: ccFinal.join(", ")
  });
  Logger.log("Correo enviado a %s | CC: %s | Asunto: %s", para, ccFinal.join(", "), asunto);
}

/*******************************************************
 * PLANTILLAS DE CORREO (HTML RESPONSIVO)
 *******************************************************/

/**
 * Genera el bloque visual de seguimiento en vivo con enlace a GitHub Pages.
 */
function tplBotonCola(titulo, boton) {
  const t = titulo || "Consulta el avance de tu pieza en vivo:";
  const b = boton || "Ver Cola de Prototipado en Línea &rarr;";
  return `
    <div style="margin:16px 0;padding:14px;background:#e0f2fe;border-left:5px solid #0284c7;border-radius:8px;">
      <b style="color:#0369a1;font-size:0.95em;">📊 ${t}</b><br>
      <span style="color:#334155;font-size:0.9em;">Puedes seguir el turno y estado de tu solicitud en cualquier momento en:</span><br>
      <a href="${CONFIG.URL_COLA_PUBLIC}" style="display:inline-block;margin-top:8px;padding:9px 18px;background:#004b87;color:#ffffff;text-decoration:none;border-radius:6px;font-weight:700;font-size:0.88em;">${b}</a>
    </div>`;
}

// 1. Recibido — Impresión 3D
function tplRecibido3D(nombre, ticket) {
  return `
  <div style="font-family:'Segoe UI',Arial,sans-serif;color:#1f2937;line-height:1.5;">
    <p>Hola <b>${nombre || "Estudiante"}</b>,</p>
    <p>Recibimos tu solicitud de <b>Impresión 3D</b> con Ticket: <b style="color:#004b87;">${ticket}</b>.</p>
    <p>Nuestro equipo revisará tu archivo <code>.gcode</code>. Cuando sea aprobado, recibirás un correo para <b>traer tu filamento</b> al laboratorio.</p>
    <div style="margin:16px 0;padding:12px;background:#f3f4f6;border-radius:8px;font-size:0.9em;">
      📍 <b>Laboratorio:</b> A7-237<br>
      ⏰ <b>Horario de atención:</b> ${CONFIG.HORARIO_ENTREGA}
    </div>
    ${tplBotonCola("Monitorea el progreso de tu pieza en vivo:", "Ver Cola de Impresión en Vivo &rarr;")}
    <p>— <b>${CONFIG.REMITENTE_NOMBRE}</b></p>
  </div>`;
}

// 2. Recibido — Corte Láser
function tplRecibidoLaser(nombre, ticket) {
  return `
  <div style="font-family:'Segoe UI',Arial,sans-serif;color:#1f2937;line-height:1.5;">
    <p>Hola <b>${nombre || "Estudiante"}</b>,</p>
    <p>Recibimos tu solicitud de <b>Corte / Grabado Láser</b> con Ticket: <b style="color:#004b87;">${ticket}</b>.</p>
    <p>Validaremos que tu archivo vectorial <code>.DXF</code> cumpla con la escala 1:1 y especificaciones técnicas.</p>
    <div style="margin:16px 0;padding:12px;background:#f3f4f6;border-radius:8px;font-size:0.9em;">
      📍 <b>Laboratorio:</b> A7-237<br>
      ⏰ <b>Horario de atención:</b> ${CONFIG.HORARIO_ENTREGA}
    </div>
    ${tplBotonCola("Monitorea el avance de tu corte láser en vivo:", "Ver Cola de Trabajo en Vivo &rarr;")}
    <p>— <b>${CONFIG.REMITENTE_NOMBRE}</b></p>
  </div>`;
}

// 3. Recibido — Prototipado PCB
function tplRecibidoPCB(nombre, ticket) {
  return `
  <div style="font-family:'Segoe UI',Arial,sans-serif;color:#1f2937;line-height:1.5;">
    <p>Hola <b>${nombre || "Estudiante"}</b>,</p>
    <p>Recibimos tu solicitud de <b>Fabricación de PCB</b> con Ticket: <b style="color:#004b87;">${ticket}</b>.</p>
    <p>Revisaremos tus archivos Gerber (<code>.gbr</code>) para verificar que no haya problemas de DRC o clearances.</p>
    <div style="margin:16px 0;padding:12px;background:#f3f4f6;border-radius:8px;font-size:0.9em;">
      📍 <b>Laboratorio:</b> A7-237<br>
      ⏰ <b>Horario de atención:</b> ${CONFIG.HORARIO_ENTREGA}
    </div>
    ${tplBotonCola("Monitorea el avance de tu placa PCB en vivo:", "Ver Cola de Prototipado en Vivo &rarr;")}
    <p>— <b>${CONFIG.REMITENTE_NOMBRE}</b></p>
  </div>`;
}

// 4. Aprobada — 3D
function tplAprobadaConFilamento(nombre, ticket) {
  return `
  <div style="font-family:'Segoe UI',Arial,sans-serif;color:#1f2937;line-height:1.5;">
    <p>Hola <b>${nombre || "Estudiante"}</b>,</p>
    <p>Tu solicitud <b>${ticket}</b> fue <b style="color:#15803d;">APROBADA</b> y ha ingresado a la cola de impresión.</p>
    <div style="margin:15px 0;padding:14px;border-left:5px solid #22c55e;background:#f0fdf4;border-radius:6px;">
      <b style="color:#166534;font-size:1.05em;">🚨 Acción requerida:</b><br>
      Si aún no lo has hecho, debes traer tu <b>filamento propio</b> al Laboratorio de Mecatrónica (A7-237) para iniciar la impresión.
    </div>
    <p><b>Requisitos del filamento:</b><br>${CONFIG.REQUISITOS_FILAMENTO}</p>
    <p><b>Horario de recepción:</b> ${CONFIG.HORARIO_ENTREGA}</p>
    <p>En cuanto tu filamento sea recibido y etiquetado con tu ticket, tu trabajo comenzará su turno en máquina.</p>
    ${tplBotonCola("Sigue el turno de tu impresión en tiempo real:", "Ver Cola de Impresión en Vivo &rarr;")}
    <p>— <b>${CONFIG.REMITENTE_NOMBRE}</b></p>
  </div>`;
}

// 5. Aprobada — Láser
function tplAprobadaLaser(nombre, ticket) {
  return `
  <div style="font-family:'Segoe UI',Arial,sans-serif;color:#1f2937;line-height:1.5;">
    <p>Hola <b>${nombre || "Estudiante"}</b>,</p>
    <p>Tu solicitud <b>${ticket}</b> de <b>Corte Láser</b> fue <b style="color:#15803d;">APROBADA</b>.</p>
    <div style="margin:15px 0;padding:14px;border-left:5px solid #b91c1c;background:#fef2f2;border-radius:6px;">
      <b style="color:#991b1b;font-size:1.05em;">🚨 Acción requerida:</b><br>
      Trae tu <b>material (MDF o Acrílico)</b> debidamente etiquetado con tu N° de Ticket al Laboratorio A7-237.
    </div>
    <p><b>Requisitos del trabajo:</b><br>${CONFIG.REQUISITOS_LASER}</p>
    <p><b>Horario de recepción:</b> ${CONFIG.HORARIO_ENTREGA}</p>
    ${tplBotonCola("Sigue el turno de tu corte en tiempo real:", "Ver Cola de Trabajo en Vivo &rarr;")}
    <p>— <b>${CONFIG.REMITENTE_NOMBRE}</b></p>
  </div>`;
}

// 6. Aprobada — PCB
function tplAprobadaPCB(nombre, ticket) {
  return `
  <div style="font-family:'Segoe UI',Arial,sans-serif;color:#1f2937;line-height:1.5;">
    <p>Hola <b>${nombre || "Estudiante"}</b>,</p>
    <p>Tu solicitud <b>${ticket}</b> de <b>Fabricación de PCB</b> fue <b style="color:#15803d;">APROBADA</b>.</p>
    <div style="margin:15px 0;padding:14px;border-left:5px solid #2563eb;background:#eff6ff;border-radius:6px;">
      <b style="color:#1e40af;font-size:1.05em;">ℹ️ Próximos pasos:</b><br>
      Acude al laboratorio A7-237 para confirmar los detalles de maquinado y tiempo estimado.
    </div>
    <p><b>Requisitos de fabricación:</b><br>${CONFIG.REQUISITOS_PCB}</p>
    <p><b>Lugar de atención:</b> A7-237 — ${CONFIG.HORARIO_ENTREGA}</p>
    ${tplBotonCola("Sigue el turno de tu placa PCB en tiempo real:", "Ver Cola de Prototipado en Vivo &rarr;")}
    <p>— <b>${CONFIG.REMITENTE_NOMBRE}</b></p>
  </div>`;
}

// 7. Lista — 3D
function tplListaSalon(nombre, ticket) {
  return `
  <div style="font-family:'Segoe UI',Arial,sans-serif;color:#1f2937;line-height:1.5;">
    <p>Hola <b>${nombre || "Estudiante"}</b>,</p>
    <div style="margin:15px 0;padding:14px;border-left:5px solid #22c55e;background:#f0fdf4;border-radius:6px;">
      <b style="color:#166534;font-size:1.1em;">🎉 ¡Tu pieza 3D está LISTA para recoger!</b><br>
      Ticket: <b>${ticket}</b>
    </div>
    <p><b>Lugar de entrega:</b> A7-237 (Laboratorio de Mecatrónica)</p>
    <p>Preséntate con tu <b>nombre, matrícula o número de ticket</b>.</p>
    <p><b>Horario de entrega:</b> ${CONFIG.HORARIO_ENTREGA}</p>
    <div style="margin:14px 0;padding:10px 14px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;font-size:0.88em;">
      📋 Consulta el registro final en la <a href="${CONFIG.URL_COLA_PUBLIC}" style="color:#004b87;font-weight:700;text-decoration:none;">Cola de Prototipado en Línea &rarr;</a>
    </div>
    <p>— <b>${CONFIG.REMITENTE_NOMBRE}</b></p>
  </div>`;
}

// 8. Lista — Láser
function tplListaSalonLaser(nombre, ticket) {
  return `
  <div style="font-family:'Segoe UI',Arial,sans-serif;color:#1f2937;line-height:1.5;">
    <p>Hola <b>${nombre || "Estudiante"}</b>,</p>
    <div style="margin:15px 0;padding:14px;border-left:5px solid #7c3aed;background:#f5f3ff;border-radius:6px;">
      <b style="color:#5b21b6;font-size:1.1em;">🎉 ¡Tu trabajo de corte láser está LISTO!</b><br>
      Ticket: <b>${ticket}</b>
    </div>
    <p><b>Lugar de entrega:</b> A7-237 (Laboratorio de Mecatrónica)</p>
    <p>Preséntate con tu <b>número de ticket o matrícula</b>.</p>
    <p><b>Horario de entrega:</b> ${CONFIG.HORARIO_ENTREGA}</p>
    <div style="margin:14px 0;padding:10px 14px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;font-size:0.88em;">
      📋 Consulta el registro final en la <a href="${CONFIG.URL_COLA_PUBLIC}" style="color:#004b87;font-weight:700;text-decoration:none;">Cola de Prototipado en Línea &rarr;</a>
    </div>
    <p>— <b>${CONFIG.REMITENTE_NOMBRE}</b></p>
  </div>`;
}

// 9. Lista — PCB
function tplListaSalonPCB(nombre, ticket) {
  return `
  <div style="font-family:'Segoe UI',Arial,sans-serif;color:#1f2937;line-height:1.5;">
    <p>Hola <b>${nombre || "Estudiante"}</b>,</p>
    <div style="margin:15px 0;padding:14px;border-left:5px solid #004b87;background:#f0f7ff;border-radius:6px;">
      <b style="color:#004b87;font-size:1.1em;">🎉 ¡Tu placa PCB está LISTA para recoger!</b><br>
      Ticket: <b>${ticket}</b>
    </div>
    <p><b>Lugar de entrega:</b> A7-237 (Laboratorio de Mecatrónica)</p>
    <p>Preséntate con tu <b>número de ticket o matrícula</b>.</p>
    <p><b>Horario de entrega:</b> ${CONFIG.HORARIO_ENTREGA}</p>
    <div style="margin:14px 0;padding:10px 14px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;font-size:0.88em;">
      📋 Consulta el registro final en la <a href="${CONFIG.URL_COLA_PUBLIC}" style="color:#004b87;font-weight:700;text-decoration:none;">Cola de Prototipado en Línea &rarr;</a>
    </div>
    <p>— <b>${CONFIG.REMITENTE_NOMBRE}</b></p>
  </div>`;
}

// 10. Rechazada
function tplRechazada(nombre, ticket, notas) {
  return `
  <div style="font-family:'Segoe UI',Arial,sans-serif;color:#1f2937;line-height:1.5;">
    <p>Hola <b>${nombre || "Estudiante"}</b>,</p>
    <div style="margin:15px 0;padding:14px;border-left:5px solid #dc2626;background:#fef2f2;border-radius:6px;">
      <b style="color:#991b1b;font-size:1.05em;">⚠️ Tu solicitud ${ticket} no pudo ser aprobada:</b><br>
      <i>${notas || "Archivo o material no cumple los requisitos técnicos del laboratorio."}</i>
    </div>
    <p>Por favor realiza los ajustes necesarios en tu archivo/material y vuelve a enviar tu solicitud a través del formulario institucional.</p>
    <p>Dudas en: <b>${CONFIG.CORREO_CONTACTO || "a7236laboratorios@gmail.com"}</b> o acudiendo a A7-237.</p>
    <p>— <b>${CONFIG.REMITENTE_NOMBRE}</b></p>
  </div>`;
}

/*******************************************************
 * CONTROLADOR WEB (doGet / doPost) — BACKEND API REST
 * Soporta conexión desde GitHub Pages (JSON) y Apps Script
 *******************************************************/

/**
 * Devuelve respuesta JSON con headers para consumo externo desde GitHub Pages.
 */
function respuestaJSON(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Enrutador centralizado para todas las acciones API (GET o POST).
 */
function manejarPeticionAPI(params) {
  const action = (params && params.action) ? String(params.action).trim() : "";
  if (!action) return null;

  try {
    switch (action) {
      case "obtenerDatosPublicos": {
        const data = obtenerDatosPublicos();
        return respuestaJSON({ ok: true, data: data });
      }

      case "iniciarSesionAdmin": {
        const usuario = params.usuario || params.user || "";
        const clave = params.clave || params.pass || params.password || "";
        const res = iniciarSesionAdmin(usuario, clave);
        return respuestaJSON(res);
      }

      case "cerrarSesionAdmin": {
        const token = params.token || "";
        cerrarSesionAdmin(token);
        return respuestaJSON({ ok: true });
      }

      case "validarSesionAdmin": {
        const token = params.token || "";
        const res = validarSesionAdmin(token);
        return respuestaJSON(res);
      }

      case "obtenerConfiguracionAdmin": {
        const token = params.token || "";
        const config = obtenerConfiguracionAdmin(token);
        return respuestaJSON({ ok: true, config: config });
      }

      case "obtenerSolicitudesActivas": {
        const token = params.token || "";
        const data = obtenerSolicitudesActivas(token);
        return respuestaJSON({ ok: true, data: data });
      }

      case "buscarHistorialSolicitudes": {
        const token = params.token || "";
        const q = params.q || params.consulta || "";
        const data = buscarHistorialSolicitudes(q, token);
        return respuestaJSON({ ok: true, data: data });
      }

      case "actualizarSolicitud": {
        const token = params.token || "";
        let datos = params.datos;
        if (typeof datos === "string") {
          try { datos = JSON.parse(datos); } catch (e) {}
        }
        if (!datos) {
          datos = {
            fila: params.fila,
            estado: params.estado,
            impresora: params.impresora,
            tEstimado: params.tEstimado,
            notas: params.notas
          };
        }
        const res = actualizarSolicitud(datos, token);
        return respuestaJSON(res);
      }

      default:
        return respuestaJSON({ ok: false, error: `Acción '${action}' no reconocida.` });
    }
  } catch (err) {
    Logger.log("Error en manejarPeticionAPI (%s): %s", action, err);
    return respuestaJSON({ ok: false, error: err.message || err.toString() });
  }
}

/**
 * Maneja peticiones GET:
 * 1. Si incluye parámetro 'action' -> Responde JSON para GitHub Pages.
 * 2. Si no incluye 'action' -> Muestra HTML (Apps Script Web App).
 */
function doGet(e) {
  const params = (e && e.parameter) ? e.parameter : {};

  if (params.action) {
    const respuesta = manejarPeticionAPI(params);
    if (respuesta) return respuesta;
  }

  const esAdmin = params.admin === "1";
  if (esAdmin) {
    return HtmlService.createHtmlOutputFromFile("admin")
      .setTitle("Administración — Prototipado A7-237")
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }
  return HtmlService.createHtmlOutputFromFile("index")
    .setTitle("Cola de Prototipado — Laboratorio de Mecatrónica")
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * Maneja peticiones POST desde GitHub Pages (login, actualizar estados, etc.).
 */
function doPost(e) {
  let params = {};

  if (e && e.postData && e.postData.contents) {
    try {
      params = JSON.parse(e.postData.contents);
    } catch (errJson) {
      params = e.parameter || {};
    }
  } else if (e && e.parameter) {
    params = e.parameter;
  }

  const respuesta = manejarPeticionAPI(params);
  if (respuesta) return respuesta;

  return respuestaJSON({ ok: false, error: "No se proporcionó una acción válida en POST." });
}

/*******************************************************
 * API PÚBLICA (TABLERO PÚBLICO)
 *******************************************************/
function obtenerDatosPublicos() {
  const sh = obtenerHojaRespuestas();
  const cols = obtenerIndices(sh);
  const data = sh.getDataRange().getValues();
  if (!data || data.length < 2) return [];

  const rows = data.slice(1);
  const now = new Date();
  const cutoff = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000); // 3 días atrás

  const resultado = [];
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const ticket = String(valor(r, cols.ticket) || "").trim();
    const estado = String(valor(r, cols.estado) || "").trim();
    if (!ticket) continue;

    const ts = valor(r, cols.timestamp);
    const fecha = ts instanceof Date ? ts : new Date(ts);
    const esReciente = !isNaN(fecha.getTime()) && fecha >= cutoff;
    const esActiva = ADMIN_CONFIG.ESTADOS_ACTIVOS.includes(estado);

    // Se muestra si está activa o si es reciente
    if (esActiva || esReciente) {
      resultado.push({
        ticket: ticket,
        alumno: String(valor(r, cols.nombre) || "").trim(),
        nombre: String(valor(r, cols.nombre) || "").trim(),
        servicio: String(valor(r, cols.servicio) || "").trim(),
        estado: estado,
        fecha: (!isNaN(fecha.getTime()))
          ? Utilities.formatDate(fecha, "America/Mexico_City", "dd/MM HH:mm")
          : ""
      });
    }
  }

  return resultado.reverse(); // Más recientes primero
}

/*******************************************************
 * API ADMINISTRADOR (AUTENTICACIÓN DESDE HOJA "contraseña")
 *******************************************************/
function iniciarSesionAdmin(usuario, clave) {
  let user = usuario;
  let pass = clave;
  if (typeof usuario === "object" && usuario !== null) {
    user = usuario.usuario || usuario.user;
    pass = usuario.clave || usuario.pass || usuario.password;
  }

  const auth = validarCredencialesAdmin(user, pass);
  if (!auth.valido) {
    throw new Error(auth.mensaje || "Usuario o contraseña incorrectos.");
  }

  const token = Utilities.getUuid();
  const sessionData = JSON.stringify({
    usuario: auth.usuario,
    nombre: auth.nombre,
    ts: new Date().getTime()
  });

  CacheService.getScriptCache().put(ADMIN_SESSION_PREFIX + token, sessionData, ADMIN_SESSION_SECONDS);
  return { ok: true, token: token, usuario: auth.nombre };
}

function cerrarSesionAdmin(token) {
  if (token) {
    CacheService.getScriptCache().remove(ADMIN_SESSION_PREFIX + token);
  }
  return true;
}

function validarSesionAdmin(token) {
  verificarAdministrador(token);
  return { ok: true };
}

function verificarAdministrador(token) {
  if (!token) throw new Error("Sesión de administrador no iniciada.");
  const sesion = CacheService.getScriptCache().get(ADMIN_SESSION_PREFIX + token);
  if (!sesion) {
    throw new Error("Sesión expirada o no autorizada. Inicia sesión nuevamente con tu usuario y contraseña.");
  }
  return true;
}

function obtenerConfiguracionAdmin(token) {
  verificarAdministrador(token);
  return {
    estados: ADMIN_CONFIG.ESTADOS,
    estadosActivos: ADMIN_CONFIG.ESTADOS_ACTIVOS,
    impresoras: ADMIN_CONFIG.IMPRESORAS,
    urlWebApp: CONFIG.URL_WEB_APP
  };
}

function obtenerSolicitudesActivas(token) {
  verificarAdministrador(token);
  const sh = obtenerHojaRespuestas();
  const cols = obtenerIndices(sh);
  const data = sh.getDataRange().getValues();
  if (data.length < 2) return [];

  const resultado = [];
  for (let i = 1; i < data.length; i++) {
    const r = data[i];
    const ticket = valor(r, cols.ticket);
    const estado = valor(r, cols.estado);

    if (!ticket) continue;
    if (!ADMIN_CONFIG.ESTADOS_ACTIVOS.includes(estado)) continue;

    resultado.push(armarObjetoSolicitud(r, i + 1, cols, false));
  }

  return resultado.reverse();
}

function buscarHistorialSolicitudes(consulta, token) {
  verificarAdministrador(token);
  const q = String(consulta || "").toLowerCase().trim();
  if (!q) return [];

  const sh = obtenerHojaRespuestas();
  const cols = obtenerIndices(sh);
  const data = sh.getDataRange().getValues();
  if (data.length < 2) return [];

  const resultado = [];
  for (let i = 1; i < data.length; i++) {
    const r = data[i];
    const ticket = valor(r, cols.ticket);
    const estado = valor(r, cols.estado);

    if (!ticket) continue;
    if (ADMIN_CONFIG.ESTADOS_ACTIVOS.includes(estado)) continue;

    const texto = [
      ticket,
      valor(r, cols.nombre),
      valor(r, cols.matricula),
      valor(r, cols.correo),
      valor(r, cols.materia),
      valor(r, cols.servicio)
    ].join(" ").toLowerCase();

    if (!texto.includes(q)) continue;
    resultado.push(armarObjetoSolicitud(r, i + 1, cols, true));
  }

  return resultado.reverse();
}

function armarObjetoSolicitud(r, filaNum, cols, esHistorial) {
  return {
    fila: filaNum,
    ticket: valor(r, cols.ticket),
    nombre: valor(r, cols.nombre),
    matricula: valor(r, cols.matricula),
    correo: valor(r, cols.correo),
    materia: valor(r, cols.materia),
    profesor: valor(r, cols.profesor),
    servicio: valor(r, cols.servicio),
    estado: valor(r, cols.estado),
    impresora: valor(r, cols.impresora),
    notas: valor(r, cols.notas),
    tEstimado: valor(r, cols.t_estimado),
    tInicio: formatearFecha(valor(r, cols.t_inicio)),
    tFin: formatearFecha(valor(r, cols.t_fin)),
    timestamp: formatearFecha(valor(r, cols.timestamp)),

    // Láser
    archivoCortar: valor(r, cols.archivo_cortar),
    material: valor(r, cols.material),
    espesor: valor(r, cols.espesor),
    dimensiones: valor(r, cols.dimensiones),
    fechaLimiteLaser: formatearFecha(valor(r, cols.fecha_limite_laser)),

    // 3D
    archivoImprimir: valor(r, cols.archivo_imprimir),
    tipoMaterial: valor(r, cols.tipo_material),
    marcaMaterial: valor(r, cols.marca_material),
    fechaLimite: formatearFecha(valor(r, cols.fecha_limite)),

    // PCB
    archivoPcb: valor(r, cols.archivo_pcb),
    capasPcb: valor(r, cols.capas_pcb),
    reglamentoPcb: valor(r, cols.reglamento_pcb),
    comentariosPcb: valor(r, cols.comentarios_observaciones),

    historial: esHistorial
  };
}

function actualizarSolicitud(datos, token) {
  verificarAdministrador(token);
  if (!datos || !datos.fila) throw new Error("No se especificó la fila de la solicitud.");

  const sh = obtenerHojaRespuestas();
  const cols = obtenerIndices(sh);
  const fila = Number(datos.fila);

  if (fila < 2 || fila > sh.getLastRow()) {
    throw new Error("La fila indicada no es válida.");
  }

  const nuevoEstado = (datos.estado || "").trim();
  if (!ADMIN_CONFIG.ESTADOS.includes(nuevoEstado)) {
    throw new Error("El estado seleccionado no es válido.");
  }

  // 1. Actualizar campos
  sh.getRange(fila, cols.estado).setValue(nuevoEstado);
  if (cols.impresora) sh.getRange(fila, cols.impresora).setValue(datos.impresora || "");
  if (cols.t_estimado) sh.getRange(fila, cols.t_estimado).setValue(datos.tEstimado || "");
  if (cols.notas) sh.getRange(fila, cols.notas).setValue(datos.notas || "");

  // 2. Procesar marcas de tiempo y notificaciones de correo
  procesarCambioEstado(sh, fila, cols);
  SpreadsheetApp.flush();

  const ticket = sh.getRange(fila, cols.ticket).getValue();
  return {
    ok: true,
    mensaje: `Solicitud ${ticket} actualizada correctamente.`
  };
}

/*******************************************************
 * CONEXIÓN CON SPREADSHEET Y GESTIÓN DE HOJAS
 *******************************************************/

/**
 * Obtiene el Google Sheet activo con fallback al ID configurado.
 */
function obtenerSpreadsheet() {
  let ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss && CONFIG.ID_SPREADSHEET) {
    try {
      ss = SpreadsheetApp.openById(CONFIG.ID_SPREADSHEET);
    } catch (e) {
      Logger.log("obtenerSpreadsheet: Fallback openById error: %s", e);
    }
  }
  if (!ss) {
    throw new Error("No se pudo conectar con el Google Sheet. Asegúrate de ejecutar el script vinculado a la hoja de cálculo o verifica CONFIG.ID_SPREADSHEET.");
  }
  return ss;
}

/**
 * Obtiene la hoja principal de respuestas de formularios.
 */
function obtenerHojaRespuestas() {
  const ss = obtenerSpreadsheet();
  let sh = ss.getSheetByName(CONFIG.HOJA_RESPUESTAS);
  if (!sh) {
    const sheets = ss.getSheets();
    for (let s of sheets) {
      if (norm(s.getName()) === norm(CONFIG.HOJA_RESPUESTAS)) {
        sh = s;
        break;
      }
    }
  }
  if (!sh) {
    throw new Error(`No se encontró la hoja "${CONFIG.HOJA_RESPUESTAS}". Revisa que el nombre coincida exactamente.`);
  }
  return sh;
}

/**
 * Obtiene o crea la hoja de credenciales de administradores ("contraseña").
 */
function obtenerHojaContrasenas() {
  const ss = obtenerSpreadsheet();
  const nombres = [
    CONFIG.HOJA_CONTRASENAS,
    "contraseña",
    "contrasena",
    "Contraseña",
    "Contrasena",
    "contraseñas",
    "contrasenas",
    "Contraseñas",
    "passwords",
    "Passwords",
    "usuarios",
    "Usuarios"
  ];

  let sh = null;
  for (let n of nombres) {
    sh = ss.getSheetByName(n);
    if (sh) break;
  }

  // Si no existe, crearla automáticamente con encabezados y usuario inicial
  if (!sh) {
    sh = ss.insertSheet("contraseña");
    sh.getRange(1, 1, 1, 4).setValues([["Usuario", "Contraseña", "Nombre / Rol", "Activo"]]);
    sh.getRange(2, 1, 1, 4).setValues([["admin", "A7237SPR", "Administrador Principal", "SI"]]);
    sh.getRange(1, 1, 1, 4).setFontWeight("bold").setBackground("#004b87").setFontColor("#ffffff");
    sh.autoResizeColumns(1, 4);
    Logger.log('Se creó automáticamente la hoja "contraseña" con el usuario por defecto "admin".');
  }
  return sh;
}

/**
 * Valida usuario y contraseña contra la hoja "contraseña".
 */
function validarCredencialesAdmin(usuarioInput, claveInput) {
  const user = String(usuarioInput || "").trim();
  const pass = String(claveInput || "").trim();

  if (!user || !pass) {
    return { valido: false, mensaje: "Debes ingresar tu usuario y contraseña." };
  }

  const sh = obtenerHojaContrasenas();
  const data = sh.getDataRange().getValues();
  if (!data || data.length < 2) {
    return { valido: false, mensaje: 'La hoja "contraseña" no tiene registros de usuarios.' };
  }

  let colUser = 1;
  let colPass = 2;
  let colNombre = 3;
  let colActivo = 4;

  const headers = data[0].map(h => norm(String(h)));
  headers.forEach((h, idx) => {
    const colNum = idx + 1;
    if (/usuario|user|login|correo|email|matricula/i.test(h)) colUser = colNum;
    else if (/contrase|pass|clave|pin/i.test(h)) colPass = colNum;
    else if (/nombre|rol|tecnico|responsable/i.test(h)) colNombre = colNum;
    else if (/activo|status|habilitado|vigente/i.test(h)) colActivo = colNum;
  });

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const uVal = String(row[colUser - 1] || "").trim();
    const pVal = String(row[colPass - 1] || "").trim();
    const nombreVal = colNombre <= row.length ? String(row[colNombre - 1] || "").trim() : uVal;
    const activoVal = colActivo <= row.length ? String(row[colActivo - 1] || "").trim().toUpperCase() : "SI";

    if (uVal.toLowerCase() === user.toLowerCase()) {
      if (pVal === pass) {
        if (activoVal === "NO" || activoVal === "INACTIVO" || activoVal === "0" || activoVal === "FALSE") {
          return { valido: false, mensaje: "Este usuario se encuentra inactivo." };
        }
        return {
          valido: true,
          usuario: uVal,
          nombre: nombreVal || uVal
        };
      } else {
        return { valido: false, mensaje: "Contraseña incorrecta." };
      }
    }
  }

  return { valido: false, mensaje: "Usuario no encontrado." };
}

/**
 * Función accesible desde el menú de Google Sheets para activar la hoja de contraseñas.
 */
function abrirHojaContrasenas() {
  try {
    const sh = obtenerHojaContrasenas();
    SpreadsheetApp.getActiveSpreadsheet().setActiveSheet(sh);
    try {
      SpreadsheetApp.getUi().alert(
        '🔑 Hoja "contraseña" lista.\n\n' +
        'Estructura de columnas:\n' +
        '• Columna A: Usuario (ej: admin, yazmin, nunez.yazmin@tec.mx)\n' +
        '• Columna B: Contraseña\n' +
        '• Columna C: Nombre o Rol (ej: Yazmin Núñez)\n' +
        '• Columna D: Activo (SI / NO)'
      );
    } catch (e) {}
  } catch (err) {
    Logger.log("abrirHojaContrasenas error: %s", err);
  }
}

function valor(row, columna) {
  if (!columna || !row) return "";
  return row[columna - 1] !== undefined ? row[columna - 1] : "";
}

function formatearFecha(valorFecha) {
  if (!valorFecha) return "";
  if (!(valorFecha instanceof Date)) valorFecha = new Date(valorFecha);
  if (isNaN(valorFecha.getTime())) return valorFecha.toString();
  return Utilities.formatDate(valorFecha, "America/Mexico_City", "dd/MM/yyyy HH:mm");
}

/********************************************************************************
 * SUITE DE PRUEBAS Y DIAGNÓSTICO (DIRIGIDAS A nunez.yazmin@tec.mx)
 ********************************************************************************/

/**
 * 1. Envío rápido de prueba a Yazmin Núñez.
 */
function testCorreoYazmin() {
  const destinatario = CONFIG.CORREO_PRUEBAS;
  enviarCorreo({
    para: destinatario,
    asunto: "[TEST] Conexión Apps Script — Laboratorio de Mecatrónica",
    html: `
      <div style="font-family:'Segoe UI',Arial,sans-serif;padding:15px;background:#f9fafb;border-radius:10px;border:1px solid #e5e7eb;">
        <h2 style="color:#004b87;margin-top:0;">Prueba de Conexión Exitosa 🚀</h2>
        <p>Hola Yazmin,</p>
        <p>Este correo confirma que el script del <b>Laboratorio de Mecatrónica (A7-237)</b> está correctamente enlazado a Google Sheets y tiene permisos para enviar correos institucionales.</p>
        <ul>
          <li><b>Fecha y hora:</b> ${formatearFecha(new Date())}</li>
          <li><b>Emisor configurado:</b> ${CONFIG.REMITENTE_NOMBRE}</li>
          <li><b>Destino:</b> ${destinatario}</li>
        </ul>
        <p>Todo en orden para recibir y procesar solicitudes.</p>
      </div>`
  });

  try {
    SpreadsheetApp.getUi().alert(`✅ Correo de prueba enviado con éxito a: ${destinatario}`);
  } catch (e) {
    Logger.log("Correo enviado a %s", destinatario);
  }
}

/**
 * 2. Prueba de las 10 plantillas de correo para los 3 servicios (3D, Láser, PCB).
 */
function testEnviarTodasLasPlantillas(destinatario) {
  const target = destinatario || CONFIG.CORREO_PRUEBAS;
  const t3D = "L3D-TEST3D-1111";
  const tLaser = "L3D-TESTLAS-2222";
  const tPCB = "L3D-TESTPCB-3333";
  const nombre = "Yazmin Núñez (Prueba)";

  const pruebas = [
    { asunto: `[TEST 1/10][${t3D}] Solicitud Recibida — Impresión 3D`, html: tplRecibido3D(nombre, t3D) },
    { asunto: `[TEST 2/10][${tLaser}] Solicitud Recibida — Corte Láser`, html: tplRecibidoLaser(nombre, tLaser) },
    { asunto: `[TEST 3/10][${tPCB}] Solicitud Recibida — Fabricación PCB`, html: tplRecibidoPCB(nombre, tPCB) },
    { asunto: `[TEST 4/10][${t3D}] APROBADA — Impresión 3D`, html: tplAprobadaConFilamento(nombre, t3D) },
    { asunto: `[TEST 5/10][${tLaser}] APROBADA — Corte Láser`, html: tplAprobadaLaser(nombre, tLaser) },
    { asunto: `[TEST 6/10][${tPCB}] APROBADA — Fabricación PCB`, html: tplAprobadaPCB(nombre, tPCB) },
    { asunto: `[TEST 7/10][${t3D}] Lista para recoger — Impresión 3D`, html: tplListaSalon(nombre, t3D) },
    { asunto: `[TEST 8/10][${tLaser}] Lista para recoger — Corte Láser`, html: tplListaSalonLaser(nombre, tLaser) },
    { asunto: `[TEST 9/10][${tPCB}] Lista para recoger — Fabricación PCB`, html: tplListaSalonPCB(nombre, tPCB) },
    { asunto: `[TEST 10/10][${t3D}] Solicitud RECHAZADA — Impresión 3D`, html: tplRechazada(nombre, t3D, "Prueba: El archivo excede las dimensiones máximas de la cama (250x250 mm).") }
  ];

  Logger.log("Iniciando envío de %s plantillas de prueba a %s...", pruebas.length, target);
  pruebas.forEach((p, idx) => {
    enviarCorreo({ para: target, asunto: p.asunto, html: p.html });
    Utilities.sleep(400); // Pequeña pausa para no saturar la cuota
  });

  try {
    SpreadsheetApp.getUi().alert(`✅ Se enviaron las 10 plantillas de correo a:\n${target}\n\nRevisa tu bandeja de entrada.`);
  } catch (e) {
    Logger.log("Plantillas enviadas a %s", target);
  }
}

/**
 * 3. Simula la llegada de un formulario sin necesidad de rellenar Google Forms.
 */
function testSimularFormSubmit(destinatario) {
  const target = destinatario || CONFIG.CORREO_PRUEBAS;
  const ticketSimulado = generarTicket("YAZMIN");
  const nombre = "Yazmin Núñez";

  Logger.log("Simulando onFormSubmit con Ticket=%s y Correo=%s", ticketSimulado, target);

  // Enviar correo de confirmación de recepción
  const asunto = `[${ticketSimulado}] Solicitud recibida — Impresión 3D (Simulación)`;
  const html = tplRecibido3D(nombre, ticketSimulado);
  enviarCorreo({ para: target, asunto: asunto, html: html });

  try {
    SpreadsheetApp.getUi().alert(
      `✅ Simulación de formulario completada.\n\nTicket generado: ${ticketSimulado}\nCorreo enviado a: ${target}`
    );
  } catch (e) {
    Logger.log("Simulación ejecutada.");
  }
}

/**
 * 4. Diagnóstico completo e integral de todo el sistema.
 */
function testDiagnosticoCompleto(destinatario) {
  const target = destinatario || CONFIG.CORREO_PRUEBAS;
  const reporte = [];
  reporte.push("=== DIAGNÓSTICO DEL SISTEMA DE PROTOTIPADO ===");

  // 1. Verificar acceso a la hoja
  try {
    const sh = obtenerHojaRespuestas();
    reporte.push(`✓ Hoja encontrada: "${sh.getName()}" (Filas: ${sh.getLastRow()}, Columnas: ${sh.getLastColumn()})`);
    
    // 2. Verificar detección de columnas
    const cols = obtenerIndices(sh);
    reporte.push(`✓ Columna Ticket: ${cols.ticket} | Estado: ${cols.estado} | Notificado: ${cols.notificado}`);
    reporte.push(`✓ Columna Servicio: ${cols.servicio} | Nombre: ${cols.nombre} | Correo: ${cols.correo}`);
  } catch (e) {
    reporte.push(`✕ Error en hoja: ${e.message}`);
  }

  // 3. Probar detección de servicios
  const s3d = tipoServicio("Impresion 3D");
  const slaser = tipoServicio("Cortadora Laser");
  const spcb = tipoServicio("Fabricación de PCB");
  reporte.push(`✓ Detección servicios: 3D -> "${s3d}", Láser -> "${slaser}", PCB -> "${spcb}"`);

  // 4. Probar sesión de administrador y hoja de contraseñas
  try {
    const shPass = obtenerHojaContrasenas();
    reporte.push(`✓ Hoja "contraseña" activa: ${shPass.getLastRow()} fila(s)`);
    const dataPass = shPass.getDataRange().getValues();
    if (dataPass.length >= 2) {
      const uTest = String(dataPass[1][0] || "").trim();
      const pTest = String(dataPass[1][1] || "").trim();
      const login = iniciarSesionAdmin(uTest, pTest);
      if (login.ok && login.token) {
        reporte.push(`✓ Autenticación admin con "${uTest}": OK (Token generado)`);
        cerrarSesionAdmin(login.token);
        reporte.push(`✓ Cierre de sesión admin: OK`);
      }
    }
  } catch (e) {
    reporte.push(`✕ Error autenticación admin: ${e.message}`);
  }

  // 5. Probar datos públicos
  try {
    const datosPub = obtenerDatosPublicos();
    reporte.push(`✓ Consulta pública: OK (${datosPub.length} solicitudes en cola/recientes)`);
  } catch (e) {
    reporte.push(`✕ Error consulta pública: ${e.message}`);
  }

  // 6. Probar envío de correo con el reporte
  const reporteTexto = reporte.join("\n");
  Logger.log("\n" + reporteTexto);

  enviarCorreo({
    para: target,
    asunto: "[DIAGNÓSTICO] Sistema Laboratorio de Mecatrónica",
    html: `
      <div style="font-family:monospace;background:#1e293b;color:#f8fafc;padding:20px;border-radius:10px;white-space:pre-wrap;">
        <h3 style="color:#38bdf8;margin-top:0;">📋 Reporte de Diagnóstico del Sistema</h3>
${reporteTexto}
      </div>`
  });

  try {
    SpreadsheetApp.getUi().alert("Diagnóstico completo.\n\n" + reporteTexto + `\n\nReporte enviado a ${target}`);
  } catch (e) {}
}

/**
 * 5. Corrige filas que quedaron desfasadas por la versión previa del código.
 */
function corregirFilasDesfasadasExistentes() {
  const sh = obtenerHojaRespuestas();
  const lastRow = sh.getLastRow();
  if (lastRow < 2) {
    SpreadsheetApp.getUi().alert("No hay filas de datos para verificar.");
    return;
  }

  let corregidas = 0;
  for (let r = 2; r <= lastRow; r++) {
    const ticket25 = sh.getRange(r, 25).getValue();
    const val26 = sh.getRange(r, 26).getValue();

    // Si col 25 (Ticket) está vacía y col 26 tiene formato de Ticket (L3D-...)
    if (!ticket25 && String(val26 || "").startsWith("L3D-")) {
      const ticket = sh.getRange(r, 26).getValue();
      const estado = sh.getRange(r, 27).getValue();
      const impresora = sh.getRange(r, 28).getValue();
      const tEstimado = sh.getRange(r, 29).getValue();
      const tInicio = sh.getRange(r, 30).getValue();
      const tFin = sh.getRange(r, 31).getValue();
      const notas = sh.getRange(r, 33).getValue();
      const notificado = sh.getRange(r, 34).getValue();

      sh.getRange(r, 25).setValue(ticket);
      sh.getRange(r, 26).setValue(estado);
      sh.getRange(r, 27).setValue(impresora);
      sh.getRange(r, 28).setValue(tEstimado);
      sh.getRange(r, 29).setValue(tInicio);
      sh.getRange(r, 30).setValue(tFin);
      sh.getRange(r, 32).setValue(notas);
      sh.getRange(r, 33).setValue(notificado);
      sh.getRange(r, 34).clearContent();
      corregidas++;
    }
  }

  const msg = `Se verificaron ${lastRow - 1} filas. Se corrigieron ${corregidas} filas desfasadas.`;
  Logger.log(msg);
  try {
    SpreadsheetApp.getUi().alert("🔧 Resultado de corrección:\n\n" + msg);
  } catch (e) {}
}
