import { test, expect } from '@playwright/test';

test.describe('Flujo completo de Mesones', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/quotations/new');
    await page.waitForLoadState('networkidle');
  });

  test('Paso 2 Config: seleccionar "Sí, incluye mesón"', async ({ page }) => {
    // Avanzar al paso 2
    await page.click('text=Siguiente');
    await page.waitForSelector('.config-question');

    // Navegar a Q4 (Mesones) - hay 5 preguntas, ir a la 4
    for (let i = 0; i < 3; i++) {
      await page.click('text=Siguiente →');
    }

    // Seleccionar "Sí, incluye mesón"
    await page.click('input[value="includes_meson"]');
    await expect(page.locator('input[value="includes_meson"]')).toBeChecked();
  });

  test('Paso 3: agregar MESONES en COCINA y marcar como mesón', async ({ page }) => {
    // Ir al paso 2 config primero
    await page.click('text=Siguiente');

    // Configurar rápidamente todo el wizard
    // Q1: unit_sqm
    await page.click('input[value="unit_sqm"]');
    await page.click('text=Siguiente →');
    // Q2: design files = none
    await page.click('text=Declinar opción');
    await page.click('text=Siguiente →');
    // Q3: single area
    await page.click('text=No, es un solo espacio');
    await page.click('text=Siguiente →');
    // Q4: includes meson
    await page.click('input[value="includes_meson"]');
    await page.click('text=Siguiente →');
    // Q5: industrial pricing
    await page.click('input[value="industrial"]');

    // Ir al paso 3
    await page.click('text=Siguiente');

    // Seleccionar área COCINA
    await page.selectOption('select:below(:text("Nombre del Área"))', 'COCINA');

    // Agregar mueble MESONES
    await page.selectOption('select:below(:text("Nombre del Mueble"))', 'MESONES');

    // Marcar checkbox "Cotizar como Mesón"
    await page.check('text=Cotizar como Mesón');

    // Verificar que el checkbox está marcado
    const checkbox = page.locator('input[type="checkbox"]').filter({ hasText: '' }).first();
    await expect(checkbox).toBeChecked();
  });

  test('Paso 4: calculadora de mesones con profundidad 0.90 y tipo Piedra', async ({ page }) => {
    // Configurar wizard completo y llegar a paso 4
    await page.click('text=Siguiente');
    await page.click('input[value="unit_sqm"]');
    await page.click('text=Siguiente →');
    await page.click('text=Declinar opción');
    await page.click('text=Siguiente →');
    await page.click('text=No, es un solo espacio');
    await page.click('text=Siguiente →');
    await page.click('input[value="includes_meson"]');
    await page.click('text=Siguiente →');
    await page.click('input[value="industrial"]');
    await page.click('text=Siguiente');

    // Agregar área y mueble mesón
    await page.selectOption('select:below(:text("Nombre del Área"))', 'COCINA');
    await page.selectOption('select:below(:text("Nombre del Mueble"))', 'MESONES');
    await page.check('text=Cotizar como Mesón');
    await page.fill('input[placeholder="Ej. Opcional"]', '2.5');
    await page.fill('input[type="number"]:below(:text("Metraje"))', '2.5');

    // Ir a paso 4
    await page.click('text=Siguiente');

    // Verificar que la calculadora de mesones se muestra
    await expect(page.locator('text=Calculadora de Mesones')).toBeVisible();

    // Seleccionar profundidad 0.90
    await page.click('button:has-text("0.90")');

    // Verificar que el botón 0.90 está activo y el depth se actualizó
    const depthInput = page.locator('input[type="number"]:below(:text("0.90"))').first();
    await expect(depthInput).toHaveValue(/0.9/);

    // Seleccionar tipo Piedra
    await page.click('button:has-text("Piedra")');

    // Verificar valores calculados visibles
    await expect(page.locator('text=VR. SIN IVA')).toBeVisible();
    await expect(page.locator('text=VR CON TRANSP')).toBeVisible();
    await expect(page.locator('text=SUBTOTAL')).toBeVisible();
    await expect(page.locator('text=VR FINAL CON IVA')).toBeVisible();
  });

  test('Paso 4: modo COMPAC con precio desde placa', async ({ page }) => {
    // Ir a paso 4 con un mesón configurado
    await page.click('text=Siguiente');
    await page.click('input[value="unit_sqm"]');
    await page.click('text=Siguiente →');
    await page.click('text=Declinar opción');
    await page.click('text=Siguiente →');
    await page.click('text=No, es un solo espacio');
    await page.click('text=Siguiente →');
    await page.click('input[value="includes_meson"]');
    await page.click('text=Siguiente →');
    await page.click('input[value="industrial"]');
    await page.click('text=Siguiente');

    await page.selectOption('select:below(:text("Nombre del Área"))', 'COCINA');
    await page.selectOption('select:below(:text("Nombre del Mueble"))', 'MESONES');
    await page.check('text=Cotizar como Mesón');
    await page.fill('input[placeholder="Ej. Opcional"]', '2.5');
    await page.fill('input[type="number"]:below(:text("Metraje"))', '2.5');
    await page.click('text=Siguiente');

    // Activar modo COMPAC
    await page.check('text=Modo placa COMPAC');

    // Verificar que aparecen los campos de placa
    await expect(page.locator('text=Precio por placa')).toBeVisible();
    await expect(page.locator('text=Área de la placa')).toBeVisible();

    // Ingresar valores de placa
    await page.fill('input[placeholder="$ 0"]', '3374800');
    await page.fill('input[placeholder="Ej: 5.60"]', '5.60');

    // Calcular
    await page.click('button:has-text("Calcular")');

    // Verificar que el botón Compac está activo (auto-seleccionado)
    await expect(page.locator('button:has-text("Compac")')).toHaveClass(/btn-primary/);
  });

  test('Paso 5: generar PDF con mesones incluidos', async ({ page }) => {
    // Navegación rápida completa hasta paso 5
    await page.click('text=Siguiente');
    await page.click('input[value="unit_sqm"]');
    await page.click('text=Siguiente →');
    await page.click('text=Declinar opción');
    await page.click('text=Siguiente →');
    await page.click('text=No, es un solo espacio');
    await page.click('text=Siguiente →');
    await page.click('input[value="includes_meson"]');
    await page.click('text=Siguiente →');
    await page.click('input[value="industrial"]');
    await page.click('text=Siguiente');
    await page.selectOption('select:below(:text("Nombre del Área"))', 'COCINA');
    await page.selectOption('select:below(:text("Nombre del Mueble"))', 'MESONES');
    await page.check('text=Cotizar como Mesón');
    await page.fill('input[placeholder="Ej. Opcional"]', '2.5');
    await page.fill('input[type="number"]:below(:text("Metraje"))', '2.5');
    await page.click('text=Siguiente');
    await page.click('text=Siguiente');

    // Verificar que estamos en resumen (paso 5)
    await expect(page.locator('text=Resumen de Cotización')).toBeVisible();
    await expect(page.locator('text=Gran Total')).toBeVisible();
  });
});
