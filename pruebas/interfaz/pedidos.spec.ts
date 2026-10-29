import { test as prueba, expect as esperar } from '@playwright/test';
import mongoose from 'mongoose';

const numeroPrueba = `E2E-${Date.now()}`;

// Se elimina únicamente el registro creado por esta ejecución, en la base exclusiva E2E.
prueba.afterAll(async () => {
  await mongoose.connect('mongodb://127.0.0.1:27019/seguimiento_e2e');
  await mongoose.connection.collection('pedidos').deleteOne({ numero: numeroPrueba });
  await mongoose.disconnect();
});

prueba(
  'crear, rechazar, completar y consultar un pedido real desde el navegador',
  async ({ page: pagina }) => {
    await pagina.goto('/');
    await esperar(
      pagina.getByRole('heading', { name: 'Tus pedidos, en movimiento.' }),
    ).toBeVisible();
    // El CSS de producción debe cargar sin scripts inline bloqueados por la CSP.
    await esperar(pagina.getByRole('button', { name: 'Nuevo pedido' })).toHaveCSS(
      'background-color',
      'rgb(158, 37, 45)',
    );
    await pagina.getByRole('button', { name: 'Nuevo pedido' }).click();
    await pagina.getByLabel('Número de pedido').fill(numeroPrueba);
    await pagina.getByRole('dialog').locator('#cliente').fill('Cliente de prueba de interfaz');
    await pagina.getByLabel('Cantidad de unidades').fill('250');
    await esperar(
      pagina.getByText('3 paquete(s): 2 × 100 unidades + 1 × 50 unidades'),
    ).toBeVisible();
    await pagina.getByRole('button', { name: 'Crear pedido', exact: true }).click();
    await esperar(pagina).toHaveURL(/\/pedidos\/[a-f0-9]{24}$/);
    await esperar(pagina.locator('.tarjeta-paquete')).toHaveCount(3);
    const paquete = pagina.locator('.tarjeta-paquete').nth(2);
    await paquete.getByRole('button', { name: 'Iniciar', exact: true }).click();
    await esperar(paquete.getByRole('button', { name: 'Enviar a revisión' })).toBeEnabled();
    await paquete.getByRole('button', { name: 'Enviar a revisión' }).click();
    await esperar(paquete.getByRole('button', { name: 'Rechazar', exact: true })).toBeEnabled();
    await paquete.getByRole('button', { name: 'Rechazar', exact: true }).click();
    await pagina.getByLabel('Motivo de rechazo').fill('Ajustar acabado');
    await pagina.getByRole('button', { name: 'Confirmar rechazo' }).click();
    await esperar(paquete.getByRole('button', { name: 'Enviar a revisión' })).toBeEnabled();
    await paquete.getByRole('button', { name: 'Enviar a revisión' }).click();
    await esperar(paquete.getByRole('button', { name: 'Marcar listo' })).toBeEnabled();
    await paquete.getByRole('button', { name: 'Marcar listo' }).click();
    await esperar(paquete.getByText('Paquete completado')).toBeVisible();
    await esperar(pagina.locator('.avance-detalle strong')).toContainText('20 %');
    await paquete.locator('summary').click();
    await esperar(paquete.getByText('Ajustar acabado')).toBeVisible();
    await pagina.reload();
    await esperar(pagina.locator('.avance-detalle strong')).toContainText('20 %');
    await pagina.getByRole('link', { name: 'Volver a pedidos' }).click();
    await pagina.getByLabel('Buscar pedido', { exact: true }).fill(numeroPrueba);
    await pagina.getByRole('button', { name: 'Buscar', exact: true }).click();
    await esperar(pagina.locator('tbody tr')).toHaveCount(1);
    await esperar(pagina.locator('tbody tr')).toContainText('20 %');
    const descargaPendiente = pagina.waitForEvent('download');
    await pagina.getByRole('button', { name: 'Exportar página CSV' }).click();
    await esperar((await descargaPendiente).suggestedFilename()).toBe('pedidos.csv');
    // Se verifica el mismo contenido en anchos de escritorio y teléfono.
    for (const ancho of [1440, 390, 320]) {
      await pagina.setViewportSize({ width: ancho, height: 900 });
      esperar(
        await pagina.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      ).toBeTruthy();
    }
    await pagina.getByRole('button', { name: 'Nuevo pedido' }).click();
    await pagina.getByLabel('Número de pedido').fill(numeroPrueba.toLowerCase());
    await pagina.getByRole('dialog').locator('#cliente').fill('Otro cliente');
    await pagina.getByLabel('Cantidad de unidades').fill('1');
    await pagina.getByRole('button', { name: 'Crear pedido', exact: true }).click();
    await esperar(pagina.getByRole('alert')).toContainText('Ya existe un pedido con ese número.');
    await pagina.getByRole('button', { name: 'Cerrar formulario' }).click();
    await pagina.getByRole('link', { name: 'Estadísticas', exact: true }).click();
    await esperar(
      pagina.getByRole('heading', { name: 'La operación, en perspectiva.' }),
    ).toBeVisible();
    await esperar(
      pagina.getByRole('img', { name: 'Unidades recibidas y terminadas por día' }),
    ).toBeVisible();
    await pagina.getByRole('button', { name: 'Últimos 7 días', exact: true }).click();
    await esperar(pagina.locator('.cargando')).toHaveCount(0);
    await pagina.getByText('Consultar datos diarios del gráfico').click();
    await esperar(pagina.locator('tbody tr')).toHaveCount(7);
    for (const ancho of [1440, 390, 320]) {
      await pagina.setViewportSize({ width: ancho, height: 900 });
      esperar(
        await pagina.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      ).toBeTruthy();
    }
    await pagina.getByRole('link', { name: 'Alertas', exact: true }).click();
    await esperar(
      pagina.getByRole('heading', { name: 'Atención donde hace falta.' }),
    ).toBeVisible();
    await pagina.getByRole('button', { name: 'Generar resumen', exact: true }).click();
    await esperar(pagina.locator('.origen-analisis')).toContainText('Reglas de seguimiento');
    await esperar(pagina.locator('.aviso-proveedor')).toContainText('no está activada');
    for (const ancho of [1440, 390, 320]) {
      await pagina.setViewportSize({ width: ancho, height: 900 });
      esperar(
        await pagina.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      ).toBeTruthy();
    }
  },
);
