import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Plus, Edit2, Trash2, Save, X, FileText } from 'lucide-react';
import { useToast } from '../hooks/use-toast';

const PaperTypeManager = ({ paperTypes, onAddPaperType, onUpdatePaperType, onDeletePaperType }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    gsm: '',
    pricePerTon: '',
    stockSheetSizes: []
  });
  const [stockSheetForm, setStockSheetForm] = useState({
    name: '',
    width: '',
    height: ''
  });
  const [isAddingStockSheet, setIsAddingStockSheet] = useState(false);
  const { toast } = useToast();

  const resetForm = () => {
    setFormData({
      name: '',
      gsm: '',
      pricePerTon: '',
      stockSheetSizes: []
    });
    setStockSheetForm({
      name: '',
      width: '',
      height: ''
    });
    setIsAdding(false);
    setEditingId(null);
    setIsAddingStockSheet(false);
  };

  const resetStockSheetForm = () => {
    setStockSheetForm({
      name: '',
      width: '',
      height: ''
    });
    setIsAddingStockSheet(false);
  };

  const handleAddStockSheet = () => {
    if (!stockSheetForm.name || !stockSheetForm.width || !stockSheetForm.height) {
      toast({
        title: "Error",
        description: "Please fill in all stock sheet fields",
        variant: "destructive"
      });
      return;
    }

    const newStockSheet = {
      id: Date.now(),
      name: stockSheetForm.name,
      width: parseFloat(stockSheetForm.width),
      height: parseFloat(stockSheetForm.height),
      unit: 'mm'
    };

    setFormData({
      ...formData,
      stockSheetSizes: [...formData.stockSheetSizes, newStockSheet]
    });

    resetStockSheetForm();
    toast({
      title: "Success",
      description: "Stock sheet size added successfully"
    });
  };

  const handleRemoveStockSheet = (stockSheetId) => {
    setFormData({
      ...formData,
      stockSheetSizes: formData.stockSheetSizes.filter(size => size.id !== stockSheetId)
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!formData.name || !formData.gsm || !formData.pricePerTon || formData.stockSheetSizes.length === 0) {
      toast({
        title: "Error",
        description: "Please fill in all fields and add at least one stock sheet size",
        variant: "destructive"
      });
      return;
    }

    const paperData = {
      name: formData.name,
      gsm: parseFloat(formData.gsm),
      pricePerTon: parseFloat(formData.pricePerTon),
      stockSheetSizes: formData.stockSheetSizes
    };

    if (editingId) {
      onUpdatePaperType(editingId, paperData);
      toast({
        title: "Success",
        description: "Paper type updated successfully"
      });
    } else {
      onAddPaperType(paperData);
      toast({
        title: "Success",
        description: "Paper type added successfully"
      });
    }
    
    resetForm();
  };

  const handleEdit = (paper) => {
    setFormData({
      name: paper.name,
      gsm: paper.gsm.toString(),
      pricePerTon: paper.pricePerTon.toString(),
      stockSheetSizes: paper.stockSheetSizes
    });
    setEditingId(paper.id);
    setIsAdding(false);
  };

  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this paper type?')) {
      onDeletePaperType(id);
      toast({
        title: "Success",
        description: "Paper type deleted successfully"
      });
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Paper Types</span>
          <Button
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-2"
            disabled={isAdding || editingId}
          >
            <Plus size={16} />
            Add Paper Type
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {(isAdding || editingId) && (
          <form onSubmit={handleSubmit} className="mb-6 p-4 border rounded-lg bg-gray-50">
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="col-span-2">
                <Label htmlFor="name">Paper Type Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., 135g Glossy, 80g Standard"
                />
              </div>
              <div>
                <Label htmlFor="gsm">GSM (shared for all sizes)</Label>
                <Input
                  id="gsm"
                  type="number"
                  value={formData.gsm}
                  onChange={(e) => setFormData({ ...formData, gsm: e.target.value })}
                  placeholder="80"
                />
              </div>
              <div>
                <Label htmlFor="pricePerTon">Price per Ton ($) (shared for all sizes)</Label>
                <Input
                  id="pricePerTon"
                  type="number"
                  step="0.01"
                  value={formData.pricePerTon}
                  onChange={(e) => setFormData({ ...formData, pricePerTon: e.target.value })}
                  placeholder="850.00"
                />
              </div>
            </div>

            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <Label>Stock Sheet Sizes</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsAddingStockSheet(true)}
                  disabled={isAddingStockSheet}
                  className="flex items-center gap-2"
                >
                  <Plus size={14} />
                  Add Stock Sheet Size
                </Button>
              </div>

              {isAddingStockSheet && (
                <div className="p-3 border rounded-lg bg-white mb-3">
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <Label htmlFor="stockName">Size Name</Label>
                      <Input
                        id="stockName"
                        value={stockSheetForm.name}
                        onChange={(e) => setStockSheetForm({ ...stockSheetForm, name: e.target.value })}
                        placeholder="e.g., A4, SRA3, B2"
                      />
                    </div>
                    <div>
                      <Label htmlFor="stockWidth">Width (mm)</Label>
                      <Input
                        id="stockWidth"
                        type="number"
                        value={stockSheetForm.width}
                        onChange={(e) => setStockSheetForm({ ...stockSheetForm, width: e.target.value })}
                        placeholder="210"
                      />
                    </div>
                    <div>
                      <Label htmlFor="stockHeight">Height (mm)</Label>
                      <Input
                        id="stockHeight"
                        type="number"
                        value={stockSheetForm.height}
                        onChange={(e) => setStockSheetForm({ ...stockSheetForm, height: e.target.value })}
                        placeholder="297"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <Button type="button" size="sm" onClick={handleAddStockSheet}>
                      Add Size
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={resetStockSheetForm}>
                      Cancel
                    </Button>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                {formData.stockSheetSizes.map((stockSheet) => (
                  <div key={stockSheet.id} className="flex items-center justify-between p-2 bg-white border rounded">
                    <div className="flex-1">
                      <span className="font-medium">{stockSheet.name}</span>
                      <span className="text-sm text-gray-500 ml-2">
                        {stockSheet.width} × {stockSheet.height} mm
                      </span>
                      <span className="text-sm text-gray-500 ml-2">
                        ({((stockSheet.width * stockSheet.height) / 1000000).toFixed(3)} m²)
                      </span>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleRemoveStockSheet(stockSheet.id)}
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
                {editingId ? 'Update' : 'Add'} Paper Type
              </Button>
              <Button type="button" variant="outline" onClick={resetForm} className="flex items-center gap-2">
                <X size={16} />
                Cancel
              </Button>
            </div>
          </form>
        )}

        <div className="grid gap-4">
          {paperTypes.map((paper) => (
            <div key={paper.id} className="p-4 border rounded-lg bg-white hover:bg-gray-50 transition-colors">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-lg">{paper.name}</h3>
                  <div className="flex gap-4 mt-1 text-sm text-gray-600">
                    <span><strong>GSM:</strong> {paper.gsm}</span>
                    <span><strong>Price:</strong> ${paper.pricePerTon}/ton</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(paper)}
                    disabled={isAdding || editingId}
                    className="flex items-center gap-1"
                  >
                    <Edit2 size={14} />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(paper.id)}
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
                  <FileText size={16} />
                  Stock Sheet Sizes ({paper.stockSheetSizes.length})
                </div>
                <div className="grid gap-2">
                  {paper.stockSheetSizes.map((stockSheet) => (
                    <div key={stockSheet.id} className="pl-4 p-2 bg-gray-100 rounded text-sm">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        <div>
                          <span className="font-medium">{stockSheet.name}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">{stockSheet.width} × {stockSheet.height} mm</span>
                        </div>
                        <div>
                          <span className="text-gray-600">{((stockSheet.width * stockSheet.height) / 1000000).toFixed(3)} m²</span>
                        </div>
                        <div>
                          <span className="text-gray-600">{paper.gsm} GSM</span>
                        </div>
                      </div>
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

export default PaperTypeManager;