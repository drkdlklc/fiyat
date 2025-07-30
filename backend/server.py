from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime, timedelta
from altinkaynak import Altinkaynak
from passlib.context import CryptContext
from jose import JWTError, jwt
import bcrypt


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Authentication configuration
SECRET_KEY = os.environ.get("SECRET_KEY", "your-secret-key-here-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 hours

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")


# Define Models
# Authentication Models
class UserPermissions(BaseModel):
    can_access_calculator: bool = True
    can_access_machines: bool = False
    can_access_papers: bool = False
    can_access_extras: bool = False
    can_see_input_prices: bool = False  # If False, user only sees final results
    auto_save_calculations: bool = False  # Automatically save all calculations for this user

class User(BaseModel):
    id: int
    username: str
    hashed_password: str
    is_admin: bool = False
    permissions: UserPermissions
    price_multiplier: float = 1.0  # Custom price multiplier for this user
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class UserCreate(BaseModel):
    username: str
    password: str
    is_admin: bool = False
    permissions: UserPermissions
    price_multiplier: float = 1.0

class UserUpdate(BaseModel):
    username: Optional[str] = None
    password: Optional[str] = None
    is_admin: Optional[bool] = None
    permissions: Optional[UserPermissions] = None
    price_multiplier: Optional[float] = None

class UserLogin(BaseModel):
    username: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str

class UserResponse(BaseModel):
    id: int
    username: str
    is_admin: bool
    permissions: UserPermissions
    price_multiplier: float
    created_at: datetime
    updated_at: datetime

class SavedCalculation(BaseModel):
    id: int
    user_id: int
    username: str  # For easy display
    calculation_name: str
    calculation_data: dict  # Store the complete calculation result
    total_cost_eur: float  # For easy sorting and filtering
    created_at: datetime = Field(default_factory=datetime.utcnow)

class SavedCalculationCreate(BaseModel):
    calculation_name: str
    calculation_data: dict
    total_cost_eur: float

class SavedCalculationResponse(BaseModel):
    id: int
    user_id: int
    username: str
    calculation_name: str
    calculation_data: dict
    total_cost_eur: float
    created_at: datetime

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
    currency: str = "USD"  # New currency field
    stockSheetSizes: List[StockSheetSize]

class PaperTypeCreate(BaseModel):
    name: str
    gsm: int
    pricePerTon: float
    currency: str = "USD"  # New currency field
    stockSheetSizes: List[StockSheetSize]

class PaperTypeUpdate(BaseModel):
    name: Optional[str] = None
    gsm: Optional[int] = None
    pricePerTon: Optional[float] = None
    currency: Optional[str] = None  # New currency field
    stockSheetSizes: Optional[List[StockSheetSize]] = None

# Machine Models
class PrintSheetSize(BaseModel):
    id: int
    name: str
    width: float
    height: float
    clickCost: float
    clickCostCurrency: str = "USD"  # New currency field for click cost
    duplexSupport: Optional[bool] = False  # Make optional with default
    unit: str = "mm"

class Machine(BaseModel):
    id: int
    name: str
    setupCost: float
    setupCostCurrency: str = "USD"  # New currency field for setup cost
    printSheetSizes: List[PrintSheetSize]

class MachineCreate(BaseModel):
    name: str
    setupCost: float
    setupCostCurrency: str = "USD"  # New currency field for setup cost
    printSheetSizes: List[PrintSheetSize]

class MachineUpdate(BaseModel):
    name: Optional[str] = None
    setupCost: Optional[float] = None
    setupCostCurrency: Optional[str] = None  # New currency field for setup cost
    printSheetSizes: Optional[List[PrintSheetSize]] = None

# Extras Models
class ExtraVariant(BaseModel):
    id: int
    variantName: str
    price: float
    currency: str = "USD"  # New currency field for each variant

class Extra(BaseModel):
    id: int
    name: str
    pricingType: str  # 'per_page', 'per_booklet', 'per_length', 'per_form'
    setupCost: float = 0.0  # New setup cost field
    setupCostCurrency: str = "USD"  # New setup cost currency field
    insideOutsideSame: bool = False
    supportsDoubleSided: bool = False  # New field for single/double-sided application
    applyToPrintSheet: bool = False  # New field: apply pricing to print sheet dimensions
    bookletApplicationScope: str = "both"  # New field: 'both', 'cover_only', 'inner_only'
    variants: List[ExtraVariant]

class ExtraVariantCreate(BaseModel):
    variantName: str
    price: float
    currency: str = "USD"  # New currency field for each variant

class ExtraCreate(BaseModel):
    name: str
    pricingType: str
    setupCost: float = 0.0  # New setup cost field
    setupCostCurrency: str = "USD"  # New setup cost currency field
    insideOutsideSame: bool = False
    supportsDoubleSided: bool = False
    applyToPrintSheet: bool = False  # New field: apply pricing to print sheet dimensions
    bookletApplicationScope: str = "both"  # New field: 'both', 'cover_only', 'inner_only'
    variants: List[ExtraVariantCreate]

class ExtraVariantUpdate(BaseModel):
    id: Optional[int] = None
    variantName: Optional[str] = None
    price: Optional[float] = None
    currency: Optional[str] = None  # New currency field for each variant

class ExtraUpdate(BaseModel):
    name: Optional[str] = None
    pricingType: Optional[str] = None
    setupCost: Optional[float] = None  # New setup cost field
    setupCostCurrency: Optional[str] = None  # New setup cost currency field
    insideOutsideSame: Optional[bool] = None
    supportsDoubleSided: Optional[bool] = None
    applyToPrintSheet: Optional[bool] = None  # New field: apply pricing to print sheet dimensions
    bookletApplicationScope: Optional[str] = None  # New field: 'both', 'cover_only', 'inner_only'
    variants: Optional[List[ExtraVariantUpdate]] = None

# Authentication utility functions
def hash_password(password: str) -> str:
    """Hash a password using bcrypt"""
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash"""
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """Create a JWT access token"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Get current user from JWT token"""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    user = await db.users.find_one({"username": username})
    if user is None:
        raise credentials_exception
    return User(**user)

async def get_admin_user(current_user: User = Depends(get_current_user)):
    """Ensure current user is admin"""
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    return current_user

# Add your routes to the router instead of directly to app
@api_router.get("/")
async def root():
    return {"message": "Hello World"}

# Authentication API Endpoints
@api_router.post("/login", response_model=Token)
async def login(user_login: UserLogin):
    """Authenticate user and return JWT token"""
    user = await db.users.find_one({"username": user_login.username})
    if not user or not verify_password(user_login.password, user["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user["username"]}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@api_router.get("/me", response_model=UserResponse)
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    """Get current user information"""
    return UserResponse(**current_user.dict())

# User Management API Endpoints (Admin only)
@api_router.get("/users", response_model=List[UserResponse])
async def get_users(admin_user: User = Depends(get_admin_user)):
    """Get all users (admin only)"""
    users = await db.users.find().to_list(1000)
    return [UserResponse(**user) for user in users]

@api_router.post("/users", response_model=UserResponse)
async def create_user(user_create: UserCreate, admin_user: User = Depends(get_admin_user)):
    """Create a new user (admin only)"""
    # Check if username already exists
    existing_user = await db.users.find_one({"username": user_create.username})
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already exists"
        )
    
    # Generate new user ID
    existing_users = await db.users.find().sort("id", -1).limit(1).to_list(1)
    new_id = 1 if not existing_users else existing_users[0]["id"] + 1
    
    # Create user object
    user_obj = User(
        id=new_id,
        username=user_create.username,
        hashed_password=hash_password(user_create.password),
        is_admin=user_create.is_admin,
        permissions=user_create.permissions,
        price_multiplier=user_create.price_multiplier
    )
    
    await db.users.insert_one(user_obj.dict())
    return UserResponse(**user_obj.dict())

@api_router.put("/users/{user_id}", response_model=UserResponse)
async def update_user(user_id: int, user_update: UserUpdate, admin_user: User = Depends(get_admin_user)):
    """Update a user (admin only)"""
    existing_user = await db.users.find_one({"id": user_id})
    if not existing_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    update_data = {}
    if user_update.username is not None:
        # Check if new username already exists
        username_exists = await db.users.find_one({"username": user_update.username, "id": {"$ne": user_id}})
        if username_exists:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username already exists"
            )
        update_data["username"] = user_update.username
    
    if user_update.password is not None:
        update_data["hashed_password"] = hash_password(user_update.password)
    
    if user_update.is_admin is not None:
        update_data["is_admin"] = user_update.is_admin
    
    if user_update.permissions is not None:
        update_data["permissions"] = user_update.permissions.dict()
    
    if user_update.price_multiplier is not None:
        update_data["price_multiplier"] = user_update.price_multiplier
    
    if update_data:
        update_data["updated_at"] = datetime.utcnow()
        await db.users.update_one({"id": user_id}, {"$set": update_data})
    
    updated_user = await db.users.find_one({"id": user_id})
    return UserResponse(**updated_user)

@api_router.delete("/users/{user_id}")
async def delete_user(user_id: int, admin_user: User = Depends(get_admin_user)):
    """Delete a user (admin only)"""
    # Prevent deleting the default admin
    user_to_delete = await db.users.find_one({"id": user_id})
    if user_to_delete and user_to_delete.get("username") == "Emre":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete default admin user"
        )
    
    result = await db.users.delete_one({"id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    return {"message": "User deleted successfully"}

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
        setupCost=extra.setupCost,
        setupCostCurrency=extra.setupCostCurrency,
        insideOutsideSame=extra.insideOutsideSame,
        supportsDoubleSided=extra.supportsDoubleSided,
        applyToPrintSheet=extra.applyToPrintSheet,
        bookletApplicationScope=extra.bookletApplicationScope,
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
    if extra_update.setupCost is not None:
        update_data["setupCost"] = extra_update.setupCost
    if extra_update.setupCostCurrency is not None:
        update_data["setupCostCurrency"] = extra_update.setupCostCurrency
    if extra_update.insideOutsideSame is not None:
        update_data["insideOutsideSame"] = extra_update.insideOutsideSame
    if extra_update.supportsDoubleSided is not None:
        update_data["supportsDoubleSided"] = extra_update.supportsDoubleSided
    if extra_update.applyToPrintSheet is not None:
        update_data["applyToPrintSheet"] = extra_update.applyToPrintSheet
    if extra_update.bookletApplicationScope is not None:
        update_data["bookletApplicationScope"] = extra_update.bookletApplicationScope
    
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
                    if variant_update.currency is not None:
                        updated_variant["currency"] = variant_update.currency
                    updated_variants.append(updated_variant)
            else:
                # New variant
                max_variant_id += 1
                new_variant = {
                    "id": max_variant_id,
                    "variantName": variant_update.variantName,
                    "price": variant_update.price,
                    "currency": variant_update.currency or "USD"
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

# Helper function for initializing default data
async def initialize_default_data():
    """Initialize the database with default paper types, machines, and users if they don't exist"""
    
    print("🔄 Starting default data initialization...")
    
    # Initialize default admin user - ensure only one exists
    try:
        existing_admin_users = await db.users.find({"username": "Emre"}).to_list(100)
        
        if len(existing_admin_users) > 1:
            # Remove all duplicates and keep only one
            print(f"⚠️ Found {len(existing_admin_users)} duplicate admin users, cleaning up...")
            await db.users.delete_many({"username": "Emre"})
            existing_admin_users = []
        
        if len(existing_admin_users) == 0:
            # Create new admin user with unique ID
            existing_users = await db.users.find().sort("id", -1).limit(1).to_list(1)
            new_admin_id = 1 if not existing_users else existing_users[0]["id"] + 1
            
            admin_user = User(
                id=new_admin_id,
                username="Emre",
                hashed_password=hash_password("169681ymc"),
                is_admin=True,
                permissions=UserPermissions(
                    can_access_calculator=True,
                    can_access_machines=True,
                    can_access_papers=True,
                    can_access_extras=True,
                    can_see_input_prices=True
                ),
                price_multiplier=1.0
            )
            await db.users.insert_one(admin_user.dict())
            print(f"✅ Created default admin user: Emre (ID: {new_admin_id})")
        elif not existing_admin_users[0].get("is_admin", False):
            # Update existing user to be admin if not already
            await db.users.update_one(
                {"username": "Emre"}, 
                {"$set": {"is_admin": True, "updated_at": datetime.utcnow()}}
            )
            print("✅ Updated existing Emre user to admin status")
        else:
            print("✅ Default admin user already exists and is properly configured")
    except Exception as e:
        print(f"❌ Error initializing admin user: {e}")
        # Still continue with other initialization
    
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
                "currency": "USD",
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
                "currency": "EUR",
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
                "pricePerTon": 24000,
                "currency": "TRY",
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
                "currency": "USD",
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
                "setupCostCurrency": "USD",
                "printSheetSizes": [
                    {"id": 1, "name": "SRA3", "width": 320, "height": 450, "clickCost": 0.08, "clickCostCurrency": "USD", "duplexSupport": True, "unit": "mm"},
                    {"id": 2, "name": "A3+", "width": 330, "height": 483, "clickCost": 0.09, "clickCostCurrency": "USD", "duplexSupport": True, "unit": "mm"},
                    {"id": 3, "name": "Custom Small", "width": 280, "height": 400, "clickCost": 0.06, "clickCostCurrency": "USD", "duplexSupport": False, "unit": "mm"}
                ]
            },
            {
                "id": 2,
                "name": "Komori L528",
                "setupCost": 42,
                "setupCostCurrency": "EUR",
                "printSheetSizes": [
                    {"id": 4, "name": "SRA3", "width": 320, "height": 450, "clickCost": 0.07, "clickCostCurrency": "EUR", "duplexSupport": True, "unit": "mm"},
                    {"id": 5, "name": "A3", "width": 297, "height": 420, "clickCost": 0.065, "clickCostCurrency": "EUR", "duplexSupport": True, "unit": "mm"},
                    {"id": 6, "name": "Custom Large", "width": 350, "height": 500, "clickCost": 0.085, "clickCostCurrency": "EUR", "duplexSupport": True, "unit": "mm"}
                ]
            },
            {
                "id": 3,
                "name": "Digital Press HP",
                "setupCost": 850,
                "setupCostCurrency": "TRY",
                "printSheetSizes": [
                    {"id": 7, "name": "A3", "width": 297, "height": 420, "clickCost": 4.0, "clickCostCurrency": "TRY", "duplexSupport": True, "unit": "mm"},
                    {"id": 8, "name": "A4", "width": 210, "height": 297, "clickCost": 2.7, "clickCostCurrency": "TRY", "duplexSupport": True, "unit": "mm"},
                    {"id": 9, "name": "Letter", "width": 216, "height": 279, "clickCost": 2.9, "clickCostCurrency": "TRY", "duplexSupport": False, "unit": "mm"}
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
                "setupCost": 15.00,  # Add setup cost
                "setupCostCurrency": "USD",  # Add setup cost currency
                "insideOutsideSame": False,
                "supportsDoubleSided": True,  # Can be applied to one or both sides
                "applyToPrintSheet": False,  # Apply to individual pages
                "bookletApplicationScope": "both",  # Default to both cover and inner
                "variants": [
                    {"id": 1, "variantName": "Standard", "price": 0.15, "currency": "USD"},
                    {"id": 2, "variantName": "Premium", "price": 0.22, "currency": "EUR"}
                ]
            },
            {
                "id": 2, 
                "name": "Staple Binding", 
                "pricingType": "per_booklet", 
                "setupCost": 0.00,  # No setup cost
                "setupCostCurrency": "USD",
                "insideOutsideSame": True,
                "supportsDoubleSided": False,  # Binding applies to whole booklet
                "applyToPrintSheet": False,  # Binding is per booklet, not per sheet
                "bookletApplicationScope": "cover_only",  # Apply only to cover
                "variants": [
                    {"id": 3, "variantName": "2-Staple", "price": 2.50, "currency": "USD"},
                    {"id": 4, "variantName": "3-Staple", "price": 95, "currency": "TRY"}
                ]
            },
            {
                "id": 3, 
                "name": "Spiral Binding", 
                "pricingType": "per_length", 
                "setupCost": 25.00,  # Add setup cost
                "setupCostCurrency": "EUR",  # Different currency
                "insideOutsideSame": True,
                "supportsDoubleSided": False,  # Binding applies to whole booklet
                "applyToPrintSheet": True,  # Use print sheet length for binding calculation
                "bookletApplicationScope": "inner_only",  # Apply only to inner pages
                "variants": [
                    {"id": 5, "variantName": "Plastic Coil", "price": 0.8, "currency": "USD"},  # price per cm
                    {"id": 6, "variantName": "Metal Wire", "price": 1.1, "currency": "EUR"}    # price per cm
                ]
            },
            {
                "id": 4, 
                "name": "Perfect Binding (American)", 
                "pricingType": "per_booklet", 
                "setupCost": 50.00,  # Add setup cost
                "setupCostCurrency": "USD",
                "insideOutsideSame": True,
                "supportsDoubleSided": False,  # Binding applies to whole booklet
                "applyToPrintSheet": False,  # Binding is per booklet, not per sheet
                "bookletApplicationScope": "both",  # Apply to both cover and inner
                "variants": [
                    {"id": 7, "variantName": "Standard", "price": 15.00, "currency": "USD"},
                    {"id": 8, "variantName": "Premium", "price": 620, "currency": "TRY"}
                ]
            },
            {
                "id": 5, 
                "name": "UV Coating", 
                "pricingType": "per_page", 
                "setupCost": 30.00,  # Add setup cost
                "setupCostCurrency": "EUR",
                "insideOutsideSame": False,
                "supportsDoubleSided": True,  # Can be applied to one or both sides
                "applyToPrintSheet": False,  # Apply to individual pages
                "bookletApplicationScope": "cover_only",  # Apply only to cover
                "variants": [
                    {"id": 9, "variantName": "Matte", "price": 0.23, "currency": "EUR"},
                    {"id": 10, "variantName": "Gloss", "price": 8.5, "currency": "TRY"}
                ]
            },
            {
                "id": 6,
                "name": "Print Sheet Processing",
                "pricingType": "per_length",
                "setupCost": 0.00,  # No setup cost
                "setupCostCurrency": "USD",
                "insideOutsideSame": False,
                "supportsDoubleSided": False,  # Applied per print sheet
                "applyToPrintSheet": True,  # Use print sheet dimensions for calculation
                "bookletApplicationScope": "inner_only",  # Apply only to inner pages
                "variants": [
                    {"id": 11, "variantName": "Standard Processing", "price": 0.12, "currency": "USD"},  # price per cm of print sheet edge
                    {"id": 12, "variantName": "Premium Processing", "price": 0.18, "currency": "EUR"}   # price per cm of print sheet edge
                ]
            }
        ]
        
        await db.extras.insert_many(default_extras)
    
    print("✅ Default data initialization completed successfully")

# Initialize default data endpoint
@api_router.post("/initialize-data")
async def initialize_data_endpoint():
    """Endpoint to manually initialize default data"""
    await initialize_default_data()
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

@app.get("/api/exchange-rates")
async def get_exchange_rates():
    """
    Fetch current exchange rates from altinkaynak.com
    Returns rates with EUR as the base currency for consistent conversion
    """
    try:
        # Initialize Altinkaynak client
        altin = Altinkaynak()
        
        # Get exchange rates - these return dict objects with sell/buy rates
        usd_to_try_data = altin.get_rate("USD", "TRY")  
        eur_to_try_data = altin.get_rate("EUR", "TRY")
        
        if usd_to_try_data and eur_to_try_data:
            # Extract the 'sell' rate as the main exchange rate
            usd_to_try = usd_to_try_data.get('sell', usd_to_try_data.get('buy', 0))
            eur_to_try = eur_to_try_data.get('sell', eur_to_try_data.get('buy', 0))
            
            if usd_to_try > 0 and eur_to_try > 0:
                # Calculate conversion rates with EUR as base
                # If 1 EUR = X TRY and 1 USD = Y TRY, then 1 USD = Y/X EUR
                usd_to_eur = usd_to_try / eur_to_try
                try_to_eur = 1 / eur_to_try
                
                exchange_rates = {
                    "base_currency": "EUR",
                    "timestamp": datetime.now().isoformat(),
                    "rates": {
                        "EUR": 1.0,  # Base currency
                        "USD": usd_to_eur,  # 1 USD = X EUR
                        "TRY": try_to_eur   # 1 TRY = X EUR
                    },
                    "source_rates": {
                        "USD_to_TRY": usd_to_try,
                        "EUR_to_TRY": eur_to_try
                    }
                }
                
                return exchange_rates
            else:
                raise ValueError("Invalid rate values received")
        else:
            raise ValueError("No rate data received from API")
            
    except Exception as e:
        print(f"Error fetching exchange rates: {e}")
        # Return fallback rates
        return {
            "base_currency": "EUR",
            "timestamp": datetime.now().isoformat(), 
            "rates": {
                "EUR": 1.0,
                "USD": 0.95,  # Fallback rate
                "TRY": 0.028  # Fallback rate
            },
            "fallback": True,
            "error": str(e)
        }

@app.on_event("startup")
async def startup_event():
    """Initialize default data on application startup"""
    try:
        # Wait a moment for database connection to be fully established
        import asyncio
        await asyncio.sleep(1)
        
        await initialize_default_data()
        print("✅ Default data initialization completed on startup")
    except Exception as e:
        print(f"❌ Error initializing default data on startup: {e}")
        # Try once more after a delay
        try:
            import asyncio
            await asyncio.sleep(3)
            await initialize_default_data()
            print("✅ Default data initialization completed on startup (retry)")
        except Exception as retry_error:
            print(f"❌ Failed to initialize default data after retry: {retry_error}")
            # Log the error but don't crash the application

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
