import os 
import requests
import anthropic
import re
import json
from typing import List, Dict, Any, Optional
from selenium import webdriver
from selenium.webdriver.chrome.service import Service as ChromeService
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException
from webdriver_manager.chrome import ChromeDriverManager
from urllib.parse import quote
from werkzeug.serving import run_simple
import sys
import socket
import time
import traceback

from flask import Flask, request, jsonify
from flask_cors import CORS


app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": ["http://localhost:3000", "http://localhost:*", "file://*"]}})





# Set up Anthropic client
ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY")
if not ANTHROPIC_API_KEY:
    raise ValueError("Please set the ANTHROPIC_API_KEY environment variable")


client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)

chat_history = []
feedback_list = []


# rnaCentral
SEARCH_FIELDS = [
    "expert_db", "taxonomy", "tax_string", "species", "common_name", "rna_type",
    "so_rna_type_name", "gene", "organelle", "description", "length", "pub_title",
    "author", "pubmed", "doi", "md5", "interacting_protein", "interacting_rna",
    "evidence_for_interaction", "has_secondary_structure", "has_conserved_structure",
    "has_go_annotations", "has_genomic_coordinates", "has_interacting_proteins",
    "has_interacting_rnas", "has_lit_scan", "has_litsumm", "has_editing_event"
]


# Amino acid to anticodon mapping
AA_TO_ANTICODONS = {
    'ALA': ['AGC', 'GGC', 'CGC', 'TGC'],
    'ARG': ['ACG', 'GCG', 'CCG', 'TCG', 'CCT', 'TCT'],
    'ASN': ['ATT', 'GTT'],
    'ASP': ['ATC', 'GTC'],
    'CYS': ['ACA', 'GCA'],
    'GLU': ['CTC', 'TTC'],
    'GLN': ['CTG', 'TTG'],
    'GLY': ['ACC', 'GCC', 'CCC', 'TCC'],
    'HIS': ['ATG', 'GTG'],
    'ILE': ['AAT', 'GAT', 'TAT'],
    'LEU': ['AAG', 'GAG', 'CAG', 'TAG', 'CAA', 'TAA'],
    'LYS': ['CTT', 'TTT'],
    'MET': ['CAT'],
    'PHE': ['AAA', 'GAA'],
    'PRO': ['AGG', 'GGG', 'CGG', 'TGG'],
    'SER': ['AGA', 'GGA', 'CGA', 'TGA', 'ACT', 'GCT'],
    'THR': ['AGT', 'GGT', 'CGT', 'TGT'],
    'TRP': ['CCA'],
    'TYR': ['ATA', 'GTA'],
    'VAL': ['AAC', 'GAC', 'CAC', 'TAC'],
    'SEC': ['TCA'],
    'SUPPRESSOR': ['CTA', 'TTA']
}


def setup_driver():
    chrome_options = Options()
    chrome_options.add_argument("--headless")
    chrome_options.add_argument("--no-sandbox")
    chrome_options.add_argument("--disable-dev-shm-usage")
    chrome_options.add_argument("--window-size=1920,1080")
    
    service = ChromeService(ChromeDriverManager().install())
    driver = webdriver.Chrome(service=service, options=chrome_options)
    return driver


def parse_search_terms(claude_response: str) -> tuple[Dict[str, Any], Optional[int]]:
    search_terms = {'expert_db': '"GtRNAdb"'}  # Always include GtRNAdb
    num_sequences = None
    amino_acid = None

    # Extract all field:value pairs
    field_value_pairs = re.findall(r'(\w+):\s*"([^"]+)"', claude_response)
    
    for field, value in field_value_pairs:
        field = field.lower()
        
        if field == 'num_sequences':
            if value.lower() == 'none':
                num_sequences = None
            else:
                try:
                    num_sequences = int(value)
                except ValueError:
                    print(f"Invalid num_sequences value: {value}")
        elif field == 'amino_acid':
            amino_acid = value.upper()
        elif field in SEARCH_FIELDS:
            search_terms[field] = f'"{value}"'
        else:
            print(f"Unrecognized search field: {field}")

    # Handle amino acid to anticodon conversion
    if amino_acid:
        if amino_acid in AA_TO_ANTICODONS:
            anticodons = AA_TO_ANTICODONS[amino_acid]
            if len(anticodons) > 1:
                anticodon_query = " OR ".join([f'description:"*{anticodon}*"' for anticodon in anticodons])
                search_terms['amino_acid_query'] = f'({anticodon_query})'
            else:
                search_terms['amino_acid_query'] = f'description:"*{anticodons[0]}*"'
        else:
            print(f"Unknown amino acid: {amino_acid}")

    return search_terms, num_sequences

def construct_search_query(claude_response: str) -> tuple[str, Optional[int]]:
    search_terms, num_sequences = parse_search_terms(claude_response)
    query_parts = [f'expert_db:{search_terms["expert_db"]}']
    
    for field, value in search_terms.items():
        if field not in ['expert_db', 'amino_acid_query']:
            query_parts.append(f'{field}:{value}')
    
    if 'amino_acid_query' in search_terms:
        query_parts.append(search_terms['amino_acid_query'])
    
    query = " AND ".join(query_parts)
    
    return query, num_sequences

