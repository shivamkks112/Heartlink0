"""Preview-only seed for Phase 1 testing (idempotent upserts, never deletes)."""
import asyncio
import os
import uuid
from datetime import datetime, timedelta, timezone

import bcrypt
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

load_dotenv("/app/backend/.env")
PW = "Test@12345"
PHOTO = "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=600"


def base(email, name, gender, looking, **extra):
    now = datetime.now(timezone.utc)
    return {
        "email": email, "name": name, "age": 25, "gender": gender, "looking_for": looking,
        "bio": "Phase 1 test profile for HeartLink", "location": "Delhi, India",
        "interests": ["Music", "Travel"], "photos": [PHOTO], "profile_picture": PHOTO,
        "privacy_settings": {"show_profile": True, "show_photos": True, "incognito_mode": False},
        "blocked_users": [], "muted_users": [], "is_online": True, "last_active": now.isoformat(),
        "created_at": now.isoformat(), "welcome_shown_at": now.isoformat(), "profile_complete": True,
        "is_premium": False, "is_test_seed": True, **extra,
    }


async def upsert(db, doc):
    old = await db.users.find_one({"email": doc["email"]}, {"id": 1})
    uid = old["id"] if old else str(uuid.uuid4())
    doc = {**doc, "id": uid, "password_hash": bcrypt.hashpw(PW.encode(), bcrypt.gensalt()).decode()}
    await db.users.update_one({"email": doc["email"]}, {"$set": doc}, upsert=True)
    return uid


async def main():
    db = AsyncIOMotorClient(os.environ["MONGO_URL"])[os.environ["DB_NAME"]]
    end = (datetime.now(timezone.utc) + timedelta(days=30)).isoformat()
    free = await upsert(db, base("free.male@heartlink.test", "Free Male", "Male", "Female"))
    await upsert(db, base("premium.male@heartlink.test", "Premium Male", "Male", "Female", is_premium=True, premium_end=end))
    girls = [await upsert(db, base(f"girl{i}@heartlink.test", f"Test Girl {i}", "Female", "Male")) for i in range(1, 31)]
    match_girl = girls[0]
    if not await db.matches.find_one({"user1_id": match_girl, "user2_id": free}):
        await db.matches.insert_one({"id": str(uuid.uuid4()), "user1_id": match_girl, "user2_id": free, "user1_liked": True,
                                     "user2_liked": True, "matched": True, "created_at": datetime.now(timezone.utc).isoformat(),
                                     "matched_at": datetime.now(timezone.utc).isoformat()})
    print("free", free, "match_girl", match_girl)


asyncio.run(main())
