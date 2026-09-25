#!/usr/bin/env python3
"""
VeriForge Ops — Synthetic Dataset Generator
============================================
Generates 30-day production-grade mock data and writes src/mock_data.js.

Usage:
    python scripts/generate_seed_data.py

Output:
    src/mock_data.js  — imported by API_services.js, Logs.jsx, Audit.jsx
"""

import json
import math
import random
from datetime import datetime, timedelta, timezone
from pathlib import Path

# ── Reproducibility ──────────────────────────────────────────────────────────
random.seed(42)

# ── Time Anchors ─────────────────────────────────────────────────────────────
TODAY = datetime(2026, 3, 25, 17, 0, 0, tzinfo=timezone.utc)
DAY_0 = TODAY - timedelta(days=29)          # 30-day window: DAY_0 … TODAY
MODEL_MIGRATION_DAY = 15                    # Day-15: gpt-4-0613 → gpt-4o


# ── Agent Profiles — Meridian Financial Services fleet ───────────────────────
AGENTS = [
    dict(id="agent-001", name="Business Intelligence Agent",
         model_pre="anthropic.claude-3-sonnet-20240229-v1:0", model_post="anthropic.claude-3-sonnet-20240229-v1:0",
         base_reqs=120, cost_per_1k_in=0.003, cost_per_1k_out=0.015,
         avg_in_tokens=1800, avg_out_tokens=640,
         provider="AWS",    tool="query_analytics_api"),
    dict(id="agent-002", name="Client Advisory Agent",
         model_pre="azure/gpt-4-turbo",    model_post="azure/gpt-4-turbo",
         base_reqs=80,  cost_per_1k_in=0.010, cost_per_1k_out=0.030,
         avg_in_tokens=1200, avg_out_tokens=520,
         provider="Azure",  tool="run_advisory_workflow"),
    dict(id="agent-003", name="Forecasting Agent",
         model_pre="google/gemini-1.5-pro", model_post="google/gemini-1.5-pro",
         base_reqs=95,  cost_per_1k_in=0.0035, cost_per_1k_out=0.0105,
         avg_in_tokens=2200, avg_out_tokens=1100,
         provider="GCP",    tool="run_forecast_model"),
    dict(id="agent-005", name="Workflow Orchestration Agent",
         model_pre="openai/gpt-4o",     model_post="openai/gpt-4o",
         base_reqs=55,  cost_per_1k_in=0.005, cost_per_1k_out=0.015,
         avg_in_tokens=3400, avg_out_tokens=980,
         provider="OpenAI", tool="orchestrate_workflow"),
    dict(id="agent-009", name="Workforce Planning and Recruitment",
         model_pre="openai/gpt-4o-mini",  model_post="openai/gpt-4o-mini",
         base_reqs=140, cost_per_1k_in=0.00015, cost_per_1k_out=0.0006,
         avg_in_tokens=800,  avg_out_tokens=380,
         provider="OpenAI", tool="author_protocol"),
]

# ── Incident Windows ──────────────────────────────────────────────────────────
# day=index from DAY_0, h0/h1=UTC hour window
INCIDENTS = [
    dict(day=12, agent="Business Intelligence Agent",
         h0=10, h1=12, incident_type="api_timeout",
         err_rate=0.40,
         desc="API Timeout — model endpoint unresponsive"),
    dict(day=20, agent="Client Advisory Agent",
         h0=14, h1=16, incident_type="rate_limit",
         err_rate=0.25,
         desc="Rate Limit Exhaustion — Azure OpenAI quota exceeded"),
    dict(day=25, agent="Forecasting Agent",
         h0=2,  h1=4,  incident_type="memory_exhaust",
         err_rate=0.30,
         desc="Memory Exhaustion — GCP instance OOM killed"),
]

# ── Enterprise Clients / Users ────────────────────────────────────────────────
USERS = [
    dict(email="priya.sharma@aia.com",          client="AIA Group",        ip="10.12.45.91"),
    dict(email="james.chen@aiml.io",            client="AIML Solutions",   ip="172.16.8.204"),
    dict(email="rajesh.kumar@cognizant.com",    client="Cognizant",        ip="192.168.1.100"),
    dict(email="sarah.okonkwo@cognizant.com",   client="Cognizant",        ip="192.168.1.145"),
    dict(email="kwame.boateng@aiml.io",         client="AIML Solutions",   ip="172.16.8.211"),
    dict(email="mei.tanaka@aia.com",            client="AIA Group",        ip="10.12.45.92"),
    dict(email="admin@cognizant.com",           client="Cognizant",        ip="192.168.1.10"),
    dict(email="senthil@cognizant.com",         client="Cognizant",        ip="192.168.1.11"),
]


# ── Helpers ───────────────────────────────────────────────────────────────────

def day_date(day_idx: int) -> datetime:
    return DAY_0 + timedelta(days=day_idx)


def fmt_date(dt: datetime) -> str:
    return dt.strftime("%b") + " " + str(int(dt.strftime("%d")))


def iso(dt: datetime) -> str:
    return dt.strftime("%Y-%m-%dT%H:%M:%SZ")


def ts(dt: datetime) -> str:
    return dt.strftime("%Y-%m-%d %H:%M:%S")


