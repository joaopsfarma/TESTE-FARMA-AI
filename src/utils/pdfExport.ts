import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { ProcessedProduct } from '../types';

export interface PDFExportConfig {
  title: string;
  filename: string;
  headers: string[];
  data: string[][];
  kpis: { label: string; value: string }[];
}

export const exportToPDF = (config: PDFExportConfig) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  
  // --- Header ---
  doc.setFillColor(37, 99, 235); // Blue-600
  doc.rect(0, 0, pageWidth, 24, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('Logística Farmacêutica', 14, 10);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(config.title, 14, 16);
  doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, 14, 21);

  // --- KPIs ---
  const startY = 32;
  const cardWidth = 60;
  const cardHeight = 20;
  const gap = 10;
  const margin = 14;

  config.kpis.forEach((kpi, idx) => {
    const x = margin + (cardWidth + gap) * idx;
    if (x + cardWidth <= pageWidth - margin) {
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(226, 232, 240); // Slate-200
      doc.roundedRect(x, startY, cardWidth, cardHeight, 2, 2, 'FD');
      
      doc.setTextColor(100, 116, 139); // Slate-500
      doc.setFontSize(8);
      doc.text(kpi.label, x + 4, startY + 6);

      doc.setTextColor(30, 41, 59); // Slate-800
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text(kpi.value.toString(), x + 4, startY + 16);
    }
  });

  // --- Table ---
  autoTable(doc, {
    startY: config.kpis.length > 0 ? startY + cardHeight + 8 : 32,
    head: [config.headers],
    body: config.data,
    theme: 'grid',
    styles: { 
      fontSize: 8, 
      cellPadding: 3,
      valign: 'middle'
    },
    headStyles: { 
      fillColor: [241, 245, 249], // Slate-100
      textColor: [30, 41, 59], // Slate-800
      fontStyle: 'bold',
      lineWidth: 0.1,
      lineColor: [226, 232, 240] // Slate-200
    }
  });

  doc.save(config.filename);
};

export const exportInventoryToPDF = (displayData: ProcessedProduct[], stats: { critical: number, warning: number, order: number, expiry: number }) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  
  // --- Header ---
  doc.setFillColor(5, 150, 105); // Emerald-600
  doc.rect(0, 0, pageWidth, 24, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('Logística Farmacêutica', 14, 10);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Relatório Geral de Estoque e Indicadores', 14, 16);
  doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, 14, 21);

  // --- Summary Cards (Mini Dashboard) ---
  const startY = 32;
  const cardWidth = 42;
  const cardHeight = 24;
  const gap = 5;
  const margin = 14;

  // Helper to draw card
  const drawCard = (x: number, title: string, value: number, color: [number, number, number]) => {
    // Card Background (Light)
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(226, 232, 240); // Slate-200
    doc.roundedRect(x, startY, cardWidth, cardHeight, 2, 2, 'FD');
    
    // Left Accent Border
    doc.setFillColor(...color);
    doc.roundedRect(x, startY, 2, cardHeight, 2, 2, 'F');
    // Fix left corners being round by overdrawing
    doc.rect(x+1, startY, 1, cardHeight, 'F'); 

    // Title
    doc.setTextColor(100, 116, 139); // Slate-500
    doc.setFontSize(7);
    doc.text(title, x + 6, startY + 8);

    // Value
    doc.setTextColor(...color);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(value.toString(), x + 6, startY + 18);
  };

  drawCard(margin, 'URGENTE (Ruptura)', stats.critical, [234, 88, 12]); // Orange-600
  drawCard(margin + cardWidth + gap, 'DIVERGÊNCIA', stats.warning, [220, 38, 38]); // Red-600
  drawCard(margin + (cardWidth + gap) * 2, 'REPOSIÇÃO', stats.order, [37, 99, 235]); // Blue-600
  drawCard(margin + (cardWidth + gap) * 3, 'VALIDADE', stats.expiry, [202, 138, 4]); // Yellow-600

  // --- Table ---
  const tableData = displayData.map(item => [
    item.name,
    item.category,
    item.systemStock,
    item.dailyConsumption.toFixed(1),
    item.coverageDays > 900 ? '∞' : item.coverageDays.toFixed(1),
    new Date(item.expiryDate).toLocaleDateString('pt-BR'),
    item.status
  ]);

  autoTable(doc, {
    startY: startY + cardHeight + 10,
    head: [['Produto', 'Categoria', 'Sistema', 'CDM', 'Cobertura', 'Validade', 'Status']],
    body: tableData,
    theme: 'grid',
    styles: { 
      fontSize: 7, 
      cellPadding: 2,
      valign: 'middle'
    },
    headStyles: { 
      fillColor: [241, 245, 249], // Slate-100
      textColor: [71, 85, 105], // Slate-600
      fontSize: 7, 
      fontStyle: 'bold',
      lineWidth: 0.1,
      lineColor: [226, 232, 240] // Slate-200
    },
    columnStyles: {
      0: { cellWidth: 50, fontStyle: 'bold', textColor: [30, 41, 59] }, // Produto
      1: { cellWidth: 20 },
      2: { cellWidth: 15, halign: 'right' }, // Sistema
      3: { cellWidth: 15, halign: 'right' }, // CDM
      4: { cellWidth: 15, halign: 'right' }, // Cobertura
      5: { cellWidth: 20, halign: 'right' }, // Validade
      6: { cellWidth: 'auto', fontStyle: 'bold' } // Status
    },
    didParseCell: function(data) {
      if (data.section === 'body' && data.column.index === 6) {
        const status = data.cell.raw as string;
        if (status === 'VERIFICAR INVENTÁRIO') {
          data.cell.styles.textColor = [220, 38, 38]; // Red
        } else if (status === 'URGENTE!') {
          data.cell.styles.textColor = [234, 88, 12]; // Orange
        } else if (status === 'REMANEJAR (VALIDADE)') {
          data.cell.styles.textColor = [202, 138, 4]; // Yellow
        } else if (status === 'PEDIR AO RECEBIMENTO') {
          data.cell.styles.textColor = [37, 99, 235]; // Blue
        } else {
          data.cell.styles.textColor = [22, 163, 74]; // Green
        }
      }
    }
  });

  doc.save('relatorio-estoque-visual.pdf');
};
