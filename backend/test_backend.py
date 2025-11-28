import requests
import json

BASE_URL = "http://localhost:8000"

def test_python():
    code = """
def my_func(x):
    if x > 10:
        return True
    else:
        return False
"""
    payload = {"language": "python", "code": code}
    try:
        response = requests.post(f"{BASE_URL}/generate-flowchart", json=payload)
        print("Python Test:")
        print(response.json()['mermaid'])
    except Exception as e:
        print(f"Python Test Failed: {e}")

def test_js():
    code = """
function test(x) {
    if (x > 10) {
        return true;
    } else {
        return false;
    }
}
"""
    payload = {"language": "javascript", "code": code}
    try:
        response = requests.post(f"{BASE_URL}/generate-flowchart", json=payload)
        print("\nJS Test:")
        print(response.json()['mermaid'])
    except Exception as e:
        print(f"JS Test Failed: {e}")

def test_java():
    code = """
public class Test {
    public void myMethod(int x) {
        if (x > 10) {
            return;
        }
    }
}
"""
    payload = {"language": "java", "code": code}
    try:
        response = requests.post(f"{BASE_URL}/generate-flowchart", json=payload)
        print("\nJava Test:")
        print(response.json()['mermaid'])
    except Exception as e:
        print(f"Java Test Failed: {e}")

if __name__ == "__main__":
    print("Running tests...")
    test_python()
    test_js()
    test_java()
