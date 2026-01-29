"""
Seed script to create test user accounts for demo testing.
Creates 10 test accounts with default passwords for QA testing.

Usage:
    python -m app.scripts.seed_users
"""
import sys
from pathlib import Path

# Add parent directory to path for imports
sys.path.append(str(Path(__file__).parent.parent.parent))

from app.core.database import SessionLocal
from app.db.models import User, UserSettings
from app.core.security import get_password_hash
from datetime import datetime


def create_test_users():
    """
    Create 10 test user accounts for demo testing.
    Each user has default settings and password: Test1234
    """
    db = SessionLocal()

    try:
        # Test users data
        test_users = [
            {
                "email": "test1@trendscout.ai",
                "full_name": "Alex Johnson",
                "password": "Test1234"
            },
            {
                "email": "test2@trendscout.ai",
                "full_name": "Sarah Williams",
                "password": "Test1234"
            },
            {
                "email": "test3@trendscout.ai",
                "full_name": "Michael Brown",
                "password": "Test1234"
            },
            {
                "email": "test4@trendscout.ai",
                "full_name": "Emma Davis",
                "password": "Test1234"
            },
            {
                "email": "test5@trendscout.ai",
                "full_name": "James Miller",
                "password": "Test1234"
            },
            {
                "email": "demo@trendscout.ai",
                "full_name": "Demo User",
                "password": "Demo1234"
            },
            {
                "email": "qa1@trendscout.ai",
                "full_name": "QA Tester 1",
                "password": "Test1234"
            },
            {
                "email": "qa2@trendscout.ai",
                "full_name": "QA Tester 2",
                "password": "Test1234"
            },
            {
                "email": "investor@trendscout.ai",
                "full_name": "Investor Demo",
                "password": "Invest1234"
            },
            {
                "email": "admin@trendscout.ai",
                "full_name": "Admin User",
                "password": "Admin1234"
            }
        ]

        created_count = 0
        skipped_count = 0

        print("🌱 Starting seed process...")
        print("-" * 50)

        for user_data in test_users:
            # Check if user already exists
            existing_user = db.query(User).filter(User.email == user_data["email"]).first()

            if existing_user:
                print(f"⏭️  Skipping {user_data['email']} (already exists)")
                skipped_count += 1
                continue

            # Create user
            hashed_password = get_password_hash(user_data["password"])
            new_user = User(
                email=user_data["email"],
                hashed_password=hashed_password,
                full_name=user_data["full_name"],
                is_active=True,
                is_verified=True,  # Pre-verify test accounts
                created_at=datetime.utcnow(),
                last_login_at=None
            )

            db.add(new_user)
            db.flush()  # Get user ID

            # Create default settings
            user_settings = UserSettings(
                user_id=new_user.id,
                dark_mode=False,
                language="en",
                region="US",
                auto_generate_scripts=True,
                notifications_trends=True,
                notifications_competitors=True,
                notifications_new_videos=False,
                notifications_weekly_report=True
            )

            db.add(user_settings)
            db.commit()

            print(f"✅ Created user: {user_data['email']}")
            created_count += 1

        print("-" * 50)
        print(f"🎉 Seed completed!")
        print(f"   Created: {created_count} users")
        print(f"   Skipped: {skipped_count} users (already existed)")
        print()
        print("📝 Test Credentials:")
        print("   Email: test1@trendscout.ai ... test5@trendscout.ai")
        print("   Password: Test1234")
        print()
        print("   Email: demo@trendscout.ai")
        print("   Password: Demo1234")
        print()
        print("   Email: investor@trendscout.ai")
        print("   Password: Invest1234")
        print()
        print("   Email: admin@trendscout.ai")
        print("   Password: Admin1234")

    except Exception as e:
        print(f"❌ Error during seed: {e}")
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    print("🚀 Risko.ai - Test User Seed Script")
    print("=" * 50)
    create_test_users()
