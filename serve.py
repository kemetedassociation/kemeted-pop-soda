#!/usr/bin/env python3
"""Static file server with HTTP Range support (needed for smooth video seeking).

python3 -m http.server ignores the Range header and always sends the whole
file, which breaks scroll-scrubbed <video> elements in the browser (Safari
and Chrome both refuse to seek smoothly on a resource that doesn't answer
Range requests with 206 Partial Content). This is a drop-in replacement.
"""
import http.server
import os
import re
import socketserver
import sys


class RangeHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def send_head(self):
        path = self.translate_path(self.path)
        if os.path.isdir(path):
            return super().send_head()
        if not os.path.exists(path):
            self.send_error(404, "File not found")
            return None

        range_header = self.headers.get('Range')
        file_size = os.path.getsize(path)

        if not range_header:
            f = open(path, 'rb')
            self.send_response(200)
            self.send_header('Content-type', self.guess_type(path))
            self.send_header('Content-Length', str(file_size))
            self.send_header('Accept-Ranges', 'bytes')
            self.send_header('Cache-Control', 'no-cache')
            self.end_headers()
            return f

        match = re.match(r'bytes=(\d*)-(\d*)', range_header)
        if not match:
            self.send_error(416, "Invalid range")
            return None
        start_s, end_s = match.groups()
        start = int(start_s) if start_s else 0
        end = int(end_s) if end_s else file_size - 1
        end = min(end, file_size - 1)
        if start > end or start >= file_size:
            self.send_response(416)
            self.send_header('Content-Range', f'bytes */{file_size}')
            self.end_headers()
            return None

        length = end - start + 1
        f = open(path, 'rb')
        f.seek(start)
        self.send_response(206)
        self.send_header('Content-type', self.guess_type(path))
        self.send_header('Content-Range', f'bytes {start}-{end}/{file_size}')
        self.send_header('Content-Length', str(length))
        self.send_header('Accept-Ranges', 'bytes')
        self.send_header('Cache-Control', 'no-cache')
        self.end_headers()
        self._range_end = end
        return f

    def copyfile(self, source, outputfile):
        end = getattr(self, '_range_end', None)
        if end is None:
            return super().copyfile(source, outputfile)
        remaining = end - source.tell() + 1
        chunk = 64 * 1024
        while remaining > 0:
            buf = source.read(min(chunk, remaining))
            if not buf:
                break
            outputfile.write(buf)
            remaining -= len(buf)


class ThreadingHTTPServer(socketserver.ThreadingMixIn, http.server.HTTPServer):
    daemon_threads = True


if __name__ == '__main__':
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8081
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    with ThreadingHTTPServer(('', port), RangeHTTPRequestHandler) as httpd:
        print(f"Serving on http://localhost:{port}/ (with HTTP Range support)")
        httpd.serve_forever()
