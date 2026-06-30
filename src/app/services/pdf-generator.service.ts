import { Injectable } from '@angular/core';
import { Quotation, AppConfig, Area, Furniture, AccessoryItem } from '../models/interfaces';
import * as pdfMake from 'pdfmake/build/pdfmake';
import * as pdfFonts from 'pdfmake/build/vfs_fonts';
import { TDocumentDefinitions, Content, TableCell, StyleDictionary } from 'pdfmake/interfaces';
import { LOGO_BASE64 } from './logo-base64';
import { ToastService } from './toast.service';

// Safe assignment for vfs fonts
const fonts = (pdfFonts as any);
(pdfMake as any).vfs = fonts.pdfMake ? fonts.pdfMake.vfs : fonts.default ? fonts.default : fonts;

@Injectable({
  providedIn: 'root'
})
export class PdfGeneratorService {
  constructor(private toastService: ToastService) {}


  generateQuotationPdf(quotation: Quotation, appConfig: AppConfig | null) {
    try {
      const docDef: TDocumentDefinitions = {
        content: this.buildContent(quotation, appConfig, LOGO_BASE64),
        styles: this.getStyles(),
        defaultStyle: {
          fontSize: 10,
          color: '#333333'
        },
        pageMargins: [40, 60, 40, 60],
        header: (currentPage, pageCount) => {
          return {
            text: `Cotización No. ${quotation.number} - Página ${currentPage} de ${pageCount}`,
            alignment: 'right',
            margin: [0, 20, 40, 0],
            fontSize: 8,
            color: '#999999'
          };
        }
      };
      pdfMake.createPdf(docDef).download(`Cotizacion_${quotation.number}_${quotation.client.name.replace(/\s+/g, '_')}.pdf`);
    } catch (err) {
      console.error('Error al generar PDF:', err);
      this.toastService.error('Error al generar PDF', 'Verifica la consola para más detalles.');
    }
  }

