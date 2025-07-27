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

    def test_extras_get_endpoint(self):
        """Test the GET /api/extras endpoint with new variants structure"""
        try:
            response = requests.get(f"{self.api_url}/extras", timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list):
                    if len(data) > 0:
                        # Verify structure of first extra including new variants field
                        first_extra = data[0]
                        required_fields = ['id', 'name', 'pricingType', 'insideOutsideSame', 'variants']
                        if all(field in first_extra for field in required_fields):
                            # Check if insideOutsideSame is a boolean
                            if isinstance(first_extra.get('insideOutsideSame'), bool):
                                # Check if variants is a list with proper structure
                                variants = first_extra.get('variants', [])
                                if isinstance(variants, list) and len(variants) > 0:
                                    first_variant = variants[0]
                                    variant_fields = ['id', 'variantName', 'price']
                                    if all(field in first_variant for field in variant_fields):
                                        self.log_test("Extras GET Endpoint", True, f"Extras endpoint returned {len(data)} extras with correct variants structure. First extra has {len(variants)} variants")
                                    else:
                                        missing_variant_fields = [field for field in variant_fields if field not in first_variant]
                                        self.log_test("Extras GET Endpoint", False, f"Variant structure missing required fields: {missing_variant_fields}")
                                else:
                                    self.log_test("Extras GET Endpoint", False, f"Variants field should be non-empty list, got: {type(variants)} with length {len(variants) if isinstance(variants, list) else 'N/A'}")
                            else:
                                self.log_test("Extras GET Endpoint", False, f"insideOutsideSame field is not boolean: {type(first_extra.get('insideOutsideSame'))}")
                        else:
                            missing_fields = [field for field in required_fields if field not in first_extra]
                            self.log_test("Extras GET Endpoint", False, f"Extra structure missing required fields: {missing_fields}")
                    else:
                        self.log_test("Extras GET Endpoint", True, "Extras endpoint returned empty list (no extras initialized yet)")
                else:
                    self.log_test("Extras GET Endpoint", False, f"Expected list, got: {type(data)}")
            else:
                self.log_test("Extras GET Endpoint", False, f"HTTP {response.status_code}: {response.text}")
                
        except requests.exceptions.RequestException as e:
            self.log_test("Extras GET Endpoint", False, f"Connection error: {str(e)}")

    def test_extras_post_endpoint(self):
        """Test the POST /api/extras endpoint with new insideOutsideSame field"""
        try:
            test_extra = {
                "name": "Test Lamination",
                "pricingType": "per_page",
                "price": 0.20,
                "insideOutsideSame": True
            }
            
            response = requests.post(
                f"{self.api_url}/extras",
                json=test_extra,
                headers={"Content-Type": "application/json"},
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if (data.get("name") == test_extra["name"] and 
                    data.get("pricingType") == test_extra["pricingType"] and
                    data.get("price") == test_extra["price"] and
                    data.get("insideOutsideSame") == test_extra["insideOutsideSame"] and
                    "id" in data):
                    self.log_test("Extras POST Endpoint", True, f"Extra creation successful with ID: {data.get('id')}, insideOutsideSame: {data.get('insideOutsideSame')}")
                    return data.get("id")  # Return the created ID for cleanup
                else:
                    self.log_test("Extras POST Endpoint", False, f"Invalid response structure: {data}")
            else:
                self.log_test("Extras POST Endpoint", False, f"HTTP {response.status_code}: {response.text}")
                
        except requests.exceptions.RequestException as e:
            self.log_test("Extras POST Endpoint", False, f"Connection error: {str(e)}")
        
        return None

    def test_extras_put_endpoint(self):
        """Test the PUT /api/extras/{id} endpoint with new insideOutsideSame field"""
        try:
            # First create an extra to update
            test_extra = {
                "name": "Test Update Extra",
                "pricingType": "per_booklet",
                "price": 5.00,
                "insideOutsideSame": False
            }
            
            create_response = requests.post(
                f"{self.api_url}/extras",
                json=test_extra,
                headers={"Content-Type": "application/json"},
                timeout=10
            )
            
            if create_response.status_code != 200:
                self.log_test("Extras PUT Endpoint", False, "Failed to create test extra for update")
                return
            
            created_extra = create_response.json()
            extra_id = created_extra.get("id")
            
            # Now update the extra including the insideOutsideSame field
            update_data = {
                "name": "Updated Test Extra",
                "price": 7.50,
                "insideOutsideSame": True
            }
            
            update_response = requests.put(
                f"{self.api_url}/extras/{extra_id}",
                json=update_data,
                headers={"Content-Type": "application/json"},
                timeout=10
            )
            
            if update_response.status_code == 200:
                updated_extra = update_response.json()
                if (updated_extra.get("name") == update_data["name"] and
                    updated_extra.get("price") == update_data["price"] and
                    updated_extra.get("insideOutsideSame") == update_data["insideOutsideSame"] and
                    updated_extra.get("pricingType") == test_extra["pricingType"]):  # Should remain unchanged
                    self.log_test("Extras PUT Endpoint", True, f"Extra update successful for ID: {extra_id}, insideOutsideSame updated to: {updated_extra.get('insideOutsideSame')}")
                else:
                    self.log_test("Extras PUT Endpoint", False, f"Update data mismatch: {updated_extra}")
            else:
                self.log_test("Extras PUT Endpoint", False, f"HTTP {update_response.status_code}: {update_response.text}")
                
        except requests.exceptions.RequestException as e:
            self.log_test("Extras PUT Endpoint", False, f"Connection error: {str(e)}")

    def test_extras_delete_endpoint(self):
        """Test the DELETE /api/extras/{id} endpoint"""
        try:
            # First create an extra to delete
            test_extra = {
                "name": "Test Delete Extra",
                "pricingType": "per_length",
                "price": 0.10,
                "insideOutsideSame": False
            }
            
            create_response = requests.post(
                f"{self.api_url}/extras",
                json=test_extra,
                headers={"Content-Type": "application/json"},
                timeout=10
            )
            
            if create_response.status_code != 200:
                self.log_test("Extras DELETE Endpoint", False, "Failed to create test extra for deletion")
                return
            
            created_extra = create_response.json()
            extra_id = created_extra.get("id")
            
            # Now delete the extra
            delete_response = requests.delete(f"{self.api_url}/extras/{extra_id}", timeout=10)
            
            if delete_response.status_code == 200:
                data = delete_response.json()
                if data.get("message") == "Extra deleted successfully":
                    # Verify the extra is actually deleted by trying to get it
                    get_response = requests.get(f"{self.api_url}/extras", timeout=10)
                    if get_response.status_code == 200:
                        all_extras = get_response.json()
                        deleted_extra_exists = any(extra.get("id") == extra_id for extra in all_extras)
                        if not deleted_extra_exists:
                            self.log_test("Extras DELETE Endpoint", True, f"Extra deletion successful for ID: {extra_id}")
                        else:
                            self.log_test("Extras DELETE Endpoint", False, "Extra still exists after deletion")
                    else:
                        self.log_test("Extras DELETE Endpoint", False, "Could not verify deletion")
                else:
                    self.log_test("Extras DELETE Endpoint", False, f"Unexpected response: {data}")
            else:
                self.log_test("Extras DELETE Endpoint", False, f"HTTP {delete_response.status_code}: {delete_response.text}")
                
        except requests.exceptions.RequestException as e:
            self.log_test("Extras DELETE Endpoint", False, f"Connection error: {str(e)}")

    def test_extras_database_operations(self):
        """Test comprehensive extras database operations with insideOutsideSame field"""
        try:
            # Initialize data to ensure extras exist
            init_response = requests.post(f"{self.api_url}/initialize-data", timeout=10)
            
            # Get all extras
            get_response = requests.get(f"{self.api_url}/extras", timeout=10)
            
            if get_response.status_code == 200:
                extras = get_response.json()
                if isinstance(extras, list) and len(extras) > 0:
                    # Verify default extras are properly initialized with insideOutsideSame values
                    expected_extras = {
                        "Cellophane Lamination": False,
                        "Staple Binding": True, 
                        "Spiral Binding": True,
                        "Perfect Binding (American)": True,
                        "UV Coating": False
                    }
                    
                    found_extras = {extra.get("name"): extra.get("insideOutsideSame") for extra in extras}
                    missing_extras = [name for name in expected_extras if name not in found_extras]
                    incorrect_values = []
                    
                    for name, expected_value in expected_extras.items():
                        if name in found_extras:
                            if found_extras[name] != expected_value:
                                incorrect_values.append(f"{name}: expected {expected_value}, got {found_extras[name]}")
                    
                    if not missing_extras and not incorrect_values:
                        self.log_test("Extras Database Operations", True, f"All {len(expected_extras)} default extras properly initialized with correct insideOutsideSame values")
                    else:
                        error_msg = ""
                        if missing_extras:
                            error_msg += f"Missing default extras: {missing_extras}. "
                        if incorrect_values:
                            error_msg += f"Incorrect insideOutsideSame values: {incorrect_values}"
                        self.log_test("Extras Database Operations", False, error_msg)
                else:
                    self.log_test("Extras Database Operations", False, "No extras found after initialization")
            else:
                self.log_test("Extras Database Operations", False, f"Failed to retrieve extras: {get_response.status_code}")
                
        except requests.exceptions.RequestException as e:
            self.log_test("Extras Database Operations", False, f"Connection error: {str(e)}")

    def test_extras_inside_outside_same_field_validation(self):
        """Test the insideOutsideSame field validation and optional behavior"""
        try:
            # Test 1: Create extra without insideOutsideSame field (should default to False)
            test_extra_no_field = {
                "name": "Test No Field Extra",
                "pricingType": "per_page",
                "price": 0.30
            }
            
            response1 = requests.post(
                f"{self.api_url}/extras",
                json=test_extra_no_field,
                headers={"Content-Type": "application/json"},
                timeout=10
            )
            
            if response1.status_code == 200:
                data1 = response1.json()
                if data1.get("insideOutsideSame") == False:  # Should default to False
                    self.log_test("InsideOutsideSame Field Default", True, f"Field defaults to False when not provided: {data1.get('insideOutsideSame')}")
                else:
                    self.log_test("InsideOutsideSame Field Default", False, f"Expected False default, got: {data1.get('insideOutsideSame')}")
            else:
                self.log_test("InsideOutsideSame Field Default", False, f"Failed to create extra without field: {response1.status_code}")
            
            # Test 2: Create extra with insideOutsideSame = True
            test_extra_true = {
                "name": "Test True Field Extra",
                "pricingType": "per_booklet",
                "price": 5.00,
                "insideOutsideSame": True
            }
            
            response2 = requests.post(
                f"{self.api_url}/extras",
                json=test_extra_true,
                headers={"Content-Type": "application/json"},
                timeout=10
            )
            
            if response2.status_code == 200:
                data2 = response2.json()
                if data2.get("insideOutsideSame") == True:
                    self.log_test("InsideOutsideSame Field True", True, f"Field correctly set to True: {data2.get('insideOutsideSame')}")
                else:
                    self.log_test("InsideOutsideSame Field True", False, f"Expected True, got: {data2.get('insideOutsideSame')}")
            else:
                self.log_test("InsideOutsideSame Field True", False, f"Failed to create extra with True field: {response2.status_code}")
            
            # Test 3: Create extra with insideOutsideSame = False
            test_extra_false = {
                "name": "Test False Field Extra",
                "pricingType": "per_length",
                "price": 0.12,
                "insideOutsideSame": False
            }
            
            response3 = requests.post(
                f"{self.api_url}/extras",
                json=test_extra_false,
                headers={"Content-Type": "application/json"},
                timeout=10
            )
            
            if response3.status_code == 200:
                data3 = response3.json()
                if data3.get("insideOutsideSame") == False:
                    self.log_test("InsideOutsideSame Field False", True, f"Field correctly set to False: {data3.get('insideOutsideSame')}")
                else:
                    self.log_test("InsideOutsideSame Field False", False, f"Expected False, got: {data3.get('insideOutsideSame')}")
            else:
                self.log_test("InsideOutsideSame Field False", False, f"Failed to create extra with False field: {response3.status_code}")
                
        except requests.exceptions.RequestException as e:
            self.log_test("InsideOutsideSame Field Validation", False, f"Connection error: {str(e)}")

    def test_extras_model_compatibility(self):
        """Test that existing extras without insideOutsideSame field still work"""
        try:
            # Get all existing extras
            get_response = requests.get(f"{self.api_url}/extras", timeout=10)
            
            if get_response.status_code == 200:
                extras = get_response.json()
                if isinstance(extras, list) and len(extras) > 0:
                    # Check that all extras have the insideOutsideSame field
                    all_have_field = True
                    field_values = []
                    
                    for extra in extras:
                        if "insideOutsideSame" not in extra:
                            all_have_field = False
                            break
                        field_values.append(f"{extra.get('name')}: {extra.get('insideOutsideSame')}")
                    
                    if all_have_field:
                        self.log_test("Extras Model Compatibility", True, f"All existing extras have insideOutsideSame field. Values: {field_values}")
                    else:
                        self.log_test("Extras Model Compatibility", False, "Some existing extras missing insideOutsideSame field")
                else:
                    self.log_test("Extras Model Compatibility", True, "No existing extras to test compatibility (empty database)")
            else:
                self.log_test("Extras Model Compatibility", False, f"Failed to retrieve extras: {get_response.status_code}")
                
        except requests.exceptions.RequestException as e:
            self.log_test("Extras Model Compatibility", False, f"Connection error: {str(e)}")

    def test_extras_update_inside_outside_same_only(self):
        """Test updating only the insideOutsideSame field"""
        try:
            # First create an extra
            test_extra = {
                "name": "Test Update Field Only",
                "pricingType": "per_page",
                "price": 0.25,
                "insideOutsideSame": False
            }
            
            create_response = requests.post(
                f"{self.api_url}/extras",
                json=test_extra,
                headers={"Content-Type": "application/json"},
                timeout=10
            )
            
            if create_response.status_code != 200:
                self.log_test("Update InsideOutsideSame Only", False, "Failed to create test extra")
                return
            
            created_extra = create_response.json()
            extra_id = created_extra.get("id")
            
            # Update only the insideOutsideSame field
            update_data = {
                "insideOutsideSame": True
            }
            
            update_response = requests.put(
                f"{self.api_url}/extras/{extra_id}",
                json=update_data,
                headers={"Content-Type": "application/json"},
                timeout=10
            )
            
            if update_response.status_code == 200:
                updated_extra = update_response.json()
                if (updated_extra.get("insideOutsideSame") == True and
                    updated_extra.get("name") == test_extra["name"] and
                    updated_extra.get("pricingType") == test_extra["pricingType"] and
                    updated_extra.get("price") == test_extra["price"]):
                    self.log_test("Update InsideOutsideSame Only", True, f"Successfully updated only insideOutsideSame field to True for ID: {extra_id}")
                else:
                    self.log_test("Update InsideOutsideSame Only", False, f"Field update failed or other fields changed: {updated_extra}")
            else:
                self.log_test("Update InsideOutsideSame Only", False, f"HTTP {update_response.status_code}: {update_response.text}")
                
        except requests.exceptions.RequestException as e:
            self.log_test("Update InsideOutsideSame Only", False, f"Connection error: {str(e)}")

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

// Test parameters from the review request: 2 booklets, 8 pages per booklet
const testJob = {
  productName: "Test Booklet",
  finalWidth: 100,
  finalHeight: 150,
  marginTop: 3,
  marginRight: 3,
  marginBottom: 3,
  marginLeft: 3,
  quantity: 2, // 2 booklets
  isDoubleSided: true,
  setupRequired: false,
  isBookletMode: true,
  coverSetupRequired: false,
  totalPages: 8 // 8 pages per booklet
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
  console.log('Cover Sheets Needed:', coverResult.coverSheetsNeeded);
  console.log('Stock Sheets Needed:', coverResult.stockSheetsNeeded);
  console.log('Total Cover Pages:', coverResult.totalCoverPages);
  console.log('Covers Per Print Sheet:', coverResult.coverSheetsPerPrintSheet);
  console.log('Print Sheets Needed:', coverResult.printSheetsNeeded);
  console.log('Total Cost:', coverResult.totalCost.toFixed(2));
  
  // Verify the fix: 1 cover sheet per booklet (not 2)
  const expectedCoverSheetsNeeded = testJob.quantity; // Should be 2 (1 per booklet)
  const actualCoverSheetsNeeded = coverResult.coverSheetsNeeded;
  
  if (actualCoverSheetsNeeded === expectedCoverSheetsNeeded) {
    console.log('COVER_SHEETS_CORRECT: Expected', expectedCoverSheetsNeeded, 'got', actualCoverSheetsNeeded);
  } else {
    console.log('COVER_SHEETS_ERROR: Expected', expectedCoverSheetsNeeded, 'got', actualCoverSheetsNeeded);
  }
  
  // Verify that total cover pages = cover sheets needed * 4 (each cover sheet yields 4 pages when folded)
  const expectedTotalCoverPages = expectedCoverSheetsNeeded * 4;
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

// Test parameters from the review request: 2 booklets, 8 pages per booklet
const testJob = {
  productName: "Test Booklet",
  finalWidth: 100,
  finalHeight: 150,
  marginTop: 3,
  marginRight: 3,
  marginBottom: 3,
  marginLeft: 3,
  quantity: 2, // 2 booklets
  isDoubleSided: true,
  setupRequired: false,
  isBookletMode: true,
  coverSetupRequired: false,
  totalPages: 8 // 8 pages per booklet
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
  console.log('Inner Sheets Per Booklet:', innerResult.innerSheetsPerBooklet);
  console.log('Total Inner Sheets Needed:', innerResult.totalInnerSheetsNeeded);
  console.log('Total Inner Pages:', innerResult.totalInnerPages);
  console.log('Booklet Quantity:', innerResult.bookletQuantity);
  console.log('Pages Per Print Sheet:', innerResult.innerSheetsPerPrintSheet);
  console.log('Print Sheets Needed:', innerResult.printSheetsNeeded);
  console.log('Stock Sheets Needed:', innerResult.stockSheetsNeeded);
  console.log('Total Cost:', innerResult.totalCost.toFixed(2));
  
  // Expected results for 2 booklets, 8 pages per booklet:
  // - Cover pages per booklet = 4 (from 1 cover sheet)
  // - Inner pages per booklet = 8 - 4 = 4
  // - Inner sheets per booklet = 4 / 4 = 1 (1 sheet = 4 pages)
  // - Total inner sheets needed = 2 booklets * 1 sheet = 2 sheets
  // - Total inner pages = 2 sheets * 4 pages = 8 pages
  
  const expectedInnerPagesPerBooklet = 4; // 8 total - 4 cover = 4 inner
  const expectedInnerSheetsPerBooklet = 1; // 4 inner pages / 4 pages per sheet = 1 sheet
  const expectedTotalInnerSheetsNeeded = 2; // 2 booklets * 1 sheet = 2 sheets
  const expectedTotalInnerPages = 8; // 2 sheets * 4 pages = 8 pages
  
  if (innerResult.innerPagesPerBooklet === expectedInnerPagesPerBooklet) {
    console.log('INNER_PAGES_PER_BOOKLET_CORRECT: Expected', expectedInnerPagesPerBooklet, 'got', innerResult.innerPagesPerBooklet);
  } else {
    console.log('INNER_PAGES_PER_BOOKLET_ERROR: Expected', expectedInnerPagesPerBooklet, 'got', innerResult.innerPagesPerBooklet);
  }
  
  if (innerResult.innerSheetsPerBooklet === expectedInnerSheetsPerBooklet) {
    console.log('INNER_SHEETS_PER_BOOKLET_CORRECT: Expected', expectedInnerSheetsPerBooklet, 'got', innerResult.innerSheetsPerBooklet);
  } else {
    console.log('INNER_SHEETS_PER_BOOKLET_ERROR: Expected', expectedInnerSheetsPerBooklet, 'got', innerResult.innerSheetsPerBooklet);
  }
  
  if (innerResult.totalInnerSheetsNeeded === expectedTotalInnerSheetsNeeded) {
    console.log('TOTAL_INNER_SHEETS_CORRECT: Expected', expectedTotalInnerSheetsNeeded, 'got', innerResult.totalInnerSheetsNeeded);
  } else {
    console.log('TOTAL_INNER_SHEETS_ERROR: Expected', expectedTotalInnerSheetsNeeded, 'got', innerResult.totalInnerSheetsNeeded);
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
        
        # New extras endpoints tests
        print("🎯 Testing Extras Management System with InsideOutsideSame Field")
        print()
        self.test_extras_get_endpoint()
        self.test_extras_post_endpoint()
        self.test_extras_put_endpoint()
        self.test_extras_delete_endpoint()
        self.test_extras_database_operations()
        
        # New field specific tests
        print("🔍 Testing InsideOutsideSame Field Functionality")
        print()
        self.test_extras_inside_outside_same_field_validation()
        self.test_extras_model_compatibility()
        self.test_extras_update_inside_outside_same_only()
        
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