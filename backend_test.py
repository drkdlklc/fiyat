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
        """Test the GET /api/paper-types endpoint with currency field"""
        try:
            response = requests.get(f"{self.api_url}/paper-types", timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list) and len(data) > 0:
                    # Verify structure of first paper type including currency field
                    first_paper = data[0]
                    required_fields = ['id', 'name', 'gsm', 'pricePerTon', 'currency', 'stockSheetSizes']
                    if all(field in first_paper for field in required_fields):
                        currency = first_paper.get('currency')
                        self.log_test("Paper Types GET Endpoint", True, f"Paper types endpoint returned {len(data)} paper types with correct structure including currency field. First paper currency: {currency}")
                    else:
                        missing_fields = [field for field in required_fields if field not in first_paper]
                        self.log_test("Paper Types GET Endpoint", False, f"Paper type structure missing required fields: {missing_fields}")
                else:
                    self.log_test("Paper Types GET Endpoint", False, f"Expected non-empty list, got: {type(data)} with length {len(data) if isinstance(data, list) else 'N/A'}")
            else:
                self.log_test("Paper Types GET Endpoint", False, f"HTTP {response.status_code}: {response.text}")
                
        except requests.exceptions.RequestException as e:
            self.log_test("Paper Types GET Endpoint", False, f"Connection error: {str(e)}")

    def test_machines_endpoint(self):
        """Test the GET /api/machines endpoint with currency fields"""
        try:
            response = requests.get(f"{self.api_url}/machines", timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list) and len(data) > 0:
                    # Verify structure of first machine including currency fields
                    first_machine = data[0]
                    required_fields = ['id', 'name', 'setupCost', 'setupCostCurrency', 'printSheetSizes']
                    if all(field in first_machine for field in required_fields):
                        setup_currency = first_machine.get('setupCostCurrency')
                        
                        # Check print sheet sizes for clickCostCurrency
                        print_sheets = first_machine.get('printSheetSizes', [])
                        if len(print_sheets) > 0:
                            first_print_sheet = print_sheets[0]
                            print_sheet_fields = ['id', 'name', 'width', 'height', 'clickCost', 'clickCostCurrency']
                            if all(field in first_print_sheet for field in print_sheet_fields):
                                click_currency = first_print_sheet.get('clickCostCurrency')
                                self.log_test("Machines GET Endpoint", True, f"Machines endpoint returned {len(data)} machines with correct structure including currency fields. Setup currency: {setup_currency}, Click currency: {click_currency}")
                            else:
                                missing_print_fields = [field for field in print_sheet_fields if field not in first_print_sheet]
                                self.log_test("Machines GET Endpoint", False, f"Print sheet structure missing required fields: {missing_print_fields}")
                        else:
                            self.log_test("Machines GET Endpoint", False, "No print sheet sizes found in machine")
                    else:
                        missing_fields = [field for field in required_fields if field not in first_machine]
                        self.log_test("Machines GET Endpoint", False, f"Machine structure missing required fields: {missing_fields}")
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
        """Test the GET /api/extras endpoint with currency field in variants"""
        try:
            response = requests.get(f"{self.api_url}/extras", timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list):
                    if len(data) > 0:
                        # Verify structure of first extra including currency field in variants
                        first_extra = data[0]
                        required_fields = ['id', 'name', 'pricingType', 'insideOutsideSame', 'variants']
                        if all(field in first_extra for field in required_fields):
                            # Check if insideOutsideSame is a boolean
                            if isinstance(first_extra.get('insideOutsideSame'), bool):
                                # Check if variants is a list with proper structure including currency
                                variants = first_extra.get('variants', [])
                                if isinstance(variants, list) and len(variants) > 0:
                                    first_variant = variants[0]
                                    variant_fields = ['id', 'variantName', 'price', 'currency']
                                    if all(field in first_variant for field in variant_fields):
                                        variant_currency = first_variant.get('currency')
                                        self.log_test("Extras GET Endpoint", True, f"Extras endpoint returned {len(data)} extras with correct variants structure including currency field. First variant currency: {variant_currency}. First extra has {len(variants)} variants")
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
        """Test the POST /api/extras endpoint with currency field in variants"""
        try:
            test_extra = {
                "name": "Test Lamination with Currency",
                "pricingType": "per_page",
                "insideOutsideSame": True,
                "variants": [
                    {"variantName": "Standard", "price": 0.20, "currency": "USD"},
                    {"variantName": "Premium", "price": 0.35, "currency": "EUR"}
                ]
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
                    data.get("insideOutsideSame") == test_extra["insideOutsideSame"] and
                    "id" in data and "variants" in data):
                    
                    # Verify variants structure including currency
                    variants = data.get("variants", [])
                    if len(variants) == 2:
                        variant1, variant2 = variants[0], variants[1]
                        if (variant1.get("variantName") == "Standard" and variant1.get("price") == 0.20 and
                            variant1.get("currency") == "USD" and variant2.get("variantName") == "Premium" and 
                            variant2.get("price") == 0.35 and variant2.get("currency") == "EUR" and
                            "id" in variant1 and "id" in variant2):
                            self.log_test("Extras POST Endpoint", True, f"Extra creation with currency variants successful. ID: {data.get('id')}, Variants: {len(variants)}")
                            return data.get("id")  # Return the created ID for cleanup
                        else:
                            self.log_test("Extras POST Endpoint", False, f"Variant data mismatch: {variants}")
                    else:
                        self.log_test("Extras POST Endpoint", False, f"Expected 2 variants, got {len(variants)}")
                else:
                    self.log_test("Extras POST Endpoint", False, f"Invalid response structure: {data}")
            else:
                self.log_test("Extras POST Endpoint", False, f"HTTP {response.status_code}: {response.text}")
                
        except requests.exceptions.RequestException as e:
            self.log_test("Extras POST Endpoint", False, f"Connection error: {str(e)}")
        
        return None
        """Test the POST /api/extras endpoint with new variants structure"""
        try:
            test_extra = {
                "name": "Test Lamination with Variants",
                "pricingType": "per_page",
                "insideOutsideSame": True,
                "variants": [
                    {"variantName": "Standard", "price": 0.20},
                    {"variantName": "Premium", "price": 0.35}
                ]
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
                    data.get("insideOutsideSame") == test_extra["insideOutsideSame"] and
                    "id" in data and "variants" in data):
                    
                    # Verify variants structure
                    variants = data.get("variants", [])
                    if len(variants) == 2:
                        variant1, variant2 = variants[0], variants[1]
                        if (variant1.get("variantName") == "Standard" and variant1.get("price") == 0.20 and
                            variant2.get("variantName") == "Premium" and variant2.get("price") == 0.35 and
                            "id" in variant1 and "id" in variant2):
                            self.log_test("Extras POST Endpoint", True, f"Extra creation with variants successful. ID: {data.get('id')}, Variants: {len(variants)}")
                            return data.get("id")  # Return the created ID for cleanup
                        else:
                            self.log_test("Extras POST Endpoint", False, f"Variant data mismatch: {variants}")
                    else:
                        self.log_test("Extras POST Endpoint", False, f"Expected 2 variants, got {len(variants)}")
                else:
                    self.log_test("Extras POST Endpoint", False, f"Invalid response structure: {data}")
            else:
                self.log_test("Extras POST Endpoint", False, f"HTTP {response.status_code}: {response.text}")
                
        except requests.exceptions.RequestException as e:
            self.log_test("Extras POST Endpoint", False, f"Connection error: {str(e)}")
        
        return None

    def test_extras_put_endpoint(self):
        """Test the PUT /api/extras/{id} endpoint with variants update"""
        try:
            # First create an extra to update
            test_extra = {
                "name": "Test Update Extra",
                "pricingType": "per_booklet",
                "insideOutsideSame": False,
                "variants": [
                    {"variantName": "Basic", "price": 5.00}
                ]
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
            original_variant_id = created_extra.get("variants", [{}])[0].get("id")
            
            # Now update the extra including variants
            update_data = {
                "name": "Updated Test Extra",
                "insideOutsideSame": True,
                "variants": [
                    {"id": original_variant_id, "variantName": "Updated Basic", "price": 7.50},
                    {"variantName": "New Premium", "price": 12.00}
                ]
            }
            
            update_response = requests.put(
                f"{self.api_url}/extras/{extra_id}",
                json=update_data,
                headers={"Content-Type": "application/json"},
                timeout=10
            )
            
            if update_response.status_code == 200:
                updated_extra = update_response.json()
                variants = updated_extra.get("variants", [])
                
                if (updated_extra.get("name") == update_data["name"] and
                    updated_extra.get("insideOutsideSame") == update_data["insideOutsideSame"] and
                    len(variants) == 2):
                    
                    # Check if variants were updated correctly
                    updated_variant = next((v for v in variants if v.get("id") == original_variant_id), None)
                    new_variant = next((v for v in variants if v.get("variantName") == "New Premium"), None)
                    
                    if (updated_variant and updated_variant.get("variantName") == "Updated Basic" and 
                        updated_variant.get("price") == 7.50 and new_variant and 
                        new_variant.get("price") == 12.00):
                        self.log_test("Extras PUT Endpoint", True, f"Extra and variants update successful for ID: {extra_id}")
                    else:
                        self.log_test("Extras PUT Endpoint", False, f"Variants update failed: {variants}")
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
                "insideOutsideSame": False,
                "variants": [
                    {"variantName": "Standard", "price": 0.10}
                ]
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
        """Test comprehensive extras database operations with variants structure"""
        try:
            # Initialize data to ensure extras exist
            init_response = requests.post(f"{self.api_url}/initialize-data", timeout=10)
            
            # Get all extras
            get_response = requests.get(f"{self.api_url}/extras", timeout=10)
            
            if get_response.status_code == 200:
                extras = get_response.json()
                if isinstance(extras, list) and len(extras) > 0:
                    # Verify default extras are properly initialized with variants and insideOutsideSame values
                    expected_extras = {
                        "Cellophane Lamination": {"insideOutsideSame": False, "variants": ["Standard", "Premium"]},
                        "Staple Binding": {"insideOutsideSame": True, "variants": ["2-Staple", "3-Staple"]}, 
                        "Spiral Binding": {"insideOutsideSame": True, "variants": ["Plastic Coil", "Metal Wire"]},
                        "Perfect Binding (American)": {"insideOutsideSame": True, "variants": ["Standard", "Premium"]},
                        "UV Coating": {"insideOutsideSame": False, "variants": ["Matte", "Gloss"]}
                    }
                    
                    found_extras = {}
                    for extra in extras:
                        name = extra.get("name")
                        variants = [v.get("variantName") for v in extra.get("variants", [])]
                        found_extras[name] = {
                            "insideOutsideSame": extra.get("insideOutsideSame"),
                            "variants": variants
                        }
                    
                    missing_extras = [name for name in expected_extras if name not in found_extras]
                    incorrect_values = []
                    
                    for name, expected_data in expected_extras.items():
                        if name in found_extras:
                            found_data = found_extras[name]
                            if found_data["insideOutsideSame"] != expected_data["insideOutsideSame"]:
                                incorrect_values.append(f"{name}: insideOutsideSame expected {expected_data['insideOutsideSame']}, got {found_data['insideOutsideSame']}")
                            
                            # Check variants
                            expected_variants = set(expected_data["variants"])
                            found_variants = set(found_data["variants"])
                            if expected_variants != found_variants:
                                incorrect_values.append(f"{name}: variants expected {expected_variants}, got {found_variants}")
                    
                    if not missing_extras and not incorrect_values:
                        self.log_test("Extras Database Operations", True, f"All {len(expected_extras)} default extras properly initialized with correct variants and insideOutsideSame values")
                    else:
                        error_msg = ""
                        if missing_extras:
                            error_msg += f"Missing default extras: {missing_extras}. "
                        if incorrect_values:
                            error_msg += f"Incorrect values: {incorrect_values}"
                        self.log_test("Extras Database Operations", False, error_msg)
                else:
                    self.log_test("Extras Database Operations", False, "No extras found after initialization")
            else:
                self.log_test("Extras Database Operations", False, f"Failed to retrieve extras: {get_response.status_code}")
                
        except requests.exceptions.RequestException as e:
            self.log_test("Extras Database Operations", False, f"Connection error: {str(e)}")

    def test_variants_cm_based_pricing(self):
        """Test that length-based pricing is in centimeters (cm) instead of millimeters (mm)"""
        try:
            # Initialize data to ensure default extras exist
            init_response = requests.post(f"{self.api_url}/initialize-data", timeout=10)
            
            # Get all extras
            get_response = requests.get(f"{self.api_url}/extras", timeout=10)
            
            if get_response.status_code == 200:
                extras = get_response.json()
                spiral_binding = None
                
                # Find Spiral Binding extra
                for extra in extras:
                    if extra.get("name") == "Spiral Binding":
                        spiral_binding = extra
                        break
                
                if spiral_binding:
                    variants = spiral_binding.get("variants", [])
                    if len(variants) >= 2:
                        # Check if pricing is per cm (0.8/cm, 1.2/cm) instead of per mm
                        plastic_coil = next((v for v in variants if v.get("variantName") == "Plastic Coil"), None)
                        metal_wire = next((v for v in variants if v.get("variantName") == "Metal Wire"), None)
                        
                        if plastic_coil and metal_wire:
                            plastic_price = plastic_coil.get("price")
                            metal_price = metal_wire.get("price")
                            
                            # Expect cm-based pricing: 0.8/cm and 1.2/cm
                            if plastic_price == 0.8 and metal_price == 1.2:
                                self.log_test("CM-Based Length Pricing", True, f"Spiral Binding uses cm-based pricing: Plastic Coil {plastic_price}/cm, Metal Wire {metal_price}/cm")
                            else:
                                self.log_test("CM-Based Length Pricing", False, f"Expected cm-based pricing (0.8, 1.2), got: Plastic Coil {plastic_price}, Metal Wire {metal_price}")
                        else:
                            self.log_test("CM-Based Length Pricing", False, "Could not find Plastic Coil and Metal Wire variants")
                    else:
                        self.log_test("CM-Based Length Pricing", False, f"Spiral Binding should have 2 variants, found {len(variants)}")
                else:
                    self.log_test("CM-Based Length Pricing", False, "Spiral Binding extra not found")
            else:
                self.log_test("CM-Based Length Pricing", False, f"Failed to retrieve extras: {get_response.status_code}")
                
        except requests.exceptions.RequestException as e:
            self.log_test("CM-Based Length Pricing", False, f"Connection error: {str(e)}")

    def test_variants_model_validation(self):
        """Test ExtraVariant, ExtraCreate, ExtraUpdate models work correctly"""
        try:
            # Test creating extra with multiple variants
            test_extra = {
                "name": "Test Multi-Variant Extra",
                "pricingType": "per_page",
                "insideOutsideSame": False,
                "variants": [
                    {"variantName": "Basic", "price": 0.15},
                    {"variantName": "Standard", "price": 0.25},
                    {"variantName": "Premium", "price": 0.40}
                ]
            }
            
            create_response = requests.post(
                f"{self.api_url}/extras",
                json=test_extra,
                headers={"Content-Type": "application/json"},
                timeout=10
            )
            
            if create_response.status_code == 200:
                created_extra = create_response.json()
                variants = created_extra.get("variants", [])
                
                if len(variants) == 3:
                    # Verify all variants have proper structure and IDs
                    all_valid = True
                    variant_ids = []
                    
                    for variant in variants:
                        if not all(field in variant for field in ["id", "variantName", "price"]):
                            all_valid = False
                            break
                        variant_ids.append(variant.get("id"))
                    
                    # Check that all variant IDs are unique
                    if all_valid and len(set(variant_ids)) == len(variant_ids):
                        self.log_test("Variants Model Validation", True, f"Multi-variant extra created successfully with {len(variants)} variants, all with unique IDs")
                        
                        # Test updating variants
                        extra_id = created_extra.get("id")
                        first_variant_id = variants[0].get("id")
                        
                        update_data = {
                            "variants": [
                                {"id": first_variant_id, "variantName": "Updated Basic", "price": 0.18},
                                {"variantName": "New Deluxe", "price": 0.55}
                            ]
                        }
                        
                        update_response = requests.put(
                            f"{self.api_url}/extras/{extra_id}",
                            json=update_data,
                            headers={"Content-Type": "application/json"},
                            timeout=10
                        )
                        
                        if update_response.status_code == 200:
                            updated_extra = update_response.json()
                            updated_variants = updated_extra.get("variants", [])
                            
                            if len(updated_variants) == 2:
                                updated_variant = next((v for v in updated_variants if v.get("id") == first_variant_id), None)
                                new_variant = next((v for v in updated_variants if v.get("variantName") == "New Deluxe"), None)
                                
                                if (updated_variant and updated_variant.get("variantName") == "Updated Basic" and
                                    new_variant and new_variant.get("price") == 0.55):
                                    self.log_test("Variants Update Validation", True, "Variant update successful: existing variant updated, new variant added")
                                else:
                                    self.log_test("Variants Update Validation", False, f"Variant update failed: {updated_variants}")
                            else:
                                self.log_test("Variants Update Validation", False, f"Expected 2 variants after update, got {len(updated_variants)}")
                        else:
                            self.log_test("Variants Update Validation", False, f"Variant update failed: {update_response.status_code}")
                    else:
                        self.log_test("Variants Model Validation", False, f"Variant validation failed: all_valid={all_valid}, unique_ids={len(set(variant_ids)) == len(variant_ids)}")
                else:
                    self.log_test("Variants Model Validation", False, f"Expected 3 variants, got {len(variants)}")
            else:
                self.log_test("Variants Model Validation", False, f"Failed to create multi-variant extra: {create_response.status_code}")
                
        except requests.exceptions.RequestException as e:
            self.log_test("Variants Model Validation", False, f"Connection error: {str(e)}")

    def test_variants_backward_compatibility(self):
        """Test that the new variants system maintains backward compatibility"""
        try:
            # Get all existing extras to verify they have variants structure
            get_response = requests.get(f"{self.api_url}/extras", timeout=10)
            
            if get_response.status_code == 200:
                extras = get_response.json()
                if len(extras) > 0:
                    compatibility_issues = []
                    
                    for extra in extras:
                        name = extra.get("name", "Unknown")
                        
                        # Check that all extras have variants field
                        if "variants" not in extra:
                            compatibility_issues.append(f"{name}: missing variants field")
                            continue
                        
                        variants = extra.get("variants", [])
                        if not isinstance(variants, list):
                            compatibility_issues.append(f"{name}: variants is not a list")
                            continue
                        
                        if len(variants) == 0:
                            compatibility_issues.append(f"{name}: variants list is empty")
                            continue
                        
                        # Check that all variants have required fields
                        for i, variant in enumerate(variants):
                            if not all(field in variant for field in ["id", "variantName", "price"]):
                                compatibility_issues.append(f"{name} variant {i}: missing required fields")
                    
                    if not compatibility_issues:
                        self.log_test("Variants Backward Compatibility", True, f"All {len(extras)} existing extras have proper variants structure")
                    else:
                        self.log_test("Variants Backward Compatibility", False, f"Compatibility issues found: {compatibility_issues}")
                else:
                    self.log_test("Variants Backward Compatibility", True, "No existing extras to test compatibility")
            else:
                self.log_test("Variants Backward Compatibility", False, f"Failed to retrieve extras: {get_response.status_code}")
                
        except requests.exceptions.RequestException as e:
            self.log_test("Variants Backward Compatibility", False, f"Connection error: {str(e)}")

    def test_variants_complex_crud_operations(self):
        """Test complex CRUD operations for extras with multiple variants"""
        try:
            # Create an extra with multiple variants
            test_extra = {
                "name": "Complex CRUD Test Extra",
                "pricingType": "per_length",
                "insideOutsideSame": True,
                "variants": [
                    {"variantName": "Type A", "price": 1.0},
                    {"variantName": "Type B", "price": 1.5},
                    {"variantName": "Type C", "price": 2.0}
                ]
            }
            
            # CREATE
            create_response = requests.post(
                f"{self.api_url}/extras",
                json=test_extra,
                headers={"Content-Type": "application/json"},
                timeout=10
            )
            
            if create_response.status_code != 200:
                self.log_test("Complex CRUD Operations", False, "Failed to create test extra")
                return
            
            created_extra = create_response.json()
            extra_id = created_extra.get("id")
            original_variants = created_extra.get("variants", [])
            
            # READ - Verify creation
            get_response = requests.get(f"{self.api_url}/extras", timeout=10)
            if get_response.status_code == 200:
                all_extras = get_response.json()
                found_extra = next((e for e in all_extras if e.get("id") == extra_id), None)
                
                if not found_extra or len(found_extra.get("variants", [])) != 3:
                    self.log_test("Complex CRUD Operations", False, "Created extra not found or variants missing")
                    return
            
            # UPDATE - Complex variant operations
            type_a_id = next((v.get("id") for v in original_variants if v.get("variantName") == "Type A"), None)
            type_b_id = next((v.get("id") for v in original_variants if v.get("variantName") == "Type B"), None)
            
            update_data = {
                "name": "Updated Complex Extra",
                "variants": [
                    {"id": type_a_id, "variantName": "Updated Type A", "price": 1.1},  # Update existing
                    {"variantName": "New Type D", "price": 2.5},  # Add new
                    # Remove Type B and Type C by not including them
                ]
            }
            
            update_response = requests.put(
                f"{self.api_url}/extras/{extra_id}",
                json=update_data,
                headers={"Content-Type": "application/json"},
                timeout=10
            )
            
            if update_response.status_code == 200:
                updated_extra = update_response.json()
                updated_variants = updated_extra.get("variants", [])
                
                # Verify update results
                if (len(updated_variants) == 2 and
                    updated_extra.get("name") == "Updated Complex Extra"):
                    
                    updated_type_a = next((v for v in updated_variants if v.get("id") == type_a_id), None)
                    new_type_d = next((v for v in updated_variants if v.get("variantName") == "New Type D"), None)
                    
                    if (updated_type_a and updated_type_a.get("variantName") == "Updated Type A" and
                        updated_type_a.get("price") == 1.1 and new_type_d and 
                        new_type_d.get("price") == 2.5):
                        
                        # DELETE - Clean up
                        delete_response = requests.delete(f"{self.api_url}/extras/{extra_id}", timeout=10)
                        
                        if delete_response.status_code == 200:
                            self.log_test("Complex CRUD Operations", True, "Complex CRUD operations successful: Create (3 variants) → Update (modify 1, add 1, remove 2) → Delete")
                        else:
                            self.log_test("Complex CRUD Operations", False, "Delete operation failed")
                    else:
                        self.log_test("Complex CRUD Operations", False, f"Update verification failed: {updated_variants}")
                else:
                    self.log_test("Complex CRUD Operations", False, f"Update failed: expected 2 variants, got {len(updated_variants)}")
            else:
                self.log_test("Complex CRUD Operations", False, f"Update operation failed: {update_response.status_code}")
                
        except requests.exceptions.RequestException as e:
            self.log_test("Complex CRUD Operations", False, f"Connection error: {str(e)}")

    def test_extras_inside_outside_same_field_validation(self):
        """Test the insideOutsideSame field validation and optional behavior with variants"""
        try:
            # Test 1: Create extra without insideOutsideSame field (should default to False)
            test_extra_no_field = {
                "name": "Test No Field Extra",
                "pricingType": "per_page",
                "variants": [
                    {"variantName": "Standard", "price": 0.30}
                ]
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
                "insideOutsideSame": True,
                "variants": [
                    {"variantName": "Standard", "price": 5.00}
                ]
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
                "insideOutsideSame": False,
                "variants": [
                    {"variantName": "Standard", "price": 0.12}
                ]
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
        """Test updating only the insideOutsideSame field with variants"""
        try:
            # First create an extra
            test_extra = {
                "name": "Test Update Field Only",
                "pricingType": "per_page",
                "insideOutsideSame": False,
                "variants": [
                    {"variantName": "Standard", "price": 0.25}
                ]
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
                    len(updated_extra.get("variants", [])) == 1):
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

    def test_supports_double_sided_field_in_get(self):
        """Test that GET /api/extras returns supportsDoubleSided field"""
        try:
            # Initialize data to ensure default extras exist
            init_response = requests.post(f"{self.api_url}/initialize-data", timeout=10)
            
            response = requests.get(f"{self.api_url}/extras", timeout=10)
            
            if response.status_code == 200:
                extras = response.json()
                if isinstance(extras, list) and len(extras) > 0:
                    # Check that all extras have supportsDoubleSided field
                    all_have_field = True
                    field_values = []
                    
                    for extra in extras:
                        name = extra.get("name", "Unknown")
                        if "supportsDoubleSided" not in extra:
                            all_have_field = False
                            self.log_test("SupportsDoubleSided Field in GET", False, f"Extra '{name}' missing supportsDoubleSided field")
                            return
                        
                        supports_double_sided = extra.get("supportsDoubleSided")
                        if not isinstance(supports_double_sided, bool):
                            all_have_field = False
                            self.log_test("SupportsDoubleSided Field in GET", False, f"Extra '{name}' supportsDoubleSided is not boolean: {type(supports_double_sided)}")
                            return
                        
                        field_values.append(f"{name}: {supports_double_sided}")
                    
                    if all_have_field:
                        self.log_test("SupportsDoubleSided Field in GET", True, f"All {len(extras)} extras have supportsDoubleSided field. Values: {field_values}")
                    else:
                        self.log_test("SupportsDoubleSided Field in GET", False, "Some extras missing supportsDoubleSided field")
                else:
                    self.log_test("SupportsDoubleSided Field in GET", True, "No extras found (empty database)")
            else:
                self.log_test("SupportsDoubleSided Field in GET", False, f"HTTP {response.status_code}: {response.text}")
                
        except requests.exceptions.RequestException as e:
            self.log_test("SupportsDoubleSided Field in GET", False, f"Connection error: {str(e)}")

    def test_supports_double_sided_field_in_post(self):
        """Test creating extras with supportsDoubleSided field"""
        try:
            # Test 1: Create extra with supportsDoubleSided = True
            test_extra_true = {
                "name": "Test Double Sided True",
                "pricingType": "per_page",
                "insideOutsideSame": False,
                "supportsDoubleSided": True,
                "variants": [
                    {"variantName": "Standard", "price": 0.20}
                ]
            }
            
            response1 = requests.post(
                f"{self.api_url}/extras",
                json=test_extra_true,
                headers={"Content-Type": "application/json"},
                timeout=10
            )
            
            if response1.status_code == 200:
                data1 = response1.json()
                if data1.get("supportsDoubleSided") == True:
                    self.log_test("SupportsDoubleSided POST True", True, f"Extra created with supportsDoubleSided=True: {data1.get('name')}")
                else:
                    self.log_test("SupportsDoubleSided POST True", False, f"Expected True, got: {data1.get('supportsDoubleSided')}")
            else:
                self.log_test("SupportsDoubleSided POST True", False, f"HTTP {response1.status_code}: {response1.text}")
            
            # Test 2: Create extra with supportsDoubleSided = False
            test_extra_false = {
                "name": "Test Double Sided False",
                "pricingType": "per_booklet",
                "insideOutsideSame": True,
                "supportsDoubleSided": False,
                "variants": [
                    {"variantName": "Standard", "price": 5.00}
                ]
            }
            
            response2 = requests.post(
                f"{self.api_url}/extras",
                json=test_extra_false,
                headers={"Content-Type": "application/json"},
                timeout=10
            )
            
            if response2.status_code == 200:
                data2 = response2.json()
                if data2.get("supportsDoubleSided") == False:
                    self.log_test("SupportsDoubleSided POST False", True, f"Extra created with supportsDoubleSided=False: {data2.get('name')}")
                else:
                    self.log_test("SupportsDoubleSided POST False", False, f"Expected False, got: {data2.get('supportsDoubleSided')}")
            else:
                self.log_test("SupportsDoubleSided POST False", False, f"HTTP {response2.status_code}: {response2.text}")
            
            # Test 3: Create extra without supportsDoubleSided field (should default to False)
            test_extra_default = {
                "name": "Test Double Sided Default",
                "pricingType": "per_length",
                "insideOutsideSame": False,
                "variants": [
                    {"variantName": "Standard", "price": 0.10}
                ]
            }
            
            response3 = requests.post(
                f"{self.api_url}/extras",
                json=test_extra_default,
                headers={"Content-Type": "application/json"},
                timeout=10
            )
            
            if response3.status_code == 200:
                data3 = response3.json()
                if data3.get("supportsDoubleSided") == False:
                    self.log_test("SupportsDoubleSided POST Default", True, f"Extra created with default supportsDoubleSided=False: {data3.get('name')}")
                else:
                    self.log_test("SupportsDoubleSided POST Default", False, f"Expected False default, got: {data3.get('supportsDoubleSided')}")
            else:
                self.log_test("SupportsDoubleSided POST Default", False, f"HTTP {response3.status_code}: {response3.text}")
                
        except requests.exceptions.RequestException as e:
            self.log_test("SupportsDoubleSided POST Tests", False, f"Connection error: {str(e)}")

    def test_supports_double_sided_field_in_put(self):
        """Test updating extras with supportsDoubleSided field"""
        try:
            # First create an extra to update
            test_extra = {
                "name": "Test Update Double Sided",
                "pricingType": "per_page",
                "insideOutsideSame": False,
                "supportsDoubleSided": False,
                "variants": [
                    {"variantName": "Standard", "price": 0.15}
                ]
            }
            
            create_response = requests.post(
                f"{self.api_url}/extras",
                json=test_extra,
                headers={"Content-Type": "application/json"},
                timeout=10
            )
            
            if create_response.status_code != 200:
                self.log_test("SupportsDoubleSided PUT Test", False, "Failed to create test extra for update")
                return
            
            created_extra = create_response.json()
            extra_id = created_extra.get("id")
            
            # Test 1: Update supportsDoubleSided from False to True
            update_data = {
                "supportsDoubleSided": True
            }
            
            update_response = requests.put(
                f"{self.api_url}/extras/{extra_id}",
                json=update_data,
                headers={"Content-Type": "application/json"},
                timeout=10
            )
            
            if update_response.status_code == 200:
                updated_extra = update_response.json()
                if (updated_extra.get("supportsDoubleSided") == True and
                    updated_extra.get("name") == test_extra["name"] and
                    updated_extra.get("pricingType") == test_extra["pricingType"]):
                    self.log_test("SupportsDoubleSided PUT Update", True, f"Successfully updated supportsDoubleSided to True for ID: {extra_id}")
                else:
                    self.log_test("SupportsDoubleSided PUT Update", False, f"Update failed or other fields changed: {updated_extra}")
            else:
                self.log_test("SupportsDoubleSided PUT Update", False, f"HTTP {update_response.status_code}: {update_response.text}")
            
            # Test 2: Update supportsDoubleSided back to False
            update_data2 = {
                "supportsDoubleSided": False
            }
            
            update_response2 = requests.put(
                f"{self.api_url}/extras/{extra_id}",
                json=update_data2,
                headers={"Content-Type": "application/json"},
                timeout=10
            )
            
            if update_response2.status_code == 200:
                updated_extra2 = update_response2.json()
                if updated_extra2.get("supportsDoubleSided") == False:
                    self.log_test("SupportsDoubleSided PUT Revert", True, f"Successfully reverted supportsDoubleSided to False for ID: {extra_id}")
                else:
                    self.log_test("SupportsDoubleSided PUT Revert", False, f"Revert failed: {updated_extra2.get('supportsDoubleSided')}")
            else:
                self.log_test("SupportsDoubleSided PUT Revert", False, f"HTTP {update_response2.status_code}: {update_response2.text}")
                
        except requests.exceptions.RequestException as e:
            self.log_test("SupportsDoubleSided PUT Tests", False, f"Connection error: {str(e)}")

    def test_default_extras_supports_double_sided_values(self):
        """Test that default extras have correct supportsDoubleSided values"""
        try:
            # Initialize data to ensure default extras exist
            init_response = requests.post(f"{self.api_url}/initialize-data", timeout=10)
            
            response = requests.get(f"{self.api_url}/extras", timeout=10)
            
            if response.status_code == 200:
                extras = response.json()
                if isinstance(extras, list) and len(extras) > 0:
                    # Expected values based on the review request
                    expected_values = {
                        "Cellophane Lamination": True,  # Can be single/double-sided
                        "UV Coating": True,             # Can be single/double-sided
                        "Staple Binding": False,        # Binding applies to whole booklet
                        "Spiral Binding": False,        # Binding applies to whole booklet
                        "Perfect Binding (American)": False  # Binding applies to whole booklet
                    }
                    
                    found_extras = {}
                    for extra in extras:
                        name = extra.get("name")
                        supports_double_sided = extra.get("supportsDoubleSided")
                        found_extras[name] = supports_double_sided
                    
                    incorrect_values = []
                    missing_extras = []
                    
                    for name, expected_value in expected_values.items():
                        if name in found_extras:
                            actual_value = found_extras[name]
                            if actual_value != expected_value:
                                incorrect_values.append(f"{name}: expected {expected_value}, got {actual_value}")
                        else:
                            missing_extras.append(name)
                    
                    if not incorrect_values and not missing_extras:
                        self.log_test("Default Extras SupportsDoubleSided Values", True, 
                                    f"All default extras have correct supportsDoubleSided values: {found_extras}")
                    else:
                        error_msg = ""
                        if missing_extras:
                            error_msg += f"Missing extras: {missing_extras}. "
                        if incorrect_values:
                            error_msg += f"Incorrect values: {incorrect_values}"
                        self.log_test("Default Extras SupportsDoubleSided Values", False, error_msg)
                else:
                    self.log_test("Default Extras SupportsDoubleSided Values", False, "No extras found after initialization")
            else:
                self.log_test("Default Extras SupportsDoubleSided Values", False, f"HTTP {response.status_code}: {response.text}")
                
        except requests.exceptions.RequestException as e:
            self.log_test("Default Extras SupportsDoubleSided Values", False, f"Connection error: {str(e)}")

    def test_supports_double_sided_field_validation(self):
        """Test supportsDoubleSided field validation and data types"""
        try:
            # Test 1: Try to create extra with invalid supportsDoubleSided value (string instead of boolean)
            test_extra_invalid = {
                "name": "Test Invalid Double Sided",
                "pricingType": "per_page",
                "insideOutsideSame": False,
                "supportsDoubleSided": "true",  # String instead of boolean
                "variants": [
                    {"variantName": "Standard", "price": 0.20}
                ]
            }
            
            response1 = requests.post(
                f"{self.api_url}/extras",
                json=test_extra_invalid,
                headers={"Content-Type": "application/json"},
                timeout=10
            )
            
            # This should either fail validation or convert the string to boolean
            if response1.status_code == 200:
                data1 = response1.json()
                supports_double_sided = data1.get("supportsDoubleSided")
                if isinstance(supports_double_sided, bool):
                    self.log_test("SupportsDoubleSided Validation String", True, 
                                f"String 'true' converted to boolean: {supports_double_sided}")
                else:
                    self.log_test("SupportsDoubleSided Validation String", False, 
                                f"String not converted to boolean: {type(supports_double_sided)}")
            elif response1.status_code == 422:
                self.log_test("SupportsDoubleSided Validation String", True, 
                            "Correctly rejected invalid string value with 422 validation error")
            else:
                self.log_test("SupportsDoubleSided Validation String", False, 
                            f"Unexpected response: {response1.status_code}")
            
            # Test 2: Create extra with valid boolean values and verify field persistence
            test_extra_valid = {
                "name": "Test Valid Double Sided",
                "pricingType": "per_page",
                "insideOutsideSame": False,
                "supportsDoubleSided": True,
                "variants": [
                    {"variantName": "Standard", "price": 0.25}
                ]
            }
            
            response2 = requests.post(
                f"{self.api_url}/extras",
                json=test_extra_valid,
                headers={"Content-Type": "application/json"},
                timeout=10
            )
            
            if response2.status_code == 200:
                created_extra = response2.json()
                extra_id = created_extra.get("id")
                
                # Verify the field persists by retrieving the extra
                get_response = requests.get(f"{self.api_url}/extras", timeout=10)
                if get_response.status_code == 200:
                    all_extras = get_response.json()
                    found_extra = next((e for e in all_extras if e.get("id") == extra_id), None)
                    
                    if found_extra and found_extra.get("supportsDoubleSided") == True:
                        self.log_test("SupportsDoubleSided Field Persistence", True, 
                                    f"Field correctly persisted in database for extra ID: {extra_id}")
                    else:
                        self.log_test("SupportsDoubleSided Field Persistence", False, 
                                    f"Field not persisted correctly: {found_extra.get('supportsDoubleSided') if found_extra else 'Extra not found'}")
                else:
                    self.log_test("SupportsDoubleSided Field Persistence", False, 
                                f"Could not retrieve extras to verify persistence: {get_response.status_code}")
            else:
                self.log_test("SupportsDoubleSided Field Persistence", False, 
                            f"Failed to create valid extra: {response2.status_code}")
                
        except requests.exceptions.RequestException as e:
            self.log_test("SupportsDoubleSided Field Validation", False, f"Connection error: {str(e)}")

    def test_supports_double_sided_with_variants_compatibility(self):
        """Test that supportsDoubleSided field works correctly with existing variants system"""
        try:
            # Create an extra with both variants and supportsDoubleSided
            test_extra = {
                "name": "Test Variants + DoubleSided",
                "pricingType": "per_page",
                "insideOutsideSame": False,
                "supportsDoubleSided": True,
                "variants": [
                    {"variantName": "Basic", "price": 0.15},
                    {"variantName": "Premium", "price": 0.30},
                    {"variantName": "Deluxe", "price": 0.45}
                ]
            }
            
            create_response = requests.post(
                f"{self.api_url}/extras",
                json=test_extra,
                headers={"Content-Type": "application/json"},
                timeout=10
            )
            
            if create_response.status_code == 200:
                created_extra = create_response.json()
                extra_id = created_extra.get("id")
                
                # Verify both variants and supportsDoubleSided are present
                variants = created_extra.get("variants", [])
                supports_double_sided = created_extra.get("supportsDoubleSided")
                
                if (len(variants) == 3 and supports_double_sided == True and
                    all("id" in v and "variantName" in v and "price" in v for v in variants)):
                    
                    # Test updating variants while preserving supportsDoubleSided
                    first_variant_id = variants[0].get("id")
                    update_data = {
                        "variants": [
                            {"id": first_variant_id, "variantName": "Updated Basic", "price": 0.18},
                            {"variantName": "New Super", "price": 0.60}
                        ]
                    }
                    
                    update_response = requests.put(
                        f"{self.api_url}/extras/{extra_id}",
                        json=update_data,
                        headers={"Content-Type": "application/json"},
                        timeout=10
                    )
                    
                    if update_response.status_code == 200:
                        updated_extra = update_response.json()
                        updated_variants = updated_extra.get("variants", [])
                        updated_supports_double_sided = updated_extra.get("supportsDoubleSided")
                        
                        if (len(updated_variants) == 2 and updated_supports_double_sided == True):
                            self.log_test("SupportsDoubleSided + Variants Compatibility", True, 
                                        f"Variants and supportsDoubleSided work together correctly. Updated variants: {len(updated_variants)}, supportsDoubleSided preserved: {updated_supports_double_sided}")
                        else:
                            self.log_test("SupportsDoubleSided + Variants Compatibility", False, 
                                        f"Update failed: variants={len(updated_variants)}, supportsDoubleSided={updated_supports_double_sided}")
                    else:
                        self.log_test("SupportsDoubleSided + Variants Compatibility", False, 
                                    f"Variant update failed: {update_response.status_code}")
                else:
                    self.log_test("SupportsDoubleSided + Variants Compatibility", False, 
                                f"Creation failed: variants={len(variants)}, supportsDoubleSided={supports_double_sided}")
            else:
                self.log_test("SupportsDoubleSided + Variants Compatibility", False, 
                            f"Failed to create test extra: {create_response.status_code}")
                
        except requests.exceptions.RequestException as e:
            self.log_test("SupportsDoubleSided + Variants Compatibility", False, f"Connection error: {str(e)}")

    def test_no_regressions_in_existing_functionality(self):
        """Test that adding supportsDoubleSided field doesn't break existing functionality"""
        try:
            # Test 1: Verify all core API endpoints still work
            endpoints_to_test = [
                ("/", "GET", None, "Root endpoint"),
                ("/status", "GET", None, "Status GET endpoint"),
                ("/status", "POST", {"client_name": "regression_test"}, "Status POST endpoint"),
                ("/paper-types", "GET", None, "Paper types endpoint"),
                ("/machines", "GET", None, "Machines endpoint"),
                ("/initialize-data", "POST", None, "Initialize data endpoint")
            ]
            
            all_endpoints_working = True
            failed_endpoints = []
            
            for endpoint, method, data, description in endpoints_to_test:
                try:
                    if method == "GET":
                        response = requests.get(f"{self.api_url}{endpoint}", timeout=10)
                    elif method == "POST":
                        response = requests.post(f"{self.api_url}{endpoint}", 
                                               json=data, 
                                               headers={"Content-Type": "application/json"} if data else None,
                                               timeout=10)
                    
                    if response.status_code not in [200, 201]:
                        all_endpoints_working = False
                        failed_endpoints.append(f"{description}: {response.status_code}")
                        
                except requests.exceptions.RequestException as e:
                    all_endpoints_working = False
                    failed_endpoints.append(f"{description}: {str(e)}")
            
            if all_endpoints_working:
                self.log_test("No Regressions - Core Endpoints", True, 
                            f"All {len(endpoints_to_test)} core API endpoints working correctly")
            else:
                self.log_test("No Regressions - Core Endpoints", False, 
                            f"Failed endpoints: {failed_endpoints}")
            
            # Test 2: Verify existing extras functionality (insideOutsideSame, variants) still works
            test_extra = {
                "name": "Regression Test Extra",
                "pricingType": "per_booklet",
                "insideOutsideSame": True,
                "variants": [
                    {"variantName": "Standard", "price": 5.00},
                    {"variantName": "Premium", "price": 8.00}
                ]
            }
            
            create_response = requests.post(
                f"{self.api_url}/extras",
                json=test_extra,
                headers={"Content-Type": "application/json"},
                timeout=10
            )
            
            if create_response.status_code == 200:
                created_extra = create_response.json()
                
                # Verify all existing fields work correctly
                if (created_extra.get("name") == test_extra["name"] and
                    created_extra.get("pricingType") == test_extra["pricingType"] and
                    created_extra.get("insideOutsideSame") == test_extra["insideOutsideSame"] and
                    len(created_extra.get("variants", [])) == 2 and
                    "supportsDoubleSided" in created_extra):  # New field should be present with default
                    
                    self.log_test("No Regressions - Existing Fields", True, 
                                "All existing extras functionality works correctly with new supportsDoubleSided field")
                else:
                    self.log_test("No Regressions - Existing Fields", False, 
                                f"Existing functionality broken: {created_extra}")
            else:
                self.log_test("No Regressions - Existing Fields", False, 
                            f"Failed to create test extra: {create_response.status_code}")
                
        except requests.exceptions.RequestException as e:
            self.log_test("No Regressions Tests", False, f"Connection error: {str(e)}")

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

    def test_currency_fields_in_default_data(self):
        """Test that default data includes mixed currencies (USD, EUR, TRY)"""
        try:
            # Initialize data to ensure default data exists
            init_response = requests.post(f"{self.api_url}/initialize-data", timeout=10)
            
            # Test paper types currencies
            paper_response = requests.get(f"{self.api_url}/paper-types", timeout=10)
            if paper_response.status_code == 200:
                paper_types = paper_response.json()
                currencies_found = set()
                for paper in paper_types:
                    currency = paper.get('currency')
                    if currency:
                        currencies_found.add(currency)
                
                expected_currencies = {'USD', 'EUR', 'TRY'}
                if expected_currencies.issubset(currencies_found):
                    self.log_test("Paper Types Currency Mix", True, f"Found expected currencies in paper types: {sorted(currencies_found)}")
                else:
                    missing = expected_currencies - currencies_found
                    self.log_test("Paper Types Currency Mix", False, f"Missing currencies: {missing}. Found: {sorted(currencies_found)}")
            else:
                self.log_test("Paper Types Currency Mix", False, f"Failed to get paper types: {paper_response.status_code}")
            
            # Test machines currencies
            machine_response = requests.get(f"{self.api_url}/machines", timeout=10)
            if machine_response.status_code == 200:
                machines = machine_response.json()
                setup_currencies = set()
                click_currencies = set()
                
                for machine in machines:
                    setup_currency = machine.get('setupCostCurrency')
                    if setup_currency:
                        setup_currencies.add(setup_currency)
                    
                    for print_sheet in machine.get('printSheetSizes', []):
                        click_currency = print_sheet.get('clickCostCurrency')
                        if click_currency:
                            click_currencies.add(click_currency)
                
                if expected_currencies.issubset(setup_currencies | click_currencies):
                    self.log_test("Machine Currency Mix", True, f"Found expected currencies in machines - Setup: {sorted(setup_currencies)}, Click: {sorted(click_currencies)}")
                else:
                    all_machine_currencies = setup_currencies | click_currencies
                    missing = expected_currencies - all_machine_currencies
                    self.log_test("Machine Currency Mix", False, f"Missing currencies: {missing}. Found: Setup={sorted(setup_currencies)}, Click={sorted(click_currencies)}")
            else:
                self.log_test("Machine Currency Mix", False, f"Failed to get machines: {machine_response.status_code}")
            
            # Test extras currencies
            extras_response = requests.get(f"{self.api_url}/extras", timeout=10)
            if extras_response.status_code == 200:
                extras = extras_response.json()
                variant_currencies = set()
                
                for extra in extras:
                    for variant in extra.get('variants', []):
                        currency = variant.get('currency')
                        if currency:
                            variant_currencies.add(currency)
                
                if expected_currencies.issubset(variant_currencies):
                    self.log_test("Extras Currency Mix", True, f"Found expected currencies in extras variants: {sorted(variant_currencies)}")
                else:
                    missing = expected_currencies - variant_currencies
                    self.log_test("Extras Currency Mix", False, f"Missing currencies: {missing}. Found: {sorted(variant_currencies)}")
            else:
                self.log_test("Extras Currency Mix", False, f"Failed to get extras: {extras_response.status_code}")
                
        except requests.exceptions.RequestException as e:
            self.log_test("Currency Fields in Default Data", False, f"Connection error: {str(e)}")

    def test_currency_field_validation(self):
        """Test currency field validation and defaults"""
        try:
            # Test paper type without currency (should default to USD)
            test_paper_no_currency = {
                "name": "Test No Currency Paper",
                "gsm": 80,
                "pricePerTon": 900,
                "stockSheetSizes": [
                    {"id": 1, "name": "A4", "width": 210, "height": 297, "unit": "mm"}
                ]
            }
            
            paper_response = requests.post(
                f"{self.api_url}/paper-types",
                json=test_paper_no_currency,
                headers={"Content-Type": "application/json"},
                timeout=10
            )
            
            if paper_response.status_code == 200:
                created_paper = paper_response.json()
                if created_paper.get('currency') == 'USD':
                    self.log_test("Paper Type Currency Default", True, "Paper type defaults to USD when currency not provided")
                    # Clean up
                    requests.delete(f"{self.api_url}/paper-types/{created_paper.get('id')}", timeout=10)
                else:
                    self.log_test("Paper Type Currency Default", False, f"Expected USD default, got: {created_paper.get('currency')}")
            else:
                self.log_test("Paper Type Currency Default", False, f"Failed to create paper type: {paper_response.status_code}")
            
            # Test machine without currency (should default to USD)
            test_machine_no_currency = {
                "name": "Test No Currency Machine",
                "setupCost": 50,
                "printSheetSizes": [
                    {
                        "id": 1,
                        "name": "A4",
                        "width": 210,
                        "height": 297,
                        "clickCost": 0.05,
                        "duplexSupport": False,
                        "unit": "mm"
                    }
                ]
            }
            
            machine_response = requests.post(
                f"{self.api_url}/machines",
                json=test_machine_no_currency,
                headers={"Content-Type": "application/json"},
                timeout=10
            )
            
            if machine_response.status_code == 200:
                created_machine = machine_response.json()
                setup_currency = created_machine.get('setupCostCurrency')
                print_sheets = created_machine.get('printSheetSizes', [])
                click_currency = print_sheets[0].get('clickCostCurrency') if print_sheets else None
                
                if setup_currency == 'USD' and click_currency == 'USD':
                    self.log_test("Machine Currency Default", True, "Machine defaults to USD when currencies not provided")
                    # Clean up
                    requests.delete(f"{self.api_url}/machines/{created_machine.get('id')}", timeout=10)
                else:
                    self.log_test("Machine Currency Default", False, f"Expected USD defaults, got: setup={setup_currency}, click={click_currency}")
            else:
                self.log_test("Machine Currency Default", False, f"Failed to create machine: {machine_response.status_code}")
            
            # Test extra variant without currency (should default to USD)
            test_extra_no_currency = {
                "name": "Test No Currency Extra",
                "pricingType": "per_page",
                "variants": [
                    {"variantName": "No Currency Variant", "price": 0.15}
                ]
            }
            
            extra_response = requests.post(
                f"{self.api_url}/extras",
                json=test_extra_no_currency,
                headers={"Content-Type": "application/json"},
                timeout=10
            )
            
            if extra_response.status_code == 200:
                created_extra = extra_response.json()
                variants = created_extra.get('variants', [])
                if len(variants) > 0 and variants[0].get('currency') == 'USD':
                    self.log_test("Extra Variant Currency Default", True, "Extra variant defaults to USD when currency not provided")
                    # Clean up
                    requests.delete(f"{self.api_url}/extras/{created_extra.get('id')}", timeout=10)
                else:
                    self.log_test("Extra Variant Currency Default", False, f"Expected USD default, got: {variants[0].get('currency') if variants else 'No variants'}")
            else:
                self.log_test("Extra Variant Currency Default", False, f"Failed to create extra: {extra_response.status_code}")
                
        except requests.exceptions.RequestException as e:
            self.log_test("Currency Field Validation", False, f"Connection error: {str(e)}")

    def test_paper_type_crud_with_currency(self):
        """Test paper type CRUD operations with currency field"""
        try:
            # CREATE - Test creating paper type with currency
            test_paper = {
                "name": "Test Currency Paper",
                "gsm": 90,
                "pricePerTon": 1500,
                "currency": "EUR",
                "stockSheetSizes": [
                    {"id": 1, "name": "A4", "width": 210, "height": 297, "unit": "mm"}
                ]
            }
            
            create_response = requests.post(
                f"{self.api_url}/paper-types",
                json=test_paper,
                headers={"Content-Type": "application/json"},
                timeout=10
            )
            
            if create_response.status_code == 200:
                created_paper = create_response.json()
                paper_id = created_paper.get('id')
                
                if (created_paper.get('currency') == 'EUR' and 
                    created_paper.get('name') == test_paper['name']):
                    self.log_test("Paper Type CREATE with Currency", True, f"Created paper type with EUR currency, ID: {paper_id}")
                    
                    # UPDATE - Test updating currency
                    update_data = {"currency": "TRY", "pricePerTon": 45000}
                    update_response = requests.put(
                        f"{self.api_url}/paper-types/{paper_id}",
                        json=update_data,
                        headers={"Content-Type": "application/json"},
                        timeout=10
                    )
                    
                    if update_response.status_code == 200:
                        updated_paper = update_response.json()
                        if (updated_paper.get('currency') == 'TRY' and 
                            updated_paper.get('pricePerTon') == 45000):
                            self.log_test("Paper Type UPDATE Currency", True, f"Updated currency to TRY and price to 45000")
                            
                            # DELETE - Clean up
                            delete_response = requests.delete(f"{self.api_url}/paper-types/{paper_id}", timeout=10)
                            if delete_response.status_code == 200:
                                self.log_test("Paper Type CRUD with Currency", True, "Complete CRUD operations with currency successful")
                            else:
                                self.log_test("Paper Type DELETE", False, f"Delete failed: {delete_response.status_code}")
                        else:
                            self.log_test("Paper Type UPDATE Currency", False, f"Update failed: {updated_paper}")
                    else:
                        self.log_test("Paper Type UPDATE Currency", False, f"Update request failed: {update_response.status_code}")
                else:
                    self.log_test("Paper Type CREATE with Currency", False, f"Create failed: {created_paper}")
            else:
                self.log_test("Paper Type CREATE with Currency", False, f"Create request failed: {create_response.status_code}")
                
        except requests.exceptions.RequestException as e:
            self.log_test("Paper Type CRUD with Currency", False, f"Connection error: {str(e)}")

    def test_machine_crud_with_currency(self):
        """Test machine CRUD operations with currency fields"""
        try:
            # CREATE - Test creating machine with currency fields
            test_machine = {
                "name": "Test Currency Machine",
                "setupCost": 75,
                "setupCostCurrency": "EUR",
                "printSheetSizes": [
                    {
                        "id": 1,
                        "name": "A3",
                        "width": 297,
                        "height": 420,
                        "clickCost": 0.12,
                        "clickCostCurrency": "EUR",
                        "duplexSupport": True,
                        "unit": "mm"
                    }
                ]
            }
            
            create_response = requests.post(
                f"{self.api_url}/machines",
                json=test_machine,
                headers={"Content-Type": "application/json"},
                timeout=10
            )
            
            if create_response.status_code == 200:
                created_machine = create_response.json()
                machine_id = created_machine.get('id')
                
                setup_currency = created_machine.get('setupCostCurrency')
                print_sheets = created_machine.get('printSheetSizes', [])
                click_currency = print_sheets[0].get('clickCostCurrency') if print_sheets else None
                
                if (setup_currency == 'EUR' and click_currency == 'EUR' and 
                    created_machine.get('name') == test_machine['name']):
                    self.log_test("Machine CREATE with Currency", True, f"Created machine with EUR currencies, ID: {machine_id}")
                    
                    # UPDATE - Test updating currencies
                    update_data = {
                        "setupCostCurrency": "USD",
                        "printSheetSizes": [
                            {
                                "id": 1,
                                "name": "A3",
                                "width": 297,
                                "height": 420,
                                "clickCost": 0.10,
                                "clickCostCurrency": "USD",
                                "duplexSupport": True,
                                "unit": "mm"
                            }
                        ]
                    }
                    
                    update_response = requests.put(
                        f"{self.api_url}/machines/{machine_id}",
                        json=update_data,
                        headers={"Content-Type": "application/json"},
                        timeout=10
                    )
                    
                    if update_response.status_code == 200:
                        updated_machine = update_response.json()
                        updated_setup_currency = updated_machine.get('setupCostCurrency')
                        updated_print_sheets = updated_machine.get('printSheetSizes', [])
                        updated_click_currency = updated_print_sheets[0].get('clickCostCurrency') if updated_print_sheets else None
                        
                        if (updated_setup_currency == 'USD' and updated_click_currency == 'USD'):
                            self.log_test("Machine UPDATE Currency", True, f"Updated currencies to USD")
                            
                            # DELETE - Clean up
                            delete_response = requests.delete(f"{self.api_url}/machines/{machine_id}", timeout=10)
                            if delete_response.status_code == 200:
                                self.log_test("Machine CRUD with Currency", True, "Complete CRUD operations with currency successful")
                            else:
                                self.log_test("Machine DELETE", False, f"Delete failed: {delete_response.status_code}")
                        else:
                            self.log_test("Machine UPDATE Currency", False, f"Update failed: setup={updated_setup_currency}, click={updated_click_currency}")
                    else:
                        self.log_test("Machine UPDATE Currency", False, f"Update request failed: {update_response.status_code}")
                else:
                    self.log_test("Machine CREATE with Currency", False, f"Create failed: setup={setup_currency}, click={click_currency}")
            else:
                self.log_test("Machine CREATE with Currency", False, f"Create request failed: {create_response.status_code}")
                
        except requests.exceptions.RequestException as e:
            self.log_test("Machine CRUD with Currency", False, f"Connection error: {str(e)}")

    def test_extras_crud_with_currency(self):
        """Test extras CRUD operations with currency field in variants"""
        try:
            # CREATE - Test creating extra with currency in variants
            test_extra = {
                "name": "Test Currency Extra",
                "pricingType": "per_page",
                "insideOutsideSame": False,
                "supportsDoubleSided": True,
                "variants": [
                    {"variantName": "EUR Variant", "price": 0.25, "currency": "EUR"},
                    {"variantName": "TRY Variant", "price": 8.5, "currency": "TRY"}
                ]
            }
            
            create_response = requests.post(
                f"{self.api_url}/extras",
                json=test_extra,
                headers={"Content-Type": "application/json"},
                timeout=10
            )
            
            if create_response.status_code == 200:
                created_extra = create_response.json()
                extra_id = created_extra.get('id')
                variants = created_extra.get('variants', [])
                
                if len(variants) == 2:
                    eur_variant = next((v for v in variants if v.get('currency') == 'EUR'), None)
                    try_variant = next((v for v in variants if v.get('currency') == 'TRY'), None)
                    
                    if (eur_variant and try_variant and 
                        eur_variant.get('price') == 0.25 and try_variant.get('price') == 8.5):
                        self.log_test("Extras CREATE with Currency", True, f"Created extra with EUR and TRY variants, ID: {extra_id}")
                        
                        # UPDATE - Test updating variant currencies
                        eur_variant_id = eur_variant.get('id')
                        update_data = {
                            "variants": [
                                {"id": eur_variant_id, "variantName": "Updated EUR", "price": 0.30, "currency": "EUR"},
                                {"variantName": "New USD Variant", "price": 0.28, "currency": "USD"}
                            ]
                        }
                        
                        update_response = requests.put(
                            f"{self.api_url}/extras/{extra_id}",
                            json=update_data,
                            headers={"Content-Type": "application/json"},
                            timeout=10
                        )
                        
                        if update_response.status_code == 200:
                            updated_extra = update_response.json()
                            updated_variants = updated_extra.get('variants', [])
                            
                            if len(updated_variants) == 2:
                                updated_eur = next((v for v in updated_variants if v.get('id') == eur_variant_id), None)
                                new_usd = next((v for v in updated_variants if v.get('currency') == 'USD'), None)
                                
                                if (updated_eur and updated_eur.get('price') == 0.30 and 
                                    new_usd and new_usd.get('price') == 0.28):
                                    self.log_test("Extras UPDATE Currency", True, f"Updated variant currencies successfully")
                                    
                                    # DELETE - Clean up
                                    delete_response = requests.delete(f"{self.api_url}/extras/{extra_id}", timeout=10)
                                    if delete_response.status_code == 200:
                                        self.log_test("Extras CRUD with Currency", True, "Complete CRUD operations with currency successful")
                                    else:
                                        self.log_test("Extras DELETE", False, f"Delete failed: {delete_response.status_code}")
                                else:
                                    self.log_test("Extras UPDATE Currency", False, f"Update verification failed: {updated_variants}")
                            else:
                                self.log_test("Extras UPDATE Currency", False, f"Expected 2 variants after update, got {len(updated_variants)}")
                        else:
                            self.log_test("Extras UPDATE Currency", False, f"Update request failed: {update_response.status_code}")
                    else:
                        self.log_test("Extras CREATE with Currency", False, f"Variant validation failed: EUR={eur_variant}, TRY={try_variant}")
                else:
                    self.log_test("Extras CREATE with Currency", False, f"Expected 2 variants, got {len(variants)}")
            else:
                self.log_test("Extras CREATE with Currency", False, f"Create request failed: {create_response.status_code}")
                
        except requests.exceptions.RequestException as e:
            self.log_test("Extras CRUD with Currency", False, f"Connection error: {str(e)}")

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
        
        # NEW: Currency Support Tests
        print("💰 Testing Currency Support Implementation")
        print()
        self.test_currency_fields_in_default_data()
        self.test_currency_field_validation()
        
        # Paper types tests with currency
        self.test_paper_types_endpoint()
        self.test_paper_type_crud_with_currency()
        
        # Machines tests with currency
        self.test_machines_endpoint()
        self.test_machine_crud_with_currency()
        
        # New extras endpoints tests with variants support and currency
        print("🎯 Testing Extras Management System with Variants Support and Currency")
        print()
        self.test_extras_get_endpoint()
        self.test_extras_post_endpoint()
        self.test_extras_put_endpoint()
        self.test_extras_delete_endpoint()
        self.test_extras_crud_with_currency()
        self.test_extras_database_operations()
        
        # NEW: Single/Double-Sided Functionality Tests
        print("🔄 Testing Single/Double-Sided Functionality (supportsDoubleSided)")
        print()
        self.test_supports_double_sided_field_in_get()
        self.test_supports_double_sided_field_in_post()
        self.test_supports_double_sided_field_in_put()
        self.test_default_extras_supports_double_sided_values()
        self.test_supports_double_sided_field_validation()
        self.test_supports_double_sided_with_variants_compatibility()
        self.test_no_regressions_in_existing_functionality()
        
        # Variants-specific tests
        print("🔧 Testing Variants Functionality")
        print()
        self.test_variants_cm_based_pricing()
        self.test_variants_model_validation()
        self.test_variants_backward_compatibility()
        self.test_variants_complex_crud_operations()
        
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