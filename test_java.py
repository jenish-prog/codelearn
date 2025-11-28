from backend.java_tracer import run_java_trace
import json

code = """
public class Main {
    public static void main(String[] args) {
        int x = 10;
        System.out.println("Hello " + x);
        x = x + 5;
        System.out.println("Value: " + x);
    }
}
"""

try:
    steps = run_java_trace(code)
    print(json.dumps(steps, indent=2))
except Exception as e:
    print(f"Error: {e}")
