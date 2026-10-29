# 📦 Inventario y Préstamos · A7-237

Sistema de préstamo de material **separado** del de Prototipado (impresión 3D / láser / PCB):

| | Prototipado | Inventario |
|---|---|---|
| Página (GitHub Pages) | `admin.html` / `index.html` | `inventario.html` |
| Hoja de cálculo | *Servicio de Prototipado Rapido* | **Hoja nueva, propia** |
| Apps Script (`/exec`) | `Code.js` de la raíz (se publica solo con GitHub Actions) | `inventario/Code.gs` + `inventario/App.html` (proyecto aparte) |

Los dos viven en el mismo sitio (`https://a7236laboratorios-bit.github.io/adminA4-237/…`) y se enlazan entre sí desde el encabezado, pero **no comparten datos ni código**: si uno falla, el otro sigue funcionando.

## Cómo opera (v2 · autoservicio)

El **usuario** hace su propio préstamo y su propia devolución en el kiosco. El **laboratorista** solo autoriza con su contraseña y administra lo demás.

| Quién | Qué puede hacer |
|---|---|
| **Usuario** (sin sesión) | **📤 Pedir** y **📥 Devolver**. Nada más. |
| **Laboratorista** (🔐 arriba a la derecha) | Autoriza cada préstamo o devolución con su contraseña. Además maneja **Panel, Lockers, Consulta, Usuarios** (editar, bloquear, dar de alta) y **Etiquetas**. |

**Pedir material**
1. El usuario escanea su credencial.
   - Si es su **primera vez**, captura su *nombre completo* y *correo*, y queda guardado en la hoja **Usuarios** (en Notas dice “Autorregistro + fecha”).
   - Si está **bloqueado** o tiene **material vencido**, no puede continuar y se le pide que acuda con el laboratorista.
2. Escanea cada equipo que se lleva. Escanear el mismo equipo otra vez suma una pieza.
3. Toca **Terminar** (o escanea la etiqueta *TERMINAR*, o presiona F9). Aparece el resumen y el **laboratorista escribe su contraseña** para autorizar.
4. Sale la pantalla “¡Listo!” con la fecha límite, se envía el comprobante por correo y la pantalla queda limpia para el siguiente.

**Devolver material**
1. El usuario escanea su credencial **o directamente un equipo que trae**; el sistema encuentra a quién se le prestó.
2. Escanea cada equipo que regresa. Las devoluciones parciales están permitidas.
3. **Terminar**. El laboratorista revisa físicamente el material y autoriza con su contraseña.

**Seguridad del kiosco**
- La contraseña de autorización identifica al laboratorista, que queda registrado en *Entregó* / *Recibió*. Por eso **cada laboratorista necesita una contraseña distinta** (columna `PIN` de la hoja Laboratoristas).
- Si alguien escribe 5 contraseñas incorrectas, ese usuario queda sin poder pedir autorización por 5 minutos.
- Si un usuario deja la operación a medias, la pantalla se limpia sola a los 2 minutos.
- La sesión del laboratorista se cierra sola tras `MINUTOS_SESION` sin actividad.
- En el kiosco el correo se muestra enmascarado (`pe•••@tec.mx`).

Para usarlo sin autorización (100 % autoservicio), pon `AUTORIZAR_PRESTAMO` y/o `AUTORIZAR_DEVOLUCION` en **No**.

### Actualizar de v1 a v2 (hoja ya instalada)
1. En el proyecto de Apps Script **del Inventario**, reemplaza `Code.gs` y `App.html` con los de esta carpeta y guarda.
2. En la hoja: **📦 Almacén › Instalar / reparar plantilla**. Esto agrega las claves nuevas (`AUTOREGISTRO`, `AUTORIZAR_PRESTAMO`, `AUTORIZAR_DEVOLUCION`, `MINUTOS_SESION`) sin borrar datos. Las claves viejas `REQUIERE_PIN` y `REGISTRO_LIBRE` ya no se usan; puedes borrarlas.
3. **Implementar › Administrar implementaciones › ✏️ › Versión: Nueva versión**. La URL `/exec` no cambia.
4. Revisa que **cada laboratorista tenga una contraseña distinta**.