def search_rnacentral(query: str) -> tuple[List[str], str]: # not a tuple
    driver = setup_driver()
    try:
        encoded_query = quote(query, safe='":')
        url = f"https://rnacentral.org/search?q={encoded_query}"
        
        print(f"Constructed search query: {query}")  # Debug print
        print(f"Accessing URL: {url}")  # Debug print
        driver.get(url)
        
        try:
            WebDriverWait(driver, 20).until(
                EC.presence_of_element_located((By.CLASS_NAME, "text-search-result"))
            )
        except TimeoutException:
            print("No tRNA results found.")
            return []
        
        #time.sleep(5)  # Wait for results to load?
        
        results = driver.find_elements(By.CLASS_NAME, "text-search-result")
        rnacentral_ids = []
        
        for result in results:
            try:
                rna_id = result.find_element(By.CLASS_NAME, "text-muted").text
                rnacentral_ids.append(rna_id)
            except Exception as e:
                print(f"Error extracting RNAcentral ID: {str(e)}")
        
        print(f"Found {len(rnacentral_ids)} results")  # Debug print

        return rnacentral_ids[:15], url  # Return both IDs and the full URL
    finally:
        driver.quit()

def get_trna_sequences(rnacentral_ids: List[str]) -> List[Dict[str, Any]]:
    base_url = "https://rnacentral.org/api/v1/rna"
    full_api_responses = []
    
    for rna_id in rnacentral_ids:
        response = requests.get(f"{base_url}/{rna_id}")
        
        if response.status_code == 200:
            data = response.json()
            full_api_responses.append(data)
            print(f"\nFull API response for {rna_id}:")
            print(json.dumps(data, indent=2))
        else:
            print(f"Error fetching data for {rna_id}: {response.status_code}")
    
    return full_api_responses


def chatbot_response(user_input: str, conversation_history: List[Dict[str, str]], response_mode: str) -> Dict[str, Any]:
    global feedback_list
    
    base_system_message = f"""You are an AI assistant specializing in tRNA biology and the GtRNAdb database. Your target users are tRNA researchers and bioinformaticians.

Key Instructions for tRNA Queries:
1. Sequence Retrieval:
 - Use 'FETCH_TRNA_SEQUENCES' followed by the search query when needed.
 - This message is for backend processing only. Do not include explanations or greetings.
 - Avoid hallucinating data or pretending to have information before retrieval.

2. Query Formatting:
 - Use only the following valid search fields:
   * expert_db: e.g., "GtRNAdb" (always included by default)
   * taxonomy: e.g., "9606" for Homo sapiens
   * tax_string: e.g., "primates" for taxonomic group
   * species: e.g., "Mus musculus"
   * common_name: e.g., "mouse"
   * rna_type: e.g., "tRNA" (use this for general tRNA queries)
   * so_rna_type_name: e.g., "tRNA" (classified using Sequence Ontology)
   * amino_acid: e.g., "Glu" (use this for specific amino acid tRNAs, including SeC for selenocysteine). If you are given a full name you must convert it to the symbol. In the case where user asks for suppressor treat that as an amino acid and use "SUPPRESSOR"
   * gene: e.g., "hotair"
   * organelle: e.g., "mitochondrion", "plastid"
   * description: e.g., "16S"
   * length: e.g., "75" or "[9000 to 10000]" for range
   * pub_title: e.g., "Danish population"
   * author: e.g., "Girard A."
   * pubmed: e.g., "17881443"
   * doi: e.g., "10.1093/nar/19.22.6328"
   * has_secondary_structure: e.g., "True"
   * has_genomic_coordinates: e.g., "True"
   * num_sequences: special field to limit the number of results
 - Default to 5 examples if quantity isn't specified.
 PAY ATTENTION - If user asks for 'a' trna, use num_sequences:"1". PAY ATTENTION
 - Use num_sequences:"None" if user indicates no limit.
 - Example: species:"Homo sapiens" amino_acid:"Glu" length:"75" num_sequences:"3"

Note: In cases where the user asks for an interesting kind of tRNA or doesn't specify, you can be creative with search terms, but use only the valid fields listed above.

3. Search Techniques:
 - Use wildcards for fuzzy matching, e.g., description:"*anticodon*"
 - Employ logical operators (AND, OR, NOT) and parentheses for complex queries.
 - For amino acid-specific queries, use the amino_acid field instead of rna_type.

Response Guidelines:
Consider whether you are have recieved a message from the user or from the system before replying, and be careful not to confuse the two. If the system provides you the trna data, do not thank the user for providing that in your response because that was the system and not the user who got that.
1. After receiving tRNA data from the system, provide a very brief overview and ask for follow-up questions.
2. Focus on provided information without assumptions or speculation.
3. Keep responses concise. Let users ask for more details if needed.
4. Don't acknowledge receiving tRNA data if your last message was a query.
5. Adapt your response based on the user's expertise level:
 - Beginners: Provide more context and explanation.
 - Intermediates: Brief overview with 1-2 interesting facts.
 - Experts: Minimize context, focus on most relevant information.

Current response mode: {response_mode}. Adjust your language and depth accordingly.

Interaction Style:
- Be friendly but avoid overly technical language for beginners.
- For gene sequences, provide brief, contextual explanations.
- Handle errors by suggesting alternatives or next steps.
- Aim for a conversational flow, allowing users to guide the depth of information.

Remember: Your goal is to assist efficiently without overwhelming the user. Provide valuable insights while encouraging user-driven exploration of tRNA biology.
"""
   
   
    feedback_message = "\n\nUser Feedback:\n" + "\n".join(feedback_list) if feedback_list else ""
    system_message = base_system_message + feedback_message

    cleaned_history = [{'role': msg['role'], 'content': msg['content']} for msg in conversation_history if 'role' in msg and 'content' in msg]
    messages = cleaned_history + [{"role": "user", "content": user_input}]
    print(f"Conversation history: {messages}")  # Debug print


    response = client.messages.create(
        model="claude-3-5-sonnet-20240620",
        max_tokens=1000,
        temperature=0.7,
        system=system_message,
        messages=messages
    )

    claude_response = response.content[0].text

    print()
    print(f"Generated response: {claude_response}")  # Debug print
    print()

    result = {
        "chatbot_response": claude_response,
        "api_data": None,
        "full_results_url": None
    }

    if "FETCH_TRNA_SEQUENCES" in claude_response.upper():
        search_query, num_sequences = construct_search_query(claude_response)
        print("Num Sequences: ", num_sequences)  # Debug print

        results = search_rnacentral(search_query)

        try:
            rnacentral_ids, full_results_url = results
        except ValueError:
            rnacentral_ids = False
            full_results_url = False
