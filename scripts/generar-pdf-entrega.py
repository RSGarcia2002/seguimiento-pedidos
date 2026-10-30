"""Genera las copias portátiles de entrega a partir de la documentación versionada.

Requiere ReportLab y las imágenes PNG de diagramas renderizadas previamente en
 tmp/pdfs/diagramas/. No interviene en la compilación ni en el despliegue de la app.
"""
from pathlib import Path
from html.parser import HTMLParser
from html import escape
import re
import textwrap
from reportlab.pdfgen import canvas
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Image, Table, TableStyle, PageBreak, KeepTogether, Preformatted
from reportlab.platypus.tableofcontents import TableOfContents

RAIZ = Path(__file__).resolve().parents[1]
SALIDA = RAIZ / 'output/pdf'
SALIDA.mkdir(parents=True, exist_ok=True)
FUENTES = Path('/System/Library/Fonts/Supplemental')
# En Linux se admite DejaVu como alternativa para reproducir los documentos.
if FUENTES.exists():
    archivos = ['Arial.ttf', 'Arial Bold.ttf', 'Arial Italic.ttf', 'Arial Bold Italic.ttf', 'Courier New.ttf']
else:
    FUENTES = Path('/usr/share/fonts/truetype/dejavu')
    archivos = ['DejaVuSans.ttf', 'DejaVuSans-Bold.ttf', 'DejaVuSans-Oblique.ttf', 'DejaVuSans-BoldOblique.ttf', 'DejaVuSansMono.ttf']
for nombre, archivo in zip(['Manual', 'ManualBold', 'ManualItalic', 'ManualBoldItalic', 'Codigo'], archivos):
    pdfmetrics.registerFont(TTFont(nombre, str(FUENTES / archivo)))
pdfmetrics.registerFontFamily('Manual', normal='Manual', bold='ManualBold', italic='ManualItalic', boldItalic='ManualBoldItalic')
VINO = colors.HexColor('#9e252d')
OSCURO = colors.HexColor('#242833')
GRIS = colors.HexColor('#646a74')
ANCHO = A4[0] - 34 * mm
estilos = getSampleStyleSheet()
estilos.add(ParagraphStyle('TextoManual', fontName='Manual', fontSize=9.4, leading=14, spaceAfter=8, textColor=OSCURO))
estilos.add(ParagraphStyle('TituloManual', parent=estilos['TextoManual'], fontName='ManualBold', fontSize=27, leading=33, alignment=TA_CENTER, spaceAfter=16))
estilos.add(ParagraphStyle('SeccionManual', parent=estilos['TextoManual'], fontName='ManualBold', fontSize=17, leading=22, textColor=VINO, spaceBefore=20, spaceAfter=12, keepWithNext=True))
estilos.add(ParagraphStyle('SubtituloManual', parent=estilos['TextoManual'], fontName='ManualBold', fontSize=12, leading=16, spaceBefore=12, spaceAfter=8, keepWithNext=True))
estilos.add(ParagraphStyle('CeldaManual', parent=estilos['TextoManual'], fontSize=8.1, leading=11.5, spaceAfter=0))
estilos.add(ParagraphStyle('CabeceraTabla', parent=estilos['CeldaManual'], fontName='ManualBold', textColor=colors.white))
estilos.add(ParagraphStyle('PieImagen', parent=estilos['TextoManual'], fontName='ManualItalic', fontSize=8, leading=11, alignment=TA_CENTER, textColor=GRIS, spaceAfter=14))
estilos.add(ParagraphStyle('NotaManual', parent=estilos['TextoManual'], backColor=colors.HexColor('#f9f0f1'), borderColor=VINO, borderWidth=.5, borderPadding=10, spaceBefore=10, spaceAfter=14))
estilos.add(ParagraphStyle('ListaManual', parent=estilos['TextoManual'], leftIndent=13, firstLineIndent=0, bulletIndent=1, spaceAfter=5))
estilos.add(ParagraphStyle('CodigoManual', fontName='Codigo', fontSize=7.5, leading=10.4, backColor=colors.HexColor('#f3f4f6'), borderPadding=9, spaceBefore=8, spaceAfter=14))

