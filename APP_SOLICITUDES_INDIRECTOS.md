# App de Solicitudes de Indirectos — Especificación para Claude Code

## Descripción General

Aplicación web full-stack para la gestión, seguimiento y control de solicitudes de contratación indirecta del proyecto **Baia Kristal**. Permite a los solicitantes crear solicitudes, hacer seguimiento del estado y flujo de aprobación, y a los equipos de contratación y controles gestionar el proceso completo.

---

## Stack Tecnológico

- **Frontend:** React + TypeScript + Tailwind CSS
- **Backend:** Node.js + Express (o Next.js App Router con API Routes)
- **Base de datos:** PostgreSQL con Prisma ORM
- **Autenticación:** NextAuth.js o JWT con roles
- **Almacenamiento de archivos:** Sistema local o S3-compatible (para PDFs, Excel, Word)
- **Notificaciones:** Email (Nodemailer) + notificaciones in-app

---

## Módulos de la Aplicación

1. **Módulo de Terceros / Debida Diligencia**
2. **Módulo de Solicitudes** (este spec cubre primero: Solicitud de Contratos)
3. **Módulo de Seguimiento y Control**
4. **Módulo de Configuración** (usuarios, proyectos, aprobadores)

---

## Datos Semilla (Seeds)

### Proyectos y Frentes de Trabajo

```json
{
  "proyectos": [
    {
      "id": 1,
      "nombre": "Baia Kristal",
      "frentes": [
        { "id": 1, "nombre": "KALIZA 1" },
        { "id": 2, "nombre": "KALIZA 2" },
        { "id": 3, "nombre": "KALIZA 3" },
        { "id": 4, "nombre": "KALIZA 4" },
        { "id": 5, "nombre": "KALA 1" },
        { "id": 6, "nombre": "KALA 2" },
        { "id": 7, "nombre": "KALA 3" },
        { "id": 8, "nombre": "KALA 4" }
      ]
    }
  ]
}
```

### Usuarios Semilla

```json
[
  {
    "id": 1,
    "nombre": "Stefania Mercado Mejía",
    "cargo": "Analista de Proyectos",
    "email": "smercado@baiak.com",
    "telefono": "3005264631",
    "rol": "SOLICITANTE",
    "frentes_asignados": ["KALIZA 1", "KALIZA 2"]
  },
  {
    "id": 2,
    "nombre": "Carlos Rodríguez Peña",
    "cargo": "Director de Proyecto – KALIZA",
    "email": "crodriguez@baiak.com",
    "telefono": "3001112233",
    "rol": "DIRECTOR_PROYECTO",
    "frentes_asignados": ["KALIZA 1", "KALIZA 2", "KALIZA 3", "KALIZA 4"]
  },
  {
    "id": 3,
    "nombre": "Valentina Torres Ruiz",
    "cargo": "Director de Proyecto – KALA",
    "email": "vtorres@baiak.com",
    "telefono": "3104445566",
    "rol": "DIRECTOR_PROYECTO",
    "frentes_asignados": ["KALA 1", "KALA 2", "KALA 3", "KALA 4"]
  },
  {
    "id": 4,
    "nombre": "Andrés Morales Gómez",
    "cargo": "Coordinador de Contratos",
    "email": "amorales@baiak.com",
    "telefono": "3157778899",
    "rol": "CONTRATOS"
  },
  {
    "id": 5,
    "nombre": "Laura Jiménez Castro",
    "cargo": "Coordinador de Controles y Costos",
    "email": "ljimenez@baiak.com",
    "telefono": "3168889900",
    "rol": "CONTROLES"
  },
  {
    "id": 6,
    "nombre": "Miguel Ángel Suárez",
    "cargo": "Director de Controles",
    "email": "msuarez@baiak.com",
    "telefono": "3119990011",
    "rol": "DIRECTOR_CONTROLES"
  },
  {
    "id": 7,
    "nombre": "Ana Lucía Vargas",
    "cargo": "Analista de Contratación",
    "email": "avargas@baiak.com",
    "telefono": "3002223344",
    "rol": "SOLICITANTE",
    "frentes_asignados": ["KALA 1", "KALA 2"]
  }
]
```