# Pre-compute day multipliers once using Python's random module so the
# resulting chart data has organic jaggedness instead of smooth sin-wave patterns.
_DAY_MULTS: list[float] = []

def _precompute_day_mults() -> None:
    global _DAY_MULTS
    _DAY_MULTS = []
    for i in range(30):
        week  = i // 7
        growth = 1.15 ** week
        dow   = day_date(i).weekday()   # 0=Mon … 6=Sun

        if dow == 0:
            # Monday: meaningful spike but with real variance (some Mondays are huge, some meh)
            base = random.gauss(1.42, 0.11)
        elif dow == 6:
            # Sunday: low, but occasionally a batch job runs
            base = random.gauss(0.44, 0.08)
        elif dow == 5:
            # Saturday: half-day pattern
            base = random.gauss(0.58, 0.09)
        elif dow == 4:
            # Friday: people wrap up early
            base = random.gauss(0.88, 0.10)
        else:
            # Tue–Thu: widest variance — real workloads are very jagged here
            base = random.gauss(1.03, 0.16)

        # ~12 % chance any non-weekend day gets a "heavy batch / big client" spike
        if dow not in (5, 6) and random.random() < 0.12:
            base *= random.uniform(1.20, 1.45)

        _DAY_MULTS.append(max(0.20, growth * base))


def day_multiplier(day_idx: int) -> float:
    return _DAY_MULTS[day_idx]


def is_incident_active(day_idx: int, hour: int, agent_name: str) -> dict | None:
    for inc in INCIDENTS:
        if inc["day"] == day_idx and inc["agent"] == agent_name and inc["h0"] <= hour < inc["h1"]:
            return inc
    return None


# ── 1. Daily Cost Data (30 days) ──────────────────────────────────────────────

def build_daily_cost_data():
    rows = []
    for i in range(30):
        dt    = day_date(i)
        mult  = day_multiplier(i)
        # Aggregate across all agents
        total_cost   = 0.0
        total_tokens = 0
        for ag in AGENTS:
            reqs = max(1, int(ag["base_reqs"] * mult))
            # Incident days get cost spike
            incident = next((inc for inc in INCIDENTS if inc["day"] == i and inc["agent"] == ag["name"]), None)
            if incident:
                reqs = int(reqs * 1.6)  # more retries → higher cost
            in_tok  = reqs * ag["avg_in_tokens"]  * max(0.55, random.gauss(1.0, 0.11))
            out_tok = reqs * ag["avg_out_tokens"] * max(0.55, random.gauss(1.0, 0.11))
            # Post-migration: gpt-4o is slightly cheaper for output
            out_mult = 0.88 if (i >= MODEL_MIGRATION_DAY and "gemini" not in ag["model_post"]) else 1.0
            cost    = (in_tok / 1000) * ag["cost_per_1k_in"] + (out_tok / 1000) * ag["cost_per_1k_out"] * out_mult
            total_cost   += cost
            total_tokens += int(in_tok + out_tok)
        rows.append({
            "date":   fmt_date(dt),
            "cost":   round(total_cost, 2),
            "tokens": total_tokens,
        })
    return rows


# ── 2. Agent Cost Metrics (30-day totals) ─────────────────────────────────────

def build_agent_cost_metrics():
    metrics = []
    for ag in AGENTS:
        total_in = total_out = total_cost = total_req = 0
        for i in range(30):
            mult = day_multiplier(i)
            reqs = max(1, int(ag["base_reqs"] * mult))
            in_tok  = int(reqs * ag["avg_in_tokens"]  * max(0.55, random.gauss(1.0, 0.11)))
            out_tok = int(reqs * ag["avg_out_tokens"] * max(0.55, random.gauss(1.0, 0.11)))
            out_mult = 0.88 if (i >= MODEL_MIGRATION_DAY and "gemini" not in ag["model_post"]) else 1.0
            cost    = (in_tok / 1000) * ag["cost_per_1k_in"] + (out_tok / 1000) * ag["cost_per_1k_out"] * out_mult
            total_in   += in_tok
            total_out  += out_tok
            total_cost += cost
            total_req  += reqs
        metrics.append({
            "agentId":      ag["id"],
            "agentName":    ag["name"],
            "inputTokens":  total_in,
            "outputTokens": total_out,
            "totalCost":    str(round(total_cost, 2)),
            "requests":     total_req,
        })
    return metrics


# ── 3. Token Usage Periods ────────────────────────────────────────────────────

def build_token_usage(agent_metrics):
    def period(days_back):
        day_start = 30 - days_back
        in_tok = out_tok = cost = 0
        for ag in AGENTS:
            for i in range(day_start, 30):
                mult = day_multiplier(i)
                reqs = max(1, int(ag["base_reqs"] * mult))
                it   = int(reqs * ag["avg_in_tokens"]  * max(0.55, random.gauss(1.0, 0.11)))
                ot   = int(reqs * ag["avg_out_tokens"] * max(0.55, random.gauss(1.0, 0.11)))
                om   = 0.88 if (i >= MODEL_MIGRATION_DAY and "gemini" not in ag["model_post"]) else 1.0
                in_tok  += it
                out_tok += ot
                cost    += (it/1000)*ag["cost_per_1k_in"] + (ot/1000)*ag["cost_per_1k_out"]*om
        return {"inputTokens": in_tok, "outputTokens": out_tok,
                "totalTokens": in_tok + out_tok, "cost": round(cost, 2)}
    return {"last24h": period(1), "last7d": period(7), "last30d": period(30)}


