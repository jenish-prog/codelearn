import requests
import time
import subprocess
import os
import signal

def test_parser(language, code, expected_node_pattern):
    url = "http://localhost:8000/generate-flowchart"
    try:
        response = requests.post(url, json={"language": language, "code": code})
        if response.status_code == 200:
            mermaid = response.json().get("mermaid", "")
            print(f"[{language}] Response:\n{mermaid}\n")
            if expected_node_pattern in mermaid:
                print(f"[{language}] SUCCESS: Found expected pattern '{expected_node_pattern}'")
            else:
                print(f"[{language}] FAILURE: Did not find '{expected_node_pattern}'")
        else:
            print(f"[{language}] FAILURE: Status code {response.status_code}")
            print(response.text)
    except Exception as e:
        print(f"[{language}] ERROR: {str(e)}")

def main():
    print("Verifying parsers...")
    
    # Test Python
    test_parser("python", "x = 5\nprint(x)", "N1_L1")
    
    # Test JS
    test_parser("javascript", "let x = 5;\nconsole.log(x);", "N1_L1")
    
    # Test Java
    test_parser("java", "int x = 5;\nSystem.out.println(x);", "N1_L1")

if __name__ == "__main__":
    main()
