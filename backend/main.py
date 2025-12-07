from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
import requests
import uvicorn
import os
from dotenv import load_dotenv

load_dotenv()

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

from typing import Optional

class ChatRequest(BaseModel):
    message: Optional[str] = ""
    model: str = "llama"
    apiKey: Optional[str] = None
    currentCode: Optional[str] = None
    image: Optional[str] = None # Base64 string
    fileName: Optional[str] = None

@app.post("/api/chat")
async def chat(request: ChatRequest):
    if request.model == "notion":
         return {"role": "assistant", "content": "Notion integration is handled on the frontend for now."}

    try:
        # Groq API Key
        GROQ_API_KEY = os.getenv("GROQ_API_KEY")
        if not GROQ_API_KEY:
             return {"role": "assistant", "content": "Error: GROQ_API_KEY not found in environment variables."}
        
        # Determine model
        model = "llama-3.3-70b-versatile" # Updated from decommissioned llama3-70b-8192
        if request.image:
            model = "meta-llama/llama-4-scout-17b-16e-instruct" # Updated to Llama 4 Scout (Multimodal)

        # Construct messages
        messages = []
        
        # System prompt with context
        system_content = "You are a helpful AI coding assistant."
        if request.currentCode:
            system_content += f"\n\nCurrent Code Context ({request.language if hasattr(request, 'language') else 'unknown'}):\n```\n{request.currentCode}\n```"
        
        messages.append({"role": "system", "content": system_content})

        # User message
        user_content = []
        if request.message:
            user_content.append({"type": "text", "text": request.message})
        
        if request.image:
            # Groq expects image_url with base64 data
            image_data = request.image
            # Ensure it has the prefix if missing (frontend usually sends it, but good to be safe)
            if not image_data.startswith("data:"):
                # Assume jpeg if unknown, but frontend should send full data URI
                image_data = f"data:image/jpeg;base64,{image_data}"
                
            user_content.append({
                "type": "image_url",
                "image_url": {
                    "url": image_data
                }
            })
            
        messages.append({"role": "user", "content": user_content if request.image else request.message})

        # Call Groq API
        url = "https://api.groq.com/openai/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {GROQ_API_KEY}",
            "Content-Type": "application/json"
        }
        payload = {
            "model": model,
            "messages": messages,
            "temperature": 0.7,
            "max_tokens": 1024
        }
        
        response = requests.post(url, json=payload, headers=headers, timeout=30)
        
        if response.status_code == 200:
            data = response.json()
            content = data['choices'][0]['message']['content']
            return {"role": "assistant", "content": content}
        else:
            print(f"Groq API Error: {response.status_code} - {response.text}") # Log error to console
            return {"role": "assistant", "content": f"Error from Groq API: {response.status_code} - {response.text}"}

    except Exception as e:
        print(f"Backend Exception: {str(e)}") # Log exception
        return {"role": "assistant", "content": f"Backend Error: {str(e)}"}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
