import { of, throwError } from 'rxjs';
import { FormBuilder } from '@angular/forms';
import { QuotationWizardComponent } from './quotation-wizard.component';

function makeComponent(overrides: any = {}) {
  const quotationService: any = {
    getQuotations: jasmine.createSpy('getQuotations'),
    getQuotationById: jasmine.createSpy('getQuotationById'),
    createQuotation: jasmine.createSpy('createQuotation'),
    updateQuotation: jasmine.createSpy('updateQuotation'),
  };
  const temporalService: any = {
    getTemporal: jasmine.createSpy('getTemporal').and.returnValue(of({})),
    saveTemporal: jasmine.createSpy('saveTemporal').and.returnValue(of({})),
    deleteTemporal: jasmine.createSpy('deleteTemporal').and.returnValue(of({ success: true })),
    refreshTemporals: jasmine.createSpy('refreshTemporals'),
    temporals$: of([]),
  };
  const toastService: any = {
    success: jasmine.createSpy('success'),
    error: jasmine.createSpy('error'),
    info: jasmine.createSpy('info'),
    warning: jasmine.createSpy('warning'),
  };
  const router: any = { navigate: jasmine.createSpy('navigate') };
  const route: any = { params: of({}), queryParams: of({}) };
  const authService: any = { getUser: () => ({ email: 'test@sv.com', role: 'admin' }) };
  const calcService: any = { recalculateAll: (_q: any, _c: any) => {} };
  const configService: any = { getConfig: () => of({}) };
  const cmp = new QuotationWizardComponent(
    new FormBuilder(),
    quotationService,
    configService,
    calcService,
    {} as any,
    {} as any,
    temporalService,
    {} as any,
    {} as any,
    toastService,
    authService,
    router,
    route
  );
  cmp.appConfig = {
    laborRatePerHour: 12495, designRatePerHour: 16780, unforeseenPercent: 10,
    profitPercent: 35, indirectPercent: 32, taxPercent: 19, defaultDiscount: 10,
    nextQuotationNumber: 2700, wasteTable: [], paymentTerms: '', validityDays: 3,
    companyName: 'SV', city: 'Pasto'
  } as any;
  Object.assign(cmp, overrides);
  return { cmp, quotationService, temporalService, toastService, router };
}

