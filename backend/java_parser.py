import javalang
from javalang.tree import MethodDeclaration, BlockStatement, Statement, IfStatement, WhileStatement, ReturnStatement, MethodInvocation, Assignment, VariableDeclarator, LocalVariableDeclaration, ForStatement, MemberReference, Literal, BinaryOperation

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
        safe = str(text).replace('"', "'").replace('\n', ' ').replace('{', '&#123;').replace('}', '&#125;').replace('[', '&#91;').replace(']', '&#93;')
        
        # Relax truncation for "exact values"
        if len(safe) > 100:
            return safe[:97] + "..."
        return safe

    def add_edge(self, from_node, to_node, label=None):
        if label:
            self.graph.append(f"    {from_node} -->|{label}| {to_node}")
        else:
            self.graph.append(f"    {from_node} --> {to_node}")

    def get_expression_string(self, expr):
        """Recursively reconstructs the string representation of an expression."""
        if expr is None:
            return ""
        
        # Handle operators
        prefix = ""
        postfix = ""
        if hasattr(expr, 'prefix_operators') and expr.prefix_operators:
            prefix = "".join(expr.prefix_operators)
        if hasattr(expr, 'postfix_operators') and expr.postfix_operators:
            postfix = "".join(expr.postfix_operators)

        base = ""
        
        if isinstance(expr, Literal):
            base = str(expr.value)
        
        elif isinstance(expr, MemberReference):
            base = expr.member
            if expr.qualifier:
                base = f"{expr.qualifier}.{base}"
        
        elif isinstance(expr, BinaryOperation):
            left = self.get_expression_string(expr.operandl)
            right = self.get_expression_string(expr.operandr)
            base = f"{left} {expr.operator} {right}"
                
        elif isinstance(expr, MethodInvocation):
            args = ", ".join([self.get_expression_string(arg) for arg in expr.arguments])
            qualifier = f"{expr.qualifier}." if expr.qualifier else ""
            base = f"{qualifier}{expr.member}({args})"
            
        elif isinstance(expr, javalang.tree.This):
            base = "this"
            
        elif isinstance(expr, javalang.tree.ClassCreator):
             base = f"new {expr.type.name}(...)"

        elif isinstance(expr, javalang.tree.ArrayInitializer):
             vals = ", ".join([self.get_expression_string(val) for val in expr.initializers])
             base = f"{{{vals}}}"
        
        elif isinstance(expr, javalang.tree.ArraySelector):
            base = f"{self.get_expression_string(expr.member)}[{self.get_expression_string(expr.index)}]"

        else:
            # Fallback for other types
            if hasattr(expr, 'member'): base = expr.member
            elif hasattr(expr, 'value'): base = str(expr.value)
            elif hasattr(expr, 'name'): base = expr.name
            else: base = "..."
        
        return f"{prefix}{base}{postfix}"

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
                    init_val = self.get_expression_string(declarator.initializer)
                
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
                qualifier = str(expr.qualifier) if expr.qualifier else ""
                
                if (qualifier == "System.out" or qualifier == "out") and (call_name == "println" or call_name == "print"):
                    is_io = True
                
                call_node = self.new_node_id(line)
                
                label = f"Call {call_name}"
                if is_io:
                    args_str = ", ".join([self.get_expression_string(arg) for arg in expr.arguments])
                    label = f"print({args_str})"
                else:
                    label = f"{call_name}(...)"

                if is_io:
                    self.graph.append(f'    {call_node}[/"{self.safe_label(label)}"/]:::io')
                else:
                    self.graph.append(f'    {call_node}["{self.safe_label(label)}"]:::process')
                
                self.add_edge(self.last_node, call_node)
                self.last_node = call_node
                
            elif isinstance(expr, Assignment):
                line = node.position.line if node.position else None
                target = self.get_expression_string(expr.expressionl)
                val = self.get_expression_string(expr.value)
                
                assign_node = self.new_node_id(line)
                self.graph.append(f'    {assign_node}["{self.safe_label(f"{target} = {val}")}"]:::process')
                self.add_edge(self.last_node, assign_node)
                self.last_node = assign_node

        elif isinstance(node, IfStatement):
            line = node.position.line if node.position else None
            condition = self.get_expression_string(node.condition)
            
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

        elif isinstance(node, ForStatement):
            line = node.position.line if node.position else None
            
            # Extract init, condition, update
            init_str = ""
            if node.control.init:
                if isinstance(node.control.init, LocalVariableDeclaration):
                     init_str = self.get_expression_string(node.control.init.declarators[0]) # Simplified
                elif isinstance(node.control.init, list):
                     init_str = ", ".join([self.get_expression_string(i) for i in node.control.init])
            
            condition = self.get_expression_string(node.control.condition) if node.control.condition else "True"
            update = ", ".join([self.get_expression_string(u) for u in node.control.update]) if node.control.update else ""

            loop_start = self.new_node_id(line)
            self.graph.append(f'    {loop_start}{{"{self.safe_label(condition)}?"}}:::decision')
            self.add_edge(self.last_node, loop_start)
            
            # Body
            self.last_node = loop_start
            do_node = self.new_node_id()
            self.graph.append(f'    {do_node}["Loop Body"]')
            self.add_edge(loop_start, do_node, "True")
            self.last_node = do_node
            
            if node.body:
                if isinstance(node.body, list):
                    for s in node.body: self.visit(s)
                else:
                    self.visit(node.body)
            
            # Update step (visualize it?)
            if update:
                update_node = self.new_node_id()
                self.graph.append(f'    {update_node}["{self.safe_label(update)}"]:::process')
                self.add_edge(self.last_node, update_node)
                self.last_node = update_node

            self.add_edge(self.last_node, loop_start)
            
            # Exit
            end_loop = self.new_node_id()
            self.graph.append(f'    {end_loop}["End Loop"]')
            self.add_edge(loop_start, end_loop, "False")
            self.last_node = end_loop

        elif isinstance(node, WhileStatement):
            line = node.position.line if node.position else None
            condition = self.get_expression_string(node.condition)
            
            loop_start = self.new_node_id(line)
            self.graph.append(f'    {loop_start}{{"{self.safe_label(condition)}?"}}:::decision')
            self.add_edge(self.last_node, loop_start)
            
            # Body
            self.last_node = loop_start
            do_node = self.new_node_id()
            self.graph.append(f'    {do_node}["Loop Body"]')
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
            val = self.get_expression_string(node.expression) if node.expression else ""
            ret_node = self.new_node_id(line)
            self.graph.append(f'    {ret_node}["Return {self.safe_label(val)}"]:::process')
            self.add_edge(self.last_node, ret_node)
            self.last_node = ret_node
