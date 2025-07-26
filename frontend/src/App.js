import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs';
import { Toaster } from './components/ui/toaster';
import { useToast } from './hooks/use-toast';
import PaperTypeManager from './components/PaperTypeManager';
import MachineManager from './components/MachineManager';
import PrintJobCalculator from './components/PrintJobCalculator';
import { apiService } from './services/api';
import { Calculator, FileText, Settings, Printer, RefreshCw } from 'lucide-react';
import './App.css';

function App() {
  const [paperTypes, setPaperTypes] = useState(mockPaperTypes);
  const [machines, setMachines] = useState(mockMachines);

  // Paper type management
  const handleAddPaperType = (paperData) => {
    const newPaper = {
      id: Date.now(),
      ...paperData
    };
    setPaperTypes([...paperTypes, newPaper]);
  };

  const handleUpdatePaperType = (id, paperData) => {
    setPaperTypes(paperTypes.map(paper => 
      paper.id === id ? { ...paper, ...paperData } : paper
    ));
  };

  const handleDeletePaperType = (id) => {
    setPaperTypes(paperTypes.filter(paper => paper.id !== id));
  };

  // Machine management
  const handleAddMachine = (machineData) => {
    const newMachine = {
      id: Date.now(),
      ...machineData
    };
    setMachines([...machines, newMachine]);
  };

  const handleUpdateMachine = (id, machineData) => {
    setMachines(machines.map(machine => 
      machine.id === id ? { ...machine, ...machineData } : machine
    ));
  };

  const handleDeleteMachine = (id) => {
    setMachines(machines.filter(machine => machine.id !== id));
  };

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
                  Papers: {paperTypes.length} | Machines: {machines.length}
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
                  <TabsList className="grid w-full grid-cols-3">
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
                  </TabsList>

                  <TabsContent value="calculator" className="space-y-6">
                    <PrintJobCalculator 
                      paperTypes={paperTypes}
                      machines={machines}
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
                <strong>Note:</strong> This is a frontend demo with mock data. Backend integration enables 
                persistent storage and advanced features.
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