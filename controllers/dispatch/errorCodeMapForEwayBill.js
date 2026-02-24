const errorCodeMapForEwayBill = [
  {
    errorCode: '100',
    errorDesc: 'Invalid Json',
  },
  {
    errorCode: '101',
    errorDesc: 'Invalid Username',
  },
  {
    errorCode: '102',
    errorDesc: 'Invalid Password',
  },
  {
    errorCode: '103',
    errorDesc: 'Invalid Client -Id',
  },
  {
    errorCode: '104',
    errorDesc: 'Invalid Client Secret',
  },
  {
    errorCode: '105',
    errorDesc: 'Invalid Token',
  },
  {
    errorCode: '106',
    errorDesc: 'Token Expired',
  },
  {
    errorCode: '107',
    errorDesc: 'Authentication failed. Pls. inform the helpdesk',
  },
  {
    errorCode: '108',
    errorDesc: 'Invalid login credentials.',
  },
  {
    errorCode: '109',
    errorDesc: 'Decryption of data failed',
  },
  {
    errorCode: '110',
    errorDesc: 'Invalid Client-ID/Client-Secret',
  },
  {
    errorCode: '111',
    errorDesc: 'GSTIN is not registerd to this GSP',
  },
  {
    errorCode: '112',
    errorDesc: 'Inactive Client',
  },
  {
    errorCode: '113',
    errorDesc: 'Inactive User',
  },
  {
    errorCode: '114',
    errorDesc: 'Technical Error, Pl. contact the helpdesk.',
  },
  {
    errorCode: '115',
    errorDesc: 'Request payload data cannot be empty',
  },
  {
    errorCode: '116',
    errorDesc: 'Auth token is not valid for this client',
  },
  {
    errorCode: '117',
    errorDesc: 'This option is not enabled in Eway Bill 2',
  },
  {
    errorCode: '118',
    errorDesc: 'Try after 5 minutes',
  },
  {
    errorCode: '119',
    errorDesc: 'User is Invalid - Please check and retry.',
  },
  {
    errorCode: '120',
    errorDesc: 'Authentication failure, Invalid Client Secret.',
  },
  {
    errorCode: '121',
    errorDesc: 'Gstin Not Activated.',
  },
  {
    errorCode: '122',
    errorDesc: 'Gstin Is Inactive.',
  },
  {
    errorCode: '123',
    errorDesc: 'Invalid Token/Expiry.',
  },
  {
    errorCode: '124',
    errorDesc: 'Ewaybill is not found.',
  },
  {
    errorCode: '125',
    errorDesc: 'Ewaybill is cancelled',
  },
  {
    errorCode: '126',
    errorDesc: 'Ewaybill is expired.',
  },
  {
    errorCode: '127',
    errorDesc: 'Ewaybill is valid.',
  },
  {
    errorCode: '128',
    errorDesc: 'Ewaybill is about to expire.',
  },
  {
    errorCode: '129',
    errorDesc: 'Ewaybill is generated successfully.',
  },
  {
    errorCode: '130',
    errorDesc: 'Ewaybill exists with the same number.',
  },
  {
    errorCode: '131',
    errorDesc: 'Invalid Ewaybill No.',
  },
  {
    errorCode: '132',
    errorDesc: 'Invalid ewaybill format.',
  },
  {
    errorCode: '133',
    errorDesc: 'Invalid ewaybill data.',
  },
  {
    errorCode: '134',
    errorDesc: 'Invalid ewaybill number.',
  },
  {
    errorCode: '135',
    errorDesc: 'Invalid ewaybill date.',
  },
  {
    errorCode: '136',
    errorDesc: 'Invalid ewaybill type.',
  },
  {
    errorCode: '137',
    errorDesc: 'Invalid ewaybill status.',
  },
  {
    errorCode: '138',
    errorDesc: 'Invalid ewaybill mode.',
  },
  {
    errorCode: '139',
    errorDesc: 'Invalid ewaybill transaction type.',
  },
  {
    errorCode: '140',
    errorDesc: 'Invalid ewaybill sub type.',
  },
  {
    errorCode: '141',
    errorDesc: 'Invalid document type.',
  },
  {
    errorCode: '142',
    errorDesc: 'Invalid document number.',
  },
  {
    errorCode: '143',
    errorDesc: 'Invalid document date.',
  },
  {
    errorCode: '144',
    errorDesc: 'Document date cannot be in future.',
  },
  {
    errorCode: '145',
    errorDesc: 'Document date cannot be more than 10 days old from current date.',
  },
  {
    errorCode: '146',
    errorDesc: 'Document date cannot be less than 10 days from current date.',
  },
  {
    errorCode: '147',
    errorDesc: 'Document date cannot be less than Ewaybill date.',
  },
  {
    errorCode: '148',
    errorDesc: 'Invalid supplier Gstin.',
  },
  {
    errorCode: '149',
    errorDesc: 'Invalid supplier legal name.',
  },
  {
    errorCode: '150',
    errorDesc: 'Invalid supplier trade name.',
  },
  {
    errorCode: '151',
    errorDesc: 'Invalid supplier address.',
  },
  {
    errorCode: '152',
    errorDesc: 'Invalid supplier place.',
  },
  {
    errorCode: '153',
    errorDesc: 'Invalid supplier pin code.',
  },
  {
    errorCode: '154',
    errorDesc: 'Invalid supplier state code.',
  },
  {
    errorCode: '155',
    errorDesc: 'Invalid recipient Gstin.',
  },
  {
    errorCode: '156',
    errorDesc: 'Invalid recipient legal name.',
  },
  {
    errorCode: '157',
    errorDesc: 'Invalid recipient trade name.',
  },
  {
    errorCode: '158',
    errorDesc: 'Invalid recipient address.',
  },
  {
    errorCode: '159',
    errorDesc: 'Invalid recipient place.',
  },
  {
    errorCode: '160',
    errorDesc: 'Invalid recipient pin code.',
  },
  {
    errorCode: '161',
    errorDesc: 'Invalid recipient state code.',
  },
  {
    errorCode: '162',
    errorDesc: 'Invalid dispatch from Gstin.',
  },
  {
    errorCode: '163',
    errorDesc: 'Invalid dispatch from legal name.',
  },
  {
    errorCode: '164',
    errorDesc: 'Invalid dispatch from trade name.',
  },
  {
    errorCode: '165',
    errorDesc: 'Invalid dispatch from address.',
  },
  {
    errorCode: '166',
    errorDesc: 'Invalid dispatch from place.',
  },
  {
    errorCode: '167',
    errorDesc: 'Invalid dispatch from pin code.',
  },
  {
    errorCode: '168',
    errorDesc: 'Invalid dispatch from state code.',
  },
  {
    errorCode: '169',
    errorDesc: 'Invalid ship to Gstin.',
  },
  {
    errorCode: '170',
    errorDesc: 'Invalid ship to legal name.',
  },
  {
    errorCode: '171',
    errorDesc: 'Invalid ship to trade name.',
  },
  {
    errorCode: '172',
    errorDesc: 'Invalid ship to address.',
  },
  {
    errorCode: '173',
    errorDesc: 'Invalid ship to place.',
  },
  {
    errorCode: '174',
    errorDesc: 'Invalid ship to pin code.',
  },
  {
    errorCode: '175',
    errorDesc: 'Invalid ship to state code.',
  },
  {
    errorCode: '176',
    errorDesc: 'Invalid total value of goods.',
  },
  {
    errorCode: '177',
    errorDesc: 'Invalid total cess value.',
  },
  {
    errorCode: '178',
    errorDesc: 'Invalid total taxable value.',
  },
  {
    errorCode: '179',
    errorDesc: 'Invalid total non taxable value.',
  },
  {
    errorCode: '180',
    errorDesc: 'Invalid total amount.',
  },
  {
    errorCode: '181',
    errorDesc: 'Invalid total quantity.',
  },
  {
    errorCode: '182',
    errorDesc: 'Invalid total invoice value.',
  },
  {
    errorCode: '183',
    errorDesc: 'Invalid total item value.',
  },
  {
    errorCode: '184',
    errorDesc: 'Invalid total tax amount.',
  },
  {
    errorCode: '185',
    errorDesc: 'Invalid total amount with tax.',
  },
  {
    errorCode: '186',
    errorDesc: 'Invalid HSN code.',
  },
  {
    errorCode: '187',
    errorDesc: 'Invalid HSN description.',
  },
  {
    errorCode: '188',
    errorDesc: 'Invalid HSN quantity.',
  },
  {
    errorCode: '189',
    errorDesc: 'Invalid HSN unit.',
  },
  {
    errorCode: '190',
    errorDesc: 'Invalid HSN taxable value.',
  },
  {
    errorCode: '191',
    errorDesc: 'Invalid HSN non taxable value.',
  },
  {
    errorCode: '192',
    errorDesc: 'Invalid HSN IGST rate.',
  },
  {
    errorCode: '193',
    errorDesc: 'Invalid HSN CGST rate.',
  },
  {
    errorCode: '194',
    errorDesc: 'Invalid HSN SGST rate.',
  },
  {
    errorCode: '195',
    errorDesc: 'Invalid HSN cess rate.',
  },
  {
    errorCode: '196',
    errorDesc: 'Invalid HSN cess non ad valorem rate.',
  },
  {
    errorCode: '197',
    errorDesc: 'Invalid HSN other value.',
  },
  {
    errorCode: '198',
    errorDesc: 'Invalid HSN total value.',
  },
  {
    errorCode: '199',
    errorDesc: 'Invalid transport mode.',
  },
  {
    errorCode: '200',
    errorDesc: 'Invalid vehicle type.',
  },
  {
    errorCode: '201',
    errorDesc: 'Invalid Supply Type',
  },
  {
    errorCode: '202',
    errorDesc: 'Invalid Sub-supply Type',
  },
  {
    errorCode: '203',
    errorDesc: 'Sub-transaction type does not belongs to transaction type',
  },
  {
    errorCode: '204',
    errorDesc: 'Invalid Document type',
  },
  {
    errorCode: '205',
    errorDesc: 'Document type does not match with transaction & Sub trans type',
  },
  {
    errorCode: '206',
    errorDesc: 'Invaild Invoice Number',
  },
  {
    errorCode: '207',
    errorDesc: 'Invalid Invoice Date',
  },
  {
    errorCode: '208',
    errorDesc: 'Invalid Supplier GSTIN / Enrolled URP',
  },
  {
    errorCode: '209',
    errorDesc: 'Blank Supplier Address',
  },
  {
    errorCode: '210',
    errorDesc: 'Invalid or Blank Supplier PIN Code',
  },
  {
    errorCode: '211',
    errorDesc: 'Invalid or Blank Supplier state Code',
  },
  {
    errorCode: '212',
    errorDesc: 'Invalid Consignee GSTIN / Enrolled URP',
  },
  {
    errorCode: '213',
    errorDesc: 'Invalid Consignee Address',
  },
  {
    errorCode: '214',
    errorDesc: 'Invalid Consignee PIN Code',
  },
  {
    errorCode: '215',
    errorDesc: 'Invalid Consignee State Code',
  },
  {
    errorCode: '216',
    errorDesc: 'Invalid HSN Code',
  },
  {
    errorCode: '217',
    errorDesc: 'Invalid UQC Code',
  },
  {
    errorCode: '218',
    errorDesc: 'Invalid Tax Rate for Intra State Transaction',
  },
  {
    errorCode: '219',
    errorDesc: 'Invalid Tax Rate for Inter State Transaction',
  },
  {
    errorCode: '220',
    errorDesc: 'Invalid Trans mode',
  },
  {
    errorCode: '221',
    errorDesc: 'Invalid Approximate Distance',
  },
  {
    errorCode: '222',
    errorDesc: 'Invalid Transporter Id',
  },
  {
    errorCode: '223',
    errorDesc: 'Invalid Transaction Document Number',
  },
  {
    errorCode: '224',
    errorDesc: 'Invalid Transaction Date',
  },
  {
    errorCode: '225',
    errorDesc: 'Invalid Vehicle Number Format',
  },
  {
    errorCode: '226',
    errorDesc: 'Both Transaction and Vehicle Number Blank',
  },
  {
    errorCode: '227',
    errorDesc: 'User Gstin cannot be blank',
  },
  {
    errorCode: '228',
    errorDesc: 'User id cannot be blank',
  },
  {
    errorCode: '229',
    errorDesc: 'Supplier name is required',
  },
  {
    errorCode: '230',
    errorDesc: 'Supplier place is required',
  },
  {
    errorCode: '231',
    errorDesc: 'Consignee name is required',
  },
  {
    errorCode: '232',
    errorDesc: 'Consignee place is required',
  },
  {
    errorCode: '233',
    errorDesc: 'Eway bill does not contains any items',
  },
  {
    errorCode: '234',
    errorDesc: 'Total amount/Taxable amout is mandatory',
  },
  {
    errorCode: '235',
    errorDesc: 'Tax rates for Intra state transaction is blank',
  },
  {
    errorCode: '236',
    errorDesc: 'Tax rates for Inter state transaction is blank',
  },
  {
    errorCode: '237',
    errorDesc: 'Invalid client -Id/client-secret',
  },
  {
    errorCode: '238',
    errorDesc: 'Invalid auth token',
  },
  {
    errorCode: '239',
    errorDesc: 'Invalid action',
  },
  {
    errorCode: '240',
    errorDesc: 'Could not generate eway bill, pls contact helpdesk',
  },
  {
    errorCode: '241',
    errorDesc: 'Ewaybill cannot be generated for an invalid HSN code.',
  },
  {
    errorCode: '242',
    errorDesc: 'Invalid State Code',
  },
  {
    errorCode: '250',
    errorDesc: 'Invalid Vehicle Release Date Format',
  },
  {
    errorCode: '251',
    errorDesc: 'CGST nad SGST TaxRate should be same',
  },
  {
    errorCode: '252',
    errorDesc: 'Invalid CGST Tax Rate',
  },
  {
    errorCode: '253',
    errorDesc: 'Invalid SGST Tax Rate',
  },
  {
    errorCode: '254',
    errorDesc: 'Invalid IGST Tax Rate',
  },
  {
    errorCode: '255',
    errorDesc: 'Invalid CESS Rate',
  },
  {
    errorCode: '256',
    errorDesc: 'Ewaybill cannot be generated for an invalid recipient legal name.',
  },
  {
    errorCode: '257',
    errorDesc: 'Ewaybill cannot be generated for an invalid ship to legal name.',
  },
  {
    errorCode: '258',
    errorDesc: 'Ewaybill cannot be generated for an invalid supplier address.',
  },
  {
    errorCode: '259',
    errorDesc: 'Ewaybill cannot be generated for an invalid recipient address.',
  },
  {
    errorCode: '260',
    errorDesc: 'Ewaybill cannot be generated for an invalid dispatch from address.',
  },
  {
    errorCode: '261',
    errorDesc: 'Ewaybill cannot be generated for an invalid ship to address.',
  },
  {
    errorCode: '262',
    errorDesc: 'Ewaybill cannot be generated for an invalid supplier place.',
  },
  {
    errorCode: '263',
    errorDesc: 'Ewaybill cannot be generated for an invalid recipient place.',
  },
  {
    errorCode: '264',
    errorDesc: 'Ewaybill cannot be generated for an invalid dispatch from place.',
  },
  {
    errorCode: '265',
    errorDesc: 'Ewaybill cannot be generated for an invalid ship to place.',
  },
  {
    errorCode: '266',
    errorDesc: 'Ewaybill cannot be generated for an invalid supplier pin code.',
  },
  {
    errorCode: '267',
    errorDesc: 'Ewaybill cannot be generated for an invalid recipient pin code.',
  },
  {
    errorCode: '268',
    errorDesc: 'Ewaybill cannot be generated for an invalid dispatch from pin code.',
  },
  {
    errorCode: '269',
    errorDesc: 'Ewaybill cannot be generated for an invalid ship to pin code.',
  },
  {
    errorCode: '270',
    errorDesc: 'Ewaybill cannot be generated for an invalid supplier state code.',
  },
  {
    errorCode: '271',
    errorDesc: 'Ewaybill cannot be generated for an invalid recipient state code.',
  },
  {
    errorCode: '272',
    errorDesc: 'Ewaybill cannot be generated for an invalid dispatch from state code.',
  },
  {
    errorCode: '273',
    errorDesc: 'Ewaybill cannot be generated for an invalid ship to state code.',
  },
  {
    errorCode: '274',
    errorDesc: 'Ewaybill cannot be generated for an invalid total value of goods.',
  },
  {
    errorCode: '275',
    errorDesc: 'Ewaybill cannot be generated for an invalid total cess value.',
  },
  {
    errorCode: '276',
    errorDesc: 'Ewaybill cannot be generated for an invalid total taxable value.',
  },
  {
    errorCode: '277',
    errorDesc: 'Ewaybill cannot be generated for an invalid total non taxable value.',
  },
  {
    errorCode: '278',
    errorDesc: 'User Gstin does not match with Transporter Id',
  },
  {
    errorCode: '279',
    errorDesc: 'Ewaybill cannot be generated for an invalid total quantity.',
  },
  {
    errorCode: '280',
    errorDesc: 'Status is not ACTIVE',
  },
  {
    errorCode: '281',
    errorDesc:
      'Eway Bill is already expired hence update transporter is not allowed.',
  },
  {
    errorCode: '282',
    errorDesc:
      'At least 4 digit HSN code is mandatory for taxpayers with turnover less than 5Cr.',
  },
  {
    errorCode: '283',
    errorDesc:
      'At least 6 digit HSN code is mandatory for taxpayers with turnover 5Cr. and above',
  },
  {
    errorCode: '284',
    errorDesc: 'Ewaybill cannot be generated for an invalid HSN description.',
  },
  {
    errorCode: '285',
    errorDesc: 'Ewaybill cannot be generated for an invalid HSN quantity.',
  },
  {
    errorCode: '286',
    errorDesc: 'Ewaybill cannot be generated for an invalid HSN unit.',
  },
  {
    errorCode: '287',
    errorDesc: 'Ewaybill cannot be generated for an invalid HSN taxable value.',
  },
  {
    errorCode: '288',
    errorDesc: 'Ewaybill cannot be generated for an invalid HSN non taxable value.',
  },
  {
    errorCode: '289',
    errorDesc: 'Ewaybill cannot be generated for an invalid HSN IGST rate.',
  },
  {
    errorCode: '290',
    errorDesc: 'Ewaybill cannot be generated for an invalid HSN CGST rate.',
  },
  {
    errorCode: '291',
    errorDesc: 'Ewaybill cannot be generated for an invalid HSN SGST rate.',
  },
  {
    errorCode: '292',
    errorDesc: 'Ewaybill cannot be generated for an invalid HSN cess rate.',
  },
  {
    errorCode: '293',
    errorDesc: 'Ewaybill cannot be generated for an invalid HSN cess non ad valorem rate.',
  },
  {
    errorCode: '294',
    errorDesc: 'Ewaybill cannot be generated for an invalid HSN other value.',
  },
  {
    errorCode: '295',
    errorDesc: 'Ewaybill cannot be generated for an invalid HSN total value.',
  },
  {
    errorCode: '296',
    errorDesc: 'Ewaybill cannot be updated with invalid vehicle number.',
  },
  {
    errorCode: '297',
    errorDesc: 'Ewaybill cannot be updated with invalid vehicle current state.',
  },
  {
    errorCode: '298',
    errorDesc: 'Ewaybill cannot be updated with invalid vehicle previous state.',
  },
  {
    errorCode: '299',
    errorDesc: 'Ewaybill cannot be updated with invalid transporter ID.',
  },
  {
    errorCode: '300',
    errorDesc: 'Ewaybill cannot be updated with invalid transporter name.',
  },
  {
    errorCode: '301',
    errorDesc: 'Invalid eway bill number',
  },
  {
    errorCode: '302',
    errorDesc: 'Invalid transporter mode',
  },
  {
    errorCode: '303',
    errorDesc: 'Vehicle number is required',
  },
  {
    errorCode: '304',
    errorDesc: 'Invalid vehicle format',
  },
  {
    errorCode: '305',
    errorDesc: 'Place from is required',
  },
  {
    errorCode: '306',
    errorDesc: 'Invalid from state',
  },
  {
    errorCode: '307',
    errorDesc: 'Invalid reason',
  },
  {
    errorCode: '308',
    errorDesc: 'Invalid remarks',
  },
  {
    errorCode: '309',
    errorDesc: 'Could not update vehicle details, pl contact helpdesk',
  },
  {
    errorCode: '310',
    errorDesc: 'Ewaybill cannot be updated with invalid reason remarks for rejection.',
  },
  {
    errorCode: '311',
    errorDesc: 'Validity period lapsed, you cannot update vehicle details',
  },
  {
    errorCode: '312',
    errorDesc: 'This eway bill is either not generated by you or cancelled',
  },
  {
    errorCode: '313',
    errorDesc: 'Ewaybill cannot be updated with invalid reason code for consolidation.',
  },
  {
    errorCode: '314',
    errorDesc: 'Ewaybill cannot be updated with invalid reason remarks for consolidation.',
  },
  {
    errorCode: '315',
    errorDesc: 'Validity period lapsed, you cannot cancel this eway bill',
  },
  {
    errorCode: '316',
    errorDesc: 'Eway bill is already verified, you cannot cancel it',
  },
  {
    errorCode: '317',
    errorDesc: 'Could not cancel eway bill, please contact helpdesk',
  },
  {
    errorCode: '318',
    errorDesc: 'Ewaybill cannot be updated with invalid vehicle details.',
  },
  {
    errorCode: '319',
    errorDesc: 'Ewaybill cannot be updated with invalid transporter details.',
  },
  {
    errorCode: '320',
    errorDesc: 'Invalid state to',
  },
  {
    errorCode: '321',
    errorDesc: 'Invalid place to',
  },
  {
    errorCode: '322',
    errorDesc: 'Could not generate consolidated eway bill',
  },
  {
    errorCode: '323',
    errorDesc: 'Ewaybill cannot be rejected after verification.',
  },
  {
    errorCode: '324',
    errorDesc: 'Ewaybill cannot be accepted after verification.',
  },
  {
    errorCode: '325',
    errorDesc: 'Could not retrieve data',
  },
  {
    errorCode: '326',
    errorDesc: 'Could not retrieve GSTIN details for the given GSTIN number',
  },
  {
    errorCode: '327',
    errorDesc: 'Could not retrieve data from hsn',
  },
  {
    errorCode: '328',
    errorDesc: 'Could not retrieve transporter details from gstin',
  },
  {
    errorCode: '329',
    errorDesc: 'Could not retrieve States List',
  },
  {
    errorCode: '330',
    errorDesc: 'Could not retrieve UQC list',
  },
  {
    errorCode: '331',
    errorDesc: 'Could not retrieve Error code',
  },
  {
    errorCode: '332',
    errorDesc: 'Ewaybill cannot be updated with details after verification.',
  },
  {
    errorCode: '333',
    errorDesc: 'Ewaybill cannot be rejected by generator.',
  },
  {
    errorCode: '334',
    errorDesc: 'Could not retrieve user details by userid ',
  },
  {
    errorCode: '335',
    errorDesc: 'Ewaybill cannot be assigned to transporter by generator.',
  },
  {
    errorCode: '336',
    errorDesc: 'Could not retrieve transporter data by gstin ',
  },
  {
    errorCode: '337',
    errorDesc: 'Could not retrieve HSN details for the given HSN number',
  },
  {
    errorCode: '338',
    errorDesc:
      'You cannot update transporter details, as the current tranporter is already entered Part B details of the eway bill',
  },
  {
    errorCode: '339',
    errorDesc:
      'You are not assigned to update the tranporter details of this eway bill',
  },
  {
    errorCode: '341',
    errorDesc:
      'This e-way bill is generated by you and hence you cannot reject it',
  },
  {
    errorCode: '342',
    errorDesc:
      'You cannot reject this e-way bill as you are not the other party to do so',
  },
  {
    errorCode: '343',
    errorDesc: 'This e-way bill is cancelled',
  },
  {
    errorCode: '344',
    errorDesc: 'Invalid eway bill number',
  },
  {
    errorCode: '345',
    errorDesc: 'Validity period lapsed, you cannot reject the e-way bill',
  },
  {
    errorCode: '346',
    errorDesc:
      'You can reject the e-way bill only within 72 hours from generated timel',
  },
  {
    errorCode: '347',
    errorDesc:
      'Validation of eway bill number failed, while rejecting ewaybill',
  },
  {
    errorCode: '348',
    errorDesc: 'Ewaybill cannot be cancelled by transporter.',
  },
  {
    errorCode: '349',
    errorDesc: 'Ewaybill cannot be updated with part B by transporter.',
  },
  {
    errorCode: '350',
    errorDesc: 'Could not generate consolidated eway bill',
  },
  {
    errorCode: '351',
    errorDesc: 'Invalid state code',
  },
  {
    errorCode: '352',
    errorDesc: 'Invalid rfid date',
  },
  {
    errorCode: '353',
    errorDesc: 'Invalid location code',
  },
  {
    errorCode: '354',
    errorDesc: 'Invalid rfid number',
  },
  {
    errorCode: '355',
    errorDesc: 'Invalid Vehicle Number Format',
  },
  {
    errorCode: '356',
    errorDesc: 'Invalid wt on bridge',
  },
  {
    errorCode: '357',
    errorDesc: 'Could not retrieve eway bill details, pl. contact helpdesk',
  },
  {
    errorCode: '358',
    errorDesc:
      'GSTIN passed in request header is not matching with the user gstin mentioned in payload JSON',
  },
  {
    errorCode: '359',
    errorDesc:
      'User GSTIN should match to GSTIN(from) for outward transactions',
  },
  {
    errorCode: '360',
    errorDesc: 'User GSTIN should match to GSTIN(to) for inward transactions',
  },
  {
    errorCode: '361',
    errorDesc: 'Invalid Vehicle Type',
  },
  {
    errorCode: '362',
    errorDesc:
      'Transporter document date cannot be earlier than the invoice date',
  },
  {
    errorCode: '363',
    errorDesc:
      'E-way bill is not enabled for intra state movement for you state',
  },
  {
    errorCode: '364',
    errorDesc: 'Error in verifying eway bill',
  },
  {
    errorCode: '365',
    errorDesc: 'Error in verifying consolidated eway bill',
  },
  {
    errorCode: '366',
    errorDesc:
      'You will not get the ewaybills generated today, howerver you cann access the ewaybills of yester days',
  },
  {
    errorCode: '367',
    errorDesc: 'Could not retrieve data for officer login',
  },
  {
    errorCode: '368',
    errorDesc: 'Could not update transporter',
  },
  {
    errorCode: '369',
    errorDesc:
      'GSTIN/Transin passed in request header should match with the transported Id mentioned in payload JSON',
  },
  {
    errorCode: '370',
    errorDesc:
      'GSTIN/Transin passed in request header should not be the same as supplier(fromGSTIN) or recepient(toGSTIN)',
  },
  {
    errorCode: '371',
    errorDesc: 'Invalid or Blank Supplier Ship-to State Code',
  },
  {
    errorCode: '372',
    errorDesc: 'Invalid or Blank Consignee Ship-to State Code',
  },
  {
    errorCode: '373',
    errorDesc:
      'The Supplier ship-from state code should be Other Country for Sub Supply Type- Export',
  },
  {
    errorCode: '374',
    errorDesc:
      'The Consignee pin code should be 999999 for Sub Supply Type- Export',
  },
  {
    errorCode: '375',
    errorDesc:
      'The Supplier ship-to state code should be Other Country for Sub Supply Type- Import',
  },
  {
    errorCode: '376',
    errorDesc:
      'The Supplier pin code should be 999999 for Sub Supply Type- Import',
  },
  {
    errorCode: '377',
    errorDesc:
      'Sub Supply Type is mentioned as Others, the description for that is mandatory',
  },
  {
    errorCode: '378',
    errorDesc:
      'The supplier or conginee belong to SEZ, Inter state tax rates are applicable here',
  },
  {
    errorCode: '379',
    errorDesc: 'Eway Bill can not be extended.. Already Cancelled',
  },
  {
    errorCode: '380',
    errorDesc: 'Eway Bill Can not be Extended. Not in Active State',
  },
  {
    errorCode: '381',
    errorDesc:
      'There is No PART-B/Vehicle Entry.. So Please Update Vehicle Information..',
  },
  {
    errorCode: '382',
    errorDesc:
      'You Cannot Extend as EWB can be Extended only 8 hour before or after w.r.t Validity of EWB..!!',
  },
  {
    errorCode: '383',
    errorDesc: 'Error While Extending..Please Contact Helpdesk. ',
  },
  {
    errorCode: '384',
    errorDesc:
      'You are not current transporter or Generator of the ewayBill, with no transporter details.',
  },
  {
    errorCode: '385',
    errorDesc: 'For Rail/Ship/Air transDocNo and transDocDate is mandatory',
  },
  {
    errorCode: '386',
    errorDesc: 'Reason Code, Remarks is mandatory.',
  },
  {
    errorCode: '387',
    errorDesc: 'No Record Found for Entered consolidated eWay bill.',
  },
  {
    errorCode: '388',
    errorDesc:
      'Exception in regenration of consolidated eWayBill!!Please Contact helpdesk',
  },
  {
    errorCode: '389',
    errorDesc: 'Remaining Distance Required',
  },
  {
    errorCode: '390',
    errorDesc: 'Remaining Distance Can not be greater than Actual Distance.',
  },
  {
    errorCode: '391',
    errorDesc:
      'No eway bill of specified tripsheet, neither  ACTIVE nor not Valid.',
  },
  {
    errorCode: '392',
    errorDesc:
      'Tripsheet is already cancelled, Hence Regeration is not possible',
  },
  {
    errorCode: '393',
    errorDesc: 'Invalid GSTIN',
  },
  {
    errorCode: '394',
    errorDesc: 'For other than Road Transport, TransDoc number is required',
  },
  {
    errorCode: '395',
    errorDesc: 'Eway Bill Number should be numeric only',
  },
  {
    errorCode: '396',
    errorDesc:
      'Either Eway Bill Number Or Consolidated Eway Bill Number is required for Verification',
  },
  {
    errorCode: '397',
    errorDesc: 'Error in Multi Vehicle Movement Initiation',
  },
  {
    errorCode: '398',
    errorDesc: 'Eway Bill Item List is Empty',
  },
  {
    errorCode: '399',
    errorDesc:
      'Unit Code is not matching with any of the Unit Code from ItemList',
  },
  {
    errorCode: '400',
    errorDesc:
      'total quantity is exceeding from multi vehicle movement initiation quantity',
  },
  {
    errorCode: '401',
    errorDesc: 'Error in inserting multi vehicle details',
  },
  {
    errorCode: '402',
    errorDesc: 'total quantity can not be less than or equal to zero',
  },
  {
    errorCode: '403',
    errorDesc: 'Error in multi vehicle details',
  },
  {
    errorCode: '404',
    errorDesc: 'Invalid Part A Details.',
  },
  {
    errorCode: '405',
    errorDesc:
      'No record found for multi vehicle update with specified ewbNo groupNo and old vehicleNo/transDocNo with status as ACT',
  },
  {
    errorCode: '406',
    errorDesc: 'Group number cannot be empty or zero',
  },
  {
    errorCode: '407',
    errorDesc: 'Invalid old vehicle number format',
  },
  {
    errorCode: '408',
    errorDesc: 'Invalid new vehicle number format',
  },
  {
    errorCode: '409',
    errorDesc: 'Invalid old transDoc number',
  },
  {
    errorCode: '410',
    errorDesc: 'Invalid new transDoc number',
  },
  {
    errorCode: '411',
    errorDesc:
      'Multi Vehicle Initiation data is not there for specified ewayBill and group No',
  },
  {
    errorCode: '412',
    errorDesc:
      'Multi Vehicle movement is already Initiated,hence PART B updation not allowed',
  },
  {
    errorCode: '413',
    errorDesc: 'Unit Code is not matching with unit code of first initiaton',
  },
  {
    errorCode: '414',
    errorDesc: 'Invalid Ewaybill Get Details Request.',
  },
  {
    errorCode: '415',
    errorDesc: 'Error in fetching in verification data for officer',
  },
  {
    errorCode: '416',
    errorDesc: 'Date range is exceeding allowed date range ',
  },
  {
    errorCode: '417',
    errorDesc: 'No verification data found for officer ',
  },
  {
    errorCode: '418',
    errorDesc: 'No record found',
  },
  {
    errorCode: '419',
    errorDesc: 'Error in fetching search result for taxpayer/transporter',
  },
  {
    errorCode: '420',
    errorDesc: 'Minimum six character required for Tradename/legalname search',
  },
  {
    errorCode: '421',
    errorDesc: 'Invalid pincode',
  },
  {
    errorCode: '422',
    errorDesc: 'Invalid mobile number',
  },
  {
    errorCode: '423',
    errorDesc: 'Error in fetching ewaybill list by vehicle number',
  },
  {
    errorCode: '424',
    errorDesc: 'Invalid PAN number',
  },
  {
    errorCode: '425',
    errorDesc: 'Invalid Ewaybill Details Update Request.',
  },
  {
    errorCode: '426',
    errorDesc: 'Invalid Consolidated Ewaybill Details Update Request.',
  },
  {
    errorCode: '427',
    errorDesc: 'Invalid Extension Details Update Request.',
  },
  {
    errorCode: '428',
    errorDesc: 'Invalid Rejection Details Update Request.',
  },
  {
    errorCode: '429',
    errorDesc: 'Invalid Acceptance Details Update Request.',
  },
  {
    errorCode: '430',
    errorDesc: 'Invalid Cancellation Details Update Request.',
  },
  {
    errorCode: '431',
    errorDesc: 'Invalid Assign Transporter Details Update Request.',
  },
  {
    errorCode: '432',
    errorDesc: 'invalid vehicle released value',
  },
  {
    errorCode: '433',
    errorDesc: 'invalid goods detained parameter value',
  },
  {
    errorCode: '434',
    errorDesc: 'invalid ewbNoAvailable parameter value',
  },
  {
    errorCode: '435',
    errorDesc: 'Part B is already updated,hence updation is not allowed',
  },
  {
    errorCode: '436',
    errorDesc: 'Invalid email id',
  },
  {
    errorCode: '437',
    errorDesc: 'Invalid Consolidated Ewaybill Assign Transporter Request.',
  },
  {
    errorCode: '438',
    errorDesc: 'Invalid Consolidated Ewaybill Extend Validity Request.',
  },
  {
    errorCode: '439',
    errorDesc: 'Invalid Consolidated Ewaybill Get Consolidated Details Request.',
  },
  {
    errorCode: '440',
    errorDesc: 'Invalid Consolidated Ewaybill Get Consolidated List Request.',
  },
  {
    errorCode: '441',
    errorDesc: 'Invalid Consolidated Ewaybill Consolidated Details Update Request.',
  },
  {
    errorCode: '442',
    errorDesc: 'Error in inserting verification details',
  },
  {
    errorCode: '443',
    errorDesc: 'invalid invoice available value',
  },
  {
    errorCode: '444',
    errorDesc:
      'This eway bill cannot be cancelled as it is generated from Eway Bill 1',
  },
  {
    errorCode: '445',
    errorDesc:
      'This eway bill cannot be cancelled as it is generated from Eway Bill 2',
  },
  {
    errorCode: '446',
    errorDesc:
      'Transport details cannot be updated here as it is generated from Eway Bill 1',
  },
  {
    errorCode: '447',
    errorDesc:
      'Transport details cannot be updated here as it is generated from Eway Bill 2',
  },
  {
    errorCode: '448',
    errorDesc:
      'Part B cannot be updated as this Ewaybill Part A is generated in Eway Bill 1',
  },
  {
    errorCode: '449',
    errorDesc:
      'Part B cannot be updated as this Ewaybill Part A is generated in Eway Bill 2',
  },
  {
    errorCode: '450',
    errorDesc:
      'For outward-export ewaybill, To GSTIN has to be either URP or SEZ ',
  },
  {
    errorCode: '451',
    errorDesc:
      'For inward-import ewaybill, From GSTIN has to be either URP or SEZ',
  },
  {
    errorCode: '452',
    errorDesc:
      'Consolidate Ewaybill cannot be generated as this Ewaybill Part A is generated in Eway Bill 2',
  },
  {
    errorCode: '453',
    errorDesc:
      'You cannot consolidate ewaybills generated at NIC1 and NIC2 together',
  },
  {
    errorCode: '600',
    errorDesc: 'Invalid category',
  },
  {
    errorCode: '601',
    errorDesc: 'Invalid date format',
  },
  {
    errorCode: '602',
    errorDesc: 'Invalid File Number',
  },
  {
    errorCode: '603',
    errorDesc: 'For file details file number is required',
  },
  {
    errorCode: '604',
    errorDesc:
      'E-way bill(s) are already generated for the same document number, you cannot generate again on same document number',
  },
  {
    errorCode: '605',
    errorDesc:
      ' If the goods are moving towards transporter location, the value of toTransporterLoc should be Y',
  },
  {
    errorCode: '606',
    errorDesc:
      'Vehicle type is mandatory, if the goods are moving to transporter place',
  },
  {
    errorCode: '607',
    errorDesc: 'dispatch from gstin is mandatary ',
  },
  {
    errorCode: '608',
    errorDesc: 'ship to from gstin is mandatary',
  },
  {
    errorCode: '609',
    errorDesc: ' invalid ship to from gstin ',
  },
  {
    errorCode: '610',
    errorDesc: 'invalid dispatch from gstin ',
  },
  {
    errorCode: '611',
    errorDesc: 'invalid document type for the given supply type ',
  },
  {
    errorCode: '612',
    errorDesc: 'Invalid transaction type',
  },
  {
    errorCode: '614',
    errorDesc: 'Transaction type is mandatory',
  },
  {
    errorCode: '617',
    errorDesc:
      'Bill-from and dispatch-from gstin should not be same for this transaction type',
  },
  {
    errorCode: '618',
    errorDesc:
      'Bill-to and ship-to gstin should not be same for this transaction type',
  },
  {
    errorCode: '619',
    errorDesc: 'Transporter Id is mandatory for generation of Part A slip',
  },
  {
    errorCode: '620',
    errorDesc:
      'Total invoice value cannot be less than the sum of total assessible value and tax values',
  },
  {
    errorCode: '621',
    errorDesc: 'trans mode is mandatory since vehicle number is present',
  },
  {
    errorCode: '622',
    errorDesc: 'trans mode is mandatory since trans doc number is present',
  },
  {
    errorCode: '627',
    errorDesc: 'Total value should not be negative',
  },
  {
    errorCode: '628',
    errorDesc: 'Total invoice value should not be negative',
  },
  {
    errorCode: '629',
    errorDesc: 'IGST value should not be negative',
  },
  {
    errorCode: '630',
    errorDesc: 'CGST value should not be negative',
  },
  {
    errorCode: '631',
    errorDesc: 'SGST value should not be negative',
  },
  {
    errorCode: '632',
    errorDesc: 'Cess value should not be negative',
  },
  {
    errorCode: '633',
    errorDesc: 'Cess non advol should not be negative',
  },
  {
    errorCode: '634',
    errorDesc:
      'Vehicle type should not be ODC when transmode is other than road',
  },
  {
    errorCode: '635',
    errorDesc:
      'You cannot update part B, as the current tranporter is already entered Part B details of the eway bill',
  },
  {
    errorCode: '636',
    errorDesc: 'You are not assigned to update part B',
  },
  {
    errorCode: '637',
    errorDesc:
      'You cannot extend ewaybill, as the current tranporter is already entered Part B details of the ewaybill',
  },
  {
    errorCode: '638',
    errorDesc:
      'Transport mode is mandatory as Vehicle Number/Transport Document Number is given',
  },
  {
    errorCode: '640',
    errorDesc: 'Tolal Invoice value is mandatory',
  },
  {
    errorCode: '641',
    errorDesc:
      'For outward CKD/SKD/Lots supply type, Bill To state should be as Other Country, since the  Bill To GSTIN given is of SEZ unit',
  },
  {
    errorCode: '642',
    errorDesc:
      'For inward CKD/SKD/Lots supply type, Bill From state should be as Other Country, since the  Bill From GSTIN given is of SEZ unit',
  },
  {
    errorCode: '643',
    errorDesc:
      'For regular transaction, Bill from state code and Dispatch from state code should be same',
  },
  {
    errorCode: '644',
    errorDesc:
      'For regular transaction, Bill to state code and Ship to state code should be same',
  },
  {
    errorCode: '645',
    errorDesc:
      'You cannot do Multi Vehicle movement, as current transporeter already entered part B',
  },
  {
    errorCode: '646',
    errorDesc: 'You are not assigned to do multi vehicle movement',
  },
  {
    errorCode: '647',
    errorDesc: 'Could not insert RFID data, please contact to helpdesk',
  },
  {
    errorCode: '648',
    errorDesc:
      'Multi Vehicle movement is already Initiated,hence generation of consolidated eway bill is not allowed',
  },
  {
    errorCode: '649',
    errorDesc:
      'You cannot generate consolidated eway bill , as the current tranporter is already entered Part B details of the eway bill',
  },
  {
    errorCode: '650',
    errorDesc: 'You are not assigned to generate consolidated ewaybill',
  },
  {
    errorCode: '651',
    errorDesc: 'For Category PartA or PartB ewbDt is mandatory',
  },
  {
    errorCode: '652',
    errorDesc: 'For Category EWB03 procDt is mandatory',
  },
  {
    errorCode: '653',
    errorDesc: 'The Ewaybill is cancelled',
  },
  {
    errorCode: '654',
    errorDesc:
      'This GSTIN has generated a common Enrolment Number. Hence you are not allowed to generate Eway bill',
  },
  {
    errorCode: '655',
    errorDesc:
      'This GSTIN has generated a common Enrolment Number. Hence you cannot mention it as a transporter',
  },
  {
    errorCode: '656',
    errorDesc: 'This Eway Bill does not belongs to your state',
  },
  {
    errorCode: '657',
    errorDesc:
      'Eway Bill Category wise details will be available after 4 days only',
  },
  {
    errorCode: '658',
    errorDesc:
      'You are blocked for accesing this API as the allowed number of requests has been exceeded',
  },
  {
    errorCode: '659',
    errorDesc: 'Remarks is mandatory',
  },
  {
    errorCode: '670',
    errorDesc: 'Invalid Month Parameter',
  },
  {
    errorCode: '671',
    errorDesc: 'Invalid Year Parameter',
  },
  {
    errorCode: '672',
    errorDesc: 'User Id is mandatory',
  },
  {
    errorCode: '673',
    errorDesc: 'Error in getting officer dashboard',
  },
  {
    errorCode: '675',
    errorDesc: 'Error in getting EWB03 details by acknowledgement date range',
  },
  {
    errorCode: '678',
    errorDesc: 'Invalid Uniq No',
  },
  {
    errorCode: '679',
    errorDesc: 'Invalid EWB03 Ack No',
  },
  {
    errorCode: '680',
    errorDesc: 'Invalid Close Reason',
  },
  {
    errorCode: '681',
    errorDesc: 'Error in Closing EWB  Verification Data',
  },
  {
    errorCode: '682',
    errorDesc: 'No Record available to Close',
  },
  {
    errorCode: '683',
    errorDesc: 'Error in fetching WatchList Data',
  },
  {
    errorCode: '685',
    errorDesc: 'Exception in fetching dashboard data',
  },
  {
    errorCode: '700',
    errorDesc: 'You are not assigned to extend e-waybill',
  },
  {
    errorCode: '701',
    errorDesc: 'Invalid Vehicle Direction',
  },
  {
    errorCode: '702',
    errorDesc: 'The distance between the pincodes given is too high',
  },
  {
    errorCode: '703',
    errorDesc: 'Since the consignor is Composite Taxpayer, inter state transactions are not allowed',
  },
  {
    errorCode: '704',
    errorDesc: 'Since the consignor is Composite Taxpayer, Tax rates should be zero',
  },
  {
    errorCode: '705',
    errorDesc: 'Invalid transit type',
  },
  {
    errorCode: '706',
    errorDesc: 'Address Line1 is mandatory',
  },
  {
    errorCode: '707',
    errorDesc: 'Address Line2 is mandatory',
  },
  {
    errorCode: '708',
    errorDesc: 'Address Line3 is mandatory',
  },
  {
    errorCode: '709',
    errorDesc: 'Pin to pin distance is not available for the given pin codes',
  },
  {
    errorCode: '710',
    errorDesc: 'Invalid state code for the given pincode',
  },
  {
    errorCode: '711',
    errorDesc: 'Invalid value for isInTransit field',
  },
  {
    errorCode: '712',
    errorDesc: 'Transit Type is not required as the good are not in movement',
  },
  {
    errorCode: '713',
    errorDesc:
      'Transit Address is not required as the good are not in movement',
  },
  {
    errorCode: '714',
    errorDesc:
      'Document type - Tax Invoice is not allowed for composite tax payer',
  },
  {
    errorCode: '715',
    errorDesc:
      'The Consignor GSTIN is blocked from e-waybill generation as Return is not filed for past 2 months',
  },
  {
    errorCode: '716',
    errorDesc:
      'The Consignee GSTIN is blocked from e-waybill generation as Return is not filed for past 2 months',
  },
  {
    errorCode: '717',
    errorDesc:
      'The Transporter GSTIN is blocked from e-waybill generation as Return is not filed for past 2 months',
  },
  {
    errorCode: '718',
    errorDesc:
      'The User GSTIN is blocked from Transporter Updation as Return is not filed for past 2 months',
  },
  {
    errorCode: '719',
    errorDesc:
      'The Transporter GSTIN is blocked from Transporter Updation as Return is not filed for past 2 months',
  },
  {
    errorCode: '720',
    errorDesc:
      'E Way Bill should be generated as part of IRN generation or with reference to IRN in E Invoice System, Since Supplier is enabled for E Invoi',
  },
  {
    errorCode: '721',
    errorDesc:
      'The distance between the given pincodes are not available in the system. Please provide distance.',
  },
  {
    errorCode: '722',
    errorDesc: 'Consignee GSTIN is cancelled and document date is later than the De-Registration date',
  },
  {
    errorCode: '724',
    errorDesc: 'HSN code of at least one item should be of goods to generate e-Way Bill',
  },
  {
    errorCode: '726',
    errorDesc: 'Vehicle type can not be regular when transportation mode is ship',
  },
  {
    errorCode: '727',
    errorDesc: 'For Ship Transport, either vehicle number or transport document number is required',
  },
  {
    errorCode: '728',
    errorDesc: 'You can cancel the ewaybill within 24 hours from Part B entry',
  },
  {
    errorCode: '729',
    errorDesc: 'TransDoc date is required for transport mode Ship as the transport document number is provided',
  },
  {
    errorCode: '800',
    errorDesc: 'Redis server Is not Working  try after some time',
  },
  {
    errorCode: '801',
    errorDesc: 'Transporter id is not required for ewaybill for gold',
  },
  {
    errorCode: '802',
    errorDesc: 'Transporter name is not required for ewaybill for gold',
  },
  {
    errorCode: '803',
    errorDesc: 'TransDocNo is not required for ewaybill for gold',
  },
  {
    errorCode: '804',
    errorDesc: 'TransDocDate is not required for ewaybill for gold',
  },
  {
    errorCode: '805',
    errorDesc: 'Vehicle No is not required for ewaybill for gold',
  },
  {
    errorCode: '806',
    errorDesc: 'Vehicle Type is not required for ewaybill for gold',
  },
  {
    errorCode: '807',
    errorDesc: 'Transmode is mandatory for ewaybill for gold',
  },
  {
    errorCode: '808',
    errorDesc: 'Inter-State ewaybill is not allowed for gold',
  },
  {
    errorCode: '809',
    errorDesc: 'Other items are not allowed with eway bill for gold',
  },
  {
    errorCode: '810',
    errorDesc: 'Transport can not be updated for EwayBill For Gold',
  },
  {
    errorCode: '811',
    errorDesc: 'Vehicle can not be updated for EwayBill For Gold',
  },
  {
    errorCode: '812',
    errorDesc: 'ConsolidatedEWB cannot be generated for EwayBill For Gold ',
  },
  {
    errorCode: '813',
    errorDesc: 'Duplicate request at the same time',
  },
  {
    errorCode: '814',
    errorDesc:
      'MultiVehicleMovement cannot be initiated for EWay Bill For Gold',
  },
  {
    errorCode: '815',
    errorDesc: 'Only transmode road is allowed for ewaybill for gold',
  },
  {
    errorCode: '816',
    errorDesc: 'Only Transmode road is allowed for extending ewaybill for gold',
  },
  {
    errorCode: '817',
    errorDesc: 'MultiVehicle Movement cannot be initiated. Eway Bill is not in Active State',
  },
  {
    errorCode: '818',
    errorDesc: 'Validity period lapsed.Cannot generate consolidated Eway Bill',
  },
  {
    errorCode: '819',
    errorDesc:
      'Ewaybill cannot be generated for the document date which is prior to 01/07/2017',
  },
  {
    errorCode: '820',
    errorDesc:
      'You cannot generate e-Waybill with document date earlier than 180 days',
  },
  {
    errorCode: '821',
    errorDesc: 'e-Waybill cannot be extended as the allowed limit is 360 days',
  },
  {
    errorCode: '822',
    errorDesc: 'Both supplier and recipient cannot be URP',
  },
  {
    errorCode: '823',
    errorDesc: 'Invalid transdoc number format for railway',
  },
  {
    errorCode: '824',
    errorDesc:
      'No changes made as the requested status is the same as the current status.',
  },
  {
    errorCode: '825',
    errorDesc: 'Error while updating the change/(s)',
  },
  {
    errorCode: '826',
    errorDesc: 'Pls provide the required parameter or payload.',
  },
  {
    errorCode: '827',
    errorDesc: 'You are not authorized to close the e-way bill.',
  },
  {
    errorCode: '828',
    errorDesc: 'Closure Date cannot be earlier than EwayBill Date',
  },
  {
    errorCode: '829',
    errorDesc: 'The e-way bill is already closed.',
  },
  {
    errorCode: '830',
    errorDesc:
      'You cannot close the e-Waybill as there is no PART-B/Vehicle entry',
  },
  {
    errorCode: '831',
    errorDesc:
      'e-Waybill cannot be created with combination of sin items with other items',
  },
  {
    errorCode: '832',
    errorDesc: 'From address is required for sin item',
  },
  {
    errorCode: '833',
    errorDesc: 'From Place is required for sin item',
  },
  {
    errorCode: '834',
    errorDesc: 'To address is required for sin item',
  },
  {
    errorCode: '835',
    errorDesc: 'To Place is required for sin product',
  },
  {
    errorCode: '836',
    errorDesc: 'Quantity unit code is mandatory for sin item',
  },
  {
    errorCode: '837',
    errorDesc: 'Invalid unit code for sin item',
  },
  {
    errorCode: '838',
    errorDesc: 'Quantity is mandatory for sin item',
  },
  {
    errorCode: '839',
    errorDesc:
      'SGST and CGST rates are mandatory for each sin item incase of intra state e-Waybill',
  },
  {
    errorCode: '840',
    errorDesc:
      'IGST rates are mandatory for each sin item incase of inter state e-Waybill',
  },
  {
    errorCode: '841',
    errorDesc: 'Could not close ewaybill, contact helpdesk',
  },
  {
    errorCode: '842',
    errorDesc: 'Closure date cannot be later than the current date.',
  },
  {
    errorCode: '843',
    errorDesc: 'You cannot cancel ewaybill, as it is already closed',
  },
  {
    errorCode: '844',
    errorDesc: 'You cannot extend ewaybill, as it is already closed',
  },
  {
    errorCode: '845',
    errorDesc:
      'Consolidated EwayBill cannot be generated as it is already closed.',
  },
  {
    errorCode: '846',
    errorDesc: 'Muti Vehicle cannot be added, as it is already closed',
  },
  {
    errorCode: '847',
    errorDesc:
      'Muti Vehicle Initiation cannot be done, as it is already closed',
  },
  {
    errorCode: '848',
    errorDesc: 'Multi Vehicle cannot be updated, as it is already closed',
  },
  {
    errorCode: '849',
    errorDesc: 'You cannot reject ewaybill, as it is already closed',
  },
  {
    errorCode: '850',
    errorDesc: 'You cannot update transporter, as it is already closed',
  },
  {
    errorCode: '851',
    errorDesc: 'You cannot update vehicle details, as it is already closed',
  },
  {
    errorCode: '852',
    errorDesc: 'Ewaybill is not generated by you or not valid',
  },
  {
    errorCode: '853',
    errorDesc: 'e-Way bill cannot be closed as it is already rejected.',
  },
  {
    errorCode: '854',
    errorDesc: 'Closure Date format is invalid. Allowed format is dd/MM/yyyy.',
  },
  {
    errorCode: '855',
    errorDesc: 'Supplier GSTIN could not be TDS or TCS',
  },
  {
    errorCode: '856',
    errorDesc:
      'Suppliers enabled for eInvoicing should generate E Way Bills for sin products based on IRNs for B2B/ Export transactions',
  },
  {
    errorCode: '857',
    errorDesc:
      'SHIP TO - state code is not valid statecode for BILL_TO_SHIP_TO and Combination transaction types',
  },
  {
    errorCode: '858',
    errorDesc:
      'SHIP TO - PIN code must belong to the ActToStateCode for BILL_TO_SHIP_TO and Combination transaction types',
  },
  {
    errorCode: '859',
    errorDesc: 'Could not retrieve Hsn code by category',
  },
  {
    errorCode: '860',
    errorDesc: 'Could not retrieve unit code by category',
  },
  {
    errorCode: '861',
    errorDesc: 'Closure Date field is mandatory for closing e-way bill',
  },
  {
    errorCode: '862',
    errorDesc: 'Remarks field is mandatory for closing e-way bill',
  },
  {
    errorCode: '863',
    errorDesc:
      'Ship to tradename is mandatory for BILL_TO_SHIP_TO and Combination transaction types',
  },
  {
    errorCode: '864',
    errorDesc:
      'Ship to GSTIN cannot be sent as the transaction type selected is bill from and dispatch from',
  },
  {
    errorCode: '865',
    errorDesc:
      'BILL TO - GSTIN state code does not match with the to-state code passed for BILL_TO_SHIP_TO and Combination transaction types',
  },
];

export default errorCodeMapForEwayBill;
