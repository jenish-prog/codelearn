package com.flowchart;

import com.github.javaparser.StaticJavaParser;
import com.github.javaparser.ast.CompilationUnit;
import com.github.javaparser.ast.Node;
import com.github.javaparser.ast.body.MethodDeclaration;
import com.github.javaparser.ast.body.VariableDeclarator;
import com.github.javaparser.ast.expr.AssignExpr;
import com.github.javaparser.ast.expr.MethodCallExpr;
import com.github.javaparser.ast.stmt.*;
import com.google.gson.Gson;
import com.google.gson.JsonObject;
import spark.Spark;

import java.util.ArrayList;
import java.util.List;

public class FlowchartServer {
    private static int nodeCounter = 0;
    private static List<String> graph = new ArrayList<>();
    private static String lastNode = "Start";

    public static void main(String[] args) {
        Spark.port(3002);

        Spark.post("/parse", (req, res) -> {
            res.type("application/json");
            try {
                JsonObject json = new Gson().fromJson(req.body(), JsonObject.class);
                String code = json.get("code").getAsString();

                // Reset state
                nodeCounter = 0;
                graph.clear();
                graph.add("flowchart TD");
                graph.add("    Start([Start])");
                lastNode = "Start";

                // Wrap code in a class if not present, to help parser? 
                // StaticJavaParser can parse blocks or compilation units.
                // Let's try parsing as CompilationUnit assuming full class, 
                // or wrap it if it looks like snippets.
                // For simplicity, assume user provides a class or we wrap it.
                if (!code.contains("class ")) {
                    code = "public class TempClass { " + code + " }";
                }

                CompilationUnit cu = StaticJavaParser.parse(code);
                
                // Visit methods
                cu.findAll(MethodDeclaration.class).forEach(method -> {
                    String methodName = method.getNameAsString();
                    String methodNode = newNodeId();
                    graph.add("    " + methodNode + "[Def " + methodName + "]");
                    addEdge(lastNode, methodNode, null);
                    lastNode = methodNode;
                    
                    if (method.getBody().isPresent()) {
                        traverse(method.getBody().get());
                    }
                });

                String endNode = "End";
                graph.add("    " + endNode + "([End]):::startend");
                addEdge(lastNode, endNode, null);

                // Add Styling Definitions
                graph.add("    classDef startend fill:#003366,stroke:#333,stroke-width:2px,color:white");
                graph.add("    classDef process fill:#0070C0,stroke:#333,stroke-width:2px,color:white");
                graph.add("    classDef decision fill:#4CAF50,stroke:#333,stroke-width:2px,color:white");
                graph.add("    classDef io fill:#0070C0,stroke:#333,stroke-width:2px,color:white");
                graph.add("    style Start fill:#003366,stroke:#333,stroke-width:2px,color:white");

                JsonObject response = new JsonObject();
                response.addProperty("mermaid", String.join("\n", graph));
                return response;

            } catch (Exception e) {
                e.printStackTrace();
                JsonObject err = new JsonObject();
                err.addProperty("mermaid", "flowchart TD\n    Error[Error parsing Java: " + e.getMessage() + "]");
                return err;
            }
        });
        
        System.out.println("Java Parser service listening on port 3002");
    }

    private static String safeLabel(String text) {
        if (text == null) return "";
        // Escape special characters
        String safe = text.replace("\"", "'")
                          .replace("\n", " ")
                          .replace("{", "&#123;")
                          .replace("}", "&#125;")
                          .replace("[", "&#91;")
                          .replace("]", "&#93;");
        
        // Truncate if too long
        if (safe.length() > 50) {
            return safe.substring(0, 47) + "...";
        }
        return safe;
    }

    private static void addEdge(String from, String to, String label) {
        if (label != null) {
            graph.add("    " + from + " -->|" + label + "| " + to);
        } else {
            graph.add("    " + from + " --> " + to);
        }
    }

