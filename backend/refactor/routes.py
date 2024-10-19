from flask import request, jsonify
from chatbot import Chatbot

chatbot = Chatbot()

def register_routes(app):
    @app.route('/api/test')
    def test_endpoint():
        return {"message": "Hello from the test endpoint"}

    @app.route('/api/chat', methods=['POST'])
    def chat():
        data = request.json
        user_input = data.get('message')
        response_mode = data.get('response_mode', 'intermediate')

        if not user_input:
            return jsonify({"error": "No message provided"}), 400

        response_data = chatbot.generate_response(user_input, response_mode)
        return jsonify(response_data)

    @app.route('/api/feedback', methods=['POST'])
    def add_feedback():
        data = request.json
        feedback = data.get('feedback')
        if feedback:
            chatbot.add_feedback(feedback)
            return jsonify({"message": "Feedback added successfully"}), 200
        return jsonify({"error": "No feedback provided"}), 400

    @app.route('/api/clear_history', methods=['POST'])
    def clear_history():
        chatbot.clear_history()
        return jsonify({"message": "Chat history cleared successfully"}), 200

    @app.route('/api/clear_feedback', methods=['POST'])
    def clear_feedback():
        chatbot.clear_feedback()
        return jsonify({"message": "Feedback cleared successfully"}), 200