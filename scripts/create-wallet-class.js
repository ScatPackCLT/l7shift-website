/**
 * Create Google Wallet pass class via API
 * Run: node scripts/create-wallet-class.js
 */

const { GoogleAuth } = require('google-auth-library');
const fs = require('fs');
const path = require('path');

const ISSUER_ID = '3388000000023061297';
const CLASS_SUFFIX = 'shiftcard_l7_shift';
const CLASS_ID = `${ISSUER_ID}.${CLASS_SUFFIX}`;

const keyFilePath = path.join(process.env.HOME, 'Downloads/l7-shift-91905665720e.json');

async function createClass() {
  const auth = new GoogleAuth({
    keyFile: keyFilePath,
    scopes: ['https://www.googleapis.com/auth/wallet_object.issuer']
  });

  const client = await auth.getClient();
  const token = await client.getAccessToken();

  const classDefinition = {
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
    hexBackgroundColor: '#0A0A0A'
  };

  console.log('Creating class:', CLASS_ID);
  console.log('Using token:', token.token?.substring(0, 50) + '...');

  const response = await fetch(
    `https://walletobjects.googleapis.com/walletobjects/v1/genericClass`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(classDefinition)
    }
  );

  const result = await response.text();
  console.log('Response status:', response.status);
  console.log('Response:', result);

  if (response.status === 409) {
    console.log('Class already exists, trying to update...');

    const updateResponse = await fetch(
      `https://walletobjects.googleapis.com/walletobjects/v1/genericClass/${CLASS_ID}`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(classDefinition)
      }
    );

    const updateResult = await updateResponse.text();
    console.log('Update status:', updateResponse.status);
    console.log('Update result:', updateResult);
  }
}

createClass().catch(console.error);