# ── 4. Model Breakdown ────────────────────────────────────────────────────────

def build_model_breakdown():
    # Post-migration distribution (Days 15-29)
    rows = []
    model_totals = {}
    for ag in AGENTS:
        for i in range(30):
            model = ag["model_post"] if i >= MODEL_MIGRATION_DAY else ag["model_pre"]
            key   = f"{model} ({ag['provider']})"
            mult  = day_multiplier(i)
            reqs  = max(1, int(ag["base_reqs"] * mult))
            in_t  = int(reqs * ag["avg_in_tokens"]  * max(0.55, random.gauss(1.0, 0.11)))
            out_t = int(reqs * ag["avg_out_tokens"] * max(0.55, random.gauss(1.0, 0.11)))
            om    = 0.88 if (i >= MODEL_MIGRATION_DAY and "gemini" not in ag["model_post"]) else 1.0
            cost  = (in_t/1000)*ag["cost_per_1k_in"] + (out_t/1000)*ag["cost_per_1k_out"]*om
            if key not in model_totals:
                model_totals[key] = {"tokens": 0, "requests": 0, "cost": 0.0}
            model_totals[key]["tokens"]   += in_t + out_t
            model_totals[key]["requests"] += reqs
            model_totals[key]["cost"]     += cost
    for model, v in sorted(model_totals.items(), key=lambda x: -x[1]["tokens"]):
        rows.append({"model": model, "tokens": v["tokens"],
                     "requests": v["requests"], "cost": round(v["cost"], 2)})
    return rows


# ── 5. Alerts ─────────────────────────────────────────────────────────────────

def build_alerts():
    critical = []
    warning  = []
    uid = [1]

    def make_alert(level, agent_name, message, dt, model_id, request_id=None):
        obj = {
            "id":         uid[0],
            "agentName":  agent_name,
            "message":    message,
            "timestamp":  ts(dt),
            "severity":   level,
            "model_id":   model_id,
            "request_id": request_id or f"req_{uid[0]:04d}",
        }
        uid[0] += 1
        return obj

    # ── Incident-tied criticals ──
    inc_day12 = day_date(12).replace(hour=10, minute=14)
    critical.append(make_alert("CRITICAL", "GenBI Agent",
        "API Timeout — model endpoint unreachable for 47s during EMEA revenue report (req batch: 23 failed)",
        inc_day12, "gpt-4-0613", "req_INC001"))

    inc_day20 = day_date(20).replace(hour=14, minute=32)
    critical.append(make_alert("CRITICAL", "Travel Concierge",
        "Azure OpenAI rate limit exhausted — 429 responses for 94 consecutive requests during peak booking window",
        inc_day20, "gpt-4o", "req_INC002"))

    inc_day25 = day_date(25).replace(hour=2, minute=48)
    critical.append(make_alert("CRITICAL", "MathAgent",
        "GCP instance OOM killed — heap exhausted processing 6 concurrent SIR model simulations (RSS: 14.2 GB)",
        inc_day25, "gemini-1.5-pro", "req_INC003"))

    # ── Recent criticals ──
    critical.append(make_alert("CRITICAL", "GenBI Agent",
        "Token quota exceeded — daily limit of 500K tokens reached at 14:32 with 6 hours remaining",
        TODAY.replace(hour=14, minute=32), "gpt-4o", "req_c004"))

    critical.append(make_alert("ERROR", "Code Review Agent",
        "PR analysis pipeline stalled — GitHub API webhook timeout after 3 retries (PR #5102)",
        TODAY.replace(hour=9, minute=18), "gpt-4o", "req_c005"))

    # ── Warnings ──
    warning.append(make_alert("WARNING", "GenBI Agent",
        "Token usage at 87% of daily budget — 65,000 tokens remaining with peak hours ahead",
        TODAY.replace(hour=15, minute=2), "gpt-4o", "req_w001"))

    warning.append(make_alert("WARNING", "GenBI Agent",
        "Response latency degraded — p95 at 4.1s (SLA threshold: 3.0s) for 22 consecutive requests",
        TODAY.replace(hour=13, minute=30), "gpt-4o", "req_w002"))

    warning.append(make_alert("WARNING", "MathAgent",
        "Heap memory at 78% on GCP instance vf-math-prod-2 — approaching OOM threshold",
        TODAY.replace(hour=11, minute=45), "gemini-1.5-pro", "req_w003"))

    warning.append(make_alert("WARNING", "Code Review Agent",
        "30-day cost budget at 81% with 7 days remaining — forecast exceeds allocation by $34",
        (TODAY - timedelta(days=1)).replace(hour=16, minute=20), "gpt-4o", "req_w004"))

    warning.append(make_alert("WARNING", "HR Assistant",
        "OpenAI API rate limit at 92% of hourly quota — 8% capacity remaining for next 38 minutes",
        (TODAY - timedelta(days=1)).replace(hour=14, minute=10), "gpt-4o-mini", "req_w005"))

    warning.append(make_alert("WARNING", "Travel Concierge",
        "Log storage at 74% on /veriforge/model-invocations/azure — retention policy may purge recent entries",
        (TODAY - timedelta(days=1)).replace(hour=8, minute=55), "gpt-4o", "req_w006"))

    warning.append(make_alert("WARNING", "GenBI Agent",
        "Nightly report batch delayed 3.2h — upstream finance_dw replication lag exceeded 4 hours",
        (TODAY - timedelta(days=2)).replace(hour=22, minute=0), "gpt-4o", "req_w007"))

    warning.append(make_alert("WARNING", "MathAgent",
        "Post-migration output token count +18% vs baseline — gpt-4o verbosity calibration recommended",
        day_date(MODEL_MIGRATION_DAY).replace(hour=9, minute=5), "gemini-1.5-pro", "req_w008"))

    return critical, warning


