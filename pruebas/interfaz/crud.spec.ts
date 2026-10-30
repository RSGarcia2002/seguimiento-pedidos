import { test as prueba, expect as esperar } from '@playwright/test';
import mongoose from 'mongoose';

prueba(
  'CRUD completo: editar cantidad, conservar producción y eliminar con confirmación',
  async ({ page: pagina }) => {
    const numero = `CRUD-UI-${Date.now()}`;
    await pagina.addInitScript(() => localStorage.setItem('tata-recorrido-v1', 'vista'));
    let id: string | undefined;
    try {
      await pagina.goto('/');
      await pagina.getByRole('button', { name: 'Nuevo pedido' }).click();
      let formulario = pagina.getByRole('dialog', { name: 'Crear pedido' });
      await formulario.locator('#numero').fill(numero);
      await formulario.locator('#cliente').fill('Cliente CRUD');
      await formulario.locator('#cantidad').fill('250');
      await formulario.getByRole('button', { name: 'Crear pedido', exact: true }).click();
      await esperar(pagina).toHaveURL(/\/pedidos\/[a-f0-9]{24}$/);
      id = pagina.url().split('/').at(-1);
      await pagina.getByRole('button', { name: 'Editar pedido', exact: true }).click();
      formulario = pagina.getByRole('dialog', { name: 'Editar pedido' });
      await formulario.locator('#cliente').fill('Cliente corregido');
      await formulario.locator('#cantidad').fill('350');
      await formulario.getByRole('button', { name: 'Guardar cambios' }).click();
      await esperar(formulario).not.toBeVisible();
      await esperar(pagina.locator('.tarjeta-paquete')).toHaveCount(4);
      await esperar(pagina.locator('.descripcion').first()).toContainText('Cliente corregido');
      await pagina
        .locator('.tarjeta-paquete')
        .first()
        .getByRole('button', { name: 'Iniciar', exact: true })
        .click();
      await esperar(
        pagina
          .locator('.tarjeta-paquete')
          .first()
          .getByRole('button', { name: 'Enviar a revisión' }),
      ).toBeEnabled();
      await pagina.getByRole('button', { name: 'Editar pedido', exact: true }).click();
      await esperar(formulario.locator('#cantidad')).toHaveAttribute('readonly', '');
      await formulario.locator('#numero').fill(numero + '-E');
      await formulario.getByRole('button', { name: 'Guardar cambios' }).click();
      await esperar(formulario).not.toBeVisible();
      await esperar(pagina.locator('#titulo-detalle')).toContainText(numero + '-E');
      await pagina.reload();
      await esperar(
        pagina
          .locator('.tarjeta-paquete')
          .first()
          .getByRole('button', { name: 'Enviar a revisión' }),
      ).toBeVisible();
      await pagina.getByRole('button', { name: 'Eliminar pedido', exact: true }).click();
      const eliminacion = pagina.getByRole('dialog', { name: 'Eliminar pedido', exact: true });
      await esperar(
        eliminacion.getByRole('button', { name: 'Eliminar definitivamente' }),
      ).toBeDisabled();
      await eliminacion.getByRole('button', { name: 'Cancelar', exact: true }).click();
      await esperar(pagina.locator('#titulo-detalle')).toContainText(numero + '-E');
      await pagina.getByRole('button', { name: 'Eliminar pedido', exact: true }).click();
      await eliminacion.locator('#confirmacion-eliminar').fill('incorrecto');
      await esperar(
        eliminacion.getByRole('button', { name: 'Eliminar definitivamente' }),
      ).toBeDisabled();
      await eliminacion.locator('#confirmacion-eliminar').fill(numero + '-E');
      for (const width of [390, 320]) {
        await pagina.setViewportSize({ width, height: 844 });
        esperar(
          await pagina.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
        ).toBeTruthy();
        await esperar(
          eliminacion.getByRole('button', { name: 'Eliminar definitivamente' }),
        ).toBeInViewport();
      }
      await eliminacion.getByRole('button', { name: 'Eliminar definitivamente' }).click();
      await esperar(pagina).toHaveURL('http://127.0.0.1:3100/');
      await esperar(pagina.getByRole('status')).toContainText('eliminado');
      const respuesta = await pagina.request.get(`/api/pedidos/${id}`);
      esperar(respuesta.status()).toBe(404);
    } finally {
      if (id) {
        await mongoose.connect('mongodb://127.0.0.1:27019/seguimiento_e2e');
        await mongoose.connection
          .collection('pedidos')
          .deleteOne({ _id: new mongoose.Types.ObjectId(id) });
        await mongoose.disconnect();
      }
    }
  },
);
