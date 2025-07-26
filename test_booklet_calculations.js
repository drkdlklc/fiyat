#!/usr/bin/env node

const fs = require('fs');

// Read the mockData.js file
const mockDataPath = '/app/frontend/src/data/mockData.js';
let mockDataContent = fs.readFileSync(mockDataPath, 'utf8');

// Remove export statements to make it runnable in Node.js
mockDataContent = mockDataContent.replace(/export const/g, 'const');
mockDataContent = mockDataContent.replace(/export {[^}]*};?/g, '');

// Evaluate the code
eval(mockDataContent);

console.log('🧮 Testing "1 sheet = 4 pages" Calculation System');
console.log('=' * 60);

// Test parameters from the review request: 2 booklets, 8 pages per booklet
const testJob = {
  productName: "Test Booklet",
  finalWidth: 100,
  finalHeight: 150,
  marginTop: 3,
  marginRight: 3,
  marginBottom: 3,
  marginLeft: 3,
  quantity: 2, // 2 booklets
  isDoubleSided: true,
  setupRequired: false,
  isBookletMode: true,
  coverSetupRequired: false,
  totalPages: 8 // 8 pages per booklet
};

// Mock paper types and machines
const testPaperTypes = [
  {
    id: 1,
    name: "80g Standard",
    gsm: 80,
    pricePerTon: 850,
    stockSheetSizes: [
      { id: 1, name: "A4", width: 210, height: 297, unit: "mm" },
      { id: 2, name: "A3", width: 297, height: 420, unit: "mm" },
      { id: 3, name: "SRA3", width: 320, height: 450, unit: "mm" }
    ]
  }
];

const testMachines = [
  {
    id: 1,
    name: "Heidelberg SM 52",
    setupCost: 45,
    printSheetSizes: [
      { id: 1, name: "SRA3", width: 320, height: 450, clickCost: 0.08, duplexSupport: true, unit: "mm" }
    ]
  }
];

console.log('\n📋 Test Parameters:');
console.log('- Product: 100mm x 150mm');
console.log('- Booklets: 2');
console.log('- Pages per booklet: 8');
console.log('- Paper type: 80g Standard');
console.log('- Machine: Heidelberg SM 52');

// Test Cover Calculation
console.log('\n🎯 Testing Cover Calculation:');
try {
  const coverResult = calculateCoverCost(testJob, testPaperTypes[0], testMachines[0]);
  
  if (coverResult) {
    console.log('✅ Cover calculation successful');
    console.log('   Cover sheets needed:', coverResult.coverSheetsNeeded);
    console.log('   Total cover pages:', coverResult.totalCoverPages);
    console.log('   Stock sheets needed:', coverResult.stockSheetsNeeded);
    
    // Expected: 2 cover sheets (1 per booklet), 8 total cover pages (2 * 4)
    const expectedCoverSheets = 2;
    const expectedCoverPages = 8;
    
    if (coverResult.coverSheetsNeeded === expectedCoverSheets) {
      console.log('✅ Cover sheets calculation CORRECT');
    } else {
      console.log('❌ Cover sheets calculation ERROR: Expected', expectedCoverSheets, 'got', coverResult.coverSheetsNeeded);
    }
    
    if (coverResult.totalCoverPages === expectedCoverPages) {
      console.log('✅ Cover pages calculation CORRECT');
    } else {
      console.log('❌ Cover pages calculation ERROR: Expected', expectedCoverPages, 'got', coverResult.totalCoverPages);
    }
  } else {
    console.log('❌ Cover calculation failed');
  }
} catch (error) {
  console.log('❌ Cover calculation error:', error.message);
}

// Test Inner Pages Calculation
console.log('\n🎯 Testing Inner Pages Calculation:');
try {
  const innerResult = calculateInnerPagesCost(testJob, testPaperTypes[0], testMachines[0]);
  
  if (innerResult) {
    console.log('✅ Inner pages calculation successful');
    console.log('   Inner pages per booklet:', innerResult.innerPagesPerBooklet);
    console.log('   Inner sheets per booklet:', innerResult.innerSheetsPerBooklet);
    console.log('   Total inner sheets needed:', innerResult.totalInnerSheetsNeeded);
    console.log('   Total inner pages:', innerResult.totalInnerPages);
    
    // Expected: 4 inner pages per booklet (8 - 4 cover), 1 inner sheet per booklet (4/4), 2 total inner sheets, 8 total inner pages
    const expectedInnerPagesPerBooklet = 4;
    const expectedInnerSheetsPerBooklet = 1;
    const expectedTotalInnerSheets = 2;
    const expectedTotalInnerPages = 8;
    
    if (innerResult.innerPagesPerBooklet === expectedInnerPagesPerBooklet) {
      console.log('✅ Inner pages per booklet calculation CORRECT');
    } else {
      console.log('❌ Inner pages per booklet ERROR: Expected', expectedInnerPagesPerBooklet, 'got', innerResult.innerPagesPerBooklet);
    }
    
    if (innerResult.innerSheetsPerBooklet === expectedInnerSheetsPerBooklet) {
      console.log('✅ Inner sheets per booklet calculation CORRECT');
    } else {
      console.log('❌ Inner sheets per booklet ERROR: Expected', expectedInnerSheetsPerBooklet, 'got', innerResult.innerSheetsPerBooklet);
    }
    
    if (innerResult.totalInnerSheetsNeeded === expectedTotalInnerSheets) {
      console.log('✅ Total inner sheets calculation CORRECT');
    } else {
      console.log('❌ Total inner sheets ERROR: Expected', expectedTotalInnerSheets, 'got', innerResult.totalInnerSheetsNeeded);
    }
    
    if (innerResult.totalInnerPages === expectedTotalInnerPages) {
      console.log('✅ Total inner pages calculation CORRECT');
    } else {
      console.log('❌ Total inner pages ERROR: Expected', expectedTotalInnerPages, 'got', innerResult.totalInnerPages);
    }
  } else {
    console.log('❌ Inner pages calculation failed');
  }
} catch (error) {
  console.log('❌ Inner pages calculation error:', error.message);
}

// Summary
console.log('\n📊 Summary:');
console.log('Expected Results:');
console.log('- Cover: 2 cover sheets needed (1 per booklet), each providing 4 pages');
console.log('- Inner pages: 4 inner pages per booklet (8 total - 4 cover), need 1 inner sheet per booklet, total 2 inner sheets');
console.log('- Total sheets per booklet: 2 sheets (1 cover + 1 inner)');
console.log('- Total pages per booklet: 8 pages (4 cover + 4 inner)');