### Roles y Permisos

| Rol | Puede crear solicitud | Aprueba solicitud | Gestiona contratación | Registra en Adpro | Aprobación final |
|---|---|---|---|---|---|
| `SOLICITANTE` | ✅ | ❌ | ❌ | ❌ | ❌ |
| `DIRECTOR_PROYECTO` | ✅ | ✅ (su frente) | ❌ | ❌ | ❌ |
| `CONTRATOS` | ❌ | ❌ | ✅ | ❌ | ❌ |
| `CONTROLES` | ❌ | ❌ | ❌ | ✅ | ❌ |
| `DIRECTOR_CONTROLES` | ❌ | ❌ | ❌ | ❌ | ✅ |
| `ADMIN` | ✅ | ✅ | ✅ | ✅ | ✅ |

---

## Módulo 1: Terceros y Debida Diligencia

### Descripción
Módulo independiente para registrar y validar contratistas/terceros. Un tercero **solo aparece disponible en el desplegable de solicitudes** cuando ha completado todos los checks de debida diligencia y ha sido aprobado.

### Modelo de Datos: Tercero

```prisma
model Tercero {
  id                    Int      @id @default(autoincrement())
  razonSocial           String
  nit                   String   @unique
  representanteLegal    String
  cedulaRepresentante   String
  correoFirma           String
  direccionRepresentante String
  telefonoRepresentante String
  nombreContacto        String?
  telefonoContacto      String?
  correoContacto        String?
  tipoContrato          String   // "OBRA" | "DISEÑO" | "SERVICIOS"
  
  // Debida diligencia - checks
  dd_identificacionContraparte      Boolean @default(false)
  dd_consultaListasRestrictivas     Boolean @default(false)
  dd_verificacionPep                Boolean @default(false)
  dd_conocimientoNegocio            Boolean @default(false)
  dd_monitoreoActualizacion         Boolean @default(false)
  dd_senalesAlertaReporte           Boolean @default(false)
  
  // Estado
  aprobadoDebidaDiligencia          Boolean @default(false)  // true solo cuando los 6 checks están en true
  fechaAprobacion                   DateTime?
  
  creadoEn   DateTime @default(now())
  actualizadoEn DateTime @updatedAt
}
```

### Regla de Negocio — Debida Diligencia
- Los 6 checks deben estar en `true` para que `aprobadoDebidaDiligencia = true`.
- El campo `aprobadoDebidaDiligencia` se actualiza automáticamente al guardar.
- Solo los terceros con `aprobadoDebidaDiligencia = true` aparecen en el desplegable de la solicitud.
- Los checks los marca el equipo de Contratos o el Coordinador.

### Checks de Debida Diligencia
1. Identificación de la contraparte
2. Consulta de listas restrictivas vinculares
3. Verificación de PEP (Personas Expuestas Políticamente)
4. Conocimiento del negocio y perfil de riesgo
5. Monitoreo continuo y actualización
6. Señales de alerta y reporte

---

## Módulo 2: Solicitudes — Tipos Disponibles

Lista desplegable con los siguientes tipos al crear una nueva solicitud:

```
1. Órdenes de Servicio
2. Contratos                          ← desarrollar primero (spec completo abajo)
3. Otrosí por Tiempo
4. Otrosí Tiempo y Cantidad y/o Modificación de Especificaciones
5. Trámite de Cuenta
6. Trámite de Facturas
7. Trámite de Cuentas Recurrentes
8. Trámite de Cuentas Ocasionales
9. Trámite de Bonificaciones y Comisiones
```

---

## Módulo 2A: Solicitud de Contrato — Spec Detallado