# ── 6. Portal Activity Logs ───────────────────────────────────────────────────

def build_portal_logs():
    logs = []
    uid  = 1

    def add(level, action, message, dt):
        nonlocal uid
        logs.append({
            "id":        uid,
            "level":     level,
            "timestamp": ts(dt),
            "action":    action,
            "message":   message,
        })
        uid += 1

    # Day -1 (yesterday) through today
    add("INFO",    "User authentication",
        "User priya.sharma@aia.com authenticated from 10.12.45.91 (MFA: TOTP)",
        TODAY.replace(hour=8, minute=47))

    add("INFO",    "User authentication",
        "User rajesh.kumar@cognizant.com authenticated from 192.168.1.100",
        TODAY.replace(hour=9, minute=2))

    add("INFO",    "Agent deployment",
        "GenBI Agent v4 deployed to production by admin@cognizant.com — model: gpt-4o",
        TODAY.replace(hour=9, minute=15))

    add("INFO",    "Log sync completed",
        "Synced 312 records from /veriforge/model-invocations/aws (GenBI Agent, Code Review Agent)",
        TODAY.replace(hour=9, minute=30))

    add("WARNING", "API rate limit",
        "Rate limit at 88% for client AIML Solutions — 72 requests in last 60s (limit: 100/min)",
        TODAY.replace(hour=10, minute=12))

    add("INFO",    "API request",
        "POST /api/agents/agent-001/invoke responded 200 in 1,847ms (user: priya.sharma@aia.com)",
        TODAY.replace(hour=10, minute=18))

    add("INFO",    "Configuration update",
        "Token budget updated: GenBI Agent daily limit → 500,000 (was 400,000) by admin@cognizant.com",
        TODAY.replace(hour=10, minute=45))

    add("ERROR",   "Agent failure",
        "Code Review Agent invocation failed — HTTP 503 from gpt-4o endpoint (PR #5102, retry 3/3)",
        TODAY.replace(hour=11, minute=3))

    add("INFO",    "Log sync completed",
        "Synced 189 records from /veriforge/model-invocations/azure (Travel Concierge)",
        TODAY.replace(hour=11, minute=30))

    add("WARNING", "Memory usage",
        "Heap at 78% on vf-math-prod-2 (GCP us-central1) — MathAgent session backlog: 14 queued",
        TODAY.replace(hour=11, minute=45))

    add("INFO",    "Agent deployment",
        "HR Assistant v3 config updated — system prompt revised for APAC policy 2025-Q1 compliance",
        TODAY.replace(hour=12, minute=0))

    add("INFO",    "User authentication",
        "User james.chen@aiml.io authenticated from 172.16.8.204",
        TODAY.replace(hour=12, minute=31))

    add("INFO",    "API request",
        "GET /api/metrics/daily-cost responded 200 in 234ms (user: admin@cognizant.com)",
        TODAY.replace(hour=13, minute=5))

    add("WARNING", "Performance alert",
        "GenBI Agent p95 response time 4.1s — SLA threshold 3.0s breached for 22 consecutive requests",
        TODAY.replace(hour=13, minute=30))

    add("ERROR",   "Network timeout",
        "Network timeout reaching Azure OpenAI endpoint eastus2 after 15s — circuit breaker tripped",
        (TODAY - timedelta(days=1)).replace(hour=14, minute=32))

    add("INFO",    "Backup process",
        "Daily snapshot completed: 847 GB compressed to /veriforge/backups/2026-03-24 (duration: 14m 22s)",
        (TODAY - timedelta(days=1)).replace(hour=2, minute=15))

    add("WARNING", "Disk space",
        "Log storage at 74% on /veriforge/model-invocations/azure — auto-archive triggered for entries >90 days",
        (TODAY - timedelta(days=1)).replace(hour=8, minute=55))

    add("INFO",    "Agent deployment",
        "Travel Concierge v3 deployed — integrated corporate travel policy API v2025-Q1",
        (TODAY - timedelta(days=2)).replace(hour=10, minute=0))

    add("INFO",    "Log sync completed",
        "Synced 441 records from /veriforge/model-invocations/gcp (MathAgent) — 3 anomalous traces flagged",
        (TODAY - timedelta(days=2)).replace(hour=9, minute=30))

    add("ERROR",   "Database connection",
        "Read replica vf-db-replica-2 connection timed out after 30s — failover to primary (latency +120ms)",
        (TODAY - timedelta(days=3)).replace(hour=3, minute=12))

    add("INFO",    "System health",
        "All health checks passed: API Gateway ✓, DB ✓, Model endpoints ✓ (AWS/Azure/GCP/OpenAI) ✓",
        (TODAY - timedelta(days=3)).replace(hour=6, minute=0))

    add("INFO",    "User authentication",
        "User kwame.boateng@aiml.io authenticated from 172.16.8.211 — new device registered",
        (TODAY - timedelta(days=3)).replace(hour=8, minute=20))

    add("INFO",    "Configuration update",
        "Model migration completed: gpt-4-0613 → gpt-4o for GenBI Agent and Code Review Agent",
        day_date(MODEL_MIGRATION_DAY).replace(hour=8, minute=0))

    add("WARNING", "API rate limit",
        "Travel Concierge Azure OpenAI quota at 94% — 90 RPM consumed of 100 RPM limit",
        day_date(20).replace(hour=14, minute=32))

    add("ERROR",   "Agent failure",
        "GenBI Agent tool_failure_rate=40% during 10:00–12:00 UTC — 23/57 requests returned API Timeout",
        day_date(12).replace(hour=11, minute=59))

    add("INFO",    "User logout",
        "Session terminated for sarah.okonkwo@cognizant.com (duration: 2h 14m, requests: 34)",
        (TODAY - timedelta(days=4)).replace(hour=17, minute=45))

    add("INFO",    "API request",
        "POST /api/admin/query responded 200 in 2,341ms — intent: token_usage_query (confidence: 0.96)",
        (TODAY - timedelta(days=4)).replace(hour=11, minute=10))

    add("WARNING", "Performance alert",
        "MathAgent p99 latency 8.2s post-migration — Gemini 1.5 Pro unchanged, reviewing concurrency limits",
        day_date(MODEL_MIGRATION_DAY).replace(hour=9, minute=5))

    add("INFO",    "Backup process",
        "Weekly full backup completed: 5.4 TB to GCS vf-backups-cold (duration: 1h 7m, checksum: OK)",
        day_date(7).replace(hour=1, minute=30))

    add("INFO",    "User authentication",
        "User mei.tanaka@aia.com authenticated from 10.12.45.92 (first login this month)",
        (TODAY - timedelta(days=5)).replace(hour=9, minute=15))

    add("INFO",    "System health",
        "Scheduled maintenance completed — DB vacuum, log rotation, certificate renewal (next: 2026-06-25)",
        day_date(14).replace(hour=4, minute=0))

    return logs


