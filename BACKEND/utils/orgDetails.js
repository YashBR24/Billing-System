const Organization = require('../models/Organization');

const DEFAULT_ORG = {
  name: 'MAHADEV FILAMENTS',
  address: 'BLOCK NO - 15, 1ST FLOOR, AMBIKA VIBHAG - 2, NEAR NAVJIVAN CIRCLE, U.M. ROAD, SURAT - 395007',
  gstin: '24ABEFM9966E1ZZ',
  bankName: 'Prime Bank of India',
  accountName: 'Mahadev Filaments',
  accountNo: '10062001003372',
  ifsc: 'PMEC0100607',
  contactPerson: 'Bharat Radiya',
  phone: '9825492079',
  email: 'mahadevfilaments@gmail.com',
  terminology: { copsLabel: 'Cops', boxesLabel: 'Boxes' },
};

async function getOrgDetails(organizationId) {
  if (!organizationId) return DEFAULT_ORG;

  try {
    const org = await Organization.findById(organizationId).lean();
    if (!org) return DEFAULT_ORG;

    return {
      name: ((org.name || DEFAULT_ORG.name).toUpperCase()).replace(/[\n\r\t]/g, ' '),
      address: (org.address || DEFAULT_ORG.address).replace(/[\n\r\t]/g, ' '),
      gstin: (org.gstin || DEFAULT_ORG.gstin).replace(/[\n\r\t]/g, ' '),
      bankName: (org.bankDetails?.bankName || DEFAULT_ORG.bankName).replace(/[\n\r\t]/g, ' '),
      accountName: (org.bankDetails?.accountName || DEFAULT_ORG.accountName).replace(/[\n\r\t]/g, ' '),
      accountNo: (org.bankDetails?.accountNo || DEFAULT_ORG.accountNo).replace(/[\n\r\t]/g, ' '),
      ifsc: (org.bankDetails?.ifsc || DEFAULT_ORG.ifsc).replace(/[\n\r\t]/g, ' '),
      contactPerson: (org.contact?.personName || DEFAULT_ORG.contactPerson).replace(/[\n\r\t]/g, ' '),
      phone: (org.contact?.phone || DEFAULT_ORG.phone).replace(/[\n\r\t]/g, ' '),
      email: (org.contact?.email || DEFAULT_ORG.email).replace(/[\n\r\t]/g, ' '),
      terminology: org.terminology || DEFAULT_ORG.terminology,
    };
  } catch (err) {
    console.error('[getOrgDetails] Error:', err.message);
    return DEFAULT_ORG;
  }
}

module.exports = { getOrgDetails, DEFAULT_ORG };
