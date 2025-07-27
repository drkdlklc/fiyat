import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs';
import { Toaster } from './components/ui/toaster';
import { useToast } from './hooks/use-toast';
import PaperTypeManager from './components/PaperTypeManager';
import MachineManager from './components/MachineManager';
import ExtrasManager from './components/ExtrasManager';
import PrintJobCalculator from './components/PrintJobCalculator';
import { apiService } from './services/api';
import { Calculator, FileText, Settings, Printer, RefreshCw, Scissors } from 'lucide-react';
import './App.css';

function App() {
  const [paperTypes, setPaperTypes] = useState([]);
  const [machines, setMachines] = useState([]);
  const [extras, setExtras] = useState([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Initialize data on component mount
  useEffect(() => {
    initializeData();
  }, []);

  const initializeData = async () => {
    try {
      setLoading(true);
      
      // Initialize default data if needed
      await apiService.initializeData();
      
      // Fetch paper types, machines, and extras
      await Promise.all([
        loadPaperTypes(),
        loadMachines(),
        loadExtras()
      ]);
      
      setLoading(false);
    } catch (error) {
      console.error('Error initializing data:', error);
      toast({
        title: "Error",
        description: "Failed to initialize data. Please check your connection.",
        variant: "destructive"
      });
      setLoading(false);
    }
  };

  const loadPaperTypes = async () => {
    try {
      const types = await apiService.getPaperTypes();
      setPaperTypes(types);
    } catch (error) {
      console.error('Error loading paper types:', error);
      toast({
        title: "Error",
        description: "Failed to load paper types.",
        variant: "destructive"
      });
    }
  };

  const loadMachines = async () => {
    try {
      const machineList = await apiService.getMachines();
      setMachines(machineList);
    } catch (error) {
      console.error('Error loading machines:', error);
      toast({
        title: "Error",
        description: "Failed to load machines.",
        variant: "destructive"
      });
    }
  };

  // Paper type management
  const handleAddPaperType = async (paperData) => {
    try {
      const newPaper = await apiService.createPaperType(paperData);
      setPaperTypes([...paperTypes, newPaper]);
      toast({
        title: "Success",
        description: "Paper type added successfully.",
      });
    } catch (error) {
      console.error('Error adding paper type:', error);
      toast({
        title: "Error",
        description: "Failed to add paper type.",
        variant: "destructive"
      });
    }
  };

  const handleUpdatePaperType = async (id, paperData) => {
    try {
      const updatedPaper = await apiService.updatePaperType(id, paperData);
      setPaperTypes(paperTypes.map(paper => 
        paper.id === id ? updatedPaper : paper
      ));
      toast({
        title: "Success",
        description: "Paper type updated successfully.",
      });
    } catch (error) {
      console.error('Error updating paper type:', error);
      toast({
        title: "Error",
        description: "Failed to update paper type.",
        variant: "destructive"
      });
    }
  };

  const handleDeletePaperType = async (id) => {
    try {
      await apiService.deletePaperType(id);
      setPaperTypes(paperTypes.filter(paper => paper.id !== id));
      toast({
        title: "Success",
        description: "Paper type deleted successfully.",
      });
    } catch (error) {
      console.error('Error deleting paper type:', error);
      toast({
        title: "Error",
        description: "Failed to delete paper type.",
        variant: "destructive"
      });
    }
  };

  // Machine management
  const handleAddMachine = async (machineData) => {
    try {
      const newMachine = await apiService.createMachine(machineData);
      setMachines([...machines, newMachine]);
      toast({
        title: "Success",
        description: "Machine added successfully.",
      });
    } catch (error) {
      console.error('Error adding machine:', error);
      toast({
        title: "Error",
        description: "Failed to add machine.",
        variant: "destructive"
      });
    }
  };

  const handleUpdateMachine = async (id, machineData) => {
    try {
      const updatedMachine = await apiService.updateMachine(id, machineData);
      setMachines(machines.map(machine => 
        machine.id === id ? updatedMachine : machine
      ));
      toast({
        title: "Success",
        description: "Machine updated successfully.",
      });
    } catch (error) {
      console.error('Error updating machine:', error);
      toast({
        title: "Error",
        description: "Failed to update machine.",
        variant: "destructive"
      });
    }
  };

  const handleDeleteMachine = async (id) => {
    try {
      await apiService.deleteMachine(id);
      setMachines(machines.filter(machine => machine.id !== id));
      toast({
        title: "Success",
        description: "Machine deleted successfully.",
      });
    } catch (error) {
      console.error('Error deleting machine:', error);
      toast({
        title: "Error",
        description: "Failed to delete machine.",
        variant: "destructive"
      });
    }
  };

  // Extras management
  const loadExtras = async () => {
    try {
      const extrasData = await apiService.getExtras();
      setExtras(extrasData);
    } catch (error) {
      console.error('Error loading extras:', error);
    }
  };

  const handleAddExtra = async (extraData) => {
    try {
      const newExtra = await apiService.createExtra(extraData);
      setExtras([...extras, newExtra]);
      toast({
        title: "Success",
        description: "Extra added successfully.",
      });
    } catch (error) {
      console.error('Error adding extra:', error);
      toast({
        title: "Error",
        description: "Failed to add extra.",
        variant: "destructive"
      });
    }
  };

  const handleUpdateExtra = async (id, extraData) => {
    try {
      const updatedExtra = await apiService.updateExtra(id, extraData);
      setExtras(extras.map(extra => 
        extra.id === id ? updatedExtra : extra
      ));
      toast({
        title: "Success",
        description: "Extra updated successfully.",
      });
    } catch (error) {
      console.error('Error updating extra:', error);
      toast({
        title: "Error",
        description: "Failed to update extra.",
        variant: "destructive"
      });
    }
  };

  const handleDeleteExtra = async (id) => {
    try {
      await apiService.deleteExtra(id);
      setExtras(extras.filter(extra => extra.id !== id));
      toast({
        title: "Success",
        description: "Extra deleted successfully.",
      });
    } catch (error) {
      console.error('Error deleting extra:', error);
      toast({
        title: "Error",
        description: "Failed to delete extra.",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-12 w-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-lg text-gray-600">Loading printing calculator...</p>
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-4">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <Calculator className="h-8 w-8 text-blue-600" />
                  <h1 className="text-2xl font-bold text-gray-900">Printing Cost Calculator</h1>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <div className="text-sm text-gray-600">
                  Papers: {paperTypes.length} | Machines: {machines.length} | Extras: {extras.length}
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <Routes>
            <Route path="/" element={
              <div className="space-y-6">
                <div className="text-center">
                  <h2 className="text-3xl font-bold text-gray-900 mb-4">
                    Professional Printing Cost Calculator
                  </h2>
                  <p className="text-lg text-gray-600 max-w-3xl mx-auto">
                    Calculate precise printing costs with custom paper types, machine configurations, 
                    and automated optimization for the best cost-effective solutions.
                  </p>
                </div>

                <Tabs defaultValue="calculator" className="w-full">
                  <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="calculator" className="flex items-center gap-2">
                      <Calculator size={16} />
                      Calculator
                    </TabsTrigger>
                    <TabsTrigger value="papers" className="flex items-center gap-2">
                      <FileText size={16} />
                      Paper Types
                    </TabsTrigger>
                    <TabsTrigger value="machines" className="flex items-center gap-2">
                      <Printer size={16} />
                      Machines
                    </TabsTrigger>
                    <TabsTrigger value="extras" className="flex items-center gap-2">
                      <Scissors size={16} />
                      Extras
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="calculator" className="space-y-6">
                    <PrintJobCalculator 
                      paperTypes={paperTypes}
                      machines={machines}
                      extras={extras}
                    />
                  </TabsContent>

                  <TabsContent value="papers" className="space-y-6">
                    <PaperTypeManager
                      paperTypes={paperTypes}
                      onAddPaperType={handleAddPaperType}
                      onUpdatePaperType={handleUpdatePaperType}
                      onDeletePaperType={handleDeletePaperType}
                    />
                  </TabsContent>

                  <TabsContent value="machines" className="space-y-6">
                    <MachineManager
                      machines={machines}
                      onAddMachine={handleAddMachine}
                      onUpdateMachine={handleUpdateMachine}
                      onDeleteMachine={handleDeleteMachine}
                    />
                  </TabsContent>
                  
                  <TabsContent value="extras">
                    <ExtrasManager
                      extras={extras}
                      onAddExtra={handleAddExtra}
                      onUpdateExtra={handleUpdateExtra}
                      onDeleteExtra={handleDeleteExtra}
                    />
                  </TabsContent>
                </Tabs>
              </div>
            } />
          </Routes>
        </main>

        <footer className="bg-white border-t mt-12">
          <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
            <div className="text-center text-sm text-gray-600">
              <p>
                Printing Cost Calculator - Professional printing estimation tool with advanced calculations
              </p>
              <p className="mt-2">
                <strong>Note:</strong> Data is now persistently stored in the database and will be preserved across restarts.
              </p>
            </div>
          </div>
        </footer>
      </div>
      <Toaster />
    </BrowserRouter>
  );
}

export default App;