import { bootstrapApplication } from '@angular/platform-browser';
import { configuracionAplicacion } from './app/aplicacion.config';
import { Aplicacion } from './app/aplicacion';

// Punto de entrada: inicia el componente raíz con los servicios compartidos.
bootstrapApplication(Aplicacion, configuracionAplicacion)
  .catch((error: unknown) => console.error('No se pudo iniciar la aplicación.', error));
