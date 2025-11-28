from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
import requests
import uvicorn
import os

from python_parser import MermaidGenerator
from java_parser import JavaMermaidGenerator

app = FastAPI()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class CodeRequest(BaseModel):
    language: str
    code: str

@app.post("/generate-flowchart")
async def generate_flowchart(request: CodeRequest):
    if request.language == "python":
        generator = MermaidGenerator()
        mermaid_code = generator.generate(request.code)
        return {"mermaid": mermaid_code}
    
    elif request.language == "javascript":
        try:
            # Call Node.js microservice
            response = requests.post("http://localhost:3001/parse", json={"code": request.code})
            if response.status_code == 200:
                return response.json()
            else:
                return {"mermaid": f"flowchart TD\n    Error[JS Service Error: {response.text}]"}
        except requests.exceptions.ConnectionError:
            return {"mermaid": "flowchart TD\n    Error[JS Service Unavailable (Is it running on port 3001?)]"}

    elif request.language == "java":
        generator = JavaMermaidGenerator()
        mermaid_code = generator.generate(request.code)
        return {"mermaid": mermaid_code}

    else:
        raise HTTPException(status_code=400, detail="Unsupported language")

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
