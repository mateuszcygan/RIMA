import json
from http.server import BaseHTTPRequestHandler, HTTPServer

# Define the request handler class
class RequestHandler(BaseHTTPRequestHandler):
    def do_POST(self):
        content_length = int(self.headers['Content-Length'])
        post_data = self.rfile.read(content_length)
        data = json.loads(post_data)

        wiki_url = data.get('wikiUrl')
        # Process the received wikiUrl value as needed

        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.end_headers()

        response = {'message': 'Received wikiUrl successfully'}
        self.wfile.write(json.dumps(response).encode())

# Set up the HTTP server
server_address = ('', 8000)
httpd = HTTPServer(server_address, RequestHandler)
print('Server started on port 8000...')
httpd.serve_forever()