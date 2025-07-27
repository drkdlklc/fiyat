from fastapi import FastAPI, APIRouter, HTTPException, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")


# Define Models
class StatusCheck(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class StatusCheckCreate(BaseModel):
    client_name: str

# Paper Type Models
class StockSheetSize(BaseModel):
    id: int
    name: str
    width: float
    height: float
    unit: str = "mm"

class PaperType(BaseModel):
    id: int
    name: str
    gsm: int
    pricePerTon: float
    stockSheetSizes: List[StockSheetSize]

class PaperTypeCreate(BaseModel):
    name: str
    gsm: int
    pricePerTon: float
    stockSheetSizes: List[StockSheetSize]

class PaperTypeUpdate(BaseModel):
    name: Optional[str] = None
    gsm: Optional[int] = None
    pricePerTon: Optional[float] = None
    stockSheetSizes: Optional[List[StockSheetSize]] = None

# Machine Models
class PrintSheetSize(BaseModel):
    id: int
    name: str
    width: float
    height: float
    clickCost: float
    duplexSupport: Optional[bool] = False  # Make optional with default
    unit: str = "mm"

class Machine(BaseModel):
    id: int
    name: str
    setupCost: float
    printSheetSizes: List[PrintSheetSize]

class MachineCreate(BaseModel):
    name: str
    setupCost: float
    printSheetSizes: List[PrintSheetSize]

class MachineUpdate(BaseModel):
    name: Optional[str] = None
    setupCost: Optional[float] = None
    printSheetSizes: Optional[List[PrintSheetSize]] = None

# Extras Models
class ExtraVariant(BaseModel):
    id: int
    variantName: str
    price: float

class Extra(BaseModel):
    id: int
    name: str
    pricingType: str  # 'per_page', 'per_booklet', 'per_length'
    insideOutsideSame: bool = False
    supportsDoubleSided: bool = False  # New field for single/double-sided application
    variants: List[ExtraVariant]

class ExtraVariantCreate(BaseModel):
    variantName: str
    price: float

class ExtraCreate(BaseModel):
    name: str
    pricingType: str
    insideOutsideSame: bool = False
    supportsDoubleSided: bool = False
    variants: List[ExtraVariantCreate]

class ExtraVariantUpdate(BaseModel):
    id: Optional[int] = None
    variantName: Optional[str] = None
    price: Optional[float] = None

class ExtraUpdate(BaseModel):
    name: Optional[str] = None
    pricingType: Optional[str] = None
    insideOutsideSame: Optional[bool] = None
    supportsDoubleSided: Optional[bool] = None
    variants: Optional[List[ExtraVariantUpdate]] = None

# Add your routes to the router instead of directly to app
@api_router.get("/")
async def root():
    return {"message": "Hello World"}

@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate):
    status_dict = input.dict()
    status_obj = StatusCheck(**status_dict)
    _ = await db.status_checks.insert_one(status_obj.dict())
    return status_obj

@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks():
    status_checks = await db.status_checks.find().to_list(1000)
    return [StatusCheck(**status_check) for status_check in status_checks]

# Paper Types API Endpoints
@api_router.get("/paper-types", response_model=List[PaperType])
async def get_paper_types():
    paper_types = await db.paper_types.find().to_list(1000)
    return [PaperType(**paper_type) for paper_type in paper_types]

@api_router.post("/paper-types", response_model=PaperType)
async def create_paper_type(paper_type: PaperTypeCreate):
    # Get the next available ID
    last_paper_type = await db.paper_types.find().sort([("id", -1)]).limit(1).to_list(1)
    next_id = (last_paper_type[0]["id"] + 1) if last_paper_type else 1
    
    paper_type_dict = paper_type.dict()
    paper_type_dict["id"] = next_id
    
    paper_type_obj = PaperType(**paper_type_dict)
    await db.paper_types.insert_one(paper_type_obj.dict())
    return paper_type_obj

