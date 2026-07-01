import http.server
import socketserver
import os
import webbrowser

PORT = 8080

class CustomHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        if self.path == '/open-powerbi':
            pbip_path = os.path.abspath(os.path.join("CustomerSegmentationDashboard", "CustomerSegmentationDashboard.pbip"))
            if os.path.exists(pbip_path):
                print(f"[API] Launching Power BI Desktop with report: {pbip_path}")
                try:
                    os.startfile(pbip_path)
                    self.send_response(200)
                    self.send_header('Content-Type', 'application/json')
                    self.send_header('Access-Control-Allow-Origin', '*')
                    self.end_headers()
                    self.wfile.write(b'{"status": "success", "message": "Power BI launched"}')
                except Exception as e:
                    print(f"[API] Error launching Power BI: {e}")
                    self.send_response(500)
                    self.send_header('Content-Type', 'application/json')
                    self.end_headers()
                    self.wfile.write(f'{{"status": "error", "message": "{str(e)}"}}'.encode('utf-8'))
            else:
                print(f"[API] Error: Power BI project not found at {pbip_path}")
                self.send_response(404)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(b'{"status": "error", "message": "Power BI project file not found"}')
        else:
            # Serve regular static files
            super().do_GET()

def start_server():
    # Automatically open local browser page
    url = f"http://localhost:{PORT}"
    print(f"Opening dashboard in your web browser: {url}")
    webbrowser.open(url)
    
    # Allow port reuse to avoid address already in use errors
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(("", PORT), CustomHandler) as httpd:
        print(f"Serving premium web dashboard at {url}")
        print("To stop the server, terminate the task in the terminal.")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nStopping server...")

if __name__ == '__main__':
    start_server()