### Flujo de Estados

```
BORRADOR → ENVIADA → APROBADA_DIRECTOR → [EN_REVISION | EN_TRAMITE_CONTRATOS]
                                           ↓                    ↓
                                    DEVUELTA (con nota)    CREACION_MINUTA
                                                                ↓
                                                       ENVIO_CONTRATO_POLIZAS
                                                                ↓
                                                       EN_CONTROLES (Adpro)
                                                                ↓
                                                       APROBACION_FINAL
                                                                ↓
                                                            COMPLETADA
```

### Modelo de Datos: Solicitud

```prisma
model Solicitud {
  id              Int      @id @default(autoincrement())
  consecutivo     String   @unique  // Generado automáticamente: "SOL-CONT-2024-001"
  tipo            TipoSolicitud
  fechaSolicitud  DateTime @default(now())
  
  // Solicitante
  solicitanteId   Int
  solicitante     Usuario @relation(fields: [solicitanteId], references: [id])
  
  // Proyecto y frentes (multiselección)
  proyectoId      Int
  frentesIds      Int[]    // Array de IDs de frentes
  
  // Contratista
  terceroId       Int
  tercero         Tercero @relation(fields: [terceroId], references: [id])
  
  // Contenido del formulario
  descripcionActividad  String   @db.Text
  plazoEjecucion        String
  formaPago             String   @db.Text
  valorFinal            Decimal
  tipoContrato          TipoContrato  // "OBRA" | "DISEÑO"
  
  // Archivos adjuntos (rutas o URLs)
  archivoCuadroComparativo  String?  // Excel
  archivoCotizacion         String?  // PDF
  archivoFormatoSolicitud   String?  // Word (generado desde el formulario)
  archivoBEP                String?  // PDF (solo para contratos de diseño)
  
  // Cronograma (ver modelo CronogramaContrato)
  cronogramaId    Int?
  cronograma      CronogramaContrato? @relation(fields: [cronogramaId], references: [id])
  
  // Aprobador (Director del frente)
  aprobadorId     Int?
  aprobador       Usuario? @relation("Aprobador", fields: [aprobadorId], references: [id])
  fechaAprobacionDirector DateTime?
  
  // Trámite en Contratación
  estadoContratacion  EstadoContratacion?  // "CREACION_MINUTA" | "ENVIO_CONTRATO_POLIZAS"
  notaContratacion    String?              // Observación cuando "SE DEBE REVISAR"
  necesitaRevision    Boolean @default(false)
  
  // Controles
  numeroContratoAdpro  String?
  
  // Estado general
  estado          EstadoSolicitud @default(BORRADOR)
  
  // Historial
  historial       HistorialSolicitud[]
  
  creadoEn        DateTime @default(now())
  actualizadoEn   DateTime @updatedAt
}

enum TipoSolicitud {
  ORDEN_SERVICIO
  CONTRATO
  OTROSI_TIEMPO
  OTROSI_TIEMPO_CANTIDAD
  TRAMITE_CUENTA
  TRAMITE_FACTURAS
  TRAMITE_CUENTAS_RECURRENTES
  TRAMITE_CUENTAS_OCASIONALES
  TRAMITE_BONIFICACIONES_COMISIONES
}

enum TipoContrato {
  OBRA
  DISEÑO
}

enum EstadoSolicitud {
  BORRADOR
  ENVIADA
  APROBADA_DIRECTOR
  EN_REVISION
  EN_TRAMITE_CONTRATOS
  CREACION_MINUTA
  ENVIO_CONTRATO_POLIZAS
  EN_CONTROLES
  APROBACION_FINAL
  COMPLETADA
  DEVUELTA
}

enum EstadoContratacion {
  CREACION_MINUTA
  ENVIO_CONTRATO_POLIZAS
}

model HistorialSolicitud {
  id           Int      @id @default(autoincrement())
  solicitudId  Int
  solicitud    Solicitud @relation(fields: [solicitudId], references: [id])
  usuarioId    Int
  usuario      Usuario  @relation(fields: [usuarioId], references: [id])
  accion       String
  nota         String?
  fecha        DateTime @default(now())
}
```

