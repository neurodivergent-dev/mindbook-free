# This file is used to run the Flask server for the AI API.
from flask import Flask, request, jsonify
from flask_cors import CORS
import torch
from transformers import AutoModelForCausalLM, AutoTokenizer
import uuid
import time
import threading
import os
from dotenv import load_dotenv

# Load environment variables from .env file if exists
load_dotenv()

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})

print("Loading model... (first time download)")
# Enable CUDA if GPU is available
device = "cuda" if torch.cuda.is_available() else "cpu"
print(f"Device: {device}")

# Get model name from environment variable or use default
MODEL_NAME = os.environ.get("AI_MODEL_NAME", "microsoft/phi-1_5")

try:
    # Loading model and tokenizer
    model = AutoModelForCausalLM.from_pretrained(
        MODEL_NAME, 
        torch_dtype=torch.float16, 
        device_map=device,
        # low_cpu_mem_usage=True,  # Uncomment to reduce memory usage
    )
    tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)
    print(f"Model {MODEL_NAME} loaded successfully!")
except Exception as e:
    print(f"Error loading model: {str(e)}")
    raise

# Cache of active responses
active_generations = {}

# System prompts
SYSTEM_PROMPTS = {
    "default": "You are a helpful and concise assistant. Keep your answers brief and to the point.",
    "poem": "You are a creative poet. Write short, meaningful poems that are no more than 8 lines. Be expressive yet concise. Sign your poems as 'Phi-1.5'.",
    "brief": "You are a concise assistant. Provide only the essential information in your responses. Limit your answers to 3 sentences maximum."
}

@app.route('/test', methods=['GET'])
def test():
    return jsonify({'status': 'ok', 'message': 'Phi-1.5 API works!'})

@app.route('/generate', methods=['POST'])
def generate():
    data = request.json
    prompt = data.get('prompt', '')
    max_length = data.get('max_length', 150)
    progressive = data.get('progressive', True)
    prompt_style = data.get('style', 'poem')
    
    # Select system prompt
    system_prompt = SYSTEM_PROMPTS.get(prompt_style, SYSTEM_PROMPTS["poem"])
    
    # Add system prompt to user prompt
    full_prompt = f"{system_prompt}\n\nUser: {prompt}\n\nResponse:"
    
    if not progressive:
        # Old system - full response
        return generate_full_response(full_prompt, max_length)
    
    # Create new reply session
    generation_id = str(uuid.uuid4())
    print(f"New progressive response is starting, ID: {generation_id[:8]}, Style: {prompt_style}")
    
    # Tokenize the Prompt
    inputs = tokenizer(full_prompt, return_tensors="pt", return_attention_mask=False)
    if device == "cuda":
        inputs = {k: v.to(device) for k, v in inputs.items()}
    
    # Generate first 10 tokens immediately (smaller initial response for poem)
    small_outputs = model.generate(
        **inputs, 
        max_length=inputs['input_ids'].shape[1] + 10, # Only 10 additional tokens at the prompt
        do_sample=True,
        top_p=0.9,
        temperature=0.8,  # Increased temperature for a bit more creativity
        top_k=40,  # Added top_k for more focused answers
        repetition_penalty=1.2  # To reduce repetition
    )
    
    first_result = tokenizer.batch_decode(small_outputs)[0]
    print(f"First reply created: {first_result[:50]}...")
    
    # Start full response in background (more than 10 tokens, but still limited)
    full_generation = {
        'prompt': full_prompt,
        'start_time': time.time(),
        'status': 'generating',
        'current_text': first_result,
        'completed': False,
        'max_length': min(max_length, 150)  # Make sure there are no more than 150 tokens
    }
    
    active_generations[generation_id] = full_generation
    
    # Start generating the full response in the background
    bg_thread = threading.Thread(
        target=generate_complete_response_in_background,
        args=(generation_id, inputs.copy(), min(max_length, 150))
    )
    bg_thread.daemon = True
    bg_thread.start()
    
    # Return the first piece immediately
    return jsonify({
        'generation_id': generation_id,
        'generated_text': first_result,
        'completed': False
    })

