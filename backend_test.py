#!/usr/bin/env python3
"""
Backend API Testing Suite for Printing Cost Calculator
Tests basic API connectivity, health checks, existing endpoints, and cover calculation logic
"""

import requests
import json
import sys
import os
from datetime import datetime
import time
import subprocess

# Load environment variables to get the backend URL
def load_frontend_env():
    """Load the REACT_APP_BACKEND_URL from frontend/.env"""
    env_path = "/app/frontend/.env"
    backend_url = None
    
    try:
        with open(env_path, 'r') as f:
            for line in f:
                if line.startswith('REACT_APP_BACKEND_URL='):
                    backend_url = line.split('=', 1)[1].strip()
                    break
    except FileNotFoundError:
        print(f"❌ Frontend .env file not found at {env_path}")
        return None
    
    if not backend_url:
        print("❌ REACT_APP_BACKEND_URL not found in frontend/.env")
        return None
    
    return backend_url

class BackendTester:
    def __init__(self):
        self.backend_url = load_frontend_env()
        if not self.backend_url:
            print("❌ Failed to load backend URL")
            sys.exit(1)
        
        self.api_url = f"{self.backend_url}/api"
        self.test_results = []
        self.total_tests = 0
        self.passed_tests = 0
        
        print(f"🔧 Testing backend at: {self.api_url}")
        print("=" * 60)

    def log_test(self, test_name, passed, message="", details=None):
        """Log test results"""
        self.total_tests += 1
        if passed:
            self.passed_tests += 1
            status = "✅ PASS"
        else:
            status = "❌ FAIL"
        
        result = {
            "test": test_name,
            "passed": passed,
            "message": message,
            "details": details
        }
        self.test_results.append(result)
        
        print(f"{status} - {test_name}")
        if message:
            print(f"    {message}")
        if details:
            print(f"    Details: {details}")
        print()

    def test_root_endpoint(self):
        """Test the root API endpoint GET /api/"""
        try:
            response = requests.get(f"{self.api_url}/", timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if data.get("message") == "Hello World":
                    self.log_test("Root Endpoint", True, "Root endpoint responding correctly")
                else:
                    self.log_test("Root Endpoint", False, f"Unexpected response: {data}")
            else:
                self.log_test("Root Endpoint", False, f"HTTP {response.status_code}: {response.text}")
                
        except requests.exceptions.RequestException as e:
            self.log_test("Root Endpoint", False, f"Connection error: {str(e)}")

    def test_status_get_endpoint(self):
        """Test the GET /api/status endpoint"""
        try:
            response = requests.get(f"{self.api_url}/status", timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list):
                    self.log_test("Status GET Endpoint", True, f"Status endpoint returned {len(data)} records")
                else:
                    self.log_test("Status GET Endpoint", False, f"Expected list, got: {type(data)}")
            else:
                self.log_test("Status GET Endpoint", False, f"HTTP {response.status_code}: {response.text}")
                
        except requests.exceptions.RequestException as e:
            self.log_test("Status GET Endpoint", False, f"Connection error: {str(e)}")

    def test_status_post_endpoint(self):
        """Test the POST /api/status endpoint"""
        try:
            test_data = {
                "client_name": "test_client_backend_api"
            }
            
            response = requests.post(
                f"{self.api_url}/status", 
                json=test_data,
                headers={"Content-Type": "application/json"},
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if (data.get("client_name") == test_data["client_name"] and 
                    "id" in data and "timestamp" in data):
                    self.log_test("Status POST Endpoint", True, "Status creation successful")
                else:
                    self.log_test("Status POST Endpoint", False, f"Invalid response structure: {data}")
            else:
                self.log_test("Status POST Endpoint", False, f"HTTP {response.status_code}: {response.text}")
                
        except requests.exceptions.RequestException as e:
            self.log_test("Status POST Endpoint", False, f"Connection error: {str(e)}")

    def test_database_connectivity(self):
        """Test database connectivity by creating and retrieving a status check"""
        try:
            # Create a unique test record
            test_client_name = f"db_test_{int(time.time())}"
            
            # POST a new status check
            post_response = requests.post(
                f"{self.api_url}/status",
                json={"client_name": test_client_name},
                headers={"Content-Type": "application/json"},
                timeout=10
            )
            
            if post_response.status_code != 200:
                self.log_test("Database Connectivity", False, f"Failed to create test record: {post_response.status_code}")
                return
            
            created_record = post_response.json()
            created_id = created_record.get("id")
            
            # GET all status checks to verify our record exists
            get_response = requests.get(f"{self.api_url}/status", timeout=10)
            
            if get_response.status_code != 200:
                self.log_test("Database Connectivity", False, f"Failed to retrieve records: {get_response.status_code}")
                return
            
            all_records = get_response.json()
            
            # Check if our test record exists
            found_record = None
            for record in all_records:
                if record.get("id") == created_id:
                    found_record = record
                    break
            
            if found_record:
                self.log_test("Database Connectivity", True, "Database read/write operations working correctly")
            else:
                self.log_test("Database Connectivity", False, "Created record not found in database")
                
        except requests.exceptions.RequestException as e:
            self.log_test("Database Connectivity", False, f"Connection error: {str(e)}")

    def test_cors_headers(self):
        """Test CORS configuration"""
        try:
            response = requests.options(f"{self.api_url}/", timeout=10)
            
            cors_headers = {
                'Access-Control-Allow-Origin': response.headers.get('Access-Control-Allow-Origin'),
                'Access-Control-Allow-Methods': response.headers.get('Access-Control-Allow-Methods'),
                'Access-Control-Allow-Headers': response.headers.get('Access-Control-Allow-Headers')
            }
            
            if cors_headers['Access-Control-Allow-Origin']:
                self.log_test("CORS Configuration", True, "CORS headers present", cors_headers)
            else:
                self.log_test("CORS Configuration", False, "CORS headers missing")
                
        except requests.exceptions.RequestException as e:
            self.log_test("CORS Configuration", False, f"Connection error: {str(e)}")

    def test_paper_types_endpoint(self):
        """Test the GET /api/paper-types endpoint"""
        try:
            response = requests.get(f"{self.api_url}/paper-types", timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list) and len(data) > 0:
                    # Verify structure of first paper type
                    first_paper = data[0]
                    required_fields = ['id', 'name', 'gsm', 'pricePerTon', 'stockSheetSizes']
                    if all(field in first_paper for field in required_fields):
                        self.log_test("Paper Types GET Endpoint", True, f"Paper types endpoint returned {len(data)} paper types with correct structure")
                    else:
                        self.log_test("Paper Types GET Endpoint", False, f"Paper type structure missing required fields: {required_fields}")
                else:
                    self.log_test("Paper Types GET Endpoint", False, f"Expected non-empty list, got: {type(data)} with length {len(data) if isinstance(data, list) else 'N/A'}")
            else:
                self.log_test("Paper Types GET Endpoint", False, f"HTTP {response.status_code}: {response.text}")
                
        except requests.exceptions.RequestException as e:
            self.log_test("Paper Types GET Endpoint", False, f"Connection error: {str(e)}")

    def test_machines_endpoint(self):
        """Test the GET /api/machines endpoint"""
        try:
            response = requests.get(f"{self.api_url}/machines", timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list) and len(data) > 0:
                    # Verify structure of first machine
                    first_machine = data[0]
                    required_fields = ['id', 'name', 'setupCost', 'printSheetSizes']
                    if all(field in first_machine for field in required_fields):
                        self.log_test("Machines GET Endpoint", True, f"Machines endpoint returned {len(data)} machines with correct structure")
                    else:
                        self.log_test("Machines GET Endpoint", False, f"Machine structure missing required fields: {required_fields}")
                else:
                    self.log_test("Machines GET Endpoint", False, f"Expected non-empty list, got: {type(data)} with length {len(data) if isinstance(data, list) else 'N/A'}")
            else:
                self.log_test("Machines GET Endpoint", False, f"HTTP {response.status_code}: {response.text}")
                
        except requests.exceptions.RequestException as e:
            self.log_test("Machines GET Endpoint", False, f"Connection error: {str(e)}")

    def test_initialize_data_endpoint(self):
        """Test the POST /api/initialize-data endpoint"""
        try:
            response = requests.post(f"{self.api_url}/initialize-data", timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if data.get("message") == "Default data initialized successfully":
                    self.log_test("Initialize Data Endpoint", True, "Data initialization endpoint working correctly")
                else:
                    self.log_test("Initialize Data Endpoint", False, f"Unexpected response: {data}")
            else:
                self.log_test("Initialize Data Endpoint", False, f"HTTP {response.status_code}: {response.text}")
                
        except requests.exceptions.RequestException as e:
            self.log_test("Initialize Data Endpoint", False, f"Connection error: {str(e)}")

    def test_cover_calculation_logic(self):
        """Test the cover calculation logic for booklet mode using Node.js"""
        try:
            # Create a test script to run the cover calculation
            test_script = """
const fs = require('fs');

// Read the mockData.js file and extract the calculation functions
const mockDataPath = '/app/frontend/src/data/mockData.js';
let mockDataContent = fs.readFileSync(mockDataPath, 'utf8');

// Remove export statements to make it runnable in Node.js
mockDataContent = mockDataContent.replace(/export const/g, 'const');
mockDataContent = mockDataContent.replace(/export {[^}]*};?/g, '');

// Evaluate the code
eval(mockDataContent);

// Test parameters from the review request
const testJob = {
  productName: "Test Booklet",
  finalWidth: 100,
  finalHeight: 150,
  marginTop: 3,
  marginRight: 3,
  marginBottom: 3,
  marginLeft: 3,
  quantity: 10, // 10 booklets
  isDoubleSided: true,
  setupRequired: false,
  isBookletMode: true,
  coverSetupRequired: false,
  totalPages: 16 // 16 pages per booklet
};

// Mock paper types and machines (using the default data structure)
const testPaperTypes = [
  {
    id: 1,
    name: "80g Standard",
    gsm: 80,
    pricePerTon: 850,
    stockSheetSizes: [
      { id: 1, name: "A4", width: 210, height: 297, unit: "mm" },
      { id: 2, name: "A3", width: 297, height: 420, unit: "mm" },
      { id: 3, name: "SRA3", width: 320, height: 450, unit: "mm" }
    ]
  }
];

const testMachines = [
  {
    id: 1,
    name: "Heidelberg SM 52",
    setupCost: 45,
    printSheetSizes: [
      { id: 1, name: "SRA3", width: 320, height: 450, clickCost: 0.08, duplexSupport: true, unit: "mm" }
    ]
  }
];

// Test the cover calculation
const coverResult = calculateCoverCost(testJob, testPaperTypes[0], testMachines[0]);

if (coverResult) {
  console.log('COVER_CALCULATION_SUCCESS');
  console.log('Total Covers Needed:', coverResult.bookletQuantity);
  console.log('Stock Sheets Needed:', coverResult.stockSheetsNeeded);
  console.log('Total Cover Pages:', coverResult.totalCoverPages);
  console.log('Covers Per Print Sheet:', coverResult.coversPerPrintSheet);
  console.log('Print Sheets Needed:', coverResult.printSheetsNeeded);
  console.log('Total Cost:', coverResult.totalCost.toFixed(2));
  
  // Verify the fix: 1 cover per booklet (not 2)
  const expectedCoversNeeded = testJob.quantity; // Should be 10 (1 per booklet)
  const actualCoversNeeded = coverResult.bookletQuantity;
  
  if (actualCoversNeeded === expectedCoversNeeded) {
    console.log('COVER_COUNT_CORRECT: Expected', expectedCoversNeeded, 'got', actualCoversNeeded);
  } else {
    console.log('COVER_COUNT_ERROR: Expected', expectedCoversNeeded, 'got', actualCoversNeeded);
  }
  
  // Verify that total cover pages = covers needed * 4 (each cover yields 4 pages when folded)
  const expectedTotalCoverPages = expectedCoversNeeded * 4;
  const actualTotalCoverPages = coverResult.totalCoverPages;
  
  if (actualTotalCoverPages === expectedTotalCoverPages) {
    console.log('COVER_PAGES_CORRECT: Expected', expectedTotalCoverPages, 'got', actualTotalCoverPages);
  } else {
    console.log('COVER_PAGES_ERROR: Expected', expectedTotalCoverPages, 'got', actualTotalCoverPages);
  }
  
} else {
  console.log('COVER_CALCULATION_FAILED');
}
"""
            
            # Write the test script to a temporary file
            with open('/tmp/cover_test.js', 'w') as f:
                f.write(test_script)
            
            # Run the test script with Node.js
            result = subprocess.run(['node', '/tmp/cover_test.js'], 
                                  capture_output=True, text=True, timeout=30)
            
            if result.returncode == 0:
                output = result.stdout.strip()
                if 'COVER_CALCULATION_SUCCESS' in output:
                    # Parse the output to verify the calculation
                    lines = output.split('\n')
                    
                    covers_needed = None
                    stock_sheets_needed = None
                    cover_count_correct = False
                    cover_pages_correct = False
                    
                    for line in lines:
                        if 'Total Covers Needed:' in line:
                            covers_needed = int(line.split(':')[1].strip())
                        elif 'Stock Sheets Needed:' in line:
                            stock_sheets_needed = int(line.split(':')[1].strip())
                        elif 'COVER_COUNT_CORRECT' in line:
                            cover_count_correct = True
                        elif 'COVER_PAGES_CORRECT' in line:
                            cover_pages_correct = True
                    
                    if cover_count_correct and cover_pages_correct:
                        self.log_test("Cover Calculation Logic", True, 
                                    f"Cover calculation working correctly: {covers_needed} covers needed, {stock_sheets_needed} stock sheets needed")
                    else:
                        self.log_test("Cover Calculation Logic", False, 
                                    f"Cover calculation has issues - check output: {output}")
                else:
                    self.log_test("Cover Calculation Logic", False, f"Cover calculation failed: {output}")
            else:
                self.log_test("Cover Calculation Logic", False, f"Node.js execution failed: {result.stderr}")
                
        except Exception as e:
            self.log_test("Cover Calculation Logic", False, f"Test execution error: {str(e)}")

    def test_inner_pages_calculation_logic(self):
        """Test the inner pages calculation logic for booklet mode using Node.js"""
        try:
            # Create a test script to run the inner pages calculation
            test_script = """
const fs = require('fs');

// Read the mockData.js file and extract the calculation functions
const mockDataPath = '/app/frontend/src/data/mockData.js';
let mockDataContent = fs.readFileSync(mockDataPath, 'utf8');

// Remove export statements to make it runnable in Node.js
mockDataContent = mockDataContent.replace(/export const/g, 'const');
mockDataContent = mockDataContent.replace(/export {[^}]*};?/g, '');

// Evaluate the code
eval(mockDataContent);

// Test parameters from the review request
const testJob = {
  productName: "Test Booklet",
  finalWidth: 100,
  finalHeight: 150,
  marginTop: 3,
  marginRight: 3,
  marginBottom: 3,
  marginLeft: 3,
  quantity: 10, // 10 booklets
  isDoubleSided: true,
  setupRequired: false,
  isBookletMode: true,
  coverSetupRequired: false,
  totalPages: 16 // 16 pages per booklet
};

// Mock paper types and machines
const testPaperTypes = [
  {
    id: 1,
    name: "80g Standard",
    gsm: 80,
    pricePerTon: 850,
    stockSheetSizes: [
      { id: 1, name: "A4", width: 210, height: 297, unit: "mm" },
      { id: 2, name: "A3", width: 297, height: 420, unit: "mm" },
      { id: 3, name: "SRA3", width: 320, height: 450, unit: "mm" }
    ]
  }
];

const testMachines = [
  {
    id: 1,
    name: "Heidelberg SM 52",
    setupCost: 45,
    printSheetSizes: [
      { id: 1, name: "SRA3", width: 320, height: 450, clickCost: 0.08, duplexSupport: true, unit: "mm" }
    ]
  }
];

// Test the inner pages calculation
const innerResult = calculateInnerPagesCost(testJob, testPaperTypes[0], testMachines[0]);

if (innerResult) {
  console.log('INNER_CALCULATION_SUCCESS');
  console.log('Inner Pages Per Booklet:', innerResult.innerPagesPerBooklet);
  console.log('Total Inner Pages:', innerResult.totalInnerPages);
  console.log('Booklet Quantity:', innerResult.bookletQuantity);
  console.log('Pages Per Print Sheet:', innerResult.pagesPerPrintSheet);
  console.log('Print Sheets Needed:', innerResult.printSheetsNeeded);
  console.log('Stock Sheets Needed:', innerResult.stockSheetsNeeded);
  console.log('Total Cost:', innerResult.totalCost.toFixed(2));
  
  // Verify inner pages calculation: (total pages - 2 cover pages) * quantity
  const expectedInnerPagesPerBooklet = Math.max(0, testJob.totalPages - 2); // 16 - 2 = 14
  const expectedTotalInnerPages = testJob.quantity * expectedInnerPagesPerBooklet; // 10 * 14 = 140
  
  if (innerResult.innerPagesPerBooklet === expectedInnerPagesPerBooklet) {
    console.log('INNER_PAGES_PER_BOOKLET_CORRECT: Expected', expectedInnerPagesPerBooklet, 'got', innerResult.innerPagesPerBooklet);
  } else {
    console.log('INNER_PAGES_PER_BOOKLET_ERROR: Expected', expectedInnerPagesPerBooklet, 'got', innerResult.innerPagesPerBooklet);
  }
  
  if (innerResult.totalInnerPages === expectedTotalInnerPages) {
    console.log('TOTAL_INNER_PAGES_CORRECT: Expected', expectedTotalInnerPages, 'got', innerResult.totalInnerPages);
  } else {
    console.log('TOTAL_INNER_PAGES_ERROR: Expected', expectedTotalInnerPages, 'got', innerResult.totalInnerPages);
  }
  
} else {
  console.log('INNER_CALCULATION_FAILED');
}
"""
            
            # Write the test script to a temporary file
            with open('/tmp/inner_test.js', 'w') as f:
                f.write(test_script)
            
            # Run the test script with Node.js
            result = subprocess.run(['node', '/tmp/inner_test.js'], 
                                  capture_output=True, text=True, timeout=30)
            
            if result.returncode == 0:
                output = result.stdout.strip()
                if 'INNER_CALCULATION_SUCCESS' in output:
                    # Parse the output to verify the calculation
                    lines = output.split('\n')
                    
                    inner_pages_per_booklet = None
                    total_inner_pages = None
                    inner_pages_correct = False
                    total_inner_correct = False
                    
                    for line in lines:
                        if 'Inner Pages Per Booklet:' in line:
                            inner_pages_per_booklet = int(line.split(':')[1].strip())
                        elif 'Total Inner Pages:' in line:
                            total_inner_pages = int(line.split(':')[1].strip())
                        elif 'INNER_PAGES_PER_BOOKLET_CORRECT' in line:
                            inner_pages_correct = True
                        elif 'TOTAL_INNER_PAGES_CORRECT' in line:
                            total_inner_correct = True
                    
                    if inner_pages_correct and total_inner_correct:
                        self.log_test("Inner Pages Calculation Logic", True, 
                                    f"Inner pages calculation working correctly: {inner_pages_per_booklet} pages per booklet, {total_inner_pages} total inner pages")
                    else:
                        self.log_test("Inner Pages Calculation Logic", False, 
                                    f"Inner pages calculation has issues - check output: {output}")
                else:
                    self.log_test("Inner Pages Calculation Logic", False, f"Inner pages calculation failed: {output}")
            else:
                self.log_test("Inner Pages Calculation Logic", False, f"Node.js execution failed: {result.stderr}")
                
        except Exception as e:
            self.log_test("Inner Pages Calculation Logic", False, f"Test execution error: {str(e)}")

    def test_invalid_endpoints(self):
        """Test behavior with invalid endpoints"""
        try:
            response = requests.get(f"{self.api_url}/nonexistent", timeout=10)
            
            if response.status_code == 404:
                self.log_test("Invalid Endpoint Handling", True, "Correctly returns 404 for invalid endpoints")
            else:
                self.log_test("Invalid Endpoint Handling", False, f"Expected 404, got {response.status_code}")
                
        except requests.exceptions.RequestException as e:
            self.log_test("Invalid Endpoint Handling", False, f"Connection error: {str(e)}")

    def run_all_tests(self):
        """Run all backend tests"""
        print("🚀 Starting Backend API Tests")
        print()
        
        # Basic connectivity tests
        self.test_root_endpoint()
        self.test_status_get_endpoint()
        self.test_status_post_endpoint()
        
        # Data endpoints tests
        self.test_initialize_data_endpoint()
        self.test_paper_types_endpoint()
        self.test_machines_endpoint()
        
        # Advanced functionality tests
        self.test_database_connectivity()
        self.test_cors_headers()
        self.test_invalid_endpoints()
        
        # Cover calculation logic tests (frontend logic testing)
        print("🧮 Testing Cover Calculation Logic")
        print()
        self.test_cover_calculation_logic()
        self.test_inner_pages_calculation_logic()
        
        # Print summary
        print("=" * 60)
        print("📊 TEST SUMMARY")
        print("=" * 60)
        print(f"Total Tests: {self.total_tests}")
        print(f"Passed: {self.passed_tests}")
        print(f"Failed: {self.total_tests - self.passed_tests}")
        print(f"Success Rate: {(self.passed_tests/self.total_tests)*100:.1f}%")
        print()
        
        # Print failed tests details
        failed_tests = [test for test in self.test_results if not test["passed"]]
        if failed_tests:
            print("❌ FAILED TESTS:")
            for test in failed_tests:
                print(f"  - {test['test']}: {test['message']}")
        else:
            print("✅ ALL TESTS PASSED!")
        
        print()
        return self.passed_tests == self.total_tests

if __name__ == "__main__":
    tester = BackendTester()
    success = tester.run_all_tests()
    
    if success:
        print("🎉 Backend is healthy and ready for integration!")
        sys.exit(0)
    else:
        print("⚠️  Backend has issues that need attention")
        sys.exit(1)