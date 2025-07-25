// Mock data for printing cost calculator

export const mockPaperTypes = [
  {
    id: 1,
    name: "A4 Standard",
    width: 210,
    height: 297,
    gsm: 80,
    pricePerTon: 850,
    unit: "mm"
  },
  {
    id: 2,
    name: "A3 Premium",
    width: 297,
    height: 420,
    gsm: 120,
    pricePerTon: 1200,
    unit: "mm"
  },
  {
    id: 3,
    name: "Letter Size",
    width: 216,
    height: 279,
    gsm: 90,
    pricePerTon: 900,
    unit: "mm"
  },
  {
    id: 4,
    name: "SRA3",
    width: 320,
    height: 450,
    gsm: 100,
    pricePerTon: 1000,
    unit: "mm"
  }
];

export const mockMachines = [
  {
    id: 1,
    name: "Heidelberg SM 52",
    maxSheetWidth: 370,
    maxSheetHeight: 520,
    clickCost: 0.08,
    setupCost: 45,
    unit: "mm"
  },
  {
    id: 2,
    name: "Komori L528",
    maxSheetWidth: 360,
    maxSheetHeight: 520,
    clickCost: 0.07,
    setupCost: 50,
    unit: "mm"
  },
  {
    id: 3,
    name: "Digital Press HP",
    maxSheetWidth: 330,
    maxSheetHeight: 482,
    clickCost: 0.12,
    setupCost: 25,
    unit: "mm"
  }
];

export const mockPrintJobs = [
  {
    id: 1,
    productName: "Business Cards",
    finalWidth: 85,
    finalHeight: 55,
    marginTop: 3,
    marginRight: 3,
    marginBottom: 3,
    marginLeft: 3,
    quantity: 1000,
    isColor: true,
    setupRequired: true
  },
  {
    id: 2,
    productName: "Brochures",
    finalWidth: 210,
    finalHeight: 297,
    marginTop: 5,
    marginRight: 5,
    marginBottom: 5,
    marginLeft: 5,
    quantity: 500,
    isColor: true,
    setupRequired: true
  }
];

// Helper functions for calculations
export const calculateProductsPerSheet = (sheetWidth, sheetHeight, productWidth, productHeight, margins) => {
  const usableWidth = sheetWidth - margins.left - margins.right;
  const usableHeight = sheetHeight - margins.top - margins.bottom;
  
  const productsPerRow = Math.floor(usableWidth / productWidth);
  const productsPerColumn = Math.floor(usableHeight / productHeight);
  
  return productsPerRow * productsPerColumn;
};

export const calculateSheetsNeeded = (totalProducts, productsPerSheet) => {
  return Math.ceil(totalProducts / productsPerSheet);
};

export const calculatePaperWeight = (sheetWidth, sheetHeight, gsm, quantity) => {
  const areaPerSheet = (sheetWidth * sheetHeight) / 1000000; // Convert mm² to m²
  const weightPerSheet = areaPerSheet * gsm; // in grams
  return (weightPerSheet * quantity) / 1000; // Convert to kg
};

export const calculatePaperCost = (weightKg, pricePerTon) => {
  return (weightKg / 1000) * pricePerTon;
};

export const findBestPaperAndMachine = (job, paperTypes, machines) => {
  const results = [];
  
  for (const paper of paperTypes) {
    for (const machine of machines) {
      // Check if paper fits in machine
      if (paper.width > machine.maxSheetWidth || paper.height > machine.maxSheetHeight) {
        continue;
      }
      
      const margins = {
        top: job.marginTop,
        right: job.marginRight,
        bottom: job.marginBottom,
        left: job.marginLeft
      };
      
      const productsPerSheet = calculateProductsPerSheet(
        paper.width, paper.height, job.finalWidth, job.finalHeight, margins
      );
      
      if (productsPerSheet <= 0) continue;
      
      const sheetsNeeded = calculateSheetsNeeded(job.quantity, productsPerSheet);
      const paperWeight = calculatePaperWeight(paper.width, paper.height, paper.gsm, sheetsNeeded);
      const paperCost = calculatePaperCost(paperWeight, paper.pricePerTon);
      const clickCost = sheetsNeeded * machine.clickCost;
      const setupCost = job.setupRequired ? machine.setupCost : 0;
      const totalCost = paperCost + clickCost + setupCost;
      const costPerUnit = totalCost / job.quantity;
      
      results.push({
        paper,
        machine,
        productsPerSheet,
        sheetsNeeded,
        paperWeight,
        paperCost,
        clickCost,
        setupCost,
        totalCost,
        costPerUnit
      });
    }
  }
  
  // Sort by total cost (best option first)
  return results.sort((a, b) => a.totalCost - b.totalCost);
};