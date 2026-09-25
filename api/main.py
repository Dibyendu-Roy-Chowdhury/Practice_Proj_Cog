import json
import os
import random
import uuid
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

from fastapi import FastAPI, HTTPException, Query, Header
from pydantic import BaseModel

# Only import GCP clients if they are used, but we import them here so requirements can be checked.
from google.cloud import pubsub_v1
from google.cloud import logging_v2
from google.cloud.logging_v2.resource import Resource
from google.api_core.exceptions import AlreadyExists

PROJECT_ID = os.environ.get("GOOGLE_CLOUD_PROJECT", "cog01k24f1ea555zdv7ynzthxanz5")
TOPIC_ID = os.environ.get("VERIFORGE_PUBSUB_TOPIC", "veriforgeops-telemetry-ingest")
SUBSCRIPTION_ID = os.environ.get("VERIFORGE_PUBSUB_SUB", "veriforgeops-api-live")
LOG_NAME = os.environ.get("VERIFORGE_LOG_NAME", "veriforgeops-telemetry")

app = FastAPI(title="VeriForge Ops FinOps & Telemetry API")

from fastapi.middleware.cors import CORSMiddleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

try:
    from mdm_etl import enrich_telemetry_payload
except ImportError:
    from api.mdm_etl import enrich_telemetry_payload

import pymongo

MONGO_URI = os.environ.get("MONGO_URI")
db_client = None
db = None
telemetry_collection = None

if MONGO_URI:
    try:
        db_client = pymongo.MongoClient(MONGO_URI, serverSelectionTimeoutMS=5000)
        # Parse database name from URI or default
        db_name = MONGO_URI.split("/")[-1].split("?")[0] if "/" in MONGO_URI.split("mongodb://")[-1] else "veriforgeops"
        db = db_client[db_name]
        telemetry_collection = db["telemetry_events"]
        print(f"Connected to MongoDB database: {db_name}")
    except Exception as e:
        print(f"Failed to connect to MongoDB: {e}")

# --- Fallback In-Memory Event Store ---
_event_store: List[Dict[str, Any]] = []

def _seed_in_memory_events():
    if _event_store:
        return
    clouds = ["GCP", "AWS", "AZURE"]
    services = ["Vertex AI", "Cloud Translation", "Amazon Translate", "Azure OpenAI", "Amazon Bedrock", "Amazon SageMaker"]
    associates = ["john.doe", "mei.chen", "soham.ganguly", "sarah.k", "mark.t", "rachel.c", "admin"]
    projects = ["cog01k2y024cd8wbctssq11xdjrs6", "cog01k24f1ea555zdv7ynzthxanz5", "cog-aws-703384432149", "cog-az-cb10201881a-veriforge-az"]
    aws_models = ["anthropic.claude-3-5-sonnet", "amazon.titan-embed-text-v1", "amazon.sagemaker-endpoint"]
    azure_models = ["Azure OpenAI (GPT-4o)", "Azure OpenAI (GPT-4 Turbo)", "Azure AI Search"]
    now = datetime.utcnow()
    rng = random.Random(42)
    for i in range(500):
        if i % 4 == 0:
            cloud = "AZURE"
            proj = "cog-az-cb10201881a-veriforge-az"
            region = "eastus"
            account_id = "a31057e2-5e01-4a71-b667-88145982c04b"
            ad_group = "cb10201881a-veriforge-az"
            service = "Azure OpenAI"
            model_id = rng.choice(azure_models)
        elif i % 3 == 0:
            cloud = "AWS"
            proj = "cog-aws-703384432149"
            region = "us-west-2"
            account_id = "703384432149"
            ad_group = "cb9547721a-veriforge-aw"
            service = rng.choice(["Amazon Bedrock", "Amazon SageMaker", "Amazon Transcribe", "Amazon Translate"])
            model_id = rng.choice(aws_models)
        else:
            cloud = rng.choice(clouds)
            proj = rng.choice(projects)
            region = "us-east-1" if cloud == "AWS" else ("asia-south1" if cloud == "GCP" else "eastus")
            account_id = "703384432149" if proj == "cog-aws-703384432149" else ("a31057e2-5e01-4a71-b667-88145982c04b" if proj == "cog-az-cb10201881a-veriforge-az" else "851059891287")
            ad_group = "cb9547721a-veriforge-aw" if proj == "cog-aws-703384432149" else ("cb10201881a-veriforge-az" if proj == "cog-az-cb10201881a-veriforge-az" else "default-group")
            service = rng.choice(services)
            model_id = None

        dt = now - timedelta(days=rng.uniform(0, 30))
        event = {
            "cloud": cloud,
            "service": service,
            "operation": rng.choice(["chat", "embedding", "transcribe"]),
            "associate_id": rng.choice(associates),
            "cost": round(rng.uniform(0.05, 2.50), 5),
            "input_tokens": rng.randint(100, 5000),
            "output_tokens": rng.randint(10, 1000),
            "source_project": proj,
            "account_id": account_id,
            "ad_group": ad_group,
            "region": region
        }
        if model_id:
            event["model_id"] = model_id

        _event_store.append({
            "message_id": f"seed-msg-{uuid.uuid4().hex[:8]}",
            "timestamp": dt.isoformat(),
            "data": event
        })

_seed_in_memory_events()

class CanonicalUsageEvent(BaseModel):
    cloud: str
    service: str
    operation: str
    associate_id: str
    cost_centre: Optional[str] = "CC-DEFAULT"
    project_code: Optional[str] = "PROJ-DEFAULT"
    region: Optional[str] = "global"
    cost: float
    latency_ms: Optional[float] = None
    input_tokens: Optional[int] = None
    output_tokens: Optional[int] = None
    cached_tokens: Optional[int] = None
    input_characters: Optional[int] = None
    audio_duration_seconds: Optional[float] = None
    model_type: Optional[str] = None
    model_version: Optional[str] = None

class BedrockAgentDetails(BaseModel):
    bedrock_agent_id: Optional[str] = None
    agent_name: str
    description: Optional[str] = ""
    foundation_model: Optional[str] = "Amazon Bedrock (Claude 3.5 Sonnet)"
    instruction: Optional[str] = ""
    action_groups: Optional[List[str]] = []
    knowledge_bases: Optional[List[str]] = []
    agent_version: Optional[str] = "v1.0.0"
    created_by: Optional[str] = "admin@cognizant.com"

class BedrockAgentWebhookPayload(BaseModel):
    event_type: Optional[str] = "BEDROCK_AGENT_CREATED"
    webhook_token: Optional[str] = None
    token: Optional[str] = None
    aws_account_id: Optional[str] = "703384432149"
    region: Optional[str] = "us-west-2"
    project_id: Optional[str] = "cog-aws-703384432149"
    ad_group: Optional[str] = "cb9547721a-veriforge-aw"
    agent_details: BedrockAgentDetails

class ApprovalDecisionPayload(BaseModel):
    decision_notes: Optional[str] = ""
    decided_by: Optional[str] = "admin"

# 1. Health Endpoint
@app.get("/health")
def health_check():
    return {"status": "ok", "timestamp": datetime.utcnow().isoformat()}