`inventario.html` (GitHub Pages) avisa con un letrero rojo si el servidor sigue en la v1.

## Conectar `inventario.html` (una sola vez)

1. Crea una **hoja de cálculo nueva** e instala la plantilla siguiendo los pasos 2 a 6 de abajo, usando los archivos de la carpeta `inventario/` (`Code.gs`, `App.html`, `appsscript.json`).
2. Al publicar, en *Quién tiene acceso* elige **Cualquier persona** (GitHub Pages necesita llamar a la API sin sesión de Google; los datos personales siguen protegidos por laboratorista + PIN).
3. Copia la URL que termina en `/exec` (también aparece en **📦 Almacén › Abrir la aplicación**).
4. Pégala en `inventario.html`, en la línea `const DEFAULT_API_URL = "";`, y súbelo a GitHub.
   *Atajo sin editar código:* abre una vez `https://a7236laboratorios-bit.github.io/adminA4-237/inventario.html?api=TU_URL_EXEC` y queda guardada en ese navegador.

Enlaces directos: `inventario.html?p=pedir` (kiosco, página por defecto), `?p=devolver`, `?p=lockers` (vista pública sin nombres, útil para una pantalla en la pared), `?p=inicio`, `?p=consulta`, `?p=usuarios`, `?p=etiquetas`. Los enlaces viejos `?p=prestamo` y `?p=devolucion` siguen funcionando.

`inventario.html` es una **copia idéntica** de `inventario/App.html`: el mismo archivo funciona dentro de Apps Script y en GitHub Pages. Si editas uno, cópialo al otro con `cp inventario/App.html inventario.html`.

> Al cambiar `inventario/Code.gs` o `App.html`, pégalos en el proyecto de Apps Script del Inventario y publica con *Administrar implementaciones › ✏️ › Nueva versión* (la URL `/exec` no cambia). El workflow de GitHub Actions **no** toca este proyecto.

---

## Plantilla de Préstamo de Material v2.0

Sistema de préstamos y devoluciones para almacenes, laboratorios y talleres. Funciona con **Google Sheets + Apps Script**, con **escáner 2D USB**, con la cámara del celular o tecleando a mano.

**Qué incluye**
- **Préstamo:** se escanea la credencial y luego cada artículo. Si escaneas el mismo artículo otra vez, se suma una pieza.
- **Devolución:** puedes escanear la credencial **o directamente un artículo**, y el sistema encuentra quién lo tiene. Acepta devoluciones parciales.
- **Mapa de lockers:** se actualiza cada minuto. Si nadie ha iniciado sesión, no muestra nombres ni matrículas.
- **Consulta:** historial por persona o por material, préstamos activos, vencidos e inventario.
- **Etiquetas QR imprimibles:** para materiales, credenciales y los códigos de control REGISTRAR / CANCELAR.
- **Correos:** comprobante de cada préstamo y devolución, y un recordatorio diario de vencidos (al usuario y al administrador).
- **Controles:** inicio de sesión de laboratorista con PIN, usuarios bloqueados, bloqueo a quien tenga material vencido y fecha límite automática.
- **Varios mostradores a la vez:** dos personas pueden registrar al mismo tiempo sin que se encimen los datos.

---

## 1. Instalación (unos 10 minutos)

1. Crea una **hoja de cálculo nueva y vacía** en Google Drive.
2. Ve a **Extensiones › Apps Script**.
3. En el editor:
   - Borra el contenido de `Código.gs` y pega todo el de **`Code.gs`**.
   - Da clic en **＋ › HTML**, ponle de nombre **`App`** (exactamente así) y pega el contenido de **`App.html`**.
   - (Recomendado) En ⚙️ *Configuración del proyecto*, activa “Mostrar el archivo de manifiesto `appsscript.json`” y pega el contenido de **`appsscript.json`**. Así la zona horaria queda en `America/Mexico_City`; cámbiala si el cliente está en otra.
   - Guarda (💾).
