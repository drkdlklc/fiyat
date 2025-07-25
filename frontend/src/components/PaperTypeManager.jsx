import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Plus, Edit2, Trash2, Save, X } from 'lucide-react';
import { useToast } from '../hooks/use-toast';

const PaperTypeManager = ({ paperTypes, onAddPaperType, onUpdatePaperType, onDeletePaperType }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    width: '',
    height: '',
    gsm: '',
    pricePerTon: ''
  });
  const { toast } = useToast();

  const resetForm = () => {
    setFormData({
      name: '',
      width: '',
      height: '',
      gsm: '',
      pricePerTon: ''
    });
    setIsAdding(false);
    setEditingId(null);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!formData.name || !formData.width || !formData.height || !formData.gsm || !formData.pricePerTon) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive"
      });
      return;
    }

    const paperData = {
      name: formData.name,
      width: parseFloat(formData.width),
      height: parseFloat(formData.height),
      gsm: parseFloat(formData.gsm),
      pricePerTon: parseFloat(formData.pricePerTon),
      unit: 'mm'
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
      width: paper.width.toString(),
      height: paper.height.toString(),
      gsm: paper.gsm.toString(),
      pricePerTon: paper.pricePerTon.toString()
    });
    setEditingId(paper.id);
    setIsAdding(false);
  };

  const handleDelete = (id) => {
    onDeletePaperType(id);
    toast({
      title: "Success",
      description: "Paper type deleted successfully"
    });
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
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., A4 Standard"
                />
              </div>
              <div>
                <Label htmlFor="gsm">GSM</Label>
                <Input
                  id="gsm"
                  type="number"
                  value={formData.gsm}
                  onChange={(e) => setFormData({ ...formData, gsm: e.target.value })}
                  placeholder="80"
                />
              </div>
              <div>
                <Label htmlFor="width">Width (mm)</Label>
                <Input
                  id="width"
                  type="number"
                  value={formData.width}
                  onChange={(e) => setFormData({ ...formData, width: e.target.value })}
                  placeholder="210"
                />
              </div>
              <div>
                <Label htmlFor="height">Height (mm)</Label>
                <Input
                  id="height"
                  type="number"
                  value={formData.height}
                  onChange={(e) => setFormData({ ...formData, height: e.target.value })}
                  placeholder="297"
                />
              </div>
              <div className="col-span-2">
                <Label htmlFor="pricePerTon">Price per Ton ($)</Label>
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
            <div className="flex gap-2 mt-4">
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
            <div key={paper.id} className="p-4 border rounded-lg flex items-center justify-between bg-white hover:bg-gray-50 transition-colors">
              <div className="flex-1">
                <h3 className="font-semibold text-lg">{paper.name}</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2 text-sm text-gray-600">
                  <div>
                    <span className="font-medium">Size:</span> {paper.width} × {paper.height} mm
                  </div>
                  <div>
                    <span className="font-medium">GSM:</span> {paper.gsm}
                  </div>
                  <div>
                    <span className="font-medium">Price:</span> ${paper.pricePerTon}/ton
                  </div>
                  <div>
                    <span className="font-medium">Area:</span> {((paper.width * paper.height) / 1000000).toFixed(3)} m²
                  </div>
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
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default PaperTypeManager;