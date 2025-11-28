import sys
import os

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from java_parser import JavaMermaidGenerator

generator = JavaMermaidGenerator()

test_cases = [
    # Case 5: Linear Search (User's failing code)
    """
    public class LinearSearch {
        public static int linearSearch(int[] arr, int target) {
            for (int i = 0; i < arr.length; i++) {
                if (arr[i] == target) {
                    return i;
                }
            }
            return -1; // not found
        }

        public static void main(String[] args) {
            int[] numbers = {10, 20, 30, 40, 50};
            int target = 30;

            int result = linearSearch(numbers, target);

            if (result != -1) {
                System.out.println("Element found at index: " + result);
            } else {
                System.out.println("Element not found");
            }
        }
    }
    """
]

for i, code in enumerate(test_cases):
    print(f"--- Test Case {i+1} ---")
    try:
        mermaid = generator.generate(code)
        print(mermaid)
    except Exception as e:
        print(f"Exception: {e}")
    print("\n")
