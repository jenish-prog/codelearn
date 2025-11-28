import ast

class MermaidGenerator(ast.NodeVisitor):
    def __init__(self):
        self.graph = ["flowchart TD", "    Start([Start])"]
        self.node_counter = 0
        self.last_node = "Start"

    def new_node_id(self, lineno=None):
        self.node_counter += 1
        suffix = f"_L{lineno}" if lineno else ""
        return f"N{self.node_counter}{suffix}"

    def safe_label(self, text):
        # Escape double quotes, newlines, and other special characters
        text = text.replace('"', "'").replace('\n', ' ').replace('{', '&#123;').replace('}', '&#125;').replace('[', '&#91;').replace(']', '&#93;')
        # Truncate long labels
        if len(text) > 50:
            return text[:47] + "..."
        return text

    def add_edge(self, from_node, to_node, label=None):
        if label:
            self.graph.append(f"    {from_node} -->|{label}| {to_node}")
        else:
            self.graph.append(f"    {from_node} --> {to_node}")

    def visit_FunctionDef(self, node):
        func_node = self.new_node_id(node.lineno)
        self.graph.append(f'    {func_node}["Def {node.name}"]:::process')
        self.add_edge(self.last_node, func_node)
        self.last_node = func_node
        
        for stmt in node.body:
            self.visit(stmt)

    def visit_Assign(self, node):
        target = node.targets[0]
        if isinstance(target, ast.Name):
            var_name = target.id
        else:
            var_name = "var"
            
        value = self.safe_label(ast.unparse(node.value))
        assign_node = self.new_node_id(node.lineno)
        self.graph.append(f'    {assign_node}["{var_name} = {value}"]:::process')
        self.add_edge(self.last_node, assign_node)
        self.last_node = assign_node

    def visit_If(self, node):
        condition = self.safe_label(ast.unparse(node.test))
        decision_node = self.new_node_id(node.lineno)
        self.graph.append(f'    {decision_node}{{"{condition}?"}}:::decision')
        self.add_edge(self.last_node, decision_node)
        
        entry_node = decision_node
        
        # True branch
        self.last_node = entry_node
        yes_node = self.new_node_id()
        self.graph.append(f'    {yes_node}["Yes"]')
        self.add_edge(entry_node, yes_node, "True")
        self.last_node = yes_node
        
        for stmt in node.body:
            self.visit(stmt)
        true_branch_end = self.last_node

        # False branch
        self.last_node = entry_node
        no_node = self.new_node_id()
        self.graph.append(f'    {no_node}["No"]')
        self.add_edge(entry_node, no_node, "False")
        self.last_node = no_node
        
        for stmt in node.orelse:
            self.visit(stmt)
        false_branch_end = self.last_node

        # Merge point
        merge_node = self.new_node_id()
        self.graph.append(f"    {merge_node}(( ))")
        self.add_edge(true_branch_end, merge_node)
        self.add_edge(false_branch_end, merge_node)
        self.last_node = merge_node

    def visit_While(self, node):
        condition = self.safe_label(ast.unparse(node.test))
        loop_start = self.new_node_id(node.lineno)
        self.graph.append(f'    {loop_start}{{"{condition}?"}}:::decision')
        self.add_edge(self.last_node, loop_start)
        
        # Body (True)
        self.last_node = loop_start
        do_node = self.new_node_id()
        self.graph.append(f'    {do_node}["Loop Body"]')
        self.add_edge(loop_start, do_node, "True")
        self.last_node = do_node
        
        for stmt in node.body:
            self.visit(stmt)
            
        # Loop back
        self.add_edge(self.last_node, loop_start)
        
        # Exit (False)
        end_node = self.new_node_id()
        self.graph.append(f'    {end_node}["End Loop"]')
        self.add_edge(loop_start, end_node, "False")
        self.last_node = end_node

    def visit_For(self, node):
        target = self.safe_label(ast.unparse(node.target))
        iter_ = self.safe_label(ast.unparse(node.iter))
        loop_check = self.new_node_id(node.lineno)
        self.graph.append(f'    {loop_check}{{"For {target} in {iter_}?"}}:::decision')
        self.add_edge(self.last_node, loop_check)
        
        # Body
        next_item = self.new_node_id()
        self.graph.append(f'    {next_item}["Next Item"]')
        self.add_edge(loop_check, next_item, "Has Next")
        self.last_node = next_item
        
        for stmt in node.body:
            self.visit(stmt)
            
        # Loop back
        self.add_edge(self.last_node, loop_check)
        
        # Exit
        end_node = self.new_node_id()
        self.graph.append(f'    {end_node}["End Loop"]')
        self.add_edge(loop_check, end_node, "Done")
        self.last_node = end_node

    def visit_Expr(self, node):
        if isinstance(node.value, ast.Call):
            call = self.safe_label(ast.unparse(node.value))
            call_node = self.new_node_id(node.lineno)
            if call.startswith("print("):
                self.graph.append(f'    {call_node}[/"{call}"/]:::io')
            else:
                self.graph.append(f'    {call_node}["{call}"]:::process')
            self.add_edge(self.last_node, call_node)
            self.last_node = call_node

    def visit_Return(self, node):
        val = self.safe_label(ast.unparse(node.value)) if node.value else "None"
        ret_node = self.new_node_id(node.lineno)
        self.graph.append(f'    {ret_node}["Return {val}"]:::process')
        self.add_edge(self.last_node, ret_node)
        self.last_node = ret_node

    def generate(self, code):
        try:
            tree = ast.parse(code)
            self.visit(tree)
            self.graph.append(f"    End([End]):::startend")
            self.add_edge(self.last_node, "End")
            
            # Add Styling Definitions
            self.graph.append("    classDef startend fill:#003366,stroke:#333,stroke-width:2px,color:white")
            self.graph.append("    classDef process fill:#0070C0,stroke:#333,stroke-width:2px,color:white")
            self.graph.append("    classDef decision fill:#4CAF50,stroke:#333,stroke-width:2px,color:white")
            self.graph.append("    classDef io fill:#0070C0,stroke:#333,stroke-width:2px,color:white")
            self.graph.append("    style Start fill:#003366,stroke:#333,stroke-width:2px,color:white")
            
            return "\n".join(self.graph)
        except Exception as e:
            return f'flowchart TD\n    Error["Error parsing Python code: {str(e)}"]'

def parse_python_to_mermaid(code):
    generator = MermaidGenerator()
    return generator.generate(code)
