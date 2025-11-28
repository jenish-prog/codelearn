import javalang
from javalang.tree import MethodDeclaration, BlockStatement, Statement, IfStatement, WhileStatement, ReturnStatement, MethodInvocation, Assignment, VariableDeclarator, LocalVariableDeclaration

class JavaMermaidGenerator:
    def __init__(self):
        self.graph = ["flowchart TD", "    Start([Start]):::startend"]
        self.node_counter = 0
        self.last_node = "Start"

    def new_node_id(self, line_number=None):
        self.node_counter += 1
        node_id = f"N{self.node_counter}"
        if line_number:
            node_id += f"_L{line_number}"
        return node_id

    def safe_label(self, text):
        if not text:
            return ""
        # Escape special characters
        safe = text.replace('"', "'").replace('\n', ' ').replace('{', '&#123;').replace('}', '&#125;').replace('[', '&#91;').replace(']', '&#93;')
        
        # Relax truncation for "exact values"
        if len(safe) > 100:
            return safe[:97] + "..."
        return safe

    def add_edge(self, from_node, to_node, label=None):
        if label:
            self.graph.append(f"    {from_node} -->|{label}| {to_node}")
        else:
            self.graph.append(f"    {from_node} --> {to_node}")

    def generate(self, code):
        try:
            # Try parsing as is first (maybe it's a full class)
            try:
                tree = javalang.parse.parse(code)
            except javalang.parser.JavaSyntaxError:
                # If that fails, try wrapping in a class
                try:
                    wrapped_code = "public class TempClass { " + code + " }"
                    tree = javalang.parse.parse(wrapped_code)
                except javalang.parser.JavaSyntaxError:
                    # If that fails, try wrapping in main method inside a class
                    wrapped_code = "public class TempClass { public static void main(String[] args) { " + code + " } }"
                    tree = javalang.parse.parse(wrapped_code)

            # Find main method or just traverse first method found
            for path, node in tree.filter(MethodDeclaration):
                method_name = node.name
                line = node.position.line if node.position else None
                method_node = self.new_node_id(line)
                self.graph.append(f'    {method_node}[Def {self.safe_label(method_name)}]:::process')
                self.add_edge(self.last_node, method_node)
                self.last_node = method_node
                
                if node.body:
                    for stmt in node.body:
                        self.visit(stmt)
            
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
            return f'flowchart TD\n    Error["Error parsing Java code: {self.safe_label(str(e))}"]'

    def visit(self, node):
        if isinstance(node, BlockStatement) or isinstance(node, list):
            # Handle list of statements (block)
            statements = node if isinstance(node, list) else (node.statements if hasattr(node, 'statements') else [])
            for stmt in statements:
                self.visit(stmt)
                
        elif isinstance(node, LocalVariableDeclaration):
            line = node.position.line if node.position else None
            for declarator in node.declarators:
                var_name = declarator.name
                init_val = "..." 
                if declarator.initializer:
                    if hasattr(declarator.initializer, 'value'):
                         init_val = str(declarator.initializer.value)
                    elif hasattr(declarator.initializer, 'member'):
                         init_val = str(declarator.initializer.member)
                    elif hasattr(declarator.initializer, 'children'):
                         # Try to reconstruct from children tokens if available
                         init_val = "..." 
                         # This is hard in javalang without source, but we can try basic types
                
                var_node = self.new_node_id(line)
                self.graph.append(f'    {var_node}["{self.safe_label(f"{var_name} = {init_val}")}"]:::process')
                self.add_edge(self.last_node, var_node)
                self.last_node = var_node

        elif isinstance(node, Statement) and hasattr(node, 'expression'):
            line = node.position.line if node.position else None
            expr = node.expression
            if isinstance(expr, MethodInvocation):
                call_name = expr.member
                # Check for System.out.println
                is_io = False
                qualifier = expr.qualifier
                if qualifier == "System.out" and (call_name == "println" or call_name == "print"):
                    is_io = True
                
                call_node = self.new_node_id(line)
                
                label = f"Call {call_name}"
                if is_io:
                    # Try to get arguments
                    args_str = "..."
                    if expr.arguments:
                        # Simple argument extraction
                        args_list = []
                        for arg in expr.arguments:
                            if hasattr(arg, 'value'): args_list.append(str(arg.value))
                            elif hasattr(arg, 'member'): args_list.append(str(arg.member))
                            elif hasattr(arg, 'string'): args_list.append(f'"{arg.string}"') # String literal
                        if args_list:
                            args_str = ", ".join(args_list)
                    
                    label = f"System.out.println({args_str})"
                
                if is_io:
                    self.graph.append(f'    {call_node}[/"{self.safe_label(label)}"/]:::io')
                else:
                    self.graph.append(f'    {call_node}["{self.safe_label(label)}"]:::process')
                
                self.add_edge(self.last_node, call_node)
                self.last_node = call_node
                
            elif isinstance(expr, Assignment):
                line = node.position.line if node.position else None
                # Handle assignment target extraction more gracefully
                target = "variable"
                if hasattr(expr.expressionl, 'member'):
                    target = expr.expressionl.member
                elif hasattr(expr.expressionl, 'name'):
                    target = expr.expressionl.name
                elif hasattr(expr.expressionl, 'selectors') and expr.expressionl.selectors:
                     target = "..." 
                
                if not target or target == "variable":
                     target = "..."
                
                # Try to get value
                val = "..."
                if hasattr(expr.value, 'value'): val = str(expr.value.value)
                elif hasattr(expr.value, 'member'): val = str(expr.value.member)
                elif hasattr(expr.value, 'operandl'):
                     # Binary operation approximation
                     l = expr.value.operandl.member if hasattr(expr.value.operandl, 'member') else (expr.value.operandl.value if hasattr(expr.value.operandl, 'value') else "?")
                     r = expr.value.operandr.member if hasattr(expr.value.operandr, 'member') else (expr.value.operandr.value if hasattr(expr.value.operandr, 'value') else "?")
                     op = expr.value.operator if hasattr(expr.value, 'operator') else "?"
                     val = f"{l} {op} {r}"

                assign_node = self.new_node_id(line)
                self.graph.append(f'    {assign_node}["{self.safe_label(f"{target} = {val}")}"]:::process')
                self.add_edge(self.last_node, assign_node)
                self.last_node = assign_node

        elif isinstance(node, IfStatement):
            line = node.position.line if node.position else None
            condition = "Condition"
            if node.condition:
                 # Try to reconstruct condition string roughly
                 if hasattr(node.condition, 'operandl') and hasattr(node.condition, 'operandr'):
                      l = node.condition.operandl.member if hasattr(node.condition.operandl, 'member') else "..."
                      r = node.condition.operandr.value if hasattr(node.condition.operandr, 'value') else "..."
                      op = node.condition.operator if hasattr(node.condition, 'operator') else "?"
                      condition = f"{l} {op} {r}"
            
            decision_node = self.new_node_id(line)
            self.graph.append(f'    {decision_node}{{"{self.safe_label(condition)}?"}}:::decision')
            self.add_edge(self.last_node, decision_node)
            
            entry_node = decision_node
            
            # True Branch
            self.last_node = entry_node
            yes_node = self.new_node_id()
            self.graph.append(f'    {yes_node}["Yes"]')
            self.add_edge(entry_node, yes_node, "True")
            self.last_node = yes_node
            
            if node.then_statement:
                if isinstance(node.then_statement, list):
                     for s in node.then_statement: self.visit(s)
                else:
                    self.visit(node.then_statement)
            
            true_end = self.last_node
            
            # False Branch
            self.last_node = entry_node
            no_node = self.new_node_id()
            self.graph.append(f'    {no_node}["No"]')
            self.add_edge(entry_node, no_node, "False")
            self.last_node = no_node
            
            if node.else_statement:
                 if isinstance(node.else_statement, list):
                     for s in node.else_statement: self.visit(s)
                 else:
                    self.visit(node.else_statement)
            
            false_end = self.last_node
            
            # Merge
            merge_node = self.new_node_id()
            self.graph.append(f'    {merge_node}(( ))')
            self.add_edge(true_end, merge_node)
            self.add_edge(false_end, merge_node)
            self.last_node = merge_node

        elif isinstance(node, javalang.tree.ForStatement):
            line = node.position.line if node.position else None
            loop_start = self.new_node_id(line)
            self.graph.append(f'    {loop_start}{{"{self.safe_label("For Loop")}?"}}:::decision')
            self.add_edge(self.last_node, loop_start)
            
            # Body
            self.last_node = loop_start
            do_node = self.new_node_id()
            self.graph.append(f'    {do_node}["Do"]')
            self.add_edge(loop_start, do_node, "True")
            self.last_node = do_node
            
            if node.body:
                if isinstance(node.body, list):
                    for s in node.body: self.visit(s)
                else:
                    self.visit(node.body)
            
            self.add_edge(self.last_node, loop_start)
            
            # Exit
            end_loop = self.new_node_id()
            self.graph.append(f'    {end_loop}["End Loop"]')
            self.add_edge(loop_start, end_loop, "False")
            self.last_node = end_loop

        elif isinstance(node, WhileStatement):
            line = node.position.line if node.position else None
            condition = str(node.condition)
            loop_start = self.new_node_id(line)
            self.graph.append(f'    {loop_start}{{"{self.safe_label("While Loop")}?"}}:::decision')
            self.add_edge(self.last_node, loop_start)
            
            # Body
            self.last_node = loop_start
            do_node = self.new_node_id()
            self.graph.append(f'    {do_node}["Do"]')
            self.add_edge(loop_start, do_node, "True")
            self.last_node = do_node
            
            if node.body:
                if isinstance(node.body, list):
                    for s in node.body: self.visit(s)
                else:
                    self.visit(node.body)
            
            self.add_edge(self.last_node, loop_start)
            
            # Exit
            end_loop = self.new_node_id()
            self.graph.append(f'    {end_loop}["End Loop"]')
            self.add_edge(loop_start, end_loop, "False")
            self.last_node = end_loop

        elif isinstance(node, ReturnStatement):
            line = node.position.line if node.position else None
            ret_node = self.new_node_id(line)
            self.graph.append(f'    {ret_node}["Return"]:::process')
            self.add_edge(self.last_node, ret_node)
            self.last_node = ret_node