# ── 7. Audit Traces (rich per-agent sessions) ─────────────────────────────────

def build_audit_traces():
    """Return per-agent trace data used by Audit.jsx handleFetch."""

    def make_session(agent, session_num, day_offset, hour, user_info,
                     incident=None, memory_age_days=5):
        ag_name  = agent["name"]
        ag_id    = agent["id"]
        day_idx  = 29 - day_offset  # relative to DAY_0
        model    = agent["model_post"] if day_idx >= MODEL_MIGRATION_DAY else agent["model_pre"]
        started  = day_date(day_idx).replace(hour=hour, minute=random.randint(0, 59), second=random.randint(0, 59))
        dur_s    = random.randint(8, 45) if incident is None else random.randint(35, 90)
        ended    = started + timedelta(seconds=dur_s)
        status   = "error" if incident and random.random() < incident["err_rate"] else "success"

        in_tok   = int(agent["avg_in_tokens"]  * max(0.50, random.gauss(1.0, 0.15)))
        out_tok  = int(agent["avg_out_tokens"] * max(0.50, random.gauss(1.0, 0.15)))
        cost     = round((in_tok/1000)*agent["cost_per_1k_in"] + (out_tok/1000)*agent["cost_per_1k_out"], 4)

        # ── Thought steps ──
        THOUGHTS = {
            "GenBI Agent": [
                "Parsing user query — detected intent: revenue analysis, scope: EMEA, period: FY2025. Checking schema registry for relevant tables.",
                f"Retrieving user preferences from MemStore (key: user_preferences.{user_info['email'].split('@')[0]}) — age: {memory_age_days}d. Preferred currency: USD, chart: bar.",
                "Constructing SQL: aggregating sales_fact on region='EMEA', fiscal_year=2025. Applying user's decimal precision (2dp).",
                "SQL execution completed in 234ms — 452 rows. Detected anomaly: Q3 revenue 12% below forecast. Flagging for narrative.",
                "Cross-referencing actuals vs budget targets from finance_dw. Delta: EMEA Q4 actuals +7.3% vs plan.",
                "Generating narrative summary with chart payload. Applying bar-chart format per user preference.",
                "Response assembled. Tokens: {in_tok} input + {out_tok} output. Total cost: ${cost}.",
            ],
            "Travel Concierge": [
                "Parsing travel request — origin: SIN, destination: LHR, pax: 2, cabin: business, departure: 2026-04-10.",
                f"Loading corporate travel policy for {user_info['client']} — business class permitted for flights ≥8h (SIN→LHR: 13.5h ✓).",
                "Querying GDS for SQ and BA itineraries. Checking J/C/D fare buckets. Applying corporate discount COGNTRVL-2025.",
                "Evaluated 8 itineraries. Optimal: SQ322 (non-stop, 13.5h, $3,780 after discount). BA006 (1-stop via LHR, $3,120).",
                "Checking visa requirements — Singapore passport, UK destination. ETA required: e-visa via UKVI, ~£10, 72h processing.",
                "Compiling booking summary with hotel recommendations (4-star, Canary Wharf, avg £280/night).",
            ],
            "MathAgent": [
                "Parsing differential equation system — identified SIR epidemic model: dS/dt, dI/dt, dR/dt.",
                "Validating parameters: β=0.30, γ=0.05, N=1,000,000. Computed R₀ = β/γ = 6.0 (highly infectious).",
                "Applying 4th-order Runge-Kutta (h=0.1) over t∈[0,365]. Estimated 3,650 integration steps.",
                "Peak infection at day 87: I_max = 284,762. Herd immunity threshold: 83.3% (833,000 individuals).",
                "Generating LaTeX output with phase portrait, time-series plot, and sensitivity analysis (β±10%).",
            ],
            "Code Review Agent": [
                "Fetching diff for PR #4821 in cognizant/platform-core — 12 files changed (+347/-89 lines).",
                "Static analysis pass 1: PEP8 compliance, type hint coverage (82%), complexity scoring.",
                "SAST scan complete — 1 high severity: SQL injection in db/queries.py line 142 (parameterized query missing).",
                "Complexity analysis: process_batch() cyclomatic complexity = 18 (threshold 10). Refactor recommended.",
                "Coverage delta computed: 74.2% → 71.9% (Δ -2.3%). Falls below 72% soft threshold.",
                "Compiling structured review report — 3 issues, 0 critical. Approval withheld pending remediation.",
            ],
            "HR Assistant": [
                "Parsing HR policy query — topic: remote work, scope: APAC region, employee: CTS-84921.",
                f"Loading employee context from MemStore (key: employee_context.CTS-84921) — age: {memory_age_days}d. Grade: G7, location: Singapore.",
                "Searching policy knowledge base — query: 'remote work APAC 2025-Q1'. Top match: HR-POL-2025-047 (score: 0.97).",
                "Extracting relevant clause: 'APAC employees may work remotely ≤3 days/week subject to manager approval.'",
                "Formatting response with policy excerpt, reference doc, and escalation path for exceptions.",
            ],
        }

        thoughts_raw = THOUGHTS.get(ag_name, THOUGHTS["GenBI Agent"])
        steps = []
        step_time = started + timedelta(seconds=1)
        for j, thought in enumerate(thoughts_raw):
            thought = thought.replace("{in_tok}", str(in_tok)).replace("{out_tok}", str(out_tok)).replace("{cost}", str(cost))
            step_type = "Tool_Call" if j == 2 else "Agent_Thought"

            entry = {
                "step":      j + 1,
                "type":      step_type,
                "content":   thought,
                "timestamp": iso(step_time),
                "tokens":    random.randint(80, 320),
            }

            if step_type == "Tool_Call":
                tool_name = agent["tool"]
                TOOL_CALLS = {
                    "execute_sql": {
                        "input":  {"sql_query": "SELECT region, SUM(revenue) AS total_revenue FROM sales_fact WHERE fiscal_year=2025 AND region='EMEA' GROUP BY region", "database": "prod_analytics_v2", "timeout_ms": 5000},
                        "output": {"result_rows": 452, "data": [{"region": "EMEA", "total_revenue": 4820341.92, "currency": "USD"}], "execution_time_ms": 234, "rows_scanned": 1204891, "cache_hit": False},
                    },
                    "search_flights": {
                        "input":  {"origin": "SIN", "destination": "LHR", "departure_date": "2026-04-10", "cabin": "business", "passengers": 2, "preferred_carriers": ["SQ", "BA"]},
                        "output": {"flights_found": 8, "cheapest_fare_usd": 3120.00, "fastest_duration_h": 13.5, "recommended": {"flight": "SQ322", "departs": "23:55", "arrives": "06:30+1", "fare_usd": 3780.00, "stops": 0, "cabin": "J"}, "corporate_discount_applied": "COGNTRVL-2025"},
                    },
                    "solve_equation": {
                        "input":  {"equation_system": ["dS/dt = -beta*S*I/N", "dI/dt = beta*S*I/N - gamma*I", "dR/dt = gamma*I"], "parameters": {"beta": 0.30, "gamma": 0.05, "N": 1000000, "I0": 100}, "method": "runge_kutta_4", "t_end": 365, "step_size": 0.1},
                        "output": {"peak_infected": 284762, "peak_day": 87, "R0": 6.0, "herd_immunity_threshold": 0.833, "total_infected": 891234, "convergence": True, "steps_computed": 3650, "compute_time_ms": 412},
                    },
                    "review_code": {
                        "input":  {"repository": "cognizant/platform-core", "pull_request_id": 4821, "files_changed": 12, "lines_added": 347, "lines_removed": 89, "target_branch": "main", "checks": ["sast", "complexity", "coverage", "style"]},
                        "output": {"issues_found": 3, "severity": {"critical": 0, "high": 1, "medium": 2, "low": 0}, "sast_findings": [{"file": "db/queries.py", "line": 142, "severity": "HIGH", "cwe": "CWE-89", "message": "SQL injection via unsanitized user input"}], "coverage_delta": -2.3, "approved": False},
                    },
                    "query_hr_policy": {
                        "input":  {"query": "Remote work policy for APAC Grade 7 employees", "employee_id": "CTS-84921", "department": "Engineering", "policy_version": "2025-Q1"},
                        "output": {"policy_name": "Global Remote Work Policy v4.2", "policy_ref": "HR-POL-2025-047", "applicable": True, "remote_days_per_week": 3, "approval_required": "Line Manager", "exceptions_approval": "VP level", "last_updated": "2025-01-15", "search_score": 0.97},
                    },
                }
                call_data = TOOL_CALLS.get(tool_name, TOOL_CALLS["execute_sql"])
                entry["tool_name"]   = tool_name
                entry["tool_input"]  = call_data["input"]
                entry["tool_output"] = call_data["output"] if status == "success" else {"error": "APITimeoutError", "message": "Model endpoint unreachable after 47s", "retry_count": 3, "failed_at": iso(step_time)}
                entry["latency_ms"]  = random.randint(180, 1800) if status == "success" else 47000

            steps.append(entry)
            step_time += timedelta(seconds=random.randint(2, 8))

        # ── MemOps ──
        mem_key, mem_val = {
            "GenBI Agent":       ("user_preferences." + user_info["email"].split("@")[0],
                                  {"preferred_currency": "USD", "preferred_chart": "bar", "date_format": "MM/DD/YYYY", "decimal_precision": 2}),
            "Travel Concierge":  ("corp_policy." + user_info["client"].lower().replace(" ", "_") + ".travel",
                                  {"business_class_threshold_h": 8, "preferred_carriers": ["SQ", "BA", "EK"], "hotel_tier": "4-star", "discount_code": "COGNTRVL-2025"}),
            "MathAgent":         ("user_preferences." + user_info["email"].split("@")[0],
                                  {"output_format": "LaTeX", "precision": "high", "include_phase_portrait": True, "notation": "standard"}),
            "Code Review Agent": ("repo_config.cognizant.platform-core",
                                  {"style_guide": "PEP8+Google", "max_cyclomatic_complexity": 10, "sast_enabled": True, "coverage_threshold_pct": 72.0}),
            "HR Assistant":      ("employee_context." + "CTS-84921",
                                  {"grade": "G7", "location": "Singapore", "department": "Engineering", "manager": "rajesh.kumar@cognizant.com"}),
        }.get(ag_name, ("user_preferences.default", {}))

        mem_ops = [{
            "type":            "MemOps_Retrieve",
            "key":             mem_key,
            "retrieved_at":    iso(started + timedelta(milliseconds=80)),
            "memory_age_days": memory_age_days,
            "vector_distance": round(max(0.04, random.gauss(0.13, 0.04)), 4),
            "content":         mem_val,
            "source":          "VectorStore:user-preferences-v2",
        }]

        return {
            "session_id":         f"sess_{ag_id[-3:]}_{session_num:03d}",
            "agent_id":           ag_id,
            "agent_name":         ag_name,
            "user":               user_info["email"],
            "client":             user_info["client"],
            "model_id":           model,
            "started_at":         iso(started),
            "ended_at":           iso(ended),
            "duration_ms":        dur_s * 1000,
            "status":             status,
            "input_tokens":       in_tok,
            "output_tokens":      out_tok,
            "total_cost_usd":     cost,
            "thought_steps":      steps,
            "memory_ops":         mem_ops,
            "incident":           incident["incident_type"] if incident else None,
            "latency_p50_ms":     dur_s * 800 // 2,
            "latency_p95_ms":     dur_s * 950,
        }

    traces_by_agent = {}
    sn = 1
    for ag in AGENTS:
        sessions = []
        users_for_agent = USERS[:4]
        # Recent sessions (today + yesterday)
        for day_off in [0, 1, 2]:
            inc = next((i for i in INCIDENTS if i["day"] == 29 - day_off and i["agent"] == ag["name"]), None)
            for h in [9, 11, 14, 16]:
                user = users_for_agent[sn % len(users_for_agent)]
                sessions.append(make_session(ag, sn, day_off, h, user, incident=inc, memory_age_days=5))
                sn += 1
        traces_by_agent[ag["id"]] = sessions

    return traces_by_agent


