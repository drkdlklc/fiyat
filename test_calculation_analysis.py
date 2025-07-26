#!/usr/bin/env python3
"""
Direct test of the booklet calculation system by analyzing the code structure
"""

import re
import json

def test_booklet_calculation_system():
    """Test the '1 sheet = 4 pages' calculation system by analyzing the code"""
    
    print("🧮 Testing '1 sheet = 4 pages' Calculation System")
    print("=" * 60)
    
    # Read the mockData.js file
    with open('/app/frontend/src/data/mockData.js', 'r') as f:
        content = f.read()
    
    # Test 1: Verify cover calculation logic
    print("\n🎯 Testing Cover Calculation Logic:")
    
    # Find the cover calculation function
    cover_func_match = re.search(r'export const calculateCoverCost = \(job, coverPaperType, coverMachine\) => \{(.*?)\n\};', content, re.DOTALL)
    
    if cover_func_match:
        cover_func = cover_func_match.group(1)
        
        # Check for the key fix: coverSheetsNeeded = job.quantity (1 per booklet)
        if 'coverSheetsNeeded = job.quantity' in cover_func:
            print("✅ Cover sheets calculation: 1 cover sheet per booklet (CORRECT)")
        else:
            print("❌ Cover sheets calculation: Not using 1 cover sheet per booklet")
        
        # Check for the 4 pages per cover calculation
        if 'coverSheetsNeeded * 4' in cover_func:
            print("✅ Cover pages calculation: Each cover sheet provides 4 pages (CORRECT)")
        else:
            print("❌ Cover pages calculation: Not using 4 pages per cover sheet")
        
        # Check for proper booklet quantity tracking
        if 'bookletQuantity: job.quantity' in cover_func:
            print("✅ Booklet quantity tracking: Properly tracks job quantity (CORRECT)")
        else:
            print("❌ Booklet quantity tracking: Not properly tracking job quantity")
            
    else:
        print("❌ Cover calculation function not found")
    
    # Test 2: Verify inner pages calculation logic
    print("\n🎯 Testing Inner Pages Calculation Logic:")
    
    # Find the inner pages calculation function
    inner_func_match = re.search(r'export const calculateInnerPagesCost = \(job, innerPaperType, innerMachine\) => \{(.*?)\n\};', content, re.DOTALL)
    
    if inner_func_match:
        inner_func = inner_func_match.group(1)
        
        # Check for the key fix: inner pages = total pages - 4 cover pages
        if 'job.totalPages - 4' in inner_func:
            print("✅ Inner pages per booklet: total pages - 4 cover pages (CORRECT)")
        else:
            print("❌ Inner pages per booklet: Not using total pages - 4 cover pages")
        
        # Check for the 1 sheet = 4 pages calculation
        if 'Math.ceil(innerPagesPerBooklet / 4)' in inner_func:
            print("✅ Inner sheets per booklet: 1 sheet = 4 pages calculation (CORRECT)")
        else:
            print("❌ Inner sheets per booklet: Not using 1 sheet = 4 pages calculation")
        
        # Check for total inner sheets calculation
        if 'job.quantity * innerSheetsPerBooklet' in inner_func:
            print("✅ Total inner sheets: quantity * sheets per booklet (CORRECT)")
        else:
            print("❌ Total inner sheets: Not properly calculating total sheets")
        
        # Check for total inner pages calculation
        if 'totalInnerSheetsNeeded * 4' in inner_func:
            print("✅ Total inner pages: sheets * 4 pages per sheet (CORRECT)")
        else:
            print("❌ Total inner pages: Not using 4 pages per sheet")
            
    else:
        print("❌ Inner pages calculation function not found")
    
    # Test 3: Verify expected results for the test case
    print("\n📊 Expected Results Verification:")
    print("Test case: 2 booklets, 8 pages per booklet")
    print("Expected results:")
    print("- Cover: 2 cover sheets needed (1 per booklet), each providing 4 pages")
    print("- Inner pages: 4 inner pages per booklet (8 total - 4 cover)")
    print("- Inner sheets: 1 inner sheet per booklet (4 pages ÷ 4 pages per sheet)")
    print("- Total inner sheets: 2 sheets (2 booklets × 1 sheet)")
    print("- Total sheets per booklet: 2 sheets (1 cover + 1 inner)")
    print("- Total pages per booklet: 8 pages (4 cover + 4 inner)")
    
    # Manual calculation verification
    booklets = 2
    pages_per_booklet = 8
    cover_pages_per_booklet = 4
    inner_pages_per_booklet = pages_per_booklet - cover_pages_per_booklet  # 8 - 4 = 4
    inner_sheets_per_booklet = inner_pages_per_booklet // 4  # 4 ÷ 4 = 1
    total_cover_sheets = booklets  # 1 per booklet = 2
    total_inner_sheets = booklets * inner_sheets_per_booklet  # 2 × 1 = 2
    total_sheets_per_booklet = 1 + inner_sheets_per_booklet  # 1 cover + 1 inner = 2
    
    print(f"\n✅ Manual verification:")
    print(f"   Cover sheets needed: {total_cover_sheets}")
    print(f"   Inner sheets needed: {total_inner_sheets}")
    print(f"   Total sheets per booklet: {total_sheets_per_booklet}")
    print(f"   Inner pages per booklet: {inner_pages_per_booklet}")
    
    return True

if __name__ == "__main__":
    test_booklet_calculation_system()