4. Regresa a la hoja y **recárgala**. Aparece el menú **📦 Almacén**.
5. Usa **📦 Almacén › Instalar / reparar plantilla**. La primera vez Google pide permisos: acéptalos con la cuenta dueña.
   Se crean las hojas *Configuración, Materiales, Usuarios, Laboratoristas* e *Historial*, con datos de ejemplo.
6. **Publica la app:** en Apps Script ve a **Implementar › Nueva implementación › ⚙️ Aplicación web**.
   - *Ejecutar como:* **Yo** (la cuenta dueña).
   - *Quién tiene acceso:*
     - **Cualquier usuario con cuenta de Google**: recomendado.
     - **Cualquier usuario de [dominio]**: si es Google Workspace institucional.
     - **Cualquier persona**: solo para una pantalla tipo kiosco sin sesión de Google.
   - Copia la URL. También la puedes consultar después en **📦 Almacén › Abrir la aplicación**.
7. Abre la URL: arranca en el kiosco **Pedir**. Escanea o escribe `A00000001`, luego `MAT001` y Terminar; autoriza con la contraseña **1234** (*Laboratorista Demo*). Prueba también una credencial nueva (por ejemplo `A09999999`) para ver el autorregistro.
8. Cuando todo funcione, usa **📦 Almacén › Borrar datos de ejemplo**, captura los datos reales y **cambia la contraseña 1234** (columna `PIN`).

> **Al actualizar el código** usa *Implementar › Administrar implementaciones › ✏️ › Versión: Nueva versión*. Así la URL no cambia.

### Enlaces directos
Agrega `?p=` a la URL de la app:

| Página | Parámetro |
|---|---|
| Inicio | `?p=inicio` |
| Préstamo (para el mostrador) | `?p=prestamo` |
| Devolución | `?p=devolucion` |
| Mapa de lockers (para una pantalla en la pared) | `?p=lockers` |
| Consulta | `?p=consulta` |
| Etiquetas | `?p=etiquetas` |

Los enlaces de la versión anterior (`?prestamo`, `?devolucion`, `?Visualizacion`) siguen funcionando.

---

## 2. Las hojas

| Hoja | Qué captura el cliente | Notas |
|---|---|---|
| **Configuración** | Nombre, color, logo, días de préstamo, correos… | Ver tabla abajo. |
| **Materiales** | `ID`, `Nombre`, `Categoría`, `Ubicación`, `Cantidad total` | `Disponible` y `Estatus` los calcula el sistema. `Cantidad total` vacía cuenta como 1. |
| **Usuarios** | `ID` (lo que trae el código de la credencial), `Nombre`, `Correo`, `Área`, `Estatus` | `Estatus = Bloqueado` impide prestarle. En `Notas` se puede escribir el motivo. |
| **Laboratoristas** | `Nombre`, `PIN`, `Activo` | Quien entrega o recibe queda registrado en cada movimiento. |
| **Historial** | Nada: lo escribe la app | Para anular un registro equivocado, escribe **Cancelado** en `Estado`. |

Las columnas se buscan **por nombre**, así que el cliente puede reordenarlas o agregar columnas propias, como “Proveedor” o “No. de serie”.
Si alguien borra una columna, **📦 Almacén › Instalar / reparar plantilla** la vuelve a crear sin tocar los datos.

### Configuración

