import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Checkbox } from './ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Plus, Edit2, Trash2, Save, X, Scissors, Minus } from 'lucide-react';
import { useToast } from '../hooks/use-toast';

// Helper function to format price with appropriate decimal places
const formatPriceDynamic = (price, currency = 'USD', maxDecimals = 4) => {
  const numPrice = parseFloat(price) || 0;
  // For very small prices (< 0.01), use up to 4 decimal places
  if (Math.abs(numPrice) < 0.01 && Math.abs(numPrice) > 0) {
    return `${numPrice.toFixed(maxDecimals)} ${currency}`;
  }
  // For small prices (< 1), use up to 3 decimal places
  else if (Math.abs(numPrice) < 1) {
    return `${numPrice.toFixed(3)} ${currency}`;
  }
  // For normal prices, use 2 decimal places
  else {
    return `${numPrice.toFixed(2)} ${currency}`;
  }
};

const ExtrasManager = ({ extras, onAddExtra, onUpdateExtra, onDeleteExtra }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    pricingType: 'per_page', // 'per_page', 'per_booklet', 'per_length'
    insideOutsideSame: false,
    supportsDoubleSided: false,
    applyToPrintSheet: false, // New field: apply pricing to print sheet dimensions
    variants: [{ variantName: '', price: '', currency: 'USD' }] // Array of variants with currency
  });
  const { toast } = useToast();

  const resetForm = () => {
    setFormData({
      name: '',
      pricingType: 'per_page',
      setupCost: '',
      setupCostCurrency: 'USD',
      insideOutsideSame: false,
      supportsDoubleSided: false,
      applyToPrintSheet: false,
      bookletApplicationScope: 'both', // New field for booklet application scope
      variants: [{ variantName: '', price: '', currency: 'USD' }]
    });
    setIsAdding(false);
    setEditingId(null);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Validate basic fields
    if (!formData.name || !formData.pricingType) {
      toast({
        title: "Error",
        description: "Please fill in name and pricing type",
        variant: "destructive"
      });
      return;
    }

    // Validate variants
    const validVariants = formData.variants.filter(v => v.variantName && v.price && v.currency);
    if (validVariants.length === 0) {
      toast({
        title: "Error", 
        description: "Please add at least one variant with name, price, and currency",
        variant: "destructive"
      });
      return;
    }

    // Process variants
    const variants = validVariants.map(variant => ({
      variantName: variant.variantName,
      price: parseFloat(variant.price),
      currency: variant.currency
    }));

    const extraData = {
      name: formData.name,
      pricingType: formData.pricingType,
      setupCost: formData.setupCost ? parseFloat(formData.setupCost) : 0,
      setupCostCurrency: formData.setupCostCurrency || 'USD',
      insideOutsideSame: formData.insideOutsideSame,
      supportsDoubleSided: formData.supportsDoubleSided,
      applyToPrintSheet: formData.applyToPrintSheet,
      bookletApplicationScope: formData.bookletApplicationScope || 'both', // Include new field
      variants: variants
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
        description: "Extra created successfully"
      });
    }

    resetForm();
  };

  const handleEdit = (extra) => {
    setFormData({
      name: extra.name,
      pricingType: extra.pricingType,
      setupCost: extra.setupCost ? extra.setupCost.toString() : '',
      setupCostCurrency: extra.setupCostCurrency || 'USD',
      insideOutsideSame: extra.insideOutsideSame || false,
      supportsDoubleSided: extra.supportsDoubleSided || false,
      applyToPrintSheet: extra.applyToPrintSheet || false,
      variants: extra.variants?.map(v => ({
        id: v.id,
        variantName: v.variantName,
        price: v.price.toString(),
        currency: v.currency || 'USD'
      })) || [{ variantName: '', price: '', currency: 'USD' }]
    });
    setEditingId(extra.id);
    setIsAdding(true);
  };

  // Variant management functions
  const addVariant = () => {
    setFormData({
      ...formData,
      variants: [...formData.variants, { variantName: '', price: '', currency: 'USD' }]
    });
  };

  const removeVariant = (index) => {
    if (formData.variants.length > 1) {
      const newVariants = formData.variants.filter((_, i) => i !== index);
      setFormData({ ...formData, variants: newVariants });
    }
  };

  const updateVariant = (index, field, value) => {
    const newVariants = [...formData.variants];
    newVariants[index][field] = value;
    setFormData({ ...formData, variants: newVariants });
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
      case 'per_length': return 'Per Length (cm)';
      case 'per_form': return 'Per Form Pricing';
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
                    <SelectItem value="per_length">Per Length (cm)</SelectItem>
                    <SelectItem value="per_form">Per Form Pricing</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {/* Setup Cost Section */}
              <div>
                <Label htmlFor="setupCost">Setup Cost (Optional)</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    type="number"
                    step="0.01"
                    id="setupCost"
                    value={formData.setupCost}
                    onChange={(e) => setFormData({ ...formData, setupCost: e.target.value })}
                    placeholder="0.00"
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
                <p className="text-sm text-gray-500 mt-1">
                  One-time setup cost applied once per job (like machine setup cost)
                </p>
              </div>
            </div>

            {/* Variants Section */}
            <div className="mt-4">
              <div className="flex items-center justify-between mb-3">
                <Label className="text-base font-semibold">Variants</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addVariant}
                  className="flex items-center gap-1"
                >
                  <Plus size={14} />
                  Add Variant
                </Button>
              </div>
              
              <div className="space-y-3">
                {formData.variants.map((variant, index) => (
                  <div key={index} className="grid grid-cols-3 gap-3 p-3 border rounded bg-white">
                    <div>
                      <Label>Variant Name</Label>
                      <Input
                        value={variant.variantName}
                        onChange={(e) => updateVariant(index, 'variantName', e.target.value)}
                        placeholder="e.g., Standard, Premium, Matte"
                      />
                    </div>
                    <div>
                      <Label>Price ({getPricingTypeLabel(formData.pricingType)})</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={variant.price}
                        onChange={(e) => updateVariant(index, 'price', e.target.value)}
                        placeholder="0.00"
                      />
                    </div>
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <Label>Currency</Label>
                        <Select 
                          value={variant.currency || 'USD'} 
                          onValueChange={(value) => updateVariant(index, 'currency', value)}
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
                      {formData.variants.length > 1 && (
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          onClick={() => removeVariant(index)}
                          className="mt-6"
                        >
                          <Minus size={14} />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              
              <p className="text-xs text-gray-500 mt-2">
                Add multiple variants with different prices. All variants share the same pricing method and inside/outside settings.
              </p>
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

            {/* Supports Double-Sided Checkbox */}
            <div className="mt-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="supportsDoubleSided"
                  checked={formData.supportsDoubleSided}
                  onCheckedChange={(checked) => setFormData({ ...formData, supportsDoubleSided: checked })}
                />
                <Label htmlFor="supportsDoubleSided" className="text-sm">
                  Supports Double-Sided Application (can be applied to one or both sides of a page)
                </Label>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Enable this for extras like lamination or coating that can be applied to one side or both sides
              </p>
            </div>

            {/* Apply to Print Sheet Checkbox */}
            <div className="mt-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="applyToPrintSheet"
                  checked={formData.applyToPrintSheet}
                  onCheckedChange={(checked) => setFormData({ ...formData, applyToPrintSheet: checked })}
                />
                <Label htmlFor="applyToPrintSheet" className="text-sm">
                  Apply to Print Sheet Dimensions (use print sheet size instead of page size for calculations)
                </Label>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Enable this for extras that should be priced based on print sheet dimensions rather than individual page dimensions
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
                  <p className="text-sm text-gray-600 mb-2">
                    {getPricingTypeLabel(extra.pricingType)}
                  </p>
                  
                  {/* Display Variants */}
                  <div className="space-y-1 mb-2">
                    {extra.variants?.map((variant, index) => (
                      <div key={variant.id || index} className="text-sm bg-gray-100 px-2 py-1 rounded flex justify-between">
                        <span className="font-medium">{variant.variantName}</span>
                        <span className="text-gray-600">
                          {formatPriceDynamic(variant.price, variant.currency || 'USD')}
                          {extra.pricingType === 'per_length' ? '/cm' : 
                           extra.pricingType === 'per_page' ? '/page' :
                           extra.pricingType === 'per_form' ? '/form' :
                           '/unit'}
                        </span>
                      </div>
                    )) || (
                      <p className="text-sm text-red-500">No variants available</p>
                    )}
                  </div>
                  
                  {/* Setup Cost Display */}
                  {extra.setupCost && extra.setupCost > 0 && (
                    <div className="mt-2">
                      <p className="text-sm font-medium text-orange-600">
                        Setup Cost: {formatPriceDynamic(extra.setupCost, extra.setupCostCurrency || 'USD')} (one-time per job)
                      </p>
                    </div>
                  )}
                  
                  {extra.pricingType === 'per_length' && (
                    <p className="text-xs text-blue-600 mt-1">
                      Length-based pricing (cm): Uses bound edge in Booklet Mode, user-selected edge in Normal Mode
                    </p>
                  )}
                  {extra.insideOutsideSame && (
                    <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                      ✓ Inside/Outside Same - Shows once when selected for both cover and inner
                    </p>
                  )}
                  {extra.supportsDoubleSided && (
                    <p className="text-xs text-blue-600 mt-1 flex items-center gap-1">
                      ✓ Supports Double-Sided - Can be applied to one or both sides of a page
                    </p>
                  )}
                  {extra.applyToPrintSheet && (
                    <p className="text-xs text-purple-600 mt-1 flex items-center gap-1">
                      ✓ Print Sheet Dimensions - Uses print sheet size for calculations
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