    private static void traverse(Node node) {
        if (node instanceof BlockStmt) {
            ((BlockStmt) node).getStatements().forEach(FlowchartServer::traverse);
        } else if (node instanceof ExpressionStmt) {
            ExpressionStmt expr = (ExpressionStmt) node;
            if (expr.getExpression() instanceof MethodCallExpr) {
                MethodCallExpr callExpr = (MethodCallExpr) expr.getExpression();
                String call = callExpr.getNameAsString();
                
                // Check for System.out.println
                boolean isIO = false;
                if (callExpr.getScope().isPresent()) {
                    String scope = callExpr.getScope().get().toString();
                    if (scope.equals("System.out") && (call.equals("println") || call.equals("print"))) {
                        isIO = true;
                    }
                }

                String callNode = newNodeId();
                String label = isIO ? "System.out.println(...)" : "Call " + call;
                
                if (isIO) {
                    graph.add("    " + callNode + "[/\"" + safeLabel(label) + "\"/]:::io");
                } else {
                    graph.add("    " + callNode + "[\"" + safeLabel(label) + "\"]:::process");
                }
                addEdge(lastNode, callNode, null);
                lastNode = callNode;
            } else if (expr.getExpression() instanceof AssignExpr) {
                String target = ((AssignExpr) expr.getExpression()).getTarget().toString();
                String assignNode = newNodeId();
                graph.add("    " + assignNode + "[\"" + safeLabel(target + " = ...") + "\"]:::process");
                addEdge(lastNode, assignNode, null);
                lastNode = assignNode;
            } else if (expr.getExpression().isVariableDeclarationExpr()) {
                expr.getExpression().asVariableDeclarationExpr().getVariables().forEach(v -> {
                    String name = v.getNameAsString();
                    String varNode = newNodeId();
                    graph.add("    " + varNode + "[\"" + safeLabel(name + " = ...") + "\"]:::process");
                    addEdge(lastNode, varNode, null);
                    lastNode = varNode;
                });
            }
        } else if (node instanceof IfStmt) {
            IfStmt ifStmt = (IfStmt) node;
            String decisionNode = newNodeId();
            String condition = ifStmt.getCondition().toString();
            graph.add("    " + decisionNode + "{{\"" + safeLabel(condition) + "?\"}}:::decision");
            addEdge(lastNode, decisionNode, null);
            
            String entryNode = decisionNode;
            
            // True
            lastNode = entryNode;
            String yesNode = newNodeId();
            graph.add("    " + yesNode + "[\"Yes\"]");
            addEdge(entryNode, yesNode, "True");
            lastNode = yesNode;
            traverse(ifStmt.getThenStmt());
            String trueEnd = lastNode;
            
            // False
            lastNode = entryNode;
            String noNode = newNodeId();
            graph.add("    " + noNode + "[\"No\"]");
            addEdge(entryNode, noNode, "False");
            lastNode = noNode;
            if (ifStmt.getElseStmt().isPresent()) {
                traverse(ifStmt.getElseStmt().get());
            }
            String falseEnd = lastNode;
            
            // Merge
            String mergeNode = newNodeId();
            graph.add("    " + mergeNode + "(( ))");
            addEdge(trueEnd, mergeNode, null);
            addEdge(falseEnd, mergeNode, null);
            lastNode = mergeNode;

        } else if (node instanceof WhileStmt) {
            WhileStmt whileStmt = (WhileStmt) node;
            String loopStart = newNodeId();
            String condition = whileStmt.getCondition().toString();
            graph.add("    " + loopStart + "{{\"" + safeLabel(condition) + "?\"}}:::decision");
            addEdge(lastNode, loopStart, null);
            
            // Body
            lastNode = loopStart;
            String doNode = newNodeId();
            graph.add("    " + doNode + "[\"Do\"]");
            addEdge(loopStart, doNode, "True");
            lastNode = doNode;
            traverse(whileStmt.getBody());
            addEdge(lastNode, loopStart, null); // Loop back
            
            // Exit
            String endLoop = newNodeId();
            graph.add("    " + endLoop + "[\"End Loop\"]");
            addEdge(loopStart, endLoop, "False");
            lastNode = endLoop;
        } else if (node instanceof ReturnStmt) {
            String retNode = newNodeId();
            graph.add("    " + retNode + "[\"Return\"]:::process");
            addEdge(lastNode, retNode, null);
            lastNode = retNode;
        }
    }
}