  private buildContent(quotation: Quotation, appConfig: AppConfig | null, logoDataUrl: string): Content[] {
    const content: Content[] = [];

    // Header
    content.push({
      columns: [
        {
          image: logoDataUrl,
          width: 120,
          margin: [0, 0, 0, 0]
        },
        {
          text: [
            { text: `Cotización No. ${quotation.number}\n`, style: 'headerTitle' },
            { text: `Fecha: ${quotation.date}\n` },
            { text: `Ciudad: ${quotation.city}` }
          ],
          alignment: 'right',
          width: '*'
        }
      ],
      margin: [0, 0, 0, 20]
    });

    // Client Info
    content.push({
      style: 'clientBox',
      table: {
        widths: ['25%', '75%'],
        body: [
          [{ text: 'Cliente:', bold: true }, quotation.client.name],
          [{ text: 'Ciudad:', bold: true }, quotation.client.city || 'N/A'],
          [{ text: 'Teléfono:', bold: true }, quotation.client.phone || 'N/A'],
          [{ text: 'Email:', bold: true }, quotation.client.email || 'N/A']
        ]
      },
      layout: 'lightHorizontalLines',
      margin: [0, 0, 0, 20]
    });

    // Title
    content.push({
      text: quotation.title,
      style: 'projectTitle',
      margin: [0, 0, 0, 20]
    });

    // Mapeo lógico de configuración con fallback
    const wConfig = quotation.wizardConfig || {
      clientPriceMode: 'unit_sqm',
      hardwareDisplayMode: 'table',
      areaDisplayMode: 'subtotals'
    };
    
    // Totales fallback
    const totals = quotation.totals || {
      totalCost: 0, grandTotal: 0, subtotal: 0, taxAmount: 0, discountAmount: 0, pricePerSqm: 0
    };
    const markupFactor = totals.totalCost > 0 ? totals.grandTotal / totals.totalCost : 1;
    const allAccessories: { furnName: string, acc: AccessoryItem, clientPrice: number }[] = [];

    // Muebles y Áreas
    const areas = quotation.areas || [];
    areas.forEach(area => {
      if (wConfig.areaDisplayMode !== 'single') {
        content.push({ text: `Área: ${area.name}`, style: 'areaTitle', margin: [0, 10, 0, 10] });
      }

      let areaSubtotal = 0;

      const tableBody: TableCell[][] = [
        [{ text: 'Ítem', style: 'tableHeader' }, { text: 'Descripción / Medidas', style: 'tableHeader' }, { text: 'Cant', style: 'tableHeader' }, { text: 'Valor Unit.', style: 'tableHeader', alignment: 'right' as 'right' }, { text: 'Valor Total', style: 'tableHeader', alignment: 'right' as 'right' }]
      ];

      const furnitureList = area.furniture || [];
      furnitureList.forEach((furn, index) => {
        let furnBaseCost = furn.totalCost;

        // Q2: Herrajes
        if (wConfig.hardwareDisplayMode === 'table') {
          furnBaseCost -= (furn.totalAccessories || 0); // Restamos accesorios del mueble
          if (furn.accessories && Array.isArray(furn.accessories)) {
            const fQty = furn.quantity || 1;
            furn.accessories.forEach(acc => {
              allAccessories.push({
                furnName: furn.name,
                acc: { ...acc, quantity: (acc.quantity || 1) * fQty },
                clientPrice: (acc.totalPrice || 0) * markupFactor * fQty
              });
            });
          }
        }

        // Q1: Precio Cliente
        let unitPrice = 0;
        if (wConfig.clientPriceMode === 'unit_sqm') {
          unitPrice = (furn.areaSqm || 0) * (totals.pricePerSqm || 0);
        } else if (wConfig.clientPriceMode === 'manual' || wConfig.clientPriceMode === 'outsource') {
          unitPrice = furnBaseCost * markupFactor;
        } else {
          // Fallback
          unitPrice = furnBaseCost * markupFactor; 
        }

        const furnClientPrice = unitPrice * (furn.quantity || 1);
        areaSubtotal += furnClientPrice;

        tableBody.push([
          { text: (index + 1).toString() },
          { text: [
              { text: `${furn.name}\n`, bold: true },
              { text: furn.description ? `${furn.description}\n` : '' },
              { text: `Medidas: ${furn.measurements || 'N/A'}`, fontSize: 9, color: '#666' }
            ] 
          },
          { text: (furn.quantity || 1).toString() },
          { text: this.formatCurrency(unitPrice), alignment: 'right' as 'right' },
          { text: this.formatCurrency(furnClientPrice), alignment: 'right' as 'right' }
        ]);
      });

      // Sub-Áreas (Mesones, etc)
      if (area.subAreas && Array.isArray(area.subAreas)) {
        area.subAreas.forEach((subArea) => {
          if (subArea.items && Array.isArray(subArea.items)) {
            subArea.items.forEach((item, index) => {
              const itemClientPrice = (item.price || 0) * (item.quantity || 0) * markupFactor;
              const unitClientPrice = (item.price || 0) * markupFactor;
              areaSubtotal += itemClientPrice;

              tableBody.push([
                { text: `*` },
                { text: [
                    { text: `${subArea.name} - ${item.description}\n`, bold: true },
                    { text: `Medidas: ${item.measurements || 'N/A'}`, fontSize: 9, color: '#666' }
                  ] 
                },
                { text: (item.quantity || 1).toString() },
                { text: this.formatCurrency(unitClientPrice), alignment: 'right' as 'right' },
                { text: this.formatCurrency(itemClientPrice), alignment: 'right' as 'right' }
              ]);
            });
          }
        });
      }

      // Accesorios Visibles
      if (area.visibleAccessories && Array.isArray(area.visibleAccessories)) {
        area.visibleAccessories.forEach((acc, index) => {
          const accClientPrice = (acc.unitPrice || 0) * (acc.quantity || 0) * markupFactor;
          const unitClientPrice = (acc.unitPrice || 0) * markupFactor;
          areaSubtotal += accClientPrice;

          tableBody.push([
            { text: `+` },
            { text: [
                { text: `${acc.description}\n`, bold: true },
                { text: `Código: ${acc.code || 'N/A'}, Medidas: ${acc.measurements || 'N/A'}`, fontSize: 9, color: '#666' }
              ] 
            },
            { text: (acc.quantity || 1).toString() },
            { text: this.formatCurrency(unitClientPrice), alignment: 'right' as 'right' },
            { text: this.formatCurrency(accClientPrice), alignment: 'right' as 'right' }
          ]);
        });
      }

      content.push({
        table: {
          headerRows: 1,
          widths: ['auto', '*', 'auto', 'auto', 'auto'],
          body: tableBody
        },
        layout: {
          hLineWidth: (i: number, node: any) => (i === 0 || i === node.table.body.length) ? 2 : 1,
          vLineWidth: () => 0,
          hLineColor: (i: number) => i === 1 ? '#cccccc' : '#eeeeee',
          paddingTop: () => 8,
          paddingBottom: () => 8
        },
        margin: [0, 0, 0, 10]
      });

      // Q5: Subtotales por área
      if (wConfig.areaDisplayMode === 'subtotals') {
        content.push({
          text: `Subtotal ${area.name}: ${this.formatCurrency(areaSubtotal)}`,
          style: 'areaSubtotal',
          alignment: 'right' as 'right',
          margin: [0, 0, 0, 20]
        });
      } else {
        content.push({ text: '', margin: [0, 0, 0, 20] });
      }
    });

    // Q2: Tabla de herrajes (si aplica)
    if (wConfig.hardwareDisplayMode === 'table' && allAccessories.length > 0) {
      content.push({ text: 'Herrajes y Accesorios Adicionales', style: 'areaTitle', margin: [0, 10, 0, 10] });
      const accBody: TableCell[][] = [
        [{ text: 'Mueble', style: 'tableHeader' }, { text: 'Descripción', style: 'tableHeader' }, { text: 'Cant', style: 'tableHeader' }, { text: 'Total', style: 'tableHeader', alignment: 'right' as 'right' }]
      ];
      
      let accTotal = 0;
      allAccessories.forEach(item => {
        accTotal += item.clientPrice;
        accBody.push([
          { text: item.furnName, fontSize: 9 },
          { text: item.acc.description || 'Accesorio / Herraje' },
          { text: (item.acc.quantity || 1).toString() },
          { text: this.formatCurrency(item.clientPrice), alignment: 'right' as 'right' }
        ]);
      });

      content.push({
        table: {
          headerRows: 1,
          widths: ['auto', '*', 'auto', 'auto'],
          body: accBody
        },
        layout: 'lightHorizontalLines',
        margin: [0, 0, 0, 10]
      });
      content.push({
        text: `Subtotal Herrajes: ${this.formatCurrency(accTotal)}`,
        style: 'areaSubtotal',
        alignment: 'right' as 'right',
        margin: [0, 0, 0, 20]
      });
    }

    // Totales
    content.push({
      columns: [
        { width: '*', text: '' },
        {
          width: '40%',
          table: {
            widths: ['*', 'auto'],
            body: [
              ['Costo Total Materiales/Operación:', { text: this.formatCurrency(totals.totalCost), alignment: 'right' as 'right' }],
              ['AIU (Imprevistos, Utilidad, Indirectos):', { text: this.formatCurrency(totals.subtotal - totals.totalCost), alignment: 'right' as 'right' }],
              [{ text: 'SUBTOTAL ANTES DE IVA:', bold: true }, { text: this.formatCurrency(totals.subtotal), alignment: 'right' as 'right', bold: true }],
              ['IVA:', { text: this.formatCurrency(totals.taxAmount), alignment: 'right' as 'right' }],
              ...(totals.discountAmount > 0 ? [['Recargo / Otros:', { text: this.formatCurrency(totals.discountAmount), alignment: 'right' as 'right' }]] : []),
              [{ text: 'VALOR TOTAL:', style: 'grandTotalLabel' }, { text: this.formatCurrency(totals.grandTotal), style: 'grandTotalValue', alignment: 'right' as 'right' }]
            ]
          },
          layout: 'noBorders'
        }
      ],
      margin: [0, 20, 0, 40]
    });

    // Notas y condiciones
    content.push({ text: 'Condiciones Comerciales', style: 'sectionTitle' });
    content.push({
      ul: [
        `Forma de pago: ${quotation.paymentTerms || 'No especificada'}`,
        `Validez de la oferta: ${quotation.validityDays || 15} días`,
        ...(quotation.notes ? [`Notas adicionales: ${quotation.notes}`] : [])
      ],
      margin: [0, 5, 0, 0]
    });

    return content;
  }

