import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Checkbox } from './ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Plus, Edit2, Trash2, Save, X, Scissors } from 'lucide-react';
import { useToast } from '../hooks/use-toast';

const ExtrasManager = ({ extras, onAddExtra, onUpdateExtra, onDeleteExtra }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    pricingType: 'per_page', // 'per_page', 'per_booklet', 'per_length'
    price: '',
    insideOutsideSame: false
  });
  const { toast } = useToast();

  const resetForm = () => {
    setFormData({
      name: '',
      pricingType: 'per_page',
      price: '',
      insideOutsideSame: false
    });
    setIsAdding(false);
    setEditingId(null);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!formData.name || !formData.price || !formData.pricingType) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive"
      });
      return;
    }

    const extraData = {
      name: formData.name,
      pricingType: formData.pricingType,
      price: parseFloat(formData.price),
      insideOutsideSame: formData.insideOutsideSame
    };

    if (editingId) {
      onUpdateExtra(editingId, extraData);
      toast({
        title: "Success",
        description: "Extra updated successfully"
      });
    } else {
      onAddExtra(extraData);
      toast({
        title: "Success", 
        description: "Extra added successfully"
      });
    }

    resetForm();
  };

  const handleEdit = (extra) => {
    setFormData({
      name: extra.name,
      pricingType: extra.pricingType,
      price: extra.price.toString(),
      insideOutsideSame: extra.insideOutsideSame || false
    });
    setEditingId(extra.id);
    setIsAdding(true);
  };

  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this extra?')) {
      onDeleteExtra(id);
      toast({
        title: "Success",
        description: "Extra deleted successfully"
      });
    }
  };

  const getPricingTypeLabel = (pricingType) => {
    switch (pricingType) {
      case 'per_page': return 'Per Page';
      case 'per_booklet': return 'Per Booklet/Unit';
      case 'per_length': return 'Per Length (mm)';
      default: return pricingType;
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Scissors className="h-5 w-5" />
          Extras Management
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!isAdding && (
          <Button 
            onClick={() => setIsAdding(true)}
            className="mb-4 flex items-center gap-2"
          >
            <Plus size={16} />
            Add Extra
          </Button>
        )}

        {isAdding && (
          <form onSubmit={handleSubmit} className="mb-6 p-4 border rounded-lg bg-gray-50">
            <h3 className="font-semibold mb-3">
              {editingId ? 'Edit Extra' : 'Add New Extra'}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="extraName">Extra Name</Label>
                <Input
                  id="extraName"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Cellophane Lamination, Staple Binding"
                />
              </div>
              <div>
                <Label htmlFor="pricingType">Pricing Type</Label>
                <Select value={formData.pricingType} onValueChange={(value) => setFormData({ ...formData, pricingType: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select pricing type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="per_page">Per Page</SelectItem>
                    <SelectItem value="per_booklet">Per Booklet/Unit</SelectItem>
                    <SelectItem value="per_length">Per Length (mm)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="price">Price ({getPricingTypeLabel(formData.pricingType)})</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  placeholder="0.00"
                />
              </div>
            </div>
            
            {/* Inside/Outside Same Checkbox */}
            <div className="mt-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="insideOutsideSame"
                  checked={formData.insideOutsideSame}
                  onCheckedChange={(checked) => setFormData({ ...formData, insideOutsideSame: checked })}
                />
                <Label htmlFor="insideOutsideSame" className="text-sm">
                  Inside/Outside = Same (if selected for both cover and inner, show only once under cover)
                </Label>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Enable this for extras that apply to the entire booklet (e.g., binding, spiral coils)
              </p>
            </div>
            
            <div className="flex gap-2 mt-4">
              <Button type="submit" size="sm">
                <Save size={14} className="mr-1" />
                {editingId ? 'Update' : 'Add'} Extra
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={resetForm}>
                <X size={14} className="mr-1" />
                Cancel
              </Button>
            </div>
          </form>
        )}

        <div className="space-y-3">
          {extras.map((extra) => (
            <div key={extra.id} className="p-4 border rounded-lg bg-white hover:bg-gray-50 transition-colors">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h4 className="font-semibold text-lg">{extra.name}</h4>
                  <p className="text-sm text-gray-600">
                    {getPricingTypeLabel(extra.pricingType)} - ${extra.price.toFixed(2)}
                  </p>
                  {extra.pricingType === 'per_length' && (
                    <p className="text-xs text-blue-600 mt-1">
                      Length-based pricing: Uses bound edge in Booklet Mode, user-selected edge in Normal Mode
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(extra)}
                    className="flex items-center gap-1"
                  >
                    <Edit2 size={14} />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(extra.id)}
                    className="flex items-center gap-1 text-red-600 hover:text-red-700"
                  >
                    <Trash2 size={14} />
                    Delete
                  </Button>
                </div>
              </div>
            </div>
          ))}
          
          {extras.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <Scissors className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>No extras added yet. Click "Add Extra" to get started.</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default ExtrasManager;