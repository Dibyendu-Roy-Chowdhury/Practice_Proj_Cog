# VeriForge Ops — Cloud-Native Data Ingestion Schema
## Entity / Attribute / Table / Column / Data Type Reference
### Native Sources: AWS · Azure · GCP → VeriForge Ops Input

**Version:** 1.0  
**Date:** 2026-05-22  
**Scope:** All cloud-native data that must be captured from AWS, Azure, and GCP to populate VeriForge Ops entities

---

## Contents

1. [Architecture Overview](#1-architecture-overview)
2. [AWS Native Data Sources](#2-aws-native-data-sources)
   - 2.1 AWS Bedrock — Model Invocations
   - 2.2 AWS CloudWatch — Metrics & Logs
   - 2.3 AWS CloudTrail — API Audit Events
   - 2.4 AWS Cost Explorer — Cost & Usage
   - 2.5 AWS IAM — Identity & Access
   - 2.6 AWS Lambda / ECS — Compute Runtime
3. [Azure Native Data Sources](#3-azure-native-data-sources)
   - 3.1 Azure OpenAI — Model Invocations
   - 3.2 Azure Monitor — Metrics & Logs
   - 3.3 Azure Activity Log — Audit Events
   - 3.4 Azure Cost Management — Cost & Usage
   - 3.5 Azure Active Directory — Identity & Access
   - 3.6 Azure Functions / Container Apps — Compute Runtime
4. [GCP Native Data Sources](#4-gcp-native-data-sources)
   - 4.1 GCP Vertex AI — Model Predictions
   - 4.2 GCP Cloud Monitoring — Metrics & Logs
   - 4.3 GCP Cloud Audit Logs — Audit Events
   - 4.4 GCP Cloud Billing — Cost & Usage
   - 4.5 GCP IAM — Identity & Access
   - 4.6 GCP Cloud Functions / Cloud Run — Compute Runtime
5. [Cross-Cloud Normalized Schema](#5-cross-cloud-normalized-schema)
6. [VeriForge Ops Entity Mapping](#6-veriforge-ops-entity-mapping)
7. [Ingestion Frequency & Latency SLAs](#7-ingestion-frequency--latency-slas)

---

## 1. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                        CLOUD PROVIDERS                              │
│                                                                     │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────────────┐   │
│  │     AWS      │   │    Azure     │   │        GCP           │   │
│  │  Bedrock     │   │  Azure OAI   │   │    Vertex AI         │   │
│  │  CloudWatch  │   │  Monitor     │   │  Cloud Monitoring    │   │
│  │  CloudTrail  │   │  Activity    │   │  Cloud Audit Logs    │   │
│  │  Cost Expl.  │   │  Cost Mgmt   │   │  Cloud Billing       │   │
│  │  IAM         │   │  Azure AD    │   │  GCP IAM             │   │
│  │  Lambda/ECS  │   │  Functions   │   │  Cloud Run           │   │
│  └──────┬───────┘   └──────┬───────┘   └──────────┬───────────┘   │
└─────────┼─────────────────┼──────────────────────┼───────────────-┘
          │                 │                       │
          ▼                 ▼                       ▼
┌─────────────────────────────────────────────────────────────────────┐
│               VeriForge Ops — Ingestion Layer                       │
│   (Pull: SDK polling / Push: EventBridge / Event Grid / Pub/Sub)    │
│                                                                     │
│  cloud_invocations  cloud_metrics  cloud_costs  cloud_audit_events  │
│  cloud_iam_snapshot  cloud_compute_events  cloud_security_findings  │
└─────────────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────────────┐
│              VeriForge Ops — MongoDB Collections                    │
│  agents · alerts · anomalies · episode_costs · agent_cost_metrics   │
│  deployments · circuit_breakers · hitl_queue · trust_interceptors   │
│  inter_agent_messages · portal_logs · self_healing_rules            │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 2. AWS Native Data Sources

### 2.1 AWS Bedrock — Model Invocations

**AWS API:** `bedrock-runtime` `InvokeModel` / `InvokeModelWithResponseStream`  
**CloudWatch Namespace:** `AWS/Bedrock`  
**Model Invocation Logging:** S3 + CloudWatch Logs (must be enabled per model)  
**VeriForge Entities Fed:** `agents`, `alerts`, `anomalies`, `episode_costs`, `agent_cost_metrics`, `circuit_breakers`

#### Table: `aws_bedrock_invocations`

| Column | Data Type | Nullable | Source Field | Description |
|--------|-----------|----------|--------------|-------------|
| `invocation_id` | VARCHAR(128) | NO | `requestId` (CloudWatch log) | Unique per API call |
| `agent_id` | VARCHAR(64) | NO | Custom tag on request / log metadata | Maps to VeriForge agent_id |
| `aws_account_id` | VARCHAR(12) | NO | `accountId` (CloudWatch log) | 12-digit AWS account |
| `aws_region` | VARCHAR(32) | NO | `awsRegion` | e.g., `us-east-1` |
| `model_id` | VARCHAR(128) | NO | `modelId` | Full Bedrock model ARN/ID e.g. `anthropic.claude-3-5-sonnet-20241022-v2:0` |
| `model_provider` | VARCHAR(32) | NO | Parsed from `modelId` prefix | `anthropic`, `amazon`, `meta`, `cohere` |
| `invocation_timestamp` | TIMESTAMP(6) | NO | `timestamp` (ISO-8601) | UTC microsecond precision |
| `input_token_count` | INTEGER | NO | `inputTokenCount` (invocation log) | Prompt tokens consumed |
| `output_token_count` | INTEGER | NO | `outputTokenCount` | Completion tokens generated |
| `total_token_count` | INTEGER | COMPUTED | `inputTokenCount + outputTokenCount` | Total tokens |
| `latency_ms` | INTEGER | NO | `invocationLatency` (CW metric) | End-to-end latency in ms |
| `first_byte_latency_ms` | INTEGER | YES | `firstByteLatency` | Time to first token (streaming) |
| `input_cost_usd` | DECIMAL(12,8) | NO | Computed from model pricing table | Cost of prompt tokens |
| `output_cost_usd` | DECIMAL(12,8) | NO | Computed from model pricing table | Cost of completion tokens |
| `total_cost_usd` | DECIMAL(12,8) | NO | `input_cost_usd + output_cost_usd` | Total invocation cost |
| `http_status_code` | SMALLINT | NO | `httpStatusCode` | 200, 400, 429, 500, etc. |
| `error_code` | VARCHAR(128) | YES | `errorCode` | e.g., `ThrottlingException` |
| `error_message` | TEXT | YES | `errorMessage` | Human-readable error |
| `stop_reason` | VARCHAR(32) | YES | `stopReason` | `end_turn`, `max_tokens`, `stop_sequence` |
| `tool_use_count` | SMALLINT | NO | Count of `tool_use` blocks in response | Number of tools invoked |
| `tool_names` | JSONB | YES | Extracted from response body tool_use blocks | Array of tool name strings |
| `streaming` | BOOLEAN | NO | `streamingEnabled` flag | Whether streaming was used |
| `guardrail_id` | VARCHAR(64) | YES | `guardrailIdentifier` | Bedrock Guardrail applied |
| `guardrail_action` | VARCHAR(32) | YES | `action` in guardrail trace | `NONE`, `INTERVENED`, `BLOCKED` |
| `guardrail_blocked_topics` | JSONB | YES | Guardrail trace blocked topics | Array of blocked topic names |
| `guardrail_pii_detected` | BOOLEAN | YES | Guardrail PII entity detections | Whether PII was found |
| `session_id` | VARCHAR(128) | YES | Custom header / tag | Logical session grouping |
| `episode_id` | VARCHAR(128) | YES | Custom application tag | Maps to VeriForge episode_id |
| `trace_id` | VARCHAR(256) | YES | `X-Amzn-Trace-Id` | AWS X-Ray trace |
| `log_group` | VARCHAR(256) | YES | CloudWatch log group name | For log linkback |
| `log_stream` | VARCHAR(256) | YES | CloudWatch log stream name | For log linkback |
| `cross_account` | BOOLEAN | NO | Assumed-role ARN in context | Whether cross-account access |
| `caller_arn` | VARCHAR(512) | YES | `callerArn` in CloudTrail | IAM principal making the call |
| `ingested_at` | TIMESTAMP | NO | System | VeriForge ingestion timestamp |

**CloudWatch Metrics (pull via `GetMetricStatistics`):**

#### Table: `aws_bedrock_cw_metrics`

| Column | Data Type | Nullable | CW Metric Name | Statistic |
|--------|-----------|----------|----------------|-----------|
| `metric_id` | VARCHAR(64) | NO | Synthetic PK | — |
| `agent_id` | VARCHAR(64) | NO | Dimension: `AgentId` tag | — |
| `model_id` | VARCHAR(128) | NO | Dimension: `ModelId` | — |
| `aws_account_id` | VARCHAR(12) | NO | Dimension: `AccountId` | — |
| `aws_region` | VARCHAR(32) | NO | Dimension: `Region` | — |
| `period_start` | TIMESTAMP | NO | MetricDataQuery StartTime | — |
| `period_end` | TIMESTAMP | NO | MetricDataQuery EndTime | — |
| `period_seconds` | INTEGER | NO | `Period` (60, 300, 3600) | — |
| `invocation_count` | INTEGER | NO | `Invocations` | Sum |
| `error_count` | INTEGER | NO | `InvocationClientErrors` + `InvocationServerErrors` | Sum |
| `client_error_count` | INTEGER | NO | `InvocationClientErrors` | Sum |
| `server_error_count` | INTEGER | NO | `InvocationServerErrors` | Sum |
| `throttle_count` | INTEGER | NO | `InvocationThrottles` | Sum |
| `latency_p50_ms` | DECIMAL(10,2) | YES | `InvocationLatency` | p50 |
| `latency_p90_ms` | DECIMAL(10,2) | YES | `InvocationLatency` | p90 |
| `latency_p99_ms` | DECIMAL(10,2) | YES | `InvocationLatency` | p99 |
| `input_token_sum` | BIGINT | NO | `InputTokenCount` | Sum |
| `output_token_sum` | BIGINT | NO | `OutputTokenCount` | Sum |
| `ingested_at` | TIMESTAMP | NO | System | — |

---

### 2.2 AWS CloudWatch — Metrics & Logs

**VeriForge Entities Fed:** `alerts`, `anomalies`, `portal_logs`, `self_healing_rules`

#### Table: `aws_cloudwatch_alarms`

| Column | Data Type | Nullable | Source Field | Description |
|--------|-----------|----------|--------------|-------------|
| `alarm_arn` | VARCHAR(512) | NO | `AlarmArn` | Unique alarm identifier |
| `alarm_name` | VARCHAR(256) | NO | `AlarmName` | Human-readable name |
| `alarm_description` | TEXT | YES | `AlarmDescription` | — |
| `agent_id` | VARCHAR(64) | YES | Tag `veriforge:agent_id` on alarm | Linked agent |
| `aws_account_id` | VARCHAR(12) | NO | From ARN | — |
| `aws_region` | VARCHAR(32) | NO | From ARN | — |
| `metric_name` | VARCHAR(256) | NO | `MetricName` | e.g., `InvocationLatency` |
| `namespace` | VARCHAR(256) | NO | `Namespace` | e.g., `AWS/Bedrock` |
| `dimensions` | JSONB | NO | `Dimensions` array | Key-value dimension pairs |
| `state_value` | VARCHAR(16) | NO | `StateValue` | `OK`, `ALARM`, `INSUFFICIENT_DATA` |
| `state_reason` | TEXT | YES | `StateReason` | Human explanation of state |
| `state_updated_timestamp` | TIMESTAMP | NO | `StateUpdatedTimestamp` | Last state change time |
| `threshold` | DECIMAL(20,6) | YES | `Threshold` | Numeric threshold value |
| `comparison_operator` | VARCHAR(64) | YES | `ComparisonOperator` | e.g., `GreaterThanThreshold` |
| `evaluation_periods` | INTEGER | YES | `EvaluationPeriods` | — |
| `period_seconds` | INTEGER | YES | `Period` | Metric evaluation window |
| `statistic` | VARCHAR(32) | YES | `Statistic` | Sum/Average/Max/Min/p99 |
| `treat_missing_data` | VARCHAR(32) | YES | `TreatMissingData` | `notBreaching`, `breaching` |
| `severity_tag` | VARCHAR(16) | YES | Tag `veriforge:severity` | `Critical`, `Warning`, `Info` |
| `ingested_at` | TIMESTAMP | NO | System | — |

#### Table: `aws_cloudwatch_log_events`

| Column | Data Type | Nullable | Source Field | Description |
|--------|-----------|----------|--------------|-------------|
| `event_id` | VARCHAR(128) | NO | `eventId` | CW-assigned event ID |
| `log_group` | VARCHAR(256) | NO | `logGroupName` | Log group |
| `log_stream` | VARCHAR(256) | NO | `logStreamName` | Log stream |
| `agent_id` | VARCHAR(64) | YES | Parsed from log or tag | — |
| `aws_account_id` | VARCHAR(12) | NO | — | — |
| `aws_region` | VARCHAR(32) | NO | — | — |
| `timestamp` | TIMESTAMP(3) | NO | `timestamp` (epoch ms) | — |
| `ingestion_time` | TIMESTAMP(3) | NO | `ingestionTime` | When CW received the log |
| `message` | TEXT | NO | `message` | Raw log line |
| `log_level` | VARCHAR(16) | YES | Parsed from message | `INFO`, `WARN`, `ERROR` |
| `request_id` | VARCHAR(128) | YES | Parsed from message | Lambda/Bedrock request ID |
| `error_type` | VARCHAR(256) | YES | Parsed from message | Exception class name |
| `ingested_at` | TIMESTAMP | NO | System | — |

---

### 2.3 AWS CloudTrail — API Audit Events

**VeriForge Entities Fed:** `portal_logs`, `intervention_logs`, `hitl_history`

#### Table: `aws_cloudtrail_events`

| Column | Data Type | Nullable | Source Field | Description |
|--------|-----------|----------|--------------|-------------|
| `event_id` | VARCHAR(128) | NO | `eventID` (UUID) | CloudTrail event UUID |
| `event_time` | TIMESTAMP | NO | `eventTime` | API call time (UTC) |
| `event_source` | VARCHAR(128) | NO | `eventSource` | e.g., `bedrock.amazonaws.com` |
| `event_name` | VARCHAR(128) | NO | `eventName` | API action e.g. `InvokeModel` |
| `event_category` | VARCHAR(32) | NO | `eventCategory` | `Management`, `Data` |
| `read_only` | BOOLEAN | NO | `readOnly` | Is the action read-only |
| `aws_region` | VARCHAR(32) | NO | `awsRegion` | — |
| `aws_account_id` | VARCHAR(12) | NO | From `recipientAccountId` | — |
| `source_ip_address` | VARCHAR(64) | YES | `sourceIPAddress` | Caller IP or AWS service |
| `user_agent` | TEXT | YES | `userAgent` | SDK/CLI version string |
| `user_type` | VARCHAR(32) | YES | `userIdentity.type` | `IAMUser`, `AssumedRole`, `FederatedUser` |
| `principal_id` | VARCHAR(256) | YES | `userIdentity.principalId` | — |
| `arn` | VARCHAR(512) | YES | `userIdentity.arn` | Caller ARN |
| `account_id` | VARCHAR(12) | YES | `userIdentity.accountId` | Calling account |
| `session_mfa` | BOOLEAN | YES | `userIdentity.sessionContext.attributes.mfaAuthenticated` | — |
| `assumed_role_arn` | VARCHAR(512) | YES | `userIdentity.sessionContext.sessionIssuer.arn` | Role assumed |
| `request_id` | VARCHAR(128) | YES | `requestID` | — |
| `request_parameters` | JSONB | YES | `requestParameters` | Sanitized request body |
| `response_elements` | JSONB | YES | `responseElements` | Sanitized response |
| `error_code` | VARCHAR(128) | YES | `errorCode` | If request failed |
| `error_message` | TEXT | YES | `errorMessage` | If request failed |
| `resources` | JSONB | YES | `resources` array | ARNs of touched resources |
| `agent_id` | VARCHAR(64) | YES | Derived from resources or tags | VeriForge agent reference |
| `ingested_at` | TIMESTAMP | NO | System | — |

---

### 2.4 AWS Cost Explorer — Cost & Usage

**AWS API:** `ce:GetCostAndUsage`, `ce:GetCostAndUsageWithResources`  
**VeriForge Entities Fed:** `agent_cost_metrics`, `daily_cost_metrics`, `episode_costs`

#### Table: `aws_cost_usage`

| Column | Data Type | Nullable | Source Field | Description |
|--------|-----------|----------|--------------|-------------|
| `cost_record_id` | VARCHAR(128) | NO | Synthetic PK | — |
| `aws_account_id` | VARCHAR(12) | NO | `LinkedAccount` dimension | — |
| `aws_region` | VARCHAR(32) | YES | `Region` dimension | — |
| `service` | VARCHAR(128) | NO | `SERVICE` dimension | e.g., `Amazon Bedrock` |
| `usage_type` | VARCHAR(256) | YES | `USAGE_TYPE` dimension | e.g., `USE1-InputTokens-Claude` |
| `operation` | VARCHAR(128) | YES | `OPERATION` dimension | e.g., `InvokeModel` |
| `resource_id` | VARCHAR(512) | YES | `RESOURCE_ID` dimension | Model ARN or Lambda ARN |
| `agent_id` | VARCHAR(64) | YES | Cost allocation tag `veriforge:agent_id` | — |
| `period_start` | DATE | NO | `TimePeriod.Start` | — |
| `period_end` | DATE | NO | `TimePeriod.End` | — |
| `granularity` | VARCHAR(8) | NO | `Granularity` | `DAILY`, `MONTHLY`, `HOURLY` |
| `blended_cost_usd` | DECIMAL(16,8) | NO | `BlendedCost.Amount` | — |
| `unblended_cost_usd` | DECIMAL(16,8) | NO | `UnblendedCost.Amount` | Actual on-demand cost |
| `amortized_cost_usd` | DECIMAL(16,8) | YES | `AmortizedCost.Amount` | RI/SP amortized |
| `usage_quantity` | DECIMAL(20,4) | NO | `UsageQuantity.Amount` | Tokens, requests, GB, etc. |
| `usage_unit` | VARCHAR(64) | YES | `UsageQuantity.Unit` | `Tokens`, `Requests`, etc. |
| `currency` | VARCHAR(8) | NO | `BlendedCost.Unit` | `USD` |
| `input_token_count` | BIGINT | YES | Derived from `usage_type` for token-type rows | — |
| `output_token_count` | BIGINT | YES | Derived from `usage_type` | — |
| `cost_allocation_tags` | JSONB | YES | `Tags` from GroupBy | All cost allocation tags |
| `ingested_at` | TIMESTAMP | NO | System | — |

#### Table: `aws_cost_budgets`

| Column | Data Type | Nullable | Source Field | Description |
|--------|-----------|----------|--------------|-------------|
| `budget_name` | VARCHAR(256) | NO | `BudgetName` | — |
| `aws_account_id` | VARCHAR(12) | NO | — | — |
| `agent_id` | VARCHAR(64) | YES | Tag-based filter match | — |
| `budget_type` | VARCHAR(32) | NO | `BudgetType` | `COST`, `USAGE`, `SAVINGS_PLANS_UTILIZATION` |
| `budget_limit_usd` | DECIMAL(16,4) | YES | `BudgetLimit.Amount` | Monthly budget cap |
| `actual_spend_usd` | DECIMAL(16,8) | NO | `CalculatedSpend.ActualSpend.Amount` | Current MTD spend |
| `forecasted_spend_usd` | DECIMAL(16,8) | YES | `CalculatedSpend.ForecastedSpend.Amount` | Projected month-end |
| `period_start` | DATE | NO | `TimePeriod.Start` | — |
| `period_end` | DATE | NO | `TimePeriod.End` | — |
| `threshold_percentage` | DECIMAL(5,2) | YES | `NotificationsWithSubscribers[].Notification.Threshold` | Alert threshold % |
| `budget_exceeded` | BOOLEAN | NO | Computed | actual > limit |
| `ingested_at` | TIMESTAMP | NO | System | — |

---

### 2.5 AWS IAM — Identity & Access

**VeriForge Entities Fed:** `agents` (credential linkage), `portal_logs`

#### Table: `aws_iam_roles`

| Column | Data Type | Nullable | Source Field | Description |
|--------|-----------|----------|--------------|-------------|
| `role_arn` | VARCHAR(512) | NO | `Arn` | Role ARN (PK) |
| `role_name` | VARCHAR(64) | NO | `RoleName` | — |
| `role_id` | VARCHAR(32) | NO | `RoleId` | Unique stable ID |
| `aws_account_id` | VARCHAR(12) | NO | Parsed from ARN | — |
| `aws_region` | VARCHAR(32) | NO | — | — |
| `agent_id` | VARCHAR(64) | YES | Tag `veriforge:agent_id` | Which agent uses this role |
| `description` | TEXT | YES | `Description` | — |
| `path` | VARCHAR(512) | NO | `Path` | IAM path |
| `max_session_duration_sec` | INTEGER | YES | `MaxSessionDuration` | — |
| `assume_role_policy` | JSONB | NO | `AssumeRolePolicyDocument` | Trust policy doc |
| `managed_policy_arns` | JSONB | YES | `AttachedManagedPolicies` | List of attached policies |
| `inline_policies` | JSONB | YES | `RolePolicyList` | Inline policy documents |
| `last_used_date` | DATE | YES | `RoleLastUsed.LastUsedDate` | Last usage date |
| `last_used_region` | VARCHAR(32) | YES | `RoleLastUsed.Region` | — |
| `create_date` | TIMESTAMP | NO | `CreateDate` | — |
| `tags` | JSONB | YES | `Tags` array | All IAM role tags |
| `permission_boundary_arn` | VARCHAR(512) | YES | `PermissionsBoundary.PermissionsBoundaryArn` | — |
| `ingested_at` | TIMESTAMP | NO | System | — |

---

### 2.6 AWS Lambda / ECS — Compute Runtime

**VeriForge Entities Fed:** `agents`, `deployments`, `episode_costs`, `alerts`

#### Table: `aws_lambda_functions`

| Column | Data Type | Nullable | Source Field | Description |
|--------|-----------|----------|--------------|-------------|
| `function_arn` | VARCHAR(512) | NO | `FunctionArn` | Full function ARN |
| `function_name` | VARCHAR(64) | NO | `FunctionName` | — |
| `function_version` | VARCHAR(16) | NO | `Version` | `$LATEST` or numeric |
| `agent_id` | VARCHAR(64) | YES | Tag `veriforge:agent_id` | Linked agent |
| `aws_account_id` | VARCHAR(12) | NO | Parsed from ARN | — |
| `aws_region` | VARCHAR(32) | NO | — | — |
| `runtime` | VARCHAR(32) | NO | `Runtime` | `python3.12`, `nodejs22.x` |
| `handler` | VARCHAR(128) | NO | `Handler` | — |
| `code_size_bytes` | BIGINT | NO | `CodeSize` | — |
| `description` | TEXT | YES | `Description` | — |
| `memory_size_mb` | INTEGER | NO | `MemorySize` | Configured memory |
| `timeout_sec` | INTEGER | NO | `Timeout` | Function timeout |
| `architecture` | VARCHAR(8) | NO | `Architectures[0]` | `x86_64`, `arm64` |
| `last_modified` | TIMESTAMP | NO | `LastModified` | Code/config update time |
| `state` | VARCHAR(32) | YES | `State` | `Active`, `Pending`, `Failed` |
| `state_reason` | TEXT | YES | `StateReason` | — |
| `role_arn` | VARCHAR(512) | YES | `Role` | Execution role |
| `environment_vars` | JSONB | YES | `Environment.Variables` (redacted) | Non-secret env vars |
| `layers` | JSONB | YES | `Layers` | List of layer ARNs |
| `vpc_config` | JSONB | YES | `VpcConfig` | VPC/subnet/security groups |
| `reserved_concurrency` | INTEGER | YES | `ReservedConcurrentExecutions` | — |
| `tags` | JSONB | YES | `Tags` | All function tags |
| `ingested_at` | TIMESTAMP | NO | System | — |

#### Table: `aws_lambda_invocation_metrics`

| Column | Data Type | Nullable | CW Metric | Statistic |
|--------|-----------|----------|-----------|-----------|
| `metric_id` | VARCHAR(64) | NO | — | — |
| `function_name` | VARCHAR(64) | NO | Dimension: `FunctionName` | — |
| `agent_id` | VARCHAR(64) | YES | Derived from tags | — |
| `aws_account_id` | VARCHAR(12) | NO | — | — |
| `aws_region` | VARCHAR(32) | NO | — | — |
| `period_start` | TIMESTAMP | NO | — | — |
| `period_end` | TIMESTAMP | NO | — | — |
| `period_seconds` | INTEGER | NO | — | — |
| `invocation_count` | BIGINT | NO | `Invocations` | Sum |
| `error_count` | BIGINT | NO | `Errors` | Sum |
| `throttle_count` | BIGINT | NO | `Throttles` | Sum |
| `concurrent_executions` | INTEGER | YES | `ConcurrentExecutions` | Max |
| `duration_p50_ms` | DECIMAL(10,2) | YES | `Duration` | p50 |
| `duration_p90_ms` | DECIMAL(10,2) | YES | `Duration` | p90 |
| `duration_p99_ms` | DECIMAL(10,2) | YES | `Duration` | p99 |
| `duration_max_ms` | DECIMAL(10,2) | YES | `Duration` | Max |
| `init_duration_p50_ms` | DECIMAL(10,2) | YES | `InitDuration` | p50 (cold start) |
| `memory_used_mb_avg` | DECIMAL(8,2) | YES | `MemoryUsed` (Lambda Insights) | Average |
| `ingested_at` | TIMESTAMP | NO | System | — |

---

## 3. Azure Native Data Sources

### 3.1 Azure OpenAI — Model Invocations

**Azure API:** `Azure OpenAI REST API` / `azure-ai-inference` SDK  
**Diagnostic Logs:** `AzureOpenAIRequests` (via Diagnostic Settings → Log Analytics)  
**VeriForge Entities Fed:** `agents`, `episode_costs`, `agent_cost_metrics`, `alerts`, `anomalies`

#### Table: `azure_openai_invocations`

| Column | Data Type | Nullable | Source Field | Description |
|--------|-----------|----------|--------------|-------------|
| `invocation_id` | VARCHAR(128) | NO | `CorrelationId` / `requestId` | Unique per API call |
| `agent_id` | VARCHAR(64) | NO | Custom header `x-veriforge-agent-id` or tag | Maps to VeriForge agent_id |
| `azure_subscription_id` | VARCHAR(36) | NO | From resource context | GUID |
| `azure_resource_group` | VARCHAR(128) | NO | Resource group name | — |
| `azure_resource_name` | VARCHAR(128) | NO | OpenAI resource/account name | — |
| `azure_region` | VARCHAR(64) | NO | `location` | e.g., `eastus`, `westeurope` |
| `deployment_name` | VARCHAR(128) | NO | `deployment-id` in request | Named model deployment |
| `model_id` | VARCHAR(128) | NO | `model` from response | e.g., `gpt-4o`, `gpt-4-turbo` |
| `api_version` | VARCHAR(16) | YES | `api-version` query param | e.g., `2024-10-21` |
| `invocation_timestamp` | TIMESTAMP(6) | NO | `TimeGenerated` or response header | UTC |
| `prompt_tokens` | INTEGER | NO | `usage.prompt_tokens` | — |
| `completion_tokens` | INTEGER | NO | `usage.completion_tokens` | — |
| `total_tokens` | INTEGER | NO | `usage.total_tokens` | — |
| `cached_tokens` | INTEGER | YES | `usage.prompt_tokens_details.cached_tokens` | Prompt cache hits |
| `reasoning_tokens` | INTEGER | YES | `usage.completion_tokens_details.reasoning_tokens` | o1-series reasoning |
| `latency_ms` | INTEGER | NO | Response time header or log | End-to-end latency |
| `input_cost_usd` | DECIMAL(12,8) | NO | Computed from Azure pricing | — |
| `output_cost_usd` | DECIMAL(12,8) | NO | Computed from Azure pricing | — |
| `total_cost_usd` | DECIMAL(12,8) | NO | Sum of above | — |
| `http_status_code` | SMALLINT | NO | HTTP response status | — |
| `error_code` | VARCHAR(128) | YES | `error.code` | e.g., `content_filter` |
| `finish_reason` | VARCHAR(32) | YES | `choices[0].finish_reason` | `stop`, `length`, `content_filter` |
| `tool_calls_count` | SMALLINT | NO | Count of `tool_calls` in message | — |
| `tool_names` | JSONB | YES | Extracted from response | Array of function names |
| `content_filter_result` | JSONB | YES | `prompt_filter_results` | Azure content safety results |
| `content_filter_severity` | VARCHAR(16) | YES | Max severity across categories | `safe`, `low`, `medium`, `high` |
| `content_filter_action` | VARCHAR(16) | YES | `filtered` or `detected` | — |
| `stream_enabled` | BOOLEAN | NO | From request body `stream` flag | — |
| `trace_id` | VARCHAR(128) | YES | Custom trace header | — |
| `ingested_at` | TIMESTAMP | NO | System | — |

#### Table: `azure_openai_cw_metrics`  
*(pulled via Azure Monitor `MetricDefinitions` + `MetricList`)*

| Column | Data Type | Nullable | Azure Metric Name | Aggregation |
|--------|-----------|----------|-------------------|-------------|
| `metric_id` | VARCHAR(64) | NO | — | — |
| `agent_id` | VARCHAR(64) | YES | Tag `veriforge_agent_id` | — |
| `azure_resource_id` | VARCHAR(512) | NO | Full resource ID | — |
| `azure_region` | VARCHAR(64) | NO | — | — |
| `deployment_name` | VARCHAR(128) | YES | Dimension: `ApiName` / `ModelDeploymentName` | — |
| `period_start` | TIMESTAMP | NO | — | — |
| `period_end` | TIMESTAMP | NO | — | — |
| `period_seconds` | INTEGER | NO | — | — |
| `call_count` | INTEGER | NO | `AzureOpenAIRequests` | Sum |
| `prompt_token_count` | BIGINT | NO | `PromptTokensUsed` | Sum |
| `completion_token_count` | BIGINT | NO | `CompletionTokensUsed` | Sum |
| `fine_tuned_training_hours` | DECIMAL(8,4) | YES | `FineTunedTrainingHours` | Sum |
| `latency_p50_ms` | DECIMAL(10,2) | YES | `E2ELatency` | p50 |
| `latency_p90_ms` | DECIMAL(10,2) | YES | `E2ELatency` | p90 |
| `latency_p99_ms` | DECIMAL(10,2) | YES | `E2ELatency` | p99 |
| `content_filter_block_count` | INTEGER | YES | `ContentFilterRequestsBlockedCount` | Sum |
| `provisioned_managed_utilization` | DECIMAL(5,2) | YES | `ProvisionedManagedUtilizationV2` | Average |
| `ingested_at` | TIMESTAMP | NO | System | — |

---

### 3.2 Azure Monitor — Metrics & Logs

**VeriForge Entities Fed:** `alerts`, `anomalies`, `portal_logs`

#### Table: `azure_monitor_alerts`

| Column | Data Type | Nullable | Source Field | Description |
|--------|-----------|----------|--------------|-------------|
| `alert_id` | VARCHAR(512) | NO | `id` (Resource Manager ID) | Full alert resource ID |
| `alert_name` | VARCHAR(256) | NO | `name` | — |
| `severity` | VARCHAR(8) | NO | `properties.severity` | `Sev0`–`Sev4` |
| `monitor_condition` | VARCHAR(16) | NO | `properties.monitorCondition` | `Fired`, `Resolved` |
| `alert_state` | VARCHAR(16) | NO | `properties.alertState` | `New`, `Acknowledged`, `Closed` |
| `azure_subscription_id` | VARCHAR(36) | NO | — | — |
| `azure_resource_group` | VARCHAR(128) | YES | `properties.essentials.targetResourceGroup` | — |
| `target_resource` | VARCHAR(512) | YES | `properties.essentials.targetResource` | Resource that fired alert |
| `target_resource_type` | VARCHAR(256) | YES | `properties.essentials.targetResourceType` | — |
| `agent_id` | VARCHAR(64) | YES | Tag `veriforge_agent_id` on target resource | — |
| `description` | TEXT | YES | `properties.essentials.description` | — |
| `signal_type` | VARCHAR(32) | YES | `properties.essentials.signalType` | `Metric`, `Log`, `Activity` |
| `fired_time` | TIMESTAMP | NO | `properties.essentials.startDateTime` | — |
| `resolved_time` | TIMESTAMP | YES | `properties.essentials.monitorConditionResolvedDateTime` | — |
| `context` | JSONB | YES | `properties.context` | Additional alert context |
| `suppression_expiry` | TIMESTAMP | YES | `properties.essentials.actionStatus.suppressionStatus` | — |
| `ingested_at` | TIMESTAMP | NO | System | — |

---

### 3.3 Azure Activity Log — Audit Events

**VeriForge Entities Fed:** `portal_logs`, `intervention_logs`

#### Table: `azure_activity_log_events`

| Column | Data Type | Nullable | Source Field | Description |
|--------|-----------|----------|--------------|-------------|
| `event_id` | VARCHAR(128) | NO | `eventDataId` (GUID) | — |
| `event_timestamp` | TIMESTAMP | NO | `eventTimestamp` | UTC |
| `submission_timestamp` | TIMESTAMP | YES | `submissionTimestamp` | When Azure recorded it |
| `operation_name` | VARCHAR(256) | NO | `operationName.value` | e.g., `Microsoft.CognitiveServices/accounts/write` |
| `operation_display` | VARCHAR(512) | YES | `operationName.localizedValue` | — |
| `resource_provider` | VARCHAR(128) | NO | `resourceProviderName.value` | e.g., `Microsoft.CognitiveServices` |
| `resource_type` | VARCHAR(256) | YES | `resourceType.value` | — |
| `resource_id` | VARCHAR(512) | NO | `resourceId` | Full ARM resource ID |
| `azure_subscription_id` | VARCHAR(36) | NO | `subscriptionId` | — |
| `azure_resource_group` | VARCHAR(128) | YES | `resourceGroupName` | — |
| `azure_region` | VARCHAR(64) | YES | `resourceLocation` | — |
| `agent_id` | VARCHAR(64) | YES | Derived from resource tag | — |
| `level` | VARCHAR(16) | NO | `level` | `Critical`, `Error`, `Warning`, `Informational`, `Verbose` |
| `status` | VARCHAR(32) | YES | `status.value` | `Succeeded`, `Failed`, `Started` |
| `caller` | VARCHAR(512) | YES | `caller` | UPN or service principal |
| `caller_ip` | VARCHAR(64) | YES | `httpRequest.clientIpAddress` | — |
| `correlation_id` | VARCHAR(128) | YES | `correlationId` | Cross-resource trace |
| `claims` | JSONB | YES | `claims` | JWT claim data (redacted) |
| `properties` | JSONB | YES | `properties` | Extended event data |
| `ingested_at` | TIMESTAMP | NO | System | — |

---

### 3.4 Azure Cost Management — Cost & Usage

**Azure API:** `Microsoft.CostManagement/query`  
**VeriForge Entities Fed:** `agent_cost_metrics`, `daily_cost_metrics`

#### Table: `azure_cost_usage`

| Column | Data Type | Nullable | Source Field | Description |
|--------|-----------|----------|--------------|-------------|
| `cost_record_id` | VARCHAR(128) | NO | Synthetic PK | — |
| `azure_subscription_id` | VARCHAR(36) | NO | `SubscriptionId` | — |
| `azure_resource_group` | VARCHAR(128) | YES | `ResourceGroup` dimension | — |
| `azure_region` | VARCHAR(64) | YES | `ResourceLocation` dimension | — |
| `service_name` | VARCHAR(128) | NO | `ServiceName` dimension | e.g., `Azure OpenAI Service` |
| `service_family` | VARCHAR(64) | YES | `ServiceFamily` dimension | e.g., `AI + Machine Learning` |
| `meter_name` | VARCHAR(256) | YES | `MeterName` | e.g., `GPT-4o Input Tokens` |
| `meter_category` | VARCHAR(128) | YES | `MeterCategory` | — |
| `meter_subcategory` | VARCHAR(128) | YES | `MeterSubcategory` | — |
| `resource_id` | VARCHAR(512) | YES | `ResourceId` | Full ARM resource ID |
| `resource_name` | VARCHAR(128) | YES | `ResourceName` | — |
| `resource_type` | VARCHAR(256) | YES | `ResourceType` | — |
| `agent_id` | VARCHAR(64) | YES | Tag `veriforge_agent_id` | — |
| `billing_period_start` | DATE | NO | `BillingPeriodStartDate` | — |
| `billing_period_end` | DATE | NO | `BillingPeriodEndDate` | — |
| `usage_date` | DATE | NO | `Date` dimension | — |
| `pre_tax_cost_usd` | DECIMAL(16,8) | NO | `PreTaxCost` | Actual cost |
| `usage_quantity` | DECIMAL(20,4) | NO | `UsageQuantity` | Token count, API calls, etc. |
| `usage_unit` | VARCHAR(64) | YES | `UnitOfMeasure` | — |
| `currency` | VARCHAR(8) | NO | `Currency` | `USD` |
| `tags` | JSONB | YES | `Tags` | All resource tags |
| `ingested_at` | TIMESTAMP | NO | System | — |

---

### 3.5 Azure Active Directory — Identity & Access

**VeriForge Entities Fed:** `agents` (service principal linkage), `portal_logs`

#### Table: `azure_aad_service_principals`

| Column | Data Type | Nullable | Source Field | Description |
|--------|-----------|----------|--------------|-------------|
| `object_id` | VARCHAR(36) | NO | `id` (GUID) | — |
| `app_id` | VARCHAR(36) | NO | `appId` (GUID) | Application (client) ID |
| `display_name` | VARCHAR(256) | NO | `displayName` | — |
| `azure_subscription_id` | VARCHAR(36) | YES | Scope context | — |
| `agent_id` | VARCHAR(64) | YES | Custom attribute / naming convention | — |
| `service_principal_type` | VARCHAR(32) | NO | `servicePrincipalType` | `Application`, `ManagedIdentity` |
| `managed_identity_type` | VARCHAR(32) | YES | From MSI metadata | `SystemAssigned`, `UserAssigned` |
| `enabled` | BOOLEAN | NO | `accountEnabled` | — |
| `homepage_url` | VARCHAR(512) | YES | `homepage` | — |
| `reply_urls` | JSONB | YES | `replyUrls` | — |
| `key_credentials` | JSONB | YES | `keyCredentials` (redacted) | Certificate info |
| `password_credentials` | JSONB | YES | `passwordCredentials` (expiry only) | Secret expiry dates |
| `app_roles` | JSONB | YES | `appRoles` | Role definitions |
| `oauth2_permissions` | JSONB | YES | `oauth2Permissions` | Delegated permissions |
| `assigned_roles` | JSONB | YES | From `roleAssignments` | Azure RBAC roles |
| `tags` | JSONB | YES | `tags` | — |
| `created_at` | TIMESTAMP | YES | `createdDateTime` | — |
| `ingested_at` | TIMESTAMP | NO | System | — |

---

### 3.6 Azure Functions / Container Apps — Compute Runtime

**VeriForge Entities Fed:** `agents`, `deployments`, `episode_costs`

#### Table: `azure_function_apps`

| Column | Data Type | Nullable | Source Field | Description |
|--------|-----------|----------|--------------|-------------|
| `resource_id` | VARCHAR(512) | NO | Full ARM ID | — |
| `name` | VARCHAR(64) | NO | `name` | Function app name |
| `azure_subscription_id` | VARCHAR(36) | NO | — | — |
| `azure_resource_group` | VARCHAR(128) | NO | — | — |
| `azure_region` | VARCHAR(64) | NO | `location` | — |
| `agent_id` | VARCHAR(64) | YES | Tag `veriforge_agent_id` | — |
| `kind` | VARCHAR(32) | NO | `kind` | `functionapp`, `functionapp,linux` |
| `runtime_stack` | VARCHAR(32) | NO | `siteConfig.linuxFxVersion` | `PYTHON|3.12`, `NODE|20-lts` |
| `sku_name` | VARCHAR(32) | NO | Hosting plan SKU | `Y1` (Consumption), `EP1`, `B1` |
| `state` | VARCHAR(16) | NO | `state` | `Running`, `Stopped`, `Unknown` |
| `last_modified` | TIMESTAMP | YES | `lastModifiedTimeUtc` | — |
| `enabled` | BOOLEAN | NO | `enabled` | — |
| `https_only` | BOOLEAN | NO | `httpsOnly` | — |
| `identity_type` | VARCHAR(32) | YES | `identity.type` | `SystemAssigned`, `UserAssigned` |
| `principal_id` | VARCHAR(36) | YES | `identity.principalId` | Managed identity object ID |
| `app_settings_keys` | JSONB | YES | `siteConfig.appSettings` (keys only) | Non-secret app setting names |
| `tags` | JSONB | YES | `tags` | — |
| `ingested_at` | TIMESTAMP | NO | System | — |

---

## 4. GCP Native Data Sources

### 4.1 GCP Vertex AI — Model Predictions

**GCP API:** `aiplatform.googleapis.com` — `projects.locations.endpoints.predict`  
**Audit Logs:** `cloudaudit.googleapis.com/data_access` for Vertex  
**VeriForge Entities Fed:** `agents`, `episode_costs`, `agent_cost_metrics`, `alerts`, `anomalies`

#### Table: `gcp_vertex_predictions`

| Column | Data Type | Nullable | Source Field | Description |
|--------|-----------|----------|--------------|-------------|
| `prediction_id` | VARCHAR(128) | NO | `X-GFE-Request-ID` / custom header | Unique per predict call |
| `agent_id` | VARCHAR(64) | NO | Custom HTTP header / resource label | Maps to VeriForge agent_id |
| `gcp_project_id` | VARCHAR(64) | NO | `projectsId` in resource path | — |
| `gcp_project_number` | VARCHAR(20) | NO | From project metadata | — |
| `gcp_location` | VARCHAR(64) | NO | `locationsId` | e.g., `us-central1` |
| `endpoint_id` | VARCHAR(64) | NO | `endpointsId` | Vertex endpoint ID |
| `model_id` | VARCHAR(256) | NO | `deployedModels[0].model` | Full model resource name |
| `model_name` | VARCHAR(128) | NO | `modelName` / `publisher_model` | e.g., `gemini-1.5-pro-002` |
| `publisher` | VARCHAR(64) | YES | Parsed from `model` path | `google`, `anthropic`, `meta` |
| `prediction_timestamp` | TIMESTAMP(6) | NO | `logName` timestamp / request time | UTC |
| `input_token_count` | INTEGER | NO | `usageMetadata.promptTokenCount` | — |
| `output_token_count` | INTEGER | NO | `usageMetadata.candidatesTokenCount` | — |
| `total_token_count` | INTEGER | NO | `usageMetadata.totalTokenCount` | — |
| `cached_content_token_count` | INTEGER | YES | `usageMetadata.cachedContentTokenCount` | Context cache usage |
| `latency_ms` | INTEGER | NO | Measured or from audit log | — |
| `input_cost_usd` | DECIMAL(12,8) | NO | Computed from GCP pricing | — |
| `output_cost_usd` | DECIMAL(12,8) | NO | Computed from GCP pricing | — |
| `total_cost_usd` | DECIMAL(12,8) | NO | Sum | — |
| `http_status` | SMALLINT | NO | gRPC/HTTP response code | 200, 429, 500, etc. |
| `grpc_status` | SMALLINT | YES | gRPC status code | 0=OK, 8=QUOTA_EXHAUSTED |
| `error_message` | TEXT | YES | Error detail from response | — |
| `finish_reason` | VARCHAR(32) | YES | `candidates[0].finishReason` | `STOP`, `MAX_TOKENS`, `SAFETY`, `RECITATION` |
| `safety_ratings` | JSONB | YES | `candidates[0].safetyRatings` | Array of category+probability |
| `safety_blocked` | BOOLEAN | NO | Any rating `BLOCK_*` | Content was safety-blocked |
| `function_calls_count` | SMALLINT | NO | Count of `functionCall` parts in response | — |
| `function_names` | JSONB | YES | Extracted function call names | — |
| `grounding_used` | BOOLEAN | YES | `groundingMetadata` present | — |
| `grounding_sources` | JSONB | YES | `groundingMetadata.groundingChunks` | Search/document grounding sources |
| `stream_enabled` | BOOLEAN | NO | `streamGenerateContent` endpoint used | — |
| `trace_id` | VARCHAR(128) | YES | `X-Cloud-Trace-Context` | — |
| `ingested_at` | TIMESTAMP | NO | System | — |

#### Table: `gcp_vertex_model_metrics`  
*(pulled via Cloud Monitoring `timeSeries.list`)*

| Column | Data Type | Nullable | Monitoring Metric | Reducer |
|--------|-----------|----------|-------------------|---------|
| `metric_id` | VARCHAR(64) | NO | — | — |
| `agent_id` | VARCHAR(64) | YES | Label `veriforge_agent_id` | — |
| `gcp_project_id` | VARCHAR(64) | NO | — | — |
| `gcp_location` | VARCHAR(64) | NO | `resource.location` | — |
| `endpoint_id` | VARCHAR(64) | NO | `resource.endpoint_id` | — |
| `model_id` | VARCHAR(256) | NO | `metric.model_id` | — |
| `period_start` | TIMESTAMP | NO | — | — |
| `period_end` | TIMESTAMP | NO | — | — |
| `period_seconds` | INTEGER | NO | — | — |
| `request_count` | BIGINT | NO | `aiplatform.googleapis.com/prediction/online/request_count` | Sum |
| `error_count` | BIGINT | NO | `aiplatform.googleapis.com/prediction/online/error_count` | Sum |
| `throttle_count` | BIGINT | YES | Quota exceeded errors | Sum |
| `latency_p50_ms` | DECIMAL(10,2) | YES | `aiplatform.googleapis.com/prediction/online/latencies` | PERCENTILE_50 |
| `latency_p95_ms` | DECIMAL(10,2) | YES | Same metric | PERCENTILE_95 |
| `latency_p99_ms` | DECIMAL(10,2) | YES | Same metric | PERCENTILE_99 |
| `token_count_input` | BIGINT | NO | `aiplatform.googleapis.com/prediction/online/token_count` (dimension: `token_type=input`) | Sum |
| `token_count_output` | BIGINT | NO | Same metric (dimension: `token_type=output`) | Sum |
| `ingested_at` | TIMESTAMP | NO | System | — |

---

### 4.2 GCP Cloud Monitoring — Metrics & Logs (Alerting Policies)

**VeriForge Entities Fed:** `alerts`, `portal_logs`

#### Table: `gcp_monitoring_alerts`

| Column | Data Type | Nullable | Source Field | Description |
|--------|-----------|----------|--------------|-------------|
| `incident_id` | VARCHAR(128) | NO | `name` (last path segment) | — |
| `policy_name` | VARCHAR(512) | NO | `policyName` (full resource name) | — |
| `policy_display_name` | VARCHAR(256) | NO | `policyDisplayName` | — |
| `condition_name` | VARCHAR(512) | YES | `conditionName` | — |
| `condition_display_name` | VARCHAR(256) | YES | `conditionDisplayName` | — |
| `gcp_project_id` | VARCHAR(64) | NO | From `policyName` path | — |
| `agent_id` | VARCHAR(64) | YES | Label `veriforge_agent_id` on resource | — |
| `state` | VARCHAR(16) | NO | `state` | `OPEN`, `CLOSED` |
| `severity` | VARCHAR(16) | YES | `severity` | `CRITICAL`, `ERROR`, `WARNING` |
| `start_time` | TIMESTAMP | NO | `startTime` | Incident start |
| `end_time` | TIMESTAMP | YES | `endTime` | Incident resolution (null if open) |
| `resource_type` | VARCHAR(128) | YES | `resource.type` | e.g., `aiplatform.googleapis.com/Endpoint` |
| `resource_labels` | JSONB | YES | `resource.labels` | — |
| `metric_type` | VARCHAR(256) | YES | `metric.type` | Full metric path |
| `metric_labels` | JSONB | YES | `metric.labels` | — |
| `documentation_content` | TEXT | YES | `documentation.content` | Runbook link or description |
| `url` | VARCHAR(512) | YES | `url` | GCP Console alert link |
| `ingested_at` | TIMESTAMP | NO | System | — |

#### Table: `gcp_cloud_log_events`

| Column | Data Type | Nullable | Source Field | Description |
|--------|-----------|----------|--------------|-------------|
| `log_entry_id` | VARCHAR(256) | NO | `insertId` | GCP-assigned unique ID |
| `log_name` | VARCHAR(512) | NO | `logName` | Full log resource name |
| `gcp_project_id` | VARCHAR(64) | NO | From `logName` | — |
| `agent_id` | VARCHAR(64) | YES | Label `veriforge_agent_id` | — |
| `timestamp` | TIMESTAMP(9) | NO | `timestamp` (RFC3339 nanoseconds) | — |
| `receive_timestamp` | TIMESTAMP(9) | NO | `receiveTimestamp` | When Logging received it |
| `severity` | VARCHAR(16) | NO | `severity` | `DEFAULT`, `DEBUG`, `INFO`, `NOTICE`, `WARNING`, `ERROR`, `CRITICAL`, `ALERT`, `EMERGENCY` |
| `resource_type` | VARCHAR(128) | NO | `resource.type` | e.g., `cloud_function`, `cloud_run_revision` |
| `resource_labels` | JSONB | NO | `resource.labels` | e.g., function_name, project_id |
| `text_payload` | TEXT | YES | `textPayload` | If log is plain text |
| `json_payload` | JSONB | YES | `jsonPayload` | If log is structured |
| `proto_payload_type` | VARCHAR(256) | YES | `protoPayload['@type']` | For audit log entries |
| `trace` | VARCHAR(256) | YES | `trace` | Cloud Trace resource path |
| `span_id` | VARCHAR(64) | YES | `spanId` | — |
| `labels` | JSONB | YES | `labels` | User/system log labels |
| `operation_id` | VARCHAR(256) | YES | `operation.id` | Streaming operation ID |
| `ingested_at` | TIMESTAMP | NO | System | — |

---

### 4.3 GCP Cloud Audit Logs — Audit Events

**VeriForge Entities Fed:** `portal_logs`, `intervention_logs`

#### Table: `gcp_audit_log_events`

| Column | Data Type | Nullable | Source Field | Description |
|--------|-----------|----------|--------------|-------------|
| `log_entry_id` | VARCHAR(256) | NO | `insertId` | — |
| `log_name` | VARCHAR(512) | NO | `logName` | — |
| `audit_log_type` | VARCHAR(32) | NO | Parsed from `logName` | `activity`, `data_access`, `system_event`, `policy` |
| `gcp_project_id` | VARCHAR(64) | NO | From resource | — |
| `agent_id` | VARCHAR(64) | YES | Derived from resource name | — |
| `timestamp` | TIMESTAMP(9) | NO | `timestamp` | — |
| `service_name` | VARCHAR(128) | NO | `protoPayload.serviceName` | e.g., `aiplatform.googleapis.com` |
| `method_name` | VARCHAR(256) | NO | `protoPayload.methodName` | e.g., `google.cloud.aiplatform.v1.PredictionService.Predict` |
| `resource_name` | VARCHAR(512) | YES | `protoPayload.resourceName` | Full resource path |
| `principal_email` | VARCHAR(256) | YES | `protoPayload.authenticationInfo.principalEmail` | Caller identity |
| `principal_subject` | VARCHAR(256) | YES | `protoPayload.authenticationInfo.principalSubject` | Workload identity |
| `service_account_key_name` | VARCHAR(512) | YES | `protoPayload.authenticationInfo.serviceAccountKeyName` | SA key used |
| `caller_ip` | VARCHAR(64) | YES | `protoPayload.requestMetadata.callerIp` | — |
| `caller_user_agent` | TEXT | YES | `protoPayload.requestMetadata.callerSuppliedUserAgent` | — |
| `authorization_info` | JSONB | YES | `protoPayload.authorizationInfo` | Permission check results |
| `request_metadata` | JSONB | YES | `protoPayload.requestMetadata` | — |
| `request` | JSONB | YES | `protoPayload.request` (sanitized) | — |
| `response` | JSONB | YES | `protoPayload.response` (sanitized) | — |
| `status_code` | INTEGER | YES | `protoPayload.status.code` | gRPC status code |
| `status_message` | TEXT | YES | `protoPayload.status.message` | Error details |
| `severity` | VARCHAR(16) | NO | `severity` | — |
| `ingested_at` | TIMESTAMP | NO | System | — |

---

### 4.4 GCP Cloud Billing — Cost & Usage

**GCP API:** Billing Export → BigQuery table `gcp_billing_export_resource_v1`  
**VeriForge Entities Fed:** `agent_cost_metrics`, `daily_cost_metrics`

#### Table: `gcp_billing_usage`

| Column | Data Type | Nullable | BigQuery Column | Description |
|--------|-----------|----------|-----------------|-------------|
| `billing_account_id` | VARCHAR(20) | NO | `billing_account_id` | GCP billing account |
| `gcp_project_id` | VARCHAR(64) | NO | `project.id` | — |
| `gcp_project_number` | VARCHAR(20) | NO | `project.number` | — |
| `gcp_project_name` | VARCHAR(128) | YES | `project.name` | — |
| `service_id` | VARCHAR(64) | NO | `service.id` | e.g., `6F81-5844-456A` (Vertex AI) |
| `service_description` | VARCHAR(256) | NO | `service.description` | e.g., `Vertex AI` |
| `sku_id` | VARCHAR(64) | NO | `sku.id` | Pricing SKU |
| `sku_description` | VARCHAR(256) | NO | `sku.description` | e.g., `Gemini 1.5 Pro Input Characters` |
| `agent_id` | VARCHAR(64) | YES | Label `veriforge_agent_id` | From `project.labels` or `resource.labels` |
| `usage_start_time` | TIMESTAMP | NO | `usage_start_time` | — |
| `usage_end_time` | TIMESTAMP | NO | `usage_end_time` | — |
| `export_time` | TIMESTAMP | NO | `export_time` | When exported to BQ |
| `usage_amount` | DECIMAL(20,6) | NO | `usage.amount` | In usage_unit |
| `usage_unit` | VARCHAR(64) | NO | `usage.unit` | e.g., `char`, `1M characters` |
| `usage_amount_in_pricing_units` | DECIMAL(20,6) | NO | `usage.amount_in_pricing_units` | — |
| `usage_pricing_unit` | VARCHAR(64) | NO | `usage.pricing_unit` | — |
| `cost` | DECIMAL(16,8) | NO | `cost` | Pre-discount cost |
| `currency` | VARCHAR(8) | NO | `currency` | `USD` |
| `currency_conversion_rate` | DECIMAL(10,6) | YES | `currency_conversion_rate` | — |
| `credits` | JSONB | YES | `credits` | Array of applied credits |
| `total_with_credits` | DECIMAL(16,8) | NO | `cost + SUM(credits.amount)` | Net cost |
| `invoice_month` | VARCHAR(8) | YES | `invoice.month` | `YYYYMM` |
| `labels` | JSONB | YES | `labels` | Resource labels (key-value) |
| `system_labels` | JSONB | YES | `system_labels` | GCP system labels |
| `location_country` | VARCHAR(8) | YES | `location.country` | — |
| `location_region` | VARCHAR(64) | YES | `location.region` | — |
| `location_zone` | VARCHAR(64) | YES | `location.zone` | — |
| `resource_name` | VARCHAR(512) | YES | `resource.name` | Specific resource billed |
| `resource_global_name` | VARCHAR(512) | YES | `resource.global_name` | — |
| `ingested_at` | TIMESTAMP | NO | System | — |

---

### 4.5 GCP IAM — Identity & Access

**VeriForge Entities Fed:** `agents`, `portal_logs`

#### Table: `gcp_iam_service_accounts`

| Column | Data Type | Nullable | Source Field | Description |
|--------|-----------|----------|--------------|-------------|
| `name` | VARCHAR(512) | NO | `name` (full resource name) | projects/P/serviceAccounts/SA |
| `email` | VARCHAR(256) | NO | `email` | `sa-name@project.iam.gserviceaccount.com` |
| `unique_id` | VARCHAR(32) | NO | `uniqueId` | Stable numeric ID |
| `gcp_project_id` | VARCHAR(64) | NO | `projectId` | — |
| `agent_id` | VARCHAR(64) | YES | Label `veriforge_agent_id` in IAM description | — |
| `display_name` | VARCHAR(100) | YES | `displayName` | — |
| `description` | TEXT | YES | `description` | — |
| `disabled` | BOOLEAN | NO | `disabled` | — |
| `oauth2_client_id` | VARCHAR(32) | YES | `oauth2ClientId` | — |
| `key_count` | INTEGER | NO | Count of `keys` from `projects.serviceAccounts.keys.list` | Active key count |
| `keys` | JSONB | YES | `serviceAccountKeys` (type+expiry only) | Key validity info |
| `iam_policy` | JSONB | YES | `getIamPolicy` result | Who can use this SA |
| `assigned_project_roles` | JSONB | YES | `projects.getIamPolicy` filtered | Project-level role bindings |
| `create_time` | TIMESTAMP | YES | `serviceAccountKeys[0].validAfterTime` | — |
| `ingested_at` | TIMESTAMP | NO | System | — |

---

### 4.6 GCP Cloud Functions / Cloud Run — Compute Runtime

**VeriForge Entities Fed:** `agents`, `deployments`, `episode_costs`

#### Table: `gcp_cloud_run_services`

| Column | Data Type | Nullable | Source Field | Description |
|--------|-----------|----------|--------------|-------------|
| `name` | VARCHAR(512) | NO | `metadata.name` (full resource name) | — |
| `service_name` | VARCHAR(64) | NO | `metadata.name` | Short service name |
| `gcp_project_id` | VARCHAR(64) | NO | `metadata.namespace` | — |
| `gcp_location` | VARCHAR(64) | NO | From resource name | — |
| `agent_id` | VARCHAR(64) | YES | Label `veriforge_agent_id` | — |
| `url` | VARCHAR(512) | YES | `status.url` | Invocation URL |
| `observed_generation` | INTEGER | YES | `status.observedGeneration` | Latest deployed generation |
| `latest_created_revision` | VARCHAR(128) | YES | `status.latestCreatedRevisionName` | — |
| `latest_ready_revision` | VARCHAR(128) | YES | `status.latestReadyRevisionName` | Serving revision |
| `traffic_config` | JSONB | YES | `spec.traffic` | Traffic split across revisions |
| `container_image` | VARCHAR(512) | YES | `spec.template.spec.containers[0].image` | Docker image |
| `cpu_request` | VARCHAR(16) | YES | `resources.requests.cpu` | e.g., `1000m` |
| `memory_request_mb` | INTEGER | YES | `resources.requests.memory` | In MiB |
| `max_concurrency` | INTEGER | YES | `containerConcurrency` | — |
| `timeout_sec` | INTEGER | YES | `timeoutSeconds` | — |
| `min_instances` | INTEGER | YES | `autoscaling.knative.dev/minScale` annotation | — |
| `max_instances` | INTEGER | YES | `autoscaling.knative.dev/maxScale` annotation | — |
| `service_account_email` | VARCHAR(256) | YES | `spec.template.spec.serviceAccountName` | — |
| `env_vars_keys` | JSONB | YES | `containers[0].env` (key names only) | Non-secret env var names |
| `ingress` | VARCHAR(32) | YES | `run.googleapis.com/ingress` annotation | `all`, `internal`, `internal-and-cloud-load-balancing` |
| `labels` | JSONB | YES | `metadata.labels` | — |
| `create_time` | TIMESTAMP | YES | `metadata.creationTimestamp` | — |
| `ingested_at` | TIMESTAMP | NO | System | — |

---

## 5. Cross-Cloud Normalized Schema

These tables store the unified, provider-agnostic view that VeriForge Ops reads directly.

### Table: `cloud_agent_registry`

This is the master join between VeriForge `agents` collection and cloud provider resources.

| Column | Data Type | Nullable | Description |
|--------|-----------|----------|-------------|
| `agent_id` | VARCHAR(64) | NO | VeriForge agent_id (PK) |
| `cloud_provider` | VARCHAR(8) | NO | `AWS`, `Azure`, `GCP`, `OpenAI` |
| `cloud_account_id` | VARCHAR(64) | NO | AWS account ID / Azure subscription ID / GCP project ID |
| `cloud_region` | VARCHAR(64) | NO | Cloud region / location |
| `cloud_resource_id` | VARCHAR(512) | YES | Provider-specific resource identifier (ARN / ARM ID / GCP resource name) |
| `cloud_resource_type` | VARCHAR(64) | YES | `lambda`, `ecs_task`, `cloud_run`, `azure_function`, `bedrock_agent` |
| `llm_endpoint_id` | VARCHAR(256) | YES | Bedrock model ID / Azure OAI deployment / Vertex endpoint |
| `llm_model_id` | VARCHAR(256) | YES | Resolved model ID (e.g., `anthropic.claude-3-5-sonnet...`) |
| `compute_resource_id` | VARCHAR(512) | YES | Lambda ARN / Function App ID / Cloud Run name |
| `iam_role_id` | VARCHAR(512) | YES | Execution role ARN / Service principal OID / SA email |
| `log_group` | VARCHAR(512) | YES | CW log group / Log Analytics workspace / Cloud Logging resource |
| `log_stream` | VARCHAR(512) | YES | CW log stream / specific stream name |
| `cost_allocation_tag_key` | VARCHAR(128) | NO | Tag key used for cost attribution |
| `cost_allocation_tag_value` | VARCHAR(256) | NO | Tag value for this agent |
| `last_synced_at` | TIMESTAMP | NO | When registry entry was last refreshed |
| `ingested_at` | TIMESTAMP | NO | System |

---

### Table: `cloud_invocation_events`  
*(normalized across AWS Bedrock + Azure OpenAI + GCP Vertex)*

| Column | Data Type | Nullable | Description |
|--------|-----------|----------|-------------|
| `invocation_id` | VARCHAR(128) | NO | Provider-native request/invocation ID |
| `agent_id` | VARCHAR(64) | NO | VeriForge agent_id |
| `cloud_provider` | VARCHAR(8) | NO | `AWS`, `Azure`, `GCP` |
| `cloud_account_id` | VARCHAR(64) | NO | Account/subscription/project |
| `cloud_region` | VARCHAR(64) | NO | — |
| `model_id` | VARCHAR(256) | NO | Fully-qualified model identifier |
| `model_family` | VARCHAR(64) | YES | `claude`, `gpt-4`, `gemini`, `llama`, `nova` |
| `invocation_timestamp` | TIMESTAMP(6) | NO | UTC microsecond precision |
| `input_tokens` | INTEGER | NO | Prompt / input token count |
| `output_tokens` | INTEGER | NO | Completion / output token count |
| `cached_tokens` | INTEGER | YES | Cache hit tokens (if reported) |
| `total_tokens` | INTEGER | NO | Total token consumption |
| `latency_ms` | INTEGER | YES | End-to-end latency |
| `input_cost_usd` | DECIMAL(12,8) | NO | — |
| `output_cost_usd` | DECIMAL(12,8) | NO | — |
| `total_cost_usd` | DECIMAL(12,8) | NO | — |
| `http_status` | SMALLINT | NO | 200 = success |
| `error_code` | VARCHAR(128) | YES | Provider error code |
| `error_category` | VARCHAR(32) | YES | `throttle`, `content_filter`, `server_error`, `auth_error` |
| `finish_reason` | VARCHAR(32) | YES | `complete`, `max_tokens`, `safety_blocked`, `tool_call` |
| `tool_calls_count` | SMALLINT | NO | 0 if no tools used |
| `tool_names` | JSONB | YES | Array of tool names invoked |
| `safety_blocked` | BOOLEAN | NO | Content was blocked by guardrail/filter |
| `guardrail_action` | VARCHAR(32) | YES | `NONE`, `INTERVENED`, `BLOCKED` |
| `stream_enabled` | BOOLEAN | NO | — |
| `episode_id` | VARCHAR(128) | YES | Maps to VeriForge episode_id |
| `session_id` | VARCHAR(128) | YES | Logical conversation session |
| `trace_id` | VARCHAR(256) | YES | Distributed trace ID |
| `raw_source_table` | VARCHAR(64) | NO | Origin table: `aws_bedrock_invocations` etc. |
| `ingested_at` | TIMESTAMP | NO | — |

---

### Table: `cloud_cost_events`  
*(normalized across AWS Cost Explorer + Azure Cost Management + GCP Billing)*

| Column | Data Type | Nullable | Description |
|--------|-----------|----------|-------------|
| `cost_record_id` | VARCHAR(128) | NO | Synthetic PK |
| `agent_id` | VARCHAR(64) | YES | VeriForge agent_id (if attributable) |
| `cloud_provider` | VARCHAR(8) | NO | `AWS`, `Azure`, `GCP` |
| `cloud_account_id` | VARCHAR(64) | NO | — |
| `cloud_region` | VARCHAR(64) | YES | — |
| `service_category` | VARCHAR(64) | NO | `llm_inference`, `compute`, `storage`, `networking` |
| `service_name` | VARCHAR(128) | NO | `Amazon Bedrock`, `Azure OpenAI Service`, `Vertex AI` |
| `sku_description` | VARCHAR(256) | YES | Human-readable pricing tier |
| `usage_date` | DATE | NO | Day the usage occurred |
| `granularity` | VARCHAR(8) | NO | `HOURLY`, `DAILY`, `MONTHLY` |
| `unblended_cost_usd` | DECIMAL(16,8) | NO | Actual cost (no RI/SP discount) |
| `amortized_cost_usd` | DECIMAL(16,8) | YES | Post discount/commitment |
| `net_cost_usd` | DECIMAL(16,8) | NO | After credits |
| `usage_quantity` | DECIMAL(20,4) | NO | Raw usage amount |
| `usage_unit` | VARCHAR(64) | NO | `Tokens`, `Hours`, `Requests` |
| `input_tokens` | BIGINT | YES | When unit is tokens and type=input |
| `output_tokens` | BIGINT | YES | When unit is tokens and type=output |
| `currency` | VARCHAR(8) | NO | `USD` |
| `cost_tags` | JSONB | YES | All cost allocation tags |
| `raw_source_table` | VARCHAR(64) | NO | Origin table |
| `ingested_at` | TIMESTAMP | NO | — |

---

### Table: `cloud_audit_events`  
*(normalized across AWS CloudTrail + Azure Activity Log + GCP Cloud Audit Logs)*

| Column | Data Type | Nullable | Description |
|--------|-----------|----------|-------------|
| `event_id` | VARCHAR(256) | NO | Provider-native event identifier |
| `agent_id` | VARCHAR(64) | YES | VeriForge agent_id |
| `cloud_provider` | VARCHAR(8) | NO | — |
| `cloud_account_id` | VARCHAR(64) | NO | — |
| `cloud_region` | VARCHAR(64) | YES | — |
| `event_time` | TIMESTAMP | NO | UTC event time |
| `service_name` | VARCHAR(128) | NO | e.g., `bedrock`, `openai`, `aiplatform` |
| `action` | VARCHAR(256) | NO | API method / operation name |
| `resource_id` | VARCHAR(512) | YES | Resource acted upon |
| `resource_type` | VARCHAR(128) | YES | — |
| `actor_type` | VARCHAR(32) | YES | `IAMUser`, `ServicePrincipal`, `ServiceAccount`, `AssumedRole` |
| `actor_id` | VARCHAR(512) | YES | ARN / UPN / email |
| `actor_ip` | VARCHAR(64) | YES | — |
| `outcome` | VARCHAR(16) | NO | `SUCCESS`, `FAILURE` |
| `error_code` | VARCHAR(128) | YES | — |
| `error_message` | TEXT | YES | — |
| `is_read_only` | BOOLEAN | NO | — |
| `severity` | VARCHAR(16) | YES | `INFO`, `WARNING`, `ERROR`, `CRITICAL` |
| `raw_request` | JSONB | YES | Sanitized request parameters |
| `raw_source_table` | VARCHAR(64) | NO | Origin table |
| `ingested_at` | TIMESTAMP | NO | — |

---

### Table: `cloud_platform_alerts`  
*(normalized across CloudWatch Alarms + Azure Monitor + GCP Alerting)*

| Column | Data Type | Nullable | Description |
|--------|-----------|----------|-------------|
| `platform_alert_id` | VARCHAR(512) | NO | Provider-native alert/incident ID |
| `agent_id` | VARCHAR(64) | YES | VeriForge agent_id |
| `cloud_provider` | VARCHAR(8) | NO | — |
| `cloud_account_id` | VARCHAR(64) | NO | — |
| `cloud_region` | VARCHAR(64) | YES | — |
| `alert_name` | VARCHAR(256) | NO | — |
| `severity` | VARCHAR(16) | NO | Normalized: `Critical`, `Warning`, `Info` |
| `state` | VARCHAR(16) | NO | `FIRING`, `RESOLVED`, `ACKNOWLEDGED` |
| `metric_name` | VARCHAR(256) | YES | Metric that triggered alert |
| `threshold_value` | DECIMAL(20,6) | YES | — |
| `actual_value` | DECIMAL(20,6) | YES | Value that crossed threshold |
| `fired_at` | TIMESTAMP | NO | — |
| `resolved_at` | TIMESTAMP | YES | — |
| `description` | TEXT | YES | Alert description / runbook link |
| `raw_source_table` | VARCHAR(64) | NO | — |
| `ingested_at` | TIMESTAMP | NO | — |

---

## 6. VeriForge Ops Entity Mapping

This table shows exactly which cloud ingestion table feeds which VeriForge Ops MongoDB collection, and the key field-to-field transformation.

| VeriForge Entity | MongoDB Collection | Primary Cloud Source Tables | Key Mapping |
|------------------|--------------------|-------------------------------|-------------|
| **Agent** | `agents` | `cloud_agent_registry` | `cloud_agent_registry.agent_id` → `agents.agent_id`; `llm_model_id` → `model_id`; `cloud_provider` → `cloud_provider`; `cloud_region` → `cloud_region`; `log_group/log_stream` → `log_group/log_stream`; `cloud_resource_id` → `arn` |
| **Episode Cost** | `episode_costs` | `cloud_invocation_events` | `invocation_id` → `episode_id`; `agent_id` → `agent_id`; `total_tokens` → `tokens`; `tool_calls_count` → `tools`; `total_cost_usd` → `total`; `input_cost_usd` → `llm` |
| **Agent Cost Metric** | `agent_cost_metrics` | `cloud_cost_events` (GROUP BY agent_id, month) | SUM(`input_tokens`) → `inputTokens`; SUM(`output_tokens`) → `outputTokens`; SUM(`net_cost_usd`) → `totalCostNum`; COUNT(*) → `requests` |
| **Daily Cost Metric** | `daily_cost_metrics` | `cloud_cost_events` (GROUP BY date) | `usage_date` → `date_iso`; SUM(`net_cost_usd`) → `cost`; SUM(`input_tokens + output_tokens`) → `tokens` |
| **Alert** | `alerts` | `cloud_platform_alerts` + `cloud_invocation_events` (error rows) | `platform_alert_id` → `alert_id`; `agent_id` → `agent_id`; `severity` → `severity`; `fired_at` → `timestamp`; `description` → `message` |
| **Anomaly** | `anomalies` | `cloud_invocation_events` (derived: token spike, high latency, safety blocks) | Anomaly detection logic on top of raw invocation stream; `agent_id` → `agent_id`; computed `score` → `score`; anomaly type → `category` |
| **Circuit Breaker** | `circuit_breakers` | `cloud_invocation_events` (aggregated) + `aws_bedrock_cw_metrics` | Rolling window aggregations of cost/latency/error rate evaluated against `threshold`; trigger updates `status`: `Armed` → `Triggered` |
| **Deployment** | `deployments` | `aws_cloudtrail_events` (Create/UpdateFunction), `azure_activity_log_events`, `gcp_audit_log_events` | `event_time` → `date`; `principal_email/arn` → `by`; resource version → `version`; environment tag → `env` |
| **Trust Interceptor** | `trust_interceptors` | `cloud_invocation_events` (guardrail fields: `safety_blocked`, `guardrail_action`) + Bedrock Guardrail logs | Each guardrail fire increments `events`; blocked content updates `action` taken |
| **Portal Log** | `portal_logs` | `cloud_audit_events` | `event_time` → `timestamp`; `action` → `action`; `outcome` → `level` (FAILURE→ERROR); `actor_id` → logged actor |
| **Intervention Log** | `intervention_logs` | `cloud_audit_events` (write/delete actions on agent resources) | Destructive API calls on agent resources are logged as interventions |
| **Inter-Agent Message** | `inter_agent_messages` | Custom app-layer logs from `aws_cloudwatch_log_events` / `gcp_cloud_log_events` | Parsed from structured log entries emitted by agent orchestration framework |
| **User** | `users` | `aws_iam_roles` / `azure_aad_service_principals` / `gcp_iam_service_accounts` | For service account→agent mapping; human users managed separately in VeriForge |
| **Anomaly Distribution** | `anomaly_distributions` | `cloud_invocation_events` (aggregated by day + category) | Daily rollup: count anomaly events by type per day |

---

## 7. Ingestion Frequency & Latency SLAs

| Source Table | Collection Method | Frequency | Target Latency | Notes |
|--------------|-------------------|-----------|----------------|-------|
| `aws_bedrock_invocations` | CloudWatch Logs subscription filter → Kinesis → VeriForge | Near real-time | < 60 sec | Requires model invocation logging enabled in Bedrock |
| `aws_bedrock_cw_metrics` | CloudWatch `GetMetricStatistics` poll | 5 min | < 5 min | 1-min resolution available |
| `aws_cloudwatch_alarms` | EventBridge rule → SNS/SQS → VeriForge | Event-driven | < 30 sec | On state change |
| `aws_cloudwatch_log_events` | Subscription filter + Kinesis Firehose | Near real-time | < 60 sec | — |
| `aws_cloudtrail_events` | CloudTrail → S3 → EventBridge notification | 15 min | < 15 min | Management events: 15 min; Data events: near real-time |
| `aws_cost_usage` | Cost Explorer API poll | Daily | T+24h | CUR (Cost & Usage Report) recommended for near real-time |
| `aws_cost_budgets` | Budgets API poll + SNS notification | Hourly + event-driven | < 1h | — |
| `aws_iam_roles` | IAM API poll | Hourly | < 1h | On-demand refresh on agent registration |
| `aws_lambda_functions` | Lambda API poll | 15 min | < 15 min | — |
| `aws_lambda_invocation_metrics` | CloudWatch poll | 5 min | < 5 min | — |
| `azure_openai_invocations` | Diagnostic Settings → Event Hub → VeriForge | Near real-time | < 60 sec | `AzureOpenAIRequests` log category |
| `azure_openai_cw_metrics` | Azure Monitor Metrics API poll | 5 min | < 5 min | — |
| `azure_monitor_alerts` | Azure Monitor Alerts API poll + Action Group webhook | Event-driven | < 30 sec | — |
| `azure_activity_log_events` | Event Hub export → VeriForge | Near real-time | < 5 min | — |
| `azure_cost_usage` | Cost Management Query API poll | Daily | T+24h | Actual costs available next day |
| `azure_aad_service_principals` | MS Graph API poll | Hourly | < 1h | — |
| `azure_function_apps` | ARM API poll | 15 min | < 15 min | — |
| `gcp_vertex_predictions` | Cloud Logging export → Pub/Sub → VeriForge | Near real-time | < 60 sec | `data_access` audit log for Vertex |
| `gcp_vertex_model_metrics` | Cloud Monitoring API poll | 5 min | < 5 min | — |
| `gcp_monitoring_alerts` | Cloud Monitoring Incidents API + Pub/Sub notification | Event-driven | < 30 sec | — |
| `gcp_cloud_log_events` | Logging sink → Pub/Sub → VeriForge | Near real-time | < 60 sec | — |
| `gcp_audit_log_events` | Logging sink (audit logs) → Pub/Sub | Near real-time | < 60 sec | — |
| `gcp_billing_usage` | BigQuery billing export read | Daily | T+24h | Export must be enabled; 24h delay |
| `gcp_iam_service_accounts` | IAM API poll | Hourly | < 1h | — |
| `gcp_cloud_run_services` | Cloud Run Admin API poll | 15 min | < 15 min | — |

---

*Document maintained by VeriForge Ops Platform Engineering*  
*Last updated: 2026-05-22*