### Modelo de Datos: Cronograma

```prisma
model CronogramaContrato {
  id              Int      @id @default(autoincrement())
  solicitudId     Int      @unique
  tieneFases      Boolean  @default(false)
  fechaInicio     DateTime // Validar: no puede ser en los próximos 13 días hábiles
  fechaFin        DateTime
  
  fases           FaseCronograma[]
  actividades     ActividadCronograma[]  // Si no tiene fases
  
  creadoEn        DateTime @default(now())
}

model FaseCronograma {
  id              Int      @id @default(autoincrement())
  cronogramaId    Int
  cronograma      CronogramaContrato @relation(fields: [cronogramaId], references: [id])
  numeroFase      Int
  nombreFase      String
  fechaInicio     DateTime
  fechaFin        DateTime
  actividades     ActividadCronograma[]
}

model ActividadCronograma {
  id              Int      @id @default(autoincrement())
  cronogramaId    Int
  cronograma      CronogramaContrato @relation(fields: [cronogramaId], references: [id])
  faseId          Int?
  fase            FaseCronograma? @relation(fields: [faseId], references: [id])
  descripcion     String
  fechaInicio     DateTime
  fechaFin        DateTime
  responsable     String?
}
```

---

## Formulario de Solicitud de Contrato — Campos Detallados

### HEADER (generado automáticamente, visible solo lectura)

| Campo | Tipo | Descripción |
|---|---|---|
| Fecha de solicitud | Date | Automática al crear |
| Consecutivo | String | Auto-generado: `SOL-CONT-YYYY-NNN` |
| Solicitante | String | Usuario autenticado (nombre + cargo) |

---

### SECCIÓN 1: Información del Formulario

#### 1.1 Frente de Trabajo
- **Tipo:** Dropdown multiselección
- **Opciones:** KALIZA 1, KALIZA 2, KALIZA 3, KALIZA 4, KALA 1, KALA 2, KALA 3, KALA 4
- **Requerido:** Sí
- **Nota:** El solicitante solo ve los frentes asignados a su perfil (configurable en el módulo de usuarios)

#### 1.2 Nombre del Tercero
- **Tipo:** Dropdown búsqueda (searchable select)
- **Fuente:** Solo terceros con `aprobadoDebidaDiligencia = true`
- **Muestra:** Razón Social + NIT
- **Requerido:** Sí
- **Mensaje si no hay terceros:** "El contratista no ha completado la debida diligencia. Ir al módulo de Terceros."

#### 1.3 Tipo de Contrato
- **Tipo:** Radio buttons
- **Opciones:** `OBRA` | `DISEÑO`
- **Requerido:** Sí
- **Afecta:** Si es `DISEÑO`, habilita el campo de adjunto BEP (requerido)

#### 1.4 Descripción de Actividad
- **Tipo:** Textarea (texto largo)
- **Placeholder:** "Describa detalladamente el alcance de las actividades a contratar..."
- **Min chars:** 50
- **Requerido:** Sí

#### 1.5 Plazo de Ejecución y/o Entrega
- **Tipo:** Text input (texto corto)
- **Placeholder:** Ej: "25 días calendario a partir del anticipo"
- **Requerido:** Sí

#### 1.6 Forma de Pago
- **Tipo:** Textarea (texto largo)
- **Placeholder:** Ej: "50% anticipo al inicio, 50% a la entrega final"
- **Requerido:** Sí

---

### SECCIÓN 2: Documentos a Anexar

#### 2.1 Cuadro Comparativo
- **Tipo:** File upload
- **Formatos permitidos:** `.xlsx`, `.xls`
- **Requerido:** Sí (marcado con *)
- **Etiqueta:** "Cuadro Comparativo (Excel)*"

