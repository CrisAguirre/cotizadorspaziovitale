# Análisis: Precios proveedores (ZIP 2026)

Origen: `Precios proveedores.zip` — listas provisionales para auditar y armar el presupuesto interno.

---

## Cómo se llama en la cotización

| Capa | Nombre en la app | Uso |
|------|------------------|-----|
| **Administración** | **Lista de precios** (`/price-list`) | Catálogo maestro de materiales e insumos |
| **Base de datos** | Colección **`Material`** | Un registro = un SKU de proveedor |
| **Presupuesto interno (wizard paso 3)** | Líneas de **insumo / canto / herraje / accesorio** | Al elegir un material se llenan código, descripción, proveedor y **precio unitario sin IVA** |
| **Documento al cliente (PDF)** | No se muestran listas de proveedor | Solo descripción del mueble, medidas y **accesorios visibles** acordados |

En resumen: los archivos del ZIP alimentan la **Lista de precios de proveedores**; en la cotización cada rubro del presupuesto **consulta** ese catálogo (auditoría de precios), pero el cliente no ve “Hejercol” o “Lamitech” salvo que ustedes lo pongan en la descripción.

---

## Contenido del ZIP (5 proveedores, 11 archivos)

### 1. HEJERCOL — `PORTAFOLIO HEJERCOL 2026 PRECIOS GRAN FABRICANTE.xlsx`

| Campo Excel | Columna | → Campo `Material` |
|-------------|---------|-------------------|
| Código SKU | A | `code` |
| Marca | B | (parte de `description` o campo futuro `brand`) |
| Descripción | C | `description` |
| Empaque | D | `unit` (UNIDAD, JUEGO, etc.) |
| Precio fabricante sin IVA | E | `unitPrice` |

- **~366 productos** con precio, **~73 familias** (bisagras, cajones Innotech, guías Quadro, elevables, etc.).
- Marca principal: **HETTICH** (distribuido por Hejercol).
- **Categoría app:** `herraje` (y algunos `accesorio` / organización interior).

### 2. IBERWEY / Iberway

| Archivo | Formato | Contenido | Categoría app |
|---------|---------|-----------|---------------|
| LISTA COCINA Y ARMARIO IBERWAY | Excel | Módulos closet/cocina: código, producto, medidas, **precio sin IVA** (~69 ítems) | `herraje` / `accesorio` |
| LISTA FERRAMENTA ITALIANA | Excel | Herrajes (push, cierres): PRODUCTO, REFERENCIA, DESCRIPCIÓN, **PV antes IVA** | `herraje` |
| LISTA VOLPATO | Excel | Zócalos PVC y perfilería: **PV antes IVA** | `accesorio` / `canto` |
| Tolvas, basureras, cubeteros | PDF | Accesorios cocina Iberway | `accesorio` (importación manual / futura) |

Columnas Iberway cocina: `CODIGO`, `PRODUCTO`, `MODULO (MM)`, `MEDIDAS`, `PRECIO SIN IVA`.

### 3. GM HERRAJES — `LISTA DE PRECIOS DISTRIBUIDOR GM HERRJES - 2026 F - REV.pdf`

- Catálogo **herrajes** en PDF.
- **Categoría app:** `herraje`.
- Requiere carga manual o importador PDF (fase posterior).

### 4. TOIN — `lista de precios TOIN Fabricante 2026 version 5 - REV.pdf`

- Fabricante de **tableros / melaminas** (según nombre “Fabricante”).
- **Categoría app:** `melamina`.
- PDF → importación en fase 2.

### 5. LAMITECH — 4 listas PDF (abril 2026)

| Archivo | Probable uso en cocina | Categoría app |
|---------|------------------------|---------------|
| Canal Industrial | Melaminas / tableros aglomerado | `melamina` |
| CompactSlab | Superficies compactas / mesones | `meson` |
| Duraopak | Línea Durapak | `melamina` / `otro` |
| Extrusión | **Cantos** y perfiles | `canto` |

---

## Mapeo a las 7 secciones del presupuesto

| Sección cotización | Origen en ZIP |
|--------------------|---------------|
| 1. Insumos (melaminas, fórmicas) | **TOIN**, **LAMITECH** (Industrial, Duraopak) + hoja melaminas del Excel interno de producción |
| 2. Cantos | **LAMITECH Extrusión** |
| 3. Herrajes y accesorios | **HEJERCOL**, **GM HERRAJES**, **Ferramenta Italiana**, partes **Iberway** |
| 4. Diseño | No viene del ZIP (horas × tarifa en `Config`) |
| 5. Cortes | No es lista de precios (M.O. × tiempos) |
| 6–7. Armado / instalación | No es lista de precios (M.O.) |
| Mesones (sub-área cliente) | **LAMITECH CompactSlab** |
| Accesorios visibles en PDF | **Iberway** tolvas/cubeteros, ítems acordados con cliente |

---

## Campos recomendados en `Material` (ampliación futura)

```typescript
{
  category: 'melamina' | 'canto' | 'herraje' | 'accesorio' | 'meson' | 'vidrio' | 'otro',
  code: string,              // SKU proveedor
  description: string,
  provider: string,          // HEJERCOL, LAMITECH, TOIN, IBERWAY, GM HERRAJES, VOLPATO...
  brand: string,             // HETTICH, DTC, etc.
  unit: string,
  unitPrice: number,         // Siempre SIN IVA (como columnas "PV antes IVA")
  priceListYear: 2026,
  sourceFile: string,        // trazabilidad del Excel/PDF
  active: true
}
```

---

## Plan de carga sugerido

| Prioridad | Proveedor | Motivo |
|-----------|-----------|--------|
| 1 | **HEJERCOL** (Excel) | Estructura clara, mayor volumen de herrajes |
| 2 | **Ferramenta Italiana** + **Volpato** (Excel) | Misma estructura PRODUCTO / DESCRIPCIÓN / PV |
| 3 | **Iberway cocina** (Excel) | Módulos con precio cerrado |
| 4 | **LAMITECH** + **TOIN** + **GM** (PDF) | Requiere parser PDF o captura manual en Lista de precios |

### Importación en la app (implementado)

1. Ir a **Lista de precios** (`/price-list`).
2. Elegir formato o dejar que se **detecte por nombre** del archivo.
3. Subir el `.xlsx` → vista previa de ítems.
4. **Confirmar importación** → guarda en MongoDB (`POST /api/materials/bulk-upsert`).
5. En el **wizard paso 3**, columna **Buscar lista** rellena descripción y precio automáticamente.

Formatos Excel soportados hoy: **Hejercol**, **Ferramenta Italiana**, **Volpato**, **Iberway cocina**. Los PDF (Lamitech, Toin, GM) quedan para una fase posterior.

Requiere usuario **admin** para importar.

---

## Nota sobre melaminas del presupuesto interno

Las melaminas que hoy se consultan en **“TIEMPOS M.O PRODUCCIÓN – HOJA MELAMINAS”** del Excel de presupuesto **no están** en este ZIP como Excel editable; aquí entran sobre todo **herrajes** y listas **PDF** de tableros. Conviene mantener ambas fuentes:

1. **ZIP proveedores** → catálogo comercial 2026 (auditoría).
2. **Excel de producción** → precios operativos / m² por lámina usados históricamente.

Ambos convergen en la misma **Lista de precios** (`Material`) con distinto `provider` y `sourceFile`.
