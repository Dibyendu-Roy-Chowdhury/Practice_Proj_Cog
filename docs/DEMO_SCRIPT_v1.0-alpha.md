# VeriForge Ops — 3-Minute Demo Script
**Version:** 1.0-alpha · **Runtime:** ~3 minutes  
**Audience:** CIO / executive evaluation  
**Theme:** Governance first — observe, govern, act  
**Presenter notes in** *italics*

---

## OPENING — Governance First (0:00 – 0:20)

> "Enterprise AI fleets move fast. Governance hasn't kept up. VeriForge Ops is the single control tower that closes the observe-govern-act loop — built around four principles: traceability, audit integrity, LOB data isolation, and multi-cloud reach. Let me show you those four things in three minutes."

*Log in as `admin`. Platform lands on Core.*

---

## 1. TRACEABILITY — Every Decision Has a Paper Trail (0:20 – 0:50)

*Click **Workbench** in the sidebar → select the **Claims Triage AI** from the agent dropdown.*

> "Every agent interaction is recorded end-to-end. The Live Log Stream on the left shows real-time output — PII masked, level-filtered. Click any ERROR line and a runbook drawer opens with the exact remediation steps for that failure mode."

*Click an ERROR log line to open the drawer, then close it.*

> "Below the logs — **Trace Analysis**. Each row is a session: thought steps, tool calls, model used, duration, and cost per invocation. This is the forensic layer. You can trace every decision a Claims Triage AI made back to its inputs and context."

*Scroll down to show Trace Analysis rows.*

---

## 2. AUDIT TRAIL — Immutable, Framework-Mapped (0:50 – 1:20)

*Click **Compliance** in the sidebar.*

> "The Compliance page is the immutable audit log. Every guardrail trigger, HITL decision, policy violation, and agent rollback lands here — timestamped, tenant-scoped, and mapped to the three frameworks your risk team cares about: ISO/IEC 42001, NIST AI RMF, and SOC 2 Type II."

*Point to the KPI row at the top — total events, open items, critical count.*

> "The Control Map at the bottom is the bridge between operational events and your audit evidence package. Click any event type to expand it."

*Click to expand a row in the Control Map — e.g., **Guardrail Trigger**.*

> "Each event type maps directly to its framework control IDs — ISO/IEC 42001 clause references in indigo, NIST AI RMF function codes in blue, SOC 2 Trust Service Criteria in green. This is audit-ready evidence, exportable as CSV or JSON on demand."

*Point to the Export button top-right.*

---

## 3. LOB DATA ISOLATION — Separate Fleets, Zero Bleed (1:20 – 1:45)

*Point to the tenant selector in the top header.*

> "Two lines of business are live in this environment: **Arcadia Health** and **Zenith Capital**. Watch what happens when I switch."

*Switch tenant from Arcadia Health → Zenith Capital.*

> "Every data surface — agents, alerts, compliance events, costs, HITL queues — is completely re-scoped to Zenith Capital. No data bleeds across LOBs. The isolation is enforced at the API layer via tenant-scoped headers on every request. Switch back and Arcadia Health's fleet is exactly as we left it."

*Switch back to Arcadia Health.*

---

## 4. GUARDRAIL ENFORCEMENT — Live Under Adversarial Conditions (1:45 – 2:20)

*Click **Insights** in the sidebar → click **Safety & Monitoring** tab.*

> "Six active interceptors sit in front of every agent output: Prompt Injection Guard, PII Redaction, Credential Guard, Output Filtering, RAG Grounding Validator, and the Compliance Screen. Each shows a live event count for today."

*Point to the Compliance Screen interceptor row.*

> "The Compliance Screen has fired multiple times today — expand it."

*Click 'View compliance events' to expand the list.*

> "Every violation is logged: framework, rule, agent, severity, and timestamp. HIPAA Compliance Auditor triggered an erasure rule violation at 10:32. Member Risk Scorer triggered a data minimisation violation. These are not silent failures — they are surfaced, triaged, and cross-linked to the audit log you just saw in the Compliance page."

---

## 5. INDUSTRY STANDARDS ALIGNMENT — Control Evidence on Demand (2:20 – 2:40)

*Return to **Compliance** in the sidebar. Use the framework filter dropdown.*

> "Filter by ISO/IEC 42001 — you see only the events relevant to that standard. Filter by NIST AI RMF — same. The Control Map accordion maps each event type to specific control IDs: for example, a guardrail trigger satisfies ISO 42001 A.6.2.4, NIST GOVERN-1.1 and MANAGE-2.2, and SOC 2 CC7.2."

*Switch filter back to All Frameworks.*

> "When an auditor asks for evidence that your AI governance controls are operating — you export this page. The data is live, not assembled manually before the audit."

---

## 6. CROSS-PLATFORM OBSERVABILITY — Multi-Cloud, One View (2:40 – 3:00)

*Click **Registry** in the sidebar → confirm you are on the **Agent Registry** tab.*

> "The Registry shows the full enrolled fleet. Notice the **Cloud** column — colored badges showing which hyperscaler each agent runs on. AWS Bedrock, Azure AI, GCP Vertex — all in one table. The KPI at the top shows the number of active cloud providers across this fleet."

*Point to the Cloud KPI card in the Registry header.*

> "Governance doesn't stop at one hyperscaler. Whether your claims agents run on Bedrock and your compliance monitors run on Vertex — VeriForge Ops observes, governs, and acts across all of them from a single control plane."

---

## CLOSE (3:00)

> "Traceability. Audit integrity. LOB isolation. Multi-cloud governance. That is VeriForge Ops — one control tower for your entire AI agent fleet. We're in alpha — we'd love your feedback."

---

## Presenter Checklist

- [ ] Log in as `admin` before recording — required for HITL approve/reject and full data access
- [ ] Start on Core (platform default landing page)
- [ ] Claims Triage AI selected in Workbench before reaching that screen
- [ ] Compliance page loaded with at least one event visible (seed must have run)
- [ ] Control Map: Guardrail Trigger row pre-identified for expansion demo
- [ ] Tenant switcher accessible in the header — confirm both tenants are seeded
- [ ] Safety & Monitoring compliance events expanded before recording resumes
- [ ] Registry on Agent Registry tab (not Models) — Cloud column visible
- [ ] Browser zoom at 90% for full dashboard visibility without scrolling
- [ ] Record at 1920×1080; sidebar expanded (not collapsed)

---

*VeriForge Ops Alpha — Cognizant AI Practice Engineering*  
*Script version 1.0-alpha · June 2026*
