// Mock data for printing cost calculator

export const mockPaperTypes = [
  {
    id: 1,
    name: "80g Standard",
    gsm: 80,
    pricePerTon: 850,
    stockSheetSizes: [
      {
        id: 1,
        name: "A4",
        width: 210,
        height: 297,
        unit: "mm"
      },
      {
        id: 2,
        name: "A3",
        width: 297,
        height: 420,
        unit: "mm"
      },
      {
        id: 3,
        name: "SRA3",
        width: 320,
        height: 450,
        unit: "mm"
      }
    ]
  },
  {
    id: 2,
    name: "120g Premium",
    gsm: 120,
    pricePerTon: 1200,
    stockSheetSizes: [
      {
        id: 4,
        name: "A3",
        width: 297,
        height: 420,
        unit: "mm"
      },
      {
        id: 5,
        name: "SRA3",
        width: 320,
        height: 450,
        unit: "mm"
      },
      {
        id: 6,
        name: "B2",
        width: 500,
        height: 707,
        unit: "mm"
      }
    ]
  },
  {
    id: 3,
    name: "90g Letter",
    gsm: 90,
    pricePerTon: 900,
    stockSheetSizes: [
      {
        id: 7,
        name: "Letter",
        width: 216,
        height: 279,
        unit: "mm"
      },
      {
        id: 8,
        name: "Legal",
        width: 216,
        height: 356,
        unit: "mm"
      },
      {
        id: 9,
        name: "Tabloid",
        width: 279,
        height: 432,
        unit: "mm"
      }
    ]
  },
  {
    id: 4,
    name: "100g Coated",
    gsm: 100,
    pricePerTon: 1000,
    stockSheetSizes: [
      {
        id: 10,
        name: "SRA3",
        width: 320,
        height: 450,
        unit: "mm"
      },
      {
        id: 11,
        name: "A2",
        width: 420,
        height: 594,
        unit: "mm"
      },
      {
        id: 12,
        name: "B1",
        width: 707,
        height: 1000,
        unit: "mm"
      }
    ]
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
    isDoubleSided: false,
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
    isDoubleSided: true,
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

export const calculateCoverCost = (job, coverPaperType, coverMachine) => {
  if (!job.hasCover || !coverPaperType || !coverMachine) {
    return null;
  }

  // For booklet with cover, we need to calculate:
  // 1. Cover cost (front and back cover)
  // 2. Inner pages cost (total pages - cover pages)
  
  const coverQuantity = job.quantity; // Each booklet needs 1 cover
  const totalPages = job.totalPages || 0;
  const innerPages = Math.max(0, totalPages - 2); // Subtract front and back cover
  const innerSheetsNeeded = Math.ceil(innerPages / (job.isDoubleSided ? 2 : 1));
  
  // Find the best stock sheet size for the cover
  let bestCoverOption = null;
  let lowestCost = Infinity;

  for (const stockSheetSize of coverPaperType.stockSheetSizes) {
    for (const printSheetSize of coverMachine.printSheetSizes) {
      // Check if print sheet size fits within the stock sheet size
      if (printSheetSize.width > stockSheetSize.width || printSheetSize.height > stockSheetSize.height) {
        continue;
      }
      
      const margins = {
        top: job.marginTop,
        right: job.marginRight,
        bottom: job.marginBottom,
        left: job.marginLeft
      };
      
      const coversPerPrintSheet = calculateProductsPerSheet(
        printSheetSize.width, printSheetSize.height, job.finalWidth, job.finalHeight, margins
      );
      
      if (coversPerPrintSheet <= 0) continue;
      
      const printSheetsNeeded = calculateSheetsNeeded(coverQuantity, coversPerPrintSheet);
      
      // Calculate how many print sheets fit per stock sheet
      const printSheetsPerStockSheet = Math.floor(stockSheetSize.width / printSheetSize.width) * 
                                     Math.floor(stockSheetSize.height / printSheetSize.height);
      
      if (printSheetsPerStockSheet <= 0) continue;
      
      const stockSheetsNeeded = Math.ceil(printSheetsNeeded / printSheetsPerStockSheet);
      
      const paperWeight = calculatePaperWeight(stockSheetSize.width, stockSheetSize.height, coverPaperType.gsm, stockSheetsNeeded);
      const paperCost = calculatePaperCost(paperWeight, coverPaperType.pricePerTon);
      
      // Cover is typically double-sided, so we'll assume 2x click cost
      const clickCost = printSheetsNeeded * printSheetSize.clickCost * 2;
      const setupCost = job.coverSetupRequired ? coverMachine.setupCost : 0;
      const totalCost = paperCost + clickCost + setupCost;
      
      if (totalCost < lowestCost) {
        lowestCost = totalCost;
        bestCoverOption = {
          paperType: coverPaperType,
          machine: coverMachine,
          printSheetSize,
          stockSheetSize,
          coversPerPrintSheet,
          printSheetsNeeded,
          printSheetsPerStockSheet,
          stockSheetsNeeded,
          paperWeight,
          paperCost,
          clickCost,
          setupCost,
          totalCost,
          totalPages,
          innerPages,
          innerSheetsNeeded
        };
      }
    }
  }
  
  return bestCoverOption;
};

export const findOptimalPrintSheetSize = (job, paperTypes, machines) => {
  const results = [];
  
  for (const machine of machines) {
    for (const printSheetSize of machine.printSheetSizes) {
      for (const paperType of paperTypes) {
        for (const stockSheetSize of paperType.stockSheetSizes) {
          // Check if print sheet size fits within the stock sheet size
          if (printSheetSize.width > stockSheetSize.width || printSheetSize.height > stockSheetSize.height) {
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
          
          // For booklet with cover, adjust the calculation for inner pages
          let actualPrintSheetsNeeded = printSheetsNeeded;
          if (job.hasCover && job.totalPages) {
            const innerPages = Math.max(0, job.totalPages - 2); // Subtract cover pages
            const innerSheetsPerBooklet = Math.ceil(innerPages / (job.isDoubleSided ? 2 : 1));
            actualPrintSheetsNeeded = job.quantity * innerSheetsPerBooklet;
          }
          
          // Calculate how many print sheets fit per stock sheet
          const printSheetsPerStockSheet = Math.floor(stockSheetSize.width / printSheetSize.width) * 
                                         Math.floor(stockSheetSize.height / printSheetSize.height);
          
          if (printSheetsPerStockSheet <= 0) continue;
          
          const stockSheetsNeeded = Math.ceil(actualPrintSheetsNeeded / printSheetsPerStockSheet);
          
          const paperWeight = calculatePaperWeight(stockSheetSize.width, stockSheetSize.height, paperType.gsm, stockSheetsNeeded);
          const paperCost = calculatePaperCost(paperWeight, paperType.pricePerTon);
          
          // Calculate click cost based on double-sided printing
          const clickMultiplier = job.isDoubleSided ? 2 : 1;
          const clickCost = printSheetsNeeded * printSheetSize.clickCost * clickMultiplier;
          
          const setupCost = job.setupRequired ? machine.setupCost : 0;
          const totalCost = paperCost + clickCost + setupCost;
          const costPerUnit = totalCost / job.quantity;
          
          results.push({
            machine,
            printSheetSize,
            paperType,
            stockSheetSize,
            productsPerPrintSheet,
            printSheetsNeeded,
            printSheetsPerStockSheet,
            stockSheetsNeeded,
            paperWeight,
            paperCost,
            clickCost,
            setupCost,
            totalCost,
            costPerUnit,
            clickMultiplier
          });
        }
      }
    }
  }
  
  // Sort by total cost (best option first)
  return results.sort((a, b) => a.totalCost - b.totalCost);
};

export const calculateOptimalForPaperType = (job, paperType, machines, selectedMachine = null, selectedPrintSheetSize = null) => {
  const results = [];
  
  const machinesToEvaluate = selectedMachine ? [selectedMachine] : machines;
  
  for (const machine of machinesToEvaluate) {
    const printSheetSizesToEvaluate = selectedPrintSheetSize ? [selectedPrintSheetSize] : machine.printSheetSizes;
    
    for (const printSheetSize of printSheetSizesToEvaluate) {
      for (const stockSheetSize of paperType.stockSheetSizes) {
        // Check if print sheet size fits within the stock sheet size
        if (printSheetSize.width > stockSheetSize.width || printSheetSize.height > stockSheetSize.height) {
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
        
        // Calculate how many print sheets fit per stock sheet
        const printSheetsPerStockSheet = Math.floor(stockSheetSize.width / printSheetSize.width) * 
                                       Math.floor(stockSheetSize.height / printSheetSize.height);
        
        if (printSheetsPerStockSheet <= 0) continue;
        
        const stockSheetsNeeded = Math.ceil(printSheetsNeeded / printSheetsPerStockSheet);
        
        const paperWeight = calculatePaperWeight(stockSheetSize.width, stockSheetSize.height, paperType.gsm, stockSheetsNeeded);
        const paperCost = calculatePaperCost(paperWeight, paperType.pricePerTon);
        
        // Calculate click cost based on double-sided printing
        const clickMultiplier = job.isDoubleSided ? 2 : 1;
        const clickCost = printSheetsNeeded * printSheetSize.clickCost * clickMultiplier;
        
        const setupCost = job.setupRequired ? machine.setupCost : 0;
        const totalCost = paperCost + clickCost + setupCost;
        const costPerUnit = totalCost / job.quantity;
        
        // Calculate efficiency metrics
        const stockArea = (stockSheetSize.width * stockSheetSize.height) / 1000000; // m²
        const productArea = (job.finalWidth * job.finalHeight) / 1000000; // m²
        const wastePercentage = ((stockArea - (productArea * productsPerPrintSheet * printSheetsPerStockSheet)) / stockArea) * 100;
        
        results.push({
          machine,
          printSheetSize,
          paperType,
          stockSheetSize,
          productsPerPrintSheet,
          printSheetsNeeded,
          printSheetsPerStockSheet,
          stockSheetsNeeded,
          paperWeight,
          paperCost,
          clickCost,
          setupCost,
          totalCost,
          costPerUnit,
          stockArea,
          productArea,
          wastePercentage,
          clickMultiplier
        });
      }
    }
  }
  
  // Sort by total cost first, then by waste percentage (lower is better)
  return results.sort((a, b) => {
    if (Math.abs(a.totalCost - b.totalCost) < 0.01) {
      return a.wastePercentage - b.wastePercentage;
    }
    return a.totalCost - b.totalCost;
  });
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
  
  for (const paperType of paperTypes) {
    for (const stockSheetSize of paperType.stockSheetSizes) {
      // Check if print sheet size fits within the stock sheet size
      if (printSheetSize.width > stockSheetSize.width || printSheetSize.height > stockSheetSize.height) {
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
      
      // Calculate how many print sheets fit per stock sheet
      const printSheetsPerStockSheet = Math.floor(stockSheetSize.width / printSheetSize.width) * 
                                     Math.floor(stockSheetSize.height / printSheetSize.height);
      
      if (printSheetsPerStockSheet <= 0) continue;
      
      const stockSheetsNeeded = Math.ceil(printSheetsNeeded / printSheetsPerStockSheet);
      
      const paperWeight = calculatePaperWeight(stockSheetSize.width, stockSheetSize.height, paperType.gsm, stockSheetsNeeded);
      const paperCost = calculatePaperCost(paperWeight, paperType.pricePerTon);
      
      // Calculate click cost based on double-sided printing
      const clickMultiplier = job.isDoubleSided ? 2 : 1;
      const clickCost = printSheetsNeeded * printSheetSize.clickCost * clickMultiplier;
      
      const setupCost = job.setupRequired ? machine.setupCost : 0;
      const totalCost = paperCost + clickCost + setupCost;
      const costPerUnit = totalCost / job.quantity;
      
      results.push({
        machine,
        printSheetSize,
        paperType,
        stockSheetSize,
        productsPerPrintSheet,
        printSheetsNeeded,
        printSheetsPerStockSheet,
        stockSheetsNeeded,
        paperWeight,
        paperCost,
        clickCost,
        setupCost,
        totalCost,
        costPerUnit,
        clickMultiplier
      });
    }
  }
  
  // Sort by total cost (best option first)
  return results.sort((a, b) => a.totalCost - b.totalCost);
};

// Helper function to get all stock sheet sizes for all paper types
export const getAllStockSheetSizes = (paperTypes) => {
  const allSizes = [];
  paperTypes.forEach(paperType => {
    paperType.stockSheetSizes.forEach(stockSize => {
      allSizes.push({
        ...stockSize,
        paperType: paperType.name,
        gsm: paperType.gsm,
        pricePerTon: paperType.pricePerTon
      });
    });
  });
  return allSizes;
};