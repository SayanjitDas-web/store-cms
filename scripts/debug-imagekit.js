require('dotenv').config();
const ImageKit = require('imagekit');

console.log('--- ImageKit Debug ---');
console.log('Checking Environment Variables:');
console.log('IMAGEKIT_PUBLIC_KEY:', process.env.IMAGEKIT_PUBLIC_KEY ? 'Set' : 'Missing');
console.log('IMAGEKIT_PRIVATE_KEY:', process.env.IMAGEKIT_PRIVATE_KEY ? 'Set' : 'Missing');
console.log('IMAGEKIT_URL_ENDPOINT:', process.env.IMAGEKIT_URL_ENDPOINT ? 'Set' : 'Missing');

if (!process.env.IMAGEKIT_PUBLIC_KEY || !process.env.IMAGEKIT_PRIVATE_KEY || !process.env.IMAGEKIT_URL_ENDPOINT) {
    console.error('ERROR: Missing one or more ImageKit environment variables.');
    process.exit(1);
}

const imagekit = new ImageKit({
    publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
    privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
    urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT
});

console.log('\nAttempting to list files...');

imagekit.listFiles({
    limit: 5
}, function (error, result) {
    if (error) {
        console.error('FAILED to connect to ImageKit:');
        console.error(error);
    } else {
        console.log('SUCCESS! Connection established.');
        console.log(`Found ${result.length} files.`);
        if (result.length > 0) {
            console.log('First file:', result[0].name);
        }
    }
});
