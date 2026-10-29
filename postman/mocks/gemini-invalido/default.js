// Variante local para comprobar el rechazo de referencias inventadas.
process.env.RESPUESTA_INVALIDA = '1';
require('../gemini/default.js');
