import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { rutas } from './aplicacion.routes';

/** Servicios globales: captura de errores del navegador y navegación Angular. */
export const configuracionAplicacion: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(rutas),
    provideHttpClient(),
  ],
};
