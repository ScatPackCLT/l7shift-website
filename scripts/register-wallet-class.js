/**
 * Register Google Wallet Pass Class
 * Uses service account to authenticate and create the pass class
 */

const { SignJWT, importPKCS8 } = require('jose');
const fs = require('fs');
const path = require('path');

// Load credentials from downloaded JSON
const keyPath = path.join(process.env.HOME, 'Downloads/l7-shift-91905665720e.json');
const credentials = JSON.parse(fs.readFileSync(keyPath, 'utf8'));

const ISSUER_ID = 'BCR2DN5T53IPTOKI';
const CLASS_SUFFIX = 'l7-shift-digital-identity';
const CLASS_ID = ISSUER_ID + '.' + CLASS_SUFFIX;

async function getAccessToken() {
  const now = Math.floor(Date.now() / 1000);

  const privateKey = await importPKCS8(credentials.private_key, 'RS256');

  const jwt = await new SignJWT({
    iss: credentials.client_email,
    sub: credentials.client_email,
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
    scope: 'https://www.googleapis.com/auth/wallet_object.issuer'
  })
    .setProtectedHeader({ alg: 'RS256', typ: 'JWT' })
    .sign(privateKey);

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=' + jwt
  });

  const data = await response.json();
  if (data.error) {
    throw new Error('Token error: ' + (data.error_description || data.error));
  }
  return data.access_token;
}

async function createPassClass(accessToken) {
  const passClass = {
    id: CLASS_ID,
    classTemplateInfo: {
      cardTemplateOverride: {
        cardRowTemplateInfos: [
          {
            twoItems: {
              startItem: {
                firstValue: {
                  fields: [{ fieldPath: "object.textModulesData['email']" }]
                }
              },
              endItem: {
                firstValue: {
                  fields: [{ fieldPath: "object.textModulesData['phone']" }]
                }
              }
            }
          }
        ]
      }
    },
    imageModulesData: [
      {
        mainImage: {
          sourceUri: {
            uri: 'https://l7shift.com/wallet-assets/l7/hero.png'
          },
          contentDescription: {
            defaultValue: { language: 'en', value: 'L7 Shift - Break the Square' }
          }
        },
        id: 'hero_image'
      }
    ],
    linksModuleData: {
      uris: [
        { uri: 'https://l7shift.com', description: 'L7 Shift Website', id: 'website' }
      ]
    },
    enableSmartTap: true,
    redemptionIssuers: [ISSUER_ID],
    securityAnimation: { animationType: 'FOIL_SHIMMER' }
  };

  // First try to get existing class
  let response = await fetch(
    'https://walletobjects.googleapis.com/walletobjects/v1/genericClass/' + CLASS_ID,
    {
      method: 'GET',
      headers: { 'Authorization': 'Bearer ' + accessToken }
    }
  );

  if (response.status === 200) {
    console.log('Pass class already exists, updating...');
    response = await fetch(
      'https://walletobjects.googleapis.com/walletobjects/v1/genericClass/' + CLASS_ID,
      {
        method: 'PUT',
        headers: {
          'Authorization': 'Bearer ' + accessToken,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(passClass)
      }
    );
  } else if (response.status === 404) {
    console.log('Creating new pass class...');
    response = await fetch(
      'https://walletobjects.googleapis.com/walletobjects/v1/genericClass',
      {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + accessToken,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(passClass)
      }
    );
  }

  const result = await response.json();

  if (result.error) {
    console.error('Error:', JSON.stringify(result.error, null, 2));
    return null;
  }

  return result;
}

async function main() {
  console.log('Getting access token...');
  const token = await getAccessToken();
  console.log('Access token obtained');

  console.log('\nCreating/updating pass class...');
  const result = await createPassClass(token);

  if (result) {
    console.log('\nPass class registered successfully!');
    console.log('Class ID:', result.id);
  }
}

main().catch(console.error);