#### 2.2 Cotización
- **Tipo:** File upload
- **Formatos permitidos:** `.pdf`
- **Requerido:** Sí (marcado con *)
- **Etiqueta:** "Cotización (PDF)*"

#### 2.3 Formato de Solicitud de Contrato
- **Tipo:** Formulario inline (diligenciable dentro de la app) + botón de descarga Word
- **Requerido:** Sí (marcado con *)
- **Descripción:** Este sub-formulario replica el `FORMATO_SOLICITUD_CONTRATO.docx`. Al completarse, se puede descargar como `.docx`.
- **Campos del sub-formulario:**

```
SOLICITUD:
  - Área/Frente (texto)
  - Nombre del solicitante (auto del usuario)
  - Cargo del solicitante (auto del usuario)
  - Teléfono solicitante (auto del usuario)
  - Correo solicitante (auto del usuario)
  - Proyecto (auto: Baia Kristal)
  - Tipo de contrato (heredado: Obra / Diseño)

CREACIÓN DE TERCERO:
  - ¿Creación de tercero? Sí / No (radio)

CONTRATANTE:
  - Nombre (texto): "AED CONSTRUCTORES S.A.S" (prellenado, editable)
  - NIT (texto): "901237628-1" (prellenado, editable)

CONTRATISTA (se autocompleta del tercero seleccionado):
  - Razón Social
  - NIT
  - Representante Legal
  - Cédula del Representante Legal
  - Correo para firma electrónica
  - Dirección del Representante Legal
  - Teléfono del Representante Legal
  - Nombre Contacto
  - Teléfono Contacto
  - Correo Contacto

DOCUMENTOS OBLIGATORIOS (checklist):
  - Términos de referencia
  - Cámara de Comercio menor a 30 días
  - Estados financieros 2023 y 2024 firmados
  - Estado de resultados 2023 y 2024 firmados
  - Formulario SAGRILAFT
  - Composición accionaria (si corresponde)
  - RUT actualizado menor a 30 días
  - Cédula del Representante Legal
  - Certificación bancaria
  - Cotización (oferta económica)

OBJETO (heredado de Descripción de Actividad)

ALCANCE (texto libre adicional)

VALOR A CONTRATAR CON IVA:
  - Número (valor numérico)
  - Texto (letras, auto-generado o manual)

FORMA DE PAGO (heredada del formulario principal)

PLAZO (heredado del formulario principal)
  - Nota: "Adjuntar cronograma de ejecución firmado por el contratista + 1.5 mes de liquidación"

CONDICIONES ESPECIALES (texto libre)
```

#### 2.4 Cronograma
- **Tipo:** Constructor de cronograma inline (ver spec detallado abajo)
- **Requerido:** Sí (marcado con *)
- **Exportable a:** Excel (descargable)

#### 2.5 BEP
- **Tipo:** File upload
- **Formatos permitidos:** `.pdf`
- **Requerido:** Solo cuando `tipoContrato = DISEÑO`
- **Comportamiento:** El campo aparece/se requiere dinámicamente si se seleccionó "Diseño"

---

### SECCIÓN 3: Valor Final

| Campo | Tipo | Descripción |
|---|---|---|
| Valor Final de la Solicitud | Currency input | Con separadores de miles, en COP |
| Valor en letras | Auto-generado | Se genera automáticamente desde el número |

---

### SECCIÓN 4: Asunto (Auto-generado, editable)

Se genera automáticamente en el siguiente formato:

```
[Tipo de Solicitud] – [Frente(s) de Trabajo] – [Nombre Tercero] – [Descripción de Actividad (primeras 80 chars)]
```

Ejemplo:
> `CONTRATO – KALIZA 1 / KALIZA 2 – Ekoomedia SAS – Desarrollo de 10 imágenes 3D exteriores e interiores para proyecto OLIV`

