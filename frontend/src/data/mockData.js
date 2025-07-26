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
      },
      {
        id: 10,
        name: "Large Format",
        width: 330,
        height: 695,
        clickCost: 0.10,
        duplexSupport: true,
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
      },
      {
        id: 11,
        name: "Large Format",
        width: 330,
        height: 695,
        clickCost: 0.08,
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
      },
      {
        id: 12,
        name: "Large Format",
        width: 330,
        height: 695,
        clickCost: 0.09,
        duplexSupport: true,
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
  if (!job.isBookletMode || !coverPaperType || !coverMachine) {
    return null;
  }

  // For booklet mode: 
  // Each booklet needs 1 cover sheet
  // Each cover sheet provides 4 pages when folded
  const coverSheetsNeeded = job.quantity; // 1 cover sheet per booklet
  
  // Booklet cover special calculation:
  // The length of the selected binding edge should be doubled (cover wraps around)
  let effectiveWidth, effectiveHeight;
  
  if (job.bindingEdge === 'short') {
    // Short edge binding: double the height (short edge)
    effectiveWidth = job.finalWidth;
    effectiveHeight = job.finalHeight * 2; // Double the binding edge dimension
  } else {
    // Long edge binding: double the width (long edge)
    effectiveWidth = job.finalHeight; // Use height as width
    effectiveHeight = job.finalWidth * 2; // Double the width, use as height
  }
  
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
      
      // Calculate how many cover sheets can fit per print sheet using effective dimensions
      const coverSheetsPerPrintSheet = calculateProductsPerSheet(
        printSheetSize.width, printSheetSize.height, effectiveWidth, effectiveHeight, margins
      );
      
      if (coverSheetsPerPrintSheet <= 0) continue;
      
      const printSheetsNeeded = Math.ceil(coverSheetsNeeded / coverSheetsPerPrintSheet);
      
      // Calculate how many print sheets fit per stock sheet (try both orientations)
      const orientation1 = Math.floor(stockSheetSize.width / printSheetSize.width) * 
                           Math.floor(stockSheetSize.height / printSheetSize.height);
      const orientation2 = Math.floor(stockSheetSize.width / printSheetSize.height) * 
                           Math.floor(stockSheetSize.height / printSheetSize.width);
      const printSheetsPerStockSheet = Math.max(orientation1, orientation2);
      
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
          coverSheetsPerPrintSheet,
          printSheetsNeeded: printSheetsNeeded, // Use correct value
          printSheetsPerStockSheet,
          stockSheetsNeeded,
          paperWeight,
          paperCost,
          clickCost,
          setupCost,
          totalCost,
          totalPages: job.totalPages,
          coverSheetsNeeded,
          totalCoverPages: coverSheetsNeeded * 4, // Each cover sheet provides 4 pages
          bookletQuantity: job.quantity,
          bindingEdge: job.bindingEdge,
          effectiveWidth,
          effectiveHeight
        };
      }
    }
  }
  
  return bestCoverOption;
};

