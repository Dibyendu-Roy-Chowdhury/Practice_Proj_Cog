import os
import random
import uuid
from datetime import datetime, timedelta
import pymongo

MONGO_URI = os.environ.get("MONGO_URI", "mongodb://localhost:27017/veriforgeops")

try:
    from mdm_etl import enrich_telemetry_payload
except ImportError:
    from api.mdm_etl import enrich_telemetry_payload

def seed():
    print(f"Connecting to MongoDB at {MONGO_URI}...")
    try:
        client = pymongo.MongoClient(MONGO_URI, serverSelectionTimeoutMS=5000)
        db_name = MONGO_URI.split("/")[-1].split("?")[0] if "/" in MONGO_URI.split("mongodb://")[-1] else "veriforgeops"
        db = client[db_name]
        collection = db["telemetry_events"]
        
        count = collection.count_documents({})
        if count > 0:
            print(f"Database already contains {count} telemetry events. Skipping seed.")
            return

        print("Seeding database with 500 initial telemetry events...")
        clouds = ["GCP", "AWS", "AZURE"]
        services = ["Vertex AI", "Cloud Translation", "Amazon Translate", "Azure OpenAI", "Amazon Bedrock", "Amazon SageMaker"]
        associates = ["john.doe", "mei.chen", "soham.ganguly", "sarah.k", "mark.t", "rachel.c", "admin"]
        projects = ["cog01k2y024cd8wbctssq11xdjrs6", "cog01k24f1ea555zdv7ynzthxanz5", "cog-aws-703384432149", "cog-az-cb10201881a-veriforge-az"]
        aws_models = ["anthropic.claude-3-5-sonnet", "amazon.titan-embed-text-v1", "amazon.sagemaker-endpoint"]
        azure_models = ["Azure OpenAI (GPT-4o)", "Azure OpenAI (GPT-4 Turbo)", "Azure AI Search"]
        
        events = []
        now = datetime.utcnow()
        for i in range(500):
            # Spread events over the last 30 days
            event_time = now - timedelta(days=random.uniform(0, 30))
            
            if i % 4 == 0:
                cloud = "AZURE"
                proj = "cog-az-cb10201881a-veriforge-az"
                region = "eastus"
                account_id = "a31057e2-5e01-4a71-b667-88145982c04b"
                ad_group = "cb10201881a-veriforge-az"
                service = "Azure OpenAI"
                model_id = random.choice(azure_models)
            elif i % 3 == 0:
                cloud = "AWS"
                proj = "cog-aws-703384432149"
                region = "us-west-2"
                account_id = "703384432149"
                ad_group = "cb9547721a-veriforge-aw"
                service = random.choice(["Amazon Bedrock", "Amazon SageMaker", "Amazon Transcribe", "Amazon Translate"])
                model_id = random.choice(aws_models)
            else:
                cloud = random.choice(clouds)
                proj = random.choice(projects)
                region = "us-east-1" if cloud == "AWS" else ("asia-south1" if cloud == "GCP" else "eastus")
                account_id = "703384432149" if proj == "cog-aws-703384432149" else ("a31057e2-5e01-4a71-b667-88145982c04b" if proj == "cog-az-cb10201881a-veriforge-az" else "851059891287")
                ad_group = "cb9547721a-veriforge-aw" if proj == "cog-aws-703384432149" else ("cb10201881a-veriforge-az" if proj == "cog-az-cb10201881a-veriforge-az" else "default-group")
                service = random.choice(services)
                model_id = None

            raw_payload = {
                "cloud": cloud,
                "service": service,
                "operation": random.choice(["chat", "embedding", "transcribe"]),
                "associate_id": random.choice(associates),
                "cost": round(random.uniform(0.05, 2.50), 5),
                "input_tokens": random.randint(100, 5000),
                "output_tokens": random.randint(10, 1000),
                "source_project": proj,
                "account_id": account_id,
                "ad_group": ad_group,
                "region": region
            }
            if model_id:
                raw_payload["model_id"] = model_id
            
            payload = enrich_telemetry_payload(raw_payload)
            
            events.append({
                "message_id": f"seed-msg-{uuid.uuid4().hex[:8]}",
                "timestamp": event_time.isoformat(),
                "data": payload
            })
            
        collection.insert_many(events)
        print("Successfully inserted 500 mock telemetry events!")
        
    except Exception as e:
        print(f"Failed to seed database: {e}")

if __name__ == "__main__":
    seed()
