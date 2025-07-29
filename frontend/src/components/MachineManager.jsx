import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Plus, Edit2, Trash2, Save, X, Settings, Copy } from 'lucide-react';
import { useToast } from '../hooks/use-toast';

const MachineManager = ({ machines, onAddMachine, onUpdateMachine, onDeleteMachine }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editingSheetSizeId, setEditingSheetSizeId] = useState(null);
  const [editingMachineId, setEditingMachineId] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    setupCost: '',
    setupCostCurrency: 'USD',
    printSheetSizes: []
  });
  const [sheetSizeForm, setSheetSizeForm] = useState({
    name: '',
    width: '',
    height: '',
    clickCost: '',
    clickCostCurrency: 'USD'
  });
  const [isAddingSheetSize, setIsAddingSheetSize] = useState(false);
  const [editingSheetSizeData, setEditingSheetSizeData] = useState({
    name: '',
    width: '',
    height: '',
    clickCost: '',
    clickCostCurrency: 'USD'
  });
  const { toast } = useToast();

  const resetForm = () => {
    setFormData({
      name: '',
      setupCost: '',
      setupCostCurrency: 'USD',
      printSheetSizes: []
    });
    setSheetSizeForm({
      name: '',
      width: '',
      height: '',
      clickCost: '',
      clickCostCurrency: 'USD'
    });
    setIsAdding(false);
    setEditingId(null);
    setIsAddingSheetSize(false);
  };

  const resetSheetSizeForm = () => {
    setSheetSizeForm({
      name: '',
      width: '',
      height: '',
      clickCost: '',
      clickCostCurrency: 'USD'
    });
    setIsAddingSheetSize(false);
  };

  const resetEditingSheetSizeForm = () => {
    setEditingSheetSizeData({
      name: '',
      width: '',
      height: '',
      clickCost: '',
      clickCostCurrency: 'USD'
    });
    setEditingSheetSizeId(null);
    setEditingMachineId(null);
  };

  const handleEditSheetSize = (machineId, sheetSize) => {
    setEditingSheetSizeData({
      name: sheetSize.name,
      width: sheetSize.width.toString(),
      height: sheetSize.height.toString(),
      clickCost: sheetSize.clickCost.toString(),
      clickCostCurrency: sheetSize.clickCostCurrency || 'USD'
    });
    setEditingSheetSizeId(sheetSize.id);
    setEditingMachineId(machineId);
  };

  const handleSaveSheetSize = () => {
    if (!editingSheetSizeData.name || !editingSheetSizeData.width || !editingSheetSizeData.height || !editingSheetSizeData.clickCost) {
      toast({
        title: "Error",
        description: "Please fill in all sheet size fields",
        variant: "destructive"
      });
      return;
    }

    const machine = machines.find(m => m.id === editingMachineId);
    if (!machine) return;

    const updatedPrintSheetSizes = machine.printSheetSizes.map(size => {
      if (size.id === editingSheetSizeId) {
        return {
          ...size,
          name: editingSheetSizeData.name,
          width: parseFloat(editingSheetSizeData.width),
          height: parseFloat(editingSheetSizeData.height),
          clickCost: parseFloat(editingSheetSizeData.clickCost),
          clickCostCurrency: editingSheetSizeData.clickCostCurrency
        };
      }
      return size;
    });

    const updatedMachine = {
      ...machine,
      printSheetSizes: updatedPrintSheetSizes
    };

    onUpdateMachine(editingMachineId, updatedMachine);
    resetEditingSheetSizeForm();
    
    toast({
      title: "Success",
      description: "Print sheet size updated successfully"
    });
  };

  const handleDeleteSheetSize = (machineId, sheetSizeId) => {
    const machine = machines.find(m => m.id === machineId);
    if (!machine) return;

    if (machine.printSheetSizes.length <= 1) {
      toast({
        title: "Error",
        description: "Cannot delete the last print sheet size. Each machine must have at least one print sheet size.",
        variant: "destructive"
      });
      return;
    }

    const updatedPrintSheetSizes = machine.printSheetSizes.filter(size => size.id !== sheetSizeId);
    
    const updatedMachine = {
      ...machine,
      printSheetSizes: updatedPrintSheetSizes
    };

    onUpdateMachine(machineId, updatedMachine);
    
    toast({
      title: "Success",
      description: "Print sheet size deleted successfully"
    });
  };

  const handleAddSheetSize = () => {
    if (!sheetSizeForm.name || !sheetSizeForm.width || !sheetSizeForm.height || !sheetSizeForm.clickCost) {
      toast({
        title: "Error",
        description: "Please fill in all sheet size fields",
        variant: "destructive"
      });
      return;
    }

    // Remove any potential limit on number of sheet sizes
    const newSheetSize = {
      id: Date.now(),
      name: sheetSizeForm.name,
      width: parseFloat(sheetSizeForm.width),
      height: parseFloat(sheetSizeForm.height),
      clickCost: parseFloat(sheetSizeForm.clickCost),
      clickCostCurrency: sheetSizeForm.clickCostCurrency,
      duplexSupport: false, // Add default duplexSupport
      unit: 'mm'
    };

    setFormData({
      ...formData,
      printSheetSizes: [...formData.printSheetSizes, newSheetSize]
    });

    resetSheetSizeForm();
    toast({
      title: "Success",
      description: "Sheet size added successfully"
    });
  };

  const handleRemoveSheetSize = (sheetSizeId) => {
    setFormData({
      ...formData,
      printSheetSizes: formData.printSheetSizes.filter(size => size.id !== sheetSizeId)
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!formData.name || !formData.setupCost || formData.printSheetSizes.length === 0) {
      toast({
        title: "Error",
        description: "Please fill in all fields and add at least one sheet size",
        variant: "destructive"
      });
      return;
    }

    const machineData = {
      name: formData.name,
      setupCost: parseFloat(formData.setupCost),
      setupCostCurrency: formData.setupCostCurrency,
      printSheetSizes: formData.printSheetSizes
    };

    if (editingId) {
      onUpdateMachine(editingId, machineData);
      toast({
        title: "Success",
        description: "Machine updated successfully"
      });
    } else {
      onAddMachine(machineData);
      toast({
        title: "Success",
        description: "Machine added successfully"
      });
    }
    
    resetForm();
  };

  const handleEdit = (machine) => {
    setFormData({
      name: machine.name,
      setupCost: machine.setupCost.toString(),
      setupCostCurrency: machine.setupCostCurrency || 'USD',
      printSheetSizes: machine.printSheetSizes
    });
    setEditingId(machine.id);
    setIsAdding(false);
  };

  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this machine?')) {
      onDeleteMachine(id);
      toast({
        title: "Success",
        description: "Machine deleted successfully"
      });
    }
  };

  const handleDuplicate = (machine) => {
    const duplicatedMachine = {
      name: `Copy of ${machine.name}`,
      setupCost: machine.setupCost,
      setupCostCurrency: machine.setupCostCurrency || 'USD',
      printSheetSizes: machine.printSheetSizes.map(size => ({
        ...size,
        id: Date.now() + Math.random() // Generate new IDs for duplicated print sheet sizes
      }))
    };

    onAddMachine(duplicatedMachine);
    toast({
      title: "Success",
      description: "Machine duplicated successfully"
    });
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Printing Machines</span>
          <Button
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-2"
            disabled={isAdding || editingId}
          >
            <Plus size={16} />
            Add Machine
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {(isAdding || editingId) && (
          <form onSubmit={handleSubmit} className="mb-6 p-4 border rounded-lg bg-gray-50">
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="col-span-2">
                <Label htmlFor="name">Machine Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Heidelberg SM 52"
                />
              </div>
              <div>
                <Label htmlFor="setupCost">Setup Cost</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    id="setupCost"
                    type="number"
                    step="0.01"
                    value={formData.setupCost}
                    onChange={(e) => setFormData({ ...formData, setupCost: e.target.value })}
                    placeholder="45.00"
                  />
                  <Select 
                    value={formData.setupCostCurrency} 
                    onValueChange={(value) => setFormData({ ...formData, setupCostCurrency: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Currency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD">USD ($)</SelectItem>
                      <SelectItem value="EUR">EUR (€)</SelectItem>
                      <SelectItem value="TRY">TRY (₺)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <Label>Print Sheet Sizes</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsAddingSheetSize(true)}
                  disabled={isAddingSheetSize}
                  className="flex items-center gap-2"
                >
                  <Plus size={14} />
                  Add Sheet Size
                </Button>
              </div>

              {isAddingSheetSize && (
                <div className="p-3 border rounded-lg bg-white mb-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="sheetName">Sheet Size Name</Label>
                      <Input
                        id="sheetName"
                        value={sheetSizeForm.name}
                        onChange={(e) => setSheetSizeForm({ ...sheetSizeForm, name: e.target.value })}
                        placeholder="e.g., SRA3, A3, Custom"
                      />
                    </div>
                    <div className="col-span-2">
                      <Label htmlFor="sheetClickCost">Click Cost</Label>
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          id="sheetClickCost"
                          type="number"
                          step="0.01"
                          value={sheetSizeForm.clickCost}
                          onChange={(e) => setSheetSizeForm({ ...sheetSizeForm, clickCost: e.target.value })}
                          placeholder="0.08"
                        />
                        <Select 
                          value={sheetSizeForm.clickCostCurrency} 
                          onValueChange={(value) => setSheetSizeForm({ ...sheetSizeForm, clickCostCurrency: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Currency" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="USD">USD ($)</SelectItem>
                            <SelectItem value="EUR">EUR (€)</SelectItem>
                            <SelectItem value="TRY">TRY (₺)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="sheetWidth">Width (mm)</Label>
                      <Input
                        id="sheetWidth"
                        type="number"
                        value={sheetSizeForm.width}
                        onChange={(e) => setSheetSizeForm({ ...sheetSizeForm, width: e.target.value })}
                        placeholder="320"
                      />
                    </div>
                    <div>
                      <Label htmlFor="sheetHeight">Height (mm)</Label>
                      <Input
                        id="sheetHeight"
                        type="number"
                        value={sheetSizeForm.height}
                        onChange={(e) => setSheetSizeForm({ ...sheetSizeForm, height: e.target.value })}
                        placeholder="450"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <Button type="button" size="sm" onClick={handleAddSheetSize}>
                      Add Size
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={resetSheetSizeForm}>
                      Cancel
                    </Button>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                {formData.printSheetSizes.map((sheetSize) => (
                  <div key={sheetSize.id} className="flex items-center justify-between p-2 bg-white border rounded">
                    <div className="flex-1">
                      <span className="font-medium">{sheetSize.name}</span>
                      <span className="text-sm text-gray-500 ml-2">
                        {sheetSize.width} × {sheetSize.height} mm | ${sheetSize.clickCost} per click
                        {sheetSize.duplexSupport && <span className="text-green-600 ml-1">| Duplex</span>}
                      </span>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleRemoveSheetSize(sheetSize.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <Button type="submit" className="flex items-center gap-2">
                <Save size={16} />
                {editingId ? 'Update' : 'Add'} Machine
              </Button>
              <Button type="button" variant="outline" onClick={resetForm} className="flex items-center gap-2">
                <X size={16} />
                Cancel
              </Button>
            </div>
          </form>
        )}

        <div className="grid gap-4">
          {machines.map((machine) => (
            <div key={machine.id} className="p-4 border rounded-lg bg-white hover:bg-gray-50 transition-colors">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-lg">{machine.name}</h3>
                  <p className="text-sm text-gray-600">Setup Cost: {machine.setupCost} {machine.setupCostCurrency || 'USD'}</p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(machine)}
                    disabled={isAdding || editingId}
                    className="flex items-center gap-1"
                  >
                    <Edit2 size={14} />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(machine.id)}
                    disabled={isAdding || editingId}
                    className="flex items-center gap-1 text-red-600 hover:text-red-700"
                  >
                    <Trash2 size={14} />
                    Delete
                  </Button>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <Settings size={16} />
                  Print Sheet Sizes ({machine.printSheetSizes.length})
                </div>
                <div className="grid gap-2">
                  {machine.printSheetSizes.map((sheetSize) => (
                    <div key={sheetSize.id} className="pl-4 p-2 bg-gray-100 rounded text-sm">
                      {editingSheetSizeId === sheetSize.id && editingMachineId === machine.id ? (
                        // Editing mode
                        <div className="space-y-3">
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <Label htmlFor={`edit-sheet-name-${sheetSize.id}`}>Sheet Size Name</Label>
                              <Input
                                id={`edit-sheet-name-${sheetSize.id}`}
                                value={editingSheetSizeData.name}
                                onChange={(e) => setEditingSheetSizeData({ ...editingSheetSizeData, name: e.target.value })}
                                placeholder="e.g., SRA3, A3, Custom"
                              />
                            </div>
                            <div className="col-span-2">
                              <Label htmlFor={`edit-sheet-click-cost-${sheetSize.id}`}>Click Cost</Label>
                              <div className="grid grid-cols-2 gap-2">
                                <Input
                                  id={`edit-sheet-click-cost-${sheetSize.id}`}
                                  type="number"
                                  step="0.01"
                                  value={editingSheetSizeData.clickCost}
                                  onChange={(e) => setEditingSheetSizeData({ ...editingSheetSizeData, clickCost: e.target.value })}
                                  placeholder="0.08"
                                />
                                <Select 
                                  value={editingSheetSizeData.clickCostCurrency} 
                                  onValueChange={(value) => setEditingSheetSizeData({ ...editingSheetSizeData, clickCostCurrency: value })}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Currency" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="USD">USD ($)</SelectItem>
                                    <SelectItem value="EUR">EUR (€)</SelectItem>
                                    <SelectItem value="TRY">TRY (₺)</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <Label htmlFor={`edit-sheet-width-${sheetSize.id}`}>Width (mm)</Label>
                              <Input
                                id={`edit-sheet-width-${sheetSize.id}`}
                                type="number"
                                value={editingSheetSizeData.width}
                                onChange={(e) => setEditingSheetSizeData({ ...editingSheetSizeData, width: e.target.value })}
                                placeholder="320"
                              />
                            </div>
                            <div>
                              <Label htmlFor={`edit-sheet-height-${sheetSize.id}`}>Height (mm)</Label>
                              <Input
                                id={`edit-sheet-height-${sheetSize.id}`}
                                type="number"
                                value={editingSheetSizeData.height}
                                onChange={(e) => setEditingSheetSizeData({ ...editingSheetSizeData, height: e.target.value })}
                                placeholder="450"
                              />
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              onClick={handleSaveSheetSize}
                              size="sm"
                              className="flex items-center gap-1"
                            >
                              <Save size={14} />
                              Save
                            </Button>
                            <Button
                              onClick={resetEditingSheetSizeForm}
                              variant="outline"
                              size="sm"
                              className="flex items-center gap-1"
                            >
                              <X size={14} />
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        // Display mode
                        <div className="flex items-center justify-between">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 flex-1">
                            <div>
                              <span className="font-medium">{sheetSize.name}</span>
                            </div>
                            <div>
                              <span className="text-gray-600">{sheetSize.width} × {sheetSize.height} mm</span>
                            </div>
                            <div>
                              <span className="text-gray-600">{sheetSize.clickCost} {sheetSize.clickCostCurrency || 'USD'}/click</span>
                            </div>
                            <div>
                              {sheetSize.duplexSupport ? (
                                <span className="text-green-600 text-xs">Duplex</span>
                              ) : (
                                <span className="text-gray-400 text-xs">No Duplex</span>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-1 ml-2">
                            <Button
                              onClick={() => handleEditSheetSize(machine.id, sheetSize)}
                              variant="outline"
                              size="sm"
                              className="flex items-center gap-1 text-blue-600 hover:text-blue-700"
                            >
                              <Edit2 size={12} />
                              Edit
                            </Button>
                            <Button
                              onClick={() => handleDeleteSheetSize(machine.id, sheetSize.id)}
                              variant="outline"
                              size="sm"
                              className="flex items-center gap-1 text-red-600 hover:text-red-700"
                            >
                              <Trash2 size={12} />
                              Delete
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default MachineManager;