import sys
import os

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from python_parser import parse_python_to_mermaid
from java_parser import JavaMermaidGenerator

def test_python():
    code = """
x = 10
if x > 5:
    print("Big")
else:
    print("Small")
"""
    print("--- Python Output ---")
    print(parse_python_to_mermaid(code))

def test_java():
    code = """
public class Test {
    public static void main(String[] args) {
        int x = 10;
        if (x > 5) {
            System.out.println("Big");
        } else {
            System.out.println("Small");
        }
    }
}
"""
    print("\n--- Java Output ---")
    generator = JavaMermaidGenerator()
    print(generator.generate(code))

if __name__ == "__main__":
    test_python()
    test_java()