---

### SECCIÓN 5: Aprobación del Director de Proyecto

- **Campo:** Aprobador asignado (auto-asignado según frente seleccionado, configurable en el módulo de configuración)
- **Estado visible:** Pendiente de aprobación / Aprobado / Devuelto
- **Fecha de aprobación:** Se registra automáticamente al aprobar
- **Nombre del director:** Visible después de la aprobación

> **Nota de negocio:** La fecha de aprobación del Director es la **fecha de inicio** para el proceso de seguimiento del Coordinador de Costos y/o Director.

---

### SECCIÓN 6: Trámite en Contratación

> Visible y editable **solo para usuarios con rol `CONTRATOS`**.

#### Opción A: "Se Debe Revisar"
- Selección: Radio button o dropdown `SE_DEBE_REVISAR`
- **Campo requerido:** Nota/Observación (textarea obligatorio)
- **Acción:** Se notifica al solicitante con la nota. Estado → `EN_REVISION`

#### Opción B: "OK — Documentación Completa"
- Selección: Radio button o dropdown `OK`
- Contratos inicia el proceso. Aparece dropdown de estado:
  - `1. CREACIÓN DE MINUTA`
  - `2. ENVÍO DE CONTRATO Y PÓLIZAS`
- Al completar estado `2`, el trámite en contratos se cierra y pasa a Controles. Estado → `EN_CONTROLES`

---

### SECCIÓN 7: Controles

> Visible y editable **solo para usuarios con rol `CONTROLES`**.

| Campo | Tipo | Descripción |
|---|---|---|
| Número de Contrato en Adpro | Text input | Número asignado en el sistema Adpro por el Coordinador de Controles |

---

### SECCIÓN 8: Aprobación Final

> Visible y accionable **solo para usuarios con rol `DIRECTOR_CONTROLES`**.

- Botón: "Aprobar Solicitud"
- Al aprobar: Estado → `COMPLETADA`, se registra fecha y nombre del Director de Controles.

---

## Constructor de Cronograma (Spec Detallado)

### Comportamiento

1. **¿El contrato tiene fases?** Toggle sí/no.
   - Si **No**: Se ingresan actividades directamente con fecha inicio y fin.
   - Si **Sí**: Se ingresan fases (Fase 01, Fase 02, etc.) y dentro de cada fase se ingresan actividades.

2. **Fecha de inicio:** Campo `date picker`.
   - **Validación crítica:** La fecha de inicio **no puede ser en los próximos 13 días hábiles** (excluye domingos y festivos de Colombia).
   - Mostrar mensaje de error: "La fecha de inicio debe ser mínimo el [fecha calculada], considerando 13 días hábiles desde hoy."
   - La app debe tener una lista de festivos colombianos actualizados para el cálculo.

3. **Tabla de actividades/fases:** Editable inline con botones de agregar/eliminar fila.

4. **Exportar:** Botón "Descargar Cronograma (Excel)" que genera el archivo con columnas: Fase, Actividad, Fecha Inicio, Fecha Fin, Responsable, Duración (días hábiles).

### Festivos Colombia (incluir en seed/configuración)
Usar librería `date-holidays` (npm) configurada para Colombia (`CO`) para calcular festivos dinámicamente.

---

## Generación Automática del Consecutivo

```
Formato: SOL-{TIPO_ABREV}-{AÑO}-{NUMERO_SECUENCIAL_3_DIGITOS}

Ejemplos:
  SOL-CONT-2024-001   → Solicitud de Contrato
  SOL-ODS-2024-001    → Orden de Servicio
  SOL-OST-2024-001    → Otrosí por Tiempo
  SOL-TCC-2024-001    → Trámite de Cuentas Recurrentes
```

El consecutivo se genera al momento de crear la solicitud (no al guardar borrador).

---

## Notificaciones

