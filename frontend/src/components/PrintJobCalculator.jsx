import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Checkbox } from './ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Calculator, FileText, Award, Settings, CheckCircle, Plus, Minus } from 'lucide-react';
import { useToast } from '../hooks/use-toast';
import { findOptimalPrintSheetSize, calculateOptimalForPaperType, calculateCoverCost, calculateInnerPagesCost, calculateMultiPartCost, calculateMultiPartInnerPagesCost } from '../data/mockData';

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
    isDoubleSided: false,
    setupRequired: false,
    isBookletMode: false,
    hasCover: true, // Default to true to maintain current behavior
    coverSetupRequired: false,
    totalPages: '',
    useMultiPartConfiguration: false,
    useMultiPartInnerConfiguration: false,
    bindingEdge: 'short' // 'short' or 'long'
  });
  const [selectedPaperType, setSelectedPaperType] = useState(null);
  const [selectedMachine, setSelectedMachine] = useState(null);
  const [selectedSheetSize, setSelectedSheetSize] = useState(null);
  const [selectedInnerPaperType, setSelectedInnerPaperType] = useState(null);
  const [selectedInnerMachine, setSelectedInnerMachine] = useState(null);
  const [selectedCoverPaperType, setSelectedCoverPaperType] = useState(null);
  const [selectedCoverMachine, setSelectedCoverMachine] = useState(null);
  const [multiPartPaperTypes, setMultiPartPaperTypes] = useState([
    { id: 1, paperTypeId: null, pageCount: '' }
  ]);
  const [multiPartMachines, setMultiPartMachines] = useState([
    { id: 1, machineId: null, pageCount: '' }
  ]);
  const [multiPartInnerPaperTypes, setMultiPartInnerPaperTypes] = useState([
    { id: 1, paperTypeId: null, pageCount: '' }
  ]);
  const [multiPartInnerMachines, setMultiPartInnerMachines] = useState([
    { id: 1, machineId: null, pageCount: '' }
  ]);
  const [multiPartConfigurations, setMultiPartConfigurations] = useState([
    { id: 1, paperTypeId: null, machineId: null, pageCount: '' }
  ]);
  const [multiPartInnerConfigurations, setMultiPartInnerConfigurations] = useState([
    { id: 1, paperTypeId: null, machineId: null, pageCount: '' }
  ]);
  const [results, setResults] = useState(null);
  const [showOptimalOnly, setShowOptimalOnly] = useState(true);
  const { toast } = useToast();

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Validate required fields
    if (!jobData.productName || !jobData.finalWidth || !jobData.finalHeight || !jobData.quantity) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    // Validate multi-part configurations
    if (jobData.useMultiPartConfiguration) {
      const totalMultiPartPages = multiPartConfigurations.reduce((sum, config) => {
        const pageCount = parseInt(config.pageCount) || 0;
        return sum + pageCount;
      }, 0);
      
      if (totalMultiPartPages !== parseInt(jobData.quantity)) {
        toast({
          title: "Validation Error",
          description: `Total pages in multi-part configuration (${totalMultiPartPages}) must equal the quantity (${jobData.quantity})`,
          variant: "destructive"
        });
        return;
      }
    }
    
    if (jobData.isBookletMode && jobData.useMultiPartInnerConfiguration) {
      const totalInnerPages = Math.max(0, parseInt(jobData.totalPages) - 4); // Subtract 4 cover pages (1 cover = 4 pages)
      const totalMultiPartInnerPages = multiPartInnerConfigurations.reduce((sum, config) => {
        const pageCount = parseInt(config.pageCount) || 0;
        return sum + pageCount;
      }, 0);
      
      if (totalMultiPartInnerPages !== totalInnerPages) {
        toast({
          title: "Validation Error",
          description: `Total pages in inner multi-part configuration (${totalMultiPartInnerPages}) must equal the inner pages (${totalInnerPages})`,
          variant: "destructive"
        });
        return;
      }
    }

    if (jobData.isBookletMode && !jobData.totalPages) {
      toast({
        title: "Error",
        description: "Please enter the total number of pages for the booklet",
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
      isDoubleSided: jobData.isDoubleSided,
      setupRequired: jobData.setupRequired,
      isBookletMode: jobData.isBookletMode,
      hasCover: jobData.hasCover,
      coverSetupRequired: jobData.coverSetupRequired,
      totalPages: jobData.totalPages ? parseInt(jobData.totalPages) : 0,
      bindingEdge: jobData.bindingEdge // Add missing binding edge
    };

    let calculationResults;
    let coverResults = null;
    let innerPagesResults = null;
    let multiPartResults = null;
    
    if (job.isBookletMode) {
      // Booklet mode - calculate cover and inner pages separately
      if (job.hasCover && selectedCoverPaperType && selectedCoverMachine) {
        const coverPaperType = paperTypes.find(p => p.id === selectedCoverPaperType);
        const coverMachine = machines.find(m => m.id === selectedCoverMachine);
        coverResults = calculateCoverCost(job, coverPaperType, coverMachine);
      }
      
      // Handle multi-part inner pages
      if (jobData.useMultiPartInnerConfiguration) {
        multiPartResults = calculateMultiPartInnerPagesCost(job, multiPartInnerConfigurations, paperTypes, machines, true);
      } else if (selectedInnerPaperType && selectedInnerMachine) {
        // Single inner paper type and machine
        const innerPaperType = paperTypes.find(p => p.id === selectedInnerPaperType);
        const innerMachine = machines.find(m => m.id === selectedInnerMachine);
        // Modify job to treat all pages as inner pages when no cover
        const modifiedJob = { ...job };
        if (!job.hasCover) {
          modifiedJob.totalPages = job.totalPages; // All pages are inner pages
        }
        innerPagesResults = calculateInnerPagesCost(modifiedJob, innerPaperType, innerMachine);
      }
      
      // For booklet mode, we don't use the normal calculation results
      calculationResults = [];
    } else {
      // Normal mode - handle multi-part configurations
      if (jobData.useMultiPartConfiguration) {
        multiPartResults = calculateMultiPartCost(job, multiPartConfigurations, paperTypes, machines);
        calculationResults = multiPartResults.results;
      } else {
        // Single configuration - original calculation logic
        if (selectedPaperType) {
          const paperType = paperTypes.find(p => p.id === selectedPaperType);
          const machine = selectedMachine ? machines.find(m => m.id === selectedMachine) : null;
          const printSheetSize = selectedSheetSize && machine ? machine.printSheetSizes.find(s => s.id === parseInt(selectedSheetSize)) : null;
          
          calculationResults = calculateOptimalForPaperType(job, paperType, machines, machine, printSheetSize);
        } else {
          calculationResults = findOptimalPrintSheetSize(job, paperTypes, machines);
        }
      }
    }
    
    if (!job.isBookletMode && calculationResults.length === 0 && !multiPartResults) {
      toast({
        title: "Error",
        description: "No suitable paper type, machine, and sheet size combination found for this job",
        variant: "destructive"
      });
      return;
    }

    if (job.isBookletMode && !coverResults && !innerPagesResults && !multiPartResults) {
      toast({
        title: "Error",
        description: "Please select paper types and machines for both cover and inner pages",
        variant: "destructive"
      });
      return;
    }

    setResults({ 
      job, 
      calculations: calculationResults, 
      selectedPaperType: selectedPaperType ? paperTypes.find(p => p.id === selectedPaperType) : null,
      coverResults,
      innerPagesResults,
      multiPartResults
    });
    
    toast({
      title: "Success",
      description: selectedPaperType ? 
        `Job calculated for ${paperTypes.find(p => p.id === selectedPaperType)?.name || 'selected paper type'} with optimal stock sheet selection` :
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
      isDoubleSided: false,
      setupRequired: false,
      isBookletMode: false,
      coverSetupRequired: false,
      totalPages: '',
      useMultiPartConfiguration: false,
      useMultiPartInnerConfiguration: false,
      bindingEdge: 'short'
    });
    setSelectedPaperType(null);
    setSelectedMachine(null);
    setSelectedSheetSize(null);
    setSelectedInnerPaperType(null);
    setSelectedInnerMachine(null);
    setSelectedCoverPaperType(null);
    setSelectedCoverMachine(null);
    setMultiPartPaperTypes([{ id: 1, paperTypeId: null, pageCount: '' }]);
    setMultiPartMachines([{ id: 1, machineId: null, pageCount: '' }]);
    setMultiPartInnerPaperTypes([{ id: 1, paperTypeId: null, pageCount: '' }]);
    setMultiPartInnerMachines([{ id: 1, machineId: null, pageCount: '' }]);
    setMultiPartConfigurations([{ id: 1, paperTypeId: null, machineId: null, pageCount: '' }]);
    setMultiPartInnerConfigurations([{ id: 1, paperTypeId: null, machineId: null, pageCount: '' }]);
    setResults(null);
  };

  const handleMachineChange = (machineId) => {
    setSelectedMachine(machineId ? parseInt(machineId) : null);
    setSelectedSheetSize(null); // Reset sheet size when machine changes
  };

  const handlePaperTypeChange = (paperTypeId) => {
    setSelectedPaperType(paperTypeId ? parseInt(paperTypeId) : null);
  };

  const handleCoverPaperTypeChange = (paperTypeId) => {
    setSelectedCoverPaperType(paperTypeId ? parseInt(paperTypeId) : null);
  };

  const handleCoverMachineChange = (machineId) => {
    setSelectedCoverMachine(machineId ? parseInt(machineId) : null);
  };

  const handleInnerPaperTypeChange = (paperTypeId) => {
    setSelectedInnerPaperType(paperTypeId ? parseInt(paperTypeId) : null);
  };

  const handleInnerMachineChange = (machineId) => {
    setSelectedInnerMachine(machineId ? parseInt(machineId) : null);
  };

  // Multi-part paper type handlers
  const addMultiPartPaperType = () => {
    if (multiPartPaperTypes.length < 3) {
      setMultiPartPaperTypes([...multiPartPaperTypes, { 
        id: Date.now(), 
        paperTypeId: null, 
        pageCount: '' 
      }]);
    }
  };

  const removeMultiPartPaperType = (id) => {
    if (multiPartPaperTypes.length > 1) {
      setMultiPartPaperTypes(multiPartPaperTypes.filter(item => item.id !== id));
    }
  };

  const updateMultiPartPaperType = (id, field, value) => {
    setMultiPartPaperTypes(multiPartPaperTypes.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  // Multi-part machine handlers
  const addMultiPartMachine = () => {
    if (multiPartMachines.length < 3) {
      setMultiPartMachines([...multiPartMachines, { 
        id: Date.now(), 
        machineId: null, 
        pageCount: '' 
      }]);
    }
  };

  const removeMultiPartMachine = (id) => {
    if (multiPartMachines.length > 1) {
      setMultiPartMachines(multiPartMachines.filter(item => item.id !== id));
    }
  };

  const updateMultiPartMachine = (id, field, value) => {
    setMultiPartMachines(multiPartMachines.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  // Multi-part inner paper type handlers
  const addMultiPartInnerPaperType = () => {
    if (multiPartInnerPaperTypes.length < 3) {
      setMultiPartInnerPaperTypes([...multiPartInnerPaperTypes, { 
        id: Date.now(), 
        paperTypeId: null, 
        pageCount: '' 
      }]);
    }
  };

  const removeMultiPartInnerPaperType = (id) => {
    if (multiPartInnerPaperTypes.length > 1) {
      setMultiPartInnerPaperTypes(multiPartInnerPaperTypes.filter(item => item.id !== id));
    }
  };

  const updateMultiPartInnerPaperType = (id, field, value) => {
    setMultiPartInnerPaperTypes(multiPartInnerPaperTypes.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  // Multi-part inner machine handlers
  const addMultiPartInnerMachine = () => {
    if (multiPartInnerMachines.length < 3) {
      setMultiPartInnerMachines([...multiPartInnerMachines, { 
        id: Date.now(), 
        machineId: null, 
        pageCount: '' 
      }]);
    }
  };

  const removeMultiPartInnerMachine = (id) => {
    if (multiPartInnerMachines.length > 1) {
      setMultiPartInnerMachines(multiPartInnerMachines.filter(item => item.id !== id));
    }
  };

  const updateMultiPartInnerMachine = (id, field, value) => {
    setMultiPartInnerMachines(multiPartInnerMachines.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  // Unified multi-part configuration handlers
  const addMultiPartConfiguration = () => {
    if (multiPartConfigurations.length < 3) {
      setMultiPartConfigurations([...multiPartConfigurations, { 
        id: Date.now(), 
        paperTypeId: null, 
        machineId: null, 
        pageCount: '' 
      }]);
    }
  };

  const removeMultiPartConfiguration = (id) => {
    if (multiPartConfigurations.length > 1) {
      setMultiPartConfigurations(multiPartConfigurations.filter(item => item.id !== id));
    }
  };

  const updateMultiPartConfiguration = (id, field, value) => {
    setMultiPartConfigurations(multiPartConfigurations.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  // Unified multi-part inner configuration handlers
  const addMultiPartInnerConfiguration = () => {
    if (multiPartInnerConfigurations.length < 3) {
      setMultiPartInnerConfigurations([...multiPartInnerConfigurations, { 
        id: Date.now(), 
        paperTypeId: null, 
        machineId: null, 
        pageCount: '' 
      }]);
    }
  };

  const removeMultiPartInnerConfiguration = (id) => {
    if (multiPartInnerConfigurations.length > 1) {
      setMultiPartInnerConfigurations(multiPartInnerConfigurations.filter(item => item.id !== id));
    }
  };

  const updateMultiPartInnerConfiguration = (id, field, value) => {
    setMultiPartInnerConfigurations(multiPartInnerConfigurations.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    ));
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
            <div className="p-4 border rounded-lg bg-gray-50">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="isBookletMode"
                  checked={jobData.isBookletMode}
                  onCheckedChange={(checked) => setJobData({ ...jobData, isBookletMode: checked })}
                />
                <Label htmlFor="isBookletMode" className="font-semibold">
                  Booklet Mode
                </Label>
              </div>
              <p className="text-sm text-gray-600 mt-1">
                {jobData.isBookletMode 
                  ? "Calculate costs for multi-page booklets with covers" 
                  : "Calculate costs for single-page or simple print jobs"
                }
              </p>
            </div>

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
            </div>

            {jobData.isBookletMode && (
              <div className="p-4 border rounded-lg bg-blue-50">
                <h3 className="font-semibold text-lg mb-3 text-blue-800">
                  Booklet Configuration
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="totalPages">Total Pages (including cover)</Label>
                      <Input
                        id="totalPages"
                        type="number"
                        value={jobData.totalPages}
                        onChange={(e) => setJobData({ ...jobData, totalPages: e.target.value })}
                        placeholder="e.g., 16, 20, 24"
                        min="4"
                        step="4"
                      />
                      <p className="text-sm text-gray-500 mt-1">Must be multiple of 4 for proper booklet layout</p>
                    </div>
                    
                    <div>
                      <Label htmlFor="bindingEdge">Binding Edge</Label>
                      <Select value={jobData.bindingEdge} onValueChange={(value) => setJobData({ ...jobData, bindingEdge: value })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select binding edge" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="short">Short Edge Binding</SelectItem>
                          <SelectItem value="long">Long Edge Binding</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-sm text-gray-500 mt-1">
                        {jobData.bindingEdge === 'short' ? 'Portrait orientation binding' : 'Landscape orientation binding'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 mt-6">
                    <Checkbox
                      id="coverSetupRequired"
                      checked={jobData.coverSetupRequired}
                      onCheckedChange={(checked) => setJobData({ ...jobData, coverSetupRequired: checked })}
                    />
                    <Label htmlFor="coverSetupRequired">Cover Setup Required</Label>
                  </div>
                </div>
                <p className="text-sm text-blue-600 mt-2">
                  <strong>Booklet Mode:</strong> Quantity will be treated as number of booklets. Cover and inner pages calculated separately.
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
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
                <Label htmlFor="quantity">
                  {jobData.isBookletMode ? 'Number of Booklets *' : 'Quantity *'}
                </Label>
                <Input
                  id="quantity"
                  type="number"
                  value={jobData.quantity}
                  onChange={(e) => setJobData({ ...jobData, quantity: e.target.value })}
                  placeholder={jobData.isBookletMode ? "100" : "1000"}
                />
              </div>
            </div>

            {jobData.isBookletMode && (
              <>
                <div className="p-4 border rounded-lg bg-blue-50">
                  <h3 className="font-semibold text-lg mb-3 text-blue-800">Cover Options</h3>
                  <div className="flex items-center space-x-2 mb-3">
                    <Checkbox
                      id="hasCover"
                      checked={jobData.hasCover}
                      onCheckedChange={(checked) => setJobData({ ...jobData, hasCover: checked })}
                    />
                    <Label htmlFor="hasCover" className="font-medium">Has Cover</Label>
                  </div>
                  <p className="text-sm text-blue-600">
                    {jobData.hasCover 
                      ? "Cover will be calculated separately with different paper/machine options."
                      : "All pages will be treated as inner pages with the same specifications."
                    }
                  </p>
                </div>

                {jobData.hasCover && (
                  <div className="p-4 border rounded-lg bg-green-50">
                    <h3 className="font-semibold text-lg mb-3 text-green-800">Cover Configuration</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="coverPaperType">Cover Paper Type</Label>
                        <Select value={selectedCoverPaperType?.toString()} onValueChange={handleCoverPaperTypeChange}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select cover paper type" />
                          </SelectTrigger>
                          <SelectContent>
                            {paperTypes.map((paperType) => (
                              <SelectItem key={paperType.id} value={paperType.id.toString()}>
                                {paperType.name} ({paperType.gsm} GSM)
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="coverMachine">Cover Printing Machine</Label>
                        <Select value={selectedCoverMachine?.toString()} onValueChange={handleCoverMachineChange}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select cover machine" />
                          </SelectTrigger>
                          <SelectContent>
                            {machines.map((machine) => (
                              <SelectItem key={machine.id} value={machine.id.toString()}>
                                {machine.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <p className="text-sm text-green-600 mt-2">
                      Covers will be printed separately. Each booklet needs 1 cover (4 pages when folded).
                    </p>
                  </div>
                )}

                <div className="p-4 border rounded-lg bg-orange-50">
                  <h3 className="font-semibold text-lg mb-3 text-orange-800">Inner Pages Configuration</h3>
                  {!jobData.useMultiPartInnerConfiguration && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="innerPaperType">Inner Paper Type</Label>
                        <Select value={selectedInnerPaperType?.toString()} onValueChange={handleInnerPaperTypeChange}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select inner paper type" />
                          </SelectTrigger>
                          <SelectContent>
                            {paperTypes.map((paperType) => (
                              <SelectItem key={paperType.id} value={paperType.id.toString()}>
                                {paperType.name} ({paperType.gsm} GSM)
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="innerMachine">Inner Pages Machine</Label>
                        <Select value={selectedInnerMachine?.toString()} onValueChange={handleInnerMachineChange}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select inner machine" />
                          </SelectTrigger>
                          <SelectContent>
                            {machines.map((machine) => (
                              <SelectItem key={machine.id} value={machine.id.toString()}>
                                {machine.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}

                  <div className="mt-4 space-y-3">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="useMultiPartInnerConfiguration"
                        checked={jobData.useMultiPartInnerConfiguration}
                        onCheckedChange={(checked) => setJobData({ ...jobData, useMultiPartInnerConfiguration: checked })}
                      />
                      <Label htmlFor="useMultiPartInnerConfiguration">Use Different Paper Types & Machines for Inner Pages</Label>
                    </div>

                    {jobData.useMultiPartInnerConfiguration && (
                      <div className="p-3 border rounded-lg bg-gradient-to-r from-blue-50 to-purple-50">
                        <h4 className="font-semibold text-blue-800 mb-2">Inner Pages Multi-Part Configuration</h4>
                        {multiPartInnerConfigurations.map((part, index) => (
                          <div key={part.id} className="grid grid-cols-4 gap-3 mb-2">
                            <div>
                              <Label>Paper Type {index + 1}</Label>
                              <Select 
                                value={part.paperTypeId?.toString() || ''} 
                                onValueChange={(value) => updateMultiPartInnerConfiguration(part.id, 'paperTypeId', value ? parseInt(value) : null)}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select paper" />
                                </SelectTrigger>
                                <SelectContent>
                                  {paperTypes.map((paperType) => (
                                    <SelectItem key={paperType.id} value={paperType.id.toString()}>
                                      {paperType.name} ({paperType.gsm} GSM)
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label>Machine {index + 1}</Label>
                              <Select 
                                value={part.machineId?.toString() || ''} 
                                onValueChange={(value) => updateMultiPartInnerConfiguration(part.id, 'machineId', value ? parseInt(value) : null)}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select machine" />
                                </SelectTrigger>
                                <SelectContent>
                                  {machines.map((machine) => (
                                    <SelectItem key={machine.id} value={machine.id.toString()}>
                                      {machine.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label>Page Count</Label>
                              <Input
                                type="number"
                                value={part.pageCount}
                                onChange={(e) => updateMultiPartInnerConfiguration(part.id, 'pageCount', e.target.value)}
                                placeholder="e.g., 10"
                              />
                            </div>
                            <div className="flex items-end gap-1">
                              {multiPartInnerConfigurations.length < 3 && (
                                <Button 
                                  type="button" 
                                  variant="outline" 
                                  size="sm"
                                  onClick={addMultiPartInnerConfiguration}
                                >
                                  <Plus size={14} />
                                </Button>
                              )}
                              {multiPartInnerConfigurations.length > 1 && (
                                <Button 
                                  type="button" 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => removeMultiPartInnerConfiguration(part.id)}
                                >
                                  <Minus size={14} />
                                </Button>
                              )}
                            </div>
                          </div>
                        ))}
                        <p className="text-sm text-blue-600 mt-2">
                          Each part can have a different paper type and machine combination. The system will optimize the sheet size selection for each pairing.
                        </p>
                      </div>
                    )}
                  </div>

                  <p className="text-sm text-orange-600 mt-2">
                    Inner pages will be calculated as: {jobData.totalPages ? `(${jobData.totalPages} total - 4 cover = ${Math.max(0, jobData.totalPages - 4)} inner pages) × ${jobData.quantity || 'quantity'} booklets` : '(total pages - 4 cover pages) × quantity booklets'}
                    <br />
                    <em>Note: 1 cover = 4 pages, 1 inner sheet = 2 pages</em>
                  </p>
                </div>
              </>
            )}

            {!jobData.isBookletMode && (
              <div className="grid grid-cols-1 gap-4">
                {!jobData.useMultiPartConfiguration && (
                  <div>
                    <Label htmlFor="paperType">Paper Type (Optional - auto-selects optimal stock sheet)</Label>
                    <Select value={selectedPaperType?.toString()} onValueChange={handlePaperTypeChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a paper type (or leave blank for all options)" />
                      </SelectTrigger>
                      <SelectContent>
                        {paperTypes.map((paperType) => (
                          <SelectItem key={paperType.id} value={paperType.id.toString()}>
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
                )}

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="useMultiPartConfiguration"
                    checked={jobData.useMultiPartConfiguration}
                    onCheckedChange={(checked) => setJobData({ ...jobData, useMultiPartConfiguration: checked })}
                  />
                  <Label htmlFor="useMultiPartConfiguration">Use Different Paper Types & Machines for Different Parts</Label>
                </div>

                {jobData.useMultiPartConfiguration && (
                  <div className="p-4 border rounded-lg bg-gradient-to-r from-blue-50 to-purple-50">
                    <h4 className="font-semibold text-blue-800 mb-3">Multi-Part Configuration</h4>
                    {multiPartConfigurations.map((part, index) => (
                      <div key={part.id} className="grid grid-cols-4 gap-4 mb-3">
                        <div>
                          <Label>Paper Type for Part {index + 1}</Label>
                          <Select 
                            value={part.paperTypeId?.toString() || ''} 
                            onValueChange={(value) => updateMultiPartConfiguration(part.id, 'paperTypeId', value ? parseInt(value) : null)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select paper type" />
                            </SelectTrigger>
                            <SelectContent>
                              {paperTypes.map((paperType) => (
                                <SelectItem key={paperType.id} value={paperType.id.toString()}>
                                  {paperType.name} ({paperType.gsm} GSM)
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>Machine for Part {index + 1}</Label>
                          <Select 
                            value={part.machineId?.toString() || ''} 
                            onValueChange={(value) => updateMultiPartConfiguration(part.id, 'machineId', value ? parseInt(value) : null)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select machine" />
                            </SelectTrigger>
                            <SelectContent>
                              {machines.map((machine) => (
                                <SelectItem key={machine.id} value={machine.id.toString()}>
                                  {machine.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>Page Count</Label>
                          <Input
                            type="number"
                            value={part.pageCount}
                            onChange={(e) => updateMultiPartConfiguration(part.id, 'pageCount', e.target.value)}
                            placeholder="e.g., 100"
                          />
                        </div>
                        <div className="flex items-end gap-2">
                          {multiPartConfigurations.length < 3 && (
                            <Button 
                              type="button" 
                              variant="outline" 
                              size="sm"
                              onClick={addMultiPartConfiguration}
                            >
                              <Plus size={16} />
                            </Button>
                          )}
                          {multiPartConfigurations.length > 1 && (
                            <Button 
                              type="button" 
                              variant="outline" 
                              size="sm"
                              onClick={() => removeMultiPartConfiguration(part.id)}
                            >
                              <Minus size={16} />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                    <p className="text-sm text-blue-600 mt-2">
                      Each part can have a different paper type and machine combination. The system will optimize the sheet size selection for each pairing.
                    </p>
                  </div>
                )}
              </div>
            )}

            {!jobData.isBookletMode && !jobData.useMultiPartConfiguration && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="machine">Machine (Optional)</Label>
                  <Select value={selectedMachine?.toString()} onValueChange={handleMachineChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a machine" />
                    </SelectTrigger>
                    <SelectContent>
                      {machines.map((machine) => (
                        <SelectItem key={machine.id} value={machine.id.toString()}>
                          {machine.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="sheetSize">Print Sheet Size (Optional)</Label>
                  <Select 
                    value={selectedSheetSize?.toString()} 
                    onValueChange={(value) => setSelectedSheetSize(value ? parseInt(value) : null)}
                    disabled={!selectedMachine}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a sheet size" />
                    </SelectTrigger>
                    <SelectContent>
                      {getAvailableSheetSizes().map((sheetSize) => (
                        <SelectItem key={sheetSize.id} value={sheetSize.id.toString()}>
                          {sheetSize.name} ({sheetSize.width} × {sheetSize.height} mm)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="isDoubleSided"
                  checked={jobData.isDoubleSided}
                  onCheckedChange={(checked) => setJobData({ ...jobData, isDoubleSided: checked })}
                />
                <Label htmlFor="isDoubleSided">Double-sided Printing</Label>
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
              <span className="text-sm text-blue-600 font-medium">
                {results.job.isDoubleSided ? 'Double-sided' : 'Single-sided'} printing
                {results.job.isBookletMode && ` | Booklet (${results.job.totalPages} pages, ${results.job.quantity} booklets)`}
              </span>
              {results.selectedPaperType && (
                <span className="text-sm text-blue-600 font-medium">
                  Paper Type: {results.selectedPaperType.name}
                </span>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {results.job.isBookletMode ? (
              <div className="space-y-6">
                {results.coverResults && (
                  <div className="p-4 border rounded-lg bg-green-50">
                    <h3 className="text-lg font-semibold text-green-800 mb-4">Cover Cost (1 cover = 4 pages)</h3>
                    
                    {/* Essential Information Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                      {/* Paper & Materials */}
                      <div className="space-y-4">
                        <h4 className="font-semibold text-gray-800 border-b pb-2">Paper & Materials</h4>
                        <div>
                          <span className="font-medium text-gray-700">Paper:</span>
                          <p className="text-sm font-semibold text-blue-600">{results.coverResults.paperType.name}</p>
                          <p className="text-xs text-gray-500">{results.coverResults.paperType.gsm}g/m² - ${results.coverResults.paperType.pricePerTon}/ton</p>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700">Stock Sheet:</span>
                          <p className="text-sm">{results.coverResults.stockSheetSize.name}</p>
                          <p className="text-xs text-gray-500">{results.coverResults.stockSheetSize.width} × {results.coverResults.stockSheetSize.height} mm</p>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700">Machine:</span>
                          <p className="text-sm">{results.coverResults.machine.name}</p>
                        </div>
                      </div>

                      {/* Configuration */}
                      <div className="space-y-4">
                        <h4 className="font-semibold text-gray-800 border-b pb-2">Configuration</h4>
                        <div>
                          <span className="font-medium text-gray-700">Binding Edge:</span>
                          <p className="text-sm">{results.coverResults.bindingEdge === 'short' ? 'Short Edge' : 'Long Edge'}</p>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700">Effective Size:</span>
                          <p className="text-sm">{results.coverResults.effectiveWidth} × {results.coverResults.effectiveHeight} mm</p>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700">Print Sheet:</span>
                          <p className="text-sm">{results.coverResults.printSheetSize.name}</p>
                          <p className="text-xs text-gray-500">{results.coverResults.printSheetSize.width} × {results.coverResults.printSheetSize.height} mm</p>
                        </div>
                      </div>

                      {/* Production Metrics */}
                      <div className="space-y-4">
                        <h4 className="font-semibold text-gray-800 border-b pb-2">Production</h4>
                        <div>
                          <span className="font-medium text-gray-700">Sheets per Print Sheet:</span>
                          <p className="text-sm">{results.coverResults.coversPerPrintSheet}</p>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700">Print Sheets Needed:</span>
                          <p className="text-sm">{results.coverResults.printSheetsNeeded}</p>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700">Total Inner Pages:</span>
                          <p className="text-sm">{results.coverResults.totalCoverPages}</p>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700">Print Sheets per Stock Sheet:</span>
                          <p className="text-sm">{results.coverResults.printSheetsPerStockSheet}</p>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700">Stock Sheets Needed:</span>
                          <p className="text-sm">{results.coverResults.stockSheetsNeeded}</p>
                        </div>
                      </div>
                    </div>

                    {/* Cost Information */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4 bg-gray-50 p-4 rounded-lg">
                      <div>
                        <span className="font-medium text-gray-700">Paper Weight:</span>
                        <p className="text-sm font-semibold">{results.coverResults.paperWeight.toFixed(2)} kg</p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Paper Cost:</span>
                        <p className="text-sm font-semibold text-green-600">${results.coverResults.paperCost.toFixed(2)}</p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Click Cost:</span>
                        <p className="text-sm font-semibold text-blue-600">${results.coverResults.clickCost.toFixed(2)}</p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Total Cost:</span>
                        <p className="text-sm font-bold text-gray-900">${results.coverResults.totalCost.toFixed(2)}</p>
                      </div>
                    </div>
                  </div>
                )}

                {results.innerPagesResults && !results.multiPartResults && (
                  <div className="p-4 border rounded-lg bg-orange-50">
                    <h3 className="text-lg font-semibold text-orange-800 mb-4">Inner Pages Cost (1 sheet = 4 pages)</h3>
                    
                    {/* Essential Information Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                      {/* Paper & Materials */}
                      <div className="space-y-4">
                        <h4 className="font-semibold text-gray-800 border-b pb-2">Paper & Materials</h4>
                        <div>
                          <span className="font-medium text-gray-700">Paper:</span>
                          <p className="text-sm font-semibold text-blue-600">{results.innerPagesResults.paperType.name}</p>
                          <p className="text-xs text-gray-500">{results.innerPagesResults.paperType.gsm}g/m² - ${results.innerPagesResults.paperType.pricePerTon}/ton</p>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700">Stock Sheet:</span>
                          <p className="text-sm">{results.innerPagesResults.stockSheetSize.name}</p>
                          <p className="text-xs text-gray-500">{results.innerPagesResults.stockSheetSize.width} × {results.innerPagesResults.stockSheetSize.height} mm</p>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700">Machine:</span>
                          <p className="text-sm">{results.innerPagesResults.machine.name}</p>
                        </div>
                      </div>

                      {/* Configuration */}
                      <div className="space-y-4">
                        <h4 className="font-semibold text-gray-800 border-b pb-2">Configuration</h4>
                        <div>
                          <span className="font-medium text-gray-700">Binding Edge:</span>
                          <p className="text-sm">{results.innerPagesResults.bindingEdge === 'short' ? 'Short Edge' : 'Long Edge'}</p>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700">Effective Size:</span>
                          <p className="text-sm">{results.innerPagesResults.effectiveWidth} × {results.innerPagesResults.effectiveHeight} mm</p>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700">Print Sheet:</span>
                          <p className="text-sm">{results.innerPagesResults.printSheetSize.name}</p>
                          <p className="text-xs text-gray-500">{results.innerPagesResults.printSheetSize.width} × {results.innerPagesResults.printSheetSize.height} mm</p>
                        </div>
                      </div>

                      {/* Production Metrics */}
                      <div className="space-y-4">
                        <h4 className="font-semibold text-gray-800 border-b pb-2">Production</h4>
                        <div>
                          <span className="font-medium text-gray-700">Sheets per Print Sheet:</span>
                          <p className="text-sm">{results.innerPagesResults.innerSheetsPerPrintSheet}</p>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700">Print Sheets Needed:</span>
                          <p className="text-sm">{results.innerPagesResults.printSheetsNeeded}</p>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700">Total Inner Pages:</span>
                          <p className="text-sm">{results.innerPagesResults.totalInnerPages}</p>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700">Print Sheets per Stock Sheet:</span>
                          <p className="text-sm">{results.innerPagesResults.printSheetsPerStockSheet}</p>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700">Stock Sheets Needed:</span>
                          <p className="text-sm">{results.innerPagesResults.stockSheetsNeeded}</p>
                        </div>
                      </div>
                    </div>

                    {/* Cost Information */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4 bg-gray-50 p-4 rounded-lg">
                      <div>
                        <span className="font-medium text-gray-700">Paper Weight:</span>
                        <p className="text-sm font-semibold">{results.innerPagesResults.paperWeight.toFixed(2)} kg</p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Paper Cost:</span>
                        <p className="text-sm font-semibold text-green-600">${results.innerPagesResults.paperCost.toFixed(2)}</p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Click Cost:</span>
                        <p className="text-sm font-semibold text-blue-600">${results.innerPagesResults.clickCost.toFixed(2)}</p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Total Cost:</span>
                        <p className="text-sm font-bold text-gray-900">${results.innerPagesResults.totalCost.toFixed(2)}</p>
                      </div>
                    </div>
                  </div>
                )}

                {results.multiPartResults && (
                  <div className="p-4 border rounded-lg bg-gradient-to-r from-orange-50 to-purple-50">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">Multi-Part Inner Pages Cost (1 sheet = 2 pages)</h3>
                    
                    {results.multiPartResults.results.map((part, index) => (
                      <div key={index} className="mb-4 p-3 border rounded-lg bg-white">
                        <h4 className="font-semibold text-gray-700 mb-3">Part {part.partNumber} - {part.partPageCount} pages</h4>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                          <div>
                            <span className="font-medium text-gray-700">Paper & Machine Pairing:</span>
                            <p className="text-sm font-semibold text-blue-600">{part.paperType.name} + {part.machine.name}</p>
                            <p className="text-xs text-gray-500">{part.paperType.gsm} GSM | Setup: ${part.machine.setupCost}</p>
                          </div>
                          <div>
                            <span className="font-medium text-gray-700">Optimal Print Sheet:</span>
                            <p className="text-sm">{part.printSheetSize.name}</p>
                            <p className="text-xs text-gray-500">{part.printSheetSize.width} × {part.printSheetSize.height} mm</p>
                          </div>
                          <div>
                            <span className="font-medium text-gray-700">Sheets per Print Sheet:</span>
                            <p className="text-sm">{part.sheetsPerPrintSheet}</p>
                            <p className="text-xs text-gray-500">{part.partPageCount} pages → {part.sheetsNeededPerBooklet} sheets</p>
                          </div>
                          <div>
                            <span className="font-medium text-gray-700">Print Sheets Needed:</span>
                            <p className="text-sm">{part.printSheetsNeeded}</p>
                            <p className="text-xs text-gray-500">{part.totalSheetsForPart} total sheets</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                          <div>
                            <span className="font-medium text-gray-700">Paper Cost:</span>
                            <p className="text-sm">${part.paperCost.toFixed(2)}</p>
                          </div>
                          <div>
                            <span className="font-medium text-gray-700">Click Cost:</span>
                            <p className="text-sm">${part.clickCost.toFixed(2)}</p>
                            {part.clickMultiplier > 1 && (
                              <p className="text-xs text-blue-600">Double-sided (2x)</p>
                            )}
                          </div>
                          <div>
                            <span className="font-medium text-gray-700">Setup Cost:</span>
                            <p className="text-sm">${part.setupCost.toFixed(2)}</p>
                          </div>
                          <div>
                            <span className="font-medium text-gray-700">Part Total:</span>
                            <p className="text-sm font-bold text-green-600">${part.totalCost.toFixed(2)}</p>
                          </div>
                        </div>
                      </div>
                    ))}

                    <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                      <div>
                        <span className="font-bold text-lg text-gray-800">Total Multi-Part Cost:</span>
                        <p className="text-xl font-bold text-orange-600">${results.multiPartResults.totalCost.toFixed(2)}</p>
                      </div>
                      <div>
                        <span className="font-bold text-lg text-gray-800">Multi-Part Cost per {results.job.isBookletMode ? 'Booklet' : 'Unit'}:</span>
                        <p className="text-xl font-bold text-blue-600">
                          ${(results.multiPartResults.totalCost / results.job.quantity).toFixed(4)}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {results.coverResults && (results.innerPagesResults || results.multiPartResults) && (
                  <div className="p-4 border-2 border-blue-500 rounded-lg bg-blue-50">
                    <h3 className="text-lg font-semibold text-blue-800 mb-4">Total Booklet Cost Summary</h3>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      <div>
                        <span className="font-medium text-gray-700">Number of Booklets:</span>
                        <p className="text-sm">{results.job.quantity}</p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Pages per Booklet:</span>
                        <p className="text-sm">{results.job.totalPages}</p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Cover Cost:</span>
                        <p className="text-sm">${results.coverResults.totalCost.toFixed(2)}</p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Inner Pages Cost:</span>
                        <p className="text-sm">
                          ${(results.innerPagesResults ? results.innerPagesResults.totalCost : results.multiPartResults.totalCost).toFixed(2)}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                      <div>
                        <span className="font-bold text-xl text-gray-800">Total Cost:</span>
                        <p className="text-2xl font-bold text-blue-600">
                          ${(results.coverResults.totalCost + (results.innerPagesResults ? results.innerPagesResults.totalCost : results.multiPartResults.totalCost)).toFixed(2)}
                        </p>
                      </div>
                      <div>
                        <span className="font-bold text-xl text-gray-800">Cost per Booklet:</span>
                        <p className="text-2xl font-bold text-green-600">
                          ${((results.coverResults.totalCost + (results.innerPagesResults ? results.innerPagesResults.totalCost : results.multiPartResults.totalCost)) / results.job.quantity).toFixed(4)}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-6">
                {results.multiPartResults && results.multiPartResults.results.length > 0 ? (
                  <div className="p-4 border rounded-lg bg-gradient-to-r from-blue-50 to-purple-50">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">Multi-Part Configuration Cost Breakdown</h3>
                    
                    {results.multiPartResults.results.map((part, index) => (
                      <div key={index} className="mb-4 p-3 border rounded-lg bg-white">
                        <h4 className="font-semibold text-gray-700 mb-3">
                          Part {part.partNumber} - {part.partPageCount} pages
                        </h4>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                          <div>
                            <span className="font-medium text-gray-700">Paper & Machine Pairing:</span>
                            <p className="text-sm font-semibold text-blue-600">{part.paperType.name} + {part.machine.name}</p>
                            <p className="text-xs text-gray-500">{part.paperType.gsm} GSM | Setup: ${part.machine.setupCost}</p>
                          </div>
                          <div>
                            <span className="font-medium text-gray-700">Optimal Print Sheet:</span>
                            <p className="text-sm">{part.printSheetSize.name}</p>
                            <p className="text-xs text-gray-500">{part.printSheetSize.width} × {part.printSheetSize.height} mm</p>
                          </div>
                          <div>
                            <span className="font-medium text-gray-700">Stock Sheet:</span>
                            <p className="text-sm">{part.stockSheetSize.name}</p>
                            <p className="text-xs text-gray-500">{part.stockSheetSize.width} × {part.stockSheetSize.height} mm</p>
                          </div>
                          <div>
                            <span className="font-medium text-gray-700">Products per Print Sheet:</span>
                            <p className="text-sm">{part.productsPerPrintSheet}</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                          <div>
                            <span className="font-medium text-gray-700">Print Sheets Needed:</span>
                            <p className="text-sm">{part.printSheetsNeeded}</p>
                          </div>
                          <div>
                            <span className="font-medium text-gray-700">Paper Cost:</span>
                            <p className="text-sm">${part.paperCost.toFixed(2)}</p>
                          </div>
                          <div>
                            <span className="font-medium text-gray-700">Click Cost:</span>
                            <p className="text-sm">${part.clickCost.toFixed(2)}</p>
                            {part.clickMultiplier > 1 && (
                              <p className="text-xs text-blue-600">Double-sided (2x)</p>
                            )}
                          </div>
                          <div>
                            <span className="font-medium text-gray-700">Setup Cost:</span>
                            <p className="text-sm">${part.setupCost.toFixed(2)}</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 pt-3 border-t">
                          <div>
                            <span className="font-bold text-lg text-gray-800">Part Total:</span>
                            <p className="text-xl font-bold text-green-600">${part.totalCost.toFixed(2)}</p>
                          </div>
                          <div>
                            <span className="font-bold text-lg text-gray-800">Part Cost per Unit:</span>
                            <p className="text-xl font-bold text-blue-600">${(part.totalCost / part.partPageCount).toFixed(4)}</p>
                          </div>
                        </div>
                      </div>
                    ))}

                    <div className="grid grid-cols-2 gap-4 pt-4 border-t bg-gray-50 p-4 rounded-lg">
                      <div>
                        <span className="font-bold text-xl text-gray-800">Total Multi-Part Cost:</span>
                        <p className="text-2xl font-bold text-purple-600">${results.multiPartResults.totalCost.toFixed(2)}</p>
                      </div>
                      <div>
                        <span className="font-bold text-xl text-gray-800">Average Cost per Unit:</span>
                        <p className="text-2xl font-bold text-blue-600">
                          ${(results.multiPartResults.totalCost / results.job.quantity).toFixed(4)}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  displayResults.map((result, index) => (
                    <div key={index} className={`p-4 border rounded-lg ${index === 0 ? 'border-green-500 bg-green-50' : 'border-gray-200'}`}>
                      {index === 0 && (
                        <div className="mb-3">
                          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold text-green-800 bg-green-200 rounded">
                            <Award size={12} />
                            {results.selectedPaperType ? 'OPTIMAL STOCK SHEET' : 'RECOMMENDED'}
                          </span>
                        </div>
                      )}
                      
                      {/* Essential Information Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                        {/* Paper & Materials */}
                        <div className="space-y-4">
                          <h4 className="font-semibold text-gray-800 border-b pb-2">Paper & Materials</h4>
                          <div>
                            <span className="font-medium text-gray-700">Paper:</span>
                            <p className="text-sm font-semibold text-blue-600">{result.paperType.name}</p>
                            <p className="text-xs text-gray-500">{result.paperType.gsm}g/m² - ${result.paperType.pricePerTon}/ton</p>
                          </div>
                          <div>
                            <span className="font-medium text-gray-700">Stock Sheet:</span>
                            <p className="text-sm">{result.stockSheetSize.name}</p>
                            <p className="text-xs text-gray-500">{result.stockSheetSize.width} × {result.stockSheetSize.height} mm</p>
                          </div>
                          <div>
                            <span className="font-medium text-gray-700">Machine:</span>
                            <p className="text-sm">{result.machine.name}</p>
                          </div>
                        </div>

                        {/* Configuration */}
                        <div className="space-y-4">
                          <h4 className="font-semibold text-gray-800 border-b pb-2">Configuration</h4>
                          <div>
                            <span className="font-medium text-gray-700">Binding Edge:</span>
                            <p className="text-sm">{result.bindingEdge === 'short' ? 'Short Edge' : 'Long Edge'}</p>
                          </div>
                          <div>
                            <span className="font-medium text-gray-700">Effective Size:</span>
                            <p className="text-sm">{result.effectiveWidth} × {result.effectiveHeight} mm</p>
                          </div>
                          <div>
                            <span className="font-medium text-gray-700">Print Sheet:</span>
                            <p className="text-sm">{result.printSheetSize.name}</p>
                            <p className="text-xs text-gray-500">{result.printSheetSize.width} × {result.printSheetSize.height} mm</p>
                          </div>
                        </div>

                        {/* Production Metrics */}
                        <div className="space-y-4">
                          <h4 className="font-semibold text-gray-800 border-b pb-2">Production</h4>
                          <div>
                            <span className="font-medium text-gray-700">Sheets per Print Sheet:</span>
                            <p className="text-sm">{result.productsPerPrintSheet}</p>
                          </div>
                          <div>
                            <span className="font-medium text-gray-700">Print Sheets Needed:</span>
                            <p className="text-sm">{result.printSheetsNeeded}</p>
                          </div>
                          <div>
                            <span className="font-medium text-gray-700">Print Sheets per Stock Sheet:</span>
                            <p className="text-sm">{result.printSheetsPerStockSheet}</p>
                          </div>
                          <div>
                            <span className="font-medium text-gray-700">Stock Sheets Needed:</span>
                            <p className="text-sm">{result.stockSheetsNeeded}</p>
                          </div>
                        </div>
                      </div>

                      {/* Cost Information */}
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4 bg-gray-50 p-4 rounded-lg">
                        <div>
                          <span className="font-medium text-gray-700">Paper Weight:</span>
                          <p className="text-sm font-semibold">{result.paperWeight.toFixed(2)} kg</p>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700">Paper Cost:</span>
                          <p className="text-sm font-semibold text-green-600">${result.paperCost.toFixed(2)}</p>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700">Click Cost:</span>
                          <p className="text-sm font-semibold text-blue-600">${result.clickCost.toFixed(2)}</p>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700">Total Cost:</span>
                          <p className="text-sm font-bold text-gray-900">${result.totalCost.toFixed(2)}</p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
                
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
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default PrintJobCalculator;