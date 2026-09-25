import requests
import time
import sys

BASE_URL = "http://127.0.0.1:8000"

def test_api():
    print("Testing /health endpoint...")
    try:
        resp = requests.get(f"{BASE_URL}/health")
        resp.raise_for_status()
        print("Health Check Passed:", resp.json())
    except Exception as e:
        print("Failed to connect to /health.")
        sys.exit(1)

    print("\nTesting POST /telemetry endpoint...")
    payload = {
        "cloud": "GCP",
        "service": "Vertex AI",
        "operation": "chat",
        "cost": 0.05,
        "associate_id": "test.user",
        "input_tokens": 100,
        "model_type": "LLM"
    }
    resp = requests.post(f"{BASE_URL}/telemetry", json=payload)
    if resp.status_code == 200:
        print("POST /telemetry Passed:", resp.json())
    else:
        print(f"POST /telemetry returned {resp.status_code}: {resp.text}")
        print("  (This is expected locally if your gcloud ADC quota project is misconfigured)")

    print("\nTesting GET /telemetry endpoint...")
    resp = requests.get(f"{BASE_URL}/telemetry")
    if resp.status_code == 200:
        print("GET /telemetry Passed:", resp.json())
    else:
        print(f"GET /telemetry returned {resp.status_code}: {resp.text}")
        print("  (This is expected locally if your gcloud ADC quota project is misconfigured)")

if __name__ == "__main__":
    test_api()