@api_router.put("/paper-types/{paper_type_id}", response_model=PaperType)
async def update_paper_type(paper_type_id: int, paper_type_update: PaperTypeUpdate):
    existing_paper_type = await db.paper_types.find_one({"id": paper_type_id})
    if not existing_paper_type:
        raise HTTPException(status_code=404, detail="Paper type not found")
    
    update_data = paper_type_update.dict(exclude_unset=True)
    if update_data:
        await db.paper_types.update_one({"id": paper_type_id}, {"$set": update_data})
    
    updated_paper_type = await db.paper_types.find_one({"id": paper_type_id})
    return PaperType(**updated_paper_type)

@api_router.delete("/paper-types/{paper_type_id}")
async def delete_paper_type(paper_type_id: int):
    result = await db.paper_types.delete_one({"id": paper_type_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Paper type not found")
    return {"message": "Paper type deleted successfully"}

# Machines API Endpoints
@api_router.get("/machines", response_model=List[Machine])
async def get_machines():
    machines = await db.machines.find().to_list(1000)
    return [Machine(**machine) for machine in machines]

@api_router.post("/machines", response_model=Machine)
async def create_machine(machine: MachineCreate):
    # Get the next available ID
    last_machine = await db.machines.find().sort([("id", -1)]).limit(1).to_list(1)
    next_id = (last_machine[0]["id"] + 1) if last_machine else 1
    
    machine_dict = machine.dict()
    machine_dict["id"] = next_id
    
    machine_obj = Machine(**machine_dict)
    await db.machines.insert_one(machine_obj.dict())
    return machine_obj

@api_router.put("/machines/{machine_id}", response_model=Machine)
async def update_machine(machine_id: int, machine_update: MachineUpdate):
    existing_machine = await db.machines.find_one({"id": machine_id})
    if not existing_machine:
        raise HTTPException(status_code=404, detail="Machine not found")
    
    update_data = machine_update.dict(exclude_unset=True)
    if update_data:
        await db.machines.update_one({"id": machine_id}, {"$set": update_data})
    
    updated_machine = await db.machines.find_one({"id": machine_id})
    return Machine(**updated_machine)

@api_router.delete("/machines/{machine_id}")
async def delete_machine(machine_id: int):
    result = await db.machines.delete_one({"id": machine_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Machine not found")
    return {"message": "Machine deleted successfully"}

# Extras CRUD operations
@api_router.get("/extras", response_model=List[Extra])
async def get_extras():
    extras = []
    async for extra in db.extras.find():
        extras.append(Extra(**extra))
    return extras

@api_router.post("/extras", response_model=Extra)
async def create_extra(extra: ExtraCreate):
    # Generate new ID for extra
    existing_extras = await db.extras.find().sort("id", -1).limit(1).to_list(1)
    new_id = 1 if not existing_extras else existing_extras[0]["id"] + 1
    
    # Generate IDs for variants
    all_extras = await db.extras.find().to_list(None)
    max_variant_id = 0
    for e in all_extras:
        for variant in e.get("variants", []):
            max_variant_id = max(max_variant_id, variant.get("id", 0))
    
    # Assign IDs to variants
    variants_with_ids = []
    for i, variant in enumerate(extra.variants):
        variant_dict = variant.dict()
        variant_dict["id"] = max_variant_id + i + 1
        variants_with_ids.append(variant_dict)
    
    extra_obj = Extra(
        id=new_id, 
        name=extra.name,
        pricingType=extra.pricingType,
        insideOutsideSame=extra.insideOutsideSame,
        variants=variants_with_ids
    )
    await db.extras.insert_one(extra_obj.dict())
    return extra_obj

@api_router.put("/extras/{extra_id}", response_model=Extra)
async def update_extra(extra_id: int, extra_update: ExtraUpdate):
    existing_extra = await db.extras.find_one({"id": extra_id})
    if not existing_extra:
        raise HTTPException(status_code=404, detail="Extra not found")
    
    update_data = {}
    
    # Update basic fields
    if extra_update.name is not None:
        update_data["name"] = extra_update.name
    if extra_update.pricingType is not None:
        update_data["pricingType"] = extra_update.pricingType
    if extra_update.insideOutsideSame is not None:
        update_data["insideOutsideSame"] = extra_update.insideOutsideSame
    if extra_update.supportsDoubleSided is not None:
        update_data["supportsDoubleSided"] = extra_update.supportsDoubleSided
    
    # Handle variants update
    if extra_update.variants is not None:
        # Get max variant ID from all extras to ensure uniqueness
        all_extras = await db.extras.find().to_list(None)
        max_variant_id = 0
        for e in all_extras:
            for variant in e.get("variants", []):
                max_variant_id = max(max_variant_id, variant.get("id", 0))
        
        updated_variants = []
        for variant_update in extra_update.variants:
            if variant_update.id is not None:
                # Update existing variant
                existing_variant = next((v for v in existing_extra["variants"] if v["id"] == variant_update.id), None)
                if existing_variant:
                    updated_variant = existing_variant.copy()
                    if variant_update.variantName is not None:
                        updated_variant["variantName"] = variant_update.variantName
                    if variant_update.price is not None:
                        updated_variant["price"] = variant_update.price
                    updated_variants.append(updated_variant)
            else:
                # New variant
                max_variant_id += 1
                new_variant = {
                    "id": max_variant_id,
                    "variantName": variant_update.variantName,
                    "price": variant_update.price
                }
                updated_variants.append(new_variant)
        
        update_data["variants"] = updated_variants
    
    if update_data:
        await db.extras.update_one({"id": extra_id}, {"$set": update_data})
    
    updated_extra = await db.extras.find_one({"id": extra_id})
    return Extra(**updated_extra)

@api_router.delete("/extras/{extra_id}")
async def delete_extra(extra_id: int):
    result = await db.extras.delete_one({"id": extra_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Extra not found")
    return {"message": "Extra deleted successfully"}

# Initialize default data endpoint
@api_router.post("/initialize-data")
async def initialize_default_data():
    """Initialize the database with default paper types and machines if they don't exist"""
    
    # Check if data already exists
    existing_paper_types = await db.paper_types.count_documents({})
    existing_machines = await db.machines.count_documents({})
    
    if existing_paper_types == 0:
        # Initialize default paper types
        default_paper_types = [
            {
                "id": 1,
                "name": "80g Standard",
                "gsm": 80,
                "pricePerTon": 850,
                "stockSheetSizes": [
                    {"id": 1, "name": "A4", "width": 210, "height": 297, "unit": "mm"},
                    {"id": 2, "name": "A3", "width": 297, "height": 420, "unit": "mm"},
                    {"id": 3, "name": "SRA3", "width": 320, "height": 450, "unit": "mm"}
                ]
            },
            {
                "id": 2,
                "name": "120g Premium",
                "gsm": 120,
                "pricePerTon": 1200,
                "stockSheetSizes": [
                    {"id": 4, "name": "A3", "width": 297, "height": 420, "unit": "mm"},
                    {"id": 5, "name": "SRA3", "width": 320, "height": 450, "unit": "mm"},
                    {"id": 6, "name": "B2", "width": 500, "height": 707, "unit": "mm"}
                ]
            },
            {
                "id": 3,
                "name": "90g Letter",
                "gsm": 90,
                "pricePerTon": 900,
                "stockSheetSizes": [
                    {"id": 7, "name": "Letter", "width": 216, "height": 279, "unit": "mm"},
                    {"id": 8, "name": "Legal", "width": 216, "height": 356, "unit": "mm"},
                    {"id": 9, "name": "Tabloid", "width": 279, "height": 432, "unit": "mm"}
                ]
            },
            {
                "id": 4,
                "name": "100g Coated",
                "gsm": 100,
                "pricePerTon": 1000,
                "stockSheetSizes": [
                    {"id": 10, "name": "SRA3", "width": 320, "height": 450, "unit": "mm"},
                    {"id": 11, "name": "A2", "width": 420, "height": 594, "unit": "mm"},
                    {"id": 12, "name": "B1", "width": 707, "height": 1000, "unit": "mm"}
                ]
            }
        ]
        
        await db.paper_types.insert_many(default_paper_types)
    
    if existing_machines == 0:
        # Initialize default machines
        default_machines = [
            {
                "id": 1,
                "name": "Heidelberg SM 52",
                "setupCost": 45,
                "printSheetSizes": [
                    {"id": 1, "name": "SRA3", "width": 320, "height": 450, "clickCost": 0.08, "duplexSupport": True, "unit": "mm"},
                    {"id": 2, "name": "A3+", "width": 330, "height": 483, "clickCost": 0.09, "duplexSupport": True, "unit": "mm"},
                    {"id": 3, "name": "Custom Small", "width": 280, "height": 400, "clickCost": 0.06, "duplexSupport": False, "unit": "mm"}
                ]
            },
            {
                "id": 2,
                "name": "Komori L528",
                "setupCost": 50,
                "printSheetSizes": [
                    {"id": 4, "name": "SRA3", "width": 320, "height": 450, "clickCost": 0.07, "duplexSupport": True, "unit": "mm"},
                    {"id": 5, "name": "A3", "width": 297, "height": 420, "clickCost": 0.065, "duplexSupport": True, "unit": "mm"},
                    {"id": 6, "name": "Custom Large", "width": 350, "height": 500, "clickCost": 0.085, "duplexSupport": True, "unit": "mm"}
                ]
            },
            {
                "id": 3,
                "name": "Digital Press HP",
                "setupCost": 25,
                "printSheetSizes": [
                    {"id": 7, "name": "A3", "width": 297, "height": 420, "clickCost": 0.12, "duplexSupport": True, "unit": "mm"},
                    {"id": 8, "name": "A4", "width": 210, "height": 297, "clickCost": 0.08, "duplexSupport": True, "unit": "mm"},
                    {"id": 9, "name": "Letter", "width": 216, "height": 279, "clickCost": 0.085, "duplexSupport": False, "unit": "mm"}
                ]
            }
        ]
        
        await db.machines.insert_many(default_machines)
    
    # Initialize default extras if they don't exist
    existing_extras = await db.extras.count_documents({})
    if existing_extras == 0:
        default_extras = [
            {
                "id": 1, 
                "name": "Cellophane Lamination", 
                "pricingType": "per_page", 
                "insideOutsideSame": False,
                "supportsDoubleSided": True,  # Can be applied to one or both sides
                "variants": [
                    {"id": 1, "variantName": "Standard", "price": 0.15},
                    {"id": 2, "variantName": "Premium", "price": 0.25}
                ]
            },
            {
                "id": 2, 
                "name": "Staple Binding", 
                "pricingType": "per_booklet", 
                "insideOutsideSame": True,
                "supportsDoubleSided": False,  # Binding applies to whole booklet
                "variants": [
                    {"id": 3, "variantName": "2-Staple", "price": 2.50},
                    {"id": 4, "variantName": "3-Staple", "price": 3.50}
                ]
            },
            {
                "id": 3, 
                "name": "Spiral Binding", 
                "pricingType": "per_length", 
                "insideOutsideSame": True,
                "supportsDoubleSided": False,  # Binding applies to whole booklet
                "variants": [
                    {"id": 5, "variantName": "Plastic Coil", "price": 0.8},  # price per cm
                    {"id": 6, "variantName": "Metal Wire", "price": 1.2}    # price per cm
                ]
            },
            {
                "id": 4, 
                "name": "Perfect Binding (American)", 
                "pricingType": "per_booklet", 
                "insideOutsideSame": True,
                "supportsDoubleSided": False,  # Binding applies to whole booklet
                "variants": [
                    {"id": 7, "variantName": "Standard", "price": 15.00},
                    {"id": 8, "variantName": "Premium", "price": 22.50}
                ]
            },
            {
                "id": 5, 
                "name": "UV Coating", 
                "pricingType": "per_page", 
                "insideOutsideSame": False,
                "supportsDoubleSided": True,  # Can be applied to one or both sides
                "variants": [
                    {"id": 9, "variantName": "Matte", "price": 0.25},
                    {"id": 10, "variantName": "Gloss", "price": 0.30}
                ]
            }
        ]
        
        await db.extras.insert_many(default_extras)
    
    return {"message": "Default data initialized successfully"}

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
