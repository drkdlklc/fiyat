import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Plus, Edit2, Trash2, Save, X } from 'lucide-react';
import { useToast } from '../hooks/use-toast';

const MachineManager = ({ machines, onAddMachine, onUpdateMachine, onDeleteMachine }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    maxSheetWidth: '',
    maxSheetHeight: '',
    clickCost: '',
    setupCost: ''
  });
  const { toast } = useToast();

  const resetForm = () => {
    setFormData({
      name: '',
      maxSheetWidth: '',
      maxSheetHeight: '',
      clickCost: '',
      setupCost: ''
    });
    setIsAdding(false);
    setEditingId(null);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!formData.name || !formData.maxSheetWidth || !formData.maxSheetHeight || !formData.clickCost || !formData.setupCost) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive"
      });
      return;
    }

    const machineData = {
      name: formData.name,
      maxSheetWidth: parseFloat(formData.maxSheetWidth),
      maxSheetHeight: parseFloat(formData.maxSheetHeight),
      clickCost: parseFloat(formData.clickCost),
      setupCost: parseFloat(formData.setupCost),
      unit: 'mm'
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
      maxSheetWidth: machine.maxSheetWidth.toString(),
      maxSheetHeight: machine.maxSheetHeight.toString(),
      clickCost: machine.clickCost.toString(),
      setupCost: machine.setupCost.toString()
    });
    setEditingId(machine.id);
    setIsAdding(false);
  };

  const handleDelete = (id) => {
    onDeleteMachine(id);
    toast({
      title: "Success",
      description: "Machine deleted successfully"
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
            <div className="grid grid-cols-2 gap-4">
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
                <Label htmlFor="maxSheetWidth">Max Sheet Width (mm)</Label>
                <Input
                  id="maxSheetWidth"
                  type="number"
                  value={formData.maxSheetWidth}
                  onChange={(e) => setFormData({ ...formData, maxSheetWidth: e.target.value })}
                  placeholder="370"
                />
              </div>
              <div>
                <Label htmlFor="maxSheetHeight">Max Sheet Height (mm)</Label>
                <Input
                  id="maxSheetHeight"
                  type="number"
                  value={formData.maxSheetHeight}
                  onChange={(e) => setFormData({ ...formData, maxSheetHeight: e.target.value })}
                  placeholder="520"
                />
              </div>
              <div>
                <Label htmlFor="clickCost">Click Cost ($)</Label>
                <Input
                  id="clickCost"
                  type="number"
                  step="0.01"
                  value={formData.clickCost}
                  onChange={(e) => setFormData({ ...formData, clickCost: e.target.value })}
                  placeholder="0.08"
                />
              </div>
              <div>
                <Label htmlFor="setupCost">Setup Cost ($)</Label>
                <Input
                  id="setupCost"
                  type="number"
                  step="0.01"
                  value={formData.setupCost}
                  onChange={(e) => setFormData({ ...formData, setupCost: e.target.value })}
                  placeholder="45.00"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
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
            <div key={machine.id} className="p-4 border rounded-lg flex items-center justify-between bg-white hover:bg-gray-50 transition-colors">
              <div className="flex-1">
                <h3 className="font-semibold text-lg">{machine.name}</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2 text-sm text-gray-600">
                  <div>
                    <span className="font-medium">Max Size:</span> {machine.maxSheetWidth} × {machine.maxSheetHeight} mm
                  </div>
                  <div>
                    <span className="font-medium">Click Cost:</span> ${machine.clickCost}
                  </div>
                  <div>
                    <span className="font-medium">Setup Cost:</span> ${machine.setupCost}
                  </div>
                  <div>
                    <span className="font-medium">Max Area:</span> {((machine.maxSheetWidth * machine.maxSheetHeight) / 1000000).toFixed(3)} m²
                  </div>
                </div>
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
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default MachineManager;