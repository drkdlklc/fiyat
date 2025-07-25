import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Checkbox } from './ui/checkbox';
import { Calculator, FileText } from 'lucide-react';
import { useToast } from '../hooks/use-toast';
import { findBestPaperAndMachine } from '../data/mockData';

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
  const [results, setResults] = useState(null);
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

    const calculationResults = findBestPaperAndMachine(job, paperTypes, machines);
    
    if (calculationResults.length === 0) {
      toast({
        title: "Error",
        description: "No suitable paper and machine combination found for this job",
        variant: "destructive"
      });
      return;
    }

    setResults({ job, calculations: calculationResults });
    toast({
      title: "Success",
      description: "Job calculation completed successfully"
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
    setResults(null);
  };

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
              <div className="col-span-2 flex items-center space-x-4">
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
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {results.calculations.map((result, index) => (
                <div key={index} className={`p-4 border rounded-lg ${index === 0 ? 'border-green-500 bg-green-50' : 'border-gray-200'}`}>
                  {index === 0 && (
                    <div className="mb-3">
                      <span className="inline-block px-2 py-1 text-xs font-semibold text-green-800 bg-green-200 rounded">
                        BEST OPTION
                      </span>
                    </div>
                  )}
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div>
                      <span className="font-medium text-gray-700">Paper:</span>
                      <p className="text-sm">{result.paper.name}</p>
                      <p className="text-xs text-gray-500">{result.paper.width} × {result.paper.height} mm, {result.paper.gsm} GSM</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Machine:</span>
                      <p className="text-sm">{result.machine.name}</p>
                      <p className="text-xs text-gray-500">Max: {result.machine.maxSheetWidth} × {result.machine.maxSheetHeight} mm</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Products per Sheet:</span>
                      <p className="text-sm">{result.productsPerSheet}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Sheets Needed:</span>
                      <p className="text-sm">{result.sheetsNeeded}</p>
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
                      <p className="text-sm">${result.clickCost.toFixed(2)}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Setup Cost:</span>
                      <p className="text-sm">${result.setupCost.toFixed(2)}</p>
                    </div>
                  </div>

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
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default PrintJobCalculator;