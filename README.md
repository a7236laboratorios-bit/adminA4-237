# 🛠️ Sistema de Gestión de Prototipado Rápido (A7-237)
### Laboratorio de Mecatrónica — Tecnológico de Monterrey

Sistema automatizado basado en **Google Apps Script**, **Google Sheets**, **Google Forms** y **Gmail** para la recepción, seguimiento, control de estados y notificación por correo de solicitudes de:
1. 🖨️ **Impresión 3D** (Filamento propio, archivos `.gcode`)
2. ✂️ **Corte y Grabado Láser** (MDF y Acrílico, archivos `.DXF`)
3. 🔌 **Prototipado de PCB** (Fresado CNC / fabricación, archivos Gerber `.gbr`)

---

## 📁 Estructura del Proyecto para GitHub

```text
sistema-laboratorio-prototipado/
├── src/
│   ├── Code.js              # Lógica del backend, triggers, correos y API
│   ├── admin.html           # Panel Web Administrativo (control de colas)
│   ├── index.html           # Tablero Web Público (seguimiento en vivo)
│   └── appsscript.json      # Manifiesto de Apps Script (Zona horaria CDMX)
├── Code.js                  # Copia directa en raíz para facilidad de uso
├── admin.html               # Copia directa en raíz
├── index.html               # Copia directa en raíz
├── appsscript.json          # Copia directa en raíz
├── .clasp.json              # Configuración para sincronización con Clasp CLI
├── .claspignore             # Archivos excluidos en la sincronización
├── .gitignore               # Exclusión de temporales y credenciales en Git
├── package.json             # Scripts de utilidad
└── README.md                # Manual integral de instalación y operación
```

---

## 🔍 Correcciones Críticas Realizadas en esta Versión

1. **Resolución del Desfase de Columnas:**
   - En la versión anterior, la configuración definía `material_pcb` en la columna 23, cuando en el formulario real dicha columna correspondía a *"¿Acepta el Reglamento?"*.
   - Esto provocaba que el **Ticket** se escribiera en la columna 26 (sobre el encabezado *Estado*), el **Estado** en la columna 27 (sobre *Impresora*), etc.
   - **Solución implementada:** Se ajustó el mapeo canónico exacto a las 33 columnas de la hoja y se agregó un motor de **detección dinámica de encabezados** (`obtenerIndices`), haciendo el código inmune a columnas movidas o agregadas en el formulario.
2. **Función de Reparación Automática de Datos:**
   - Se añadió la función `corregirFilasDesfasadasExistentes()` que detecta filas antiguas desfasadas y las alinea automáticamente con sus encabezados reales.
3. **Manejo Seguro de Ejecución Manual:**
   - Las funciones `onFormSubmit(e)` y `onEditHandler(e)` ahora verifican si el objeto de evento `e` existe, evitando errores al probarlas directamente desde el editor de Apps Script.
4. **Filtro Inteligente del Tablero Público:**
   - `obtenerDatosPublicos()` muestra siempre todas las solicitudes en estado activo y mantiene visibles las solicitudes concluidas durante 3 días para que los alumnos confirmen la entrega de su pieza.
5. **Suite de Pruebas Dirigidas a `nunez.yazmin@tec.mx`:**
   - Funciones especializadas para probar la entrega de correos, las 10 plantillas de notificación y el diagnóstico completo del sistema.

---

## 🗺️ Mapeo Oficial de Columnas (Hoja: `Servicio de Prototipado Rapido`)