# 2. Ingest Telemetry
@app.post("/telemetry")
def ingest_telemetry(event: CanonicalUsageEvent):
    """
    Writes the telemetry event to Google Cloud Logging. 
    The Log Router sink will then forward it to Pub/Sub.
    """
    try:
        client = logging_v2.Client(project=PROJECT_ID)
        logger = client.logger(LOG_NAME)
        
        data = enrich_telemetry_payload(event.model_dump(exclude_none=True))
        logger.log_struct(
            data,
            resource=Resource(type="audited_resource", labels={"service": "aiplatform.googleapis.com"}),
        )
        return {"status": "success", "message": "Logged to Cloud Logging successfully.", "data": data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to write to Cloud Logging: {str(e)}")

def _ensure_subscription(subscriber: pubsub_v1.SubscriberClient, project_id: str) -> str:
    subscription_path = subscriber.subscription_path(project_id, SUBSCRIPTION_ID)
    topic_path = subscriber.topic_path(project_id, TOPIC_ID)
    try:
        subscriber.create_subscription(request={"name": subscription_path, "topic": topic_path})
    except AlreadyExists:
        pass
    return subscription_path

# 3. Pull & Filter Telemetry
@app.get("/telemetry")
def pull_telemetry(
    max_messages: int = 100,
    cloud: Optional[str] = Query(None),
    associate_id: Optional[str] = Query(None),
    source_project: Optional[str] = Query(None)
):
    """
    Pulls routed telemetry events from Pub/Sub, unwraps the insertId,
    caches them in memory, and returns the filtered events.
    """
    try:
        subscriber = pubsub_v1.SubscriberClient()
        subscription_path = _ensure_subscription(subscriber, PROJECT_ID)
        
        response = subscriber.pull(
            request={
                "subscription": subscription_path,
                "max_messages": max_messages,
                "return_immediately": True,
            }
        )
        received = response.received_messages
        
        ack_ids = []
        for msg in received:
            ack_ids.append(msg.ack_id)
            try:
                payload = json.loads(msg.message.data.decode("utf-8"))
            except Exception:
                payload = {"_raw": msg.message.data.decode("utf-8", errors="replace")}
                
            if isinstance(payload, dict) and "jsonPayload" in payload:
                inner = payload.get("jsonPayload") or {}
                inner["_routed_via_log_router"] = True
                
                if "insertId" in payload:
                    inner["_cloud_logging_insert_id"] = payload["insertId"]
                    
                resource_labels = (payload.get("resource") or {}).get("labels") or {}
                src_proj = resource_labels.get("project_id")
                if src_proj and "source_project" not in inner:
                    inner["source_project"] = src_proj
                payload = inner

            if isinstance(payload, dict):
                payload = enrich_telemetry_payload(payload)

            event_doc = {
                "message_id": msg.message.message_id,
                "timestamp": datetime.utcnow().isoformat(),
                "data": payload
            }
            if telemetry_collection is not None:
                # Upsert to avoid duplicates based on message_id
                telemetry_collection.update_one(
                    {"message_id": event_doc["message_id"]},
                    {"$setOnInsert": event_doc},
                    upsert=True
                )
            else:
                _event_store.insert(0, event_doc)

        if ack_ids:
            subscriber.acknowledge(request={"subscription": subscription_path, "ack_ids": ack_ids})

    except Exception as e:
        print(f"PubSub pull error: {e}")
        pass

    # Apply filters and fetch data
    results = []
    if telemetry_collection is not None:
        query = {}
        if cloud:
            query["data.cloud"] = cloud
        if associate_id:
            query["data.associate_id"] = associate_id
        if source_project:
            query["data.source_project"] = source_project
        cursor = telemetry_collection.find(query).sort("timestamp", -1).limit(500)
        for doc in cursor:
            doc.pop("_id", None)
            results.append(doc)
    else:
        results = _event_store
        if cloud:
            results = [e for e in results if e["data"].get("cloud") == cloud]
        if associate_id:
            results = [e for e in results if e["data"].get("associate_id") == associate_id]
        if source_project:
            results = [e for e in results if e["data"].get("source_project") == source_project]

    return {"status": "success", "total": len(results), "events": results}

# 4. Mock Event Generator
@app.post("/telemetry/mock")
def generate_mock_events(count: int = 1):
    """
    Utility endpoint to auto-generate mock events for testing.
    """
    generated = []
    clouds = ["GCP", "AWS", "AZURE"]
    services = ["Vertex AI", "Cloud Translation", "Amazon Translate", "Azure OpenAI"]
    associates = ["john.doe", "mei.chen", "soham.ganguly"]
    
    for _ in range(count):
        event = {
            "cloud": random.choice(clouds),
            "service": random.choice(services),
            "operation": random.choice(["chat", "embedding", "transcribe"]),
            "associate_id": random.choice(associates),
            "cost": round(random.uniform(0.01, 1.5), 5),
            "input_tokens": random.randint(100, 5000),
            "output_tokens": random.randint(10, 1000),
            "source_project": random.choice(["cog01k2y024cd8wbctssq11xdjrs6", "cog01k24f1ea555zdv7ynzthxanz5"])
        }
        event_doc = {
            "message_id": f"mock-msg-{uuid.uuid4().hex[:8]}",
            "timestamp": datetime.utcnow().isoformat(),
            "data": event
        }
        if telemetry_collection is not None:
            telemetry_collection.insert_one(event_doc)
            event_doc.pop("_id", None)
        else:
            _event_store.insert(0, event_doc)
        generated.append(event)
        
    return {"status": "success", "generated": len(generated), "events": generated}

# 5. Metrics KPIs
@app.get("/api/metrics/kpis")
def get_kpis():
    """
    Returns top-level aggregates (Total ingested cost, total tokens, event count).
    """
    if telemetry_collection is not None:
        pipeline = [
            {"$group": {
                "_id": None,
                "total_events": {"$sum": 1},
                "total_cost": {"$sum": "$data.cost"},
                "total_input_tokens": {"$sum": "$data.input_tokens"},
                "total_output_tokens": {"$sum": "$data.output_tokens"}
            }}
        ]
        result = list(telemetry_collection.aggregate(pipeline))
        if result:
            agg = result[0]
            total_input = agg.get("total_input_tokens", 0)
            total_output = agg.get("total_output_tokens", 0)
            return {
                "total_events": agg.get("total_events", 0),
                "total_cost": round(agg.get("total_cost", 0), 5),
                "total_input_tokens": total_input,
                "total_output_tokens": total_output,
                "total_tokens": total_input + total_output
            }
        else:
            return {
                "total_events": 0, "total_cost": 0.0,
                "total_input_tokens": 0, "total_output_tokens": 0,
                "total_tokens": 0
            }
    else:
        total_cost = sum(e["data"].get("cost", 0) for e in _event_store)
        total_input = sum(e["data"].get("input_tokens", 0) for e in _event_store)
        total_output = sum(e["data"].get("output_tokens", 0) for e in _event_store)
        
        return {
            "total_events": len(_event_store),
            "total_cost": round(total_cost, 5),
            "total_input_tokens": total_input,
            "total_output_tokens": total_output,
            "total_tokens": total_input + total_output
        }

# 6. Metrics Breakdown
@app.get("/api/metrics/breakdown")
def get_breakdown(group_by: str = Query("cloud")):
    """
    Returns cost grouped by a specific field (cloud, service, associate_id, etc.).
    """
    breakdown = {}
    if telemetry_collection is not None:
        pipeline = [
            {"$group": {
                "_id": f"$data.{group_by}",
                "total_cost": {"$sum": "$data.cost"}
            }}
        ]
        result = list(telemetry_collection.aggregate(pipeline))
        for r in result:
            key = r["_id"] if r["_id"] is not None else "Unknown"
            breakdown[key] = round(r["total_cost"], 5)
    else:
        for e in _event_store:
            key = e["data"].get(group_by, "Unknown")
            cost = e["data"].get("cost", 0)
            breakdown[key] = breakdown.get(key, 0) + cost
            
        # Round to 5 decimals
        breakdown = {k: round(v, 5) for k, v in breakdown.items()}
    return {"group_by": group_by, "breakdown": breakdown}

# 6b. Daily Cost Trend Endpoint
@app.get("/api/metrics/daily-cost")
def get_daily_cost_metrics(agentId: Optional[str] = Query(None)):
    """
    Returns 30 days of daily cost (USD) and token usage aggregated from telemetry events.
    """
    from datetime import timedelta
    now = datetime.utcnow()
    date_map = {}
    date_keys = []
    for i in range(29, -1, -1):
        d = now - timedelta(days=i)
        fmt_date = f"{d.strftime('%b')} {d.day}"
        date_keys.append((d.strftime("%Y-%m-%d"), fmt_date))
        date_map[fmt_date] = {"date": fmt_date, "cost": 0.0, "tokens": 0}

    if telemetry_collection is not None:
        thirty_days_ago = (now - timedelta(days=30)).isoformat()
        cursor = telemetry_collection.find({"timestamp": {"$gte": thirty_days_ago}})
        for doc in cursor:
            ts_str = doc.get("timestamp", "")
            try:
                dt = datetime.fromisoformat(ts_str)
                fmt_date = f"{dt.strftime('%b')} {dt.day}"
                data = doc.get("data", {})
                cost = float(data.get("cost", 0.0))
                tokens = int(data.get("input_tokens", 0)) + int(data.get("output_tokens", 0))
                if fmt_date in date_map:
                    date_map[fmt_date]["cost"] += cost
                    date_map[fmt_date]["tokens"] += tokens
            except Exception:
                pass
    else:
        for e in _event_store:
            ts_str = e.get("timestamp", "")
            try:
                dt = datetime.fromisoformat(ts_str)
                fmt_date = f"{dt.strftime('%b')} {dt.day}"
                data = e.get("data", {})
                cost = float(data.get("cost", 0.0))
                tokens = int(data.get("input_tokens", 0)) + int(data.get("output_tokens", 0))
                if fmt_date in date_map:
                    date_map[fmt_date]["cost"] += cost
                    date_map[fmt_date]["tokens"] += tokens
            except Exception:
                pass

    rows = []
    for ymd, fmt_date in date_keys:
        item = date_map[fmt_date]
        rows.append({
            "date": fmt_date,
            "cost": round(item["cost"], 2),
            "tokens": item["tokens"]
        })

    return {"status": "success", "agentId": agentId or "all", "data": rows}

# 6c. Model Usage Breakdown Endpoint
@app.get("/api/metrics/model-breakdown")
def get_model_breakdown_metric(agentId: Optional[str] = Query(None)):
    """
    Returns tokens, requests, and cost aggregated by AI model/service.
    """
    model_map = {}

    if telemetry_collection is not None:
        pipeline = [
            {"$group": {
                "_id": "$data.service",
                "tokens": {"$sum": {"$add": ["$data.input_tokens", "$data.output_tokens"]}},
                "requests": {"$sum": 1},
                "cost_usd": {"$sum": "$data.cost"}
            }}
        ]
        results = list(telemetry_collection.aggregate(pipeline))
        for r in results:
            model_name = r["_id"] if r["_id"] else "Vertex AI (Gemini Pro)"
            model_map[model_name] = {
                "model": model_name,
                "tokens": r["tokens"] or 0,
                "requests": r["requests"] or 0,
                "cost_usd": round(r["cost_usd"] or 0.0, 2)
            }
    else:
        for e in _event_store:
            data = e.get("data", {})
            model_name = data.get("service") or "Vertex AI (Gemini Pro)"
            tokens = int(data.get("input_tokens", 0)) + int(data.get("output_tokens", 0))
            cost = float(data.get("cost", 0.0))
            if model_name not in model_map:
                model_map[model_name] = {"model": model_name, "tokens": 0, "requests": 0, "cost_usd": 0.0}
            model_map[model_name]["tokens"] += tokens
            model_map[model_name]["requests"] += 1
            model_map[model_name]["cost_usd"] += cost

    if not model_map:
        models_list = [
            {"model": "Vertex AI (Gemini Pro)", "tokens": 650000, "requests": 1850, "cost_usd": 450.2},
            {"model": "Azure OpenAI (GPT-4)", "tokens": 420000, "requests": 920, "cost_usd": 680.5},
            {"model": "Cloud Translation", "tokens": 180000, "requests": 3400, "cost_usd": 35.0},
            {"model": "Amazon Translate", "tokens": 95000, "requests": 1100, "cost_usd": 18.5}
        ]
    else:
        models_list = list(model_map.values())
        for m in models_list:
            m["cost_usd"] = round(m["cost_usd"], 2)

    return {"status": "success", "agentId": agentId or "all", "models": models_list, "breakdown": models_list}


# 7. Multi-Project Hub Configuration
@app.get("/api/projects")
def get_projects():
    """
    Returns the list of configured producer projects, central topics, and IAM sink statuses.
    """
    producers = {
        "cog01k24f1ea555zdv7ynzthxanz5": {
            "name": "Central (Self)",
            "role": "owner",
            "status": "active"
        },
        "cog01k2y024cd8wbctssq11xdjrs6": {
            "name": "AI/ML Guild Project",
            "sink_name": "veriforgeops-crossproject-sink",
            "log_name": "veriforgeops-crossproject",
            "writer_identity": "serviceAccount:service-851059891287@gcp-sa-logging.iam.gserviceaccount.com",
            "role": "roles/pubsub.publisher",
            "iam_version": 3,
            "status": "active",
        },
        "cog-aws-703384432149": {
            "name": "AWS Spoke (703384432149)",
            "account_id": "703384432149",
            "ad_group": "cb9547721a-veriforge-aw",
            "home_region": "us-west-2",
            "role": "spoke",
            "cloud": "AWS",
            "status": "active"
        },
        "cog-az-cb10201881a-veriforge-az": {
            "name": "Azure Spoke (cb10201881a-veriforge-az)",
            "subscription_id": "a31057e2-5e01-4a71-b667-88145982c04b",
            "tenant": "cognizantonline.onmicrosoft.com",
            "ad_group": "cb10201881a-veriforge-az",
            "home_region": "eastus",
            "role": "spoke",
            "cloud": "AZURE",
            "status": "active"
        }
    }
    return {"projects": producers}

CRITICAL_ALERTS = [
    {
        "id": "alert-crit-001",
        "agentId": "agent-001",
        "agentName": "Claims Processing Agent",
        "message": "p95 Latency spike detected (4.8s > 3.0s SLA bound)",
        "severity": "P1",
        "timestamp": datetime.utcnow().isoformat()
    },
    {
        "id": "alert-crit-002",
        "agentId": "agent-003",
        "agentName": "Policy Summarizer",
        "message": "High Guardrail Block rate (12.4% over 5m window)",
        "severity": "P1",
        "timestamp": datetime.utcnow().isoformat()
    }
]

WARNING_ALERTS = [
    {
        "id": "alert-warn-001",
        "agentId": "agent-002",
        "agentName": "Underwriting Assistant",
        "message": "Token budget usage reached 85% of daily quota",
        "severity": "P2",
        "timestamp": datetime.utcnow().isoformat()
    },
    {
        "id": "alert-warn-002",
        "agentId": "agent-005",
        "agentName": "Fraud Detection Agent",
        "message": "Minor embedding drift detected (+0.04 cosine dist)",
        "severity": "P2",
        "timestamp": datetime.utcnow().isoformat()
    },
    {
        "id": "alert-warn-003",
        "agentId": "agent-004",
        "agentName": "Customer Support Bot",
        "message": "Upstream Cloud Translation API latency degradation (1.2s)",
        "severity": "P2",
        "timestamp": datetime.utcnow().isoformat()
    }
]

# 8. MLOps / Frontend Compatibility Endpoints
@app.get("/api/alerts/critical")
def get_critical_alerts(agentId: Optional[str] = Query(None)):
    alerts = CRITICAL_ALERTS
    if agentId and agentId != "all":
        alerts = [a for a in alerts if a["agentId"] == agentId]
    return {"status": "success", "alerts": alerts}

@app.get("/api/alerts/warnings")
def get_warning_alerts(agentId: Optional[str] = Query(None)):
    alerts = WARNING_ALERTS
    if agentId and agentId != "all":
        alerts = [a for a in alerts if a["agentId"] == agentId]
    return {"status": "success", "alerts": alerts}

@app.get("/api/xops/anomalies")
def get_xops_anomalies():
    anomalies = [
        {
            "id": "EVT-2040",
            "agent": "Claims Processing Agent",
            "timestamp": "30 sec ago",
            "category": "Quality Regression",
            "action": "HITL Escalated",
            "severity": "Critical",
            "description": "Validation accuracy dropped below 80% threshold."
        },
        {
            "id": "EVT-2039",
            "agent": "Underwriting Assistant",
            "timestamp": "15m ago",
            "category": "Token Spike",
            "action": "Auto-Remediated",
            "severity": "High",
            "description": "Sudden 300% increase in prompt token consumption."
        },
        {
            "id": "EVT-2038",
            "agent": "Policy Summarizer",
            "timestamp": "30m ago",
            "category": "Embedding Drift",
            "action": "Under Observation",
            "severity": "Medium",
            "description": "Semantic drift detected in vector store queries (+0.08)."
        },
        {
            "id": "EVT-2037",
            "agent": "Customer Support Bot",
            "timestamp": "45m ago",
            "category": "RAG Retrieval Failure",
            "action": "No Action",
            "severity": "Low",
            "description": "Zero chunks retrieved for query on product exclusions."
        }
    ]
    return {"status": "success", "anomalies": anomalies}

@app.get("/api/hitl/queue")
def get_hitl_queue():
    queue = [
        {
            "id": "AUTH-F-001",
            "risk": "High",
            "agent": "Claims Processing Agent",
            "tool": "approve_claim_payout",
            "waitMs": 180000,
            "reasoning": "Claim payout of $14,250 exceeds the automated threshold ($10,000). Requires manual authorization by an L2 operator."
        },
        {
            "id": "AUTH-F-002",
            "risk": "Critical",
            "agent": "Underwriting Assistant",
            "tool": "override_policy_exclusion",
            "waitMs": 90000,
            "reasoning": "Policy exclusion override requested for pre-existing condition clause. Risk score 0.88."
        },
        {
            "id": "AUTH-F-003",
            "risk": "Medium",
            "agent": "Policy Summarizer",
            "tool": "publish_external_summary",
            "waitMs": 420000,
            "reasoning": "Summary generated from unverified external PDF attachment. Verification score 0.76."
        }
    ]
    return {"status": "success", "queue": queue}

@app.get("/api/hitl/history")
def get_hitl_history():
    history = [
        {"time": "10:15 today", "agent": "Claims Processing Agent", "tool": "submit_primary_report", "decision": "Approved", "by": "Sarah K. (L2)", "cost": 0.012},
        {"time": "09:40 today", "agent": "Underwriting Assistant", "tool": "execute_account_action", "decision": "Rejected", "by": "Mark T. (L3)", "cost": 0.008},
        {"time": "08:12 today", "agent": "Policy Summarizer", "tool": "publish_analysis_report", "decision": "Approved", "by": "Sarah K. (L2)", "cost": 0.015},
        {"time": "Yesterday", "agent": "Customer Support Bot", "tool": "generate_audit_report", "decision": "Approved", "by": "Auto (L1)", "cost": 0.005},
        {"time": "Yesterday", "agent": "Fraud Detection Agent", "tool": "submit_compliance_report", "decision": "Approved", "by": "Rachel C. (L3)", "cost": 0.021}
    ]
    return {"status": "success", "history": history}

@app.get("/api/healing/rules")
def get_healing_rules():
    rules = [
        {"id": "SH-001", "name": "OOM Auto-Restart", "condition": "pod_memory_usage > 95%", "action": "Trigger graceful restart and flush transient session state", "severity": "P1", "triggered": 3, "enabled": True},
        {"id": "SH-002", "name": "ReAct Loop Circuit Break", "condition": "consecutive_tool_failures >= 4", "action": "Break agent loop, open HITL approval item, escalate to L2", "severity": "P1", "triggered": 1, "enabled": True},
        {"id": "SH-003", "name": "Token Budget Hard Stop", "condition": "daily_tokens >= 0.95 cap", "action": "Suspend agent and notify FinOps via Slack alert", "severity": "P2", "triggered": 5, "enabled": True},
        {"id": "SH-004", "name": "Latency SLA Fallback", "condition": "p95_latency > 5000ms", "action": "Reroute to backup light model (Haiku / Flash)", "severity": "P2", "triggered": 8, "enabled": True},
        {"id": "SH-005", "name": "Hallucination Guard", "condition": "hallucination_rate > 0.25", "action": "Flag response, log trace, and request human review", "severity": "P2", "triggered": 2, "enabled": True},
        {"id": "SH-006", "name": "Tool Failure Retry", "condition": "tool_error_rate > 10%", "action": "Retry with exponential backoff (max 3 attempts)", "severity": "P3", "triggered": 12, "enabled": True}
    ]
    return {"status": "success", "rules": rules}

@app.get("/api/healing/interventions")
def get_healing_interventions():
    interventions = [
        {"id": "INT-0092", "rule": "Initial Warm-Up Guard", "agent": "Claims Processing Agent", "action": "Initial API rate limit backoff during first episode run. Auto-resolved after 8s — healthy.", "timestamp": (datetime.utcnow()).isoformat(), "overridden": False},
        {"id": "INT-0091", "rule": "ReAct Loop Circuit Break", "agent": "Underwriting Assistant", "action": "Loop terminated — iteration count: 4. HITL queue entry created.", "timestamp": (datetime.utcnow()).isoformat(), "overridden": False},
        {"id": "INT-0090", "rule": "OOM Auto-Restart", "agent": "Underwriting Assistant", "action": "Container restarted. Memory flushed. Post-restart health: 98%.", "timestamp": (datetime.utcnow()).isoformat(), "overridden": False},
        {"id": "INT-0089", "rule": "Latency SLA Fallback", "agent": "Policy Summarizer", "action": "Rerouted to claude-3-5-haiku (Bedrock). Latency p95 restored to 1.8s.", "timestamp": (datetime.utcnow()).isoformat(), "overridden": True},
        {"id": "INT-0088", "rule": "Token Budget Hard Stop", "agent": "Customer Support Bot", "action": "Agent suspended at 96% daily limit. FinOps Slack notification sent.", "timestamp": (datetime.utcnow()).isoformat(), "overridden": False}
    ]
    return {"status": "success", "interventions": interventions}

# 6d. Performance KPIs Endpoint
@app.get("/api/metrics/performance")
def get_performance_metrics_endpoint(agentId: Optional[str] = Query(None)):
    """
    Returns p95 latency, success rate, health score, and active agents count.
    """
    latencies = []
    if telemetry_collection is not None:
        cursor = telemetry_collection.find({}, {"data.latency_ms": 1}).limit(500)
        for doc in cursor:
            l = doc.get("data", {}).get("latency_ms")
            if l:
                latencies.append(float(l) / 1000.0)

    if latencies:
        latencies.sort()
        p95 = round(latencies[int(len(latencies) * 0.95)], 1)
    else:
        p95 = 3.1

    crits = CRITICAL_ALERTS
    warns = WARNING_ALERTS
    if agentId and agentId != "all":
        crits = [a for a in crits if a["agentId"] == agentId]
        warns = [a for a in warns if a["agentId"] == agentId]

    health_score = max(50, 100 - (len(crits) * 6) - (len(warns) * 2))
    success_rate = round(100.0 - (len(crits) * 1.4), 1)

    agents = [
        "Claims Processing Agent",
        "Underwriting Assistant",
        "Policy Summarizer",
        "Customer Support Bot",
        "Fraud Detection Agent"
    ]
    dates = ["W-4", "W-3", "W-2", "W-1", "W0", "W+1", "W+2"]
    
    latency_data = [
        {
            "date": d,
            "Claims Processing Agent": round(2.1 + (i * 0.1), 1),
            "Underwriting Assistant": round(3.4 - (i * 0.1), 1),
            "Policy Summarizer": round(1.8 + (i * 0.05), 1),
            "Customer Support Bot": round(4.2 + (0.5 if i == 5 else -i * 0.1), 1),
            "Fraud Detection Agent": round(2.5 + (i * 0.08), 1)
        }
        for i, d in enumerate(dates)
    ]
    
    throughput_data = [
        {
            "date": d,
            "Claims Processing Agent": 600 + i * 20,
            "Underwriting Assistant": 420 + i * 15,
            "Policy Summarizer": 310 + i * 10,
            "Customer Support Bot": 180 + i * 8,
            "Fraud Detection Agent": 250 + i * 12
        }
        for i, d in enumerate(dates)
    ]
    
    error_data = [
        {"category": "Tool Timeout", "rate": 0.8},
        {"category": "Guardrail Block", "rate": 1.4},
        {"category": "Model Error", "rate": 0.3},
        {"category": "Rate Limit", "rate": 0.4},
        {"category": "Context Overflow", "rate": 0.5}
    ]

    return {
        "status": "success",
        "agentId": agentId or "all",
        "agentNames": agents,
        "latencyData": latency_data,
        "throughputData": throughput_data,
        "errorData": error_data,
        "kpis": {
            "p95Latency": p95,
            "successRate": success_rate,
            "healthScore": health_score,
            "activeAgents": 5
        }
    }

# 6e. Trajectory Score Endpoint
@app.get("/api/metrics/trajectory")
def get_trajectory_score_endpoint(agentId: Optional[str] = Query(None)):
    """
    Returns 8 evaluation dimension scores for Fleet Health Score & Trajectory.
    """
    dimensions = [
        {"dim": "Model Reliability", "score": 86, "desc": "Fleet composite reliability baseline."},
        {"dim": "Cost Efficiency", "score": 91, "desc": "Token efficiency and waste reduction."},
        {"dim": "Safety & Guardrails", "score": 72, "desc": "Guardrails enforcement and alert count."},
        {"dim": "Latency SLA", "score": 80, "desc": "p95 latency within SLA bounds."},
        {"dim": "Guardrail Coverage", "score": 78, "desc": "Interceptor coverage across active agents."},
        {"dim": "HITL Responsiveness", "score": 75, "desc": "Human-in-the-loop queue turnaround within SLA."},
        {"dim": "Embedding Quality", "score": 86, "desc": "Embedding coherence within drift threshold."},
        {"dim": "Fleet Availability", "score": 84, "desc": "5 of 5 agents active."}
    ]
    return {"status": "success", "agentId": agentId or "all", "dimensions": dimensions}

# --- Bedrock Agent Approval Queue & Dynamic Agent Registry ---
_dynamic_agents: List[Dict[str, Any]] = []

_agent_approval_queue: List[Dict[str, Any]] = [
    {
        "id": "REQ-BR-70338-001",
        "event_type": "BEDROCK_AGENT_CREATED",
        "created_at": datetime.utcnow().isoformat(),
        "aws_account_id": "703384432149",
        "region": "us-west-2",
        "project_id": "cog-aws-703384432149",
        "ad_group": "cb9547721a-veriforge-aw",
        "cloud_provider": "AWS",
        "status": "PENDING_APPROVAL",
        "compliance_score": 94.5,
        "risk_level": "Low",
        "agent_details": {
            "bedrock_agent_id": "AGENT-BR-9901",
            "agent_name": "Bedrock Claims Underwriting Assistant",
            "description": "Amazon Bedrock AgentCore automated policy underwriter and claims validation agent",
            "foundation_model": "Amazon Bedrock (Claude 3.5 Sonnet)",
            "instruction": "Analyze applicant risk profiles and claims history against underwriting policy guidelines...",
            "action_groups": ["VerifyMemberEligibility", "CalculateCoveragePayout"],
            "knowledge_bases": ["KB-POLICY-TERMS-2026"],
            "agent_version": "v1.0.0",
            "created_by": "ankit.sikka@cognizant.com"
        }
    },
    {
        "id": "REQ-BR-70338-002",
        "event_type": "BEDROCK_AGENT_CREATED",
        "created_at": datetime.utcnow().isoformat(),
        "aws_account_id": "703384432149",
        "region": "us-west-2",
        "project_id": "cog-aws-703384432149",
        "ad_group": "cb9547721a-veriforge-aw",
        "cloud_provider": "AWS",
        "status": "PENDING_APPROVAL",
        "compliance_score": 88.0,
        "risk_level": "Medium",
        "agent_details": {
            "bedrock_agent_id": "AGENT-BR-9902",
            "agent_name": "Bedrock Customer Support Concierge",
            "description": "Multi-turn autonomous customer support bot running on Amazon Bedrock AgentCore",
            "foundation_model": "Amazon Bedrock (Titan Express)",
            "instruction": "Handle member policy queries, billing questions, and triage claims requests.",
            "action_groups": ["QueryBillingDB", "EscalateToHITL"],
            "knowledge_bases": ["KB-CUSTOMER-FAQ-2026"],
            "agent_version": "v1.0.0",
            "created_by": "bhuvaneswari.poka@cognizant.com"
        }
    }
]

_agent_approval_history: List[Dict[str, Any]] = [
    {
        "id": "REQ-BR-70338-000",
        "agent_name": "AWS Spoke Bedrock Router Agent",
        "bedrock_agent_id": "AGENT-BR-9900",
        "project_id": "cog-aws-703384432149",
        "cloud_provider": "AWS",
        "decision": "APPROVED",
        "decided_by": "admin",
        "decided_at": datetime.utcnow().isoformat(),
        "notes": "Verified guardrail rules and IAM least privilege policies in us-west-2."
    }
]

@app.get("/api/agents")
def get_agents():
    base_agents = [
        {
            "id": "agent-001",
            "name": "Claims Processing Agent",
            "description": "Automates medical and property claims validation & fraud checks",
            "status": "Active",
            "version": "1.2.0",
            "version_string": "v1.2.0",
            "cloud_provider": "AWS",
            "model_id": "Vertex AI (Gemini Pro)",
            "circuit_breaker": "Half-Open"
        },
        {
            "id": "agent-002",
            "name": "Underwriting Assistant",
            "description": "Analyzes applicant risk profiles and generates policy quotes",
            "status": "Active",
            "version": "2.0.1",
            "version_string": "v2.0.1",
            "cloud_provider": "Azure",
            "model_id": "Azure OpenAI (GPT-4)",
            "circuit_breaker": "Closed"
        },
        {
            "id": "agent-003",
            "name": "Policy Summarizer",
            "description": "Extracts key coverage terms and exclusions from policy PDFs",
            "status": "Active",
            "version": "1.0.4",
            "version_string": "v1.0.4",
            "cloud_provider": "GCP",
            "model_id": "Vertex AI (Gemini Flash)",
            "circuit_breaker": "Closed"
        },
        {
            "id": "agent-004",
            "name": "Customer Support Bot",
            "description": "Multi-lingual automated assistant for member inquiries",
            "status": "Active",
            "version": "3.1.0",
            "version_string": "v3.1.0",
            "cloud_provider": "AWS",
            "model_id": "Cloud Translation",
            "circuit_breaker": "Closed"
        },
        {
            "id": "agent-005",
            "name": "Fraud Detection Agent",
            "description": "Real-time anomaly detection on billing claims transactions",
            "status": "Active",
            "version": "1.1.2",
            "version_string": "v1.1.2",
            "cloud_provider": "Azure",
            "model_id": "Amazon Translate",
            "circuit_breaker": "Half-Open"
        },
        {
            "id": "agent-006",
            "name": "AWS Spoke Bedrock Router Agent",
            "description": "Orchestrates Bedrock LLM routing & cost controls for AWS Account 703384432149 (us-west-2)",
            "status": "Active",
            "version": "1.0.0",
            "version_string": "v1.0.0",
            "cloud_provider": "AWS",
            "project_id": "cog-aws-703384432149",
            "account_id": "703384432149",
            "region": "us-west-2",
            "model_id": "Amazon Bedrock (Claude 3.5 Sonnet)",
            "circuit_breaker": "Closed"
        },
        {
            "id": "agent-007",
            "name": "Azure OpenAI Enterprise Router Agent",
            "description": "Orchestrates Azure OpenAI GPT-4o deployments & compliance for Project cb10201881a-veriforge-az (eastus)",
            "status": "Active",
            "version": "1.0.0",
            "version_string": "v1.0.0",
            "cloud_provider": "Azure",
            "project_id": "cog-az-cb10201881a-veriforge-az",
            "subscription_id": "a31057e2-5e01-4a71-b667-88145982c04b",
            "tenant": "cognizantonline.onmicrosoft.com",
            "region": "eastus",
            "model_id": "Azure OpenAI (GPT-4o)",
            "circuit_breaker": "Closed"
        }
    ]
    all_agents = base_agents + _dynamic_agents
    return {"status": "success", "agents": all_agents}


@app.get("/api/agents/approval-queue")
def get_agent_approval_queue():
    """
    Returns all pending and processed agent approval requests for the Admin portal.
    """
    pending = [q for q in _agent_approval_queue if q.get("status") == "PENDING_APPROVAL"]
    return {
        "status": "success",
        "queue": _agent_approval_queue,
        "pending_count": len(pending),
        "total_requests": len(_agent_approval_queue)
    }


@app.post("/api/agents/approval-queue/{request_id}/approve")
def approve_agent_request(request_id: str, payload: Optional[ApprovalDecisionPayload] = None):
    """
    Approves a pending Bedrock/Multi-Cloud agent, enrolling it in the active Agent Registry.
    """
    target = next((q for q in _agent_approval_queue if q.get("id") == request_id), None)
    if not target:
        raise HTTPException(status_code=404, detail=f"Approval request '{request_id}' not found")
    
    target["status"] = "APPROVED"
    target["approved_at"] = datetime.utcnow().isoformat()
    decided_by = payload.decided_by if payload and payload.decided_by else "admin"
    decision_notes = payload.decision_notes if payload and payload.decision_notes else "Approved by Admin via VeriForge Ops Portal"
    target["decided_by"] = decided_by
    target["decision_notes"] = decision_notes

    details = target.get("agent_details", {})
    agent_id = f"agent-br-{uuid.uuid4().hex[:6]}"
    raw_ver = str(details.get("agent_version") or target.get("target_version") or "1.0.0")
    ver_str = f"v{raw_ver}" if not raw_ver.startswith("v") else raw_ver

    existing_agent = next(
        (a for a in _dynamic_agents if a.get("bedrock_agent_id") == details.get("bedrock_agent_id") or a.get("name") == details.get("agent_name")),
        None
    )
    if existing_agent:
        existing_agent["version"] = raw_ver
        existing_agent["version_string"] = ver_str
        existing_agent["description"] = details.get("description", existing_agent.get("description"))
        existing_agent["model_id"] = details.get("foundation_model", existing_agent.get("model_id"))
        existing_agent["status"] = "Active"
        existing_agent["approved_by"] = decided_by
        existing_agent["updated_at"] = datetime.utcnow().isoformat()
        final_agent = existing_agent
    else:
        new_agent = {
            "id": agent_id,
            "name": details.get("agent_name", "Bedrock Agent"),
            "description": details.get("description", "Amazon Bedrock Approved Agent"),
            "status": "Active",
            "version": raw_ver,
            "version_string": ver_str,
            "cloud_provider": target.get("cloud_provider", "AWS"),
            "project_id": target.get("project_id", "cog-aws-703384432149"),
            "account_id": target.get("aws_account_id", "703384432149"),
            "region": target.get("region", "us-west-2"),
            "model_id": details.get("foundation_model", "Amazon Bedrock (Claude 3.5 Sonnet)"),
            "circuit_breaker": "Closed",
            "bedrock_agent_id": details.get("bedrock_agent_id"),
            "approved_by": decided_by
        }
        _dynamic_agents.append(new_agent)
        final_agent = new_agent

    _agent_approval_history.insert(0, {
        "id": request_id,
        "agent_name": details.get("agent_name"),
        "bedrock_agent_id": details.get("bedrock_agent_id"),
        "project_id": target.get("project_id"),
        "cloud_provider": target.get("cloud_provider", "AWS"),
        "decision": "APPROVED",
        "decided_by": decided_by,
        "decided_at": datetime.utcnow().isoformat(),
        "notes": decision_notes
    })

    return {
        "status": "success",
        "message": f"Agent '{final_agent['name']}' has been approved and enrolled in the active fleet.",
        "agent": final_agent,
        "request": target
    }


@app.post("/api/agents/approval-queue/{request_id}/reject")
def reject_agent_request(request_id: str, payload: Optional[ApprovalDecisionPayload] = None):
    """
    Rejects a pending agent onboarding request, archiving it in quarantine/audit history.
    """
    target = next((q for q in _agent_approval_queue if q.get("id") == request_id), None)
    if not target:
        raise HTTPException(status_code=404, detail=f"Approval request '{request_id}' not found")
    
    target["status"] = "REJECTED"
    target["rejected_at"] = datetime.utcnow().isoformat()
    decided_by = payload.decided_by if payload and payload.decided_by else "admin"
    decision_notes = payload.decision_notes if payload and payload.decision_notes else "Rejected by Admin"
    target["decided_by"] = decided_by
    target["decision_notes"] = decision_notes

    details = target.get("agent_details", {})
    _agent_approval_history.insert(0, {
        "id": request_id,
        "agent_name": details.get("agent_name"),
        "bedrock_agent_id": details.get("bedrock_agent_id"),
        "project_id": target.get("project_id"),
        "cloud_provider": target.get("cloud_provider", "AWS"),
        "decision": "REJECTED",
        "decided_by": decided_by,
        "decided_at": datetime.utcnow().isoformat(),
        "notes": decision_notes
    })

    return {
        "status": "success",
        "message": f"Agent request '{request_id}' has been rejected.",
        "request": target
    }


@app.get("/api/agents/approval-queue/history")
def get_agent_approval_history():
    """
    Returns the audit trail of past agent approval decisions.
    """
    return {"status": "success", "history": _agent_approval_history}


APPROVAL_VERSION_THRESHOLD = int(os.environ.get("APPROVAL_VERSION_THRESHOLD", "30"))

def _extract_version_number(version_str: Optional[str]) -> int:
    """
    Extracts the integer version from version strings like '1', '2', '16', '29', '30', 'v30', '1.0.0', 'DRAFT'.
    Defaults to 1 if not parseable or DRAFT.
    """
    if not version_str or str(version_str).strip().upper() == "DRAFT":
        return 1
    clean = str(version_str).strip().lstrip("vV")
    major = clean.split(".")[0]
    try:
        return int(major)
    except ValueError:
        return 1


@app.post("/api/webhooks/bedrock/agent-created")
def receive_bedrock_agent_webhook(
    payload: BedrockAgentWebhookPayload,
    x_webhook_token: Optional[str] = Header(None, alias="X-Webhook-Token"),
    x_veriforge_token: Optional[str] = Header(None, alias="X-VeriForge-Token"),
    authorization: Optional[str] = Header(None, alias="Authorization"),
    query_token: Optional[str] = Query(None, alias="token"),
    query_webhook_token: Optional[str] = Query(None, alias="webhook_token")
):
    """
    Webhook endpoint receiving Bedrock AgentCore creation/update events from AWS EventBridge/Lambda or external callers.
    - Versions up to 29 (excluding v1): In-place update, bypasses HITL approval queue.
    - Version 1 OR Version >= 30: Tracked for HITL Admin Approval (PENDING_APPROVAL).
    """
    auth_bearer = None
    if isinstance(authorization, str) and authorization.startswith("Bearer "):
        auth_bearer = authorization.split("Bearer ", 1)[1].strip()

    def _val(t):
        return t if isinstance(t, str) and t else None

    received_token = (
        _val(x_webhook_token)
        or _val(x_veriforge_token)
        or auth_bearer
        or _val(query_webhook_token)
        or _val(query_token)
        or _val(payload.webhook_token)
        or _val(payload.token)
    )

    # Optional strict validation when configured in environment
    expected_token = os.environ.get("WEBHOOK_AUTH_TOKEN")
    if expected_token and received_token != expected_token:
        raise HTTPException(
            status_code=401,
            detail="Unauthorized: Invalid or missing webhook acceptance token"
        )

    agent_details = payload.agent_details
    raw_version = str(agent_details.agent_version or "1").strip()
    version_num = _extract_version_number(raw_version)
    formatted_version = f"{version_num}.0.0" if "." not in raw_version else raw_version
    formatted_version_string = f"v{raw_version}" if not raw_version.startswith("v") else raw_version

    bedrock_id = agent_details.bedrock_agent_id or f"AGENT-BR-{uuid.uuid4().hex[:6]}"
    agent_name = agent_details.agent_name

    # Path A: Versions up to 29 (2 <= version_num < 30):
    # Keep same as now -> in-place update, bypass HITL queue
    if 1 < version_num < APPROVAL_VERSION_THRESHOLD:
        # Update existing agent in _dynamic_agents if present, or register active entry
        existing_agent = next(
            (a for a in _dynamic_agents if a.get("bedrock_agent_id") == bedrock_id or a.get("name") == agent_name),
            None
        )
        if existing_agent:
            existing_agent["version"] = formatted_version
            existing_agent["version_string"] = formatted_version_string
            existing_agent["description"] = agent_details.description or existing_agent.get("description")
            existing_agent["model_id"] = agent_details.foundation_model or existing_agent.get("model_id")
            existing_agent["instruction"] = agent_details.instruction
            existing_agent["action_groups"] = agent_details.action_groups
            existing_agent["knowledge_bases"] = agent_details.knowledge_bases
            existing_agent["updated_at"] = datetime.utcnow().isoformat()
            target_agent = existing_agent
        else:
            # Auto-enroll directly into active fleet as already approved agent
            new_active_agent = {
                "id": f"agent-br-{uuid.uuid4().hex[:6]}",
                "name": agent_name,
                "description": agent_details.description or "Amazon Bedrock Approved Agent",
                "status": "Active",
                "version": formatted_version,
                "version_string": formatted_version_string,
                "cloud_provider": "AWS",
                "project_id": payload.project_id or "cog-aws-703384432149",
                "account_id": payload.aws_account_id or "703384432149",
                "region": payload.region or "us-west-2",
                "model_id": agent_details.foundation_model or "Amazon Bedrock (Claude 3.5 Sonnet)",
                "circuit_breaker": "Closed",
                "bedrock_agent_id": bedrock_id,
                "approved_by": f"Auto (Version Update < {APPROVAL_VERSION_THRESHOLD})",
                "instruction": agent_details.instruction,
                "action_groups": agent_details.action_groups,
                "knowledge_bases": agent_details.knowledge_bases,
                "updated_at": datetime.utcnow().isoformat()
            }
            _dynamic_agents.append(new_active_agent)
            target_agent = new_active_agent

        # Also update any matching record in approval queue so it reflects latest version metadata
        for q in _agent_approval_queue:
            q_details = q.get("agent_details", {})
            if q_details.get("bedrock_agent_id") == bedrock_id or q_details.get("agent_name") == agent_name:
                q_details["agent_version"] = raw_version
                q_details["foundation_model"] = agent_details.foundation_model
                q_details["description"] = agent_details.description
                q_details["instruction"] = agent_details.instruction
                q_details["action_groups"] = agent_details.action_groups
                q["updated_at"] = datetime.utcnow().isoformat()

        # Record version bump in audit history
        _agent_approval_history.insert(0, {
            "id": f"EVT-VER-{uuid.uuid4().hex[:6].upper()}",
            "agent_name": agent_name,
            "bedrock_agent_id": bedrock_id,
            "project_id": payload.project_id or "cog-aws-703384432149",
            "cloud_provider": "AWS",
            "decision": "VERSION_AUTO_UPDATED",
            "decided_by": agent_details.created_by or "System",
            "decided_at": datetime.utcnow().isoformat(),
            "notes": f"Agent version updated to {formatted_version_string} (< {APPROVAL_VERSION_THRESHOLD}). Bypassed HITL approval."
        })

        return {
            "status": "success",
            "action": "VERSION_UPDATED",
            "message": f"Bedrock agent '{agent_name}' updated in-place to version '{formatted_version_string}'. Bypassed HITL approval.",
            "agent_version": formatted_version_string,
            "agent": target_agent,
            "token_accepted": bool(received_token)
        }

    # Path B: Version == 1 OR Version >= 30 (Tracked for HITL Admin Approval!)
    req_id = f"REQ-BR-{uuid.uuid4().hex[:8].upper()}"
    new_request = {
        "id": req_id,
        "event_type": payload.event_type or "BEDROCK_AGENT_CREATED",
        "created_at": datetime.utcnow().isoformat(),
        "aws_account_id": payload.aws_account_id or "703384432149",
        "region": payload.region or "us-west-2",
        "project_id": payload.project_id or "cog-aws-703384432149",
        "ad_group": payload.ad_group or "cb9547721a-veriforge-aw",
        "cloud_provider": "AWS",
        "status": "PENDING_APPROVAL",
        "target_version": formatted_version_string,
        "compliance_score": round(random.uniform(85.0, 98.5), 1),
        "risk_level": "Low" if random.random() > 0.3 else "Medium",
        "webhook_token_verified": bool(received_token),
        "agent_details": payload.agent_details.dict()
    }
    _agent_approval_queue.insert(0, new_request)

    if version_num >= APPROVAL_VERSION_THRESHOLD:
        approval_msg = f"Bedrock agent '{agent_name}' (Version {formatted_version_string} >= {APPROVAL_VERSION_THRESHOLD}) queued for Admin approval."
    else:
        approval_msg = f"Bedrock agent '{agent_name}' (Version {formatted_version_string}) queued for Admin approval."

    return {
        "status": "success",
        "action": "QUEUED_FOR_APPROVAL",
        "message": approval_msg,
        "request_id": req_id,
        "agent_version": formatted_version_string,
        "token_accepted": bool(received_token),
        "status": "PENDING_APPROVAL"
    }

def _format_onboarding_item(item: Dict[str, Any]) -> Dict[str, Any]:
    details = item.get("agent_details", {})
    status = "approved" if item.get("status") == "APPROVED" else ("rejected" if item.get("status") == "REJECTED" else "pending")
    version_str = str(details.get("agent_version") or item.get("target_version") or "1")
    return {
        "id": item.get("id"),
        "agentName": details.get("agent_name", "Bedrock Agent"),
        "requestedBy": details.get("created_by", "Ankit Sikka"),
        "requestedByRole": "Cloud Lead (AWS Spoke)" if item.get("cloud_provider") == "AWS" else "Platform Engineer",
        "workspace": f"{item.get('cloud_provider', 'AWS')} Spoke",
        "workspaceFull": f"{item.get('cloud_provider', 'AWS')} Spoke ({item.get('aws_account_id', item.get('project_id'))}) / {item.get('region', 'us-west-2')}",
        "model": details.get("foundation_model", "Amazon Bedrock (Claude 3.5 Sonnet)"),
        "description": details.get("instruction") or details.get("description", "Amazon Bedrock AgentCore autonomous agent"),
        "status": status,
        "agent_version": version_str,
        "raw": item
    }

@app.get("/api/onboarding/requests")
def get_onboarding_requests():
    """
    Returns onboarding requests formatted for the Onboarding Pending UI page.
    """
    return [_format_onboarding_item(q) for q in _agent_approval_queue]

@app.post("/api/onboarding/requests/{request_id}/approve")
def approve_onboarding_request(request_id: str, payload: Optional[ApprovalDecisionPayload] = None):
    res = approve_agent_request(request_id, payload)
    return {"status": "success", "message": "Approved", "data": res}

@app.post("/api/onboarding/requests/{request_id}/reject")
def reject_onboarding_request(request_id: str, payload: Optional[ApprovalDecisionPayload] = None):
    res = reject_agent_request(request_id, payload)
    return {"status": "success", "message": "Rejected", "data": res}

@app.get("/api/models/registry")
def get_model_registry():
    """
    Returns foundation model inventory, model cards, benchmarks, and lifecycle status.
    """
    models = [
        {
            "id": "mdl-001",
            "name": "Vertex AI (Gemini Pro)",
            "provider": "Google / Vertex AI",
            "version": "gemini-1.5-pro",
            "params": "~1T (MoE)",
            "contextWindow": 1000000,
            "region": "us-central1",
            "agentsUsing": ["Claims Processing Agent"],
            "license": "Commercial",
            "lastEval": "Today",
            "status": "Active",
            "lifecycle": "Active",
            "releaseDate": "Feb 2024",
            "arch": "MoE",
            "costIn": 0.00125,
            "costOut": 0.00375,
            "mmlu": 85.9,
            "humaneval": 71.9,
            "gsm8k": 91.7
        },
        {
            "id": "mdl-002",
            "name": "Azure OpenAI (GPT-4)",
            "provider": "OpenAI / Azure",
            "version": "gpt-4o-2024-05-13",
            "params": "~1.8T (MoE)",
            "contextWindow": 128000,
            "region": "eastus",
            "agentsUsing": ["Underwriting Assistant"],
            "license": "Commercial",
            "lastEval": "1 day ago",
            "status": "Active",
            "lifecycle": "Active",
            "releaseDate": "May 2024",
            "arch": "MoE",
            "costIn": 0.005,
            "costOut": 0.015,
            "mmlu": 88.7,
            "humaneval": 90.2,
            "gsm8k": 97.0
        },
        {
            "id": "mdl-003",
            "name": "Vertex AI (Gemini Flash)",
            "provider": "Google / Vertex AI",
            "version": "gemini-1.5-flash",
            "params": "~20B",
            "contextWindow": 1000000,
            "region": "us-central1",
            "agentsUsing": ["Policy Summarizer"],
            "license": "Commercial",
            "lastEval": "Today",
            "status": "Active",
            "lifecycle": "Active",
            "releaseDate": "May 2024",
            "arch": "Decoder-only",
            "costIn": 0.00035,
            "costOut": 0.00105,
            "mmlu": 78.9,
            "humaneval": 74.1,
            "gsm8k": 86.5
        },
        {
            "id": "mdl-004",
            "name": "Cloud Translation",
            "provider": "Google Cloud",
            "version": "v3",
            "params": "N/A",
            "contextWindow": 32000,
            "region": "global",
            "agentsUsing": ["Customer Support Bot"],
            "license": "Commercial",
            "lastEval": "2 days ago",
            "status": "Active",
            "lifecycle": "Active",
            "releaseDate": "Jan 2024",
            "arch": "Encoder-Decoder",
            "costIn": 0.0002,
            "costOut": 0.0002,
            "mmlu": 82.0,
            "humaneval": 70.0,
            "gsm8k": 80.0
        },
        {
            "id": "mdl-005",
            "name": "Amazon Translate",
            "provider": "AWS Bedrock",
            "version": "v2",
            "params": "N/A",
            "contextWindow": 32000,
            "region": "us-east-1",
            "agentsUsing": ["Fraud Detection Agent"],
            "license": "Commercial",
            "lastEval": "3 days ago",
            "status": "Active",
            "lifecycle": "Active",
            "releaseDate": "Jan 2024",
            "arch": "Encoder-Decoder",
            "costIn": 0.00015,
            "costOut": 0.00015,
            "mmlu": 81.5,
            "humaneval": 69.5,
            "gsm8k": 79.0
        },
        {
            "id": "mdl-006",
            "name": "Claude 3.5 Sonnet",
            "provider": "AWS Bedrock",
            "version": "anthropic.claude-3-5-sonnet-20241022-v2:0",
            "params": "~200B",
            "contextWindow": 200000,
            "region": "us-east-1",
            "agentsUsing": [],
            "license": "Commercial",
            "lastEval": "Yesterday",
            "status": "Evaluating",
            "lifecycle": "Evaluating",
            "releaseDate": "Oct 2024",
            "arch": "Decoder-only",
            "costIn": 0.003,
            "costOut": 0.015,
            "mmlu": 88.3,
            "humaneval": 92.0,
            "gsm8k": 96.4
        },
        {
            "id": "mdl-007",
            "name": "Llama 3.1 70B",
            "provider": "Meta (Self-hosted)",
            "version": "meta.llama3-1-70b-instruct-v1:0",
            "params": "70B",
            "contextWindow": 128000,
            "region": "on-premises",
            "agentsUsing": [],
            "license": "Llama 3 Community",
            "lastEval": "Pending",
            "status": "Candidate",
            "lifecycle": "Candidate",
            "releaseDate": "Jul 2024",
            "arch": "Decoder-only",
            "costIn": 0.0,
            "costOut": 0.0,
            "mmlu": 79.3,
            "humaneval": 80.5,
            "gsm8k": 93.0
        }
    ]
    return {"status": "success", "data": models}

# --- User Management / Onboarding ---

import bcrypt
from google.cloud.sql.connector import Connector, IPTypes
from google.oauth2 import service_account

_sql_connector = None
_users_table_ready = False


def _postgres_connection():
    """Open a Cloud SQL PostgreSQL connection using the app's service account."""
    global _sql_connector
    required = ("CLOUD_SQL_INSTANCE", "DB_USER", "DB_PASSWORD", "DB_NAME", "GCP_SA_6_KEY")
    missing = [name for name in required if not os.environ.get(name)]
    if missing:
        raise RuntimeError(f"Missing PostgreSQL configuration: {', '.join(missing)}")
    if _sql_connector is None:
        info = json.loads(os.environ["GCP_SA_6_KEY"])
        credentials = service_account.Credentials.from_service_account_info(info)
        _sql_connector = Connector(credentials=credentials)
    return _sql_connector.connect(
        os.environ["CLOUD_SQL_INSTANCE"],
        "pg8000",
        user=os.environ["DB_USER"],
        password=os.environ["DB_PASSWORD"],
        db=os.environ["DB_NAME"],
        ip_type=IPTypes.PUBLIC,
    )


def _ensure_users_table():
    global _users_table_ready
    if _users_table_ready:
        return
    connection = _postgres_connection()
    try:
        cursor = connection.cursor()
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id BIGSERIAL PRIMARY KEY,
                employee_id TEXT NOT NULL UNIQUE,
                first_name TEXT NOT NULL,
                last_name TEXT NOT NULL,
                username TEXT NOT NULL UNIQUE,
                email TEXT,
                password_hash TEXT NOT NULL,
                role TEXT NOT NULL,
                permissions JSONB NOT NULL DEFAULT '[]'::jsonb,
                status TEXT NOT NULL DEFAULT 'Active',
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
        """)
        connection.commit()
    finally:
        connection.close()
    _users_table_ready = True


def _user_query(sql: str, params=(), fetch_one=False, fetch_all=False):
    _ensure_users_table()
    connection = _postgres_connection()
    try:
        cursor = connection.cursor()
        cursor.execute(sql, params)
        if fetch_one or fetch_all:
            names = [column[0] for column in cursor.description]
            rows = cursor.fetchall() if fetch_all else [cursor.fetchone()]
            result = [dict(zip(names, row)) for row in rows if row is not None]
            connection.commit()
            return result if fetch_all else (result[0] if result else None)
        connection.commit()
        return cursor.rowcount
    except Exception:
        connection.rollback()
        raise
    finally:
        connection.close()


def _require_users_collection():
    try:
        _ensure_users_table()
    except Exception as exc:
        print(f"PostgreSQL user store unavailable: {exc}")
        raise HTTPException(status_code=503, detail="User store is unavailable (no database connection)")


def _get_user_by_id(user_id: str) -> Dict[str, Any]:
    try:
        numeric_id = int(user_id)
    except (TypeError, ValueError):
        raise HTTPException(status_code=404, detail="User not found")
    doc = _user_query("SELECT * FROM users WHERE id = %s", (numeric_id,), fetch_one=True)
    if not doc:
        raise HTTPException(status_code=404, detail="User not found")
    return doc


def _hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

VALID_ROLES = {"admin", "user", "viewer"}
VALID_PERMISSIONS = {
    "view_metrics",
    "manage_agents",
    "approve_agents",
    "manage_users",
    "manage_models",
    "view_billing",
}
VALID_USER_STATUSES = {"Active", "Inactive"}


class UserCreateRequest(BaseModel):
    first_name: str
    last_name: str
    employee_id: str
    email: Optional[str] = None
    role: str
    permissions: List[str] = []
    username: Optional[str] = None
    password: Optional[str] = None


class UserUpdateRequest(BaseModel):
    role: Optional[str] = None
    permissions: Optional[List[str]] = None
    status: Optional[str] = None
    email: Optional[str] = None


def _validate_role_and_permissions(role: str, permissions: List[str]):
    if role not in VALID_ROLES:
        raise HTTPException(status_code=400, detail=f"Invalid role '{role}'. Must be one of {sorted(VALID_ROLES)}")
    invalid_perms = set(permissions) - VALID_PERMISSIONS
    if invalid_perms:
        raise HTTPException(status_code=400, detail=f"Invalid permissions: {sorted(invalid_perms)}")


def generate_username(first_name: str, last_name: str) -> str:
    return f"{first_name.strip().lower()}.{last_name.strip().lower()}"


def generate_password(first_name: str, employee_id: str) -> str:
    return f"{first_name.strip().capitalize()}@{employee_id.strip()}"


def ensure_unique_username(base_username: str) -> str:
    candidate = base_username
    suffix = 2
    while _user_query("SELECT id FROM users WHERE username = %s", (candidate,), fetch_one=True):
        candidate = f"{base_username}{suffix}"
        suffix += 1
    return candidate


def _serialize_user(doc: Dict[str, Any]) -> Dict[str, Any]:
    permissions = doc.get("permissions") or []
    if isinstance(permissions, str):
        permissions = json.loads(permissions)
    return {
        "id": str(doc["id"]),
        "employee_id": doc.get("employee_id"),
        "first_name": doc.get("first_name"),
        "last_name": doc.get("last_name"),
        "username": doc.get("username"),
        "email": doc.get("email"),
        "role": doc.get("role"),
        "permissions": permissions,
        "status": doc.get("status"),
        "created_at": doc.get("created_at"),
        "updated_at": doc.get("updated_at"),
    }


@app.post("/api/users")
def create_user(request: UserCreateRequest):
    _require_users_collection()
    _validate_role_and_permissions(request.role, request.permissions)

    if _user_query("SELECT id FROM users WHERE employee_id = %s", (request.employee_id,), fetch_one=True):
        raise HTTPException(status_code=409, detail=f"Employee ID '{request.employee_id}' already has an account")

    if request.username:
        if _user_query("SELECT id FROM users WHERE username = %s", (request.username,), fetch_one=True):
            raise HTTPException(status_code=409, detail=f"Username '{request.username}' is already taken")
        username = request.username
    else:
        username = ensure_unique_username(generate_username(request.first_name, request.last_name))

    plaintext_password = request.password or generate_password(request.first_name, request.employee_id)

    now = datetime.utcnow()
    doc = {
        "employee_id": request.employee_id,
        "first_name": request.first_name,
        "last_name": request.last_name,
        "username": username,
        "email": request.email,
        "password_hash": _hash_password(plaintext_password),
        "role": request.role,
        "permissions": request.permissions,
        "status": "Active",
        "created_at": now,
        "updated_at": now,
    }
    try:
        doc = _user_query("""
            INSERT INTO users (employee_id, first_name, last_name, username, email,
                password_hash, role, permissions, status, created_at, updated_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s::jsonb, %s, %s, %s)
            RETURNING *
        """, (doc["employee_id"], doc["first_name"], doc["last_name"], doc["username"],
              doc["email"], doc["password_hash"], doc["role"], json.dumps(doc["permissions"]),
              doc["status"], doc["created_at"], doc["updated_at"]), fetch_one=True)
    except Exception as exc:
        if getattr(exc, "sqlstate", None) == "23505":
            raise HTTPException(status_code=409, detail="Employee ID or username already exists")
        raise

    response = _serialize_user(doc)
    response["generated_password"] = plaintext_password
    return response


@app.get("/api/users")
def list_users(status: Optional[str] = None, role: Optional[str] = None):
    _require_users_collection()
    clauses = []
    params = []
    if status:
        clauses.append("status = %s")
        params.append(status)
    if role:
        clauses.append("role = %s")
        params.append(role)
    where = " WHERE " + " AND ".join(clauses) if clauses else ""
    docs = _user_query("SELECT * FROM users" + where + " ORDER BY created_at DESC", tuple(params), fetch_all=True)
    return [_serialize_user(doc) for doc in docs]


@app.get("/api/admin/users")
def list_users_admin(status: Optional[str] = None, role: Optional[str] = None):
    """Same data as /api/users, wrapped in the {status, users} envelope the admin UI expects."""
    return {"status": "success", "users": list_users(status=status, role=role)}


@app.get("/api/users/{user_id}")
def get_user(user_id: str):
    _require_users_collection()
    doc = _get_user_by_id(user_id)
    return _serialize_user(doc)


@app.patch("/api/users/{user_id}")
def update_user(user_id: str, request: UserUpdateRequest):
    _require_users_collection()
    doc = _get_user_by_id(user_id)

    updates: Dict[str, Any] = {}
    if request.role is not None or request.permissions is not None:
        new_role = request.role if request.role is not None else doc.get("role")
        new_permissions = request.permissions if request.permissions is not None else doc.get("permissions", [])
        _validate_role_and_permissions(new_role, new_permissions)
        updates["role"] = new_role
        updates["permissions"] = new_permissions
    if request.status is not None:
        if request.status not in VALID_USER_STATUSES:
            raise HTTPException(status_code=400, detail=f"Invalid status '{request.status}'. Must be one of {sorted(VALID_USER_STATUSES)}")
        updates["status"] = request.status
    if request.email is not None:
        updates["email"] = request.email

    if not updates:
        return _serialize_user(doc)

    updates["updated_at"] = datetime.utcnow()
    assignments = []
    params = []
    for key, value in updates.items():
        assignments.append(f"{key} = %s::jsonb" if key == "permissions" else f"{key} = %s")
        params.append(json.dumps(value) if key == "permissions" else value)
    params.append(doc["id"])
    updated = _user_query(f"UPDATE users SET {', '.join(assignments)} WHERE id = %s RETURNING *", tuple(params), fetch_one=True)
    return _serialize_user(updated)


@app.delete("/api/users/{user_id}")
def deactivate_user(user_id: str):
    _require_users_collection()
    doc = _get_user_by_id(user_id)
    updated = _user_query("UPDATE users SET status = %s, updated_at = %s WHERE id = %s RETURNING *",
                          ("Inactive", datetime.utcnow(), doc["id"]), fetch_one=True)
    return _serialize_user(updated)


@app.post("/api/users/{user_id}/reset-password")
def reset_user_password(user_id: str, password: Optional[str] = None):
    _require_users_collection()
    doc = _get_user_by_id(user_id)
    new_password = password or generate_password(doc.get("first_name", ""), doc.get("employee_id", ""))
    updated = _user_query("UPDATE users SET password_hash = %s, updated_at = %s WHERE id = %s RETURNING *",
                          (_hash_password(new_password), datetime.utcnow(), doc["id"]), fetch_one=True)
    response = _serialize_user(updated)
    response["generated_password"] = new_password
    return response


class LoginRequest(BaseModel):
    username: str
    password: str

@app.post("/api/auth/login")
def login(request: LoginRequest):
    if not request.username or not request.password:
        raise HTTPException(status_code=400, detail="Invalid username or password")

    _require_users_collection()
    identifier = request.username.strip()
    field = "email" if "@" in identifier else "username"
    doc = _user_query(f"SELECT * FROM users WHERE {field} = %s", (identifier if field == "email" else identifier.lower(),), fetch_one=True)
    if not doc or not bcrypt.checkpw(request.password.encode("utf-8"), doc.get("password_hash", "").encode("utf-8")):
        raise HTTPException(status_code=401, detail="Invalid username or password")
    if doc.get("status") != "Active":
        raise HTTPException(status_code=403, detail="Account is inactive")

    return {
        "access_token": f"mock_token_{doc['username']}_{uuid.uuid4().hex}",
        "username": doc.get("username"),
        "role": doc.get("role"),
    }

@app.post("/api/auth/validate")
def validate_token():
    return {"status": "valid", "user": {"username": "admin", "role": "admin"}}