describe('QuotationWizard saveQuotation (fix guardar + sobrescribir)', () => {
  it('sanitizeQuotation elimina transitorios _* y _id', () => {
    const { cmp } = makeComponent();
    const dirty: any = {
      number: 2701, _id: 'abc', createdAt: 'x',
      client: { name: 'Ana' },
      areas: [{ name: 'COCINA', furniture: [{ name: 'M1', supplies: [{ description: 'X', unitPrice: 10, _lamina: 'Y', _laminaOpen: true }] }] }],
      wizardConfig: { clientPriceMode: 'unit_sqm' }
    };
    const clean = (cmp as any).sanitizeQuotation(dirty);
    expect(clean._id).toBeUndefined();
    expect(clean.areas[0].furniture[0].supplies[0]._lamina).toBeUndefined();
    expect(clean.areas[0].furniture[0].supplies[0].description).toBe('X');
    expect(clean.number).toBe(2701);
  });

  it('con _id hace PUT y borra el temporal', () => {
    const { cmp, quotationService, temporalService, router } = makeComponent({ temporalId: 't1' });
    (cmp as any).activeQuotation._id = 'q1';
    (cmp as any).activeQuotation.number = 2701;
    quotationService.updateQuotation.and.returnValue(of({ success: true, data: { number: 2701 } }));
    cmp.saveQuotation();
    expect(quotationService.updateQuotation).toHaveBeenCalledWith('q1', jasmine.any(Object));
    expect(temporalService.deleteTemporal).toHaveBeenCalledWith('t1');
    expect(router.navigate).toHaveBeenCalledWith(['/quotations']);
    expect(quotationService.createQuotation).not.toHaveBeenCalled();
  });

  it('sin _id pero con numero existente hace PUT (sobrescribe)', () => {
    const { cmp, quotationService } = makeComponent();
    (cmp as any).activeQuotation._id = undefined;
    (cmp as any).activeQuotation.number = 2701;
    quotationService.getQuotations.and.returnValue(of({ success: true, data: [{ _id: 'q9', number: 2701 }] }));
    quotationService.updateQuotation.and.returnValue(of({ success: true, data: { number: 2701 } }));
    cmp.saveQuotation();
    expect(quotationService.getQuotations).toHaveBeenCalled();
    expect(quotationService.updateQuotation).toHaveBeenCalledWith('q9', jasmine.any(Object));
    expect(quotationService.createQuotation).not.toHaveBeenCalled();
  });

  it('sin _id y numero nuevo hace POST', () => {
    const { cmp, quotationService } = makeComponent();
    (cmp as any).activeQuotation._id = undefined;
    (cmp as any).activeQuotation.number = 2799;
    quotationService.getQuotations.and.returnValue(of({ success: true, data: [] }));
    quotationService.createQuotation.and.returnValue(of({ success: true, data: { number: 2799 } }));
    cmp.saveQuotation();
    expect(quotationService.createQuotation).toHaveBeenCalledWith(jasmine.any(Object));
    expect(quotationService.updateQuotation).not.toHaveBeenCalled();
  });

  it('muestra mensaje del servidor cuando falla', () => {
    const { cmp, quotationService, toastService } = makeComponent();
    (cmp as any).activeQuotation._id = 'q1';
    quotationService.updateQuotation.and.returnValue(throwError(() => ({ error: { message: 'Duplicado' } })));
    cmp.saveQuotation();
    expect(toastService.error).toHaveBeenCalled();
    expect((cmp as any).isLoading).toBeFalse();
  });

  it('no re-guarda una cotización abierta sin cambios (lectura congelada)', () => {
    const { cmp, quotationService, toastService, router } = makeComponent();
    (cmp as any).activeQuotation._id = 'q1';
    (cmp as any).initialSnapshot = (cmp as any).snapshotOf((cmp as any).activeQuotation);

    expect(cmp.hasUnsavedChanges()).toBeFalse();
    cmp.saveQuotation();

    expect(quotationService.updateQuotation).not.toHaveBeenCalled();
    expect(toastService.info).toHaveBeenCalled();
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('sí guarda cuando hay un cambio real', () => {
    const { cmp, quotationService } = makeComponent();
    (cmp as any).activeQuotation._id = 'q1';
    (cmp as any).initialSnapshot = (cmp as any).snapshotOf((cmp as any).activeQuotation);
    (cmp as any).activeQuotation.client.name = 'Cliente editado';
    quotationService.updateQuotation.and.returnValue(of({ success: true, data: { number: 2701 } }));

    expect(cmp.hasUnsavedChanges()).toBeTrue();
    cmp.saveQuotation();
    expect(quotationService.updateQuotation).toHaveBeenCalledWith('q1', jasmine.any(Object));
  });

  it('la visibilidad de precios de herrajes depende del rol, no del modo del PDF', () => {
    const admin = makeComponent().cmp;
    const comercial = makeComponent({
      authService: { getUser: () => ({ email: 'comercial@sv.com', role: 'comercial' }) }
    }).cmp;

    // Cambiar el modo elegido en el paso 3 no altera quién ve precios en el paso 4.
    for (const mode of ['table', 'included', 'selective']) {
      (admin as any).activeQuotation.wizardConfig.hardwareDisplayMode = mode as any;
      (comercial as any).activeQuotation.wizardConfig.hardwareDisplayMode = mode as any;
      expect(admin.canSeeHardwarePrices).toBeTrue();
      expect(comercial.canSeeHardwarePrices).toBeFalse();
    }
  });

  it('loadConfig no pisa porcentajes ni totales de una cotización guardada', () => {
    const { cmp } = makeComponent();
    (cmp as any).activeQuotation._id = 'q1';
    (cmp as any).activeQuotation.totals = {
      unforeseenPercent: 7, profitPercent: 20, indirectPercent: 11,
      taxPercent: 5, discountPercent: 3, grandTotal: 123456
    };
    cmp.loadConfig();
    expect((cmp as any).activeQuotation.totals.profitPercent).toBe(20);
    expect((cmp as any).activeQuotation.totals.taxPercent).toBe(5);
    expect((cmp as any).activeQuotation.totals.discountPercent).toBe(3);
  });
});