| Columna | Letra | Nombre del Encabezado | Descripción |
| :---: | :---: | :--- | :--- |
| **1** | A | `Timestamp` | Fecha y hora de envío del formulario |
| **2** | B | `Nombre Completo ` | Nombre del solicitante |
| **3** | C | `Matricula ` | Matrícula del alumno |
| **4** | D | `Correo Institcional ` | Correo `@tec.mx` |
| **5** | E | `Materia o Bloque ` | Asignatura académica |
| **6** | F | `Profesor ` | Profesor titular |
| **7** | G | `¿Qué servicio quieres usar? ` | 3D, Láser o PCB |
| **8** | H | `Archivo a imprimir (.gcode) ` | Enlace a Drive (3D) |
| **9** | I | `Tipo de Material ` | PLA, PETG, TPU, ABS, etc. |
| **10** | J | `Marca del Material ` | Marca del filamento |
| **11** | K | `Fecha límite deseada ` | Fecha requerida por el alumno |
| **12** | L | `Acepto el reglamento ` | Confirmación de reglamento 3D |
| **13** | M | `Observaciones ` | Notas del alumno (3D) |
| **14** | N | `Archivo a cortar (.DXF) ` | Enlace a Drive (Láser) |
| **15** | O | `Material ` | MDF o Acrílico |
| **16** | P | `Espesor (mm) ` | Espesor del material (3mm, 6mm, etc.) |
| **17** | Q | `Tamaño de la placa (mm) ` | Dimensiones de corte |
| **18** | R | `¿Para cuándo la quiere? ` | Fecha límite (Láser) |
| **19** | S | `¿Aceptas el Reglamento? ` | Confirmación de reglamento Láser |
| **20** | T | `Comentarios ` | Notas adicionales Láser |
| **21** | U | `Archivo a imprimir (.gbr) ` | Archivo Gerber (PCB) |
| **22** | V | `Cantidad de Caras ` | 1 cara o 2 caras |
| **23** | W | `Acepta el Reglamento? ` | Confirmación de reglamento PCB |
| **24** | X | `Comentarios u Observaciones ` | Notas adicionales PCB |
| **25** | Y | `Ticket` | Identificador único (`L3D-MATRICULA-####`) |
| **26** | Z | `Estado` | En revisión, Aprobada, En impresión, Lista, etc. |
| **27** | AA | `Impresora asignada` | Máquina que procesa el trabajo |
| **28** | AB | `Tiempo estimado (h)` | Tiempo de maquinado |
| **29** | AC | `Inicio impresión (timestamp)` | Marca de tiempo al iniciar |
| **30** | AD | `Fin impresión (timestamp)` | Marca de tiempo al finalizar |
| **31** | AE | `Lugar de Entrega` | Laboratorio de entrega (A7-237) |
| **32** | AF | `Notas internas` | Motivo de rechazo o notas del técnico |
| **33** | AG | `Notificado` | Estado de la última notificación enviada |

---

## 🔑 Mapeo de la Hoja de Administradores (Hoja: `contraseña`)

Para que el panel administrativo no dependa de una contraseña fija en el código, el sistema lee los usuarios y contraseñas autorizados directamente desde la pestaña **`contraseña`** (o `contrasena`):

| Columna | Letra | Encabezado | Ejemplo | Descripción |
| :---: | :---: | :--- | :--- | :--- |
| **1** | A | `Usuario` | `admin` o `nunez.yazmin` | Nombre de usuario o correo institucional para iniciar sesión |
| **2** | B | `Contraseña` | `A7237SPR` | Contraseña asignada al técnico o profesor |
| **3** | C | `Nombre / Rol` | `Yazmin Núñez (Técnico)` | Nombre para mostrar en el encabezado de bienvenida |
| **4** | D | `Activo` | `SI` | `SI` para permitir acceso, `NO` para suspender temporalmente |

> [!TIP]
> Si la hoja `contraseña` no existe en tu Google Sheet, el script **la creará automáticamente** al ejecutarse por primera vez o al hacer clic en:
> **👾 Lab Prototipado > 🔑 Abrir / Crear hoja de contraseñas**.

---

## 🚀 Cómo Subir y Publicar este Proyecto en tu Repositorio de GitHub

Tu repositorio oficial es:
🔗 **`https://github.com/a7236laboratorios-bit/adminA4-237.git`**

### Opción A: Desde la Terminal con Git (Si tienes Git instalado)
Abre la terminal PowerShell o CMD en la carpeta del proyecto y ejecuta:

```powershell
cd c:\Users\l03563013\Documents\sistema-laboratorio-prototipado

# 1. Inicializar repositorio git
git init

# 2. Agregar todos los archivos
git add .

# 3. Crear commit inicial
git commit -m "feat: Sistema de gestion de prototipado A7-237 con autenticacion por hoja contrasena"

# 4. Configurar rama principal
git branch -M main

# 5. Conectar con tu repositorio remoto
git remote add origin https://github.com/a7236laboratorios-bit/adminA4-237.git

# 6. Subir cambios a GitHub
git push -u origin main --force
```