@app.route('/continue_generation/<generation_id>', methods=['GET'])
def continue_generation(generation_id):
    """Checks the status of a response session and returns the new content"""
    if generation_id not in active_generations:
        return jsonify({'error': 'No response session found'}), 404
    
    generation = active_generations[generation_id]
    
    # If the response is complete, clear it from the cache
    if generation['completed']:
        result = {
            'generated_text': generation['current_text'],
            'completed': True
        }
        return jsonify(result)
    
    # Return the current status of the ongoing response
    return jsonify({
        'generated_text': generation['current_text'],
        'completed': False
    })

def generate_full_response(prompt, max_length):
    """Creating a classic, non-streaming response"""
    print(f"Generating full response - limited length")
    
    inputs = tokenizer(prompt, return_tensors="pt", return_attention_mask=False)
    if device == "cuda":
        inputs = {k: v.to(device) for k, v in inputs.items()}
    
    # For more natural and shorter answers
    outputs = model.generate(
        **inputs, 
        max_length=min(max_length, 150),  # Maximum 150 tokens
        do_sample=True,
        top_p=0.95,
        temperature=0.5,
        top_k=40,
        repetition_penalty=1.2
    )
    
    result = tokenizer.batch_decode(outputs)[0]
    
    # Remove system prompt from response
    try:
        result = result.split("Response:")[1].strip()
    except:
        pass  # If parsing fails, use entire response
    
    print(f"Created full answer (short): {result[:30]}...")
    return jsonify({'generated_text': result})

def generate_complete_response_in_background(generation_id, inputs, max_length):
    """Generates the full response in the background and updates active_generations"""
    try:
        print(f"Background generation started, ID: {generation_id[:8]}...")
        
        if device == "cuda":
            inputs = {k: v.to(device) for k, v in inputs.items()}
        
        # Generate full answer - short and poetic
        outputs = model.generate(
            **inputs, 
            max_length=max_length,
            do_sample=True,
            top_p=0.95,
            temperature=0.5,  # High temperature for creativity
            top_k=40,
            repetition_penalty=1.2,  # Reduce repetition
            min_length=10  # Have at least 10 tokens (not too short)
        )
        
        full_result = tokenizer.batch_decode(outputs)[0]
        
        # Remove system prompt from response
        try:
            clean_result = full_result.split("Response:")[1].strip()
        except:
            clean_result = full_result  # If parsing fails, use the entire response
        
        # Update answer in the cache
        if generation_id in active_generations:
            active_generations[generation_id]['current_text'] = clean_result
            active_generations[generation_id]['completed'] = True
            active_generations[generation_id]['status'] = 'completed'
            
            print(f"Background response completed, ID: {generation_id[:8]}...")
    except Exception as e:
        print(f"Error in background generation: {str(e)}")
        if generation_id in active_generations:
            active_generations[generation_id]['status'] = 'error'
            active_generations[generation_id]['error'] = str(e)

# Regular checks for memory cleaning
def cleanup_old_generations():
    """Purge replies older than 30 minutes"""
    now = time.time()
    to_delete = []
    
    for gen_id, generation in active_generations.items():
        if now - generation['start_time'] > 1800:  # 30 minutes
            to_delete.append(gen_id)
    
    for gen_id in to_delete:
        del active_generations[gen_id]
    
    if to_delete:
        print(f"{len(to_delete)} old answer cleared")

# Periodic check for cleaning process
def start_cleanup_scheduler():
    """Run a cleanup every 10 minutes"""
    while True:
        time.sleep(600)  # Wait 10 minutes
        cleanup_old_generations()

# Start the cleaning process
cleanup_thread = threading.Thread(target=start_cleanup_scheduler)
cleanup_thread.daemon = True
cleanup_thread.start()

if __name__ == '__main__':
    # Get port from environment variable or use default
    port = int(os.environ.get('PORT', 5000))
    debug_mode = os.environ.get('FLASK_DEBUG', 'False').lower() == 'true'
    
    print(f"Starting server on port: {port}, Debug mode: {debug_mode}")
    app.run(
        host='0.0.0.0', 
        port=port, 
        debug=debug_mode, 
        threaded=True
    ) 