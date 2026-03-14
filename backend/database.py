from motor.motor_asyncio import AsyncIOMotorClient
import os

# Use environment variable, fallback to default
MONGO_URL = os.getenv("MONGO_URI", "mongodb://mongo:27017/weld_inspector")

client = AsyncIOMotorClient(MONGO_URL)
db = client.get_default_database()  # This will use "weld_inspector" from the URI

# Collections
users_collection = db["users"]
jobs_collection = db["jobs"]
scans_collection = db["scans"]
reports_collection = db["reports"]