import { readFile, writeFile, mkdir } from 'node:fs/promises';

/** El README conserva la fuente única; esta edición añade estilos sin depender de Internet. */
const raiz = new URL('../', import.meta.url);
const fuente = await readFile(new URL('README.md', raiz), 'utf8');
const repositorio = 'https://github.com/RSGarcia2002/seguimiento-pedidos/blob/main/';
const contenido = fuente.replace(/\b(src|href)="([^"]+)"/g, (atributo, nombre, destino) => {
  if (/^(?:[a-z]+:|#|\/\/)/i.test(destino)) return atributo;
  if (nombre === 'src' && destino.startsWith('docs/')) return `src="../${destino.slice(5)}"`;
  if (destino === 'docs/manual/index.html') return 'href="./index.html"';
  return `${nombre}="${repositorio}${destino}"`;
});
const indice = contenido.match(/<h2 id="contenido">[\s\S]*?(<ol>[\s\S]*?<\/ol>)/)?.[1] ?? '';
const documento = `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="Manual técnico y de usuario del sistema TATA: operación, arquitectura, tecnologías, metodología SDD, instalación, API y pruebas.">
  <title>Manual técnico y de usuario · TATA</title>
  <link rel="stylesheet" href="estilos.css">
</head>
<body>
  <a class="saltar" href="#documento">Saltar al manual</a>
  <aside class="lateral" aria-label="Índice del manual">
    <a class="marca-manual" href="#documento">TATA<span>.</span></a>
    <p class="edicion">DOCUMENTACIÓN DEL SISTEMA<br>MANUAL · EDICIÓN 1.0</p>
    <nav aria-label="Secciones">${indice}</nav>
    <p class="pie-lateral">Randall García<br>29 de octubre de 2026</p>
  </aside>
  <div class="pagina">
    <header class="barra-manual"><span>Seguimiento de pedidos <span class="separador">/</span> Documentación</span><button type="button" id="imprimir">Imprimir / Guardar PDF</button></header>
    <main id="documento" tabindex="-1">${contenido}</main>
  </div>
  <script>document.getElementById('imprimir').addEventListener('click', function () { window.print(); });</script>
</body>
</html>
`;
await mkdir(new URL('docs/manual/', raiz), { recursive: true });
await writeFile(new URL('docs/manual/index.html', raiz), documento);
console.log('Manual HTML generado desde README.md: docs/manual/index.html');
