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
    setupRequired: true,
    isBookletMode: false,
    coverSetupRequired: false,
    totalPages: '',
    useMultiplePaperTypes: false,
    useMultipleInnerPaperTypes: false,
    useMultipleMachines: false,
    useMultipleInnerMachines: false
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
      coverSetupRequired: jobData.coverSetupRequired,
      totalPages: jobData.totalPages ? parseInt(jobData.totalPages) : 0
    };

    let calculationResults;
    let coverResults = null;
    let innerPagesResults = null;
    let multiPartResults = null;
    
    if (job.isBookletMode) {
      // Booklet mode - calculate cover and inner pages separately
      if (selectedCoverPaperType && selectedCoverMachine) {
        const coverPaperType = paperTypes.find(p => p.id === selectedCoverPaperType);
        const coverMachine = machines.find(m => m.id === selectedCoverMachine);
        coverResults = calculateCoverCost(job, coverPaperType, coverMachine);
      }
      
      // Handle multi-part inner pages
      if (jobData.useMultipleInnerPaperTypes || jobData.useMultipleInnerMachines) {
        const configs = [];
        
        // Merge paper type and machine configurations
        if (jobData.useMultipleInnerPaperTypes && jobData.useMultipleInnerMachines) {
          // Both paper types and machines are multi-part
          const maxLength = Math.max(multiPartInnerPaperTypes.length, multiPartInnerMachines.length);
          for (let i = 0; i < maxLength; i++) {
            const paperConfig = multiPartInnerPaperTypes[i] || {};
            const machineConfig = multiPartInnerMachines[i] || {};
            configs.push({
              paperTypeId: paperConfig.paperTypeId,
              machineId: machineConfig.machineId,
              pageCount: paperConfig.pageCount || machineConfig.pageCount || ''
            });
          }
        } else if (jobData.useMultipleInnerPaperTypes) {
          // Only paper types are multi-part
          multiPartInnerPaperTypes.forEach(config => {
            configs.push({
              paperTypeId: config.paperTypeId,
              machineId: selectedInnerMachine,
              pageCount: config.pageCount
            });
          });
        } else if (jobData.useMultipleInnerMachines) {
          // Only machines are multi-part
          multiPartInnerMachines.forEach(config => {
            configs.push({
              paperTypeId: selectedInnerPaperType,
              machineId: config.machineId,
              pageCount: config.pageCount
            });
          });
        }
        
        multiPartResults = calculateMultiPartInnerPagesCost(job, configs, paperTypes, machines, true);
      } else if (selectedInnerPaperType && selectedInnerMachine) {
        // Single inner paper type and machine
        const innerPaperType = paperTypes.find(p => p.id === selectedInnerPaperType);
        const innerMachine = machines.find(m => m.id === selectedInnerMachine);
        innerPagesResults = calculateInnerPagesCost(job, innerPaperType, innerMachine);
      }
      
      // For booklet mode, we don't use the normal calculation results
      calculationResults = [];
    } else {
      // Normal mode - handle multi-part configurations
      if (jobData.useMultiplePaperTypes || jobData.useMultipleMachines) {
        const configs = [];
        
        // Merge paper type and machine configurations
        if (jobData.useMultiplePaperTypes && jobData.useMultipleMachines) {
          // Both paper types and machines are multi-part
          const maxLength = Math.max(multiPartPaperTypes.length, multiPartMachines.length);
          for (let i = 0; i < maxLength; i++) {
            const paperConfig = multiPartPaperTypes[i] || {};
            const machineConfig = multiPartMachines[i] || {};
            configs.push({
              paperTypeId: paperConfig.paperTypeId,
              machineId: machineConfig.machineId,
              pageCount: paperConfig.pageCount || machineConfig.pageCount || ''
            });
          }
        } else if (jobData.useMultiplePaperTypes) {
          // Only paper types are multi-part
          multiPartPaperTypes.forEach(config => {
            configs.push({
              paperTypeId: config.paperTypeId,
              machineId: selectedMachine,
              pageCount: config.pageCount
            });
          });
        } else if (jobData.useMultipleMachines) {
          // Only machines are multi-part
          multiPartMachines.forEach(config => {
            configs.push({
              paperTypeId: selectedPaperType,
              machineId: config.machineId,
              pageCount: config.pageCount
            });
          });
        }
        
        multiPartResults = calculateMultiPartCost(job, configs, paperTypes, machines);
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
    
    if (!job.isBookletMode && calculationResults.length === 0) {
      toast({
        title: "Error",
        description: "No suitable paper type, machine, and sheet size combination found for this job",
        variant: "destructive"
      });
      return;
    }

    if (job.isBookletMode && !coverResults && !innerPagesResults) {
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
      innerPagesResults
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
      setupRequired: true,
      isBookletMode: false,
      coverSetupRequired: false,
      totalPages: '',
      useMultiplePaperTypes: false,
      useMultipleInnerPaperTypes: false,
      useMultipleMachines: false,
      useMultipleInnerMachines: false
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
                  <div>
                    <Label htmlFor="totalPages">Total Pages *</Label>
                    <Input
                      id="totalPages"
                      type="number"
                      value={jobData.totalPages}
                      onChange={(e) => setJobData({ ...jobData, totalPages: e.target.value })}
                      placeholder="e.g., 16, 20, 24"
                    />
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
                    Covers will be printed separately. Each booklet needs 1 cover (2 pages).
                  </p>
                </div>

                <div className="p-4 border rounded-lg bg-orange-50">
                  <h3 className="font-semibold text-lg mb-3 text-orange-800">Inner Pages Configuration</h3>
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

                  <div className="mt-4 space-y-3">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="useMultipleInnerPaperTypes"
                        checked={jobData.useMultipleInnerPaperTypes}
                        onCheckedChange={(checked) => setJobData({ ...jobData, useMultipleInnerPaperTypes: checked })}
                      />
                      <Label htmlFor="useMultipleInnerPaperTypes">Use Different Paper Types for Inner Pages</Label>
                    </div>

                    {jobData.useMultipleInnerPaperTypes && (
                      <div className="p-3 border rounded-lg bg-blue-50">
                        <h4 className="font-semibold text-blue-800 mb-2">Inner Paper Type Configuration</h4>
                        {multiPartInnerPaperTypes.map((part, index) => (
                          <div key={part.id} className="grid grid-cols-3 gap-3 mb-2">
                            <div>
                              <Label>Paper Type {index + 1}</Label>
                              <Select 
                                value={part.paperTypeId?.toString() || ''} 
                                onValueChange={(value) => updateMultiPartInnerPaperType(part.id, 'paperTypeId', value ? parseInt(value) : null)}
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
                              <Label>Page Count</Label>
                              <Input
                                type="number"
                                value={part.pageCount}
                                onChange={(e) => updateMultiPartInnerPaperType(part.id, 'pageCount', e.target.value)}
                                placeholder="e.g., 10"
                              />
                            </div>
                            <div className="flex items-end gap-1">
                              {multiPartInnerPaperTypes.length < 3 && (
                                <Button 
                                  type="button" 
                                  variant="outline" 
                                  size="sm"
                                  onClick={addMultiPartInnerPaperType}
                                >
                                  <Plus size={14} />
                                </Button>
                              )}
                              {multiPartInnerPaperTypes.length > 1 && (
                                <Button 
                                  type="button" 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => removeMultiPartInnerPaperType(part.id)}
                                >
                                  <Minus size={14} />
                                </Button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="useMultipleInnerMachines"
                        checked={jobData.useMultipleInnerMachines}
                        onCheckedChange={(checked) => setJobData({ ...jobData, useMultipleInnerMachines: checked })}
                      />
                      <Label htmlFor="useMultipleInnerMachines">Use Different Machines for Inner Pages</Label>
                    </div>

                    {jobData.useMultipleInnerMachines && (
                      <div className="p-3 border rounded-lg bg-purple-50">
                        <h4 className="font-semibold text-purple-800 mb-2">Inner Machine Configuration</h4>
                        {multiPartInnerMachines.map((part, index) => (
                          <div key={part.id} className="grid grid-cols-3 gap-3 mb-2">
                            <div>
                              <Label>Machine {index + 1}</Label>
                              <Select 
                                value={part.machineId?.toString() || ''} 
                                onValueChange={(value) => updateMultiPartInnerMachine(part.id, 'machineId', value ? parseInt(value) : null)}
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
                                onChange={(e) => updateMultiPartInnerMachine(part.id, 'pageCount', e.target.value)}
                                placeholder="e.g., 10"
                              />
                            </div>
                            <div className="flex items-end gap-1">
                              {multiPartInnerMachines.length < 3 && (
                                <Button 
                                  type="button" 
                                  variant="outline" 
                                  size="sm"
                                  onClick={addMultiPartInnerMachine}
                                >
                                  <Plus size={14} />
                                </Button>
                              )}
                              {multiPartInnerMachines.length > 1 && (
                                <Button 
                                  type="button" 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => removeMultiPartInnerMachine(part.id)}
                                >
                                  <Minus size={14} />
                                </Button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <p className="text-sm text-orange-600 mt-2">
                    Inner pages will be calculated as: {jobData.totalPages ? `(${jobData.totalPages} total - 2 cover = ${Math.max(0, jobData.totalPages - 2)} inner pages) × ${jobData.quantity || 'quantity'} booklets` : '(total pages - 2) × quantity booklets'}
                  </p>
                </div>
              </>
            )}

            {!jobData.isBookletMode && (
              <div className="grid grid-cols-1 gap-4">
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

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="useMultiplePaperTypes"
                    checked={jobData.useMultiplePaperTypes}
                    onCheckedChange={(checked) => setJobData({ ...jobData, useMultiplePaperTypes: checked })}
                  />
                  <Label htmlFor="useMultiplePaperTypes">Use Different Paper Types for Different Parts</Label>
                </div>

                {jobData.useMultiplePaperTypes && (
                  <div className="p-4 border rounded-lg bg-blue-50">
                    <h4 className="font-semibold text-blue-800 mb-3">Paper Type Configuration by Parts</h4>
                    {multiPartPaperTypes.map((part, index) => (
                      <div key={part.id} className="grid grid-cols-3 gap-4 mb-3">
                        <div>
                          <Label>Paper Type for Part {index + 1}</Label>
                          <Select 
                            value={part.paperTypeId?.toString() || ''} 
                            onValueChange={(value) => updateMultiPartPaperType(part.id, 'paperTypeId', value ? parseInt(value) : null)}
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
                          <Label>Page Count</Label>
                          <Input
                            type="number"
                            value={part.pageCount}
                            onChange={(e) => updateMultiPartPaperType(part.id, 'pageCount', e.target.value)}
                            placeholder="e.g., 100"
                          />
                        </div>
                        <div className="flex items-end gap-2">
                          {multiPartPaperTypes.length < 3 && (
                            <Button 
                              type="button" 
                              variant="outline" 
                              size="sm"
                              onClick={addMultiPartPaperType}
                            >
                              <Plus size={16} />
                            </Button>
                          )}
                          {multiPartPaperTypes.length > 1 && (
                            <Button 
                              type="button" 
                              variant="outline" 
                              size="sm"
                              onClick={() => removeMultiPartPaperType(part.id)}
                            >
                              <Minus size={16} />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {!jobData.isBookletMode && (
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

                <div className="col-span-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="useMultipleMachines"
                      checked={jobData.useMultipleMachines}
                      onCheckedChange={(checked) => setJobData({ ...jobData, useMultipleMachines: checked })}
                    />
                    <Label htmlFor="useMultipleMachines">Use Different Machines for Different Parts</Label>
                  </div>

                  {jobData.useMultipleMachines && (
                    <div className="p-4 border rounded-lg bg-purple-50 mt-3">
                      <h4 className="font-semibold text-purple-800 mb-3">Machine Configuration by Parts</h4>
                      {multiPartMachines.map((part, index) => (
                        <div key={part.id} className="grid grid-cols-3 gap-4 mb-3">
                          <div>
                            <Label>Machine for Part {index + 1}</Label>
                            <Select 
                              value={part.machineId?.toString() || ''} 
                              onValueChange={(value) => updateMultiPartMachine(part.id, 'machineId', value ? parseInt(value) : null)}
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
                              onChange={(e) => updateMultiPartMachine(part.id, 'pageCount', e.target.value)}
                              placeholder="e.g., 100"
                            />
                          </div>
                          <div className="flex items-end gap-2">
                            {multiPartMachines.length < 3 && (
                              <Button 
                                type="button" 
                                variant="outline" 
                                size="sm"
                                onClick={addMultiPartMachine}
                              >
                                <Plus size={16} />
                              </Button>
                            )}
                            {multiPartMachines.length > 1 && (
                              <Button 
                                type="button" 
                                variant="outline" 
                                size="sm"
                                onClick={() => removeMultiPartMachine(part.id)}
                              >
                                <Minus size={16} />
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
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
                    <h3 className="text-lg font-semibold text-green-800 mb-4">Cover Cost Breakdown</h3>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      <div>
                        <span className="font-medium text-gray-700">Cover Paper:</span>
                        <p className="text-sm">{results.coverResults.paperType.name}</p>
                        <p className="text-xs text-gray-500">{results.coverResults.paperType.gsm} GSM | ${results.coverResults.paperType.pricePerTon}/ton</p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Cover Stock Sheet:</span>
                        <p className="text-sm font-semibold text-blue-600">{results.coverResults.stockSheetSize.name}</p>
                        <p className="text-xs text-gray-500">{results.coverResults.stockSheetSize.width} × {results.coverResults.stockSheetSize.height} mm</p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Cover Machine:</span>
                        <p className="text-sm">{results.coverResults.machine.name}</p>
                        <p className="text-xs text-gray-500">Setup: ${results.coverResults.machine.setupCost}</p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Cover Print Sheet:</span>
                        <p className="text-sm">{results.coverResults.printSheetSize.name}</p>
                        <p className="text-xs text-gray-500">{results.coverResults.printSheetSize.width} × {results.coverResults.printSheetSize.height} mm</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      <div>
                        <span className="font-medium text-gray-700">Total Cover Pages:</span>
                        <p className="text-sm">{results.coverResults.totalCoverPages}</p>
                        <p className="text-xs text-gray-500">({results.coverResults.bookletQuantity} booklets × 2 pages)</p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Covers per Print Sheet:</span>
                        <p className="text-sm">{results.coverResults.coversPerPrintSheet}</p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Print Sheets per Stock Sheet:</span>
                        <p className="text-sm">{results.coverResults.printSheetsPerStockSheet}</p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Print Sheets Needed:</span>
                        <p className="text-sm">{results.coverResults.printSheetsNeeded}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      <div>
                        <span className="font-medium text-gray-700">Stock Sheets Needed:</span>
                        <p className="text-sm">{results.coverResults.stockSheetsNeeded}</p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Paper Weight:</span>
                        <p className="text-sm">{results.coverResults.paperWeight.toFixed(2)} kg</p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Paper Cost:</span>
                        <p className="text-sm">${results.coverResults.paperCost.toFixed(2)}</p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Click Cost:</span>
                        <p className="text-sm">${results.coverResults.clickCost.toFixed(2)}</p>
                        <p className="text-xs text-gray-500">Double-sided (2x)</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      <div>
                        <span className="font-medium text-gray-700">Setup Cost:</span>
                        <p className="text-sm">${results.coverResults.setupCost.toFixed(2)}</p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Stock Area:</span>
                        <p className="text-sm">{((results.coverResults.stockSheetSize.width * results.coverResults.stockSheetSize.height) / 1000000).toFixed(3)} m²</p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Print Area:</span>
                        <p className="text-sm">{((results.coverResults.printSheetSize.width * results.coverResults.printSheetSize.height) / 1000000).toFixed(3)} m²</p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Stock Efficiency:</span>
                        <p className="text-sm">{((results.coverResults.coversPerPrintSheet * results.coverResults.printSheetsPerStockSheet / results.coverResults.stockSheetsNeeded) * 100).toFixed(1)}%</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                      <div>
                        <span className="font-bold text-lg text-gray-800">Total Cover Cost:</span>
                        <p className="text-xl font-bold text-green-600">${results.coverResults.totalCost.toFixed(2)}</p>
                      </div>
                      <div>
                        <span className="font-bold text-lg text-gray-800">Cover Cost per Booklet:</span>
                        <p className="text-xl font-bold text-blue-600">${(results.coverResults.totalCost / results.coverResults.bookletQuantity).toFixed(4)}</p>
                      </div>
                    </div>
                  </div>
                )}

                {results.innerPagesResults && (
                  <div className="p-4 border rounded-lg bg-orange-50">
                    <h3 className="text-lg font-semibold text-orange-800 mb-4">Inner Pages Cost Breakdown</h3>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      <div>
                        <span className="font-medium text-gray-700">Inner Paper:</span>
                        <p className="text-sm">{results.innerPagesResults.paperType.name}</p>
                        <p className="text-xs text-gray-500">{results.innerPagesResults.paperType.gsm} GSM | ${results.innerPagesResults.paperType.pricePerTon}/ton</p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Inner Stock Sheet:</span>
                        <p className="text-sm font-semibold text-blue-600">{results.innerPagesResults.stockSheetSize.name}</p>
                        <p className="text-xs text-gray-500">{results.innerPagesResults.stockSheetSize.width} × {results.innerPagesResults.stockSheetSize.height} mm</p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Inner Machine:</span>
                        <p className="text-sm">{results.innerPagesResults.machine.name}</p>
                        <p className="text-xs text-gray-500">Setup: ${results.innerPagesResults.machine.setupCost}</p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Inner Print Sheet:</span>
                        <p className="text-sm">{results.innerPagesResults.printSheetSize.name}</p>
                        <p className="text-xs text-gray-500">{results.innerPagesResults.printSheetSize.width} × {results.innerPagesResults.printSheetSize.height} mm</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      <div>
                        <span className="font-medium text-gray-700">Total Inner Pages:</span>
                        <p className="text-sm">{results.innerPagesResults.totalInnerPages}</p>
                        <p className="text-xs text-gray-500">({results.innerPagesResults.bookletQuantity} booklets × {results.innerPagesResults.innerPagesPerBooklet} pages)</p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Pages per Print Sheet:</span>
                        <p className="text-sm">{results.innerPagesResults.pagesPerPrintSheet}</p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Print Sheets per Stock Sheet:</span>
                        <p className="text-sm">{results.innerPagesResults.printSheetsPerStockSheet}</p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Print Sheets Needed:</span>
                        <p className="text-sm">{results.innerPagesResults.printSheetsNeeded}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      <div>
                        <span className="font-medium text-gray-700">Stock Sheets Needed:</span>
                        <p className="text-sm">{results.innerPagesResults.stockSheetsNeeded}</p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Paper Weight:</span>
                        <p className="text-sm">{results.innerPagesResults.paperWeight.toFixed(2)} kg</p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Paper Cost:</span>
                        <p className="text-sm">${results.innerPagesResults.paperCost.toFixed(2)}</p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Click Cost:</span>
                        <p className="text-sm">
                          ${results.innerPagesResults.printSheetSize.clickCost}/click
                          {results.innerPagesResults.clickMultiplier > 1 && (
                            <span className="text-blue-600 ml-1">× {results.innerPagesResults.clickMultiplier} (Double-sided)</span>
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      <div>
                        <span className="font-medium text-gray-700">Total Click Cost:</span>
                        <p className="text-sm">${results.innerPagesResults.clickCost.toFixed(2)}</p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Setup Cost:</span>
                        <p className="text-sm">${results.innerPagesResults.setupCost.toFixed(2)}</p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Stock Area:</span>
                        <p className="text-sm">{((results.innerPagesResults.stockSheetSize.width * results.innerPagesResults.stockSheetSize.height) / 1000000).toFixed(3)} m²</p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Print Area:</span>
                        <p className="text-sm">{((results.innerPagesResults.printSheetSize.width * results.innerPagesResults.printSheetSize.height) / 1000000).toFixed(3)} m²</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                      <div>
                        <span className="font-bold text-lg text-gray-800">Total Inner Pages Cost:</span>
                        <p className="text-xl font-bold text-orange-600">${results.innerPagesResults.totalCost.toFixed(2)}</p>
                      </div>
                      <div>
                        <span className="font-bold text-lg text-gray-800">Inner Pages Cost per Booklet:</span>
                        <p className="text-xl font-bold text-blue-600">${(results.innerPagesResults.totalCost / results.innerPagesResults.bookletQuantity).toFixed(4)}</p>
                      </div>
                    </div>
                  </div>
                )}

                {results.coverResults && results.innerPagesResults && (
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
                        <p className="text-sm">${results.innerPagesResults.totalCost.toFixed(2)}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                      <div>
                        <span className="font-bold text-xl text-gray-800">Total Cost:</span>
                        <p className="text-2xl font-bold text-blue-600">
                          ${(results.coverResults.totalCost + results.innerPagesResults.totalCost).toFixed(2)}
                        </p>
                      </div>
                      <div>
                        <span className="font-bold text-xl text-gray-800">Cost per Booklet:</span>
                        <p className="text-2xl font-bold text-green-600">
                          ${((results.coverResults.totalCost + results.innerPagesResults.totalCost) / results.job.quantity).toFixed(4)}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
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
                        <p className="text-sm">
                          ${result.printSheetSize.clickCost}/click
                          {result.clickMultiplier > 1 && (
                            <span className="text-blue-600 ml-1">× {result.clickMultiplier} (Double-sided)</span>
                          )}
                        </p>
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
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default PrintJobCalculator;