export const calculateInnerPagesCost = (job, innerPaperType, innerMachine) => {
  if (!job.isBookletMode || !innerPaperType || !innerMachine) {
    return null;
  }

  // For booklet mode with 1 sheet = 2 pages (front and back):
  // Total pages per booklet = job.totalPages
  // Cover pages per booklet = 4 (from 1 cover sheet that provides 4 pages when folded)
  // Inner pages per booklet = total pages - cover pages
  const innerPagesPerBooklet = Math.max(0, job.totalPages - 4);
  
  // Calculate inner sheets needed per booklet 
  // With doubled booklet dimensions: 1 sheet = 4 pages (like covers)
  const innerSheetsPerBooklet = Math.ceil(innerPagesPerBooklet / 4);
  
  // Total inner sheets needed for all booklets
  const totalInnerSheetsNeeded = job.quantity * innerSheetsPerBooklet;
  
  if (totalInnerSheetsNeeded <= 0) return null;
  
  // Determine the orientation based on binding edge with doubling logic (same as covers)
  // Short edge binding: double the height (short edge)
  // Long edge binding: double the width (long edge) 
  let effectiveWidth, effectiveHeight;
  
  if (job.bindingEdge === 'short') {
    // Short edge binding: double the height (short edge)
    effectiveWidth = job.finalWidth;
    effectiveHeight = job.finalHeight * 2; // Double the binding edge dimension
  } else {
    // Long edge binding: double the width (long edge)
    effectiveWidth = job.finalHeight; // Use height as width
    effectiveHeight = job.finalWidth * 2; // Double the width, use as height
  }
  
  // Find the best stock sheet size for inner pages
  let bestInnerOption = null;
  let lowestCost = Infinity;

  for (const stockSheetSize of innerPaperType.stockSheetSizes) {
    for (const printSheetSize of innerMachine.printSheetSizes) {
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
      
      // Calculate how many inner sheets can fit per print sheet using effective dimensions
      const innerSheetsPerPrintSheet = calculateProductsPerSheet(
        printSheetSize.width, printSheetSize.height, effectiveWidth, effectiveHeight, margins
      );
      
      if (innerSheetsPerPrintSheet <= 0) continue;
      
      const printSheetsNeeded = Math.ceil(totalInnerSheetsNeeded / innerSheetsPerPrintSheet);
      
      // Calculate how many print sheets fit per stock sheet (try both orientations)
      const orientation1 = Math.floor(stockSheetSize.width / printSheetSize.width) * 
                           Math.floor(stockSheetSize.height / printSheetSize.height);
      const orientation2 = Math.floor(stockSheetSize.width / printSheetSize.height) * 
                           Math.floor(stockSheetSize.height / printSheetSize.width);
      const printSheetsPerStockSheet = Math.max(orientation1, orientation2);
      
      if (printSheetsPerStockSheet <= 0) continue;
      
      const stockSheetsNeeded = Math.ceil(printSheetsNeeded / printSheetsPerStockSheet);
      
      const paperWeight = calculatePaperWeight(stockSheetSize.width, stockSheetSize.height, innerPaperType.gsm, stockSheetsNeeded);
      const paperCost = calculatePaperCost(paperWeight, innerPaperType.pricePerTon);
      
      // Calculate click cost based on double-sided printing
      const clickMultiplier = job.isDoubleSided ? 2 : 1;
      const clickCost = printSheetsNeeded * printSheetSize.clickCost * clickMultiplier;
      
      const setupCost = job.setupRequired ? innerMachine.setupCost : 0;
      const totalCost = paperCost + clickCost + setupCost;
      
      if (totalCost < lowestCost) {
        lowestCost = totalCost;
        bestInnerOption = {
          paperType: innerPaperType,
          machine: innerMachine,
          printSheetSize,
          stockSheetSize,
          innerSheetsPerPrintSheet,
          printSheetsNeeded,
          printSheetsPerStockSheet,
          stockSheetsNeeded,
          paperWeight,
          paperCost,
          clickCost,
          setupCost,
          totalCost,
          innerPagesPerBooklet,
          innerSheetsPerBooklet,
          totalInnerSheetsNeeded,
          totalInnerPages: totalInnerSheetsNeeded * 2, // Each inner sheet provides 2 pages
          bookletQuantity: job.quantity,
          clickMultiplier,
          bindingEdge: job.bindingEdge,
          effectiveWidth,
          effectiveHeight
        };
      }
    }
  }
  
  return bestInnerOption;
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
          
          // Calculate how many print sheets fit per stock sheet (try both orientations)
          const orientation1 = Math.floor(stockSheetSize.width / printSheetSize.width) * 
                               Math.floor(stockSheetSize.height / printSheetSize.height);
          const orientation2 = Math.floor(stockSheetSize.width / printSheetSize.height) * 
                               Math.floor(stockSheetSize.height / printSheetSize.width);
          const printSheetsPerStockSheet = Math.max(orientation1, orientation2);
          
          if (printSheetsPerStockSheet <= 0) continue;
          
          const stockSheetsNeeded = Math.ceil(actualPrintSheetsNeeded / printSheetsPerStockSheet);
          
          const paperWeight = calculatePaperWeight(stockSheetSize.width, stockSheetSize.height, paperType.gsm, stockSheetsNeeded);
          const paperCost = calculatePaperCost(paperWeight, paperType.pricePerTon);
          
          // Calculate click cost based on double-sided printing
          const clickMultiplier = job.isDoubleSided ? 2 : 1;
          const clickCost = actualPrintSheetsNeeded * printSheetSize.clickCost * clickMultiplier;
          
          const setupCost = job.setupRequired ? machine.setupCost : 0;
          const totalCost = paperCost + clickCost + setupCost;
          const costPerUnit = totalCost / job.quantity;
          
          results.push({
            machine,
            printSheetSize,
            paperType,
            stockSheetSize,
            productsPerPrintSheet,
            printSheetsNeeded: actualPrintSheetsNeeded,
            printSheetsPerStockSheet,
            stockSheetsNeeded,
            paperWeight,
            paperCost,
            clickCost,
            setupCost,
            totalCost,
            costPerUnit,
            clickMultiplier,
            isBooklet: job.hasCover,
            totalPages: job.totalPages || 0,
            innerPages: job.hasCover ? Math.max(0, (job.totalPages || 0) - 2) : 0
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
        
        // Use the same binding edge logic as booklet mode for consistency
        let effectiveWidth, effectiveHeight;
        
        if (job.bindingEdge === 'short') {
          // Short edge binding: double the height (short edge)
          effectiveWidth = job.finalWidth;
          effectiveHeight = job.finalHeight * 2; // Double the binding edge dimension
        } else {
          // Long edge binding: double the width (long edge)
          effectiveWidth = job.finalHeight; // Use height as width
          effectiveHeight = job.finalWidth * 2; // Double the width, use as height
        }
        
        const productsPerPrintSheet = calculateProductsPerSheet(
          printSheetSize.width, printSheetSize.height, effectiveWidth, effectiveHeight, margins
        );
        
        if (productsPerPrintSheet <= 0) continue;
        
        const printSheetsNeeded = calculateSheetsNeeded(job.quantity, productsPerPrintSheet);
        
        // Calculate how many print sheets fit per stock sheet (try both orientations)
        const orientation1 = Math.floor(stockSheetSize.width / printSheetSize.width) * 
                             Math.floor(stockSheetSize.height / printSheetSize.height);
        const orientation2 = Math.floor(stockSheetSize.width / printSheetSize.height) * 
                             Math.floor(stockSheetSize.height / printSheetSize.width);
        const printSheetsPerStockSheet = Math.max(orientation1, orientation2);
        
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
          clickMultiplier,
          bindingEdge: job.bindingEdge,
          effectiveWidth,
          effectiveHeight
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

export const calculateMultiPartCost = (job, multiPartConfigs, paperTypes, machines, isInnerPages = false) => {
  const results = [];
  let totalCost = 0;

  for (const config of multiPartConfigs) {
    if (!config.paperTypeId && !config.machineId) continue;
    if (!config.pageCount || parseInt(config.pageCount) <= 0) continue;

    const pageCount = parseInt(config.pageCount);
    const paperType = config.paperTypeId ? paperTypes.find(p => p.id === config.paperTypeId) : null;
    const machine = config.machineId ? machines.find(m => m.id === config.machineId) : null;

    if (!paperType && !machine) continue;

    // Create a modified job for this part
    const partJob = {
      ...job,
      quantity: isInnerPages ? job.quantity * pageCount : pageCount
    };

    let partResults = [];
    
    if (paperType && machine) {
      // Both paper type and machine specified
      partResults = calculateOptimalForPaperType(partJob, paperType, [machine]);
    } else if (paperType) {
      // Only paper type specified
      partResults = calculateOptimalForPaperType(partJob, paperType, machines);
    } else if (machine) {
      // Only machine specified
      partResults = findOptimalPrintSheetSize(partJob, paperTypes, [machine]);
    }

    if (partResults.length > 0) {
      const bestResult = partResults[0];
      totalCost += bestResult.totalCost;
      results.push({
        ...bestResult,
        partPageCount: pageCount,
        partNumber: results.length + 1,
        isMultiPart: true
      });
    }
  }

  return {
    results,
    totalCost,
    totalPartCount: results.length
  };
};

export const calculateMultiPartInnerPagesCost = (job, multiPartConfigs, paperTypes, machines, isBookletMode = false) => {
  const results = [];
  let totalCost = 0;

  for (const config of multiPartConfigs) {
    if ((!config.paperTypeId && !config.machineId) || !config.pageCount || parseInt(config.pageCount) <= 0) {
      continue;
    }

    const pageCount = parseInt(config.pageCount);
    const paperType = config.paperTypeId ? paperTypes.find(p => p.id === config.paperTypeId) : null;
    const machine = config.machineId ? machines.find(m => m.id === config.machineId) : null;

    if (!paperType && !machine) continue;

    // For booklet mode inner pages: 1 sheet = 4 pages (with doubled dimensions)
    // Calculate total sheets needed for this part
    const sheetsNeededPerBooklet = Math.ceil(pageCount / 4);
    const totalSheetsForPart = isBookletMode ? job.quantity * sheetsNeededPerBooklet : sheetsNeededPerBooklet;

    // Determine the orientation based on binding edge with doubling logic (same as covers)
    // Short edge binding: double the height (short edge)
    // Long edge binding: double the width (long edge)
    let effectiveWidth, effectiveHeight;
    
    if (job.bindingEdge === 'short') {
      // Short edge binding: double the height (short edge)
      effectiveWidth = job.finalWidth;
      effectiveHeight = job.finalHeight * 2; // Double the binding edge dimension
    } else {
      // Long edge binding: double the width (long edge)
      effectiveWidth = job.finalHeight; // Use height as width
      effectiveHeight = job.finalWidth * 2; // Double the width, use as height
    }

    let bestOption = null;
    let lowestCost = Infinity;

    const paperTypesToCheck = paperType ? [paperType] : paperTypes;
    const machinesToCheck = machine ? [machine] : machines;

    for (const pt of paperTypesToCheck) {
      for (const m of machinesToCheck) {
        for (const stockSheetSize of pt.stockSheetSizes) {
          for (const printSheetSize of m.printSheetSizes) {
            if (printSheetSize.width > stockSheetSize.width || printSheetSize.height > stockSheetSize.height) {
              continue;
            }

            const margins = {
              top: job.marginTop,
              right: job.marginRight,
              bottom: job.marginBottom,
              left: job.marginLeft
            };

            // Calculate how many sheets can fit per print sheet using effective dimensions
            const sheetsPerPrintSheet = calculateProductsPerSheet(
              printSheetSize.width, printSheetSize.height, effectiveWidth, effectiveHeight, margins
            );

            if (sheetsPerPrintSheet <= 0) continue;

            const printSheetsNeeded = Math.ceil(totalSheetsForPart / sheetsPerPrintSheet);
            const orientation1 = Math.floor(stockSheetSize.width / printSheetSize.width) * 
                                 Math.floor(stockSheetSize.height / printSheetSize.height);
            const orientation2 = Math.floor(stockSheetSize.width / printSheetSize.height) * 
                                 Math.floor(stockSheetSize.height / printSheetSize.width);
            const printSheetsPerStockSheet = Math.max(orientation1, orientation2);

            if (printSheetsPerStockSheet <= 0) continue;

            const stockSheetsNeeded = Math.ceil(printSheetsNeeded / printSheetsPerStockSheet);
            const paperWeight = calculatePaperWeight(stockSheetSize.width, stockSheetSize.height, pt.gsm, stockSheetsNeeded);
            const paperCost = calculatePaperCost(paperWeight, pt.pricePerTon);

            const clickMultiplier = job.isDoubleSided ? 2 : 1;
            const clickCost = printSheetsNeeded * printSheetSize.clickCost * clickMultiplier;
            const setupCost = job.setupRequired ? m.setupCost : 0;
            const totalCost = paperCost + clickCost + setupCost;

            if (totalCost < lowestCost) {
              lowestCost = totalCost;
              bestOption = {
                paperType: pt,
                machine: m,
                printSheetSize,
                stockSheetSize,
                sheetsPerPrintSheet,
                printSheetsNeeded,
                printSheetsPerStockSheet,
                stockSheetsNeeded,
                paperWeight,
                paperCost,
                clickCost,
                setupCost,
                totalCost,
                partPageCount: pageCount,
                sheetsNeededPerBooklet,
                totalSheetsForPart,
                partNumber: results.length + 1,
                isMultiPart: true,
                clickMultiplier,
                bindingEdge: job.bindingEdge,
                effectiveWidth,
                effectiveHeight
              };
            }
          }
        }
      }
    }

    if (bestOption) {
      totalCost += bestOption.totalCost;
      results.push(bestOption);
    }
  }

  return {
    results,
    totalCost,
    totalPartCount: results.length
  };
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
      
      // Use the same binding edge logic as booklet mode for consistency
      let effectiveWidth, effectiveHeight;
      
      if (job.bindingEdge === 'short') {
        // Short edge binding: double the height (short edge)
        effectiveWidth = job.finalWidth;
        effectiveHeight = job.finalHeight * 2; // Double the binding edge dimension
      } else {
        // Long edge binding: double the width (long edge)
        effectiveWidth = job.finalHeight; // Use height as width
        effectiveHeight = job.finalWidth * 2; // Double the width, use as height
      }
      
      const productsPerPrintSheet = calculateProductsPerSheet(
        printSheetSize.width, printSheetSize.height, effectiveWidth, effectiveHeight, margins
      );
      
      if (productsPerPrintSheet <= 0) continue;
      
      const printSheetsNeeded = calculateSheetsNeeded(job.quantity, productsPerPrintSheet);
      
      // Calculate how many print sheets fit per stock sheet (try both orientations)
      const orientation1 = Math.floor(stockSheetSize.width / printSheetSize.width) * 
                           Math.floor(stockSheetSize.height / printSheetSize.height);
      const orientation2 = Math.floor(stockSheetSize.width / printSheetSize.height) * 
                           Math.floor(stockSheetSize.height / printSheetSize.width);
      const printSheetsPerStockSheet = Math.max(orientation1, orientation2);
      
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