| Clave | Para qué sirve |
|---|---|
| `NOMBRE_SISTEMA`, `NOMBRE_INSTITUCION`, `COLOR_PRINCIPAL`, `LOGO_URL` | Marca del cliente (app y correos). |
| `DIAS_PRESTAMO` | 7 = una semana. 0 = devolver el mismo día. Vacío = sin fecha límite. |
| `ENVIAR_CORREOS` | Sí / No. |
| `DOMINIO_CORREO` | Ej. `@tec.mx`. Rellena el correo en el autorregistro (`id@tec.mx`) y se usa si un usuario no tiene correo. |
| `CORREO_ADMIN` | Recibe el resumen diario de vencidos y las respuestas a los correos. |
| `BLOQUEAR_CON_VENCIDOS` | No presta a quien tenga material vencido. |
| `AUTOREGISTRO` | Sí: una credencial nueva captura nombre y correo y queda en Usuarios. No: solo el laboratorista da de alta (menú Usuarios). |
| `AUTORIZAR_PRESTAMO`, `AUTORIZAR_DEVOLUCION` | Sí: el laboratorista confirma con su contraseña. No: autoservicio puro (queda registrado como “Autoservicio”). |
| `MINUTOS_SESION` | Minutos sin actividad para cerrar el modo laboratorista (10 por defecto). |
| `CATEGORIA_LOCKER`, `LOCKERS_POR_FILA` | Los materiales con esa categoría aparecen en el mapa. **📦 Almacén › Generar lockers** crea L1…Ln. |

### Recordatorios automáticos
**📦 Almacén › Activar recordatorio diario de vencidos** programa un envío diario entre 8 y 9 a.m.

---

## 3. Configurar el escáner 2D (importante)

1. **Sufijo Enter:** el escáner debe mandar *Enter* (CR) al final de cada lectura. La mayoría viene así de fábrica; si no, se activa escaneando el código “Add CR suffix” del manual. Con *Tab* también funciona.
2. **Distribución de teclado:** si la computadora tiene teclado en **español** y el escáner está en **inglés (US)**, los guiones y otros símbolos salen cambiados: `-` puede salir como `'` o `?`. Hay dos soluciones:
   - Configura el escáner en el mismo idioma que el teclado (código “Keyboard Language: Spanish/Latin America” del manual).
   - **O mejor:** usa IDs **solo con letras y números** (`MAT001`, no `MAT-001`). Las etiquetas de ejemplo ya vienen así.
3. **Modo de uso en el mostrador:** la app deja el cursor en el campo correcto después de cada lectura. El laboratorista nunca tiene que tocar el mouse:
   - **Préstamo:** credencial → artículo → artículo → … → **REGISTRAR**.
   - **Devolución:** artículo (o credencial) → artículos → **REGISTRAR**.

   Imprime los códigos REGISTRAR y CANCELAR desde *Etiquetas › Códigos de control* y pégalos junto al escáner. También funcionan **F9** o **Ctrl+Enter**.
4. Hay un pitido corto cuando la lectura es buena y uno grave cuando hay error.

---

## 4. Límites de Google que conviene conocer

- **Correos por día** (MailApp): alrededor de **100** con cuenta Gmail gratuita y **1,500** con Google Workspace. Si se acaba la cuota, el préstamo se registra igual y solo se omite el correo.
- **Rendimiento:** cada operación lee Materiales e Historial completos. Va fluido hasta unas **20,000–30,000 filas** de historial. Más allá, mueve los años anteriores a otra hoja (por ejemplo, “Historial 2025”).
- **Seguridad:** las funciones que devuelven datos personales verifican el laboratorista y su PIN en el servidor. Después de 5 PIN incorrectos, ese laboratorista queda bloqueado 5 minutos. Los PIN se guardan en la hoja, así que **no compartas la hoja de cálculo** con estudiantes; solo comparte la URL de la app.

---

## 5. Cómo entregarla a cada cliente

- Mantén una **hoja maestra** con la plantilla instalada y sin datos.
- Para un cliente nuevo, comparte el enlace de copia:
  `https://docs.google.com/spreadsheets/d/ID_DE_TU_HOJA/copy`.
  La copia incluye el código. El cliente solo hace los pasos 5 a 8 con **su** cuenta, para que los datos de sus estudiantes queden en su Drive y no en el tuyo.
- **Actualizaciones:** reemplaza `Code.gs` y `App.html` en el proyecto del cliente, ejecuta *Instalar / reparar plantilla* (agrega columnas o configuraciones nuevas sin borrar datos) y publica una *Nueva versión*.
- **Datos personales (México, LFPDPPP):** el cliente es el *responsable* de los datos y tú, si das soporte, el *encargado*. Incluye un aviso de privacidad y un contrato de prestación de servicios con cláusula de confidencialidad.
