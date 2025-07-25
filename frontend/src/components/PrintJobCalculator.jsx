import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Checkbox } from './ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Calculator, FileText, Award, Settings, CheckCircle } from 'lucide-react';
import { useToast } from '../hooks/use-toast';
import { findOptimalPrintSheetSize, calculateOptimalForPaperType } from '../data/mockData';

const PrintJobCalculator = ({ paperTypes, machines }) => {
  const [jobData, setJobData] = useState({
    productName: '',
    finalWidth: '',
    finalHeight: '',
    marginTop: '3',
    marginRight: '3',
    marginBottom: '3',
    marginLeft: '3',
    quantity: '',
    isColor: false,
    setupRequired: true
  });
  const [selectedPaperType, setSelectedPaperType] = useState(null);
  const [selectedMachine, setSelectedMachine] = useState(null);
  const [selectedSheetSize, setSelectedSheetSize] = useState(null);
  const [results, setResults] = useState(null);
  const [showOptimalOnly, setShowOptimalOnly] = useState(true);
  const { toast } = useToast();

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!jobData.productName || !jobData.finalWidth || !jobData.finalHeight || !jobData.quantity) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    const job = {
      productName: jobData.productName,
      finalWidth: parseFloat(jobData.finalWidth),
      finalHeight: parseFloat(jobData.finalHeight),
      marginTop: parseFloat(jobData.marginTop),
      marginRight: parseFloat(jobData.marginRight),
      marginBottom: parseFloat(jobData.marginBottom),
      marginLeft: parseFloat(jobData.marginLeft),
      quantity: parseInt(jobData.quantity),
      isColor: jobData.isColor,
      setupRequired: jobData.setupRequired
    };

    let calculationResults;
    
    if (selectedPaperType) {
      // Calculate optimal for specific paper type - auto-select best stock sheet size
      const paperType = paperTypes.find(p => p.id === selectedPaperType);
      const machine = selectedMachine ? machines.find(m => m.id === selectedMachine) : null;
      const printSheetSize = selectedSheetSize && machine ? machine.printSheetSizes.find(s => s.id === selectedSheetSize) : null;
      
      calculationResults = calculateOptimalForPaperType(job, paperType, machines, machine, printSheetSize);
    } else {
      // Find optimal combinations across all paper types
      calculationResults = findOptimalPrintSheetSize(job, paperTypes, machines);
    }
    
    if (calculationResults.length === 0) {
      toast({
        title: "Error",
        description: "No suitable paper type, machine, and sheet size combination found for this job",
        variant: "destructive"
      });
      return;
    }

    setResults({ 
      job, 
      calculations: calculationResults, 
      selectedPaperType: selectedPaperType ? paperTypes.find(p => p.id === selectedPaperType) : null
    });
    
    toast({
      title: "Success",
      description: selectedPaperType ? 
        `Job calculated for ${paperTypes.find(p => p.id === selectedPaperType).name} with optimal stock sheet selection` :
        "Job calculation completed successfully across all paper types"
    });
  };

  const resetForm = () => {
    setJobData({
      productName: '',
      finalWidth: '',
      finalHeight: '',
      marginTop: '3',
      marginRight: '3',
      marginBottom: '3',
      marginLeft: '3',
      quantity: '',
      isColor: false,
      setupRequired: true
    });
    setSelectedPaperType(null);
    setSelectedMachine(null);
    setSelectedSheetSize(null);
    setResults(null);
  };

  const handleMachineChange = (machineId) => {
    setSelectedMachine(machineId);
    setSelectedSheetSize(null); // Reset sheet size when machine changes
  };

  const handlePaperTypeChange = (paperTypeId) => {
    setSelectedPaperType(paperTypeId);
  };

  const getAvailableSheetSizes = () => {
    if (!selectedMachine) return [];
    const machine = machines.find(m => m.id === selectedMachine);
    return machine ? machine.printSheetSizes : [];
  };

  const displayResults = showOptimalOnly && results ? results.calculations.slice(0, 3) : results?.calculations || [];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator size={20} />
            Print Job Calculator
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label htmlFor="productName">Product Name *</Label>
                <Input
                  id="productName"
                  value={jobData.productName}
                  onChange={(e) => setJobData({ ...jobData, productName: e.target.value })}
                  placeholder="e.g., Business Cards, Brochures"
                />
              </div>
              <div>
                <Label htmlFor="finalWidth">Final Width (mm) *</Label>
                <Input
                  id="finalWidth"
                  type="number"
                  value={jobData.finalWidth}
                  onChange={(e) => setJobData({ ...jobData, finalWidth: e.target.value })}
                  placeholder="85"
                />
              </div>
              <div>
                <Label htmlFor="finalHeight">Final Height (mm) *</Label>
                <Input
                  id="finalHeight"
                  type="number"
                  value={jobData.finalHeight}
                  onChange={(e) => setJobData({ ...jobData, finalHeight: e.target.value })}
                  placeholder="55"
                />
              </div>
              <div>
                <Label htmlFor="marginTop">Top Margin (mm)</Label>
                <Input
                  id="marginTop"
                  type="number"
                  value={jobData.marginTop}
                  onChange={(e) => setJobData({ ...jobData, marginTop: e.target.value })}
                  placeholder="3"
                />
              </div>
              <div>
                <Label htmlFor="marginRight">Right Margin (mm)</Label>
                <Input
                  id="marginRight"
                  type="number"
                  value={jobData.marginRight}
                  onChange={(e) => setJobData({ ...jobData, marginRight: e.target.value })}
                  placeholder="3"
                />
              </div>
              <div>
                <Label htmlFor="marginBottom">Bottom Margin (mm)</Label>
                <Input
                  id="marginBottom"
                  type="number"
                  value={jobData.marginBottom}
                  onChange={(e) => setJobData({ ...jobData, marginBottom: e.target.value })}
                  placeholder="3"
                />
              </div>
              <div>
                <Label htmlFor="marginLeft">Left Margin (mm)</Label>
                <Input
                  id="marginLeft"
                  type="number"
                  value={jobData.marginLeft}
                  onChange={(e) => setJobData({ ...jobData, marginLeft: e.target.value })}
                  placeholder="3"
                />
              </div>
              <div className="col-span-2">
                <Label htmlFor="quantity">Quantity *</Label>
                <Input
                  id="quantity"
                  type="number"
                  value={jobData.quantity}
                  onChange={(e) => setJobData({ ...jobData, quantity: e.target.value })}
                  placeholder="1000"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div>
                <Label htmlFor="paperType">Paper Type (Optional - auto-selects optimal stock sheet)</Label>
                <Select value={selectedPaperType} onValueChange={handlePaperTypeChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a paper type (or leave blank for all options)" />
                  </SelectTrigger>
                  <SelectContent>
                    {paperTypes.map((paperType) => (
                      <SelectItem key={paperType.id} value={paperType.id}>
                        {paperType.name} ({paperType.gsm} GSM)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedPaperType && (
                  <p className="text-sm text-green-600 mt-1 flex items-center gap-1">
                    <CheckCircle size={14} />
                    System will automatically select the most cost-efficient stock sheet size
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="machine">Machine (Optional)</Label>
                <Select value={selectedMachine} onValueChange={handleMachineChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a machine" />
                  </SelectTrigger>
                  <SelectContent>
                    {machines.map((machine) => (
                      <SelectItem key={machine.id} value={machine.id}>
                        {machine.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="sheetSize">Print Sheet Size (Optional)</Label>
                <Select 
                  value={selectedSheetSize} 
                  onValueChange={setSelectedSheetSize}
                  disabled={!selectedMachine}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a sheet size" />
                  </SelectTrigger>
                  <SelectContent>
                    {getAvailableSheetSizes().map((sheetSize) => (
                      <SelectItem key={sheetSize.id} value={sheetSize.id}>
                        {sheetSize.name} ({sheetSize.width} × {sheetSize.height} mm)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="isColor"
                  checked={jobData.isColor}
                  onCheckedChange={(checked) => setJobData({ ...jobData, isColor: checked })}
                />
                <Label htmlFor="isColor">Color Printing</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="setupRequired"
                  checked={jobData.setupRequired}
                  onCheckedChange={(checked) => setJobData({ ...jobData, setupRequired: checked })}
                />
                <Label htmlFor="setupRequired">Setup Required</Label>
              </div>
            </div>

            <div className="flex gap-2">
              <Button type="submit" className="flex items-center gap-2">
                <Calculator size={16} />
                Calculate Cost
              </Button>
              <Button type="button" variant="outline" onClick={resetForm}>
                Reset
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {results && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText size={20} />
              Calculation Results for "{results.job.productName}"
            </CardTitle>
            <div className="flex items-center gap-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="showOptimalOnly"
                  checked={showOptimalOnly}
                  onCheckedChange={setShowOptimalOnly}
                />
                <Label htmlFor="showOptimalOnly">Show only top 3 optimal solutions</Label>
              </div>
              <span className="text-sm text-gray-600">
                {results.calculations.length} total options found
              </span>
              {results.selectedPaperType && (
                <span className="text-sm text-blue-600 font-medium">
                  Paper Type: {results.selectedPaperType.name}
                </span>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {displayResults.map((result, index) => (
                <div key={index} className={`p-4 border rounded-lg ${index === 0 ? 'border-green-500 bg-green-50' : 'border-gray-200'}`}>
                  {index === 0 && (
                    <div className="mb-3">
                      <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold text-green-800 bg-green-200 rounded">
                        <Award size={12} />
                        {results.selectedPaperType ? 'OPTIMAL STOCK SHEET' : 'RECOMMENDED'}
                      </span>
                    </div>
                  )}
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div>
                      <span className="font-medium text-gray-700">Paper Type:</span>
                      <p className="text-sm">{result.paperType.name}</p>
                      <p className="text-xs text-gray-500">{result.paperType.gsm} GSM | ${result.paperType.pricePerTon}/ton</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Stock Sheet:</span>
                      <p className="text-sm font-semibold text-blue-600">{result.stockSheetSize.name}</p>
                      <p className="text-xs text-gray-500">{result.stockSheetSize.width} × {result.stockSheetSize.height} mm</p>
                      {results.selectedPaperType && index === 0 && (
                        <p className="text-xs text-green-600 flex items-center gap-1">
                          <CheckCircle size={12} />
                          Auto-selected
                        </p>
                      )}
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Machine:</span>
                      <p className="text-sm">{result.machine.name}</p>
                      <p className="text-xs text-gray-500">Setup: ${result.machine.setupCost}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Print Sheet:</span>
                      <p className="text-sm">{result.printSheetSize.name}</p>
                      <p className="text-xs text-gray-500">
                        {result.printSheetSize.width} × {result.printSheetSize.height} mm
                        {result.printSheetSize.duplexSupport && <span className="text-green-600 ml-1">| Duplex</span>}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div>
                      <span className="font-medium text-gray-700">Products per Print Sheet:</span>
                      <p className="text-sm">{result.productsPerPrintSheet}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Print Sheets per Stock Sheet:</span>
                      <p className="text-sm">{result.printSheetsPerStockSheet}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Print Sheets Needed:</span>
                      <p className="text-sm">{result.printSheetsNeeded}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Stock Sheets Needed:</span>
                      <p className="text-sm">{result.stockSheetsNeeded}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div>
                      <span className="font-medium text-gray-700">Paper Weight:</span>
                      <p className="text-sm">{result.paperWeight.toFixed(2)} kg</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Paper Cost:</span>
                      <p className="text-sm">${result.paperCost.toFixed(2)}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Click Cost:</span>
                      <p className="text-sm">${result.printSheetSize.clickCost}/click</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Total Click Cost:</span>
                      <p className="text-sm">${result.clickCost.toFixed(2)}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div>
                      <span className="font-medium text-gray-700">Setup Cost:</span>
                      <p className="text-sm">${result.setupCost.toFixed(2)}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Stock Efficiency:</span>
                      <p className="text-sm">{((result.productsPerPrintSheet * result.printSheetsPerStockSheet / result.stockSheetsNeeded) * 100).toFixed(1)}%</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Stock Area:</span>
                      <p className="text-sm">{((result.stockSheetSize.width * result.stockSheetSize.height) / 1000000).toFixed(3)} m²</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Print Area:</span>
                      <p className="text-sm">{((result.printSheetSize.width * result.printSheetSize.height) / 1000000).toFixed(3)} m²</p>
                    </div>
                  </div>

                  {result.wastePercentage !== undefined && (
                    <div className="grid grid-cols-2 gap-4 mb-4 p-3 bg-gray-100 rounded">
                      <div>
                        <span className="font-medium text-gray-700">Paper Waste:</span>
                        <p className="text-sm">{result.wastePercentage.toFixed(1)}%</p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Optimization Reason:</span>
                        <p className="text-sm text-green-600">
                          {results.selectedPaperType ? 'Lowest cost + minimal waste' : 'Best overall cost efficiency'}
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                    <div>
                      <span className="font-bold text-lg text-gray-800">Total Cost:</span>
                      <p className="text-xl font-bold text-green-600">${result.totalCost.toFixed(2)}</p>
                    </div>
                    <div>
                      <span className="font-bold text-lg text-gray-800">Cost per Unit:</span>
                      <p className="text-xl font-bold text-blue-600">${result.costPerUnit.toFixed(4)}</p>
                    </div>
                  </div>
                </div>
              ))}
              
              {showOptimalOnly && results.calculations.length > 3 && (
                <div className="text-center">
                  <Button 
                    variant="outline" 
                    onClick={() => setShowOptimalOnly(false)}
                    className="flex items-center gap-2"
                  >
                    <Settings size={16} />
                    Show All {results.calculations.length} Options
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default PrintJobCalculator;