### Opción B: Subir Archivos Directamente en la Web de GitHub (Sin instalar nada)
1. Abre tu repositorio en el navegador: [https://github.com/a7236laboratorios-bit/adminA4-237](https://github.com/a7236laboratorios-bit/adminA4-237)
2. Haz clic en el botón **"Add file" > "Upload files"**.
3. Arrastra los archivos de la carpeta:
   `c:\Users\l03563013\Documents\sistema-laboratorio-prototipado`
   *(Incluye `Code.js`, `admin.html`, `index.html`, `appsscript.json`, `README.md` y la carpeta `src/`)*.
4. En el mensaje de commit escribe: `Subida inicial sistema prototipado A7-237`.
5. Haz clic en el botón verde **"Commit changes"**.

### Opción C: Usar GitHub Desktop
1. Abre **GitHub Desktop** e inicia sesión con tu cuenta de GitHub.
2. Ve al menú **File > Add Local Repository...** (o presiona `Ctrl + O`).
3. Selecciona la carpeta:
   `c:\Users\l03563013\Documents\sistema-laboratorio-prototipado`
4. Si te indica que no es un repositorio Git, haz clic en **"create a repository"**.
5. En la barra superior, haz clic en **"Publish repository"** y selecciona tu repositorio `a7236laboratorios-bit/adminA4-237`.

---

## ⚙️ Pasos de Instalación en Google Apps Script (Conexión con tu Google Sheets)

1. **Abrir el editor:**
   - Ve a tu hoja de cálculo: [Google Sheet del Laboratorio](https://docs.google.com/spreadsheets/d/1oPwQWPuMcwc0Zo2PFuBia5U4CTxgvY1vvEKz3Bn62Aw/edit?usp=sharing).
   - En el menú superior, ve a **Extensiones > Apps Script**.
2. **Actualizar el código:**
   - En el archivo `Código.gs` (o `Code.js`), reemplaza todo el contenido por el archivo [`Code.js`](src/Code.js).
   - Crea un archivo HTML llamado `admin` y pega el contenido de [`admin.html`](src/admin.html).
   - Crea un archivo HTML llamado `index` y pega el contenido de [`index.html`](src/index.html).
   - En la configuración del proyecto (ícono de engranaje ⚙️), activa la casilla *"Mostrar archivo de manifiesto appsscript.json en el editor"* y asegúrate de que tenga el contenido de [`appsscript.json`](src/appsscript.json).
3. **Guardar los cambios:**
   - Presiona `Ctrl + S` en cada archivo.

---

## 🔄 Configuración de Triggers Automáticos

Para que el sistema asigne tickets y envíe correos automáticamente:
1. En el editor de Apps Script, selecciona en la lista desplegable la función `instalarTriggers` y haz clic en **Ejecutar**.
2. Acepta los permisos de autorización de Google Workspace.
3. Esto creará automáticamente dos activadores:
   - **onFormSubmit**: Se activa cuando un alumno envía una respuesta en Google Forms.
   - **onEditHandler**: Se activa cuando un técnico modifica el estado de una fila en Google Sheets.

> [!TIP]
> También puedes configurar los triggers abriendo la hoja de cálculo y haciendo clic en el menú personalizado:
> **👾 Lab Prototipado > ⚙️ Configurar triggers automáticos**.

---

---

## 🌐 Publicación en GitHub Pages (Frontend Web)

Tus páginas HTML ahora se alojan y se publican directamente en **GitHub Pages**, mientras que Google Apps Script funciona como el motor/backend seguro que lee y escribe en Google Sheets:

### 1. Activar GitHub Pages en tu repositorio:
1. Entra a tu repositorio: [https://github.com/a7236laboratorios-bit/adminA4-237](https://github.com/a7236laboratorios-bit/adminA4-237).
2. Haz clic en la pestaña **Settings** (⚙️ Configuración) arriba a la derecha.
3. En el menú lateral izquierdo, haz clic en **Pages**.
4. En la sección **Build and deployment > Branch**:
   - Selecciona la rama: **`main`**.
   - Selecciona la carpeta: **`/(root)`**.
   - Haz clic en **Save** (Guardar).
5. En 1-2 minutos GitHub generará la URL de tu página web.

### 2. Tus enlaces en GitHub Pages:
- 👥 **Tablero Público de Solicitudes:**
  ```text
  https://a7236laboratorios-bit.github.io/adminA4-237/
  ```
- 🔐 **Panel Administrativo del Laboratorio:**
  ```text
  https://a7236laboratorios-bit.github.io/adminA4-237/admin.html
  ```
  *(Ingresas con el Usuario y Contraseña registrados en la hoja `contraseña`)*.

---

## ⚙️ Conectar GitHub Pages con Google Apps Script (Backend API)

Para que tu página en GitHub Pages se comunique con Google Sheets y envíe correos:

1. **Implementar Apps Script como Web App API:**
   - Abre tu [Google Sheet](https://docs.google.com/spreadsheets/d/1oPwQWPuMcwc0Zo2PFuBia5U4CTxgvY1vvEKz3Bn62Aw/edit?usp=sharing) y ve a **Extensiones > Apps Script**.
   - Haz clic en **Implementar > Nueva implementación**.
   - Tipo: **Aplicación web**.
   - Configura:
     - **Ejecutar como:** `Yo (tu cuenta institucional)`
     - **Quién tiene acceso:** `Cualquier usuario` *(indispensable para que GitHub Pages pueda consumir la API pública y validar logins)*.
   - Haz clic en **Implementar** y copia la URL generada (que termina en `/exec`).

2. **Vincular la URL en tu sitio de GitHub Pages:**
   - Al abrir por primera vez tu sitio en GitHub Pages (`https://a7236laboratorios-bit.github.io/adminA4-237/`), verás un recuadro de conexión inicial.
   - Pega tu URL de Apps Script (la que termina en `/exec`) y presiona **Conectar**.
   - Esta URL queda guardada en tu navegador (`localStorage`) y se comparte automáticamente entre la cola pública y el panel administrativo.
   - *(Opcional)*: También puedes dejarla fija en el código editando la variable `const DEFAULT_API_URL = "TU_URL_DE_APPS_SCRIPT_AQUI/exec";` en `index.html` y `admin.html`.

---

## 🧪 Pruebas del Sistema (Correo: `nunez.yazmin@tec.mx`)

Todas las funciones de prueba han sido programadas para enviar resultados directamente a **`nunez.yazmin@tec.mx`**.

Puedes ejecutarlas desde el editor de Apps Script o desde el menú personalizado en la hoja de cálculo (**👾 Lab Prototipado**):

### 1. `testCorreoYazmin()`
- Envía un correo institucional de verificación de enlace y permisos para confirmar la entrega a `nunez.yazmin@tec.mx`.

### 2. `testEnviarTodasLasPlantillas()`
- Envía las **10 plantillas de notificación HTML** completas a `nunez.yazmin@tec.mx`:
  1. Solicitud Recibida — Impresión 3D
  2. Solicitud Recibida — Corte Láser
  3. Solicitud Recibida — Fabricación PCB
  4. APROBADA — Impresión 3D *(instrucciones de filamento propio)*
  5. APROBADA — Corte Láser *(instrucciones de material MDF/Acrílico propio)*
  6. APROBADA — Fabricación PCB *(validación técnica y maquinado)*
  7. Lista para recoger — Impresión 3D
  8. Lista para recoger — Corte Láser
  9. Lista para recoger — Fabricación PCB
  10. Solicitud RECHAZADA — Impresión 3D *(con nota técnica explicativa)*

### 3. `testSimularFormSubmit()`
- Simula la recepción de una solicitud sin requerir llenar Google Forms, genera el ticket `L3D-YAZMIN-####` y envía la notificación de recepción.

### 4. `testDiagnosticoCompleto()`
- Ejecuta una inspección de salud completa:
  - Verificación de conexión con la hoja `Servicio de Prototipado Rapido`.
  - Mapeo y concordancia de columnas.
  - Generación de tickets y normalización de servicios.
  - Prueba de login administrativo con token en cache.
  - Formato de salida del tablero público.
  - Envía el reporte técnico por correo a `nunez.yazmin@tec.mx`.

### 5. `corregirFilasDesfasadasExistentes()`
- Revisa las filas existentes en la hoja que fueron guardadas con el código anterior y corrige el desfase de columnas automáticamente.
