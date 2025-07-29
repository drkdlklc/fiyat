import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs';
import { Toaster } from './components/ui/toaster';
import { useToast } from './hooks/use-toast';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './components/LoginPage';
import UserManager from './components/UserManager';
import PaperTypeManager from './components/PaperTypeManager';
import MachineManager from './components/MachineManager';
import ExtrasManager from './components/ExtrasManager';
import PrintJobCalculator from './components/PrintJobCalculator';
import { apiService } from './services/api';
import { fetchExchangeRates } from './utils/currencyConverter';
import { Calculator, FileText, Settings, Printer, RefreshCw, Scissors, Users, LogOut } from 'lucide-react';
import { Button } from './components/ui/button';
import './App.css';

function AppContent() {
  const [paperTypes, setPaperTypes] = useState([]);
  const [machines, setMachines] = useState([]);
  const [extras, setExtras] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Exchange rates state
  const [exchangeRates, setExchangeRates] = useState(null);
  
  const { toast } = useToast();
  const { user, isAuthenticated, hasPermission, logout } = useAuth();

  // Initialize data on component mount
  useEffect(() => {
    if (isAuthenticated) {
      initializeData();
    }
  }, [isAuthenticated]);

  const handleRefresh = async () => {
    if (isAuthenticated) {
      await initializeData();
    }
  };

  // Fetch exchange rates on component mount (non-blocking)
  useEffect(() => {
    const initializeExchangeRates = async () => {
      try {
        // Set default fallback rates immediately
        setExchangeRates({
          'EUR': 1.0,
          'USD': 0.95,
          'TRY': 0.028
        });
        
        // Fetch live rates in background (non-blocking)
        fetchExchangeRates()
          .then(rates => {
            setExchangeRates(rates);
            console.log('Live exchange rates loaded:', rates);
          })
          .catch(error => {
            console.warn('Failed to load live exchange rates, using fallback:', error);
          });
        
        console.log('Exchange rates initialized with fallback values');
      } catch (error) {
        console.warn('Failed to initialize exchange rates:', error);
      }
    };
    
    initializeExchangeRates();
    
    // Refresh rates every 5 minutes (non-blocking)
    const interval = setInterval(() => {
      fetchExchangeRates()
        .then(rates => setExchangeRates(rates))
        .catch(error => console.warn('Failed to refresh exchange rates:', error));
    }, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
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

  const handleReorderPaperTypes = (reorderedPaperTypes) => {
    // Update the state immediately for visual feedback
    setPaperTypes(reorderedPaperTypes);
    
    // Optionally, persist the new order to the backend
    // Note: This would require a backend endpoint to handle bulk order updates
    // For now, we'll just update the local state
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

  if (!isAuthenticated) {
    return <LoginPage />;
  }

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
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center">
                <Printer className="h-8 w-8 text-blue-600 mr-3" />
                <h1 className="text-2xl font-bold text-gray-900">Printing Cost Calculator</h1>
              </div>
              
              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-600">
                  Welcome, {user?.username}
                  {user?.is_admin && <span className="ml-1 px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded">Admin</span>}
                </span>
                <Button variant="outline" size="sm" onClick={logout}>
                  <LogOut size={16} className="mr-1" />
                  Logout
                </Button>
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            {/* Exchange Rates Display */}
            {exchangeRates && (
              <div className="mb-6 text-center">
                <div className="inline-flex items-center gap-4 px-4 py-2 bg-gray-50 rounded-full text-xs text-gray-400 font-mono">
                  <span className="text-green-500">● Live</span>
                  <span>USD/TRY: {(1 / exchangeRates.USD * 1 / exchangeRates.TRY).toFixed(2)}</span>
                  <span>•</span>
                  <span>EUR/TRY: {(1 / exchangeRates.TRY).toFixed(2)}</span>
                </div>
              </div>
            )}

            <Tabs defaultValue="calculator" className="w-full">
              <TabsList className="grid w-full grid-cols-2 md:grid-cols-5">
                {hasPermission('calculator') && (
                  <TabsTrigger value="calculator" className="flex items-center gap-2">
                    <Calculator size={16} />
                    Calculator
                  </TabsTrigger>
                )}
                {hasPermission('papers') && (
                  <TabsTrigger value="papers" className="flex items-center gap-2">
                    <FileText size={16} />
                    Paper Types
                  </TabsTrigger>
                )}
                {hasPermission('machines') && (
                  <TabsTrigger value="machines" className="flex items-center gap-2">
                    <Settings size={16} />
                    Machines
                  </TabsTrigger>
                )}
                {hasPermission('extras') && (
                  <TabsTrigger value="extras" className="flex items-center gap-2">
                    <Scissors size={16} />
                    Extras
                  </TabsTrigger>
                )}
                {user?.is_admin && (
                  <TabsTrigger value="users" className="flex items-center gap-2">
                    <Users size={16} />
                    Users
                  </TabsTrigger>
                )}
              </TabsList>

              {hasPermission('calculator') && (
                <TabsContent value="calculator">
                  <ProtectedRoute requiredPermission="calculator">
                    <PrintJobCalculator 
                      paperTypes={paperTypes} 
                      machines={machines}
                      extras={extras}
                      exchangeRates={exchangeRates}
                    />
                  </ProtectedRoute>
                </TabsContent>
              )}

              {hasPermission('papers') && (
                <TabsContent value="papers">
                  <ProtectedRoute requiredPermission="papers">
                    <PaperTypeManager 
                      paperTypes={paperTypes} 
                      onAddPaperType={handleAddPaperType}
                      onUpdatePaperType={handleUpdatePaperType}
                      onDeletePaperType={handleDeletePaperType}
                      onReorderPaperTypes={handleReorderPaperTypes}
                    />
                  </ProtectedRoute>
                </TabsContent>
              )}

              {hasPermission('machines') && (
                <TabsContent value="machines">
                  <ProtectedRoute requiredPermission="machines">
                    <MachineManager 
                      machines={machines} 
                      onAddMachine={handleAddMachine}
                      onUpdateMachine={handleUpdateMachine}
                      onDeleteMachine={handleDeleteMachine}
                    />
                  </ProtectedRoute>
                </TabsContent>
              )}

              {hasPermission('extras') && (
                <TabsContent value="extras">
                  <ProtectedRoute requiredPermission="extras">
                    <ExtrasManager 
                      extras={extras} 
                      onAddExtra={handleAddExtra}
                      onUpdateExtra={handleUpdateExtra}
                      onDeleteExtra={handleDeleteExtra}
                    />
                  </ProtectedRoute>
                </TabsContent>
              )}

              {user?.is_admin && (
                <TabsContent value="users">
                  <ProtectedRoute>
                    <UserManager />
                  </ProtectedRoute>
                </TabsContent>
              )}
            </Tabs>
          </div>
        </main>

        <footer className="bg-white border-t mt-8">
          <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">
                Printing Cost Calculator - Professional tool for print job estimation
              </p>
              <button 
                onClick={handleRefresh}
                className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
                disabled={loading}
              >
                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                Refresh Data
              </button>
            </div>
          </div>
        </footer>
      </div>
      <Toaster />
    </BrowserRouter>
  );
}

export default App;