#################
        if rnacentral_ids:
            if num_sequences is not None:
                rnacentral_ids = rnacentral_ids[:num_sequences]
            full_api_responses = get_trna_sequences(rnacentral_ids)
            result["api_data"] = full_api_responses
            result["full_results_url"] = full_results_url
#################
            if full_api_responses:
                summary = f"Retrieved {len(full_api_responses)} tRNA sequences. "
                summary += str(full_api_responses)
                summary += " Do not say thank you for providing this data, as this is a system message. Your next message however is addressed to the user. Note that the user already has recieved the same data as you, so there is no need to include the entire sequence, but you can reference a sequence using its ID. Give a brief analysis of this data YOU have aquired, but remember to be flexible and playful with your opener. Be like a professional friend." #stray sys prompt
                
                new_response = client.messages.create(
                    model="claude-3-5-sonnet-20240620",
                    max_tokens=1000,
                    temperature=0.7,
                    system=system_message,
                    messages=messages + [
                        {"role": "assistant", "content": claude_response},
                        {"role": "user", "content": summary}
                    ]
                )
                result["chatbot_response"] = new_response.content[0].text
            else:
                result["chatbot_response"] = "No tRNA sequences found for the given query."
        else:
            result["chatbot_response"] = "No search results found for the given query."

    return result
#####################################################################################

@app.route('/api/test')
def chat_endpoint():
    return {"message": "Hello from the test endpoint"}

@app.after_request
def after_request(response):
    response.headers.add('Access-Control-Allow-Origin', 'http://localhost:3000')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type')
    response.headers.add('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
    return response

@app.route('/api/chat', methods=['POST'])
def chat():
    global chat_history
    data = request.json
    user_input = data.get('message')
    response_mode = data.get('response_mode', 'intermediate')

    if not user_input:
        return jsonify({"error": "No message provided"}), 400

    chat_history.append({"role": "user", "content": user_input})
    response_data = chatbot_response(user_input, chat_history, response_mode)
    chat_history.append({"role": "assistant", "content": response_data["chatbot_response"]})

    return jsonify(response_data)

@app.route('/api/feedback', methods=['POST'])
def add_feedback():
    global feedback_list
    data = request.json
    feedback = data.get('feedback')
    if feedback:
        feedback_list.append(feedback)
        return jsonify({"message": "Feedback added successfully"}), 200
    return jsonify({"error": "No feedback provided"}), 400

@app.route('/api/clear_history', methods=['POST'])
def clear_history():
    global chat_history
    chat_history = []
    return jsonify({"message": "Chat history cleared successfully"}), 200

@app.route('/api/clear_feedback', methods=['POST'])
def clear_feedback():
    global feedback_list
    feedback_list = []
    return jsonify({"message": "Feedback cleared successfully"}), 200

def find_free_port(start_port=8080, max_port=8090):
    for port in range(start_port, max_port + 1):
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            try:
                s.bind(('', port))
                return port
            except OSError:
                continue
    return None

def run_server():
    port = find_free_port()
    if port is None:
        print("Could not find a free port. Exiting.")
        sys.exit(1)
    
    print(f"Starting server on port {port}")
    run_simple('127.0.0.1', port, app, use_reloader=False, use_debugger=False)

if __name__ == '__main__':
    run_server()