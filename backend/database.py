from motor.motor_asyncio import AsyncIOMotorClient

MONGO_URL = "mongodb://localhost:27017"

client = AsyncIOMotorClient(MONGO_URL)

db = client["weld_inspector"]

users_collection = db["users"]
jobs_collection = db["jobs"]
scans_collection = db["scans"]
reports_collection = db["reports"]