def limpiar(texto):
    return texto.replace('\u2011', '-').replace('\u2013', '-').replace('\u2014', '-').replace('\u2212', '-')

class Nodo:
    def __init__(self, etiqueta='', atributos=None):
        self.etiqueta = etiqueta
        self.atributos = atributos or {}
        self.hijos = []

class LectorHTML(HTMLParser):
    def __init__(self):
        super().__init__()
        self.raiz = Nodo('raiz')
        self.pila = [self.raiz]
    def handle_starttag(self, etiqueta, atributos):
        nodo = Nodo(etiqueta, dict(atributos))
        self.pila[-1].hijos.append(nodo)
        if etiqueta not in ['img','br','hr','meta','link','input']:
            self.pila.append(nodo)
    def handle_endtag(self, etiqueta):
        for i in range(len(self.pila)-1, 0, -1):
            if self.pila[i].etiqueta == etiqueta:
                self.pila = self.pila[:i]
                break
    def handle_data(self, texto):
        self.pila[-1].hijos.append(texto)

def texto(nodo):
    return nodo if isinstance(nodo, str) else ''.join(texto(hijo) for hijo in nodo.hijos)

def descendientes(nodo, etiqueta):
    if isinstance(nodo, str): return []
    encontrados = [nodo] if nodo.etiqueta == etiqueta else []
    for hijo in nodo.hijos: encontrados += descendientes(hijo, etiqueta)
    return encontrados

def contenido(nodo):
    if isinstance(nodo, str): return escape(limpiar(nodo))
    interior = ''.join(contenido(hijo) for hijo in nodo.hijos)
    etiqueta = nodo.etiqueta
    if etiqueta in ['strong','b']: return '<b>'+interior+'</b>'
    if etiqueta in ['em','i']: return '<i>'+interior+'</i>'
    if etiqueta == 'br': return '<br/>'
    if etiqueta == 'code': return '<font name="Codigo">'+interior+'</font>'
    if etiqueta == 'a':
        direccion = nodo.atributos.get('href','')
        if direccion.startswith('#'): return interior
        if not direccion.startswith(('http://','https://')):
            direccion = 'https://github.com/RSGarcia2002/seguimiento-pedidos/blob/main/' + direccion
        return '<link color="#9e252d" href="'+escape(direccion, quote=True)+'">'+interior+'</link>'
    return interior

def parrafo(cadena, estilo='TextoManual'):
    return Paragraph(cadena, estilos[estilo])

def imagen(nodo):
    archivo = RAIZ / nodo.atributos['src']
    if archivo.suffix == '.svg': archivo = RAIZ / 'tmp/pdfs/diagramas' / (archivo.stem+'.png')
    objeto = Image(str(archivo))
    proporcion = min(ANCHO / objeto.imageWidth, 113 * mm / objeto.imageHeight)
    objeto.drawWidth = objeto.imageWidth * proporcion
    objeto.drawHeight = objeto.imageHeight * proporcion
    return objeto

class Documento(SimpleDocTemplate):
    def afterFlowable(self, objeto):
        if isinstance(objeto, Paragraph) and hasattr(objeto, 'identificador'):
            clave = objeto.identificador
            self.canv.bookmarkPage(clave)
            self.notify('TOCEntry', (0, objeto.getPlainText(), self.page, clave))
            self.canv.addOutlineEntry(objeto.getPlainText(), clave, level=0)

def pagina(lienzo, documento):
    lienzo.saveState()
    if documento.page > 1:
        lienzo.setFont('Manual', 8)
        lienzo.setFillColor(GRIS)
        lienzo.drawString(17 * mm, A4[1] - 14 * mm, documento.encabezado)
        lienzo.setStrokeColor(colors.HexColor('#d9dde3'))
        lienzo.line(17 * mm, A4[1] - 17 * mm, A4[0] - 17 * mm, A4[1] - 17 * mm)
    lienzo.setFont('Manual', 8)
    lienzo.setFillColor(GRIS)
    lienzo.drawString(17 * mm, 11 * mm, 'Randall García | Entrega técnica | 30/10/2026')
    lienzo.drawRightString(A4[0] - 17 * mm, 11 * mm, str(documento.page))
    lienzo.restoreState()