| Evento | Notificados | Canal |
|---|---|---|
| Nueva solicitud enviada | Director del Frente | Email + in-app |
| Solicitud aprobada por Director | Coordinador Contratos + Solicitante | Email + in-app |
| Solicitud devuelta con nota | Solicitante | Email + in-app |
| Solicitud en revisión (contratos) | Solicitante | Email + in-app |
| Trámite OK en contratos | Coordinador Controles | Email + in-app |
| Número Adpro registrado | Director Controles | Email + in-app |
| Aprobación final | Solicitante + todos los involucrados | Email + in-app |

---

## Módulo de Configuración

### Configuración de Aprobadores por Frente

Permite al administrador definir qué Director de Proyecto aprueba cada frente:

```json
{
  "configuracion_aprobadores": [
    { "frente": "KALIZA 1", "aprobador_id": 2 },
    { "frente": "KALIZA 2", "aprobador_id": 2 },
    { "frente": "KALIZA 3", "aprobador_id": 2 },
    { "frente": "KALIZA 4", "aprobador_id": 2 },
    { "frente": "KALA 1",   "aprobador_id": 3 },
    { "frente": "KALA 2",   "aprobador_id": 3 },
    { "frente": "KALA 3",   "aprobador_id": 3 },
    { "frente": "KALA 4",   "aprobador_id": 3 }
  ]
}
```

Esto es configurable desde la interfaz de administración.

---

## Vistas / Páginas de la App

```
/                         → Dashboard de solicitudes (filtrable por estado/tipo/frente)
/solicitudes/nueva        → Selector de tipo de solicitud
/solicitudes/nueva/contrato → Formulario completo de solicitud de contrato
/solicitudes/:id          → Detalle y seguimiento de una solicitud
/terceros                 → Listado de terceros
/terceros/nuevo           → Registro de nuevo tercero
/terceros/:id             → Detalle + checklist de debida diligencia
/configuracion            → Configuración de aprobadores y proyectos
/configuracion/usuarios   → Gestión de usuarios y roles
```

---

## Dashboard Principal

Mostrar tarjetas con contadores por estado:

- Total solicitudes activas
- Pendientes de mi aprobación (según rol del usuario)
- En revisión / devueltas
- Completadas este mes

Tabla de solicitudes con filtros por:
- Tipo de solicitud
- Frente de trabajo
- Estado
- Solicitante
- Rango de fechas

---

## Consideraciones Técnicas Adicionales

1. **Fechas y zona horaria:** Usar siempre `America/Bogota` (UTC-5).
2. **Cálculo de días hábiles Colombia:** Usar `date-holidays` con código `CO` para festivos.
3. **Generación de Word:** Usar `docx` (npm) para generar el Formato de Solicitud de Contrato descargable.
4. **Valores en letras:** Usar librería `numero-a-letras` o similar para COP.
5. **Upload de archivos:** Tamaño máximo 10MB por archivo. Validar tipo MIME en el backend.
6. **Historial de cambios:** Registrar en `HistorialSolicitud` cada cambio de estado con el usuario que lo realizó.
7. **Responsividad:** La app debe funcionar correctamente en tablets (se usará en campo de obra).

---

## Orden de Implementación Sugerido

1. **Sprint 1:** Configuración del proyecto, modelos de base de datos, autenticación y seeds.
2. **Sprint 2:** Módulo de Terceros + Debida Diligencia.
3. **Sprint 3:** Formulario de Solicitud de Contrato (campos básicos sin cronograma).
4. **Sprint 4:** Constructor de Cronograma + validación de días hábiles.
5. **Sprint 5:** Flujo de aprobación completo (Director → Contratos → Controles → Aprobación final).
6. **Sprint 6:** Generación de documentos Word, notificaciones, dashboard y refinamiento UI.
7. **Sprint 7:** Otros tipos de solicitud (ODS, Otrosíes, Trámites).
