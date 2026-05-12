import http from 'http';
http.get('http://127.0.0.1:3000/api/health', (res) => {
    let raw = '';
    res.on('data', c => raw += c);
    res.on('end', () => console.log('Resp:', raw));
}).on('error', (e) => console.log('Err:', e.message));
