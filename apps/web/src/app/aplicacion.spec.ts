import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Aplicacion } from './aplicacion';

describe('Aplicacion', () => {
  it('muestra la identidad y el acceso al contenido principal', async () => {
    // Montamos el componente para comprobar el contenido visible de la base inicial.
    await TestBed.configureTestingModule({ imports: [Aplicacion], providers: [provideRouter([])] }).compileComponents();
    const componente = TestBed.createComponent(Aplicacion);
    componente.detectChanges();
    const elemento: HTMLElement = componente.nativeElement;
    expect(elemento.textContent).toContain('Seguimiento de pedidos');
    expect(elemento.querySelector('main')?.id).toBe('contenido');
  });
});