# ── 8. Audit Log Messages (used in Audit.jsx loop) ────────────────────────────

def build_audit_messages():
    return [
        ("INFO",  "Agent session initialised — model: {model}, context window: 128K tokens"),
        ("INFO",  "Processing user request — input: {in_tok} tokens, estimated output: {est_out} tokens"),
        ("INFO",  "MemOps retrieve — key: user_preferences.{user}, age: {age}d, vector_distance: {dist}"),
        ("INFO",  "Tool call dispatched — tool: {tool}, input size: {size} bytes, timeout: 30s"),
        ("INFO",  "Tool call completed in {ms}ms — output: {rows} result rows"),
        ("INFO",  "Response generated successfully — output: {out_tok} tokens, duration: {dur}s"),
        ("INFO",  "Model invocation completed — prompt_tokens: {in_tok}, completion_tokens: {out_tok}"),
        ("INFO",  "Session closed — total cost: ${cost}, tokens: {total_tok}, status: success"),
        ("INFO",  "Prompt cache hit — skipping inference, serving from cache (age: {cache_age}s)"),
        ("INFO",  "MemOps write — persisting {n} preference keys for user {user} (TTL: 30d)"),
        ("WARN",  "Token usage at {pct}% of session budget — {remaining} tokens remaining"),
        ("WARN",  "Response latency {lat}s exceeds SLA threshold of 3.0s — flagging for review"),
        ("WARN",  "Tool retry #{n} — {tool} returned HTTP 429 (rate limited), backoff: {bo}s"),
        ("WARN",  "Context window at {pct}% capacity — consider pruning conversation history"),
        ("ERROR", "Tool execution failed — {tool} returned APITimeoutError after 47s (retry 3/3)"),
        ("ERROR", "Model endpoint unreachable — HTTP 503 from {provider} API (circuit breaker open)"),
        ("DEBUG", "Thought step {n} — reasoning tokens: {tok}, chain length: {chain}"),
        ("DEBUG", "Vector search completed — top-k: 5, highest similarity: {sim}, latency: {lat}ms"),
        ("DEBUG", "Token count validated — input: {in_tok}, output est.: {est}, within budget: true"),
        ("DEBUG", "Serialising tool response — payload: {size} bytes, format: JSON, compression: none"),
    ]


