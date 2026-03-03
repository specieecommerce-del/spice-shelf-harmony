const https = require('https');

const payload = {
  items: [{ id: 'test', name: 'Teste Boleto', price: 10.0, quantity: 1 }],
  customer: {
    name: 'Teste Species',
    email: 'speciesalimentos@gmail.com',
    cpfCnpj: '52998224725',
    phone: '11999999999',
  },
  coupon: null,
  environment: 'production',
};

const data = JSON.stringify(payload);

const options = {
  hostname: 'cfsxyladsuqicdoyvrab.supabase.co',
  path: '/functions/v1/create-asaas-boleto',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(data),
  },
};

const req = https.request(options, (res) => {
  let body = '';
  res.on('data', (chunk) => (body += chunk));
  res.on('end', () => {
    try {
      const ct = res.headers['content-type'] || '';
      const parsed = ct.includes('application/json') ? JSON.parse(body) : { raw: body };
      console.log(JSON.stringify({ status: res.statusCode, body: parsed }, null, 2));
    } catch (e) {
      console.error('Parse error:', e.message);
      console.log('Raw body:', body);
    }
  });
});

req.on('error', (e) => {
  console.error('Request error:', e.message);
});

req.write(data);
req.end();
