import json
import sys
from datetime import datetime

files = [
    "/Users/arsalanjaved/.gemini/antigravity/brain/ce2a0df7-e6e5-4c06-a3ac-ed1f444248ac/.system_generated/steps/58/output.txt",
    "/Users/arsalanjaved/.gemini/antigravity/brain/ce2a0df7-e6e5-4c06-a3ac-ed1f444248ac/.system_generated/steps/59/output.txt"
]

def parse_run(file_path):
    try:
        with open(file_path, 'r') as f:
            data = json.load(f)
            runs = data.get('runs', [])
            if not runs:
                print(f"No runs found in {file_path}")
                return

            print(f"--- File: {file_path.split('/')[-1]} ---")
            for run in runs:
                extra = run.get('extra') or {}
                metadata = extra.get('metadata', {})
                session_id = metadata.get('session_id', 'N/A')
                inputs = run.get('inputs', {})
                if 'messages' in inputs:
                    inputs = inputs['messages']
                
                outputs = run.get('outputs', {})
                if 'generations' in outputs:
                    outputs = outputs['generations']

                # Extract first user message
                first_user_msg = "N/A"
                try:
                    # Case 1: inputs is a list of messages
                    if isinstance(inputs, list):
                        for msg in inputs:
                            # Handle different message formats
                            if isinstance(msg, dict):
                                msg_type = msg.get('type') or (msg.get('lc') and msg.get('id')[-1])
                                if not msg_type and 'type' in msg: msg_type = msg['type']
                                
                                if msg_type in ['human', 'HumanMessage']:
                                    first_user_msg = msg.get('data', {}).get('content') or msg.get('kwargs', {}).get('content') or msg.get('content')
                                    break
                            elif hasattr(msg, 'content'):
                                if getattr(msg, 'type', '') == 'human':
                                    first_user_msg = msg.content
                                    break
                    # Case 2: inputs is a dict with 'messages' key (already handled above usually)
                    elif isinstance(inputs, dict):
                        pass 
                except Exception as e:
                    print(f"Error parsing inputs: {e}")

                # Extract last assistant message
                last_ai_msg = "N/A"
                try:
                    if outputs:
                        if isinstance(outputs, list) and len(outputs) > 0:
                            # LangChain generations format
                            gen = outputs[0]
                            if isinstance(gen, dict):
                                last_ai_msg = gen.get('text') or gen.get('message', {}).get('content')
                            elif isinstance(gen, list): # Batch generations
                                last_ai_msg = gen[0].get('text')
                        elif isinstance(outputs, dict):
                             last_ai_msg = outputs.get('output') or outputs.get('text')
                except Exception as e:
                    print(f"Error parsing outputs: {e}")
                
                print(f"Run ID: {run['id']}")
                print(f"Session ID: {session_id}")
                print(f"Start Time: {run['start_time']}")
                print(f"Input Snippet: {str(first_user_msg)[:100].replace(chr(10), ' ')}...")
                print(f"Output Snippet: {str(last_ai_msg)[:100].replace(chr(10), ' ')}...")
                print("-" * 20)

    except Exception as e:
        print(f"Error reading {file_path}: {e}")

for f in files:
    parse_run(f)
