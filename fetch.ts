import dns from 'dns/promises';
dns.resolveSrv('_mongodb._tcp.bibichat.yq5tq.mongodb.net').then(console.log).catch(console.error);