def portada(titulo, subtitulo):
    cubierta = Nodo('img', {'src':'docs/diagramas/portada-manual.svg'})
    return [Spacer(1,12*mm), imagen(cubierta), Spacer(1,20*mm), parrafo(titulo,'TituloManual'), parrafo(subtitulo), Spacer(1,12*mm), parrafo('<b>Autor:</b> Randall García'), parrafo('<b>Presentación prevista:</b> viernes 30 de octubre de 2026'), parrafo('<b>Edición:</b> 1.0'), Spacer(1,10*mm), parrafo('<b>Aplicación publicada</b><br/>https://seguimiento-pedidos-tata.onrender.com/'), parrafo('<b>Repositorio público</b><br/>https://github.com/RSGarcia2002/seguimiento-pedidos'), Spacer(1,10*mm), parrafo('Demostración funcional con datos sintéticos. Resumen operativo por reglas; integración Gemini opcional desactivada sin clave.','NotaManual'), PageBreak()]

def bloques(nodo):
    if isinstance(nodo, str): return []
    etiqueta = nodo.etiqueta
    if etiqueta == 'div' and nodo.atributos.get('class') == 'portada': return []
    if etiqueta == 'h2':
        p = parrafo(contenido(nodo),'SeccionManual')
        p.identificador = nodo.atributos.get('id', str(abs(hash(texto(nodo)))))
        return [p]
    if etiqueta == 'h3': return [parrafo(contenido(nodo),'SubtituloManual')]
    if etiqueta == 'h1': return [parrafo(contenido(nodo),'TituloManual')]
    if etiqueta in ['p','blockquote']:
        figuras = descendientes(nodo, 'img')
        if figuras:
            partes = [imagen(figuras[0]), Spacer(1,4*mm)]
            leyenda = texto(nodo).strip()
            if leyenda: partes.append(parrafo(escape(limpiar(leyenda)), 'PieImagen'))
            return [KeepTogether(partes)]
        return [parrafo(contenido(nodo),'NotaManual' if etiqueta == 'blockquote' else 'TextoManual')]
    if etiqueta == 'img': return [imagen(nodo), Spacer(1,4*mm)]
    if etiqueta in ['ul','ol']:
        salida=[]
        for indice, hijo in enumerate([h for h in nodo.hijos if isinstance(h,Nodo) and h.etiqueta=='li'], 1):
            salida.append(Paragraph(contenido(hijo), estilos['ListaManual'], bulletText=str(indice)+'.' if etiqueta=='ol' else '•'))
        return salida
    if etiqueta == 'pre':
        lineas=[]
        for linea in limpiar(texto(nodo)).splitlines():
            lineas += textwrap.wrap(linea, 94, replace_whitespace=False, drop_whitespace=False) or ['']
        return [Preformatted('\n'.join(lineas),estilos['CodigoManual'])]
    if etiqueta == 'table':
        filas=descendientes(nodo,'tr')
        columnas=max(sum(int(c.atributos.get('colspan',1)) for c in f.hijos if isinstance(c,Nodo) and c.etiqueta in ['td','th']) for f in filas)
        anchuras=[ANCHO/columnas]*columnas
        if columnas==2: anchuras=[ANCHO*.29,ANCHO*.71]
        if columnas==3: anchuras=[ANCHO*.23,ANCHO*.33,ANCHO*.44]
        cabecera=texto(filas[0]).strip()
        if cabecera.startswith('Método'):anchuras=[ANCHO*.10,ANCHO*.47,ANCHO*.43]
        datos=[]; expansiones=[]
        for i,fila in enumerate(filas):
            celdas=[]
            for celda in [c for c in fila.hijos if isinstance(c,Nodo) and c.etiqueta in ['td','th']]:
                indice=len(celdas); extension=int(celda.atributos.get('colspan',1))
                celdas.append(parrafo(contenido(celda),'CabeceraTabla' if i==0 else 'CeldaManual'))
                if extension>1:
                    expansiones.append(('SPAN',(indice,i),(indice+extension-1,i)))
                    celdas += ['']*(extension-1)
            datos.append(celdas+['']*(columnas-len(celdas)))
        tabla=Table(datos,colWidths=anchuras,repeatRows=1,hAlign='LEFT')
        tabla.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,0),OSCURO),('ROWBACKGROUNDS',(0,1),(-1,-1),[colors.white,colors.HexColor('#f6f7f8')]),('GRID',(0,0),(-1,-1),.35,colors.HexColor('#dce0e6')),('VALIGN',(0,0),(-1,-1),'TOP'),('LEFTPADDING',(0,0),(-1,-1),8),('RIGHTPADDING',(0,0),(-1,-1),8),('TOPPADDING',(0,0),(-1,-1),7),('BOTTOMPADDING',(0,0),(-1,-1),7)]+expansiones))
        return [tabla,Spacer(1,5*mm)]
    salida=[]
    for hijo in nodo.hijos:salida += bloques(hijo)
    return salida

