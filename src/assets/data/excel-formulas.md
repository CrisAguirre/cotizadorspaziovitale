# Mapeo de fórmulas Excel → Aplicación

Fuente: `2 FORMATO PARA CREAR UNA PRESUPUESTO.xlsx` (hoja EJEMPLO) y `2 FORMATO PARA CREAR UNA COTIZACION).xlsx` (hoja DESPIECE).

## Archivos de referencia

| Archivo | Hojas | Uso |
|---------|-------|-----|
| `2 FORMATO PARA CREAR UNA PRESUPUESTO.xlsx` | EJEMPLO, DESPIECE | Presupuesto interno (7 secciones + AIU) |
| `2 FORMATO PARA CREAR UNA COTIZACION).xlsx` | M O, DESPIECE, COT | Cotización al cliente |
| `TAREA 1 - PAS A PASO PARA CREAR UNA COTIZACION.docx` | — | Flujo operativo paso a paso |

---

## Sección 1 — Insumos (melaminas / tableros)

| Excel | Fórmula | App (`QuotationCalculatorService`) |
|-------|---------|-------------------------------------|
| C | `precioLista / 1.19` | Ingresar `unitPrice` sin IVA (o dividir al importar lista) |
| H | láminas / cantidad derivada | Campo `quantity` |
| I | `C / H` o `H * G` con `G = F * E` | `totalPrice = quantity * unitPrice` |

---

## Sección 2 — Cantos

| Excel | Fórmula | App |
|-------|---------|-----|
| G | `F + E` (ML + desperdicio) | `waste = quantity * factor`, `total = quantity + waste` |
| I | `H * G` | `totalPrice = total * unitPrice` |

Factores por rango (config `wasteTable`): 1–10 → 0.5, 11–30 → 0.35, 31–50 → 0.3, 51–100 → 0.25.

---

## Sección 3 — Accesorios / herrajes

| Excel | Fórmula | App |
|-------|---------|-----|
| I | `H * E` (horas × valor hora) | `totalTime = quantity * timeHours`, `totalPrice = totalTime * laborRate + quantity * unitPrice` |

`H` = valor hora producción (config: `laborRatePerHour`, default **12.495**).

---

## Sección 4 — Diseño

| Excel | Fórmula | App |
|-------|---------|-----|
| I | `E * H` (horas × tarifa diseño) | Si `clientPaidDesign` → 0; si no, `quantity * designRatePerHour` |

`H` = **16.780** (`designRatePerHour`).

---

## Sección 5 — Cortes

| Excel | Fórmula | App |
|-------|---------|-----|
| G | `F * E * C` (M² × tiempo × cantidad) | `workUnits = sqm * timeHours * quantity` |
| I | `H * G` | `totalPrice = workUnits * laborRatePerHour` |

> **Corrección aplicada:** antes faltaba el factor `sqm` (columna C).

---

## Sección 6 — Armado

| Excel | Fórmula | App |
|-------|---------|-----|
| G | `F * E * C` (medida × #armado × personas) | `workUnits = totalQuantity * assemblyHours * persons` |
| I | `H * G` | `totalPrice = workUnits * laborRatePerHour` |

`totalQuantity` = medida en m², ml o uni (columna C del Excel).

---

## Sección 7 — Instalación

| Excel | Fórmula | App |
|-------|---------|-----|
| G | `F * E * C` | `workUnits = totalQuantity * installHours * persons` |
| I | `H * G` | `totalPrice = workUnits * laborRatePerHour` |

Por defecto `persons = 2` en el wizard.

---

## Totales globales (AIU) — filas I84–I96

```
I84 = SUM(I21:I82)              → totalCost
I85 = I84 * 10%                 → imprevistos
I86 = I84 * 35%                 → utilidad
I87 = I84 * 32%                 → indirectos
I88 = SUM(I84:I87)              → subtotal
I89 = I88 * 19%                 → IVA
I90 = I88 + I89                 → total con IVA
I91 = I90 * 10%                 → recargo (celda H91 = 0.1)
I92 = I90 + I91                 → GRAN TOTAL
I94 = M² totales
I96 = I92 / I94                 → precio por M²
```

### Importante: “descuento” en Excel

En el Excel, **I92 suma el 10%** (`I92 = I90 + I91`), no lo resta. Funciona como **recargo adicional** sobre el total con IVA.

El plan de implementación describe restar el descuento; conviene confirmar con negocio cuál es el comportamiento correcto antes de cambiar el Excel o la app.

---

## Validación

Replicar cotización de referencia (ej. No. 2604) y comparar:

1. Suma de las 7 secciones = `totalCost`
2. AIU + IVA + recargo = `grandTotal`
3. `grandTotal / M²` = `pricePerSqm` (M² del mueble, ej. `2.08 × 2.1 = 4.368` en campo `areaSqm`)