# ── Writer ────────────────────────────────────────────────────────────────────

def write_js(path: Path, daily_cost, agent_metrics, token_usage,
             model_breakdown, critical, warning, portal_logs,
             audit_traces, audit_messages):

    def jdump(obj, indent=2):
        return json.dumps(obj, indent=indent, ensure_ascii=False)

    # Format audit messages for JS
    msg_lines = "\n".join(f"  [{json.dumps(lvl)}, {json.dumps(msg)}]," for lvl, msg in audit_messages)

    js = f"""// AUTO-GENERATED by scripts/generate_seed_data.py — DO NOT EDIT MANUALLY
// Generated: {iso(TODAY)}
// Coverage : 30 days ({iso(DAY_0)} → {iso(TODAY)})
// Incidents: Day 12 (GenBI API Timeout), Day 20 (Travel Rate Limit), Day 25 (MathAgent OOM)
// Migration : Day 15 — gpt-4-0613 → gpt-4o

// ── Daily Cost & Token Trend (30 days) ──────────────────────────────────────
export const DAILY_COST_DATA_30 = {jdump(daily_cost)};

// ── Per-Agent Cost Totals (30-day) ───────────────────────────────────────────
export const AGENT_COST_METRICS = {jdump(agent_metrics)};

// ── Token Usage by Period ────────────────────────────────────────────────────
export const TOKEN_USAGE = {jdump(token_usage)};

// ── Model Usage Breakdown (30 days, pre + post migration) ────────────────────
export const MODEL_BREAKDOWN = {jdump(model_breakdown)};

// ── Critical & Warning Alerts ────────────────────────────────────────────────
export const CRITICAL_ALERTS = {jdump(critical)};

export const WARNING_ALERTS = {jdump(warning)};

// ── Portal Activity Logs (Logs.jsx) ─────────────────────────────────────────
export const PORTAL_LOGS = {jdump(portal_logs)};

// ── Rich Audit Traces per Agent (Audit.jsx) ──────────────────────────────────
export const AUDIT_TRACES = {jdump(audit_traces)};

// ── Audit Log Message Templates (Audit.jsx rotating pool) ───────────────────
// Each entry: [level, message_template]
export const AUDIT_MESSAGES = [
{msg_lines}
];
"""
    path.write_text(js, encoding="utf-8")
    print(f"✓ Wrote {path}  ({path.stat().st_size // 1024} KB)")


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    print("VeriForge Ops — Synthetic Dataset Generator")
    print(f"  Period : {iso(DAY_0)} → {iso(TODAY)} (30 days)")
    print(f"  Agents : {', '.join(a['name'] for a in AGENTS)}")
    print()

    # Must run first — all build_* functions consume random state after this
    _precompute_day_mults()

    print("Generating daily cost data …")
    daily_cost = build_daily_cost_data()

    print("Generating agent cost metrics …")
    agent_metrics = build_agent_cost_metrics()

    print("Generating token usage periods …")
    token_usage = build_token_usage(agent_metrics)

    print("Generating model breakdown …")
    model_breakdown = build_model_breakdown()

    print("Generating alerts …")
    critical, warning = build_alerts()

    print("Generating portal activity logs …")
    portal_logs = build_portal_logs()

    print("Generating audit traces …")
    audit_traces = build_audit_traces()

    audit_messages = build_audit_messages()

    out_path = Path(__file__).parent.parent / "src" / "mock_data.js"
    write_js(out_path, daily_cost, agent_metrics, token_usage,
             model_breakdown, critical, warning, portal_logs,
             audit_traces, audit_messages)

    print()
    print("Summary")
    print(f"  Daily cost rows    : {len(daily_cost)}")
    print(f"  Agent metrics      : {len(agent_metrics)}")
    print(f"  Critical alerts    : {len(critical)}")
    print(f"  Warning alerts     : {len(warning)}")
    print(f"  Portal log entries : {len(portal_logs)}")
    print(f"  Audit trace agents : {len(audit_traces)}")
    total_sessions = sum(len(v) for v in audit_traces.values())
    total_steps    = sum(len(s["thought_steps"]) for v in audit_traces.values() for s in v)
    print(f"  Total sessions     : {total_sessions}")
    print(f"  Total thought steps: {total_steps}")
    print()
    print("Done. Import from src/mock_data.js in your React components.")


if __name__ == "__main__":
    main()
