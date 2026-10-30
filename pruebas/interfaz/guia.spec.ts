import { test as prueba, expect as esperar } from '@playwright/test';
import mongoose from 'mongoose';

/** La guía se prueba con un registro aislado; sus propios pasos no escriben en la API. */
prueba(
  'bienvenida, recorrido completo y repetición accesible sin cambios de datos',
  async ({ page: pagina, request: solicitudes }) => {
    const numero = `GUIA-${Date.now()}`;
    const creacion = await solicitudes.post('/api/pedidos', {
      data: { numero, cliente: 'Cliente del recorrido de prueba', cantidad: 150 },
    });
    esperar(creacion.ok()).toBeTruthy();
    const pedido = await creacion.json();
    try {
      await pagina.goto('/');
      const dialogo = pagina.getByRole('dialog', { name: 'Te mostramos cómo funciona.' });
      await esperar(dialogo).toBeVisible();
      await dialogo.getByRole('button', { name: 'Ahora no' }).click();
      await pagina.reload();
      await esperar(
        pagina.getByRole('heading', { name: 'Tus pedidos, en movimiento.' }),
      ).toBeVisible();
      await pagina.waitForTimeout(500); // Permite comprobar la ausencia de la bienvenida diferida.
      await esperar(pagina.getByRole('dialog')).toHaveCount(0);
      await pagina.getByRole('button', { name: 'Guía paso a paso' }).click();
      const escrituras: string[] = [];
      pagina.on('request', (solicitud) => {
        if (solicitud.url().includes('/api/') && solicitud.method() !== 'GET')
          escrituras.push(solicitud.method() + ' ' + solicitud.url());
      });
      await pagina.getByRole('button', { name: 'Comenzar recorrido' }).click();
      const guia = pagina.locator('app-recorrido-guiado dialog');
      for (let paso = 1; paso <= 12; paso++) {
        await esperar(guia.locator('.contador')).toHaveText(`Paso ${paso} de 12`);
        await esperar(guia.locator('.espera')).toHaveCount(0);
        await esperar(guia.locator('.destacado')).toBeVisible();
        await esperar(guia.locator('.nota-guia')).toHaveCount(0);
        if (paso === 6) {
          for (const ancho of [390, 320]) {
            await pagina.setViewportSize({ width: ancho, height: 844 });
            esperar(
              await pagina.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
            ).toBeTruthy();
            const caja = await guia.locator('.tarjeta-guia').boundingBox();
            esperar(caja!.x).toBeGreaterThanOrEqual(0);
            esperar(caja!.x + caja!.width).toBeLessThanOrEqual(ancho);
            await esperar(guia.getByRole('button', { name: 'Siguiente' })).toBeInViewport();
          }
        }
        if (paso === 3) {
          await guia.getByRole('button', { name: 'Anterior' }).click();
          await esperar(guia.locator('.contador')).toHaveText('Paso 2 de 12');
          await esperar(guia.locator('.espera')).toHaveCount(0);
          await guia.getByRole('button', { name: 'Siguiente' }).click();
          await esperar(guia.locator('.contador')).toHaveText('Paso 3 de 12');
        }
        if (paso < 12) await guia.getByRole('button', { name: 'Siguiente' }).click();
      }
      await guia.getByRole('button', { name: 'Finalizar' }).click();
      await esperar(guia).not.toBeVisible();
      esperar(escrituras).toEqual([]);
      const despues = await (await solicitudes.get(`/api/pedidos/${pedido.id}`)).json();
      esperar(despues).toEqual(pedido);
      await pagina.getByRole('button', { name: 'Guía paso a paso' }).click();
      await pagina.keyboard.press('Tab');
      esperar(
        await pagina.evaluate(
          () => !!document.activeElement?.closest('app-recorrido-guiado dialog'),
        ),
      ).toBeTruthy();
      await pagina.keyboard.press('Escape');
      await esperar(guia).not.toBeVisible();
      await esperar(pagina.getByRole('button', { name: 'Guía paso a paso' })).toBeFocused();
    } finally {
      await mongoose.connect('mongodb://127.0.0.1:27019/seguimiento_e2e');
      await mongoose.connection.collection('pedidos').deleteOne({ numero });
      await mongoose.disconnect();
    }
  },
);