  private getStyles(): StyleDictionary {
    return {
      headerCompany: {
        fontSize: 24,
        bold: true,
        color: '#0B4249'
      },
      headerTitle: {
        fontSize: 16,
        bold: true,
        color: '#0B4249'
      },
      clientBox: {
        fillColor: '#f0f4f5',
        margin: [0, 5, 0, 5]
      },
      projectTitle: {
        fontSize: 18,
        bold: true,
        alignment: 'center',
        color: '#D5A052'
      },
      areaTitle: {
        fontSize: 14,
        bold: true,
        color: '#0B4249',
        decoration: 'underline'
      },
      tableHeader: {
        bold: true,
        color: '#FFFFFF',
        fillColor: '#0B4249'
      },
      areaSubtotal: {
        fontSize: 11,
        bold: true,
        color: '#0B4249'
      },
      grandTotalLabel: {
        fontSize: 14,
        bold: true,
        color: '#0B4249',
        margin: [0, 10, 0, 0]
      },
      grandTotalValue: {
        fontSize: 14,
        bold: true,
        color: '#D5A052',
        margin: [0, 10, 0, 0]
      },
      sectionTitle: {
        fontSize: 12,
        bold: true,
        color: '#0B4249',
        margin: [0, 10, 0, 5]
      }
    };
  }

  private formatCurrency(value: number): string {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  }
}
