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
    setupCost: 45,
    printSheetSizes: [
      {
        id: 1,
        name: "SRA3",
        width: 320,
        height: 450,
        clickCost: 0.08,
        duplexSupport: true,
        unit: "mm"
      },
      {
        id: 2,
        name: "A3+",
        width: 330,
        height: 483,
        clickCost: 0.09,
        duplexSupport: true,
        unit: "mm"
      },
      {
        id: 3,
        name: "Custom Small",
        width: 280,
        height: 400,
        clickCost: 0.06,
        duplexSupport: false,
        unit: "mm"
      }
    ]
  },
  {
    id: 2,
    name: "Komori L528",
    setupCost: 50,
    printSheetSizes: [
      {
        id: 4,
        name: "SRA3",
        width: 320,
        height: 450,
        clickCost: 0.07,
        duplexSupport: true,
        unit: "mm"
      },
      {
        id: 5,
        name: "A3",
        width: 297,
        height: 420,
        clickCost: 0.065,
        duplexSupport: true,
        unit: "mm"
      },
      {
        id: 6,
        name: "Custom Large",
        width: 350,
        height: 500,
        clickCost: 0.085,
        duplexSupport: true,
        unit: "mm"
      }
    ]
  },
  {
    id: 3,
    name: "Digital Press HP",
    setupCost: 25,
    printSheetSizes: [
      {
        id: 7,
        name: "A3",
        width: 297,
        height: 420,
        clickCost: 0.12,
        duplexSupport: true,
        unit: "mm"
      },
      {
        id: 8,
        name: "A4",
        width: 210,
        height: 297,
        clickCost: 0.08,
        duplexSupport: true,
        unit: "mm"
      },
      {
        id: 9,
        name: "Letter",
        width: 216,
        height: 279,
        clickCost: 0.085,
        duplexSupport: false,
        unit: "mm"
      }
    ]
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

export const findOptimalPrintSheetSize = (job, paperTypes, machines) => {
  const results = [];
  
  for (const machine of machines) {
    for (const printSheetSize of machine.printSheetSizes) {
      for (const paper of paperTypes) {
        // Check if print sheet size fits within the raw paper
        if (printSheetSize.width > paper.width || printSheetSize.height > paper.height) {
          continue;
        }
        
        const margins = {
          top: job.marginTop,
          right: job.marginRight,
          bottom: job.marginBottom,
          left: job.marginLeft
        };
        
        const productsPerPrintSheet = calculateProductsPerSheet(
          printSheetSize.width, printSheetSize.height, job.finalWidth, job.finalHeight, margins
        );
        
        if (productsPerPrintSheet <= 0) continue;
        
        const printSheetsNeeded = calculateSheetsNeeded(job.quantity, productsPerPrintSheet);
        
        // Calculate how many print sheets fit per raw paper sheet
        const printSheetsPerRawSheet = Math.floor(paper.width / printSheetSize.width) * 
                                       Math.floor(paper.height / printSheetSize.height);
        
        if (printSheetsPerRawSheet <= 0) continue;
        
        const rawSheetsNeeded = Math.ceil(printSheetsNeeded / printSheetsPerRawSheet);
        
        const paperWeight = calculatePaperWeight(paper.width, paper.height, paper.gsm, rawSheetsNeeded);
        const paperCost = calculatePaperCost(paperWeight, paper.pricePerTon);
        const clickCost = printSheetsNeeded * printSheetSize.clickCost;
        const setupCost = job.setupRequired ? machine.setupCost : 0;
        const totalCost = paperCost + clickCost + setupCost;
        const costPerUnit = totalCost / job.quantity;
        
        results.push({
          machine,
          printSheetSize,
          paper,
          productsPerPrintSheet,
          printSheetsNeeded,
          printSheetsPerRawSheet,
          rawSheetsNeeded,
          paperWeight,
          paperCost,
          clickCost,
          setupCost,
          totalCost,
          costPerUnit
        });
      }
    }
  }
  
  // Sort by total cost (best option first)
  return results.sort((a, b) => a.totalCost - b.totalCost);
};

export const findBestPaperAndMachine = (job, paperTypes, machines) => {
  return findOptimalPrintSheetSize(job, paperTypes, machines);
};

// Helper function to get machine print sheet size options
export const getMachineSheetSizeOptions = (machineId, machines) => {
  const machine = machines.find(m => m.id === machineId);
  return machine ? machine.printSheetSizes : [];
};

// Helper function to calculate specific machine/sheet size combination
export const calculateSpecificSheetSize = (job, paperTypes, machine, printSheetSize) => {
  const results = [];
  
  for (const paper of paperTypes) {
    // Check if print sheet size fits within the raw paper
    if (printSheetSize.width > paper.width || printSheetSize.height > paper.height) {
      continue;
    }
    
    const margins = {
      top: job.marginTop,
      right: job.marginRight,
      bottom: job.marginBottom,
      left: job.marginLeft
    };
    
    const productsPerPrintSheet = calculateProductsPerSheet(
      printSheetSize.width, printSheetSize.height, job.finalWidth, job.finalHeight, margins
    );
    
    if (productsPerPrintSheet <= 0) continue;
    
    const printSheetsNeeded = calculateSheetsNeeded(job.quantity, productsPerPrintSheet);
    
    // Calculate how many print sheets fit per raw paper sheet
    const printSheetsPerRawSheet = Math.floor(paper.width / printSheetSize.width) * 
                                   Math.floor(paper.height / printSheetSize.height);
    
    if (printSheetsPerRawSheet <= 0) continue;
    
    const rawSheetsNeeded = Math.ceil(printSheetsNeeded / printSheetsPerRawSheet);
    
    const paperWeight = calculatePaperWeight(paper.width, paper.height, paper.gsm, rawSheetsNeeded);
    const paperCost = calculatePaperCost(paperWeight, paper.pricePerTon);
    const clickCost = printSheetsNeeded * printSheetSize.clickCost;
    const setupCost = job.setupRequired ? machine.setupCost : 0;
    const totalCost = paperCost + clickCost + setupCost;
    const costPerUnit = totalCost / job.quantity;
    
    results.push({
      machine,
      printSheetSize,
      paper,
      productsPerPrintSheet,
      printSheetsNeeded,
      printSheetsPerRawSheet,
      rawSheetsNeeded,
      paperWeight,
      paperCost,
      clickCost,
      setupCost,
      totalCost,
      costPerUnit
    });
  }
  
  // Sort by total cost (best option first)
  return results.sort((a, b) => a.totalCost - b.totalCost);
};