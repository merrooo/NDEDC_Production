const express = require('express');
const fs = require('fs');
const cors = require('cors');
const crypto = require('crypto');
const app = express();

app.use(cors());
app.use(express.json());

const FILE_PATH = './Sec_Acc.js';
const ALGORITHM = 'aes-256-cbc';
// Key must be 32 characters. DO NOT CHANGE THIS AFTER SAVING DATA.
const ENCRYPTION_KEY = 'my-secret-key-1234567890-ndedc-!@'; 
const IV_LENGTH = 16;

function encrypt(text) {
    let iv = crypto.randomBytes(IV_LENGTH);
    let cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY), iv);
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return iv.toString('hex') + ':' + encrypted.toString('hex');
}

app.post('/save', (req, res) => {
    try {
        const rawData = JSON.stringify(req.body);
        const encryptedData = encrypt(rawData);
        
        // We save the encrypted string into the JS file
        const fileContent = `const initialData = "${encryptedData}";`;
        fs.writeFileSync(FILE_PATH, fileContent);
        
        console.log('🔒 Data encrypted and pushed to Sec_Acc.js');
        res.status(200).send({ message: 'Saved' });
    } catch (err) {
        res.status(500).send({ error: 'Encryption failed' });
    }
});

app.listen(3000, () => console.log('🚀 Secure Silent Server on http://localhost:3000'));