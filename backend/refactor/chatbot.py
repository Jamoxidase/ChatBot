
import anthropic
from config import Config
from tools.rnaCentral import rnaCentralTool
from typing import List, Dict, Any, Callable

class Chatbot:
    def __init__(self):
        self.client = anthropic.Anthropic(api_key=Config.ANTHROPIC_API_KEY)
        self.chat_history = []
        self.feedback_list = []
        self.tools = {
            'FETCH_TRNA_SEQUENCES': rnaCentralTool()
        }
        self.tool_handlers = {
            'FETCH_TRNA_SEQUENCES': self._handle_trna_sequence_request
        }

    def generate_response(self, user_input: str, response_mode: str) -> Dict[str, Any]:
        system_message = self._get_system_message(response_mode)
        messages = self._prepare_messages(user_input)
        
        initial_response = self._get_claude_response(system_message, messages)
        
        result = self._process_response(initial_response, messages, system_message)
        
        self.chat_history.append({"role": "assistant", "content": result["chatbot_response"]})
        return result

    def _get_system_message(self, response_mode: str) -> str:
        base_message = self._get_base_system_message(response_mode)
        feedback_message = self._get_feedback_message()
        return base_message + feedback_message

    def _get_claude_response(self, system_message: str, messages: List[Dict[str, str]]) -> str:
        response = self.client.messages.create(
            model="claude-3-5-sonnet-20240620",
            max_tokens=1000,
            temperature=0.7,
            system=system_message,
            messages=messages
        )
        return response.content[0].text

    def _process_response(self, claude_response: str, messages: List[Dict[str, str]], system_message: str) -> Dict[str, Any]:
        result = {
            "chatbot_response": claude_response,
            "api_data": None,
            "full_results_url": None
        }

        for tool_trigger, handler in self.tool_handlers.items():
            if tool_trigger in claude_response.upper():
                result = handler(claude_response, messages, system_message)
                break

        return result

    def _handle_trna_sequence_request(self, claude_response: str, messages: List[Dict[str, str]], system_message: str) -> Dict[str, Any]:
        tool = self.tools['FETCH_TRNA_SEQUENCES']
        search_query, num_sequences = tool.construct_search_query(claude_response)
        rnacentral_ids, full_results_url = tool.search_rnacentral(search_query)

        result = {
            "chatbot_response": "No search results found for the given query.",
            "api_data": None,
            "full_results_url": None
        }

        if rnacentral_ids:
            if num_sequences is not None:
                rnacentral_ids = rnacentral_ids[:num_sequences]
            full_api_responses = tool.get_trna_sequences(rnacentral_ids)
            result["api_data"] = full_api_responses
            result["full_results_url"] = full_results_url

            if full_api_responses:
                summary = self._prepare_summary(full_api_responses)
                result["chatbot_response"] = self._get_claude_response(
                    system_message,
                    messages + [
                        {"role": "assistant", "content": claude_response},
                        {"role": "user", "content": summary}
                    ]
                )
            else:
                result["chatbot_response"] = "No tRNA sequences found for the given query."

        return result

    def _get_base_system_message(self, response_mode: str) -> str:
            return f"""You are an AI assistant specializing in tRNA biology and the GtRNAdb database. Your target users are tRNA researchers and bioinformaticians.

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
                Consider whether you have received a message from the user or from the system before replying, and be careful not to confuse the two. If the system provides you the tRNA data, do not thank the user for providing that in your response because that was the system and not the user who got that.
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

    
    def _get_feedback_message(self) -> str:
        return "\n\nUser Feedback:\n" + "\n".join(self.feedback_list) if self.feedback_list else ""

    def _prepare_messages(self, user_input: str) -> List[Dict[str, str]]:
        cleaned_history = [{'role': msg['role'], 'content': msg['content']} for msg in self.chat_history if 'role' in msg and 'content' in msg]
        return cleaned_history + [{"role": "user", "content": user_input}]

    def _prepare_summary(self, full_api_responses: List[Dict[str, Any]]) -> str:
        summary = f"Retrieved {len(full_api_responses)} tRNA sequences. "
        summary += str(full_api_responses)
        summary += " Do not say thank you for providing this data, as this is a system message. Your next message however is addressed to the user. Note that the user already has received the same data as you, so there is no need to include the entire sequence, but you can reference a sequence using its ID. Give a brief analysis of this data YOU have acquired, but remember to be flexible and playful with your opener. Be like a professional friend."
        return summary

    def add_feedback(self, feedback: str) -> None:
        self.feedback_list.append(feedback)

    def clear_history(self) -> None:
        self.chat_history = []

    def clear_feedback(self) -> None:
        self.feedback_list = []

    def add_tool(self, trigger: str, tool: Any, handler: Callable):
        self.tools[trigger] = tool
        self.tool_handlers[trigger] = handler