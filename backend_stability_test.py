#!/usr/bin/env python3
"""
Backend Stability Test - Focused on Backend API Endpoints Only
Tests backend service stability after frontend binding edge consistency updates
"""

import requests
import json
import sys
import os
import time

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

class BackendStabilityTester:
    def __init__(self):
        self.backend_url = load_frontend_env()
        if not self.backend_url:
            print("❌ Failed to load backend URL")
            sys.exit(1)
        
        self.api_url = f"{self.backend_url}/api"
        self.test_results = []
        self.total_tests = 0
        self.passed_tests = 0
        
        print(f"🔧 Testing backend stability at: {self.api_url}")
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
                    self.log_test("Root Endpoint (/api/)", True, "Root endpoint responding correctly")
                else:
                    self.log_test("Root Endpoint (/api/)", False, f"Unexpected response: {data}")
            else:
                self.log_test("Root Endpoint (/api/)", False, f"HTTP {response.status_code}: {response.text}")
                
        except requests.exceptions.RequestException as e:
            self.log_test("Root Endpoint (/api/)", False, f"Connection error: {str(e)}")

    def test_status_endpoints(self):
        """Test both GET and POST /api/status endpoints"""
        # Test GET endpoint
        try:
            response = requests.get(f"{self.api_url}/status", timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list):
                    self.log_test("Status GET Endpoint", True, f"Status GET endpoint returned {len(data)} records")
                else:
                    self.log_test("Status GET Endpoint", False, f"Expected list, got: {type(data)}")
            else:
                self.log_test("Status GET Endpoint", False, f"HTTP {response.status_code}: {response.text}")
                
        except requests.exceptions.RequestException as e:
            self.log_test("Status GET Endpoint", False, f"Connection error: {str(e)}")

        # Test POST endpoint
        try:
            test_data = {
                "client_name": "backend_stability_test"
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
                        self.log_test("Paper Types Endpoint", True, f"Paper types endpoint returned {len(data)} paper types with correct structure")
                    else:
                        self.log_test("Paper Types Endpoint", False, f"Paper type structure missing required fields: {required_fields}")
                else:
                    self.log_test("Paper Types Endpoint", False, f"Expected non-empty list, got: {type(data)} with length {len(data) if isinstance(data, list) else 'N/A'}")
            else:
                self.log_test("Paper Types Endpoint", False, f"HTTP {response.status_code}: {response.text}")
                
        except requests.exceptions.RequestException as e:
            self.log_test("Paper Types Endpoint", False, f"Connection error: {str(e)}")

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
                        self.log_test("Machines Endpoint", True, f"Machines endpoint returned {len(data)} machines with correct structure")
                    else:
                        self.log_test("Machines Endpoint", False, f"Machine structure missing required fields: {required_fields}")
                else:
                    self.log_test("Machines Endpoint", False, f"Expected non-empty list, got: {type(data)} with length {len(data) if isinstance(data, list) else 'N/A'}")
            else:
                self.log_test("Machines Endpoint", False, f"HTTP {response.status_code}: {response.text}")
                
        except requests.exceptions.RequestException as e:
            self.log_test("Machines Endpoint", False, f"Connection error: {str(e)}")

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

    def test_database_connectivity(self):
        """Test database connectivity by creating and retrieving a status check"""
        try:
            # Create a unique test record
            test_client_name = f"db_stability_test_{int(time.time())}"
            
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

    def run_stability_tests(self):
        """Run all backend stability tests"""
        print("🚀 Starting Backend Stability Tests")
        print("   (Testing backend after frontend binding edge consistency updates)")
        print()
        
        # Core API endpoint tests
        self.test_root_endpoint()
        self.test_status_endpoints()
        
        # Data management endpoint tests
        self.test_initialize_data_endpoint()
        self.test_paper_types_endpoint()
        self.test_machines_endpoint()
        
        # Database functionality test
        self.test_database_connectivity()
        
        # Print summary
        print("=" * 60)
        print("📊 BACKEND STABILITY TEST SUMMARY")
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
            print("✅ ALL BACKEND TESTS PASSED!")
        
        print()
        return self.passed_tests == self.total_tests

if __name__ == "__main__":
    tester = BackendStabilityTester()
    success = tester.run_stability_tests()
    
    if success:
        print("🎉 Backend is stable and all API endpoints are functional!")
        print("   Frontend binding edge consistency updates did not affect backend.")
        sys.exit(0)
    else:
        print("⚠️  Backend has issues that need attention")
        sys.exit(1)