lector=LectorHTML();lector.feed((RAIZ/'README.md').read_text())
contenido_manual=portada('Manual técnico y de usuario','Sistema web de seguimiento de pedidos y control de producción.')
saltar_indice=False
for nodo in lector.raiz.hijos:
    if isinstance(nodo,Nodo) and nodo.etiqueta=='h2' and nodo.atributos.get('id')=='contenido':
        contenido_manual.append(parrafo('Contenido','SeccionManual'))
        indice=TableOfContents();indice.levelStyles=[ParagraphStyle('IndiceManual',fontName='Manual',fontSize=9.5,leading=15,spaceBefore=7)]
        contenido_manual += [indice,PageBreak()];saltar_indice=True;continue
    if saltar_indice and isinstance(nodo,Nodo) and nodo.etiqueta=='ol':saltar_indice=False;continue
    contenido_manual += bloques(nodo)
doc=Documento(str(SALIDA/'Manual_tecnico_y_usuario.pdf'),pagesize=A4,leftMargin=17*mm,rightMargin=17*mm,topMargin=23*mm,bottomMargin=19*mm,title='Manual técnico y de usuario - Seguimiento de pedidos TATA',author='Randall García')
doc.encabezado='TATA | Manual técnico y de usuario'
doc.multiBuild(contenido_manual,onFirstPage=pagina,onLaterPages=pagina)

# El guion Markdown mantiene una fuente breve y editable; aquí solo se adapta su formato.
def linea_md(cadena):
    cadena=escape(limpiar(cadena))
    cadena=re.sub(r'\*\*(.+?)\*\*',r'<b>\1</b>',cadena)
    return re.sub(r'`(.+?)`',r'<font name="Codigo">\1</font>',cadena)
guion=portada('Guion de presentación y defensa','Demostración de 6 a 8 minutos y respuestas para la evaluación técnica.')
parrafos=[]
def vaciar():
    if parrafos:
        guion.append(parrafo(linea_md(' '.join(parrafos))))
        parrafos.clear()
for linea in (RAIZ/'docs/guia-presentacion.md').read_text().splitlines():
    if not linea.strip():vaciar();continue
    if linea.startswith('# '):continue
    if linea.startswith('## '):vaciar();guion.append(parrafo(linea_md(linea[3:]),'SeccionManual'));continue
    if linea.startswith('### '):vaciar();guion.append(parrafo(linea_md(linea[4:]),'SubtituloManual'));continue
    if linea.startswith('- '):vaciar();guion.append(Paragraph(linea_md(linea[2:]),estilos['ListaManual'],bulletText='•'));continue
    parrafos.append(linea)
vaciar()
doc=Documento(str(SALIDA/'Guion_presentacion.pdf'),pagesize=A4,leftMargin=17*mm,rightMargin=17*mm,topMargin=23*mm,bottomMargin=19*mm,title='Guion de presentación y defensa - TATA',author='Randall García')
doc.encabezado='TATA | Presentación y defensa técnica'
doc.build(guion,onFirstPage=pagina,onLaterPages=pagina)
print('Generados:',SALIDA/'Manual_tecnico_y_usuario.pdf',SALIDA/'Guion_presentacion.pdf')
