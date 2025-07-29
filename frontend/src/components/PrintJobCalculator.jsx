import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Checkbox } from './ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import AutocompleteSelect from './ui/autocomplete-select';
import { Calculator, FileText, Award, Settings, CheckCircle, Plus, Minus, TrendingUp, DollarSign, X, Printer, Info } from 'lucide-react';
import { useToast } from '../hooks/use-toast';
import { findOptimalPrintSheetSize, calculateOptimalForPaperType, calculateCoverCost, calculateInnerPagesCost, calculateMultiPartCost, calculateMultiPartInnerPagesCost, calculateExtrasCost } from '../data/mockData';
import html2pdf from 'html2pdf.js';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { convertToEURSync, formatEURPrice, formatEURPriceDynamic, convertExtraCostToEUR } from '../utils/currencyConverter';

const PrintJobCalculator = ({ paperTypes, machines, extras, exchangeRates }) => {
  
  // Currency conversion helper functions
  const convertResultsCostsToEUR = (results) => {
    let coverCostEUR = 0;
    let innerCostEUR = 0;
    let coverExtrasEUR = 0;
    let innerExtrasEUR = 0;

    // Convert cover costs to EUR - calculation functions already return EUR values
    if (results.coverResults) {
      // The calculation functions already convert everything to EUR, so no additional conversion needed
      coverCostEUR = results.coverResults.totalCost;
      console.log('Cover cost already in EUR:', coverCostEUR);
    }

    // Convert inner pages costs to EUR - calculation functions already return EUR values
    if (results.innerPagesResults) {
      innerCostEUR = results.innerPagesResults.totalCost;
      console.log('Inner pages cost already in EUR:', innerCostEUR);
    } else if (results.multiPartResults) {
      innerCostEUR = results.multiPartResults.totalCost;
      console.log('Multi-part cost already in EUR:', innerCostEUR);
    }

    // Convert extras costs to EUR
    if (results.extrasResults?.coverExtras) {
      coverExtrasEUR = results.extrasResults.coverExtras.reduce((sum, extra) => {
        const currency = extra.originalPrice?.currency || 'EUR';
        const convertedCost = convertToEURSync(extra.totalCost, currency);
        console.log(`Cover extra ${extra.extraName} converted from ${currency}: ${extra.totalCost} -> ${convertedCost} EUR`);
        return sum + convertedCost;
      }, 0);
    }

    if (results.extrasResults?.innerExtras) {
      innerExtrasEUR = results.extrasResults.innerExtras.reduce((sum, extra) => {
        const currency = extra.originalPrice?.currency || 'EUR';
        const convertedCost = convertToEURSync(extra.totalCost, currency);
        console.log(`Inner extra ${extra.extraName} converted from ${currency}: ${extra.totalCost} -> ${convertedCost} EUR`);
        return sum + convertedCost;
      }, 0);
    }

    const totalEUR = coverCostEUR + innerCostEUR + coverExtrasEUR + innerExtrasEUR;
    console.log('Total EUR breakdown:', { coverCostEUR, innerCostEUR, coverExtrasEUR, innerExtrasEUR, totalEUR });

    return {
      coverCostEUR,
      innerCostEUR, 
      coverExtrasEUR,
      innerExtrasEUR,
      totalEUR
    };
  };
  const resultsRef = useRef(null);
  const [jobData, setJobData] = useState({
    productName: '',
    finalWidth: '',
    finalHeight: '',
    marginTop: '3',
    marginRight: '3',
    marginBottom: '3',
    marginLeft: '3',
    quantity: '',
    isDoubleSided: true, // Default to double-sided
    setupRequired: false,
    isBookletMode: false,
    hasCover: false, // Default to no cover
    coverSetupRequired: false,
    totalPages: '',
    useMultiPartConfiguration: false,
    useMultiPartInnerConfiguration: false,
    bindingEdge: 'long' // 'short' or 'long' - defaults to long edge binding
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
  const [selectedExtras, setSelectedExtras] = useState([]);
  const [selectedCoverExtras, setSelectedCoverExtras] = useState([]);
  const [selectedInnerExtras, setSelectedInnerExtras] = useState([]);
  const [lengthBasedEdge, setLengthBasedEdge] = useState('long'); // For Normal Mode length-based extras
  const [coverBindingEdge, setCoverBindingEdge] = useState('long'); // Separate binding edge for cover - defaults to long edge
  const [innerBindingEdge, setInnerBindingEdge] = useState('long'); // Separate binding edge for inner - defaults to long edge

  // New state for improved extras workflow
  const [selectedExtraId, setSelectedExtraId] = useState(''); // Currently selected extra from dropdown
  const [selectedVariantId, setSelectedVariantId] = useState(''); // Currently selected variant
  const [selectedCoverExtraId, setSelectedCoverExtraId] = useState('');
  const [selectedCoverVariantId, setSelectedCoverVariantId] = useState('');
  const [selectedInnerExtraId, setSelectedInnerExtraId] = useState('');
  const [selectedInnerVariantId, setSelectedInnerVariantId] = useState('');
  
  // New state for single/double-sided selection
  const [isDoubleSided, setIsDoubleSided] = useState(false);
  const [isCoverDoubleSided, setIsCoverDoubleSided] = useState(false);
  const [isInnerDoubleSided, setIsInnerDoubleSided] = useState(false);
  const [multiPartConfigurations, setMultiPartConfigurations] = useState([
    { id: 1, paperTypeId: null, machineId: null, pageCount: '' }
  ]);
  const [multiPartInnerConfigurations, setMultiPartInnerConfigurations] = useState([
    { id: 1, paperTypeId: null, machineId: null, pageCount: '' }
  ]);
  const [results, setResults] = useState(null);
  const [showOptimalOnly, setShowOptimalOnly] = useState(true);
  const { toast } = useToast();

  // Update main binding edge when not in booklet mode 
  useEffect(() => {
    if (!jobData.isBookletMode && jobData.bindingEdge) {
      // In normal mode, sync the extras binding edge with main binding edge
      setLengthBasedEdge(jobData.bindingEdge);
      console.log('Normal mode: synchronized extras binding edge to:', jobData.bindingEdge);
    }
  }, [jobData.bindingEdge, jobData.isBookletMode]);

  // Independent binding edge handlers for booklet mode
  const handleCoverBindingEdgeChange = (value) => {
    setCoverBindingEdge(value);
    console.log('Cover binding edge changed to:', value);
  };

  const handleInnerBindingEdgeChange = (value) => {
    setInnerBindingEdge(value);
    // Update the main binding edge to match inner pages (inner pages are typically the "main" content)
    setJobData({ ...jobData, bindingEdge: value });
    console.log('Inner binding edge changed to:', value, '(also updated main binding edge)');
  };

  // Alternative PDF Generation Function using html2canvas + jsPDF
  const generatePDFAlternative = async () => {
    if (!results || !resultsRef.current) {
      toast({
        title: "Error",
        description: "No calculation results to print. Please calculate first.",
        variant: "destructive"
      });
      return;
    }

    try {
      toast({
        title: "Generating PDF",
        description: "Please wait while we generate your PDF..."
      });

      const element = resultsRef.current;
      
      // Take screenshot using html2canvas
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        width: element.scrollWidth,
        height: element.scrollHeight
      });

      // Create PDF
      const imgData = canvas.toDataURL('image/jpeg', 0.8);
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      // Add company header
      pdf.setFontSize(20);
      pdf.setTextColor(30, 64, 175); // Blue color
      pdf.text('Print and Smile', 105, 20, { align: 'center' });
      
      pdf.setFontSize(10);
      pdf.setTextColor(107, 114, 128); // Gray color
      pdf.text('www.printandsmile.com.tr - Professional Printing Solutions', 105, 28, { align: 'center' });
      pdf.text(`Quote Generated: ${new Date().toLocaleDateString()}`, 105, 34, { align: 'center' });
      
      // Add the screenshot
      const imgWidth = 190; // A4 width minus margins
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      // Scale down if too tall for page
      let finalHeight = imgHeight;
      let yPosition = 45;
      
      if (imgHeight > 250) { // If taller than page allows
        finalHeight = 250;
        yPosition = 45;
      }
      
      pdf.addImage(imgData, 'JPEG', 10, yPosition, imgWidth, finalHeight);
      
      // Save PDF
      const currentDate = new Date().toISOString().split('T')[0];
      const productName = jobData.productName || 'PrintJob';
      const filename = `${productName}_Quote_${currentDate}.pdf`;
      
      pdf.save(filename);
      
      toast({
        title: "Success",
        description: "PDF generated successfully using alternative method!",
        variant: "default"
      });
      
    } catch (error) {
      console.error('Alternative PDF generation error:', error);
      toast({
        title: "Error",
        description: `Alternative PDF generation failed: ${error.message}`,
        variant: "destructive"
      });
    }
  };

  // PDF Generation Function
  const generatePDF = async () => {
    if (!results || !resultsRef.current) {
      toast({
        title: "Error",
        description: "No calculation results to print. Please calculate first.",
        variant: "destructive"
      });
      return;
    }

    try {
      // Show loading toast
      toast({
        title: "Generating PDF",
        description: "Please wait while we generate your PDF..."
      });

      // Get current date for filename
      const currentDate = new Date().toISOString().split('T')[0];
      const productName = jobData.productName || 'PrintJob';
      const filename = `${productName}_Quote_${currentDate}.pdf`;

      // Simple approach - capture the content directly
      const element = resultsRef.current;
      
      // Debug: Check if element exists and has content
      console.log('Element found:', !!element);
      console.log('Element content:', element ? element.textContent.substring(0, 100) : 'No content');
      console.log('Element HTML length:', element ? element.innerHTML.length : 0);

      if (!element || !element.innerHTML.trim()) {
        throw new Error('No content found to generate PDF');
      }

      // Create header content to prepend
      const headerHtml = `
        <div style="text-align: center; margin-bottom: 20px; border-bottom: 2px solid #1e40af; padding-bottom: 15px; background: white;">
          <h1 style="color: #1e40af; font-size: 24px; margin: 0; font-weight: bold;">Print and Smile</h1>
          <p style="color: #6b7280; margin: 5px 0; font-size: 14px;">www.printandsmile.com.tr - Professional Printing Solutions</p>
          <p style="color: #6b7280; margin: 0; font-size: 12px;">Quote Generated: ${new Date().toLocaleDateString()}</p>
        </div>
      `;

      // Clone the original element
      const clonedElement = element.cloneNode(true);
      
      // Remove buttons from cloned content
      const buttons = clonedElement.querySelectorAll('button');
      buttons.forEach(btn => btn.remove());
      
      // Create wrapper with header
      const wrapper = document.createElement('div');
      wrapper.style.cssText = 'background: white; padding: 20px; font-family: Arial, sans-serif;';
      wrapper.innerHTML = headerHtml + clonedElement.innerHTML;

      // Very basic PDF options
      const opt = {
        margin: [10, 10, 10, 10],
        filename: filename,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { 
          scale: 2,
          useCORS: true,
          backgroundColor: '#ffffff'
        },
        jsPDF: { 
          unit: 'mm', 
          format: 'a4', 
          orientation: 'portrait'
        }
      };

      // Add to body temporarily
      document.body.appendChild(wrapper);
      
      console.log('About to generate PDF...');
      
      // Try the html2pdf method first, if it fails, try the alternative
      try {
        await html2pdf().set(opt).from(wrapper).save();
        console.log('PDF generation completed with html2pdf');
      } catch (htmlToPdfError) {
        console.log('html2pdf failed, trying alternative method...');
        document.body.removeChild(wrapper);
        await generatePDFAlternative();
        return;
      }
      
      // Remove from body
      document.body.removeChild(wrapper);
      
      toast({
        title: "Success",
        description: "PDF generated successfully!",
        variant: "default"
      });
      
    } catch (error) {
      console.error('PDF generation error:', error);
      toast({
        title: "Error",
        description: `PDF generation failed: ${error.message}`,
        variant: "destructive"
      });
      
      // Try alternative method as fallback
      try {
        await generatePDFAlternative();
      } catch (altError) {
        console.error('Alternative PDF method also failed:', altError);
      }
    }
  };

  // Helper functions for the new extras workflow
  const addExtraWithVariant = (extraId, variantId, section = 'normal') => {
    const extra = extras.find(e => e.id === parseInt(extraId));
    const variant = extra?.variants?.find(v => v.id === parseInt(variantId));
    
    if (!extra || !variant) {
      toast({
        title: "Error",
        description: "Invalid extra or variant selection",
        variant: "destructive"
      });
      return;
    }

    // Get the appropriate double-sided setting
    let isDoubleSidedSelected = false;
    if (section === 'normal') {
      isDoubleSidedSelected = isDoubleSided;
    } else if (section === 'cover') {
      isDoubleSidedSelected = isCoverDoubleSided;
    } else if (section === 'inner') {
      isDoubleSidedSelected = isInnerDoubleSided;
    }

    const newExtra = {
      extraId: extra.id,
      variantId: variant.id,
      variantName: variant.variantName,
      price: variant.price,
      isDoubleSided: extra.supportsDoubleSided ? isDoubleSidedSelected : false
    };

    // Check for duplicates before adding
    if (section === 'normal') {
      const existingExtra = selectedExtras.find(e => 
        e.extraId === newExtra.extraId && 
        e.variantId === newExtra.variantId && 
        e.isDoubleSided === newExtra.isDoubleSided
      );
      
      if (existingExtra) {
        toast({
          title: "Already Added",
          description: `${extra.name} - ${variant.variantName} is already in your selection`,
          variant: "default"
        });
        return;
      }
      
      setSelectedExtras([...selectedExtras, newExtra]);
      setSelectedExtraId('');
      setSelectedVariantId('');
      setIsDoubleSided(false); // Reset
    } else if (section === 'cover') {
      const existingExtra = selectedCoverExtras.find(e => 
        e.extraId === newExtra.extraId && 
        e.variantId === newExtra.variantId && 
        e.isDoubleSided === newExtra.isDoubleSided
      );
      
      if (existingExtra) {
        toast({
          title: "Already Added",
          description: `${extra.name} - ${variant.variantName} is already in your cover selection`,
          variant: "default"
        });
        return;
      }
      
      setSelectedCoverExtras([...selectedCoverExtras, newExtra]);
      setSelectedCoverExtraId('');
      setSelectedCoverVariantId('');
      setIsCoverDoubleSided(false); // Reset
      
      // If this is an Inside/Outside Same extra, show info message
      if (extra.insideOutsideSame) {
        toast({
          title: "Info", 
          description: `${extra.name} is marked as "Inside/Outside Same" and will apply to both cover and inner pages.`,
          variant: "default"
        });
      }
    } else if (section === 'inner') {
      const existingExtra = selectedInnerExtras.find(e => 
        e.extraId === newExtra.extraId && 
        e.variantId === newExtra.variantId && 
        e.isDoubleSided === newExtra.isDoubleSided
      );
      
      if (existingExtra) {
        toast({
          title: "Already Added",
          description: `${extra.name} - ${variant.variantName} is already in your inner selection`,
          variant: "default"
        });
        return;
      }
      
      setSelectedInnerExtras([...selectedInnerExtras, newExtra]);
      setSelectedInnerExtraId('');
      setSelectedInnerVariantId('');
      setIsInnerDoubleSided(false); // Reset
    }

    toast({
      title: "Success",
      description: `Added ${extra.name} - ${variant.variantName}${newExtra.isDoubleSided ? ' (Double-Sided)' : ''}`,
    });
  };

  const removeExtraFromSection = (extraId, variantId, section = 'normal') => {
    if (section === 'normal') {
      setSelectedExtras(selectedExtras.filter(e => !(e.extraId === extraId && e.variantId === variantId)));
    } else if (section === 'cover') {
      setSelectedCoverExtras(selectedCoverExtras.filter(e => !(e.extraId === extraId && e.variantId === variantId)));
    } else if (section === 'inner') {
      setSelectedInnerExtras(selectedInnerExtras.filter(e => !(e.extraId === extraId && e.variantId === variantId)));
    }
  };

  // Function to consolidate extras that have insideOutsideSame flag
  const consolidateExtrasForBooklet = (coverExtras, innerExtras, extrasData, selectedCoverExtras, selectedInnerExtras, hasCover) => {
    // If has cover: insideOutsideSame extras should only appear in cover section
    // If no cover: insideOutsideSame extras should only appear in inner section
    // In both cases, they should be marked as applying to both cover and inner
    
    const consolidatedCover = [...coverExtras];
    const consolidatedInner = [...innerExtras];
    
    // Update consolidated extras to indicate they apply to both sections
    consolidatedCover.forEach((coverExtra, index) => {
      const extraData = extrasData.find(e => e.id === coverExtra.extraId);
      if (extraData && extraData.insideOutsideSame && hasCover) {
        consolidatedCover[index] = {
          ...coverExtra,
          unitType: 'booklet (cover + inner)',
          isConsolidated: true
        };
      }
    });
    
    consolidatedInner.forEach((innerExtra, index) => {
      const extraData = extrasData.find(e => e.id === innerExtra.extraId);
      if (extraData && extraData.insideOutsideSame && !hasCover) {
        consolidatedInner[index] = {
          ...innerExtra,
          unitType: 'booklet (cover + inner)',
          isConsolidated: true
        };
      }
    });
    
    return { consolidatedCover, consolidatedInner };
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Validate required fields
    if (!jobData.productName || !jobData.finalWidth || !jobData.finalHeight || !jobData.quantity) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    // Validate multi-part configurations
    if (jobData.useMultiPartConfiguration) {
      const totalMultiPartPages = multiPartConfigurations.reduce((sum, config) => {
        const pageCount = parseInt(config.pageCount) || 0;
        return sum + pageCount;
      }, 0);
      
      if (totalMultiPartPages !== parseInt(jobData.quantity)) {
        toast({
          title: "Validation Error",
          description: `Total pages in multi-part configuration (${totalMultiPartPages}) must equal the quantity (${jobData.quantity})`,
          variant: "destructive"
        });
        return;
      }
    }
    
    if (jobData.isBookletMode && jobData.useMultiPartInnerConfiguration) {
      const totalInnerPages = Math.max(0, parseInt(jobData.totalPages) - 4); // Subtract 4 cover pages (1 cover = 4 pages)
      const totalMultiPartInnerPages = multiPartInnerConfigurations.reduce((sum, config) => {
        const pageCount = parseInt(config.pageCount) || 0;
        return sum + pageCount;
      }, 0);
      
      if (totalMultiPartInnerPages !== totalInnerPages) {
        toast({
          title: "Validation Error",
          description: `Total pages in inner multi-part configuration (${totalMultiPartInnerPages}) must equal the inner pages (${totalInnerPages})`,
          variant: "destructive"
        });
        return;
      }
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
      finalWidth: parseFloat(jobData.finalWidth) || 210, // Default to A4 width if not set
      finalHeight: parseFloat(jobData.finalHeight) || 297, // Default to A4 height if not set
      marginTop: parseFloat(jobData.marginTop),
      marginRight: parseFloat(jobData.marginRight),
      marginBottom: parseFloat(jobData.marginBottom),
      marginLeft: parseFloat(jobData.marginLeft),
      quantity: parseInt(jobData.quantity) || 1, // Default to 1 if not set or invalid
      isDoubleSided: jobData.isDoubleSided,
      setupRequired: jobData.setupRequired,
      isBookletMode: jobData.isBookletMode,
      hasCover: jobData.hasCover,
      coverSetupRequired: jobData.coverSetupRequired,
      totalPages: jobData.totalPages ? parseInt(jobData.totalPages) : 0,
      bindingEdge: jobData.bindingEdge // Add missing binding edge
    };
    
    console.log('Job object constructed with quantity:', job.quantity, 'from jobData.quantity:', jobData.quantity);

    let calculationResults;
    let coverResults = null;
    let innerPagesResults = null;
    let multiPartResults = null;
    
    if (job.isBookletMode) {
      // Booklet mode - calculate cover and inner pages separately
      if (job.hasCover && selectedCoverPaperType && selectedCoverMachine) {
        const coverPaperType = paperTypes.find(p => p.id === selectedCoverPaperType);
        const coverMachine = machines.find(m => m.id === selectedCoverMachine);
        coverResults = calculateCoverCost(job, coverPaperType, coverMachine, coverBindingEdge);
      }
      
      // Handle multi-part inner pages
      if (jobData.useMultiPartInnerConfiguration) {
        multiPartResults = calculateMultiPartInnerPagesCost(job, multiPartInnerConfigurations, paperTypes, machines, true);
      } else if (selectedInnerPaperType && selectedInnerMachine) {
        // Single inner paper type and machine
        const innerPaperType = paperTypes.find(p => p.id === selectedInnerPaperType);
        const innerMachine = machines.find(m => m.id === selectedInnerMachine);
        // Modify job to treat all pages as inner pages when no cover
        const modifiedJob = { ...job };
        if (!job.hasCover) {
          modifiedJob.totalPages = job.totalPages; // All pages are inner pages
        }
        innerPagesResults = calculateInnerPagesCost(modifiedJob, innerPaperType, innerMachine, innerBindingEdge);
      }
      
      // For booklet mode, we don't use the normal calculation results
      calculationResults = [];
    } else {
      // Normal mode - handle multi-part configurations
      if (jobData.useMultiPartConfiguration) {
        multiPartResults = calculateMultiPartCost(job, multiPartConfigurations, paperTypes, machines);
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
    
    if (!job.isBookletMode && calculationResults.length === 0 && !multiPartResults) {
      toast({
        title: "Error",
        description: "No suitable paper type, machine, and sheet size combination found for this job",
        variant: "destructive"
      });
      return;
    }

    if (job.isBookletMode && !coverResults && !innerPagesResults && !multiPartResults) {
      toast({
        title: "Error",
        description: "Please select paper types and machines for both cover and inner pages",
        variant: "destructive"
      });
      return;
    }

  // Calculate extras cost for variants
  const calculateVariantExtrasCost = (job, selectedVariantExtras, lengthBasedEdge, bookletSection = null, calculationResults = null, paperTypesData = paperTypes) => {
    const extrasResults = [];
    let edgeLength = 0; // Declare at function level to persist across switch cases

    if (!selectedVariantExtras || selectedVariantExtras.length === 0) {
      return [];
    }

    selectedVariantExtras.forEach(selectedExtra => {
      const extra = extras.find(e => e.id === selectedExtra.extraId);
      const variant = extra?.variants?.find(v => v.id === selectedExtra.variantId);
      
      if (!extra || !variant) return;

      let cost = 0;
      let units = 0;
      let unitType = '';
      let basePrice = variant.price;

      // Apply double-sided multiplier if applicable
      if (extra.supportsDoubleSided && selectedExtra.isDoubleSided) {
        basePrice = basePrice * 2;
      }

      // Handle "Inside/Outside = Same" extras - they should calculate for both cover and inner
      const isInsideOutsideSame = extra.insideOutsideSame;
      const shouldCalculateForBoth = isInsideOutsideSame && job.isBookletMode;

      switch (extra.pricingType) {
        case 'per_page':
          if (job.isBookletMode && bookletSection) {
            if (shouldCalculateForBoth) {
              // For Inside/Outside = Same extras, calculate for all pages regardless of section
              units = job.quantity * job.totalPages;
              unitType = 'all pages (cover + inner)';
            } else if (bookletSection === 'cover') {
              // Cover pages: always 4 pages per booklet (1 cover = 4 pages)
              units = job.quantity * 4;
              unitType = 'cover pages';
            } else {
              // Inner pages: total pages - 4 cover pages (if has cover)
              const innerPagesPerBooklet = job.hasCover 
                ? Math.max(0, job.totalPages - 4) 
                : job.totalPages;
              units = job.quantity * innerPagesPerBooklet;
              unitType = 'inner pages';
            }
          } else {
            // Normal mode: quantity is number of items, each with totalPages
            const pagesPerUnit = job.totalPages || 1;
            units = job.quantity * pagesPerUnit;
            unitType = 'pages';
          }
          cost = units * basePrice;
          break;

        case 'per_booklet':
          units = job.quantity;
          if (job.isBookletMode) {
            if (shouldCalculateForBoth) {
              unitType = 'booklets (cover + inner)';
            } else {
              unitType = bookletSection ? `${bookletSection} sections` : 'booklets';
            }
          } else {
            unitType = 'units';
          }
          cost = units * basePrice;
          break;

        case 'per_length':
          // Calculate length based on binding edge (convert mm to cm)
          edgeLength = 0; // Reset the function-level variable
          
          console.log('=== PER_LENGTH CALCULATION START ===');
          console.log('Raw job object:', job);
          console.log('job.finalWidth:', job.finalWidth, 'type:', typeof job.finalWidth);
          console.log('job.finalHeight:', job.finalHeight, 'type:', typeof job.finalHeight);
          
          if (extra.applyToPrintSheet) {
            // Use print sheet count and dimensions when checkbox is checked
            console.log('Apply to Print Sheet is enabled');
            console.log('job.quantity:', job.quantity);
            console.log('calculationResults:', calculationResults);
            console.log('job.isBookletMode:', job.isBookletMode);
            console.log('bookletSection:', bookletSection);
            
            // Use actual print sheets needed from calculation results
            if (job.isBookletMode) {
              if (shouldCalculateForBoth) {
                // For Inside/Outside = Same extras, use combined cover + inner print sheets
                let coverSheets = 0;
                let innerSheets = 0;
                
                if (calculationResults && calculationResults.coverResults && job.hasCover) {
                  coverSheets = calculationResults.coverResults.printSheetsNeeded;
                }
                if (calculationResults && calculationResults.innerPagesResults) {
                  innerSheets = calculationResults.innerPagesResults.printSheetsNeeded;
                }
                
                units = coverSheets + innerSheets;
                unitType = 'all print sheets (cover + inner)';
                console.log('Using combined print sheets for Inside/Outside = Same:', units);
              } else if (bookletSection === 'cover' && calculationResults && calculationResults.coverResults) {
                // Use actual cover print sheets from calculation
                units = calculationResults.coverResults.printSheetsNeeded;
                unitType = 'cover print sheets';
                console.log('Using cover print sheets from calculation:', units);
              } else if (bookletSection === 'inner' && calculationResults && calculationResults.innerPagesResults) {
                // Use actual inner print sheets from calculation  
                units = calculationResults.innerPagesResults.printSheetsNeeded;
                unitType = 'inner print sheets';
                console.log('Using inner print sheets from calculation:', units);
              } else {
                // Fallback to old calculation if results not available
                if (shouldCalculateForBoth) {
                  // For Inside/Outside = Same, combine cover and inner fallback calculations
                  const coverSheets = job.hasCover ? job.quantity : 0; // 1 sheet per booklet for cover
                  const innerPagesPerBooklet = job.hasCover ? Math.max(0, job.totalPages - 4) : job.totalPages;
                  const innerSheetsPerBooklet = Math.ceil(innerPagesPerBooklet / 4);
                  const innerSheets = innerSheetsPerBooklet * job.quantity;
                  
                  units = coverSheets + innerSheets;
                  unitType = 'all print sheets (cover + inner) (fallback)';
                  console.log('Using combined fallback calculation for Inside/Outside = Same:', units);
                } else if (bookletSection === 'cover') {
                  units = job.quantity; // Fallback: 1 sheet per booklet
                  unitType = 'cover print sheets (fallback)';
                } else {
                  const innerPagesPerBooklet = Math.max(0, job.totalPages - 4);
                  const innerSheetsPerBooklet = Math.ceil(innerPagesPerBooklet / 4);
                  units = innerSheetsPerBooklet * job.quantity;
                  unitType = 'inner print sheets (fallback)';
                }
                console.log('Using fallback calculation for', bookletSection, ':', units);
              }
            } else {
              // Normal mode: use calculation results if available
              if (calculationResults && calculationResults.calculations && calculationResults.calculations.length > 0) {
                // Use print sheets from the first (optimal) calculation result
                units = calculationResults.calculations[0].printSheetsNeeded;
                unitType = 'print sheets';
                console.log('Using normal mode print sheets from calculation:', units);
              } else {
                // Fallback calculation for normal mode
                const totalPages = (job.totalPages || 1) * job.quantity;
                const pagesPerSheet = job.isDoubleSided ? 2 : 1;
                units = Math.ceil(totalPages / pagesPerSheet);
                unitType = 'print sheets (fallback)';
                console.log('Using fallback calculation for normal mode:', units);
              }
            }
            
            // Always use long side of print sheet (SRA3: 45cm long edge)
            edgeLength = 45.0; // SRA3 long edge in cm
            
            console.log('Print sheet calculation results:');
            console.log('- units (print sheets):', units);
            console.log('- unitType:', unitType);
            console.log('- edgeLength:', edgeLength);
          } else {
            // Use page dimensions (existing logic)
            // Job object now always has valid dimensions (with A4 defaults)
            const validWidth = job.finalWidth;  // Already validated in job construction
            const validHeight = job.finalHeight; // Already validated in job construction
            
            console.log('=== PAGE DIMENSIONS CALCULATION ===');
            console.log('validWidth:', validWidth, 'validHeight:', validHeight);
            console.log('lengthBasedEdge:', lengthBasedEdge);
            console.log('job.isBookletMode:', job.isBookletMode);
            
            if (job.isBookletMode) {
              if (shouldCalculateForBoth) {
                // For Inside/Outside = Same extras, calculate for all booklets
                units = job.quantity;
                unitType = 'booklets (cover + inner)';
              } else {
                // In booklet mode, use the passed binding edge parameter (which is already the correct edge for the section)
                units = job.quantity;
                unitType = job.isBookletMode ? 'booklets' : 'units';
              }
              edgeLength = lengthBasedEdge === 'short' ? validHeight / 10 : validWidth / 10; // mm to cm
              console.log('Booklet mode calculation: lengthBasedEdge=', lengthBasedEdge, 'result=', edgeLength);
            } else {
              // In normal mode, use the passed binding edge parameter
              edgeLength = lengthBasedEdge === 'short' ? validHeight / 10 : validWidth / 10; // mm to cm
              console.log('Normal mode calculation: lengthBasedEdge=', lengthBasedEdge, 'result=', edgeLength);
              // Use standard units for page-based calculation
              units = job.quantity;
              unitType = job.isBookletMode ? 'booklets' : 'units';
            }
          }
          
          // Ensure edgeLength is a valid number
          const originalEdgeLength = edgeLength;
          edgeLength = isNaN(edgeLength) || edgeLength <= 0 ? 21.0 : edgeLength; // Default to 21cm (A4 width)
          console.log('Final edgeLength after validation:', originalEdgeLength, '->', edgeLength);
          
          // Debug the final calculation
          console.log('Final edge calculation result:', {
            edgeLength,
            units,
            basePrice,
            cost: units * edgeLength * basePrice,
            unitType
          });
          console.log('=== PER_LENGTH CALCULATION END ===');
          
          cost = units * edgeLength * basePrice;
          break;

        case 'per_form':
          // Per Form Pricing: Calculate forms based on paper GSM and total pages
          console.log('=== PER_FORM CALCULATION START ===');
          console.log('job object:', job);
          console.log('bookletSection:', bookletSection);
          
          // Determine the paper GSM based on the current mode and section
          let paperGSM = null;
          let totalPages = 0;
          
          if (job.isBookletMode) {
            if (bookletSection === 'cover' && selectedCoverPaperType) {
              const coverPaper = paperTypesData.find(p => p.id === selectedCoverPaperType);
              paperGSM = coverPaper?.gsm;
              totalPages = 4; // Cover always has 4 pages
            } else if (bookletSection === 'inner' && selectedInnerPaperType) {
              const innerPaper = paperTypesData.find(p => p.id === selectedInnerPaperType);
              paperGSM = innerPaper?.gsm;
              totalPages = job.hasCover ? Math.max(0, job.totalPages - 4) : job.totalPages;
            } else if (shouldCalculateForBoth) {
              // For Inside/Outside = Same, use inner paper GSM for both
              const innerPaper = paperTypesData.find(p => p.id === selectedInnerPaperType);
              paperGSM = innerPaper?.gsm;
              totalPages = job.totalPages;
            }
          } else {
            // Normal mode
            if (selectedPaperType) {
              const paper = paperTypesData.find(p => p.id === selectedPaperType);
              paperGSM = paper?.gsm;
            }
            totalPages = job.totalPages || 1;
          }
          
          console.log('paperGSM:', paperGSM, 'totalPages:', totalPages);
          
          if (paperGSM !== null) {
            // Calculate number of forms based on GSM
            const divisor = paperGSM >= 170 ? 12 : 16;
            const numberOfForms = Math.ceil(totalPages / divisor);
            
            units = numberOfForms * job.quantity;
            unitType = `forms (${divisor} pages per form, ${paperGSM} GSM)`;
            
            console.log('divisor:', divisor, 'numberOfForms:', numberOfForms, 'units:', units);
          } else {
            // Fallback if paper GSM is not available
            console.warn('Paper GSM not available, using fallback calculation');
            const numberOfForms = Math.ceil(totalPages / 16); // Default to 16
            units = numberOfForms * job.quantity;
            unitType = `forms (16 pages per form, GSM unknown)`;
          }
          
          cost = units * basePrice;
          console.log('=== PER_FORM CALCULATION END ===');
          break;

        default:
          return;
      }

      // Calculate setup cost (one-time per job)
      let setupCost = 0;
      if (extra.setupCost && extra.setupCost > 0) {
        setupCost = convertToEURSync(extra.setupCost, extra.setupCostCurrency || 'USD');
      }
      
      const totalCostWithSetup = cost + setupCost;

      const resultObject = {
        extraId: extra.id,
        variantId: selectedExtra.variantId,
        extraName: extra.name,
        variantName: selectedExtra.variantName,
        pricingType: extra.pricingType,
        pricePerUnit: basePrice, // This now includes double-sided multiplier if applicable
        originalPrice: selectedExtra, // Store the full selectedExtra object
        isDoubleSided: selectedExtra.isDoubleSided || false,
        supportsDoubleSided: extra.supportsDoubleSided,
        units,
        unitType,
        edgeLength: extra.pricingType === 'per_length' ? edgeLength : 0,
        setupCost: setupCost,
        setupCostCurrency: extra.setupCostCurrency || 'USD',
        totalCost: totalCostWithSetup
      };
      
      console.log('=== RESULT OBJECT CREATED ===');
      console.log('extra.pricingType:', extra.pricingType);
      console.log('extra.pricingType === "per_length":', extra.pricingType === 'per_length');
      console.log('edgeLength variable at this point:', edgeLength);
      console.log('Calculated edgeLength for result:', extra.pricingType === 'per_length' ? edgeLength : 0);
      console.log('Result object being pushed:', resultObject);
      console.log('edgeLength in result:', resultObject.edgeLength);
      console.log('units in result:', resultObject.units);
      console.log('totalCost in result:', resultObject.totalCost);
      
      extrasResults.push(resultObject);
    });

    return extrasResults;
  };

  // Calculate extras costs
    let extrasResults = null;
    
    if (job.isBookletMode) {
      // Booklet mode: separate cover and inner page extras
      const coverExtrasResults = job.hasCover && selectedCoverExtras.length > 0 
        ? calculateVariantExtrasCost(job, selectedCoverExtras, coverBindingEdge, 'cover', { coverResults }, paperTypes)
        : [];
      
      const innerExtrasResults = selectedInnerExtras.length > 0
        ? calculateVariantExtrasCost(job, selectedInnerExtras, innerBindingEdge, 'inner', { innerPagesResults }, paperTypes)
        : [];
      
      // Handle consolidation of extras with insideOutsideSame flag
      const { consolidatedCover, consolidatedInner } = consolidateExtrasForBooklet(
        coverExtrasResults, 
        innerExtrasResults, 
        extras, 
        selectedCoverExtras, 
        selectedInnerExtras,
        job.hasCover
      );
      
      extrasResults = {
        coverExtras: consolidatedCover,
        innerExtras: consolidatedInner
      };
    } else {
      // Normal mode: single extras calculation
      extrasResults = selectedExtras.length > 0
        ? calculateVariantExtrasCost(job, selectedExtras, lengthBasedEdge, null, { calculations: calculationResults }, paperTypes)
        : [];
    }

    setResults({ 
      job, 
      calculations: calculationResults, 
      selectedPaperType: selectedPaperType ? paperTypes.find(p => p.id === selectedPaperType) : null,
      coverResults,
      innerPagesResults,
      multiPartResults,
      extrasResults
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
      setupRequired: false,
      isBookletMode: false,
      coverSetupRequired: false,
      totalPages: '',
      useMultiPartConfiguration: false,
      useMultiPartInnerConfiguration: false,
      bindingEdge: 'long'
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
    setMultiPartConfigurations([{ id: 1, paperTypeId: null, machineId: null, pageCount: '' }]);
    setMultiPartInnerConfigurations([{ id: 1, paperTypeId: null, machineId: null, pageCount: '' }]);
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

  // Unified multi-part configuration handlers
  const addMultiPartConfiguration = () => {
    if (multiPartConfigurations.length < 3) {
      setMultiPartConfigurations([...multiPartConfigurations, { 
        id: Date.now(), 
        paperTypeId: null, 
        machineId: null, 
        pageCount: '' 
      }]);
    }
  };

  const removeMultiPartConfiguration = (id) => {
    if (multiPartConfigurations.length > 1) {
      setMultiPartConfigurations(multiPartConfigurations.filter(item => item.id !== id));
    }
  };

  const updateMultiPartConfiguration = (id, field, value) => {
    setMultiPartConfigurations(multiPartConfigurations.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  // Unified multi-part inner configuration handlers
  const addMultiPartInnerConfiguration = () => {
    if (multiPartInnerConfigurations.length < 3) {
      setMultiPartInnerConfigurations([...multiPartInnerConfigurations, { 
        id: Date.now(), 
        paperTypeId: null, 
        machineId: null, 
        pageCount: '' 
      }]);
    }
  };

  const removeMultiPartInnerConfiguration = (id) => {
    if (multiPartInnerConfigurations.length > 1) {
      setMultiPartInnerConfigurations(multiPartInnerConfigurations.filter(item => item.id !== id));
    }
  };

  const updateMultiPartInnerConfiguration = (id, field, value) => {
    setMultiPartInnerConfigurations(multiPartInnerConfigurations.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  const getAvailableSheetSizes = () => {
    if (!selectedMachine) return [];
    const machine = machines.find(m => m.id === selectedMachine);
    return machine ? machine.printSheetSizes : [];
  };

  // Only show the best option in Normal Mode, or apply filtering in Booklet Mode
  const displayResults = results ? (
    results.job.isBookletMode 
      ? (showOptimalOnly ? results.calculations.slice(0, 3) : results.calculations) 
      : [results.calculations[0]] // Normal Mode: only show the best option
  ) : [];

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
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="totalPages">
                        {jobData.hasCover ? "Total Pages (including cover)" : "Total Pages"}
                      </Label>
                      <Input
                        id="totalPages"
                        type="number"
                        value={jobData.totalPages}
                        onChange={(e) => setJobData({ ...jobData, totalPages: e.target.value })}
                        placeholder="e.g., 16, 20, 24"
                        min="4"
                        step="4"
                      />
                      <p className="text-sm text-gray-500 mt-1">Must be multiple of 4 for proper booklet layout</p>
                    </div>
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
                <div className="p-4 border rounded-lg bg-blue-50">
                  <h3 className="font-semibold text-lg mb-3 text-blue-800">Cover Options</h3>
                  <div className="flex items-center space-x-2 mb-3">
                    <Checkbox
                      id="hasCover"
                      checked={jobData.hasCover}
                      onCheckedChange={(checked) => setJobData({ ...jobData, hasCover: checked })}
                    />
                    <Label htmlFor="hasCover" className="font-medium">Has Cover</Label>
                  </div>
                  <p className="text-sm text-blue-600">
                    {jobData.hasCover 
                      ? "Cover will be calculated separately with different paper/machine options."
                      : "All pages will be treated as inner pages with the same specifications."
                    }
                  </p>
                </div>

                {jobData.hasCover && (
                  <div className="p-4 border rounded-lg bg-green-50">
                    <h3 className="font-semibold text-lg mb-3 text-green-800">Cover Configuration</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="coverPaperType">Cover Paper Type</Label>
                        <AutocompleteSelect
                          value={selectedCoverPaperType?.toString()}
                          onValueChange={handleCoverPaperTypeChange}
                          options={paperTypes}
                          placeholder="Select or type to search cover paper type"
                          displayValue={(paper) => `${paper.name} (${paper.gsm} GSM)`}
                          searchValue={(paper) => `${paper.name} ${paper.gsm} GSM`.toLowerCase()}
                        />
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
                    
                    {/* Cover Binding Edge Selection - Independent */}
                    <div className="mt-4">
                      <Label htmlFor="coverBindingEdge" className="text-base font-semibold">Cover Binding Edge (Independent)</Label>
                      <div className="mt-2 p-3 border rounded-lg bg-green-100 border-green-300">
                        <Select value={coverBindingEdge} onValueChange={handleCoverBindingEdgeChange}>
                          <SelectTrigger className="mb-2">
                            <SelectValue placeholder="Choose which edge will be bound for the cover" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="short">
                              <div className="flex flex-col">
                                <span className="font-semibold">Short Edge Binding</span>
                                <span className="text-xs text-gray-500">Bound on the short side (height) - Landscape cover</span>
                              </div>
                            </SelectItem>
                            <SelectItem value="long">
                              <div className="flex flex-col">
                                <span className="font-semibold">Long Edge Binding</span>
                                <span className="text-xs text-gray-500">Bound on the long side (width) - Portrait cover</span>
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        
                        <div className="mt-2 p-2 bg-green-50 rounded text-sm">
                          <p className="font-medium text-green-800">
                            {coverBindingEdge === 'short' 
                              ? '📋 Cover: Books open like a landscape calendar or flip chart' 
                              : '📖 Cover: Books open like a standard portrait book'
                            }
                          </p>
                          <p className="text-green-600 text-xs mt-1">
                            Cover binding edge: {coverBindingEdge === 'short' 
                              ? `${jobData.finalHeight}mm edge will be bound` 
                              : `${jobData.finalWidth}mm edge will be bound`
                            }
                          </p>
                          <p className="text-green-500 text-xs mt-1 font-medium">
                            ✓ Independent from inner pages binding edge
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <p className="text-sm text-green-600 mt-2">
                      Covers will be printed separately. Each booklet needs 1 cover (4 pages when folded).
                    </p>
                  </div>
                )}

                <div className="p-4 border rounded-lg bg-orange-50">
                  <h3 className="font-semibold text-lg mb-3 text-orange-800">Inner Pages Configuration</h3>
                  {!jobData.useMultiPartInnerConfiguration && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="innerPaperType">Inner Paper Type</Label>
                        <AutocompleteSelect
                          value={selectedInnerPaperType?.toString()}
                          onValueChange={handleInnerPaperTypeChange}
                          options={paperTypes}
                          placeholder="Select or type to search inner paper type"
                          displayValue={(paper) => `${paper.name} (${paper.gsm} GSM)`}
                          searchValue={(paper) => `${paper.name} ${paper.gsm} GSM`.toLowerCase()}
                        />
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
                  )}

                  <div className="mt-4 space-y-3">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="useMultiPartInnerConfiguration"
                        checked={jobData.useMultiPartInnerConfiguration}
                        onCheckedChange={(checked) => setJobData({ ...jobData, useMultiPartInnerConfiguration: checked })}
                      />
                      <Label htmlFor="useMultiPartInnerConfiguration">Use Different Paper Types & Machines for Inner Pages</Label>
                    </div>

                    {jobData.useMultiPartInnerConfiguration && (
                      <div className="p-3 border rounded-lg bg-gradient-to-r from-blue-50 to-purple-50">
                        <h4 className="font-semibold text-blue-800 mb-2">Inner Pages Multi-Part Configuration</h4>
                        {multiPartInnerConfigurations.map((part, index) => (
                          <div key={part.id} className="grid grid-cols-4 gap-3 mb-2">
                            <div>
                              <Label>Paper Type {index + 1}</Label>
                              <AutocompleteSelect
                                value={part.paperTypeId?.toString() || ''}
                                onValueChange={(value) => updateMultiPartInnerConfiguration(part.id, 'paperTypeId', value ? parseInt(value) : null)}
                                options={paperTypes}
                                placeholder="Select or type to search paper type"
                                displayValue={(paper) => `${paper.name} (${paper.gsm} GSM)`}
                                searchValue={(paper) => `${paper.name} ${paper.gsm} GSM`.toLowerCase()}
                              />
                            </div>
                            <div>
                              <Label>Machine {index + 1}</Label>
                              <Select 
                                value={part.machineId?.toString() || ''} 
                                onValueChange={(value) => updateMultiPartInnerConfiguration(part.id, 'machineId', value ? parseInt(value) : null)}
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
                                onChange={(e) => updateMultiPartInnerConfiguration(part.id, 'pageCount', e.target.value)}
                                placeholder="e.g., 10"
                              />
                            </div>
                            <div className="flex items-end gap-1">
                              {multiPartInnerConfigurations.length < 3 && (
                                <Button 
                                  type="button" 
                                  variant="outline" 
                                  size="sm"
                                  onClick={addMultiPartInnerConfiguration}
                                >
                                  <Plus size={14} />
                                </Button>
                              )}
                              {multiPartInnerConfigurations.length > 1 && (
                                <Button 
                                  type="button" 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => removeMultiPartInnerConfiguration(part.id)}
                                >
                                  <Minus size={14} />
                                </Button>
                              )}
                            </div>
                          </div>
                        ))}
                        <p className="text-sm text-blue-600 mt-2">
                          Each part can have a different paper type and machine combination. The system will optimize the sheet size selection for each pairing.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Inner Pages Binding Edge Selection - Independent */}
                  <div className="mt-4">
                    <Label htmlFor="innerBindingEdge" className="text-base font-semibold">Inner Pages Binding Edge (Independent)</Label>
                    <div className="mt-2 p-3 border rounded-lg bg-orange-100 border-orange-300">
                      <Select value={innerBindingEdge} onValueChange={handleInnerBindingEdgeChange}>
                        <SelectTrigger className="mb-2">
                          <SelectValue placeholder="Choose which edge will be bound for inner pages" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="short">
                            <div className="flex flex-col">
                              <span className="font-semibold">Short Edge Binding</span>
                              <span className="text-xs text-gray-500">Bound on the short side (height) - Landscape inner pages</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="long">
                            <div className="flex flex-col">
                              <span className="font-semibold">Long Edge Binding</span>
                              <span className="text-xs text-gray-500">Bound on the long side (width) - Portrait inner pages</span>
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      
                      <div className="mt-2 p-2 bg-orange-50 rounded text-sm">
                        <p className="font-medium text-orange-800">
                          {innerBindingEdge === 'short' 
                            ? '📋 Inner Pages: Books open like a landscape calendar or flip chart' 
                            : '📖 Inner Pages: Books open like a standard portrait book'
                          }
                        </p>
                        <p className="text-orange-600 text-xs mt-1">
                          Inner pages binding edge: {innerBindingEdge === 'short' 
                            ? `${jobData.finalHeight}mm edge will be bound` 
                            : `${jobData.finalWidth}mm edge will be bound`
                          }
                        </p>
                        <p className="text-orange-500 text-xs mt-1 font-medium">
                          ✓ Independent from cover binding edge
                        </p>
                      </div>
                    </div>
                  </div>

                  <p className="text-sm text-orange-600 mt-2">
                    Inner pages will be calculated as: {jobData.totalPages ? `(${jobData.totalPages} total - 4 cover = ${Math.max(0, jobData.totalPages - 4)} inner pages) × ${jobData.quantity || 'quantity'} booklets` : '(total pages - 4 cover pages) × quantity booklets'}
                    <br />
                    <em>Note: 1 cover = 4 pages, 1 inner sheet = 2 pages</em>
                  </p>
                </div>
              </>
            )}

            {!jobData.isBookletMode && (
              <div className="grid grid-cols-1 gap-4">
                {!jobData.useMultiPartConfiguration && (
                  <div>
                    <Label htmlFor="paperType">Paper Type (Optional - auto-selects optimal stock sheet)</Label>
                    <AutocompleteSelect
                      value={selectedPaperType?.toString()}
                      onValueChange={handlePaperTypeChange}
                      options={paperTypes}
                      placeholder="Select or type to search paper type (or leave blank for all options)"
                      displayValue={(paper) => `${paper.name} (${paper.gsm} GSM)`}
                      searchValue={(paper) => `${paper.name} ${paper.gsm} GSM`.toLowerCase()}
                    />
                    {selectedPaperType && (
                      <p className="text-sm text-green-600 mt-1 flex items-center gap-1">
                        <CheckCircle size={14} />
                        System will automatically select the most cost-efficient stock sheet size
                      </p>
                    )}
                  </div>
                )}

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="useMultiPartConfiguration"
                    checked={jobData.useMultiPartConfiguration}
                    onCheckedChange={(checked) => setJobData({ ...jobData, useMultiPartConfiguration: checked })}
                  />
                  <Label htmlFor="useMultiPartConfiguration">Use Different Paper Types & Machines for Different Parts</Label>
                </div>

                {jobData.useMultiPartConfiguration && (
                  <div className="p-4 border rounded-lg bg-gradient-to-r from-blue-50 to-purple-50">
                    <h4 className="font-semibold text-blue-800 mb-3">Multi-Part Configuration</h4>
                    {multiPartConfigurations.map((part, index) => (
                      <div key={part.id} className="grid grid-cols-4 gap-4 mb-3">
                        <div>
                          <Label>Paper Type for Part {index + 1}</Label>
                          <AutocompleteSelect
                            value={part.paperTypeId?.toString() || ''}
                            onValueChange={(value) => updateMultiPartConfiguration(part.id, 'paperTypeId', value ? parseInt(value) : null)}
                            options={paperTypes}
                            placeholder="Select or type to search paper type"
                            displayValue={(paper) => `${paper.name} (${paper.gsm} GSM)`}
                            searchValue={(paper) => `${paper.name} ${paper.gsm} GSM`.toLowerCase()}
                          />
                        </div>
                        <div>
                          <Label>Machine for Part {index + 1}</Label>
                          <Select 
                            value={part.machineId?.toString() || ''} 
                            onValueChange={(value) => updateMultiPartConfiguration(part.id, 'machineId', value ? parseInt(value) : null)}
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
                            onChange={(e) => updateMultiPartConfiguration(part.id, 'pageCount', e.target.value)}
                            placeholder="e.g., 100"
                          />
                        </div>
                        <div className="flex items-end gap-2">
                          {multiPartConfigurations.length < 3 && (
                            <Button 
                              type="button" 
                              variant="outline" 
                              size="sm"
                              onClick={addMultiPartConfiguration}
                            >
                              <Plus size={16} />
                            </Button>
                          )}
                          {multiPartConfigurations.length > 1 && (
                            <Button 
                              type="button" 
                              variant="outline" 
                              size="sm"
                              onClick={() => removeMultiPartConfiguration(part.id)}
                            >
                              <Minus size={16} />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                    <p className="text-sm text-blue-600 mt-2">
                      Each part can have a different paper type and machine combination. The system will optimize the sheet size selection for each pairing.
                    </p>
                  </div>
                )}
              </div>
            )}

            {!jobData.isBookletMode && !jobData.useMultiPartConfiguration && (
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

            {/* Info for Booklet Mode - Independent Binding Edges */}
            {jobData.isBookletMode && (
              <div className="p-4 border rounded-lg bg-purple-50 border-purple-200">
                <div className="flex items-center gap-2 mb-2">
                  <Info size={16} className="text-purple-600" />
                  <Label className="text-base font-semibold text-purple-800">Booklet Mode: Independent Binding Edges</Label>
                </div>
                <p className="text-purple-700 text-sm">
                  In booklet mode, the cover and inner pages can have different binding edges. 
                  Configure each section separately below for maximum flexibility.
                </p>
                <p className="text-purple-600 text-xs mt-2">
                  💡 Example: Inner pages on short edge (book-style) + Cover on long edge (brochure-style)
                </p>
              </div>
            )}

            {/* Extras Section */}
            <div className="p-4 border rounded-lg bg-purple-50">
              <h3 className="font-semibold text-lg mb-3 text-purple-800 flex items-center gap-2">
                <Award size={18} />
                Extras & Finishing Options
              </h3>
              
              {jobData.isBookletMode ? (
                // Booklet Mode: Separate Cover and Inner Pages Extras
                <div className="space-y-6">
                  {/* Cover Extras */}
                  {jobData.hasCover && (
                    <div className="border rounded-lg p-4 bg-green-50">
                      <h4 className="font-semibold text-green-800 mb-3 flex items-center gap-2">
                        <FileText size={16} />
                        Cover Extras
                      </h4>
                      
                      {/* Extra Selection Dropdown */}
                      <div className="space-y-3 mb-4">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label>Choose Extra</Label>
                            <Select value={selectedCoverExtraId} onValueChange={(value) => {
                              setSelectedCoverExtraId(value);
                              setSelectedCoverVariantId(''); // Reset variant selection
                            }}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select an extra..." />
                              </SelectTrigger>
                              <SelectContent>
                                {extras
                                  .filter(extra => {
                                    // If has cover, show all extras including insideOutsideSame ones in cover section
                                    if (jobData.hasCover) {
                                      return true; // Show all extras in cover section
                                    } else {
                                      // If no cover, hide insideOutsideSame extras from cover section (shouldn't appear anyway)
                                      return !extra.insideOutsideSame;
                                    }
                                  })
                                  .map((extra) => (
                                  <SelectItem key={extra.id} value={extra.id.toString()}>
                                    {extra.name} ({extra.pricingType === 'per_page' ? 'Per Page' : 
                                                    extra.pricingType === 'per_booklet' ? 'Per Booklet' : 
                                                    extra.pricingType === 'per_form' ? 'Per Form Pricing' :
                                                    'Per Length (cm)'})
                                    {extra.insideOutsideSame && " ✓ Applies to both cover & inner"}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          
                          {/* Variant Selection */}
                          {selectedCoverExtraId && (
                            <div>
                              <Label>Choose Type/Variant</Label>
                              <Select value={selectedCoverVariantId} onValueChange={setSelectedCoverVariantId}>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select variant..." />
                                </SelectTrigger>
                                <SelectContent>
                                  {extras.find(e => e.id === parseInt(selectedCoverExtraId))?.variants?.map((variant) => (
                                    <SelectItem key={variant.id} value={variant.id.toString()}>
                                      {variant.variantName} - {formatEURPriceDynamic(convertToEURSync(variant.price, variant.currency || 'EUR'))}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          )}
                        </div>
                        
                        {/* Single/Double-Sided Selection */}
                        {selectedCoverExtraId && selectedCoverVariantId && 
                         extras.find(e => e.id === parseInt(selectedCoverExtraId))?.supportsDoubleSided && (
                          <div className="p-3 border rounded bg-yellow-50">
                            <Label className="text-sm font-semibold mb-2 block">Application Type:</Label>
                            <div className="flex items-center space-x-4">
                              <div className="flex items-center space-x-2">
                                <input
                                  type="radio"
                                  id="cover-single"
                                  name="cover-sided"
                                  checked={!isCoverDoubleSided}
                                  onChange={() => setIsCoverDoubleSided(false)}
                                />
                                <Label htmlFor="cover-single" className="text-sm cursor-pointer">Single Side</Label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <input
                                  type="radio"
                                  id="cover-double"
                                  name="cover-sided"
                                  checked={isCoverDoubleSided}
                                  onChange={() => setIsCoverDoubleSided(true)}
                                />
                                <Label htmlFor="cover-double" className="text-sm cursor-pointer">Both Sides (2x price)</Label>
                              </div>
                            </div>
                          </div>
                        )}
                        
                        {/* Add Extra Button */}
                        {selectedCoverExtraId && selectedCoverVariantId && (
                          <Button
                            type="button"
                            onClick={() => addExtraWithVariant(selectedCoverExtraId, selectedCoverVariantId, 'cover')}
                            className="flex items-center gap-2"
                          >
                            <Plus size={16} />
                            Add Extra
                          </Button>
                        )}
                      </div>
                      
                      {/* Selected Cover Extras List */}
                      {selectedCoverExtras.length > 0 && (
                        <div className="space-y-2">
                          <Label className="text-sm font-semibold">Selected Cover Extras:</Label>
                          {selectedCoverExtras.map((selected, index) => {
                            const extra = extras.find(e => e.id === selected.extraId);
                            return (
                              <div key={index} className="flex items-center justify-between p-2 bg-white border rounded">
                                <span className="font-medium">
                                  {extra?.name} - {selected.variantName}
                                  {selected.isDoubleSided && " (Double-Sided)"}
                                </span>
                                <div className="flex items-center gap-2">
                                  <span className="text-sm text-gray-600">
                                    {formatEURPriceDynamic(convertToEURSync(selected.price, selected.currency || 'EUR'))}{selected.isDoubleSided && " x2"} per {
                                      extra?.pricingType === 'per_page' ? 'page' :
                                      extra?.pricingType === 'per_booklet' ? 'booklet' :
                                      'cm'
                                    }
                                  </span>
                                  <Button
                                    type="button"
                                    variant="destructive"
                                    size="sm"
                                    onClick={() => removeExtraFromSection(selected.extraId, selected.variantId, 'cover')}
                                  >
                                    <X size={14} />
                                  </Button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Inner Pages Extras */}
                  <div className="border rounded-lg p-4 bg-orange-50">
                    <h4 className="font-semibold text-orange-800 mb-3 flex items-center gap-2">
                      <FileText size={16} />
                      Inner Pages Extras
                    </h4>
                    
                    {/* Extra Selection Dropdown */}
                    <div className="space-y-3 mb-4">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label>Choose Extra</Label>
                          <Select value={selectedInnerExtraId} onValueChange={(value) => {
                            setSelectedInnerExtraId(value);
                            setSelectedInnerVariantId(''); // Reset variant selection
                          }}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select an extra..." />
                            </SelectTrigger>
                            <SelectContent>
                              {extras
                                .filter(extra => {
                                  // If has cover, hide insideOutsideSame extras from inner section
                                  if (jobData.hasCover) {
                                    return !extra.insideOutsideSame;
                                  } else {
                                    // If no cover, show all extras including insideOutsideSame ones in inner section
                                    return true;
                                  }
                                })
                                .map((extra) => (
                                <SelectItem key={extra.id} value={extra.id.toString()}>
                                  {extra.name} ({extra.pricingType === 'per_page' ? 'Per Page' : 
                                                  extra.pricingType === 'per_booklet' ? 'Per Booklet' : 
                                                  extra.pricingType === 'per_form' ? 'Per Form Pricing' :
                                                  'Per Length (cm)'})
                                  {extra.insideOutsideSame && " ✓ Applies to both cover & inner"}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        
                        {/* Variant Selection */}
                        {selectedInnerExtraId && (
                          <div>
                            <Label>Choose Type/Variant</Label>
                            <Select value={selectedInnerVariantId} onValueChange={setSelectedInnerVariantId}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select variant..." />
                              </SelectTrigger>
                              <SelectContent>
                                {extras.find(e => e.id === parseInt(selectedInnerExtraId))?.variants?.map((variant) => (
                                  <SelectItem key={variant.id} value={variant.id.toString()}>
                                    {variant.variantName} - {formatEURPriceDynamic(convertToEURSync(variant.price, variant.currency || 'EUR'))}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                      </div>
                      
                      {/* Single/Double-Sided Selection */}
                      {selectedInnerExtraId && selectedInnerVariantId && 
                       extras.find(e => e.id === parseInt(selectedInnerExtraId))?.supportsDoubleSided && (
                        <div className="p-3 border rounded bg-yellow-50">
                          <Label className="text-sm font-semibold mb-2 block">Application Type:</Label>
                          <div className="flex items-center space-x-4">
                            <div className="flex items-center space-x-2">
                              <input
                                type="radio"
                                id="inner-single"
                                name="inner-sided"
                                checked={!isInnerDoubleSided}
                                onChange={() => setIsInnerDoubleSided(false)}
                              />
                              <Label htmlFor="inner-single" className="text-sm cursor-pointer">Single Side</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <input
                                type="radio"
                                id="inner-double"
                                name="inner-sided"
                                checked={isInnerDoubleSided}
                                onChange={() => setIsInnerDoubleSided(true)}
                              />
                              <Label htmlFor="inner-double" className="text-sm cursor-pointer">Both Sides (2x price)</Label>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {/* Add Extra Button */}
                      {selectedInnerExtraId && selectedInnerVariantId && (
                        <Button
                          type="button"
                          onClick={() => addExtraWithVariant(selectedInnerExtraId, selectedInnerVariantId, 'inner')}
                          className="flex items-center gap-2"
                        >
                          <Plus size={16} />
                          Add Extra
                        </Button>
                      )}
                    </div>
                    
                    {/* Selected Inner Extras List */}
                    {selectedInnerExtras.length > 0 && (
                      <div className="space-y-2">
                        <Label className="text-sm font-semibold">Selected Inner Pages Extras:</Label>
                        {selectedInnerExtras.map((selected, index) => {
                          const extra = extras.find(e => e.id === selected.extraId);
                          return (
                            <div key={index} className="flex items-center justify-between p-2 bg-white border rounded">
                              <span className="font-medium">
                                {extra?.name} - {selected.variantName}
                                {selected.isDoubleSided && " (Double-Sided)"}
                              </span>
                              <div className="flex items-center gap-2">
                                <span className="text-sm text-gray-600">
                                  {formatEURPriceDynamic(convertToEURSync(selected.price, selected.currency || 'EUR'))}{selected.isDoubleSided && " x2"} per {
                                    extra?.pricingType === 'per_page' ? 'page' :
                                    extra?.pricingType === 'per_booklet' ? 'booklet' :
                                    'cm'
                                  }
                                </span>
                                <Button
                                  type="button"
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => removeExtraFromSection(selected.extraId, selected.variantId, 'inner')}
                                >
                                  <X size={14} />
                                </Button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                // Normal Mode: Single Extras Section
                <div>
                  <div className="space-y-3 mb-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Choose Extra</Label>
                        <Select value={selectedExtraId} onValueChange={(value) => {
                          setSelectedExtraId(value);
                          setSelectedVariantId(''); // Reset variant selection
                        }}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select an extra..." />
                          </SelectTrigger>
                          <SelectContent>
                            {extras.map((extra) => (
                              <SelectItem key={extra.id} value={extra.id.toString()}>
                                {extra.name} ({extra.pricingType === 'per_page' ? 'Per Page' : 
                                                extra.pricingType === 'per_booklet' ? 'Per Booklet' : 
                                                extra.pricingType === 'per_form' ? 'Per Form Pricing' :
                                                'Per Length (cm)'})
                                {extra.insideOutsideSame && " ✓ Applies to both cover & inner"}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      {/* Variant Selection */}
                      {selectedExtraId && (
                        <div>
                          <Label>Choose Type/Variant</Label>
                          <Select value={selectedVariantId} onValueChange={setSelectedVariantId}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select variant..." />
                            </SelectTrigger>
                            <SelectContent>
                              {extras.find(e => e.id === parseInt(selectedExtraId))?.variants?.map((variant) => (
                                <SelectItem key={variant.id} value={variant.id.toString()}>
                                  {variant.variantName} - {formatEURPriceDynamic(convertToEURSync(variant.price, variant.currency || 'EUR'))}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </div>
                    
                    {/* Single/Double-Sided Selection */}
                    {selectedExtraId && selectedVariantId && 
                     extras.find(e => e.id === parseInt(selectedExtraId))?.supportsDoubleSided && (
                      <div className="p-3 border rounded bg-yellow-50">
                        <Label className="text-sm font-semibold mb-2 block">Application Type:</Label>
                        <div className="flex items-center space-x-4">
                          <div className="flex items-center space-x-2">
                            <input
                              type="radio"
                              id="normal-single"
                              name="normal-sided"
                              checked={!isDoubleSided}
                              onChange={() => setIsDoubleSided(false)}
                            />
                            <Label htmlFor="normal-single" className="text-sm cursor-pointer">Single Side</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <input
                              type="radio"
                              id="normal-double"
                              name="normal-sided"
                              checked={isDoubleSided}
                              onChange={() => setIsDoubleSided(true)}
                            />
                            <Label htmlFor="normal-double" className="text-sm cursor-pointer">Both Sides (2x price)</Label>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* Add Extra Button */}
                    {selectedExtraId && selectedVariantId && (
                      <Button
                        type="button"
                        onClick={() => addExtraWithVariant(selectedExtraId, selectedVariantId, 'normal')}
                        className="flex items-center gap-2"
                      >
                        <Plus size={16} />
                        Add Extra
                      </Button>
                    )}
                  </div>
                  
                  {/* Selected Extras List */}
                  {selectedExtras.length > 0 && (
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold">Selected Extras:</Label>
                      {selectedExtras.map((selected, index) => {
                        const extra = extras.find(e => e.id === selected.extraId);
                        return (
                          <div key={index} className="flex items-center justify-between p-2 bg-white border rounded">
                            <span className="font-medium">
                              {extra?.name} - {selected.variantName}
                              {selected.isDoubleSided && " (Double-Sided)"}
                            </span>
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-gray-600">
                                {formatEURPriceDynamic(convertToEURSync(selected.price, selected.currency || 'EUR'))}{selected.isDoubleSided && " x2"} per {
                                  extra?.pricingType === 'per_page' ? 'page' :
                                  extra?.pricingType === 'per_booklet' ? 'unit' :
                                  'cm'
                                }
                              </span>
                              <Button
                                type="button"
                                variant="destructive"
                                size="sm"
                                onClick={() => removeExtraFromSection(selected.extraId, selected.variantId, 'normal')}
                              >
                                <X size={14} />
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  
                  {extras.length === 0 && (
                    <div className="text-center py-4 text-gray-500">
                      <Award className="h-8 w-8 mx-auto mb-2 opacity-30" />
                      <p>No extras available. Add some in the Extras tab.</p>
                    </div>
                  )}
                </div>
              )}
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
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText size={20} />
                Calculation Results for "{results.job.productName}"
              </CardTitle>
              <div className="flex items-center gap-4 mt-2">
                {results.job.isBookletMode && (
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="showOptimalOnly"
                      checked={showOptimalOnly}
                      onCheckedChange={setShowOptimalOnly}
                    />
                    <Label htmlFor="showOptimalOnly">Show only top 3 optimal solutions</Label>
                  </div>
                )}
                {results.job.isBookletMode && (
                  <span className="text-sm text-gray-600">
                    {results.calculations.length} total options found
                  </span>
                )}
                <span className="text-sm text-blue-600 font-medium">
                  {results.job.isDoubleSided ? 'Double-sided' : 'Single-sided'} printing
                  {results.job.isBookletMode && ` | Booklet (${results.job.totalPages} pages, ${results.job.quantity} booklets)`}
                  {!results.job.isBookletMode && ` | Showing optimal solution`}
                </span>
                {results.selectedPaperType && (
                  <span className="text-sm text-blue-600 font-medium">
                    Paper Type: {results.selectedPaperType.name}
                  </span>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <Button 
                onClick={generatePDF}
                className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2"
              >
                <Printer size={16} />
                Print PDF
              </Button>
              <Button 
                onClick={generatePDFAlternative}
                variant="outline"
                className="flex items-center gap-2"
                title="Alternative PDF method if main method fails"
              >
                <Printer size={16} />
                Alt PDF
              </Button>
            </div>
          </CardHeader>
          <CardContent ref={resultsRef}>
            {results.job.isBookletMode ? (
              <div className="space-y-6">
                {results.coverResults && (
                  <div className="p-4 border rounded-lg bg-green-50">
                    <h3 className="text-lg font-semibold text-green-800 mb-4">Cover Cost (1 cover = 4 pages)</h3>
                    
                    {/* Essential Information Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                      {/* Paper & Materials */}
                      <div className="space-y-4">
                        <h4 className="font-semibold text-gray-800 border-b pb-2">Paper & Materials</h4>
                        <div>
                          <span className="font-medium text-gray-700">Paper:</span>
                          <p className="text-sm font-semibold text-blue-600">{results.coverResults.paperType.name}</p>
                          <p className="text-xs text-gray-500">{results.coverResults.paperType.gsm}g/m² - €{convertToEURSync(results.coverResults.paperType.pricePerTon, results.coverResults.paperType.currency || 'EUR').toFixed(0)}/ton</p>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700">Stock Sheet:</span>
                          <p className="text-sm">{results.coverResults.stockSheetSize.name}</p>
                          <p className="text-xs text-gray-500">{results.coverResults.stockSheetSize.width} × {results.coverResults.stockSheetSize.height} mm</p>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700">Machine:</span>
                          <p className="text-sm">{results.coverResults.machine.name}</p>
                        </div>
                      </div>

                      {/* Configuration */}
                      <div className="space-y-4">
                        <h4 className="font-semibold text-gray-800 border-b pb-2">Configuration</h4>
                        <div>
                          <span className="font-medium text-gray-700">Binding Edge:</span>
                          <p className="text-sm">{results.coverResults.bindingEdge === 'short' ? 'Short Edge' : 'Long Edge'}</p>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700">Effective Size:</span>
                          <p className="text-sm">{results.coverResults.effectiveWidth} × {results.coverResults.effectiveHeight} mm</p>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700">Print Sheet:</span>
                          <p className="text-sm">{results.coverResults.printSheetSize.name}</p>
                          <p className="text-xs text-gray-500">{results.coverResults.printSheetSize.width} × {results.coverResults.printSheetSize.height} mm</p>
                        </div>
                      </div>

                      {/* Production Metrics */}
                      <div className="space-y-4">
                        <h4 className="font-semibold text-gray-800 border-b pb-2">Production</h4>
                        <div>
                          <span className="font-medium text-gray-700">Sheets per Print Sheet:</span>
                          <p className="text-sm">{results.coverResults.coversPerPrintSheet}</p>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700">Print Sheets Needed:</span>
                          <p className="text-sm">{results.coverResults.printSheetsNeeded}</p>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700">Total Inner Pages:</span>
                          <p className="text-sm">{results.coverResults.totalCoverPages}</p>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700">Print Sheets per Stock Sheet:</span>
                          <p className="text-sm">{results.coverResults.printSheetsPerStockSheet}</p>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700">Stock Sheets Needed:</span>
                          <p className="text-sm">{results.coverResults.stockSheetsNeeded}</p>
                        </div>
                      </div>
                    </div>

                    {/* Cost Information */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4 bg-gray-50 p-4 rounded-lg">
                      <div>
                        <span className="font-medium text-gray-700">Paper Weight:</span>
                        <p className="text-sm font-semibold">{results.coverResults.paperWeight.toFixed(2)} kg</p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Paper Cost:</span>
                        <p className="text-sm font-semibold text-green-600">€{results.coverResults.paperCost.toFixed(2)}</p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Click Cost:</span>
                        <p className="text-sm font-semibold text-blue-600">€{results.coverResults.clickCost.toFixed(2)}</p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Total Cost:</span>
                        <p className="text-sm font-bold text-gray-900">€{results.coverResults.totalCost.toFixed(2)}</p>
                      </div>
                    </div>

                    {/* Cover Extras within Cover Section */}
                    {results.extrasResults && results.extrasResults.coverExtras && results.extrasResults.coverExtras.length > 0 && (
                      <div className="mt-4 pt-4 border-t">
                        <h4 className="font-semibold text-green-800 mb-3 flex items-center gap-2">
                          <Award size={16} />
                          Cover Extras & Finishing
                        </h4>
                        
                        <div className="space-y-2">
                          {results.extrasResults.coverExtras.map((extra, index) => (
                            <div key={index} className="flex justify-between items-center p-2 border rounded bg-white">
                              <div className="flex-1">
                                <span className="font-medium">{extra.extraName}</span>
                                {extra.isConsolidated && (
                                  <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                                    Cover + Inner Combined
                                  </span>
                                )}
                                <div className="text-xs text-gray-600 mt-1">
                                  {extra.pricingType === 'per_page' && `${extra.units} ${extra.unitType} × ${formatEURPriceDynamic(convertToEURSync(extra.pricePerUnit, extra.originalPrice?.currency || 'EUR'))} per page`}
                                  {extra.pricingType === 'per_booklet' && `${extra.units} booklets × ${formatEURPriceDynamic(convertToEURSync(extra.pricePerUnit, extra.originalPrice?.currency || 'EUR'))} per booklet`}
                                  {extra.pricingType === 'per_form' && `${extra.units} ${extra.unitType} × ${formatEURPriceDynamic(convertToEURSync(extra.pricePerUnit, extra.originalPrice?.currency || 'EUR'))} per form`}
                                  {extra.pricingType === 'per_length' && (
                                    `${extra.units} ${extra.unitType} × ${extra.edgeLength?.toFixed(1) || '0.0'}cm edge × ${formatEURPriceDynamic(convertToEURSync(extra.pricePerUnit, extra.originalPrice?.currency || 'EUR'))} per cm`
                                  )}
                                  {extra.setupCost && extra.setupCost > 0 && (
                                    <div className="text-orange-600 font-medium">
                                      + Setup Cost: {formatEURPriceDynamic(extra.setupCost)} (one-time)
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div className="text-right">
                                <span className="font-semibold text-green-600">{formatEURPriceDynamic(convertToEURSync(extra.totalCost, extra.originalPrice?.currency || 'EUR'))}</span>
                              </div>
                            </div>
                          ))}
                          
                          <div className="flex justify-between items-center pt-2 border-t">
                            <span className="font-semibold text-green-800">Cover Extras Total:</span>
                            <span className="font-bold text-green-600">
                              {formatEURPriceDynamic(results.extrasResults.coverExtras.reduce((sum, extra) => sum + convertToEURSync(extra.totalCost, extra.originalPrice?.currency || 'EUR'), 0))}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {results.innerPagesResults && !results.multiPartResults && (
                  <div className="p-4 border rounded-lg bg-orange-50">
                    <h3 className="text-lg font-semibold text-orange-800 mb-4">Inner Pages Cost (1 sheet = 4 pages)</h3>
                    
                    {/* Essential Information Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                      {/* Paper & Materials */}
                      <div className="space-y-4">
                        <h4 className="font-semibold text-gray-800 border-b pb-2">Paper & Materials</h4>
                        <div>
                          <span className="font-medium text-gray-700">Paper:</span>
                          <p className="text-sm font-semibold text-blue-600">{results.innerPagesResults.paperType.name}</p>
                          <p className="text-xs text-gray-500">{results.innerPagesResults.paperType.gsm}g/m² - €{convertToEURSync(results.innerPagesResults.paperType.pricePerTon, results.innerPagesResults.paperType.currency || 'EUR').toFixed(0)}/ton</p>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700">Stock Sheet:</span>
                          <p className="text-sm">{results.innerPagesResults.stockSheetSize.name}</p>
                          <p className="text-xs text-gray-500">{results.innerPagesResults.stockSheetSize.width} × {results.innerPagesResults.stockSheetSize.height} mm</p>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700">Machine:</span>
                          <p className="text-sm">{results.innerPagesResults.machine.name}</p>
                        </div>
                      </div>

                      {/* Configuration */}
                      <div className="space-y-4">
                        <h4 className="font-semibold text-gray-800 border-b pb-2">Configuration</h4>
                        <div>
                          <span className="font-medium text-gray-700">Binding Edge:</span>
                          <p className="text-sm">{results.innerPagesResults.bindingEdge === 'short' ? 'Short Edge' : 'Long Edge'}</p>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700">Effective Size:</span>
                          <p className="text-sm">{results.innerPagesResults.effectiveWidth} × {results.innerPagesResults.effectiveHeight} mm</p>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700">Print Sheet:</span>
                          <p className="text-sm">{results.innerPagesResults.printSheetSize.name}</p>
                          <p className="text-xs text-gray-500">{results.innerPagesResults.printSheetSize.width} × {results.innerPagesResults.printSheetSize.height} mm</p>
                        </div>
                      </div>

                      {/* Production Metrics */}
                      <div className="space-y-4">
                        <h4 className="font-semibold text-gray-800 border-b pb-2">Production</h4>
                        <div>
                          <span className="font-medium text-gray-700">Sheets per Print Sheet:</span>
                          <p className="text-sm">{results.innerPagesResults.innerSheetsPerPrintSheet}</p>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700">Print Sheets Needed:</span>
                          <p className="text-sm">{results.innerPagesResults.printSheetsNeeded}</p>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700">Total Inner Pages:</span>
                          <p className="text-sm">{results.innerPagesResults.totalInnerPages}</p>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700">Print Sheets per Stock Sheet:</span>
                          <p className="text-sm">{results.innerPagesResults.printSheetsPerStockSheet}</p>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700">Stock Sheets Needed:</span>
                          <p className="text-sm">{results.innerPagesResults.stockSheetsNeeded}</p>
                        </div>
                      </div>
                    </div>

                    {/* Cost Information */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4 bg-gray-50 p-4 rounded-lg">
                      <div>
                        <span className="font-medium text-gray-700">Paper Weight:</span>
                        <p className="text-sm font-semibold">{results.innerPagesResults.paperWeight.toFixed(2)} kg</p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Paper Cost:</span>
                        <p className="text-sm font-semibold text-green-600">€{results.innerPagesResults.paperCost.toFixed(2)}</p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Click Cost:</span>
                        <p className="text-sm font-semibold text-blue-600">€{results.innerPagesResults.clickCost.toFixed(2)}</p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Total Cost:</span>
                        <p className="text-sm font-bold text-gray-900">€{results.innerPagesResults.totalCost.toFixed(2)}</p>
                      </div>
                    </div>

                    {/* Inner Pages Extras within Inner Section */}
                    {results.extrasResults && results.extrasResults.innerExtras && results.extrasResults.innerExtras.length > 0 && (
                      <div className="mt-4 pt-4 border-t">
                        <h4 className="font-semibold text-orange-800 mb-3 flex items-center gap-2">
                          <Award size={16} />
                          Inner Pages Extras & Finishing
                        </h4>
                        
                        <div className="space-y-2">
                          {results.extrasResults.innerExtras.map((extra, index) => (
                            <div key={index} className="flex justify-between items-center p-2 border rounded bg-white">
                              <div className="flex-1">
                                <span className="font-medium">{extra.extraName}</span>
                                <div className="text-xs text-gray-600 mt-1">
                                  {extra.pricingType === 'per_page' && `${extra.units} ${extra.unitType} × ${formatEURPriceDynamic(convertToEURSync(extra.pricePerUnit, extra.originalPrice?.currency || 'EUR'))} per page`}
                                  {extra.pricingType === 'per_booklet' && `${extra.units} booklets × ${formatEURPriceDynamic(convertToEURSync(extra.pricePerUnit, extra.originalPrice?.currency || 'EUR'))} per booklet`}
                                  {extra.pricingType === 'per_form' && `${extra.units} ${extra.unitType} × ${formatEURPriceDynamic(convertToEURSync(extra.pricePerUnit, extra.originalPrice?.currency || 'EUR'))} per form`}
                                  {extra.pricingType === 'per_length' && (
                                    `${extra.units} ${extra.unitType} × ${extra.edgeLength?.toFixed(1) || '0.0'}cm edge × ${formatEURPriceDynamic(convertToEURSync(extra.pricePerUnit, extra.originalPrice?.currency || 'EUR'))} per cm`
                                  )}
                                  {extra.setupCost && extra.setupCost > 0 && (
                                    <div className="text-orange-600 font-medium">
                                      + Setup Cost: {formatEURPriceDynamic(extra.setupCost)} (one-time)
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div className="text-right">
                                <span className="font-semibold text-orange-600">{formatEURPriceDynamic(convertToEURSync(extra.totalCost, extra.originalPrice?.currency || 'EUR'))}</span>
                              </div>
                            </div>
                          ))}
                          
                          <div className="flex justify-between items-center pt-2 border-t">
                            <span className="font-semibold text-orange-800">Inner Extras Total:</span>
                            <span className="font-bold text-orange-600">
                              {formatEURPriceDynamic(results.extrasResults.innerExtras.reduce((sum, extra) => sum + convertToEURSync(extra.totalCost, extra.originalPrice?.currency || 'EUR'), 0))}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {results.multiPartResults && (
                  <div className="p-4 border rounded-lg bg-gradient-to-r from-orange-50 to-purple-50">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">Multi-Part Inner Pages Cost (1 sheet = 2 pages)</h3>
                    
                    {results.multiPartResults.results.map((part, index) => (
                      <div key={index} className="mb-4 p-3 border rounded-lg bg-white">
                        <h4 className="font-semibold text-gray-700 mb-3">Part {part.partNumber} - {part.partPageCount} pages</h4>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                          <div>
                            <span className="font-medium text-gray-700">Paper & Machine Pairing:</span>
                            <p className="text-sm font-semibold text-blue-600">{part.paperType.name} + {part.machine.name}</p>
                            <p className="text-xs text-gray-500">{part.paperType.gsm} GSM | Setup: ${part.machine.setupCost}</p>
                          </div>
                          <div>
                            <span className="font-medium text-gray-700">Optimal Print Sheet:</span>
                            <p className="text-sm">{part.printSheetSize.name}</p>
                            <p className="text-xs text-gray-500">{part.printSheetSize.width} × {part.printSheetSize.height} mm</p>
                          </div>
                          <div>
                            <span className="font-medium text-gray-700">Sheets per Print Sheet:</span>
                            <p className="text-sm">{part.sheetsPerPrintSheet}</p>
                            <p className="text-xs text-gray-500">{part.partPageCount} pages → {part.sheetsNeededPerBooklet} sheets</p>
                          </div>
                          <div>
                            <span className="font-medium text-gray-700">Print Sheets Needed:</span>
                            <p className="text-sm">{part.printSheetsNeeded}</p>
                            <p className="text-xs text-gray-500">{part.totalSheetsForPart} total sheets</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                          <div>
                            <span className="font-medium text-gray-700">Paper Cost:</span>
                            <p className="text-sm">€{part.paperCost.toFixed(2)}</p>
                          </div>
                          <div>
                            <span className="font-medium text-gray-700">Click Cost:</span>
                            <p className="text-sm">€{part.clickCost.toFixed(2)}</p>
                            {part.clickMultiplier > 1 && (
                              <p className="text-xs text-blue-600">Double-sided (2x)</p>
                            )}
                          </div>
                          <div>
                            <span className="font-medium text-gray-700">Setup Cost:</span>
                            <p className="text-sm">€{part.setupCost.toFixed(2)}</p>
                          </div>
                          <div>
                            <span className="font-medium text-gray-700">Part Total:</span>
                            <p className="text-sm font-bold text-green-600">€{part.totalCost.toFixed(2)}</p>
                          </div>
                        </div>
                      </div>
                    ))}

                    <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                      <div>
                        <span className="font-bold text-lg text-gray-800">Total Multi-Part Cost:</span>
                        <p className="text-xl font-bold text-orange-600">€{results.multiPartResults.totalCost.toFixed(2)}</p>
                      </div>
                      <div>
                        <span className="font-bold text-lg text-gray-800">Multi-Part Cost per {results.job.isBookletMode ? 'Booklet' : 'Unit'}:</span>
                        <p className="text-xl font-bold text-blue-600">
                          €{(results.multiPartResults.totalCost / results.job.quantity).toFixed(4)}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {results.coverResults && (results.innerPagesResults || results.multiPartResults) && (
                  <div className="p-4 border-2 border-blue-500 rounded-lg bg-blue-50">
                    <h3 className="text-lg font-semibold text-blue-800 mb-4">Total Booklet Cost Summary (All prices converted to EUR)</h3>
                    
                    {(() => {
                      // Calculate EUR conversions
                      const eurCosts = convertResultsCostsToEUR(results);
                      
                      return (
                        <>
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
                              <span className="font-medium text-gray-700">Cover Cost (EUR):</span>
                              <p className="text-sm">{formatEURPrice(eurCosts.coverCostEUR)}</p>
                            </div>
                            <div>
                              <span className="font-medium text-gray-700">Inner Pages Cost (EUR):</span>
                              <p className="text-sm">{formatEURPrice(eurCosts.innerCostEUR)}</p>
                            </div>
                          </div>

                          {/* Extras Cost Section with EUR conversion */}
                          {results.extrasResults && (results.extrasResults.coverExtras?.length > 0 || results.extrasResults.innerExtras?.length > 0) && (
                            <div className="mb-4 p-3 border rounded-lg bg-purple-50">
                              <h4 className="font-medium text-purple-800 mb-3">Extras Breakdown (EUR)</h4>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {results.extrasResults.coverExtras?.length > 0 && (
                                  <div>
                                    <span className="font-medium text-green-700">Cover Extras (EUR):</span>
                                    <p className="text-sm text-green-600">
                                      {formatEURPrice(eurCosts.coverExtrasEUR)}
                                    </p>
                                    <div className="text-xs text-gray-600 mt-1">
                                      {results.extrasResults.coverExtras.map((extra, idx) => {
                                        const currency = extra.originalPrice?.currency || 'EUR';
                                        const eurCost = convertToEURSync(extra.totalCost, currency);
                                        return (
                                          <div key={idx}>
                                            • {extra.extraName} - {extra.variantName}: {formatEURPrice(eurCost)}
                                            {currency !== 'EUR' && <span className="text-blue-500 ml-1">(converted from {currency})</span>}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}
                                {results.extrasResults.innerExtras?.length > 0 && (
                                  <div>
                                    <span className="font-medium text-orange-700">Inner Extras (EUR):</span>
                                    <p className="text-sm text-orange-600">
                                      {formatEURPrice(eurCosts.innerExtrasEUR)}
                                    </p>
                                    <div className="text-xs text-gray-600 mt-1">
                                      {results.extrasResults.innerExtras.map((extra, idx) => {
                                        const currency = extra.originalPrice?.currency || 'EUR';
                                        const eurCost = convertToEURSync(extra.totalCost, currency);
                                        return (
                                          <div key={idx}>
                                            • {extra.extraName} - {extra.variantName}: {formatEURPrice(eurCost)}
                                            {currency !== 'EUR' && <span className="text-blue-500 ml-1">(converted from {currency})</span>}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                            <div>
                              <span className="font-bold text-xl text-gray-800">Total Cost (EUR):</span>
                              <p className="text-2xl font-bold text-blue-600">
                                {formatEURPrice(eurCosts.totalEUR)}
                              </p>
                            </div>
                            <div>
                              <span className="font-bold text-xl text-gray-800">Cost per Booklet (EUR):</span>
                              <p className="text-2xl font-bold text-green-600">
                                {formatEURPrice(eurCosts.totalEUR / results.job.quantity, 4)}
                              </p>
                            </div>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-6">
                {results.multiPartResults && results.multiPartResults.results.length > 0 ? (
                  <div className="p-4 border rounded-lg bg-gradient-to-r from-blue-50 to-purple-50">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">Multi-Part Configuration Cost Breakdown</h3>
                    
                    {results.multiPartResults.results.map((part, index) => (
                      <div key={index} className="mb-4 p-3 border rounded-lg bg-white">
                        <h4 className="font-semibold text-gray-700 mb-3">
                          Part {part.partNumber} - {part.partPageCount} pages
                        </h4>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                          <div>
                            <span className="font-medium text-gray-700">Paper & Machine Pairing:</span>
                            <p className="text-sm font-semibold text-blue-600">{part.paperType.name} + {part.machine.name}</p>
                            <p className="text-xs text-gray-500">{part.paperType.gsm} GSM | Setup: ${part.machine.setupCost}</p>
                          </div>
                          <div>
                            <span className="font-medium text-gray-700">Optimal Print Sheet:</span>
                            <p className="text-sm">{part.printSheetSize.name}</p>
                            <p className="text-xs text-gray-500">{part.printSheetSize.width} × {part.printSheetSize.height} mm</p>
                          </div>
                          <div>
                            <span className="font-medium text-gray-700">Stock Sheet:</span>
                            <p className="text-sm">{part.stockSheetSize.name}</p>
                            <p className="text-xs text-gray-500">{part.stockSheetSize.width} × {part.stockSheetSize.height} mm</p>
                          </div>
                          <div>
                            <span className="font-medium text-gray-700">Products per Print Sheet:</span>
                            <p className="text-sm">{part.productsPerPrintSheet}</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                          <div>
                            <span className="font-medium text-gray-700">Print Sheets Needed:</span>
                            <p className="text-sm">{part.printSheetsNeeded}</p>
                          </div>
                          <div>
                            <span className="font-medium text-gray-700">Paper Cost:</span>
                            <p className="text-sm">€{part.paperCost.toFixed(2)}</p>
                          </div>
                          <div>
                            <span className="font-medium text-gray-700">Click Cost:</span>
                            <p className="text-sm">€{part.clickCost.toFixed(2)}</p>
                            {part.clickMultiplier > 1 && (
                              <p className="text-xs text-blue-600">Double-sided (2x)</p>
                            )}
                          </div>
                          <div>
                            <span className="font-medium text-gray-700">Setup Cost:</span>
                            <p className="text-sm">€{part.setupCost.toFixed(2)}</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 pt-3 border-t">
                          <div>
                            <span className="font-bold text-lg text-gray-800">Part Total:</span>
                            <p className="text-xl font-bold text-green-600">€{part.totalCost.toFixed(2)}</p>
                          </div>
                          <div>
                            <span className="font-bold text-lg text-gray-800">Part Cost per Unit:</span>
                            <p className="text-xl font-bold text-blue-600">€{(part.totalCost / part.partPageCount).toFixed(4)}</p>
                          </div>
                        </div>
                      </div>
                    ))}

                    <div className="grid grid-cols-2 gap-4 pt-4 border-t bg-gray-50 p-4 rounded-lg">
                      <div>
                        <span className="font-bold text-xl text-gray-800">Total Multi-Part Cost:</span>
                        <p className="text-2xl font-bold text-purple-600">€{results.multiPartResults.totalCost.toFixed(2)}</p>
                      </div>
                      <div>
                        <span className="font-bold text-xl text-gray-800">Average Cost per Unit:</span>
                        <p className="text-2xl font-bold text-blue-600">
                          €{(results.multiPartResults.totalCost / results.job.quantity).toFixed(4)}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  displayResults.map((result, index) => (
                    <div key={index} className={`p-4 border rounded-lg ${index === 0 ? 'border-green-500 bg-green-50' : 'border-gray-200'}`}>
                      {index === 0 && (
                        <div className="mb-3">
                          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold text-green-800 bg-green-200 rounded">
                            <Award size={12} />
                            {results.selectedPaperType ? 'OPTIMAL STOCK SHEET' : 'RECOMMENDED'}
                          </span>
                        </div>
                      )}
                      
                      {/* Essential Information Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                        {/* Paper & Materials */}
                        <div className="space-y-4">
                          <h4 className="font-semibold text-gray-800 border-b pb-2">Paper & Materials</h4>
                          <div>
                            <span className="font-medium text-gray-700">Paper:</span>
                            <p className="text-sm font-semibold text-blue-600">{result.paperType.name}</p>
                            <p className="text-xs text-gray-500">{result.paperType.gsm}g/m² - €{convertToEURSync(result.paperType.pricePerTon, result.paperType.currency || 'EUR').toFixed(0)}/ton</p>
                          </div>
                          <div>
                            <span className="font-medium text-gray-700">Stock Sheet:</span>
                            <p className="text-sm">{result.stockSheetSize.name}</p>
                            <p className="text-xs text-gray-500">{result.stockSheetSize.width} × {result.stockSheetSize.height} mm</p>
                          </div>
                          <div>
                            <span className="font-medium text-gray-700">Machine:</span>
                            <p className="text-sm">{result.machine.name}</p>
                          </div>
                        </div>

                        {/* Configuration */}
                        <div className="space-y-4">
                          <h4 className="font-semibold text-gray-800 border-b pb-2">Configuration</h4>
                          <div>
                            <span className="font-medium text-gray-700">Binding Edge:</span>
                            <p className="text-sm">{result.bindingEdge === 'short' ? 'Short Edge' : 'Long Edge'}</p>
                          </div>
                          <div>
                            <span className="font-medium text-gray-700">Effective Size:</span>
                            <p className="text-sm">{result.effectiveWidth} × {result.effectiveHeight} mm</p>
                          </div>
                          <div>
                            <span className="font-medium text-gray-700">Print Sheet:</span>
                            <p className="text-sm">{result.printSheetSize.name}</p>
                            <p className="text-xs text-gray-500">{result.printSheetSize.width} × {result.printSheetSize.height} mm</p>
                          </div>
                        </div>

                        {/* Production Metrics */}
                        <div className="space-y-4">
                          <h4 className="font-semibold text-gray-800 border-b pb-2">Production</h4>
                          <div>
                            <span className="font-medium text-gray-700">Sheets per Print Sheet:</span>
                            <p className="text-sm">{result.productsPerPrintSheet}</p>
                          </div>
                          <div>
                            <span className="font-medium text-gray-700">Print Sheets Needed:</span>
                            <p className="text-sm">{result.printSheetsNeeded}</p>
                          </div>
                          <div>
                            <span className="font-medium text-gray-700">Print Sheets per Stock Sheet:</span>
                            <p className="text-sm">{result.printSheetsPerStockSheet}</p>
                          </div>
                          <div>
                            <span className="font-medium text-gray-700">Stock Sheets Needed:</span>
                            <p className="text-sm">{result.stockSheetsNeeded}</p>
                          </div>
                        </div>
                      </div>

                      {/* Cost Information */}
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4 bg-gray-50 p-4 rounded-lg">
                        <div>
                          <span className="font-medium text-gray-700">Paper Weight:</span>
                          <p className="text-sm font-semibold">{result.paperWeight.toFixed(2)} kg</p>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700">Paper Cost:</span>
                          <p className="text-sm font-semibold text-green-600">€{result.paperCost.toFixed(2)}</p>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700">Click Cost:</span>
                          <p className="text-sm font-semibold text-blue-600">€{result.clickCost.toFixed(2)}</p>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700">Total Cost:</span>
                          <p className="text-sm font-bold text-gray-900">€{result.totalCost.toFixed(2)}</p>
                        </div>
                      </div>

                      {/* Normal Mode Extras within main section */}
                      {results.extrasResults && results.extrasResults.length > 0 && (
                        <div className="mt-4 pt-4 border-t">
                          <h4 className="font-semibold text-purple-800 mb-3 flex items-center gap-2">
                            <Award size={16} />
                            Extras & Finishing Options
                          </h4>
                          
                          <div className="space-y-2">
                            {results.extrasResults.map((extra, index) => (
                              <div key={index} className="flex justify-between items-center p-2 border rounded bg-white">
                                <div className="flex-1">
                                  <span className="font-medium">{extra.extraName}</span>
                                  <div className="text-xs text-gray-600 mt-1">
                                    {extra.pricingType === 'per_page' && `${extra.units} ${extra.unitType} × ${formatEURPriceDynamic(convertToEURSync(extra.pricePerUnit, extra.originalPrice?.currency || 'EUR'))} per page`}
                                    {extra.pricingType === 'per_booklet' && `${extra.units} ${extra.unitType} × ${formatEURPriceDynamic(convertToEURSync(extra.pricePerUnit, extra.originalPrice?.currency || 'EUR'))} per unit`}
                                    {extra.pricingType === 'per_form' && `${extra.units} ${extra.unitType} × ${formatEURPriceDynamic(convertToEURSync(extra.pricePerUnit, extra.originalPrice?.currency || 'EUR'))} per form`}
                                    {extra.pricingType === 'per_length' && (
                                      `${extra.units} ${extra.unitType} × ${extra.edgeLength?.toFixed(1) || '0.0'}cm edge × ${formatEURPriceDynamic(convertToEURSync(extra.pricePerUnit, extra.originalPrice?.currency || 'EUR'))} per cm (${lengthBasedEdge} edge)`
                                    )}
                                    {extra.setupCost && extra.setupCost > 0 && (
                                      <div className="text-orange-600 font-medium">
                                        + Setup Cost: {formatEURPriceDynamic(extra.setupCost)} (one-time)
                                      </div>
                                    )}
                                  </div>
                                </div>
                                <div className="text-right">
                                  <span className="font-semibold text-purple-600">{formatEURPriceDynamic(convertToEURSync(extra.totalCost, extra.originalPrice?.currency || 'EUR'))}</span>
                                </div>
                              </div>
                            ))}
                            
                            <div className="flex justify-between items-center pt-2 border-t">
                              <span className="font-semibold text-purple-800">Total Extras:</span>
                              <span className="font-bold text-purple-600">
                                {formatEURPriceDynamic(results.extrasResults.reduce((sum, extra) => sum + convertToEURSync(extra.totalCost, extra.originalPrice?.currency || 'EUR'), 0))}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
                
                {results.job.isBookletMode && showOptimalOnly && results.calculations.length > 3 && (
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

                {/* Final Total Price Section */}
                {results && (
                  <div className="mt-8 border-2 border-blue-200 rounded-lg bg-blue-50 p-6 final-total-price-section">
                    <h2 className="text-2xl font-bold text-blue-800 mb-4 text-center flex items-center justify-center gap-2">
                      <DollarSign size={24} />
                      Final Total Price (EUR)
                    </h2>
                    
                    {/* Exchange Rates Display */}
                    {exchangeRates && (
                      <div className="mb-4 p-3 bg-gray-100 rounded-lg border">
                        <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                          <TrendingUp size={16} />
                          Current Exchange Rates
                        </h4>
                        <div className="flex flex-wrap gap-4 text-xs text-gray-600">
                          <span>1 USD = {exchangeRates.USD.toFixed(4)} EUR</span>
                          <span>1 TRY = {exchangeRates.TRY.toFixed(4)} EUR</span>
                          <span>1 EUR = {(1/exchangeRates.TRY).toFixed(2)} TRY</span>
                          <span>1 USD = {(exchangeRates.USD/exchangeRates.TRY).toFixed(2)} TRY</span>
                          <span className="text-blue-600">• Live rates from altinkaynak.com</span>
                        </div>
                      </div>
                    )}
                    
                    <div className="space-y-4">
                      {results.job.isBookletMode ? (
                        // Booklet Mode Total Breakdown with EUR conversion
                        <div className="space-y-3">
                          {/* Debug logging for troubleshooting */}
                          {console.log('Booklet Final Total Debug:', {
                            hasCover: results.job.hasCover,
                            coverResults: results.coverResults,
                            innerPagesResults: results.innerPagesResults,
                            extrasResults: results.extrasResults
                          })}
                          
                          {(() => {
                            const eurCosts = convertResultsCostsToEUR(results);
                            return (
                              <>
                                {results.job.hasCover ? (
                                  results.coverResults ? (
                                    <div className="flex justify-between items-center p-3 bg-green-50 rounded border border-green-200">
                                      <span className="font-semibold text-green-800">Cover Total Cost (EUR):</span>
                                      <span className="font-bold text-green-700">
                                        {formatEURPrice(eurCosts.coverCostEUR + eurCosts.coverExtrasEUR)}
                                      </span>
                                    </div>
                                  ) : (
                                    <div className="flex justify-between items-center p-3 bg-yellow-50 rounded border border-yellow-200">
                                      <span className="font-semibold text-yellow-800">Cover Total Cost:</span>
                                      <span className="font-medium text-yellow-700">Please select cover paper type and machine</span>
                                    </div>
                                  )
                                ) : null}
                                
                                {results.innerPagesResults ? (
                                  <div className="flex justify-between items-center p-3 bg-orange-50 rounded border border-orange-200">
                                    <span className="font-semibold text-orange-800">Inner Pages Total Cost (EUR):</span>
                                    <span className="font-bold text-orange-700">
                                      {formatEURPrice(eurCosts.innerCostEUR + eurCosts.innerExtrasEUR)}
                                    </span>
                                  </div>
                                ) : (
                                  <div className="flex justify-between items-center p-3 bg-yellow-50 rounded border border-yellow-200">
                                    <span className="font-semibold text-yellow-800">Inner Pages Total Cost:</span>
                                    <span className="font-medium text-yellow-700">Please select inner pages paper type and machine</span>
                                  </div>
                                )}
                                
                                {/* Always show Grand Total section, even if some parts are missing */}
                                <div className="flex justify-between items-center p-4 bg-blue-100 rounded-lg border-2 border-blue-300">
                                  <span className="text-xl font-bold text-blue-900">Grand Total (EUR):</span>
                                  <span className="text-2xl font-bold text-blue-800">
                                    {formatEURPrice(eurCosts.totalEUR)}
                                  </span>
                                </div>
                                
                                <div className="text-center text-sm text-gray-600 mt-3">
                                  <p>Price per booklet (EUR): {formatEURPrice(eurCosts.totalEUR / results.job.quantity, 4)}</p>
                                  <p className="text-xs text-blue-600 mt-1">* All prices converted to EUR using current exchange rates</p>
                                </div>
                              </>
                            );
                          })()}
                        </div>
                      ) : (
                        // Normal Mode Total with EUR conversion
                        <div className="space-y-3">
                          <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                            <span className="font-semibold text-gray-800">Print Job Cost (EUR):</span>
                            <span className="font-bold text-gray-700">
                              {displayResults[0]?.totalCost ? formatEURPrice(displayResults[0].totalCost) : '€0.00'}
                            </span>
                          </div>
                          
                          {results.extrasResults && results.extrasResults.length > 0 && (
                            <div className="flex justify-between items-center p-3 bg-purple-50 rounded border border-purple-200">
                              <span className="font-semibold text-purple-800">Extras Cost (EUR):</span>
                              <span className="font-bold text-purple-700">
                                {formatEURPrice(results.extrasResults.reduce((sum, extra) => {
                                  const currency = extra.originalPrice?.currency || 'EUR';
                                  return sum + convertToEURSync(extra.totalCost, currency);
                                }, 0))}
                              </span>
                            </div>
                          )}
                          
                          <div className="flex justify-between items-center p-4 bg-blue-100 rounded-lg border-2 border-blue-300">
                            <span className="text-xl font-bold text-blue-900">Grand Total (EUR):</span>
                            <span className="text-2xl font-bold text-blue-800">
                              {formatEURPrice((displayResults[0]?.totalCost || 0) + 
                                (results.extrasResults ? results.extrasResults.reduce((sum, extra) => {
                                  const currency = extra.originalPrice?.currency || 'EUR';
                                  return sum + convertToEURSync(extra.totalCost, currency);
                                }, 0) : 0)
                              )}
                            </span>
                          </div>
                          
                          <div className="text-center text-sm text-gray-600 mt-3">
                            <p>Price per unit (EUR): {formatEURPrice(((displayResults[0]?.totalCost || 0) + 
                              (results.extrasResults ? results.extrasResults.reduce((sum, extra) => {
                                const currency = extra.originalPrice?.currency || 'EUR';
                                return sum + convertToEURSync(extra.totalCost, currency);
                              }, 0) : 0)) / 
                              results.job.quantity, 4)}
                            </p>
                            <p className="text-xs text-blue-600 mt-1">* All prices converted to EUR using current exchange rates</p>
                          </div>
                        </div>
                      )}
                    </div>
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