import os
import requests
import json
from dotenv import load_dotenv

load_dotenv()

def fetch_cpanel_data():
    user = os.getenv('CPANEL_USERNAME')
    token = os.getenv('CPANEL_API_TOKEN')
    domain = os.getenv('CPANEL_DOMAIN', 'sajilocode.com')
    
    if not user or not token:
        print("Error: CPANEL_USERNAME or CPANEL_API_TOKEN not found in .env")
        return

    # 1. Fetch Databases
    db_url = f"https://{domain}:2083/execute/Mysql/list_databases"
    headers = {'Authorization': f'cpanel {user}:{token}'}
    
    print(f"Calling cPanel API for databases at {db_url}...")
    try:
        resp = requests.get(db_url, headers=headers, verify=False, timeout=30)
        dbs = resp.json()
        print("\n--- Databases ---")
        print(json.dumps(dbs, indent=2))
    except Exception as e:
        print(f"Error fetching databases: {e}")

    # 2. Fetch Domains (to see if wildcard is set)
    domain_url = f"https://{domain}:2083/execute/DomainInfo/list_domains"
    print(f"\nCalling cPanel API for domains at {domain_url}...")
    try:
        resp = requests.get(domain_url, headers=headers, verify=False, timeout=30)
        doms = resp.json()
        print("\n--- Domains ---")
        print(json.dumps(doms, indent=2))
    except Exception as e:
        print(f"Error fetching domains: {e}")

if __name__ == "__main__":
    fetch_cpanel_data()
